const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

signInAnonymously(auth).then(async () => {
  console.log("Logged in");
  try {
    await setDoc(doc(db, "test", "test"), { a: 1 });
    console.log("Client write success!");
  } catch(e) {
    console.error("Client write error:", e.message);
  }
}).catch(e => console.error("Auth error:", e));
