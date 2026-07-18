const fs = require('fs');

const file = 'src/lib/trading/MarketHub.ts';
let code = fs.readFileSync(file, 'utf8');

const targetState = `  private state: MarketState = {
    items: new Map(),
    globalFloor: 0,
    lastUpdate: new Date().toISOString(),
    activeSources: []
  };`;

const replacementState = `  private state: MarketState = {
    items: new Map(),
    globalFloor: 0,
    lastUpdate: new Date().toISOString(),
    activeSources: [],
    adapterStatus: {}
  };`;

if (code.includes(targetState)) {
    code = code.replace(targetState, replacementState);
}

const targetFetch = `  public async fetchRealTimeData() {
    if (typeof window === "undefined") return;
    try {
      const response = await fetch("/api/market/listings");`;

const replacementFetch = `  public async fetchAdapterStatus() {
    if (typeof window === "undefined") return;
    try {
      const response = await fetch("/api/market/status");
      if (!response.ok) return;
      const statusArr = await response.json();
      const statusMap = {};
      statusArr.forEach((s: any) => {
          statusMap[s.name] = s.isOnline;
      });
      this.state.adapterStatus = statusMap;
      this.notifyListeners();
    } catch (e: any) {
      console.warn("[MarketHub] Failed to fetch adapter status:", e.message);
    }
  }

  public async fetchRealTimeData() {
    if (typeof window === "undefined") return;
    try {
      await this.fetchAdapterStatus();
      const response = await fetch("/api/market/listings");`;

if (code.includes(targetFetch)) {
    code = code.replace(targetFetch, replacementFetch);
}

fs.writeFileSync(file, code);
console.log('Patched MarketHub');
