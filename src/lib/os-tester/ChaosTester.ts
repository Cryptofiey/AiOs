import { MTProtoBridge } from "../bridge/MTProtoBridge";
import { ServerMarketEngine } from "../trading/ServerMarketEngine";
import fs from "fs";
import path from "path";

/**
 * Unified Chaos/Monkey Tester Agent
 * Travels through the bot functionality, clicks around, and checks adapters.
 * If an error occurs, it writes to error_logs.json for the AI to pick up via `schedule`.
 */
export class ChaosTester {
  private static instance: ChaosTester | null = null;
  private isRunning = false;
  private bridge: MTProtoBridge;

  private targets = ["@thermos_bot", "@PriceNFTbot", "@GetGemsBot"];
  private actions = ["/start", "Market", "Profile", "Buy", "Refresh"];

  private constructor() {
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): ChaosTester {
    if (!ChaosTester.instance) {
      ChaosTester.instance = new ChaosTester();
    }
    return ChaosTester.instance;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[ChaosTester] Starting autonomous monkey testing...");
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    console.log("[ChaosTester] Stopping monkey testing...");
  }

  private async loop() {
    while (this.isRunning) {
      try {
        await this.performRandomAction();
        // Wait 15-30 seconds before next action to simulate human
        const delay = Math.floor(Math.random() * 15000) + 15000;
        await new Promise(r => setTimeout(r, delay));
      } catch (err: any) {
        this.logError(err);
        await new Promise(r => setTimeout(r, 10000)); // wait before retry on error
      }
    }
  }

  private async performRandomAction() {
    // 1. Verify adapters occasionally
    if (Math.random() > 0.7) {
      console.log("[ChaosTester] Running adapter verifications...");
      try {
        // We know verifyAdapters exists on ServerMarketEngine, but it's private. 
        // We will call the public fetch logic or trigger harness
        const engine = ServerMarketEngine.getInstance() as any;
        if (engine.networkAdapters) {
          for (const adapter of engine.networkAdapters) {
             const status = adapter.getMarketStatus();
             if (!status.isOnline) {
                throw new Error(`Adapter ${adapter.name} is offline!`);
             }
          }
        }
      } catch (e: any) {
        this.logError(e, "Adapter Verification");
      }
    }

    // 2. MTProto Interactions (The "Bomzh" logic)
    const status = this.bridge.getSessionStatus();
    if (status?.status === "connected") {
      const target = this.targets[Math.floor(Math.random() * this.targets.length)];
      const action = this.actions[Math.floor(Math.random() * this.actions.length)];
      
      console.log(`[ChaosTester] Sending '${action}' to ${target}...`);
      try {
        await this.bridge.sendBotCommand(target, action);
        
        // Wait for response
        await new Promise(r => setTimeout(r, 5000));
        const reply = await this.bridge.getLatestMessage(target);
        
        if (!reply) {
           console.warn(`[ChaosTester] No reply from ${target} after sending ${action}.`);
        } else {
           console.log(`[ChaosTester] Received reply from ${target}: ${reply.substring(0, 50)}...`);
        }

      } catch (e: any) {
        this.logError(e, `MTProto Interaction with ${target}`);
      }
    } else {
      console.log("[ChaosTester] MTProto not connected, skipping UI/Bot interaction.");
    }
  }

  private logError(err: any, context?: string) {
    const errorMsg = err?.message || String(err);
    console.error(`[ChaosTester] ❌ Error detected${context ? ` in ${context}` : ''}:`, errorMsg);
    
    try {
      const logPath = path.join(process.cwd(), "chaos_errors.json");
      let logs: any[] = [];
      if (fs.existsSync(logPath)) {
         logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
      }
      logs.unshift({
        timestamp: new Date().toISOString(),
        context: context || "General",
        error: errorMsg,
        stack: err?.stack || ""
      });
      
      // keep only last 50
      if (logs.length > 50) logs = logs.slice(0, 50);
      
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    } catch (fsErr) {
      console.error("[ChaosTester] Failed to write error log:", fsErr);
    }
  }
}
