import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";

export class DexAdapter implements MarketAdapter {
  public readonly name = "DeDust/StonFi";
  private isOnline = true;
  private lastPolled = new Date().toISOString();

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      // Fetch live pools from DeDust
      const res = await fetch("https://api.dedust.io/v2/pools");
      if (!res.ok) throw new Error("DeDust API error");
      const pools = await res.json();
      this.isOnline = true;
      if (!pools || !Array.isArray(pools)) return [];
      
      const tonPools = pools.filter(p => 
        p.assets && p.assets[0]?.metadata?.symbol === "TON" && p.assets[1]?.metadata?.symbol
      );
      return tonPools.slice(0, 30);
    } catch (e) {
      this.isOnline = false;
      return [];
    }
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (!rawData || !rawData.reserves || !rawData.assets) return null;
    
    // Only process pools with TON as asset 0 and another token as asset 1
    if (rawData.assets[0]?.metadata?.symbol !== "TON" || !rawData.assets[1]?.metadata?.symbol) {
      return null;
    }

    const res0 = parseInt(rawData.reserves[0]);
    const res1 = parseInt(rawData.reserves[1]);
    if (res0 === 0 || res1 === 0) return null;

    const tonDecimals = rawData.assets[0].metadata.decimals || 9;
    const tokenDecimals = rawData.assets[1].metadata.decimals || 9;
    
    const tonAmount = res0 / Math.pow(10, tonDecimals);
    const tokenAmount = res1 / Math.pow(10, tokenDecimals);
    
    // Price of 1 token in TON
    const price = tonAmount / tokenAmount;
    
    const tokenSymbol = rawData.assets[1].metadata.symbol;

    return {
      id: `dex_${rawData.address || Date.now()}`,
      source: this.name,
      price: price,
      currency: "TON",
      type: "ASK", 
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: tokenSymbol
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
