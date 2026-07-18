import { MarketAdapter } from "./types";
import { NormalizedOrder } from "../../types/market";
import { AuthAgent } from "../agents/AuthAgent";
import { ApiManager } from "../api-manager/ApiManager";
import { DataNormalizer } from "../trading/DataNormalizer";

export class FragmentAdapter implements MarketAdapter {
  public readonly name = "Fragment";
  private isOnline = true;
  private lastPolled = new Date().toISOString();

  private async fetchHtml(url: string): Promise<string> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  }

  private parseGiftsHtml(html: string, tradeForm: "FIXED_PRICE" | "AUCTION"): any[] {
    const items: any[] = [];
    const regex = /<a href="(\/gift\/([^"?]+))[^"]*" class="tm-grid-item">([\s\S]*?)<\/a>/gi;
    let match;
    let index = 0;
    
    while ((match = regex.exec(html)) !== null) {
      const link = match[1];
      const id = match[2];
      const rowContent = match[3];
      
      const nameMatch = rowContent.match(/<span class="item-name">([^<]+)<\/span>/i);
      const numMatch = rowContent.match(/<span class="item-num">\s*(?:&nbsp;)?#(\d+)<\/span>/i);
      
      // Match price(s) - on auctions we can have current bid (Place Bid) and buyout (Buy For)
      const prices: number[] = [];
      const priceRegex = /<div class="tm-grid-item-value tm-value icon-before icon-ton">([\d,.]+)<\/div>/gi;
      let pMatch;
      while ((pMatch = priceRegex.exec(rowContent)) !== null) {
        prices.push(parseFloat(pMatch[1].replace(/,/g, '')));
      }
      
      const statusMatch = rowContent.match(/<div class="tm-grid-item-status [^"]*">([\s\S]*?)<\/div>/i);
      const rawStatus = statusMatch ? statusMatch[1].replace(/<[^>]*>/g, '').trim() : "";
      
      const name = nameMatch ? nameMatch[1].trim() : "Unknown";
      const serial = numMatch ? numMatch[1].trim() : "";
      
      let buyoutPrice: number | undefined = undefined;
      let placeBidPrice: number | undefined = undefined;
      let price = 0;
      
      if (tradeForm === "FIXED_PRICE") {
        // Direct sale: the price shown is the Buyout Price (BUY FOR)
        buyoutPrice = prices[0] || 0;
        price = buyoutPrice;
      } else {
        // Auction: 
        // First price shown is the Current Bid (PLACE BID)
        placeBidPrice = prices[0] || 0;
        price = placeBidPrice;
        
        // Second price, if any, is buyout (BUY FOR)
        if (prices.length > 1) {
          buyoutPrice = prices[1];
        } else {
          // If buyout price isn't explicitly present, some auctions don't allow buyout.
          // But to align with the board sketch, we can check if there's any fallback buy-now text or similar
        }
      }
      
      items.push({
        isParsedFromHtml: true,
        id,
        link,
        name,
        serial,
        price,
        buyoutPrice,
        placeBidPrice,
        tradeForm,
        status: rawStatus || (tradeForm === "AUCTION" ? "Auction" : "Available")
      });
    }
    return items;
  }

  public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    const allItems: any[] = [];
    
    // 1. Primary: Scrape live listed gifts directly from Fragment website (both Sales and Auctions)
    try {
      console.log("[FragmentAdapter] Scraping live fixed-price gifts from Fragment...");
      const salesHtml = await this.fetchHtml("https://fragment.com/gifts?sort=price_asc&filter=sale");
      const salesItems = this.parseGiftsHtml(salesHtml, "FIXED_PRICE");
      allItems.push(...salesItems);
      console.log(`[FragmentAdapter] Scraped ${salesItems.length} live fixed-price items.`);
    } catch (scrapingError: any) {
      console.log("[FragmentAdapter] HTML sale scraping unavailable/failed:", scrapingError.message);
    }

    try {
      console.log("[FragmentAdapter] Scraping live auction gifts from Fragment...");
      const auctionsHtml = await this.fetchHtml("https://fragment.com/gifts?sort=price_asc&filter=auction");
      const auctionItems = this.parseGiftsHtml(auctionsHtml, "AUCTION");
      allItems.push(...auctionItems);
      console.log(`[FragmentAdapter] Scraped ${auctionItems.length} live auction items.`);
    } catch (scrapingError: any) {
      console.log("[FragmentAdapter] HTML auction scraping unavailable/failed:", scrapingError.message);
    }
    
    // 2. Secondary/Fallback: Official Telegram Star Gifts collection queries via TON API (keeps it active on on-chain data)
    try {
      const authAgent = AuthAgent.getInstance();
      const tonApiKey = process.env.TON_API_KEY || 
                       process.env.TONAPI_KEY || 
                       authAgent.getCredential("TON_API_KEY") || 
                       authAgent.getCredential("TONAPI_KEY") || 
                       authAgent.getCredential("VITE_TON_API_KEY") || "";

      const collections = [
        "EQA-GKyRq-hyXCw0B0oDwANpASq9ql4FQ1pOMRQG81SQ-H4R" // Telegram Star Gifts collection
      ];
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      };

      if (tonApiKey) {
        headers["Authorization"] = `Bearer ${tonApiKey}`;
      }

      for (const collection of collections) {
        try {
          const url = `https://tonapi.io/v2/nfts/collections/${collection}/items?limit=30`;
          const apiManager = ApiManager.getInstance();
          const response = await apiManager.fetch(url, {
            method: "GET",
            headers
          });

          if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.nft_items)) {
              allItems.push(...data.nft_items);
            }
          }
        } catch (innerError: any) {
          // Silent catch for secondary source
        }
      }
    } catch (e) {
      // Ignored
    }

    this.isOnline = allItems.length > 0;

    return allItems;
  }

  public normalizeData(rawData: any): NormalizedOrder | null {
    if (rawData && rawData.isParsedFromHtml) {
      const baseName = DataNormalizer.cleanItemName(rawData.name);
      if (!DataNormalizer.isTelegramGift(baseName)) {
        return null;
      }
      const tradeForm = rawData.tradeForm || (rawData.status === "Auction" ? "AUCTION" : "FIXED_PRICE");
      return {
        id: `fragment_${rawData.id}`,
        source: this.name,
        price: rawData.price,
        currency: "TON",
        type: "ASK",
        category: tradeForm === "AUCTION" ? "AUCTION" : "MARKET",
        timestamp: new Date().toISOString(),
        metadata: {
          itemName: baseName,
          serial: rawData.serial,
          tradeForm: tradeForm,
          buyoutPrice: rawData.buyoutPrice,
          placeBidPrice: rawData.placeBidPrice,
          status: rawData.status
        }
      };
    }
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
    return ["ASK", "BID"];
  }
}
