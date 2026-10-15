// Location: atlas/client/src/lib/engine/wing_logistics_engine.ts
// Wing Logistics Tracker & Shared Construction Progress Engine (Phase 08, Stage 8.4)
// Multi-user real-time delivery ledger, CMDR hauling claims, and shortfall sync.

import {
  ASSET_CONSTRUCTION_RECIPES,
  type AssetRecipeKey,
  type AssetBomSummary,
  generateAssetBomSummary,
} from './colonisation_bom_engine';

export interface WingCmdr {
  id: string;
  name: string;
  shipModel: string;
  cargoCapacityTons: number;
  currentSystem: string;
  colorHex: string;
  isOnline: boolean;
  avatarSeed: string;
  joinedAt: number;
}

export interface CommodityClaim {
  id: string;
  cmdrId: string;
  cmdrName: string;
  commodityId: string;
  commodityName: string;
  allocatedTonnage: number;
  claimedAt: number;
  status: 'active' | 'in_transit' | 'completed' | 'abandoned';
}

export interface DeliveryAuditRecord {
  id: string;
  timestamp: number;
  cmdrId: string;
  cmdrName: string;
  commodityId: string;
  commodityName: string;
  tonnageDelivered: number;
  previousShortfall: number;
  remainingShortfall: number;
  siteName: string;
  systemName: string;
  note?: string;
}

export interface WingSessionState {
  sessionId: string;
  sessionName: string;
  passcode?: string;
  systemName: string;
  siteName: string;
  targetAssetKey: AssetRecipeKey;
  hostCmdrId: string;
  createdAt: number;
  lastUpdated: number;
  
  // Real-time synchronization network status
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'simulated';
  simulatedBroadcastMode: boolean;
  activePeerCount: number;

  // Active commanders in this session
  commanders: Record<string, WingCmdr>;
  
  // Hauling allocations / claims
  claims: CommodityClaim[];
  
  // Delivered amounts per commodity (keyed by commodityId)
  deliveredAmounts: Record<string, number>;
  
  // Full chronological audit log
  auditLog: DeliveryAuditRecord[];
}

export type WingSessionListener = (state: WingSessionState) => void;

// Pre-seeded commanders for realistic wing simulation and collaboration
export const MOCK_WING_MEMBERS: WingCmdr[] = [
  {
    id: 'cmdr_jameson',
    name: 'CMDR Jameson Alpha',
    shipModel: 'Imperial Cutter',
    cargoCapacityTons: 728,
    currentSystem: 'Shinrarta Dezhra',
    colorHex: '#38bdf8', // Sky blue
    isOnline: true,
    avatarSeed: 'jameson',
    joinedAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'cmdr_vanguard',
    name: 'CMDR Vanguard IX',
    shipModel: 'Type-9 Heavy',
    cargoCapacityTons: 784,
    currentSystem: 'Sol',
    colorHex: '#f59e0b', // Amber
    isOnline: true,
    avatarSeed: 'vanguard',
    joinedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'cmdr_elysia',
    name: 'CMDR Elysia Star',
    shipModel: 'Type-8 Transporter',
    cargoCapacityTons: 406,
    currentSystem: 'Lave',
    colorHex: '#10b981', // Emerald
    isOnline: true,
    avatarSeed: 'elysia',
    joinedAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'cmdr_coriolis_walker',
    name: 'CMDR Coriolis Walker',
    shipModel: 'Python',
    cargoCapacityTons: 280,
    currentSystem: 'Gateway',
    colorHex: '#a855f7', // Purple
    isOnline: true,
    avatarSeed: 'walker',
    joinedAt: Date.now() - 1800000,
  },
];

const LOCAL_STORAGE_KEY = 'atlas_wing_logistics_session_v1';
const BROADCAST_CHANNEL_NAME = 'atlas_wing_logistics_broadcast';

export class WingLogisticsEngine {
  private state: WingSessionState;
  private listeners: Set<WingSessionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private webSocket: WebSocket | null = null;
  private simulationInterval: any = null;
  private isSimulatedWorkerActive = false;

