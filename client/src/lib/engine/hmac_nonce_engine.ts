// Location: atlas/client/src/lib/engine/hmac_nonce_engine.ts
// Stage 17.2: Dynamic 30s HMAC Nonce Challenge Architecture
// Cryptographically secure rolling 30-second HMAC nonce generator, replay rejection tracking,
// dual-window clock skew tolerance (±1 step), and request signature generator for outbound REST requests.

export const DEFAULT_HMAC_SECRET = 'ananke_atlas_hmac_shared_secret_2026';
export const HMAC_WINDOW_SECONDS = 30;
export const MAX_REPLAY_HISTORY = 10_000;

export interface HmacNonceState {
  currentWindowEpoch: number; // Current 30s window number: Math.floor(Date.now() / 30000)
  secondsRemaining: number; // 0..30 seconds left in current window
  activeNonceId: string; // Current rolling nonce ID
  currentWindowSecret: string; // Active derived/negotiated secret
  totalSignaturesGenerated: number;
  totalVerifications: number;
  replaysDetected: number;
  lastSignatureTimestamp: number | null;
  lastSignatureHex: string | null;
  lastNonceId: string | null;
}

export interface HmacSignatureHeaders {
  'X-Atlas-Nonce-Id': string;
  'X-Atlas-Nonce'?: string; // Standard alias
  'X-Atlas-Timestamp': string;
  'X-Atlas-Signature': string;
  'X-Atlas-Window-Remaining'?: string;
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  windowEpoch?: number;
  skewStep?: number; // -1, 0, or +1
}

/**
 * Native WebCrypto HMAC-SHA256 with pure-JS fallback for testing or non-secure contexts.
 */
export async function hmacSha256Hex(key: string | Uint8Array, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = typeof key === 'string' ? enc.encode(key) : key;
  const msgBytes = enc.encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.importKey && crypto.subtle.sign) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
      const byteView = new Uint8Array(signatureBuffer);
      let hex = '';
      for (let i = 0; i < byteView.length; i++) {
        hex += byteView[i].toString(16).padStart(2, '0');
      }
      return hex;
    } catch {
      // Fallback
    }
  }

  return pureHmacSha256(keyBytes, msgBytes);
}

/**
 * Pure TypeScript HMAC-SHA256 implementation (RFC 2104 compliant)
 */
