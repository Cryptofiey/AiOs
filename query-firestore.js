import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({ projectId: config.projectId });
const db = getFirestore(undefined, config.firestoreDatabaseId);
db.collection('market_data').get().then(snap => {
  console.log('Docs found:', snap.size);
  process.exit(0);
}).catch(console.error);
