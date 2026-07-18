const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Also make sure h-[100dvh] is set and body doesn't bounce in iOS
content = content.replace(
  '<div className="w-full h-screen bg-[#030303] text-slate-100 font-sans flex flex-col">',
  '<div className="w-full h-[100dvh] bg-[#030303] text-slate-100 font-sans flex flex-col">'
);

fs.writeFileSync('src/App.tsx', content);
