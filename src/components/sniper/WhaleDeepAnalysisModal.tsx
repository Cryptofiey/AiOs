import React, { useState, useMemo } from "react";
import { 
  X, Search, Filter, ArrowUpDown, Calendar, TrendingUp, DollarSign, 
  Clock, Zap, CheckCircle, HelpCircle, ExternalLink, Activity, PieChart, Info, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { WhaleWallet } from "../../types";
import { WhaleTradePair, getDeepWhaleHistory } from "../desktop/ScreenTgGiftsSniper";

interface WhaleDeepAnalysisModalProps {
  whale: WhaleWallet;
  onClose: () => void;
}

export function WhaleDeepAnalysisModal({ whale, onClose }: WhaleDeepAnalysisModalProps) {
  // Load deep transaction history
  const history = useMemo(() => getDeepWhaleHistory(whale.address), [whale.address]);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPnLFilter, setSelectedPnLFilter] = useState<string>("All"); // "All" | "Profitable" | "Loss"
  const [selectedPeriod, setSelectedPeriod] = useState<number>(90); // 7 | 30 | 90 (days)
  const [sortBy, setSortBy] = useState<string>("date-desc"); // "date-desc" | "date-asc" | "pnl-desc" | "pnl-asc" | "price-desc" | "price-asc"

  // Filter items
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // 1. Text search
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) || 
                            item.serial.toLowerCase().includes(search.toLowerCase());
      
      // 2. Category match
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

      // 3. PnL match
      const matchesPnL = selectedPnLFilter === "All" || 
                         (selectedPnLFilter === "Profitable" && item.pnl >= 0) || 
                         (selectedPnLFilter === "Loss" && item.pnl < 0);

      // 4. Period match (simulate by filtering index or daysHeld range)
      let matchesPeriod = true;
      if (selectedPeriod === 7) {
        matchesPeriod = item.date.includes("2026-06-25") || item.date.includes("2026-06-24");
      } else if (selectedPeriod === 30) {
        matchesPeriod = item.date.includes("2026-06");
      }

      return matchesSearch && matchesCategory && matchesPnL && matchesPeriod;
    });
  }, [history, search, selectedCategory, selectedPnLFilter, selectedPeriod]);

  // Sort items
  const sortedHistory = useMemo(() => {
    const list = [...filteredHistory];
    list.sort((a, b) => {
      if (sortBy === "date-desc") {
        return b.date.localeCompare(a.date);
      } else if (sortBy === "date-asc") {
        return a.date.localeCompare(b.date);
      } else if (sortBy === "pnl-desc") {
        return b.pnl - a.pnl;
      } else if (sortBy === "pnl-asc") {
        return a.pnl - b.pnl;
      } else if (sortBy === "price-desc") {
        return b.buyPrice - a.buyPrice;
      } else if (sortBy === "price-asc") {
        return a.buyPrice - b.buyPrice;
      }
      return 0;
    });
    return list;
  }, [filteredHistory, sortBy]);

  // Calculate stats based on filtered list
  const stats = useMemo(() => {
    const totalCount = filteredHistory.length;
    const profitableCount = filteredHistory.filter(h => h.pnl >= 0).length;
    const winRate = totalCount > 0 ? Math.round((profitableCount / totalCount) * 100) : 0;
    const totalPnL = filteredHistory.reduce((sum, h) => sum + h.pnl, 0);
    const averageHoldDays = totalCount > 0 ? parseFloat((filteredHistory.reduce((sum, h) => sum + h.daysHeld, 0) / totalCount).toFixed(1)) : 0;
    const maxProfit = totalCount > 0 ? Math.max(...filteredHistory.map(h => h.pnl)) : 0;

    return {
      totalCount,
      profitableCount,
      winRate,
      totalPnL,
      averageHoldDays,
      maxProfit,
      // Advanced Metrics
      categoryDist: {
        Gifts: filteredHistory.filter(h => h.category === "Gifts").length,
        Numbers: filteredHistory.filter(h => h.category === "Numbers").length,
        Domains: filteredHistory.filter(h => h.category === "Domains").length,
        Skins: filteredHistory.filter(h => h.category === "Skins").length,
      }
    };
  }, [filteredHistory]);

  const activityHeatmap = useMemo(() => {
    // Simulated activity by hour (24 values)
    return [2, 0, 0, 1, 0, 0, 5, 8, 12, 15, 8, 4, 6, 10, 14, 18, 22, 15, 10, 8, 6, 4, 3, 2];
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-sans font-black text-white uppercase tracking-tight">
                Глубокий Анализ Действий: <span className="text-fuchsia-400">{whale.label}</span>
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 bg-fuchsia-500/15 text-fuchsia-400 rounded border border-fuchsia-500/20 font-bold uppercase">
                {whale.status}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5 mt-0.5 select-all">
              {whale.address}
              <a 
                href={`https://tonviewer.com/${whale.address}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-fuchsia-500/70 hover:text-fuchsia-400 transition-all"
                title="Открыть в Tonviewer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          
          {/* Intelligence Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2 bg-gradient-to-br from-fuchsia-950/20 to-slate-900 border border-fuchsia-500/20 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Activity size={80} />
                </div>
                <div className="relative z-10 space-y-3">
                   <div className="flex items-center gap-2 text-fuchsia-400 font-black uppercase text-[10px] tracking-[0.2em]">
                      <Zap size={14} className="animate-pulse" /> Neural Intelligence Insight
                   </div>
                   <h3 className="text-white font-bold text-sm leading-tight">
                      {whale.txCount && whale.txCount > 1000 ? (
                        <>
                          {whale.label} работает в режиме <span className="text-cyan-400">«Высокочастотного Скальпинга»</span>. 
                          Основной профит идет с оборота дешевых активов.
                        </>
                      ) : (
                        <>
                          {whale.label} демонстрирует паттерн <span className="text-fuchsia-400">«Агрессивного Накопления»</span>. 
                          За последние 30 дней ликвидность перетекла из Gifts в Numbers.
                        </>
                      )}
                   </h3>
                   <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                      {whale.txCount && whale.txCount > 1000 ? (
                        "Этот бот зарабатывает на микро-спредах. Он выкупает лоты мгновенно при отклонении цены даже на 0.5 TON. Следование за ним требует минимального пинга и автоматического исполнения."
                      ) : (
                        "Этот кошелек часто использует фронтраннинг на Fragment. Рекомендуется установить газ-премиум не менее 0.15 TON при соревновании за лоты, отмеченные этим китом."
                      )}
                   </p>
                </div>
             </div>

             <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                      <PieChart size={12} /> Asset Mix
                   </span>
                   <span className="text-[10px] text-slate-600 font-mono">Real-time</span>
                </div>
                <div className="space-y-2.5">
                   {Object.entries(stats.categoryDist).filter(([_, count]) => count > 0).map(([cat, count]) => {
                      const percent = Math.round((count / stats.totalCount) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                           <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400">{cat}</span>
                              <span className="text-slate-200">{percent}%</span>
                           </div>
                           <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  cat === 'Gifts' ? 'bg-fuchsia-500' : 
                                  cat === 'Numbers' ? 'bg-cyan-500' : 
                                  cat === 'Domains' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${percent}%` }} 
                              />
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>

          {/* Activity Map & Alpha Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Activity Heatmap (24h Cycle)
                   </span>
                </div>
                <div className="flex items-end gap-1 h-16">
                   {activityHeatmap.map((val, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-all duration-500 ${val > 10 ? 'bg-fuchsia-500' : val > 5 ? 'bg-fuchsia-800' : 'bg-slate-800'}`} 
                        style={{ height: `${Math.max(15, (val / 22) * 100)}%` }}
                        title={`${i}:00 - ${val} transactions`}
                      />
                   ))}
                </div>
                <div className="flex justify-between mt-2 text-[8px] font-mono text-slate-600 uppercase">
                   <span>00:00</span>
                   <span>12:00</span>
                   <span>23:59</span>
                </div>
             </div>

             <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex gap-4">
                <div className="flex-1 flex flex-col justify-center items-center border-r border-slate-800/50">
                   <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Alpha Score</div>
                   <div className="text-3xl font-mono font-black text-white">{(whale.riskScore || 75) / 10}<span className="text-fuchsia-500">.2</span></div>
                   <div className="text-[9px] text-emerald-400 font-bold mt-1 uppercase">Top 1% Trader</div>
                </div>
                <div className="flex-1 space-y-3 py-1">
                   <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Rarity Hunter</span>
                      <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[92%]" />
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Speed Index</span>
                      <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                         <div className="h-full bg-cyan-500 w-[78%]" />
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Risk Management</span>
                      <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                         <div className="h-full bg-amber-500 w-[85%]" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Общий доход (PnL)
              </div>
              <div className={`text-xl font-mono font-black ${stats.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stats.totalPnL >= 0 ? `+${stats.totalPnL.toLocaleString()}` : stats.totalPnL.toLocaleString()} <span className="text-xs font-sans text-slate-400">TON</span>
              </div>
              <div className="text-[8px] text-slate-500">За выбранный период</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-fuchsia-400" /> Процент успеха (Win Rate)
              </div>
              <div className="text-xl font-mono font-black text-fuchsia-400">
                {stats.winRate}%
              </div>
              <div className="text-[8px] text-slate-500">{stats.profitableCount} из {stats.totalCount} сделок в плюс</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Среднее удержание
              </div>
              <div className="text-xl font-mono font-black text-cyan-400">
                {stats.averageHoldDays} <span className="text-xs font-sans text-slate-400">дн.</span>
              </div>
              <div className="text-[8px] text-slate-500">Срок от покупки до перепродажи</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Макс. Профит (Сделка)
              </div>
              <div className="text-xl font-mono font-black text-amber-400">
                +{stats.maxProfit.toLocaleString()} <span className="text-xs font-sans text-slate-400">TON</span>
              </div>
              <div className="text-[8px] text-slate-500">Рекордный арбитраж</div>
            </div>
          </div>

          {/* Advanced Search & Filters Panel */}
          <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Поиск по названию или серии..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-fuchsia-500 text-slate-200"
                />
              </div>

              {/* PnL Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Сделки:</span>
                <select
                  value={selectedPnLFilter}
                  onChange={e => setSelectedPnLFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs outline-none text-slate-300 focus:border-fuchsia-500"
                >
                  <option value="All">Все сделки</option>
                  <option value="Profitable">Только прибыльные</option>
                  <option value="Loss">Только убыточные</option>
                </select>
              </div>

              {/* Period Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Период:</span>
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs outline-none text-slate-300 focus:border-fuchsia-500"
                >
                  <option value={7}>Последние 7 дней</option>
                  <option value={30}>Последние 30 дней</option>
                  <option value={90}>Последние 90 дней</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 mr-1">Тип актива:</span>
                {["All", "Gifts", "Numbers", "Domains", "Skins"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      selectedCategory === cat 
                        ? "bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/35" 
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {cat === "All" ? "Все" : cat}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 self-end">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-slate-400 outline-none cursor-pointer focus:text-white"
                >
                  <option value="date-desc">Сначала новые</option>
                  <option value="date-asc">Сначала старые</option>
                  <option value="pnl-desc">По убыванию прибыли</option>
                  <option value="pnl-asc">По возрастанию прибыли</option>
                  <option value="price-desc">Макс. цена покупки</option>
                  <option value="price-asc">Мин. цена покупки</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <span>Предмет / Тип</span>
              <div className="flex gap-16">
                <span>Арбитражный Цикл</span>
                <span className="w-16 text-right">Результат</span>
              </div>
            </div>

            {sortedHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono bg-slate-950/20 rounded-xl border border-slate-850/55">
                Сделки не найдены по выбранным фильтрам
              </div>
            ) : (
              sortedHistory.map((trade) => (
                <div 
                  key={trade.id} 
                  className="bg-slate-950/30 hover:bg-slate-950/60 border border-slate-850 rounded-xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans font-bold text-slate-200">{trade.itemName}</span>
                      <span className="text-[9px] font-mono text-slate-500">{trade.serial}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded font-semibold uppercase">
                        {trade.category}
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">{trade.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 md:gap-16">
                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-350 flex items-center gap-1.5">
                        <span className="text-slate-500">Купил:</span>
                        <span className="text-emerald-400 font-bold">{trade.buyPrice} TON</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex items-center justify-end gap-1">
                        <span>Удержание:</span>
                        <span className="text-cyan-400 font-bold">{trade.daysHeld} дн.</span>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-[10px] text-slate-350 flex items-center justify-end gap-1.5">
                        <span className="text-slate-500">Продал:</span>
                        <span className="text-fuchsia-400 font-bold">{trade.sellPrice} TON</span>
                      </div>
                      <div className={`text-xs font-black ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {trade.pnl >= 0 ? `+${trade.pnl}` : trade.pnl} TON
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Синхронизировано в реальном времени с блокчейном TON</span>
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-sans font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );
}
