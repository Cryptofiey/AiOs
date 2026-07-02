async function run() {
  const url = "https://tonapi.io/v2/nfts/collections?limit=500";
  const res = await fetch(url);
  const data = await res.json();
  if (data.nft_collections) {
    const f = data.nft_collections.find(c => c.name && c.name.includes("Telegram Usernames"));
    if (f) console.log("Usernames:", f.address);
    const f2 = data.nft_collections.find(c => c.name && c.name.includes("Anonymous"));
    if (f2) console.log("Anonymous:", f2.address);
    const f3 = data.nft_collections.find(c => c.name && c.name.includes("Gift"));
    if (f3) console.log("Gifts:", f3.address);
  }
}
run();
