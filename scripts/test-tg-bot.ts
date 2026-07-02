import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";

dotenv.config();

const apiId = 39596855;
const apiHash = "5d903a243bf77ca97234499df5b6e339";
const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;

async function test() {
  if (!botToken) {
    console.error("No bot token provided in .env!");
    process.exit(1);
  }

  console.log("Starting test with bot token...");
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();
    console.log("Connected to MTProto!");
    
    await client.start({
      botAuthToken: botToken,
    });
    console.log("Bot logged in successfully!");
    
    const me = await client.getMe();
    console.log("Bot info:", me);

    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

test();
