import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, ShoppingBag, Landmark, ArrowUpDown, Gavel, 
  History, Plus, Check, Info, TrendingUp, Cpu, Sparkles, Send, RefreshCw, Trash2
} from 'lucide-react';
import { useMarketHub } from '../../hooks/useMarketHub';
import { NormalizedOrder } from '../../types/market';
import { TonnelAdapter } from '../../lib/adapters/TonnelAdapter';
import { WalletBridge } from '../../lib/bridge/WalletBridge';

export const TonnelMarketAuction: React.FC = () => {
  const { items, lastUpdate } = useMarketHub();
  const [selectedAsset, setSelectedAsset] = useState<string>("Tonnel Mixer Voucher #1024");
  
  // Local reactive list of simulated/interactive user bids & actions (combined with TonnelAdapter fallback)
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"market" | "auction">("market");

  // Input states
  const [buyNowPrice, setBuyNowPrice] = useState<string>("15.00");
  const [newItemName, setNewItemName] = useState<string>("Tonnel Mixer Voucher #1025");
  const [offerPrice, setOfferPrice] = useState<string>("13.50");
  const [bidPrice, setBidPrice] = useState<string>("39.50");

  const [notif, setNotif] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Trigger brief on-screen notification
  const triggerNotification = (msg: string, type: "success" | "info" | "error" = "success") => {
    setNotif({ message: msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // 1. Extract and aggregate Tonnel-specific orders from the MarketHub
  const tonnelOrdersFromHub = useMemo(() => {
    const list: NormalizedOrder[] = [];
    items.forEach((orders) => {
      orders.forEach((o) => {
        if (o && o.source === "Tonnel") {
          list.push(o);
        }
      });
    });
    return list;
  }, [items]);

  // Fallback / Initial seed if no orders are present in MarketHub
  useEffect(() => {
    const adapter = new TonnelAdapter();
    adapter.fetchLatestListings().then((res) => {
      const normalized = res.map(r => adapter.normalizeData(r)).filter(Boolean);
      setUserOrders(normalized);
    });
  }, []);

  // Merge aggregated hub orders with local interactive user actions
  const mergedOrders = useMemo(() => {
    const all = [...userOrders];
    tonnelOrdersFromHub.forEach(h => {
      if (!all.some(a => a.id === h.id)) {
        all.push(h);
      }
    });
    return all;
  }, [userOrders, tonnelOrdersFromHub]);

  // Group by assets for selection list
  const availableAssets = useMemo(() => {
    const names = new Set<string>();
    mergedOrders.forEach(o => {
      if (o.metadata?.itemName) {
        names.add(o.metadata.itemName);
      }
    });
    // Ensure default ones are present
    names.add("Tonnel Mixer Voucher #1024");
    names.add("Durov's Star #77");
    names.add("Special Star #55");
    return Array.from(names);
  }, [mergedOrders]);

  // Filter current orders by the active selected asset
  const assetOrders = useMemo(() => {
    return mergedOrders.filter(o => o.metadata?.itemName === selectedAsset);
  }, [mergedOrders, selectedAsset]);

  // Market Column: Buy Now listings (type = ASK, tradeForm = FIXED_PRICE)
  const buyNowListings = useMemo(() => {
    return assetOrders.filter(o => o.type === "ASK" && o.metadata?.tradeForm === "FIXED_PRICE");
  }, [assetOrders]);

  // Market Column: Offers/Bids on Buy Now (type = BID, tradeForm = FIXED_PRICE)
  const offersListings = useMemo(() => {
    return assetOrders.filter(o => o.type === "BID" && o.metadata?.tradeForm === "FIXED_PRICE");
  }, [assetOrders]);

  // Auction Column: Bids / Place Bid (type = BID, tradeForm = AUCTION, exclude historic logs if marked specifically)
  const activeAuctions = useMemo(() => {
    // Show active auctions (or bids on active auctions)
    return mergedOrders.filter(o => o.metadata?.tradeForm === "AUCTION" && !o.metadata?.status?.includes("History"));
  }, [mergedOrders]);

  // Specific current auction details based on selectedAsset
  const selectedAuction = useMemo(() => {
    const auctionOrders = assetOrders.filter(o => o.metadata?.tradeForm === "AUCTION");
    // The current active bid (usually the highest BID in auction)
    const bids = auctionOrders.filter(o => o.type === "BID" && !o.metadata?.status?.includes("History"));
    const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.price)) : null;
    return {
      orders: auctionOrders,
      currentPrice: highestBid || (auctionOrders.length > 0 ? Math.max(...auctionOrders.map(a => a.price)) : 30.0),
      hasAuction: auctionOrders.length > 0 || selectedAsset.includes("Star")
    };
  }, [assetOrders, selectedAsset]);

  // Auction Column: Bid History
  const bidHistory = useMemo(() => {
    return assetOrders
      .filter(o => o.metadata?.tradeForm === "AUCTION")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [assetOrders]);

  // ACTION Handlers
  const handleBuyNow = async (orderId: string, price: number) => {
    try {
      triggerNotification(`Initiating Tonnel Buy Now payment for ${price} TON...`, "info");
      
      // Interact with Wallet Bridge
      const bridge = WalletBridge.getInstance();
      if (bridge.getState().connected) {
        // Send actual transaction payload via connected wallet
        const nanoAmount = Math.round(price * 1e9).toString();
        const success = await bridge.sendTransaction([{
          address: "EQC6FasGZ7D5Uq-tWqEa-V0q2MOn3q9D6z15W43rU4Y7Z03a", // Dummy Tonnel Router Contract Address for testing
          amount: nanoAmount,
          payload: "" // Optional payload
        }]);
        if (success) {
          triggerNotification(`Purchase successful! Voucher serial registered in private pool.`, "success");
          // Remove from local lists
          setUserOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
          triggerNotification("Transaction rejected by user.", "error");
        }
      } else {
        triggerNotification("Please connect your TON Wallet first to execute transaction.", "error");
      }
    } catch (err: any) {
      triggerNotification(`Payment failed: ${err.message}`, "error");
    }
  };

  const handleCreateListing = () => {
    const priceVal = parseFloat(buyNowPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      triggerNotification("Please enter a valid price.", "error");
      return;
    }

    const newOrder = {
      id: `user_tonnel_ask_${Date.now()}`,
      source: "Tonnel",
      price: priceVal,
      currency: "TON",
      type: "ASK",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: selectedAsset,
        serial: selectedAsset.match(/#(\d+)/)?.[1] || "1024",
        tradeForm: "FIXED_PRICE",
        status: "Buy Now",
        isBotOrder: false
      }
    };

    setUserOrders(prev => [newOrder, ...prev]);
    triggerNotification(`Created FIXED PRICE Buy Now listing for ${priceVal} TON!`, "success");
  };

  const handleCreateOffer = () => {
    const priceVal = parseFloat(offerPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      triggerNotification("Please enter a valid price.", "error");
      return;
    }

    const newOrder = {
      id: `user_tonnel_offer_${Date.now()}`,
      source: "Tonnel",
      price: priceVal,
      currency: "TON",
      type: "BID",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: selectedAsset,
        serial: selectedAsset.match(/#(\d+)/)?.[1] || "1024",
        tradeForm: "FIXED_PRICE",
        status: "Offer",
        isBotOrder: false
      }
    };

    setUserOrders(prev => [newOrder, ...prev]);
    triggerNotification(`Submitted new Offer of ${priceVal} TON!`, "success");
  };

  const handlePlaceBid = () => {
    const priceVal = parseFloat(bidPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      triggerNotification("Please enter a valid bid amount.", "error");
      return;
    }

    if (priceVal <= selectedAuction.currentPrice) {
      triggerNotification(`Bid must be strictly higher than current price (${selectedAuction.currentPrice} TON)`, "error");
      return;
    }

    const newOrder = {
      id: `user_tonnel_bid_${Date.now()}`,
      source: "Tonnel",
      price: priceVal,
      currency: "TON",
      type: "BID",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: selectedAsset,
        serial: selectedAsset.match(/#(\d+)/)?.[1] || "77",
        tradeForm: "AUCTION",
        status: "Active Auction",
        isBotOrder: false
      }
    };

    setUserOrders(prev => [newOrder, ...prev]);
    // Also update current bid price input to match next increment
    setBidPrice((priceVal + 1.5).toFixed(2));
    triggerNotification(`Bid of ${priceVal} TON placed successfully!`, "success");
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* HEADER SECTION */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
            <Layers size={20} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              Tonnel Private P2P
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                BOT INTEGRATION
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Replicating the private mixer market and decentralized auction protocols.
            </p>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        <div className="flex-1 max-w-xs h-8 flex items-center justify-center">
          <AnimatePresence>
            {notif && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-[10px] font-bold font-mono px-3 py-1 rounded border shadow-lg ${
                  notif.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : notif.type === "error"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}
              >
                {notif.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ASSET SELECTOR */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Asset:</span>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-slate-600 font-mono"
          >
            {availableAssets.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* THREE-COLUMN BENTO PANEL OR SCROLLABLE COLUMNS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 overflow-y-auto">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: MARKET (BUY NOW & OFFERS)                    */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-slate-950 p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-blue-400" />
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">
                MARKET
              </h4>
            </div>
            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
              FIXED PRICE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SUB-SECTION: BUY NOW (ASK) */}
            <div className="flex flex-col bg-slate-900/25 rounded-xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-white tracking-widest uppercase">
                  1. BUY NOW
                </span>
                <span className="text-[9px] text-rose-400 font-mono">Sellers Ask</span>
              </div>

              {/* LIST OF CURRENT BUY NOW ITEMS */}
              <div className="space-y-2 h-48 overflow-y-auto mb-3 scrollbar-none">
                {buyNowListings.map((listing) => (
                  <div key={listing.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">{listing.metadata?.itemName}</span>
                      <span className="text-[8px] text-slate-500 font-mono">Serial #{listing.metadata?.serial || "1024"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-white font-black">{listing.price.toFixed(2)} TON</span>
                      <button
                        onClick={() => handleBuyNow(listing.id, listing.price)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[8px] uppercase tracking-wider px-2 py-1 rounded transition-colors"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
                {buyNowListings.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-600 font-mono uppercase text-center">
                    No Buy Now Listings
                  </div>
                )}
              </div>

              {/* ACTION: CREATE FIXED PRICE LISTING */}
              <div className="border-t border-slate-800/60 pt-3 mt-auto">
                <span className="text-[9px] text-slate-400 font-mono uppercase block mb-1.5">List Your Item for Sale:</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="15.00 TON"
                    value={buyNowPrice}
                    onChange={(e) => setBuyNowPrice(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded text-xs text-white p-1.5 font-mono outline-none"
                  />
                  <button
                    onClick={handleCreateListing}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] uppercase px-2 py-1.5 rounded flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} /> List
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-SECTION: Offer (BID) */}
            <div className="flex flex-col bg-slate-900/25 rounded-xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-white tracking-widest uppercase">
                  2. Offers
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">Buyers Bid</span>
              </div>

              {/* LIST OF ACTIVE OFFERS */}
              <div className="space-y-2 h-48 overflow-y-auto mb-3 scrollbar-none">
                {offersListings.map((offer) => (
                  <div key={offer.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">{offer.metadata?.itemName}</span>
                      <span className="text-[8px] text-slate-500 font-mono">Offer Serial: All</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-400 font-black">{offer.price.toFixed(2)} TON</span>
                      <span className="text-[8px] bg-slate-800 text-slate-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-700">
                        Offer
                      </span>
                    </div>
                  </div>
                ))}
                {offersListings.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-600 font-mono uppercase text-center">
                    No active buyout offers
                  </div>
                )}
              </div>

              {/* ACTION: CREATE OFFER */}
              <div className="border-t border-slate-800/60 pt-3 mt-auto">
                <span className="text-[9px] text-slate-400 font-mono uppercase block mb-1.5">Submit Buyout Offer:</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="13.50 TON"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded text-xs text-white p-1.5 font-mono outline-none"
                  />
                  <button
                    onClick={handleCreateOffer}
                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase px-2 py-1.5 rounded flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} /> Offer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC METRIC OR LEGEND */}
          <div className="mt-4 p-3 bg-slate-900/10 border border-slate-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={12} className="text-slate-500" />
              <span className="text-[9px] font-mono text-slate-400 uppercase">Interactive simulation matching active MTProto bots.</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">Live UTC Clock</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: AUCTION (PLACE BID & BID HISTORY)           */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-slate-950 p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <Gavel size={16} className="text-amber-400" />
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">
                AUCTION
              </h4>
            </div>
            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
              BIDDING PROTOCOL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* SUB-SECTION: PLACE BID */}
            <div className="flex flex-col bg-slate-900/25 rounded-xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-white tracking-widest uppercase">
                  1. PLACE BID
                </span>
                <span className="text-[9px] text-amber-400 font-mono">Live Bidding</span>
              </div>

              {selectedAuction.hasAuction ? (
                <div className="flex flex-col justify-between flex-1">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center mb-3">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1">CURRENT AUCTION ASSET</span>
                    <h5 className="text-xs font-bold text-white mb-2">{selectedAsset}</h5>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">HIGHEST ACTIVE BID</span>
                    <span className="text-xl font-black text-amber-400 font-mono">{selectedAuction.currentPrice.toFixed(2)} TON</span>
                  </div>

                  {/* ACTION: BID FORM */}
                  <div className="border-t border-slate-800/60 pt-3 mt-auto">
                    <span className="text-[9px] text-slate-400 font-mono uppercase block mb-1.5">Enter New Highest Bid Amount:</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={bidPrice}
                        onChange={(e) => setBidPrice(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded text-xs text-white p-1.5 font-mono outline-none"
                      />
                      <button
                        onClick={handlePlaceBid}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-all"
                      >
                        <Gavel size={12} /> Bid
                      </button>
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono block mt-1">Recommended next bid: &gt; {selectedAuction.currentPrice.toFixed(2)} TON</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Info size={24} className="text-slate-600 mb-2" />
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Select a Star asset from the drop-down menu above to view or place auction bids!</span>
                </div>
              )}
            </div>

            {/* SUB-SECTION: Bid HISTORY */}
            <div className="flex flex-col bg-slate-900/25 rounded-xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-white tracking-widest uppercase">
                  2. Bid HISTORY
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Bids Timeline</span>
              </div>

              {/* TIMELINE LIST */}
              <div className="space-y-2 h-64 overflow-y-auto scrollbar-none">
                {bidHistory.map((bid, bIndex) => (
                  <div key={bid.id || bIndex} className="relative pl-4 border-l-2 border-slate-800 py-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500 absolute -left-[5px] top-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-200">{bid.price.toFixed(2)} TON</span>
                        <span className="text-[8px] text-slate-500 font-mono">
                          {bid.metadata?.status || "Bid Placed"}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(bid.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {bidHistory.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-600 font-mono uppercase text-center">
                    No historic bids found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
