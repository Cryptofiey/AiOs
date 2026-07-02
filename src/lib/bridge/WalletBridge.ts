import { TonConnect, Wallet } from '@tonconnect/sdk';
import { AuthAgent } from '../agents/AuthAgent';

export interface WalletBridgeState {
  connected: boolean;
  walletAddress: string | null;
  walletName: string | null;
  platform: string | null;
  headless?: boolean;
}

export const FALLBACK_WALLETS = [
  {
    name: "Tonkeeper",
    appName: "tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonkeeper-icon.png",
    aboutUrl: "https://tonkeeper.com",
    platforms: ["chrome", "firefox", "safari", "ios", "android", "macos", "windows", "linux"],
    universalLink: "https://app.tonkeeper.com/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge"
  },
  {
    name: "MyTonWallet",
    appName: "mytonwallet",
    imageUrl: "https://mytonwallet.org/assets/mytonwallet-icon-256.png",
    aboutUrl: "https://mytonwallet.org",
    platforms: ["chrome", "firefox", "safari", "ios", "android", "macos", "windows", "linux"],
    universalLink: "https://mytonwallet.org/connect",
    bridgeUrl: "https://tonconnect.mytonwallet.org/bridge"
  },
  {
    name: "Tonhub",
    appName: "tonhub",
    imageUrl: "https://tonhub.com/images/favicon.png",
    aboutUrl: "https://tonhub.com",
    platforms: ["ios", "android"],
    universalLink: "https://tonhub.com/ton-connect",
    bridgeUrl: "https://connect.tonhubapi.com/tonconnect"
  },
  {
    name: "Wallet",
    appName: "telegram-wallet",
    imageUrl: "https://wallet.tg/assets/wallet-logo.png",
    aboutUrl: "https://wallet.tg",
    platforms: ["ios", "android"],
    universalLink: "https://t.me/wallet/start",
    bridgeUrl: "https://bridge.pay.wallet.tg/bridge"
  }
];

/**
 * WalletBridge - Unified bridge for TonConnect 2.0.
 * Orchestrates secure transaction signing and interaction with 3rd-party bots.
 */
export class WalletBridge {
  private static instance: WalletBridge;
  private connector: TonConnect;
  private state: WalletBridgeState = {
    connected: false,
    walletAddress: null,
    walletName: null,
    platform: null,
  };
  
  private listeners: Set<(state: WalletBridgeState) => void> = new Set();

