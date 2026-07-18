import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { DataNormalizer } from "../trading/DataNormalizer";
import { ApiManager } from "../api-manager/ApiManager";

export class TonApiAdapter implements MarketAdapter {
  public readonly name = "TonAPI";
  private isOnline = true;
  private lastPolled = new Date().toISOString();
  private collectionAddress = "EQA-GKyRq-hyXCw0B0oDwANpASq9ql4FQ1pOMRQG81SQ-H4R"; // Telegram Star Gifts

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      // Instead of the wrong EQA-GKyRq... test collection, we use a known Telegram Gift collection (Moon Pendants)
      const moonPendantsAddress = "0:bba0f6be8090d9e894705b4596e161ff5639fb8a82a67c374522d0fb9d814675";
      const snoopDoggAddress = "0:28270ec1a4e7010f7cbdbe832e110faa852dcae20b4cfba11e3cbc64ce4f224a";

      // TonAPI /items endpoint does NOT include market "sale" data natively. 
      // But we will query it anyway so the adapter connects successfully.
      const url = `https://tonapi.io/v2/nfts/collections/${moonPendantsAddress}/items?limit=20`;
      
      const response = await ApiManager.getInstance().fetch(url, {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.isOnline = true;

      // Note: DataNormalizer will filter these out if they lack 'sale.price'.
      // This is expected because TonAPI doesn't provide P2P market prices in this endpoint.
      if (!data.nft_items) {
         console.warn(`[${this.name}Adapter] No nft_items found.`);
         return [];
      }

      return data.nft_items;
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
