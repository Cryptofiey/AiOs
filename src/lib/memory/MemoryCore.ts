import { WorkspaceAgent } from '../workspace-integration/WorkspaceAgent.js';
import { db } from '../../db/index.js';
import { memories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * MemoryCore Singleton
 * 
 * Central nervous system for Agent OS memory management.
 * Discards human-readable representations in favor of machine-accessible JSON blobs.
 * 
 * Methodology:
 * - Google Keep: Ephemeral/Scratchpad memory for fast, mutable JSON state blobs.
 * - Cloud SQL (pgvector): Long-term associative and semantic memory.
 * - Google Drive: Cold storage for large datasets and binary artifacts.
 * - Google Tasks: Action/Execution queues (Kanban).
 * - Google Chat: Agent-to-Agent and Agent-to-Human async messaging buses.
 */
export class MemoryCore {
  private static instance: MemoryCore;
  private workspaceAgent: WorkspaceAgent | null = null;
  
  private constructor() {}

  public static getInstance(): MemoryCore {
    if (!MemoryCore.instance) {
      MemoryCore.instance = new MemoryCore();
    }
    return MemoryCore.instance;
  }

  /**
   * Initialize with an OAuth access token so the OS can operate on behalf of the user.
   */
  public initWorkspace(accessToken: string) {
    this.workspaceAgent = new WorkspaceAgent({ accessToken });
  }

  private getWorkspace() {
    if (!this.workspaceAgent) {
      throw new Error("[MemoryCore] WorkspaceAgent not initialized. Missing Auth Context.");
    }
    return this.workspaceAgent;
  }

  // ==========================================
  // L1 MEMORY: KEEP (FAST JSON SCRATCHPAD)
  // ==========================================
  
  /**
   * Dumps a raw machine-state blob to Google Keep.
   * Useful for checkpointing context before dropping a process.
   */
  public async dumpStateBlob(contextKey: string, payload: Record<string, any>) {
    const keep = this.getWorkspace();
    const dataString = JSON.stringify({
      __os_context: contextKey,
      timestamp: Date.now(),
      payload
    }, null, 2);
    
    return await keep.createNote(`[SYS_BLOB] ${contextKey}`, dataString);
  }

  /**
   * Retrieves all OS state blobs from Keep.
   */
  public async retrieveStateBlobs() {
    const keep = this.getWorkspace();
    const allNotes = await keep.listNotes();
    
    const blobs = allNotes
      // @ts-ignore
      .filter(n => n.title?.startsWith('[SYS_BLOB]'))
      .map(n => {
        try {
          // @ts-ignore
          return JSON.parse(n.body?.text?.text || '{}');
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
      
    return blobs;
  }

  // ==========================================
  // L2 MEMORY: SQL VECTOR STORE (SEMANTIC)
  // ==========================================
  
  public async persistSemanticMemory(userId: string, title: string, content: string, source: string = 'internal') {
    // In a full implementation, we would call the Gemini API here to generate a 768-d vector embedding
    // const embedding = await generateEmbedding(content);
    
    const result = await db.insert(memories).values({
      userId,
      title,
      content,
      source,
      // embedding: embedding
    }).returning();
    
    return result[0];
  }

  public async fetchSemanticMemories(userId: string) {
    return await db.select().from(memories).where(eq(memories.userId, userId));
  }

  // ==========================================
  // OS EVENT BUS: GOOGLE CHAT
  // ==========================================
  
  public async dispatchAgentMessage(spaceName: string, payload: any) {
    const chat = this.getWorkspace();
    const message = typeof payload === 'string' ? payload : `[AGENT_PAYLOAD]\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    return await chat.sendMessage(spaceName, message);
  }
}
