const fs = require('fs');
const file = 'src/components/desktop/ScreenTgGiftsSniper.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const handleTestingAllocChange = \([\s\S]*?\}\);\n  };\n/g, '');
fs.writeFileSync(file, content);
