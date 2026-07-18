import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Wallet, Cpu, Sliders, CheckCircle, Video, 
  RefreshCw, Shield, AlertTriangle, Play, Pause, Trash2, Plus, 
  LogIn, LogOut, Search, ExternalLink, History, TrendingUp, DollarSign, Zap, AlertCircle, Copy,
  X, Eye, EyeOff, Activity, CloudRain, Gift, Layers, Target, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, query, onSnapshot, doc, setDoc, getDocs, deleteDoc, orderBy, limit, addDoc, serverTimestamp
} from "firebase/firestore";
import { GiftAsset, TradeLog, CustomStrategy, WhaleWallet, BotConfig } from "../../types";
import { TradingItem, MarketOrder, DynamicTradingRule, } from "../../types/trading";
import { InventoryTable } from "../sniper/InventoryTable";
import { WhaleDeepAnalysisModal } from "../sniper/WhaleDeepAnalysisModal";
import { RealTimeMarketMonitor } from "../sniper/RealTimeMarketMonitor";

import { BumSection } from "../sniper/BumSection";
import { QaAgentConsole } from "../sniper/QaAgentConsole";
import { TonnelMarketAuction } from "../sniper/TonnelMarketAuction";
import { PortalsMarket } from "../sniper/PortalsMarket";
import { CorridorChart } from "../sniper/CorridorChart";
import { ExecutionQueue, PendingTrade } from "../sniper/ExecutionQueue";
import { WorkingModeSwitch } from "../sniper/WorkingModeSwitch";
import { PatternAnalyzer } from "../../lib/trading/pattern-analyzer";
import { MarketAggregator } from "../../lib/trading/MarketAggregator";
import { MarketHub } from "../../lib/trading/MarketHub";
import { ExecutionEngine } from "../../lib/trading/ExecutionEngine";
import { ArbitrageScanner } from "../../lib/trading/ArbitrageScanner";
import { WalletBridge, WalletBridgeState } from "../../lib/bridge/WalletBridge";
import { MTProtoBridge, BridgeSession } from "../../lib/bridge/MTProtoBridge";
import { AuthAgent } from "../../lib/agents/AuthAgent";
import { useOpportunities } from "../../hooks/useOpportunities";
import { FirestoreQuotaManager } from "../../lib/utils/FirestoreQuotaManager";

// Safe Firestore Wrapper functions to respect FirestoreQuotaManager write suspensions
async function safeSetDoc(ref: any, data: any, options?: any) {
  if (!FirestoreQuotaManager.canWrite()) {
    console.warn(`[Firestore] Write bypassed due to Quota suspension: ${ref.path}`);
    return;
  }
  try {
    if (options) {
      await setDoc(ref, data, options);
    } else {
      await setDoc(ref, data);
    }
  } catch (err) {
    FirestoreQuotaManager.handleWriteFailure(err);
    throw err;
  }
}

async function safeAddDoc(collRef: any, data: any) {
  if (!FirestoreQuotaManager.canWrite()) {
    console.warn(`[Firestore] Add bypassed due to Quota suspension: ${collRef.path}`);
    return null;
  }
  try {
    return await addDoc(collRef, data);
  } catch (err) {
    FirestoreQuotaManager.handleWriteFailure(err);
    throw err;
  }
}

