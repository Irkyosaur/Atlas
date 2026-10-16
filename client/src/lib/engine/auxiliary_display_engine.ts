// Location: client/src/lib/engine/auxiliary_display_engine.ts
// Stage 15.3: Sim-Rig Secondary Screen Dashboards, PWA Screen Wake-Lock & Multi-Window Popout Engine
// Interfaces with navigator.wakeLock to prevent display standby during hands-off flight,
// manages BroadcastChannel telemetry synchronization across auxiliary popout windows,
// and persists multi-monitor layout configurations in localStorage.

export type MfdDashboardMode = 'COMBAT' | 'MINING' | 'EXPLORER';

export interface CombatTelemetryData {
  shieldPercent: number; // 0..100
  hullPercent: number; // 0..100
  targetLocked: boolean;
  targetName: string;
  targetShipType: string;
  targetShieldPercent: number;
  targetHullPercent: number;
  targetDistanceM: number;
  pips: {
    sys: number; // 0..4 (or 0..8 half pips)
    eng: number;
    wep: number;
  };
  hardpointsDeployed: boolean;
  isInDanger: boolean;
  beingInterdicted: boolean;
}

export interface RefineryBin {
  id: number;
  material: string;
  percent: number;
}

export interface MiningTelemetryData {
  cargoTons: number;
  cargoCapacity: number;
  cargoPercent: number;
  prospectorLimpetsActive: number;
  activeLimpetsMax: number;
  refineryBins: RefineryBin[];
  lastProspectedAsteroid?: {
    material1: string;
    percent1: number;
    material2?: string;
    percent2?: number;
    material3?: string;
    percent3?: number;
    remainingYieldPercent: number;
  };
}

export interface BioSignalDistance {
  genus: string;
  species: string;
  currentDistanceM: number;
  requiredDistanceM: number;
  sampleStep: 1 | 2 | 3;
  sampleReady: boolean;
  estimatedValueCr: number;
}

export interface ExplorerTelemetryData {
  currentSystem: string;
  bodyCountTotal: number;
  bodiesDiscovered: number;
  fssProgressPercent: number;
  dssMappedCount: number;
  dssEstimatedValueCr: number;
  highValueBodies: Array<{
    bodyName: string;
    bodyType: string; // e.g., 'Earth-like World', 'Terraformable Water World', 'Ammonia World'
    estimatedValueCr: number;
    isMapped: boolean;
    distanceLs: number;
  }>;
  bioSignals: BioSignalDistance[];
}

export interface AuxiliaryTelemetrySnapshot {
  timestamp: number;
  commanderName: string;
  activeShip: string;
  currentSystem: string;
  speedMs: number;
  altitudeM?: number;
  gravityG?: number;
  heading?: number;
  combat: CombatTelemetryData;
  mining: MiningTelemetryData;
  explorer: ExplorerTelemetryData;
}

export interface WindowLayoutConfig {
  id: string;
  title: string;
  mode: MfdDashboardMode;
  width: number;
  height: number;
  left: number;
  top: number;
  isBorderless: boolean;
  autoWakeLock: boolean;
}

export interface AuxiliaryLayoutPersistence {
  version: 1;
  lastUpdated: number;
  activeLayouts: Record<string, WindowLayoutConfig>;
}

export const BROADCAST_CHANNEL_NAME = 'atlas_auxiliary_mfd_telemetry';
export const STORAGE_KEY_LAYOUT = 'atlas_auxiliary_screen_layouts_v1';
export const STORAGE_KEY_TELEMETRY = 'atlas_auxiliary_last_telemetry_v1';

