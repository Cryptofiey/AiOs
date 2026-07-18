const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Also make sure adminDb = null is correctly falling back
content = content.replace(
`  } catch (error) {
    console.error("[Firebase] Admin Initialization error:", error);
    if (!getApps().length) {
      initializeApp();
    }
    adminDb = getFirestore();
  }`,
`  } catch (error) {
    console.error("[Firebase] Admin Initialization error:", error);
    adminDb = null;
    activePersistenceDb = null;
  }`
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts initialization catch block");
