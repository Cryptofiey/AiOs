const fs = require('fs');

function patchAdapter(file, botName) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Replace fetchLatestListings implementation
    const target = 'public async fetchLatestListings(): Promise<any[]> {';
    
    const replacement = `public async fetchLatestListings(): Promise<any[]> {
    this.lastPolled = new Date().toISOString();
    const allResults: any[] = [];
    
    // 1. Check if we have an active MTProto connection
    const status = this.bridge.getSessionStatus();
    if (!status || status.status !== "connected") {
        this.isOnline = false;
        console.warn(\`[\${this.name}Adapter] MTProtoBridge not connected. Cannot fetch from \${botName}\`);
        return [];
    }
    
    // 2. Check if we are using a BOT session. Bots cannot read other bots' history!
    if (status.isBot) {
        this.isOnline = false;
        console.warn(\`[\${this.name}Adapter] 🔴 OFFLINE: Requires MTPROTO_USER_SESSION_STRING. Current session is a Bot. Bots cannot read channel/bot history.\`);
        return [];
    }

    this.isOnline = true;
    try {
        const messages = await this.bridge.getLatestMessages("${botName}", 40);
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                const parsed = this.parse${file.includes('Tonnel') ? 'Tonnel' : 'Mrkt'}Message(msg);
                if (parsed && parsed.length > 0) {
                    allResults.push(...parsed);
                }
            }
        }
    } catch (e: any) {
        this.isOnline = false;
        console.error(\`[\${this.name}Adapter] Error fetching from \${botName}:\`, e.message);
    }
    return allResults;
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
}

patchAdapter('src/lib/adapters/TonnelAdapter.ts', '@Tonnel_Network_bot');
patchAdapter('src/lib/adapters/MrktAdapter.ts', '@main_mrkt_bot');

