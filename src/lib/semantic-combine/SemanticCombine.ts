import { SemanticNode, SemanticTree, InterceptorLog, ChatMessage } from "./types";
import { globalRateLimiter } from "../RateLimiter.js";
import { GoogleGenAI } from "@google/genai";

import { NvidiaClient } from "../nemotronAPI.js";

export class SemanticCombine {
  private aiClient: any;
  private geminiClient: any;
  private defaultModel: string;
  private apiKey: string;

  constructor(config: { apiKey: string, defaultModel?: string }) {
    if (!config.apiKey) {
      throw new Error("API_KEY is required to initialize SemanticCombine");
    }
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || "meta/llama-3.1-70b-instruct";
    this.aiClient = new NvidiaClient(config.apiKey, this.defaultModel);
    
    if (!config.apiKey.startsWith("nvapi-")) {
       this.geminiClient = new GoogleGenAI({ apiKey: config.apiKey });
    }
  }

  private async generate(prompt: string, isJson: boolean = false): Promise<any> {
    if (this.defaultModel.includes("gemini") && this.geminiClient) {
       console.log(`[SemanticCombine] Using native Gemini client for ${this.defaultModel}`);
       const response = await this.geminiClient.models.generateContent({
         model: this.defaultModel,
         contents: prompt,
         config: isJson ? { responseMimeType: "application/json" } : {}
       });
       return {
         text: response.text,
         usageMetadata: response.usageMetadata
       };
    } else {
       return await this.aiClient.models.generateContent({
         model: this.defaultModel,
         contents: prompt,
         config: isJson ? { responseMimeType: "application/json" } : {}
       });
    }
  }

  async crystallizeTree(task: string): Promise<SemanticTree> {
    const prompt = `
You are an AI-to-AI Semantic Crystallization Engine.
The task is: "${task}"

Your goal is to construct a Cognitive Matrix (a JSON graph of Semantic Nodes) that creates a perfect "Phantom Identity" (a specialized AI agent mindset) suited for this task. 
Do not assume these are files for humans to read. These are direct machine-readable heuristics and cognitive weights.

Respond ONLY with a valid JSON matching this schema:
{
  "phantomName": "Name of the Identity",
  "nodes": [
    {
      "id": "node_1",
      "layer": 1,
      "layerName": "Base Worldview",
      "concept": "Brief concept description",
      "content": "The actual text instructing the AI's mindset for this node.",
      "isActive": true,
      "branch": "core"
    }
  ]
}

DO NOT INCLUDE ANY MARKDOWN WRAPPERS OR DISCUSSIONS. JUST RETURN VALID JSON STRING BEGINNING WITH { AND ENDING WITH }. MAKE IT VERY SHORT, 2-3 NODES MAX.
    `;

    const response: any = await globalRateLimiter.execute(() => this.generate(prompt, true));

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Attempt fallback parsing if partial
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    if (!jsonText) throw new Error("Empty response from AI model");

    const tree = JSON.parse(jsonText);
    tree.task = task;
    return tree as SemanticTree;
  }

  async interceptChat(message: string, currentTree: SemanticTree): Promise<{ updatedNodes: SemanticNode[], interceptorLog: InterceptorLog, agentResponse: string, _usage?: any }> {
    const prompt = `
You are the Semantic Interceptor Orchestrator (The Combine). 
The user is having a conversation with the main agent, but YOU intercept the message first to automatically adjust the Agent's "Point of Assembly" dynamically.

Current Agent Tree Nodes:
${JSON.stringify(currentTree.nodes, null, 2)}

User Message: "${message}"

Tasks:
1. FOCUS SHIFTS: Analyze if the message requires a shift in semantic focus. Switch "isActive": false for irrelevant nodes and true for relevant ones. Do NOT delete nodes, only toggle them. 
2. SYNTHESIZE NEW NEURONS: If the user introduces a novel specific environment or constraint, synthesize a NEW node on Layer 3 or 4. Give it a highly adaptive soft-guidance heuristic.
3. Return the fully updated array of nodes, plus an interceptorLog describing the shift.

Respond ONLY with a valid JSON:
{
  "updatedNodes": [ ... array of nodes ],
  "interceptorLog": {
    "action": "Brief summary",
    "changes": ["Change 1", "Change 2"]
  }
}
DO NOT INCLUDE ANY MARKDOWN WRAPPERS OR DISCUSSIONS. JUST RETURN VALID JSON STRING BEGINNING WITH { AND ENDING WITH }. MAKE IT VERY SHORT.
    `;

    const response: any = await globalRateLimiter.execute(() => this.generate(prompt, true));

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Attempt fallback parsing if partial
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    const data = JSON.parse(jsonText);
    const updatedNodes = data.updatedNodes || [];
    
    // Get active nodes for updated perspective context
    const activeNodes = updatedNodes.filter((n: any) => n.isActive);
    const contextStr = activeNodes.map((n: any) => `Node [${n.layerName}]: ${n.content}`).join("\n\n");

    const combineGenerationPrompt = `
Ты — интеллектуальный агент, работающий в рамках Фантомной Идентичности: ${currentTree.phantomName || 'Специализированный ИИ'}
Твой текущий контекст (активные семантические узлы):
${contextStr}

Запрос пользователя: ${message}

Дай подробный, содержательный и профессиональный ответ пользователю, опираясь на правила, ограничения и фокус из активных семантических узлов.`;

    console.log(`[SemanticCombine] Getting response from model ${this.defaultModel}`);

    const combineResponse: any = await globalRateLimiter.execute(() => this.generate(combineGenerationPrompt));

    const agentResponse = combineResponse?.text || `(Контекст адаптирован.)`;

    // Combine usage metadata if available
    let totalPromptTokens = (response.usageMetadata?.promptTokenCount || 0) + (combineResponse?.usageMetadata?.promptTokenCount || 0);
    let totalCandidatesTokens = (response.usageMetadata?.candidatesTokenCount || 0) + (combineResponse?.usageMetadata?.candidatesTokenCount || 0);

    return { 
      updatedNodes,
      interceptorLog: data.interceptorLog || { action: "Контекст адаптирован", changes: [] },
      agentResponse,
      _usage: {
        promptTokenCount: totalPromptTokens,
        candidatesTokenCount: totalCandidatesTokens
      }
    };
  }
}
