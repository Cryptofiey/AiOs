const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: "fluted-mountain-sdckx" });
try {
  const db = getFirestore("ai-studio-semasoulcombiner-eb85d699-a986-4498-8e80-387d17e2edfc");
  db.collection("test").doc("test").set({ a: 1 }).then(() => console.log("Success")).catch(e => console.error("Error1:", e.message));
} catch (e) {
  console.error("Error2:", e.message);
}
