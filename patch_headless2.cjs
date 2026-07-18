const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'const hasSeed = !!process.env.WALLET_SEED_PHRASE;',
  'const hasSeed = !!process.env.WALLET_SEED_PHRASE || !!process.env.VITE_MAIN_WALLET_ADDRESS;'
);

content = content.replace(
  'const hasSeed = !!process.env.WALLET_SEED_PHRASE;',
  'const hasSeed = !!process.env.WALLET_SEED_PHRASE || !!process.env.VITE_MAIN_WALLET_ADDRESS;'
);


fs.writeFileSync('server.ts', content);
console.log("Patched server.ts");
