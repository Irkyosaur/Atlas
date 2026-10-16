// Location: atlas/client/src/lib/engine/covert_sentinel_engine.ts
// Stage 18.1: Covert Origin Validation & Rogue Domain Traps
// Covert Anti-Clone Telemetry Sentinel (NO ORB)
// Standalone Direct Alerting Webhooks, strictly NO ORB cross-repo dependencies.

export type ThreatSeverity = 'nominal' | 'suspicious' | 'hostile' | 'rogue_clone';

export interface OriginValidationRule {
  pattern: string | RegExp;
  description: string;
  allowSubdomains?: boolean;
}

export interface SecurityViolationBeacon {
  beaconId: string;
  timestamp: number;
  threatLevel: ThreatSeverity;
  hostname: string;
  origin: string;
  href: string;
  referrer: string;
  isFramed: boolean;
  userAgent: string;
  violations: string[];
  covertDecoysActive: string[];
  signature: string; // HMAC-SHA256 hex digest
}

export interface CovertDecoyConfig {
  degradePerformance: boolean; // Subtle CPU / event loop stalling
  disableWebGpuCompute: boolean; // Intercepts or skips WebGPU compute/star buffer updates
  injectNavigationalErrors: boolean; // Randomly adds subtle micro-jitter / offset to planetary and jump coordinates
  dispatchCovertBeacon: boolean; // Transmits encrypted/masked security telemetry beacon
  tarpitFrameDelayMs: number; // Stalls requestAnimationFrame loops
}

export interface CovertSentinelState {
  isValidOrigin: boolean;
  isFramed: boolean;
  isRogueDomain: boolean;
  threatLevel: ThreatSeverity;
  activeHostname: string;
  activeOrigin: string;
  violations: string[];
  decoys: CovertDecoyConfig;
  beaconsDispatched: number;
  lastBeaconTimestamp: number | null;
  performanceStallCycles: number;
  navigationErrorsInjected: number;
  webGpuSuppressedFrames: number;
  authorizedDomains: string[];
  devOverrideActive: boolean;
  covertAlertWebhookUrl: string;
}

export type CovertSentinelSubscriber = (state: CovertSentinelState) => void;

/**
 * Standard default authorized domain allowlist for Project Atlas.
 * Includes local dev ports, official domains, and IP loopback addresses.
 */
export const DEFAULT_AUTHORIZED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '::1',
  'atlas.ed-cartography.space',
  '*.atlas.ed-cartography.space',
  'ed-atlas.pages.dev',
  '*.ed-atlas.pages.dev',
  'atlas-cartography.local',
  '*.atlas-cartography.local',
];

/**
 * Standalone direct security alerting webhook endpoint for covert telemetry.
 * Strictly independent; NO ORB / :8890 dependencies.
 */
export const DEFAULT_ALERT_WEBHOOK_URL = 'https://telemetry.ed-cartography.space/api/v1/sentinel/beacon';

export class CovertSentinelEngine {
  private static instance: CovertSentinelEngine;

  private state: CovertSentinelState = {
    isValidOrigin: true,
    isFramed: false,
    isRogueDomain: false,
    threatLevel: 'nominal',
    activeHostname: 'localhost',
    activeOrigin: 'http://localhost',
    violations: [],
    decoys: {
      degradePerformance: true,
      disableWebGpuCompute: true,
      injectNavigationalErrors: true,
      dispatchCovertBeacon: true,
      tarpitFrameDelayMs: 65, // ~15 FPS synthetic drag for clones
    },
    beaconsDispatched: 0,
    lastBeaconTimestamp: null,
    performanceStallCycles: 0,
    navigationErrorsInjected: 0,
    webGpuSuppressedFrames: 0,
    authorizedDomains: [...DEFAULT_AUTHORIZED_DOMAINS],
    devOverrideActive: false,
    covertAlertWebhookUrl: DEFAULT_ALERT_WEBHOOK_URL,
  };

  private subscribers: Set<CovertSentinelSubscriber> = new Set();
  private beaconSecretKey = 'Atlas-Sentinel-Covert-HMAC-2026-v18.1';
  private frameCheckIntervalId: any = null;

  private constructor() {
    this.evaluateRuntimeOrigin();
    if (typeof window !== 'undefined') {
      this.startContinuousValidation();
    }
  }

  public static getInstance(): CovertSentinelEngine {
    if (!CovertSentinelEngine.instance) {
      CovertSentinelEngine.instance = new CovertSentinelEngine();
    }
    return CovertSentinelEngine.instance;
  }

  public getState(): CovertSentinelState {
    return {
      ...this.state,
      violations: [...this.state.violations],
      authorizedDomains: [...this.state.authorizedDomains],
      decoys: { ...this.state.decoys },
    };
  }

