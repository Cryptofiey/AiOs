const fs = require('fs');
const file = 'src/components/desktop/ScreenTgGiftsSniper.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace line 798:
content = content.replace(
  /const { testingStrats, stableStrats, totalTestingAlloc, mainAllocPercent, computedStableAllocations } = derivedStrategyAllocations;/g,
  'const { stableStrats, mainAllocPercent, computedStableAllocations } = derivedStrategyAllocations;'
);

// Remove unused state: marketInsights
content = content.replace(/const \[marketInsights, setMarketInsights\] = useState<MarketInsight\[\]>\(\[\]\);\n/g, '');

// Remove unused state: marketGifts
content = content.replace(/const \[marketGifts, setMarketGifts\] = useState<GiftAsset\[\]>\(\[\]\);\n/g, '');

// Remove unused state: agentLogs
content = content.replace(/const \[agentLogs, setAgentLogs\] = useState<string\[\]>\(\[\]\);\n/g, '');

// Remove addOptimizerLog
content = content.replace(/const addOptimizerLog = \(msg: string\) => {[^}]*};\n/g, '');

fs.writeFileSync(file, content);
