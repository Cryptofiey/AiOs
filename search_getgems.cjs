const https = require('https');

const data = JSON.stringify({
  query: `
    query Search($query: String!) {
      alphaSearch(query: $query) {
        collections {
          address
          name
        }
      }
    }
  `,
  variables: { query: "Telegram Gifts" }
});

const options = {
  hostname: 'api.getgems.io',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://getgems.io',
    'Referer': 'https://getgems.io/'
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});

req.write(data);
req.end();
