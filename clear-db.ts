import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "fluted-mountain-sdckx",
  databaseId: "ai-studio-semasoulcombiner-eb85d699-a986-4498-8e80-387d17e2edfc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clear() {
  console.log("Clearing execution_queue...");
  const q1 = await getDocs(collection(db, "execution_queue"));
  for (const doc of q1.docs) {
    await deleteDoc(doc.ref);
  }
  console.log("Clearing agent_logs...");
  const q2 = await getDocs(collection(db, "agent_logs"));
  let i = 0;
  for (const doc of q2.docs) {
    await deleteDoc(doc.ref);
    i++;
    if (i % 100 === 0) console.log(`Deleted ${i} logs...`);
  }
  console.log("Done");
  process.exit(0);
}
clear();
