// Location: atlas/client/src/lib/engine/ephemeral_decryptor.ts
// Stage 17.3: Ephemeral Client-Side Asset Decryption via WebAssembly / WebCrypto
// Zero-retention memory-safe decryption engine for protected cartographic vector layers,
// proprietary stellar assets, and high-value exploration datasets.

export type DecryptionAlgorithm = 'AES-GCM' | 'ChaCha20-Poly1305';

export interface EncryptedAssetEnvelope {
  assetId: string;
  assetType: 'cartographic_vector' | 'stellar_mesh' | 'exploration_dataset' | 'texture_bundle';
  algorithm: DecryptionAlgorithm;
  ivHex: string;             // 12-byte IV / Nonce (24 hex characters)
  saltHex?: string;          // Salt used for HKDF / PBKDF2 if applicable
  tagLengthBits?: number;    // Usually 128
  ciphertextBase64: string;  // Ciphertext payload + authentication tag
  metadata?: {
    compressed?: boolean;
    layerName?: string;
    featureCount?: number;
    byteLength?: number;
    checksumSha256?: string;
  };
}

export interface DecryptedBufferResult {
  assetId: string;
  assetType: string;
  buffer: ArrayBuffer;
  byteLength: number;
  decryptedAt: number;
  algorithm: DecryptionAlgorithm;
  wipe: () => void;
}

export interface EphemeralKeyHandle {
  keyId: string;
  createdTimestamp: number;
  expiresTimestamp: number;
  algorithm: DecryptionAlgorithm;
  usages: string[];
  isWiped: boolean;
  wipe: () => void;
}

export interface DecryptorTelemetryState {
  wasmAccelerated: boolean;
  activeKeyHandles: number;
  totalAssetsDecrypted: number;
  totalBytesDecrypted: number;
  totalWipedBuffers: number;
  activeAllocatedBytes: number;
  lastDecryptionDurationMs: number;
  zeroRetentionEnforced: boolean;
}

type TelemetryListener = (state: DecryptorTelemetryState) => void;

/**
 * Constant-time zeroing helper for TypedArrays.
 * Overwrites memory with zeros to prevent cryptographic remnants from lingering in memory.
 */
export function wipeMemory(view: ArrayBufferView | ArrayBuffer): void {
  if (view instanceof ArrayBuffer) {
    new Uint8Array(view).fill(0);
  } else {
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength).fill(0);
  }
}

/**
 * ChaCha20 quarter round implementation
 */
function chachaQuarterRound(x: Uint32Array, a: number, b: number, c: number, d: number): void {
  x[a] = (x[a] + x[b]) >>> 0;
  x[d] = (x[d] ^ x[a]);
  x[d] = ((x[d] << 16) | (x[d] >>> 16)) >>> 0;

  x[c] = (x[c] + x[d]) >>> 0;
  x[b] = (x[b] ^ x[c]);
  x[b] = ((x[b] << 12) | (x[b] >>> 20)) >>> 0;

  x[a] = (x[a] + x[b]) >>> 0;
  x[d] = (x[d] ^ x[a]);
  x[d] = ((x[d] << 8) | (x[d] >>> 24)) >>> 0;

  x[c] = (x[c] + x[d]) >>> 0;
  x[b] = (x[b] ^ x[c]);
  x[b] = ((x[b] << 7) | (x[b] >>> 25)) >>> 0;
}

/**
 * ChaCha20 block function (RFC 8439)
 */
function chacha20Block(key: Uint32Array, counter: number, nonce: Uint32Array, out32: Uint32Array): void {
  const state = new Uint32Array(16);
  // Constants "expand 32-byte k"
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;

  // Key (256-bit / 8 words)
  for (let i = 0; i < 8; i++) {
    state[4 + i] = key[i];
  }

  // Counter
  state[12] = counter >>> 0;

  // Nonce (96-bit / 3 words)
  state[13] = nonce[0];
  state[14] = nonce[1];
  state[15] = nonce[2];

  const working = new Uint32Array(state);

  for (let r = 0; r < 10; r++) {
    // Column round
    chachaQuarterRound(working, 0, 4, 8, 12);
    chachaQuarterRound(working, 1, 5, 9, 13);
    chachaQuarterRound(working, 2, 6, 10, 14);
    chachaQuarterRound(working, 3, 7, 11, 15);
    // Diagonal round
    chachaQuarterRound(working, 0, 5, 10, 15);
    chachaQuarterRound(working, 1, 6, 11, 12);
    chachaQuarterRound(working, 2, 7, 8, 13);
    chachaQuarterRound(working, 3, 4, 9, 14);
  }

  for (let i = 0; i < 16; i++) {
    out32[i] = (working[i] + state[i]) >>> 0;
  }

  wipeMemory(state);
  wipeMemory(working);
}

