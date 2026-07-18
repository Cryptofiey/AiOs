import React, { useState } from "react";
import { Filter, Search, SortAsc, LayoutGrid, Activity, Scan, ChevronDown } from "lucide-react";

export function ScreenMarketCombiner() {
  const [selectedItem, setSelectedItem] = useState("Durov's Cap");
  const [timeframe, setTimeframe] = useState("1D");

  const mockItems = [
    { id: "1", name: "Durov's Cap", floor: 0.44 },
    { id: "2", name: "Chill Flame", floor: 0.12 },
    { id: "3", name: "Vice Cream", floor: 0.89 },
    { id: "4", name: "Xmas Stocking", floor: 0.05 },
    { id: "5", name: "Big Year", floor: 1.2 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-slate-200 p-4 font-mono">
      {/* Top Bar: Sort & Filter */}
      <div className="flex items-center justify-between bg-[#111] border border-[#222] p-3 rounded-lg mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-cyan-400 font-bold uppercase flex items-center">
            <LayoutGrid className="w-4 h-4 mr-2" /> Combine OS
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Dropdowns per user sketch */}
          <select className="bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500">
            <option>Collection: All</option>
            <option>TG Gifts</option>
          </select>
          <select className="bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500">
            <option>Item: Any</option>
            <option>Durov's Cap</option>
          </select>
          <select className="bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500">
            <option>Market: All Adapters</option>
            <option>Fragment</option>
            <option>GetGems</option>
          </select>
          <button className="flex items-center space-x-1 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] px-3 py-1.5 rounded text-xs transition-colors">
            <SortAsc className="w-3.5 h-3.5" />
            <span>Sort</span>
          </button>
          <button className="flex items-center space-x-1 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] px-3 py-1.5 rounded text-xs transition-colors">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Markets & Items */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex-1 flex flex-col min-h-0">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-4 border-b border-[#222] pb-2">
              Items
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-2 top-1.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-8 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
              {mockItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setSelectedItem(item.name)}
                  className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors border ${selectedItem === item.name ? 'bg-cyan-900/20 border-cyan-800/50 text-cyan-300' : 'bg-transparent border-transparent hover:bg-[#1a1a1a] text-slate-400'}`}
                >
                  <span>{item.name}</span>
                  <span className="text-slate-600">{item.floor} TON</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right Column: Item Data */}
        <div className="col-span-9 flex flex-col gap-4">
          
          {/* Top Row: Icon & Metadata */}
          <div className="grid grid-cols-2 gap-4 h-48">
            {/* Icon Box */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-transparent opacity-50"></div>
              <div className="text-center z-10">
                <div className="w-24 h-24 bg-[#1a1a1a] rounded-full border border-[#333] mx-auto mb-3 flex items-center justify-center shadow-inner">
                  <span className="text-4xl">🦆</span>
                </div>
                <div className="text-sm font-bold text-slate-300">{selectedItem}</div>
              </div>
            </div>

            {/* Metadata Box */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3">
                Metadata
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div className="flex justify-between items-center bg-[#1a1a1a] p-2 rounded border border-[#222]">
                  <span className="text-xs text-slate-500">Number</span>
                  <span className="text-xs text-slate-300 font-bold">#1337</span>
                </div>
                <div className="flex justify-between items-center bg-[#1a1a1a] p-2 rounded border border-[#222]">
                  <span className="text-xs text-slate-500">Monochrome</span>
                  <span className="text-xs text-cyan-400 font-bold">Yes</span>
                </div>
                <div className="flex justify-between items-center bg-[#1a1a1a] p-2 rounded border border-[#222]">
                  <span className="text-xs text-slate-500">Rare Color</span>
                  <span className="text-xs text-rose-400 font-bold">Crimson Red</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Portals Chart */}
          <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col h-48 relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center">
                <Activity className="w-3 h-3 mr-1" /> Portals / Market Trend
              </div>
              <div className="flex space-x-1 bg-[#1a1a1a] p-1 rounded border border-[#333]">
                {['1D', '7D', '1M', '1Y'].map(tf => (
                  <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${timeframe === tf ? 'bg-cyan-900/40 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            {/* Mock Chart Area */}
            <div className="flex-1 w-full flex items-end justify-between px-2 pb-2 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/5 to-transparent pointer-events-none"></div>
              {/* Fake SVG Line */}
              <svg className="w-full h-full absolute inset-0 preserve-3d" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline 
                  points="0,80 10,70 20,90 30,50 40,60 50,30 60,40 70,20 80,40 90,10 100,20" 
                  fill="none" 
                  stroke="rgba(34, 211, 238, 0.4)" 
                  strokeWidth="2" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Row: Stats & Action Buttons */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Stats */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col justify-center space-y-2">
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-[#1a1a1a] p-3 rounded border border-[#333] flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 uppercase">Orders</span>
                   <span className="text-lg text-slate-200">142</span>
                 </div>
                 <div className="bg-[#1a1a1a] p-3 rounded border border-[#333] flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 uppercase">Floor</span>
                   <span className="text-lg text-emerald-400">0.44 TON</span>
                 </div>
                 <div className="bg-[#1a1a1a] p-3 rounded border border-[#333] flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 uppercase">Auction</span>
                   <span className="text-lg text-amber-400">0.51 TON</span>
                 </div>
                 <div className="bg-[#1a1a1a] p-3 rounded border border-[#333] flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 uppercase">Offer</span>
                   <span className="text-lg text-rose-400">0.40 TON</span>
                 </div>
               </div>
            </div>

            {/* Actions */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col space-y-4">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Scanner Actions
              </div>
              <div className="flex-1 flex gap-4">
                <button className="flex-1 bg-cyan-900/30 hover:bg-cyan-800/40 border border-cyan-800/50 text-cyan-300 rounded flex flex-col items-center justify-center transition-colors group">
                  <Scan className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold uppercase">Scan 1</span>
                  <span className="text-[10px] text-cyan-600/70 mt-1">Check {selectedItem} only</span>
                </button>
                <button className="flex-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-slate-300 rounded flex flex-col items-center justify-center transition-colors group">
                  <LayoutGrid className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold uppercase">Scan All</span>
                  <span className="text-[10px] text-slate-600 mt-1">Batch check active items</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