function pureHmacSha256(key: Uint8Array, message: Uint8Array): string {
  const BLOCK_SIZE = 64; // SHA-256 block size is 512 bits = 64 bytes
  let derivedKey = new Uint8Array(BLOCK_SIZE);

  if (key.length > BLOCK_SIZE) {
    // Hash key if longer than block size
    const hashed = pureSha256Bytes(key);
    derivedKey.set(hashed);
  } else {
    derivedKey.set(key);
  }

  const oPad = new Uint8Array(BLOCK_SIZE);
  const iPad = new Uint8Array(BLOCK_SIZE);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    oPad[i] = derivedKey[i] ^ 0x5c;
    iPad[i] = derivedKey[i] ^ 0x36;
  }

  // Inner hash: SHA-256(iPad || message)
  const innerPayload = new Uint8Array(BLOCK_SIZE + message.length);
  innerPayload.set(iPad, 0);
  innerPayload.set(message, BLOCK_SIZE);
  const innerHash = pureSha256Bytes(innerPayload);

  // Outer hash: SHA-256(oPad || innerHash)
  const outerPayload = new Uint8Array(BLOCK_SIZE + innerHash.length);
  outerPayload.set(oPad, 0);
  outerPayload.set(innerHash, BLOCK_SIZE);
  const outerHash = pureSha256Bytes(outerPayload);

  let hex = '';
  for (let i = 0; i < outerHash.length; i++) {
    hex += outerHash[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Returns raw 32-byte Uint8Array hash for pure SHA-256
 */
function pureSha256Bytes(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const withPad = new Uint8Array(((len + 8) >> 6 << 6) + 64);
  withPad.set(data);
  withPad[len] = 0x80;

  const view = new DataView(withPad.buffer);
  view.setUint32(withPad.length - 4, bitLen, false);

  const w = new Uint32Array(64);
  for (let i = 0; i < withPad.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3);
      const s1 = ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + s1 + ch + K[t] + w[t]) >>> 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const outView = new DataView(result.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return result;
}

/**
 * Nonce Challenge & Request Signature Engine
 */
export class HmacNonceEngine {
  private static instance: HmacNonceEngine | null = null;

  private masterSecret: string = DEFAULT_HMAC_SECRET;
  private windowSecs: number = HMAC_WINDOW_SECONDS;
  private replayCache: Map<number, Set<string>> = new Map(); // windowEpoch -> Set of nonceIds/keys
  private timerId: any = null;
  private listeners: Set<(state: HmacNonceState) => void> = new Set();

  private state: HmacNonceState = {
    currentWindowEpoch: 0,
    secondsRemaining: 30,
    activeNonceId: '',
    currentWindowSecret: '',
    totalSignaturesGenerated: 0,
    totalVerifications: 0,
    replaysDetected: 0,
    lastSignatureTimestamp: null,
    lastSignatureHex: null,
    lastNonceId: null,
  };

  public static getInstance(): HmacNonceEngine {
    if (!HmacNonceEngine.instance) {
      HmacNonceEngine.instance = new HmacNonceEngine();
    }
    return HmacNonceEngine.instance;
  }

  constructor(masterSecret = DEFAULT_HMAC_SECRET, windowSecs = HMAC_WINDOW_SECONDS) {
    this.masterSecret = masterSecret;
    this.windowSecs = windowSecs;
    this.updateClock();

    if (typeof window !== 'undefined' || typeof setInterval !== 'undefined') {
      this.timerId = setInterval(() => {
        this.updateClock();
      }, 1000);
    }
  }

  public destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.listeners.clear();
  }

  public getState(): HmacNonceState {
    return { ...this.state };
  }

  public subscribe(cb: (state: HmacNonceState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  /**
   * Derives a rotating salt or secret for a specific 30-second window epoch.
   * secret(epoch) = HMAC(masterSecret, "atlas-epoch:" + epoch)
   */
  public async deriveWindowSecret(epoch: number): Promise<string> {
    return hmacSha256Hex(this.masterSecret, `atlas-epoch:${epoch}`);
  }

  /**
   * Generates a rolling deterministic/time-synced nonce for a given window epoch.
   * nonce(epoch) = "atn_" + slice(HMAC(derivedSecret, "atlas-window:" + epoch), 0, 16)
   */
  public async generateRollingNonceId(epoch: number): Promise<string> {
    const windowSecret = await this.deriveWindowSecret(epoch);
    const hash = await hmacSha256Hex(windowSecret, `atlas-window:${epoch}`);
    return `atn_${hash.slice(0, 16)}`;
  }

  /**
   * Generates a unique per-request nonce ID incorporating client randomness and the active window
   */
  public generateUniqueNonceId(epoch = this.state.currentWindowEpoch): string {
    const entropy = Math.random().toString(36).slice(2, 10);
    return `atn_${epoch}_${entropy}`;
  }

  /**
   * Updates current time window, seconds remaining, and active rolling nonce.
   */
  public updateClock(nowMs = Date.now()): void {
    const nowSec = Math.floor(nowMs / 1000);
    const epoch = Math.floor(nowSec / this.windowSecs);
    const elapsedInWindow = nowSec % this.windowSecs;
    const remaining = this.windowSecs - elapsedInWindow;

    const epochChanged = epoch !== this.state.currentWindowEpoch;
    this.state.currentWindowEpoch = epoch;
    this.state.secondsRemaining = remaining;

    if (epochChanged || !this.state.activeNonceId) {
      // Async update active rolling nonce
      this.deriveWindowSecret(epoch).then((sec) => {
        this.state.currentWindowSecret = sec;
        this.generateRollingNonceId(epoch).then((nonceId) => {
          this.state.activeNonceId = nonceId;
          this.pruneOldWindows(epoch);
          this.notify();
        });
      });
    } else {
      this.notify();
    }
  }

  /**
   * Removes cached replay records outside the dual-window tolerance range (epoch - 2).
   */
  private pruneOldWindows(currentEpoch: number): void {
    for (const epoch of this.replayCache.keys()) {
      if (epoch < currentEpoch - 2 || epoch > currentEpoch + 2) {
        this.replayCache.delete(epoch);
      }
    }
  }

  /**
   * Generates canonical HTTP request signature payload matching Ananke server-side expectations:
   * format: "{method}:{path_and_query}:{timestamp}:{nonce}"
   */
  public formatCanonicalPayload(method: string, pathAndQuery: string, timestampSec: number, nonce?: string): string {
    const cleanMethod = method.toUpperCase();
    const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
    if (nonce && nonce.trim().length > 0) {
      return `${cleanMethod}:${cleanPath}:${timestampSec}:${nonce.trim()}`;
    }
    return `${cleanMethod}:${cleanPath}:${timestampSec}`;
  }

  /**
   * Signs an outbound request with HMAC-SHA256, returning required Atlas headers:
   * - X-Atlas-Nonce-Id (and alias X-Atlas-Nonce)
   * - X-Atlas-Timestamp
   * - X-Atlas-Signature
   * - X-Atlas-Window-Remaining
   */
  public async signRequest(
    method: string,
    pathAndQuery: string,
    customNonceId?: string,
    timestampSec?: number
  ): Promise<HmacSignatureHeaders> {
    const ts = timestampSec ?? Math.floor(Date.now() / 1000);
    const epoch = Math.floor(ts / this.windowSecs);
    const nonceId = customNonceId || this.generateUniqueNonceId(epoch);

    const payload = this.formatCanonicalPayload(method, pathAndQuery, ts, nonceId);
    const signatureHex = await hmacSha256Hex(this.masterSecret, payload);

    // Register into local tracker
    this.markNonceRedeemed(epoch, nonceId, signatureHex, ts);

    this.state.totalSignaturesGenerated++;
    this.state.lastSignatureTimestamp = ts;
    this.state.lastSignatureHex = signatureHex;
    this.state.lastNonceId = nonceId;
    this.notify();

    return {
      'X-Atlas-Nonce-Id': nonceId,
      'X-Atlas-Nonce': nonceId,
      'X-Atlas-Timestamp': ts.toString(),
      'X-Atlas-Signature': signatureHex,
      'X-Atlas-Window-Remaining': this.state.secondsRemaining.toString(),
    };
  }

  /**
   * Registers a nonce as redeemed within an epoch window.
   */
  public markNonceRedeemed(epoch: number, nonceId: string, signatureHex: string, timestampSec: number): void {
    if (!this.replayCache.has(epoch)) {
      this.replayCache.set(epoch, new Set());
    }
    const replayKey = `${timestampSec}:${nonceId}:${signatureHex}`;
    const windowSet = this.replayCache.get(epoch)!;
    windowSet.add(replayKey);
    windowSet.add(nonceId); // Also track nonceId directly
  }

  /**
   * Verifies an incoming or outbound request signature with dual-window clock skew tolerance (±1 step / ±30s).
   * Checks for replay attacks.
   */
  public async verifyRequest(
    method: string,
    pathAndQuery: string,
    signatureHex: string,
    timestampSec: number,
    nonceId?: string,
    nowSec?: number
  ): Promise<VerificationResult> {
    this.state.totalVerifications++;
    const currentNowSec = nowSec ?? Math.floor(Date.now() / 1000);
    const clientEpoch = Math.floor(timestampSec / this.windowSecs);
    const serverEpoch = Math.floor(currentNowSec / this.windowSecs);

    // 1. Dual-window clock skew tolerance (±1 time step)
    const epochDiff = clientEpoch - serverEpoch;
    if (Math.abs(epochDiff) > 1) {
      this.notify();
      return {
        valid: false,
        reason: `Clock skew exceeded dual-window tolerance: client epoch ${clientEpoch} vs server epoch ${serverEpoch} (diff ${epochDiff} > ±1)`,
        windowEpoch: clientEpoch,
        skewStep: epochDiff,
      };
    }

    // Also check raw drift within windowSecs (e.g. 30s)
    const driftSec = Math.abs(currentNowSec - timestampSec);
    if (driftSec > this.windowSecs * 2) {
      this.notify();
      return {
        valid: false,
        reason: `Timestamp drift ${driftSec}s exceeds max allowable tolerance (${this.windowSecs * 2}s)`,
        windowEpoch: clientEpoch,
        skewStep: epochDiff,
      };
    }

    // 2. Replay protection check
    const replayKey = nonceId ? `${timestampSec}:${nonceId}:${signatureHex}` : `${timestampSec}:${signatureHex}`;
    const windowSet = this.replayCache.get(clientEpoch);
    if (windowSet) {
      if (windowSet.has(replayKey) || (nonceId && windowSet.has(nonceId))) {
        this.state.replaysDetected++;
        this.notify();
        return {
          valid: false,
          reason: 'Replay attack detected: nonce or signature already redeemed in active window',
          windowEpoch: clientEpoch,
          skewStep: epochDiff,
        };
      }
    }

    // 3. Cryptographic HMAC verification
    const payload = this.formatCanonicalPayload(method, pathAndQuery, timestampSec, nonceId);
    const expectedSig = await hmacSha256Hex(this.masterSecret, payload);

    if (expectedSig.toLowerCase() !== signatureHex.toLowerCase()) {
      this.notify();
      return {
        valid: false,
        reason: 'HMAC signature mismatch',
        windowEpoch: clientEpoch,
        skewStep: epochDiff,
      };
    }

    // 4. Record as redeemed in cache
    if (nonceId) {
      this.markNonceRedeemed(clientEpoch, nonceId, signatureHex, timestampSec);
    }

    this.notify();
    return {
      valid: true,
      windowEpoch: clientEpoch,
      skewStep: epochDiff,
    };
  }

  /**
   * Resets replay cache (primarily for tests or key rotation).
   */
  public resetReplayCache(): void {
    this.replayCache.clear();
    this.state.replaysDetected = 0;
    this.state.totalVerifications = 0;
    this.state.totalSignaturesGenerated = 0;
    this.notify();
  }

  /**
   * Set custom master secret (for secret negotiation).
   */
  public setMasterSecret(secret: string): void {
    this.masterSecret = secret;
    this.updateClock();
  }

  public getMasterSecret(): string {
    return this.masterSecret;
  }
}

export const hmacNonceEngine = HmacNonceEngine.getInstance();
