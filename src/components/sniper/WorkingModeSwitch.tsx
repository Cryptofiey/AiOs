import React from "react";
import { Power, Shield, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";
import { WorkingMode } from "../../types";

interface WorkingModeSwitchProps {
  currentMode: WorkingMode;
  onChange: (mode: WorkingMode) => void;
}

export const WorkingModeSwitch: React.FC<WorkingModeSwitchProps> = ({ currentMode, onChange }) => {
  const modes: { id: WorkingMode, label: string, icon: any, desc: string, color: string }[] = [
    { 
      id: "OFF", 
      label: "Offline", 
      icon: Power, 
      desc: "Scanner Only", 
      color: "slate" 
    },
    { 
      id: "SOFT", 
      label: "Soft", 
      icon: Shield, 
      desc: "Approval Req", 
      color: "blue" 
    },
    { 
      id: "ON", 
      label: "Auto", 
      icon: Cpu, 
      desc: "Safe Sniping", 
      color: "emerald" 
    },
    { 
      id: "STRICT", 
      label: "Strict", 
      icon: ShieldCheck, 
      desc: "Aggressive", 
      color: "indigo" 
    }
  ];

  const getModeStyles = (modeId: WorkingMode, isActive: boolean) => {
    if (!isActive) return "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/60";
    switch (modeId) {
      case "OFF": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "SOFT": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "ON": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "STRICT": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getPulseColor = (modeId: WorkingMode) => {
    switch (modeId) {
      case "OFF": return "bg-slate-400";
      case "SOFT": return "bg-blue-400";
      case "ON": return "bg-emerald-400";
      case "STRICT": return "bg-indigo-400";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 backdrop-blur-md overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-1.5 shrink-0 px-2">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Sniper Protocol</h3>
      </div>
      
      <div className="flex items-center gap-1 w-full md:w-auto">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={`group relative flex-1 md:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer shrink-0 ${getModeStyles(mode.id, currentMode === mode.id)}`}
          >
            <mode.icon size={12} className={currentMode === mode.id ? "" : "text-slate-500 group-hover:text-slate-400"} />
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
               <span className="text-[9px] font-black uppercase tracking-wider leading-none">
                 {mode.label}
               </span>
               <span className="text-[7px] text-slate-500 font-medium hidden sm:block mt-0.5 leading-none">
                 {mode.desc}
               </span>
            </div>
            {currentMode === mode.id && (
              <div className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full animate-pulse ${getPulseColor(mode.id)}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
