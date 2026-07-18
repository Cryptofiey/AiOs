const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: "fluted-mountain-sdckx" });
const db = getFirestore(app, "ai-studio-semasoulcombiner-eb85d699-a986-4498-8e80-387d17e2edfc");
console.log("DB Database ID:", db.databaseId);
db.collection("test").doc("test").set({ a: 1 }).then(() => console.log("Success with app")).catch(e => console.error("Error with app:", e.message));
