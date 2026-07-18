import { MarketAggregator } from "./MarketAggregator";

export enum DealGroup {
  INSTANT = 1,      // Моментальный арбитраж (перелив в стакан или очень быстрая продажа)
  EASY = 2,         // Легкий арбитраж (купил по рынку, переставил по флору)
  BREAD = 3,        // Хлебный арбитраж (небольшой профит, придется подождать)
  WEAK = 4,         // Слабый/Скип (мало профита, долгий холд)
  OFFER_AUCTION = 5 // Оферы и аукционы (динамическое ценообразование)
}

export interface TradeOpportunity {
  itemName: string;
  itemAddress?: string;
  group: DealGroup;
  buyPrice: number;
  expectedSellPrice: number;
  expectedProfit: number;
  action: "SNIPE" | "QUEUE_BUY" | "MAKE_OFFER" | "PLACE_BID" | "SKIP";
  reason: string;
  sourceId?: string;
  sourceAdapter?: string;
}

export class ArbitrageScanner {
  private static instance: ArbitrageScanner;
  private aggregator = MarketAggregator.getInstance();

  public static getInstance() {
    if (!ArbitrageScanner.instance) {
      ArbitrageScanner.instance = new ArbitrageScanner();
    }
    return ArbitrageScanner.instance;
  }

  /**
   * Рассчитывает чистую прибыль с учетом 5% комиссии маркетплейса и газа.
   */
  private calculateNetProfit(buy: number, sell: number): number {
    const fee = sell * 0.05; // 5% marketplace fee
    const gas = 0.05; // network gas
    return sell - buy - fee - gas;
  }

