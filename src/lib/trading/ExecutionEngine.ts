import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MTProtoBridge } from "../bridge/MTProtoBridge";
import { WalletBridge } from "../bridge/WalletBridge";
import { TradingItem } from "../../types/trading";
import { GuardrailService } from "./GuardrailService";
import { MarketHub } from "./MarketHub";
import { MarketAggregator } from "./MarketAggregator";

export type ExecutionMethod = "MTPROTO_BOT" | "BLOCKCHAIN_SDK" | "TON_CONNECT" | "API_DIRECT";

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  method: ExecutionMethod;
  source: string;
  timestamp: string;
  error?: string;
}

export interface ExecutionOptions {
  keepInInventory: boolean;
  maxSlippage: number;
  minNetProfit?: number; // Minimum TON profit required after gas/fees
}

/**
 * ExecutionEngine - Инженерный узел, отвечающий за физическое изъятие актива.
 * Снайпер дает команду "КУПИТЬ", а этот узел решает КАК и проверяет ЗАЧЕМ (Guardrails).
 */
export class ExecutionEngine {
  private static instance: ExecutionEngine;
  private bridge: MTProtoBridge;
  private walletBridge: WalletBridge;
  private hub: MarketHub;

  private constructor() {
    this.bridge = MTProtoBridge.getInstance();
    this.walletBridge = WalletBridge.getInstance();
    this.hub = MarketHub.getInstance();
  }

  public static getInstance(): ExecutionEngine {
    if (!ExecutionEngine.instance) {
      ExecutionEngine.instance = new ExecutionEngine();
    }
    return ExecutionEngine.instance;
  }

