async function run() {
  let offset = 0;
  while(offset < 5000) {
    const res = await fetch("https://tonapi.io/v2/nfts/collections?limit=500&offset=" + offset);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.nft_collections || data.nft_collections.length === 0) break;
    const found = data.nft_collections.filter(c => c.name && c.name.toLowerCase().includes("gift"));
    if (found.length > 0) {
      console.log(found.map(f => ({ name: f.name, address: f.address })));
    }
    offset += 500;
  }
}
run();
