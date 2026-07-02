import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Clock, Filter, ArrowUpDown, ExternalLink, 
  Layers, Zap, Shield, Cpu, Activity, Info, Wifi
} from 'lucide-react';
import { useMarketHub } from '../../hooks/useMarketHub';
import { NormalizedOrder } from '../../types/market';

/**
 * ConsolidatedOrderBook - Визуальный компонент для отображения агрегированного стакана ордеров.
 * Использует данные из MarketHub и отображает их в виде интерактивной таблицы (Data Grid).
 */
export const ConsolidatedOrderBook: React.FC = () => {
  const { items, lastUpdate, activeSources, globalFloor } = useMarketHub();

  // Разворачиваем Map в плоский список всех ордеров с дедупликацией по id
  const allOrders = useMemo(() => {
    const list: NormalizedOrder[] = [];
    const seenIds = new Set<string>();
    items.forEach((orders) => {
      orders.forEach((order) => {
        if (order && order.id && !seenIds.has(order.id)) {
          seenIds.add(order.id);
          list.push(order);
        }
      });
    });
    // Сортируем по времени (новые сверху) и ограничиваем для производительности
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 40);
  }, [items]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* HEADER */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              Consolidated Hub <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">LIVE</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Aggregating {activeSources.length} sources • Global Floor: {(globalFloor || 0).toFixed(2)} TON</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {activeSources.map(source => (
              <div 
                key={source}
                title={source}
                className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase"
              >
                {source.substring(0, 2)}
              </div>
            ))}
          </div>
          <div className="h-6 w-[1px] bg-slate-800 mx-2" />
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <Clock size={12} className="text-blue-400" />
            {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-[600px]">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
            <tr className="border-b border-slate-800">
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</th>
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Type</th>
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Price</th>
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Age</th>
              <th className="px-4 sm:px-5 py-4 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <AnimatePresence initial={false}>
              {allOrders.map((order) => (
                <motion.tr 
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="hover:bg-slate-900/30 transition-colors group"
                >
                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                    <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border ${getSourceStyles(order.source)}`}>
                      {order.source}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex flex-col gap-0.5 max-w-[100px] sm:max-w-none">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                        {order.metadata?.itemName || "Unknown Gift"}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono truncate">
                        {order.metadata?.serial || "No Serial"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 hidden sm:table-cell">
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 ${order.type === 'ASK' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {order.type === 'ASK' ? <ArrowUpDown size={10} className="rotate-180" /> : <ArrowUpDown size={10} />}
                      {order.type}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[12px] sm:text-sm font-black text-white font-mono">
                        {(order.price || 0).toFixed(2)} <span className="text-slate-500 text-[9px] sm:text-[10px]">{order.currency}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                      {formatTimeAgo(order.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {order.metadata?.isBotOrder && (
                        <div title="Bot Order" className="w-5 h-5 rounded bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/20">
                          <Cpu size={12} />
                        </div>
                      )}
                      {order.metadata?.isStar && (
                        <div title="Star Gift" className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                          <Zap size={12} />
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {allOrders.length === 0 && (
              <tr key="empty-orderbook">
                <td colSpan={6} className="px-5 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Activity size={48} className="animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Waiting for market signals...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gateway: Stable</span>
           </div>
           <div className="flex items-center gap-1.5">
              <Wifi size={12} className="text-blue-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Latency: 42ms</span>
           </div>
        </div>
        <button 
          onClick={() => window.open('https://tonapi.io', '_blank')}
          className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors tracking-widest group"
        >
          Network Explorer <ExternalLink size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// HELPER FUNCTIONS
function getSourceStyles(source: string): string {
  switch (source) {
    case 'Fragment': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'MRKT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Tonapi': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'Tonnel': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    case 'GetGems': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
