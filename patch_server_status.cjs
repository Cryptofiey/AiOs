const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = 'app.get("/api/market/listings", async (req, res) => {';
const replacement = `app.get("/api/market/status", (req, res) => {
    try {
      const engine = ServerMarketEngine.getInstance();
      const adapters = engine.getNetworkAdapters();
      const status = adapters.map(a => ({
        name: a.name,
        ...a.getMarketStatus()
      }));
      res.json(status);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/market/listings", async (req, res) => {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log('Patched server.ts successfully');
} else {
    console.log('Target not found in server.ts');
}
