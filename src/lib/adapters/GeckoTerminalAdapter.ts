import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";

export class GeckoTerminalAdapter implements MarketAdapter {
  public readonly name = "GeckoTerminal";
  private isOnline = true;
  private lastPolled = new Date().toISOString();

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      const res = await fetch("https://api.geckoterminal.com/api/v2/networks/ton/pools");
      if (!res.ok) throw new Error("GeckoTerminal API error");
      const data = await res.json();
      this.isOnline = true;
      if (!data || !data.data || !Array.isArray(data.data)) return [];
      
      return data.data;
    } catch (e) {
      this.isOnline = false;
      return [];
    }
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (!rawData || !rawData.attributes || !rawData.attributes.name) return null;
    
    const name = rawData.attributes.name;
    let itemName = name;
    let priceInTon = 0;
    
    // Example name: "USD₮ / TON"
    const parts = name.split(" / ");
    if (parts.length === 2) {
      if (parts[1] === "TON") {
        itemName = parts[0];
        priceInTon = parseFloat(rawData.attributes.base_token_price_native_currency);
      } else if (parts[0] === "TON") {
        itemName = parts[1];
        priceInTon = parseFloat(rawData.attributes.quote_token_price_native_currency);
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    if (!priceInTon || isNaN(priceInTon)) return null;

    return {
      id: `gt_${rawData.attributes.address || Date.now()}`,
      source: this.name,
      price: priceInTon,
      currency: "TON",
      type: "ASK",
      category: "MARKET",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: itemName
      }
    };
  }

  public getMarketStatus() {
    return {
      isOnline: this.isOnline,
      lastPolled: this.lastPolled,
      rateLimitReset: null
    };
  }
  public async fetchOrders(queryText?: string): Promise<NormalizedOrder[]> { return []; }
  public async fetchOrderBook(itemName: string): Promise<{ bids: NormalizedOrder[]; asks: NormalizedOrder[] }> { return { bids: [], asks: [] }; }
  public async fetchOffers(itemName: string): Promise<NormalizedOrder[]> { return []; }
  public async fetchMarketPrice(itemName: string): Promise<number | null> { return null; }
  public getAvailableOrderTypes(): Array<"ASK" | "BID" | "LIMIT" | "MARKET" | "OFFER"> { return ["ASK"]; }
}
