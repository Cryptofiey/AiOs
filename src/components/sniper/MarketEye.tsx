import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, Play, Pause, RefreshCw, ExternalLink 
} from "lucide-react";
import { MarketOrder } from "../../types/trading";

interface MarketEyeProps {
  activeOrders: MarketOrder[];
}

interface LiveLog {
  id: string;
  timestamp: string;
  source: "GLOBAL" | "FRAGMENT" | "MRKT" | "PORTAL" | "TONAPI" | "WHALE";
  level: "info" | "success" | "warn" | "error";
  message: string;
}

interface ScanReport {
  assetName: string;
  source: string;
  safetyScore: number;
  floorPriceTon: number;
  estimatedFairPrice: number;
  deviationPercent: number;
  liquidityScore: "High" | "Medium" | "Low";
  status: "Bargain" | "Fair Value" | "Overpriced";
  ownerWallet: string;
  timestamp: string;
}

// Pre-defined search templates for user convenience
const PRESETS = [
  { query: "Durov's Puzzles", category: "Gifts" },
  { query: "Star Gift", category: "Gifts" },
  { query: "Major #110", category: "NFTs" }
];

export const MarketEye: React.FC<MarketEyeProps> = ({ activeOrders }) => {
  // Navigation & Control States
  const [scannerMode] = useState<"global" | "fragment" | "mrkt" | "portal">("global");
  const [isFeedPaused, setIsFeedPaused] = useState(false);
  const [logs, setLogs] = useState<LiveLog[]>([]);
  
  // Custom Tools Integration States
  const [useTracer] = useState(true);

  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Local auto-scroll for terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      const container = terminalContainerRef.current;
      // Scroll to bottom without scrolling the whole window
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-6">
      
      {/* SECTIONS 1 AND 2 REMOVED */}
      {/* SECTION 3: RAW TRANSACTION STREAM TERMINAL */}
      <div className="bg-black/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[360px] shadow-2xl relative">
        
        {/* Terminal Header */}
        <div className="bg-slate-900/90 px-4 py-2.5 flex justify-between items-center border-b border-slate-800 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2">
            <Terminal className="text-fuchsia-400" size={15} />
            <span className="text-[11px] font-mono text-slate-300 font-bold tracking-wider">
              Трансляция Блоков & Поток событий {scannerMode.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Log filter label */}
            <span className="text-[8px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-slate-400 uppercase">
              Mode: {scannerMode}
            </span>
            <button
              onClick={() => setIsFeedPaused(!isFeedPaused)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all cursor-pointer"
              title={isFeedPaused ? "Resume Live Feed" : "Pause Live Feed"}
            >
              {isFeedPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>
            <button
              onClick={() => setLogs([])}
              className="text-[9px] font-mono text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded border border-slate-850 hover:bg-slate-800/50 transition-all cursor-pointer"
            >
              Очистить
            </button>
          </div>
        </div>

        {/* Terminal logs list */}
        <div 
          ref={terminalContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 custom-scrollbar bg-slate-950/60"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-2">
              <RefreshCw size={24} className="animate-spin opacity-20" />
              <div className="text-[10px]">SCANNING BLOCKCHAIN EVENT HORIZON...</div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 border-b border-slate-900/40 pb-1 leading-relaxed"
                >
                  {/* Timestamp */}
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  
                  {/* Source Badge */}
                  <span className={`shrink-0 select-none px-1.5 py-0.5 text-[8px] font-bold rounded uppercase leading-none font-semibold ${
                    log.source === "GLOBAL" 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" 
                      : log.source === "FRAGMENT"
                      ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/10"
                      : log.source === "MRKT"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                      : log.source === "PORTAL"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                      : log.source === "TONAPI"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/10 animate-pulse"
                  }`}>
                    {log.source}
                  </span>

                  {/* Message body */}
                  <span className={`flex-1 break-all ${
                    log.level === "success" 
                      ? "text-emerald-400" 
                      : log.level === "warn" 
                      ? "text-amber-400" 
                      : log.level === "error"
                      ? "text-rose-400 font-bold"
                      : "text-slate-300"
                  }`}>
                    {log.message}
                  </span>

                  {/* Fake TX link option if useTracer active */}
                  {useTracer && log.message.includes("detected") && (
                    <a 
                      href={`https://tonviewer.com/transaction/0x${Math.random().toString(36).substring(2, 10).toUpperCase()}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-cyan-400 hover:text-cyan-300 shrink-0 flex items-center gap-0.5 text-[9px]"
                    >
                      trace <ExternalLink size={8} />
                    </a>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
