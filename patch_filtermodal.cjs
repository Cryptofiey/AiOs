const fs = require('fs');

let code = fs.readFileSync('src/components/combiner/FilterModal.tsx', 'utf8');

const target1 = `export interface FilterOption {
  id: string;
  name: string;
  icon?: string;
  subtitle?: string;
  badge?: string;
}`;

const replacement1 = `export interface FilterOption {
  id: string;
  name: string;
  icon?: string;
  subtitle?: string;
  badge?: string;
  isOffline?: boolean;
}`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
}

const target2 = `                    {option.subtitle && (
                      <span className="text-xs text-slate-500">{option.subtitle}</span>
                    )}`;

const replacement2 = `                    {option.subtitle && (
                      <span className="text-xs text-slate-500">{option.subtitle}</span>
                    )}
                    {option.isOffline && (
                      <span className="text-[10px] text-red-400 font-bold mt-0.5">⚠️ Offline</span>
                    )}`;

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
}

fs.writeFileSync('src/components/combiner/FilterModal.tsx', code);
console.log('Patched FilterModal');
