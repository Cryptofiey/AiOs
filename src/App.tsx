import React, { useEffect, useState } from "react";
import { ScreenTgGiftsSniper } from "./components/desktop/ScreenTgGiftsSniper";
import { AuthAgent } from "./lib/agents/AuthAgent";

const globalAuthAgent = AuthAgent.getInstance();

export default function App() {
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
    <div className="w-full h-screen bg-[#030303] text-slate-100 font-sans flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <ScreenTgGiftsSniper />
      </div>
    </div>
  );
}
