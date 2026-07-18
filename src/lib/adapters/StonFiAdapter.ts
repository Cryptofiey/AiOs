import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { StonApiClient } from "@ston-fi/api";

export class StonFiAdapter implements MarketAdapter {
  public readonly name = "StonFi";
  private isOnline = true;
  private lastPolled = new Date().toISOString();
  private client = new StonApiClient();

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      const assets = await this.client.getAssets();
      this.isOnline = true;
      if (!assets || !Array.isArray(assets)) return [];

      // Find WTON or GRAM or anything representing the base TON token
      const wtonAsset = assets.find((a: any) => a.contractAddress === "EQDQoc5M3Bh8eWFephi9bClhevelbZZvWhkqdo80XuY_0qXv");
      const gramAsset = assets.find((a: any) => a.contractAddress === "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c");
      const tonAssetFallback = assets.find((a: any) => a.symbol === "TON" && parseFloat(a.dexPriceUsd || "0") > 1.0);
      
      const referenceAsset = wtonAsset || gramAsset || tonAssetFallback;
      if (!referenceAsset || !referenceAsset.dexPriceUsd) {
        console.warn("[StonFiAdapter] No real on-chain reference price found for TON. Returning empty listings to prevent trading on fake/mock data.");
        return [];
      }
      const tonPriceUsd = parseFloat(referenceAsset.dexPriceUsd);

      // Filter tokens with valid prices, excluding the TON wrappers/equivalents
      const tokens = assets.filter((a: any) => 
        a.dexPriceUsd && 
        a.contractAddress !== "EQDQoc5M3Bh8eWFephi9bClhevelbZZvWhkqdo80XuY_0qXv" && 
        a.contractAddress !== "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"
      );

      // Pick top 30
      const selected = tokens.slice(0, 30).map((a: any) => {
        const usdPrice = parseFloat(a.dexPriceUsd || "0");
        return {
          ...a,
          priceInTon: usdPrice / tonPriceUsd
        };
      });

      return selected;
    } catch (e) {
      console.error("[StonFiAdapter] Error fetching latest listings via @ston-fi/api client:", e);
      this.isOnline = false;
      return [];
    }
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (!rawData || !rawData.priceInTon) return null;
    
    return {
      id: `stonfi_${rawData.contractAddress || rawData.contract_address || Date.now()}`,
      source: this.name,
      price: rawData.priceInTon,
      currency: "TON",
      type: "ASK",
      category: "MARKET",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: rawData.symbol || "Unknown"
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
