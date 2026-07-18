import { MarketHub } from "./MarketHub";
import { NormalizedOrder } from "../../types/market";

/**
 * WebSocketManager
 * Unified service for establishing and maintaining persistent WebSocket connections
 * to multiple market data providers (Fragment, MRKT, Tonapi, MtProto).
 * 
 * Handles automatic reconnections and normalization of raw tick data.
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private hub: MarketHub;
  private connections: Map<string, any> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Unified data sources configuration
  private readonly SOURCES = [
    // Tonapi strictly requires a token.
    ...(process.env.TONAPI_TOKEN ? [{ name: "Tonapi", url: `wss://tonapi.io/v2/websocket?token=${process.env.TONAPI_TOKEN}` }] : []),
    
    // Placeholder for other production-ready WS sources if any
  ];

  private constructor() {
    this.hub = MarketHub.getInstance();
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Starts all configured connections
   */
  public connectAll(): void {
    console.log("[WS-Manager] Initializing global WebSocket cluster...");
    this.SOURCES.forEach(source => this.establishConnection(source.name, source.url));
  }

  /**
   * Establishes a connection to a specific source with auto-reconnect logic
   */
  private async establishConnection(name: string, url: string): Promise<void> {
    if (this.connections.has(name)) return;

    console.log(`[WS-Manager] Connecting to ${name} [${url}]...`);

    try {
      let ws: any;
      if (typeof window === "undefined") {
        // Server side
        const { default: WS } = await import("ws");
        ws = new WS(url);
      } else {
        // Client side
        ws = new WebSocket(url);
      }

      ws.onopen = () => {
        console.log(`[WS-Manager] ${name} connection established.`);
        const interval = this.reconnectIntervals.get(name);
        if (interval) {
          clearInterval(interval);
          this.reconnectIntervals.delete(name);
        }
      };

      ws.onmessage = (event: any) => {
        try {
          const data = typeof event.data === "string" ? event.data : event.data.toString();
          const rawData = JSON.parse(data);
          const normalizedTick = this.normalizeData(name, rawData);
          if (normalizedTick) {
            this.hub.pushTick(normalizedTick);
          }
        } catch (e) {
          // Ignore parse errors from heartbeat or malformed messages
        }
      };

      const handleClose = () => {
        if (this.connections.get(name) === ws) {
          this.connections.delete(name);
        }
        
        // Attempt to reconnect
        if (!this.reconnectIntervals.has(name)) {
          console.warn(`[WS-Manager] ${name} connection closed. Attempting reconnect in 5s...`);
          this.reconnectIntervals.set(name, setInterval(() => this.establishConnection(name, url), 5000));
        }
      };

      if (typeof window === "undefined") {
        ws.on("close", handleClose);
        ws.on("error", (err: any) => {
          console.warn(`[WS-Manager] ${name} error:`, err.message);
          ws.terminate();
          handleClose();
        });
      } else {
        ws.onclose = handleClose;
        ws.onerror = handleClose;
      }

      this.connections.set(name, ws);
    } catch (e: any) {
      console.log(`[WS-Manager] ${name} socket initialization failed: ${e.message}`);
    }
  }

  /**
   * Translates source-specific raw data into the MarketHub normalized schema
   */
  private normalizeData(source: string, raw: any): NormalizedOrder | null {
    // Example transformation logic based on source format
    try {
      return {
        id: raw.id || `${source.toLowerCase()}_${(raw.item || raw.name || "item").toLowerCase().replace(/\s+/g, "_")}_${raw.price}_${raw.serial || "0"}`,
        price: Number(raw.price || raw.amount || 0),
        currency: raw.currency === "USD" ? "USD" : "TON",
        source: source,
        type: raw.side === "sell" || raw.type === "ASK" ? "ASK" : "BID",
        category: "MARKET",
        timestamp: new Date().toISOString(),
        metadata: {
          itemName: raw.item || raw.name || "Common Gift",
          serial: raw.serial || undefined,
          isStar: !!raw.is_star,
          platformFee: raw.fee || 0
        }
      };
    } catch (e) {
      console.error(`[WS-Manager] Normalization failed for ${source}:`, e);
      return null;
    }
  }

  public disconnectAll(): void {
    this.connections.forEach(ws => {
      try {
        if (typeof ws.terminate === "function") ws.terminate();
        else if (typeof ws.close === "function") ws.close();
      } catch (e) {}
    });
    this.reconnectIntervals.forEach(interval => clearInterval(interval));
    this.connections.clear();
    this.reconnectIntervals.clear();
  }
}
