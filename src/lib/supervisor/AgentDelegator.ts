import { SemanticCombine } from '../semantic-combine/SemanticCombine.js';
import { ApiManager } from '../api-manager/ApiManager.js';
import { OsKernel } from './OsKernel.js';
import { NotebookLMAgent } from '../memory-node/NotebookLMAgent.js';

export interface SubAgentContext {
  id: string;
  phantomName: string;
  taskDescription: string;
  status: 'pending' | 'running' | 'evaluating' | 'completed' | 'failed';
  engine: SemanticCombine;
  tree: any;
  result?: string;
  logs: string[];
}

/**
 * AgentDelegator (Супервизор)
 * Отвечает за создание суб-агентов через Sema Soul Combine, 
 * постановку им задач, мониторинг выполнения и оценку результатов.
 */
export class AgentDelegator {
  private activeAgents: Map<string, SubAgentContext> = new Map();
  private kernel: OsKernel;
  private maxConcurrent: number = 5;
  private currentRunning: number = 0;
  private taskQueue: Array<() => Promise<void>> = [];

  constructor() {
    this.kernel = OsKernel.getInstance();
    this.kernel.registerDelegator(this);
  }

  public getMemoryNode(): NotebookLMAgent | null {
    return this.kernel.memoryNode;
  }

  private log(agentId: string, message: string) {
    const context = this.activeAgents.get(agentId);
    if (context) {
      context.logs.push(`[${new Date().toISOString()}] ${message}`);
    }
    console.log(`[Supervisor -> ${agentId}] ${message}`);
  }

  private async processQueue() {
    if (this.currentRunning >= this.maxConcurrent || this.taskQueue.length === 0) {
      return;
    }
    
    this.currentRunning++;
    const task = this.taskQueue.shift();
    if (task) {
      try {
        await task();
      } finally {
        this.currentRunning--;
        this.processQueue(); // Запускаем следующего в очереди
      }
    } else {
      this.currentRunning--;
    }
  }

  /**
   * Делегирует задачу новому суб-агенту (До 5 одновременно в Рое)
   */
  public async delegateTask(
    phantomRole: string, 
    taskDescription: string, 
    model: string = 'meta/llama-3.1-70b-instruct'
  ): Promise<string> {
    const apiKey = model.includes('gemini') ? this.kernel.apiManager.requireKey('gemini') : this.kernel.apiManager.requireKey('nvidia');
    const agentId = `agent_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 1. Инициализация контекста
    const engine = new SemanticCombine({ apiKey, defaultModel: model });
    const context: SubAgentContext = {
      id: agentId,
      phantomName: phantomRole,
      taskDescription,
      status: 'pending',
      engine,
      tree: null,
      logs: []
    };
    
    this.activeAgents.set(agentId, context);
    this.log(agentId, `Spawning sub-agent [${phantomRole}] for task: ${taskDescription}`);

    return new Promise((resolve, reject) => {
      const executeTask = async () => {
        let isTimeout = false;
        const fallbackTimeoutId = setTimeout(() => {
          isTimeout = true;
          this.log(agentId, `ERROR: Task execution timed out after 120 seconds.`);
          context.status = 'failed';
          reject(new Error(`[Supervisor] Agent ${phantomRole} failed due to timeout.`));
        }, 120000); // 120 seconds safety timeout

        try {
          // 2. Кристаллизация Дерева (создание личности и рабочих фреймов агента)
          context.status = 'running';
          this.log(agentId, `Fetching context from MemoryNode...`);
          
          let memoryContext = "[MEMORY_EMPTY]";
          if (this.kernel.memoryNode) {
             memoryContext = await this.kernel.memoryNode.query(`Запрос контекста для агента: ${phantomRole}. Задача: ${taskDescription}`, true);
          }
          
          const fullTaskInstruction = `[ИСТОРИЧЕСКАЯ ПАМЯТЬ ПРОЕКТА]:\n${memoryContext}\n\n[СИСТЕМНАЯ ЗАДАЧА]:\nТы — ${phantomRole}. Тебе поручена задача: ${taskDescription}`;

          this.log(agentId, `Crystallizing semantic tree...`);
          
          const tree = await engine.crystallizeTree(fullTaskInstruction);
          if (isTimeout) return;
          
          tree.phantomName = phantomRole;
          context.tree = tree;

          // 3. Выполнение задачи (первый цикл)
          this.log(agentId, `Intercepting task execution...`);
          let interceptResult = await engine.interceptChat(fullTaskInstruction, tree);
          if (isTimeout) return;
          
          // 4. Оффлоад внутреннего состояния агента в долгосрочную память ОС (Keep/Drive), чтобы разгрузить контекст (No Man Included)
          await this.kernel.flushContextToMemory(agentId, {
            phantomName: phantomRole,
            taskDescription,
            rawTree: tree,
            intermediateResult: interceptResult
          });
          
          // 5. Супервизия и Оценка (Оценка качества результата)
          context.status = 'evaluating';
          let finalResult = interceptResult.agentResponse;
          let isSatisfactory = await this.evaluateResult(taskDescription, finalResult);
          if (isTimeout) return;
          
          if (!isSatisfactory) {
            this.log(agentId, `Result did not pass evaluation. Requesting revision...`);
            const revisionPrompt = "Результат слишком короткий или не покрывает все требования задачи. Пожалуйста, проведи более глубокий анализ и предоставь развернутый ответ.";
            const revision = await engine.interceptChat(revisionPrompt, tree);
            if (isTimeout) return;
            finalResult = revision.agentResponse;
          } else {
            this.log(agentId, `Result approved by supervisor.`);
          }

          clearTimeout(fallbackTimeoutId);
          if (!isTimeout) {
            context.result = finalResult;
            context.status = 'completed';
            
            // Финальный коммит состояния агента
            await this.kernel.flushContextToMemory(agentId, { finalResult });
            
            resolve(context.result);
          }

        } catch (error: any) {
          clearTimeout(fallbackTimeoutId);
          if (!isTimeout) {
            context.status = 'failed';
            this.log(agentId, `Task failed: ${error?.message || error}`);
            reject(new Error(`[Supervisor] Agent ${phantomRole} failed: ${error}`));
          }
        }
      };

      this.taskQueue.push(executeTask);
      this.processQueue();
    });
  }

  /**
   * Оценка качества работы суб-агента.
   * В полноценной ОС здесь будет вызван LLM-судья.
   */
  private async evaluateResult(taskDescription: string, result: string): Promise<boolean> {
    // Временная эвристика супервизора:
    if (!result || result.trim().length < 50) return false;
    
    // TODO: Интеграция с Nemotron / отдельным Critic Agent для проверки кода/текста
    return true;
  }

  public getAgentStatus(agentId: string): SubAgentContext | undefined {
    return this.activeAgents.get(agentId);
  }
  
  public getAllAgents(): SubAgentContext[] {
    return Array.from(this.activeAgents.values());
  }
}