export const DEFAULT_AUXILIARY_TELEMETRY: AuxiliaryTelemetrySnapshot = {
  timestamp: Date.now(),
  commanderName: 'CMDR JAMESON',
  activeShip: 'ANACONDA MK I',
  currentSystem: 'SOL',
  speedMs: 245,
  altitudeM: 1250,
  gravityG: 1.02,
  heading: 184,
  combat: {
    shieldPercent: 100,
    hullPercent: 100,
    targetLocked: true,
    targetName: 'PIRATE CORVETTE',
    targetShipType: 'Federal Corvette',
    targetShieldPercent: 42,
    targetHullPercent: 88,
    targetDistanceM: 1840,
    pips: {
      sys: 2.0,
      eng: 1.0,
      wep: 3.0,
    },
    hardpointsDeployed: true,
    isInDanger: false,
    beingInterdicted: false,
  },
  mining: {
    cargoTons: 214,
    cargoCapacity: 256,
    cargoPercent: 83.6,
    prospectorLimpetsActive: 2,
    activeLimpetsMax: 4,
    refineryBins: [
      { id: 1, material: 'Painite', percent: 84 },
      { id: 2, material: 'Platinum', percent: 62 },
      { id: 3, material: 'Low Temperature Diamonds', percent: 95 },
      { id: 4, material: 'Osmium', percent: 12 },
    ],
    lastProspectedAsteroid: {
      material1: 'Platinum',
      percent1: 42.5,
      material2: 'Painite',
      percent2: 18.2,
      material3: 'Osmium',
      percent3: 8.7,
      remainingYieldPercent: 100,
    },
  },
  explorer: {
    currentSystem: 'HIP 22460',
    bodyCountTotal: 24,
    bodiesDiscovered: 18,
    fssProgressPercent: 75.0,
    dssMappedCount: 6,
    dssEstimatedValueCr: 12450000,
    highValueBodies: [
      {
        bodyName: 'HIP 22460 4',
        bodyType: 'Earth-like World',
        estimatedValueCr: 3250000,
        isMapped: true,
        distanceLs: 1240,
      },
      {
        bodyName: 'HIP 22460 5 a',
        bodyType: 'Terraformable Water World',
        estimatedValueCr: 2890000,
        isMapped: false,
        distanceLs: 1890,
      },
      {
        bodyName: 'HIP 22460 6',
        bodyType: 'Ammonia World',
        estimatedValueCr: 1720000,
        isMapped: true,
        distanceLs: 3410,
      },
    ],
    bioSignals: [
      {
        genus: 'Stratum',
        species: 'Stratum Tectonicas',
        currentDistanceM: 620,
        requiredDistanceM: 500,
        sampleStep: 2,
        sampleReady: true,
        estimatedValueCr: 19000000,
      },
      {
        genus: 'Tubus',
        species: 'Tubus Conifer',
        currentDistanceM: 310,
        requiredDistanceM: 800,
        sampleStep: 1,
        sampleReady: false,
        estimatedValueCr: 4500000,
      },
    ],
  },
};

