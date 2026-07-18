import { NormalizedOrder } from "../../types/market";

/**
 * DataNormalizer
 * Standardizes raw market data from various sources (TonApi, Fragment, GetGems, Portals, MRKT)
 * into a unified schema for the reactive engine.
 */
export class DataNormalizer {
  
  /**
   * Main entry point for normalization
   */
  public static normalize(source: string, raw: any): NormalizedOrder | null {
    if (!raw) return null;

    if (raw.isCrossPollinated) {
      return {
        id: raw.id,
        source: source,
        price: raw.price,
        currency: "TON",
        type: raw.type || "ASK",
        category: raw.category || "MARKET",
        timestamp: raw.timestamp || new Date().toISOString(),
        metadata: {
          itemName: raw.name || "Unknown Item",
          serial: raw.serial,
          isMonochrome: this.detectMonochrome(raw.name || "", raw),
          ...raw.metadata
        }
      };
    }

    let order: NormalizedOrder | null = null;
    switch (source.toLowerCase()) {
      case "fragment":
      case "getgems":
      case "tonapi":
        order = this.normalizeTonApiFormat(source, raw);
        break;
      case "portals":
        order = this.normalizePortalsFormat(raw);
        break;
      case "mrkt":
        order = this.normalizeMrktFormat(raw);
        break;
      case "tonnel":
        order = this.normalizeTonnelFormat(raw);
        break;
      case "thermos":
      case "pricenftbot":
        order = this.normalizeBotFormat(source, raw);
        break;
      default:
        order = this.normalizeGenericFormat(source, raw);
        break;
    }

    if (order && !this.isTelegramGift(order.metadata.itemName) && !this.isAnonymousNumber(order.metadata.itemName) && !this.isUsername(order.metadata.itemName) && !order.metadata.itemName.toLowerCase().includes("tonnel")) {
      return null;
    }

    // Apply global enhancements
    if (order) {
      order.metadata.isMonochrome = this.detectMonochrome(order.metadata.itemName, raw);
    }

    return order;
  }

  /**
   * Checks if an item name belongs to a valid Telegram Gift (excluding usernames, anonymous numbers, and stars)
   */
  public static isTelegramGift(name: string): boolean {
    if (!name) return false;
    const cleaned = name.trim();
    const lower = cleaned.toLowerCase();

    // 1. Exclude Anonymous Numbers (+888)
    if (
      lower.includes("+888") ||
      cleaned.startsWith("+") ||
      lower.includes("number") ||
      lower.includes("anonymous") ||
      /^\+?\d+$/.test(cleaned.replace(/\s+/g, ""))
    ) {
      return false;
    }

    // 2. Exclude Usernames
    if (
      lower.startsWith("@") ||
      lower.includes("username") ||
      lower.endsWith(".t.me") ||
      lower.includes(".t.me")
    ) {
      return false;
    }

    // 3. Exclude Telegram Stars currency packages, but KEEP actual gifts containing "star" (e.g. "durov's star", "special star", "sparkling star")
    // Note: We also check for common package naming patterns
    if (
      lower === "star" ||
      lower === "stars" ||
      lower.includes("stars balance") ||
      lower.includes("stars pack") ||
      lower.includes("star package") ||
      /^\d+\s*stars?$/.test(lower)
    ) {
      return false;
    }

    return true;
  }

  public static isAnonymousNumber(name: string): boolean {
    if (!name) return false;
    const cleaned = name.trim();
    return cleaned.startsWith("+888") || cleaned.toLowerCase().includes("anonymous number");
  }

  public static isUsername(name: string): boolean {
    if (!name) return false;
    const cleaned = name.trim();
    return cleaned.startsWith("@") || cleaned.toLowerCase().includes("username") || cleaned.toLowerCase().endsWith(".t.me");
  }

  /**
   * Normalizes data from TonApi.io (v2/nfts/collections/.../items)
   * Used by Fragment, GetGems, and TonApi adapters.
   */
  private static normalizeTonApiFormat(source: string, raw: any): NormalizedOrder | null {
    // Basic validation
    if (!raw.address || !raw.sale || !raw.sale.price) return null;

    const priceTon = parseInt(raw.sale.price.value || "0") / 1e9;
    if (priceTon <= 0) return null;

    const fullName = raw.metadata?.name || "Unknown Item";
    const baseName = this.cleanItemName(fullName);
    
    // Determine type: Fixed price vs Auction
    let type: "ASK" | "BID" = "ASK";
    
    // In TonApi, if sale.type is 'auction', it's still technically an ASK from the seller's side
    // but the engine might want to treat it differently.
    // For now we stick to the NormalizedOrder schema which expects ASK | BID.
    
    // Determine trade form
    const tradeForm = raw.sale.type === "auction" ? "AUCTION" : "FIXED_PRICE";
    const category = tradeForm === "AUCTION" ? "AUCTION" : "MARKET";
    
    return {
      id: `${source.toLowerCase()}_${raw.address}`,
      source: source,
      price: priceTon,
      currency: "TON",
      type: type,
      category: category,
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: baseName,
        serial: fullName.match(/#(\d+)/)?.[1],
        seller: raw.sale.owner?.address,
        isStar: !!raw.metadata?.attributes?.find((a: any) => a.trait_type === "Special"),
        platformFee: raw.sale.market_fee || 0,
        tradeForm: tradeForm,
        auctionEnd: raw.sale.end_time // if present
      }
    };
  }

