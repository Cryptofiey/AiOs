const fs = require('fs');
const file = 'src/components/desktop/ScreenTgGiftsSniper.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove all setMarketOrders calls
content = content.replace(/setMarketOrders\([^)]*\);\n?/g, '');

// 2. Remove setIsRefreshingGifts calls
content = content.replace(/setIsRefreshingGifts\([^)]*\);\n?/g, '');
content = content.replace(/const fetchMarketGifts = async \(\) => \{[\s\S]*?\}\n\s*};\n/g, '');

// 3. Restore newWhaleLabel definition if it is missing
if (!content.includes('const [newWhaleLabel, setNewWhaleLabel]')) {
    content = content.replace(/const \[newWhaleAddr, setNewWhaleAddr\] = useState\(""\);/, 'const [newWhaleAddr, setNewWhaleAddr] = useState("");\n  const [newWhaleLabel, setNewWhaleLabel] = useState("");');
}

// 4. Also data is declared but never read at 1630
content = content.replace(/const data = await res.json\(\);/g, '');

// 5. Remove _deprecated_handleAnalyzeYoutube
content = content.replace(/const _deprecated_handleAnalyzeYoutube = null;\n/g, '');

fs.writeFileSync(file, content);
