const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: "test" });
try {
  const db = getFirestore(app, "my-db-id");
  console.log("Success with getFirestore(app, dbId)");
} catch (e) {
  console.error("Error with getFirestore(app, dbId):", e.message);
}
try {
  const db2 = getFirestore("my-db-id");
  console.log("Success with getFirestore(dbId)");
} catch (e) {
  console.error("Error with getFirestore(dbId):", e.message);
}
