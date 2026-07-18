const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      try {
        adminDb = getFirestore();
        activePersistenceDb = adminDb;
        console.log(\`[Firebase] Admin connected to Named Database: \${config.firestoreDatabaseId}\`);
        
        // Connection test on named database
        getDb().collection("test").doc("connection").set({
          lastCheck: new Date().toISOString(),
          status: "ok",
          projectId: config.projectId,
          databaseId: config.firestoreDatabaseId
        }).then(() => {
          console.log("[Firebase] SUCCESS: Named Database Write Succeeded:", config.firestoreDatabaseId);
        }).catch(err => {
          console.error("[Firebase] FAILURE: Named Database Write Failed:", config.firestoreDatabaseId, err.message);
        });
      } catch (fsError) {
        console.error(\`[Firebase] Failed to connect to databaseId \${config.firestoreDatabaseId}:\`, fsError);
      }`;

const replaceStr = `      try {
        adminDb = getFirestore(config.firestoreDatabaseId);
        activePersistenceDb = adminDb;
        console.log(\`[Firebase] Admin connected to Named Database: \${config.firestoreDatabaseId}\`);
        
        // Connection test on named database
        await getDb().collection("test").doc("connection").set({
          lastCheck: new Date().toISOString(),
          status: "ok",
          projectId: config.projectId,
          databaseId: config.firestoreDatabaseId
        });
        console.log("[Firebase] SUCCESS: Named Database Write Succeeded:", config.firestoreDatabaseId);
      } catch (fsError) {
        console.error(\`[Firebase] FAILURE: Named Database Write Failed. Falling back to local FS DB. Error:\`, fsError.message);
        activePersistenceDb = null;
        adminDb = null;
      }`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('server.ts', content);
console.log("Patched server.ts initialization");
