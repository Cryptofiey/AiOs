const admin = require('firebase-admin');
const fs = require('fs');

const configPath = './firebase-applet-config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

admin.initializeApp();
const db = admin.firestore(undefined, config.firestoreDatabaseId);

db.collection('market_data').get().then(snap => {
  console.log('Docs found:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}).catch(console.error);
