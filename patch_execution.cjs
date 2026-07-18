const fs = require('fs');
let content = fs.readFileSync('src/lib/trading/ExecutionEngine.ts', 'utf8');

// Replace the fallback methods
content = content.replace(
  'if (s.includes("fragment") || s.includes("getgems")) return "BLOCKCHAIN_SDK";',
  'if (s.includes("fragment") || s.includes("getgems")) return "TON_CONNECT";'
);

fs.writeFileSync('src/lib/trading/ExecutionEngine.ts', content);
console.log("Patched ExecutionEngine");
