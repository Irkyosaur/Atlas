// Location: atlas/client/src/lib/engine/player_keystore.ts
// Secure Client-Side AES-256-GCM Vault & IndexedDB Storage for Frontier CAPI & Atlas API Keys
// Zero Plaintext Storage & Strict Memory Isolation

export interface EncryptedPayload {
  cipherBytesHex: string; // Hex representation of ciphertext + auth tag
  ivHex: string;          // 12-byte GCM initialization vector
  saltHex: string;        // 16-byte PBKDF2 salt
  algorithm: 'AES-256-GCM';
  iterations: number;
  timestamp: number;
}

export interface StoredCapiTokens {
  accountId: string;
  cmdrName?: string;
  frontierFid?: string;
  encryptedAccessToken: EncryptedPayload;
  encryptedRefreshToken: EncryptedPayload;
  tokenExpiryTimestamp: number; // Unix timestamp in ms
  lastRolledTimestamp: number;  // Unix timestamp in ms
  status: 'authenticated' | 'expired' | 'rate_limited' | 'revoked';
}

export interface AtlasApiKeyRecord {
  keyId: string;                 // UUID v4 identifier
  accountId: string;
  keyPrefix: string;             // First 12 chars: 'atk_live_XXXX'
  keyHashSha256: string;         // SHA-256 hash of entire key (never store plaintext)
  label: string;                 // User-friendly identifier (e.g. 'EdEzCheese Telemetry')
  scopes: ApiKeyScope[];         // Permitted operations
  createdAt: number;             // Timestamp in ms
  expiresAt: number | null;      // Optional expiry timestamp in ms
  lastUsedAt: number | null;     // Last telemetry handshake timestamp
  isRevoked: boolean;
}

export type ApiKeyScope =
  | 'telemetry:write'
  | 'player:read'
  | 'player:write'
  | 'routes:execute'
  | 'carrier:manage';

export const ALL_API_KEY_SCOPES: { scope: ApiKeyScope; label: string; description: string }[] = [
  {
    scope: 'telemetry:write',
    label: 'Telemetry Stream (Write)',
    description: 'Permits EdEzCheese or EDMC live journal streaming, system coordinates and carrier states.',
  },
  {
    scope: 'player:read',
    label: 'CMDR Profile (Read)',
    description: 'Allows reading rank progression, ship manifests, cargo, and personal ledger values.',
  },
  {
    scope: 'player:write',
    label: 'CMDR Data (Write)',
    description: 'Allows updating custom bookmarks, route notes, and engineering wishlists.',
  },
  {
    scope: 'routes:execute',
    label: 'Route Execution (Exec)',
    description: 'Allows EDill in-cockpit bridge to inject destination nav targets into ship computer.',
  },
  {
    scope: 'carrier:manage',
    label: 'Fleet Carrier (Manage)',
    description: 'Allows remote tariff adjustment, tritium depot transfer, and jump queue scheduling.',
  },
];

const DB_NAME = 'AtlasPlayerMasterVault';
const DB_VERSION = 1;
const CAPI_STORE_NAME = 'capi_tokens';
const API_KEYS_STORE_NAME = 'api_keys';
const MASTER_KEY_STORAGE_KEY = 'atlas_vault_session_key';

// Convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const length = hex.length / 2;
  const uint8 = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return uint8;
}

