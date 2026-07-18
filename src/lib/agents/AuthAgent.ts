import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export class AuthAgent {
  private static instance: AuthAgent;
  private vault: Map<string, string> = new Map();
  private db: any = null;
  public ready: Promise<void>;

  private constructor() {
    this.vault = new Map();
    this.db = null; // Don't default to client DB on server
    this.ready = this.loadLocalVault().catch(err => {
      console.error("[Gatekeeper] Error in loadLocalVault:", err);
    });
  }

  public setDb(dbInstance: any) {
    this.db = dbInstance;
    console.log("[Gatekeeper] Persistence DB updated.");
    // Trigger load from cloud once DB is available
    this.ready = (async () => {
      await this.loadLocalVault();
      await this.init();
    })().catch(err => {
      console.error("[Gatekeeper] Error in re-init:", err);
    });
  }

  private async init() {
    if (!this.db) return;
    await this.loadFromCloud("MTPROTO_USER_SESSION_STRING");
    await this.loadFromCloud("TELEGRAM_USER_SESSION");
  }

  private async loadFromCloud(key: string) {
    try {
      if (!this.db) return;

      if (typeof this.db.collection === "function") {
        // Admin SDK
        const docSnap = await this.db.collection("system_config").doc(key).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data && data.value) {
            this.vault.set(key, data.value);
            console.log(`[Gatekeeper] Key ${key} loaded from Cloud (Admin).`);
          }
        }
      } else {
        // Client SDK
        const { doc, getDoc } = await import("firebase/firestore");
        const docRef = doc(this.db, "system_config", key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.value) {
            this.vault.set(key, data.value);
            console.log(`[Gatekeeper] Key ${key} loaded from Cloud (Client).`);
          }
        }
      }
    } catch (e) {
      console.warn(`[Gatekeeper] Failed to load ${key} from Cloud:`, e);
    }
  }

  private async syncToCloud(key: string, value: string) {
    try {
      if (!this.db) return;

      const payload = { 
        value, 
        updatedAt: new Date().toISOString(),
        updatedBy: "AuthAgent"
      };

      if (typeof this.db.collection === "function") {
        // Admin SDK
        await this.db.collection("system_config").doc(key).set(payload);
        console.log(`[Gatekeeper] Key ${key} synced to Cloud (Admin).`);
      } else {
        // Client SDK
        const { doc, setDoc } = await import("firebase/firestore");
        const docRef = doc(this.db, "system_config", key);
        await setDoc(docRef, payload);
        console.log(`[Gatekeeper] Key ${key} synced to Cloud (Client).`);
      }
    } catch (e) {
      console.error(`[Gatekeeper] Failed to sync ${key} to Cloud:`, e);
    }
  }

  private async loadLocalVault() {
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const vaultPath = path.join(process.cwd(), ".local_vault.json");
        console.log(`[Gatekeeper] Attempting to load vault from: ${vaultPath}`);
        if (fs.existsSync(vaultPath)) {
          const data = JSON.parse(fs.readFileSync(vaultPath, "utf8"));
          for (const [k, v] of Object.entries(data)) {
            this.vault.set(k, String(v));
          }
          console.log(`[Gatekeeper] Vault loaded successfully (${this.vault.size} keys).`);
        } else {
          console.log(`[Gatekeeper] No vault file found at ${vaultPath}`);
        }
      } catch (e) {
        console.error("[Gatekeeper] Failed to load local vault:", e);
      }
    }
  }

  private async saveLocalVault() {
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const vaultPath = path.join(process.cwd(), ".local_vault.json");
        const data: Record<string, string> = {};
        for (const [k, v] of this.vault.entries()) {
          data[k] = v;
        }
        console.log(`[Gatekeeper] Saving vault to: ${vaultPath}`);
        fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2), "utf8");
        console.log("[Gatekeeper] Vault saved successfully.");
      } catch (e) {
        console.error("[Gatekeeper] Failed to save local vault:", e);
      }
    }
  }

  public static getInstance(): AuthAgent {
    if (!AuthAgent.instance) {
      AuthAgent.instance = new AuthAgent();
    }
    return AuthAgent.instance;
  }

  public loadFromVaultObj(secrets: Record<string, string>): void {
    for (const [key, val] of Object.entries(secrets)) {
      this.vault.set(key, val);
    }
    console.log(`[Gatekeeper] Загружено ${Object.keys(secrets).length} ключей из внешнего хранилища (Google Drive Vault).`);
  }

  /**
   * Безопасное сохранение реквизитов (API ключи, токены)
   */
  public storeCredential(service: string, token: string): void {
    // В реальности здесь должно быть криптографическое шифрование
    this.vault.set(service, token);
    this.saveLocalVault();

    // Sync critical keys to cloud
    if (service === "MTPROTO_USER_SESSION_STRING" || service === "TELEGRAM_USER_SESSION") {
      this.syncToCloud(service, token);
    }

    console.log(`[Gatekeeper] Учетные данные для ${service} надежно сохранены в Vault.`);
  }

  /**
   * Предоставление доступа к реквизитам для других подсистем/агентов
   */
  public getCredential(service: string): string | undefined {
    if (this.vault.has(service)) {
      return this.vault.get(service);
    }
    // Safe lookup across environments
    let envObj: Record<string, any> = {};
    try {
      if (typeof process !== "undefined" && process.env) {
        envObj = { ...envObj, ...process.env };
      }
    } catch (_) {}

    try {
      const metaEnv = (import.meta as any)?.env;
      if (metaEnv) {
        envObj = { ...envObj, ...metaEnv };
      }
    } catch (_) {}

    let val = envObj[service];
    if (val) return val;

    if (!service.startsWith("VITE_")) {
      val = envObj[`VITE_${service}`];
      if (val) return val;
    }

    return undefined;
  }

  /**
   * Удаление реквизитов
   */
  public removeCredential(service: string): void {
    this.vault.delete(service);
    this.saveLocalVault();
    console.log(`[Gatekeeper] Учетные данные для ${service} удалены из Vault.`);
  }

  /**
   * Проверка наличия
   */
  public hasCredential(service: string): boolean {
    return this.vault.has(service);
  }
}
