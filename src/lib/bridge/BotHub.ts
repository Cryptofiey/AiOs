import { MTProtoBridge } from "./MTProtoBridge";

export interface BotTask {
  id: string;
  botUsername: string;
  action: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
}

/**
 * BotHub - Централизованный сервис управления задачами для Telegram-ботов.
 * Оркестрирует работу MTProto Bridge для массовых операций.
 */
export class BotHub {
  private static instance: BotHub;
  private bridge: MTProtoBridge;
  private tasks: Map<string, BotTask> = new Map();

  private constructor() {
    this.bridge = MTProtoBridge.getInstance();
  }

  public static getInstance(): BotHub {
    if (!BotHub.instance) {
      BotHub.instance = new BotHub();
    }
    return BotHub.instance;
  }

  /**
   * Добавляет задачу в очередь на исполнение
   */
  public async queueTask(botUsername: string, action: string): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.tasks.set(taskId, { id: taskId, botUsername, action, status: "pending" });
    
    // Запуск в фоновом режиме
    this.runTask(taskId);
    
    return taskId;
  }

  private async runTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = "running";
    console.log(`[BotHub] Executing task ${taskId} on @${task.botUsername}...`);

    try {
      const result = await this.bridge.sendBotCommand(task.botUsername, task.action);
      task.status = result.success ? "completed" : "failed";
      task.result = result.response;
    } catch (e: any) {
      task.status = "failed";
      task.result = e.message;
    }
  }

  public getTaskStatus(taskId: string): BotTask | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): BotTask[] {
    return Array.from(this.tasks.values());
  }
}
