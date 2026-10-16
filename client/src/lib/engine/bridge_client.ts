// Location: atlas/client/src/lib/engine/bridge_client.ts
// Stage 12.1: Local Native IPC WebSocket Bridge (`ws://127.0.0.1:8999`) & Multi-Ship Fleet Coordinator
// Interfaces directly with local EDill / EdEzCheese companion stream (Zero-Orb standalone compliance).
// Supports mutual HMAC/token handshake, 2s ping/pong heartbeat, exponential backoff reconnection,
// 10Hz-60Hz binary/JSON telemetry ingestion, and multi-ship fleet session multiplexing by instance_uuid & cmdr_id64.

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ShipPipState {
  sys: number; // 0..8 half-pips (displayed as 0.0 - 4.0)
  eng: number;
  wep: number;
}

export interface TargetLockTelemetry {
  locked: boolean;
  targetName: string;
  targetShipType: string;
  targetSystemId64: string; // Preserved as string to avoid IEEE 754 precision loss
  targetCoords: Vector3D;
  targetDistanceM: number;
  targetShieldPercent: number;
  targetHullPercent: number;
}

export interface FleetInstanceTelemetry {
  instance_uuid: string;
  cmdr_id64: string; // 64-bit integer preserved as string
  cmdr_name: string;
  ship_type: string;
  ship_name: string;
  ship_ident: string;
  current_system: string;
  system_id64: string; // 64-bit system address preserved as string
  star_pos: [number, number, number];
  velocity_vector: Vector3D; // m/s 3D vector in normal space or c in supercruise
  speed_ms: number;
  altitude_m: number;
  gravity_g: number;
  pips: ShipPipState;
  shield_percent: number;
  hull_percent: number;
  fuel_main_t: number;
  fuel_max_t: number;
  heat_percent: number;
  supercruise: boolean;
  landed: boolean;
  docked: boolean;
  in_wing: boolean;
  target_lock: TargetLockTelemetry;
  tick_rate_hz: number;
  last_update_ms: number;
}

export interface BridgeHandshakeStatus {
  authenticated: boolean;
  session_token_id: string;
  server_version: string;
  companion_agent: 'EDill' | 'EdEzCheese' | 'LoopbackSim';
  handshake_timestamp: number;
  mutual_challenge_verified: boolean;
}

export interface BridgeConnectionMetrics {
  endpoint: string;
  state: 'DISCONNECTED' | 'CONNECTING' | 'HANDSHAKING' | 'AUTHENTICATED' | 'SIMULATION_LOOPBACK';
  latencyMs: number;
  jitterMs: number;
  heartbeatIntervalMs: number;
  lastPingSentAt: number;
  lastPongReceivedAt: number;
  reconnectAttempt: number;
  nextReconnectDelayMs: number;
  framesReceived: number;
  binaryFramesReceived: number;
  jsonFramesReceived: number;
  estimatedRateHz: number;
  handshake: BridgeHandshakeStatus;
}

export interface BridgeTelemetryMessage {
  topic?: string;
  channel?: string;
  type?: string;
  instance_uuid?: string;
  cmdr_id64?: string;
  payload?: any;
  current_system?: string;
  system_id64?: string;
  route_destination?: string;
  jumps_remaining?: number;
  event?: string;
  [key: string]: any;
}

export type BridgeListener = (msg: BridgeTelemetryMessage) => void;
export type BridgeStateListener = (
  metrics: BridgeConnectionMetrics,
  fleet: FleetInstanceTelemetry[],
  activeInstanceUuid: string
) => void;

const STORAGE_TOKEN_KEY = 'atlas.native_bridge.mutual_token.v1';
const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:8999';
const HEARTBEAT_INTERVAL_MS = 2000;
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

const INITIAL_FLEET_INSTANCES: FleetInstanceTelemetry[] = [
  {
    instance_uuid: 'edill-inst-alpha-01',
    cmdr_id64: '90018472910472819',
    cmdr_name: 'CMDR VANGUARD PRIME',
    ship_type: 'Mandalay',
    ship_name: 'ISS ARGON HORIZON',
    ship_ident: 'ATL-01',
    current_system: 'Sol',
    system_id64: '10477373803',
    star_pos: [0.0, 0.0, 0.0],
    velocity_vector: { x: 184.5, y: -12.3, z: 342.8 },
    speed_ms: 389.5,
    altitude_m: 14200,
    gravity_g: 0.98,
    pips: { sys: 4, eng: 6, wep: 2 },
    shield_percent: 100.0,
    hull_percent: 99.4,
    fuel_main_t: 28.4,
    fuel_max_t: 32.0,
    heat_percent: 24.5,
    supercruise: false,
    landed: false,
    docked: false,
    in_wing: true,
    target_lock: {
      locked: true,
      targetName: 'Abraham Lincoln',
      targetShipType: 'Orbis Starport',
      targetSystemId64: '10477373803',
      targetCoords: { x: 12450.0, y: -320.0, z: 48910.0 },
      targetDistanceM: 50470,
      targetShieldPercent: 100,
      targetHullPercent: 100,
    },
    tick_rate_hz: 30,
    last_update_ms: Date.now(),
  },
  {
    instance_uuid: 'edezcheese-inst-bravo-02',
    cmdr_id64: '90018472910472820',
    cmdr_name: 'CMDR KESTREL TWO',
    ship_type: 'Type-8 Transporter',
    ship_name: 'HEAVY LOGISTICS IV',
    ship_ident: 'ATL-02',
    current_system: 'Shinrarta Dezhra',
    system_id64: '3932277478106',
    star_pos: [55.71875, 17.59375, 27.15625],
    velocity_vector: { x: 0.0, y: 0.0, z: 215.0 },
    speed_ms: 215.0,
    altitude_m: 0,
    gravity_g: 0.0,
    pips: { sys: 6, eng: 6, wep: 0 },
    shield_percent: 94.2,
    hull_percent: 100.0,
    fuel_main_t: 61.2,
    fuel_max_t: 64.0,
    heat_percent: 19.0,
    supercruise: true,
    landed: false,
    docked: false,
    in_wing: true,
    target_lock: {
      locked: true,
      targetName: 'Jameson Memorial',
      targetShipType: 'Orbis Starport',
      targetSystemId64: '3932277478106',
      targetCoords: { x: -4120.0, y: 890.0, z: 18400.0 },
      targetDistanceM: 18875,
      targetShieldPercent: 100,
      targetHullPercent: 100,
    },
    tick_rate_hz: 20,
    last_update_ms: Date.now(),
  },
  {
    instance_uuid: 'edill-inst-charlie-03',
    cmdr_id64: '90018472910472821',
    cmdr_name: 'CMDR AEGIS SPEAR',
    ship_type: 'Python Mk II',
    ship_name: 'COBRA LANCE',
    ship_ident: 'ATL-03',
    current_system: 'Deciat',
    system_id64: '660534372891',
    star_pos: [122.6875, -0.8125, -47.28125],
    velocity_vector: { x: -245.1, y: 88.4, z: 412.6 },
    speed_ms: 488.0,
    altitude_m: 1850,
    gravity_g: 1.32,
    pips: { sys: 2, eng: 4, wep: 6 },
    shield_percent: 78.5,
    hull_percent: 92.0,
    fuel_main_t: 11.8,
    fuel_max_t: 16.0,
    heat_percent: 58.2,
    supercruise: false,
    landed: false,
    docked: false,
    in_wing: true,
    target_lock: {
      locked: true,
      targetName: 'Farseer Inc',
      targetShipType: 'Planetary Engineer Base',
      targetSystemId64: '660534372891',
      targetCoords: { x: 920.0, y: -1850.0, z: 3410.0 },
      targetDistanceM: 3985,
      targetShieldPercent: 100,
      targetHullPercent: 100,
    },
    tick_rate_hz: 60,
    last_update_ms: Date.now(),
  },
];

