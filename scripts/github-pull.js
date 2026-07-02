// scripts/github-pull.js
import { git, http } from "./git-helper.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

dotenv.config();

async function pullFromGitHub() {
  const token = process.env.GITHUB_TOKEN;
  let repoName = process.env.GITHUB_REPO;

  if (!token || !repoName) {
    console.log("[GitHub Auto-Pull] Skipped: GITHUB_TOKEN or GITHUB_REPO not defined in .env");
    return;
  }

  if (repoName.includes("github.com/")) {
    repoName = repoName.split("github.com/")[1];
  }
  repoName = repoName.replace(/\.git$/, "");

  const dir = process.cwd();

  try {
    console.log(`[GitHub Auto-Pull] Starting auto-pull from ${repoName}...`);

    // Try native git first
    let nativeGitSuccess = false;
    try {
      execSync("git --version", { stdio: "ignore" });
      console.log("[GitHub Auto-Pull] Native Git CLI detected. Using native git for pull...");
      
      try {
        execSync(`git config --global --add safe.directory ${dir}`, { stdio: "ignore" });
      } catch (e) {}

      execSync("git init", { stdio: "inherit" });
      
      // Setup remote
      const remoteUrl = `https://oauth2:${token}@github.com/${repoName}.git`;
      try {
        execSync(`git remote add origin ${remoteUrl}`, { stdio: "ignore" });
      } catch (e) {
        execSync(`git remote set-url origin ${remoteUrl}`, { stdio: "ignore" });
      }

      console.log("[GitHub Auto-Pull] Fetching from remote main branch...");
      execSync("git fetch origin main", { stdio: "inherit" });
      
      console.log("[GitHub Auto-Pull] Hard resetting to origin/main...");
      execSync("git reset --hard origin/main", { stdio: "inherit" });
      
      console.log(`[GitHub Auto-Pull] Successfully synced with ${repoName} via native Git!`);
      nativeGitSuccess = true;
    } catch (nativeError) {
      console.warn("[GitHub Auto-Pull] Native git pull failed or not available, falling back to isomorphic-git:", nativeError.message || nativeError);
    }

    if (nativeGitSuccess) {
      return;
    }

    // --- FALLBACK TO ISOMORPHIC-GIT ---
    console.log("[GitHub Auto-Pull] Executing isomorphic-git pull fallback...");
    // Self-healing: Delete .git/index if it exists to avoid "Invalid checksum in GitIndex buffer" corruption
    const indexPath = path.join(dir, ".git", "index");
    if (fs.existsSync(indexPath)) {
      try {
        fs.unlinkSync(indexPath);
        console.log("[GitHub Auto-Pull] Cleaned up Git index to prevent index buffer corruption.");
      } catch (e) {
        console.warn("[GitHub Auto-Pull] Warning: Could not delete Git index:", e.message);
      }
    }

    if (!fs.existsSync(path.join(dir, ".git"))) {
      console.log("[GitHub Auto-Pull] Repository not initialized. Initializing...");
      await git.init({ fs, dir, defaultBranch: "main" });
    }

    const remoteUrl = `https://oauth2:${token}@github.com/${repoName}.git`;
    
    // Add remote if it doesn't exist
    try {
      await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
    } catch {
      // Remote might already exist, ignore error
    }

    console.log("[GitHub Auto-Pull] Fetching latest changes...");
    await git.fetch({
      fs,
      http,
      dir,
      remote: "origin",
      ref: "main",
      onAuth: () => ({ username: token })
    });

    console.log("[GitHub Auto-Pull] Checking out main...");
    await git.checkout({
      fs,
      dir,
      ref: "origin/main",
      force: true
    });

    console.log(`[GitHub Auto-Pull] Successfully synced with ${repoName}!`);
  } catch (error) {
    console.error("[GitHub Auto-Pull] Error during pull:", error.message || error);
  }
}

pullFromGitHub();
