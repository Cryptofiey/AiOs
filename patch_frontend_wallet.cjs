const fs = require('fs');
let content = fs.readFileSync('src/components/desktop/ScreenTgGiftsSniper.tsx', 'utf8');

const targetStr = `  useEffect(() => {
    return WalletBridge.getInstance().subscribe(setWalletState);
  }, []);`;

const replaceStr = `  useEffect(() => {
    return WalletBridge.getInstance().subscribe((newState) => {
      setWalletState(newState);
      if (newState.connected && newState.walletAddress) {
        // Sync wallet address to server so it can use it as working wallet
        fetch("/api/config/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ MAIN_WALLET_ADDRESS: newState.walletAddress })
        }).catch(console.error);
      }
    });
  }, []);`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/desktop/ScreenTgGiftsSniper.tsx', content);
console.log("Patched frontend to sync wallet");