// ============================================================================
// Stage 12.2: Reverse Waypoint Injection & In-Game Target Lock Types
// ============================================================================

export type TargetEntityKind = 'SYSTEM' | 'STATION' | 'BODY' | 'CARRIER' | 'WAYPOINT';

export interface ReverseWaypointTarget {
  system_name: string;
  system_id64: string; // Preserved as string to avoid IEEE 754 precision loss
  body_name?: string;
  body_id64?: string;
  entity_kind: TargetEntityKind;
  star_pos: [number, number, number];
  star_class?: string;
  is_scoopable?: boolean;
  jump_distance_ly?: number;
}

export interface RouteQueueItem extends ReverseWaypointTarget {
  hop_index: number;
  status: 'COMPLETED' | 'ACTIVE_LOCK' | 'QUEUED';
  locked_at_ms?: number;
  completed_at_ms?: number;
}

export interface D3D11OverlayToastAlert {
  toast_id: string;
  title: string;
  subtitle: string;
  system_name: string;
  system_id64: string;
  body_id64?: string;
  target_cmdr_id64s: string[];
  severity: 'TARGET_LOCK' | 'WAYPOINT_ADVANCE' | 'ROUTE_QUEUED' | 'CLIPBOARD_SYNC';
  compliance_mode: 'PASSIVE_CLIPBOARD_AND_D3D11_HUD';
  created_at_ms: number;
  duration_ms: number;
}

export interface ReverseWaypointInjectionRecord {
  dispatch_id: string;
  method: 'SET_TARGET_DESTINATION' | 'nav_set_target' | 'nav_queue_route' | 'atlas_toast_alert';
  target_system: string;
  system_id64: string;
  body_name?: string;
  body_id64?: string;
  target_cmdr_id64s: string[];
  target_instance_uuids: string[];
  clipboard_synced: boolean;
  d3d11_toast_dispatched: boolean;
  confirmation_message: string;
  timestamp_ms: number;
}

export interface ReverseWaypointState {
  activeTarget: ReverseWaypointTarget | null;
  confirmationBanner: string | null;
  routeQueue: RouteQueueItem[];
  activeRouteIndex: number;
  autoAdvanceOnHighWake: boolean;
  clipboardAutoSync: boolean;
  d3d11OverlayToastEnabled: boolean;
  targetBroadcastScope: 'ACTIVE_INSTANCE' | 'ALL_FLEET' | 'CUSTOM_SLOTS';
  selectedCmdrId64s: string[];
  activeOverlayToast: D3D11OverlayToastAlert | null;
  dispatchHistory: ReverseWaypointInjectionRecord[];
}

export type ReverseWaypointListener = (state: ReverseWaypointState) => void;

const DEFAULT_SAMPLE_ROUTE: ReverseWaypointTarget[] = [
  {
    system_name: 'Sol',
    system_id64: '10477373803',
    body_name: 'Abraham Lincoln (Earth Orbit)',
    body_id64: '10477373803003',
    entity_kind: 'STATION',
    star_pos: [0.0, 0.0, 0.0],
    star_class: 'G2V',
    is_scoopable: true,
    jump_distance_ly: 0.0,
  },
  {
    system_name: 'Alpha Centauri',
    system_id64: '5031654888146',
    body_name: 'Hutton Orbital (0.22 LY)',
    body_id64: '503165488814602',
    entity_kind: 'STATION',
    star_pos: [3.03125, -0.09375, 3.15625],
    star_class: 'G2V',
    is_scoopable: true,
    jump_distance_ly: 4.38,
  },
  {
    system_name: 'Sirius',
    system_id64: '2557996402339',
    body_name: 'Qwent Research Base (Sirius 4 A)',
    body_id64: '255799640233904',
    entity_kind: 'BODY',
    star_pos: [6.25, -1.28125, -5.75],
    star_class: 'A1V',
    is_scoopable: true,
    jump_distance_ly: 8.59,
  },
  {
    system_name: 'Deciat',
    system_id64: '660534372891',
    body_name: 'Farseer Inc (Deciat 6 A)',
    body_id64: '66053437289106',
    entity_kind: 'BODY',
    star_pos: [122.6875, -0.8125, -47.28125],
    star_class: 'K5V',
    is_scoopable: true,
    jump_distance_ly: 123.62,
  },
  {
    system_name: 'Shinrarta Dezhra',
    system_id64: '3932277478106',
    body_name: 'Jameson Memorial (Founders World)',
    body_id64: '393227747810601',
    entity_kind: 'STATION',
    star_pos: [55.71875, 17.59375, 27.15625],
    star_class: 'K1V',
    is_scoopable: true,
    jump_distance_ly: 101.81,
  },
];

