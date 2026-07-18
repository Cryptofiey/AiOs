(async () => {
  const { MTProtoBridge } = await import('./src/lib/bridge/MTProtoBridge.ts');
  const bridge = MTProtoBridge.getInstance();
  await new Promise(r => setTimeout(r, 2000));
  try {
    const msg1 = await bridge.getLatestMessages("toncoin", 2);
    console.log("toncoin:", msg1.length);
  } catch(e) { console.log(e.message); }
  process.exit(0);
})();
