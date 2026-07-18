import { ApiManager } from "../api-manager/ApiManager";
import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { DataNormalizer } from "../trading/DataNormalizer";

const TONAPI_ENDPOINT = "https://tonapi.io/v2/nfts/collections";
const TELEGRAM_GIFTS_COLLECTION_ADDRESS = "EQA-GKyRq-hyXCw0B0oDwANpASq9ql4FQ1pOMRQG81SQ-H4R"; // Using TonAPI valid address format

export class GetGemsAdapter implements MarketAdapter {
  public readonly name = "GetGems";
  private collectionAddress = TELEGRAM_GIFTS_COLLECTION_ADDRESS;
  private isOnline = true;
  private lastPolled = new Date().toISOString();

  
  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      // Switched to TonAPI as requested
      const url = `https://tonapi.io/v2/nfts/collections/${this.collectionAddress}/items?limit=20`;
      
      const response = await ApiManager.getInstance().fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.isOnline = true;
      
      return data.nft_items || [];
    } catch (error: any) {
      this.isOnline = false;
      console.error(`[${this.name}Adapter] Error fetching from TonAPI:`, error.message);
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
    const normalized: NormalizedOrder[] = [];

    for (const item of rawListings) {
      // 1. Parse the main listing (ASK / BUY NOW)
      const askOrder = this.normalizeData(item);
      if (askOrder) {
        normalized.push(askOrder);
      }

      // 2. Parse any active bids/offers (BID / OFFERS) on auctions or listings
      if (item.sale && Array.isArray(item.sale.bids)) {
        const fullName = item.metadata?.name || "Unknown Item";
        const baseName = DataNormalizer.cleanItemName(fullName);
        const isSpecialStar = !!item.metadata?.attributes?.find((a: any) => a.trait_type === "Special");

        item.sale.bids.forEach((bid: any, bidIndex: number) => {
          if (bid && bid.value) {
            const bidPrice = parseInt(bid.value || "0", 10) / 1e9;
            if (bidPrice > 0) {
              normalized.push({
                id: `getgems_bid_${item.address}_${bid.sender?.address || "unknown"}_${bid.date || bidIndex}`,
                source: this.name,
                price: bidPrice,
                currency: "TON",
                type: "BID",
                category: "AUCTION",
                timestamp: bid.date ? new Date(bid.date * 1000).toISOString() : new Date().toISOString(),
                metadata: {
                  itemName: baseName,
                  serial: fullName.match(/#(\d+)/)?.[1],
                  seller: item.sale.owner?.address,
                  buyer: bid.sender?.address,
                  isStar: isSpecialStar,
                  tradeForm: "AUCTION"
                }
              });
            }
          }
        });
      }
    }

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
