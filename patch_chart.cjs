const fs = require('fs');
let content = fs.readFileSync('src/components/combiner/ScreenMarketCombiner.tsx', 'utf8');

const chartDataHook = `
  const chartData = useMemo(() => {
    if (!filteredActiveOrders || filteredActiveOrders.length === 0) return [];
    
    const sorted = [...filteredActiveOrders].sort((a, b) => a.price - b.price);
    const baseTime = new Date().getTime();
    
    return sorted.map((order, index) => {
       return {
          time: new Date(baseTime - (sorted.length - index) * 3600 * 1000).toISOString(),
          value: order.price
       };
    }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [filteredActiveOrders]);

  const handleRunSniper = () => {
`;

content = content.replace('const handleRunSniper = () => {', chartDataHook);

content = content.replace(
  '<CombinerChart itemName={selectedItem} timeframe={timeframe} />',
  '<CombinerChart data={chartData} />'
);

fs.writeFileSync('src/components/combiner/ScreenMarketCombiner.tsx', content);
console.log("Patched chart data");
