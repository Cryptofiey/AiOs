import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ArbitrageScanner, DealGroup } from "./ArbitrageScanner";
import { MarketHub } from "./MarketHub";
import { SniperEngine } from "./SniperEngine";
import { ExecutionEngine } from "./ExecutionEngine";
import { TradingItem } from "../../types/trading";
import { MTProtoBridge } from "../bridge/MTProtoBridge";

import { ThermosAdapter } from "../agents/ThermosAdapter";
import { PriceNFTAdapter } from "../agents/PriceNFTAdapter";
// Adapters
import { MarketAdapter } from "../adapters/types";
import { GetGemsAdapter } from "../adapters/GetGemsAdapter";
import { TonApiAdapter } from "../adapters/TonApiAdapter";
import { TonnelAdapter } from "../adapters/TonnelAdapter";
import { MrktAdapter } from "../adapters/MrktAdapter";
import { FragmentAdapter } from "../adapters/FragmentAdapter";
import { PortalsAdapter } from "../adapters/PortalsAdapter";
import { DexAdapter } from "../adapters/DexAdapter";
import { StonFiAdapter } from "../adapters/StonFiAdapter";
import { ServerLogger } from "../utils/ServerLogger";

export interface ServerTick {
  id: string;
  source: string;
  itemName: string;
  price: number;
  type: "ASK" | "BID";
  category: "MARKET" | "AUCTION" | "ORDER";
  timestamp: string;
}

export class ServerMarketEngine {
  private static instance: ServerMarketEngine;
  private hub: MarketHub;
  private sniper: SniperEngine;
  private db: any;
  private scanner: ArbitrageScanner;
  
  // Market Harness
  private networkAdapters: MarketAdapter[] = [];

  private constructor() {
    console.log("[ServerMarketEngine] Initializing reactive market engine...");
    this.hub = MarketHub.getInstance();
    this.sniper = SniperEngine.getInstance();
    this.scanner = ArbitrageScanner.getInstance();
    this.setupHarness();
  }

  public static getInstance(): ServerMarketEngine {
    if (!ServerMarketEngine.instance) {
      ServerMarketEngine.instance = new ServerMarketEngine();
    }
    return ServerMarketEngine.instance;
  }

  /**
   * Starts the engine and all background workers
   */
  public async start() {
    console.log("[ServerMarketEngine] 🚀 Engine starting...");
    
    // Start the reactive sniper engine
    this.sniper.start();

    // Start background poller workers
    this.startNetworkHarnessWorker();
    this.startFragmentWorker();
    this.startThermosWorker();
    this.startPriceNFTBotWorker();
  }

  public getNetworkAdapters(): MarketAdapter[] {
    return this.networkAdapters;
  }

  private setupHarness() {
    // Register network adapters
    this.networkAdapters.push(new GetGemsAdapter());
    this.networkAdapters.push(new TonApiAdapter());
    this.networkAdapters.push(new TonnelAdapter());
    this.networkAdapters.push(new MrktAdapter());
    this.networkAdapters.push(new FragmentAdapter());
    this.networkAdapters.push(new PortalsAdapter());
    
    // DexAdapter and StonFiAdapter are disabled as per user request to focus on non-crypto assets
    // this.networkAdapters.push(new DexAdapter());
    // this.networkAdapters.push(new StonFiAdapter());
    
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
    this.hub.setPersistence(dbInstance);
  }

  // Preload historical data
  public async preloadHistoricalData() {
    console.log("[ServerMarketEngine] ⏳ Loading historical market data...");
    // Actual historical loading logic would go here if needed
  }

  // Atomically push tick and trigger reactive scanner
  public async pushTick(tick: ServerTick) {
    await this.pushTicks([tick]);
  }

  public async pushTicks(ticks: ServerTick[]) {
    if (!ticks || ticks.length === 0) return;

    // Route through MarketHub for unified state and persistence
    const normalizedTicks = ticks.map(tick => ({
      id: tick.id,
      source: tick.source,
      price: tick.price,
      currency: "TON" as const,
      type: tick.type as "ASK" | "BID",
      category: tick.category,
      timestamp: tick.timestamp,
      metadata: {
        itemName: tick.itemName
      }
    }));

    await this.hub.pushTicks(normalizedTicks);
  }

  // Atomic Worker: Network Harness Poller
  public startNetworkHarnessWorker() {
    // Run initial scan
    this.scanAllAdapters();
    
    // Set up interval for subsequent scans
    setInterval(async () => {
      await this.scanAllAdapters();
    }, 30000); // 30 seconds for full cycle
    
    console.log("[Worker:NetworkHarness] Background watcher started.");
  }

  private async scanAllAdapters() {
    for (const adapter of this.networkAdapters) {
      try {
        // Stagger: wait 2 seconds between adapters to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const rawItems = await adapter.fetchLatestListings();

        if (!rawItems || rawItems.length === 0) continue;
        
        const ticksToPush: ServerTick[] = [];
        for (const raw of rawItems) {
          const tick = adapter.normalizeData(raw);
          if (tick) {
            ticksToPush.push({
              id: tick.id,
              source: tick.source,
              itemName: tick.metadata?.itemName || "Unknown",
              price: tick.price,
              type: tick.type as "ASK" | "BID",
              category: tick.category,
              timestamp: tick.timestamp
            });
          }
        }

        if (ticksToPush.length > 0) {
          await this.pushTicks(ticksToPush);
          console.debug(`[HARNESS] Normalized & pushed ${ticksToPush.length} ticks from ${adapter.name}.`);
        }
      } catch (e: any) {
        ServerLogger.getInstance().log("HARNESS", `Atomic task failed for ${adapter.name}: ${e.message}`, "error");
      }
    }
  }

  // Atomic Worker 2: Fragment Poller
  public startFragmentWorker() {
    setInterval(async () => {
      try {
        // Here we could add specific Fragment-only checks if needed, 
        // but currently all data flows through the main Harness poller.
      } catch (err: any) {
        console.warn("[Worker:Fragment] Atomic task failed:", err.message);
      }
    }, 10000);
    console.log("[Worker:Fragment] Background watcher started.");
  }

  // Atomic Worker 3: Thermos Aggregator (Telegram Bot)
  public async startThermosWorker() {
    const adapter = ThermosAdapter.getInstance();
    
    adapter.onPriceUpdate((data: any) => {
      this.pushTick({
        id: `stable_${data.source.toLowerCase()}_${(data.itemName || "unknown").toLowerCase().replace(/\s+/g, "_")}`,
        source: data.source,
        itemName: data.itemName,
        price: data.price,
        type: "ASK",
        category: "MARKET",
        timestamp: data.timestamp
      });
    });
    console.log("[Worker:Thermos] Background watcher started via ThermosAdapter.");
  }

  // Atomic Worker 4: NFT GIFT Calculator (Telegram Bot)
  public async startPriceNFTBotWorker() {
    const adapter = PriceNFTAdapter.getInstance();
    
    adapter.onPriceUpdate((data: any) => {
      this.pushTick({
        id: `stable_${data.source.toLowerCase()}_${(data.itemName || "unknown").toLowerCase().replace(/\s+/g, "_")}`,
        source: data.source,
        itemName: data.itemName,
        price: data.price,
        type: "ASK",
        category: "MARKET",
        timestamp: data.timestamp
      });
    });
    console.log("[Worker:PriceNFTbot] Background watcher started via PriceNFTAdapter.");
  }
}
