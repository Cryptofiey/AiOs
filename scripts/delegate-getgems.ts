import { OsKernel } from "../src/lib/supervisor/OsKernel.js";
import { AgentDelegator } from "../src/lib/supervisor/AgentDelegator.js";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function run() {
  console.log("[Supervisor] Booting OS Kernel and Agent Delegator...");
  const kernel = OsKernel.getInstance();
  const delegator = new AgentDelegator();
  
  const task = `
We need to replace the simulated market scan for Telegram Gifts with a real GetGems API integration.
Analyze the provided code and generate a TypeScript function that fetches data from the GetGems GraphQL or REST API for Telegram Gifts (collection address or standard query) and formats it into our TradingItem interface.
Return ONLY the TypeScript code for the GetGems parsing logic.
`;

  console.log(`[Supervisor] Delegating task to Sub-Agent [GetGems API Integrator]...`);
  try {
    // We will use gemini-2.5-flash as the model to speed up and test our OS delegator
    const result = await delegator.delegateTask("GetGems API Integrator", task, "gemini-2.5-flash");
    console.log("[Supervisor] Agent returned result successfully.");
    
    fs.writeFileSync("scripts/agent_output.ts", result);
    console.log("[Supervisor] Output written to scripts/agent_output.ts");
    
    // Simulate sending to Google Chat
    await kernel.memoryCore.dispatchAgentMessage("spaces/GetGemsTask", { status: "Success", result_length: result.length });
    
  } catch (error) {
    console.error("[Supervisor] Delegation failed:", error);
  }
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
