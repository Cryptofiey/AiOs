const fs = require('fs');
let code = fs.readFileSync('src/types/market.ts', 'utf8');

const target = `export interface MarketState {
  items: Map<string, NormalizedOrder[]>; 
  globalFloor: number;
  lastUpdate: string;
  activeSources: string[];
}`;

const replacement = `export interface MarketState {
  items: Map<string, NormalizedOrder[]>; 
  globalFloor: number;
  lastUpdate: string;
  activeSources: string[];
  adapterStatus?: Record<string, boolean>;
}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/types/market.ts', code);
    console.log("Patched types");
} else {
    console.log("Not found");
}
