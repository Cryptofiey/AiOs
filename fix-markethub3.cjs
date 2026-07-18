const fs = require('fs');
let code = fs.readFileSync('src/lib/trading/MarketHub.ts', 'utf8');
code = code.replace(
  'const marketCollection = query(collection(db, "agent_logs"), limit(200));',
  'const marketCollection = query(collection(db, "agent_logs"), orderBy("timestamp", "desc"), limit(200));'
);
fs.writeFileSync('src/lib/trading/MarketHub.ts', code);