  /**
   * Normalizes Portals Market API format
   */
  private static normalizePortalsFormat(raw: any): NormalizedOrder | null {
    if (!raw.id || !raw.name || !raw.price) return null;

    const price = parseFloat(raw.price);
    if (isNaN(price)) return null;

    const baseName = this.cleanItemName(raw.name);

    return {
      id: `portals_${raw.id}`,
      source: "Portals",
      price: price,
      currency: "TON",
      type: "ASK",
      category: "MARKET",
      timestamp: raw.listed_at || new Date().toISOString(),
      metadata: {
        itemName: baseName,
        serial: raw.external_collection_number || raw.name.match(/#(\d+)/)?.[1],
        contractAddress: raw.address
      }
    };
  }

  /**
   * Normalizes MRKT Bot / Channel format
   */
  private static normalizeMrktFormat(raw: any): NormalizedOrder | null {
    if (!raw.name || typeof raw.price !== "number") return null;

    return {
      id: raw.id || `mrkt_${(raw.name || "item").toLowerCase().replace(/\s+/g, "_")}_${raw.price}`,
      source: "MRKT",
      price: raw.price,
      currency: "TON",
      type: raw.type === "BID" ? "BID" : "ASK",
      category: "ORDER",
      timestamp: raw.timestamp || new Date().toISOString(),
      metadata: {
        itemName: this.cleanItemName(raw.name),
        serial: raw.name.match(/#(\d+)/)?.[1]
      }
    };
  }

  /**
   * Normalizes Tonnel P2P and bot structures
   */
  private static normalizeTonnelFormat(raw: any): NormalizedOrder | null {
    if (!raw || !raw.name || typeof raw.price !== "number") return null;

    const tradeForm = raw.tradeForm || (raw.status?.toLowerCase().includes("auction") ? "AUCTION" : "FIXED_PRICE");
    const category = tradeForm === "AUCTION" ? "AUCTION" : "MARKET";
    const baseName = this.cleanItemName(raw.name);

    return {
      id: raw.id || `tonnel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: "Tonnel",
      price: raw.price,
      currency: "TON",
      type: raw.type === "BID" ? "BID" : "ASK",
      category: category,
      timestamp: raw.timestamp || new Date().toISOString(),
      metadata: {
        itemName: baseName,
        serial: raw.name.match(/#(\d+)/)?.[1],
        tradeForm: tradeForm,
        status: raw.status || "Listed",
        isBotOrder: true
      }
    };
  }

  /**
   * Normalizes Telegram Bot updates (Thermos, PriceNFTbot)
   */
  private static normalizeBotFormat(source: string, raw: any): NormalizedOrder | null {
    if (!raw.itemName || typeof raw.price !== "number") return null;

    return {
      id: raw.id || `${source.toLowerCase()}_${(raw.itemName || raw.name || "item").toLowerCase().replace(/\s+/g, "_")}_${raw.price}`,
      source: source,
      price: raw.price,
      currency: "TON",
      type: raw.type || "ASK",
      category: "MARKET",
      timestamp: raw.timestamp || new Date().toISOString(),
      metadata: {
        itemName: this.cleanItemName(raw.itemName),
        isBotOrder: true
      }
    };
  }

  /**
   * Fallback for unknown formats
   */
  private static normalizeGenericFormat(source: string, raw: any): NormalizedOrder | null {
    const price = Number(raw.price || raw.value || raw.amount || 0);
    const name = String(raw.name || raw.itemName || raw.title || "Unknown");
    
    if (price <= 0 || name === "Unknown") return null;

    return {
      id: raw.id || `${source.toLowerCase()}_${(raw.itemName || raw.name || "item").toLowerCase().replace(/\s+/g, "_")}_${raw.price}`,
      source: source,
      price: price,
      currency: "TON",
      type: raw.type || "ASK",
      category: "MARKET",
      timestamp: raw.timestamp || new Date().toISOString(),
      metadata: {
        itemName: this.cleanItemName(name)
      }
    };
  }

  /**
   * Utility to strip serials and numbers from item names to allow aggregation
   * e.g. "Toy Bear #1234" -> "Toy Bear"
   */
  public static cleanItemName(name: string): string {
    return name
      .replace(/\s*#\d+$/, '') // Strip #1234
      .replace(/\+\d+\s*/, '') // Strip +888 (Fragment numbers)
      .trim();
  }

  /**
   * Detects if the item belongs to the Monochrome series
   */
  public static detectMonochrome(name: string, raw: any): boolean {
    const lowerName = name.toLowerCase();
    
    // Check name
    if (lowerName.includes("monochrome") || lowerName.includes("чёрно-белый") || lowerName.includes("черно-белый")) {
      return true;
    }

    // Check raw attributes if they exist (TonApi format)
    if (raw?.metadata?.attributes) {
      return raw.metadata.attributes.some((a: any) => 
        String(a.value).toLowerCase().includes("monochrome") || 
        String(a.trait_type).toLowerCase().includes("monochrome")
      );
    }

    // Check description or other raw fields
    const rawStr = JSON.stringify(raw).toLowerCase();
    if (rawStr.includes("monochrome")) {
      return true;
    }

    return false;
  }
}
