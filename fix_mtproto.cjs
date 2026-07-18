const fs = require('fs');
const file = 'src/lib/bridge/MTProtoBridge.ts';
let content = fs.readFileSync(file, 'utf8');

// MTProtoStatus
content = content.replace(/MTProtoStatus, /, '');

// getMe
content = content.replace(/public async getMe\(\): Promise<any> \{[\s\S]*?\n  \}\n/g, '');

// sendMessage
content = content.replace(/public async sendMessage\([^)]*\): Promise<boolean> \{[\s\S]*?\n  \}\n/g, '');

// searchGlobal
content = content.replace(/public async searchGlobal\([^)]*\): Promise<any\[\]> \{[\s\S]*?\n  \}\n/g, '');

// getChatHistory
content = content.replace(/public async getChatHistory\([^)]*\): Promise<any\[\]> \{[\s\S]*?\n  \}\n/g, '');

fs.writeFileSync(file, content);
