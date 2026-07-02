import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

async function test() {
  const client = new TelegramClient(new StringSession(""), 12345, "hash", {
    connectionRetries: 1,
  });
  
  console.log(typeof client.signInUser, typeof client.invoke);
  process.exit(0);
}
test();
