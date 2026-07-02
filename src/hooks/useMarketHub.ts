import { useState, useEffect } from 'react';
import { MarketHub } from '../lib/trading/MarketHub';
import { MarketState } from '../types/market';
import { db } from '../lib/firebase';

/**
 * useMarketHub - Реактивный хук для доступа к состоянию MarketHub.
 * Автоматически подписывается на изменения данных в Firestore.
 */
export function useMarketHub() {
  const [state, setState] = useState<MarketState>({
    items: new Map(),
    globalFloor: 0,
    lastUpdate: new Date().toISOString(),
    activeSources: []
  });

  useEffect(() => {
    const hub = MarketHub.getInstance();

    const unsubscribe = hub.subscribe((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
