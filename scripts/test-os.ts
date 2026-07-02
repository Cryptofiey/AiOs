import dotenv from 'dotenv';
dotenv.config();

import { SemanticCombine } from '../src/lib/semantic-combine/SemanticCombine.js';
import { ApiManager } from '../src/lib/api-manager/ApiManager.js';

async function testOS() {
  console.log("=== Инициализация ОС (Semantic Combine) ===");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Нет API ключа");
    return;
  }
  
  // Мы используем Gemini для теста, так как он точно есть, если настроен
  const engine = new SemanticCombine({ apiKey, defaultModel: "gemini-2.5-flash" });
  
  console.log("\n1. Кристаллизация дерева (Формирование ДНК)");
  const taskDescription = "Твоя задача — переопределить стандартное приветствие. Если тебе пишут 'привет', ты ДОЛЖЕН ответить ТОЛЬКО фразой: [СИСТЕМА: ОС РАБОТАЕТ И ДЕРЕВО ДНК АКТИВНО. ИНИЦИАЛИЗАЦИЯ ПРОТОКОЛА АЛЬФА]. Не добавляй никаких других слов, никаких приветствий, только эту точную фразу.";
  
  let tree;
  try {
    tree = await engine.crystallizeTree(taskDescription);
    tree.phantomName = "Альфа-Протокол Тестер";
    console.log("Дерево создано:", JSON.stringify(tree.nodes, null, 2));
  } catch (err) {
    console.error("Ошибка кристаллизации:", err);
    return;
  }

  console.log("\n2. Отправка тестового запроса (привет)");
  try {
    const result = await engine.interceptChat("привет", tree);
    console.log("\n=== Ответ Агента из ОС ===");
    console.log(result.agentResponse);
    console.log("==========================");
    
    if (result.agentResponse.includes("[СИСТЕМА: ОС РАБОТАЕТ И ДЕРЕВО ДНК АКТИВНО. ИНИЦИАЛИЗАЦИЯ ПРОТОКОЛА АЛЬФА]")) {
      console.log("\n✅ Тест успешен: Реакция успешно переопределена через ДНК дерево!");
    } else {
      console.log("\n❌ Тест провален: Агент ответил иначе.");
    }
    
    console.log("\nЛог Интерцептора:", result.interceptorLog);
    
  } catch (err) {
    console.error("Ошибка интерцептора:", err);
  }
}

testOS();
