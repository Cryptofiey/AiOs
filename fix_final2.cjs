const fs = require('fs');
const file = 'src/components/desktop/ScreenTgGiftsSniper.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove idx in map
content = content.replace(/\(tab, idx\)/g, '(tab)');

// 2. Remove totalProfit
content = content.replace(/const totalProfit = trades.reduce\(\(acc, t\) => \{[\s\S]*?\}, 0\);\n/g, '');

// 3. Remove profitColor
content = content.replace(/let profitColor = "text-emerald-400";\n/g, '');
content = content.replace(/profitColor = profitVal >= 0 \? "text-emerald-400" : "text-rose-400";\n/g, '');

fs.writeFileSync(file, content);
