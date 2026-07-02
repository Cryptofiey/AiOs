const admin = require('firebase-admin');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({ projectId: config.projectId });
const db = admin.firestore(undefined, config.firestoreDatabaseId);

db.collection('market_data').get().then(snap => {
  console.log('Docs found:', snap.size);
  snap.forEach(doc => {
    console.log(doc.id, doc.data().source, doc.data().price);
  });
  process.exit(0);
}).catch(console.error);