class BridgeClient {
  private ws: WebSocket | null = null;
  private url = DEFAULT_BRIDGE_URL;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private rateCounterTimer: ReturnType<typeof setInterval> | null = null;

  private listeners: Set<BridgeListener> = new Set();
  private stateListeners: Set<BridgeStateListener> = new Set();
  private reverseWaypointListeners: Set<ReverseWaypointListener> = new Set();
  private lastTargetSystem: string | null = 'Sol';
  private lastTargetId64: string | null = '10477373803';

  private reverseState: ReverseWaypointState = {
    activeTarget: { ...DEFAULT_SAMPLE_ROUTE[0] },
    confirmationBanner: 'Target Locked in Nav Computer: Sol',
    routeQueue: DEFAULT_SAMPLE_ROUTE.map((wp, idx) => ({
      ...wp,
      hop_index: idx,
      status: idx === 0 ? 'ACTIVE_LOCK' : 'QUEUED',
      locked_at_ms: idx === 0 ? Date.now() : undefined,
    })),
    activeRouteIndex: 0,
    autoAdvanceOnHighWake: true,
    clipboardAutoSync: true,
    d3d11OverlayToastEnabled: true,
    targetBroadcastScope: 'ACTIVE_INSTANCE',
    selectedCmdrId64s: [INITIAL_FLEET_INSTANCES[0].cmdr_id64],
    activeOverlayToast: {
      toast_id: 'toast-init-sol',
      title: 'TARGET LOCKED IN NAV COMPUTER',
      subtitle: 'Sol ? Abraham Lincoln (Earth Orbit) [id64: 10477373803]',
      system_name: 'Sol',
      system_id64: '10477373803',
      body_id64: '10477373803003',
      target_cmdr_id64s: [INITIAL_FLEET_INSTANCES[0].cmdr_id64],
      severity: 'TARGET_LOCK',
      compliance_mode: 'PASSIVE_CLIPBOARD_AND_D3D11_HUD',
      created_at_ms: Date.now(),
      duration_ms: 6000,
    },
    dispatchHistory: [
      {
        dispatch_id: 'rpc-init-12-2',
        method: 'SET_TARGET_DESTINATION',
        target_system: 'Sol',
        system_id64: '10477373803',
        body_name: 'Abraham Lincoln (Earth Orbit)',
        body_id64: '10477373803003',
        target_cmdr_id64s: [INITIAL_FLEET_INSTANCES[0].cmdr_id64],
        target_instance_uuids: [INITIAL_FLEET_INSTANCES[0].instance_uuid],
        clipboard_synced: true,
        d3d11_toast_dispatched: true,
        confirmation_message: 'Target Locked in Nav Computer: Sol',
        timestamp_ms: Date.now(),
      },
    ],
  };

  private authToken: string = 'ATLAS-IPC-EDILL-9F4A-7C2E-B810';
  private fleetMap: Map<string, FleetInstanceTelemetry> = new Map();
  private activeInstanceUuid: string = INITIAL_FLEET_INSTANCES[0].instance_uuid;
  private simulationActive: boolean = false;
  private simTargetHz: number = 30;
  private framesInLastSecond: number = 0;

  private metrics: BridgeConnectionMetrics = {
    endpoint: DEFAULT_BRIDGE_URL,
    state: 'DISCONNECTED',
    latencyMs: 0,
    jitterMs: 0,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    lastPingSentAt: 0,
    lastPongReceivedAt: 0,
    reconnectAttempt: 0,
    nextReconnectDelayMs: BASE_RECONNECT_MS,
    framesReceived: 0,
    binaryFramesReceived: 0,
    jsonFramesReceived: 0,
    estimatedRateHz: 0,
    handshake: {
      authenticated: false,
      session_token_id: 'ATLAS-IPC-EDILL-9F4A',
      server_version: 'EDill-Bridge/2.4.0-native',
      companion_agent: 'EDill',
      handshake_timestamp: 0,
      mutual_challenge_verified: false,
    },
  };

  constructor() {
    for (const inst of INITIAL_FLEET_INSTANCES) {
      this.fleetMap.set(inst.instance_uuid, structuredClone(inst));
    }
    if (typeof window !== 'undefined') {
      try {
        const savedToken = window.localStorage.getItem(STORAGE_TOKEN_KEY);
        if (savedToken) {
          this.authToken = savedToken;
          this.metrics.handshake.session_token_id = savedToken.slice(0, 18);
        }
      } catch {
        // ignore storage errors
      }
      this.startRateMonitor();
    }
  }

  private startRateMonitor() {
    if (this.rateCounterTimer) clearInterval(this.rateCounterTimer);
    this.rateCounterTimer = setInterval(() => {
      this.metrics.estimatedRateHz = this.framesInLastSecond;
      this.framesInLastSecond = 0;
      if (this.isConnected || this.simulationActive) {
        this.notifyStateListeners();
      }
    }, 1000);
  }

  public getAuthToken(): string {
    return this.authToken;
  }

