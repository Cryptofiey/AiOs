import { NormalizedOrder } from "../../types/market";

export interface MarketAdapter {
  /**
   * The unique identifier / name of the market adapter (e.g., "Fragment", "GetGems", "Thermos").
   */
  readonly name: string;

  /**
   * Fetches the latest available listings or raw data from the specific source.
   */
  fetchLatestListings(): Promise<any[]>;

  /**
   * Translates the raw data fetched from the source into the standardized NormalizedOrder schema.
   */
  normalizeData(rawData: any): NormalizedOrder | null;

  /**
   * Returns the current operational status of the adapter.
   */
  getMarketStatus(): {
    isOnline: boolean;
    latencyMs?: number;
    lastPolled?: string;
    errorRate?: number;
  };

  /**
   * Fetches and normalizes active buy/sell orders matching a query.
   */
  fetchOrders(queryText?: string): Promise<NormalizedOrder[]>;

  /**
   * Fetches the order book (стакан) depth with bids and asks for a specific item.
   */
  fetchOrderBook(itemName: string): Promise<{ bids: NormalizedOrder[]; asks: NormalizedOrder[] }>;

  /**
   * Fetches active bids / offers / purchase requests (оферты) for a specific item.
   */
  fetchOffers(itemName: string): Promise<NormalizedOrder[]>;

  /**
   * Fetches the latest real-time market price for a specific item.
   */
  fetchMarketPrice(itemName: string): Promise<number | null>;

  /**
   * Lists the order types supported by this adapter.
   */
  getAvailableOrderTypes(): Array<"ASK" | "BID" | "LIMIT" | "MARKET" | "OFFER">;
}
