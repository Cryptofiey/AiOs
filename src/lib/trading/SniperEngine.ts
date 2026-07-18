import { MarketHub } from "./MarketHub";
import { ArbitrageScanner, DealGroup, TradeOpportunity } from "./ArbitrageScanner";
import { ExecutionEngine } from "./ExecutionEngine";
import { TradingItem } from "../../types/trading";
import { MarketState } from "../../types/market";
import { ServerLogger } from "../utils/ServerLogger";

/**
 * SniperEngine
 * The core reactive service that consumes the MarketHub stream.
 * It identifies opportunities using ArbitrageScanner and dispatches execution tasks.
 */
export class SniperEngine {
  private static instance: SniperEngine;
  private hub: MarketHub;
  private scanner: ArbitrageScanner;
  private execution: ExecutionEngine;
  private isRunning = false;
  private softMode = false;
  private unsubscribe: (() => void) | null = null;
  private lastLogged: Map<string, { time: number, price: number, action: string }> = new Map();

  private constructor() {
    this.hub = MarketHub.getInstance();
    this.scanner = ArbitrageScanner.getInstance();
    this.execution = ExecutionEngine.getInstance();
  }

  public setSoftMode(enabled: boolean) {
    this.softMode = enabled;
    console.log(`[SniperEngine] Soft mode ${enabled ? "ENABLED" : "DISABLED"}`);
  }

  public static getInstance(): SniperEngine {
    if (!SniperEngine.instance) {
      SniperEngine.instance = new SniperEngine();
    }
    return SniperEngine.instance;
  }

  /**
   * Starts the sniper monitoring loop
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[SniperEngine] 🎯 Sniper activated. Monitoring MarketHub stream...");

    // Subscribe to real-time state changes from MarketHub
    // This handles both local pushes (pushTick) and Firestore sync updates
    this.unsubscribe = this.hub.subscribe((state) => {
      this.evaluateGlobalState(state);
    });
  }

  public stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isRunning = false;
    console.log("[SniperEngine] 🛑 Sniper deactivated.");
  }

  /**
   * Evaluates the entire market state for arbitrage opportunities
   */
  private evaluateGlobalState(state: MarketState) {
    if (!this.isRunning) return;

    // We iterate over all items in the current market state
    state.items.forEach((orders, itemName) => {
      const asks = orders.filter(o => o.type === "ASK").sort((a, b) => a.price - b.price);
      
      if (asks.length > 0) {
        const bestAsk = asks[0];
        
        // Evaluate using the 5-level logic from ArbitrageScanner
        // Use a high virtual balance to ensure logical filtering is based on price corridors, 
        // as per requirement to ignore wallet limits in the queue logic.
        const opportunity = this.scanner.evaluateOpportunity(
          itemName, 
          bestAsk.price, 
          bestAsk.category, 
          1000000, // walletBalance (virtual high)
          1000000  // totalBankroll (virtual high)
        );

        // Process based on group interest (1-5)
        if (opportunity.group <= 3 || opportunity.group === DealGroup.OFFER_AUCTION) {
          // ALWAYS add to the execution queue collection as requested by the user,
          // regardless of wallet balance or execution status.
          this.execution.queueOpportunity(bestAsk, opportunity);
          
          this.processOpportunity(bestAsk, opportunity);
        }
      }
    });
  }

  /**
   * Dispatches the identified opportunity to the execution engine
   */
  private async processOpportunity(ask: any, opportunity: TradeOpportunity) {
    const itemName = ask.metadata?.itemName || "Unknown Item";
    const now = Date.now();
    const logKey = `${itemName}_${opportunity.group}_${opportunity.action}`;
    const prev = this.lastLogged.get(logKey);

    // Throttle logs: log if price changed by > 1% or if 1 minute passed
    const shouldLog = !prev || 
                      Math.abs(prev.price - ask.price) / (ask.price || 1) > 0.01 || 
                      (now - prev.time > 60000);

    if (shouldLog) {
      this.lastLogged.set(logKey, { time: now, price: ask.price, action: opportunity.action });
    }
    
    // Check if we should auto-snipe (Group 1 & 2)
    if (opportunity.group === DealGroup.INSTANT || opportunity.group === DealGroup.EASY) {
      if (shouldLog) {
        ServerLogger.getInstance().log("SNIPER", `🚀 HIGH FOCUS MATCH: ${itemName} (Group ${opportunity.group})`, "success", {
          itemName,
          price: ask.price,
          expectedProfit: opportunity.expectedProfit
        });
      }

      try {
        const item: TradingItem = {
          id: ask.id,
          name: itemName,
          price: ask.price,
          source: ask.source,
          category: "GIFT",
          rarity: "COMMON",
          lastUpdated: new Date().toISOString()
        };

        // Dispatch to ExecutionEngine for atomic purchase
        const result = await this.execution.executeTrade(item, ask.price, ask.source, {
          keepInInventory: true,
          maxSlippage: 0.03,
          minNetProfit: 0.2,
          softMode: this.softMode
        });

        if (result.success) {
          ServerLogger.getInstance().log("SNIPER", `✅ TRADE SUCCESS: ${itemName} acquired via ${result.method}`, "success");
        } else if (result.error === "Wallet Not Connected") {
          ServerLogger.getInstance().log("SNIPER", `⚠️ BACKEND AUTOSNIPER SKIPPED: ${itemName} - Headless Wallet Not Configured. Use UI for Manual MitM Approval.`, "warn");
        } else {
          ServerLogger.getInstance().log("SNIPER", `❌ TRADE FAILED: ${itemName} - ${result.error}`, "error");
        }
      } catch (err: any) {
        ServerLogger.getInstance().log("SNIPER", `Execution dispatch error: ${err.message}`, "error");
      }
    } else if (opportunity.group === DealGroup.BREAD) {
      // Group 3: Log but don't auto-snipe unless specific filters apply
      if (shouldLog) {
        ServerLogger.getInstance().log("SNIPER", `📊 Opportunity Found: ${itemName} (Group 3: Bread) - Expected Profit: ${opportunity.expectedProfit.toFixed(2)} TON`, "info", {
          itemName,
          price: ask.price,
          expectedProfit: opportunity.expectedProfit
        });
      }
    } else if (opportunity.group === DealGroup.OFFER_AUCTION) {
      // Group 5: Log Auctions/Offers opportunity
      if (shouldLog) {
        ServerLogger.getInstance().log("SNIPER", `🎯 Auction/Offer Found: ${itemName} (Group 5: Offer/Auction) - Action: ${opportunity.action} - Expected Profit: ${opportunity.expectedProfit.toFixed(2)} TON`, "info", {
          itemName,
          price: ask.price,
          expectedProfit: opportunity.expectedProfit
        });
      }
    }
  }
}
