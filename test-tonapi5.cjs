async function run() {
  const url = "https://tonapi.io/v2/nfts/collections?limit=20";
  const res = await fetch(url);
  const data = await res.json();
  if (data.nft_collections) {
    console.log(`Found ${data.nft_collections.length} items.`);
    console.log(data.nft_collections.slice(0,5).map(i => ({ name: i.name, address: i.address })));
  } else {
    console.log(data);
  }
}
run();
