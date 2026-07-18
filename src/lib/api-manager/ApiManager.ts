import { AuthAgent } from "../agents/AuthAgent";

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


export class ApiManager {
  private static instance: ApiManager;

  private constructor() {}

  public static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  /**
   * Unified API fetch wrapper that validates headers and session tokens
   * for specific services (like Portals and Fragment) before requests are sent.
   */
  public async fetch(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
    const urlString = url.toString();
    const headers = new Headers(options.headers || {});
    
    // Validate Portals API requests
    if (urlString.includes('portals-market.com') || urlString.includes('portals.market')) {
      const authAgent = AuthAgent.getInstance();
      const authData = process.env.PORTALS_AUTH || 
                       authAgent.getCredential("PORTALS_AUTH") || 
                       authAgent.getCredential("VITE_PORTALS_AUTH") || "";
      if (!authData) {
        throw new Error("[ApiInterceptor] PORTALS_AUTH token is missing. Request blocked.");
      }
      if (!headers.has('Authorization')) {
        headers.set('Authorization', authData);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      if (!headers.has('User-Agent') && typeof window === 'undefined') {
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      }
    }

    // Validate Fragment requests
    if (urlString.includes('fragment.com')) {
      const authAgent = AuthAgent.getInstance();
      const authData = process.env.FRAGMENT_AUTH || 
                       authAgent.getCredential("FRAGMENT_AUTH") || 
                       authAgent.getCredential("VITE_FRAGMENT_AUTH") || "";
      
      if (!authData) {
         // Fragment requests might be blocked without auth
         console.debug("[ApiInterceptor] FRAGMENT_AUTH token is missing. Request might fail.");
      } else if (!headers.has('Authorization')) {
         headers.set('Authorization', authData);
      }
    }

    // Validate TonApi requests (used by FragmentAdapter)
    if (urlString.includes('tonapi.io')) {
      const authAgent = AuthAgent.getInstance();
      const tonApiKey = process.env.TON_API_KEY || 
                        process.env.TONAPI_KEY || 
                        authAgent.getCredential("TON_API_KEY") || 
                        authAgent.getCredential("TONAPI_KEY") || 
                        authAgent.getCredential("VITE_TON_API_KEY") || "";
      
      if (!tonApiKey) {
        console.debug("[ApiInterceptor] TON_API_KEY is missing. Request might be rate limited.");
      } else if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${tonApiKey}`);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
    }

    // Validate TonConsole requests
    if (urlString.includes('tonconsole.com')) {
      const authAgent = AuthAgent.getInstance();
      const consoleKey = process.env.TONCONSOLE_API_KEY || 
                         authAgent.getCredential("TONCONSOLE_API_KEY") || 
                         authAgent.getCredential("VITE_TONCONSOLE_API_KEY") || "";
      
      if (consoleKey && !headers.has('X-API-Key')) {
        headers.set('X-API-Key', consoleKey);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
    }

    // Validate TonCenter requests
    if (urlString.includes('toncenter.com')) {
      const authAgent = AuthAgent.getInstance();
      const centerKey = process.env.TONCENTER_API_KEY || 
                        authAgent.getCredential("TONCENTER_API_KEY") || 
                        authAgent.getCredential("VITE_TONCENTER_API_KEY") || "";
      
      if (centerKey && !headers.has('X-API-Key')) {
        headers.set('X-API-Key', centerKey);
      }
    }

    const finalOptions = { ...options, headers };
    
    try {
      return await fetch(url, finalOptions);
    } catch (error: any) {
      if (error.cause && (error.cause as any).code === 'EAI_AGAIN') {
        console.debug(`[ApiInterceptor] DNS resolution failed for ${new URL(urlString).hostname}. The domain might be down or blocked.`);
      }
      throw error;
    }
  }
}
