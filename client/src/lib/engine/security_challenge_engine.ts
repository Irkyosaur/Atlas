// Location: atlas/client/src/lib/engine/security_challenge_engine.ts
// Stage 17.1: Cloudflare Turnstile & Micro-PoW Challenge Engine
// Protects high-volume cartography / route search APIs against scraping bots.

import { hmacNonceEngine } from './hmac_nonce_engine';

export interface MicroPoWChallenge {
  seed: string;
  difficulty: number; // Number of leading zero hex chars required (typically 3 to 6) or leading zero bits
  algorithm: 'SHA-256';
  expiresAt: number; // UNIX timestamp ms
  salt?: string;
}

export interface MicroPoWSolution {
  seed: string;
  nonce: number;
  hash: string;
  timestamp: number;
  elapsedMs: number;
  leadingZeroBits: number;
}

export interface SecurityTokenState {
  isTurnstileVerified: boolean;
  turnstileToken: string | null;
  turnstileTimestamp: number | null;
  lastPoWSolution: MicroPoWSolution | null;
  powDifficulty: number;
  totalChallengesSolved: number;
  bypassDevMode: boolean;
}

export interface SecurityHeaders {
  'X-Atlas-PoW-Nonce'?: string;
  'X-Atlas-PoW-Hash'?: string;
  'X-Atlas-PoW-Timestamp'?: string;
  'X-Atlas-PoW-Difficulty'?: string;
  'X-Atlas-Turnstile-Token'?: string;
  'X-Atlas-Client-Sec'?: string;
  'X-Atlas-Nonce-Id'?: string;
  'X-Atlas-Nonce'?: string;
  'X-Atlas-Timestamp'?: string;
  'X-Atlas-Signature'?: string;
  'X-Atlas-Window-Remaining'?: string;
}

/**
 * Native WebCrypto SHA-256 helper with fallback for non-secure / test contexts
 */
