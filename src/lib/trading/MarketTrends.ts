export interface GiftPriceData {
  time: string;
  price: number;
  volume: number;
}

export interface GiftTrend {
  id: string;
  name: string;
  emoji: string;
  description: string;
  basePrice: number; // TON
  avg24h: number;
  change24h: number; // percent
  volume24h: number;
  volatility: number; // percent max swing
  data: GiftPriceData[];
}

export const INITIAL_TRENDS: GiftTrend[] = [];