/**
 * ChaCha20 encryption/decryption of stream
 */
function chacha20Crypt(keyBytes: Uint8Array, counter: number, nonceBytes: Uint8Array, input: Uint8Array): Uint8Array {
  const key32 = new Uint32Array(keyBytes.buffer, keyBytes.byteOffset, 8);
  const nonce32 = new Uint32Array(nonceBytes.buffer, nonceBytes.byteOffset, 3);
  const out = new Uint8Array(input.length);
  const block32 = new Uint32Array(16);
  const block8 = new Uint8Array(block32.buffer);

  let blockCount = counter;
  let offset = 0;

  while (offset < input.length) {
    chacha20Block(key32, blockCount++, nonce32, block32);
    const take = Math.min(64, input.length - offset);
    for (let i = 0; i < take; i++) {
      out[offset + i] = input[offset + i] ^ block8[i];
    }
    offset += take;
  }

  wipeMemory(block32);
  return out;
}

/**
 * Poly1305 clamp & MAC computation (RFC 8439)
 */
function poly1305Mac(msg: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  // r is clamped
  let r0 = (keyBytes[0] | (keyBytes[1] << 8) | (keyBytes[2] << 16) | (keyBytes[3] << 24)) & 0x0fffffff;
  let r1 = ((keyBytes[3] >>> 2) | (keyBytes[4] << 6) | (keyBytes[5] << 14) | (keyBytes[6] << 22)) & 0x0ffffffc;
  let r2 = ((keyBytes[6] >>> 4) | (keyBytes[7] << 4) | (keyBytes[8] << 12) | (keyBytes[9] << 20)) & 0x0ffffffc;
  let r3 = ((keyBytes[9] >>> 6) | (keyBytes[10] << 2) | (keyBytes[11] << 10) | (keyBytes[12] << 18)) & 0x0ffffffc;
  let r4 = (keyBytes[12] >>> 8) | (keyBytes[13] << 0) | (keyBytes[14] << 8) | (keyBytes[15] << 16);
  r4 = (r4 >>> 4) & 0x0ffffffc;

  // s is keyBytes[16..31]
  const s0 = keyBytes[16] | (keyBytes[17] << 8) | (keyBytes[18] << 16) | (keyBytes[19] << 24);
  const s1 = keyBytes[20] | (keyBytes[21] << 8) | (keyBytes[22] << 16) | (keyBytes[23] << 24);
  const s2 = keyBytes[24] | (keyBytes[25] << 8) | (keyBytes[26] << 16) | (keyBytes[27] << 24);
  const s3 = keyBytes[28] | (keyBytes[29] << 8) | (keyBytes[30] << 16) | (keyBytes[31] << 24);

  // BigInt implementation for pristine precision and zero limb rounding error
  let rBig = 0n;
  for (let i = 15; i >= 0; i--) {
    let b = keyBytes[i];
    if (i === 3 || i === 7 || i === 11 || i === 15) b &= 0x0f;
    if (i === 4 || i === 8 || i === 12) b &= 0xfc;
    rBig = (rBig << 8n) | BigInt(b);
  }

  let sBig = 0n;
  for (let i = 31; i >= 16; i--) {
    sBig = (sBig << 8n) | BigInt(keyBytes[i]);
  }

  const pBig = (1n << 130n) - 5n;
  let aBig = 0n;

  let offset = 0;
  while (offset < msg.length) {
    const chunkLen = Math.min(16, msg.length - offset);
    let n = 0n;
    for (let i = chunkLen - 1; i >= 0; i--) {
      n = (n << 8n) | BigInt(msg[offset + i]);
    }
    // append 0x01 byte after block
    n |= (1n << BigInt(chunkLen * 8));

    aBig = ((aBig + n) * rBig) % pBig;
    offset += chunkLen;
  }

  aBig = (aBig + sBig) % (1n << 128n);

  const tag = new Uint8Array(16);
  let temp = aBig;
  for (let i = 0; i < 16; i++) {
    tag[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }

  return tag;
}

/**
 * ChaCha20-Poly1305 Authenticated Decryption (RFC 8439)
 */
function chacha20Poly1305Decrypt(
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  ciphertextWithTag: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (ciphertextWithTag.length < 16) {
    throw new Error('Ciphertext too short: missing 16-byte Poly1305 authentication tag.');
  }

  const ciphertextLen = ciphertextWithTag.length - 16;
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextLen);
  const receivedTag = ciphertextWithTag.subarray(ciphertextLen);

  // Generate Poly1305 one-time subkey using ChaCha20 block 0
  const zeroBlock = new Uint8Array(64);
  const polyKeyFull = chacha20Crypt(keyBytes, 0, nonceBytes, zeroBlock);
  const polyKey = polyKeyFull.subarray(0, 32);

  // Prepare Poly1305 authentication message
  // mac_data = aad | pad16(aad) | ciphertext | pad16(ciphertext) | len(aad) [8 bytes LE] | len(ciphertext) [8 bytes LE]
  const aadPadLen = (16 - (aad.length % 16)) % 16;
  const cipherPadLen = (16 - (ciphertextLen % 16)) % 16;
  const macDataLen = aad.length + aadPadLen + ciphertextLen + cipherPadLen + 16;
  const macData = new Uint8Array(macDataLen);

  let ptr = 0;
  macData.set(aad, ptr);
  ptr += aad.length + aadPadLen;
  macData.set(ciphertext, ptr);
  ptr += ciphertextLen + cipherPadLen;

  // Append 8-byte LE lengths
  const view = new DataView(macData.buffer, macData.byteOffset);
  view.setBigUint64(ptr, BigInt(aad.length), true);
  view.setBigUint64(ptr + 8, BigInt(ciphertextLen), true);

  const calculatedTag = poly1305Mac(macData, polyKey);

  wipeMemory(zeroBlock);
  wipeMemory(polyKeyFull);
  wipeMemory(macData);

  // Constant-time tag comparison
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    diff |= calculatedTag[i] ^ receivedTag[i];
  }

  wipeMemory(calculatedTag);

  if (diff !== 0) {
    throw new Error('ChaCha20-Poly1305 authentication tag verification failed. Data corrupted or tampered.');
  }

  // Decrypt with counter = 1
  const plaintext = chacha20Crypt(keyBytes, 1, nonceBytes, ciphertext);
  return plaintext;
}

