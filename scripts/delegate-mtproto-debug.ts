import { AgentDelegator } from "../src/lib/supervisor/AgentDelegator";
import { OsKernel } from "../src/lib/supervisor/OsKernel";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("[Kernel] Bootstrapping for MTProto Debug Delegation...");
  
  // Register env vars to API manager if needed
  const kernel = OsKernel.getInstance();
  kernel.apiManager.setKey('gemini', process.env.GEMINI_API_KEY || '');
  kernel.apiManager.setKey('nvidia', process.env.NVIDIA_API_KEY || '');

  const delegator = new AgentDelegator();
  
  const taskDescription = `
    Проанализируй проблему с подключением к MTProto (Telegram) в браузере с использованием библиотеки 'telegram' (gramjs).
    Пользователь нажимает кнопку подключения бота (botToken).
    В src/lib/bridge/MTProtoBridge.ts используется this.client.start({ botAuthToken: botToken }).
    Однако при этом в интерфейсе появляется ошибка и подключение не происходит. 
    1. Учитывая, что gramjs работает в браузере, какие могут быть типичные проблемы с client.start() или StringSession?
    2. Требуется ли Buffer/polyfilling? 
    3. Выдает ли gramjs какие-то специфичные ошибки для botAuthToken в браузере?
    Предложи код или конкретные шаги для исправления.
  `;

  console.log(`[Delegator] Spawning agent to debug MTProto...`);
  
  try {
    const result = await delegator.delegateTask(
      "MTProto_Debug_Specialist",
      taskDescription,
      "models/gemini-2.5-flash"
    );
    console.log("\n[Delegator Result]:");
    console.log(result);
  } catch (err) {
    console.error("Delegation failed:", err);
  }
}

main();
