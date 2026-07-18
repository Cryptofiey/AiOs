const fs = require('fs');
let code = fs.readFileSync('src/lib/api-manager/ApiManager.ts', 'utf8');

const httpsProxyAgent = `
import { HttpsProxyAgent } from 'https-proxy-agent';

// Free proxies that we can rotate (placeholder list)
const FREE_PROXIES = [
  "http://91.211.245.174:8080",
  "http://200.105.215.18:33630",
  "http://189.240.60.166:9090",
  "http://162.223.94.164:80",
  "http://8.219.167.92:3128"
];
let currentProxyIndex = 0;
`;

const proxyLogic = `
    const finalOptions: any = { ...options, headers };
    
    // Auto-rotate proxies for getgems if needed
    if (typeof window === 'undefined' && urlString.includes('getgems.io')) {
       // We can use an environment variable or fallback to FREE_PROXIES
       const proxyUrl = process.env.HTTP_PROXY || FREE_PROXIES[currentProxyIndex % FREE_PROXIES.length];
       if (proxyUrl) {
          finalOptions.agent = new HttpsProxyAgent(proxyUrl);
          currentProxyIndex++;
       }
    }
        
    try {
      return await fetch(url, finalOptions);
`;

code = code.replace('import { AuthAgent } from "../agents/AuthAgent";', 'import { AuthAgent } from "../agents/AuthAgent";\n' + httpsProxyAgent);
code = code.replace(`    const finalOptions = { ...options, headers };
        
    try {
      return await fetch(url, finalOptions);`, proxyLogic);

fs.writeFileSync('src/lib/api-manager/ApiManager.ts', code);