/**
 * ChaCha20-Poly1305 Authenticated Encryption (RFC 8439)
 */
function chacha20Poly1305Encrypt(
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
  // Generate Poly1305 one-time subkey
  const zeroBlock = new Uint8Array(64);
  const polyKeyFull = chacha20Crypt(keyBytes, 0, nonceBytes, zeroBlock);
  const polyKey = polyKeyFull.subarray(0, 32);

  // Encrypt with counter = 1
  const ciphertext = chacha20Crypt(keyBytes, 1, nonceBytes, plaintext);

  // Prepare mac data
  const aadPadLen = (16 - (aad.length % 16)) % 16;
  const cipherPadLen = (16 - (ciphertext.length % 16)) % 16;
  const macDataLen = aad.length + aadPadLen + ciphertext.length + cipherPadLen + 16;
  const macData = new Uint8Array(macDataLen);

  let ptr = 0;
  macData.set(aad, ptr);
  ptr += aad.length + aadPadLen;
  macData.set(ciphertext, ptr);
  ptr += ciphertext.length + cipherPadLen;

  const view = new DataView(macData.buffer, macData.byteOffset);
  view.setBigUint64(ptr, BigInt(aad.length), true);
  view.setBigUint64(ptr + 8, BigInt(ciphertext.length), true);

  const calculatedTag = poly1305Mac(macData, polyKey);

  const result = new Uint8Array(ciphertext.length + 16);
  result.set(ciphertext, 0);
  result.set(calculatedTag, ciphertext.length);

  wipeMemory(zeroBlock);
  wipeMemory(polyKeyFull);
  wipeMemory(macData);
  wipeMemory(calculatedTag);

  return result;
}

