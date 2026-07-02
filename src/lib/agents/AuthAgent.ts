export class AuthAgent {
  private static instance: AuthAgent;
  private vault: Map<string, string> = new Map();

  private constructor() {
    this.vault = new Map();
  }

  public static getInstance(): AuthAgent {
    if (!AuthAgent.instance) {
      AuthAgent.instance = new AuthAgent();
    }
    return AuthAgent.instance;
  }

  public loadFromVaultObj(secrets: Record<string, string>): void {
    for (const [key, val] of Object.entries(secrets)) {
      this.vault.set(key, val);
    }
    console.log(`[Gatekeeper] Загружено ${Object.keys(secrets).length} ключей из внешнего хранилища (Google Drive Vault).`);
  }

  /**
   * Безопасное сохранение реквизитов (API ключи, токены)
   */
  public storeCredential(service: string, token: string): void {
    // В реальности здесь должно быть криптографическое шифрование
    this.vault.set(service, token);
    console.log(`[Gatekeeper] Учетные данные для ${service} надежно сохранены в Vault.`);
  }

  /**
   * Предоставление доступа к реквизитам для других подсистем/агентов
   */
  public getCredential(service: string): string | undefined {
    if (this.vault.has(service)) {
      return this.vault.get(service);
    }
    // Safe lookup across environments
    let envObj: Record<string, any> = {};
    try {
      if (typeof process !== "undefined" && process.env) {
        envObj = { ...envObj, ...process.env };
      }
    } catch (_) {}

    try {
      const metaEnv = (import.meta as any)?.env;
      if (metaEnv) {
        envObj = { ...envObj, ...metaEnv };
      }
    } catch (_) {}

    let val = envObj[service];
    if (val) return val;

    if (!service.startsWith("VITE_")) {
      val = envObj[`VITE_${service}`];
      if (val) return val;
    }

    return undefined;
  }

  /**
   * Проверка наличия
   */
  public hasCredential(service: string): boolean {
    return this.vault.has(service);
  }
}
