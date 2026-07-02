import React, { useState, useEffect } from "react";
import { 
  Play, ShieldAlert, CheckCircle, RefreshCw, Terminal, 
  Trash2, ShieldCheck, Cpu, Database, Network, Clock
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

interface AgentStatus {
  state: "idle" | "running" | "success" | "error";
  currentStep: string;
  logs: LogEntry[];
  metrics: {
    lastCheckedWallet: string;
    lastCheckedTonapi: string;
    lastCheckedMTProto: string;
    lastCheckedGetgems: string;
    lastCheckedAt: string;
  };
}

export function QaAgentConsole() {
  const [status, setStatus] = useState<AgentStatus>({
    state: "idle",
    currentStep: "System Offline",
    logs: [],
    metrics: {
      lastCheckedWallet: "Never",
      lastCheckedTonapi: "Never",
      lastCheckedMTProto: "Never",
      lastCheckedGetgems: "Never",
      lastCheckedAt: "Never"
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/os-agent/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("[QaAgentConsole] Failed to fetch agent status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 2 seconds to get real-time test execution streams
    const interval = setInterval(() => {
      if (polling) {
        fetchStatus();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling]);

  // If the agent is running, make sure we keep polling quickly
  useEffect(() => {
    if (status.state === "running") {
      setPolling(true);
    }
  }, [status.state]);

  const handleTriggerTest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/os-agent/trigger", { method: "POST" });
      if (res.ok) {
        setPolling(true);
        // Instant small sleep then fetch
        setTimeout(fetchStatus, 500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch("/api/os-agent/clear", { method: "POST" });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case "running": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]";
      case "success": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]";
      case "error": return "text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.15)]";
      default: return "text-slate-400 bg-slate-500/5 border-slate-700/50";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* HEADER CONTROLS */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-extrabold text-white tracking-wide uppercase font-sans">Sema Soul QA Agent Node</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-black border transition-all ${getStatusColor(status.state)}`}>
              {status.state}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Автономный робот-испытатель Sema Soul. Он циклически проверяет состояние бэкенда, кошельков, коннекторов Telegram MTProto и GetGems API без привлечения человека.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={handleTriggerTest}
            disabled={loading || status.state === "running"}
            className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-mono font-bold text-xs uppercase rounded-xl border border-fuchsia-500/30 hover:border-fuchsia-400/40 shadow-xl disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {status.state === "running" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Запустить тест-сессию</span>
          </button>

          <button
            onClick={handleClearLogs}
            title="Очистить системный лог"
            className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* METRICS & VERIFIED TARGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            name: "TON Account Status", 
            icon: Database, 
            val: status?.metrics?.lastCheckedWallet || "Never",
            color: (status?.metrics?.lastCheckedWallet || "").includes("Active") ? "text-emerald-400" : "text-amber-400"
          },
          { 
            name: "Tonapi Connector", 
            icon: Network, 
            val: status?.metrics?.lastCheckedTonapi || "Never",
            color: (status?.metrics?.lastCheckedTonapi || "").includes("Active") ? "text-emerald-400" : "text-rose-400"
          },
          { 
            name: "Telegram MTProto Status", 
            icon: Cpu, 
            val: status?.metrics?.lastCheckedMTProto || "Never",
            color: (status?.metrics?.lastCheckedMTProto || "").includes("CONNECTED") ? "text-emerald-400" : "text-amber-400"
          },
          { 
            name: "GetGems Marketplace API", 
            icon: ShieldCheck, 
            val: status?.metrics?.lastCheckedGetgems || "Never",
            color: (status?.metrics?.lastCheckedGetgems || "").includes("Active") ? "text-emerald-400" : "text-amber-400"
          }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-fuchsia-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider leading-none">{item.name}</div>
                <div className={`text-xs font-mono font-bold mt-1.5 truncate ${item.color}`}>{item.val}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN TEST ENGINE SHELL / TERMINAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step-by-Step Dashboard (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Текущая задача & Тайминги
            </h3>
            
            <div className="bg-black/30 border border-slate-850 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-500">Текущая задача:</span>
                <span className="text-fuchsia-400 font-bold max-w-[180px] text-right truncate">{status?.currentStep || "None"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-500">Последний проход:</span>
                <span className="text-slate-300 font-bold">{status?.metrics?.lastCheckedAt || "Never"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Постоянный мониторинг:</span>
                <button 
                  onClick={() => setPolling(!polling)} 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${polling ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700/50"}`}
                >
                  {polling ? "АКТИВЕН" : "ПАУЗА"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl space-y-2">
            <h4 className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Протокол "Бесконечного контекста"</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              QA Агент собирает сквозную семантическую трассировку всех операций, преобразует их в векторные отпечатки памяти и сливает в ядро "Летописца". Это исключает фальшивые симуляции и гарантирует работу с живыми API.
            </p>
          </div>
        </div>

        {/* Live Logs Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-black/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[520px] shadow-2xl">
          <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-300">SYSTEM QA DIAGNOSTIC STREAM</span>
            </div>
            {status.state === "running" && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[9px] font-mono text-cyan-400 font-bold">STRAMING...</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 font-mono text-[11px] custom-scrollbar bg-black/40">
            {status.logs.length === 0 ? (
              <div className="text-slate-600 italic flex items-center justify-center h-full flex-col gap-2">
                <Terminal className="w-8 h-8 text-slate-800" />
                <span>Диагностический лог пуст. Запустите сессию для проверки систем.</span>
              </div>
            ) : (
              status.logs.map((log, i) => (
                <div key={i} className="flex gap-2 hover:bg-slate-900/40 px-2 py-1 rounded transition-colors duration-150 leading-snug">
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp.substring(11, 19)}]</span>
                  <span className={`break-words ${
                    log.level === 'success' ? 'text-emerald-400' :
                    log.level === 'warn' ? 'text-amber-400' :
                    log.level === 'error' ? 'text-rose-400 font-bold' :
                    'text-slate-300'
                  }`}>
                    {log.level === 'success' ? '✓ ' : log.level === 'warn' ? '⚠️ ' : log.level === 'error' ? '✖ ' : '• '}
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
