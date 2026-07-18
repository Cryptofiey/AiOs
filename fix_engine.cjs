const fs = require('fs');
const file = 'src/lib/trading/ServerMarketEngine.ts';
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(/GiftAsset, /, '');
content = content.replace(/OrderBookUpdate, /, '');
content = content.replace(/TradeSignal, /, '');
content = content.replace(/MarketInsight, /, '');
content = content.replace(/logger, /, '');
content = content.replace(/config, /, '');

// mockEngineState
content = content.replace(/const mockEngineState = \{[\s\S]*?\};\n/g, '');

// update in onPriceUpdate?
content = content.replace(/\(update: any\)/g, '(data: any)');

fs.writeFileSync(file, content);
