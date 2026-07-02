import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Eye, Zap, TrendingUp, Shield, Target, Activity, 
  Globe, Layers, Settings, Play, Pause, Terminal, Check, 
  ExternalLink, AlertCircle, Filter, Loader2, RefreshCw, 
  ArrowUpRight, Database, TrendingDown, Sparkles, Cpu, Info
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
  { query: "+888 0123 4567", category: "Numbers" },
  { query: "@telegram", category: "Usernames" },
  { query: "Major #110", category: "NFTs" }
];

export const MarketEye: React.FC<MarketEyeProps> = ({ activeOrders }) => {
  // Navigation & Control States
  const [scannerMode, setScannerMode] = useState<"global" | "fragment" | "mrkt" | "portal">("global");
  const [isFeedPaused, setIsFeedPaused] = useState(false);
  const [logs, setLogs] = useState<LiveLog[]>([]);
  
  // Custom Tools Integration States
  const [useTonapi, setUseTonapi] = useState(true);
  const [useTracer, setUseTracer] = useState(true);
  const [useWhaleAlert, setUseWhaleAlert] = useState(true);
  const [useFloorIndexer, setUseFloorIndexer] = useState(true);

  // Search & Deep Analysis States
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string[]>([]);
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);

  // Visual radar pulse & targets state
  const [scanPulse, setScanPulse] = useState(0);
  const [radarTargets, setRadarTargets] = useState<{ id: number; x: number; y: number; name: string; price: number; discount: number }[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);

  // Log sequence counter
  const logSequence = useRef(0);

  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // 1. Radar pulse rotation loop removed in favor of CSS animation
  useEffect(() => {
    // Logic for syncing radar targets would go here
  }, []);

  // 2. Generate radar targets (Production: should be linked to real market depth)
  useEffect(() => {
    // Empty list for production to avoid showing fake data
    setRadarTargets([]);
    
    const generateTargets = () => {
      // In a real scenario, this would poll a backend/MarketHub for active listings
      setRadarTargets([]);
    };

    const interval = setInterval(generateTargets, 10000);
    return () => clearInterval(interval);
  }, []);

  // 3. Dynamic scrolling logs feed (Production: should show real system events)
  useEffect(() => {
    if (isFeedPaused) return;

    const createLogEvent = () => {
      // In production, this would subscribe to real-time events from MarketHub
      setLogs(prev => {
        if (prev.length === 0) {
          return [{
            id: "system_init",
            timestamp: new Date().toLocaleTimeString(),
            source: "GLOBAL",
            level: "success",
            message: "MarketEye System Online. Monitoring global TON mempool..."
          }];
        }
        return prev;
      });
    };

    createLogEvent();
    const freq = 10000;
    const interval = setInterval(createLogEvent, freq);
    return () => clearInterval(interval);
  }, [isFeedPaused]);

  // Local auto-scroll for terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      const container = terminalContainerRef.current;
      // Scroll to bottom without scrolling the whole window
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  // Handle preset search clicks
  const applyPreset = (query: string) => {
    setSearchQuery(query);
    triggerSearchAnalysis(query);
  };

  // Trigger search simulation & analysis report
  const triggerSearchAnalysis = (queryText: string) => {
    const q = queryText || searchQuery || "Durov's Puzzles";
    setIsAnalyzing(true);
    setScanReport(null);
    setAnalysisProgress([]);

    const steps = [
      `🔍 [Scanner] Инициализация поиска: "${q}"...`,
      `📡 [Getgems API] Отправка запроса метаданных по коллекциям...`,
      `📄 [Fragment Parser] Анализ HTML структуры аукционов Fragment.com...`,
      `💎 [TON API] Запрос смарт-контракта на наличие холдеров...`,
      `📈 [Floor Indexer] Вычисление среднего отклонения цены...`,
      `✅ [AI Analyst] Расчет индекса рентабельности и формирование отчета...`
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAnalysisProgress(prev => [...prev, step]);
        if (idx === steps.length - 1) {
          // Finished deep analysis, generate realistic report
          const isPuzzle = q.toLowerCase().includes("puzzle") || q.toLowerCase().includes("durov");
          const isNumber = q.includes("+888") || q.toLowerCase().includes("number");
          const isUsername = q.includes("@") || q.toLowerCase().includes("user");

          let assetName = q;
          let source = "MRKT / Getgems";
          let floorPrice = 42.0;
          let fairPrice = 49.5;
          let safety = 9.8;
          let liquidity: "High" | "Medium" | "Low" = "High";

          if (isPuzzle) {
            assetName = "Durov's Puzzle #1403";
            source = "MRKT / Getgems";
            floorPrice = 42.0;
            fairPrice = 54.0;
            safety = 9.9;
            liquidity = "High";
          } else if (isNumber) {
            assetName = q.startsWith("+888") ? q : "+888 0123 4567";
            source = "Fragment.com";
            floorPrice = 1250.0;
            fairPrice = 1190.0;
            safety = 9.5;
            liquidity = "Medium";
          } else if (isUsername) {
            assetName = q.startsWith("@") ? q : "@telegram_premium";
            source = "Fragment.com";
            floorPrice = 550.0;
            fairPrice = 750.0;
            safety = 9.1;
            liquidity = "Low";
          } else {
            assetName = `${q} (Match Token/NFT)`;
            source = "Global Blockchain Network";
            floorPrice = 18.5;
            fairPrice = 24.0;
            safety = 8.2;
            liquidity = "Medium";
          }

          const dev = ((floorPrice - fairPrice) / fairPrice) * 100;
          const roundedDev = Math.round(dev * 10) / 10;
          
          let status: ScanReport["status"] = "Fair Value";
          if (roundedDev < -10) status = "Bargain";
          else if (roundedDev > 10) status = "Overpriced";

          setScanReport({
            assetName,
            source,
            safetyScore: safety,
            floorPriceTon: floorPrice,
            estimatedFairPrice: fairPrice,
            deviationPercent: roundedDev,
            liquidityScore: liquidity,
            status,
            ownerWallet: "UQB1NgFsflrggItN...m4B8",
            timestamp: new Date().toISOString()
          });
          setIsAnalyzing(false);
        }
      }, (idx + 1) * 800);
    });
  };

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
