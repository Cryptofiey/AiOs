import { MarketHub } from "./MarketHub";

/**
 * DataCleanerService
 * Responsible for maintaining state hygiene by scrubbing stale or mock records.
 * Ensures that the MarketHub only exposes validated, real-time data from trusted sources.
 */
export class DataCleanerService {
  private static instance: DataCleanerService;
  private hub: MarketHub;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Trusted sources as per protocol requirements
  private readonly TRUSTED_SOURCES = ["Fragment", "MRKT", "Tonapi", "MTProto Bridge", "GetGems", "Thermos", "PriceNFTbot", "Tonnel", "Portals"];
  
  // Records older than 5 minutes are considered stale in high-frequency trading context
  private readonly STALE_THRESHOLD_MS = 5 * 60 * 1000;

  private constructor() {
    this.hub = MarketHub.getInstance();
  }

  public static getInstance(): DataCleanerService {
    if (!DataCleanerService.instance) {
      DataCleanerService.instance = new DataCleanerService();
    }
    return DataCleanerService.instance;
  }

  /**
   * Starts the automatic cleaning lifecycle
   */
  public start(intervalMs: number = 60000): void {
    if (this.cleanupInterval) return;
    
    console.log("[DataCleaner] Initialization: Scrubbing engine started.");
    this.cleanupInterval = setInterval(() => this.performScrub(), intervalMs);
    // Run an immediate initial scrub
    this.performScrub();
  }

  /**
   * Performs a deep scrub of the MarketHub state
   */
  public performScrub(): void {
    const startTime = Date.now();
    let removedCount = 0;
    
    // In a real implementation, MarketHub would expose a way to filter its internal map.
    // For this architecture, we will implement a 'cleanup' method in MarketHub and call it.
    removedCount = this.hub.cleanup(this.TRUSTED_SOURCES, this.STALE_THRESHOLD_MS);
    
    if (removedCount > 0) {
      console.log(`[DataCleaner] Scrub complete. Purged ${removedCount} stale/mock records in ${Date.now() - startTime}ms.`);
    }
  }

  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