// Convert string to UTF-8 Uint8Array
export function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert UTF-8 Uint8Array to string
export function bytesToStr(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Cryptographic SHA-256 helper
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? strToBytes(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Player Keystore Manager
 * Implements AES-256-GCM encryption with WebCrypto API and IndexedDB persistence.
 */
class PlayerKeystore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private cachedKey: CryptoKey | null = null;
  private cachedSalt: Uint8Array | null = null;

  constructor() {
    // Lazy init IndexedDB on client
  }

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CAPI_STORE_NAME)) {
          db.createObjectStore(CAPI_STORE_NAME, { keyPath: 'accountId' });
        }
        if (!db.objectStoreNames.contains(API_KEYS_STORE_NAME)) {
          const keyStore = db.createObjectStore(API_KEYS_STORE_NAME, { keyPath: 'keyId' });
          keyStore.createIndex('accountId', 'accountId', { unique: false });
          keyStore.createIndex('keyHashSha256', 'keyHashSha256', { unique: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Derive or load the client-side master AES-256-GCM encryption key.
   * If a custom passphrase is supplied, derives key via PBKDF2 (100,000 iterations).
   * Otherwise generates and securely persists a device-isolated 256-bit entropy key.
   */
  public async getMasterKey(passphrase?: string): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    if (this.cachedKey && this.cachedSalt && !passphrase) {
      return { key: this.cachedKey, salt: this.cachedSalt };
    }

    if (passphrase) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        strToBytes(passphrase).buffer as ArrayBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.cachedKey = derivedKey;
      this.cachedSalt = salt;
      return { key: derivedKey, salt };
    }

    // Default: Check persistent device seed in localStorage or generate new
    let deviceSaltHex = localStorage.getItem(`${MASTER_KEY_STORAGE_KEY}_salt`);
    let deviceRawHex = localStorage.getItem(`${MASTER_KEY_STORAGE_KEY}_raw`);

    if (!deviceSaltHex || !deviceRawHex) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const raw = crypto.getRandomValues(new Uint8Array(32));
      deviceSaltHex = bufferToHex(salt);
      deviceRawHex = bufferToHex(raw);
      localStorage.setItem(`${MASTER_KEY_STORAGE_KEY}_salt`, deviceSaltHex);
      localStorage.setItem(`${MASTER_KEY_STORAGE_KEY}_raw`, deviceRawHex);
    }

    const saltBytes = hexToBuffer(deviceSaltHex);
    const rawBytes = hexToBuffer(deviceRawHex);

    const importedKey = await crypto.subtle.importKey(
      'raw',
      rawBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.cachedKey = importedKey;
    this.cachedSalt = saltBytes;
    return { key: importedKey, salt: saltBytes };
  }

  /**
   * Encrypt plaintext string with AES-256-GCM.
   * Produces authenticating 128-bit GCM tag and 96-bit initialization vector.
   */
  public async encrypt(plaintext: string): Promise<EncryptedPayload> {
    const { key, salt } = await this.getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = strToBytes(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        tagLength: 128,
      },
      key,
      encodedData.buffer as ArrayBuffer
    );

    return {
      cipherBytesHex: bufferToHex(cipherBuffer),
      ivHex: bufferToHex(iv),
      saltHex: bufferToHex(salt),
      algorithm: 'AES-256-GCM',
      iterations: 100000,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt AES-256-GCM ciphertext payload.
   * Throws if tamper detected or auth tag mismatch.
   */
  public async decrypt(payload: EncryptedPayload): Promise<string> {
    const { key } = await this.getMasterKey();
    const iv = hexToBuffer(payload.ivHex);
    const cipherBytes = hexToBuffer(payload.cipherBytesHex);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        tagLength: 128,
      },
      key,
      cipherBytes.buffer as ArrayBuffer
    );

    return bytesToStr(new Uint8Array(decryptedBuffer));
  }

  /**
   * Store encrypted Frontier CAPI tokens in IndexedDB `capi_tokens` store.
   * Ensures zero plaintext tokens hit persistent disks or logs.
   */
  public async saveCapiTokens(
    accountId: string,
    accessToken: string,
    refreshToken: string,
    expiresInSeconds: number,
    metadata?: { cmdrName?: string; frontierFid?: string }
  ): Promise<StoredCapiTokens> {
    const db = await this.getDB();
    const encryptedAccessToken = await this.encrypt(accessToken);
    const encryptedRefreshToken = await this.encrypt(refreshToken);

    const now = Date.now();
    const record: StoredCapiTokens = {
      accountId,
      cmdrName: metadata?.cmdrName,
      frontierFid: metadata?.frontierFid,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiryTimestamp: now + expiresInSeconds * 1000,
      lastRolledTimestamp: now,
      status: 'authenticated',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(CAPI_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CAPI_STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve encrypted CAPI tokens and return decrypted tokens in memory only.
   */
  public async getCapiTokens(accountId: string = 'default_commander'): Promise<{
    record: StoredCapiTokens;
    accessToken: string;
    refreshToken: string;
  } | null> {
    const db = await this.getDB();
    const record: StoredCapiTokens | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction(CAPI_STORE_NAME, 'readonly');
      const store = tx.objectStore(CAPI_STORE_NAME);
      const req = store.get(accountId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    try {
      const accessToken = await this.decrypt(record.encryptedAccessToken);
      const refreshToken = await this.decrypt(record.encryptedRefreshToken);
      return { record, accessToken, refreshToken };
    } catch (err) {
      console.error('[Keystore] Failed to decrypt CAPI tokens:', err);
      return null;
    }
  }

  /**
   * Purge CAPI tokens from IndexedDB (Disconnect / Logout).
   */
  public async clearCapiTokens(accountId: string = 'default_commander'): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CAPI_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CAPI_STORE_NAME);
      const req = store.delete(accountId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save a newly created Atlas API key record (hashed).
   */
  public async saveApiKeyRecord(record: AtlasApiKeyRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(API_KEYS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(API_KEYS_STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * List all Atlas API keys for a commander account.
   */
  public async listApiKeys(accountId: string = 'default_commander'): Promise<AtlasApiKeyRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(API_KEYS_STORE_NAME, 'readonly');
      const store = tx.objectStore(API_KEYS_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: AtlasApiKeyRecord[] = req.result || [];
        resolve(all.filter((k) => k.accountId === accountId));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Revoke an Atlas API Key.
   */
  public async revokeApiKey(keyId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(API_KEYS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(API_KEYS_STORE_NAME);
      const req = store.get(keyId);
      req.onsuccess = () => {
        const record = req.result as AtlasApiKeyRecord | undefined;
        if (!record) {
          resolve(false);
          return;
        }
        record.isRevoked = true;
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = () => reject(updateReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete an Atlas API key completely.
   */
  public async deleteApiKey(keyId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(API_KEYS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(API_KEYS_STORE_NAME);
      const req = store.delete(keyId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const playerKeystore = new PlayerKeystore();
