(async () => {
  const { MTProtoBridge } = await import('./src/lib/bridge/MTProtoBridge.ts');
  const bridge = MTProtoBridge.getInstance();
  await new Promise(r => setTimeout(r, 2000));
  const msg1 = await bridge.getLatestMessages("@Tonnel_Network_bot", 5);
  console.log("Tonnel:", msg1);
  const msg2 = await bridge.getLatestMessages("@main_mrkt_bot", 5);
  console.log("MRKT:", msg2);
})();
