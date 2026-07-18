import { AuthAgent } from "../agents/AuthAgent";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export interface BridgeSession {
  sessionId: string;
  userId: string;
  status: "connected" | "disconnected" | "authenticating" | "error";
  authStep?: "code" | "password";
  lastUsed: string;
  errorMessage?: string;
  floodWait?: number; // seconds
}

/**
 * MTProtoBridge - Центральный узел для взаимодействия с Telegram API (через UserSession).
 * Обеспечивает "человекоподобное" взаимодействие с ботами и каналами.
 */
export class MTProtoBridge {
  private static instance: MTProtoBridge;
  private authAgent: AuthAgent;
  private activeSessions: Map<string, BridgeSession> = new Map();

  private setupProcessHooks() {
    if (typeof process !== 'undefined') {
      const exitHandler = async () => {
        if (this.client) {
           console.log("[MTProtoBridge] Gracefully disconnecting to prevent session corruption...");
           await this.client.disconnect();
        }
      };
      process.on('SIGINT', exitHandler);
      process.on('SIGTERM', exitHandler);
    }
  }

  private listeners: Set<(status: BridgeSession | undefined) => void> = new Set();
  
  private client: TelegramClient | null = null;
  private isConnecting: boolean = false;
  private phone: string = "";
  private phoneHash: string = "";
  private companionBotInterval: any = null;
  private lastUpdateId: number = 0;
  private codeResolver: ((value: string) => void) | null = null;
  private passwordResolver: ((value: string) => void) | null = null;
  private authSuccessResolver: ((value: boolean) => void) | null = null;
  private isBotAccount: boolean = false;
  private messageListeners: Set<(msg: { peer: string, message: string }) => void> = new Set();

  private async safeLog(msg: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') {
    if (typeof window === "undefined") {
      try {
        const { ServerLogger } = await import("../utils/ServerLogger");
        await ServerLogger.getInstance().log("MTPROTO", msg, level);
      } catch (e) {
        console.log(`[MTPROTO][${level.toUpperCase()}] ${msg}`);
      }
    } else {
      console.log(`[MTPROTO][${level.toUpperCase()}] ${msg}`);
    }
  }

  private getLocalStorage() {
    if (typeof window !== "undefined") {
      return (window as any).localStorage;
    }
    return null;
  }

  public getWorkingMode(): "server" | "sandbox" {
    if (typeof window === "undefined") return "server";
    try {
      const storage = this.getLocalStorage();
      const mode = storage ? storage.getItem("mtproto_mode") : null;
      return (mode === "sandbox" ? "sandbox" : "server");
    } catch (e) {
      return "server";
    }
  }

