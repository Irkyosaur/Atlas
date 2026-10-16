// Location: atlas/client/src/lib/engine/honeypot_engine.ts
// Stage 17.4: Headless Browser & Automated Scraper Honeypots
// Defends Atlas cartography APIs and 3D data streams against automated crawlers, headless scripts, and scrapers.

export interface ScraperDetectionSignal {
  id: string;
  category: 'webdriver' | 'cdp' | 'plugin' | 'canvas' | 'behavior' | 'honeypot_dom' | 'honeypot_network';
  description: string;
  weight: number; // 0 to 100 severity weight
  detectedAt: number;
  metadata?: Record<string, any>;
}

export interface ScraperTelemetryState {
  isScraperDetected: boolean;
  threatScore: number; // 0 - 100 composite score
  signals: ScraperDetectionSignal[];
  honeypotTrips: number;
  decoyResponsesPoisoned: number;
  tarpitDelaysEnforced: number;
  totalTarpitLatencyMs: number;
  lastTripTimestamp: number | null;
  tarpitDelayMs: number; // Current enforced tarpit delay (e.g. 1500ms - 4500ms)
  poisonModeEnabled: boolean;
  decoyCoordinateOffsetRange: number; // Extent of synthetic coordinate poisoning
}

export interface PoisonedCoordinate {
  x: number;
  y: number;
  z: number;
  name: string;
  isPoisoned: boolean;
}

export type HoneypotSubscriber = (state: ScraperTelemetryState) => void;

export class HoneypotEngine {
  private static instance: HoneypotEngine;

  private state: ScraperTelemetryState = {
    isScraperDetected: false,
    threatScore: 0,
    signals: [],
    honeypotTrips: 0,
    decoyResponsesPoisoned: 0,
    tarpitDelaysEnforced: 0,
    totalTarpitLatencyMs: 0,
    lastTripTimestamp: null,
    tarpitDelayMs: 2500,
    poisonModeEnabled: true,
    decoyCoordinateOffsetRange: 15000,
  };

  private subscribers: Set<HoneypotSubscriber> = new Set();
  private mouseMoveTimestamps: number[] = [];
  private mouseMoveVelocities: number[] = [];
  private lastMousePos: { x: number; y: number } | null = null;
  private hasInitializedListeners = false;

  private constructor() {
    this.runInitialHeuristics();
    if (typeof window !== 'undefined') {
      this.attachBehavioralListeners();
    }
  }

  public static getInstance(): HoneypotEngine {
    if (!HoneypotEngine.instance) {
      HoneypotEngine.instance = new HoneypotEngine();
    }
    return HoneypotEngine.instance;
  }

  public getState(): ScraperTelemetryState {
    return {
      ...this.state,
      signals: [...this.state.signals],
    };
  }

