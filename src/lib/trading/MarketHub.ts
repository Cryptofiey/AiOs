import { collection, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { NormalizedOrder, MarketState } from "../../types/market";
import { FirestoreQuotaManager } from '../utils/FirestoreQuotaManager';

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
    activeSources: [],
    adapterStatus: {}
  };

  private listeners: Set<(state: MarketState) => void> = new Set();
  private isNotifying = false;
  private isPolling = false;
  private pollInterval: any = null;
  private persistenceDb: any = null;
  private isSyncInitialized = false;
  private lastSyncedPrices = new Map<string, { price: number; timestamp: number }>();

  private constructor() {
    // initSync will be called when persistenceDb is set via setPersistence
    if (typeof window !== "undefined") {
      this.startPolling(15000); // Poll every 15 seconds to fetch latest listings from the network adapters via the server
    }
  }

  public startPolling(intervalMs: number = 15000) {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log(`[MarketHub] Starting real-time API polling every ${intervalMs}ms...`);
    this.fetchRealTimeData();
    this.pollInterval = setInterval(() => this.fetchRealTimeData(), intervalMs);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  public async fetchAdapterStatus() {
    if (typeof window === "undefined") return;
    try {
      const response = await fetch("/api/market/status");
      if (!response.ok) return;
      const statusArr = await response.json();
      const statusMap = {};
      statusArr.forEach((s: any) => {
          statusMap[s.name] = s.isOnline;
      });
      this.state.adapterStatus = statusMap;
      this.notifyListeners();
    } catch (e: any) {
      console.warn("[MarketHub] Failed to fetch adapter status:", e.message);
    }
  }

  public async fetchRealTimeData() {
    if (typeof window === "undefined") return;
    try {
      await this.fetchAdapterStatus();
      const response = await fetch("/api/market/listings");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const ticks: NormalizedOrder[] = await response.json();
      
      if (ticks && ticks.length > 0) {
        // Only log if we actually got new data
        console.debug(`[MarketHub] Fetched ${ticks.length} real-time ticks from backend API.`);
        this.pushTicks(ticks);
      }
    } catch (e: any) {
      console.warn("[MarketHub] Failed to fetch real-time listings from API:", e.message);
    }
  }

  public async fetchRealTimeOrderBook(itemName: string) {
    if (typeof window === "undefined") return null;
    try {
      const response = await fetch(`/api/market/orderbook?item=${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      console.log(`[MarketHub] Fetched real-time orderbook for ${itemName} from backend API.`, data);
      
      const bids: NormalizedOrder[] = data.bids || [];
      const asks: NormalizedOrder[] = data.asks || [];
      
      bids.forEach(tick => this.pushTick(tick));
      asks.forEach(tick => this.pushTick(tick));
      
      return data;
    } catch (e: any) {
      console.warn(`[MarketHub] Failed to fetch order book for ${itemName} from API:`, e.message);
      return null;
    }
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
    // Only initialize autonomous background services on the server
    if (typeof window !== "undefined") return;

    // Initialize the autonomous cleaning service
    import("./DataCleanerService").then(({ DataCleanerService }) => {
      DataCleanerService.getInstance().start();
    });
    // Initialize unified WebSocket cluster
    import("./WebSocketManager").then(({ WebSocketManager }) => {
      WebSocketManager.getInstance().connectAll();
    });
  }

  public setPersistence(db: any) {
    this.persistenceDb = db;
    console.log("[MarketHub] Persistence DB configured.");
    this.initSync();
  }

  /**
   * Pushes multiple ticks and notifies listeners once at the end.
   */
  public pushTicks(ticks: NormalizedOrder[]) {
    if (!ticks || ticks.length === 0) return;
    
    ticks.forEach(tick => {
      this.processTickInternal(tick);
    });
    
    this.state.lastUpdate = new Date().toISOString();
    this.notify();
    
    // Batch sync to firestore if needed
    if (this.persistenceDb) {
      ticks.forEach(tick => {
        this.syncToFirestore(tick).catch(() => {});
      });
    }
  }

  private processTickInternal(tick: NormalizedOrder) {
    const itemName = tick.metadata?.itemName || "Common Gift";
    
    if (!this.state.items.has(itemName)) {
      this.state.items.set(itemName, []);
    }
    
    const existing = this.state.items.get(itemName)!;
    const index = existing.findIndex(o => o.id === tick.id);
    if (index !== -1) {
      existing[index] = tick;
    } else {
      existing.push(tick);
    }

    if (existing.length > 100) {
      existing.shift();
    }

    if (tick.type === "ASK" && (tick.price < this.state.globalFloor || this.state.globalFloor === 0)) {
      this.state.globalFloor = tick.price;
    }

    if (tick.source) {
      const lowerS = tick.source.toLowerCase();
      if (!this.state.activeSources.some(s => s.toLowerCase() === lowerS)) {
        this.state.activeSources.push(tick.source);
      }
    }
  }

  /**
   * Pushes a new real-time tick into the memory state.
   */
  public async pushTick(tick: NormalizedOrder) {
    this.processTickInternal(tick);
    this.state.lastUpdate = new Date().toISOString();
    this.notify();

    if (this.persistenceDb) {
      this.syncToFirestore(tick).catch(err => {
        console.warn(`[MarketHub] Persistence failed for ${tick.id}:`, err.message);
      });
    }
  }

  private async syncToFirestore(tick: NormalizedOrder) {
    try {
      if (!this.persistenceDb) return;
      
      // Stop writing to Firestore if quota is exhausted
      if (!FirestoreQuotaManager.canWrite()) {
        return;
      }

      // Throttle and optimize writes: 
      // Only sync if price has changed, or if it has been more than 120 seconds since the last sync of this item from this source.
      const key = `${tick.source}_${tick.metadata?.itemName || "Unknown"}_${tick.type}_${tick.category}`;
      const now = Date.now();
      const lastSync = this.lastSyncedPrices.get(key);
      
      if (lastSync) {
        const priceUnchanged = lastSync.price === tick.price;
        const timeSinceLastSync = now - lastSync.timestamp;
        
        if (priceUnchanged || timeSinceLastSync < 120000) {
          return;
        }
      }
      
      // Update our throttle cache
      this.lastSyncedPrices.set(key, { price: tick.price, timestamp: now });

      const docId = `market_${tick.id}`;
      const payload = {
        ...tick,
        timestamp: tick.timestamp || new Date().toISOString(),
        metadata: {
          ...tick.metadata,
          processedAt: new Date().toISOString()
        }
      };

      if (typeof this.persistenceDb.collection === "function") {
        // Admin SDK
        await this.persistenceDb.collection("agent_logs").doc(docId).set(payload);
      } else {
        // Client SDK
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(this.persistenceDb, "agent_logs", docId), payload);
      }
    } catch (e: any) {
      FirestoreQuotaManager.handleWriteFailure(e);
      console.error("[MarketHub] syncToFirestore error:", e.message || e);
    }
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
    if (!this.persistenceDb) {
      console.log("[MarketHub] Persistence DB not ready for sync. Waiting...");
      return;
    }
    console.log("[MarketHub] Initializing Firestore Market Sync...");
    
    // Check if it's Admin SDK or Client SDK
    let marketCollection: any;
    if (typeof this.persistenceDb.collection === "function") {
      // Admin SDK doesn't support onSnapshot in the same way, we might need a different approach 
      // or check if persistenceDb is actually the Admin SDK and use it.
      // Actually, if it's Admin SDK, we'll use it if possible, but FileSystemFirestore is better here.
      if (this.persistenceDb.constructor.name === "FileSystemFirestore") {
         // FileSystemFirestore can just return the local state as initial sync
         console.log("[MarketHub] Using FileSystemFirestore for sync (local).");
         return;
      }
      
      // For real Admin SDK, we can't easily onSnapshot here without more complex setup
      // but we can at least avoid using the problematic static 'db'.
      marketCollection = this.persistenceDb.collection("agent_logs");
    } else {
      // Client SDK
      marketCollection = query(collection(this.persistenceDb, "agent_logs"), orderBy("timestamp", "desc"), limit(500));
    }
    
    // onSnapshot is only available on Client SDK or if persistenceDb has it (FileSystemFirestore might)
    if (typeof (marketCollection as any).onSnapshot === "function") {
      (marketCollection as any).onSnapshot((snapshot: any) => {
        this.processSnapshot(snapshot);
      }, (error: any) => {
        console.warn("[MarketHub] Firestore onSnapshot failed for agent_logs collection:", error);
      });
    } else if (typeof this.persistenceDb === "object" && typeof (this.persistenceDb as any).onSnapshot === "function") {
      // Direct onSnapshot on DB (some mocks do this)
      (this.persistenceDb as any).onSnapshot("agent_logs", (snapshot: any) => {
        this.processSnapshot(snapshot);
      });
    } else if (typeof window === "undefined" && !this.isSyncInitialized) {
       // On server with Admin SDK, we just do a one-time fetch or rely on internal pushTick
       this.isSyncInitialized = true;
       console.log("[MarketHub] Server mode: initial sync completed via one-time load bypass.");
    }
  }

  private processSnapshot(snapshot: any) {
    // Avoid infinite feedback loops by checking if any of the document changes actually affect market ticks (doc.id starts with "market_")
    if (this.isSyncInitialized) {
      const hasMarketChanges = snapshot.docChanges().some((change: any) => change.doc.id.startsWith("market_"));
      if (!hasMarketChanges) {
        // If no market ticks were added, modified, or removed, skip state update and notify to prevent feedback loop
        return;
      }
    }
    this.isSyncInitialized = true;

    const ordersByItem: Map<string, NormalizedOrder[]> = new Map();
    const sources: Set<string> = new Set();
    let globalMin = Infinity;
    const now = Date.now();
    const TRUSTED = ["Fragment", "MRKT", "TonAPI", "MTProto Bridge", "GetGems", "Thermos", "PriceNFTbot", "DeDust/StonFi", "Tonnel", "Portals"];
    const MAX_AGE = 60 * 60 * 1000; // 1 hour for local state, but Firestore keeps it longer

    // Merge with existing items to preserve in-memory pushTick data
    snapshot.docs.forEach((doc: any) => {
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

    // Ensure default/core sources are always registered as active so they appear in dropdowns/filters
    const defaultSources = ["Fragment", "MRKT", "Portals", "GetGems", "TonAPI", "Tonnel"];
    defaultSources.forEach(s => {
      if (!Array.from(sources).some(existing => existing.toLowerCase() === s.toLowerCase())) {
        sources.add(s);
      }
    });
    this.state.activeSources = Array.from(sources);
    
    console.debug(`[MarketHub] State updated. Sources: ${this.state.activeSources.join(", ")}, Global Floor: ${this.state.globalFloor}`);
    this.notify();
  }

  /**
   * Метод для очистки данных (Production utility)
   */
  public async clearMarketData() {
    console.log("[MarketHub] Clearing market data...");
    if (!FirestoreQuotaManager.canWrite()) {
       console.warn("[MarketHub] Clearing bypassed due to Quota suspension");
       return;
    }
    const marketCollection = collection(db, "agent_logs");
    const snapshot = await getDocs(marketCollection);
    for (const doc of snapshot.docs) {
      try {
         await deleteDoc(doc.ref);
      } catch (e) {
         FirestoreQuotaManager.handleWriteFailure(e);
      }
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

  public getOrdersByCategory(itemName: string, category: "MARKET" | "AUCTION" | "ORDER"): NormalizedOrder[] {
    return (this.state.items.get(itemName) || []).filter(o => o.category === category);
  }

  public getCategoryCounts(): Record<string, number> {
    const counts = { MARKET: 0, AUCTION: 0, ORDER: 0 };
    this.state.items.forEach(orders => {
      orders.forEach(o => {
        if (o.category in counts) {
          counts[o.category as keyof typeof counts]++;
        }
      });
    });
    return counts;
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
