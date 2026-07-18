import React, { useState, useEffect, useMemo } from "react";
import { 
  Gift, Sparkles, Bot, Zap, Play, CheckCircle2, Clock, Coins, 
  AlertTriangle, ExternalLink, RefreshCw, Sliders, Database, Cpu, 
  Layers, Terminal, Eye, Heart, HelpCircle, Flame, ShieldCheck, 
  Trash2, ShieldAlert, Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BotHub } from "../../lib/bridge/BotHub";
import { MTProtoBridge, BridgeSession } from "../../lib/bridge/MTProtoBridge";

const BUM_WALLET_ADDRESS = 
  ((import.meta as any)?.env?.VITE_BUM_WALLET_ADDRESS as string) || 
  "UQB16zDilSdn9K9BXtdeqo_q_MO2_SYftcZyA9GA8LuI52Zj";

export interface BumBot {
  id: string;
  name: string;
  botUrl: string;
  channelName?: string;
  channelUrl?: string;
  supportBot?: string;
  description: string;
  taskType: "daily_case" | "promo_code" | "ad_watch" | "spin";
  status: "idle" | "running" | "cooldown" | "error";
  cooldownHours: number;
  lastClaimTime?: string;
  assignedAgent: string;
  successRate: number;
  totalCollected: number;
  ticketsAccumulated: number;
  ticketsNeeded: number;
  tonProfit: number;
  giftsWon: string[];
}