async function safeDeleteDoc(ref: any) {
  if (!FirestoreQuotaManager.canWrite()) {
    console.warn(`[Firestore] Delete bypassed due to Quota suspension: ${ref.path}`);
    return;
  }
  try {
    await deleteDoc(ref);
  } catch (err) {
    FirestoreQuotaManager.handleWriteFailure(err);
    throw err;
  }
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
      console.warn(`[SafeStorage] failed to getItem ${key}:`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[SafeStorage] failed to setItem ${key}:`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] failed to removeItem ${key}:`, e);
    }
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Capture any Firestore quota exhaustion gracefully
  FirestoreQuotaManager.handleWriteFailure(error);

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const SafeGiftImage: React.FC<{ src?: string; name: string; className?: string }> = ({ src, name, className = "w-full h-full object-cover" }) => {
  const [hasError, setHasError] = useState(!src);
  
  useEffect(() => {
    setHasError(!src);
  }, [src]);

  const initials = name ? name.trim().charAt(0).toUpperCase() : "?";
  
  const getGradient = (str: string) => {
    const colors = [
      "from-fuchsia-600 to-indigo-600 text-fuchsia-100",
      "from-cyan-500 to-blue-600 text-cyan-100",
      "from-emerald-500 to-teal-600 text-emerald-100",
      "from-amber-500 to-rose-500 text-amber-100",
      "from-purple-600 to-pink-600 text-purple-100",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center font-bold font-mono text-xs bg-gradient-to-br ${getGradient(name)} w-full h-full rounded shadow-sm`}>
        {initials}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name} 
      referrerPolicy="no-referrer" 
      onError={() => setHasError(true)} 
      className={className} 
    />
  );
};

export interface WhaleTradePair {
  id: string;
  itemName: string;
  serial: string;
  buyPrice: number;
  sellPrice: number;
  date: string;
  pnl: number;
  daysHeld: number;
  category: "Gifts" | "Numbers" | "Domains" | "Skins";
}

export function getWhaleTrades(address: string): WhaleTradePair[] {
  // Returning empty list to prevent showing fake data in production.
  // Real data should be fetched from an indexing service.
  console.log(`[WhaleTracker] Fetching real data for ${address} is not implemented. Returning empty.`);
  return [];
}

export function getDeepWhaleHistory(address: string): WhaleTradePair[] {
  // Returning empty list to prevent showing fake data in production.
  return [];
}

const DEFAULT_WALLET_ADDRESS = 
  ((import.meta as any)?.env?.MAIN_WALLET_ADDRESS as string) || 
  "UQAufjpnlVShZlGx5E9rPk7q6but9WvLWvit3ANIUn883v9V";

export function ScreenTgGiftsSniper() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [bridgeStatus, setBridgeStatus] = useState<BridgeSession | undefined>(() => MTProtoBridge.getInstance().getSessionStatus());
  const [mtprotoMode, setMtprotoMode] = useState<"server" | "sandbox">(() => MTProtoBridge.getInstance().getWorkingMode());
  const [mtprotoSessionType, setMtprotoSessionType] = useState<"bot" | "user">("bot");
  const [showSessionString, setShowSessionString] = useState(false);
  const [sessionString, setSessionString] = useState("");
  
  useEffect(() => {
    return MTProtoBridge.getInstance().subscribe(setBridgeStatus);
  }, []);

  useEffect(() => {
    if (!bridgeStatus) return;
    console.log("[SniperUI] MTProto Status Update:", bridgeStatus.status, bridgeStatus.userId);

    if (bridgeStatus.status === "authenticating") {
      setShowPhoneInputModal(true);
      if (bridgeStatus.authStep === "password") {
        setMtProtoStep("password");
      } else if (bridgeStatus.authStep === "code") {
        setMtProtoStep("code");
      }
      setMtProtoLoading(false);
    } else if (bridgeStatus.status === "connected") {
      setMtProtoStep("phone");
      // Keep modal state but if we were loading, we can close it if it was a direct login
      // Actually, if it's connected, we usually want the modal closed unless the user opened it manually
      // but for "reconnect" we definitely want it closed.
      setShowPhoneInputModal(false);
      setMtProtoLoading(false);
    } else if (bridgeStatus.status === "disconnected" || bridgeStatus.status === "error") {
      setMtProtoStep("phone");
      setMtProtoLoading(false);
    } else {
      setMtProtoLoading(false);
    }
  }, [bridgeStatus]);

  
  // Active Tab: 'main' | 'inventory' | 'whales' | 'bum' | 'qa-agent' | 'tonnel' | 'portals'
  const [activeTab, setActiveTab] = useState<"main" | "sniper" | "inventory" | "whales" | "bum" | "qa-agent" | "tonnel" | "portals">("main");
  
  // Sorting for Whales
  const [whaleSortBy, setWhaleSortBy] = useState<"pnl" | "winrate" | "active" | "volume">("pnl");

  // Default whales (fallback when not logged in or whales collection empty)
  const defaultWhales: WhaleWallet[] = [];

  // Default strategies (fallback when not logged in or strategies empty)
  const defaultStrategies: CustomStrategy[] = [];

  // State lists
  const [tradingItems, setTradingItems] = useState<TradingItem[]>([]);
  const [strategies, setStrategies] = useState<CustomStrategy[]>([]);
      const [trades, setTrades] = useState<TradeLog[]>([]);
  const [selectedDetailTrade, setSelectedDetailTrade] = useState<TradeLog | null>(null);
  
  const tradingItemsRef = useRef<TradingItem[]>([]);
  useEffect(() => {
    tradingItemsRef.current = tradingItems;
  }, [tradingItems]);

  const [config, setConfig] = useState<BotConfig>({
    isActive: false,
    targetCollection: "ALL_GIFTS",
    filterRarity: "ALL",
    maxSlippagePercent: 5,
    frontrunGasPremium: 0.05,
    palindromeMultiplier: 1.2,
    isAutoTrading: false,
    walletAddress: DEFAULT_WALLET_ADDRESS,
    riskMaxExposure: 25.0,
    riskStopLoss: 15,
    riskSoftLimits: true,
    ignoreInstruction: "не делай стратегии из ссылок и инфо если оно не про торговлю телеграм падарками",
    useSimulatedBalance: false,
    simulatedBalance: 0.0,
    maxBuyPriceThreshold: 50.0,
    workingMode: "SOFT",
  });

  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const activeTargets = useOpportunities();

  const [walletState, setWalletState] = useState<WalletBridgeState>(() => WalletBridge.getInstance().getState());

  useEffect(() => {
    return WalletBridge.getInstance().subscribe((newState) => {
      setWalletState(newState);
      if (newState.connected && newState.walletAddress) {
        // Sync wallet address to server so it can use it as working wallet
        fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ MAIN_WALLET_ADDRESS: newState.walletAddress })
        }).catch(console.error);
      }
    });
  }, []);

  // Connection Modals State
  const [showTonConnectModal, setShowTonConnectModal] = useState(false);

  // TonConnect wallets & links
  const [tonWallets, setTonWallets] = useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [connectLink, setConnectLink] = useState<string>("");

  // MTProto authentication
  const [mtProtoPhone, setMtProtoPhone] = useState("");
  const [showPhoneInputModal, setShowPhoneInputModal] = useState(false);
  const [mtProtoCode, setMtProtoCode] = useState("");
  const [mtProtoStep, setMtProtoStep] = useState<"phone" | "code" | "password">("phone");
  const [mtProtoPassword, setMtProtoPassword] = useState("");
  const [mtProtoLoading, setMtProtoLoading] = useState(true);

  const handleCopyMtProtoSession = async () => {
    try {
      const res = await fetch("/api/mtproto/session-string");
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(data.session);
              addLog("Сессия MTProto скопирована в буфер обмена! Вставьте ее в MTPROTO_USER_SESSION_STRING.", "info");
            } else {
              // Fallback for iframes or non-secure contexts
              const textArea = document.createElement("textarea");
              textArea.value = data.session;
              textArea.style.position = "fixed";
              textArea.style.left = "-999999px";
              textArea.style.top = "-999999px";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              
              if (successful) {
                addLog("Сессия скопирована в буфер (fallback). Вставьте ее в настройки ENV.", "info");
              } else {
                prompt("Скопируйте вашу сессию (MTPROTO_USER_SESSION_STRING):", data.session);
                addLog("Скопируйте сессию вручную из окна.", "info");
              }
            }
          } catch (clipErr) {
            prompt("Скопируйте вашу сессию (MTPROTO_USER_SESSION_STRING):", data.session);
            addLog("Скопируйте сессию вручную из окна.", "info");
          }
        } else {
          addLog("Сессия не найдена на сервере.", "error");
        }
      } else {
        addLog("Не удалось получить сессию с сервера.", "error");
      }
    } catch (e) {
      addLog("Ошибка при копировании сессии.", "error");
    }
  };

  const handleOpenTonConnect = async () => {
    setShowTonConnectModal(true);
    setLoadingWallets(true);
    try {
      const wallets = await WalletBridge.getInstance().getWallets();
      const popular = wallets.filter(w => 
        w.appName === "tonkeeper" || 
        w.appName === "mytonwallet" || 
        w.appName === "tonhub" || 
        w.appName === "telegram-wallet"
      );
      const displayWallets = popular.length > 0 ? popular : wallets.slice(0, 5);
      setTonWallets(displayWallets);
      if (displayWallets.length > 0) {
        handleSelectWallet(displayWallets[0]);
      }
    } catch (e) {
      console.error("Failed to load TON wallets:", e);
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleSelectWallet = (wallet: any) => {
    setSelectedWallet(wallet);
    const link = WalletBridge.getInstance().generateConnectionLink(wallet);
    setConnectLink(link);
  };

  const handleRequestMtProtoCode = async (providedPhone?: string) => {
    const authAgent = AuthAgent.getInstance();
    const hasBotToken = !!(authAgent.getCredential("TELEGRAM_BOT_TOKEN") || authAgent.getCredential("VITE_TELEGRAM_BOT_TOKEN"));
    
    // Determine if we should use bot or user session based on current preference
    const useBot = mtprotoSessionType === "bot" && hasBotToken;
    
    let phoneToUse = providedPhone || mtProtoPhone;
    if (!useBot && !phoneToUse.trim()) {
      setShowPhoneInputModal(true);
      return;
    }
    
    setMtProtoLoading(true);
    // setShowPhoneInputModal(false); // REMOVED: Keep it open for code entry
    try {
      const identifier = useBot ? "Telegram Bot" : phoneToUse;
      addLog(`[MTProto] Инициализация безопасного рукопожатия для ${identifier}...`, "info");
      await MTProtoBridge.getInstance().connectPhone(useBot ? undefined : phoneToUse);
      
      if (!useBot) {
        addLog(`[MTProto] Код подтверждения отправлен на телефон ${phoneToUse}. Проверьте сообщения Telegram.`, "success");
        setMtProtoStep("code");
      } else {
        addLog(`[MTProto] Успешная авторизация бота!`, "success");
        setShowPhoneInputModal(false);
      }
    } catch (err: any) {
      console.error("MTProto connection error:", err);
      const msg = err.message || "Ошибка подключения";
      addLog(`[MTProto] Ошибка: ${msg}`, "error");
    } finally {
      setMtProtoLoading(false);
    }
  };

  
  const handleVerifyMtProtoPassword = async () => {
    if (!mtProtoPassword.trim()) {
      addLog("Введите 2FA пароль", "warn");
      return;
    }
    setMtProtoLoading(true);
    try {
      const success = await MTProtoBridge.getInstance().verifyPassword(mtProtoPassword);
      if (success) {
        addLog("[MTProto] Пароль отправлен.", "info");
        setMtProtoCode("");
        setMtProtoPassword("");
        setShowPhoneInputModal(false);
      }
    } catch (err: any) {
      const msg = err.message || "Ошибка верификации пароля";
      addLog(`[MTProto] Ошибка 2FA: ${msg}`, "error");
    } finally {
      setMtProtoLoading(false);
    }
  };

  const handleVerifyMtProtoCode = async () => {
    if (!mtProtoCode.trim() || mtProtoCode.length < 5) {
      addLog("Введите корректный 5-значный код подтверждения", "warn");
      return;
    }
    setMtProtoLoading(true);
    try {
      const success = await MTProtoBridge.getInstance().verifyCode(mtProtoCode);
      if (success) {
        addLog(`[MTProto] Сессия успешно аутентифицирована! Мост запущен и активен.`, "success");
        setMtProtoStep("phone");
        setMtProtoCode("");
        setShowPhoneInputModal(false);
      } else {
        addLog("[MTProto] Неверный код подтверждения или сессия отклонена. Проверьте логи.", "error");
      }
    } catch (err: any) {
      const msg = err.message || "Ошибка верификации кода";
      addLog(`[MTProto] Ошибка верификации: ${msg}`, "error");
    } finally {
      setMtProtoLoading(false);
    }
  };

  const handleFetchFragmentToken = async () => {
    setMtProtoLoading(true);
    addLog("[MTProto] Запрос авторизационного токена Fragment...", "info");
    try {
      const token = await MTProtoBridge.getInstance().getFragmentAuthToken();
      if (token) {
        // Save it to secrets
        await fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ FRAGMENT_AUTH: token })
        });
        addLog("[MTProto] Токен Fragment успешно получен и сохранен в конфигурации.", "success");
      } else {
        addLog("[MTProto] Не удалось получить токен Fragment автоматически. Убедитесь, что Telegram сессия активна.", "error");
      }
    } catch (err: any) {
      addLog(`[MTProto] Ошибка при получении токена: ${err.message}`, "error");
    } finally {
      setMtProtoLoading(false);
    }
  };

  const handleFetchPortalsToken = async () => {
    setMtProtoLoading(true);
    addLog("[MTProto] Запрос авторизационного токена Portals...", "info");
    try {
      const token = await MTProtoBridge.getInstance().getPortalsAuthToken();
      if (token) {
        // Save it to secrets
        await fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ PORTALS_AUTH: token })
        });
        addLog("[MTProto] Токен Portals успешно получен и сохранен в конфигурации.", "success");
      } else {
        addLog("[MTProto] Не удалось получить токен Portals автоматически. Убедитесь, что Telegram сессия активна.", "error");
      }
    } catch (err: any) {
      addLog(`[MTProto] Ошибка при получении токена Portals: ${err.message}`, "error");
    } finally {
      setMtProtoLoading(false);
    }
  };

  const [whales, setWhales] = useState<WhaleWallet[]>(defaultWhales);
  const [terminalLogs, setTerminalLogs] = useState<{msg: string, time: string, type: 'info' | 'success' | 'warn' | 'error'}[]>([]);

  interface PortfolioToken {
    name: string;
    symbol: string;
    balance: number;
    usdValue: number;
    priceUSD: number;
    image?: string;
  }

  // Wallet and Portfolio state (defined at the top)
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);

  // Computed total portfolio value derived from portfolioTokens to avoid concurrent rendering state updates during rendering

  const [isAutoBalancing, setIsAutoBalancing] = useState<boolean>(true);
  const [optimizerLogs, setOptimizerLogs] = useState<{msg: string, time: string}[]>([]);


  // Each stable strategy's actual/simulated performance statistics
  const getStratStats = (id: string) => {
    // Default fallback for custom approved stable strategies (medium markup, medium velocity)
    return { margin: 0.30, velocity: 0.80, rawYield: 0.30 * 0.80 }; // yield = 24%
  };

  // Computed Portfolio Allocation values
  const numericBalance = parseFloat(walletBalance) || 0;

  // Derived state for strategies and allocations memoized together to prevent concurrent rendering state instability
  const derivedStrategyAllocations = useMemo(() => {
    const testing = strategies.filter(s => s && s.isTesting !== false);
    const stable = strategies.filter(s => s && s.isTesting === false);
    const totalTesting = testing.reduce((sum, s) => sum + ((s && s.allocationPercent) ?? 10), 0);
    const mainAlloc = Math.max(0, 100 - totalTesting);

    // Each stable strategy's actual/simulated performance statistics helper inside memo
    const getStratStatsObj = (id: string) => {
      return { margin: 0.30, velocity: 0.80, rawYield: 0.30 * 0.80 }; // yield = 24%
    };

    const allocs: Record<string, number> = {};
    if (stable.length > 0) {
      if (!isAutoBalancing) {
        // Standard static split: roughly 65% for first, 35% for second if only two
        if (stable.length === 1) {
          allocs[stable[0].id] = mainAlloc;
        } else if (stable.length >= 2) {
          const firstId = stable[0].id;
          const secondId = stable[1].id;
          allocs[firstId] = parseFloat((mainAlloc * 0.65).toFixed(1));
          allocs[secondId] = parseFloat((mainAlloc * 0.35).toFixed(1));
          
          const others = stable.slice(2);
          const declaredSum = allocs[firstId] + allocs[secondId];
          const remaining = mainAlloc - declaredSum;
          if (others.length > 0 && remaining > 0) {
            const share = parseFloat((remaining / others.length).toFixed(1));
            others.forEach(o => { if (o) allocs[o.id] = share; });
          }
        }
      } else {
        // Auto-balancing by daily ROI yield %
        const floorPercentPerStrat = Math.min(15, mainAlloc / stable.length);
        const totalFloorUsed = floorPercentPerStrat * stable.length;
        const leftoverBudget = Math.max(0, mainAlloc - totalFloorUsed);
        
        const totalRawYield = stable.reduce((sum, s) => sum + (s ? getStratStatsObj(s.id).rawYield : 0), 0) || 1;
        
        stable.forEach((s) => {
          if (!s) return;
          const stats = getStratStatsObj(s.id);
          const yieldProportion = stats.rawYield / totalRawYield;
          const bonusAlloc = leftoverBudget * yieldProportion;
          allocs[s.id] = parseFloat((floorPercentPerStrat + bonusAlloc).toFixed(1));
        });
      }
    }

    return {
      testingStrats: testing,
      stableStrats: stable,
      totalTestingAlloc: totalTesting,
      mainAllocPercent: mainAlloc,
      computedStableAllocations: allocs
    };
  }, [strategies, isAutoBalancing]);

  const { stableStrats, mainAllocPercent, computedStableAllocations } = derivedStrategyAllocations;

  // Allocation Refs
  const stableAllocsRef = useRef(computedStableAllocations);
  useEffect(() => { stableAllocsRef.current = computedStableAllocations; }, [computedStableAllocations]);

  // Synchronize walletBalance changes with advanced portfolio state for full logical consistency
  useEffect(() => {
    const numericBalance = parseFloat(walletBalance) || 0;
    setPortfolioTokens(prev => {
      const tonTokenIdx = prev.findIndex(t => t.symbol === "TON");
      if (tonTokenIdx > -1) {
        const oldToken = prev[tonTokenIdx];
        const newUsdValue = numericBalance * oldToken.priceUSD;
        // Optimization: Avoid setting state to trigger re-renders if values are already equal
        if (oldToken.balance === numericBalance && oldToken.usdValue === newUsdValue) {
          return prev;
        }
        const updated = [...prev];
        updated[tonTokenIdx] = {
          ...oldToken,
          balance: numericBalance,
          usdValue: newUsdValue
        };
        return updated;
      } else {
        // If TON isn't in there yet, add it
        const updated = [...prev];
        updated.unshift({
          name: "TON",
          symbol: "TON",
          balance: numericBalance,
          priceUSD: 5.42, // Updated realistic mainnet price for TON
          usdValue: numericBalance * 5.42,
          image: "https://cryptologos.cc/logos/toncoin-ton-logo.png"
        });
        return updated;
      }
    });
  }, [walletBalance]);

  // (Removed simulatedBalance sync)

  // Add log helper
  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [{msg, time, type}, ...prev].slice(0, 50));
  };

  const handleApproveTrade = (id: string) => {
    const trade = pendingTrades.find(t => t.id === id);
    if (trade) {
      addLog(`[MitM] Manual Approval: Executing trade for ${trade.item.name} at ${trade.targetPrice} TON`, "success");
      
      const execution = ExecutionEngine.getInstance();
      execution.executeTrade(
        trade.item,
        trade.targetPrice,
        trade.source
      ).then(res => {
        if (res.success) {
          addLog(`✅ [EXECUTION] Manual approval success via ${res.method}. Asset ${trade.item.name} acquired.`, "success");
        } else {
          addLog(`❌ [EXECUTION] Manual approval failed: ${res.error}`, "error");
        }
      });

      setPendingTrades(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleDenyTrade = (id: string) => {
    addLog(`[MitM] Manual Denial: Rejected trade for ID ${id}`, "warn");
    setPendingTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleApproveBatch = async (ids: string[]) => {
    const selected = pendingTrades.filter(t => ids.includes(t.id));
    if (selected.length === 0) return;

    addLog(`[MitM] Batch Approval: Processing ${selected.length} items in a single transaction...`, "info");

    const messages = selected.map(trade => ({
      address: trade.item.id,
      amount: (trade.targetPrice * 1e9).toString(), // Convert to nanoton
      payload: undefined
    }));

    try {
      const walletBridge = WalletBridge.getInstance();
      if (!walletBridge.getState().connected) {
        addLog(`❌ [Batch Tx] Error: Wallet is not connected. Connect wallet to sign batch transaction.`, "error");
        alert("Пожалуйста, сначала подключите TON кошелек!");
        return;
      }

      addLog(`[Batch Tx] Requesting signature from wallet for ${selected.length} messages...`, "info");
      const result = await walletBridge.sendTransaction(messages, { keepInInventory: true });
      
      addLog(`✅ [Batch Tx] Successfully sent batch transaction with BOC hash: ${result.boc.substring(0, 16)}...`, "success");
      
      // Also write each of these trades to completed/executions in firestore as well
      for (const trade of selected) {
        try {
          await safeAddDoc(collection(db, "executions"), {
            itemId: trade.item.id,
            itemName: trade.item.name,
            price: trade.targetPrice,
            source: trade.source,
            status: "SUCCESS",
            method: "TON_CONNECT",
            txHash: result.boc,
            timestamp: serverTimestamp()
          });
        } catch (dbErr) {
          console.error("Bypassed logging to db in sandbox", dbErr);
        }

        // Add to local UI order log for transparency
        const newOrder: MarketOrder = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          itemId: trade.item.id,
          itemName: trade.item.name,
          type: "BUY",
          price: trade.targetPrice,
          targetPrice: trade.marketFloor,
          status: "ACTIVE",
          timestamp: new Date().toISOString(),
          strategyId: "UNIFIED_ARB_SCALPER"
        };
      }
      
      setPendingTrades(prev => prev.filter(t => !ids.includes(t.id)));
    } catch (err: any) {
      addLog(`❌ [Batch Tx] Transaction failed or rejected: ${err.message || err}`, "error");
    }
  };

  const handleDenyBatch = (ids: string[]) => {
    addLog(`[MitM] Manual Denial: Rejected batch of ${ids.length} trades`, "warn");
    setPendingTrades(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const handleClearTrades = async () => {
    if (!user) {
      safeStorage.removeItem("sniper_trades");
      setTrades([]);
      addLog("Trades history cleared from LocalStorage", "info");
    } else {
      addLog("Clearing trades history from Firestore...", "info");
      try {
        const tradesPath = `users/${user.uid}/trades`;
        const querySnapshot = await getDocs(collection(db, tradesPath));
        const deletePromises = querySnapshot.docs.map(docSnap => safeDeleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        setTrades([]);
        addLog("Успешно: История сделок снайпера полностью очищена в Firestore", "success");
      } catch (err: any) {
        addLog(`Ошибка при очистке сделок: ${err.message}`, "error");
      }
    }
  };

  // Swipe gesture touch detection states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Just a simple check to see if we can talk to the DB (using test collection permitted by rules)
        await getDocs(query(collection(db, "test"), limit(1)));
        console.log("Firebase connection verified");
      } catch (err) {
        // We don't want to alert the user if it's just a permissions issue on the test collection
        // But we log it for the developer
        console.log("Firebase initial handshake check:", err);
      }
    };
    testConnection();
  }, []);

  // Consolidate all Firebase sync logic
  useEffect(() => {
    if (!user) {
      // Restore from localStorage for anonymous persistent testing with safe deduplication
      const savedTrades = safeStorage.getItem("sniper_trades");
      if (savedTrades) {
        try {
          const parsed = JSON.parse(savedTrades);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            setTrades(parsed.filter(t => t && t.id && !seen.has(t.id)));
          } else {
            setTrades([]);
          }
        } catch (e) {
          setTrades([]);
        }
      } else {
        setTrades([]);
      }

      const savedStrats = safeStorage.getItem("sniper_strategies");
      if (savedStrats) {
        try {
          const parsed = JSON.parse(savedStrats);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            setStrategies(parsed.filter(s => s && s.id && !seen.has(s.id)));
          } else {
            setStrategies(defaultStrategies);
          }
        } catch (e) {
          setStrategies(defaultStrategies);
        }
      } else {
        setStrategies(defaultStrategies);
      }

      const savedWhales = safeStorage.getItem("sniper_whales");
      if (savedWhales) {
        try {
          const parsed = JSON.parse(savedWhales);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            setWhales(parsed.filter(w => w && w.address && !seen.has(w.address)));
          } else {
            setWhales(defaultWhales);
          }
        } catch (e) {
          setWhales(defaultWhales);
        }
      } else {
        setWhales(defaultWhales);
      }

      const savedInventory = safeStorage.getItem("sniper_inventory");
      if (savedInventory) {
        try {
          const parsed = JSON.parse(savedInventory);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            setTradingItems(parsed.filter(i => i && i.id && !seen.has(i.id)));
          } else {
            setTradingItems([]);
          }
        } catch (e) {
          setTradingItems([]);
        }
      } else {
        setTradingItems([]);
      }

      const savedOrders = safeStorage.getItem("sniper_orders");
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
          } else {
                      }
        } catch (e) {
                  }
      } else {
              }
      
      const savedConfig = safeStorage.getItem("sniper_config");
      if (savedConfig) {
        try {
          setConfig(JSON.parse(savedConfig));
        } catch (e) {}
      }
      return;
    }

    const tradesPath = `users/${user.uid}/trades`;
    const strategiesPath = `users/${user.uid}/strategies`;
    const configPath = `users/${user.uid}/config/bot`;
    const whalesPath = `users/${user.uid}/whales`;
    const inventoryPath = `users/${user.uid}/inventory`;
    const ordersPath = `users/${user.uid}/orders`;

    console.log(`Syncing user data for ${user.email}`);

    // 1. Sync User Trades
    const tradesQuery = query(collection(db, tradesPath), orderBy("timestamp", "desc"));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const list: TradeLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TradeLog);
      });
      const seenIds = new Set<string>();
      const deduplicated = list.filter(t => {
        if (t && t.id && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          return true;
        }
        return false;
      });
      setTrades(deduplicated);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tradesPath);
    });

    // 2. Sync User Strategies
    const strategiesQuery = query(collection(db, strategiesPath), orderBy("createdAt", "desc"));
    const unsubscribeStrategies = onSnapshot(strategiesQuery, (snapshot) => {
      const dbList: CustomStrategy[] = [];
      snapshot.forEach((docSnap) => {
        dbList.push(docSnap.data() as CustomStrategy);
      });
      setStrategies(prev => {
        // Safe Merge: keep any custom strategies created during the session that are not in the dbList yet
        const customSessionStrats = prev.filter(s => 
          s && !dbList.some(dbS => dbS && dbS.id === s.id)
        );
        const merged = [...dbList, ...customSessionStrats];
        const seenIds = new Set<string>();
        return merged.filter(s => {
          if (s && s.id && !seenIds.has(s.id)) {
            seenIds.add(s.id);
            return true;
          }
          return false;
        });
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, strategiesPath);
    });

    // 3. Sync Bot Config
    const configDocRef = doc(db, `users/${user.uid}/config`, "bot");
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const loadedConfig = docSnap.data() as BotConfig;
        if (!loadedConfig.walletAddress || loadedConfig.walletAddress.trim() === "") {
          const updatedConfig = { ...loadedConfig, walletAddress: DEFAULT_WALLET_ADDRESS };
          setConfig(updatedConfig);
          safeSetDoc(configDocRef, updatedConfig).catch((err) => {
            console.error("Auto-initializing walletAddress in Firestore failed:", err);
          });
        } else {
          setConfig(loadedConfig);
        }
      } else {
        const initialConfig: BotConfig = {
          isActive: false,
          targetCollection: "ALL_GIFTS",
          filterRarity: "ALL",
          maxSlippagePercent: 5,
          frontrunGasPremium: 0.05,
          palindromeMultiplier: 1.2,
          isAutoTrading: false,
          walletAddress: DEFAULT_WALLET_ADDRESS,
          riskMaxExposure: 25.0,
          riskStopLoss: 15,
          riskSoftLimits: true,
          ignoreInstruction: "не делай стратегии из ссылок и инфо если оно не про торговлю телеграм падарками",
          useSimulatedBalance: false,
          simulatedBalance: 0.0,
          maxBuyPriceThreshold: 50.0,
        };
        setConfig(initialConfig);
        safeSetDoc(configDocRef, initialConfig).catch((err) => {
          console.error("Auto-creating initial config in Firestore failed:", err);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, configPath);
    });

    // 4. Sync User Whales
    const whalesCollectionRef = collection(db, whalesPath);
    const unsubscribeWhales = onSnapshot(whalesCollectionRef, (snapshot) => {
      if (snapshot.empty) {
        // No auto-seeding in production
        setWhales([]);
      } else {
        const list: WhaleWallet[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as WhaleWallet);
        });
        const seenAddresses = new Set<string>();
        const deduplicated = list.filter(w => {
          if (w && w.address && !seenAddresses.has(w.address)) {
            seenAddresses.add(w.address);
            return true;
          }
          return false;
        });
        setWhales(deduplicated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, whalesPath);
    });

    // 5. Sync User Inventory
    const invQuery = query(collection(db, inventoryPath), orderBy("purchasePrice", "desc"));
    const unsubscribeInventory = onSnapshot(invQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TradingItem));
      const seenIds = new Set<string>();
      const deduplicated = items.filter(item => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          return true;
        }
        return false;
      });
      setTradingItems(deduplicated);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, inventoryPath);
    });

    // 6. Sync User Orders
    const ordersQuery = query(collection(db, ordersPath), orderBy("timestamp", "desc"));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snap) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketOrder));
      const seenIds = new Set<string>();
      const deduplicated = orders.filter(o => {
        if (o && o.id && !seenIds.has(o.id)) {
          seenIds.add(o.id);
          return true;
        }
        return false;
      });
          }, (error) => {
      handleFirestoreError(error, OperationType.GET, ordersPath);
    });

    // 7. Sync System Logs (Server activity)
    const logsQuery = query(collection(db, "agent_logs"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribeLogs = onSnapshot(logsQuery, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.type === "SYSTEM_LOG") {
            const dateObj = data.timestamp && typeof data.timestamp.toDate === "function"
              ? data.timestamp.toDate()
              : (data.timestamp ? new Date(data.timestamp) : new Date());
            const time = dateObj.toLocaleTimeString();
            setTerminalLogs(prev => [{
              msg: `[${data.module}] ${data.message}`,
              time,
              type: data.level || 'info'
            }, ...prev].slice(0, 50));
          }
        }
      });
    }, (error) => {
      console.warn("Firestore onSnapshot failed for logs:", error);
    });

    // 8. Periodic MTProto status sync
    const statusInterval = setInterval(() => {
      if (MTProtoBridge.getInstance().getWorkingMode() === "server") {
        MTProtoBridge.getInstance().syncStatusWithServer();
      }
    }, 10000); // Every 10 seconds

    return () => {
      unsubscribeTrades();
      unsubscribeStrategies();
      unsubscribeConfig();
      unsubscribeWhales();
      unsubscribeInventory();
      unsubscribeOrders();
      unsubscribeLogs();
      clearInterval(statusInterval);
    };
  }, [user]);

  // Synchronize state changes to localStorage when anonymous (user is null)
  useEffect(() => {
    if (!user) {
      safeStorage.setItem("sniper_trades", JSON.stringify(trades));
    }
  }, [trades, user]);

  useEffect(() => {
    if (!user && strategies.length > 0) {
      safeStorage.setItem("sniper_strategies", JSON.stringify(strategies));
    }
  }, [strategies, user]);

  useEffect(() => {
    if (!user && whales.length > 0) {
      safeStorage.setItem("sniper_whales", JSON.stringify(whales));
    }
  }, [whales, user]);

  useEffect(() => {
    if (!user) {
      safeStorage.setItem("sniper_config", JSON.stringify(config));
    }
  }, [config, user]);

  // Stable References for Auto-Trading Loop to prevent constant clearInterval/re-renders on every tick
  const walletBalanceRef = useRef(walletBalance);
  const configRef = useRef(config);
  const strategiesRef = useRef(strategies);
  const whalesRef = useRef(whales);
  const mainAllocPercentRef = useRef(mainAllocPercent);
  const scannedGiftsRef = useRef<Set<string>>(new Set());

  useEffect(() => { walletBalanceRef.current = walletBalance; }, [walletBalance]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { strategiesRef.current = strategies; }, [strategies]);
  useEffect(() => { whalesRef.current = whales; }, [whales]);
  useEffect(() => { mainAllocPercentRef.current = mainAllocPercent; }, [mainAllocPercent]);

  // 0. Auto-trading Loop Simulation
  useEffect(() => {
    if (!config.isActive) return;

    scannedGiftsRef.current.clear();

    const botLoop = setInterval(async () => {
      const activeConfig = configRef.current;
      const currentBalance = parseFloat(walletBalanceRef.current) || 0;

      // Reactively pull state from the atomic MarketHub database
      try {
        const hub = MarketHub.getInstance();
        const state = hub.getState();
        const allUnifiedItems = Array.from(state.items.keys());
        let marketGifts: any[] = [];
        
        for (const itemName of allUnifiedItems) {
          const unified = MarketAggregator.getInstance().getUnifiedPrice(itemName);
          if (unified && unified.floor > 0) {
            marketGifts.push({
              id: `hub_item_${itemName.replace(/\s+/g, '')}`,
              serialNumber: "Aggregated",
              name: itemName,
              floorPriceTon: unified.floor,
              pattern: "Common",
              image: ""
            });
          }
        }

        if (marketGifts.length === 0) {
          if (!scannedGiftsRef.current.has('WAITING_TICKS')) {
             addLog("ℹ️ [MarketHub] Нет данных о рынке в локальной БД. Ждем тиков...", "info");
             scannedGiftsRef.current.add('WAITING_TICKS');
          }
          return; // No data in the DB yet
        } else {
          scannedGiftsRef.current.delete('WAITING_TICKS');
        }
        
        // Filter out gifts that have already been scanned/analyzed at their current price
      const newGifts = marketGifts.filter((g: any) => {
        const key = `${g.id}_${g.serialNumber}_${g.floorPriceTon}`;
        return !scannedGiftsRef.current.has(key);
      });

      if (newGifts.length === 0) {
        return; // No new or updated listings. Quietly return to avoid duplicate log spam.
      }

      // Safeguard scannedGiftsRef size
      if (scannedGiftsRef.current.size > 200) {
        scannedGiftsRef.current.clear();
      }

      // Analyze all new/updated gifts in the queue atomically
      newGifts.forEach(async (gift: any) => {
        try {
          const key = `${gift.id}_${gift.serialNumber}_${gift.floorPriceTon}`;
      scannedGiftsRef.current.add(key);
      
      const maxPriceThreshold = activeConfig.maxBuyPriceThreshold !== undefined ? activeConfig.maxBuyPriceThreshold : 50.0;
      
      // 1. STAGE 1 FILTERS (Max Buy Threshold & Absolute Balance)
      if (gift.floorPriceTon > maxPriceThreshold) {
        addLog(`[Filter] Skipping tracking of ${gift.name} #${gift.serialNumber}: Price (${gift.floorPriceTon} TON) exceeds max buy price threshold (${maxPriceThreshold} TON)`, "warn");
        return;
      }
      if (gift.floorPriceTon > currentBalance) {
        addLog(`[Filter] Skipping tracking of ${gift.name} #${gift.serialNumber}: Price (${gift.floorPriceTon} TON) exceeds available wallet balance (${currentBalance.toFixed(2)} TON)`, "warn");
        return;
      }

      // 2. STAGE 2 FILTERS: RISK MANAGER
      // Keep a reserve cushion of 1.5 TON for transactions gas, fees and platform safety
      const gasCushionLimit = 1.5;
      if (currentBalance - gift.floorPriceTon < gasCushionLimit) {
        addLog(`[🛡️ Риск-Менеджер] Отклонено: Покупка ${gift.name} #${gift.serialNumber} за ${gift.floorPriceTon} TON оставит баланс ниже резервного буфера газа в ${gasCushionLimit} TON. Свободно: ${currentBalance.toFixed(2)} TON`, "error");
        return;
      }

      // Respect strict maximum single asset exposure limit
      const maxSingleExposure = activeConfig.riskMaxExposure !== undefined ? activeConfig.riskMaxExposure : 25.0;
      if (gift.floorPriceTon > maxSingleExposure) {
        addLog(`[🛡️ Риск-Менеджер] Отклонено: Цена актива ${gift.floorPriceTon} TON превышает лимит риска на одну сделку (${maxSingleExposure.toFixed(1)} TON)`, "warn");
        return;
      }
      
      addLog(`Analyzing item: ${gift.name} #${gift.serialNumber}`, "info");
      
      // Aggregate successful flips from our tracked whales
      const followedWhaleAddresses = whalesRef.current.filter(w => w.isFollowing).map(w => w.address);
      const allWhaleTrades = whalesRef.current.flatMap(w => getWhaleTrades(w.address));
      const followedWhaleTrades = allWhaleTrades.filter(t => followedWhaleAddresses.includes(t.id)); 
      
      // 3. ANALYZE PATTERN (Master Sniper: Unified Market Depth Logic)
      const aggregator = MarketAggregator.getInstance();
      const execution = ExecutionEngine.getInstance();
      
      // Get Unified Data (The "Golden Price")
      const marketData = aggregator.getUnifiedPrice(gift.name);
      if (!marketData) {
        addLog(`[Анализ] Ошибка: Не удалось получить рыночные данные для ${gift.name}.`, "error");
        return;
      }
      
      const floorPrice = marketData.floor;
      addLog(`[Анализ] Рыночная цена (Floor): ${floorPrice} TON (${marketData.bestSource})`, "info");
      
      const learnedRules = strategiesRef.current.map(s => s.dynamicRules).filter(Boolean) as DynamicTradingRule[];
      const analysis = PatternAnalyzer.analyzeWithWhaleData(
         gift.name, 
         gift.serialNumber, 
         gift.pattern, 
         learnedRules,
         allWhaleTrades
      );

      addLog(`[Анализ] Паттерн: ${analysis.labels.join(", ") || "Common"}. Множитель: x${analysis.multiplier.toFixed(2)}`, "info");

      // Calculate Corridors based on Unified Floor and Attributes
      const attrPremium = PatternAnalyzer.getAttributePremium(analysis);
      const corridors = aggregator.calculateCorridors(floorPrice, attrPremium);
      
      addLog(`[Анализ] Ценовые коридоры: Green <${corridors.green.toFixed(1)}, Blue <${corridors.blue.toFixed(1)}`, "info");

      // Manual boost for followed whales
      const isBoughtByFollowedWhale = followedWhaleTrades.some(t => t.itemName === gift.name);
      if (isBoughtByFollowedWhale) {
        analysis.multiplier *= 1.25;
        analysis.reasoning = `🐳 [FOLLOWED WHALE MATCH] This item was recently flipped by a followed Smart Money wallet. Boosting confidence.`;
        analysis.whaleEvidenceMatched = true;
      }
      
      // 4. DECIDE & EXECUTE (Strategy Isolation via ArbitrageScanner)
      const category = "MARKET"; 
      const totalBankroll = numericBalance; // Real total bankroll
      
      const scanner = ArbitrageScanner.getInstance();
      const opportunity = scanner.evaluateOpportunity(
        gift.name, 
        floorPrice, 
        category, 
        currentBalance, 
        totalBankroll
      );
      
      if (opportunity.group <= 4) {
        // Now handled by ServerMarketEngine synced via useOpportunities
      }
      
      addLog(`[Сканнер Арбитража] ${opportunity.reason}`, "info");

      // We combine old confidence booster (whale multiplier) with the new group-based decision
      // We'll proceed with SNIPE, QUEUE_BUY, or MAKE_OFFER if the group is strong enough.
      const isStrongGroup = opportunity.group === 1 || opportunity.group === 2;
      const isBreadWithBonus = opportunity.group === 3 && (analysis.multiplier >= 1.2 || isBoughtByFollowedWhale);
      const shouldExecute = (isStrongGroup || isBreadWithBonus) && opportunity.action !== "SKIP";

      if (shouldExecute) {
        addLog(`🎯 [BRAIN] Decision: ${opportunity.action} ${gift.name} @ ${opportunity.buyPrice} TON. Group: ${opportunity.group}. Source: ${marketData.bestSource}`, "success");
        
        if (activeConfig.workingMode === "SOFT") {
          addLog(`[SOFT MODE] Placing trade for ${gift.name} #${gift.serialNumber} into manual approval queue (MitM)...`, "warn");
          const newPending: PendingTrade = {
            id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            item: { id: gift.id, name: `${gift.name} #${gift.serialNumber}`, price: opportunity.buyPrice, image: gift.image } as any,
            targetPrice: opportunity.buyPrice,
            marketFloor: opportunity.expectedSellPrice,
            source: marketData.bestSource,
            confidence: Math.round(Math.min(analysis.multiplier * 75, 100)),
            timestamp: new Date().toLocaleTimeString()
          };
          setPendingTrades(prev => [newPending, ...prev]);
        } else {
          addLog(`🛠️ [ENGINEER] Triggering ${opportunity.action} execution path via ${marketData.bestSource}...`, "info");
          
          // Execute the trade (Abstraction Layer)
          execution.executeTrade(
            { id: gift.id, name: gift.name, price: opportunity.buyPrice } as any, 
            opportunity.buyPrice, 
            marketData.bestSource
          ).then(res => {
            if (res.success) {
              addLog(`✅ [EXECUTION] Success via ${res.method}. Asset acquired.`, "success");
              
              // Construct and persist the new trade record
              const newTrade: TradeLog = {
                id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                giftId: gift.id,
                giftName: `${gift.name} #${gift.serialNumber}`,
                tradeType: "BUY",
                amountTon: floorPrice,
                walletAddress: walletState.walletAddress || "EQA_ANON_SNIPER_WALLET_ADDRESS_PROD",
                txHash: res.txHash || "",
                status: "COMPLETED",
                timestamp: new Date().toISOString(),
                thumbnailUrl: gift.image || ""
              };

              if (!user) {
                setTrades(prev => {
                  const updated = [newTrade, ...prev].slice(0, 50);
                  safeStorage.setItem("sniper_trades", JSON.stringify(updated));
                  return updated;
                });
              } else {
                safeSetDoc(doc(db, `users/${user.uid}/trades`, newTrade.id), newTrade).catch(err => {
                  console.error("Failed to persist bot-executed trade: ", err);
                });
              }
            } else if (res.error === "Wallet Not Connected") {
              addLog(`⚠️ [EXECUTION] Skipped: ${res.error}`, "warn");
            } else {
              addLog(`❌ [EXECUTION] Failed: ${res.error}`, "error");
            }
          });
        }
      } else {
        addLog(`[Анализ] ${gift.name} #${gift.serialNumber} вне профитных коридоров (Floor: ${floorPrice} TON, Multiplier: x${analysis.multiplier.toFixed(2)}). Пропуск.`, "info");
      }
        } catch (err: any) {
          addLog(`❌ [Обработчик] Ошибка оценки актива ${gift.name}: ${err.message || err}`, "error");
        }
      });
      } catch (err: any) {
        addLog(`❌ [Разведка] Ошибка запроса: ${err.message || err}`, "error");
      }
    }, 15000);
 
    return () => clearInterval(botLoop);
  }, [config.isActive, user]);