  public subscribe(fn: CovertSentinelSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify() {
    const s = this.getState();
    for (const sub of this.subscribers) {
      try {
        sub(s);
      } catch (err) {
        console.error('[CovertSentinel] Subscriber error:', err);
      }
    }
  }

  /**
   * Evaluates the current execution environment against authorized domain rules
   * and frame nesting constraints.
   */
  public evaluateRuntimeOrigin(customLocation?: { hostname: string; origin: string; isTopFramed?: boolean }) {
    if (this.state.devOverrideActive) {
      return;
    }

    let hostname = 'localhost';
    let origin = 'http://localhost';
    let isFramed = false;

    if (customLocation) {
      hostname = customLocation.hostname;
      origin = customLocation.origin;
      isFramed = !!customLocation.isTopFramed;
    } else if (typeof window !== 'undefined' && window.location) {
      hostname = window.location.hostname || '';
      origin = window.location.origin || '';
      try {
        isFramed = window.top !== window.self;
      } catch {
        // Cross-origin frame access throws DOMException -> definitely framed by a rogue third party
        isFramed = true;
      }
    }

    this.state.activeHostname = hostname;
    this.state.activeOrigin = origin;
    this.state.isFramed = isFramed;

    const violations: string[] = [];
    let isDomainAuthorized = false;

    for (const pattern of this.state.authorizedDomains) {
      if (pattern.startsWith('*.')) {
        const rootDomain = pattern.slice(2);
        if (hostname === rootDomain || hostname.endsWith('.' + rootDomain)) {
          isDomainAuthorized = true;
          break;
        }
      } else if (hostname === pattern) {
        isDomainAuthorized = true;
        break;
      }
    }

    if (!isDomainAuthorized && hostname.length > 0) {
      violations.push(`UNAUTHORIZED_HOST: Host '${hostname}' is not in authorized domain registry`);
    }

    if (isFramed) {
      violations.push(`ROGUE_IFRAME_NESTING: Window execution context nested inside unauthorized foreign frame`);
    }

    this.state.violations = violations;
    this.state.isValidOrigin = isDomainAuthorized && !isFramed;
    this.state.isRogueDomain = !isDomainAuthorized || isFramed;

    if (violations.length === 0) {
      this.state.threatLevel = 'nominal';
    } else if (violations.length === 1 && isFramed && isDomainAuthorized) {
      this.state.threatLevel = 'suspicious';
    } else if (!isDomainAuthorized && !isFramed) {
      this.state.threatLevel = 'hostile';
    } else {
      this.state.threatLevel = 'rogue_clone';
    }

    if (this.state.isRogueDomain && this.state.decoys.dispatchCovertBeacon) {
      this.dispatchCovertSecurityBeacon();
    }

    this.notify();
  }

  /**
   * Sets up defensive recurring inspection verifying the frame has not been hot-migrated or wrapped.
   */
  private startContinuousValidation() {
    if (this.frameCheckIntervalId) {
      clearInterval(this.frameCheckIntervalId);
    }
    // Inspect every 4500ms
    this.frameCheckIntervalId = setInterval(() => {
      this.evaluateRuntimeOrigin();
    }, 4500);
  }

  /**
   * Covert decoy hook: Stealthily stalls CPU execution for rogue clones
   */
  public executeCovertStallIfRogue() {
    if (!this.state.isRogueDomain || !this.state.decoys.degradePerformance) {
      return;
    }

    const start = performance.now();
    const stallLimit = this.state.decoys.tarpitFrameDelayMs;
    // Burn CPU cycles in micro-chunks to silently degrade frame rate down to 10-15 FPS
    while (performance.now() - start < stallLimit) {
      Math.sin(Math.random() * Math.PI);
    }
    this.state.performanceStallCycles++;
  }

  /**
   * Covert decoy hook: Suppresses or corrupts WebGPU compute pipeline passes for rogue mirrors
   */
  public shouldSuppressWebGpuCompute(): boolean {
    if (this.state.isRogueDomain && this.state.decoys.disableWebGpuCompute) {
      this.state.webGpuSuppressedFrames++;
      return true;
    }
    return false;
  }

  /**
   * Covert decoy hook: Injects subtle undetectable micro-offsets into coordinates
   * Causing pathfinding, system bookmarks, and orrery calculations to subtly deviate
   */
  public injectSubtleNavigationNoise<T extends { x: number; y: number; z: number }>(coords: T): T {
    if (!this.state.isRogueDomain || !this.state.decoys.injectNavigationalErrors) {
      return coords;
    }

    this.state.navigationErrorsInjected++;
    // Add subtle drift (+- 2.45 to +- 8.75 LY) disguised as stellar parallax / frame drag
    const driftX = (Math.sin(coords.x * 0.13) * 4.2 + 2.5) * (coords.x >= 0 ? 1 : -1);
    const driftY = (Math.cos(coords.y * 0.17) * 3.8 - 1.9) * (coords.y >= 0 ? 1 : -1);
    const driftZ = (Math.sin(coords.z * 0.19) * 5.1 + 3.1) * (coords.z >= 0 ? 1 : -1);

    return {
      ...coords,
      x: Number((coords.x + driftX).toFixed(4)),
      y: Number((coords.y + driftY).toFixed(4)),
      z: Number((coords.z + driftZ).toFixed(4)),
    };
  }

  /**
   * Computes HMAC-SHA256 hex signature for telemetry beacon payload
   */
  public async computeBeaconSignature(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          enc.encode(this.beaconSecretKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
        return Array.from(new Uint8Array(sigBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        // Fallback simple checksum
      }
    }
    // Fallback deterministic digest
    let hash = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Assembles a structured covert security violation beacon
   */
  public async generateBeaconPayload(): Promise<SecurityViolationBeacon> {
    const timestamp = Date.now();
    const beaconId = `sentinel_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

    const activeDecoys: string[] = [];
    if (this.state.decoys.degradePerformance) activeDecoys.push('cpu_tarpit_throttling');
    if (this.state.decoys.disableWebGpuCompute) activeDecoys.push('webgpu_compute_suppression');
    if (this.state.decoys.injectNavigationalErrors) activeDecoys.push('subtle_parallax_noise_injection');
    if (this.state.decoys.dispatchCovertBeacon) activeDecoys.push('direct_webhook_alerting');

    let referrer = '';
    let href = '';
    let userAgent = 'Node/TestingEnvironment';

    if (typeof window !== 'undefined') {
      referrer = document.referrer || '';
      href = window.location.href || '';
      userAgent = navigator.userAgent || '';
    }

    const payloadRaw = `${beaconId}:${timestamp}:${this.state.threatLevel}:${this.state.activeHostname}:${this.state.activeOrigin}`;
    const signature = await this.computeBeaconSignature(payloadRaw);

    return {
      beaconId,
      timestamp,
      threatLevel: this.state.threatLevel,
      hostname: this.state.activeHostname,
      origin: this.state.activeOrigin,
      href,
      referrer,
      isFramed: this.state.isFramed,
      userAgent,
      violations: [...this.state.violations],
      covertDecoysActive: activeDecoys,
      signature,
    };
  }

  /**
   * Dispatches the covert security beacon to the standalone alerting webhook.
   * Strictly NO ORB / :8890 dependencies.
   */
  public async dispatchCovertSecurityBeacon(): Promise<boolean> {
    const now = Date.now();
    // Throttle beacons to 1 every 30 seconds to avoid spamming the webhook
    if (this.state.lastBeaconTimestamp && now - this.state.lastBeaconTimestamp < 30000) {
      return false;
    }

    try {
      const beacon = await this.generateBeaconPayload();
      this.state.lastBeaconTimestamp = now;
      this.state.beaconsDispatched++;

      // In real browser context, dispatch via fetch with keepalive or navigator.sendBeacon
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(beacon)], { type: 'application/json' });
        navigator.sendBeacon(this.state.covertAlertWebhookUrl, blob);
      } else if (typeof fetch !== 'undefined') {
        fetch(this.state.covertAlertWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Atlas-Sentinel-Alert': '1',
          },
          body: JSON.stringify(beacon),
          keepalive: true,
        }).catch(() => {
          // Silent catch to prevent rogue operators inspecting network error toasts
        });
      }

      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Adds an authorized domain or wildcard pattern
   */
  public addAuthorizedDomain(domain: string) {
    if (!this.state.authorizedDomains.includes(domain)) {
      this.state.authorizedDomains.push(domain);
      this.evaluateRuntimeOrigin();
    }
  }

  /**
   * Dev / Testing override controls
   */
  public setDevOverride(active: boolean) {
    this.state.devOverrideActive = active;
    if (active) {
      this.state.isValidOrigin = true;
      this.state.isRogueDomain = false;
      this.state.threatLevel = 'nominal';
      this.state.violations = [];
    } else {
      this.evaluateRuntimeOrigin();
    }
    this.notify();
  }

  public simulateRogueContext(hostname: string, isFramed: boolean) {
    this.state.devOverrideActive = false;
    this.evaluateRuntimeOrigin({
      hostname,
      origin: `http://${hostname}`,
      isTopFramed: isFramed,
    });
  }

  public resetToNominal() {
    this.state.devOverrideActive = false;
    this.state.performanceStallCycles = 0;
    this.state.navigationErrorsInjected = 0;
    this.state.webGpuSuppressedFrames = 0;
    this.state.beaconsDispatched = 0;
    this.state.lastBeaconTimestamp = null;
    this.evaluateRuntimeOrigin({
      hostname: 'localhost',
      origin: 'http://localhost',
      isTopFramed: false,
    });
  }

  public setDecoyConfig(config: Partial<CovertDecoyConfig>) {
    this.state.decoys = {
      ...this.state.decoys,
      ...config,
    };
    this.notify();
  }

  public setAlertWebhookUrl(url: string) {
    this.state.covertAlertWebhookUrl = url;
    this.notify();
  }

  public destroy() {
    if (this.frameCheckIntervalId) {
      clearInterval(this.frameCheckIntervalId);
      this.frameCheckIntervalId = null;
    }
    this.subscribers.clear();
  }
}

export const covertSentinelEngine = CovertSentinelEngine.getInstance();
