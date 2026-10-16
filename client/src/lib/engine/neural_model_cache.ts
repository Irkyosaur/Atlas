// Location: atlas/client/src/lib/engine/neural_model_cache.ts
// Stage 16.1: IndexedDB Binary Model Cache for ONNX & Quantized Neural Assets

const DB_NAME = 'AtlasNeuralModelCache_v1';
const DB_VERSION = 1;
const STORE_MODELS = 'neural_models';

interface CachedModelRecord {
  modelId: string;
  version: string;
  data: ArrayBuffer;
  sizeBytes: number;
  timestamp: number;
}

export class NeuralModelCache {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  public async init(): Promise<void> {
    if (!this.isSupported || this.db) return;

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_MODELS)) {
            db.createObjectStore(STORE_MODELS, { keyPath: 'modelId' });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve();
        };
        req.onerror = () => {
          resolve();
        };
      } catch {
        resolve();
      }
    });
  }

  public async getModel(modelId: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_MODELS, 'readonly');
        const store = tx.objectStore(STORE_MODELS);
        const req = store.get(modelId);
        req.onsuccess = () => {
          const record = req.result as CachedModelRecord | undefined;
          resolve(record ? record.data : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async saveModel(modelId: string, version: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_MODELS, 'readwrite');
        const store = tx.objectStore(STORE_MODELS);
        const record: CachedModelRecord = {
          modelId,
          version,
          data,
          sizeBytes: data.byteLength,
          timestamp: Date.now()
        };
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearCache(): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_MODELS, 'readwrite');
      tx.objectStore(STORE_MODELS).clear();
    } catch {
      // ignore
    }
  }
}

export const neuralModelCache = new NeuralModelCache();
