import { ItemGrade, DynamicTradingRule } from "../../types/trading";

export interface PatternInfo {
  grade: ItemGrade;
  labels: string[];
  multiplier: number;
}

export class PatternAnalyzer {
  static analyze(
    name: string, 
    serial: string | number | undefined, 
    patternName?: string,
    dynamicRules: DynamicTradingRule[] = []
  ): PatternInfo {
    const labels: string[] = [];
    let multiplier = 1.0;
    let grade = ItemGrade.COMMON;

    const serialNum = typeof serial === 'string' ? parseInt(serial.replace(/[^0-9]/g, '')) : serial;

    // 1. Serial Number Logic
    if (serialNum !== undefined) {
      if (serialNum === 1) {
        labels.push("The First (#1)");
        multiplier *= 5.0;
        grade = ItemGrade.UNIQUE;
      } else if (serialNum <= 10) {
        labels.push("Top 10 Serial");
        multiplier *= 2.5;
        grade = ItemGrade.LEGENDARY;
      } else if (serialNum <= 100) {
        labels.push("Low Serial");
        multiplier *= 1.5;
        grade = ItemGrade.RARE;
      }
      
      // Palindrome check (e.g. 121, 777)
      const s = serialNum.toString();
      if (s.length > 1 && s === s.split('').reverse().join('')) {
        labels.push("Palindrome/Lucky");
        multiplier *= 1.3;
        if (grade === ItemGrade.COMMON) grade = ItemGrade.RARE;
      }
    }

    // 2. Pattern Logic
    if (patternName) {
      if (patternName.toLowerCase().includes("monochrome")) {
        labels.push("Monochrome");
        multiplier *= 2.0;
        grade = ItemGrade.EPIC;
      }
      if (patternName.toLowerCase().includes("gold") || patternName.toLowerCase().includes("diamond")) {
        labels.push("Premium Skin");
        multiplier *= 1.8;
        if (grade < ItemGrade.EPIC) grade = ItemGrade.EPIC;
      }
    }

    // 3. Name Keywords
    if (name.toLowerCase().includes("durov") || name.toLowerCase().includes("puzzle")) {
      multiplier *= 1.1; // Collectible premium
    }

    // 4. APPLY DYNAMIC RULES from YouTube Strategies (SYSTEM DISCONNECTED)
    /* 
    for (const rule of dynamicRules) {
      // Priority Keywords
      if (rule.priorityKeywords) {
        for (const kw of rule.priorityKeywords) {
          if (name.toLowerCase().includes(kw.toLowerCase()) || (patternName && patternName.toLowerCase().includes(kw.toLowerCase()))) {
            labels.push(`Strategy Boost (${kw})`);
            multiplier *= 1.25; // Significant boost from learned info
            if (grade === ItemGrade.COMMON) grade = ItemGrade.RARE;
          }
        }
      }
      
      // Multiplier Overrides (e.g. { "777": 5.0 })
      if (rule.multiplierOverrides && serialNum !== undefined) {
        const override = rule.multiplierOverrides[serialNum.toString()];
        if (override) {
          labels.push("Manual Insight Match");
          multiplier *= override;
          grade = ItemGrade.UNIQUE;
        }
      }
    }
    */

    return { grade, labels, multiplier };
  }