  public setWorkingMode(mode: "server" | "sandbox") {
    if (typeof window === "undefined") return;
    try {
      const storage = this.getLocalStorage();
      if (storage) {
        storage.setItem("mtproto_mode", mode);
      }
    } catch (e) {
      console.warn("[MTProtoBridge] Failed to set mode in localStorage:", e);
    }
    
    // If switching to sandbox, try to initialize client-side client from local storage session string
    if (mode === "sandbox") {
      try {
        const storage = this.getLocalStorage();
        const sessionStr = storage ? storage.getItem("mtproto_string_session") : null;
        if (sessionStr) {
          this.initClient(sessionStr).then(() => {
            this.client?.connect().then(() => {
              const session: BridgeSession = {
                sessionId: "default",
                userId: "Local Client",
                status: "connected",
                lastUsed: new Date().toISOString()
              };
              this.activeSessions.set("default", session);
              this.notify();
            }).catch(err => {
              console.warn("[MTProtoBridge] Local Client auto-connect failed:", err);
              this.activeSessions.delete("default");
              this.notify();
            });
          });
        } else {
          this.activeSessions.delete("default");
          this.notify();
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      // Switching to server mode, sync status immediately
      this.syncStatusWithServer();
    }
    
    this.notify();
  }

  private async getUserSessionString(): Promise<string> {
    const auth = this.authAgent;
    
    // 1. Explicitly check for keys that we reserve for user sessions
    let sessionStr = auth.getCredential("MTPROTO_USER_SESSION_STRING") || 
                     auth.getCredential("TELEGRAM_USER_SESSION");
                      
    if (sessionStr) return sessionStr;

    // 2. Check local/browser storage specifically for user session
    if (typeof window !== "undefined") {
      try {
        const storage = this.getLocalStorage();
        if (storage) {
          const localUserSession = storage.getItem("mtproto_user_session_string");
          if (localUserSession) return localUserSession;
        }
      } catch (e) {}
    } else {
      // 2b. On Server, check for .session file
      try {
        const fs = await import("fs");
        const path = await import("path");
        const sessionPath = path.join(process.cwd(), ".session");
        if (fs.existsSync(sessionPath)) {
          const fileSession = fs.readFileSync(sessionPath, "utf8");
          if (fileSession && fileSession.length > 5) {
            await this.safeLog("Found saved session in .session file.", "info");
            return fileSession;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to general session keys
    sessionStr = auth.getCredential("TELEGRAM_SESSION_STRING") || 
                 auth.getCredential("MTPROTO_STRING_SESSION") || 
                 auth.getCredential("VITE_MTPROTO_STRING_SESSION");
                  
    if (sessionStr) return sessionStr;

    if (typeof window !== "undefined") {
      try {
        const storage = this.getLocalStorage();
        if (storage) {
          const generalSession = storage.getItem("mtproto_string_session");
          if (generalSession) return generalSession;
        }
      } catch (e) {}
    }

    return "";
  }

  public async initializeConnection(): Promise<void> {
    if (this.isConnecting) {
      this.safeLog("Connection already in progress, skipping duplicate call.", "info");
      return;
    }

    if (typeof window !== "undefined") {
      // In browser, we either sync status with server (in server mode) or init client-side (in sandbox mode)
      if (this.getWorkingMode() === "server") {
        await this.syncStatusWithServer();
        return;
      }
    }

    this.isConnecting = true;
    try {
      // Wait for AuthAgent to load cloud credentials
      await this.authAgent.ready;
      
      // Server-side initialization
      this.safeLog("⚙️ Initializing MTProto connection on server...");
      
      // Set status to authenticating while connecting if not already connected
      const current = this.getSessionStatus();
      if (!current || current.status === "disconnected" || current.status === "error") {
        this.activeSessions.set("default", {
          sessionId: "default",
          userId: "System",
          status: "authenticating",
          lastUsed: new Date().toISOString()
        });
        this.notify();
      }

      const auth = this.authAgent;
      const botToken = auth.getCredential("TELEGRAM_BOT_TOKEN") || auth.getCredential("VITE_TELEGRAM_BOT_TOKEN");
      
      // 1. Try User Session first
      const userSessionStr = await this.getUserSessionString();
      if (userSessionStr && typeof userSessionStr === "string" && userSessionStr.length > 10) {
        this.safeLog(`Found saved user session string (len: ${userSessionStr.length}). Attempting connection...`);
        await this.initClient(userSessionStr);
        try {
          await this.client?.connect();
          if (await this.client?.isUserAuthorized()) {
            let isBot = false;
            let identifier = "User Session";
            try {
              const me = await this.client?.getMe();
              if (me && me instanceof Api.User) {
                isBot = me.bot;
                identifier = me.username || me.phone || `User_${me.id}`;
              }
            } catch (e) {
              this.safeLog("Error checking getMe() on loaded session", "warn");
            }

            if (!isBot) {
              this.isBotAccount = false;
              this.safeLog(`🚀 User session successfully restored and active (${identifier}).`, "success");
              const session: BridgeSession = {
                sessionId: "default",
                userId: identifier,
                status: "connected",
                lastUsed: new Date().toISOString()
              };
              this.activeSessions.set("default", session);
              this.notify();

              // Automatically check and fetch adapter tokens on successful session restoration
              try {
                const authAgent = AuthAgent.getInstance();
                if (!authAgent.getCredential("PORTALS_AUTH")) {
                  this.safeLog("PORTALS_AUTH is missing on session restore. Attempting auto-recovery...", "info");
                  const portalsToken = await this.getPortalsAuthToken();
                  if (portalsToken) {
                    authAgent.storeCredential("PORTALS_AUTH", portalsToken);
                    this.safeLog("✨ Auto-recovered and saved PORTALS_AUTH token!", "success");
                  }
                }
                if (!authAgent.getCredential("FRAGMENT_AUTH")) {
                  this.safeLog("FRAGMENT_AUTH is missing on session restore. Attempting auto-recovery...", "info");
                  const fragmentToken = await this.getFragmentAuthToken();
                  if (fragmentToken) {
                    authAgent.storeCredential("FRAGMENT_AUTH", fragmentToken);
                    this.safeLog("✨ Auto-recovered and saved FRAGMENT_AUTH token!", "success");
                  }
                }
              } catch (autoErr: any) {
                this.safeLog(`Auto-recovery of adapter tokens during session restore failed: ${autoErr.message}`, "warn");
              }

              return; // Success!
            } else {
              this.isBotAccount = true;
              this.safeLog("Stored session is actually a Bot session. Moving to bot initialization...", "info");
            }
          } else {
            this.safeLog("Stored session string is present but NOT authorized. User needs to login again.", "warn");
            const session: BridgeSession = {
              sessionId: "default",
              userId: "Unauthorized",
              status: "disconnected",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
          }
        } catch (e: any) {
          this.safeLog(`Saved user session connection failed: ${e.message}`, "error");
          
          // Handle critical GramJS errors
          if (e.message.includes("AUTH_KEY_DUPLICATED") || e.message.includes("SESSION_REVOKED") || e.message.includes("SESSION_EXPIRED") || e.message.includes("broken")) {
            this.safeLog("⚠️ Stored session key is compromised, duplicated or expired. Marking as broken.", "error");
            const auth = AuthAgent.getInstance();
            
            this.activeSessions.set("default", {
              sessionId: "default",
              userId: "Session Broken",
              status: "error",
              errorMessage: "Сессия повреждена или используется на другом устройстве. Требуется повторный вход.",
              lastUsed: new Date().toISOString()
            });
            this.notify();
          }
        }
      } else {
        this.safeLog("No valid saved user session found or session is too short.", "info");
      }

      // 2. If no user session, try Bot Token connection
      if (botToken && typeof botToken === "string" && botToken.includes(":")) {
        this.safeLog("No user session available. Falling back to automatic connection as Bot...");
        await this.initClient(""); // Start fresh for Bot
        try {
          await this.client?.connect();
          this.isBotAccount = true;
          await this.client?.start({
            botAuthToken: botToken
          });
          this.safeLog("🤖 Companion Bot connected and active!", "success");
          
          const sessionStr = this.client?.session.save() as unknown as string;
          if (typeof window === "undefined") {
            // On server, save to persistent vault
            AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", sessionStr);
          }
          try {
            const storage = this.getLocalStorage();
            if (storage) {
              storage.setItem("mtproto_string_session", sessionStr);
            }
          } catch (e) {
            console.warn("[MTProtoBridge] localStorage save failed:", e);
          }
          
          this.syncSessionWithServer(sessionStr, true);
          
          const session: BridgeSession = {
            sessionId: "default",
            userId: "BotSession",
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          return;
        } catch (e: any) {
          const errorMsg = e.message || String(e);
          const isFloodWait = errorMsg.includes("wait of") || errorMsg.includes("ImportBotAuthorization") || errorMsg.includes("FLOOD_WAIT");
          if (isFloodWait) {
            console.warn(`[MTProtoBridge] Telegram Bot connection rate-limited (Flood Wait): ${errorMsg}. Falling back to standard HTTP Bot API.`);
          } else {
            console.error("[MTProtoBridge] 🤖 Bot connection failed:", errorMsg);
          }
          
          let floodWait: number | undefined;
          if (errorMsg.includes("wait of")) {
            const match = errorMsg.match(/wait of (\d+) seconds/);
            if (match) {
              floodWait = parseInt(match[1]);
            }
          }

          const session: BridgeSession = {
            sessionId: "default",
            userId: "BotSession",
            status: "error",
            errorMessage: errorMsg,
            floodWait,
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          return;
        }
      }

      // 3. Neither connected
      console.warn("[MTProtoBridge] Neither User nor Bot connection could be established.");
      const session: BridgeSession = {
        sessionId: "default",
        userId: "Disconnected",
        status: "disconnected",
        lastUsed: new Date().toISOString()
      };
      this.activeSessions.set("default", session);
      this.notify();
    } finally {
      this.isConnecting = false;
    }
  }

  private constructor() {
    this.authAgent = AuthAgent.getInstance();
    
    if (typeof window !== "undefined") {
      // Browser-side: restore status from localStorage if present
      try {
        const storage = this.getLocalStorage();
        const saved = storage ? storage.getItem("mtproto_default_session") : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          this.activeSessions.set("default", parsed);
        }
      } catch (e) {
        console.warn("[MTProtoBridge] localStorage access denied:", e);
      }
      
      // Start polling status from server to keep UI synchronized
      setInterval(() => {
        if (this.getWorkingMode() === "server") {
          this.syncStatusWithServer();
        }
      }, 5000); // 5 seconds for background sync
      
      // If we start in sandbox mode, trigger initialization of client-side telegram client
      if (this.getWorkingMode() === "sandbox") {
        setTimeout(() => {
          this.setWorkingMode("sandbox");
        }, 100);
      } else {
        // Immediate sync for server mode
        this.syncStatusWithServer();
      }
      return;
    }

    // Server-side: Try to connect immediately using the consolidated connection procedure
    setTimeout(() => {
      this.initializeConnection().catch(err => {
        console.error("[MTProtoBridge] Server startup auto-connection failed:", err);
      });
    }, 100);
    
    // Start listening to the companion bot if token is configured
    this.startCompanionBotListener();

    // Flood wait countdown
    setInterval(() => {
      const defaultSession = this.activeSessions.get("default");
      if (defaultSession && defaultSession.status === "error" && defaultSession.floodWait && defaultSession.floodWait > 0) {
        this.activeSessions.set("default", {
          ...defaultSession,
          floodWait: defaultSession.floodWait - 1
        });
        this.notify();
      }
    }, 1000);
  }
  
  private getApiCredentials() {
    const auth = AuthAgent.getInstance();
    const apiIdStr = auth.getCredential("TELEGRAM_API_ID") || auth.getCredential("VITE_TELEGRAM_API_ID");
    const apiHash = auth.getCredential("TELEGRAM_API_HASH") || auth.getCredential("VITE_TELEGRAM_API_HASH");
    
    // Support previous naming without VITE_ just in case it was loaded from Vault
    const oldApiId = auth.getCredential("TELEGRAM_API_ID");
    const oldApiHash = auth.getCredential("TELEGRAM_API_HASH");
    
    // Fallback to a known public API ID (Telegram Desktop) if user didn't provide one
    return {
      apiId: Number(apiIdStr || oldApiId) || 39596855,
      apiHash: apiHash || oldApiHash || "5d903a243bf77ca97234499df5b6e339"
    };
  }

  private async initClient(sessionStr: string = "") {
    const { apiId, apiHash } = this.getApiCredentials();
    if (!apiId || !apiHash) {
      console.warn("[MTProtoBridge] TELEGRAM_API_ID and TELEGRAM_API_HASH not set.");
      return;
    }
    
    // Safety check for session string
    // Only pass to StringSession if it looks like a valid session string
    let safeSessionStr = "";
    if (typeof sessionStr === "string") {
      const trimmed = sessionStr.trim();
      // GramJS session strings are usually long Base64-like strings
      // If it's a JSON string or something else, we ignore it.
      if (trimmed === "") {
        safeSessionStr = "";
      } else if (trimmed.length > 20 && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        safeSessionStr = trimmed;
      }
    }
    
    if (safeSessionStr === "" && sessionStr !== "" && typeof sessionStr === "string" && sessionStr.trim() !== "") {
      console.warn("[MTProtoBridge] Ignoring invalid session string (too short or malformed).");
    }
    
    const stringSession = new StringSession(safeSessionStr || undefined);
    const isBrowser = typeof window !== "undefined";
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: isBrowser,
    });
    this.client.setLogLevel("none" as any);

    // Setup reactive message listener
    const { NewMessage } = await import("telegram/events/index.js");
    this.client.addEventHandler((event: any) => {
      if (event.message && event.message.message) {
        const peer = event.message.peerId ? String(event.message.peerId.userId || event.message.peerId.chatId || event.message.peerId.channelId || "unknown") : "unknown";
        
        // Try to resolve username for the peer if possible
        this.messageListeners.forEach(listener => {
          listener({
            peer: peer,
            message: event.message.message
          });
        });
      }
    }, new NewMessage({}));
  }

  public static getInstance(): MTProtoBridge {
    if (!MTProtoBridge.instance) {
      MTProtoBridge.instance = new MTProtoBridge();
    }
    return MTProtoBridge.instance;
  }

  public onNewMessage(listener: (msg: { peer: string, message: string }) => void) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public subscribe(listener: (status: BridgeSession | undefined) => void) {
    this.listeners.add(listener);
    listener(this.getSessionStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private startCompanionBotListener() {
    const auth = AuthAgent.getInstance();
    const botToken = auth.getCredential("TELEGRAM_BOT_TOKEN") || auth.getCredential("VITE_TELEGRAM_BOT_TOKEN");
    
    if (!botToken) return;
    
    if (this.companionBotInterval) {
      clearInterval(this.companionBotInterval);
    }
    
    console.log("[MTProtoBridge] 🤖 Companion Bot Listener started for auto-auth...");
    
    this.companionBotInterval = setInterval(async () => {
      try {
        const session = this.activeSessions.get("default");
        if (!session || session.status !== "authenticating") return; // Only poll when we need a code
        
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${this.lastUpdateId + 1}&limit=5&timeout=5`);
        if (!res.ok) return;
        
        const data = await res.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            this.lastUpdateId = update.update_id;
            
            if (update.message && update.message.text) {
              const text = update.message.text.trim();
              
              // Look for a 5 digit code
              const codeMatch = text.match(/\b(\d{5})\b/);
              if (codeMatch) {
                const code = codeMatch[1];
                console.log(`[MTProtoBridge] 🤖 Companion Bot intercepted code: ${code}`);
                
                // Acknowledge receipt to user
                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: update.message.chat.id,
                    text: `✅ Код ${code} получен! Выполняю вход...`
                  })
                }).catch(() => {});

                try {
                  await this.verifyCode(code);
                  
                  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: update.message.chat.id,
                      text: `🚀 Успешный вход в OS!`
                    })
                  }).catch(() => {});
                  
                } catch (e: any) {
                  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: update.message.chat.id,
                      text: `❌ Ошибка входа: ${e.message}`
                    })
                  }).catch(() => {});
                }
              }
            }
          }
        }
      } catch (err) {
        // Silent fail on polling errors
      }
    }, 5000);
  }

  private notify() {
    const status = this.getSessionStatus();
    if (typeof window !== "undefined") {
      console.log("[MTProtoBridge] Notifying listeners. Status:", status?.status);
    }
    this.listeners.forEach(l => l(status));
  }

  public getSessionStatus(): BridgeSession | undefined {
    return this.activeSessions.get("default");
  }

  public getSessionString(): string {
    if (!this.client) return "";
    try {
      return (this.client.session.save() as unknown as string) || "";
    } catch (e) {
      return "";
    }
  }

  public async reconnectFromVault() {
    const auth = AuthAgent.getInstance();
    const sessionStr = auth.getCredential("MTPROTO_STRING_SESSION") || auth.getCredential("VITE_MTPROTO_STRING_SESSION");
    if (sessionStr) {
      await this.initClient(sessionStr);
      try {
        await this.client?.connect();
        const session: BridgeSession = {
          sessionId: "default",
          userId: "Vault Session",
          status: "connected",
          lastUsed: new Date().toISOString()
        };
        this.activeSessions.set("default", session);
        this.notify();
      } catch (e) {
        console.error("Failed to connect via vault string session", e);
      }
    }
  }

  public async initFromVault(): Promise<void> {
    const isBrowser = typeof window !== "undefined";
    const mode = this.getWorkingMode();
    
    // In browser and server mode, do NOT connect directly via client-side MTProto.
    // Instead, just synchronize our status with the server.
    if (isBrowser && mode === "server") {
      console.log("[MTProtoBridge] Browser in Server mode: triggering immediate server sync.");
      await this.syncStatusWithServer();
      return;
    }

    await this.initializeConnection();
  }

  public async connectPhone(phone?: string): Promise<void> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch("/api/mtproto/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to initiate server-side MTProto connection");
      }
      return;
    }

    const auth = AuthAgent.getInstance();
    const botToken = auth.getCredential("TELEGRAM_BOT_TOKEN") || auth.getCredential("VITE_TELEGRAM_BOT_TOKEN");
    const isBot = !phone; // If no phone is provided, we explicitly do a bot connection
    const identifier = isBot ? "Bot" : (phone || "Unknown");
    
    console.log(`[MTProtoBridge] Initiating connection for ${identifier}...`);
    const { apiId, apiHash } = this.getApiCredentials();
    
    if (!apiId || !apiHash) {
      throw new Error("Необходимо указать VITE_TELEGRAM_API_ID и VITE_TELEGRAM_API_HASH");
    }

    // Prioritization rule: If a user is manually logging in via phone,
    // we MUST disconnect any active bot connection first.
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (e) {}
      this.client = null;
    this.setupProcessHooks();
    }
    
    if (!this.client) {
      await this.initClient("");
    }
    
    if (this.client) {
      try {
        console.log("[MTProtoBridge] Connecting client...");
        await this.client.connect();
        console.log("[MTProtoBridge] Client connected.");
        if (this.client.session.save()) {
            AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", this.client.session.save());
        }
        
        if (await this.client.isUserAuthorized()) {
          
          console.log("[MTProtoBridge] Already authorized.");
          try {
             const newSessionStr = this.client.session.save();
             if (newSessionStr) {
                 AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", newSessionStr);
             }
          } catch(e) { console.error("Failed to save session", e) }

          let resolvedBot = false;
          let activeIdentifier = identifier;
          try {
            const me = await this.client.getMe();
            if (me && me instanceof Api.User) {
              resolvedBot = me.bot;
              activeIdentifier = me.username || me.phone || `User_${me.id}`;
            }
          } catch (e) {}

          const session: BridgeSession = {
            sessionId: "default",
            userId: activeIdentifier,
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          return;
        }

        if (isBot) {
          if (!botToken) {
            throw new Error("Bot token is required for Bot login");
          }
          console.log("[MTProtoBridge] Authenticating as Bot...");
          try {
            await this.client.start({
              botAuthToken: botToken
            });
            console.log("[MTProtoBridge] Bot authenticated successfully!");
            
            const sessionStr = this.client.session.save() as unknown as string;
            if (typeof window === "undefined") {
              // On server, save to persistent vault
              AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", sessionStr);
            }
            try {
              const storage = this.getLocalStorage();
              if (storage) {
                storage.setItem("mtproto_string_session", sessionStr);
              }
            } catch (e) {
              console.warn("[MTProtoBridge] localStorage.setItem denied:", e);
            }
            
            this.syncSessionWithServer(sessionStr, true);
            
            const session: BridgeSession = {
              sessionId: "default",
              userId: "BotSession",
              status: "connected",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
            return;
          } catch (e: any) {
            const errorMsg = e.message || String(e);
            const isFloodWait = errorMsg.includes("wait of") || errorMsg.includes("ImportBotAuthorization") || errorMsg.includes("FLOOD_WAIT");
            if (isFloodWait) {
              console.warn(`[MTProtoBridge] Telegram Bot auth rate-limited (Flood Wait): ${errorMsg}. Using HTTP fallback.`);
            } else {
              console.error("[MTProtoBridge] Bot auth failed:", errorMsg);
            }
            const session: BridgeSession = {
              sessionId: "default",
              userId: "BotSession",
              status: "disconnected",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
            return;
          }
        }

        if (!phone) {
          throw new Error("Phone number is required for user authentication");
        }

        console.log(`[MTProtoBridge] Starting client auth flow for ${phone}...`);
        
        this.codeResolver = null;
        this.passwordResolver = null;
        this.authSuccessResolver = null;
        this.phone = phone;

        // Return immediately to the caller, but run the auth flow in background
        (async () => {
          try {
            await this.client!.start({
          phoneNumber: phone,
          phoneCode: async () => {
            console.log("[MTProtoBridge] gramJS requested phoneCode. Waiting for user input...");
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "authenticating",
              authStep: "code",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();

            return new Promise<string>((resolve, reject) => {
              this.codeResolver = resolve;
              setTimeout(() => reject(new Error("Code input timed out")), 300000);
            });
          },
          password: async (hint) => {
            console.log(`[MTProtoBridge] gramJS requested 2FA password (hint: ${hint}). Waiting for user input...`);
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "authenticating",
              authStep: "password",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();

            return new Promise<string>((resolve, reject) => {
              this.passwordResolver = (pass: string) => {
                this.passwordResolver = null;
                resolve(pass);
              };

              const savedPassword = auth.getCredential("TELEGRAM_2FA_PASSWORD") || auth.getCredential("VITE_TELEGRAM_2FA_PASSWORD");
              
              // If we have a saved password, we might want to try it, 
              // but only if we're not explicitly waiting for user input.
              // For now, let's prioritize the resolver if it's called soon, 
              // or just wait for the user to be safe if they are using the UI.
              if (savedPassword) {
                console.log("[MTProtoBridge] Found saved 2FA password in credentials. Waiting 1s for manual override...");
                setTimeout(() => {
                  if (this.passwordResolver) {
                    console.log("[MTProtoBridge] Using saved 2FA password.");
                    const res = this.passwordResolver;
                    this.passwordResolver = null;
                    res(savedPassword);
                  }
                }, 1000);
              }

              setTimeout(() => {
                if (this.passwordResolver) {
                  reject(new Error("Password input timed out"));
                  this.passwordResolver = null;
                }
              }, 300000);
            });
          },
          onError: (err) => {
            console.error("[MTProtoBridge] Authentication flow error:", err);
            let errorMsg = err.message || String(err);
            if (errorMsg.includes("PASSWORD_HASH_INVALID")) {
              errorMsg = "Invalid 2FA password. Please check your cloud password and try again.";
              // Clear the invalid password from vault
              const auth = AuthAgent.getInstance();
              auth.removeCredential("TELEGRAM_2FA_PASSWORD");
              auth.removeCredential("VITE_TELEGRAM_2FA_PASSWORD");
            }
            
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "error",
              errorMessage: errorMsg,
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
            if (this.authSuccessResolver) {
              this.authSuccessResolver(false);
              this.authSuccessResolver = null;
            }
          }
        }).then(async () => {
          this.isBotAccount = false;
          console.log("[MTProtoBridge] Authentication completed successfully!");
          const sessionStr = this.client?.session.save() as unknown as string;
          
          if (typeof window === "undefined") {
            // On server, save to persistent vault
            AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", sessionStr);
            
            // Automatically fetch and insert PORTALS_AUTH and FRAGMENT_AUTH
            try {
              console.log("[MTProtoBridge] Automatically retrieving and storing adapter authentication tokens...");
              const portalsToken = await this.getPortalsAuthToken();
              if (portalsToken) {
                AuthAgent.getInstance().storeCredential("PORTALS_AUTH", portalsToken);
                await this.safeLog("✨ Automatically retrieved and saved Portals Authorization token!", "success");
              }
            } catch (portalsErr: any) {
              console.error("[MTProtoBridge] Failed to auto-fetch Portals token:", portalsErr);
            }

            try {
              const fragmentToken = await this.getFragmentAuthToken();
              if (fragmentToken) {
                AuthAgent.getInstance().storeCredential("FRAGMENT_AUTH", fragmentToken);
                await this.safeLog("✨ Automatically retrieved and saved Fragment Authorization token!", "success");
              }
            } catch (fragmentErr: any) {
              console.error("[MTProtoBridge] Failed to auto-fetch Fragment token:", fragmentErr);
            }
          }

          let finalIdentifier = phone;
          try {
            const me = await this.client?.getMe();
            if (me && me instanceof Api.User) {
              finalIdentifier = me.username || me.phone || `User_${me.id}`;
            }
          } catch (e) {}

          const session: BridgeSession = {
            sessionId: "default",
            userId: finalIdentifier,
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);

          try {
            const storage = this.getLocalStorage();
            if (storage) {
              storage.setItem("mtproto_default_session", JSON.stringify(session));
              storage.setItem("mtproto_string_session", sessionStr);
              storage.setItem("mtproto_user_session_string", sessionStr);
            }
          } catch (e) {
            console.warn("[MTProtoBridge] localStorage save failed:", e);
          }

          if (sessionStr) {
            this.syncSessionWithServer(sessionStr, false);
          }

          this.notify();
          if (this.authSuccessResolver) {
            this.authSuccessResolver(true);
            this.authSuccessResolver = null;
          }
          }).catch((err) => {
            const errorMsg = err.message || String(err);
            console.error("[MTProtoBridge] Auth flow rejected:", errorMsg);
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "error",
              errorMessage: errorMsg,
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
            if (this.authSuccessResolver) {
              this.authSuccessResolver(false);
              this.authSuccessResolver = null;
            }
          });
        } catch (e: any) {
          const errorMsg = e.message || String(e);
          console.error("[MTProtoBridge] Background auth exception:", errorMsg);
          const session: BridgeSession = {
            sessionId: "default",
            userId: phone || "Unknown",
            status: "error",
            errorMessage: errorMsg,
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
        }
      })();

      return;
    } catch (err: any) {
      console.error("[MTProtoBridge] Connect/Auth startup error:", err);
      throw new Error(err.message || "Failed to initiate Telegram auth");
    }
    }
  }

  public async verifyCode(code: string): Promise<boolean> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch("/api/mtproto/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
      return false;
    }

    console.log(`[MTProtoBridge] Resolving phoneCode with ${code}...`);
    if (this.codeResolver) {
      this.codeResolver(code);
      return true;
    }
    throw new Error("No active code verification prompt.");
  }

  public resetSession(): void {
    console.log("[MTProtoBridge] Resetting session state...");
    this.activeSessions.delete("default");
    this.passwordResolver = null;
    this.codeResolver = null;
    this.authSuccessResolver = null;
    this.notify();
  }

  public async verifyPassword(password: string): Promise<boolean> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch("/api/mtproto/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
      return false;
    }

    console.log(`[MTProtoBridge] Resolving 2FA password with ${password}...`);
    if (this.passwordResolver) {
      const resolver = this.passwordResolver;
      this.passwordResolver = null; // Clear so saved password timeout doesn't fire
      resolver(password);
      return true;
    }
    throw new Error("No active 2FA password prompt.");
  }

  public async disconnect(): Promise<void> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      await fetch("/api/mtproto/disconnect", { method: "POST" });
      this.activeSessions.delete("default");
      this.notify();
      
      try {
        const storage = this.getLocalStorage();
        if (storage) {
          storage.removeItem("mtproto_default_session");
          storage.removeItem("mtproto_string_session");
          storage.removeItem("mtproto_user_session_string");
        }
      } catch (e) {
        console.warn("[MTProtoBridge] localStorage.removeItem denied:", e);
      }
      return;
    }

    console.log("[MTProtoBridge] Disconnecting session...");
    this.activeSessions.delete("default");
    
    if (this.client) {
      try {
        await this.client.disconnect();
        this.client = null;
      } catch (e) {
        console.error("Disconnect error:", e);
      }
    }
    
    if (typeof window !== "undefined") {
      try {
        const storage = this.getLocalStorage();
        if (storage) {
          storage.removeItem("mtproto_default_session");
          storage.removeItem("mtproto_string_session");
          storage.removeItem("mtproto_user_session_string");
        }
      } catch (e) {
        console.warn("[MTProtoBridge] localStorage.removeItem denied:", e);
      }
    }

    // Clear saved user credentials on server
    if (typeof window === "undefined") {
      try {
        const auth = AuthAgent.getInstance();
        auth.storeCredential("MTPROTO_STRING_SESSION", "");
        auth.storeCredential("TELEGRAM_USER_SESSION", "");
        auth.storeCredential("MTPROTO_USER_SESSION_STRING", "");
      } catch (e) {}
    }

    this.notify();

    // After manual disconnect of user session, try to reconnect to Bot
    setTimeout(() => {
      this.initializeConnection().catch(e => {
        console.error("[MTProtoBridge] Automatic bot fallback failed:", e);
      });
    }, 1000);
  }

  /**
   * Выполнение команды в боте через MTProto
   */
  public async sendBotCommand(botUsername: string, command: string, retries = 3): Promise<{ success: boolean; response: string }> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch("/api/mtproto/send-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botUsername, command, retries })
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, response: "Server command execution failed" };
    }

    console.log(`[MTProtoBridge] Sending command '${command}' to ${botUsername}...`);
    const session = this.getSessionStatus();
    if (!session || session.status !== "connected" || !this.client) {
      return {
        success: false,
        response: "Bridge connection required for command execution. Connect MTProto first."
      };
    }
    
    try {
      await this.client.sendMessage(botUsername, { message: command });
      return {
        success: true,
        response: `[MTProto] Command executed successfully on ${botUsername}.`
      };
    } catch (e: any) {
      return {
        success: false,
        response: `Error: ${e.message}`
      };
    }
  }

  /**
   * Эмуляция нажатия Inline-кнопки
   */
  public async clickInlineButton(botUsername: string, buttonText: string): Promise<boolean> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch("/api/mtproto/click-button", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botUsername, buttonText })
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
      return false;
    }

    console.log(`[MTProtoBridge] Clicking button '${buttonText}' in ${botUsername}...`);
    const session = this.getSessionStatus();
    if (!session || session.status !== "connected" || !this.client || this.isBotAccount) {
      console.warn("[MTProtoBridge] Bridge connection required for clickInlineButton (and must not be a bot).");
      return false;
    }
    try {
      const messages = await this.client.getMessages(botUsername, { limit: 1 });
      if (messages && messages.length > 0) {
        const msg = messages[0];
        if (msg.buttons) {
          let flatIndex = 0;
          for (let row = 0; row < msg.buttons.length; row++) {
            const cols = msg.buttons[row];
            for (let col = 0; col < cols.length; col++) {
              const btn = cols[col];
              if (btn.text?.toLowerCase().includes(buttonText.toLowerCase())) {
                console.log(`[MTProtoBridge] Found button with text "${btn.text}". Clicking flat index ${flatIndex}...`);
                await msg.click({ i: flatIndex });
                return true;
              }
              flatIndex++;
            }
          }
        }
      }
    } catch (e: any) {
      if (
        e.message?.includes("BOT_METHOD") ||
        e.errorMessage?.includes("BOT_METHOD") ||
        String(e).includes("BOT_METHOD")
      ) {
        return false;
      }
      console.error("[MTProtoBridge] Failed to click inline button:", e);
    }
    return false;
  }

  /**
   * Парсинг последнего сообщения от бота
   */
  public async getLatestMessage(botUsername: string): Promise<string> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      const res = await fetch(`/api/mtproto/latest-message?botUsername=${encodeURIComponent(botUsername)}`);
      if (res.ok) {
        const data = await res.json();
        return data.message || "";
      }
      return "";
    }

    const session = this.getSessionStatus();
    if (!session || session.status !== "connected" || !this.client || this.isBotAccount) {
      return "";
    }
    try {
      const messages = await this.client.getMessages(botUsername, { limit: 1 });
      if (messages && messages.length > 0) {
        return messages[0].message || "";
      }
    } catch (e: any) {
      if (
        e.message?.includes("BOT_METHOD") ||
        e.errorMessage?.includes("BOT_METHOD") ||
        String(e).includes("BOT_METHOD") ||
        String(e).includes("Cannot find any entity")
      ) {
        // Bots cannot use getHistory or find user entities they haven't interacted with
        return "";
      }
      
      if (e.message?.includes("AUTH_KEY_DUPLICATED") || e.errorMessage?.includes("AUTH_KEY_DUPLICATED") || String(e).includes("AUTH_KEY_DUPLICATED")) {
         console.warn("[MTProtoBridge] Session revoked or duplicated detected during getMessages! Forcing disconnect.");
         await this.disconnect();
         return "";
      }
      
      console.warn("[MTProtoBridge] Failed to get latest messages from", botUsername, e.message || e);
    }
    return "";
  }

  /**
   * Получение списка последних сообщений от бота/канала (пакетный режим)
   */
  public async getLatestMessages(botUsername: string, limit: number = 30): Promise<string[]> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      try {
        const res = await fetch(`/api/mtproto/latest-messages?botUsername=${encodeURIComponent(botUsername)}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          return data.messages || [];
        }
      } catch (err: any) {
        console.warn("[MTProtoBridge] Failed to fetch latest-messages from API:", err.message || err);
      }
      return [];
    }

    const session = this.getSessionStatus();
    if (!session || session.status !== "connected" || !this.client || this.isBotAccount) {
      return [];
    }
    try {
      const messages = await this.client.getMessages(botUsername, { limit });
      if (messages && messages.length > 0) {
        return messages.map(m => m.message || "").filter(Boolean);
      }
    } catch (e: any) {
      if (
        e.message?.includes("BOT_METHOD") ||
        e.errorMessage?.includes("BOT_METHOD") ||
        String(e).includes("BOT_METHOD") ||
        String(e).includes("Cannot find any entity")
      ) {
        // Bots cannot use getHistory
        return [];
      }
      
      if (e.message?.includes("AUTH_KEY_DUPLICATED") || e.errorMessage?.includes("AUTH_KEY_DUPLICATED") || String(e).includes("AUTH_KEY_DUPLICATED")) {
         console.warn("[MTProtoBridge] Session revoked or duplicated detected during getMessages! Forcing disconnect.");
         await this.disconnect();
         return [];
      }
      console.warn("[MTProtoBridge] Failed to get latest messages from", botUsername, e.message || e);
    }
    return [];
  }

  public async syncStatusWithServer(): Promise<BridgeSession | null> {
    if (typeof window === "undefined") return null;
    if (this.getWorkingMode() === "sandbox") return null;
    try {
      const res = await fetch("/api/mtproto/status");
      if (res.ok) {
        const session = await res.json();
        if (session) {
          const oldSession = this.activeSessions.get("default");
          // Check if session actually changed before notifying
          const hasChanged = !oldSession || 
                             oldSession.status !== session.status || 
                             oldSession.userId !== session.userId || 
                             oldSession.authStep !== session.authStep ||
                             oldSession.errorMessage !== session.errorMessage;
          
          if (hasChanged) {
            console.log(`[MTProtoBridge] Status updated from server: ${session.status} (${session.userId})`);
            this.activeSessions.set("default", session);
            this.notify();
          }
          return session;
        } else {
          const oldSession = this.activeSessions.get("default");
          if (oldSession && oldSession.status !== "disconnected") {
            console.log("[MTProtoBridge] Server reported no session. Setting to disconnected.");
            this.activeSessions.set("default", {
              sessionId: "default",
              status: "disconnected",
              userId: "Disconnected",
              lastUsed: new Date().toISOString()
            });
            this.notify();
          }
        }
      }
    } catch (e) {
      console.warn("[MTProtoBridge] Failed to sync status with server:", e);
    }
    return null;
  }

  private async syncSessionWithServer(sessionStr: string, isBot: boolean = false) {
    if (typeof window !== "undefined") {
      try {
        const payload: Record<string, string> = { MTPROTO_STRING_SESSION: sessionStr };
        if (!isBot) {
          payload.TELEGRAM_USER_SESSION = sessionStr;
          payload.MTPROTO_USER_SESSION_STRING = sessionStr;
        }
        await fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        console.log("[MTProtoBridge] Session string synchronized with server successfully.");
      } catch (e) {
        console.warn("[MTProtoBridge] Failed to sync session with server:", e);
      }
    } else {
      try {
        AuthAgent.getInstance().storeCredential("MTPROTO_STRING_SESSION", sessionStr);
        if (!isBot) {
          AuthAgent.getInstance().storeCredential("TELEGRAM_USER_SESSION", sessionStr);
          AuthAgent.getInstance().storeCredential("MTPROTO_USER_SESSION_STRING", sessionStr);
        }
        console.log("[MTProtoBridge] Session string saved to AuthAgent vault on server.");
      } catch (e) {
        console.warn("[MTProtoBridge] Failed to store session on server:", e);
      }
    }
  }

  /**
   * Fetches the Fragment Authorization token (initData) using the current Telegram session.
   */
  public async getFragmentAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      try {
        const res = await fetch("/api/mtproto/fragment-token", { method: "POST" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.token;
      } catch (e) {
        return null;
      }
    }

    if (!this.client) return null;

    try {
      if (!(await this.client.connect())) {
        await this.client.connect();
      }
      
      if (!(await this.client.isUserAuthorized())) {
        return null;
      }

      const result = await this.client.invoke(
        new Api.messages.RequestWebView({
          peer: "fragment",
          bot: "fragment",
          platform: "android",
          fromBotMenu: false,
          url: "https://fragment.com/"
        })
      );

      if (result && result instanceof Api.WebViewResultUrl) {
        const url = result.url;
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          return params.get("tgWebAppData");
        }
      }
      return null;
    } catch (error) {
      console.error("[MTProtoBridge] Failed to fetch Fragment token:", error);
      return null;
    }
  }

  /**
   * Fetches the Portals Authorization token (initData) using the current Telegram session.
   */
  public async getPortalsAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined" && this.getWorkingMode() === "server") {
      try {
        const res = await fetch("/api/mtproto/portals-token", { method: "POST" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.token;
      } catch (e) {
        return null;
      }
    }

    if (!this.client) return null;

    try {
      if (!(await this.client.connect())) {
        await this.client.connect();
      }
      
      if (!(await this.client.isUserAuthorized())) {
        return null;
      }

      const result = await this.client.invoke(
        new Api.messages.RequestWebView({
          peer: "portals_market_bot",
          bot: "portals_market_bot",
          platform: "android",
          fromBotMenu: false,
          url: "https://portals-market.com/"
        })
      );

      if (result && result instanceof Api.WebViewResultUrl) {
        const url = result.url;
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          return params.get("tgWebAppData");
        }
      }
      return null;
    } catch (error) {
      console.error("[MTProtoBridge] Failed to fetch Portals token:", error);
      return null;
    }
  }

  /**
   * Fetches the full WebApp URL for a given bot and target URL.
   */
  public async getWebAppUrl(botUsername: string, targetUrl: string): Promise<string | null> {
    if (typeof window !== "undefined") return null; // Server only

    if (!this.client) return null;

    try {
      if (!this.client.connected) {
        await this.client.connect();
      }
      
      if (!(await this.client.isUserAuthorized())) {
        console.warn("[MTProtoBridge] User not authorized for WebApp request");
        return null;
      }

      const result = await this.client.invoke(
        new Api.messages.RequestWebView({
          peer: botUsername,
          bot: botUsername,
          platform: "android",
          fromBotMenu: false,
          url: targetUrl
        })
      );

      if (result && result instanceof Api.WebViewResultUrl) {
        return result.url;
      }
      return null;
    } catch (error) {
      console.error(`[MTProtoBridge] Failed to fetch WebApp URL for @${botUsername}:`, error);
      return null;
    }
  }
}

