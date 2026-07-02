
export interface NormalizedOrder {
  id: string;
  price: number;
  currency: "TON" | "USD";
  source: string;
  type: "ASK" | "BID";
  timestamp: string;
  metadata: {
    itemName: string;
    serial?: string;
    rarity?: string;
    isStar?: boolean;
    contractAddress?: string;
    seller?: string;
    isBotOrder?: boolean;
    platformFee?: number;
    royaltyFee?: number;
  };
}

export interface MarketState {
  items: Map<string, NormalizedOrder[]>; 
  globalFloor: number;
  lastUpdate: string;
  activeSources: string[];
}
