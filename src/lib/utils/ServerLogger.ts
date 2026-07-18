import { FirestoreQuotaManager } from "./FirestoreQuotaManager";

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export class ServerLogger {
  private static instance: ServerLogger;
  private db: any;

  private constructor() {}

  public static getInstance(): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger();
    }
    return ServerLogger.instance;
  }

  public setDb(db: any) {
    this.db = db;
  }

  public async log(module: string, message: string, level: LogLevel = 'info', metadata: any = {}) {
    console.log(`[${level.toUpperCase()}][${module}] ${message}`);
    
    // Conserve Firestore writes: Only log WARN and ERROR to cloud Firestore database, and only if quota is not exhausted.
    if (this.db && (level === "error" || level === "warn")) {
      if (!FirestoreQuotaManager.canWrite()) {
        return;
      }

      try {
        if (typeof this.db.collection === "function") {
          // Admin SDK
          await this.db.collection("agent_logs").add({
            timestamp: new Date(),
            module,
            message,
            level,
            metadata,
            type: 'SYSTEM_LOG'
          });
        } else {
          // Client SDK
          const { collection, addDoc } = await import("firebase/firestore");
          await addDoc(collection(this.db, "agent_logs"), {
            timestamp: new Date().toISOString(),
            module,
            message,
            level,
            metadata,
            type: 'SYSTEM_LOG'
          });
        }
      } catch (e: any) {
        FirestoreQuotaManager.handleWriteFailure(e);
      }
    }
  }
}
