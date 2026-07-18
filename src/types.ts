export interface GiftAsset {
  id: string;
  name: string;
  rarityScore: number;
  floorPriceTon: number;
  estPriceTon: number;
  serialNumber: string;
  status: "AVAILABLE" | "PENDING" | "BOUGHT" | "SOLD";
  market: "Fragment" | "GetGems" | "xJetSwap" | "STON.fi";
  thumbnailUrl?: string;
}

export interface TradeLog {
  id: string;
  giftId: string;
  giftName: string;
  tradeType: "BUY" | "SELL" | "SWAP" | "REMOVE_LIQUIDITY";
  amountTon: number;
  walletAddress: string;
  txHash: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  timestamp: string;
  feeTon?: number;
  notes?: string;
  purchasePrice?: number;
  profitTon?: number;
  thumbnailUrl?: string;
}

import { DynamicTradingRule } from "./types/trading";

export interface CustomStrategy {
  id: string;
  title: string;
  channel: string;
  youtubeUrl: string;
  keyInsights: string[];
  actionPlan: string[];
  dynamicRules?: DynamicTradingRule;
  createdAt: string;
  updatedAt?: string;
  isTesting?: boolean;
  allocationPercent?: number;
  profitPercent?: string;
  profitTon?: number;
}

export interface WhaleWallet {
  address: string;
  label: string;
  winRate: number;
  totalPnL: number;
  lastActive: string;
  status: "TRACKED" | "PAUSED";
  riskScore?: number; // 0-100, where 100 is very low risk
  mainAsset?: string; // e.g. "Gifts", "Numbers"
  isFollowing?: boolean; // If bot should auto-sniper signals from this whale
  txCount?: number; // Total transactions tracked
  totalVolume?: number; // Total volume in TON
}

export type WorkingMode = "OFF" | "ON" | "SOFT" | "STRICT";

export interface BotConfig {
  isActive: boolean;
  targetCollection: string;
  filterRarity: string;
  maxSlippagePercent: number; // e.g. 5
  frontrunGasPremium: number; // e.g. 0.05
  palindromeMultiplier: number; // e.g. 1.2
  isAutoTrading: boolean;
  walletAddress: string;
  riskMaxExposure?: number;
  riskStopLoss?: number;
  riskSoftLimits?: boolean;
  ignoreInstruction?: string;
  useSimulatedBalance?: boolean;
  simulatedBalance?: number;
  maxBuyPriceThreshold?: number;
  workingMode?: WorkingMode;
}
