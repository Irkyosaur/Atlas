// Location: atlas/client/src/lib/engine/offline_exploration_cache.ts
// Stage 5.4: Client-Side Embedded Offline Exploration Cache Engine
// Backed by IndexedDB with structured schema, search indices, and offline storage

import { CANONICAL_POI_CATALOG, type PoiRecord, type PoiCategory } from './poi_catalog';

const DB_NAME = 'AtlasExplorationCache_v1';
const DB_VERSION = 1;
const STORE_POIS = 'pois';
const STORE_METADATA = 'metadata';

export interface CacheMetadata {
  lastUpdated: string;
  totalPois: number;
  totalAudioLogs: number;
  storageBytes: number;
  version: string;
}

export class OfflineExplorationCache {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;
  private memoryCache: Map<string, PoiRecord> = new Map();
  private isInitialized = false;

  constructor() {
    // Populate memory cache with canonical POIs immediately
    for (const poi of CANONICAL_POI_CATALOG) {
      this.memoryCache.set(poi.id, poi);
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.isSupported) {
      this.isInitialized = true;
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORE_POIS)) {
            const poiStore = db.createObjectStore(STORE_POIS, { keyPath: 'id' });
            poiStore.createIndex('by_category', 'category', { unique: false });
            poiStore.createIndex('by_system', 'systemName', { unique: false });
            poiStore.createIndex('by_threat', 'threatLevel', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORE_METADATA)) {
            db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
          }
        };

        req.onsuccess = async () => {
          this.db = req.result;
          this.isInitialized = true;
          await this.syncCanonicalPois();
          resolve();
        };

        req.onerror = () => {
          // Fall back gracefully to memory cache
          this.isInitialized = true;
          resolve();
        };
      } catch {
        this.isInitialized = true;
        resolve();
      }
    });
  }

  /**
   * Sync embedded canonical POIs into IndexedDB if not present
   */
  public async syncCanonicalPois(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction([STORE_POIS, STORE_METADATA], 'readwrite');
        const poiStore = tx.objectStore(STORE_POIS);
        const metaStore = tx.objectStore(STORE_METADATA);

        for (const poi of CANONICAL_POI_CATALOG) {
          poiStore.put(poi);
          this.memoryCache.set(poi.id, poi);
        }

        const totalLogs = CANONICAL_POI_CATALOG.reduce(
          (acc, p) => acc + (p.audioLogs?.length || 0),
          0
        );

        const metadata: CacheMetadata = {
          lastUpdated: new Date().toISOString(),
          totalPois: CANONICAL_POI_CATALOG.length,
          totalAudioLogs: totalLogs,
          storageBytes: JSON.stringify(CANONICAL_POI_CATALOG).length,
          version: '3310.10.15-CANONN',
        };

        metaStore.put({ key: 'cache_meta', ...metadata });

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Retrieve all POIs from offline storage
   */
  public async getAllPois(): Promise<PoiRecord[]> {
    if (!this.db) {
      return Array.from(this.memoryCache.values());
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_POIS, 'readonly');
        const store = tx.objectStore(STORE_POIS);
        const req = store.getAll();

        req.onsuccess = () => {
          const list = req.result as PoiRecord[];
          if (list && list.length > 0) {
            for (const p of list) {
              this.memoryCache.set(p.id, p);
            }
            resolve(list);
          } else {
            resolve(Array.from(this.memoryCache.values()));
          }
        };

        req.onerror = () => {
          resolve(Array.from(this.memoryCache.values()));
        };
      } catch {
        resolve(Array.from(this.memoryCache.values()));
      }
    });
  }

  /**
   * Get single POI by ID
   */
  public async getPoiById(id: string): Promise<PoiRecord | null> {
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id) || null;
    }
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_POIS, 'readonly');
        const store = tx.objectStore(STORE_POIS);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve((req.result as PoiRecord) || null);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save or update custom POI record (e.g. CMDR discovered site)
   */
  public async savePoi(poi: PoiRecord): Promise<void> {
    this.memoryCache.set(poi.id, poi);
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_POIS, 'readwrite');
        const store = tx.objectStore(STORE_POIS);
        store.put(poi);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Retrieve storage and caching statistics
   */
  public async getCacheMetadata(): Promise<CacheMetadata> {
    const fallback: CacheMetadata = {
      lastUpdated: new Date().toISOString(),
      totalPois: this.memoryCache.size,
      totalAudioLogs: Array.from(this.memoryCache.values()).reduce(
        (acc, p) => acc + (p.audioLogs?.length || 0),
        0
      ),
      storageBytes: JSON.stringify(Array.from(this.memoryCache.values())).length,
      version: '3310.10.15-CANONN-LOCAL',
    };

    if (!this.db) return fallback;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_METADATA, 'readonly');
        const store = tx.objectStore(STORE_METADATA);
        const req = store.get('cache_meta');

        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result as CacheMetadata);
          } else {
            resolve(fallback);
          }
        };
        req.onerror = () => resolve(fallback);
      } catch {
        resolve(fallback);
      }
    });
  }

  /**
   * Clear offline cache and rebuild
   */
  public async clearCache(): Promise<void> {
    this.memoryCache.clear();
    for (const poi of CANONICAL_POI_CATALOG) {
      this.memoryCache.set(poi.id, poi);
    }

    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction([STORE_POIS, STORE_METADATA], 'readwrite');
        tx.objectStore(STORE_POIS).clear();
        tx.objectStore(STORE_METADATA).clear();
        tx.oncomplete = async () => {
          await this.syncCanonicalPois();
          resolve();
        };
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const offlineExplorationCache = new OfflineExplorationCache();
