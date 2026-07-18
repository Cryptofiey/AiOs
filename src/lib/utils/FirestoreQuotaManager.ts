export class FirestoreQuotaManager {
  private static isSuspended = false;
  private static suspendedUntil = 0;

  public static canWrite(): boolean {
    if (this.isSuspended) {
      if (Date.now() > this.suspendedUntil) {
        this.isSuspended = false;
        console.log("[FirestoreQuotaManager] Firestore write suspension expired. Retrying Firestore...");
        this.enableNetworkIfSuspendedExpired();
        return true;
      }
      return false;
    }
    return true;
  }

  private static async enableNetworkIfSuspendedExpired() {
    try {
      const { db } = await import("../firebase");
      const { enableNetwork } = await import("firebase/firestore");
      if (db) {
        await enableNetwork(db);
        console.log("[FirestoreQuotaManager] Firestore network re-enabled successfully.");
      }
    } catch (netErr: any) {
      console.debug("[FirestoreQuotaManager] Failed to enable network:", netErr.message);
    }
  }

  public static handleWriteFailure(error: any): void {
    const errorStr = String(error?.message || error || "").toLowerCase();
    if (
      errorStr.includes("resource_exhausted") ||
      errorStr.includes("quota") ||
      errorStr.includes("limit exceeded") ||
      errorStr.includes("exhausted") ||
      (error?.code && String(error.code).toLowerCase().includes("resource-exhausted"))
    ) {
      if (!this.isSuspended) {
        this.isSuspended = true;
        // Suspend Firestore writes for 10 minutes to avoid API spamming and console log floods
        this.suspendedUntil = Date.now() + 10 * 60 * 1000; 
        console.warn(
          `[FirestoreQuotaManager] 🛑 Firestore Quota Exhausted detected! Suspending all Firestore writes for 10 minutes to prevent console spam and protect app resources.`
        );

        // Dynamically disable network to completely silence retry GrpcConnection RPC stream errors
        this.disableNetworkOnSuspension();
      }
    }
  }

  private static async disableNetworkOnSuspension() {
    try {
      const { db } = await import("../firebase");
      const { disableNetwork, setLogLevel } = await import("firebase/firestore");
      if (db) {
        setLogLevel('silent');
        await disableNetwork(db);
        console.log("[FirestoreQuotaManager] Firestore network disabled successfully to silence GrpcConnection stream errors.");
      }
    } catch (netErr: any) {
      console.debug("[FirestoreQuotaManager] Failed to disable network:", netErr.message);
    }
  }

  public static forceSuspend(minutes: number = 10): void {
    this.isSuspended = true;
    this.suspendedUntil = Date.now() + minutes * 60 * 1000;
    this.disableNetworkOnSuspension();
  }
}
