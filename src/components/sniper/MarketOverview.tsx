import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Line
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  Clock, Flame, HelpCircle, RefreshCw, BarChart2, Zap,
  Layers, Eye, Percent, Shield
} from "lucide-react";

import { INITIAL_TRENDS, GiftTrend } from "../../lib/trading/MarketTrends";

export const MarketOverview: React.FC = () => {
  const [trends, setTrends] = useState<GiftTrend[]>(INITIAL_TRENDS);
  const [selectedGiftId, setSelectedGiftId] = useState<string>("durov_puzzle");
  const [isRealTime, setIsRealTime] = useState<boolean>(true);
  const [flashTick, setFlashTick] = useState<boolean>(false);
  const [lastTickPrice, setLastTickPrice] = useState<number | null>(null);
  const [lastTickDiff, setLastTickDiff] = useState<number>(0);
  
  // Custom interactive trading terminal states
  const [activeStatsTab, setActiveStatsTab] = useState<"overview" | "orderbook">("overview");
  const [showBidLine, setShowBidLine] = useState<boolean>(true);
  const [showAskLine, setShowAskLine] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentGift = trends.find(t => t.id === selectedGiftId);

  if (!currentGift) {
    return (
      <div className="bg-slate-900/40 p-10 rounded-2xl border border-slate-800 text-center space-y-4">
        <Activity className="text-slate-600 mx-auto animate-pulse" size={48} />
        <div className="text-slate-400 font-mono text-sm">
          Ожидание рыночных данных из MarketHub...
        </div>
      </div>
    );
  }

  // Dynamic calculations for current gift based on dynamic data
  const currentPrice = currentGift.data.length > 0 ? currentGift.data[currentGift.data.length - 1].price : currentGift.basePrice;
  const highestPrice = currentGift.data.length > 0 ? Math.max(...currentGift.data.map(d => d.price)) : currentGift.basePrice;
  const lowestPrice = currentGift.data.length > 0 ? Math.min(...currentGift.data.map(d => d.price)) : currentGift.basePrice;
  const totalVolume = currentGift.data.reduce((sum, d) => sum + d.volume, 0);

  // Generate simulated dynamic Bid & Ask lines to represent Order book ceilings/floors
  const spreadPercent = currentGift.volatility / 3.5; // e.g. 2% to 5%
  const spreadTon = currentPrice * (spreadPercent / 100);

  const chartData = currentGift.data.map((d) => {
    const drift = currentGift.basePrice * (currentGift.volatility / 100) * 0.45;
    return {
      ...d,
      bid: parseFloat((d.price - drift).toFixed(2)),
      ask: parseFloat((d.price + drift).toFixed(2)),
    };
  });

  // Live depth table orderbook (Wait for real-time market sync)
  const bids: any[] = [];
  const asks: any[] = [];

  // Accumulate totals
  let bidAcc = 0;
  bids.forEach(b => { bidAcc += b.size; b.total = bidAcc; });
  let askAcc = 0;
  asks.forEach(a => { askAcc += a.size; a.total = askAcc; });

  const sentimentRatio = Math.round((bidAcc / (bidAcc + askAcc)) * 100);

  // Simulation disabled
  useEffect(() => {
    // Real-time updates should come from MarketHub subscription
  }, [isRealTime, selectedGiftId]);

  return (
    <div 
      id="market-overview-widget"
      ref={containerRef}
      className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-5 relative overflow-hidden"
    >
      {/* GLOWING AMBIENT ACCENT */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="text-cyan-400 animate-pulse" size={16} />
            Аналитика & Живой Тренд Цен
          </h3>
          <p className="text-[10px] text-slate-500">
            Real-time котировки, динамика цен и объемы торгов лимитированных Telegram Gifts
          </p>
        </div>

        {/* Real-time Indicator Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
              isRealTime 
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isRealTime ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
            {isRealTime ? "Live Stream: Active" : "Stream: Paused"}
          </button>

          <button
            onClick={() => {
              // Trigger quick manual soft reset of initial trends data
              setTrends(INITIAL_TRENDS);
              setLastTickPrice(null);
            }}
            title="Сбросить тренд"
            className="p-1.5 bg-slate-950/40 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* HORIZONTAL GIFT TABS SELECTOR */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none snap-x relative z-10">
        {trends.map((gift) => {
          const isSelected = gift.id === selectedGiftId;
          const isUp = gift.change24h >= 0;
          return (
            <button
              key={gift.id}
              onClick={() => {
                setSelectedGiftId(gift.id);
                setLastTickPrice(null);
              }}
              className={`snap-center flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                isSelected 
                  ? "bg-cyan-950/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.08)]" 
                  : "bg-slate-950/25 border-slate-850/60 hover:bg-slate-900/30 hover:border-slate-700"
              }`}
            >
              <span className="text-xl filter drop-shadow-md">{gift.emoji}</span>
              <div>
                <div className="text-[10px] font-bold text-slate-200">{gift.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {gift.data[gift.data.length - 1].price.toFixed(1)} TON
                  </span>
                  <span className={`text-[8px] font-mono font-black flex items-center ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {isUp ? "+" : ""}{gift.change24h}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CORE GRAPH & STATS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        
        {/* STATS & ORDER BOOK TABBED SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 min-h-[360px]">
          
          {/* TAB SWITCHER */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-850">
            <button 
              type="button"
              onClick={() => setActiveStatsTab("overview")}
              className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeStatsTab === "overview" 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 size={11} />
              Аналитика
            </button>
            <button 
              type="button"
              onClick={() => setActiveStatsTab("orderbook")}
              className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeStatsTab === "orderbook" 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={11} />
              Стакан Ордеров
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeStatsTab === "overview" ? (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-3 flex-1 justify-between"
              >
                {/* Main price readout */}
                <div className="bg-black/30 border border-slate-850 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="text-[8px] font-mono text-slate-500 uppercase font-black tracking-wider">Текущая цена лота</div>
                  
                  <div className="my-2.5 flex items-baseline gap-2 relative">
                    <AnimatePresence mode="popLayout">
                      <motion.span 
                        key={currentPrice}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className={`text-3xl font-black text-white tracking-tight ${flashTick ? "text-cyan-300" : ""}`}
                      >
                        {currentPrice.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-xs text-slate-400 font-mono font-bold">TON</span>

                    {/* Dynamic live flash indicator */}
                    {flashTick && lastTickPrice && (
                      <span className={`text-[9px] font-mono font-bold absolute -right-2 top-0.5 px-1 py-0.5 rounded flex items-center gap-0.5 ${lastTickDiff >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                        {lastTickDiff >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                        {lastTickDiff >= 0 ? "+" : ""}{lastTickDiff.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black ${currentGift.change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {currentGift.change24h >= 0 ? "BULLISH" : "BEARISH"} {currentGift.change24h}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">24ч динамика</span>
                  </div>
                </div>

                {/* Quick stats mini-grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-black/30 border border-slate-850 rounded-xl p-2.5">
                    <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">24h Max</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-1 flex items-center gap-1">
                      <TrendingUp className="text-emerald-400 shrink-0" size={11} />
                      {highestPrice.toFixed(1)} TON
                    </div>
                  </div>

                  <div className="bg-black/30 border border-slate-850 rounded-xl p-2.5">
                    <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">24h Min</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-1 flex items-center gap-1">
                      <TrendingDown className="text-rose-400 shrink-0" size={11} />
                      {lowestPrice.toFixed(1)} TON
                    </div>
                  </div>

                  <div className="bg-black/30 border border-slate-850 rounded-xl p-2.5">
                    <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">24h Объём</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                      {totalVolume.toLocaleString("en-US")}
                    </div>
                  </div>

                  <div className="bg-black/30 border border-slate-850 rounded-xl p-2.5">
                    <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Ср. Цена</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                      {((highestPrice + lowestPrice) / 2).toFixed(1)} TON
                    </div>
                  </div>
                </div>

                {/* Description banner */}
                <div className="bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl text-[9px] text-slate-400 leading-normal flex-1 flex flex-col justify-center">
                  <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Zap className="text-cyan-400" size={10} />
                    Рыночный инсайт:
                  </div>
                  <p>{currentGift.description}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="orderbook"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-2 flex-1 justify-between text-xs font-mono"
              >
                {/* Sentiment Gauge */}
                <div className="bg-black/40 border border-slate-850 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[8px] text-slate-500 uppercase font-black">
                    <span>Сила стакана (Sentiment)</span>
                    <span className="text-emerald-400 font-bold">{sentimentRatio}% Bids</span>
                  </div>
                  <div className="w-full h-1.5 bg-rose-500/40 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${sentimentRatio}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-400">
                    <span>Покупатели (Bids)</span>
                    <span>Продавцы (Asks)</span>
                  </div>
                </div>

                {/* Simulated Orderbook Ladder */}
                <div className="bg-black/30 border border-slate-850 rounded-xl p-2.5 flex-1 flex flex-col justify-between overflow-hidden">
                  
                  {/* ASKS (Sellers) - Rendered High to Low */}
                  <div className="space-y-1">
                    <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">Ордера на продажу (Asks)</div>
                    {[...asks].reverse().map((ask, idx) => {
                      const percentage = Math.min(100, (ask.size / 500) * 100);
                      return (
                        <div key={idx} className="relative flex justify-between items-center py-0.5 px-1.5 text-[10px] overflow-hidden rounded">
                          <div className="absolute right-0 top-0 bottom-0 bg-rose-500/10 transition-all" style={{ width: `${percentage}%` }} />
                          <span className="text-rose-400 font-bold relative z-10">{ask.price.toFixed(2)}</span>
                          <span className="text-slate-300 relative z-10">{ask.size} шт.</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SPREAD BAR */}
                  <div className="py-1 border-y border-slate-800/80 my-1 flex justify-between items-center px-1 text-[9px] bg-slate-950/60 rounded">
                    <div className="flex items-center gap-1">
                      <Percent size={9} className="text-cyan-400" />
                      <span className="text-slate-400">Спред:</span>
                      <span className="text-cyan-400 font-bold">{(asks[0].price - bids[0].price).toFixed(2)} TON</span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold">({(((asks[0].price - bids[0].price)/asks[0].price)*100).toFixed(1)}%)</span>
                  </div>

                  {/* BIDS (Buyers) - Rendered High to Low */}
                  <div className="space-y-1">
                    {bids.map((bid, idx) => {
                      const percentage = Math.min(100, (bid.size / 500) * 100);
                      return (
                        <div key={idx} className="relative flex justify-between items-center py-0.5 px-1.5 text-[10px] overflow-hidden rounded">
                          <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 transition-all" style={{ width: `${percentage}%` }} />
                          <span className="text-emerald-400 font-bold relative z-10">{bid.price.toFixed(2)}</span>
                          <span className="text-slate-300 relative z-10">{bid.size} шт.</span>
                        </div>
                      );
                    })}
                    <div className="text-[8px] text-slate-500 uppercase font-bold mt-1 text-right">Ордера на покупку (Bids)</div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* RECHARTS PLOT CONTAINER (8 cols) */}
        <div className="lg:col-span-8 bg-black/25 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5 text-[9px] font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Clock size={11} /> 
                Динамика за 24 часа с границами ликвидности
              </span>
              <span className="text-cyan-400 font-bold">Пара: {currentGift.emoji} / TON</span>
            </div>

            {/* Safe dimensions & responsive container wrapping ComposedChart */}
            <div className="h-56 w-full select-none">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cyanPriceGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.20}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#1e293b" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="time" 
                    stroke="#475569" 
                    fontSize={8}
                    fontFamily="monospace"
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={8}
                    fontFamily="monospace"
                    tickLine={false}
                    domain={['auto', 'auto']}
                    dx={-4}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b', 
                      borderRadius: '12px',
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      color: '#e2e8f0'
                    }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    name="Цена Spot (TON)"
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#cyanPriceGlow)" 
                    activeDot={{ r: 4, stroke: '#06b6d4', strokeWidth: 1 }}
                  />
                  {showBidLine && (
                    <Line 
                      type="monotone" 
                      dataKey="bid" 
                      name="Дно Покупки (Bid Floor)" 
                      stroke="#10b981" 
                      strokeWidth={1.2} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={false}
                    />
                  )}
                  {showAskLine && (
                    <Line 
                      type="monotone" 
                      dataKey="ask" 
                      name="Потолок Продажи (Ask Ceiling)" 
                      stroke="#f43f5e" 
                      strokeWidth={1.2} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DYNAMIC CHART CONTROL TOOLBAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 pt-3 border-t border-slate-900/60 text-[8px] font-mono text-slate-500 gap-2">
            
            {/* Interactive check line toggles */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 select-none">
                <input 
                  type="checkbox" 
                  checked={showBidLine} 
                  onChange={(e) => setShowBidLine(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 w-3 h-3 accent-emerald-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Дно покупки (Bids)
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 select-none">
                <input 
                  type="checkbox" 
                  checked={showAskLine} 
                  onChange={(e) => setShowAskLine(e.target.checked)}
                  className="rounded border-slate-800 text-rose-500 focus:ring-rose-500/20 bg-slate-950 w-3 h-3 accent-rose-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Потолок продажи (Asks)
                </span>
              </label>
            </div>

            {/* Price Vector calculation display */}
            <div className="flex items-center gap-2">
              <span className="text-[9px]">
                Вектор движения:{" "}
                <span className={`font-bold uppercase ${currentGift.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {currentGift.change24h >= 0 ? "↗ ВВЕРХ" : "↘ ВНИЗ"} ({currentGift.change24h}% / 24ч)
                </span>
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <Shield size={11} className="text-cyan-400" />
                Ожидания: {sentimentRatio >= 50 ? "BULLISH" : "BEARISH"}
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
