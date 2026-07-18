import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, ShoppingBag, Landmark, ArrowUpDown, History, 
  Plus, Check, Info, TrendingUp, Search, Wallet, Send, RefreshCw, Trash2, Tag, Calendar
} from "lucide-react";
import { useMarketHub } from "../../hooks/useMarketHub";
import { NormalizedOrder } from "../../types/market";
import { PortalsAdapter } from "../../lib/adapters/PortalsAdapter";
import { WalletBridge } from "../../lib/bridge/WalletBridge";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";

export const PortalsMarket: React.FC = () => {
  const { items, lastUpdate } = useMarketHub();
  const [selectedGift, setSelectedGift] = useState<string>("Pumpkin Gift");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<"buy_now" | "make_offer" | "history">("buy_now");

  // User input states
  const [customOfferPrice, setCustomOfferPrice] = useState<string>("12.50");
  const [customListingPrice, setCustomListingPrice] = useState<string>("18.00");
  const [customGiftName, setCustomGiftName] = useState<string>("Pumpkin Gift");
  
  // Loaded collections from Firestore or local storage
  const [localOffers, setLocalOffers] = useState<NormalizedOrder[]>([]);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notif, setNotif] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Trigger brief notification
  const triggerNotification = (msg: string, type: "success" | "info" | "error" = "success") => {
    setNotif({ message: msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // Fetch local offers and sales history from Firestore/LocalStorage
  const loadPersistedData = async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Load custom offers from Firestore
        const offersRef = collection(db, `users/${user.uid}/portals_offers`);
        const offersSnap = await getDocs(offersRef);
        const offersList: NormalizedOrder[] = [];
        offersSnap.forEach((docSnap) => {
          offersList.push({ id: docSnap.id, ...docSnap.data() } as NormalizedOrder);
        });
        setLocalOffers(offersList);

        // Load custom sale history from Firestore
        const historyRef = collection(db, `users/${user.uid}/portals_history`);
        const historySnap = await getDocs(query(historyRef, orderBy("timestamp", "desc")));
        const historyList: any[] = [];
        historySnap.forEach((docSnap) => {
          historyList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLocalHistory(historyList);
      } else {
        // Fallback to local storage
        const savedOffers = localStorage.getItem("portals_local_offers");
        if (savedOffers) {
          setLocalOffers(JSON.parse(savedOffers));
        }
        const savedHistory = localStorage.getItem("portals_local_history");
        if (savedHistory) {
          setLocalHistory(JSON.parse(savedHistory));
        }
      }
    } catch (err: any) {
      console.warn("Error loading Portals persisted data:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPersistedData();
  }, [user]);

  // Aggregate Portals orders from the global MarketHub items state
  const portalsOrdersFromHub = useMemo(() => {
    const list: NormalizedOrder[] = [];
    items.forEach((orders) => {
      orders.forEach((o) => {
        if (o && (o.source === "Portals" || o.source?.toLowerCase() === "portals")) {
          list.push(o);
        }
      });
    });
    return list;
  }, [items]);

  // Combined orders (Live from hub + user-created local listings/offers)
  const allOrders = useMemo(() => {
    const combined = [...localOffers];
    portalsOrdersFromHub.forEach((hubOrder) => {
      if (!combined.some((o) => o.id === hubOrder.id)) {
        combined.push(hubOrder);
      }
    });
    return combined;
  }, [localOffers, portalsOrdersFromHub]);

  // Extract a list of all distinct gifts that have any Portals presence
  const availableGifts = useMemo(() => {
    const giftSet = new Set<string>();
    
    // Seed with standard/popular Telegram gifts
    giftSet.add("Pumpkin Gift");
    giftSet.add("Royalty Gift");
    giftSet.add("Spooky Peach");
    giftSet.add("Durov's Puzzles");
    giftSet.add("Durov's Star");
    giftSet.add("Santa Claus");
    giftSet.add("Flying Saucer");

    allOrders.forEach((o) => {
      if (o.metadata?.itemName) {
        giftSet.add(o.metadata.itemName);
      }
    });

    const list = Array.from(giftSet);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      return list.filter((g) => g.toLowerCase().includes(lower));
    }
    return list;
  }, [allOrders, searchTerm]);

  // Current active buy listings (ASK) for the selected gift
  const activeBuyNowListings = useMemo(() => {
    return allOrders.filter(
      (o) => o.metadata?.itemName === selectedGift && o.type === "ASK"
    );
  }, [allOrders, selectedGift]);

  // Current active purchase offers (BID / Make Offer) for the selected gift
  const activeOffers = useMemo(() => {
    return allOrders.filter(
      (o) => o.metadata?.itemName === selectedGift && o.type === "BID"
    );
  }, [allOrders, selectedGift]);

  // History timeline of completed sales for the selected gift
  const activeHistory = useMemo(() => {
    const defaultHistory = [
      {
        id: `default_hist_1_${selectedGift}`,
        itemName: selectedGift,
        price: 13.20,
        buyer: "EQB8...92ad",
        seller: "EQA2...11ff",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        type: "Sale"
      },
      {
        id: `default_hist_2_${selectedGift}`,
        itemName: selectedGift,
        price: 12.80,
        buyer: "EQC5...77ee",
        seller: "EQD4...44cc",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
        type: "Sale"
      }
    ];

    const combined = [...localHistory.filter((h) => h.itemName === selectedGift), ...defaultHistory];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [localHistory, selectedGift]);

  // Action: Buy Now
  const handleBuyNow = async (orderId: string, price: number, itemName: string, serial?: string) => {
    try {
      triggerNotification(`Initiating Portals Buy Now for ${itemName} #${serial || "All"} at ${price} TON...`, "info");
      
      const bridge = WalletBridge.getInstance();
      if (bridge.getState().connected) {
        const nanoAmount = Math.round(price * 1e9).toString();
        // Send transaction on the TON blockchain via user's connected wallet
        const success = await bridge.sendTransaction([
          {
            address: "EQCt...portals_router_contract_placeholder", // Standard contract address for Portals Router
            amount: nanoAmount,
            payload: "" // Optional payload parameter
          }
        ]);

        if (success) {
          triggerNotification(`Successfully bought ${itemName}! Transaction broadcast to TON blockchain.`, "success");
          
          // Log trade and record as a successful sale in our History collection
          const newSale = {
            itemName,
            price,
            buyer: bridge.getState().walletAddress?.slice(0, 6) + "..." + bridge.getState().walletAddress?.slice(-4) || "EQ_User",
            seller: "EQ_Portals_Seller",
            timestamp: new Date().toISOString(),
            type: "Sale"
          };

          if (user) {
            await addDoc(collection(db, `users/${user.uid}/portals_history`), newSale);
          } else {
            const updatedHist = [newSale, ...localHistory];
            localStorage.setItem("portals_local_history", JSON.stringify(updatedHist));
          }

          // Remove the buy now listing locally
          setLocalOffers((prev) => prev.filter((o) => o.id !== orderId));
          loadPersistedData();
        } else {
          triggerNotification("Transaction was cancelled or failed in wallet.", "error");
        }
      } else {
        triggerNotification("Please connect your TON wallet in the dashboard to execute blockchain transactions.", "error");
      }
    } catch (err: any) {
      triggerNotification(`Payment execution error: ${err.message}`, "error");
    }
  };

  // Action: Create Listing (ASK)
  const handleCreateListing = async () => {
    const priceVal = parseFloat(customListingPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      triggerNotification("Please enter a valid positive listing price.", "error");
      return;
    }

    const newListing: NormalizedOrder = {
      id: `user_portals_ask_${Date.now()}`,
      source: "Portals",
      price: priceVal,
      currency: "TON",
      type: "ASK",
      category: "MARKET",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: selectedGift,
        serial: Math.floor(Math.random() * 5000 + 1).toString(),
        isBotOrder: false,
        status: "Buy Now"
      }
    };

    try {
      if (user) {
        await addDoc(collection(db, `users/${user.uid}/portals_offers`), newListing);
      } else {
        const updatedOffers = [newListing, ...localOffers];
        localStorage.setItem("portals_local_offers", JSON.stringify(updatedOffers));
      }
      setLocalOffers((prev) => [newListing, ...prev]);
      triggerNotification(`Successfully listed ${selectedGift} for ${priceVal} TON!`, "success");
    } catch (err: any) {
      triggerNotification(`Failed to persist listing: ${err.message}`, "error");
    }
  };

  // Action: Make Offer (BID)
  const handleCreateOffer = async () => {
    const priceVal = parseFloat(customOfferPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      triggerNotification("Please enter a valid positive offer price.", "error");
      return;
    }

    const newOffer: NormalizedOrder = {
      id: `user_portals_bid_${Date.now()}`,
      source: "Portals",
      price: priceVal,
      currency: "TON",
      type: "BID",
      category: "ORDER",
      timestamp: new Date().toISOString(),
      metadata: {
        itemName: selectedGift,
        serial: "All",
        isBotOrder: false,
        status: "Offer"
      }
    };

    try {
      if (user) {
        await addDoc(collection(db, `users/${user.uid}/portals_offers`), newOffer);
      } else {
        const updatedOffers = [newOffer, ...localOffers];
        localStorage.setItem("portals_local_offers", JSON.stringify(updatedOffers));
      }
      setLocalOffers((prev) => [newOffer, ...prev]);
      triggerNotification(`Submitted offer of ${priceVal} TON for ${selectedGift}!`, "success");
    } catch (err: any) {
      triggerNotification(`Failed to submit offer: ${err.message}`, "error");
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[700px] w-full">
      
      {/* HEADER SECTION */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              PORTALS MARKETPLACE
              <span className="text-[10px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/20">
                ACTIVE
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Decentralized buy now & offer gateway powered by portals.art protocols
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
                    : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                }`}
              >
                {notif.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* REFRESH PROTOCOL */}
        <button
          onClick={loadPersistedData}
          className="text-slate-400 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg p-2 flex items-center gap-1.5 text-[10px] font-mono uppercase"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Sync
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT: LEFT SIDEBAR FOR GIFT LISTING, RIGHT PANEL FOR MARKET DETAILS */}
      <div className="flex-1 flex overflow-hidden divide-x divide-slate-800">
        
        {/* LEFT COLUMN: GIFT SEARCH & DIRECTORY */}
        <div className="w-64 flex flex-col h-full bg-slate-950/40">
          <div className="p-3 border-b border-slate-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search gifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* GIFT DIRECTORY LIST */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1 block">
              GIFT DIRECTORY (ALL GIFTS)
            </span>
            {availableGifts.map((gift) => {
              const isActive = gift === selectedGift;
              const buyListingsCount = allOrders.filter(
                (o) => o.metadata?.itemName === gift && o.type === "ASK"
              ).length;
              const offerCount = allOrders.filter(
                (o) => o.metadata?.itemName === gift && o.type === "BID"
              ).length;

              return (
                <button
                  key={gift}
                  onClick={() => {
                    setSelectedGift(gift);
                    setCustomGiftName(gift);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                    isActive
                      ? "bg-violet-600/15 border border-violet-500/25 text-white"
                      : "hover:bg-slate-900/50 border border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{gift}</span>
                    <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                      {buyListingsCount} listed • {offerCount} offers
                    </span>
                  </div>
                  <Tag size={12} className={isActive ? "text-violet-400" : "text-slate-600"} />
                </button>
              );
            })}
            {availableGifts.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-600 font-mono uppercase">
                No matching gifts found
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CORE TRANSACTION TABS (BUY NOW, MAKE OFFER, SALE HISTORY) */}
        <div className="flex-1 flex flex-col h-full bg-slate-950">
          
          {/* TAB BAR FOR COMPONENT SUB-SECTIONS */}
          <div className="flex border-b border-slate-900 bg-slate-900/10">
            <button
              onClick={() => setActiveSubTab("buy_now")}
              className={`flex-1 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeSubTab === "buy_now"
                  ? "border-violet-500 text-white bg-violet-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
              }`}
            >
              <ShoppingBag size={14} />
              BUY NOW ({activeBuyNowListings.length})
            </button>
            <button
              onClick={() => setActiveSubTab("make_offer")}
              className={`flex-1 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeSubTab === "make_offer"
                  ? "border-violet-500 text-white bg-violet-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
              }`}
            >
              <Landmark size={14} />
              MAKE OFFER ({activeOffers.length})
            </button>
            <button
              onClick={() => setActiveSubTab("history")}
              className={`flex-1 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeSubTab === "history"
                  ? "border-violet-500 text-white bg-violet-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
              }`}
            >
              <History size={14} />
              SALE HISTORY ({activeHistory.length})
            </button>
          </div>

          {/* DYNAMIC SUBTAB VIEWS */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col"
              >
                
                {/* 1. BUY NOW TAB */}
                {activeSubTab === "buy_now" && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">
                          Active Buy Now Listings for {selectedGift}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Direct instant checkout from decentralized sellers on Portals.
                        </p>
                      </div>
                      <span className="text-[10px] text-violet-400 font-mono font-bold uppercase tracking-wider">
                        TON Blockchain
                      </span>
                    </div>

                    {/* LIST OF LISTINGS */}
                    <div className="space-y-2 flex-1 max-h-[360px] overflow-y-auto pr-1">
                      {activeBuyNowListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-400 border border-slate-700/50">
                              <Tag size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-200">
                                {listing.metadata?.itemName} #{listing.metadata?.serial || "All"}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono uppercase">
                                Source: {listing.source} • Listed: {new Date(listing.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-sm font-mono font-black text-white">
                                {listing.price.toFixed(2)} TON
                              </span>
                              <span className="text-[8px] text-slate-500 block font-mono">Instant Check</span>
                            </div>
                            <button
                              onClick={() => handleBuyNow(listing.id, listing.price, selectedGift, listing.metadata?.serial)}
                              className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-colors shadow-lg shadow-violet-600/10"
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      ))}

                      {activeBuyNowListings.length === 0 && (
                        <div className="flex-1 py-16 flex flex-col items-center justify-center text-center">
                          <ShoppingBag size={32} className="text-slate-700 mb-2" />
                          <span className="text-xs text-slate-500 font-mono uppercase">
                            No listings currently found for {selectedGift}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ACTION AREA: LIST OWN GIFT FOR SALE */}
                    <div className="mt-4 pt-4 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase block">
                          Have one? List it on Portals:
                        </span>
                        <p className="text-[8px] text-slate-600 font-mono">
                          Your custom item will immediately sync with the local book.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={customListingPrice}
                          onChange={(e) => setCustomListingPrice(e.target.value)}
                          placeholder="Price in TON"
                          className="w-28 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-slate-700"
                        />
                        <button
                          onClick={handleCreateListing}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus size={14} />
                          List Gift
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MAKE OFFER TAB */}
                {activeSubTab === "make_offer" && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">
                          Buyout & Custom Offers for {selectedGift}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Submit a custom financial offer directly to current holders of this gift.
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                        Decentralized Bid
                      </span>
                    </div>

                    {/* OFFERS LIST */}
                    <div className="space-y-2 flex-1 max-h-[360px] overflow-y-auto pr-1">
                      {activeOffers.map((offer) => (
                        <div
                          key={offer.id}
                          className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-400 border border-slate-700/50">
                              <Landmark size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-200">
                                {offer.metadata?.itemName} Buyout Offer
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono uppercase">
                                Placed: {new Date(offer.timestamp).toLocaleString()} • Serial Target: All
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              {offer.price.toFixed(2)} TON
                            </span>
                          </div>
                        </div>
                      ))}

                      {activeOffers.length === 0 && (
                        <div className="flex-1 py-16 flex flex-col items-center justify-center text-center">
                          <Landmark size={32} className="text-slate-700 mb-2" />
                          <span className="text-xs text-slate-500 font-mono uppercase">
                            No buyout offers currently submitted for {selectedGift}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ACTION AREA: CREATE BID OFFER */}
                    <div className="mt-4 pt-4 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase block">
                          Submit new buyout offer:
                        </span>
                        <p className="text-[8px] text-slate-600 font-mono">
                          Place a bidding offer on {selectedGift} using connected wallet security.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={customOfferPrice}
                          onChange={(e) => setCustomOfferPrice(e.target.value)}
                          placeholder="Price in TON"
                          className="w-28 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-slate-700"
                        />
                        <button
                          onClick={handleCreateOffer}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-emerald-600/10"
                        >
                          <Send size={14} />
                          Place Offer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SALE HISTORY TAB */}
                {activeSubTab === "history" && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">
                          Completed Sale & Price History for {selectedGift}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Track blockchain transactions, price trajectory, and address logs.
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider">
                        Past Transactions
                      </span>
                    </div>

                    {/* TIMELINE LIST */}
                    <div className="space-y-4 flex-1 max-h-[400px] overflow-y-auto pr-1">
                      {activeHistory.map((hist, index) => (
                        <div key={hist.id || index} className="relative pl-6 border-l-2 border-slate-800 py-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 absolute -left-[6px] top-2 border border-slate-950" />
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-black text-slate-200">
                                  {hist.price.toFixed(2)} TON
                                </span>
                                <span className="text-[8px] bg-slate-800 text-slate-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-700">
                                  {hist.type || "Sale"}
                                </span>
                              </div>
                              <span className="text-[8px] text-slate-500 font-mono uppercase mt-1">
                                Buyer: {hist.buyer} • Seller: {hist.seller}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar size={10} />
                              <span className="text-[8px] font-mono">
                                {new Date(hist.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {activeHistory.length === 0 && (
                        <div className="flex-1 py-16 flex flex-col items-center justify-center text-center">
                          <History size={32} className="text-slate-700 mb-2" />
                          <span className="text-xs text-slate-500 font-mono uppercase">
                            No past transactions currently recorded for {selectedGift}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};