  public subscribe(fn: HoneypotSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify() {
    const currentState = this.getState();
    for (const sub of this.subscribers) {
      try {
        sub(currentState);
      } catch (err) {
        console.error('Error in honeypot subscriber notification:', err);
      }
    }
  }

  /**
   * Evaluates client environment heuristics for automated headless signatures
   * Puppeteer, Playwright, Selenium, missing plugins, CDP artifacts, canvas tampering
   */
  public runInitialHeuristics(): ScraperDetectionSignal[] {
    const detected: ScraperDetectionSignal[] = [];

    if (typeof window === 'undefined') {
      return detected;
    }

    const nav = navigator as any;
    const win = window as any;

    // 1. Webdriver flag check (standard W3C headless automation)
    if (nav.webdriver === true || 'webdriver' in nav) {
      detected.push({
        id: 'webdriver-flag-active',
        category: 'webdriver',
        description: 'navigator.webdriver flag is active or present',
        weight: 45,
        detectedAt: Date.now(),
        metadata: { webdriver: nav.webdriver },
      });
    }

    // 2. Playwright / Puppeteer CDP artifacts & globals
    const cdpArtifacts = [
      '__puppeteer_evaluation_script__',
      '__playwright_evaluation_script__',
      '__playwright',
      '__puppeteer',
      '_Selenium_IDE_Recorder',
      '_selenium',
      'callSelenium',
      '_WEBDRIVER_ELEM_CACHE',
      'domAutomation',
      'domAutomationController',
      '__webdriver_script_fn',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped',
    ];

    for (const artifact of cdpArtifacts) {
      if (artifact in win || artifact in document) {
        detected.push({
          id: `cdp-artifact-${artifact}`,
          category: 'cdp',
          description: `CDP automation global detected: ${artifact}`,
          weight: 60,
          detectedAt: Date.now(),
          metadata: { artifact },
        });
      }
    }

    // 3. DocumentElement attribute checks injected by headless drivers
    if (document.documentElement) {
      const docAttrs = document.documentElement.attributes;
      const headlessAttrs = ['webdriver', 'selenium', 'driver'];
      for (let i = 0; i < docAttrs.length; i++) {
        const attrName = docAttrs[i].name.toLowerCase();
        if (headlessAttrs.some(h => attrName.includes(h))) {
          detected.push({
            id: `doc-attr-${attrName}`,
            category: 'webdriver',
            description: `Document root attribute '${attrName}' suggests headless wrapper`,
            weight: 40,
            detectedAt: Date.now(),
            metadata: { attrName },
          });
        }
      }
    }

    // 4. Missing plugins check (Standard Chrome has plugins, headless often empty array or undefined)
    if (nav.plugins && nav.plugins.length === 0 && !/Mobile|Android|iPhone/i.test(nav.userAgent)) {
      detected.push({
        id: 'empty-plugins-array',
        category: 'plugin',
        description: 'Desktop browser reports empty navigator.plugins list (Headless signature)',
        weight: 25,
        detectedAt: Date.now(),
        metadata: { length: nav.plugins.length },
      });
    }

    // 5. Missing languages check
    if (!nav.languages || (Array.isArray(nav.languages) && nav.languages.length === 0)) {
      detected.push({
        id: 'empty-languages-list',
        category: 'plugin',
        description: 'navigator.languages is missing or empty array',
        weight: 30,
        detectedAt: Date.now(),
      });
    }

    // 6. Chrome runtime object anomalies in Chrome user agent
    const isChrome = /Chrome/.test(nav.userAgent) && !/Edge|Edg|OPR/.test(nav.userAgent);
    if (isChrome && (!win.chrome || !win.chrome.runtime)) {
      detected.push({
        id: 'chrome-runtime-missing',
        category: 'cdp',
        description: 'Chrome user-agent without standard window.chrome properties',
        weight: 35,
        detectedAt: Date.now(),
      });
    }

    // 7. Canvas Fingerprint Tampering / Noise Heuristics
    const canvasResult = this.evaluateCanvasFingerprint();
    if (canvasResult.isTampered) {
      detected.push({
        id: 'canvas-fingerprint-tampering',
        category: 'canvas',
        description: canvasResult.reason || 'Canvas 2D render anomaly / synthetic anti-fingerprint noise detected',
        weight: 35,
        detectedAt: Date.now(),
        metadata: canvasResult.metadata,
      });
    }

    for (const sig of detected) {
      this.recordSignal(sig);
    }

    return detected;
  }

  /**
   * Renders an offscreen canvas and validates consistency of toDataURL and getContext
   */
  public evaluateCanvasFingerprint(): { isTampered: boolean; reason?: string; metadata?: any } {
    if (typeof document === 'undefined') {
      return { isTampered: false };
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { isTampered: true, reason: 'Failed to obtain 2D rendering context on valid canvas' };
      }

      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Atlas_Carto_42', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Atlas_Carto_42', 4, 17);

      const dataUrl1 = canvas.toDataURL();
      const dataUrl2 = canvas.toDataURL();

      // Inconsistent repeated toDataURL indicates canvas noise injection extensions
      if (dataUrl1 !== dataUrl2) {
        return {
          isTampered: true,
          reason: 'Canvas toDataURL returned non-deterministic hashes on sequential calls (noise injector)',
          metadata: { hash1Len: dataUrl1.length, hash2Len: dataUrl2.length },
        };
      }

      if (dataUrl1.length < 50) {
        return {
          isTampered: true,
          reason: 'Canvas toDataURL returned degenerate data payload',
          metadata: { len: dataUrl1.length },
        };
      }

      return { isTampered: false };
    } catch (e: any) {
      return { isTampered: true, reason: `Canvas inspection threw exception: ${e?.message}` };
    }
  }

  /**
   * Tracks user interaction kinematics (mouse move velocity, acceleration, jump teleportation)
   * Automated bots move instantly (0 elapsed ms) or with infinite velocity across large delta distances.
   */
  private attachBehavioralListeners() {
    if (this.hasInitializedListeners || typeof window === 'undefined') return;
    this.hasInitializedListeners = true;

    window.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        const now = performance.now();
        if (this.lastMousePos) {
          const dx = e.clientX - this.lastMousePos.x;
          const dy = e.clientY - this.lastMousePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dt = now - (this.mouseMoveTimestamps[this.mouseMoveTimestamps.length - 1] || now);

          if (dt > 0) {
            const velocity = dist / dt; // pixels per ms
            this.mouseMoveVelocities.push(velocity);
            if (this.mouseMoveVelocities.length > 50) {
              this.mouseMoveVelocities.shift();
            }

            // Extreme jump velocity without human interpolation (e.g. > 15 px/ms over large dist)
            // or 0 elapsed time for a 500+ pixel jump
            if (dist > 400 && dt < 4) {
              this.recordSignal({
                id: 'instantaneous-teleport-mouse',
                category: 'behavior',
                description: `Instantaneous mouse jump detected (${dist.toFixed(0)}px in ${dt.toFixed(1)}ms)`,
                weight: 35,
                detectedAt: Date.now(),
                metadata: { dist, dt, velocity },
              });
            }
          }
        }

        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.mouseMoveTimestamps.push(now);
        if (this.mouseMoveTimestamps.length > 50) {
          this.mouseMoveTimestamps.shift();
        }
      },
      { passive: true }
    );
  }

  /**
   * Manually records an automated scraper detection signal
   */
  public recordSignal(signal: ScraperDetectionSignal): void {
    // Avoid duplicate signals of same id within 15 seconds
    const existing = this.state.signals.find(
      s => s.id === signal.id && Math.abs(s.detectedAt - signal.detectedAt) < 15000
    );
    if (existing) return;

    this.state.signals.unshift(signal);
    if (this.state.signals.length > 50) {
      this.state.signals.pop();
    }

    this.recomputeThreatScore();
  }

  /**
   * Invoked when an invisible DOM trap / CSS honeypot link or form element is accessed or clicked
   */
  public tripHoneypot(trapName: string, trapCategory: 'css_trap' | 'clip_path' | 'link_trap' | 'hidden_input' = 'link_trap'): void {
    this.state.honeypotTrips += 1;
    this.state.lastTripTimestamp = Date.now();

    this.recordSignal({
      id: `honeypot-${trapName}-${Date.now()}`,
      category: 'honeypot_dom',
      description: `Inconspicuous DOM trap triggered: ${trapName} (${trapCategory})`,
      weight: 85, // Direct honeypot access is nearly 100% indicative of scraper/crawler
      detectedAt: Date.now(),
      metadata: { trapName, trapCategory },
    });
  }

  /**
   * Recomputes composite threat score (0 - 100)
   */
  private recomputeThreatScore(): void {
    let score = 0;
    for (const sig of this.state.signals) {
      score += sig.weight;
    }
    // Trips add direct penalty
    score += this.state.honeypotTrips * 50;

    this.state.threatScore = Math.min(100, score);
    this.state.isScraperDetected = this.state.threatScore >= 50;

    // Adjust tarpit delay dynamically based on threat score (1000ms up to 5000ms)
    if (this.state.isScraperDetected) {
      this.state.tarpitDelayMs = Math.round(1500 + (this.state.threatScore / 100) * 3500);
    }

    this.notify();
  }

  /**
   * Applies tarpit latency delay if scraper detection threshold is met
   */
  public async applyTarpitDelayIfNeeded(): Promise<number> {
    if (!this.state.isScraperDetected) {
      return 0;
    }

    const delay = this.state.tarpitDelayMs;
    this.state.tarpitDelaysEnforced += 1;
    this.state.totalTarpitLatencyMs += delay;
    this.notify();

    await new Promise((resolve) => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * Generates poisoned synthetic cartography coordinates or alters response data for detected scrapers
   */
  public poisonCoordinates(coords: { x: number; y: number; z: number; name?: string }): PoisonedCoordinate {
    if (!this.state.isScraperDetected || !this.state.poisonModeEnabled) {
      return {
        x: coords.x,
        y: coords.y,
        z: coords.z,
        name: coords.name || 'System',
        isPoisoned: false,
      };
    }

    this.state.decoyResponsesPoisoned += 1;
    this.notify();

    // Deterministic pseudo-random offset based on threat score
    const range = this.state.decoyCoordinateOffsetRange;
    const offsetX = Math.sin(coords.x + 13.37) * range;
    const offsetY = Math.cos(coords.y + 42.42) * (range * 0.4);
    const offsetZ = Math.sin(coords.z + 99.99) * range;

    return {
      x: Math.round((coords.x + offsetX) * 100) / 100,
      y: Math.round((coords.y + offsetY) * 100) / 100,
      z: Math.round((coords.z + offsetZ) * 100) / 100,
      name: coords.name ? `DECOY-${coords.name}` : 'DECOY-SYS',
      isPoisoned: true,
    };
  }

  /**
   * Tarpit / Decoy wrapper for cartography array responses
   */
  public poisonSystemRecords<T extends { x: number; y: number; z: number; name: string }>(records: T[]): T[] {
    if (!this.state.isScraperDetected || !this.state.poisonModeEnabled || records.length === 0) {
      return records;
    }

    return records.map((rec, idx) => {
      const poisoned = this.poisonCoordinates(rec);
      return {
        ...rec,
        x: poisoned.x,
        y: poisoned.y,
        z: poisoned.z,
        name: idx % 3 === 0 ? `DECOY_${rec.name}` : rec.name,
      };
    });
  }

  /**
   * Configuration setters & simulation test helpers
   */
  public setPoisonMode(enabled: boolean): void {
    this.state.poisonModeEnabled = enabled;
    this.notify();
  }

  public setTarpitDelay(ms: number): void {
    this.state.tarpitDelayMs = Math.max(0, ms);
    this.notify();
  }

  public resetDefenseState(): void {
    this.state = {
      isScraperDetected: false,
      threatScore: 0,
      signals: [],
      honeypotTrips: 0,
      decoyResponsesPoisoned: 0,
      tarpitDelaysEnforced: 0,
      totalTarpitLatencyMs: 0,
      lastTripTimestamp: null,
      tarpitDelayMs: 2500,
      poisonModeEnabled: true,
      decoyCoordinateOffsetRange: 15000,
    };
    this.notify();
  }

  /**
   * Simulate a bot or crawler detection event for integration testing & UI verification
   */
  public simulateBotDetection(simulatedType: 'puppeteer' | 'honeypot_click' | 'canvas_noise' | 'mouse_teleport'): void {
    switch (simulatedType) {
      case 'puppeteer':
        this.recordSignal({
          id: `sim-puppeteer-${Date.now()}`,
          category: 'webdriver',
          description: 'Simulated Puppeteer/Playwright CDP environment detected (navigator.webdriver=true)',
          weight: 60,
          detectedAt: Date.now(),
        });
        break;
      case 'honeypot_click':
        this.tripHoneypot('simulated_crawler_trap_link', 'clip_path');
        break;
      case 'canvas_noise':
        this.recordSignal({
          id: `sim-canvas-${Date.now()}`,
          category: 'canvas',
          description: 'Simulated canvas noise injector / non-deterministic fingerprinting tampering',
          weight: 45,
          detectedAt: Date.now(),
        });
        break;
      case 'mouse_teleport':
        this.recordSignal({
          id: `sim-mouse-${Date.now()}`,
          category: 'behavior',
          description: 'Simulated instantaneous coordinate teleportation (600px in 0ms)',
          weight: 40,
          detectedAt: Date.now(),
        });
        break;
    }
  }
}

export const honeypotEngine = HoneypotEngine.getInstance();
