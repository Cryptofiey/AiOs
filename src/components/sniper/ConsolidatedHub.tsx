import React, { useState, useEffect } from "react";
import { Database, Clock } from "lucide-react";
import { motion } from "framer-motion";

export const ConsolidatedHub: React.FC = () => {
  const [time, setTime] = useState("");
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB"));
    };
    updateTime();
    const int = setInterval(updateTime, 1000);
    return () => clearInterval(int);
  }, []);

  const sources = [
    { id: "FR", name: "Fragment", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { id: "TO", name: "Tonapi", bg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
    { id: "MR", name: "MRKT", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { id: "MT", name: "MTProto Bridge", bg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  ];

  const initialItems = [
    { sourceId: "FR", asset: "Durov's Puzzles...", num: "1606" },
    { sourceId: "TO", asset: "Pumpkin Gift", num: "2085" },
    { sourceId: "MR", asset: "Spooky Peach", num: "3202" },
    { sourceId: "MT", asset: "Royalty Gift", num: "187" },
    { sourceId: "FR", asset: "Telegram Stars ...", num: "5106" },
    { sourceId: "TO", asset: "Durov's Puzzles...", num: "8256" },
  ];

  const [activeSources, setActiveSources] = useState<Record<string, boolean>>({
    FR: true, TO: true, MR: true, MT: true
  });

  const toggleSource = (id: string) => {
    setActiveSources(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSourceBadge = (sourceId: string) => {
    const s = sources.find(x => x.id === sourceId);
    if (!s) return null;
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border ${s.bg}`}>
        {s.name}
      </span>
    );
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-5 flex flex-col gap-4 border-b border-slate-800/50">
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Database className="text-blue-400" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-widest uppercase">Consolidated Hub</h2>
              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold uppercase tracking-wider">LIVE</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">Aggregating 4 sources &bull; Global Floor: <span className="text-slate-300 font-bold">5.54 TON</span></p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {sources.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${
                  activeSources[s.id]
                    ? "bg-slate-700/50 text-slate-200 border-slate-600"
                    : "bg-slate-900 text-slate-600 border-slate-800"
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 font-mono">
            <Clock size={12} className="text-slate-500" />
            {time || "00:00:00"}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        <div className="grid grid-cols-[100px_1fr] p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/50 sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
          <div className="px-2">Source</div>
          <div className="px-2">Asset</div>
        </div>
        
        <div className="flex flex-col">
          {initialItems.filter(item => activeSources[item.sourceId]).map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-[100px_1fr] p-3 border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors items-center"
            >
              <div className="px-2 flex items-center">
                {getSourceBadge(item.sourceId)}
              </div>
              <div className="px-2">
                <div className="text-sm font-bold text-slate-200">{item.asset}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.num}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