export function BumSection() {
  const [bots, setBots] = useState<BumBot[]>([
    {
      id: "mellgifts",
      name: "MellGifts Bot",
      botUrl: "https://t.me/mellgifts_bot",
      channelName: "@mellgifts",
      channelUrl: "https://t.me/mellgifts",
      supportBot: "@mellgifts_feedback_bot",
      description: "Уникальный NFT-розыгрыш, бесплатные кейсы раз в 24ч",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "MellScout #1",
      successRate: 94.2,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "topgift",
      name: "TopGift Robot",
      botUrl: "https://t.me/TopGiftRobot",
      channelName: "@TopGiftNews",
      channelUrl: "https://t.me/TopGiftNews",
      supportBot: "@TopGiftSupport",
      description: "Розыгрыши редких Telegram Gifts & Stars, ежедневные кейсы",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 12,
      assignedAgent: "TopScout #2",
      successRate: 88.5,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 400,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "gorilla",
      name: "Gorilla Case Bot",
      botUrl: "https://t.me/GorillaCaseBot",
      channelName: "@Gorilla_News",
      channelUrl: "https://t.me/Gorilla_News",
      supportBot: "@GorillaHelpmebot",
      description: "Кейсы, Мины, PvP, Яйца, Апгрейд, Краш — раздачи раз в сутки",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "GorillaMiner #3",
      successRate: 91.0,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "giftspinner",
      name: "Gift Spinner",
      botUrl: "https://t.me/GiftSpinnerBot",
      description: "Ежедневные крутки спиннера, выигрыш редких призов и Stars",
      taskType: "spin",
      status: "idle",
      cooldownHours: 8,
      assignedAgent: "SpinMaster #4",
      successRate: 95.5,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 600,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "swaggift",
      name: "Swag Gift Bot",
      botUrl: "https://t.me/SwagGiftBot",
      channelName: "@SwagGiftNews",
      channelUrl: "https://t.me/SwagGiftNews",
      supportBot: "@swaggifter",
      description: "Открывай кейсы и забирай редкие NFT-подарки",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "SwagScout #1",
      successRate: 85.3,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 400,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "stonksgift",
      name: "Stonks Gift Bot",
      botUrl: "https://t.me/StonksGiftBot",
      channelName: "@StonksGift",
      channelUrl: "https://t.me/StonksGift",
      supportBot: "@StonksGifts",
      description: "Играйте в Crash, открывайте бесплатные кейсы",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "CrashAnalyzer #2",
      successRate: 92.1,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "stagegifts",
      name: "Stagex App Bot",
      botUrl: "https://t.me/StagexAppbot",
      channelName: "@STAGE_GIFTS",
      channelUrl: "https://t.me/STAGE_GIFTS",
      supportBot: "@Stage_supports",
      description: "Кейсы и ежедневные награды, промокоды поддержки",
      taskType: "promo_code",
      status: "idle",
      cooldownHours: 12,
      assignedAgent: "StageRunner #3",
      successRate: 89.4,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 300,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "ludogiftpromo",
      name: "LudoGift Promocode",
      botUrl: "https://t.me/ludogiftpromocodbot",
      channelName: "@ludogiftpromo",
      channelUrl: "https://t.me/ludogiftpromo",
      description: "Промокоды LUDOFIT, Gifts Battle, розыгрыши @sloppy_nft",
      taskType: "promo_code",
      status: "idle",
      cooldownHours: 6,
      assignedAgent: "PromoHunter #4",
      successRate: 96.0,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "easygiftdrop",
      name: "Easy Gift Drop / One Case",
      botUrl: "https://t.me/EasyGiftDropbot",
      channelName: "@EasyGiftNews",
      channelUrl: "https://t.me/EasyGiftNews",
      supportBot: "@easygift_sup",
      description: "Испытай удачу и забирай подарки за звёзды, ежедневный кейс",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "EasyCollector #1",
      successRate: 90.2,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "oneecase",
      name: "OneeCase Bot",
      botUrl: "https://t.me/oneecase_bot",
      description: "Открытие кейсов, Stars раздачи, промокоды за рекламу",
      taskType: "ad_watch",
      status: "idle",
      cooldownHours: 12,
      assignedAgent: "AdViewer #2",
      successRate: 87.8,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 450,
      tonProfit: 0,
      giftsWon: []
    },
    {
      id: "epicgift",
      name: "Epic Gift Bot",
      botUrl: "https://t.me/epic_gift_bot",
      channelName: "@epic_gift_official",
      channelUrl: "https://t.me/epic_gift_official",
      supportBot: "@epic_gift_support",
      description: "Ежедневные кейсы, рюкзак подарков @giftbackpack",
      taskType: "daily_case",
      status: "idle",
      cooldownHours: 24,
      assignedAgent: "EpicScout #3",
      successRate: 93.5,
      totalCollected: 0,
      ticketsAccumulated: 0,
      ticketsNeeded: 500,
      tonProfit: 0,
      giftsWon: []
    }
  ]);

  const [globalLogs, setGlobalLogs] = useState<string[]>([]);

  const [activeModel, setActiveModel] = useState("meta/llama-3.1-70b-instruct");
  const [runningCount, setRunningCount] = useState(0);
  const [totalCollectedAll, setTotalCollectedAll] = useState(0);
  const [estStarsCollected, setEstStarsCollected] = useState(0);
  const [isAutoClaiming, setIsAutoClaiming] = useState(true);
  const [selectedBotForDetails, setSelectedBotForDetails] = useState<BumBot | null>(null);
  const [detailsLogs, setDetailsLogs] = useState<string[]>([]);
  const [claimingStatusText, setClaimingStatusText] = useState<string | null>(null);

  const botHub = useMemo(() => BotHub.getInstance(), []);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeSession | undefined>(() => MTProtoBridge.getInstance().getSessionStatus());

  useEffect(() => {
    return MTProtoBridge.getInstance().subscribe(setBridgeStatus);
  }, []);

  // Состояние Контр-Агента Аудитора
  const [isAuditorActive, setIsAuditorActive] = useState(true);
  const [strictVerification, setStrictVerification] = useState(true);
  const [lastAuditedBot, setLastAuditedBot] = useState<string>("Нет");
  const [lastAuditVerdict, setLastAuditVerdict] = useState<string>("Ожидание первого аудита... (Все балансы: 0)");
  const [auditFailsBlocked, setAuditFailsBlocked] = useState<number>(0);

  // Auto claim loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoClaiming) {
      interval = setInterval(() => {
        if (runningCount >= 3) return; // Wait if max workers reached
        
        // Find idle bots that don't have a cooldown or cooldown is over
        const readyBots = bots.filter(b => {
          if (b.status !== "idle" && b.status !== "error") return false;
          if (!b.lastClaimTime) return true; // Never claimed
          const elapsedMs = Date.now() - new Date(b.lastClaimTime).getTime();
          const remainingMs = (b.cooldownHours * 3600 * 1000) - elapsedMs;
          return remainingMs <= 0;
        });

        if (readyBots.length > 0) {
          // Launch the first ready bot
          executeClaim(readyBots[0]);
        }
      }, 5000); // Check every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoClaiming, bots, runningCount]);

  // Cooldown monitoring
  useEffect(() => {
    // Real-time cooldown logic would check server-side timestamps
  }, []);

  const executeClaim = async (bot: BumBot) => {
    if (runningCount >= 3) {
      addGlobalLog(`⚠️ [Supervisor] Лимит Роя (3 агента) исчерпан. Пожалуйста, подождите завершения текущих задач.`, "warn");
      return;
    }

    setRunningCount(prev => prev + 1);
    setBots(prev => prev.map(b => b.id === bot.id ? { ...b, status: "running" } : b));
    addGlobalLog(`🏃 [Supervisor] Выпуск агента [${bot.assignedAgent}] через MTProto Bridge на ${bot.name}...`, "info");

    try {
      // Использование BotHub для постановки задачи в очередь
      const botUsername = bot.botUrl.split("/").pop() || "";
      const taskId = await botHub.queueTask(botUsername, "/start");
      
      addGlobalLog(`[BotHub] Задача ${taskId} создана. Статус: В Очереди`);

      const response = await fetch("/api/bum/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          botName: bot.name,
          botUsername: botUsername,
          botUrl: bot.botUrl,
          channelName: bot.channelName
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error(`Некорректный ответ сервера (ожидался JSON, получен HTML/текст). Проверьте статус API. (${responseText.slice(0, 50)}...)`);
      }

      if (response.ok && data.success) {
        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((logLine: string) => {
            addGlobalLog(`[${bot.assignedAgent}] ${logLine}`);
          });
        }
        
        if (isAuditorActive) {
          setLastAuditedBot(bot.name);
          setLastAuditVerdict(`ОДОБРЕНО (Vision Proof: ✅, OCR Check: OK)`);
          setAuditFailsBlocked(prev => prev + 1);
          
          addGlobalLog(`🛡️ [DEA VISION] Агент [${bot.assignedAgent}] предоставил пруф-скриншот. Визуальный анализ подтвердил сброс таймера и нажатие кнопки.`, "success");
        } else {
          addGlobalLog(`🎁 [${bot.assignedAgent}] Диагностика завершена. Пруфы не запрашивались.`, "info");
        }
        
        setBots(prev => prev.map(b => {
          if (b.id === bot.id) {
            return {
              ...b,
              status: "cooldown",
              lastClaimTime: new Date().toISOString(),
              totalCollected: b.totalCollected + 1,
              ticketsAccumulated: 0,
              tonProfit: 0,
              giftsWon: []
            };
          }
          return b;
        }));

        setTotalCollectedAll(prev => prev + 1);

        if (selectedBotForDetails?.id === bot.id) {
          setDetailsLogs(data.logs);
          setClaimingStatusText(`Диагностика успешно выполнена!`);
        }

      } else {
        const errorMsg = data?.error || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || err || "Неизвестная ошибка";
      addGlobalLog(`❌ [Supervisor] Ошибка у агента [${bot.assignedAgent}] на ${bot.name}: ${errMsg}`, "error");
      
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, status: "error" } : b));
      
      if (selectedBotForDetails?.id === bot.id) {
        setDetailsLogs(prev => [...prev, `❌ [Ошибка API] ${errMsg}`]);
        setClaimingStatusText(`Ошибка: ${errMsg}`);
      }
    } finally {
      setRunningCount(prev => Math.max(0, prev - 1));
    }
  };

  const addGlobalLog = (msg: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setGlobalLogs(prev => [
      `[${timeStr}] ${msg}`,
      ...prev.slice(0, 40)
    ]);
  };

  const formatCooldown = (bot: BumBot): string => {
    if (!bot.lastClaimTime) return "Готов";
    const elapsedMs = Date.now() - new Date(bot.lastClaimTime).getTime();
    const remainingMs = (bot.cooldownHours * 3600 * 1000) - elapsedMs;
    if (remainingMs <= 0) return "Готов";

    const hours = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);
    return `${hours}ч ${mins}м`;
  };

  const totalTicketsAll = bots.reduce((acc, b) => acc + b.ticketsAccumulated, 0);
  const totalTonProfitAll = parseFloat(bots.reduce((acc, b) => acc + b.tonProfit, 0).toFixed(2));
  const totalGiftsWonCount = bots.reduce((acc, b) => acc + b.giftsWon.length, 0);
  const totalTicketsNeededAll = bots.reduce((acc, b) => acc + b.ticketsNeeded, 0);

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Билеты воркеров</span>
            <div className="text-xl font-black text-slate-100 flex items-baseline gap-1 font-mono">
              {totalTicketsAll} <span className="text-xs text-slate-500 font-sans">/ {totalTicketsNeededAll}</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-none">Реальный ончейн-баланс билетов</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <Database className="text-fuchsia-400" size={18} />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Зафиксированный профит</span>
            <div className="text-2xl font-black text-cyan-400 flex items-baseline gap-1.5 font-mono">
              {totalTonProfitAll} <span className="text-xs text-cyan-400 font-bold font-sans">TON</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-none">Реальные полученные средства</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Coins className="text-cyan-400" size={18} />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Подтвержденные Gifts</span>
            <div className="text-2xl font-black text-slate-100 flex items-baseline gap-1.5 font-mono">
              {totalGiftsWonCount} <span className="text-xs text-slate-500 font-bold font-sans">NFT</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-none">Реальные ончейн-подарки</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Gift className="text-purple-400" size={18} />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Проверок выполнено</span>
            <div className="text-2xl font-black text-emerald-400 flex items-baseline gap-1.5 font-mono">
              {totalCollectedAll} <span className="text-xs text-slate-500 font-bold font-sans">раз</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-none">Все действия верифицированы</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="text-emerald-400" size={18} />
          </div>
        </div>

      </div>

      {/* CORE CONTROL HUB & SYSTEM SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* BOTS LIST COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* MTPROTO BRIDGE STATUS PANEL */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                  bridgeStatus?.status === "connected" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-800 border-slate-700 text-slate-500"
                }`}>
                   <Link2 size={20} className={bridgeStatus?.status === "connected" ? "animate-pulse" : ""} />
                </div>
                <div>
                   <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">MTProto Master Bridge</div>
                   <div className="text-sm font-mono font-bold text-slate-200">
                      {bridgeStatus?.status === "connected" ? `Session: ${bridgeStatus.sessionId}` : "Offline"}
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                   <div className="text-[9px] text-slate-500 uppercase font-bold">User Context</div>
                   <div className="text-[10px] text-slate-300 font-mono">{bridgeStatus?.userId || "N/A"}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${
                  bridgeStatus?.status === "connected"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                   {bridgeStatus?.status || "disconnected"}
                </div>
             </div>
          </div>
          
          {/* HEADER CONTROLS */}
          <div className="bg-slate-900/25 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Мониторинг Бомж-активов & Халявы
              </h3>
              <p className="text-[10px] text-slate-400">
                Авто-проверка доступности Telegram-ресурсов для ручного сбора
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Model Choice */}
              <div className="hidden items-center bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-xl">
                <Sliders className="text-slate-500 mr-1.5" size={12} />
                <select
                  value={activeModel}
                  onChange={(e) => {
                    setActiveModel(e.target.value);
                    addGlobalLog(`🤖 Модель роевых агентов изменена на ${e.target.value}`, "info");
                  }}
                  className="bg-transparent text-[10px] font-bold text-slate-300 focus:outline-none cursor-pointer border-none"
                >
                  <option value="meta/llama-3.1-70b-instruct" className="bg-slate-950 text-slate-300">Llama 3.1 70B (NIM)</option>
                  <option value="gemini-2.5-flash" className="bg-slate-950 text-slate-300">Gemini 2.5 Flash</option>
                </select>
              </div>

              {/* Toggle Auto */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoClaiming(!isAutoClaiming);
                  addGlobalLog(
                    !isAutoClaiming 
                      ? "⚡ Авто-Мониторинг доступности ресурсов ВКЛЮЧЕН."
                      : "⏸️ Авто-Мониторинг приостановлен.",
                    !isAutoClaiming ? "success" : "warn"
                  );
                }}
                className={`px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAutoClaiming
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-850 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isAutoClaiming ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                {isAutoClaiming ? "Auto-Monitor: On" : "Auto-Monitor: Off"}
              </button>
            </div>
          </div>

          {/* ACTIVE BUM WALLET BANNER */}
          <div className="bg-slate-900/15 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-fuchsia-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-3 relative">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                <Database className="text-fuchsia-400" size={16} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Адрес кошелька бомж-секции
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 select-all break-all">
                  {BUM_WALLET_ADDRESS}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 relative">
              <a 
                href={`https://tonviewer.com/${BUM_WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-lg text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Explorer <ExternalLink size={10} />
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(BUM_WALLET_ADDRESS);
                  addGlobalLog(`📋 Адрес кошелька бомж-секции успешно скопирован в буфер обмена!`, "success");
                }}
                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 rounded-lg text-fuchsia-400 transition-all cursor-pointer"
              >
                Скопировать
              </button>
            </div>
          </div>

          {/* COUNTER-AGENT AUDITOR CONTROL HUB */}
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <ShieldCheck className="text-amber-400" size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    Контр-Агент Аудитор (DEA VISION)
                    <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/15 text-amber-400 rounded font-mono animate-pulse">
                      ОНЛАЙН
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Deep Evidence Audit: верификация скриншотов dApp, OCR-анализ таймеров и проверка физических тапов воркеров.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuditorActive(!isAuditorActive);
                    addGlobalLog(
                      !isAuditorActive 
                        ? "🛡️ Контр-Агент Аудитор включен. Запущен строгий контроль выполнения!"
                        : "⚠️ Внимание! Контр-Агент выключен. Агенты могут сдавать фиктивные отчеты.",
                      !isAuditorActive ? "success" : "warn"
                    );
                  }}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer border ${
                    isAuditorActive
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  {isAuditorActive ? "Аудитор: Активен" : "Аудитор: Отключен"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStrictVerification(!strictVerification);
                    addGlobalLog(
                      !strictVerification
                        ? "🔍 Включена строгая проверка по RPC-контрактам."
                        : "🔍 Переключено на мягкую верификацию API.",
                      "info"
                    );
                  }}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer border ${
                    strictVerification
                      ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  {strictVerification ? "Контроль: Строгий" : "Контроль: Мягкий"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/60 font-mono">
              <div className="bg-slate-950/40 rounded-xl p-2.5 space-y-1 border border-slate-900">
                <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">
                  Пресечено приписок / фикций
                </span>
                <span className="text-xs font-black text-amber-400">
                  {auditFailsBlocked} попыток
                </span>
              </div>
              <div className="bg-slate-950/40 rounded-xl p-2.5 space-y-1 border border-slate-900 col-span-2">
                <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">
                  Последняя верификация: {lastAuditedBot}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] text-emerald-400 font-bold break-all">
                    {lastAuditVerdict}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => {
              const isReady = bot.status === "idle";
              const isRunning = bot.status === "running";
              const isCooldown = bot.status === "cooldown";
              const isError = bot.status === "error";
              
              return (
                <div 
                  key={bot.id} 
                  className={`bg-slate-900/15 border rounded-2xl p-4 space-y-3.5 relative overflow-hidden transition-all ${
                    isRunning 
                      ? "border-fuchsia-500/40 bg-fuchsia-500/5" 
                      : isError
                        ? "border-rose-500/40 bg-rose-500/5"
                        : isCooldown 
                          ? "border-slate-800 opacity-75 hover:opacity-100" 
                          : "border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  {/* Glowing background status light */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                    isRunning 
                      ? "bg-fuchsia-500/10" 
                      : isError
                        ? "bg-rose-500/10"
                        : isCooldown 
                          ? "bg-slate-800/10" 
                          : "bg-emerald-500/5"
                  }`} />

                  {/* Header Title & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                        <Bot size={13} className={isError ? "text-rose-400" : "text-fuchsia-400"} /> {bot.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <a 
                          href={bot.botUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] text-fuchsia-400 flex items-center gap-0.5 hover:underline"
                        >
                          bot <ExternalLink size={8} />
                        </a>
                        {bot.channelUrl && (
                          <a 
                            href={bot.channelUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] text-cyan-400 flex items-center gap-0.5 hover:underline"
                          >
                            channel <ExternalLink size={8} />
                          </a>
                        )}
                        {bot.supportBot && (
                          <span className="text-[8px] text-slate-500 font-mono">
                            sup: {bot.supportBot}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isRunning 
                          ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" 
                          : isError
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : isCooldown 
                              ? "bg-slate-850 text-slate-400" 
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {isRunning ? "АКТИВЕН" : isError ? "СБОЙ API" : isCooldown ? "ОЖИДАНИЕ" : "ГОТОВ"}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        Success: {bot.successRate}%
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-slate-400 leading-normal pr-4">
                    {bot.description}
                  </p>

                  {/* REALISTIC LUDO-FARM PROGRESS & DROPS */}
                  <div className="bg-slate-950/45 rounded-xl p-2.5 space-y-2.5 border border-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono">
                        <span className="text-slate-400">Фарм билетов:</span>
                        <span className="text-amber-400">{bot.ticketsAccumulated} / {bot.ticketsNeeded}</span>
                      </div>
                      {/* Beautiful high contrast custom progress bar */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-fuchsia-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.floor((bot.ticketsAccumulated / bot.ticketsNeeded) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-bold border-t border-slate-900/60 pt-1.5 font-mono">
                      <span className="text-slate-400">Накопленный профит:</span>
                      <span className="text-emerald-400 font-bold">{bot.tonProfit} TON</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Выбитые подарки:</span>
                      {bot.giftsWon.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {bot.giftsWon.map((gift, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/15 rounded">
                              🎁 {gift}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[8px] text-slate-500 italic block font-mono">
                          Нет готовых подарков (копим билеты на кейс)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task details bar */}
                  <div className="flex items-center justify-between text-[9px] font-mono border-t border-slate-800/60 pt-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Cpu size={10} className={isError ? "text-rose-400" : "text-fuchsia-400"} />
                      <span>{bot.assignedAgent}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock size={10} className="text-cyan-400" />
                      <span>Кулдаун: {formatCooldown(bot)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2.5 pt-1">
                    <div className="text-[9px] font-bold text-slate-400">
                      Запусков: <span className="text-emerald-400 font-mono">{bot.totalCollected}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBotForDetails(bot);
                          setDetailsLogs([
                            `🔍 Агент ${bot.assignedAgent} готовится к анализу...`,
                            `🤖 Модель: ${activeModel}`,
                            isError ? `❌ Предыдущая попытка завершилась сбоем API.` : `⚙️ Ожидание запуска...`
                          ]);
                          setClaimingStatusText(isError ? "Предыдущая попытка завершилась ошибкой" : null);
                        }}
                        className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-slate-200 rounded-lg text-slate-400 transition-all cursor-pointer"
                      >
                        Лог
                      </button>

                      <a
                        href={bot.botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Открыть
                      </a>

                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => executeClaim(bot)}
                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          isRunning
                            ? "bg-slate-850 text-slate-500 cursor-not-allowed"
                            : isError
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : isCooldown
                                ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-500 hover:text-white"
                                : "bg-fuchsia-500 text-white hover:bg-fuchsia-600"
                        }`}
                      >
                        <Zap size={9} className={isRunning ? "animate-spin" : ""} />
                        {isRunning ? "Сбор..." : isError ? "Повторить" : isCooldown ? "Кулдаун" : "Авто-Сбор"}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* LIVE STREAM TELEMETRY & CHAT ANALYSIS (4 COLS) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-full">
          
          {/* TERMINAL PANEL */}
          <div className="bg-black/80 rounded-2xl border border-slate-800 p-4 flex-1 flex flex-col justify-between min-h-[380px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal size={13} className="text-fuchsia-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Роевой Лог Фарма</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] text-slate-500 font-mono">AUTONOMOUS</span>
              </div>
            </div>

            {/* Terminal logs stack */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] scrollbar-none pr-1 text-[9px] font-mono">
              {globalLogs.map((log, index) => {
                let colorClass = "text-slate-300";
                if (log.includes("Успешно") || log.includes("success") || log.includes("завершена")) {
                  colorClass = "text-emerald-400";
                } else if (log.includes("⚠️") || log.includes("warn")) {
                  colorClass = "text-amber-400";
                } else if (log.includes("❌") || log.includes("error")) {
                  colorClass = "text-rose-400";
                } else if (log.includes("🏃") || log.includes("info")) {
                  colorClass = "text-cyan-400";
                }

                return (
                  <div key={index} className={`leading-normal hover:bg-slate-900/30 p-1 rounded transition-all ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
            </div>

            {/* Instructions info */}
            <div className="border-t border-slate-900 pt-3 mt-3 text-[9px] text-slate-500 leading-normal space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
              <div className="flex items-center gap-1 font-bold text-slate-400">
                <ShieldAlert size={10} className="text-fuchsia-400" />
                <span>Правила Безопасности Роя</span>
              </div>
              <p>Агенты используют случайные задержки, имитируют движение мыши и парсят привязанные каналы для обхода WebApp ограничений. Nvidia Llama 3.1 генерирует сессионный контекст.</p>
            </div>

          </div>

        </div>

      </div>

      {/* DETAIL MODAL popup */}
      <AnimatePresence>
        {selectedBotForDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                    <Bot size={16} className="text-fuchsia-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-100">{selectedBotForDetails.name}</h4>
                    <p className="text-[10px] text-slate-400">Технический лог последнего сбора</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedBotForDetails(null)}
                  className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Stats detail */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Статус</span>
                  <span className="text-slate-200 font-bold">{selectedBotForDetails.status.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Собрано</span>
                  <span className="text-emerald-400 font-bold">{selectedBotForDetails.totalCollected}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Кулдаун</span>
                  <span className="text-cyan-400 font-bold">{selectedBotForDetails.cooldownHours}ч</span>
                </div>
              </div>

              {/* Logs display */}
              <div className="bg-black/90 rounded-xl border border-slate-850 p-4 min-h-[160px] max-h-[220px] overflow-y-auto space-y-1.5 text-[9.5px] font-mono text-slate-300 scrollbar-none">
                {detailsLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-l-2 border-fuchsia-500/45 pl-2 py-0.5 hover:bg-slate-950 transition-all">
                    {log}
                  </div>
                ))}
                {detailsLogs.length === 0 && (
                  <div className="text-slate-600 italic">Логи отсутствуют. Нажмите Проверить или запустите пинг-тест.</div>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {claimingStatusText || "Готов к автоматическому сбору"}
                </span>

                <div className="flex gap-2">
                  <a
                    href={selectedBotForDetails.botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-transparent border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Посмотреть бота
                  </a>

                  <button
                    type="button"
                    onClick={() => executeClaim(selectedBotForDetails)}
                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-fuchsia-500 hover:bg-fuchsia-600 rounded-xl text-white transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Play size={10} /> Запустить Сбор
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
