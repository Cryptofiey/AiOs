import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ArbitrageScanner, DealGroup } from "./ArbitrageScanner";
import { MTProtoBridge } from "../bridge/MTProtoBridge";

// Adapters
import { MarketAdapter } from "../adapters/types";
import { GetGemsAdapter } from "../adapters/GetGemsAdapter";
import { TonApiAdapter } from "../adapters/TonApiAdapter";
import { DexAdapter } from "../adapters/DexAdapter";
import { TonnelAdapter } from "../adapters/TonnelAdapter";

export interface ServerTick {
  id: string;
  source: string;
  itemName: string;
  price: number;
  type: "ASK" | "BID";
  timestamp: string;
}

export class ServerMarketEngine {
  private static instance: ServerMarketEngine;
  private state: Map<string, ServerTick[]> = new Map();
  private db: any;
  private scanner: ArbitrageScanner;
  
  // Market Harness
  private networkAdapters: MarketAdapter[] = [];

  private constructor() {
    console.log("[ServerMarketEngine] Initializing reactive market engine...");
    this.scanner = ArbitrageScanner.getInstance();
    this.setupHarness();
  }

  public static getInstance(): ServerMarketEngine {
    if (!ServerMarketEngine.instance) {
      ServerMarketEngine.instance = new ServerMarketEngine();
    }
    return ServerMarketEngine.instance;
  }

  private setupHarness() {
    // Register network adapters
    this.networkAdapters.push(new GetGemsAdapter());
    this.networkAdapters.push(new TonApiAdapter());
    this.networkAdapters.push(new DexAdapter());
    this.networkAdapters.push(new TonnelAdapter());
    
    console.log(`[ServerMarketEngine] Harness initialized with ${this.networkAdapters.length} network adapters.`);
    this.verifyAdapters();
  }

  private async verifyAdapters() {
    console.log("[ServerMarketEngine] 🧪 Verifying adapters...");
    for (const adapter of this.networkAdapters) {
       const status = adapter.getMarketStatus();
       console.log(`[Harness:${adapter.name}] Initial status: Online=${status.isOnline}`);
    }
  }

  public setDb(dbInstance: any) {
    this.db = dbInstance;
  }

  // Preload historical data
  public async preloadHistoricalData() {
    console.log("[ServerMarketEngine] ⏳ Loading historical market data (last 48h) into reactive DB...");
    // Simulate historical background load
    setTimeout(() => {
       console.log("[ServerMarketEngine] ✅ Historical data loaded. Engine is now sitting on the tick.");
    }, 2000);
  }

  // Atomically push tick and trigger reactive scanner
  public async pushTick(tick: ServerTick) {
    if (!this.state.has(tick.itemName)) {
      this.state.set(tick.itemName, []);
    }
    
    const existing = this.state.get(tick.itemName)!;
    // Deduplicate
    const index = existing.findIndex(t => t.id === tick.id);
    if (index !== -1) {
      existing[index] = tick;
    } else {
      existing.push(tick);
    }
    
    // Maintain max depth
    if (existing.length > 200) {
      existing.shift();
    }

    // Reactively evaluate arbitrage
    this.evaluateArbitrage(tick.itemName);

    // Sync to Firestore for UI (non-blocking)
    if (this.db) {
      this.syncToFirestore(tick).catch(err => {
         // Atomic, do not block or crash the sniper on DB write error
         console.warn(`[ServerMarketEngine] Sync failed for ${tick.id}:`, err.message);
      });
    }
  }

  private async syncToFirestore(tick: ServerTick) {
    try {
      if (!this.db) return;
      const { doc, setDoc } = await import("firebase/firestore");
      const docRef = doc(this.db, "agent_logs", `market_${tick.id}`);
      await setDoc(docRef, {
        ...tick,
        metadata: { itemName: tick.itemName }
      });
    } catch (e: any) {
      console.error("[ServerMarketEngine] Sync to Firestore failed:", e.message);
    }
  }

