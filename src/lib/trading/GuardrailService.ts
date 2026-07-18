import { NormalizedOrder } from "../../types/market";

export interface ProfitAnalysis {
  isProfitable: boolean;
  isViable: boolean; // Viability validation
  netProfit: number;
  grossProfit: number;
  totalFees: number;
  estimatedGas: number;
  marginPercent: number;
  volatilityRisk: number; // 0 to 1 risk factor
  viabilityScore: number; // 0 to 100
  recommendation: "EXECUTE" | "CAUTION" | "SKIP";
}

/**
 * GuardrailService - Защитный контур, проверяющий математику сделки.
 * Учитывает комиссии платформы, роялти, стоимость газа и рыночную волатильность.
 */
export class GuardrailService {
  private static readonly TON_GAS_ESTIMATE_BASE = 0.05; // Базовая стоимость транзакции в TON
  private static readonly NETWORK_FEE_PERCENT = 0.01; // 1% комиссия системы (AI-fee)
  private static readonly SLIPPAGE_TOLERANCE = 0.015; // 1.5% допустимое проскальзывание
  public static readonly LATENCY_BUFFER = 0.02; // Запас на изменение цены за время сетевых задержек

  /**
   * Анализирует сделку на предмет прибыльности и жизнеспособности
   * @param purchasePrice Цена покупки (TON)
   * @param targetSalePrice Ожидаемая цена продажи (TON)
   * @param historicalVolatility Историческая волатильность актива (в процентах)
   * @param order Конкретный ордер для учета его специфичных комиссий
   */
  public static analyzeTrade(
    purchasePrice: number,
    targetSalePrice: number,
    historicalVolatility: number = 5.0,
    order?: NormalizedOrder
  ): ProfitAnalysis {
    const platformFee = order?.metadata?.platformFee || 0;
    const royaltyFee = order?.metadata?.royaltyFee || 0;
    
    // 1. Расчет динамического газа
    const congestionFactor = 1.0; // Network congestion should be fetched from real on-chain metrics
    const estimatedGas = this.TON_GAS_ESTIMATE_BASE * congestionFactor;
    
    // 2. Расчет чистой прибыли с учетом комиссий и проскальзывания
    const systemFee = purchasePrice * this.NETWORK_FEE_PERCENT;
    const slippageCost = targetSalePrice * this.SLIPPAGE_TOLERANCE;
    const totalFees = platformFee + royaltyFee + systemFee + slippageCost;
    
    const grossProfit = targetSalePrice - purchasePrice;
    const netProfit = grossProfit - totalFees - estimatedGas;
    const marginPercent = (netProfit / purchasePrice) * 100;

    // 3. Анализ риска волатильности
    // Если волатильность выше маржи, риск высокий
    const volatilityRisk = Math.min(1, historicalVolatility / Math.max(0.1, marginPercent));
    
    // 4. Валидация жизнеспособности (Viability Score)
    // Факторы: маржинальность, волатильность, абсолютная прибыль
    let viabilityScore = 0;
    if (netProfit > 0) {
      viabilityScore += 40; // Базовая прибыльность
      viabilityScore += Math.min(30, marginPercent * 2); // Бонус за высокую маржу
      viabilityScore += Math.max(0, 30 - historicalVolatility); // Бонус за низкую волатильность
    }

    const isViable = viabilityScore >= 60 && netProfit > 0.1; // Минимум 0.1 TON прибыли

    // 5. Выработка рекомендации
    let recommendation: "EXECUTE" | "CAUTION" | "SKIP" = "SKIP";
    if (isViable) {
      if (viabilityScore > 85 && volatilityRisk < 0.3) {
        recommendation = "EXECUTE";
      } else {
        recommendation = "CAUTION";
      }
    }

    return {
      isProfitable: netProfit > 0,
      isViable,
      netProfit,
      grossProfit,
      totalFees,
      estimatedGas,
      marginPercent,
      volatilityRisk,
      viabilityScore,
      recommendation
    };
  }
}
