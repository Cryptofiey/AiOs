import React, { useState, useEffect } from "react";
import { Check, X, Clock, Zap, ShieldAlert, ShoppingBag, Layers, ShieldCheck, Square, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TradingItem } from "../../types/trading";

export interface PendingTrade {
  id: string;
  item: TradingItem;
  targetPrice: number;
  marketFloor: number;
  source: string;
  confidence: number;
  timestamp: string;
}

interface ExecutionQueueProps {
  queue: PendingTrade[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onApproveAll: () => void;
  onDenyAll: () => void;
  onApproveBatch?: (ids: string[]) => void;
  onDenyBatch?: (ids: string[]) => void;
}

export const ExecutionQueue: React.FC<ExecutionQueueProps> = ({ 
  queue, onApprove, onDeny, onApproveAll, onDenyAll, onApproveBatch, onDenyBatch 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Automatically deselect items that leave the queue
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => queue.some(t => t.id === id)));
  }, [queue]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === queue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(queue.map(t => t.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (onApproveBatch) {
      onApproveBatch(selectedIds);
    } else {
      selectedIds.forEach(id => onApprove(id));
    }
    setSelectedIds([]);
  };

  const handleBulkDeny = () => {
    if (selectedIds.length === 0) return;
    if (onDenyBatch) {
      onDenyBatch(selectedIds);
    } else {
      selectedIds.forEach(id => onDeny(id));
    }
    setSelectedIds([]);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h3 className="font-bold text-slate-100">Execution Queue (MitM)</h3>
          <span className="px-2 py-0.5 bg-slate-700 rounded-full text-[10px] font-bold text-slate-300">
            {queue.length} PENDING
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {queue.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className="px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700/60 flex items-center gap-1.5"
            >
              {selectedIds.length === queue.length ? (
                <>Deselect All</>
              ) : (
                <>Select All ({queue.length})</>
              )}
            </button>
          )}
          <button 
            onClick={onDenyAll}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
          >
            Deny All
          </button>
          <button 
            onClick={onApproveAll}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
          >
            Approve All
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Displayed when 1 or more are selected) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-fuchsia-600/10 border-b border-fuchsia-500/20"
          >
            <div className="p-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <span className="text-xs font-bold text-fuchsia-300">
                  Batch Execution Mode: <span className="font-black text-white">{selectedIds.length} items selected</span>
                </span>
                <span className="hidden md:inline px-2 py-0.5 bg-fuchsia-500/20 text-[8px] font-mono rounded font-black text-fuchsia-400 uppercase tracking-wider">
                  ⚡ ONE-BATCH TRANSACTION
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDeny}
                  className="px-3 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-black uppercase rounded-lg border border-rose-500/35 transition-colors"
                >
                  Deny Selected
                </button>
                <button
                  onClick={handleBulkApprove}
                  className="px-3 py-1 bg-fuchsia-600 text-white hover:bg-fuchsia-500 text-[10px] font-black uppercase rounded-lg shadow-lg shadow-fuchsia-600/20 transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck size={12} />
                  Approve Batch Transaction
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Body */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence initial={false}>
          {queue.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Clock className="w-8 h-8 opacity-20" />
              <p className="text-sm">Queue is empty. Sniper is idle.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {queue.map((trade) => {
                const isSelected = selectedIds.includes(trade.id);
                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 transition-all duration-250 group flex items-center gap-3 ${
                      isSelected ? "bg-fuchsia-950/20 border-l-2 border-fuchsia-500 pl-3" : "hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Checkbox selector */}
                    <button 
                      onClick={() => toggleSelect(trade.id)}
                      className="text-slate-500 hover:text-fuchsia-400 transition-colors p-1"
                      title={isSelected ? "Deselect" : "Select for batch"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-fuchsia-500 fill-fuchsia-500/10" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-700" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
                          {trade.item.image ? (
                             <img 
                               src={trade.item.image} 
                               alt="" 
                               referrerPolicy="no-referrer" 
                               className="w-full h-full object-cover" 
                               onError={(e) => {
                                 const imgEl = e.currentTarget;
                                 imgEl.style.display = 'none';
                                 const parent = imgEl.parentElement;
                                 if (parent) {
                                   const letter = document.createElement('div');
                                   letter.className = "flex items-center justify-center w-full h-full font-bold font-mono text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white";
                                   letter.innerText = (trade.item.name || "?").trim().charAt(0).toUpperCase();
                                   parent.appendChild(letter);
                                 }
                               }}
                             />
                          ) : "🎁"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-200 text-sm">{trade.item.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">
                              {trade.source}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs font-mono font-bold text-emerald-400">{trade.targetPrice} TON</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60">
                              <span className="text-[10px] text-slate-400">Floor: {trade.marketFloor} TON</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-left md:text-right">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Confidence</div>
                          <div className={`text-sm font-mono font-black ${
                            trade.confidence > 80 ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {trade.confidence}%
                          </div>
                        </div>
                        
                        <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onDeny(trade.id)}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
                            title="Deny"
                          >
                            <X size={16} />
                          </button>
                          <button 
                            onClick={() => onApprove(trade.id)}
                            className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {queue.length > 0 && (
        <div className="p-3 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
              Security: Manual Approval Required for all transactions in this mode
            </span>
          </div>
          {selectedIds.length > 0 && (
            <span className="text-[9px] font-mono text-fuchsia-400">
              * Grouping {selectedIds.length} orders into a single atomic multi-message payload
            </span>
          )}
        </div>
      )}
    </div>
  );
};