export async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const buffer = await crypto.subtle.digest('SHA-256', data);
    const byteView = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < byteView.length; i++) {
      hex += byteView[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // Fallback pure-JS SHA-256 implementation for headless or testing without subtle crypto
  return pureSha256(data);
}

/**
 * Pure TypeScript SHA-256 implementation (RFC 6234 compliant)
 * Used when crypto.subtle is inaccessible (e.g. non-HTTPS test runners)
 */
function pureSha256(data: Uint8Array): string {
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

  // Append 64-bit length in big-endian
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

  const parts = [h0, h1, h2, h3, h4, h5, h6, h7];
  return parts.map(val => val.toString(16).padStart(8, '0')).join('');
}

/**
 * Counts leading zero bits of a hex hash string
 */
export function countLeadingZeroBits(hexStr: string): number {
  let count = 0;
  for (let i = 0; i < hexStr.length; i++) {
    const nibble = parseInt(hexStr[i], 16);
    if (isNaN(nibble)) break;
    if (nibble === 0) {
      count += 4;
    } else {
      if ((nibble & 0b1000) === 0) {
        count += 1;
        if ((nibble & 0b0100) === 0) {
          count += 1;
          if ((nibble & 0b0010) === 0) {
            count += 1;
          }
        }
      }
      break;
    }
  }
  return count;
}

export class SecurityChallengeEngine {
  private static instance: SecurityChallengeEngine | null = null;
  private state: SecurityTokenState = {
    isTurnstileVerified: false,
    turnstileToken: null,
    turnstileTimestamp: null,
    lastPoWSolution: null,
    powDifficulty: 12, // Default 12 bits leading zeros (~4,096 hashes, solves in ~5-15ms)
    totalChallengesSolved: 0,
    bypassDevMode: false,
  };

  private listeners: Set<(state: SecurityTokenState) => void> = new Set();

  public static getInstance(): SecurityChallengeEngine {
    if (!SecurityChallengeEngine.instance) {
      SecurityChallengeEngine.instance = new SecurityChallengeEngine();
    }
    return SecurityChallengeEngine.instance;
  }

  constructor() {
    // Check if in development or offline mode
    if (typeof window !== 'undefined') {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const urlParams = new URLSearchParams(window.location.search);
      const devBypass = urlParams.get('sec_dev_bypass') === '1';
      if (isDev && devBypass) {
        this.state.bypassDevMode = true;
      }
    }
  }

  public getState(): SecurityTokenState {
    return { ...this.state };
  }

  public subscribe(cb: (state: SecurityTokenState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  /**
   * Set or update proof-of-work difficulty (in leading zero bits)
   */
  public setDifficulty(bits: number): void {
    this.state.powDifficulty = Math.max(4, Math.min(24, bits));
    this.notify();
  }

  /**
   * Toggle dev bypass mode
   */
  public setDevBypass(bypass: boolean): void {
    this.state.bypassDevMode = bypass;
    this.notify();
  }

  /**
   * Record verified Cloudflare Turnstile token
   */
  public setTurnstileToken(token: string | null): void {
    this.state.turnstileToken = token;
    this.state.isTurnstileVerified = !!token;
    this.state.turnstileTimestamp = token ? Date.now() : null;
    this.notify();
  }

  /**
   * Generates a local seed / challenge if the remote gateway didn't supply one
   */
  public generateClientChallenge(difficultyBits = this.state.powDifficulty): MicroPoWChallenge {
    const entropy = Math.random().toString(36).slice(2) + Date.now().toString(36);
    return {
      seed: `atlas_chal_${entropy}`,
      difficulty: difficultyBits,
      algorithm: 'SHA-256',
      expiresAt: Date.now() + 60_000, // Valid for 60s
    };
  }

  /**
   * Solves a Micro-PoW challenge by searching for a nonce satisfying the difficulty
   */
  public async solveChallenge(challenge: MicroPoWChallenge, maxIterations = 500_000): Promise<MicroPoWSolution> {
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const requiredBits = challenge.difficulty;
    const seed = challenge.seed;
    const timestamp = Date.now();

    let nonce = 0;
    while (nonce < maxIterations) {
      // Input payload: seed:timestamp:nonce
      const payload = `${seed}:${timestamp}:${nonce}`;
      const hash = await sha256Hex(payload);
      const leadingBits = countLeadingZeroBits(hash);

      if (leadingBits >= requiredBits) {
        const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
        const solution: MicroPoWSolution = {
          seed,
          nonce,
          hash,
          timestamp,
          elapsedMs: Math.round(elapsed * 100) / 100,
          leadingZeroBits: leadingBits,
        };

        this.state.lastPoWSolution = solution;
        this.state.totalChallengesSolved++;
        this.notify();
        return solution;
      }

      nonce++;
    }

    throw new Error(`Micro-PoW challenge exhausted search space without solution (${maxIterations} nonces tested)`);
  }

  /**
   * Validates a cryptographic PoW solution against the challenge requirements
   */
  public async validateSolution(challenge: MicroPoWChallenge, solution: MicroPoWSolution): Promise<boolean> {
    if (solution.seed !== challenge.seed) return false;
    if (Date.now() > challenge.expiresAt + 5000) return false; // Grace 5s clock skew

    const payload = `${solution.seed}:${solution.timestamp}:${solution.nonce}`;
    const calculatedHash = await sha256Hex(payload);
    if (calculatedHash !== solution.hash) return false;

    const zeroBits = countLeadingZeroBits(calculatedHash);
    return zeroBits >= challenge.difficulty;
  }

  /**
   * Computes HTTP security headers for high-volume requests
   */
  public async getSecurityHeaders(
    challenge?: MicroPoWChallenge,
    requestMeta?: { method?: string; pathAndQuery?: string }
  ): Promise<SecurityHeaders> {
    if (this.state.bypassDevMode) {
      return {
        'X-Atlas-Client-Sec': 'dev-bypass',
      };
    }

    const chal = challenge || this.generateClientChallenge(this.state.powDifficulty);
    const solution = await this.solveChallenge(chal);

    const headers: SecurityHeaders = {
      'X-Atlas-PoW-Nonce': `${chal.seed}:${solution.nonce}`,
      'X-Atlas-PoW-Hash': solution.hash,
      'X-Atlas-PoW-Timestamp': solution.timestamp.toString(),
      'X-Atlas-PoW-Difficulty': chal.difficulty.toString(),
    };

    if (this.state.turnstileToken) {
      headers['X-Atlas-Turnstile-Token'] = this.state.turnstileToken;
    }

    // Attach rolling 30s HMAC request signature
    try {
      const method = requestMeta?.method || 'POST';
      const pathAndQuery = requestMeta?.pathAndQuery || '/api/cube-search';
      const hmacHeaders = await hmacNonceEngine.signRequest(method, pathAndQuery);
      headers['X-Atlas-Nonce-Id'] = hmacHeaders['X-Atlas-Nonce-Id'];
      headers['X-Atlas-Nonce'] = hmacHeaders['X-Atlas-Nonce'];
      headers['X-Atlas-Timestamp'] = hmacHeaders['X-Atlas-Timestamp'];
      headers['X-Atlas-Signature'] = hmacHeaders['X-Atlas-Signature'];
      headers['X-Atlas-Window-Remaining'] = hmacHeaders['X-Atlas-Window-Remaining'];
    } catch {
      // Continue without HMAC if signature generation fails
    }

    return headers;
  }
}

export const securityEngine = SecurityChallengeEngine.getInstance();
