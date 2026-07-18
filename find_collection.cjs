const https = require('https');
async function find() {
  let offset = 0;
  for(let i=0; i<50; i++) {
    const url = `https://tonapi.io/v2/nfts/collections?limit=100&offset=${offset}`;
    const data = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });
    
    if(!data.collections) break;
    for(const c of data.collections) {
      if(c.name && c.name.toLowerCase().includes('gift')) {
        console.log("FOUND:", c.name, c.address);
      }
    }
    offset += 100;
  }
}
find();
