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
      collection(db, 'agent_logs')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opps: UIArbitrageOpportunity[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'OPPORTUNITY' || doc.id.startsWith('opp_')) {
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
        }
      });
      // Sort in memory instead of Firestore index
      opps.sort((a, b) => b.timestamp - a.timestamp);
      setOpportunities(opps.slice(0, 20));
    });

    return () => unsubscribe();
  }, []);

  return opportunities;
}
