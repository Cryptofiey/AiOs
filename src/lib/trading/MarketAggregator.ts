import { PriceCorridors, TradingItem } from "../../types/trading";
import { MarketHub } from "./MarketHub";
import { INITIAL_TRENDS } from "./MarketTrends";

export interface MarketSource {
  id: string;
  name: string;
  url: string;
  type: "MARKET" | "P2P" | "AGGREGATOR";
  weight: number; // Importance for floor calculation
}

export class MarketAggregator {
  private static instance: MarketAggregator;
  private hub: MarketHub;
  private sources: MarketSource[] = [
    { id: "fragment", name: "Fragment", url: "https://fragment.com", type: "MARKET", weight: 1.0 },
    { id: "getgems", name: "GetGems", url: "https://getgems.io", type: "MARKET", weight: 0.8 },
    { id: "tonapi", name: "Tonapi", url: "https://tonapi.io", type: "AGGREGATOR", weight: 0.98 },
    { id: "tonnel", name: "Tonnel", url: "https://t.me/Tonnel_Network_bot", type: "P2P", weight: 0.95 },
    { id: "mrkt", name: "MRKT Bot", url: "https://t.me/mrkt", type: "P2P", weight: 0.7 },
    { id: "cryptobot", name: "CryptoBot", url: "https://t.me/CryptoBot", type: "P2P", weight: 0.5 },
    { id: "xrocket", name: "X-Rocket", url: "https://t.me/xrocket", type: "P2P", weight: 0.4 },
    { id: "tonviewer", name: "Tonviewer", url: "https://tonviewer.com", type: "AGGREGATOR", weight: 0.9 },
    { id: "stonfi", name: "STON.fi", url: "https://ston.fi", type: "MARKET", weight: 0.6 },
    { id: "portals", name: "Portals", url: "https://portals-market.com", type: "MARKET", weight: 0.95 }
  ];

  public static getInstance(): MarketAggregator {
    if (!MarketAggregator.instance) {
      MarketAggregator.instance = new MarketAggregator();
    }
    return MarketAggregator.instance;
  }

  private constructor() {
    this.hub = MarketHub.getInstance();
  }

  /**
   * Returns historical volatility for an item
   */
  public getHistoricalVolatility(itemName: string): number {
    const trend = INITIAL_TRENDS.find(t => t.name === itemName);
    return trend ? trend.volatility : 5.0; // Default 5% if not found
  }

  /**
   * Calculates the 4 SIH-style price corridors for an item
   * @param floorPrice Current absolute floor across main sources
   * @param attributes Confidence factor for premium (rare attributes)
   */
  public calculateCorridors(floorPrice: number, attributePremium: number = 1.0): PriceCorridors {
    return {
      green: floorPrice * 0.82,  // Limit buy (Patient bottom)
      blue: floorPrice * 0.94,   // Instant buy (Sniper floor)
      yellow: floorPrice * 1.08, // Instant sell (Market rotation)
      red: floorPrice * (1.5 * attributePremium), // Premium sell (Collectors/Rare)
    };
  }

  /**
   * Возвращает агрегированные коридоры и данные стакана (floor, safeExit, redLine, bidWall)
   */
  public getUnifiedCorridors(itemName: string): { floor: number; safeExit: number; redLine: number; bidWall: number } | null {
    const unified = this.getUnifiedPrice(itemName);
    if (!unified) return null;
    
    const corridors = this.calculateCorridors(unified.floor);
    const depth = this.analyzeMarketDepth(itemName);
    
    return {
      floor: unified.floor,
      safeExit: corridors.yellow,
      redLine: corridors.red,
      bidWall: depth.buyWall
    };
  }

  /**
   * Возвращает "Золотой Стандарт" цены для актива, агрегируя данные через MarketHub.
   * Выбирает репрезентативный флор (обычно второй-третий по счету ask), чтобы избежать ложных срабатываний на выбросы.
   */
  public getUnifiedPrice(itemName: string): { floor: number; bestSource: string; sourcesCount: number; category: string } | null {
    const orders = this.hub.getOrderBook(itemName);
    // Prefer MARKET as the primary source for floor calculation
    const asks = orders
      .filter(o => o.type === "ASK")
      .sort((a, b) => {
        // Priority: MARKET > AUCTION > ORDER
        const pMap = { MARKET: 1, AUCTION: 2, ORDER: 3 };
        const pA = pMap[a.category] || 99;
        const pB = pMap[b.category] || 99;
        if (pA !== pB) return pA - pB;
        return a.price - b.price;
      });
    
    if (asks.length === 0) return null;
    
    const representativeAsk = asks.length >= 2 ? asks[1] : asks[0];

    return {
      floor: representativeAsk.price,
      bestSource: representativeAsk.source,
      sourcesCount: asks.length,
      category: representativeAsk.category
    };
  }

  /**
   * Simulates finding the best arbitrage opportunity across aggregated sources
   */
  public getBestArbitrage(itemName: string): { entry: number; exit: number; profit: number; route: string } | null {
    const unified = this.getUnifiedPrice(itemName);
    if (!unified) return null;

    const redLine = unified.floor * 1.5;
    
    return {
      entry: unified.floor,
      exit: redLine,
      profit: redLine - unified.floor,
      route: `${unified.bestSource} -> Fragment (Premium)`
    };
  }

  /**
   * Analyzes market depth to find the "Green" line
   */
  public analyzeMarketDepth(itemName: string): { depth: number; buyWall: number; topBidCategory: string } {
    const orders = this.hub.getOrderBook(itemName);
    // Include BIDs from MARKET and ORDER (Instant Sells) as the most reliable walls
    const bids = orders
      .filter(o => o.type === "BID")
      .sort((a, b) => {
        // Priority for wall: ORDER > MARKET > AUCTION
        const pMap = { ORDER: 1, MARKET: 2, AUCTION: 3 };
        const pA = pMap[a.category] || 99;
        const pB = pMap[b.category] || 99;
        if (pA !== pB) return pA - pB;
        return b.price - a.price; // Higher price first
      });
    
    if (bids.length > 0) {
      return {
        depth: bids.length,
        buyWall: bids[0].price,
        topBidCategory: bids[0].category
      };
    }

    return {
      depth: 0,
      buyWall: 0,
      topBidCategory: "NONE"
    };
  }

  /**
   * Aggregates order books from all tracked platforms via MarketHub
   */
  public getUnifiedOrderBook(itemName: string): { bids: Array<{p: number, q: number, s: string}>, asks: Array<{p: number, q: number, s: string}> } {
    const orders = this.hub.getOrderBook(itemName);
    
    // Sort and format for unified display
    const bids = orders
      .filter(o => o.type === "BID")
      .sort((a, b) => b.price - a.price)
      .map(o => ({ p: o.price, q: 1, s: o.source }));
      
    const asks = orders
      .filter(o => o.type === "ASK")
      .sort((a, b) => a.price - b.price)
      .map(o => ({ p: o.price, q: 1, s: o.source }));

    return { bids, asks };
  }

  /**
   * Returns current connectivity status for all platforms
   */
  public getPlatformsStatus(): Array<{ id: string; name: string; status: "online" | "latency" | "offline"; ping: number }> {
    return this.sources.map(s => ({
      id: s.id,
      name: s.name,
      status: "online",
      ping: 0 // Real network ping would be calculated via adapter health checks
    }));
  }

  public async getAggregatedMarketData(category: string = "ALL"): Promise<any[]> {
    return [];
  }

  public async scanArbitrageOpportunities(): Promise<any[]> {
    return [];
  }
}