export class AuxiliaryDisplayEngine {
  private wakeLockSentinel: any = null;
  private isWakeLockSupported: boolean = false;
  private isWakeLockActive: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private telemetryListeners: Set<(data: AuxiliaryTelemetrySnapshot) => void> = new Set();
  private wakeLockListeners: Set<(active: boolean) => void> = new Set();
  private currentTelemetry: AuxiliaryTelemetrySnapshot = { ...DEFAULT_AUXILIARY_TELEMETRY };
  private layoutCache: Record<string, WindowLayoutConfig> = {};
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    this.checkWakeLockSupport();
    this.initBroadcastChannel();
    this.loadLayoutConfig();
  }

  public checkWakeLockSupport(): boolean {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      this.isWakeLockSupported = true;
    } else {
      this.isWakeLockSupported = false;
    }
    return this.isWakeLockSupported;
  }

  public isSupported(): boolean {
    return this.isWakeLockSupported;
  }

  public getWakeLockState(): boolean {
    return this.isWakeLockActive;
  }

  /**
   * Request Screen Wake Lock API to prevent display sleep during hands-off flight
   */
  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      this.isWakeLockActive = false;
      this.notifyWakeLockChange();
      return false;
    }

    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.isWakeLockActive = true;

      this.wakeLockSentinel.addEventListener('release', () => {
        this.isWakeLockActive = false;
        this.wakeLockSentinel = null;
        this.notifyWakeLockChange();
      });

      // Automatically re-request wake lock when page regains visibility
      if (typeof document !== 'undefined' && !this.visibilityChangeHandler) {
        this.visibilityChangeHandler = async () => {
          if (document.visibilityState === 'visible' && !this.wakeLockSentinel && this.isWakeLockActive) {
            try {
              this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
            } catch {
              // Graceful failure
            }
          }
        };
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
      }

      this.notifyWakeLockChange();
      return true;
    } catch (err) {
      // In battery saver mode, background tab, or unsupported permissions
      this.isWakeLockActive = false;
      this.wakeLockSentinel = null;
      this.notifyWakeLockChange();
      return false;
    }
  }

  /**
   * Gracefully release screen wake lock
   */
  public async releaseWakeLock(): Promise<boolean> {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // Ignore release errors
      }
      this.wakeLockSentinel = null;
    }
    this.isWakeLockActive = false;
    this.notifyWakeLockChange();
    return true;
  }

  /**
   * Toggle wake lock on/off
   */
  public async toggleWakeLock(): Promise<boolean> {
    if (this.isWakeLockActive) {
      return this.releaseWakeLock();
    } else {
      return this.requestWakeLock();
    }
  }

  public onWakeLockChange(cb: (active: boolean) => void): () => void {
    this.wakeLockListeners.add(cb);
    cb(this.isWakeLockActive);
    return () => this.wakeLockListeners.delete(cb);
  }

  private notifyWakeLockChange() {
    for (const cb of this.wakeLockListeners) {
      try {
        cb(this.isWakeLockActive);
      } catch {
        // listener safety
      }
    }
  }

  /**
   * Setup BroadcastChannel for 60Hz/10Hz telemetry sync across windows
   */
  private initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          if (event && event.data && event.data.type === 'ATLAS_TELEMETRY_UPDATE') {
            const incoming: AuxiliaryTelemetrySnapshot = event.data.payload;
            if (incoming && incoming.timestamp) {
              this.currentTelemetry = incoming;
              this.notifyTelemetryChange(incoming);
            }
          } else if (event && event.data && event.data.type === 'ATLAS_REQUEST_TELEMETRY') {
            // New window opened and requested initial sync
            this.broadcastTelemetry(this.currentTelemetry);
          }
        };

        // Notify parent / existing windows that we need initial telemetry
        this.broadcastChannel.postMessage({ type: 'ATLAS_REQUEST_TELEMETRY' });
      } catch {
        this.broadcastChannel = null;
      }
    }
  }

  /**
   * Broadcast telemetry snapshot to all open auxiliary windows
   */
  public broadcastTelemetry(snapshot: AuxiliaryTelemetrySnapshot) {
    this.currentTelemetry = { ...snapshot, timestamp: Date.now() };
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ATLAS_TELEMETRY_UPDATE',
          payload: this.currentTelemetry,
        });
      } catch {
        // Fallback or buffer error
      }
    }

    // Persist snapshot to LocalStorage for cold popout boot
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_TELEMETRY, JSON.stringify(this.currentTelemetry));
      } catch {
        // Storage quota
      }
    }

    this.notifyTelemetryChange(this.currentTelemetry);
  }

  public getTelemetry(): AuxiliaryTelemetrySnapshot {
    return this.currentTelemetry;
  }

  public onTelemetryUpdate(cb: (data: AuxiliaryTelemetrySnapshot) => void): () => void {
    this.telemetryListeners.add(cb);
    cb(this.currentTelemetry);
    return () => this.telemetryListeners.delete(cb);
  }

  private notifyTelemetryChange(data: AuxiliaryTelemetrySnapshot) {
    for (const cb of this.telemetryListeners) {
      try {
        cb(data);
      } catch {
        // listener safety
      }
    }
  }

  /**
   * Multi-window popout generator via HTML5 window.open
   */
  public openPopoutWindow(
    mode: MfdDashboardMode,
    customConfig?: Partial<WindowLayoutConfig>
  ): Window | null {
    if (typeof window === 'undefined') return null;

    const saved = this.layoutCache[mode];
    const width = customConfig?.width || saved?.width || (mode === 'EXPLORER' ? 1024 : 960);
    const height = customConfig?.height || saved?.height || (mode === 'EXPLORER' ? 768 : 720);
    const left = customConfig?.left ?? saved?.left ?? Math.round((window.screen.availWidth - width) / 2);
    const top = customConfig?.top ?? saved?.top ?? Math.round((window.screen.availHeight - height) / 2);

    const windowFeatures = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'resizable=yes',
      'scrollbars=no',
    ].join(',');

    // URL targets popout route
    const url = `${window.location.origin}${window.location.pathname}?popout=mfd&mode=${mode.toLowerCase()}`;
    const windowName = `atlas_mfd_popout_${mode.toLowerCase()}`;

    const newWindow = window.open(url, windowName, windowFeatures);

    if (newWindow) {
      const config: WindowLayoutConfig = {
        id: mode.toLowerCase(),
        title: `${mode} MFD - Atlas Auxiliary`,
        mode,
        width,
        height,
        left,
        top,
        isBorderless: true,
        autoWakeLock: true,
      };
      this.saveLayoutConfig(mode, config);

      // Periodically monitor geometry if user repositions/resizes window
      const checkInterval = window.setInterval(() => {
        if (newWindow.closed) {
          window.clearInterval(checkInterval);
          return;
        }
        try {
          if (newWindow.outerWidth && newWindow.outerHeight) {
            this.saveLayoutConfig(mode, {
              ...config,
              width: newWindow.outerWidth,
              height: newWindow.outerHeight,
              left: newWindow.screenX,
              top: newWindow.screenY,
            });
          }
        } catch {
          // Cross-origin restriction (safe guard)
        }
      }, 3000);
    }

    return newWindow;
  }

  /**
   * Save and persist window layout to LocalStorage
   */
  public saveLayoutConfig(mode: MfdDashboardMode, config: WindowLayoutConfig) {
    this.layoutCache[mode] = config;
    if (typeof localStorage !== 'undefined') {
      try {
        const payload: AuxiliaryLayoutPersistence = {
          version: 1,
          lastUpdated: Date.now(),
          activeLayouts: this.layoutCache,
        };
        localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(payload));
      } catch {
        // Storage fail safe
      }
    }
  }

  public getLayoutConfig(mode: MfdDashboardMode): WindowLayoutConfig | undefined {
    return this.layoutCache[mode];
  }

  public getAllLayoutConfigs(): Record<string, WindowLayoutConfig> {
    return { ...this.layoutCache };
  }

  public loadLayoutConfig(): Record<string, WindowLayoutConfig> {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LAYOUT);
        if (raw) {
          const parsed = JSON.parse(raw) as AuxiliaryLayoutPersistence;
          if (parsed && parsed.activeLayouts) {
            this.layoutCache = parsed.activeLayouts;
          }
        }

        const rawTelemetry = localStorage.getItem(STORAGE_KEY_TELEMETRY);
        if (rawTelemetry) {
          const parsedTel = JSON.parse(rawTelemetry) as AuxiliaryTelemetrySnapshot;
          if (parsedTel) {
            this.currentTelemetry = parsedTel;
          }
        }
      } catch {
        // Fallback
      }
    }
    return this.layoutCache;
  }

  public resetLayoutDefaults() {
    this.layoutCache = {};
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_LAYOUT);
      } catch {
        // Safe guard
      }
    }
  }

  public destroy() {
    if (this.visibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    if (this.wakeLockSentinel) {
      this.releaseWakeLock();
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }
    this.telemetryListeners.clear();
    this.wakeLockListeners.clear();
  }
}

// Global Singleton Instance
export const auxiliaryDisplayEngine = new AuxiliaryDisplayEngine();
