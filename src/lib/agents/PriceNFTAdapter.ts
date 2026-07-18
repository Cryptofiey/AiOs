import { MTProtoBridge } from "../bridge/MTProtoBridge";
import { DataNormalizer } from "../trading/DataNormalizer";

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
    // 1. Reactive Listener (Instant)
    this.bridge.onNewMessage((msg) => {
      const items = this.parseMessage(msg.message);
      if (items.length > 0) {
        items.forEach(item => callback(item));
      }
    });

    // 2. Polling Fallback (Backup)
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
    }, 30000); // Reduced polling frequency
  }

  public parseMessage(msg: string): PriceNFTMarketData[] {
    if (!msg) return [];
    
    const results: PriceNFTMarketData[] = [];
    
    // Parse avg price / floor from PriceNFTbot
    const priceMatch = msg.match(/Floor:\s*([0-9.]+)\s*TON/i) || msg.match(/([0-9.]+)\s*TON/i);
    const nameMatch = msg.match(/Model:\s*([a-zA-Z0-9\s_'-]+)/i) || msg.match(/(Star|Dog|Duck|Durov's [a-zA-Z\s_'-]+)/i);
    
    let source: "Tonnel" | "PriceNFTbot" = "PriceNFTbot";
    if (msg.toLowerCase().includes("tonnel")) source = "Tonnel";

    if (priceMatch && nameMatch) {
      const rawItemName = nameMatch[1].trim();
      const price = parseFloat(priceMatch[1]);
      
      if (!isNaN(price)) {
        const cleanedName = DataNormalizer.cleanItemName(rawItemName);
        
        // Ensure it is a valid Telegram Gift or valid Tonnel/Popular NFT asset
        if (DataNormalizer.isTelegramGift(cleanedName)) {
          results.push({
            itemName: cleanedName,
            price: price,
            source: source,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }
}
