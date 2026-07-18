const fs = require('fs');
let content = fs.readFileSync('src/components/combiner/ScreenMarketCombiner.tsx', 'utf8');

const emojiMapping = `
const getIconForItem = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('star')) return '⭐';
  if (n.includes('duck')) return '🦆';
  if (n.includes('heart')) return '❤️';
  if (n.includes('diamond')) return '💎';
  if (n.includes('trophy')) return '🏆';
  if (n.includes('cake') || n.includes('b-day')) return '🎂';
  if (n.includes('apple')) return '🍎';
  if (n.includes('dog') || n.includes('puppy')) return '🐶';
  if (n.includes('cat')) return '🐱';
  if (n.includes('frog') || n.includes('pepe')) return '🐸';
  if (n.includes('rose')) return '🌹';
  if (n.includes('cap')) return '🧢';
  if (n.includes('helmet')) return '🪖';
  if (n.includes('sword')) return '🗡️';
  if (n.includes('shield')) return '🛡️';
  if (n.includes('box')) return '📦';
  if (n.includes('berry')) return '🍓';
  if (n.includes('peach')) return '🍑';
  if (n.includes('shard')) return '🔮';
  if (n.includes('locket')) return '💝';
  return '💎';
};
`;

if (!content.includes('getIconForItem')) {
  content = content.replace('export function ScreenMarketCombiner() {', emojiMapping + '\\nexport function ScreenMarketCombiner() {');
  content = content.replace('badge: orders.length > 0 ? `(${orders.length})` : undefined', 'badge: orders.length > 0 ? `(${orders.length})` : undefined,\\n        icon: getIconForItem(itemName)');
  fs.writeFileSync('src/components/combiner/ScreenMarketCombiner.tsx', content);
  console.log("Icons patched");
}
