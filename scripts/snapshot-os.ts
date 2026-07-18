import fs from "fs";
import path from "path";
import { MemoryCore } from "../src/lib/memory/MemoryCore.js";
import { db } from "../src/db/index.js";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const kernelMemory = MemoryCore.getInstance();
  // We mock a snapshot of the file tree
  const tree = { timestamp: Date.now(), files: [] };
  
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file === "dist") continue;
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else {
        tree.files.push(fullPath as never);
      }
    }
  }
  
  scanDir(".");
  
  console.log(`[Snapshot] Found ${tree.files.length} files. Dumping to MemoryCore...`);
  
  try {
    // Actually we don't have user authentication in the script, so we will just persist semantic memory
    await kernelMemory.persistSemanticMemory(
      "system_snapshot", 
      "OS Baseline Snapshot", 
      JSON.stringify(tree)
    );
    console.log("[Snapshot] OS Snapshot saved successfully to long-term memory.");
  } catch (err: any) {
    console.log("[Snapshot] Falling back to local state dump...", err.message);
    fs.writeFileSync("os_snapshot.json", JSON.stringify(tree));
  }
}

run().catch(console.error).finally(() => process.exit(0));
