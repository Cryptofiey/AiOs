import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

getDocs(collection(db, "agent_logs")).then(snap => {
  console.log("Found docs:", snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data().source || "no-source", doc.data().price || "no-price"));
  process.exit(0);
}).catch(console.error);
