async function run() {
  const res = await fetch("https://api.dedust.io/v2/pools");
  const pools = await res.json();
  console.log(`Found ${pools.length} pools.`);
  console.log(pools.find(p => p.assets[0]?.metadata?.symbol === "TON" && p.assets[1]?.metadata?.symbol));
}
run();
