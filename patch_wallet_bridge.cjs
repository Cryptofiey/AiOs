const fs = require('fs');
let content = fs.readFileSync('src/lib/bridge/WalletBridge.ts', 'utf8');

content = content.replace(
  'const res = await fetch("/api/ton/headless/sign", {',
  'const baseUrl = typeof window === "undefined" ? "http://localhost:3000" : "";\n      const res = await fetch(baseUrl + "/api/ton/headless/sign", {'
);

fs.writeFileSync('src/lib/bridge/WalletBridge.ts', content);
console.log("Patched WalletBridge.ts for server-side fetch");