  static analyzeWithWhaleData(
    name: string,
    serial: string | number | undefined,
    patternName: string | undefined,
    dynamicRules: DynamicTradingRule[] = [],
    whaleTrades: Array<{
      itemName: string;
      serial: string;
      buyPrice: number;
      sellPrice: number;
      daysHeld: number;
      pnl: number;
      category: string;
    }> = []
  ) {
    const info = PatternAnalyzer.analyze(name, serial, patternName, dynamicRules);
    
    // Find matching whale trades to validate re-sales
    const serialNum = typeof serial === 'string' ? parseInt(serial.replace(/[^0-9]/g, '')) : serial;
    
    const matches = whaleTrades.filter(t => {
      // Direct name match is a strong signal
      const nameMatch = t.itemName.toLowerCase() === name.toLowerCase();
      
      // Category matches
      let catMatch = false;
      if (t.category === "Numbers" && name.toLowerCase().includes("number")) catMatch = true;
      if (t.category === "Gifts" && !name.toLowerCase().includes("number") && !name.toLowerCase().includes("domain")) catMatch = true;
      if (t.category === "Domains" && name.toLowerCase().includes(".ton")) catMatch = true;
      
      // Serial range match (checking low serial or palindromes)
      let serialMatch = false;
      const tSerialNum = parseInt(t.serial.replace(/[^0-9]/g, ''));
      if (!isNaN(tSerialNum) && serialNum !== undefined) {
        if (serialNum === 1 && tSerialNum === 1) serialMatch = true;
        else if (serialNum <= 10 && tSerialNum <= 10) serialMatch = true;
        else if (serialNum <= 100 && tSerialNum <= 100) serialMatch = true;
        else if (serialNum > 100 && tSerialNum > 100) serialMatch = true;
      }
      
      // Match is confirmed if we have a direct name match OR a category match with serial similarity
      return nameMatch || (catMatch && serialMatch);
    });

    let whaleEvidenceMatched = false;
    let averageWhaleMarkup = 1.0;
    let averageWhaleHoldDays = 3.0;
    let originalMultiplier = info.multiplier;
    let reasoning = "";

    if (matches.length > 0) {
      whaleEvidenceMatched = true;
      const totalMarkup = matches.reduce((sum, t) => sum + (t.sellPrice / Math.max(1, t.buyPrice)), 0);
      averageWhaleMarkup = totalMarkup / matches.length;
      
      const totalHold = matches.reduce((sum, t) => sum + t.daysHeld, 0);
      averageWhaleHoldDays = totalHold / matches.length;

      // Blend standard pattern multiplier with actual whale transaction markup (60% weight to whale transaction data!)
      const blendedMultiplier = (info.multiplier * 0.4) + (averageWhaleMarkup * 0.6);
      info.multiplier = parseFloat(blendedMultiplier.toFixed(2));
      
      // If whales are successfully flipping with high markups, boost item grade representation
      if (averageWhaleMarkup >= 3.0) {
        info.grade = ItemGrade.UNIQUE;
        info.labels.push("🐳 Whale Multi-X Flip");
      } else if (averageWhaleMarkup >= 1.8) {
        info.grade = ItemGrade.LEGENDARY;
        info.labels.push("🐳 Whale Premium Flip");
      } else {
        info.labels.push("🐳 Whale Validated PnL");
      }
      
      reasoning = `Оценка скорректирована по ${matches.length} успешным перепродажам китов. Средняя наценка: x${averageWhaleMarkup.toFixed(2)}, удержание: ${averageWhaleHoldDays.toFixed(1)} дн.`;
    } else {
      reasoning = "Сделок китов по аналогичным предметам не обнаружено. Оценка по стандартным паттернам.";
    }

    return {
      ...info,
      whaleEvidenceMatched,
      averageWhaleMarkup,
      averageWhaleHoldDays,
      originalMultiplier,
      reasoning
    };
  }

  static getAttributePremium(info: PatternInfo): number {
    let premium = 1.0;
    if (info.grade === ItemGrade.UNIQUE) premium = 3.0;
    else if (info.grade === ItemGrade.LEGENDARY) premium = 2.0;
    else if (info.grade === ItemGrade.EPIC) premium = 1.5;
    else if (info.grade === ItemGrade.RARE) premium = 1.25;

    // Additional boost for specific labels
    if (info.labels.includes("The First (#1)")) premium *= 2.0;
    if (info.labels.includes("Monochrome")) premium *= 1.5;
    
    return premium;
  }
}