  constructor() {
    this.state = this.loadInitialState();
    this.initBroadcastChannel();
  }

  private loadInitialState(): WingSessionState {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.sessionId && parsed.deliveredAmounts) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to parse cached wing session:', err);
      }
    }

    // Default pristine session for Planetary Outpost Tier 1 (Stage 8.2 & 8.4 spec)
    const initialAssetKey: AssetRecipeKey = 'planetary_outpost_t1';
    const defaultSite = 'Haven City Alpha';
    const defaultSystem = 'HIP 97950';

    // Seed reasonable baseline deliveries
    const defaultDelivered: Record<string, number> = {
      surface_stabilisers: 240, // 320 total
      steel: 400,               // 540 total
      ceramic_composites: 180,  // 280 total
      titanium: 200,            // 680 total
      insulating_membrane: 60,  // 210 total
    };

    const initialClaims: CommodityClaim[] = [
      {
        id: 'claim_1',
        cmdrId: 'cmdr_vanguard',
        cmdrName: 'CMDR Vanguard IX',
        commodityId: 'titanium',
        commodityName: 'Titanium',
        allocatedTonnage: 350,
        claimedAt: Date.now() - 1200000,
        status: 'in_transit',
      },
      {
        id: 'claim_2',
        cmdrId: 'cmdr_jameson',
        cmdrName: 'CMDR Jameson Alpha',
        commodityId: 'steel',
        commodityName: 'Steel',
        allocatedTonnage: 140,
        claimedAt: Date.now() - 600000,
        status: 'in_transit',
      },
      {
        id: 'claim_3',
        cmdrId: 'cmdr_elysia',
        cmdrName: 'CMDR Elysia Star',
        commodityId: 'surface_stabilisers',
        commodityName: 'Surface Stabilisers',
        allocatedTonnage: 80,
        claimedAt: Date.now() - 300000,
        status: 'active',
      },
    ];

    const initialAudit: DeliveryAuditRecord[] = [
      {
        id: 'audit_init_1',
        timestamp: Date.now() - 7200000,
        cmdrId: 'cmdr_jameson',
        cmdrName: 'CMDR Jameson Alpha',
        commodityId: 'surface_stabilisers',
        commodityName: 'Surface Stabilisers',
        tonnageDelivered: 240,
        previousShortfall: 320,
        remainingShortfall: 80,
        siteName: defaultSite,
        systemName: defaultSystem,
        note: 'Initial batch drop for bedrock anchors',
      },
      {
        id: 'audit_init_2',
        timestamp: Date.now() - 5400000,
        cmdrId: 'cmdr_vanguard',
        cmdrName: 'CMDR Vanguard IX',
        commodityId: 'steel',
        commodityName: 'Steel',
        tonnageDelivered: 400,
        previousShortfall: 540,
        remainingShortfall: 140,
        siteName: defaultSite,
        systemName: defaultSystem,
        note: 'Delivered foundation steel pylons',
      },
      {
        id: 'audit_init_3',
        timestamp: Date.now() - 3600000,
        cmdrId: 'cmdr_elysia',
        cmdrName: 'CMDR Elysia Star',
        commodityId: 'ceramic_composites',
        commodityName: 'Ceramic Composites',
        tonnageDelivered: 180,
        previousShortfall: 280,
        remainingShortfall: 100,
        siteName: defaultSite,
        systemName: defaultSystem,
        note: 'Bedrock sealant ceramics',
      },
      {
        id: 'audit_init_4',
        timestamp: Date.now() - 1800000,
        cmdrId: 'cmdr_vanguard',
        cmdrName: 'CMDR Vanguard IX',
        commodityId: 'titanium',
        commodityName: 'Titanium',
        tonnageDelivered: 200,
        previousShortfall: 680,
        remainingShortfall: 480,
        siteName: defaultSite,
        systemName: defaultSystem,
        note: 'First load of structural bulkheads',
      },
    ];

    const commandersMap: Record<string, WingCmdr> = {};
    for (const m of MOCK_WING_MEMBERS) {
      commandersMap[m.id] = { ...m };
    }

    return {
      sessionId: 'WING-COLONY-97950',
      sessionName: 'Haven City Alpha Construction Wing',
      passcode: 'ATLAS-WING',
      systemName: defaultSystem,
      siteName: defaultSite,
      targetAssetKey: initialAssetKey,
      hostCmdrId: 'cmdr_jameson',
      createdAt: Date.now() - 86400000,
      lastUpdated: Date.now(),
      connectionStatus: 'simulated',
      simulatedBroadcastMode: true,
      activePeerCount: 4,
      commanders: commandersMap,
      claims: initialClaims,
      deliveredAmounts: defaultDelivered,
      auditLog: initialAudit,
    };
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        this.handleInboundBroadcast(event.data);
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or failed to initialize:', e);
    }
  }

  private handleInboundBroadcast(message: any) {
    if (message.sessionId !== this.state.sessionId) return;

    switch (message.type) {
      case 'WING_DELIVERY_LOGGED':
        if (message.deliveryRecord) {
          const record: DeliveryAuditRecord = message.deliveryRecord;
          // Apply delivery update
          const cur = this.state.deliveredAmounts[record.commodityId] || 0;
          this.state.deliveredAmounts[record.commodityId] = cur + record.tonnageDelivered;
          this.state.auditLog.unshift(record);
          this.state.lastUpdated = Date.now();
          this.persistAndNotify();
        }
        break;

      case 'WING_CLAIM_ADDED':
        if (message.claim) {
          this.state.claims.push(message.claim);
          this.state.lastUpdated = Date.now();
          this.persistAndNotify();
        }
        break;

      case 'WING_CLAIM_STATUS':
        if (message.claimId && message.status) {
          const target = this.state.claims.find((c) => c.id === message.claimId);
          if (target) {
            target.status = message.status;
            this.state.lastUpdated = Date.now();
            this.persistAndNotify();
          }
        }
        break;

      case 'WING_CLAIM_DELETED':
        if (message.claimId) {
          this.state.claims = this.state.claims.filter((c) => c.id !== message.claimId);
          this.state.lastUpdated = Date.now();
          this.persistAndNotify();
        }
        break;

      case 'WING_STATE_SYNC':
        if (message.state && message.state.lastUpdated > this.state.lastUpdated) {
          this.state = {
            ...message.state,
            connectionStatus: this.state.connectionStatus,
            simulatedBroadcastMode: this.state.simulatedBroadcastMode,
          };
          this.persistAndNotify();
        }
        break;
    }
  }

  private broadcast(payload: any) {
    const fullPayload = {
      ...payload,
      sessionId: this.state.sessionId,
      senderTimestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullPayload);
      } catch (err) {
        console.error('BroadcastChannel post error:', err);
      }
    }

    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      try {
        this.webSocket.send(JSON.stringify(fullPayload));
      } catch (err) {
        console.error('WebSocket send error:', err);
      }
    }
  }

  private persistAndNotify() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        // storage overflow or private mode
      }
    }
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('Wing listener error:', err);
      }
    }
  }

  public getState(): WingSessionState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public subscribe(listener: WingSessionListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Connect to an external or local WebSocket server for multi-user sync
   */
  public connectWebSocket(url: string = 'ws://127.0.0.1:8999') {
    if (typeof window === 'undefined') return;

    if (this.webSocket) {
      try {
        this.webSocket.close();
      } catch {}
      this.webSocket = null;
    }

    this.state.connectionStatus = 'connecting';
    this.persistAndNotify();

    try {
      this.webSocket = new WebSocket(url);

      this.webSocket.onopen = () => {
        this.state.connectionStatus = 'connected';
        this.broadcast({
          type: 'WING_JOIN_ROOM',
          sessionId: this.state.sessionId,
        });
        this.persistAndNotify();
      };

      this.webSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleInboundBroadcast(msg);
        } catch {}
      };

      this.webSocket.onclose = () => {
        this.state.connectionStatus = this.state.simulatedBroadcastMode ? 'simulated' : 'disconnected';
        this.persistAndNotify();
      };

      this.webSocket.onerror = () => {
        this.state.connectionStatus = this.state.simulatedBroadcastMode ? 'simulated' : 'disconnected';
        this.persistAndNotify();
      };
    } catch {
      this.state.connectionStatus = this.state.simulatedBroadcastMode ? 'simulated' : 'disconnected';
      this.persistAndNotify();
    }
  }

  /**
   * Toggle simulated real-time broadcast client.
   * Periodically generates peer deliveries and updates to demonstrate live sync.
   */
  public toggleSimulation(enabled?: boolean) {
    const target = enabled !== undefined ? enabled : !this.state.simulatedBroadcastMode;
    this.state.simulatedBroadcastMode = target;
    if (target) {
      this.state.connectionStatus = 'simulated';
      this.startSimulationWorker();
    } else {
      this.stopSimulationWorker();
      if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
        this.state.connectionStatus = 'disconnected';
      }
    }
    this.persistAndNotify();
  }

  private startSimulationWorker() {
    if (this.simulationInterval) return;
    this.simulationInterval = setInterval(() => {
      if (!this.state.simulatedBroadcastMode) return;
      this.triggerSimulatedWingDelivery();
    }, 28000); // Trigger a peer delivery every 28 seconds
  }

  private stopSimulationWorker() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Simulates an inbound delivery from another wing commander in real time
   */
  public triggerSimulatedWingDelivery(customCmdrId?: string) {
    const peers = Object.values(this.state.commanders).filter((c) => c.id !== 'cmdr_local');
    if (peers.length === 0) return;

    const cmdr = customCmdrId
      ? this.state.commanders[customCmdrId] || peers[0]
      : peers[Math.floor(Math.random() * peers.length)];

    const bom = this.calculateCurrentBom();
    // Find commodities with incomplete tonnage
    const pendingCommodities = bom.commodities.filter((c) => c.remainingTonnage > 0);
    if (pendingCommodities.length === 0) return;

    const commodity = pendingCommodities[Math.floor(Math.random() * pendingCommodities.length)];
    // Tonnage delivery: either a full cargo run or remaining amount
    const maxCargo = cmdr.cargoCapacityTons || 728;
    const delivered = Math.min(commodity.remainingTonnage, Math.min(maxCargo, Math.floor(Math.random() * 300) + 150));

    if (delivered <= 0) return;

    this.logCommodityDelivery({
      cmdrId: cmdr.id,
      cmdrName: cmdr.name,
      commodityId: commodity.commodityId,
      commodityName: commodity.name,
      tonnageDelivered: delivered,
      note: `Automated wing peer drop via ${cmdr.shipModel}`,
    });
  }

  /**
   * Log completed commodity deliveries against a colonisation BOM (Requirements 2, 4).
   * Automatically computes previousShortfall and remainingShortfall for the delivery audit history.
   */
  public logCommodityDelivery(params: {
    cmdrId: string;
    cmdrName: string;
    commodityId: string;
    commodityName: string;
    tonnageDelivered: number;
    note?: string;
  }): DeliveryAuditRecord {
    const { cmdrId, cmdrName, commodityId, commodityName, tonnageDelivered, note } = params;

    const bom = this.calculateCurrentBom();
    const existingReq = bom.commodities.find((c) => c.commodityId === commodityId);
    const totalRequired = existingReq ? existingReq.totalRequiredTonnage : tonnageDelivered;
    const currentDelivered = this.state.deliveredAmounts[commodityId] || 0;
    
    const previousShortfall = Math.max(0, totalRequired - currentDelivered);
    const newDelivered = currentDelivered + tonnageDelivered;
    const remainingShortfall = Math.max(0, totalRequired - newDelivered);

    this.state.deliveredAmounts[commodityId] = newDelivered;

    // Check if this fulfills any active claims
    for (const claim of this.state.claims) {
      if (claim.commodityId === commodityId && claim.cmdrId === cmdrId && claim.status !== 'completed') {
        if (newDelivered >= totalRequired || claim.allocatedTonnage <= tonnageDelivered) {
          claim.status = 'completed';
        }
      }
    }

    const auditRecord: DeliveryAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      cmdrId,
      cmdrName,
      commodityId,
      commodityName,
      tonnageDelivered,
      previousShortfall,
      remainingShortfall,
      siteName: this.state.siteName,
      systemName: this.state.systemName,
      note,
    };

    this.state.auditLog.unshift(auditRecord);
    // Keep audit history bounded to recent 200 events
    if (this.state.auditLog.length > 200) {
      this.state.auditLog = this.state.auditLog.slice(0, 200);
    }

    this.state.lastUpdated = Date.now();

    // Broadcast change
    this.broadcast({
      type: 'WING_DELIVERY_LOGGED',
      deliveryRecord: auditRecord,
    });

    this.persistAndNotify();
    return auditRecord;
  }

  /**
   * Claim a hauling allocation for a commodity (Requirement 2)
   */
  public claimAllocation(params: {
    cmdrId: string;
    cmdrName: string;
    commodityId: string;
    commodityName: string;
    allocatedTonnage: number;
  }): CommodityClaim {
    const claim: CommodityClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      cmdrId: params.cmdrId,
      cmdrName: params.cmdrName,
      commodityId: params.commodityId,
      commodityName: params.commodityName,
      allocatedTonnage: params.allocatedTonnage,
      claimedAt: Date.now(),
      status: 'active',
    };

    this.state.claims.push(claim);
    this.state.lastUpdated = Date.now();

    this.broadcast({
      type: 'WING_CLAIM_ADDED',
      claim,
    });

    this.persistAndNotify();
    return claim;
  }

  /**
   * Update the status of a hauling allocation
   */
  public updateClaimStatus(claimId: string, status: CommodityClaim['status']) {
    const claim = this.state.claims.find((c) => c.id === claimId);
    if (!claim) return;
    claim.status = status;
    this.state.lastUpdated = Date.now();

    this.broadcast({
      type: 'WING_CLAIM_STATUS',
      claimId,
      status,
    });

    this.persistAndNotify();
  }

  /**
   * Release or abandon a hauling claim
   */
  public removeClaim(claimId: string) {
    this.state.claims = this.state.claims.filter((c) => c.id !== claimId);
    this.state.lastUpdated = Date.now();

    this.broadcast({
      type: 'WING_CLAIM_DELETED',
      claimId,
    });

    this.persistAndNotify();
  }

  /**
   * Set target colonisation asset for the wing session
   */
  public setTargetAsset(assetKey: AssetRecipeKey, siteName?: string, systemName?: string) {
    this.state.targetAssetKey = assetKey;
    if (siteName) this.state.siteName = siteName;
    if (systemName) this.state.systemName = systemName;
    this.state.lastUpdated = Date.now();

    this.broadcast({
      type: 'WING_STATE_SYNC',
      state: this.state,
    });

    this.persistAndNotify();
  }

  /**
   * Update or register a CMDR in the session
   */
  public registerCmdr(cmdr: WingCmdr) {
    this.state.commanders[cmdr.id] = { ...cmdr };
    this.state.lastUpdated = Date.now();
    this.persistAndNotify();
  }

  /**
   * Reset session progress back to initial baseline or empty
   */
  public resetSession(empty: boolean = false) {
    if (empty) {
      this.state.deliveredAmounts = {};
      this.state.claims = [];
      this.state.auditLog = [];
    } else {
      this.state = this.loadInitialState();
    }
    this.state.lastUpdated = Date.now();

    this.broadcast({
      type: 'WING_STATE_SYNC',
      state: this.state,
    });

    this.persistAndNotify();
  }

  /**
   * Calculate current live BOM progress using colonisation_bom_engine
   */
  public calculateCurrentBom(): AssetBomSummary {
    return generateAssetBomSummary(
      this.state.targetAssetKey,
      this.state.siteName,
      this.state.deliveredAmounts,
      {} // no isolated cockpit cargo
    );
  }
}

// Global Singleton Engine
export const wingLogisticsEngine = new WingLogisticsEngine();
