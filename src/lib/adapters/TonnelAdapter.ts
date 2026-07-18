import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { DataNormalizer } from "../trading/DataNormalizer";
import { MTProtoBridge } from "../bridge/MTProtoBridge";

export class TonnelAdapter implements MarketAdapter {
  public readonly name = "Tonnel";
  private isOnline = true;
  private lastPolled = new Date().toISOString();
  private bridge: MTProtoBridge;

  constructor() {
    this.bridge = MTProtoBridge.getInstance();
  }

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    const allResults: any[] = [];
    
    // 1. Check if we have an active MTProto connection
    const status = this.bridge.getSessionStatus();
    if (!status || status.status !== "connected") {
        this.isOnline = false;
        console.warn(`[${this.name}Adapter] MTProtoBridge not connected. Cannot fetch from ${botName}`);
        return [];
    }
    
    // 2. Check if we are using a BOT session. Bots cannot read other bots' history!
    if (status.isBot) {
        this.isOnline = false;
        console.warn(`[${this.name}Adapter] 🔴 OFFLINE: Requires MTPROTO_USER_SESSION_STRING. Current session is a Bot. Bots cannot read channel/bot history.`);
        return [];
    }

    this.isOnline = true;
    try {
        const messages = await this.bridge.getLatestMessages("@Tonnel_Network_bot", 40);
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                const parsed = this.parseTonnelMessage(msg);
                if (parsed && parsed.length > 0) {
                    allResults.push(...parsed);
                }
            }
        }
    } catch (e: any) {
        this.isOnline = false;
        console.error(`[${this.name}Adapter] Error fetching from ${botName}:`, e.message);
    }
    return allResults;
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (!rawData || !rawData.name || typeof rawData.price !== "number") {
      return null;
    }

    const baseName = DataNormalizer.cleanItemName(rawData.name);
    // Support either general gifts or Tonnel-specific privacy assets (like "Tonnel Mixer Voucher", "Tonnel Key")
    const isVoucher = baseName.toLowerCase().includes("tonnel");
    if (!isVoucher && !DataNormalizer.isTelegramGift(baseName)) {
      return null;
    }

    const tradeForm = rawData.tradeForm || (rawData.status?.toLowerCase().includes("auction") ? "AUCTION" : "FIXED_PRICE");
    return {
      id: rawData.id || `tonnel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: this.name,
      price: rawData.price,
      currency: "TON",
      type: rawData.type === "BID" ? "BID" : "ASK",
      category: tradeForm === "AUCTION" ? "AUCTION" : "MARKET",
      timestamp: rawData.timestamp || new Date().toISOString(),
      metadata: {
        itemName: baseName,
        serial: rawData.name.match(/#(\d+)/)?.[1],
        tradeForm: tradeForm,
        status: rawData.status || "Listed",
        isBotOrder: true
      }
    };
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
    return ["ASK", "BID"];
  }
}