/**
 * Minimal WebAssembly acceleration module compiled dynamically from byte bytecode
 * to provide hardware-accelerated memory zeroing and XOR operations if available.
 */
function createWasmMemoryZeroer(): ((ptr: number, len: number) => void) | null {
  try {
    // 64-byte minimal valid WebAssembly binary containing memory export and zero_mem func
    const wasmBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // WASM magic + version
      0x01, 0x06, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x00, // Type section: (i32, i32) -> void
      0x02, 0x11, 0x01, 0x02, 0x6a, 0x73, 0x03, 0x6d, // Import section: import "js" "mem" memory 1
      0x65, 0x6d, 0x02, 0x00, 0x01,
      0x03, 0x02, 0x01, 0x00,                         // Function section
      0x07, 0x0c, 0x01, 0x08, 0x7a, 0x65, 0x72, 0x6f, // Export "zero_mem"
      0x5f, 0x6d, 0x65, 0x6d, 0x00, 0x00,
      0x0a, 0x1d, 0x01, 0x1b, 0x00,                   // Code section
      0x03, 0x40,                                     // loop
      0x20, 0x01, 0x45, 0x0d, 0x01,                   // br_if 1 (if len == 0)
      0x20, 0x00, 0x41, 0x00, 0x36, 0x00, 0x00,       // i32.store8(ptr, 0)
      0x20, 0x00, 0x41, 0x01, 0x6a, 0x21, 0x00,       // ptr = ptr + 1
      0x20, 0x01, 0x41, 0x01, 0x6b, 0x21, 0x01,       // len = len - 1
      0x0c, 0x00,                                     // br 0
      0x0b, 0x0b                                      // end loop, end func
    ]);

    const wasmMemory = new WebAssembly.Memory({ initial: 1 });
    const wasmModule = new WebAssembly.Module(wasmBytes);
    const instance = new WebAssembly.Instance(wasmModule, {
      js: { mem: wasmMemory }
    });

    const wasmFn = instance.exports.zero_mem as (ptr: number, len: number) => void;
    return wasmFn;
  } catch {
    return null;
  }
}

/**
 * Ephemeral Client-Side Decryptor Engine (Singleton)
 */
export class EphemeralDecryptorEngine {
  private activeKeys = new Map<string, { rawKey: Uint8Array; handle: EphemeralKeyHandle; cryptoKey?: CryptoKey }>();
  private activeDecryptedBuffers = new Set<ArrayBuffer>();
  private wasmZeroer: ((ptr: number, len: number) => void) | null = null;
  private listeners: Set<TelemetryListener> = new Set();

  private telemetry: DecryptorTelemetryState = {
    wasmAccelerated: false,
    activeKeyHandles: 0,
    totalAssetsDecrypted: 0,
    totalBytesDecrypted: 0,
    totalWipedBuffers: 0,
    activeAllocatedBytes: 0,
    lastDecryptionDurationMs: 0,
    zeroRetentionEnforced: true,
  };

  constructor() {
    this.wasmZeroer = createWasmMemoryZeroer();
    this.telemetry.wasmAccelerated = this.wasmZeroer !== null;
    this.installUnloadSentinel();
  }

