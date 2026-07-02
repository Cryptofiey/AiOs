const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /\/\/ 2\. POST Execute Real Trade and Store in Firebase[\s\S]*?\}\);\n/g;

content = content.replace(targetRegex, '');
fs.writeFileSync('server.ts', content);
console.log("Success");
