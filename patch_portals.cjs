const fs = require('fs');

const file = 'src/lib/adapters/PortalsAdapter.ts';
let code = fs.readFileSync(file, 'utf8');

const target = 'public async fetchLatestListings(): Promise<any[]> {';

const replacement = `public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    try {
      const authAgent = AuthAgent.getInstance();
      const token = await authAgent.getToken("PORTALS_AUTH");
      
      if (!token) {
        this.isOnline = false;
        console.warn(\`[\${this.name}Adapter] 🔴 OFFLINE: Missing PORTALS_AUTH token.\`);
        return [];
      }

      const url = "https://portals.market/api/nfts/search?offset=0&limit=20&sort_by=price+asc&status=listed";
      
      const response = await ApiManager.fetch(url, {
        headers: {
          "Authorization": \`Bearer \${token}\`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
             this.isOnline = false;
             console.warn(\`[\${this.name}Adapter] 🔴 OFFLINE: Token expired or Cloudflare blocked (Status \${response.status}).\`);
             return [];
        }
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      this.isOnline = true;
      return data.items || [];
    } catch (error: any) {
      this.isOnline = false;
      console.error(\`[\${this.name}Adapter] Error fetching:\`, error.message);
      return [];
    }
  }`;

const endOfFetch = code.indexOf('public normalizeData', code.indexOf(target));
if (endOfFetch > -1) {
    const before = code.substring(0, code.indexOf(target));
    const after = code.substring(endOfFetch);
    fs.writeFileSync(file, before + replacement + "\n\n  " + after);
    console.log('Patched', file);
} else {
    console.log('Could not find boundaries in', file);
}
