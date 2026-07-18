import { useState, useEffect } from 'react';
import { MarketHub } from '../lib/trading/MarketHub';
import { MarketState } from '../types/market';

export function useMarketHub() {
  const [marketState, setMarketState] = useState<MarketState>({
    items: new Map(),
    globalFloor: 0,
    lastUpdate: new Date().toISOString(),
    activeSources: []
  });

  useEffect(() => {
    const hub = MarketHub.getInstance();
    
    const unsubscribe = hub.subscribe((newState) => {
      setMarketState(newState);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return marketState;
}