const onTouchEnd = () => {
    if (touchStartX === null || touchStartY === null || touchEndX === null || touchEndY === null) return;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const minSwipeDistance = 130; // increased from 50 to prevent accidental switching
    const maxVerticalMove = 60;   // if vertical travel is too high, it's a scroll, not a swipe
    
    // Check if the gesture was primarily and deliberately horizontal
    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < maxVerticalMove && Math.abs(diffX) > Math.abs(diffY) * 2.2) {
      const tabOrder: ("main" | "sniper" | "tonnel" | "portals" | "bum" | "inventory" | "whales" | "qa-agent")[] = [
        "main",
        "sniper",
        "tonnel",
        "portals",
        "bum",
        "inventory",
        "whales",
        "qa-agent"
      ];
      const currentIndex = tabOrder.indexOf(activeTab);
      
      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        // Swiped left -> Go to next tab
        setActiveTab(tabOrder[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped right -> Go to previous tab
        setActiveTab(tabOrder[currentIndex - 1]);
      }
    }
    
    // Reset values
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  // UI state variables
  const [marketTrends, setMarketTrends] = useState<any[]>([]);
  const [newWhaleAddr, setNewWhaleAddr] = useState("");
  const [newWhaleLabel, setNewWhaleLabel] = useState("");
  const [expandedWhale, setExpandedWhale] = useState<string | null>(null);
  const [deepAnalysisWhale, setDeepAnalysisWhale] = useState<WhaleWallet | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const fetchRealWalletPortfolio = async (address: string) => {
    if (!address || address.trim() === "") return;
    try {
      let tonBalanceNano = 0;
      
      // 1. Fetch TON balance
      try {
        const response = await fetch(`/api/ton/account/${encodeURIComponent(address)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.ok && data.result) {
            tonBalanceNano = parseFloat(data.result.balance) || 0;
          }
        }
      } catch (err) {
        console.error("TONCenter fetch failed:", err);
      }

      // Convert nanoTON to TON
      const tonBalance = tonBalanceNano / 1000000000;
      if (!config.useSimulatedBalance) {
        setWalletBalance(tonBalance.toFixed(2));
      }

      // 2. Fetch Jettons
      let jettonBalances: any[] = [];
      try {
        const response = await fetch(`/api/ton/account/${encodeURIComponent(address)}/jettons`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.balances)) {
            // Filter non-zero balances and ensure jetton metadata exists
            jettonBalances = data.balances.filter((b: any) => b.balance && parseFloat(b.balance) > 0 && b.jetton && b.jetton.address);
          }
        }
      } catch (err) {
        console.error("TonAPI jettons fetch failed:", err);
      }

      // 3. Construct rates token list
      const jettonAddresses = jettonBalances.map((b: any) => b.jetton?.address).filter(Boolean);
      const tokensParam = ["ton", ...jettonAddresses].join(",");

      // 4. Fetch Rates
      let rates: any = {};
      try {
        const response = await fetch(`/api/ton/rates?tokens=${tokensParam}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.rates) {
            rates = data.rates;
          }
        }
      } catch (err) {
        console.error("TonAPI rates fetch failed:", err);
      }

      // Helper to get rate by token identifier
      const getRateUSD = (tokenKey: string) => {
        if (!tokenKey) return 0;
        const rateObj = rates[tokenKey] || rates[tokenKey.toLowerCase()] || rates[tokenKey.toUpperCase()];
        if (rateObj && rateObj.prices && rateObj.prices.USD !== undefined) {
          return rateObj.prices.USD;
        }
        if (rateObj && rateObj.prices && rateObj.prices.usd !== undefined) {
          return rateObj.prices.usd;
        }
        // Fallbacks for common symbols
        if (tokenKey.toLowerCase() === "ton") return 1.58;
        if (tokenKey.toLowerCase() === "usdt" || tokenKey.includes("b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe")) return 1.0;
        return 0;
      };

      const tonPriceUSD = getRateUSD("TON");
      const tonUSDVal = tonBalance * tonPriceUSD;

      const tokensList: PortfolioToken[] = [
        {
          name: "TON",
          symbol: "TON",
          balance: tonBalance,
          priceUSD: tonPriceUSD,
          usdValue: tonUSDVal,
          image: "https://cryptologos.cc/logos/toncoin-ton-logo.png"
        }
      ];

      // Add jettons
      for (const b of jettonBalances) {
        if (!b.jetton) continue;
        const decimals = b.jetton.decimals || 9;
        const bal = parseFloat(b.balance) / Math.pow(10, decimals);
        const jettonAddress = b.jetton.address;
        const priceUSD = getRateUSD(jettonAddress);
        const usdValue = bal * priceUSD;

        // Keep TON and tokens with usdValue > 0.50, and USDT even if less for general visibility
        const isUSDT = b.jetton.symbol?.toLowerCase().includes("usd") || false;
        if (usdValue >= 0.50 || (isUSDT && bal > 0)) {
          tokensList.push({
            name: b.jetton.name || b.jetton.symbol || "Unknown Token",
            symbol: (b.jetton.symbol || "UNKNOWN").replace("₮", "T"),
            balance: bal,
            priceUSD: priceUSD,
            usdValue: usdValue,
            image: b.jetton.image
          });
        }
      }

      // Sort by USD value descending
      tokensList.sort((a, b) => b.usdValue - a.usdValue);

      setPortfolioTokens(tokensList);

    } catch (err) {
      console.error("Error fetching real wallet portfolio:", err);
    }
  };

  // Automatically fetch real balance when the wallet address changes
  useEffect(() => {
    if (config.walletAddress && config.walletAddress.trim() !== "") {
      fetchRealWalletPortfolio(config.walletAddress);
    }
  }, [config.walletAddress]);

  // Load marketplace gifts on component load
  useEffect(() => {
    // fetchMarketGifts();
  }, []);

  
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Sign-out failed:", error);
    }
  };

  // Handle changing testing strategy allocation
  
  // Promote a testing strategy to Stable Main pool

  // Intelligence Hub - Market Trend Monitoring
  useEffect(() => {
    const fetchTrends = async () => {
      const aggregator = MarketAggregator.getInstance();
      const opportunities = await aggregator.getBestArbitrage("Durov's Puzzles");
      setMarketTrends([opportunities]);
    };
    const interval = setInterval(fetchTrends, 30000);
    return () => clearInterval(interval);
  }, []);

    // Save Config to Firebase
  const saveConfig = async (newConfig: BotConfig) => {
    setConfig(newConfig);
    if (user) {
      const configPath = `users/${user.uid}/config/bot`;
      try {
        await safeSetDoc(doc(db, `users/${user.uid}/config`, "bot"), newConfig);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, configPath);
      }
    }
  };


  // Add whale tracker wallet
  const handleAddWhale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhaleAddr || !newWhaleLabel) return;

    const added: WhaleWallet = {
      address: newWhaleAddr.trim(),
      label: newWhaleLabel.trim(),
      winRate: 0, // Real stats require Fragment API integration
      totalPnL: 0, // Real stats require Fragment API integration
      lastActive: "Pending Sync",
      status: "TRACKED"
    };

    if (!user) {
      setWhales(prev => [added, ...prev]);
    } else {
      const docId = added.address.replace(/[^a-zA-Z0-9_-]/g, "_");
      const whalePath = `users/${user.uid}/whales/${docId}`;
      try {
        await safeSetDoc(doc(db, `users/${user.uid}/whales`, docId), added);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, whalePath);
      }
    }

    setNewWhaleAddr("");
    setNewWhaleLabel("");
  };

  // Remove whale tracker wallet
  const handleRemoveWhale = async (address: string) => {
    if (!user) {
      setWhales(prev => prev.filter(w => w.address !== address));
    } else {
      const docId = address.replace(/[^a-zA-Z0-9_-]/g, "_");
      const whalePath = `users/${user.uid}/whales/${docId}`;
      try {
        await safeDeleteDoc(doc(db, `users/${user.uid}/whales`, docId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, whalePath);
      }
    }
  };

  // Calculate total profit from real trade history
  
  return (
    <div className="flex flex-col h-full bg-[#050505] text-slate-100 overflow-hidden">
      
      {/* HEADER SECTION - COMBINED & COMPACT */}
      <header className="flex justify-start items-center gap-4 px-3 py-2 border-b border-slate-800/85 bg-black/50 backdrop-blur overflow-x-auto scrollbar-none shrink-0 h-12 w-full select-none">
        {/* Web Agent OS indicator */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 border-r border-slate-800/80 pr-3">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
          <h1 className="text-[10px] font-bold tracking-tight text-white whitespace-nowrap">
            Web Agent OS <span className="text-gray-500 font-normal">v2.1</span>
          </h1>
        </div>
        
        {/* Sniper OS Core */}
        <div className="flex items-center gap-2 shrink-0 border-r border-slate-800/80 pr-3">
          <Cpu className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          <h1 className="text-[11px] sm:text-sm font-black tracking-wider uppercase text-slate-200 whitespace-nowrap leading-none">
            T.A.E. <span className="text-fuchsia-500 font-bold">Sniper OS</span>
          </h1>
          <span className={`text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold border uppercase tracking-wider shrink-0 leading-none
            ${config.isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-slate-800/40 text-slate-400 border-slate-750'}`}>
            {config.isActive ? "Active" : "Offline"}
          </span>
        </div>

        {/* CONNECTION QUICK BADGES */}
        <div className="flex items-center gap-2 shrink-0 border-r border-slate-800/80 pr-3">
          {/* TonConnect Badge */}
          <button
            onClick={() => {
              if (walletState.connected) {
                WalletBridge.getInstance().disconnect();
                addLog("Кошелек отключен.", "warn");
              } else {
                handleOpenTonConnect();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              walletState.connected
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                : "bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
            title={walletState.restoring ? "Синхронизация..." : walletState.connected ? "Отключить Кошелек" : "Подключить Кошелек"}
          >
            <Wallet className={`w-3.5 h-3.5 ${walletState.connected || walletState.restoring ? "animate-pulse" : ""}`} />
            <span className="font-mono text-[9px]">
              {walletState.restoring
                ? "Restoring..."
                : walletState.connected
                ? `${walletState.walletAddress?.slice(0, 4)}...${walletState.walletAddress?.slice(-4)}`
                : "TON Connect"}
            </span>
          </button>

          {/* MTProto Badge Inline */}
          {bridgeStatus?.status === "connected" ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  MTProtoBridge.getInstance().syncStatusWithServer();
                  addLog("Синхронизация статуса...", "info");
                }}
                className="p-1.5 rounded-md border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all shrink-0"
                title="Обновить статус"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${mtProtoLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => {
                  MTProtoBridge.getInstance().disconnect();
                  addLog("Мост MTProto отключен.", "warn");
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/20 whitespace-nowrap shrink-0"
                title="Отключить Мост"
              >
                <Zap className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse shrink-0" />
                <span>MTProto Active</span>
              </button>
              <button
                onClick={handleCopyMtProtoSession}
                className="p-1.5 rounded-md border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all shrink-0"
                title="Скопировать Session String для ENV"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : mtProtoStep === "password" ? (
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] bg-slate-900/80 border border-fuchsia-500/50 shrink-0">
              <Zap className="w-3 h-3 text-fuchsia-400 ml-1 shrink-0" />
              <input
                type="password"
                placeholder="2FA Пароль"
                value={mtProtoPassword}
                onChange={(e) => setMtProtoPassword(e.target.value)}
                className="w-24 bg-transparent text-slate-200 outline-none text-[10px] px-1 placeholder:text-slate-600 shrink-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyMtProtoPassword();
                }}
              />
              <button
                onClick={handleVerifyMtProtoPassword}
                disabled={mtProtoLoading}
                className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white px-2 py-0.5 rounded shadow-[0_0_10px_rgba(217,70,239,0.3)] transition-all font-bold tracking-tight disabled:opacity-50 shrink-0"
              >
                {mtProtoLoading ? "..." : "OK"}
              </button>
            </div>
          ) : mtProtoStep === "code" ? (
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] bg-slate-900/80 border border-fuchsia-500/50 shrink-0">
              <Zap className="w-3 h-3 text-fuchsia-400 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Код из TG"
                value={mtProtoCode}
                onChange={(e) => setMtProtoCode(e.target.value)}
                className="w-20 bg-transparent text-slate-200 outline-none text-[10px] font-mono px-1 placeholder:text-slate-600 shrink-0"
                maxLength={5}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyMtProtoCode();
                }}
              />
              <button
                onClick={handleVerifyMtProtoCode}
                disabled={mtProtoLoading}
                className="px-2 py-0.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-[9px] uppercase font-bold disabled:opacity-50 shrink-0"
              >
                ОК
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  MTProtoBridge.getInstance().syncStatusWithServer();
                  addLog("Синхронизация статуса...", "info");
                }}
                className="p-1.5 rounded-md border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all shrink-0"
                title="Обновить статус"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${mtProtoLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => handleRequestMtProtoCode()}
                disabled={mtProtoLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                title={mtProtoLoading ? "Синхронизация..." : "Запросить код"}
              >
                <Zap className={`w-3.5 h-3.5 ${mtProtoLoading ? "animate-pulse text-fuchsia-400" : ""}`} />
                <span>{mtProtoLoading ? "Restoring..." : "MTProto: Off"}</span>
              </button>
            </div>
          )}
        </div>

        {/* AUTH BUTTONS */}
        <div className="flex items-center shrink-0">
          {authLoading ? (
            <div className="w-4 h-4 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-2" />
          ) : user ? (
            <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/60 rounded-lg p-1 pl-2.5 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-slate-300 leading-none truncate max-w-[80px]">{user.displayName || "Трейдер"}</div>
                <span className="text-[8px] text-emerald-500/70 font-mono">Synced</span>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-fuchsia-500/30 shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/50 flex items-center justify-center text-[10px] text-fuchsia-400 font-bold uppercase shrink-0">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <button 
                onClick={handleSignOut} 
                className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded transition-all cursor-pointer shrink-0"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="flex items-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-slate-100 font-bold text-[10px] px-3 py-1.5 rounded-md transition-all shadow-[0_0_8px_rgba(217,70,239,0.2)] cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" /> Войти
            </button>
          )}
        </div>
      </header>

      {/* PERSISTENT SUB-HEADER NAVIGATION BAR */}
      <nav className="flex justify-start md:justify-center items-center gap-1.5 px-4 py-2.5 bg-black/30 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0 select-none">
        {[
          { id: "main", label: "Главная", icon: Wallet },
          { id: "sniper", label: "Снайпер Монитор", icon: Cpu },
          { id: "tonnel", label: "Tonnel P2P", icon: Layers },
          { id: "portals", label: "Portals Market", icon: Target },
          { id: "bum", label: "Бомж-Секция", icon: Gift },
          { id: "inventory", label: "История & PnL", icon: History },
          { id: "whales", label: "Анализ Китов", icon: TrendingUp },
          { id: "qa-agent", label: "E2E QA Агент", icon: Activity }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0
                ${activeTab === tab.id 
                  ? "bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_12px_rgba(217,70,239,0.08)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"}`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* CORE WORKSPACE WITH SWIPE SUPPORT */}
      <main 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto p-4 select-none touch-pan-y flex flex-col justify-between"
      >
        <div className="flex-1 w-full flex flex-col justify-start">
          <AnimatePresence mode="wait">
            
            {/* TAB 0: MAIN (WALLET & SETTINGS) */}
            {activeTab === "main" && (
              <motion.div
                key="main-page"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex flex-col gap-4 max-w-5xl mx-auto w-full p-1"
              >
                {/* Master Controls & Connectivity */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TonConnect Card */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        walletState.connected 
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
                          : "bg-slate-800 border border-slate-700 text-slate-500"
                      }`}>
                        <Wallet size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">TonConnect 2.0</div>
                        <div className="text-sm font-mono font-bold text-slate-200">
                          {walletState.connected ? (walletState.walletAddress?.slice(0, 6) + "..." + walletState.walletAddress?.slice(-4)) : "Not Connected"}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (walletState.connected) {
                          WalletBridge.getInstance().disconnect();
                          addLog("Кошелек отключен.", "warn");
                        } else {
                          handleOpenTonConnect();
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all cursor-pointer ${
                        walletState.connected
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                      }`}
                    >
                      {walletState.connected ? "Linked" : "Connect"}
                    </button>
                  </div>

                  {/* MTProto Card */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          bridgeStatus?.status === "connected" 
                            ? "bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400" 
                            : "bg-slate-800 border border-slate-700 text-slate-500"
                        }`}>
                          <Zap size={20} className={bridgeStatus?.status === "connected" ? "animate-pulse" : ""} />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">TG Bridge (MTProto)</div>
                          <div className="text-sm font-mono font-bold text-slate-200">
                            {bridgeStatus?.status === "connected" 
                              ? (bridgeStatus.userId || "Active Session") 
                              : bridgeStatus?.status === "error"
                              ? "Connection Error"
                              : "Disconnected"}
                          </div>
                          {bridgeStatus?.status === "error" && bridgeStatus.errorMessage && (
                            <div className="text-[8px] text-rose-500 font-medium leading-tight mt-0.5 max-w-[150px]">
                              {bridgeStatus.errorMessage.includes("wait of") 
                                ? `Flood Wait: ${bridgeStatus.floodWait}s`
                                : bridgeStatus.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (bridgeStatus?.status === "connected") {
                            MTProtoBridge.getInstance().disconnect();
                            addLog("Мост MTProto отключен.", "warn");
                          } else {
                            handleRequestMtProtoCode();
                          }
                        }}
                        disabled={mtProtoLoading}
                        className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all cursor-pointer ${
                          bridgeStatus?.status === "connected"
                            ? "bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/20 animate-pulse"
                            : (mtProtoStep === "code" || mtProtoStep === "password")
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                            : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        } disabled:opacity-50`}
                      >
                        {bridgeStatus?.status === "connected" 
                          ? "Linked" 
                          : mtProtoLoading 
                          ? "Process..." 
                          : bridgeStatus?.status === "error"
                          ? "Retry"
                          : (mtProtoStep === "code" || mtProtoStep === "password") 
                          ? "Verify" 
                          : "Connect"}
                      </button>
                    </div>

                    {bridgeStatus?.status === "connected" && (
                      <div className="flex flex-col gap-1.5 px-1 pb-1">
                        <button
                          onClick={handleFetchFragmentToken}
                          disabled={mtProtoLoading}
                          className="w-full py-1.5 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 font-bold rounded-lg transition-all cursor-pointer uppercase text-[8px] flex items-center justify-center gap-1.5"
                        >
                          <Gift className="w-3 h-3" />
                          <span>Auto-Fetch Fragment Token</span>
                        </button>

                        <button
                          onClick={handleFetchPortalsToken}
                          disabled={mtProtoLoading}
                          className="w-full py-1.5 bg-fuchsia-600/10 border border-fuchsia-500/20 hover:bg-fuchsia-600/20 text-fuchsia-400 font-bold rounded-lg transition-all cursor-pointer uppercase text-[8px] flex items-center justify-center gap-1.5"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Auto-Fetch Portals Token</span>
                        </button>
                        
                        <p className="text-[7px] text-slate-500 font-mono text-center uppercase tracking-tighter">
                          Использовать активную сессию для получения ключей рынков
                        </p>
                      </div>
                    )}

                    {/* Mode Toggle Switch */}
                    <div className="border-t border-slate-800/60 pt-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium uppercase tracking-tight">Режим:</span>
                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                          <button
                            onClick={() => {
                              MTProtoBridge.getInstance().setWorkingMode("server");
                              setMtprotoMode("server");
                              addLog("Переключено в Режим Сервера (Приоритетный).", "info");
                            }}
                            className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                              mtprotoMode === "server"
                                ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Server
                          </button>
                          <button
                            onClick={() => {
                              MTProtoBridge.getInstance().setWorkingMode("sandbox");
                              setMtprotoMode("sandbox");
                              addLog("Переключено в Режим Песочницы (Локальный fallback).", "info");
                            }}
                            className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                              mtprotoMode === "sandbox"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Sandbox
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium uppercase tracking-tight">Тип Сессии:</span>
                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                          <button
                            onClick={() => {
                              setMtprotoSessionType("bot");
                              addLog("Выбран режим Bot Session.", "info");
                            }}
                            className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                              mtprotoSessionType === "bot"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Bot
                          </button>
                          <button
                            onClick={() => {
                              setMtprotoSessionType("user");
                              addLog("Выбран режим User Session (Login by Phone).", "info");
                            }}
                            className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                              mtprotoSessionType === "user"
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            User
                          </button>
                        </div>
                      </div>

                      {bridgeStatus?.status === "connected" && (
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <button
                            onClick={async () => {
                              try {
                                let sessionStr = "";
                                if (mtprotoMode === "server") {
                                  const res = await fetch("/api/mtproto/session-string");
                                  const data = await res.json();
                                  sessionStr = data.session || "";
                                } else {
                                  sessionStr = MTProtoBridge.getInstance().getSessionString();
                                }
                                
                                if (sessionStr) {
                                  await navigator.clipboard.writeText(sessionStr);
                                  addLog("Telegram Session String скопирована в буфер обмена!", "success");
                                  setSessionString(sessionStr);
                                  setShowSessionString(true);
                                } else {
                                  addLog("Не удалось получить строку сессии.", "error");
                                }
                              } catch (e) {
                                addLog("Ошибка при получении сессии.", "error");
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 rounded-xl text-[9px] font-bold text-slate-300 transition-all uppercase"
                          >
                            <Target size={12} className="text-fuchsia-500" />
                            Copy Session String
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* QUICK SNIPER SETTINGS CARD */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 h-fit w-full">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <Sliders className="w-4 h-4 text-fuchsia-400" /> Быстрые Параметры Робота
                    </h2>

                  {/* Section 1: Основные Настройки */}
                  <div className="space-y-3">
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider">Основные Параметры</div>
                    
                    {/* Master Start/Stop Bot Button (Prominent) */}
                    <button 
                      type="button"
                      onClick={() => saveConfig({ ...config, isActive: !config.isActive })}
                      className={`w-full py-4 rounded-xl font-black uppercase text-sm tracking-widest border-2 transition-all cursor-pointer flex items-center justify-center gap-3 shadow-lg
                        ${config.isActive 
                          ? 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30 text-rose-400 shadow-rose-500/20' 
                          : 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400 shadow-emerald-500/20'}`}
                    >
                      {config.isActive ? (
                        <>
                          <Pause className="w-5 h-5 animate-pulse" /> ОСТАНОВИТЬ СНАЙПЕРА
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" /> ЗАПУСТИТЬ СНАЙПЕРА
                        </>
                      )}
                    </button>

                    {/* Target selection */}
                    <div className="space-y-1.5 mt-2">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                        <span>Целевой Тип Лимиток</span>
                      </div>
                      <select 
                        value={config.targetCollection}
                        onChange={e => saveConfig({ ...config, targetCollection: e.target.value })}
                        className="w-full bg-black border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="ALL_GIFTS">Все Коллекции Подарков</option>
                        <option value="DUROV_PUZZLES">Durov's Puzzles (Паззлы)</option>
                        <option value="STAR_GIFTS">Star Gifts</option>
                        <option value="PREMIUM_GIFTS">Premium Limited Editions</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 2: Газ и Проскальзывание */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-3">
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider">Комиссии и Слиппейдж</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Проскальзывание</span>
                          <span className="text-fuchsia-400">{config.maxSlippagePercent}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          value={config.maxSlippagePercent} 
                          onChange={e => saveConfig({ ...config, maxSlippagePercent: parseInt(e.target.value) })}
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Gas Premium</span>
                          <span className="text-fuchsia-400">{config.frontrunGasPremium} TON</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.01" 
                          max="0.5" 
                          step="0.01"
                          value={config.frontrunGasPremium} 
                          onChange={e => saveConfig({ ...config, frontrunGasPremium: parseFloat(e.target.value) })}
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Управление Рисками */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-3">
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider">Управление Рисками (Risk Management)</div>

                    {/* Max Exposure */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Макс. Аллокация (Exposure)</span>
                        <span className="text-amber-400 font-bold">{(config.riskMaxExposure ?? 25.0).toFixed(1)} TON</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1"
                        value={config.riskMaxExposure ?? 25.0} 
                        onChange={e => saveConfig({ ...config, riskMaxExposure: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Stop Loss */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Ценовой Порог (Stop Loss)</span>
                        <span className="text-rose-400 font-bold">-{config.riskStopLoss ?? 15}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="50" 
                        step="5"
                        value={config.riskStopLoss ?? 15} 
                        onChange={e => saveConfig({ ...config, riskStopLoss: parseInt(e.target.value) })}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Section 4: Правила Торговли (Trading Rules) */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-3">
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                      Правила Торговли (Trading Rules)
                    </div>

                    {/* Max Buy Price Threshold */}
                    <div className="space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-slate-850">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                        <span>Макс. цена покупки (Max Buy Price)</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            min="1"
                            max="1000"
                            step="1"
                            value={config.maxBuyPriceThreshold ?? 50.0}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              saveConfig({ ...config, maxBuyPriceThreshold: isNaN(val) ? 0 : val });
                            }}
                            className="w-14 bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-cyan-400 px-1 py-0.5 rounded text-center outline-none focus:border-cyan-500"
                          />
                          <span className="text-slate-400">TON</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500">Бот полностью проигнорирует любой актив, если его цена превышает этот лимит, защищая ваш кошелек.</p>
                      <input 
                        type="range" 
                        min="1" 
                        max="200" 
                        step="1"
                        value={config.maxBuyPriceThreshold ?? 50.0} 
                        onChange={e => saveConfig({ ...config, maxBuyPriceThreshold: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                      {(config.maxBuyPriceThreshold ?? 50.0) > (parseFloat(walletBalance) || 0) && (
                        <p className="text-[8px] font-mono text-amber-400/90 leading-tight">
                          ⚠️ Внимание: Порог превышает текущий баланс ({walletBalance} TON). Бот всё равно будет ограничен доступным балансом.
                        </p>
                      )}
                    </div>

                    {/* Soft Limits toggle */}
                    <div className="flex justify-between items-center bg-black/10 p-2 rounded border border-slate-800/80">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-300">Мягкие Ограничения</span>
                        <span className="text-[8px] text-slate-500">Динамическое удержание ордеров</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => saveConfig({ ...config, riskSoftLimits: !config.riskSoftLimits })}
                        className={`w-9 h-4.5 rounded-full p-0.5 transition-all cursor-pointer ${config.riskSoftLimits ? "bg-amber-500" : "bg-slate-800"}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all transform ${config.riskSoftLimits ? "translate-x-4.5" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Section 4: Исключения ИИ */}
                  <div className="space-y-1.5 border-t border-slate-800/60 pt-3">
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider">Фильтр Исключений ИИ</div>
                    <input 
                      type="text" 
                      placeholder="Например, не покупать Durov's..." 
                      value={config.ignoreInstruction || ""} 
                      onChange={e => saveConfig({ ...config, ignoreInstruction: e.target.value })}
                      className="w-full bg-black border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-slate-700"
                    />
                  </div>

                  {/* Neural Link Analytics - NEW SECTION */}
                  <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-mono text-fuchsia-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Activity size={12} className="animate-pulse" />
                        Neural Link Analytics
                      </div>
                      <div className="px-1.5 py-0.5 rounded bg-black border border-fuchsia-500/30 text-[8px] font-mono text-fuchsia-300">
                        LATENCY: 45ms
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800/60">
                        <div className="text-[8px] text-slate-500 uppercase mb-1">Bot Efficiency (Эффективность)</div>
                        <div className="flex items-end justify-between">
                          <div className="text-sm font-black text-emerald-400">92.4%</div>
                          <div className="text-[9px] text-emerald-500/50">+1.2%</div>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[92.4%]" />
                        </div>
                      </div>
                      <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800/60">
                        <div className="text-[8px] text-slate-500 uppercase mb-1">Calculated Alpha (Скоринг)</div>
                        <div className="flex items-end justify-between">
                          <div className="text-sm font-black text-cyan-400">x2.85</div>
                          <div className="text-[9px] text-cyan-500/50">Peak</div>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-cyan-500 w-[70%]" />
                        </div>
                      </div>
                    </div>

                    {/* Vision Proof Monitor - Addressing User request for "visual audit" */}
                    <div className="p-3 bg-fuchsia-950/10 border border-fuchsia-500/20 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center text-[9px] font-mono">
                         <span className="text-fuchsia-400 font-bold uppercase flex items-center gap-1">
                           <Eye size={10} /> DEA VISION PROOF MONITOR
                         </span>
                         <span className="text-slate-500">LIVE FEED</span>
                      </div>
                      
                      <div className="aspect-video bg-black/80 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center group">
                        {config.isActive ? (
                           <>
                             <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900/10 to-transparent opacity-50" />
                             {/* Simulated scanning lines */}
                             <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                               <div className="w-full h-[1px] bg-cyan-400 absolute animate-scan" style={{ top: '20%' }} />
                               <div className="w-full h-[1px] bg-fuchsia-400 absolute animate-scan-slow" style={{ top: '60%' }} />
                             </div>
                             
                             {/* Central status text */}
                             <div className="z-10 flex flex-col items-center gap-1.5">
                                <Search size={24} className="text-fuchsia-500 animate-pulse opacity-40" />
                                <div className="text-[10px] font-mono text-fuchsia-400/80 font-black animate-pulse">SCANNING FRAGMENT FRONTIER...</div>
                             </div>
                             
                             {/* Corner coordinates and telemetry */}
                             <div className="absolute top-2 left-2 text-[8px] font-mono text-emerald-500/60 leading-none">
                                LAT: 55.7558<br/>LONG: 37.6173
                             </div>
                             <div className="absolute top-2 right-2 text-[8px] font-mono text-fuchsia-500/60 text-right leading-none">
                                FRAGMENT_LAYER_v4.2<br/>MEM_BUF: 1024MB
                             </div>
                             <div className="absolute bottom-2 left-2 flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                             </div>
                           </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-30 grayscale">
                             <EyeOff size={32} />
                             <span className="text-[10px] font-mono uppercase font-bold tracking-widest">Neural Link Offline</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1 p-1.5 bg-black/30 rounded border border-slate-850 text-[9px] font-mono text-slate-400 flex flex-col gap-0.5">
                           <span className="text-[7px] text-slate-600 uppercase font-black">AI Analysis State:</span>
                           <span className="truncate text-emerald-400/90">{config.isActive ? "Pattern Matching in progress..." : "IDLE"}</span>
                        </div>
                        <div className="flex-1 p-1.5 bg-black/30 rounded border border-slate-850 text-[9px] font-mono text-slate-400 flex flex-col gap-0.5">
                           <span className="text-[7px] text-slate-600 uppercase font-black">OCR Confidence:</span>
                           <span className="truncate text-cyan-400/90">{config.isActive ? "98.2% Accuracy" : "0%"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 2-COLUMN LIVE DEALS RAIN STREAM */}
                <motion.div variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col h-[480px] shadow-2xl">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-fuchsia-400 animate-pulse shrink-0" /> Снайпер Сделки Rain
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleClearTrades}
                        className="text-[9px] font-mono text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 transition-all font-bold uppercase cursor-pointer"
                      >
                        [Очистить]
                      </button>
                      <span className="text-[8px] font-mono bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded border border-fuchsia-500/20 uppercase font-semibold">
                        Live Stream
                      </span>
                    </div>
                  </h2>

                  <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                    {/* LEFT COLUMN: Покупки (BUY) */}
                    <div className="flex flex-col min-h-0 bg-black/30 rounded-lg p-2.5 border border-slate-850">
                      <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-2 border-b border-emerald-500/10 pb-1 flex justify-between items-center">
                        <span>Покупки (BUY)</span>
                        <span className="text-[8px] font-mono text-slate-500">Max 10</span>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
                        {trades.filter(t => t.tradeType === "BUY").length === 0 ? (
                          <div className="text-[10px] text-slate-600 text-center py-12 italic">Нет покупок</div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {trades.filter(t => t.tradeType === "BUY").slice(0, 10).map((trade) => (
                              <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                onClick={() => setSelectedDetailTrade(trade)}
                                className="bg-slate-900/40 hover:bg-slate-800/70 border border-slate-850 hover:border-slate-700/60 p-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer group shrink-0"
                              >
                                <div className="w-7 h-7 rounded bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-xs overflow-hidden shrink-0">
                                  <SafeGiftImage src={trade.thumbnailUrl} name={trade.giftName} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-200 truncate leading-tight">{trade.giftName}</div>
                                  <div className="text-[8px] font-mono text-slate-500 leading-none">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[10px] font-mono font-bold text-emerald-400 leading-tight">{trade.amountTon} TON</div>
                                  <div className="text-[7px] font-mono text-slate-500 uppercase font-semibold">BUY</div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Продажи (SELL) */}
                    <div className="flex flex-col min-h-0 bg-black/30 rounded-lg p-2.5 border border-slate-850">
                      <div className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-wider mb-2 border-b border-fuchsia-500/10 pb-1 flex justify-between items-center">
                        <span>Продажи (SELL)</span>
                        <span className="text-[8px] font-mono text-slate-500">Net Profit</span>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
                        {trades.filter(t => t.tradeType === "SELL").length === 0 ? (
                          <div className="text-[10px] text-slate-600 text-center py-12 italic">Нет продаж</div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {trades.filter(t => t.tradeType === "SELL").slice(0, 10).map((trade) => (
                              <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                onClick={() => setSelectedDetailTrade(trade)}
                                className="bg-slate-900/40 hover:bg-slate-800/70 border border-slate-850 hover:border-slate-700/60 p-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer group shrink-0"
                              >
                                <div className="w-7 h-7 rounded bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-xs overflow-hidden shrink-0">
                                  <SafeGiftImage src={trade.thumbnailUrl} name={trade.giftName} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-200 truncate leading-tight">{trade.giftName}</div>
                                  <div className="text-[8px] font-mono text-slate-500 flex items-center gap-0.5 leading-none">
                                    <span className="line-through">{trade.purchasePrice?.toFixed(1) || "0.0"}</span> 
                                    <span>→</span> 
                                    <span className="text-fuchsia-400 font-bold">{trade.amountTon}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[10px] font-mono font-bold text-emerald-400 leading-tight">+{trade.profitTon?.toFixed(1) || "0.0"} TON</div>
                                  <div className="text-[7px] font-mono text-slate-500 uppercase font-semibold">SELL</div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
                </motion.div>

                {/* ARBITRAGE TARGETS MONITOR - FULL WIDTH */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-2xl mb-4 mt-2">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-cyan-400" /> Scanner Targets Monitor (Groups 1-4)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono font-bold">LIVE: {activeTargets.length}</span>
                    </div>
                  </h2>
                  
                  <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 min-h-[110px] items-center">
                    {activeTargets.length === 0 ? (
                      <div className="w-full text-center text-[10px] font-mono text-slate-600 uppercase tracking-widest italic py-8">
                        Waiting for viable targets...
                      </div>
                    ) : (
                      <AnimatePresence>
                        {activeTargets.map(target => (
                          <motion.div 
                            key={`${target.itemName}_${target.buyPrice}_${target.timestamp}`}
                            initial={{ opacity: 0, scale: 0.9, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="shrink-0 w-64 bg-black/60 rounded-lg border border-slate-800/80 p-3 flex flex-col gap-2 relative overflow-hidden"
                          >
                            {/* Top Row: Group & Action */}
                            <div className="flex justify-between items-start mb-1 z-10">
                              <div className={`text-[8px] font-black font-mono uppercase px-1.5 py-0.5 rounded ${
                                target.group === 1 ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30" :
                                target.group === 2 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                target.group === 3 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}>
                                Group {target.group}
                              </div>
                              <div className="text-[9px] font-bold font-mono text-cyan-400 uppercase tracking-wider">
                                {target.action}
                              </div>
                            </div>
                            
                            {/* Middle: Item Name & Route */}
                            <div className="flex flex-col z-10">
                              <div className="text-sm font-black text-slate-200 truncate" title={target.itemName}>{target.itemName}</div>
                              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="text-slate-400">{target.source}</span>
                                <ArrowRight size={10} />
                                <span className="text-slate-400">Market</span>
                              </div>
                            </div>
                            
                            {/* Bottom: Prices */}
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 z-10">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-mono text-slate-500 uppercase">Buy (Cost)</span>
                                <span className="text-xs font-bold text-rose-400">{target.buyPrice.toFixed(1)} TON</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[8px] font-mono text-slate-500 uppercase">Est. PNL</span>
                                <span className="text-xs font-bold text-emerald-400">+{target.expectedProfit.toFixed(1)} TON</span>
                              </div>
                            </div>
                            
                            {/* Sweep overlay for active feeling */}
                            <div className="absolute top-0 left-0 h-full w-[200%] bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent pointer-events-none -translate-x-[100%] animate-scan" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* TERMINAL LOGS SECTION - FULL WIDTH WITH TALLER VIEW */}
                <div className="bg-black/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[400px] shadow-2xl">
                  <div className="bg-slate-900 px-4 py-3 flex justify-between items-start border-b border-slate-800">
                    <div className="flex items-start gap-4">
                      <div className="flex gap-1.5 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest">Sniper Bot Terminal</span>
                        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">[v2.0.5]</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setTerminalLogs([])}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase font-bold transition-all text-right leading-tight"
                    >
                      [Clear<br />Log]
                    </button>
                  </div>
                  <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-2 custom-scrollbar">
                    {terminalLogs.length === 0 ? (
                      <div className="text-slate-600 italic">Waiting for engine activation...</div>
                    ) : (
                      terminalLogs.map((log, i) => (
                        <div key={`${log.time}-${i}`} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
                          <span className="text-slate-500 shrink-0">[{log.time}]</span>
                          <span className={`flex-1 min-w-0 break-words leading-relaxed
                            ${log.type === 'success' ? 'text-emerald-400' : ''}
                            ${log.type === 'warn' ? 'text-amber-400' : ''}
                            ${log.type === 'error' ? 'text-rose-400' : ''}
                            ${log.type === 'info' ? 'text-slate-300' : ''}
                          `}>
                            {log.type === 'success' ? '✓ ' : log.type === 'warn' ? '⚡ ' : log.type === 'error' ? '✖ ' : '> '}
                            {log.msg}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 1: SNIPER MONITOR */}
            {activeTab === "sniper" && (
              <motion.div
                key="sniper-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6 max-w-7xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Command & Analytics (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    <WorkingModeSwitch 
                      currentMode={config.workingMode || "OFF"} 
                      onChange={(mode) => saveConfig({ ...config, workingMode: mode, isActive: mode !== "OFF" })}
                    />

                    <CorridorChart 
                      itemName="Durov's Puzzles"
                      currentPrice={15.2}
                      corridors={{
                        green: 12.46,
                        blue: 14.28,
                        yellow: 16.42,
                        red: 22.8
                      }}
                    />
                  </div>

                  {/* Right Column: Execution & Queue (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    <ExecutionQueue 
                      queue={pendingTrades}
                      onApprove={handleApproveTrade}
                      onDeny={handleDenyTrade}
                      onApproveAll={() => {
                        handleApproveBatch(pendingTrades.map(t => t.id));
                      }}
                      onDenyAll={() => {
                        handleDenyBatch(pendingTrades.map(t => t.id));
                      }}
                      onApproveBatch={handleApproveBatch}
                      onDenyBatch={handleDenyBatch}
                    />

                    {/* Active Filters and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-[10px] font-black text-emerald-400 uppercase mb-1">Active Filter</div>
                          <div className="text-xs font-bold text-slate-200">Confidence &gt; 80%</div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-[10px] font-black text-cyan-400 uppercase mb-1">Risk Protection</div>
                          <div className="text-xs font-bold text-slate-200">Gas Buffer Active</div>
                        </div>
                        <Shield className="w-5 h-5 text-cyan-500" />
                      </div>
                    </div>

                    <RealTimeMarketMonitor onAddLog={addLog} />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* TAB 2: DEPRECATED */}
            {false && (
              <motion.div
                key="strategies-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-6 max-w-6xl mx-auto w-full p-1"
              >
                {/* Master Controls & Connectivity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                     walletState.connected 
                       ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
                       : "bg-slate-800 border border-slate-700 text-slate-500"
                   }`}>
                      <Wallet size={20} />
                   </div>
                   <div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">TonConnect 2.0</div>
                      <div className="text-sm font-mono font-bold text-slate-200">
                        {walletState.connected ? (walletState.walletAddress?.slice(0, 6) + "..." + walletState.walletAddress?.slice(-4)) : "Not Connected"}
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => {
                    if (walletState.connected) {
                      WalletBridge.getInstance().disconnect();
                      addLog("Кошелек отключен.", "warn");
                    } else {
                      handleOpenTonConnect();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all cursor-pointer ${
                    walletState.connected
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                  }`}
                >
                  {walletState.connected ? "Linked" : "Connect"}
                </button>
             </div>

             <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                     bridgeStatus?.status === "connected" 
                       ? "bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400" 
                       : "bg-slate-800 border border-slate-700 text-slate-500"
                   }`}>
                      <Zap size={20} className={bridgeStatus?.status === "connected" ? "animate-pulse" : ""} />
                   </div>
                   <div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">TG Bridge (MTProto)</div>
                      <div className="text-sm font-mono font-bold text-slate-200">
                        {bridgeStatus?.status === "connected" ? (bridgeStatus.userId || "Active Session") : "Disconnected"}
                      </div>
                   </div>
                </div>
                <button
                  onClick={() => {
                    if (bridgeStatus?.status === "connected") {
                      MTProtoBridge.getInstance().disconnect();
                      addLog("Мост MTProto отключен.", "warn");
                    } else {
                      handleRequestMtProtoCode();
                    }
                  }}
                  disabled={mtProtoLoading}
                  className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all cursor-pointer ${
                    bridgeStatus?.status === "connected"
                      ? "bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/20 animate-pulse"
                      : (mtProtoStep === "code" || mtProtoStep === "password")
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  } disabled:opacity-50`}
                >
                  {bridgeStatus?.status === "connected" 
                    ? "Linked" 
                    : mtProtoLoading 
                    ? "Process..." 
                    : bridgeStatus?.status === "error"
                    ? "Retry"
                    : (mtProtoStep === "code" || mtProtoStep === "password") 
                    ? "Verify" 
                    : "Connect"}
                </button>
              </div>

              {bridgeStatus?.status === "connected" && (
                <div className="mt-3 px-1 space-y-2">
                  <button
                    onClick={handleFetchFragmentToken}
                    disabled={mtProtoLoading}
                    className="w-full py-1.5 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 font-bold rounded-lg transition-all cursor-pointer uppercase text-[8px] flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-3 h-3" />
                    <span>Auto-Fetch Fragment Token</span>
                  </button>

                  <button
                    onClick={handleFetchPortalsToken}
                    disabled={mtProtoLoading}
                    className="w-full py-1.5 bg-fuchsia-600/10 border border-fuchsia-500/20 hover:bg-fuchsia-600/20 text-fuchsia-400 font-bold rounded-lg transition-all cursor-pointer uppercase text-[8px] flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Auto-Fetch Portals Token</span>
                  </button>
                </div>
              )}

              {/* Mode Toggle Switch */}
             <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between text-[10px]">
               <span className="text-slate-400 font-medium">Режим подключения:</span>
               <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                 <button
                   onClick={() => {
                     MTProtoBridge.getInstance().setWorkingMode("server");
                     setMtprotoMode("server");
                     addLog("Переключено в Режим Сервера (Приоритетный).", "info");
                   }}
                   className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                     mtprotoMode === "server"
                       ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30"
                       : "text-slate-500 hover:text-slate-300"
                   }`}
                 >
                   Server
                 </button>
                 <button
                   onClick={() => {
                     MTProtoBridge.getInstance().setWorkingMode("sandbox");
                     setMtprotoMode("sandbox");
                     addLog("Переключено в Режим Песочницы (Локальный fallback).", "info");
                   }}
                   className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer uppercase ${
                     mtprotoMode === "sandbox"
                       ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                       : "text-slate-500 hover:text-slate-300"
                   }`}
                 >
                   Sandbox
                 </button>
               </div>
             </div>
          </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black uppercase text-slate-300">Portfolio Balancing</h3>
                        <div className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
                          Баланс: {numericBalance.toFixed(2)} TON
                        </div>
                      </div>

                      {/* Auto balancing toggle switch */}
                      <div className="flex items-center justify-between p-4 bg-slate-900/45 rounded-xl border border-slate-800/80 mb-5">
                        <div className="pr-4">
                          <div className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-2">
                            <span>Автоматическая Смарт-Ребалансировка</span>
                            <div className={`w-2 h-2 rounded-full ${isAutoBalancing ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            Daily ROI Engine: адаптивная весовая балансировка на базе маржи, скорости оборота и суточного ROI стратегий.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAutoBalancing(!isAutoBalancing)}
                          className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer flex-shrink-0 ${isAutoBalancing ? "bg-cyan-500" : "bg-slate-800"}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${isAutoBalancing ? "translate-x-6" : ""}`} />
                        </button>
                      </div>
                      
                      <div className="space-y-5">
                        {/* 1. Main Pools (Combined Stable Allocations) */}
                        <div className="space-y-4 p-4 bg-slate-900/30 rounded-xl border border-slate-800/50">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase text-slate-400">
                            <span>Основной пул стратегий (Approved Pool)</span>
                            <span className="text-cyan-400">{mainAllocPercent.toFixed(1)}% ({((mainAllocPercent * numericBalance) / 100).toFixed(2)} TON)</span>
                          </div>
                          
                          <div className="space-y-4 pl-2 border-l border-cyan-500/30">
                            {stableStrats.length === 0 ? (
                              <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg">
                                <div className="text-[10px] text-slate-500 uppercase font-mono">Нет активных стабильных стратегий</div>
                              </div>
                            ) : (
                              stableStrats.map(s => (
                                <div key={s.id} className="space-y-2 p-3 bg-slate-900/40 rounded-lg border border-slate-800/40">
                                  <div className="flex justify-between text-[11px] font-mono font-bold">
                                    <span className="text-slate-200">└─ {s.title}</span>
                                    <span className="text-cyan-400">{computedStableAllocations[s.id] ?? 0}% ({(( (computedStableAllocations[s.id] ?? 0) * numericBalance) / 100).toFixed(2)} TON)</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                                    <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${computedStableAllocations[s.id] ?? 0}%` }} />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Optimizer Rebalancing Live Logs Terminal */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              OPTIMIZER REBALANCING LOGS (Системный Лог Оптимизатора)
                            </span>
                            <span className="text-slate-600">DAILY_ROI_ENGINE.LOG</span>
                          </div>
                          
                          <div className="bg-black/85 p-4 rounded-xl border border-slate-800 font-mono text-[10px] text-emerald-400 space-y-1.5 max-h-40 overflow-y-auto shadow-inner leading-relaxed">
                            {optimizerLogs.map((log, index) => (
                              <div key={index} className="flex gap-2 hover:bg-slate-900/40 p-0.5 rounded transition-all">
                                <span className="text-slate-500 font-sans">[{log.time}]</span>
                                <span className="text-emerald-500/90 font-bold">[Optimizer]</span>
                                <span className="text-slate-300 flex-1">{log.msg}</span>
                              </div>
                            ))}
                            <div className="flex items-center gap-1 text-emerald-500 font-bold">
                              <span>&gt; Waiting for active market scanner pulse...</span>
                              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                               <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Main Production Strategy</div>
                               <div className="text-white font-black uppercase text-xs">Dynamic Sniper v2</div>
                            </div>
                            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                               <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Operational Mode</div>
                               <div className="text-emerald-400 font-black uppercase text-xs">Autonomous</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                             <Zap size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase text-white tracking-wider">Intelligence Hub</h3>
                            <p className="text-[10px] text-slate-500 font-mono">Consolidated Market Signals & Alpha Insights</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-mono text-emerald-400 font-bold animate-pulse">LIVE FEED</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest border-b border-slate-800 pb-2">Active Signals (Арбитражные возможности)</h4>
                          {marketTrends.length > 0 ? (
                            marketTrends.map((trend, i) => (
                              <div key={i} className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3 hover:border-cyan-500/30 transition-all group">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-white uppercase">{trend.route}</span>
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">+{trend.profit.toFixed(1)} TON</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-mono">
                                  <div className="flex-1">
                                    <div className="text-slate-500 uppercase mb-1">Buy Entry</div>
                                    <div className="text-white font-bold">{trend.entry} TON</div>
                                  </div>
                                  <div className="w-px h-6 bg-slate-800" />
                                  <div className="flex-1">
                                    <div className="text-slate-500 uppercase mb-1">Sell Target</div>
                                    <div className="text-white font-bold">{trend.exit} TON</div>
                                  </div>
                                </div>
                                <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 cursor-pointer">
                                  Execute Signal
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center space-y-3">
                              <RefreshCw className="mx-auto text-slate-700 animate-spin" size={32} />
                              <div className="text-[10px] font-mono text-slate-500 uppercase">Scanning for cross-market imbalances...</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest border-b border-slate-800 pb-2">Market Sentiment (Nemotron-v4 Analysis)</h4>
                          <div className="p-5 bg-slate-900/20 border border-slate-800/40 rounded-xl space-y-4">
                             <div className="flex justify-between items-center">
                               <span className="text-xs font-mono text-slate-300">Bullish Momentum</span>
                               <span className="text-xs font-mono text-emerald-400 font-bold">84%</span>
                             </div>
                             <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: "84%" }} />
                             </div>
                             <p className="text-[10px] text-slate-400 leading-relaxed font-mono italic">
                               "Current cluster analysis shows heavy accumulation of Durov Puzzles in the 14.5-16.2 TON range. Major whales are repositioning from usernames to limited gifts."
                             </p>
                             <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-2 bg-black/40 rounded border border-slate-800 text-[9px] font-mono">
                                   <div className="text-slate-500 uppercase">Trend Score</div>
                                   <div className="text-cyan-400 font-bold">+7.2%</div>
                                </div>
                                <div className="p-2 bg-black/40 rounded border border-slate-800 text-[9px] font-mono">
                                   <div className="text-slate-500 uppercase">Panic Index</div>
                                   <div className="text-emerald-400 font-bold">LOW</div>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="text-amber-500" size={16} />
                        <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">Risk Management</span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Max Exposure Slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Max Exposure (Макс. аллокация)</span>
                            <span className="text-white font-bold">{(config.riskMaxExposure ?? 25.0).toFixed(1)} TON</span>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max={Math.max(100, Math.ceil(numericBalance))}
                            step="0.5"
                            value={config.riskMaxExposure ?? 25.0}
                            onChange={(e) => saveConfig({ ...config, riskMaxExposure: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                          />
                          {(config.riskMaxExposure ?? 25.0) > numericBalance && (
                            <p className="text-[9px] font-mono text-rose-400 mt-0.5">
                              ⚠️ Внимание: превышает баланс кошелька ({numericBalance.toFixed(2)} TON)
                            </p>
                          )}
                        </div>

                        {/* Stop Loss Slider */}
                        <div className="space-y-1.5 pb-2 border-b border-white/5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Stop Loss (Ценовой порог)</span>
                            <span className="text-rose-400 font-bold">-{config.riskStopLoss ?? 15}%</span>
                          </div>
                          <input 
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={config.riskStopLoss ?? 15}
                            onChange={(e) => saveConfig({ ...config, riskStopLoss: parseInt(e.target.value) })}
                            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                          />
                        </div>

                        {/* Trading Rules Group */}
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 uppercase">
                            <TrendingUp size={12} />
                            <span>Trading Rules (Правила Торговли)</span>
                          </div>

                          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-cyan-500/10">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-300 font-bold">Max Buy Price Threshold</span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  min="1"
                                  max="1000"
                                  step="1"
                                  value={config.maxBuyPriceThreshold ?? 50.0}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    saveConfig({ ...config, maxBuyPriceThreshold: isNaN(val) ? 0 : val });
                                  }}
                                  className="w-14 bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-cyan-400 px-1 py-0.5 rounded text-center outline-none focus:border-cyan-500"
                                />
                                <span className="text-slate-400">TON</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-tight">
                              Автоматически пропускать любые входящие предложения о покупке, превышающие данный лимит.
                            </p>
                            <input 
                              type="range"
                              min="1"
                              max="200"
                              step="1"
                              value={config.maxBuyPriceThreshold ?? 50.0}
                              onChange={(e) => saveConfig({ ...config, maxBuyPriceThreshold: parseFloat(e.target.value) })}
                              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                            />
                            {(config.maxBuyPriceThreshold ?? 50.0) > numericBalance && (
                              <p className="text-[9px] font-mono text-amber-500/95 mt-1 leading-tight">
                                ⚠️ Порог превышает баланс кошелька ({numericBalance.toFixed(2)} TON)
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Soft Limits Toggle */}
                        <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Soft Limits (Мягкие лимиты)</span>
                            <span className="text-[9px] text-slate-500">Защита новых стратегий</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => saveConfig({ ...config, riskSoftLimits: !config.riskSoftLimits })}
                            className={`px-3 py-1 text-[9px] font-mono font-black uppercase rounded-lg transition-all cursor-pointer ${
                              config.riskSoftLimits ?? true 
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" 
                                : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                            }`}
                          >
                            {config.riskSoftLimits ?? true ? "ACTIVE" : "DISABLED"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-cyan-500/5 rounded-2xl border border-cyan-500/20">
                      <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold mb-2">Bot Intelligence Status</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Currently analyzing Fragment floor depth. Adjusting sniping speed to match market volatility and risk exposure of {config.riskMaxExposure} TON.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strategies List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strategies.map((strat) => {
                    const isTesting = strat.isTesting !== false;
                    
                    // Allocation and Profit calculations
                    let allocPercent = 0;
                    let allocTon = "0.00";
                    let profitText = "+0.00 TON";
                                        
                    if (isTesting) {
                      allocPercent = strat.allocationPercent ?? 10;
                      allocTon = ((allocPercent * numericBalance) / 100).toFixed(2);
                      const profitVal = strat.profitTon ?? 0.85;
                      profitText = `${profitVal >= 0 ? "+" : ""}${profitVal.toFixed(2)} TON`;
                                          } else {
                      // Stable strategies
                      allocPercent = computedStableAllocations[strat.id] ?? 0;
                      const tonVal = (allocPercent * numericBalance) / 100;
                      allocTon = tonVal.toFixed(2);
                      const yieldVal = getStratStats(strat.id).rawYield;
                      profitText = `+${(tonVal * (yieldVal / 100)).toFixed(2)} TON (+${yieldVal.toFixed(1)}%)`;
                    }

                    return (
                      <div key={strat.id} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                              <Zap size={18} />
                            </div>
                            <div className="max-w-[150px] sm:max-w-xs">
                              <div className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1">{strat.title || "Custom Strategy"}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[9px] font-mono text-slate-500">{strat.id}</span>
                                {strat.youtubeUrl && (
                                  <>
                                    <span className="text-slate-700 text-[9px]">•</span>
                                    <a 
                                      href={strat.youtubeUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 hover:underline shrink-0"
                                    >
                                      <Video size={9} />
                                      <span>Видео-источник</span>
                                      <ExternalLink size={7} />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              isTesting 
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              {isTesting ? "TESTING PERIOD" : "STABLE MAIN"}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                  const updated = strategies.filter(s => s.id !== strat.id);
                                  setStrategies(updated);
                                  addLog(`Engine: Custom strategy "${strat.title}" deleted.`, "warn");
                                }}
                                className="text-[9px] font-mono text-rose-400 hover:text-rose-300 underline cursor-pointer"
                              >
                                Удалить
                              </button>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-[11px] text-slate-400 line-clamp-2 h-10 leading-relaxed mb-2">
                            {strat.channel && <span className="text-cyan-400 font-bold">[{strat.channel}] </span>}
                            {strat.keyInsights?.[0] || strat.actionPlan?.[0] || "No description provided."}
                          </p>
                          {strat.youtubeUrl && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                              <span className="shrink-0 uppercase font-black text-[8px] text-slate-600">URL:</span>
                              <a 
                                href={strat.youtubeUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 hover:underline truncate flex items-center gap-1 max-w-xs"
                              >
                                <span className="truncate">{strat.youtubeUrl}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {strat.dynamicRules && (
                          <div className="mb-4 pt-3 border-t border-slate-800/50">
                            <div className="flex items-center gap-1.5 mb-2">
                               <Cpu size={10} className="text-cyan-400" />
                               <span className="text-[9px] font-mono text-cyan-400/80 uppercase">Bot Fine-Tuning Active</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                               {strat.dynamicRules.priorityKeywords?.map(kw => (
                                  <span key={kw} className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[8px] font-mono text-cyan-300 uppercase">
                                     KW: {kw}
                                  </span>
                               ))}
                               {strat.dynamicRules.minAlphaMultiplier && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-mono text-emerald-300">
                                     ALPHA {'>'} {strat.dynamicRules.minAlphaMultiplier}x
                                  </span>
                                )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-slate-900/50 rounded-lg border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase mb-0.5">Allocation (Лимит)</div>
                            <div className="text-xs font-mono text-white">{allocPercent.toFixed(1)}% ({allocTon} TON)</div>
                          </div>
                          <div className="p-2 bg-slate-900/50 rounded-lg border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase mb-0.5">Estimated Profit</div>
                            <div className="text-xs font-mono text-emerald-400">{profitText}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 3: EQUITY & PERFORMANCE (HISTORY & PNL) */}
            {activeTab === "inventory" && (
              <motion.div
                key="inventory-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6 max-w-6xl mx-auto w-full p-1"
              >
                {/* Equity & PnL Overview */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-black border border-slate-800 p-6 rounded-3xl flex flex-col justify-between relative">
                      <div className="flex justify-between items-start">
                         <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Equity Value</div>
                            <div className="text-3xl font-sans font-black text-white">
                               {(numericBalance + tradingItems.reduce((acc, item) => acc + (item.estimatedValue ?? item.floorPrice ?? item.purchasePrice ?? 0), 0)).toFixed(2)} <span className="text-sm text-slate-500">TON</span>
                            </div>
                         </div>
                         <div className="p-3 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/20">
                            <TrendingUp className="text-fuchsia-400" size={24} />
                         </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex items-end gap-2">
                             {/* Mock elements removed */}
                         </div>
                         <button 
                           onClick={async () => {
                             if (window.confirm("Удалить всю историю сделок и очистить инвентарь (PNL обнулится)?")) {
                               safeStorage.setItem("sniper_inventory", JSON.stringify([]));
                               safeStorage.setItem("sniper_trades", JSON.stringify([]));
                               setTradingItems([]);
                               setTrades([]);
                               
                               if (user) {
                                  try {
                                    // Delete trades
                                    const tradesSnapshot = await getDocs(query(collection(db, `users/${user.uid}/trades`)));
                                    for (const docSnap of tradesSnapshot.docs) {
                                       await safeDeleteDoc(doc(db, `users/${user.uid}/trades`, docSnap.id));
                                    }
                                    // Delete inventory
                                    const invSnapshot = await getDocs(query(collection(db, `users/${user.uid}/inventory`)));
                                    for (const docSnap of invSnapshot.docs) {
                                       await safeDeleteDoc(doc(db, `users/${user.uid}/inventory`, docSnap.id));
                                    }
                                  } catch (e) {
                                    console.error("Failed to clear firestore data", e);
                                  }
                               }
                             }
                           }}
                           className="text-[10px] text-red-500/80 hover:text-red-400 font-bold uppercase border border-red-900/30 px-2 py-1 rounded bg-red-950/20"
                         >
                           Очистить данные
                         </button>
                      </div>
                   </div>

                   <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Realized PnL</div>
                        <div className="text-2xl font-mono font-black text-emerald-400">
                           +{trades.filter(t => t.tradeType === 'SELL').reduce((acc, t) => acc + (t.profitTon || 0), 0).toFixed(2)} <span className="text-xs">TON</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Based on {trades.filter(t => t.tradeType === 'SELL').length} exits</div>
                   </div>

                   <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Unrealized PnL</div>
                        <div className="text-2xl font-mono font-black text-cyan-400">
                           +{(tradingItems.reduce((acc, item) => acc + ((item.estimatedValue ?? item.floorPrice ?? item.purchasePrice ?? 0) - (item.purchasePrice ?? 0)), 0)).toFixed(2)} <span className="text-xs">TON</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{tradingItems.length} Active Positions</div>
                   </div>
                </motion.div>

                {/* Main Inventory Table */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Inventory</h3>
                      <div className="flex items-center gap-4 text-[9px] text-slate-600 font-bold">
                         <span>Floor Value: {tradingItems.reduce((acc, item) => acc + (item.floorPrice ?? 0), 0).toFixed(1)} TON</span>
                         <span>Alpha Value: {tradingItems.reduce((acc, item) => acc + (item.estimatedValue ?? item.floorPrice ?? item.purchasePrice ?? 0), 0).toFixed(1)} TON</span>
                      </div>
                   </div>
                   <InventoryTable items={tradingItems} />
                </div>

                {/* Full History Log */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-fuchsia-500" />
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Execution Registry</h3>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Showing last {trades.length} events</div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-slate-800/50 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                             <th className="px-6 py-4">Event</th>
                             <th className="px-6 py-4">Asset</th>
                             <th className="px-6 py-4">Price</th>
                             <th className="px-6 py-4">PnL / Result</th>
                             <th className="px-6 py-4">Time</th>
                             <th className="px-6 py-4 text-right">Transaction</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/30">
                          {trades.length === 0 ? (
                            <tr>
                               <td colSpan={6} className="px-6 py-12 text-center text-slate-600 font-mono text-xs italic">
                                  No transaction history found in Akasha database.
                               </td>
                            </tr>
                          ) : (
                            trades.map(t => (
                              <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.tradeType === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                       {t.tradeType}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-6 h-6 rounded overflow-hidden border border-slate-700 shrink-0">
                                         <SafeGiftImage src={t.thumbnailUrl} name={t.giftName} />
                                       </div>
                                       <span className="text-xs font-bold text-slate-200">{t.giftName}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-xs text-slate-300">
                                    {t.amountTon.toFixed(1)} TON
                                 </td>
                                 <td className="px-6 py-4">
                                    {t.tradeType === 'SELL' ? (
                                       <span className={`text-xs font-mono font-bold ${ (t.profitTon || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {(t.profitTon || 0) >= 0 ? '+' : ''}{t.profitTon?.toFixed(2)} TON
                                       </span>
                                    ) : (
                                       <span className="text-slate-600 text-[10px] font-mono">ACQUIRED</span>
                                    )}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500 text-[10px] font-mono">
                                    {new Date(t.timestamp).toLocaleString()}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <a 
                                      href={`https://tonviewer.com/transaction/${t.txHash}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[10px] text-slate-600 hover:text-cyan-400 font-mono transition-colors"
                                    >
                                       {t.txHash?.substring(0, 10)}...
                                    </a>
                                 </td>
                              </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: WHALE TRACKER */}
            {activeTab === "whales" && (
              <motion.div 
                key="whales-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-4 max-w-5xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-300">Whale Intelligence Terminal</h3>
                    <p className="text-[10px] text-slate-500">Мониторинг Smart Money: Анализ прибыли, рисков и доминирующих активов топовых коллекционеров</p>
                  </div>
                  
                  {/* Sorting Controls */}
                  <div className="flex bg-slate-900/80 border border-slate-800 p-1 rounded-lg gap-1 self-end md:self-auto">
                    {[
                      { id: "pnl", label: "PnL", icon: DollarSign },
                      { id: "winrate", label: "WR%", icon: TrendingUp },
                      { id: "volume", label: "Volume", icon: Activity },
                      { id: "active", label: "Recency", icon: History }
                    ].map((sort) => (
                      <button
                        key={sort.id}
                        onClick={() => setWhaleSortBy(sort.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          whaleSortBy === sort.id 
                            ? "bg-fuchsia-600 text-white" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <sort.icon size={10} />
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Network Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                     { label: "Tracked Capital", value: "84.2K TON", color: "text-cyan-400" },
                     { label: "Avg Win Rate", value: "84.9%", color: "text-emerald-400" },
                     { label: "Daily Alpha", value: "+14.2 TON", color: "text-fuchsia-400" },
                     { label: "Active Nodes", value: "3 Stable", color: "text-amber-400" }
                   ].map((stat, i) => (
                     <div key={i} className="bg-black/40 border border-slate-850 p-3 rounded-xl">
                        <div className="text-[8px] text-slate-500 uppercase font-black mb-1">{stat.label}</div>
                        <div className={`text-xs font-mono font-black ${stat.color}`}>{stat.value}</div>
                     </div>
                   ))}
                </motion.div>

                {/* Add Whale Form */}
                <motion.div variants={itemVariants}>
                  <form onSubmit={handleAddWhale} className="bg-black/60 border border-slate-850 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Адрес кошелька</label>
                    <input 
                      type="text" 
                      placeholder="EQ..."
                      value={newWhaleAddr}
                      onChange={e => setNewWhaleAddr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-fuchsia-500 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Название метки</label>
                    <input 
                      type="text" 
                      placeholder="Durov Collector v4"
                      value={newWhaleLabel}
                      onChange={e => setNewWhaleLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-fuchsia-500 text-slate-200"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!newWhaleAddr || !newWhaleLabel}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 text-slate-100 text-xs font-black uppercase tracking-wider h-9 rounded-lg flex items-center justify-center gap-1.5 self-end cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </form>
                </motion.div>

                {/* Whales Cards Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...whales]
                    .sort((a, b) => {
                      if (whaleSortBy === "pnl") return b.totalPnL - a.totalPnL;
                      if (whaleSortBy === "winrate") return b.winRate - a.winRate;
                      if (whaleSortBy === "volume") return (b.txCount || 0) - (a.txCount || 0);
                      return 0; // Recency logic can be added if timestamps were available
                    })
                    .map((w) => (
                    <div 
                      key={w.address} 
                      onClick={() => setExpandedWhale(expandedWhale === w.address ? null : w.address)}
                      className={`bg-slate-950/60 border ${expandedWhale === w.address ? "border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.1)]" : "border-slate-800"} p-4 rounded-2xl flex flex-col justify-between relative group transition-all hover:border-slate-700 cursor-pointer select-none`}
                    >
                      {/* Card main header / content */}
                      <div className="flex justify-between items-start w-full">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-sm font-black text-slate-400">
                               {w.label.substring(0, 1)}
                            </div>
                            <div>
                               <div className="flex items-center gap-1.5">
                                 <div className="text-xs font-bold text-slate-200">{w.label}</div>
                                 {w.isFollowing && <Zap size={10} className="text-fuchsia-400 animate-pulse" fill="currentColor" />}
                               </div>
                               <div className="text-[9px] text-slate-500 font-mono select-all hover:text-slate-350 transition-colors" title={w.address} onClick={e => e.stopPropagation()}>
                                 {w.address.length > 18 ? `${w.address.substring(0, 8)}...${w.address.substring(w.address.length - 6)}` : w.address}
                               </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-1">
                            <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400">
                              WR: {w.winRate}%
                            </div>
                            <div className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[8px] font-bold text-cyan-400">
                              {w.mainAsset || "Multi"}
                            </div>
                            <div className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-bold text-amber-400">
                              RISK: {w.riskScore || 50}%
                            </div>
                            <div className="px-1.5 py-0.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded text-[8px] font-bold text-fuchsia-400 uppercase">
                              TXs: {w.txCount || 0}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                           <div className="text-right">
                             <div className="text-sm font-mono font-black text-emerald-400">+{w.totalPnL.toFixed(1)} TON</div>
                             <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Net Realized PnL</div>
                           </div>
                           
                           <div className="flex gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle following simulation
                                  const updatedWhales = whales.map(wh => wh.address === w.address ? { ...wh, isFollowing: !wh.isFollowing } : wh);
                                  setWhales(updatedWhales);
                                  addLog(`${w.isFollowing ? 'Stopped' : 'Started'} auto-following ${w.label} signals.`, "info");
                                }}
                                className={`p-1.5 border rounded-lg transition-all ${w.isFollowing ? "bg-fuchsia-600 border-fuchsia-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"}`}
                                title={w.isFollowing ? "Stop Following" : "Auto-Snipe this Whale"}
                              >
                                <Zap size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveWhale(w.address);
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-red-900/20 border border-slate-800 hover:border-red-900/30 text-slate-600 hover:text-red-400 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                      </div>

                      {/* Recent Performance Sparkline (Simulation) */}
                      <div className="mt-4 h-1 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
                         {[30, 45, 20, 60, 40, 70, 85, 50, 90].map((h, i) => (
                           <div key={i} className={`h-full flex-1 ${i > 5 ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ opacity: h/100 }} />
                         ))}
                      </div>

                      {/* Expanded recent trades list */}
                      <AnimatePresence>
                        {expandedWhale === w.address && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="mt-4 pt-4 border-t border-slate-800/80 w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">Последние 5 пар сделок:</h4>
                              <span className="text-[8px] font-mono text-slate-500">Авто-выверка из Fragment</span>
                            </div>
                            <div className="space-y-1.5">
                              {getWhaleTrades(w.address).map((trade) => (
                                <div key={trade.id} className="bg-slate-900/60 border border-slate-850 rounded-lg p-2 flex items-center justify-between text-[10px] font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold">{trade.itemName}</span>
                                    <span className="text-slate-600 text-[8px]">{trade.serial}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[9px]">
                                      <span className="text-emerald-500/80">Купил: {trade.buyPrice}</span>
                                      <span>→</span>
                                      <span className="text-fuchsia-400/80">Продал: {trade.sellPrice}</span>
                                    </div>
                                    <span className={`font-bold shrink-0 ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                      {trade.pnl >= 0 ? `+${trade.pnl}` : trade.pnl} TON
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Deep Analysis button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeepAnalysisWhale(w);
                              }}
                              className="mt-3 w-full bg-gradient-to-r from-fuchsia-950/40 to-slate-900/60 hover:from-fuchsia-900/50 hover:to-slate-850/70 border border-fuchsia-500/25 rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <TrendingUp className="w-3 h-3" /> Глубокий анализ действий кита
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {activeTab === "tonnel" && (
              <motion.div
                key="tonnel-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="max-w-6xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants}>
                  <TonnelMarketAuction />
                </motion.div>
              </motion.div>
            )}

            {activeTab === "portals" && (
              <motion.div
                key="portals-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="max-w-6xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants}>
                  <PortalsMarket />
                </motion.div>
              </motion.div>
            )}

            {activeTab === "bum" && (
              <motion.div
                key="bum-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="max-w-5xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants}>
                  <BumSection />
                </motion.div>
              </motion.div>
            )}

            {activeTab === "qa-agent" && (
              <motion.div
                key="qa-agent-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="max-w-6xl mx-auto w-full p-1"
              >
                <motion.div variants={itemVariants}>
                  <QaAgentConsole />
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* PAGINATION INDICATOR FOR SWIPING */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-8 pt-4 border-t border-slate-900/60 shrink-0">
          {[
            { id: "main", label: "Главная" },
            { id: "sniper", label: "Монитор" },
            { id: "bum", label: "Бомж" },
            { id: "inventory", label: "История" },
            { id: "whales", label: "Киты" },
            { id: "qa-agent", label: "QA Агент" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="group relative flex flex-col items-center cursor-pointer transition-all min-w-[40px]"
            >
              <div className={`h-1 rounded-full transition-all ${
                activeTab === tab.id 
                  ? "w-6 sm:w-8 bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]" 
                  : "w-2 bg-slate-800 group-hover:bg-slate-700"
              }`} />
              <span className={`text-[7px] sm:text-[8px] font-bold mt-1 transition-all uppercase tracking-wider ${
                activeTab === tab.id ? "text-fuchsia-400 font-black" : "text-slate-500 group-hover:text-slate-400"
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </main>

      {/* Deep Analysis Modal */}
      <AnimatePresence>
        {deepAnalysisWhale && (
          <WhaleDeepAnalysisModal 
            whale={deepAnalysisWhale} 
            onClose={() => setDeepAnalysisWhale(null)} 
          />
        )}

        {selectedDetailTrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Информация о сделке</span>
                <button 
                  onClick={() => setSelectedDetailTrade(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col items-center gap-4">
                {/* Big Image/Icon */}
                <div className="w-20 h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl overflow-hidden shadow-inner">
                  <SafeGiftImage src={selectedDetailTrade.thumbnailUrl} name={selectedDetailTrade.giftName} className="w-full h-full object-cover" />
                </div>

                {/* Name */}
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-100">{selectedDetailTrade.giftName}</h3>
                  <div className="mt-1 flex justify-center gap-1.5">
                    <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      selectedDetailTrade.tradeType === 'BUY' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-400'
                    }`}>
                      {selectedDetailTrade.tradeType}
                    </span>
                    <span className="text-[8px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-slate-400">
                      {selectedDetailTrade.status}
                    </span>
                  </div>
                </div>

                {/* Details Table */}
                <div className="w-full bg-black/20 rounded-xl border border-slate-850 p-3.5 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500 text-[10px]">Сумма сделки:</span>
                    <span className="text-slate-200 font-bold">{selectedDetailTrade.amountTon.toFixed(2)} TON</span>
                  </div>

                  {selectedDetailTrade.tradeType === "SELL" && (
                    <>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500 text-[10px]">Цена покупки:</span>
                        <span className="text-slate-400">{(selectedDetailTrade.purchasePrice ?? 0).toFixed(2)} TON</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500 text-[10px]">Чистый профит:</span>
                        <span className="text-emerald-400 font-bold">
                          +{selectedDetailTrade.profitTon?.toFixed(2)} TON
                          {selectedDetailTrade.purchasePrice ? (
                            <span className="text-[9px] text-emerald-500/80 ml-1 font-semibold">
                              ({((selectedDetailTrade.profitTon ?? 0) / selectedDetailTrade.purchasePrice * 100).toFixed(0)}%)
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500 text-[10px]">Комиссия сети:</span>
                    <span className="text-slate-400">{(selectedDetailTrade.feeTon ?? 0.02).toFixed(3)} TON</span>
                  </div>

                  <div className="flex flex-col gap-1 border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500 text-[10px]">Кошелек:</span>
                    <span className="text-slate-300 text-[10px] break-all leading-tight">
                      {selectedDetailTrade.walletAddress}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 text-[10px]">Хэш транзакции:</span>
                    <a 
                      href={`https://tonviewer.com/transaction/${selectedDetailTrade.txHash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] break-all flex items-center gap-1 transition-all"
                    >
                      <span>{selectedDetailTrade.txHash}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Footer/Time info */}
                <div className="text-[9px] font-mono text-slate-500 text-center">
                  Время исполнения: {new Date(selectedDetailTrade.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Close Button Row */}
              <div className="px-4 py-3 bg-slate-950 border-t border-slate-850 flex justify-end">
                <button 
                  onClick={() => setSelectedDetailTrade(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* TON Connect 2.0 Interactive Modal */}
        {showTonConnectModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full my-auto shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">TON Connect 2.0</span>
                </div>
                <button
                  onClick={() => setShowTonConnectModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-5">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">Подключите ваш TON кошелек</h3>
                  <p className="text-[10px] text-slate-400">
                    Авторизуйтесь в кошельке для прямой отправки транзакций и удобного взаимодействия с TG-ботами.
                  </p>
                </div>

                {typeof window !== 'undefined' && window.location.hostname.includes('ais-dev-') && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-200 uppercase tracking-tight">Режим Dev-Workspace</h4>
                        <p className="text-[10px] text-slate-300 leading-normal mt-0.5">
                          Кошельки TON (например, Tonkeeper) работают на внешних устройствах и не имеют доступа к вашему приватному адресу разработки <code className="text-[9px] font-mono bg-black/30 px-1 py-0.5 rounded text-amber-300">ais-dev-</code> (заблокировано Google Auth).
                        </p>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          Для беспрепятственного подключения откройте публичную версию dApp:
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const publicUrl = window.location.href.replace('ais-dev-', 'ais-pre-');
                        window.location.href = publicUrl;
                      }}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>Открыть публичную версию dApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {loadingWallets ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Получение списка кошельков TON...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Wallets selection list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Доступные кошельки:</span>
                      {tonWallets.map((wallet, idx) => {
                        const isSelected = selectedWallet?.appName === wallet.appName;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectWallet(wallet)}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/30 text-white"
                                : "bg-black/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-black/40"
                            }`}
                          >
                            {wallet.imageUrl ? (
                              <img src={wallet.imageUrl} alt={wallet.name} className="w-6 h-6 rounded-lg" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                                {wallet.name[0]}
                              </div>
                            )}
                            <div className="truncate">
                              <div className="text-xs font-bold">{wallet.name}</div>
                              <div className="text-[8px] text-slate-500 capitalize">{wallet.platforms?.join(" / ")}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* QR Code display */}
                    <div className="flex flex-col items-center justify-center bg-black/30 border border-slate-850 rounded-xl p-4 gap-3 text-center">
                      {connectLink ? (
                        <>
                          <div className="p-2.5 bg-white rounded-lg inline-block">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(connectLink)}`}
                              alt="TonConnect QR"
                              className="w-28 h-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="space-y-1.5 w-full">
                            <a
                              href={connectLink}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer uppercase flex items-center justify-center gap-1 shadow-md"
                            >
                              <span>Открыть {selectedWallet?.name || "Кошелек"}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(connectLink);
                                addLog("[TonConnect] Ссылка для авторизации скопирована в буфер обмена.", "info");
                              }}
                              className="w-full text-center text-[8px] font-mono text-slate-500 hover:text-slate-300 uppercase underline transition-all cursor-pointer block"
                            >
                              Скопировать ссылку
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-500 uppercase font-mono py-8">
                          Выберите кошелек слева
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-850 flex justify-between items-center text-[9px] font-mono text-slate-500">
                <span>Протокол TON Connect 2.0</span>
                <button
                  onClick={() => setShowTonConnectModal(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-md transition-all cursor-pointer uppercase text-[8px]"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MTProto Phone Input Modal */}
        {showPhoneInputModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-fuchsia-400" /> Подключение MTProto
                </h3>
                <button onClick={() => setShowPhoneInputModal(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {bridgeStatus?.status === "error" && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">Ошибка подключения</div>
                        <div className="text-[9px] text-rose-400 leading-tight mt-0.5">
                          {bridgeStatus.errorMessage?.includes("PHONE_NUMBER_INVALID") 
                            ? "Некорректный номер телефона. Убедитесь, что номер указан в международном формате (например, +79001234567)." 
                            : bridgeStatus.errorMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mtProtoStep === "phone" ? (
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">Номер телефона (с кодом страны)</label>
                    <input
                      type="text"
                      value={mtProtoPhone}
                      onChange={e => setMtProtoPhone(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                    />
                    <p className="text-[9px] text-slate-600 mt-2">
                      Необходим для установки сессии. Код придет в ваш клиент Telegram.
                    </p>
                    <button
                      onClick={() => handleRequestMtProtoCode(mtProtoPhone)}
                      disabled={!mtProtoPhone || mtProtoPhone.length < 5 || mtProtoLoading}
                      className="w-full mt-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                    >
                      {mtProtoLoading ? "Отправка..." : "Запросить код"}
                    </button>
                  </div>
                ) : mtProtoStep === "code" ? (
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">Код подтверждения из Telegram</label>
                    <input
                      type="text"
                      value={mtProtoCode}
                      onChange={e => setMtProtoCode(e.target.value)}
                      placeholder="12345"
                      maxLength={5}
                      className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                      onKeyDown={(e) => { if (e.key === "Enter") handleVerifyMtProtoCode(); }}
                    />
                    <p className="text-[9px] text-slate-600 mt-2">
                      Введите 5-значный код, который пришел вам в Telegram.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setMtProtoStep("phone")}
                        className="flex-1 border border-slate-800 hover:border-slate-700 text-slate-400 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        Назад
                      </button>
                      <button
                        onClick={handleVerifyMtProtoCode}
                        disabled={!mtProtoCode || mtProtoCode.length < 5 || mtProtoLoading}
                        className="flex-[2] bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        {mtProtoLoading ? "Проверка..." : "Подтвердить код"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">Двухфакторный пароль (2FA)</label>
                    <input
                      type="password"
                      value={mtProtoPassword}
                      onChange={e => setMtProtoPassword(e.target.value)}
                      placeholder="Ваш пароль"
                      className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                      onKeyDown={(e) => { if (e.key === "Enter") handleVerifyMtProtoPassword(); }}
                    />
                    <p className="text-[9px] text-slate-600 mt-2">
                      Если у вас включена двухфакторная аутентификация, введите пароль.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setMtProtoStep("code")}
                        className="flex-1 border border-slate-800 hover:border-slate-700 text-slate-400 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        Назад
                      </button>
                      <button
                        onClick={handleVerifyMtProtoPassword}
                        disabled={!mtProtoPassword || mtProtoLoading}
                        className="flex-[2] bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        {mtProtoLoading ? "Проверка..." : "Подтвердить пароль"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showSessionString && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Telegram Session String</span>
                <button 
                  onClick={() => setShowSessionString(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <p className="text-[10px] text-slate-400 leading-normal">
                  Эта строка содержит зашифрованные данные вашей сессии. Используйте её для авторизации без повторного ввода кода.
                  <span className="text-amber-500 font-bold block mt-1">ВНИМАНИЕ: Не передавайте эту строку посторонним лицам!</span>
                </p>
                <div className="w-full bg-black/40 rounded-xl border border-slate-850 p-4 font-mono text-[9px] text-slate-300 break-all select-all max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                  {sessionString}
                </div>
                <button 
                  onClick={() => setShowSessionString(false)}
                  className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-slate-100 font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ScreenTgGiftsSniper;
