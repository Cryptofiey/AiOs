const fs = require('fs');
let content = fs.readFileSync('src/lib/bridge/WalletBridge.ts', 'utf8');

const targetStr = `      // Auto-connect from secrets or headless server
      setTimeout(async () => {
        try {
          const res = await fetch("/api/ton/headless/status");
          if (res.ok) {
            const data = await res.json();
            if (data.active) {
              console.log("[WalletBridge] 🚀 Headless server-side wallet detected! Switching to highly stable server mode.", data.address);
              this.state = {
                connected: true,
                walletAddress: data.address,
                walletName: "Server Node",
                platform: "Headless",
                headless: true
              };
              this.notify();
              return;
            }
          }
        } catch (e) {}

        const auth = AuthAgent.getInstance();
        const address = auth.getCredential("MAIN_WALLET_ADDRESS") || auth.getCredential("VITE_MAIN_WALLET_ADDRESS");
        if (address && !this.state.connected) {
          console.log("[WalletBridge] Auto-connecting from Vault/Secrets:", address);
          this.state = {
            connected: true,
            walletAddress: address,
            walletName: "Vault Wallet",
            platform: "Vault"
          };
          this.notify();
        }
      }, 500);`;

const replacementStr = `      // Auto-connect from secrets or headless server
      setTimeout(async () => {
        if (typeof window === 'undefined') {
          // Server-side
          const hasSeed = !!process.env.WALLET_SEED_PHRASE || !!process.env.VITE_MAIN_WALLET_ADDRESS;
          if (hasSeed) {
            console.log("[WalletBridge] Server-side Headless mode active.");
            this.state = {
              connected: true,
              walletAddress: process.env.VITE_MAIN_WALLET_ADDRESS || "UQA_SERVER_FALLBACK_ADDRESS",
              walletName: "Server Headless",
              platform: "Server",
              headless: true
            };
            this.notify();
            return;
          } else {
            const auth = AuthAgent.getInstance();
            const address = auth.getCredential("MAIN_WALLET_ADDRESS") || auth.getCredential("VITE_MAIN_WALLET_ADDRESS");
            if (address && !this.state.connected) {
              console.log("[WalletBridge] Auto-connecting from Vault/Secrets (Read-Only):", address);
              this.state = {
                connected: true,
                walletAddress: address,
                walletName: "Vault Wallet",
                platform: "Vault"
              };
              this.notify();
            }
          }
        } else {
          // Client-side
          try {
            const res = await fetch("/api/ton/headless/status");
            if (res.ok) {
              const data = await res.json();
              if (data.active) {
                console.log("[WalletBridge] 🚀 Headless server-side wallet detected! Switching to highly stable server mode.", data.address);
                this.state = {
                  connected: true,
                  walletAddress: data.address,
                  walletName: "Server Node",
                  platform: "Headless",
                  headless: true
                };
                this.notify();
                return;
              }
            }
          } catch (e) {}

          const auth = AuthAgent.getInstance();
          const address = auth.getCredential("MAIN_WALLET_ADDRESS") || auth.getCredential("VITE_MAIN_WALLET_ADDRESS");
          if (address && !this.state.connected) {
            console.log("[WalletBridge] Auto-connecting from Vault/Secrets:", address);
            this.state = {
              connected: true,
              walletAddress: address,
              walletName: "Vault Wallet",
              platform: "Vault"
            };
            this.notify();
          }
        }
      }, 500);`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/lib/bridge/WalletBridge.ts', content);
console.log("Patched WalletBridge");
