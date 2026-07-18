import { MTProtoBridge } from "../bridge/MTProtoBridge";
import { DataNormalizer } from "../trading/DataNormalizer";

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
    // 1. Reactive Listener (Instant)
    this.bridge.onNewMessage((msg) => {
      // Basic heuristic: check if message looks like it's from Thermos bot
      // Since we don't have username resolution here easily, we rely on content
      const items = this.parseThermosMessage(msg.message);
      if (items.length > 0) {
        items.forEach(item => callback(item));
      }
    });

    // 2. Polling Fallback (Backup)
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
    }, 30000); // Reduced polling frequency as we now have reactive listener
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
      const itemName = DataNormalizer.cleanItemName(nameMatch[1].trim());
      const price = parseFloat(priceMatch[1]);
      
      if (!isNaN(price) && DataNormalizer.isTelegramGift(itemName)) {
        results.push({
          itemName: itemName,
          price: price,
          source: source,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }
}
