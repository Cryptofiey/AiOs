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
}
