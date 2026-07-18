import { FilterModal, FilterOption } from './FilterModal';
import React, { useState, useMemo } from "react";
import { Filter, Search, SortAsc, LayoutGrid, Activity, Scan, Send } from "lucide-react";
import { useMarketHub } from "../../hooks/useMarketHub";
import { MarketHub } from "../../lib/trading/MarketHub";
import { CombinerChart } from "./CombinerChart";
import { ExecutionEngine } from "../../lib/trading/ExecutionEngine";

const getIconForItem = (name: string) => {
  // We can try to load from public folder if exists, or use emoji as fallback
  // The app will look for /assets/icons/{name}.png or .webp
  // For now, return a placeholder image URL or emoji
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `/assets/gifts/${cleanName}.png`; // fallback to emoji in the component if it fails to load?
};

const getEmojiForItem = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('star')) return '⭐';
  if (n.includes('duck')) return '🦆';
  if (n.includes('heart')) return '❤️';
  if (n.includes('diamond')) return '💎';
  if (n.includes('trophy')) return '🏆';
  if (n.includes('cake') || n.includes('b-day')) return '🎂';
  if (n.includes('apple')) return '🍎';
  if (n.includes('dog') || n.includes('puppy')) return '🐶';
  if (n.includes('cat')) return '🐱';
  if (n.includes('frog') || n.includes('pepe')) return '🐸';
  if (n.includes('rose')) return '🌹';
  if (n.includes('cap')) return '🧢';
  if (n.includes('helmet')) return '🪖';
  if (n.includes('sword')) return '🗡️';
  if (n.includes('shield')) return '🛡️';
  if (n.includes('box')) return '📦';
  if (n.includes('berry')) return '🍓';
  if (n.includes('peach')) return '🍑';
  if (n.includes('shard')) return '🔮';
  if (n.includes('locket')) return '💝';
  return '💎';
};

