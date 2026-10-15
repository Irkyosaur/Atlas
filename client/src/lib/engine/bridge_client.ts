// Location: atlas/client/src/lib/engine/bridge_client.ts
// Task 4.4.2: Atlas Native Client Bridge WebSocket Client (`ws://127.0.0.1:8999`)
// Interfaces with EDill/EdEzCheese companion stream to auto-inject nav targets and detect high-wake jumps

export interface BridgeTelemetryMessage {
  topic?: string;
  channel?: string;
  payload?: any;
  current_system?: string;
  route_destination?: string;
  jumps_remaining?: number;
  event?: string;
  [key: string]: any;
}

export type BridgeListener = (msg: BridgeTelemetryMessage) => void;

class BridgeClient {
  private ws: WebSocket | null = null;
  private url = 'ws://127.0.0.1:8999';
  private isConnected = false;
  private reconnectTimer: any = null;
  private listeners: Set<BridgeListener> = new Set();
  private lastTargetSystem: string | null = null;

  constructor() {
    // Lazy connect on client runtime
  }

  public connect(customUrl?: string) {
    if (typeof window === 'undefined') return;
    if (customUrl) this.url = customUrl;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Subscribe to Navigation telemetry topic
        this.send({
          type: 'subscribe',
          topics: ['Navigation', 'ShipVitals', 'Carrier'],
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          // ignore non-json frames
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  public subscribe(listener: BridgeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(data: BridgeTelemetryMessage) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('Bridge listener error:', e);
      }
    }
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Task 4.4.2: Injects navigation waypoint target into native game client / Windows clipboard
   */
  public injectNavTarget(systemName: string): boolean {
    this.lastTargetSystem = systemName;
    const packet = {
      jsonrpc: '2.0',
      method: 'nav_inject_target',
      params: {
        system_name: systemName,
        timestamp: Date.now(),
      },
      id: Date.now(),
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
      return true;
    }
    return false;
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getLastTarget(): string | null {
    return this.lastTargetSystem;
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const bridgeClient = new BridgeClient();
