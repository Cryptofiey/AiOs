import { MarketHub } from "./MarketHub";
import { MTProtoBridge } from "../bridge/MTProtoBridge";
import { NormalizedOrder } from "../../types/market";

export interface MarketplaceSource {
  id: string;
  name: string;
  type: "api" | "mtproto" | "websocket";
  priority: number;
}

export class MarketRegistry {
  private static instance: MarketRegistry;
  private hub: MarketHub;
  private bridge: MTProtoBridge;
  
  private sources: MarketplaceSource[] = [
    { id: "fragment", name: "Fragment", type: "api", priority: 1 },
    { id: "getgems", name: "GetGems", type: "api", priority: 2 },
    { id: "tonapi", name: "Tonapi", type: "api", priority: 3 },
    { id: "pricenftbot", name: "PriceNFTbot", type: "mtproto", priority: 1 },
    { id: "tonnel", name: "Tonnel", type: "mtproto", priority: 2 },
    { id: "mrkt", name: "MRKT", type: "websocket", priority: 4 }
  ];

  private constructor() {
    this.hub = MarketHub.getInstance();
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): MarketRegistry {
    if (!MarketRegistry.instance) {
      MarketRegistry.instance = new MarketRegistry();
    }
    return MarketRegistry.instance;
  }

  /**
   * Returns all registered sources and their current health/activity
   */
  public getSources(): Array<MarketplaceSource & { active: boolean; itemCount: number }> {
    const hubState = this.hub.getState();
    const bridgeStatus = this.bridge.getSessionStatus();

    return this.sources.map(source => {
      let itemCount = 0;
      hubState.items.forEach(orders => {
        itemCount += orders.filter(o => o.source.toLowerCase() === source.id.toLowerCase() || o.source === source.name).length;
      });

      let active = itemCount > 0;
      if (source.type === "mtproto") {
        active = bridgeStatus?.status === "connected";
      }

      return {
        ...source,
        active,
        itemCount
      };
    });
  }

  /**
   * Queries all available prices for an item across all sources
   */
  public getPricesForItem(itemName: string): NormalizedOrder[] {
    const hubState = this.hub.getState();
    return (hubState.items.get(itemName) || []) as NormalizedOrder[];
  }

  /**
   * Queries the best price for an item across all sources
   */
  public async queryBestPrice(itemName: string): Promise<NormalizedOrder | null> {
    const hubState = this.hub.getState();
    const orders = hubState.items.get(itemName) || [];
    
    const bestOrder = orders
      .filter(o => o.type === "ASK")
      .sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        const sourceA = this.sources.find(s => s.name === a.source)?.priority || 99;
        const sourceB = this.sources.find(s => s.name === b.source)?.priority || 99;
        return sourceA - sourceB;
      })[0];

    return (bestOrder as NormalizedOrder) || null;
  }

  /**
   * Gets all aggregated prices currently in the registry
   */
  public getAllAggregatedPrices(): Map<string, NormalizedOrder> {
    const result = new Map<string, NormalizedOrder>();
    const hubState = this.hub.getState();

    hubState.items.forEach((orders, itemName) => {
      const bestAsk = orders
        .filter(o => o.type === "ASK")
        .sort((a, b) => a.price - b.price)[0];
      
      if (bestAsk) {
        result.set(itemName, bestAsk as NormalizedOrder);
      }
    });

    return result;
  }

  /**
   * Subscribe to registry updates
   */
  public subscribe(callback: (itemName: string, order: NormalizedOrder) => void): () => void {
    const lastEmittedIds = new Map<string, string>();

    const unsubscribe = this.hub.subscribe((state) => {
      state.items.forEach((orders, itemName) => {
        const bestAsk = orders.filter(o => o.type === "ASK").sort((a, b) => a.price - b.price)[0];
        if (bestAsk) {
          const currentId = `${bestAsk.id}_${bestAsk.price}`;
          if (lastEmittedIds.get(itemName) !== currentId) {
            lastEmittedIds.set(itemName, currentId);
            callback(itemName, bestAsk as NormalizedOrder);
          }
        }
      });
    });
    return () => { unsubscribe(); };
  }
}