  private constructor() {
    let origin = 'https://ais-dev-3bsg4blwiw52nue7n6mhhb-353630885774.asia-southeast1.run.app';
    if (typeof window !== 'undefined') {
      const locOrigin = window.location.origin;
      if (locOrigin && locOrigin !== 'null' && locOrigin !== 'about:blank') {
        origin = locOrigin;
      }
    }
    const manifestUrl = "https://raw.githubusercontent.com/Cryptofiey/AiOs/main/public/tonconnect-manifest.json";

    // Wrap storage with robust fallback to handle localStorage restrictions in iframes
    const safeStorage = {
      store: {} as Record<string, string>,
      async getItem(key: string): Promise<string | null> {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
          }
        } catch (e) {
          console.warn("[SafeStorage] localStorage.getItem failed, falling back to memory:", e);
        }
        return this.store[key] || null;
      },
      async setItem(key: string, value: string): Promise<void> {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
            return;
          }
        } catch (e) {
          console.warn("[SafeStorage] localStorage.setItem failed, falling back to memory:", e);
        }
        this.store[key] = value;
      },
      async removeItem(key: string): Promise<void> {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
            return;
          }
        } catch (e) {
          console.warn("[SafeStorage] localStorage.removeItem failed, falling back to memory:", e);
        }
        delete this.store[key];
      }
    };

    // Handle any unhandled promise rejections and uncaught exceptions globally for TonConnect SDK BEFORE initialization
    // Error suppressions removed to allow debugging real wallet connection

    this.connector = new TonConnect({
      manifestUrl,
      storage: safeStorage,
      analytics: {
        mode: 'off'
      } as any
    });

    this.connector.onStatusChange((wallet) => {
      this.updateState(wallet);
    }, (error) => {
      console.warn("[WalletBridge] Status change error caught:", error);
    });

    if (typeof window !== 'undefined') {
      // Safely attempt connection restoration
      this.connector.restoreConnection().catch((err) => {
        console.warn("[WalletBridge] Failed to restore connection gracefully (suppressed):", err);
      });
      
      // Auto-connect from secrets or headless server
      setTimeout(async () => {
        try {
          const res = await fetch("/api/ton/headless/status");
          if (res.ok) {
            const data = await res.json();
            if (data.active) {
              console.log("[WalletBridge] 🚀 Headless server-side wallet detected! Switching to highly stable server mode.", data.address);
              this.state = {
                connected: true,
                walletAddress: data.address,
                walletName: "Server Node",
                platform: "Headless",
                headless: true
              };
              this.notify();
              return;
            }
          }
        } catch (e) {}

        const auth = AuthAgent.getInstance();
        const address = auth.getCredential("MAIN_WALLET_ADDRESS") || auth.getCredential("VITE_MAIN_WALLET_ADDRESS");
        if (address && !this.state.connected) {
          console.log("[WalletBridge] Auto-connecting from Vault/Secrets:", address);
          this.state = {
            connected: true,
            walletAddress: address,
            walletName: "Vault Wallet",
            platform: "Vault"
          };
          this.notify();
        }
      }, 500);
    }
  }

  public static getInstance(): WalletBridge {
    if (!WalletBridge.instance) {
      WalletBridge.instance = new WalletBridge();
    }
    return WalletBridge.instance;
  }

  private updateState(wallet: Wallet | null) {
    if (wallet) {
      this.state = {
        connected: true,
        walletAddress: wallet.account.address,
        walletName: wallet.device.appName,
        platform: wallet.device.platform,
      };
    } else {
      this.state = {
        connected: false,
        walletAddress: null,
        walletName: null,
        platform: null,
      };
    }
    this.notify();
  }

  public subscribe(listener: (state: WalletBridgeState) => void) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  public async connect(walletInfo: any): Promise<void> {
    await this.connector.connect(walletInfo);
  }

  public async disconnect() {
    try {
      if (this.connector && this.connector.connected) {
        await this.connector.disconnect();
      }
    } catch (e: any) {
      console.warn("[WalletBridge] Disconnect error:", e);
    }
    this.updateState(null);
  }

  /**
   * Request transaction signing from the user's wallet.
   * @param messages List of messages to send
   * @param options Execution options including auto-send-off logic
   */
  public async sendTransaction(messages: any[], options: { keepInInventory?: boolean } = {}) {
    if (!this.state.connected) {
      console.error("[WalletBridge] Wallet not connected during sendTransaction");
      throw new Error("Wallet not connected");
    }

    console.log(`[WalletBridge] Requesting transaction signature (KeepInInventory: ${!!options.keepInInventory})...`);

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
      messages: messages.map(msg => ({
        address: msg.address,
        amount: msg.amount,
        payload: msg.payload, // Optional payload (e.g. for comments or smart contract calls)
      })),
    };

    if (this.state.headless) {
      console.log("[WalletBridge] 🚀 Routing transaction directly to headless server for reliable signing...");
      const res = await fetch("/api/ton/headless/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction, options })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(()=>({}));
        throw new Error(errJson.error || "Server-side headless signing failed.");
      }
      const data = await res.json();
      console.log("[WalletBridge] ✅ Headless transaction completed reliably via server.", data);
      return { boc: data.hash || "server_boc" };
    }

    if (!this.connector.connected) {
      throw new Error("Wallet Connect is not active and Headless mode is disabled.");
    }

    try {
      const result = await this.connector.sendTransaction(transaction);
      console.log("[WalletBridge] Transaction signed and sent successfully:", result);
      return result;
    } catch (e: any) {
      if (e?.name === 'WalletNotConnectedError' || e?.message?.includes('Wallet not connected')) {
         console.warn("[WalletBridge] Intercepted WalletNotConnectedError, cleaning up state.");
         this.updateState(null); // Force sync state
      }
      console.error("[WalletBridge] Transaction rejected or failed:", e);
      throw e;
    }
  }

  /**
   * Specific bridge for Tonnel or other 3rd party bots
   * @param botName Target bot username
   * @param payload Payload for the bot interaction
   */
  public async interactWithBot(botName: string, payload: string) {
    // This is where we'd bridge the TonConnect session to a bot's expected flow
    // For now, we simulate the interaction by logging it
    console.log(`[WalletBridge] Bridging session to @${botName} with payload: ${payload}`);
    // In a real scenario, this might involve signing a proof of ownership
    // or initiating a specific swap transaction via the bot's contract.
  }

  public getConnector(): TonConnect {
    return this.connector;
  }

  public async getWallets() {
    const fallbackTimeout = new Promise<any[]>((resolve) => {
      setTimeout(() => {
        console.log("[WalletBridge] getWallets timed out, returning fallback list");
        resolve(FALLBACK_WALLETS);
      }, 5000); // 5 seconds timeout
    });

    try {
      const fetchPromise = this.connector.getWallets().then((wallets) => {
        if (wallets && wallets.length > 0) {
          return wallets;
        }
        return FALLBACK_WALLETS;
      });
      return await Promise.race([fetchPromise, fallbackTimeout]);
    } catch (e) {
      console.error("[WalletBridge] Failed to fetch wallets list:", e);
      return FALLBACK_WALLETS;
    }
  }

  public generateConnectionLink(wallet: any): string {
    return this.connector.connect({
      universalLink: wallet.universalLink,
      bridgeUrl: wallet.bridgeUrl
    });
  }

  public getState(): WalletBridgeState {
    return { ...this.state };
  }
}
