import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

setDoc(doc(db, "agent_logs", "test1"), { time: 1 }).then(() => {
  console.log("Write success");
  process.exit(0);
}).catch(console.error);
