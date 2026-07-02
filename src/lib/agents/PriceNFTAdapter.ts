import { MTProtoBridge } from "../bridge/MTProtoBridge";

export interface PriceNFTMarketData {
  itemName: string;
  price: number;
  source: "Tonnel" | "PriceNFTbot";
  timestamp: string;
}

export class PriceNFTAdapter {
  private static instance: PriceNFTAdapter;
  private bridge: MTProtoBridge;

  private constructor() {
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): PriceNFTAdapter {
    if (!PriceNFTAdapter.instance) {
      PriceNFTAdapter.instance = new PriceNFTAdapter();
    }
    return PriceNFTAdapter.instance;
  }

  public async fetchLatestAggregations(): Promise<PriceNFTMarketData[]> {
    if (this.bridge.getSessionStatus()?.status !== "connected") {
      console.warn("[PriceNFTAdapter] MTProtoBridge not connected, cannot fetch data.");
      return [];
    }

    try {
      const msg = await this.bridge.getLatestMessage("@PriceNFTbot");
      return this.parseMessage(msg);
    } catch (e) {
      console.error("[PriceNFTAdapter] Failed to fetch aggregations:", e);
      return [];
    }
  }

  public onPriceUpdate(callback: (data: PriceNFTMarketData) => void) {
    let lastMessage = "";
    setInterval(async () => {
      try {
        if (this.bridge.getSessionStatus()?.status !== "connected") return;
        
        const msg = await this.bridge.getLatestMessage("@PriceNFTbot");
        if (msg && msg !== lastMessage) {
          lastMessage = msg;
          const items = this.parseMessage(msg);
          items.forEach(item => callback(item));
        }
      } catch (err: any) {
        console.warn("[PriceNFTAdapter] Error in price update watcher:", err.message);
      }
    }, 12000);
  }

  public parseMessage(msg: string): PriceNFTMarketData[] {
    if (!msg) return [];
    
    const results: PriceNFTMarketData[] = [];
    
    // Parse avg price / floor from PriceNFTbot
    const priceMatch = msg.match(/Floor:\s*([0-9.]+)\s*TON/i) || msg.match(/([0-9.]+)\s*TON/i);
    const nameMatch = msg.match(/Model:\s*([a-zA-Z0-9\s]+)/i) || msg.match(/(Star|Dog|Duck|Durov's [a-zA-Z\s]+)/i);
    
    let source: "Tonnel" | "PriceNFTbot" = "PriceNFTbot";
    if (msg.toLowerCase().includes("tonnel")) source = "Tonnel";

    if (priceMatch && nameMatch) {
      const price = parseFloat(priceMatch[1]);
      results.push({
        itemName: nameMatch[1].trim(),
        price: price,
        source: source,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }
}
