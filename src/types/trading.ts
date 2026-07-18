export enum ItemGrade {
  COMMON = "COMMON",
  RARE = "RARE",
  EPIC = "EPIC",
  LEGENDARY = "LEGENDARY",
  UNIQUE = "UNIQUE"
}

export interface DynamicTradingRule {
  minAlphaMultiplier?: number;
  maxSlippage?: number;
  priorityKeywords?: string[];
  multiplierOverrides?: Record<string, number>;
}

export interface PriceCorridors {
  green: number;  // Bottom floor (Limit buy)
  blue: number;   // Instant buy floor
  yellow: number; // Instant sell ceiling
  red: number;    // Premium sell (Attribute based)
}

export interface TradingItem {
  id: string;
  name: string;
  price: number;
  source?: string;
  category?: string;
  rarity?: string;
  image?: string;
  collection?: string;
  serialNumber?: number;
  pattern?: string;
  grade?: ItemGrade;
  floorPrice?: number;
  purchasePrice?: number;
  estimatedValue?: number;
  expectedSalePrice?: number;
  labels?: string[]; // e.g., "Monochrome", "Low Serial", "Profit Target"
  status?: "INVENTORY" | "LISTED" | "SOLD" | "SNIPED";
  lastSalePrice?: number;
  corridors?: PriceCorridors;
  lastUpdated?: string;
}

export interface MarketOrder {
  id: string;
  itemId: string;
  itemName: string;
  type: "BUY" | "SELL" | "OFFER";
  price: number;
  targetPrice: number;
  status: "ACTIVE" | "PENDING" | "FILLED" | "CANCELLED";
  timestamp: string;
  strategyId: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: "SNIPE" | "ARB" | "PATTERN_HUNT" | "MARKET_MAKING";
  balanceAllocated: number;
  profitGenerated: number;
  isActive: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  limits: {
    maxPrice: number;
    minProfit: number;
    maxHoldTimeHours: number;
  };
}

export interface MarketInsight {
  id: string;
  topic: string;
  content: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  timestamp: string;
}
