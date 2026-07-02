async function run() {
  const url = "https://tonapi.io/v2/nfts/collections/EQC3oqtbZuV6pgC2nJtDBjCkMjeiFbv63006A1pGK7wkYwyQ/items?limit=20";
  const res = await fetch(url);
  const data = await res.json();
  if (data.nft_items) {
    console.log(`Found ${data.nft_items.length} items.`);
    console.log(data.nft_items.slice(0,5).map(i => i.metadata?.name || i.address));
  } else {
    console.log(data);
  }
}
run();
