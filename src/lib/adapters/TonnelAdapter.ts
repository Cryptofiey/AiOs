import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";

export class TonnelAdapter implements MarketAdapter {
  public readonly name = "Tonnel";
  private isOnline = true;
  private lastPolled = new Date().toISOString();

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      // Simulate fetching from Tonnel Network (privacy mixed assets or specific markets)
      this.isOnline = true;
      return [];
    } catch (e) {
      this.isOnline = false;
      return [];
    }
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (!rawData || !rawData.price) return null;
    
    return {
      id: `tonnel_${rawData.id || Date.now()}`,
      source: this.name,
      price: rawData.price,
      currency: "TON",
      type: "ASK",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: rawData.itemName || "Unknown Asset"
      }
    };
  }

  public getMarketStatus() {
    return {
      isOnline: this.isOnline,
      lastPolled: this.lastPolled
    };
  }
}
