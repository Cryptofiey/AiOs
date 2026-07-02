import dotenv from 'dotenv';
dotenv.config();

import { NotebookLMAgent } from '../src/lib/memory-node/NotebookLMAgent.js';

async function testMemoryNode() {
  console.log("=== Инициализация Летописца (NotebookLMAgent) ===");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Нет API ключа GEMINI_API_KEY");
    return;
  }
  
  const memoryAgent = new NotebookLMAgent(apiKey);
  
  console.log("\n1. Загрузка исторического контекста...");
  memoryAgent.addDocument(
    "Architecture Concept v1", 
    "Web Agent OS использует ДНК дерево для переключения контекстов агентов. ДНК дерево должно передаваться в JSON формате."
  );
  memoryAgent.addDocument(
    "Meeting Notes", 
    "Философия No Man Include подразумевает, что ИИ общается с ИИ без вежливости, передавая чистые данные."
  );
  
  console.log("\n2. AI to AI запрос (получение голого контекста)");
  const rawContext = await memoryAgent.query("дай все", true);
  console.log(rawContext);
  
  console.log("\n3. Аналитический запрос к Летописцу (Синтез знаний)");
  const synthesis = await memoryAgent.query("Как Web Agent OS использует ДНК дерево и как должны общаться агенты согласно философии?");
  console.log("\nОтвет Летописца:");
  console.log(synthesis);
}

testMemoryNode();
