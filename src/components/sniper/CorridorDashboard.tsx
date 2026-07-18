import React, { useMemo } from 'react';
import { useMarketHub } from '../../hooks/useMarketHub';
import { Activity, Zap, TrendingUp, Shield } from 'lucide-react';
import { motion } from "motion/react";

export const CorridorDashboard: React.FC = () => {
  const { globalFloor } = useMarketHub();
  
  // Calculate corridors for a sample item or average
  const corridorData = useMemo(() => {
    // For demo, we'll take the first item's prices or global floor
    const baseline = globalFloor > 0 ? globalFloor : 15.2;
    
    // 4-line corridor concept:
    // Green: Bottom floor (Limit buy) - 0.9x
    // Blue: Instant buy floor - 1.0x
    // Yellow: Instant sell ceiling - 1.2x
    // Red: Premium sell (Attribute based) - 1.5x
    
    const green = baseline * 0.9;
    const blue = baseline;
    const yellow = baseline * 1.2;
    const red = baseline * 1.5;
    
    return { green, blue, yellow, red, baseline };
  }, [globalFloor]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Activity className="text-fuchsia-400" size={16} /> 4-Line Strategy Corridor
          </h3>
          <p className="text-[10px] text-slate-400">Real-time valuation bounds based on market liquidity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
             <span className="text-[9px] text-slate-400 font-mono">Buy Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-rose-500" />
             <span className="text-[9px] text-slate-400 font-mono">Sell Zone</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 p-3 rounded-xl border border-emerald-500/10">
          <span className="text-[8px] text-emerald-500/70 uppercase font-black tracking-widest block">Green (Limit Buy)</span>
          <div className="text-lg font-black text-emerald-400 font-mono">{corridorData.green.toFixed(2)} <span className="text-[10px]">TON</span></div>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-xl border border-cyan-500/10">
          <span className="text-[8px] text-cyan-500/70 uppercase font-black tracking-widest block">Blue (Instant Buy)</span>
          <div className="text-lg font-black text-cyan-400 font-mono">{corridorData.blue.toFixed(2)} <span className="text-[10px]">TON</span></div>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-xl border border-amber-500/10">
          <span className="text-[8px] text-amber-500/70 uppercase font-black tracking-widest block">Yellow (Instant Sell)</span>
          <div className="text-lg font-black text-amber-400 font-mono">{corridorData.yellow.toFixed(2)} <span className="text-[10px]">TON</span></div>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-xl border border-rose-500/10">
          <span className="text-[8px] text-rose-500/70 uppercase font-black tracking-widest block">Red (Premium Sell)</span>
          <div className="text-lg font-black text-rose-400 font-mono">{corridorData.red.toFixed(2)} <span className="text-[10px]">TON</span></div>
        </div>
      </div>

      <div className="h-[180px] w-full bg-slate-950/20 rounded-xl p-4 border border-slate-800/40 relative overflow-hidden">
         <div className="absolute inset-0 flex flex-col justify-between py-4 px-8 opacity-20 pointer-events-none">
            <div className="w-full h-px bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <div className="w-full h-px bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div className="w-full h-px bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <div className="w-full h-px bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
         </div>
         
         <div className="flex flex-col h-full justify-between relative z-10">
            <div className="flex justify-between items-center group">
                <span className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                   <TrendingUp size={12} /> Exit Strategy (Red)
                </span>
                <span className="text-[10px] text-rose-400 font-mono bg-rose-400/10 px-2 py-0.5 rounded border border-rose-500/20">
                   {corridorData.red.toFixed(2)}
                </span>
            </div>
            <div className="flex justify-between items-center group">
                <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                   <Zap size={12} /> Liquidity Target (Yellow)
                </span>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">
                   {corridorData.yellow.toFixed(2)}
                </span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/50 shadow-xl group">
                <span className="text-[10px] text-white font-black uppercase flex items-center gap-2">
                   <Activity size={12} className="text-cyan-400 animate-pulse" /> Current Floor (Blue)
                </span>
                <span className="text-[10px] text-white font-mono bg-white/10 px-2 py-0.5 rounded">
                   {corridorData.blue.toFixed(2)}
                </span>
            </div>
            <div className="flex justify-between items-center group">
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                   <Shield size={12} /> Snipe Zone (Green)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">
                   {corridorData.green.toFixed(2)}
                </span>
            </div>
         </div>
      </div>
      
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-4">
           <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Zap size={14} className="text-amber-400" />
           </div>
           <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Active Strategy Insight</span>
              <p className="text-[10px] text-slate-500 leading-tight">
                Recommended entry below <span className="text-emerald-400 font-mono">{corridorData.green.toFixed(2)}</span>. 
                Scalping potential triggered at <span className="text-amber-400 font-mono">{corridorData.yellow.toFixed(2)}</span>+.
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
