import React from 'react';
import { OSWindow } from '../../lib/ui-framework/OSWindow';
import { MessageSquare, LayoutGrid, Plus, Trash2, Settings2, Box } from 'lucide-react';

export const ScreenAppBuilder: React.FC = () => {
  return (
    <div className="flex flex-col h-full gap-1 overflow-y-auto pb-24 md:pb-1 md:overflow-hidden overscroll-contain">
      {/* Top Chat Container */}
      <OSWindow title="Builder Chat" state="idle" className="h-2/5 shrink-0" icon={<MessageSquare />}>
        <div className="flex flex-col h-full gap-1">
           <div className="flex-1 overflow-y-auto text-slate-300 text-xs p-2 bg-slate-900/50 rounded inset-shadow-sm border border-slate-800">
             <div className="mb-2">
               <span className="text-indigo-400 font-bold block mb-0.5">God Agent:</span> 
               <div className="bg-slate-800 p-2 rounded-r rounded-bl max-w-[80%] inline-block">Оберни текущий модуль.</div>
             </div>
             <div className="mb-1">
               <span className="text-emerald-400 font-bold block mb-0.5 mt-1 text-right">Sub-Agent UI:</span> 
               <div className="bg-emerald-900/30 border border-emerald-500/20 p-2 rounded-l rounded-br max-w-[80%] float-right">Принято. Размещаю компонент.</div>
               <div className="clear-both"></div>
             </div>
           </div>
           <div className="relative">
             <input type="text" placeholder="Опишите желаемый UI-модуль..." className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors" />
             <div className="absolute right-2 top-2.5 h-1.5 w-1.5 rounded-full bg-indigo-500/50 animate-pulse"></div>
           </div>
        </div>
      </OSWindow>

      {/* Toolbox Grid (Middle) */}
      <OSWindow title="Toolbox" state="system" className="h-1/3 shrink-0" icon={<LayoutGrid />}>
        <div className="grid grid-cols-5 md:grid-cols-8 gap-1 h-full p-1 overflow-y-auto">
          {Array.from({ length: 15 }).map((_, i) => (
             <button key={i} className="aspect-square w-full bg-slate-800 border flex flex-col items-center justify-center border-slate-600 rounded hover:bg-slate-700 hover:border-indigo-400 transition-all text-slate-400 hover:text-indigo-300 shadow-none hover:shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                <Box className="w-4 h-4 mb-0.5 z-10" />
                <span className="text-[8px] opacity-70">Mod_{i+1}</span>
             </button>
          ))}
        </div>
      </OSWindow>

      {/* Editor / Controls (Bottom) */}
      <OSWindow title="Node Mgmt" state="system" className="flex-1">
        <div className="flex flex-col md:flex-row items-center justify-center gap-1 h-full flex-wrap p-1">
           <button className="flex-1 w-full flex justify-center items-center gap-1 px-2 py-2 bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs rounded hover:bg-emerald-800/60 transition-colors">
             <Plus className="w-3.5 h-3.5" /> Add
           </button>
           <button className="flex-1 w-full flex justify-center items-center gap-1 px-2 py-2 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded hover:bg-slate-700 transition-colors">
             <Settings2 className="w-3.5 h-3.5" /> Validate
           </button>
           <button className="flex-1 w-full flex justify-center items-center gap-1 px-2 py-2 bg-rose-900/40 border border-rose-500/50 text-rose-200 text-xs rounded hover:bg-rose-800/60 transition-colors">
             <Trash2 className="w-3.5 h-3.5" /> Purge
           </button>
        </div>
      </OSWindow>
    </div>
  );
};
