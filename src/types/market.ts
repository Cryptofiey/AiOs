
export type MarketCategory = "MARKET" | "AUCTION" | "ORDER";

export interface NormalizedOrder {
  id: string;
  price: number;
  currency: "TON" | "USD";
  source: string;
  type: "ASK" | "BID";
  category: MarketCategory;
  timestamp: string;
  metadata: {
    itemName: string;
    serial?: string;
    rarity?: string;
    isStar?: boolean;
    contractAddress?: string;
    seller?: string;
    buyer?: string;
    isBotOrder?: boolean;
    platformFee?: number;
    royaltyFee?: number;
    tradeForm?: "FIXED_PRICE" | "AUCTION";
    auctionEnd?: string;
    buyoutPrice?: number;
    placeBidPrice?: number;
    status?: string;
    isMonochrome?: boolean;
  };
}

export interface MarketState {
  items: Map<string, NormalizedOrder[]>; 
  globalFloor: number;
  lastUpdate: string;
  activeSources: string[];
  adapterStatus?: Record<string, boolean>;
}
