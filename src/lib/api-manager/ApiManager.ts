// Менеджер API ключей для ОС
// Управляет доступом к внешним ключам (Gemini, GitHub, NVidia)
// В будущем будет интегрирован с зашифрованным IndexedDB хранилищем

export class ApiManager {
  private static instance: ApiManager;
  private keys: Map<string, string> = new Map();

  private constructor() {
    // Инициализация базовыми ключами из .env (server-side context)
    // На клиенте ключи могут быть запрошены у пользователя и сохранены в память
    if (process.env.GEMINI_API_KEY) this.keys.set('gemini', process.env.GEMINI_API_KEY);
    if (process.env.GITHUB_TOKEN) this.keys.set('github', process.env.GITHUB_TOKEN);
    const nKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY_2;
    if (nKey) this.keys.set('nvidia', nKey);
  }

  public static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  public setKey(provider: 'gemini' | 'github' | 'nvidia' | string, key: string): void {
    if (!key) return;
    this.keys.set(provider, key);
  }

  public getKey(provider: string): string | undefined {
    return this.keys.get(provider);
  }

  public hasKey(provider: string): boolean {
    return this.keys.has(provider);
  }

  public requireKey(provider: string): string {
    const key = this.keys.get(provider);
    if (!key) {
      throw new Error(`[ApiManager] Отсутствует обязательный API ключ для провайдера: ${provider}. Пожалуйста, добавьте его.`);
    }
    return key;
  }
}