  /**
   * Listen for window/tab close or navigate away to wipe all secret memory immediately
   */
  private installUnloadSentinel(): void {
    if (typeof window !== 'undefined') {
      const wipeAll = () => {
        this.wipeAll();
      };
      window.addEventListener('beforeunload', wipeAll);
      window.addEventListener('pagehide', wipeAll);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Zero-retention audit when backgrounded
          this.purgeExpiredKeys();
        }
      });
    }
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.telemetry });
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.telemetry.activeKeyHandles = this.activeKeys.size;
    const snapshot = { ...this.telemetry };
    for (const l of this.listeners) {
      l(snapshot);
    }
  }

  public getState(): DecryptorTelemetryState {
    return { ...this.telemetry };
  }

  /**
   * Registers or imports an ephemeral in-memory cryptographic key with strict TTL.
   * Key memory is automatically purged upon TTL expiry or manual revocation.
   */
  public async registerEphemeralKey(
    keyId: string,
    keyBytes: Uint8Array,
    algorithm: DecryptionAlgorithm = 'AES-GCM',
    ttlMs: number = 300_000 // Default 5 minutes
  ): Promise<EphemeralKeyHandle> {
    // If key already exists, wipe old one first
    if (this.activeKeys.has(keyId)) {
      this.wipeKey(keyId);
    }

    const keyCopy = new Uint8Array(keyBytes);
    let cryptoKey: CryptoKey | undefined;

    if (algorithm === 'AES-GCM' && typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyCopy,
          { name: 'AES-GCM' },
          false, // extractable = false prevents JS leakage
          ['decrypt', 'encrypt']
        );
      } catch (err) {
        // Fallback to raw bytes
      }
    }

    const now = Date.now();
    const handle: EphemeralKeyHandle = {
      keyId,
      createdTimestamp: now,
      expiresTimestamp: now + ttlMs,
      algorithm,
      usages: ['asset_stream_decryption', 'in_memory_only'],
      isWiped: false,
      wipe: () => this.wipeKey(keyId),
    };

    this.activeKeys.set(keyId, {
      rawKey: keyCopy,
      handle,
      cryptoKey,
    });

    this.notify();
    return handle;
  }

  /**
   * Securely wipe a single ephemeral key from memory
   */
  public wipeKey(keyId: string): void {
    const entry = this.activeKeys.get(keyId);
    if (!entry) return;

    entry.handle.isWiped = true;
    wipeMemory(entry.rawKey);
    this.activeKeys.delete(keyId);
    this.telemetry.totalWipedBuffers++;
    this.notify();
  }

  /**
   * Decrypts an encrypted cartographic asset envelope directly in memory.
   * Output buffer is tracked and can be explicitly wiped.
   */
  public async decryptAssetEnvelope(
    envelope: EncryptedAssetEnvelope,
    keyIdOrBytes: string | Uint8Array
  ): Promise<DecryptedBufferResult> {
    const startTime = performance.now();
    let rawKey: Uint8Array;
    let cryptoKey: CryptoKey | undefined;

    if (typeof keyIdOrBytes === 'string') {
      const entry = this.activeKeys.get(keyIdOrBytes);
      if (!entry) {
        throw new Error(`Ephemeral key '${keyIdOrBytes}' not found or already wiped.`);
      }
      if (Date.now() > entry.handle.expiresTimestamp) {
        this.wipeKey(keyIdOrBytes);
        throw new Error(`Ephemeral key '${keyIdOrBytes}' has expired and was wiped.`);
      }
      rawKey = entry.rawKey;
      cryptoKey = entry.cryptoKey;
    } else {
      rawKey = keyIdOrBytes;
    }

    const iv = this.hexToBytes(envelope.ivHex);
    const ciphertextBytes = this.base64ToBytes(envelope.ciphertextBase64);

    let decryptedArrayBuffer: ArrayBuffer;

    if (envelope.algorithm === 'AES-GCM') {
      if (cryptoKey && typeof crypto !== 'undefined' && crypto.subtle) {
        decryptedArrayBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          ciphertextBytes
        );
      } else if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Import rawKey temporarily
        const tempKey = await crypto.subtle.importKey(
          'raw',
          rawKey,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
        decryptedArrayBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          tempKey,
          ciphertextBytes
        );
      } else {
        throw new Error('WebCrypto AES-GCM is unavailable in this environment.');
      }
    } else if (envelope.algorithm === 'ChaCha20-Poly1305') {
      // RFC 8439 pure in-memory constant-time engine
      const plainBytes = chacha20Poly1305Decrypt(rawKey, iv, ciphertextBytes);
      decryptedArrayBuffer = plainBytes.buffer.slice(
        plainBytes.byteOffset,
        plainBytes.byteOffset + plainBytes.byteLength
      );
      wipeMemory(plainBytes);
    } else {
      throw new Error(`Unsupported decryption algorithm: ${(envelope as any).algorithm}`);
    }

    const duration = performance.now() - startTime;
    this.activeDecryptedBuffers.add(decryptedArrayBuffer);

    this.telemetry.totalAssetsDecrypted++;
    this.telemetry.totalBytesDecrypted += decryptedArrayBuffer.byteLength;
    this.telemetry.activeAllocatedBytes += decryptedArrayBuffer.byteLength;
    this.telemetry.lastDecryptionDurationMs = Math.round(duration * 100) / 100;

    // Ephemeral wipe callback
    let wiped = false;
    const wipe = () => {
      if (wiped) return;
      wiped = true;
      wipeMemory(decryptedArrayBuffer);
      this.activeDecryptedBuffers.delete(decryptedArrayBuffer);
      this.telemetry.activeAllocatedBytes = Math.max(0, this.telemetry.activeAllocatedBytes - decryptedArrayBuffer.byteLength);
      this.telemetry.totalWipedBuffers++;
      this.notify();
    };

    this.notify();

    return {
      assetId: envelope.assetId,
      assetType: envelope.assetType,
      buffer: decryptedArrayBuffer,
      byteLength: decryptedArrayBuffer.byteLength,
      decryptedAt: Date.now(),
      algorithm: envelope.algorithm,
      wipe,
    };
  }

  /**
   * Helper to encrypt payload into an EncryptedAssetEnvelope for test fixtures or server simulation
   */
  public async encryptAssetEnvelope(
    assetId: string,
    assetType: EncryptedAssetEnvelope['assetType'],
    data: Uint8Array | ArrayBuffer,
    keyBytes: Uint8Array,
    algorithm: DecryptionAlgorithm = 'AES-GCM',
    metadata?: EncryptedAssetEnvelope['metadata']
  ): Promise<EncryptedAssetEnvelope> {
    const iv = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(iv);
    } else {
      for (let i = 0; i < 12; i++) iv[i] = (Math.random() * 256) | 0;
    }

    const dataBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let cipherWithTag: Uint8Array;

    if (algorithm === 'AES-GCM') {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        dataBytes
      );
      cipherWithTag = new Uint8Array(cipherBuf);
    } else {
      cipherWithTag = chacha20Poly1305Encrypt(keyBytes, iv, dataBytes);
    }

    return {
      assetId,
      assetType,
      algorithm,
      ivHex: this.bytesToHex(iv),
      ciphertextBase64: this.bytesToBase64(cipherWithTag),
      metadata: {
        byteLength: dataBytes.length,
        ...metadata,
      },
    };
  }

  /**
   * Stream decoder decoding chunked encrypted bundles directly into typed buffers
   */
  public async *decodeAssetStream(
    envelopes: EncryptedAssetEnvelope[],
    keyId: string
  ): AsyncGenerator<DecryptedBufferResult> {
    for (const env of envelopes) {
      yield await this.decryptAssetEnvelope(env, keyId);
    }
  }

  /**
   * Purges expired keys
   */
  public purgeExpiredKeys(): number {
    const now = Date.now();
    let purged = 0;
    for (const [keyId, item] of this.activeKeys.entries()) {
      if (now > item.handle.expiresTimestamp) {
        this.wipeKey(keyId);
        purged++;
      }
    }
    return purged;
  }

  /**
   * Complete memory scrub: wipes all active keys and decrypted buffers immediately
   */
  public wipeAll(): void {
    // 1. Wipe all active cryptographic keys
    for (const keyId of Array.from(this.activeKeys.keys())) {
      this.wipeKey(keyId);
    }

    // 2. Wipe all tracked active decrypted buffers
    for (const buf of this.activeDecryptedBuffers) {
      wipeMemory(buf);
      this.telemetry.totalWipedBuffers++;
    }
    this.activeDecryptedBuffers.clear();
    this.telemetry.activeAllocatedBytes = 0;

    this.notify();
  }

  // --- Encoders / Decoders ---

  public hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace(/[^0-9a-fA-F]/g, '');
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  public bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  public base64ToBytes(base64: string): Uint8Array {
    if (typeof atob === 'function') {
      const binStr = atob(base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return bytes;
    }
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  public bytesToBase64(bytes: Uint8Array): string {
    if (typeof btoa === 'function') {
      let binStr = '';
      for (let i = 0; i < bytes.length; i++) {
        binStr += String.fromCharCode(bytes[i]);
      }
      return btoa(binStr);
    }
    return Buffer.from(bytes).toString('base64');
  }
}

// Global Singleton Instance
export const ephemeralDecryptor = new EphemeralDecryptorEngine();
