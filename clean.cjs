const fs = require('fs');
const file = 'src/components/desktop/ScreenTgGiftsSniper.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove agent simulation stuff completely
content = content.replace(/const addAgentLog = [^}]*};\n/g, '');
content = content.replace(/const runAgentSimulation = async \(\) => {[\s\S]*?};\n/g, '');

// 2. Remove marketGifts usages
content = content.replace(/setMarketGifts\(data\);\n/g, '');
content = content.replace(/setMarketGifts\(prev => prev.filter\(g => g.id !== gift.id\)\);\n/g, '');

// 3. Remove fetchMarketGifts if unused, but let's just remove the lines that caused errors.
// Wait, the errors were TS2552 (Cannot find name 'setMarketGifts'). If I remove them, it should be fine.

// 4. Remove unused imports
content = content.replace(/ChevronRight, /, '');
content = content.replace(/Star, /, '');
content = content.replace(/Check, /, '');
content = content.replace(/Settings, /, '');
content = content.replace(/Info, /, '');
content = content.replace(/ShieldAlert, /, '');
content = content.replace(/Sparkles, /, '');
content = content.replace(/Filter, /, '');
content = content.replace(/ArrowUpDown, /, '');
content = content.replace(/ShoppingBag, /, '');
content = content.replace(/Coins, /, '');
content = content.replace(/import Markdown from "react-markdown";\n/, '');

// Other imports
content = content.replace(/TradingStrategy, /, '');
content = content.replace(/ItemGrade, /, '');
content = content.replace(/MarketInsight, /, '');
content = content.replace(/PriceCorridors /, '');

fs.writeFileSync(file, content);
