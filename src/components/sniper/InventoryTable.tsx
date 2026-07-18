import React, { useState, useMemo } from "react";
import { TradingItem, ItemGrade } from "../../types/trading";
import { TrendingUp, Zap, Star, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InventoryTableProps {
  items: TradingItem[];
}

type SortField = "name" | "grade" | "estimatedValue";
type SortOrder = "asc" | "desc";

const gradeWeights: Record<ItemGrade, number> = {
  [ItemGrade.COMMON]: 0,
  [ItemGrade.RARE]: 1,
  [ItemGrade.EPIC]: 2,
  [ItemGrade.LEGENDARY]: 3,
  [ItemGrade.UNIQUE]: 4,
};

const gradeColors: Record<ItemGrade, string> = {
  [ItemGrade.COMMON]: "bg-slate-500",
  [ItemGrade.RARE]: "bg-blue-500",
  [ItemGrade.EPIC]: "bg-purple-500",
  [ItemGrade.LEGENDARY]: "bg-orange-500",
  [ItemGrade.UNIQUE]: "bg-rose-500",
};

export const InventoryTable: React.FC<InventoryTableProps> = ({ items }) => {
  const [sortField, setSortField] = useState<SortField>("estimatedValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortField === "grade") {
        comparison = (gradeWeights[a.grade] ?? 0) - (gradeWeights[b.grade] ?? 0);
      } else if (sortField === "estimatedValue") {
        comparison = (a.estimatedValue ?? 0) - (b.estimatedValue ?? 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [items, sortField, sortOrder]);

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === "asc" ? <ChevronUp size={12} className="text-cyan-400" /> : <ChevronDown size={12} className="text-cyan-400" />;
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            <th 
              className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center gap-2">
                Item <SortIndicator field="name" />
              </div>
            </th>
            <th 
              className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group"
              onClick={() => handleSort("grade")}
            >
              <div className="flex items-center gap-2">
                Grade <SortIndicator field="grade" />
              </div>
            </th>
            <th className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Purchase</th>
            <th className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Market Floor</th>
            <th 
              className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group"
              onClick={() => handleSort("estimatedValue")}
            >
              <div className="flex items-center gap-2">
                Est. Value <SortIndicator field="estimatedValue" />
              </div>
            </th>
            <th className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Expected Profit</th>
            <th className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Labels</th>
            <th className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {sortedItems.length === 0 ? (
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <td colSpan={8} className="p-12 text-center text-slate-500 font-mono italic">
                  Inventory is empty. Waiting for bot actions...
                </td>
              </motion.tr>
            ) : (
              sortedItems.map((item) => {
                const profit = (item.expectedSalePrice ?? 0) - (item.purchasePrice ?? 0);
                const profitPercent = item.purchasePrice ? ((profit / item.purchasePrice) * 100).toFixed(1) : "0.0";
                const isProfitPositive = profit > 0;

                return (
                  <motion.tr 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-slate-800 hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 overflow-hidden relative flex items-center justify-center">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const imgEl = e.currentTarget;
                              imgEl.style.display = 'none';
                              const parent = imgEl.parentElement;
                              if (parent) {
                                const letter = document.createElement('div');
                                letter.className = "flex items-center justify-center w-full h-full font-bold font-mono text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white";
                                letter.innerText = (item.name || "?").trim().charAt(0).toUpperCase();
                                parent.appendChild(letter);
                              }
                            }}
                          />
                          <div className={`absolute bottom-0 left-0 right-0 h-1 ${gradeColors[item.grade]}`} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {item.collection} {item.serialNumber ? `#${item.serialNumber}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-sm ${gradeColors[item.grade]}`}>
                        {item.grade}
                      </span>
                    </td>
                     <td className="p-4 font-mono text-sm text-slate-300">
                      {(item.purchasePrice ?? 0).toFixed(2)} TON
                    </td>
                    <td className="p-4 font-mono text-sm text-slate-400">
                      {(item.floorPrice ?? 0).toFixed(2)} TON
                    </td>
                    <td className="p-4 font-mono text-sm text-cyan-400">
                      {(item.estimatedValue ?? 0).toFixed(2)} TON
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-1 font-mono text-sm ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                        {(profit ?? 0).toFixed(2)} TON ({profitPercent}%)
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.labels ?? []).map((label, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-[9px] text-slate-400 flex items-center gap-1">
                            {label.includes("Sniped") && <Zap size={8} className="text-yellow-400" />}
                            {label.includes("Rare") && <Star size={8} className="text-cyan-400" />}
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <button className="px-3 py-1 bg-fuchsia-600/10 border border-fuchsia-500/20 rounded text-[10px] font-bold text-fuchsia-400 hover:bg-fuchsia-600/20 transition-all uppercase tracking-tighter">
                        List for Sale
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};
