import { MarketHub } from "../src/lib/trading/MarketHub";
import { SniperEngine } from "../src/lib/trading/SniperEngine";
import { ServerMarketEngine } from "../src/lib/trading/ServerMarketEngine";
import { DataNormalizer } from "../src/lib/trading/DataNormalizer";
import { ArbitrageScanner } from "../src/lib/trading/ArbitrageScanner";

/**
 * E2E Audit Script
 * Verifies the pipeline: Raw Data -> Normalizer -> Hub -> Sniper -> Execution (Soft Mode)
 */
async function runAudit() {
  console.log("--------------------------------------------------");
  console.log("🔍 STARTING E2E SNIPER PIPELINE AUDIT");
  console.log("--------------------------------------------------");

  // 1. Initialize Core Engines
  const hub = MarketHub.getInstance();
  const sniper = SniperEngine.getInstance();
  const scanner = ArbitrageScanner.getInstance();
  
  // Enable soft mode for audit
  sniper.setSoftMode(true);

  // Start the sniper
  sniper.start();

  // 2. Pre-load some floor data so the scanner has a reference
  // We simulate that the "market floor" for a 'Toy Bear' is around 10-11 TON
  console.log("[Audit] Seeding market floor data for 'Toy Bear'...");
  hub.pushTick({
    id: "ref_1",
    source: "Fragment",
    price: 11,
    type: "ASK",
    timestamp: new Date().toISOString(),
    metadata: { itemName: "Toy Bear" }
  });
  hub.pushTick({
    id: "ref_2",
    source: "Fragment",
    price: 10.5,
    type: "ASK",
    timestamp: new Date().toISOString(),
    metadata: { itemName: "Toy Bear" }
  });
  hub.pushTick({
    id: "ref_3",
    source: "Fragment",
    price: 10,
    type: "ASK",
    timestamp: new Date().toISOString(),
    metadata: { itemName: "Toy Bear" }
  });

  // Wait for state propagation
  await new Promise(r => setTimeout(r, 500));

  console.log("[Audit] Simulating incoming real-time 'hot' data (Group 1 Opportunity)...");
  
  // 3. Simulate a raw data packet from a bot (MRKT-style)
  // Price is 2 TON, while floor is 10 TON (Extreme profit > 80%)
  const rawData = {
    name: "Toy Bear #4567",
    price: 2,
    type: "ASK",
    id: "raw_test_123"
  };

  // 4. Trace through Normalizer
  const normalized = DataNormalizer.normalize("MRKT", rawData);
  if (!normalized) {
    console.error("❌ Normalization failed!");
    process.exit(1);
  }
  console.log(`[Audit] ✅ Normalized: ${normalized.metadata?.itemName} at ${normalized.price} TON from ${normalized.source}`);

  // 5. Push to Hub
  console.log("[Audit] Pushing to MarketHub...");
  hub.pushTick(normalized);

  // 6. Verification
  // We expect SniperEngine to catch this because:
  // - Item is "Toy Bear"
  // - Price is 2 TON
  // - Scanner will see it as a Group 1 (Instant) opportunity
  // - Sniper will dispatch to ExecutionEngine
  // - ExecutionEngine will log [SOFT MODE] and return success

  console.log("[Audit] Waiting for Sniper processing (3s)...");
  await new Promise(r => setTimeout(r, 3000));

  console.log("--------------------------------------------------");
  console.log("🏁 AUDIT COMPLETE");
  console.log("Check console logs above for '🚀 HIGH FOCUS MATCH' and '[SOFT MODE]' messages.");
  console.log("--------------------------------------------------");
  
  sniper.stop();
  process.exit(0);
}

runAudit().catch(err => {
  console.error("❌ Audit crashed:", err);
  process.exit(1);
});
