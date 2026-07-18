import { GoogleGenAI } from "@google/genai";
import { AgentBrowserService } from "./AgentBrowserService";
import { MTProtoBridge } from "../bridge/MTProtoBridge";

export interface WebBrowsingResult {
  success: boolean;
  logs: string[];
  lastAction?: string;
  error?: string;
}

/**
 * WebBrowsingAgent - Advanced agent for interacting with Telegram Web Apps and other websites.
 * It uses @vercel/agent-browser for high-fidelity interaction and Gemini for visual/semantic reasoning.
 */
export class WebBrowsingAgent {
  private static instance: WebBrowsingAgent;
  private browser: AgentBrowserService;
  private bridge: MTProtoBridge;

  private constructor() {
    this.browser = AgentBrowserService.getInstance();
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): WebBrowsingAgent {
    if (!WebBrowsingAgent.instance) {
      WebBrowsingAgent.instance = new WebBrowsingAgent();
    }
    return WebBrowsingAgent.instance;
  }

  /**
   * Navigates to a Telegram WebApp and performs a specific goal.
   */
  public async navigateAndExecute(botUsername: string, targetUrl: string, goal: string): Promise<WebBrowsingResult> {
    const logs: string[] = [];
    logs.push(`[WebBrowsingAgent] Initializing session for @${botUsername}`);

    try {
      // 1. Get the authenticated WebApp URL
      logs.push(`[Bridge] Requesting auth URL for ${targetUrl}...`);
      const webAppUrl = await this.bridge.getWebAppUrl(botUsername, targetUrl);
      if (!webAppUrl) {
        throw new Error("Failed to retrieve authenticated WebApp URL from Telegram.");
      }
      logs.push(`[Bridge] URL obtained successfully.`);

      // 2. Open the browser
      logs.push(`[Browser] Navigating to target...`);
      await this.browser.execute([`open "${webAppUrl}"`, `wait 8000`]); // Longer wait for heavy apps

      // 3. Iterative reasoning loop (max 5 steps)
      let currentStep = 0;
      const maxSteps = 5;
      let lastAction = "";

      while (currentStep < maxSteps) {
        logs.push(`[AI] Step ${currentStep + 1}: Analyzing state...`);
        const snapshot = await this.browser.getSnapshot(true);
        
        if (snapshot.error) {
          throw new Error(`Snapshot error: ${snapshot.error}`);
        }

        const action = await this.decideNextAction(snapshot.snapshot, goal, logs);
        lastAction = action;

        if (action === "DONE" || action.includes("DONE")) {
          logs.push(`[Agent] Goal achieved: ${goal}`);
          return { success: true, logs, lastAction };
        }

        if (action === "NONE" || action === "ERROR") {
          throw new Error("AI could not determine next action or encountered an error.");
        }

        logs.push(`[Browser] Executing: ${action}`);
        const result = await this.browser.execute([action, `wait 3000`]);
        
        if (!result.success) {
          logs.push(`[Browser] Warning: Command failed - ${result.error}`);
        }

        currentStep++;
      }

      throw new Error(`Exceeded maximum steps (${maxSteps}) without reaching goal.`);

    } catch (error: any) {
      logs.push(`[Error] ${error.message}`);
      return { success: false, logs, error: error.message };
    }
  }

  private async decideNextAction(snapshotText: string, goal: string, logs: string[]): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenAI({ apiKey: geminiKey });
    const model = (genAI as any).getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a Web Browsing Agent. Your objective is: "${goal}"
      
      CURRENT PAGE STATE (Accessibility Tree):
      ${snapshotText}
      
      RULES:
      1. Respond ONLY with an agent-browser CLI command (e.g., "click @e5", "fill @e2 'value'").
      2. If the goal is achieved, respond with "DONE".
      3. If you are stuck or cannot find the elements, respond with "ERROR".
      4. Do not provide explanations. Just the command or DONE/ERROR.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/```/g, "");
      return text;
    } catch (e: any) {
      logs.push(`[AI] Error during decision: ${e.message}`);
      return "ERROR";
    }
  }
}
