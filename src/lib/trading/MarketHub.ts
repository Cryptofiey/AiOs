import { collection, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { NormalizedOrder, MarketState } from "../../types/market";

/**
 * MarketHub - Централизованный сервис хранения и нормализации рыночных данных.
 * Агрегирует стаканы (Order Books) из Firestore в единую схему.
 */
export class MarketHub {
  private static instance: MarketHub;
  private state: MarketState = {
    items: new Map(),
    globalFloor: 0,
    lastUpdate: new Date().toISOString(),
    activeSources: []
  };

  private listeners: Set<(state: MarketState) => void> = new Set();
  private isNotifying = false;

  private constructor() {
    this.initSync();
  }

  public static getInstance(): MarketHub {
    if (!MarketHub.instance) {
      MarketHub.instance = new MarketHub();
      // Initialize autonomous services AFTER the instance is assigned to the static variable
      // to break the circular dependency recursion loop.
      MarketHub.instance.initializeAutonomousServices();
    }
    return MarketHub.instance;
  }

  private initializeAutonomousServices() {
    // Initialize the autonomous cleaning service
    import("./DataCleanerService").then(({ DataCleanerService }) => {
      DataCleanerService.getInstance().start();
    });
    // Initialize unified WebSocket cluster
    import("./WebSocketManager").then(({ WebSocketManager }) => {
      WebSocketManager.getInstance().connectAll();
    });
  }

  /**
   * Pushes a new real-time tick into the memory state.
   * This provides ultra-low latency updates before Firestore sync kicks in.
   */
  public pushTick(tick: NormalizedOrder) {
    const itemName = tick.metadata?.itemName || "Common Gift";
    
    // Add to state
    if (!this.state.items.has(itemName)) {
      this.state.items.set(itemName, []);
    }
    
    const existing = this.state.items.get(itemName)!;
    // Deduplicate if ID exists
    const index = existing.findIndex(o => o.id === tick.id);
    if (index !== -1) {
      existing[index] = tick;
    } else {
      existing.push(tick);
    }

    // Keep only last 100 orders per item in memory for performance
    if (existing.length > 100) {
      existing.shift();
    }

    // Update global floor if needed
    if (tick.type === "ASK" && (tick.price < this.state.globalFloor || this.state.globalFloor === 0)) {
      this.state.globalFloor = tick.price;
    }

    // Update sources
    if (tick.source && !this.state.activeSources.includes(tick.source)) {
      this.state.activeSources.push(tick.source);
    }

    this.state.lastUpdate = new Date().toISOString();
    this.notify();
  }

  public subscribe(listener: (state: MarketState) => void) {
    this.listeners.add(listener);
    
    // Create safe clones for initial call
    const safeItems = new Map<string, NormalizedOrder[]>();
    this.state.items.forEach((value, key) => {
      safeItems.set(key, [...value]);
    });
    
    const safeState: MarketState = {
      ...this.state,
      items: safeItems,
      activeSources: [...this.state.activeSources]
    };
    
    listener(safeState); // Initial call
    return () => this.listeners.delete(listener);
  }

  private notify() {
    if (this.isNotifying) return;
    this.isNotifying = true;
    try {
      // Create safe clones to avoid React concurrent rendering mutation errors
      const safeItems = new Map<string, NormalizedOrder[]>();
      this.state.items.forEach((value, key) => {
        safeItems.set(key, [...value]);
      });
      
      const safeState: MarketState = {
        ...this.state,
        items: safeItems,
        activeSources: [...this.state.activeSources]
      };
      
      this.listeners.forEach(l => l(safeState));
    } finally {
      this.isNotifying = false;
    }
  }

  public getState(): MarketState {
    const safeItems = new Map<string, NormalizedOrder[]>();
    this.state.items.forEach((value, key) => {
      safeItems.set(key, [...value]);
    });
    
    return {
      ...this.state,
      items: safeItems,
      activeSources: [...this.state.activeSources]
    };
  }

  private initSync() {
    console.log("[MarketHub] Initializing Firestore Market Sync...");
    
    const marketCollection = collection(db, "agent_logs");
    
    onSnapshot(marketCollection, (snapshot) => {
      const ordersByItem: Map<string, NormalizedOrder[]> = new Map();
      const sources: Set<string> = new Set();
      let globalMin = Infinity;
      const now = Date.now();
      const TRUSTED = ["Fragment", "MRKT", "Tonapi", "MTProto Bridge", "GetGems", "Thermos", "PriceNFTbot", "DeDust/StonFi", "Tonnel"];
      const MAX_AGE = 5 * 60 * 1000;

      // Merge with existing items to preserve in-memory pushTick data
      snapshot.docs.forEach(doc => {
        if (!doc.id.startsWith("market_")) return;
        const data = doc.data() as NormalizedOrder;
        
        // Scrubbing logic: filter out untrusted or stale records at the entry point
        const orderTime = new Date(data.timestamp).getTime();
        const isStale = (now - orderTime) > MAX_AGE;
        const isMock = !TRUSTED.includes(data.source);
        
        if (isStale || isMock) return;

        const itemName = data.metadata?.itemName || "Common Gift";
        
        if (!ordersByItem.has(itemName)) {
          ordersByItem.set(itemName, []);
        }
        
        // Deduplicate: if we already have this ID in memory, prefer the newer one
        const existing = ordersByItem.get(itemName)!;
        const index = existing.findIndex(o => o.id === data.id);
        if (index !== -1) {
          const existingTime = new Date(existing[index].timestamp).getTime();
          if (orderTime > existingTime) {
            existing[index] = data;
          }
        } else {
          existing.push(data);
        }
        
        if (data.source) sources.add(data.source);
        
        if (data.type === "ASK" && data.price < globalMin) {
          globalMin = data.price;
        }
      });

      // Also preserve items that are ONLY in memory (from pushTick) but NOT in Firestore yet
      this.state.items.forEach((memoryOrders, itemName) => {
        if (!ordersByItem.has(itemName)) {
          ordersByItem.set(itemName, [...memoryOrders]);
        } else {
          const currentOrders = ordersByItem.get(itemName)!;
          memoryOrders.forEach(mo => {
            if (!currentOrders.find(co => co.id === mo.id)) {
              currentOrders.push(mo);
            }
          });
        }
      });

      this.state.items = ordersByItem;
      this.state.globalFloor = globalMin === Infinity ? 0 : globalMin;
      this.state.lastUpdate = new Date().toISOString();
      this.state.activeSources = Array.from(sources);
      
      console.log(`[MarketHub] State updated. Sources: ${this.state.activeSources.join(", ")}, Global Floor: ${this.state.globalFloor}`);
      this.notify();
    }, (error) => {
      console.warn("[MarketHub] Firestore onSnapshot failed for agent_logs collection:", error);
    });
  }

  /**
   * Метод для очистки данных (Production utility)
   */
  public async clearMarketData() {
    console.log("[MarketHub] Clearing market data...");
    const marketCollection = collection(db, "agent_logs");
    const snapshot = await getDocs(marketCollection);
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  }

  /**
   * Cleans up the current state by removing stale or untrusted data.
   * @param trustedSources List of allowed source names.
   * @param thresholdMs Max age of a record in milliseconds.
   * @returns Number of records removed.
   */
  public cleanup(trustedSources: string[], thresholdMs: number): number {
    let removedTotal = 0;
    const now = Date.now();
    const newItems: Map<string, NormalizedOrder[]> = new Map();

    this.state.items.forEach((orders, itemName) => {
      const filtered = orders.filter(order => {
        const orderTime = new Date(order.timestamp).getTime();
        const isStale = (now - orderTime) > thresholdMs;
        const isMock = !trustedSources.includes(order.source);
        
        if (isStale || isMock) {
          removedTotal++;
          return false;
        }
        return true;
      });

      if (filtered.length > 0) {
        newItems.set(itemName, filtered);
      }
    });

    if (removedTotal > 0) {
      this.state.items = newItems;
      this.state.lastUpdate = new Date().toISOString();
      this.notify();
    }

    return removedTotal;
  }

  /**
   * Возвращает лучший Ask (минимальную цену продажи) для ассета
   */
  public getBestAsk(itemName: string): NormalizedOrder | null {
    const orders = this.state.items.get(itemName) || [];
    const asks = orders.filter(o => o.type === "ASK").sort((a, b) => a.price - b.price);
    return asks.length > 0 ? asks[0] : null;
  }

  /**
   * Возвращает агрегированную глубину рынка
   */
  public getMarketDepth(itemName: string) {
    return this.state.items.get(itemName) || [];
  }

  public getOrderBook(itemName: string): NormalizedOrder[] {
    return this.state.items.get(itemName) || [];
  }

  public getGlobalFloor(): number {
    return this.state.globalFloor;
  }
}
