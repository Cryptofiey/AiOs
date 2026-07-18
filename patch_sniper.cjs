const fs = require('fs');
let content = fs.readFileSync('src/lib/trading/SniperEngine.ts', 'utf8');

content = content.replace(
  'ServerLogger.getInstance().log("SNIPER", `⚠️ TRADE SKIPPED: ${itemName} - ${result.error}`, "warn");',
  'ServerLogger.getInstance().log("SNIPER", `⚠️ BACKEND AUTOSNIPER SKIPPED: ${itemName} - Headless Wallet Not Configured. Use UI for Manual MitM Approval.`, "warn");'
);

fs.writeFileSync('src/lib/trading/SniperEngine.ts', content);
console.log("Patched SniperEngine");
