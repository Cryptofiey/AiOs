async function run() {
  const url = "https://tonapi.io/v2/nfts/collections/EQCA14o1-VWhS2efqohO9M1b_A9DtKTuoqfmkn83AbJzwnPi/items?limit=20";
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