  /**
   * Выполняет покупку, выбирая оптимальный путь (Pathfinding)
   */
  public async executeTrade(
    item: TradingItem, 
    targetPrice: number, 
    sourceName: string,
    options: ExecutionOptions = { keepInInventory: true, maxSlippage: 0.05, minNetProfit: 0.1 }
  ): Promise<ExecutionResult> {
    console.log(`[ExecutionEngine] Pre-flight checks for ${item.name}...`);
    
    // 1. ПРОВЕРКА ПРОФИТА И ЖИЗНЕСПОСОБНОСТИ (Guardrails)
    const bestAsk = this.hub.getBestAsk(item.name);
    const marketFloor = bestAsk?.price || targetPrice * 1.1; // Fallback if no data
    
    // Получаем волатильность из агрегатора
    const historicalVolatility = MarketAggregator.getInstance().getHistoricalVolatility(item.name);

    // Добавляем Latency Buffer для учета проскальзывания при повторах (retries)
    const analysis = GuardrailService.analyzeTrade(targetPrice, marketFloor, historicalVolatility, bestAsk || undefined);
    
    if (!analysis.isViable) {
      const error = `Guardrail Block: Trade not viable (Score: ${analysis.viabilityScore}). Recommendation: ${analysis.recommendation}. Net: ${analysis.netProfit.toFixed(3)} TON. Volatility Risk: ${(analysis.volatilityRisk * 100).toFixed(1)}%`;
      console.warn(`[ExecutionEngine] ${error}`);
      await this.logExecution(item, targetPrice, sourceName, "GUARDRAIL_BLOCKED", "API_DIRECT", { error });
      return { success: false, method: "API_DIRECT", source: sourceName, timestamp: new Date().toISOString(), error };
    }

    // 2. ПРОВЕРКА ПРОСКАЛЬЗЫВАНИЯ
    if (targetPrice > targetPrice * (1 + options.maxSlippage)) {
      const error = "Slippage exceeded max allowed limit";
      await this.logExecution(item, targetPrice, sourceName, "FAILED", "API_DIRECT", { error });
      return { success: false, method: "API_DIRECT", source: sourceName, timestamp: new Date().toISOString(), error };
    }

    // 3. Определение метода исполнения
    const method = this.determineBestMethod(sourceName);
    
    try {
      let executionResult: ExecutionResult;

      if (method === "MTPROTO_BOT") {
        const botName = sourceName.includes("Tonnel") ? "Tonnel_Network_bot" : "mrkt_bot";
        const bridgeRes = await this.bridge.sendBotCommand(botName, `/buy_${item.id}`);
        
        if (options.keepInInventory) {
          // Explicitly send command or click button to ensure gift stays in inventory
          await this.bridge.clickInlineButton(botName, "Profile: OFF");
          await this.bridge.sendBotCommand(botName, "Set Send-to-Profile: NO");
        }

        executionResult = {
          success: bridgeRes.success,
          method: "MTPROTO_BOT",
          source: sourceName,
          timestamp: new Date().toISOString(),
          error: bridgeRes.success ? undefined : "Bot command failed"
        };
      } else if (method === "TON_CONNECT") {
        console.log(`[ExecutionEngine] Invoking WalletBridge for ${sourceName}...`);
        
        if (!this.walletBridge.getState().connected) {
          return {
            success: false,
            method: "TON_CONNECT",
            source: sourceName,
            timestamp: new Date().toISOString(),
            error: "Wallet Not Connected"
          };
        }

        // Construct transaction message
        const messages = [{
          address: item.id, // In TON gifts, the item ID might be its address or we need to resolve it
          amount: (targetPrice * 1e9).toString(), // Convert to nanoton
          payload: undefined // Optional: can add a specific comment or payload
        }];

        try {
          const result = await this.walletBridge.sendTransaction(messages, { 
            keepInInventory: options.keepInInventory 
          });

          // If it's a bot like Tonnel, we might need an extra step to notify the bot
          if (sourceName.toLowerCase().includes("tonnel")) {
            await this.walletBridge.interactWithBot("Tonnel_Network_bot", `payment_confirmed_${result.boc}`);
          }

          executionResult = {
            success: true,
            txHash: result.boc, // TON uses BOC (Bag of Cells) which contains the hash
            method: "TON_CONNECT",
            source: sourceName,
            timestamp: new Date().toISOString()
          };
        } catch (err: any) {
          executionResult = {
            success: false,
            method: "TON_CONNECT",
            source: sourceName,
            timestamp: new Date().toISOString(),
            error: err.message || "Transaction rejected"
          };
        }
      } else {
        // No mock execution allowed in production. If method is unsupported without wallet, fail.
        executionResult = {
          success: false,
          method,
          source: sourceName,
          timestamp: new Date().toISOString(),
          error: `Execution method ${method} not fully implemented without connected wallet.`
        };
      }

      // 3. LOGGING TO FIRESTORE (Persistence)
      await this.logExecution(
        item, 
        targetPrice, 
        sourceName, 
        executionResult.success ? "SUCCESS" : "FAILED", 
        method, 
        { txHash: executionResult.txHash, error: executionResult.error }
      );

      return executionResult;
    } catch (e: any) {
      await this.logExecution(item, targetPrice, sourceName, "ERROR", method, { error: e.message });
      return {
        success: false,
        method,
        source: sourceName,
        timestamp: new Date().toISOString(),
        error: e.message
      };
    }
  }

  private async logExecution(
    item: TradingItem, 
    price: number, 
    source: string, 
    status: string, 
    method: ExecutionMethod,
    details: { txHash?: string, error?: string }
  ) {
    try {
      await addDoc(collection(db, "executions"), {
        itemId: item.id,
        itemName: item.name,
        price,
        source,
        status,
        method,
        txHash: details.txHash || null,
        error: details.error || null,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("[ExecutionEngine] Failed to log to Firestore:", e);
    }
  }

  /**
   * Логика выбора инструментария (Инженерный уровень)
   */
  private determineBestMethod(source: string): ExecutionMethod {
    const s = source.toLowerCase();
    
    // Check if wallet is connected, if so, we prefer TON_CONNECT for better security
    const walletState = this.walletBridge.getState();
    if (walletState.connected) {
      // Services that support TonConnect
      if (s.includes("tonnel") || s.includes("fragment") || s.includes("getgems")) {
        return "TON_CONNECT";
      }
    }

    if (s.includes("bot") || s.includes("tonnel") || s.includes("rocket")) return "MTPROTO_BOT";
    if (s.includes("fragment") || s.includes("getgems")) return "BLOCKCHAIN_SDK";
    return "TON_CONNECT";
  }
}
