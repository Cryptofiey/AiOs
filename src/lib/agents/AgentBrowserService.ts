import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export interface BrowserActionResult {
  success: boolean;
  output: string;
  error?: string;
  screenshot?: string; // base64 if requested
}

/**
 * AgentBrowserService - Wrapper for npx agent-browser CLI.
 * Provides high-level methods for browser automation.
 */
export class AgentBrowserService {
  private static instance: AgentBrowserService;
  private sessionName: string = "default";

  private constructor() {}

  public static getInstance(): AgentBrowserService {
    if (!AgentBrowserService.instance) {
      AgentBrowserService.instance = new AgentBrowserService();
    }
    return AgentBrowserService.instance;
  }

  public setSession(name: string) {
    this.sessionName = name;
  }

  /**
   * Executes a series of agent-browser commands.
   */
  public async execute(commands: string[]): Promise<BrowserActionResult> {
    const fullCommand = commands
      .map(cmd => `npx agent-browser ${cmd}`)
      .join(" && ");

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        env: {
          ...process.env,
          AGENT_BROWSER_SESSION: this.sessionName,
          // Add any other necessary env vars here
        }
      });

      return {
        success: true,
        output: stdout,
        error: stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || "",
        error: error.stderr || error.message
      };
    }
  }

  /**
   * Opens a URL and performs a basic action.
   */
  public async openAndAction(url: string, action: string): Promise<BrowserActionResult> {
     // Example: action = "click '@e5'"
     return this.execute([
       `open "${url}"`,
       action
     ]);
  }

  /**
   * Gets a snapshot of the current page.
   */
  public async getSnapshot(interactiveOnly: boolean = true): Promise<any> {
    const cmd = interactiveOnly ? "snapshot --json -i" : "snapshot --json";
    const result = await this.execute([cmd]);
    if (result.success) {
      try {
        return JSON.parse(result.output);
      } catch (e) {
        return { error: "Failed to parse snapshot JSON", raw: result.output };
      }
    }
    return { error: result.error };
  }
}
