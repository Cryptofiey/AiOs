import { MTProtoBridge } from "../bridge/MTProtoBridge";

export interface ThermosMarketData {
  itemName: string;
  price: number;
  source: "Tonnel" | "MRKT" | "Portals" | "Thermos";
  url?: string;
  timestamp: string;
}

export class ThermosAdapter {
  private static instance: ThermosAdapter;
  private bridge: MTProtoBridge;

  private constructor() {
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): ThermosAdapter {
    if (!ThermosAdapter.instance) {
      ThermosAdapter.instance = new ThermosAdapter();
    }
    return ThermosAdapter.instance;
  }

  /**
   * Fetches the latest aggregations directly by parsing the bot's messages.
   */
  public async fetchLatestAggregations(): Promise<ThermosMarketData[]> {
    if (this.bridge.getSessionStatus()?.status !== "connected") {
      console.warn("[ThermosAdapter] MTProtoBridge not connected, cannot fetch data.");
      return [];
    }

    try {
      const msg = await this.bridge.getLatestMessage("@thermos_bot");
      return this.parseThermosMessage(msg);
    } catch (e) {
      console.error("[ThermosAdapter] Failed to fetch aggregations:", e);
      return [];
    }
  }

  /**
   * Subscribes to real-time events via the MTProto Bridge listener or interval
   */
  public onPriceUpdate(callback: (data: ThermosMarketData) => void) {
    let lastMessage = "";
    setInterval(async () => {
      try {
        if (this.bridge.getSessionStatus()?.status !== "connected") return;
        
        const msg = await this.bridge.getLatestMessage("@thermos_bot");
        if (msg && msg !== lastMessage) {
          lastMessage = msg;
          const items = this.parseThermosMessage(msg);
          items.forEach(item => callback(item));
        }
      } catch (err: any) {
        console.warn("[ThermosAdapter] Error in price update watcher:", err.message);
      }
    }, 12000);
  }

  public parseThermosMessage(msg: string): ThermosMarketData[] {
    if (!msg) return [];
    
    const results: ThermosMarketData[] = [];
    
    // Parse for market triggers: "New listing: Star #123 for 50 TON" etc.
    const priceMatch = msg.match(/([0-9.]+)\s*TON/i);
    const nameMatch = msg.match(/Model:\s*([a-zA-Z\s]+)/i) || msg.match(/Gift:\s*([a-zA-Z0-9\s]+)/i) || msg.match(/(Star|Dog|Duck|Durov's [a-zA-Z\s]+)/i);
    
    // Guess the source if it's mentioned
    let source: "Tonnel" | "MRKT" | "Portals" | "Thermos" = "Thermos";
    if (msg.toLowerCase().includes("tonnel")) source = "Tonnel";
    else if (msg.toLowerCase().includes("mrkt")) source = "MRKT";
    else if (msg.toLowerCase().includes("portals")) source = "Portals";

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
