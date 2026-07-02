// scripts/github-push.js
import { git, http } from "./git-helper.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

dotenv.config();

async function pushToGitHub() {
  const token = process.env.GITHUB_TOKEN;
  let repoName = process.env.GITHUB_REPO;

  if (!token || !repoName) {
    console.log("[GitHub Auto-Push] Skipped: GITHUB_TOKEN or GITHUB_REPO not defined in .env");
    return;
  }

  if (repoName.includes("github.com/")) {
    repoName = repoName.split("github.com/")[1];
  }
  repoName = repoName.replace(/\.git$/, "");

  const dir = process.cwd();

  try {
    console.log(`[GitHub Auto-Push] Starting auto-push to ${repoName}...`);

    // Try native git first
    let nativeGitSuccess = false;
    try {
      execSync("git --version", { stdio: "ignore" });
      console.log("[GitHub Auto-Push] Native Git CLI detected. Using native git for push...");
      
      try {
        execSync(`git config --global --add safe.directory ${dir}`, { stdio: "ignore" });
      } catch (e) {}

      execSync("git init", { stdio: "inherit" });
      execSync('git config user.name "AI Studio Agent"', { stdio: "inherit" });
      execSync('git config user.email "agent@aistudio.google.com"', { stdio: "inherit" });
      
      // Setup remote
      const remoteUrl = `https://oauth2:${token}@github.com/${repoName}.git`;
      try {
        execSync(`git remote add origin ${remoteUrl}`, { stdio: "ignore" });
      } catch (e) {
        execSync(`git remote set-url origin ${remoteUrl}`, { stdio: "ignore" });
      }

      execSync("git add -A", { stdio: "inherit" });
      
      try {
        const msg = `Auto-commit from AI Studio build - ${new Date().toISOString()}`;
        execSync(`git commit -m "${msg}"`, { stdio: "inherit" });
      } catch (e) {
        console.log("[GitHub Auto-Push] No changes to commit or commit failed (likely empty stage).");
      }

      try {
        execSync("git branch -M main", { stdio: "ignore" });
      } catch (e) {
        try {
          execSync("git checkout -b main", { stdio: "ignore" });
        } catch (e2) {}
      }

      console.log("[GitHub Auto-Push] Pushing to GitHub main branch...");
      execSync("git push -f origin main", { stdio: "inherit" });
      console.log(`[GitHub Auto-Push] Successfully pushed to ${repoName} via native Git!`);
      nativeGitSuccess = true;
    } catch (nativeError) {
      console.warn("[GitHub Auto-Push] Native git push failed or not available, falling back to isomorphic-git:", nativeError.message || nativeError);
    }

    if (nativeGitSuccess) {
      return;
    } else {
      console.warn("[GitHub Auto-Push] Native git push did not succeed. Skipping isomorphic-git fallback to avoid corrupting index.");
      return;
    }
    console.log("[GitHub Auto-Push] Executing isomorphic-git push fallback...");
    // Self-healing: Delete .git/index if it exists to avoid "Invalid checksum in GitIndex buffer" corruption
    const indexPath = path.join(dir, ".git", "index");
    if (fs.existsSync(indexPath)) {
      try {
        fs.unlinkSync(indexPath);
        console.log("[GitHub Auto-Push] Cleaned up Git index to prevent index buffer corruption.");
      } catch (e) {
        console.warn("[GitHub Auto-Push] Warning: Could not delete Git index:", e.message);
      }
    }

    // Ensure .git directory exists
    if (!fs.existsSync(path.join(dir, ".git"))) {
      console.log("[GitHub Auto-Push] Initializing new git repository...");
      await git.init({ fs, dir, defaultBranch: "main" });
    }

    // Add all files
    console.log("[GitHub Auto-Push] Adding files...");
    const status = await git.statusMatrix({ fs, dir });
    const promises = status
      .filter(([filepath, head, workdir, stage]) => workdir !== stage)
      .map(([filepath]) => {
        if (fs.existsSync(path.join(dir, filepath))) {
          return git.add({ fs, dir, filepath });
        } else {
          return git.remove({ fs, dir, filepath });
        }
      });
    await Promise.all(promises);

    // Check if there are changes to commit
    const newStatus = await git.statusMatrix({ fs, dir });
    const hasChanges = newStatus.some(([filepath, head, workdir, stage]) => head !== stage);

    if (!hasChanges) {
      console.log("[GitHub Auto-Push] No new changes to commit.");
    } else {
      const msg = `Auto-commit from AI Studio build - ${new Date().toISOString()}`;
      await git.commit({
        fs,
        dir,
        message: msg,
        author: {
          name: "AI Studio Agent",
          email: "agent@aistudio.google.com"
        }
      });
      console.log("[GitHub Auto-Push] Committed changes.");
    }

    // Ensure we are on "main" branch in isomorphic-git
    try {
      const currentBranch = await git.currentBranch({ fs, dir });
      if (currentBranch && currentBranch !== "main") {
        console.log(`[GitHub Auto-Push] Current branch is ${currentBranch}. Switch/Rename to main...`);
        await git.branch({ fs, dir, ref: "main", checkout: true });
      }
    } catch (branchError) {
      console.warn("[GitHub Auto-Push] Could not ensure main branch name via isomorphic-git:", branchError.message);
    }

    // Push to GitHub
    console.log(`[GitHub Auto-Push] Pushing to GitHub...`);
    await git.push({
      fs,
      http,
      dir,
      remote: "origin",
      ref: "main",
      force: true,
      url: `https://oauth2:${token}@github.com/${repoName}.git`,
      onAuth: () => ({ username: token })
    });

    console.log(`[GitHub Auto-Push] Successfully pushed to ${repoName}!`);
  } catch (error) {
    console.error("[GitHub Auto-Push] Error during push:", error.message || error);
  }
}

pushToGitHub();
