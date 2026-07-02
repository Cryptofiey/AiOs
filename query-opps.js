import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const q = query(collection(db, "agent_logs"), where("type", "==", "OPPORTUNITY"));
getDocs(q).then(snap => {
  console.log("Found opps:", snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data().itemName, doc.data().buyPrice));
  process.exit(0);
}).catch(console.error);