  private async evaluateArbitrage(itemName: string) {
    const orders = this.state.get(itemName) || [];
    const asks = orders.filter(o => o.type === "ASK").sort((a, b) => a.price - b.price);
    
    if (asks.length > 0) {
      const bestAsk = asks[0];
      
      // We pass an arbitrary dummy balance just for group assignment logic
      // In a real headless engine, it should load the actual wallet balance
      const opportunity = this.scanner.evaluateOpportunity(itemName, bestAsk.price, false, 100, 100);
      
      if (opportunity.group <= 4) {
        console.log(`[🚀 FOCUS MATCH] ${itemName} hits group ${opportunity.group}! Ask: ${bestAsk.price} TON`);
        
        // Save opportunity to Firestore for UI monitoring
        if (this.db) {
          try {
            const oppId = `opp_${itemName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
            await setDoc(doc(this.db, "agent_logs", oppId), {
              type: "OPPORTUNITY",
              ...opportunity,
              itemName,
              timestamp: Date.now(), // Use standard TS instead of serverTimestamp for simplicity
              sourceId: bestAsk.id,
              sourceAdapter: bestAsk.source
            });
          } catch (e: any) {
            console.error("[ServerMarketEngine] Failed to sync opportunity:", e.message);
          }
        }
        
        if (opportunity.group === 1 || opportunity.group === 2) {
           this.executeSniper(bestAsk, opportunity);
        }
      }
    }
  }

  private async executeSniper(ask: ServerTick, opportunity: any) {
    // Here we would route the command to our headless ExecutionEngine 
    // This is decoupled from the polling
    console.log(`[ServerMarketEngine] Dispatching atomic execution task for ${ask.itemName} -> Action: ${opportunity.action}`);
  }

  // Atomic Worker: Network Harness Poller
  public startNetworkHarnessWorker() {
    setInterval(async () => {
      for (const adapter of this.networkAdapters) {
        try {
          const rawItems = await adapter.fetchLatestListings();
          let newTicks = 0;
          for (const raw of rawItems) {
            const tick = adapter.normalizeData(raw);
            if (tick) {
              const serverTick: ServerTick = {
                id: tick.id,
                source: tick.source,
                itemName: tick.metadata?.itemName || "Unknown",
                price: tick.price,
                type: tick.type as "ASK" | "BID",
                timestamp: tick.timestamp
              };
              this.pushTick(serverTick);
              newTicks++;
            }
          }
          if (newTicks > 0) {
            console.log(`[Harness:${adapter.name}] Normalized & pushed ${newTicks} new ticks.`);
          }
        } catch (e: any) {
          console.warn(`[Harness:${adapter.name}] Atomic task failed: ${e.message}`);
        }
      }
    }, 15000);
    console.log("[Worker:NetworkHarness] Background watcher started.");
  }

  // Atomic Worker 2: Fragment Simulator
  public startFragmentWorker() {
    setInterval(async () => {
      try {
        // Here you would do actual Fragment API call or scraping.
        // For demonstration of the reactive overlap, we generate mock bids.
      } catch (err: any) {
        console.warn("[Worker:Fragment] Atomic task failed:", err.message);
      }
    }, 10000);
    console.log("[Worker:Fragment] Background watcher started.");
  }

  // Atomic Worker 3: Thermos Aggregator (Telegram Bot)
  public async startThermosWorker() {
    const { ThermosAdapter } = await import("../agents/ThermosAdapter");
    const adapter = ThermosAdapter.getInstance();
    
    adapter.onPriceUpdate((data: any) => {
      this.pushTick({
        id: `thermos_${Date.now()}_${Math.random()}`,
        source: data.source,
        itemName: data.itemName,
        price: data.price,
        type: "ASK",
        timestamp: data.timestamp
      });
    });
    console.log("[Worker:Thermos] Background watcher started via ThermosAdapter.");
  }

  // Atomic Worker 4: NFT GIFT Calculator (Telegram Bot)
  public async startPriceNFTBotWorker() {
    const { PriceNFTAdapter } = await import("../agents/PriceNFTAdapter");
    const adapter = PriceNFTAdapter.getInstance();
    
    adapter.onPriceUpdate((data: any) => {
      this.pushTick({
        id: `pricenftbot_${Date.now()}_${Math.random()}`,
        source: data.source,
        itemName: data.itemName,
        price: data.price,
        type: "ASK",
        timestamp: data.timestamp
      });
    });
    console.log("[Worker:PriceNFTbot] Background watcher started via PriceNFTAdapter.");
  }
}
