import { AuthAgent } from "../agents/AuthAgent";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export interface BridgeSession {
  sessionId: string;
  userId: string;
  status: "connected" | "disconnected" | "authenticating";
  lastUsed: string;
}

/**
 * MTProtoBridge - Центральный узел для взаимодействия с Telegram API (через UserSession).
 * Обеспечивает "человекоподобное" взаимодействие с ботами и каналами.
 */
export class MTProtoBridge {
  private static instance: MTProtoBridge;
  private authAgent: AuthAgent;
  private activeSessions: Map<string, BridgeSession> = new Map();
  private listeners: Set<(status: BridgeSession | undefined) => void> = new Set();
  
  private client: TelegramClient | null = null;
  private phone: string = "";
  private phoneHash: string = "";
  private companionBotInterval: any = null;
  private lastUpdateId: number = 0;
  private codeResolver: ((value: string) => void) | null = null;
  private passwordResolver: ((value: string) => void) | null = null;
  private authSuccessResolver: ((value: boolean) => void) | null = null;

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
          this.initClient(sessionStr);
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
        this.syncStatusWithServer();
      }, 3000);
      
      // If we start in sandbox mode, trigger initialization of client-side telegram client
      if (this.getWorkingMode() === "sandbox") {
        setTimeout(() => {
          this.setWorkingMode("sandbox");
        }, 100);
      } else {
        this.syncStatusWithServer(); // Initial sync for server mode
      }
      return;
    }

    // Server-side initialization
    try {
      const sessionStr = this.authAgent.getCredential("TELEGRAM_SESSION_STRING") || this.authAgent.getCredential("MTPROTO_STRING_SESSION") || this.authAgent.getCredential("VITE_MTPROTO_STRING_SESSION");
      if (sessionStr) {
        this.initClient(sessionStr);
        setTimeout(() => {
          this.client?.connect().then(() => {
            const session: BridgeSession = {
              sessionId: "default",
              userId: "Auto Session",
              status: "connected",
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();
          }).catch(e => console.error("Failed to auto-connect MTProto on server:", e));
        }, 100);
      }
    } catch (e) {
      console.warn("[MTProtoBridge] Server-side init failed:", e);
    }
    
    // Start listening to the companion bot if token is configured
    this.startCompanionBotListener();

    // Auto-connect as Bot if we have a bot token and we are not yet connected!
    setTimeout(() => {
      const botToken = this.authAgent.getCredential("TELEGRAM_BOT_TOKEN") || this.authAgent.getCredential("VITE_TELEGRAM_BOT_TOKEN");
      const currentSession = this.activeSessions.get("default");
      if (botToken && (!currentSession || currentSession.status !== "connected")) {
        console.log("[MTProtoBridge] 🤖 Bot Token detected on server startup, triggering automatic connection...");
        this.connectPhone().then(() => {
          console.log("[MTProtoBridge] 🤖 Auto-connected successfully as Bot on server.");
        }).catch(err => {
          console.error("[MTProtoBridge] 🤖 Auto-connection failed on server:", err);
        });
      }
    }, 500);
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

  private initClient(sessionStr: string = "") {
    const { apiId, apiHash } = this.getApiCredentials();
    if (!apiId || !apiHash) {
      console.warn("[MTProtoBridge] TELEGRAM_API_ID and TELEGRAM_API_HASH not set.");
      return;
    }
    const stringSession = new StringSession(sessionStr);
    const isBrowser = typeof window !== "undefined";
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: isBrowser,
    });
    this.client.setLogLevel("none" as any);
  }

  public static getInstance(): MTProtoBridge {
    if (!MTProtoBridge.instance) {
      MTProtoBridge.instance = new MTProtoBridge();
    }
    return MTProtoBridge.instance;
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
    this.listeners.forEach(l => l(status));
  }

  public getSessionStatus(): BridgeSession | undefined {
    return this.activeSessions.get("default");
  }

  public async reconnectFromVault() {
    const auth = AuthAgent.getInstance();
    const sessionStr = auth.getCredential("MTPROTO_STRING_SESSION") || auth.getCredential("VITE_MTPROTO_STRING_SESSION");
    if (sessionStr) {
      this.initClient(sessionStr);
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
      console.log("[MTProtoBridge] Browser in Server mode: skipping client-side MTProto direct connection, syncing status with server.");
      this.syncStatusWithServer();
      return;
    }

    const auth = AuthAgent.getInstance();
    const sessionStr = auth.getCredential("TELEGRAM_SESSION_STRING") || auth.getCredential("MTPROTO_STRING_SESSION") || auth.getCredential("VITE_MTPROTO_STRING_SESSION");
    const botToken = auth.getCredential("TELEGRAM_BOT_TOKEN") || auth.getCredential("VITE_TELEGRAM_BOT_TOKEN");
    
    console.log("[MTProtoBridge] initFromVault triggered. Session present:", !!sessionStr, "BotToken present:", !!botToken);
    
    if (sessionStr) {
      this.initClient(sessionStr);
      try {
        await this.client?.connect();
        if (await this.client?.isUserAuthorized()) {
          const session: BridgeSession = {
            sessionId: "default",
            userId: "User Session",
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          console.log("[MTProtoBridge] Connected and authorized via loaded session string.");
          return;
        }
      } catch (e) {
        console.error("[MTProtoBridge] Failed to connect via loaded session string:", e);
      }
    }
    
    // If we have a bot token and no connected session, auto-connect as bot
    const current = this.activeSessions.get("default");
    if (botToken && (!current || current.status !== "connected")) {
      console.log("[MTProtoBridge] Bot token detected in vault, auto-connecting...");
      try {
        await this.connectPhone();
        console.log("[MTProtoBridge] Auto-connected successfully as Bot.");
      } catch (e) {
        console.error("[MTProtoBridge] Bot auto-connection failed:", e);
      }
    }
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
    const isBot = !!botToken && !phone;
    const identifier = isBot ? "Bot" : (phone || "Unknown");
    
    console.log(`[MTProtoBridge] Initiating connection for ${identifier}...`);
    const { apiId, apiHash } = this.getApiCredentials();
    
    if (!apiId || !apiHash) {
      throw new Error("Необходимо указать VITE_TELEGRAM_API_ID и VITE_TELEGRAM_API_HASH");
    }
    
    if (!this.client) {
      this.initClient("");
    }
    
    if (this.client) {
      try {
        console.log("[MTProtoBridge] Connecting client...");
        await this.client.connect();
        console.log("[MTProtoBridge] Client connected.");
        
        if (await this.client.isUserAuthorized()) {
          console.log("[MTProtoBridge] Already authorized.");
          const session: BridgeSession = {
            sessionId: "default",
            userId: identifier,
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          return;
        }

        if (isBot) {
          console.log("[MTProtoBridge] Authenticating as Bot...");
          try {
            await this.client.start({
              botAuthToken: botToken
            });
            console.log("[MTProtoBridge] Bot authenticated successfully!");
            
            const sessionStr = this.client.session.save() as unknown as string;
            try {
              const storage = this.getLocalStorage();
              if (storage) {
                storage.setItem("mtproto_string_session", sessionStr);
              }
            } catch (e) {
              console.warn("[MTProtoBridge] localStorage.setItem denied:", e);
            }
            
            this.syncSessionWithServer(sessionStr);
            
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
            console.error("[MTProtoBridge] Bot auth failed:", e.message || e);
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

        this.client.start({
          phoneNumber: phone,
          phoneCode: async () => {
            console.log("[MTProtoBridge] gramJS requested phoneCode. Waiting for user input...");
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "authenticating",
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
              lastUsed: new Date().toISOString()
            };
            this.activeSessions.set("default", session);
            this.notify();

            return new Promise<string>((resolve, reject) => {
              this.passwordResolver = resolve;
              const savedPassword = auth.getCredential("TELEGRAM_2FA_PASSWORD") || auth.getCredential("VITE_TELEGRAM_2FA_PASSWORD");
              if (savedPassword) {
                console.log("[MTProtoBridge] Using saved 2FA password from credentials.");
                resolve(savedPassword);
                return;
              }
              setTimeout(() => reject(new Error("Password input timed out")), 300000);
            });
          },
          onError: (err) => {
            console.error("[MTProtoBridge] Authentication flow error:", err);
            const session: BridgeSession = {
              sessionId: "default",
              userId: phone,
              status: "disconnected",
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
          console.log("[MTProtoBridge] Authentication completed successfully!");
          const sessionStr = this.client?.session.save() as unknown as string;
          const session: BridgeSession = {
            sessionId: "default",
            userId: phone,
            status: "connected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);

          try {
            const storage = this.getLocalStorage();
            if (storage) {
              storage.setItem("mtproto_default_session", JSON.stringify(session));
              storage.setItem("mtproto_string_session", sessionStr);
            }
          } catch (e) {
            console.warn("[MTProtoBridge] localStorage save failed:", e);
          }

          if (sessionStr) {
            this.syncSessionWithServer(sessionStr);
          }

          this.notify();
          if (this.authSuccessResolver) {
            this.authSuccessResolver(true);
            this.authSuccessResolver = null;
          }
        }).catch((err) => {
          console.error("[MTProtoBridge] Auth flow rejected:", err);
          const session: BridgeSession = {
            sessionId: "default",
            userId: phone,
            status: "disconnected",
            lastUsed: new Date().toISOString()
          };
          this.activeSessions.set("default", session);
          this.notify();
          if (this.authSuccessResolver) {
            this.authSuccessResolver(false);
            this.authSuccessResolver = null;
          }
        });

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
      const resultPromise = new Promise<boolean>((resolve) => {
        this.authSuccessResolver = resolve;
      });
      this.codeResolver(code);
      return resultPromise;
    }
    throw new Error("No active code verification prompt.");
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
      this.passwordResolver(password);
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
        }
      } catch (e) {
        console.warn("[MTProtoBridge] localStorage.removeItem denied:", e);
      }
    }
    this.notify();
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
    if (!session || session.status !== "connected" || !this.client) {
      console.warn("[MTProtoBridge] Bridge connection required for clickInlineButton.");
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
    if (!session || session.status !== "connected" || !this.client) {
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
        String(e).includes("BOT_METHOD")
      ) {
        // Bots cannot use getHistory
        return "";
      }
      console.error(e);
    }
    return "";
  }

  private async syncStatusWithServer() {
    if (typeof window === "undefined") return;
    if (this.getWorkingMode() === "sandbox") return;
    try {
      const res = await fetch("/api/mtproto/status");
      if (res.ok) {
        const session = await res.json();
        if (session) {
          const oldSession = this.activeSessions.get("default");
          if (!oldSession || oldSession.status !== session.status || oldSession.userId !== session.userId) {
            this.activeSessions.set("default", session);
            this.notify();
          }
        } else {
          if (this.activeSessions.has("default")) {
            this.activeSessions.delete("default");
            this.notify();
          }
        }
      }
    } catch (e) {
      // Silent catch
    }
  }

  private async syncSessionWithServer(sessionStr: string) {
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ MTPROTO_STRING_SESSION: sessionStr })
        });
        console.log("[MTProtoBridge] Session string synchronized with server successfully.");
      } catch (e) {
        console.warn("[MTProtoBridge] Failed to sync session with server:", e);
      }
    }
  }
}
