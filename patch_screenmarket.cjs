const fs = require('fs');
let code = fs.readFileSync('src/components/combiner/ScreenMarketCombiner.tsx', 'utf8');

const target = `  const allMarketsOptions = useMemo(() => {
    return Array.from(new Set(['Fragment', 'GetGems', 'TonAPI', 'Tonnel', 'MRKT', 'Portals', ...marketState.activeSources])).map(s => ({
      id: s,
      name: s,
      icon: s.charAt(0)
    }));
  }, [marketState.activeSources]);`;

const replacement = `  const allMarketsOptions = useMemo(() => {
    return Array.from(new Set(['Fragment', 'GetGems', 'TonAPI', 'Tonnel', 'MRKT', 'Portals', ...marketState.activeSources])).map(s => {
      const isOffline = marketState.adapterStatus ? marketState.adapterStatus[s] === false : false;
      return {
        id: s,
        name: s,
        icon: s === 'Fragment' ? '💠' : s === 'GetGems' ? '💎' : s === 'TonAPI' ? '⚡' : s === 'Tonnel' ? '🕳️' : s === 'MRKT' ? '🛒' : s === 'Portals' ? '🌀' : s.charAt(0),
        subtitle: isOffline ? "Adapter is offline/blocked" : undefined,
        isOffline
      };
    });
  }, [marketState.activeSources, marketState.adapterStatus]);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/combiner/ScreenMarketCombiner.tsx', code);
    console.log('Patched ScreenMarketCombiner');
} else {
    console.log('Not found');
}
