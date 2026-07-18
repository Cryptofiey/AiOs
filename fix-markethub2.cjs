const fs = require('fs');
let code = fs.readFileSync('src/lib/trading/MarketHub.ts', 'utf8');
code = code.replace(
  "import { collection, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';",
  "import { collection, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc, limit, orderBy } from 'firebase/firestore';"
);
fs.writeFileSync('src/lib/trading/MarketHub.ts', code);
