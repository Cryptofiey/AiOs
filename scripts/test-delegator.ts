import dotenv from 'dotenv';
dotenv.config();

import { AgentDelegator } from '../src/lib/supervisor/AgentDelegator.js';

async function testMemoryDelegation() {
  console.log("=== Тест Супервизора + Летописца ===");
  const delegator = new AgentDelegator();
  
  const memoryNode = delegator.getMemoryNode();
  if (memoryNode) {
     memoryNode.addDocument("Руководство по дизайну", "В проекте должен использоваться строгий красный цвет для всех кнопок ошибки, и зеленый для успеха. Игнорируй другие цвета.");
     memoryNode.addDocument("Протокол No Man Include", "Никаких приветствий и лишних объяснений. Агент выдает чистый результат.");
  }
  
  console.log("\n1. Делегирование задачи агенту-дизайнеру");
  try {
    const result = await delegator.delegateTask(
      "Frontend Designer Agent",
      "Опиши CSS стили для кнопок успеха и ошибки в нашем проекте. Какими они должны быть?",
      "gemini-2.5-flash"
    );
    
    console.log("\n=== Ответ Суб-Агента (с учетом памяти) ===");
    console.log(result);
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

testMemoryDelegation();
