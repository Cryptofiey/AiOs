import { MemoryCore } from '../memory/MemoryCore.js';
import { ApiManager } from '../api-manager/ApiManager.js';
import { NotebookLMAgent } from '../memory-node/NotebookLMAgent.js';
import { AgentDelegator } from './AgentDelegator.js';

/**
 * OsKernel Singleton
 * 
 * Central nervous system and Kernel API of the Web Agent OS.
 * Exposes all internal OS services (Memory, Delegation, Key Management) 
 * via a single standard interface for both human-driven processes and autonomous agents.
 */
export class OsKernel {
  private static instance: OsKernel;
  
  public apiManager: ApiManager;
  public memoryCore: MemoryCore;
  public agentDelegator: AgentDelegator | null = null;
  public memoryNode: NotebookLMAgent | null = null;

  private constructor() {
    this.apiManager = ApiManager.getInstance();
    this.memoryCore = MemoryCore.getInstance();
    
    // Initialize LLM services if keys are present
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.memoryNode = new NotebookLMAgent(geminiKey);
    }
  }

  public static getInstance(): OsKernel {
    if (!OsKernel.instance) {
      OsKernel.instance = new OsKernel();
    }
    return OsKernel.instance;
  }

  /**
   * Bind delegator (prevents circular dependency if initiated in AgentDelegator)
   */
  public registerDelegator(delegator: AgentDelegator) {
    this.agentDelegator = delegator;
  }

  // ==========================================
  // OS CAPABILITY: STATE / CONTEXT MANAGEMENT
  // ==========================================

  /**
   * For Agent usage: Offloads internal processing context to long-term structured memory
   * to keep the active LLM context window clean.
   */
  public async flushContextToMemory(agentId: string, payload: any) {
    try {
      await this.memoryCore.dumpStateBlob(`AGENT_FLUSH_${agentId}`, payload);
      return true;
    } catch (error) {
      console.warn(`[OsKernel] Flush to memory failed. (Requires Google Auth)`, error);
      return false;
    }
  }

  /**
   * Retrieves previous semantic logs or states
   */
  public async loadContextFromMemory(contextKey: string) {
    try {
      const blobs = await this.memoryCore.retrieveStateBlobs();
      // Filter the blobs logically matching the key
      return blobs.filter(b => b.__os_context?.includes(contextKey));
    } catch (error) {
      return [];
    }
  }

  // ==========================================
  // OS CAPABILITY: AGENT ORCHESTRATION
  // ==========================================
  
  public async delegateTask(role: string, task: string, model?: string) {
    if (!this.agentDelegator) {
      throw new Error("[OsKernel] AgentDelegator is not registered.");
    }
    return await this.agentDelegator.delegateTask(role, task, model);
  }
}
