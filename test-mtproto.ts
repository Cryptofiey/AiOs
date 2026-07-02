import { MTProtoBridge } from "./src/lib/bridge/MTProtoBridge";

async function test() {
  const bridge = MTProtoBridge.getInstance();
  console.log("Status before:", bridge.getSessionStatus());
  try {
    await bridge.reconnectFromVault();
    console.log("Status after:", bridge.getSessionStatus());
    process.exit(0);
  } catch(e) {
    console.error("Error connecting:", e);
    process.exit(1);
  }
}
test();
