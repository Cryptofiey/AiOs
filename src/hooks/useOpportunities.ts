import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

export interface UIArbitrageOpportunity {
  id: string;
  itemName: string;
  group: number;
  buyPrice: number;
  expectedSellPrice: number;
  expectedProfit: number;
  action: string;
  source?: string;
  timestamp: number;
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<UIArbitrageOpportunity[]>([]);

  useEffect(() => {
    if (!db) return;
    
    const q = query(
      collection(db, 'arbitrage_opportunities'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opps: UIArbitrageOpportunity[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        opps.push({
          id: doc.id,
          itemName: data.itemName,
          group: data.group,
          buyPrice: data.buyPrice,
          expectedSellPrice: data.expectedSellPrice,
          expectedProfit: data.expectedProfit,
          action: data.action,
          source: data.sourceAdapter || data.source || 'GetGems',
          timestamp: data.timestamp || Date.now()
        });
      });
      setOpportunities(opps);
    });

    return () => unsubscribe();
  }, []);

  return opportunities;
}