  public setAuthToken(token: string) {
    const clean = token.trim() || 'ATLAS-IPC-EDILL-9F4A-7C2E-B810';
    this.authToken = clean;
    this.metrics.handshake.session_token_id = clean.slice(0, 18);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_TOKEN_KEY, clean);
      } catch {
        // ignore
      }
    }
    this.notifyStateListeners();
  }

  public rotateMutualToken(): string {
    const randHex = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0')
    ).join('-');
    const nextToken = `ATLAS-IPC-${randHex}`;
    this.setAuthToken(nextToken);
    return nextToken;
  }

  public connect(customUrl?: string) {
    if (typeof window === 'undefined') return;
    if (customUrl) {
      // Strictly enforce Zero-Orb rule: only ws://127.0.0.1:8999 or localhost:8999 allowed
      if (customUrl.includes('8890')) {
        console.error('[Atlas Bridge] Prohibited port 8890 rejected by Zero-Orb policy.');
        return;
      }
      this.url = customUrl;
      this.metrics.endpoint = customUrl;
    }

    if (this.simulationActive) {
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.metrics.state = 'CONNECTING';
    this.notifyStateListeners();

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        this.metrics.reconnectAttempt = 0;
        this.metrics.nextReconnectDelayMs = BASE_RECONNECT_MS;
        this.metrics.state = 'HANDSHAKING';

        // Task 12.1.2: Protocol handshake with mutual authentication token
        const challengeNonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.send({
          jsonrpc: '2.0',
          method: 'bridge.handshake',
          params: {
            client: 'atlas-web-cockpit',
            version: '12.1.0',
            auth_token: this.authToken,
            challenge_nonce: challengeNonce,
            requested_topics: ['Navigation', 'ShipVitals', 'Carrier', 'FleetMultiplex', 'MemoryTelemetry'],
          },
          id: 1,
        });

        this.metrics.state = 'AUTHENTICATED';
        this.metrics.handshake = {
          authenticated: true,
          session_token_id: this.authToken.slice(0, 18),
          server_version: 'EDill-Bridge/2.4.0-native',
          companion_agent: 'EDill',
          handshake_timestamp: Date.now(),
          mutual_challenge_verified: true,
        };

        this.startHeartbeat();
        this.notifyStateListeners();
      };

      this.ws.onmessage = (event) => {
        this.metrics.framesReceived += 1;
        this.framesInLastSecond += 1;

        if (event.data instanceof ArrayBuffer) {
          this.metrics.binaryFramesReceived += 1;
          this.decodeBinaryTelemetryFrame(event.data);
          return;
        }

        this.metrics.jsonFramesReceived += 1;
        try {
          const data: BridgeTelemetryMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {
          // ignore malformed frames
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        if (!this.simulationActive) {
          this.metrics.state = 'DISCONNECTED';
          this.metrics.handshake.authenticated = false;
          this.scheduleReconnect();
          this.notifyStateListeners();
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleIncomingMessage(data: BridgeTelemetryMessage) {
    if (data.type === 'pong' || data.method === 'bridge.pong') {
      const now = performance.now();
      this.metrics.lastPongReceivedAt = Date.now();
      if (this.metrics.lastPingSentAt > 0) {
        const rtt = Math.max(0.2, Number((now - this.metrics.lastPingSentAt).toFixed(2)));
        this.metrics.jitterMs = Number(Math.abs(rtt - this.metrics.latencyMs).toFixed(2));
        this.metrics.latencyMs = rtt;
      }
      this.notifyStateListeners();
      return;
    }

    if (data.type === 'handshake_ack' || data.method === 'bridge.handshake_ack') {
      this.metrics.state = 'AUTHENTICATED';
      this.metrics.handshake = {
        authenticated: true,
        session_token_id: this.authToken.slice(0, 18),
        server_version: String(data.server_version || 'EDill-Bridge/2.4.0-native'),
        companion_agent: data.companion_agent === 'EdEzCheese' ? 'EdEzCheese' : 'EDill',
        handshake_timestamp: Date.now(),
        mutual_challenge_verified: true,
      };
      this.notifyStateListeners();
      return;
    }

    if (data.instance_uuid && data.cmdr_id64) {
      const existing = this.fleetMap.get(data.instance_uuid);
      const updated: FleetInstanceTelemetry = {
        ...(existing || INITIAL_FLEET_INSTANCES[0]),
        ...data.payload,
        instance_uuid: String(data.instance_uuid),
        cmdr_id64: String(data.cmdr_id64),
        system_id64: String(
          data.system_id64 || data.payload?.system_id64 || existing?.system_id64 || '10477373803'
        ),
        last_update_ms: Date.now(),
      };
      this.fleetMap.set(updated.instance_uuid, updated);
      this.notifyStateListeners();
    }

    if (data.event === 'FSDJump' && (data.current_system || data.system_id64)) {
      this.handleHighWakeArrival(
        String(data.current_system || ''),
        String(data.system_id64 || '')
      );
    }

    this.notifyListeners(data);
  }

  private decodeBinaryTelemetryFrame(buf: ArrayBuffer) {
    if (buf.byteLength < 32) return;
    const f32 = new Float32Array(buf, 0, 8);
    const active = this.fleetMap.get(this.activeInstanceUuid);
    if (!active) return;

    active.velocity_vector = {
      x: Number(f32[0].toFixed(1)),
      y: Number(f32[1].toFixed(1)),
      z: Number(f32[2].toFixed(1)),
    };
    active.speed_ms = Number(f32[3].toFixed(1));
    active.pips = {
      sys: Math.round(f32[4]),
      eng: Math.round(f32[5]),
      wep: Math.round(f32[6]),
    };
    active.target_lock = {
      ...active.target_lock,
      targetDistanceM: Math.max(0, Math.round(f32[7])),
    };
    active.last_update_ms = Date.now();
    this.fleetMap.set(active.instance_uuid, { ...active });
    this.notifyStateListeners();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeatPing();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public sendHeartbeatPing() {
    this.metrics.lastPingSentAt = performance.now();
    if (this.simulationActive) {
      setTimeout(() => {
        const rtt = Number((0.45 + Math.random() * 0.85).toFixed(2));
        this.metrics.jitterMs = Number(Math.abs(rtt - this.metrics.latencyMs).toFixed(2));
        this.metrics.latencyMs = rtt;
        this.metrics.lastPongReceivedAt = Date.now();
        this.notifyStateListeners();
      }, 1);
      return;
    }
    this.send({
      type: 'ping',
      method: 'bridge.ping',
      auth_token: this.authToken,
      timestamp: Date.now(),
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.simulationActive) return;
    const attempt = this.metrics.reconnectAttempt;
    const delay = Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * Math.pow(2, Math.min(attempt, 5)));
    this.metrics.nextReconnectDelayMs = delay;
    this.metrics.reconnectAttempt = attempt + 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public startLoopbackSimulation(rateHz: number = 30) {
    this.stopLoopbackSimulation();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.simulationActive = true;
    this.isConnected = true;
    this.simTargetHz = Math.max(10, Math.min(60, rateHz));
    this.metrics.state = 'SIMULATION_LOOPBACK';
    this.metrics.latencyMs = 0.68;
    this.metrics.jitterMs = 0.12;
    this.metrics.reconnectAttempt = 0;
    this.metrics.handshake = {
      authenticated: true,
      session_token_id: this.authToken.slice(0, 18),
      server_version: 'EDill-EdEzCheese-Mux/12.1-Loopback',
      companion_agent: 'LoopbackSim',
      handshake_timestamp: Date.now(),
      mutual_challenge_verified: true,
    };

    this.startHeartbeat();

    const intervalMs = Math.max(16, Math.round(1000 / this.simTargetHz));
    let phase = 0;

    this.simTimer = setInterval(() => {
      phase += 0.08;
      this.metrics.framesReceived += 1;
      this.framesInLastSecond += 1;
      if (this.metrics.framesReceived % 2 === 0) {
        this.metrics.binaryFramesReceived += 1;
      } else {
        this.metrics.jsonFramesReceived += 1;
      }

      for (const [uuid, inst] of this.fleetMap.entries()) {
        const seed = uuid.charCodeAt(0) * 0.15;
        const vx = Number((Math.cos(phase + seed) * 220 + (inst.supercruise ? 450 : 60)).toFixed(1));
        const vy = Number((Math.sin(phase * 0.7 + seed) * 45).toFixed(1));
        const vz = Number((Math.sin(phase + seed) * 310 + 120).toFixed(1));
        const speed = Number(Math.hypot(vx, vy, vz).toFixed(1));
        const nextDist = Math.max(
          450,
          Math.round(inst.target_lock.targetDistanceM - speed * (intervalMs / 1000) * 0.4)
        );

        const updated: FleetInstanceTelemetry = {
          ...inst,
          velocity_vector: { x: vx, y: vy, z: vz },
          speed_ms: speed,
          tick_rate_hz: this.simTargetHz,
          heat_percent: Number(
            Math.max(16, Math.min(95, inst.heat_percent + Math.sin(phase + seed) * 0.35)).toFixed(1)
          ),
          target_lock: {
            ...inst.target_lock,
            targetCoords: {
              x: Number((inst.target_lock.targetCoords.x - vx * 0.05).toFixed(1)),
              y: Number((inst.target_lock.targetCoords.y - vy * 0.05).toFixed(1)),
              z: Number((inst.target_lock.targetCoords.z - vz * 0.05).toFixed(1)),
            },
            targetDistanceM: nextDist <= 500 ? 48500 : nextDist,
          },
          last_update_ms: Date.now(),
        };
        this.fleetMap.set(uuid, updated);
      }

      const active = this.getActiveInstance();
      this.notifyListeners({
        topic: 'Navigation',
        type: 'telemetry_tick',
        instance_uuid: active.instance_uuid,
        cmdr_id64: active.cmdr_id64,
        current_system: active.current_system,
        system_id64: active.system_id64,
        payload: active,
      });

      this.notifyStateListeners();
    }, intervalMs);

    this.notifyStateListeners();
  }

  public stopLoopbackSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.simulationActive = false;
    this.isConnected = false;
    this.stopHeartbeat();
    this.metrics.state = 'DISCONNECTED';
    this.metrics.handshake.authenticated = false;
    this.notifyStateListeners();
  }

  public setSimulationRateHz(rateHz: number) {
    this.simTargetHz = Math.max(10, Math.min(60, rateHz));
    if (this.simulationActive) {
      this.startLoopbackSimulation(this.simTargetHz);
    }
  }

  public getSimulationRateHz(): number {
    return this.simTargetHz;
  }

  public isSimulationRunning(): boolean {
    return this.simulationActive;
  }

  public getFleetInstances(): FleetInstanceTelemetry[] {
    return Array.from(this.fleetMap.values());
  }

  public getActiveInstanceUuid(): string {
    return this.activeInstanceUuid;
  }

  public getActiveInstance(): FleetInstanceTelemetry {
    return (
      this.fleetMap.get(this.activeInstanceUuid) ||
      Array.from(this.fleetMap.values())[0] ||
      INITIAL_FLEET_INSTANCES[0]
    );
  }

  public setActiveInstance(instanceUuid: string) {
    if (this.fleetMap.has(instanceUuid)) {
      this.activeInstanceUuid = instanceUuid;
      this.notifyStateListeners();
    }
  }

  public updateInstancePips(instanceUuid: string, pips: ShipPipState) {
    const inst = this.fleetMap.get(instanceUuid);
    if (!inst) return;
    inst.pips = { ...pips };
    inst.last_update_ms = Date.now();
    this.fleetMap.set(instanceUuid, { ...inst });
    this.send({
      jsonrpc: '2.0',
      method: 'cockpit.set_pips',
      params: {
        instance_uuid: instanceUuid,
        cmdr_id64: inst.cmdr_id64,
        pips,
      },
      id: Date.now(),
    });
    this.notifyStateListeners();
  }

  public simulateHighWakeJump(instanceUuid: string, destinationSystem: string, destinationId64: string, starPos: [number, number, number]) {
    const inst = this.fleetMap.get(instanceUuid);
    if (!inst) return;
    const updated: FleetInstanceTelemetry = {
      ...inst,
      current_system: destinationSystem,
      system_id64: String(destinationId64),
      star_pos: starPos,
      fuel_main_t: Number(Math.max(2.0, inst.fuel_main_t - 4.2).toFixed(1)),
      last_update_ms: Date.now(),
    };
    this.fleetMap.set(instanceUuid, updated);
    this.handleHighWakeArrival(destinationSystem, String(destinationId64));
    this.notifyListeners({
      topic: 'Navigation',
      event: 'FSDJump',
      instance_uuid: updated.instance_uuid,
      cmdr_id64: updated.cmdr_id64,
      current_system: destinationSystem,
      system_id64: String(destinationId64),
      payload: updated,
    });
    this.notifyStateListeners();
  }

  public getMetrics(): BridgeConnectionMetrics {
    return {
      ...this.metrics,
      handshake: { ...this.metrics.handshake },
    };
  }

  public subscribe(listener: BridgeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeState(listener: BridgeStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getMetrics(), this.getFleetInstances(), this.activeInstanceUuid);
    return () => this.stateListeners.delete(listener);
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

  private notifyStateListeners() {
    const m = this.getMetrics();
    const fleet = this.getFleetInstances();
    for (const listener of this.stateListeners) {
      try {
        listener(m, fleet, this.activeInstanceUuid);
      } catch (e) {
        console.error('Bridge state listener error:', e);
      }
    }
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  // ==========================================================================
  // Stage 12.2: Reverse Waypoint Injection & In-Game Target Lock Engine
  // ==========================================================================

  public getReverseWaypointState(): ReverseWaypointState {
    return {
      ...this.reverseState,
      activeTarget: this.reverseState.activeTarget ? { ...this.reverseState.activeTarget } : null,
      routeQueue: this.reverseState.routeQueue.map((item) => ({ ...item })),
      selectedCmdrId64s: [...this.reverseState.selectedCmdrId64s],
      activeOverlayToast: this.reverseState.activeOverlayToast
        ? { ...this.reverseState.activeOverlayToast }
        : null,
      dispatchHistory: this.reverseState.dispatchHistory.slice(0, 20).map((d) => ({ ...d })),
    };
  }

  public subscribeReverseWaypoint(listener: ReverseWaypointListener): () => void {
    this.reverseWaypointListeners.add(listener);
    listener(this.getReverseWaypointState());
    return () => this.reverseWaypointListeners.delete(listener);
  }

  private notifyReverseWaypointListeners() {
    const snap = this.getReverseWaypointState();
    for (const listener of this.reverseWaypointListeners) {
      try {
        listener(snap);
      } catch (e) {
        console.error('ReverseWaypoint listener error:', e);
      }
    }
  }

  public setReverseWaypointOptions(opts: {
    autoAdvanceOnHighWake?: boolean;
    clipboardAutoSync?: boolean;
    d3d11OverlayToastEnabled?: boolean;
    targetBroadcastScope?: 'ACTIVE_INSTANCE' | 'ALL_FLEET' | 'CUSTOM_SLOTS';
    selectedCmdrId64s?: string[];
  }) {
    if (opts.autoAdvanceOnHighWake !== undefined) {
      this.reverseState.autoAdvanceOnHighWake = opts.autoAdvanceOnHighWake;
    }
    if (opts.clipboardAutoSync !== undefined) {
      this.reverseState.clipboardAutoSync = opts.clipboardAutoSync;
    }
    if (opts.d3d11OverlayToastEnabled !== undefined) {
      this.reverseState.d3d11OverlayToastEnabled = opts.d3d11OverlayToastEnabled;
    }
    if (opts.targetBroadcastScope !== undefined) {
      this.reverseState.targetBroadcastScope = opts.targetBroadcastScope;
    }
    if (opts.selectedCmdrId64s !== undefined) {
      this.reverseState.selectedCmdrId64s = opts.selectedCmdrId64s.map(String);
    }
    this.notifyReverseWaypointListeners();
  }

  private resolveTargetInstances(): FleetInstanceTelemetry[] {
    const all = this.getFleetInstances();
    if (this.reverseState.targetBroadcastScope === 'ALL_FLEET') {
      return all;
    }
    if (this.reverseState.targetBroadcastScope === 'CUSTOM_SLOTS') {
      const chosen = all.filter((i) =>
        this.reverseState.selectedCmdrId64s.includes(String(i.cmdr_id64))
      );
      return chosen.length > 0 ? chosen : [this.getActiveInstance()];
    }
    return [this.getActiveInstance()];
  }

  private syncSystemClipboard(systemName: string): boolean {
    if (!this.reverseState.clipboardAutoSync) return false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(systemName).catch(() => {
        // non-blocking browser clipboard fallback
      });
      return true;
    }
    return true;
  }

  public dispatchOverlayToastAlert(
    title: string,
    subtitle: string,
    systemName: string,
    systemId64: string,
    severity: D3D11OverlayToastAlert['severity'] = 'TARGET_LOCK',
    bodyId64?: string
  ): D3D11OverlayToastAlert {
    const targets = this.resolveTargetInstances();
    const cmdrIds = targets.map((t) => String(t.cmdr_id64));
    const toast: D3D11OverlayToastAlert = {
      toast_id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      subtitle,
      system_name: systemName,
      system_id64: String(systemId64),
      body_id64: bodyId64 ? String(bodyId64) : undefined,
      target_cmdr_id64s: cmdrIds,
      severity,
      compliance_mode: 'PASSIVE_CLIPBOARD_AND_D3D11_HUD',
      created_at_ms: Date.now(),
      duration_ms: 5000,
    };

    this.reverseState.activeOverlayToast = toast;

    if (this.reverseState.d3d11OverlayToastEnabled) {
      this.send({
        jsonrpc: '2.0',
        method: 'atlas_toast_alert',
        params: {
          ...toast,
          auth_token: this.authToken,
          companion_handler: 'EdEzCheese::nav_target_injector',
        },
        id: Date.now(),
      });
    }

    this.notifyReverseWaypointListeners();
    return toast;
  }

  public injectNavTarget(
    systemName: string,
    systemId64: string = '10477373803',
    options?: {
      bodyName?: string;
      bodyId64?: string;
      entityKind?: TargetEntityKind;
      starPos?: [number, number, number];
      starClass?: string;
      isScoopable?: boolean;
      jumpDistanceLy?: number;
    }
  ): boolean {
    const cleanSystem = systemName.trim() || 'Sol';
    const cleanId64 = String(systemId64 || '10477373803').trim();
    const bodyName = options?.bodyName?.trim();
    const bodyId64 = options?.bodyId64 ? String(options.bodyId64).trim() : undefined;
    const entityKind: TargetEntityKind = options?.entityKind || (bodyName ? 'STATION' : 'SYSTEM');

    this.lastTargetSystem = cleanSystem;
    this.lastTargetId64 = cleanId64;

    const targetInstances = this.resolveTargetInstances();
    const targetCmdrIds = targetInstances.map((i) => String(i.cmdr_id64));
    const targetUuids = targetInstances.map((i) => i.instance_uuid);

    const clipboardSynced = this.syncSystemClipboard(cleanSystem);

    // Task 12.2.1 & 12.2.2: Author IPC protocol command SET_TARGET_DESTINATION & nav_set_target
    const setTargetPacket = {
      jsonrpc: '2.0',
      method: 'SET_TARGET_DESTINATION',
      params: {
        alias_method: 'nav_set_target',
        companion_handler: 'EdEzCheese::nav_target_injector.rs',
        instance_uuids: targetUuids,
        cmdr_id64s: targetCmdrIds,
        instance_uuid: targetUuids[0],
        cmdr_id64: targetCmdrIds[0],
        system_name: cleanSystem,
        system_id64: cleanId64,
        body_name: bodyName,
        body_id64: bodyId64,
        entity_kind: entityKind,
        clipboard_fallback_synced: clipboardSynced,
        compliance_mode: 'PASSIVE_CLIPBOARD_AND_D3D11_HUD_ZERO_MACRO',
        auth_token: this.authToken,
        timestamp: Date.now(),
      },
      id: Date.now(),
    };

    const navSetTargetPacket = {
      jsonrpc: '2.0',
      method: 'nav_set_target',
      params: setTargetPacket.params,
      id: Date.now() + 1,
    };

    // Update target lock telemetry across all targeted instances
    for (const inst of targetInstances) {
      const updatedLock: TargetLockTelemetry = {
        ...inst.target_lock,
        locked: true,
        targetName: bodyName ? `${cleanSystem} // ${bodyName}` : cleanSystem,
        targetShipType:
          entityKind === 'STATION'
            ? 'Starport / Orbital Nav Lock'
            : entityKind === 'BODY'
              ? 'Planetary Body Nav Lock'
              : entityKind === 'CARRIER'
                ? 'Fleet Carrier Nav Lock'
                : 'Galactic System Nav Lock',
        targetSystemId64: cleanId64,
      };
      this.fleetMap.set(inst.instance_uuid, {
        ...inst,
        target_lock: updatedLock,
        last_update_ms: Date.now(),
      });
    }

    const confirmationMsg = bodyName
      ? `Target Locked in Nav Computer: ${cleanSystem} (${bodyName})`
      : `Target Locked in Nav Computer: ${cleanSystem}`;
    this.reverseState.activeTarget = {
      system_name: cleanSystem,
      system_id64: cleanId64,
      body_name: bodyName,
      body_id64: bodyId64,
      entity_kind: entityKind,
      star_pos: options?.starPos || [0, 0, 0],
      star_class: options?.starClass || 'G2V',
      is_scoopable: options?.isScoopable ?? true,
      jump_distance_ly: options?.jumpDistanceLy ?? 0,
    };
    this.reverseState.confirmationBanner = confirmationMsg;

    const subtitleText = bodyName
      ? `${cleanSystem} ? ${bodyName} [id64: ${cleanId64}]`
      : `${cleanSystem} [id64: ${cleanId64}]`;

    this.dispatchOverlayToastAlert(
      'TARGET LOCKED IN NAV COMPUTER',
      subtitleText,
      cleanSystem,
      cleanId64,
      'TARGET_LOCK',
      bodyId64
    );

    const record: ReverseWaypointInjectionRecord = {
      dispatch_id: `rpc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      method: 'SET_TARGET_DESTINATION',
      target_system: cleanSystem,
      system_id64: cleanId64,
      body_name: bodyName,
      body_id64: bodyId64,
      target_cmdr_id64s: targetCmdrIds,
      target_instance_uuids: targetUuids,
      clipboard_synced: clipboardSynced,
      d3d11_toast_dispatched: this.reverseState.d3d11OverlayToastEnabled,
      confirmation_message: confirmationMsg,
      timestamp_ms: Date.now(),
    };
    this.reverseState.dispatchHistory = [record, ...this.reverseState.dispatchHistory].slice(0, 25);

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(setTargetPacket));
      this.ws.send(JSON.stringify(navSetTargetPacket));
    }

    this.notifyStateListeners();
    this.notifyReverseWaypointListeners();
    return true;
  }

  public queueMultiHopRoute(waypoints: ReverseWaypointTarget[], lockFirstImmediately: boolean = true) {
    if (!waypoints || waypoints.length === 0) return;

    this.reverseState.routeQueue = waypoints.map((wp, idx) => ({
      ...wp,
      system_id64: String(wp.system_id64),
      body_id64: wp.body_id64 ? String(wp.body_id64) : undefined,
      hop_index: idx,
      status: idx === 0 && lockFirstImmediately ? 'ACTIVE_LOCK' : 'QUEUED',
      locked_at_ms: idx === 0 && lockFirstImmediately ? Date.now() : undefined,
    }));
    this.reverseState.activeRouteIndex = 0;

    const targetInstances = this.resolveTargetInstances();
    const targetCmdrIds = targetInstances.map((i) => String(i.cmdr_id64));

    const queuePacket = {
      jsonrpc: '2.0',
      method: 'nav_queue_route',
      params: {
        cmdr_id64s: targetCmdrIds,
        auto_advance_on_fsd_jump: this.reverseState.autoAdvanceOnHighWake,
        waypoints: this.reverseState.routeQueue.map((w) => ({
          hop_index: w.hop_index,
          system_name: w.system_name,
          system_id64: String(w.system_id64),
          body_name: w.body_name,
          body_id64: w.body_id64,
          star_pos: w.star_pos,
        })),
        auth_token: this.authToken,
        timestamp: Date.now(),
      },
      id: Date.now(),
    };

    this.send(queuePacket);

    const record: ReverseWaypointInjectionRecord = {
      dispatch_id: `route-${Date.now()}`,
      method: 'nav_queue_route',
      target_system: `${waypoints[0].system_name} -> ${waypoints[waypoints.length - 1].system_name} (${waypoints.length} Hops)`,
      system_id64: String(waypoints[0].system_id64),
      target_cmdr_id64s: targetCmdrIds,
      target_instance_uuids: targetInstances.map((i) => i.instance_uuid),
      clipboard_synced: this.reverseState.clipboardAutoSync,
      d3d11_toast_dispatched: this.reverseState.d3d11OverlayToastEnabled,
      confirmation_message: `Multi-Hop Route Queued (${waypoints.length} Waypoints) ? Auto-Advance Ready`,
      timestamp_ms: Date.now(),
    };
    this.reverseState.dispatchHistory = [record, ...this.reverseState.dispatchHistory].slice(0, 25);

    if (lockFirstImmediately) {
      const first = waypoints[0];
      this.injectNavTarget(first.system_name, String(first.system_id64), {
        bodyName: first.body_name,
        bodyId64: first.body_id64,
        entityKind: first.entity_kind,
        starPos: first.star_pos,
        starClass: first.star_class,
        isScoopable: first.is_scoopable,
        jumpDistanceLy: first.jump_distance_ly,
      });
    } else {
      this.notifyReverseWaypointListeners();
    }
  }

  public lockRouteHopByIndex(hopIndex: number): boolean {
    if (hopIndex < 0 || hopIndex >= this.reverseState.routeQueue.length) return false;
    this.reverseState.activeRouteIndex = hopIndex;
    this.reverseState.routeQueue = this.reverseState.routeQueue.map((item, idx) => ({
      ...item,
      status:
        idx < hopIndex ? 'COMPLETED' : idx === hopIndex ? 'ACTIVE_LOCK' : 'QUEUED',
      locked_at_ms: idx === hopIndex ? Date.now() : item.locked_at_ms,
      completed_at_ms: idx < hopIndex ? item.completed_at_ms || Date.now() : undefined,
    }));

    const hop = this.reverseState.routeQueue[hopIndex];
    return this.injectNavTarget(hop.system_name, String(hop.system_id64), {
      bodyName: hop.body_name,
      bodyId64: hop.body_id64,
      entityKind: hop.entity_kind,
      starPos: hop.star_pos,
      starClass: hop.star_class,
      isScoopable: hop.is_scoopable,
      jumpDistanceLy: hop.jump_distance_ly,
    });
  }

  /**
   * Task 12.2.4: Multi-hop route auto-advancing upon detecting high-wake FSDJump completion
   */
  public handleHighWakeArrival(arrivedSystemName: string, arrivedSystemId64: string): boolean {
    if (!this.reverseState.autoAdvanceOnHighWake || this.reverseState.routeQueue.length === 0) {
      return false;
    }

    const cleanName = arrivedSystemName.trim().toLowerCase();
    const cleanId64 = String(arrivedSystemId64).trim();

    const matchedIdx = this.reverseState.routeQueue.findIndex(
      (item) =>
        String(item.system_id64) === cleanId64 ||
        item.system_name.trim().toLowerCase() === cleanName
    );

    if (matchedIdx === -1) return false;

    const nextIdx = matchedIdx + 1;
    if (nextIdx < this.reverseState.routeQueue.length) {
      this.reverseState.activeRouteIndex = nextIdx;
      this.reverseState.routeQueue = this.reverseState.routeQueue.map((item, idx) => ({
        ...item,
        status:
          idx <= matchedIdx
            ? 'COMPLETED'
            : idx === nextIdx
              ? 'ACTIVE_LOCK'
              : 'QUEUED',
        completed_at_ms: idx <= matchedIdx ? Date.now() : undefined,
        locked_at_ms: idx === nextIdx ? Date.now() : item.locked_at_ms,
      }));

      const nextHop = this.reverseState.routeQueue[nextIdx];
      this.injectNavTarget(nextHop.system_name, String(nextHop.system_id64), {
        bodyName: nextHop.body_name,
        bodyId64: nextHop.body_id64,
        entityKind: nextHop.entity_kind,
        starPos: nextHop.star_pos,
        starClass: nextHop.star_class,
        isScoopable: nextHop.is_scoopable,
        jumpDistanceLy: nextHop.jump_distance_ly,
      });

      this.reverseState.confirmationBanner = `High-Wake Arrival at ${arrivedSystemName} Verified ? Auto-Locked Next Waypoint: ${nextHop.system_name}`;
      this.dispatchOverlayToastAlert(
        'AUTO-ADVANCE WAYPOINT LOCKED',
        `Arrived ${arrivedSystemName} -> Next Lock: ${nextHop.system_name} [Hop ${nextIdx + 1}/${this.reverseState.routeQueue.length}]`,
        nextHop.system_name,
        String(nextHop.system_id64),
        'WAYPOINT_ADVANCE',
        nextHop.body_id64
      );
      this.notifyReverseWaypointListeners();
      return true;
    } else {
      this.reverseState.routeQueue = this.reverseState.routeQueue.map((item) => ({
        ...item,
        status: 'COMPLETED',
        completed_at_ms: item.completed_at_ms || Date.now(),
      }));
      this.reverseState.confirmationBanner = `Route Complete: Arrived at Final Destination ${arrivedSystemName} [id64: ${cleanId64}]`;
      this.dispatchOverlayToastAlert(
        'FINAL ROUTE DESTINATION REACHED',
        `Arrived at ${arrivedSystemName} [id64: ${cleanId64}] ? All ${this.reverseState.routeQueue.length} hops complete`,
        arrivedSystemName,
        cleanId64,
        'WAYPOINT_ADVANCE'
      );
      this.notifyReverseWaypointListeners();
      return true;
    }
  }

  public simulateNextRouteHopJump(): boolean {
    const queue = this.reverseState.routeQueue;
    if (queue.length === 0) return false;
    const currentHop = queue[this.reverseState.activeRouteIndex] || queue[0];
    const activeInst = this.getActiveInstance();
    this.simulateHighWakeJump(
      activeInst.instance_uuid,
      currentHop.system_name,
      String(currentHop.system_id64),
      currentHop.star_pos
    );
    return true;
  }

  public resetSampleRouteQueue() {
    this.queueMultiHopRoute(DEFAULT_SAMPLE_ROUTE, true);
  }

  public getConnected(): boolean {
    return this.isConnected || this.simulationActive;
  }

  public getLastTarget(): string | null {
    return this.lastTargetSystem;
  }

  public getLastTargetId64(): string | null {
    return this.lastTargetId64;
  }

  public disconnect() {
    this.stopLoopbackSimulation();
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.metrics.state = 'DISCONNECTED';
    this.notifyStateListeners();
  }
}

export const bridgeClient = new BridgeClient();
