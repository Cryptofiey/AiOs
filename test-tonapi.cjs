async function run() {
  const url = "https://tonapi.io/v2/nfts/collections/EQBZj1V0sY892w8Q7YV2o_5zC4Kk3uHqjBvJzJ7bJm9-T2mC/items?limit=20";
  const res = await fetch(url);
  const data = await res.json();
  if (data.nft_items) {
    console.log(`Found ${data.nft_items.length} items.`);
    console.log(data.nft_items.slice(0,2).map(i => i.metadata?.name || i.address));
  } else {
    console.log(data);
  }
}
run();
