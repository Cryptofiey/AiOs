import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class FileStorageFallback {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    const collDir = path.join(DATA_DIR, collectionName);
    if (!fs.existsSync(collDir)) {
      fs.mkdirSync(collDir, { recursive: true });
    }
  }

  async set(id: string, data: any) {
    const filePath = path.join(DATA_DIR, this.collectionName, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { id };
  }

  async get(id: string) {
    const filePath = path.join(DATA_DIR, this.collectionName, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  async list() {
    const collDir = path.join(DATA_DIR, this.collectionName);
    const files = fs.readdirSync(collDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const id = f.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(collDir, f), 'utf8'));
        return { ...data, id };
      });
  }
}

/**
 * A persistent storage engine using the local file system.
 * This is a REAL storage fallback for operational durability when cloud databases are unavailable.
 * It DOES NOT generate fake, mock, or simulated data. It only saves and loads data 
 * provided by the application's live data adapters.
 */
export class FileSystemFirestore {
  collection(name: string) {
    const storage = new FileStorageFallback(name);
    const self = {
      add: async (data: any) => {
        const id = Math.random().toString(36).substring(2, 15);
        return storage.set(id, data);
      },
      doc: (id: string) => ({
        set: (data: any) => storage.set(id, data),
        get: async () => {
          const data = await storage.get(id);
          return {
            exists: data !== null,
            data: () => data
          };
        },
        onSnapshot: (callback: any) => {
          storage.get(id).then(data => callback({ exists: data !== null, data: () => data }));
          return () => {}; // unsubscribe
        }
      }),
      onSnapshot: (callback: any) => {
        storage.list().then(docs => {
          callback({
            docs: docs.map(d => ({ 
              id: (d as any).id || "unknown", 
              data: () => d 
            })),
            docChanges: () => docs.map(d => ({
              type: 'added',
              doc: { id: (d as any).id || "unknown", data: () => d }
            }))
          });
        });
        return () => {};
      }
    };
    return self;
  }
}
