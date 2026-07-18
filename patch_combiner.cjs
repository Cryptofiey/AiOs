const fs = require('fs');
let content = fs.readFileSync('src/components/combiner/ScreenMarketCombiner.tsx', 'utf8');
content = content.replace(
  '<div className="w-full lg:w-72 bg-[#0a0a0a] border border-[#222] rounded-xl flex flex-col overflow-hidden shadow-xl shrink-0">',
  '<div className="w-full lg:w-72 h-[45vh] lg:h-full bg-[#0a0a0a] border border-[#222] rounded-xl flex flex-col overflow-hidden shadow-xl shrink-0">'
);
content = content.replace(
  '<div className="flex flex-col lg:flex-row h-full gap-4 text-slate-300 relative">',
  '<div className="flex flex-col lg:flex-row h-full gap-4 text-slate-300 relative lg:overflow-hidden overflow-y-auto p-2 lg:p-0">'
);
fs.writeFileSync('src/components/combiner/ScreenMarketCombiner.tsx', content);