export function ScreenMarketCombiner() {
  const marketState = useMarketHub();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);

  const allCollectionsOptions = useMemo(() => {
    const list: FilterOption[] = [];
    marketState.items.forEach((orders, itemName) => {
      const floor = Math.min(...orders.map(o => o.price));
      list.push({
        id: itemName,
        name: itemName,
        subtitle: `~${(isFinite(floor) ? floor : 0).toFixed(2)} TON floor`,
        badge: orders.length > 0 ? `(${orders.length})` : undefined,
        icon: getEmojiForItem(itemName) // Using emoji mapping for now, can be swapped to getIconForItem(itemName)
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [marketState.items]);

  const allMarketsOptions = useMemo(() => {
    return Array.from(new Set(['Fragment', 'GetGems', 'TonAPI', 'Tonnel', 'MRKT', 'Portals', ...marketState.activeSources])).map(s => {
      const isOffline = marketState.adapterStatus ? marketState.adapterStatus[s] === false : false;
      return {
        id: s,
        name: s,
        icon: s === 'Fragment' ? '💠' : s === 'GetGems' ? '💎' : s === 'TonAPI' ? '⚡' : s === 'Tonnel' ? '🕳️' : s === 'MRKT' ? '🛒' : s === 'Portals' ? '🌀' : s.charAt(0),
        subtitle: isOffline ? "Adapter is offline/blocked" : undefined,
        isOffline
      };
    });
  }, [marketState.activeSources, marketState.adapterStatus]);

  const itemsList = useMemo(() => {
    const list: { name: string, floor: number, count: number }[] = [];
    marketState.items.forEach((orders, itemName) => {
      if (searchQuery && !itemName.toLowerCase().includes(searchQuery.toLowerCase())) return;
      if (selectedCollections.length > 0 && !selectedCollections.includes(itemName)) return;
      
      const filteredOrders = selectedMarkets.length > 0 
        ? orders.filter(o => selectedMarkets.includes(o.source))
        : orders;
        
      if (filteredOrders.length === 0) return;
      
      const floor = Math.min(...filteredOrders.map(o => o.price));
      list.push({ 
        name: itemName, 
        floor: isFinite(floor) ? floor : 0, 
        count: filteredOrders.length 
      });
    });
    return list.sort((a, b) => b.count - a.count); // Sort by liquidity
  }, [marketState.items, searchQuery, selectedCollections, selectedMarkets]);

  // Set default selection if none
  React.useEffect(() => {
    if (!selectedItem && itemsList.length > 0) {
      setSelectedItem(itemsList[0].name);
    }
  }, [itemsList, selectedItem]);


  const activeItemOrders = selectedItem ? (marketState.items.get(selectedItem) || []) : [];
  const filteredActiveOrders = activeItemOrders.filter(o => selectedMarkets.length === 0 || selectedMarkets.includes(o.source));
  

  
  const chartData = useMemo(() => {
    if (!filteredActiveOrders || filteredActiveOrders.length === 0) return [];
    
    const sorted = [...filteredActiveOrders].sort((a, b) => a.price - b.price);
    const baseTime = new Date().getTime();
    
    return sorted.map((order, index) => {
       return {
          time: new Date(baseTime - (sorted.length - index) * 3600 * 1000).toISOString(),
          value: order.price
       };
    }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [filteredActiveOrders]);

  const handleRunSniper = () => {

    setIsScanning(true);
    // Visual effect
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 text-slate-300 relative lg:overflow-hidden overflow-y-auto p-2 lg:p-0">
      {/* Sidebar: Items List */}
      <div className="w-full lg:w-72 h-[45vh] lg:h-full bg-[#0a0a0a] border border-[#222] rounded-xl flex flex-col overflow-hidden shadow-xl shrink-0">
        <div className="p-4 border-b border-[#222] bg-[#111]">
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>Market Combiner</span>
          </h2>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search gifts, items..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 p-2 border-b border-[#222] bg-[#111] overflow-x-auto custom-scrollbar whitespace-nowrap">
          <button 
            onClick={() => setIsCollectionModalOpen(true)}
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded px-3 py-1.5 text-xs focus:outline-none transition-colors flex items-center"
          >
            Collection: {selectedCollections.length > 0 ? `${selectedCollections.length} selected` : 'All'}
          </button>
          <button 
            onClick={() => setIsMarketModalOpen(true)}
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded px-3 py-1.5 text-xs focus:outline-none transition-colors flex items-center"
          >
            Market: {selectedMarkets.length > 0 ? `${selectedMarkets.length} selected` : 'All'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {itemsList.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No items found</div>
          ) : (
            itemsList.map(item => (
              <div 
                key={item.name} 
                onClick={() => setSelectedItem(item.name)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center group
                  ${selectedItem === item.name 
                    ? 'bg-blue-600/20 border border-blue-500/50' 
                    : 'bg-[#151515] border border-transparent hover:border-[#333] hover:bg-[#1a1a1a]'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-[#222] flex items-center justify-center border border-[#333]">
                     {getEmojiForItem(item.name)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">{item.name}</div>
                    <div className="text-xs text-slate-500">Vol: {item.count} listings</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-emerald-400">{item.floor.toFixed(2)} TON</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        {/* Top Info Bar */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 flex flex-wrap justify-between items-center shadow-xl gap-4">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-2xl">
                 {selectedItem ? getEmojiForItem(selectedItem) : '💎'}
             </div>
             <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{selectedItem || "Select an item"}</h1>
                <div className="flex items-center space-x-2 text-sm text-slate-400 mt-1">
                  <span className="flex items-center"><Activity className="w-3 h-3 mr-1 text-blue-400"/> {filteredActiveOrders.length} active listings</span>
                  <span>•</span>
                  <span>Multiple Sources</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-[#111] p-1.5 rounded-lg border border-[#222]">
             {['15M', '1H', '4H', '1D', '1W'].map(tf => (
               <button 
                 key={tf}
                 onClick={() => setTimeframe(tf)}
                 className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${timeframe === tf ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#222]'}`}
               >
                 {tf}
               </button>
             ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 flex-1 min-h-[400px] shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 z-10 flex space-x-2">
            <button 
              onClick={handleRunSniper}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg border
                ${isScanning 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse' 
                  : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:scale-105'}`}
            >
              <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'SCANNING MARKETS...' : 'COMBINE & SNIPE'}</span>
            </button>
          </div>
          
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center space-x-2">
            <LayoutGrid className="w-4 h-4" />
            <span>Combined Orderbook & History</span>
          </h3>
          
          <div className="flex-1 w-full bg-[#111] rounded-lg border border-[#222] overflow-hidden">
             {selectedItem ? (
                <CombinerChart data={chartData} />
             ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  Select an item to view charts
                </div>
             )}
          </div>
        </div>
      </div>

      <FilterModal 
        title="Collections"
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        options={allCollectionsOptions}
        selectedIds={selectedCollections}
        onApply={setSelectedCollections}
      />
      <FilterModal 
        title="Market"
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        options={allMarketsOptions}
        selectedIds={selectedMarkets}
        onApply={setSelectedMarkets}
      />
    </div>
  );
}
