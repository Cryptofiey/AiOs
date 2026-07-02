import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

setDoc(doc(db, "market_data", "test1"), { price: 100 }).then(() => {
  console.log("Success");
  process.exit(0);
}).catch(console.error);
