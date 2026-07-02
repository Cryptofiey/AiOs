// scripts/clean-git.js
import fs from "fs";
import path from "path";

const gitDir = path.join(process.cwd(), ".git");

if (fs.existsSync(gitDir)) {
  console.log("[Clean-Git] Removing .git directory recursively to fix corruption...");
  try {
    fs.rmSync(gitDir, { recursive: true, force: true });
    console.log("[Clean-Git] Successfully removed .git directory!");
  } catch (error) {
    console.error("[Clean-Git] Failed to remove .git directory:", error.message);
  }
} else {
  console.log("[Clean-Git] No .git directory found. Ready for clean init.");
}
