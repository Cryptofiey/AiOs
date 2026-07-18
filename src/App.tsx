import React, { useEffect, useState } from "react";
import { ScreenTgGiftsSniper } from "./components/desktop/ScreenTgGiftsSniper";
import { ScreenMarketCombiner } from "./components/combiner/ScreenMarketCombiner";
import { AuthAgent } from "./lib/agents/AuthAgent";

const globalAuthAgent = AuthAgent.getInstance();

export default function App() {
  const [activeTab, setActiveTab] = useState<"combiner" | "sniper">("combiner");

  useEffect(() => {
    fetch("/api/config/secrets")
      .then(res => res.json())
      .then(secrets => {
        // Filter out empty values
        const validSecrets = Object.entries(secrets).reduce((acc, [k, v]) => {
          if (v) acc[k] = v as string;
          return acc;
        }, {} as Record<string, string>);
        
        globalAuthAgent.loadFromVaultObj(validSecrets);
        
        // Auto-init MTProto using loaded credentials
        import('./lib/bridge/MTProtoBridge').then(m => {
          const inst = m.MTProtoBridge.getInstance();
          inst.initFromVault();
        });
      })
      .catch(e => console.error("Failed to load environment secrets:", e));
  }, []);

  return (
    <div className="w-full h-[100dvh] bg-[#030303] text-slate-100 font-sans flex flex-col">
      {/* Top Level Navigation Tabs */}
      <div className="flex border-b border-[#222] bg-[#0a0a0a] px-4 py-2 space-x-4 overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveTab("combiner")}
          className={`px-4 py-1.5 rounded text-sm font-bold uppercase transition-colors ${
            activeTab === "combiner" 
              ? "bg-cyan-900/30 text-cyan-400 border border-cyan-800/50" 
              : "text-slate-500 hover:text-slate-300 border border-transparent"
          }`}
        >
          Combiner Hub
        </button>
        <button
          onClick={() => setActiveTab("sniper")}
          className={`px-4 py-1.5 rounded text-sm font-bold uppercase transition-colors ${
            activeTab === "sniper" 
              ? "bg-cyan-900/30 text-cyan-400 border border-cyan-800/50" 
              : "text-slate-500 hover:text-slate-300 border border-transparent"
          }`}
        >
          Sniper Module
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "combiner" && <ScreenMarketCombiner />}
        {activeTab === "sniper" && <ScreenTgGiftsSniper />}
      </div>
    </div>
  );
}