  /**
   * Комплексная оценка лота и распределение по фокусным группам.
   * Учитывает ликвидность, стаканы, аукционы и банкролл-менеджмент.
   */
  public evaluateOpportunity(
    itemName: string,
    askPrice: number,
    category: "MARKET" | "AUCTION" | "ORDER" = "MARKET",
    walletBalance: number = 0,
    totalBankroll: number = 0
  ): TradeOpportunity {
    const corridors = this.aggregator.getUnifiedCorridors(itemName);
    
    // Если нет данных о рынке, пытаемся кинуть дурацкий оффер или скипаем
    if (!corridors) {
      return this.generateBlindOffer(itemName, askPrice, walletBalance, totalBankroll);
    }

    const { floor, safeExit, redLine, bidWall } = corridors;
    const freeBalanceRatio = totalBankroll > 0 ? walletBalance / totalBankroll : 1;
    
    const isAuction = category === "AUCTION";
    const isOrder = category === "ORDER";

    // ==========================================
    // ГРУППА 1: Моментальный арбитраж (SNIPE / INSTANT SELL)
    // ==========================================
    const profitToBid = bidWall > 0 ? this.calculateNetProfit(askPrice, bidWall) : -1;
    const profitToFloor = this.calculateNetProfit(askPrice, safeExit);
    
    // Считаем моментальным, если профит в стенку (bid) > 0.5 TON 
    const isInstantGap = profitToFloor > (safeExit * 0.20);
    
    if (!isAuction && (profitToBid > 0.5 || isInstantGap)) {
      return {
        itemName,
        group: DealGroup.INSTANT,
        buyPrice: askPrice,
        expectedSellPrice: profitToBid > 0 ? bidWall : safeExit,
        expectedProfit: profitToBid > 0 ? profitToBid : profitToFloor,
        action: isOrder ? "SNIPE" : "SNIPE", // If it's an ORDER and we can fulfill it with a profit
        reason: isOrder 
          ? "Группа 1: Моментальный выход в ордер. Снайпим и сразу сливаем." 
          : "Группа 1: Моментальный профит. Снайпим по рынку, оферты запрещены."
      };
    }

    // ==========================================
    // ГРУППА 2: Легкий арбитраж (QUEUE_BUY / MAKE_OFFER)
    // ==========================================
    if (profitToFloor > (safeExit * 0.08) && profitToFloor > 0.8) {
      let action: "QUEUE_BUY" | "MAKE_OFFER" = "QUEUE_BUY";
      
      if (freeBalanceRatio < 0.5 && walletBalance > 50) {
        action = "MAKE_OFFER";
      }

      return {
        itemName,
        group: DealGroup.EASY,
        buyPrice: askPrice,
        expectedSellPrice: safeExit,
        expectedProfit: profitToFloor,
        action,
        reason: `Группа 2: Легкий профит (${category}). Действие: ${action} на основе банкролла.`
      };
    }

    // ==========================================
    // ГРУППА 3: Хлебный арбитраж (QUEUE_BUY / PLACE_ORDER)
    // ==========================================
    if (profitToFloor > 0.1 && profitToFloor > (safeExit * 0.03)) { 
      return {
        itemName,
        group: DealGroup.BREAD,
        buyPrice: askPrice,
        expectedSellPrice: safeExit,
        expectedProfit: profitToFloor,
        action: isOrder ? "QUEUE_BUY" : "QUEUE_BUY", 
        reason: `Группа 3: Небольшой профит (${category}). Медленная реализация через стакан.`
      };
    }

    // ==========================================
    // ГРУППА 5: Аукционы и Оферты (PLACE_BID / MAKE_OFFER)
    // ==========================================
    if (isAuction) {
      const maxBid = safeExit * 0.85;
      if (askPrice < maxBid) {
        return {
          itemName,
          group: DealGroup.OFFER_AUCTION,
          buyPrice: askPrice,
          expectedSellPrice: safeExit,
          expectedProfit: this.calculateNetProfit(askPrice, safeExit),
          action: "PLACE_BID",
          reason: "Группа 5 (Аукцион): Ставка вписывается в прибыльность уровня Группы 2."
        };
      } else {
        return {
          itemName,
          group: DealGroup.WEAK,
          buyPrice: askPrice,
          expectedSellPrice: safeExit,
          expectedProfit: profitToFloor,
          action: "SKIP",
          reason: "Перебили. Ставка выше допустимой маржинальности 2 группы."
        };
      }
    }

    // Оферты: обьюзная тема
    if (walletBalance < 50 || freeBalanceRatio < 0.3) {
      // Злой офер на дурачков (минимальные закупки, максимизируем отжим)
      const evilOfferPrice = safeExit * 0.35; // Предлагаем всего 35% от реальной стоимости
      return {
        itemName,
        group: DealGroup.OFFER_AUCTION,
        buyPrice: evilOfferPrice,
        expectedSellPrice: safeExit,
        expectedProfit: this.calculateNetProfit(evilOfferPrice, safeExit),
        action: "MAKE_OFFER",
        reason: "Группа 5 (Оферта): Мало средств. Злой офер на дурачка (скидка 65%)."
      };
    } else {
      // Денег много, загоняем цену в 1 или 2 группу
      const generousOfferPrice = safeExit * 0.80; // Скидка 20%, дает уверенную 2 группу
      return {
        itemName,
        group: DealGroup.OFFER_AUCTION,
        buyPrice: generousOfferPrice,
        expectedSellPrice: safeExit,
        expectedProfit: this.calculateNetProfit(generousOfferPrice, safeExit),
        action: "MAKE_OFFER",
        reason: "Группа 5 (Оферта): Много средств. Кидаем офер для создания сделки 2 группы."
      };
    }
  }

  private generateBlindOffer(itemName: string, askPrice: number, walletBalance: number, totalBankroll: number): TradeOpportunity {
    // Fallback if we have no market data. Assume the askPrice might be fair, we lowball it heavily.
    return {
      itemName,
      group: DealGroup.OFFER_AUCTION,
      buyPrice: askPrice * 0.4,
      expectedSellPrice: askPrice,
      expectedProfit: 0,
      action: "MAKE_OFFER",
      reason: "Слепой офер. Нет точных коридоров, закидываем злую заявку."
    };
  }
}
