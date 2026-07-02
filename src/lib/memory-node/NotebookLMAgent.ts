import { GoogleGenAI } from "@google/genai";

export interface MemoryDocument {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export class NotebookLMAgent {
  private aiClient: GoogleGenAI;
  private model: string;
  private documents: MemoryDocument[] = [];

  constructor(apiKey: string, model: string = "gemini-2.5-flash") {
    if (!apiKey) {
      throw new Error("NotebookLMAgent требует API ключ.");
    }
    this.aiClient = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  /**
   * Добавление "исторического мусора" или контекста в память.
   * Выступает аналогом загрузки документов в Notebook LM.
   */
  public addDocument(title: string, content: string): MemoryDocument {
    const doc: MemoryDocument = {
      id: crypto.randomUUID(),
      title,
      content,
      timestamp: Date.now(),
    };
    this.documents.push(doc);
    console.log(`[NotebookLMAgent] Документ сохранен: ${title} (${content.length} символов)`);
    return doc;
  }

  public getDocuments(): MemoryDocument[] {
    return this.documents;
  }

  /**
   * Запрос к Летописцу. 
   * @param prompt - Запрос агента или системы.
   * @param asRawContext - Если true, Летописец возвращает "голые данные" (AI to AI), без LLM обертки.
   */
  public async query(prompt: string, asRawContext: boolean = false): Promise<string> {
    if (this.documents.length === 0) {
      return "[MEMORY_EMPTY]";
    }

    // Собираем весь исторический контекст (позже здесь будет RAG / векторный поиск через Qdrant)
    const contextStr = this.documents
      .map(doc => `--- DOC_ID: ${doc.id} | TITLE: ${doc.title} ---\n${doc.content}`)
      .join("\n\n");

    if (asRawContext) {
       // AI to AI подход: быстрая отгрузка без траты токенов на генерацию
       // Возвращаем данные напрямую для инъекции в системный промпт другого агента.
       return `[MEMORY_DUMP_START]\n${contextStr}\n[MEMORY_DUMP_END]`;
    }

    const systemPrompt = `
Ты — Летописец (NotebookLM Memory Agent) внутри Web Agent OS.
Твоя задача — хранить исторический контекст и выдавать точные ответы на основе загруженных документов.

[КОНТЕКСТ ПАМЯТИ]:
${contextStr}

[ЗАПРОС]: ${prompt}

Отвечай СТРОГО на основе предоставленного контекста. Избегай человеческих приветствий, выдавай сухой и точный результат для других агентов.
    `;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.model,
        contents: systemPrompt
      });
      return response.text || "[MEMORY_ERROR: Пустой ответ]";
    } catch (error) {
      console.error("[NotebookLMAgent] Ошибка запроса к LLM:", error);
      return `[MEMORY_ERROR: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  public clearMemory() {
    this.documents = [];
    console.log("[NotebookLMAgent] Память очищена.");
  }
}
