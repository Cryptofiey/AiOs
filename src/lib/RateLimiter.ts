export class RateLimiter {
  private requests: number[] = [];
  private readonly MAX_REQUESTS = 20;
  private readonly WINDOW_MS = 10000;
  private pauseUntil = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      const now = Date.now();
      
      if (now < this.pauseUntil) {
        await new Promise(r => setTimeout(r, this.pauseUntil - now));
        continue;
      }

      this.requests = this.requests.filter(t => now - t < this.WINDOW_MS);

      if (this.requests.length >= this.MAX_REQUESTS) {
        const waitTime = this.WINDOW_MS - (now - this.requests[0]);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      this.requests.push(Date.now());

      try {
        const result = await fn();
        return result;
      } catch (error: any) {
        console.error("[RateLimiter] API Error encountered:", error.message);
        throw error; // Let the caller handle it instead of infinite looping
      }
    }
  }
}

export const globalRateLimiter = new RateLimiter();
