const https = require('https');
const url = "https://tonapi.io/v2/accounts/0:158136239adb15dd59df90c641f9efd312cfeb8664f218f4c3e5fce9d95e6c07/nfts?limit=1000";
https.get(url, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const data = JSON.parse(body);
    const collections = {};
    data.nft_items.forEach(nft => {
      if(nft.collection) {
        collections[nft.collection.address] = nft.collection.name;
      }
    });
    console.log(JSON.stringify(collections, null, 2));
  });
});
