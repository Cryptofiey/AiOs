const fs = require('fs');
const content = fs.readFileSync('src/components/desktop/ScreenTgGiftsSniper.tsx', 'utf8');

const targetStr = `  const handleExecuteBuy = async (gift: GiftAsset) => {
    if (!config.walletAddress && !user) {
      setExecutionMessage({
        type: "error",
        text: "Для совершения ордера подключите кошелек или авторизуйтесь через Google"
      });
      return;
    }

    setExecutingOrderFor(gift.id);
    setExecutionMessage(null);

    const targetAddress = config.walletAddress || "EQA7_TargetReserves_MAINNET_v4R2";
    const amount = gift.floorPriceTon;

    try {
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "anonymous_user",
          giftId: gift.id,
          giftName: gift.name,
          tradeType: "BUY",
          amountTon: amount,
          walletAddress: targetAddress
        })
      });

      const data = await res.json();
      if (data.success) {
        setExecutionMessage({
          type: "success",
          text: \`Ордер успешно исполнен! Снайпер перехватил \${gift.name} за \${amount} TON. Хэш транзакции записан в базу.\`
        });
        
        // Remove locally from listed available gifts
        setMarketGifts(prev => prev.filter(g => g.id !== gift.id));
        // Deduct balance locally for visual consistency
        setWalletBalance(prev => {
          const currentBal = parseFloat(prev) || 0;
          const nextBal = Math.max(0, currentBal - amount);
          return nextBal.toFixed(2);
        });

        // Update config separately if needed
        if (config.useSimulatedBalance) {
          const currentBal = parseFloat(walletBalance) || 0;
          const nextBal = Math.max(0, currentBal - amount);
          saveConfig({ ...config, simulatedBalance: nextBal });
        }
      } else {
        setExecutionMessage({
          type: "error",
          text: data.error || "Произошла ошибка при выполнении ордера."
        });
      }
    } catch (error: any) {
      setExecutionMessage({
        type: "error",
        text: "Не удалось связаться с сервером брокера."
      });
    } finally {
      setExecutingOrderFor(null);
    }
  };`;

const newStr = `  const handleExecuteBuy = async (gift: GiftAsset) => {
    if (!config.walletAddress && !user) {
      setExecutionMessage({
        type: "error",
        text: "Для совершения ордера подключите кошелек или авторизуйтесь через Google"
      });
      return;
    }

    setExecutingOrderFor(gift.id);
    setExecutionMessage(null);
    const amount = gift.floorPriceTon;

    try {
      const execution = ExecutionEngine.getInstance();
      const res = await execution.executeTrade(
        { id: gift.id, name: gift.name, price: amount } as any,
        amount,
        "DeDust/StonFi"
      );

      if (res.success) {
        setExecutionMessage({
          type: "success",
          text: \`Ордер успешно исполнен! Снайпер перехватил \${gift.name} за \${amount} TON. Хэш: \${res.txHash || 'N/A'}\`
        });
        
        setMarketGifts(prev => prev.filter(g => g.id !== gift.id));
        setWalletBalance(prev => {
          const currentBal = parseFloat(prev) || 0;
          const nextBal = Math.max(0, currentBal - amount);
          return nextBal.toFixed(2);
        });

        if (config.useSimulatedBalance) {
          const currentBal = parseFloat(walletBalance) || 0;
          const nextBal = Math.max(0, currentBal - amount);
          saveConfig({ ...config, simulatedBalance: nextBal });
        }
      } else {
        setExecutionMessage({
          type: "error",
          text: res.error || "Произошла ошибка при выполнении ордера."
        });
      }
    } catch (error: any) {
      setExecutionMessage({
        type: "error",
        text: error.message || "Системная ошибка сети"
      });
    } finally {
      setExecutingOrderFor(null);
      setTimeout(() => setExecutionMessage(null), 5000);
    }
  };`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/desktop/ScreenTgGiftsSniper.tsx', content.replace(targetStr, newStr));
  console.log("Success");
} else {
  console.log("Target string not found, dumping similar lines around line 1548...");
  const lines = content.split('\n');
  console.log(lines.slice(1545, 1615).join('\n'));
}
