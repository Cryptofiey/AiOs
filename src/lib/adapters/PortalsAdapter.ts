import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { AuthAgent } from "../agents/AuthAgent";
import { ApiManager } from "../api-manager/ApiManager";
import { DataNormalizer } from "../trading/DataNormalizer";

export class PortalsAdapter implements MarketAdapter {
  public readonly name = "Portals";
  private isOnline = true;
  private lastPolled = new Date().toISOString();
  private static hasWarnedMissingToken = false;

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      const authAgent = AuthAgent.getInstance();
      const token = await authAgent.getToken("PORTALS_AUTH");
      
      if (!token) {
        this.isOnline = false;
        console.warn(`[${this.name}Adapter] 🔴 OFFLINE: Missing PORTALS_AUTH token.`);
        return [];
      }

      const url = "https://portals.market/api/nfts/search?offset=0&limit=20&sort_by=price+asc&status=listed";
      
      const response = await ApiManager.getInstance().fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
             this.isOnline = false;
             console.warn(`[${this.name}Adapter] 🔴 OFFLINE: Token expired or Cloudflare blocked (Status ${response.status}).`);
             return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.isOnline = true;
      return data.items || [];
    } catch (error: any) {
      this.isOnline = false;
      console.error(`[${this.name}Adapter] Error fetching:`, error.message);
      return [];
    }
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    return DataNormalizer.normalize(this.name, rawData);
  }

  public getMarketStatus() {
    return {
      isOnline: this.isOnline,
      lastPolled: this.lastPolled
    };
  }

  public async fetchOrders(queryText?: string): Promise<NormalizedOrder[]> {
    const rawListings = await this.fetchLatestListings();
    const normalized = rawListings
      .map(item => this.normalizeData(item))
      .filter((order): order is NormalizedOrder => order !== null);

    if (queryText) {
      const lower = queryText.toLowerCase();
      return normalized.filter(order => order.metadata.itemName.toLowerCase().includes(lower));
    }
    return normalized;
  }

  public async fetchOrderBook(itemName: string): Promise<{ bids: NormalizedOrder[]; asks: NormalizedOrder[] }> {
    const orders = await this.fetchOrders(itemName);
    const asks = orders.filter(o => o.type === "ASK").sort((a, b) => a.price - b.price);
    const bids = orders.filter(o => o.type === "BID").sort((a, b) => b.price - a.price);
    
    return { bids, asks };
  }

  public async fetchOffers(itemName: string): Promise<NormalizedOrder[]> {
    const book = await this.fetchOrderBook(itemName);
    return book.bids;
  }

  public async fetchMarketPrice(itemName: string): Promise<number | null> {
    const orders = await this.fetchOrders(itemName);
    const asks = orders.filter(o => o.type === "ASK");
    if (asks.length === 0) return null;
    return Math.min(...asks.map(o => o.price));
  }

  public getAvailableOrderTypes(): Array<"ASK" | "BID" | "LIMIT" | "MARKET" | "OFFER"> {
    return ["ASK"];
  }
}
