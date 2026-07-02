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
  private connections: Map<string, WebSocket | any> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Unified data sources configuration
  private readonly SOURCES = [
    { name: "Fragment", url: "wss://fragment.com/ws/ticks" },
    { name: "MRKT", url: "wss://mrkt.ton/ws/feed" },
    { name: "Tonapi", url: "wss://tonapi.io/v2/websocket" },
    { name: "MTProto Bridge", url: "wss://mtproto-bridge.local/ws" }
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
  private establishConnection(name: string, url: string): void {
    if (this.connections.has(name)) return;

    console.log(`[WS-Manager] Connecting to ${name} [${url}]...`);

    // In a browser environment we use standard WebSocket
    // In a server/sandbox environment we might need a library, but assuming web context or mockable interface
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WS-Manager] ${name} connection established.`);
        if (this.reconnectIntervals.has(name)) {
          clearInterval(this.reconnectIntervals.get(name)!);
          this.reconnectIntervals.delete(name);
        }
      };

      ws.onmessage = (event) => {
        const rawData = JSON.parse(event.data);
        const normalizedTick = this.normalizeData(name, rawData);
        if (normalizedTick) {
          this.hub.pushTick(normalizedTick);
        }
      };

      ws.onclose = () => {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        this.connections.delete(name);
        
        // Attempt to reconnect
        if (!this.reconnectIntervals.has(name)) {
          console.warn(`[WS-Manager] ${name} connection closed. Attempting reconnect in 5s...`);
          this.reconnectIntervals.set(name, setInterval(() => this.establishConnection(name, url), 5000));
        }
      };

      ws.onerror = () => {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        this.connections.delete(name);

        try {
          if (ws && typeof ws.close === "function" && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
          }
        } catch (e) {
          console.warn(`[WS-Manager] Safe close ignored for ${name}:`, e);
        }
      };

      this.connections.set(name, ws);
    } catch (e) {
      console.log(`[WS-Manager] ${name} socket initialization failed.`);
    }
  }

  /**
   * Translates source-specific raw data into the MarketHub normalized schema
   */
  private normalizeData(source: string, raw: any): NormalizedOrder | null {
    // Example transformation logic based on source format
    try {
      return {
        id: raw.id || `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        price: Number(raw.price || raw.amount || 0),
        currency: raw.currency === "USD" ? "USD" : "TON",
        source: source,
        type: raw.side === "sell" || raw.type === "ASK" ? "ASK" : "BID",
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
    this.connections.forEach(ws => ws.close());
    this.reconnectIntervals.forEach(interval => clearInterval(interval));
    this.connections.clear();
    this.reconnectIntervals.clear();
  }
}
