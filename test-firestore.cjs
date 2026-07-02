const { db } = require('./query-firestore.cjs');
async function run() {
  const snapshot = await db.collection("arbitrage_opportunities").get();
  console.log(`Found ${snapshot.docs.length} arbitrage opportunities.`);
  snapshot.docs.forEach(d => console.log(d.id, d.data()));
}
run();
