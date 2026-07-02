async function run() {
  let offset = 0;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`https://tonapi.io/v2/nfts/collections?limit=500&offset=${offset}`);
    const data = await res.json();
    if (!data.nft_collections) break;
    const found = data.nft_collections.filter(c => c.name && c.name.toLowerCase().includes("gift"));
    if (found.length > 0) {
      console.log("Found in batch", i, found.map(f => ({ name: f.name, address: f.address })));
    }
    offset += 500;
  }
}
run();
