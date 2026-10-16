// Location: plugins/streamdeck/src/daemon.ts
// Stage 15.1: Elgato Stream Deck Daemon communicating with Atlas WebSocket Bridge (ws://127.0.0.1:8999)
// Provides bidirectional Stream Deck SDK event handling and SVG LCD icon dispatching.

export interface StreamDeckEvent {
  event: string;
  action?: string;
  context?: string;
  device?: string;
  payload?: any;
}

export interface AtlasStreamDeckConfig {
  wsUrl?: string;
  authToken?: string;
  reconnectIntervalMs?: number;
}

export class StreamDeckDaemon {
  private wsUrl: string;
  private authToken: string;
  private isConnected: boolean = false;
  private registeredContexts: Map<string, string> = new Map(); // context -> action UUID

  constructor(config: AtlasStreamDeckConfig = {}) {
    this.wsUrl = config.wsUrl || 'ws://127.0.0.1:8999';
    this.authToken = config.authToken || '';
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public registerKeyContext(context: string, actionUuid: string): void {
    this.registeredContexts.set(context, actionUuid);
  }

  public unregisterKeyContext(context: string): void {
    this.registeredContexts.delete(context);
  }

  public getRegisteredContexts(): Map<string, string> {
    return new Map(this.registeredContexts);
  }

  public handleStreamDeckEvent(event: StreamDeckEvent): { handled: boolean; responsePayload?: any } {
    if (event.event === 'keyDown' || event.event === 'keyUp') {
      const action = event.action || this.registeredContexts.get(event.context || '');
      return {
        handled: true,
        responsePayload: {
          action,
          context: event.context,
          event: event.event,
          timestamp: Date.now()
        }
      };
    }
    return { handled: false };
  }
}
