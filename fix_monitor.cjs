const fs = require('fs');
const file = 'src/components/sniper/RealTimeMarketMonitor.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove unused imports
content = content.replace(/CheckCircle, /, '');
content = content.replace(/Play, Square, Power, Cpu, AlertTriangle, /g, ''); // not sure exact line, let's use regex
// Just replace them globally if they are in the import block
['CheckCircle', 'Play', 'Square', 'Power', 'Cpu', 'AlertTriangle', 'Eye', 'RefreshCcw'].forEach(imp => {
  content = content.replace(new RegExp(`\\b${imp},?\\s*`, 'g'), '');
});

// Remove unused variables
// 'itemName' at 94, 'platformMetrics' at 117
content = content.replace(/const itemName = [^;]*;\n/g, '');
content = content.replace(/const platformMetrics = [^;]*;\n/g, '');

fs.writeFileSync(file, content);
