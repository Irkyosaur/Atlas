// Location: atlas/client/src/lib/engine/odyssey_locker_engine.ts
// Odyssey Locker Engine & 1,000-Cap Inventory Audit (Phase 10, Stage 10.1)
// Ingests Odyssey locker inventory from journal events (ShipLockerMaterials / ShipLocker) or CAPI
// into cmdr_materials_odyssey schema (IndexedDB + reactive client store).
// Provides 1,000-cap tracking, category filtering (Assets [Chemicals, Circuits, Tech], Goods, Data [Operational, Financial, Technical]),
// instant search, quantity/name sorting, and persistence.

import {
  type OdysseyCategory,
  type OdysseySubCategory,
  type OdysseyItemDefinition,
  type OdysseyRarity,
  ODYSSEY_LOCKER_CATALOG,
  ODYSSEY_CATALOG_MAP,
} from './odyssey_locker_catalog';

export const ODYSSEY_LOCKER_CAPACITY = 1000;

export interface OdysseyLockerItem {
  id: string; // Internal identifier (e.g. "aerogel")
  name: string; // Formatted display name (e.g. "Aerogel")
  category: OdysseyCategory; // 'assets' | 'goods' | 'data'
  subCategory: OdysseySubCategory; // 'Chemicals' | 'Circuits' | 'Tech' | 'Goods' | 'Operational' | 'Financial' | 'Technical'
  rarity: OdysseyRarity;
  count: number;
  baseValue: number;
  totalValue: number; // count * baseValue
  isIllegal?: boolean;
  description: string;
  updatedAt: number;
}

export interface OdysseyLockerAudit {
  totalItems: number;
  maxCapacity: number;
  capacityPercent: number;
  isNearCap: boolean; // >= 80%
  isAtCap: boolean; // >= 100%
  totalValuationCredits: number;
  assetsCount: number;
  goodsCount: number;
  dataCount: number;
  subCategoryCounts: Record<OdysseySubCategory, number>;
}

export interface JournalLockerMaterialEntry {
  Name: string;
  Name_Localised?: string;
  Count: number;
  OwnerID?: number;
  MissionID?: number;
}

export interface JournalShipLockerEvent {
  event: 'ShipLockerMaterials' | 'ShipLocker' | 'BackpackMaterials';
  timestamp?: string;
  Items?: JournalLockerMaterialEntry[]; // Goods
  Components?: JournalLockerMaterialEntry[]; // Assets
  Consumables?: JournalLockerMaterialEntry[];
  Data?: JournalLockerMaterialEntry[]; // Data
}

const STORAGE_LOCKER_KEY = 'atlas_cmdr_materials_odyssey_v1';
const DB_NAME = 'AtlasOdysseyLockerVault';
const DB_VERSION = 1;
const STORE_MATERIALS = 'cmdr_materials_odyssey';

// Default realistic inventory for initial state / offline demonstration
export const DEFAULT_MOCK_ODYSSEY_LOCKER: Record<string, number> = {
  // Assets - Chemicals (112 items)
  aerogel: 18,
  chemicalcatalyst: 12,
  chemicalsample: 25,
  epinephrine: 14,
  epinephrineauto: 8,
  graphene: 5,
  oxygenicbacteria: 9,
  phagenucleicacid: 6,
  purifiedwater: 3,
  syntheticpathogen: 2,
  viscoelasticpolymer: 10,

  // Assets - Circuits (142 items)
  circuitboard: 32,
  circuitswitch: 28,
  electricalfuse: 22,
  electricalwiring: 25,
  electromagneticelectrode: 12,
  ionisingradiationfilter: 4,
  microrotationarray: 6,
  opticalfibre: 8,
  scrambler: 1,
  surfacetestcircuit: 4,

  // Assets - Tech (164 items)
  aerogelgelpack: 26,
  memorychip: 34,
  microelectrode: 30,
  microthrusters: 8,
  optilens: 14,
  scramblerelectronics: 5,
  titaniumplating: 22,
  tungstencarbide: 10,
  weaponcomponent: 15,

  // Goods (238 items)
  aerospacegold: 24,
  buildingschematic: 12,
  catmedia: 42,
  compactlibrary: 18,
  compressionliquefier: 8,
  deepmantlesample: 15,
  gmultitool: 6,
  healthmonitor: 20,
  inertialcanister: 14,
  ionbattery: 55,
  shipschematic: 4,
  suitschematic: 8,
  surveillanceequipment: 8,
  weaponschematic: 6,
  lockerkeys: 15,
  nutritionalconcentrate: 20,

  // Data - Operational (124 items)
  airqualityreports: 28,
  ballisticsdata: 14,
  combattrainingmaterial: 16,
  dutyrota: 22,
  evacuationroutes: 9,
  maintenanceeval: 12,
  patrolroutes: 7,
  settlementdefenceplans: 4,
  surveillancelogs: 2,
  personallogs: 10,

  // Data - Financial (68 items)
  balanceledger: 16,
  bankaccountdata: 8,
  blackmailmaterial: 4,
  combatschedules: 10,
  financialprojections: 12,
  insuranceclaims: 7,
  marketreports: 6,
  opinionpolls: 3,
  smearcampaignplans: 2,

  // Data - Technical (92 items)
  biometricdata: 14,
  catastrophicdatabanks: 5,
  chemicalformulae: 12,
  combatmetricdata: 18,
  extractiondata: 10,
  manufacturinginstructions: 8,
  medicalrecords: 11,
  reactoroutputreview: 6,
  spectralanalysisdata: 5,
  weaponinventory: 3,
};

export class OdysseyLockerEngine {
  private items: Map<string, OdysseyLockerItem> = new Map();
  private listeners: Set<() => void> = new Set();
  private db: IDBDatabase | null = null;
  private isIndexedDbSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (this.isIndexedDbSupported) {
      await this.initIndexedDb();
    }
  }

  private async initIndexedDb(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
            const store = db.createObjectStore(STORE_MATERIALS, { keyPath: 'id' });
            store.createIndex('by_category', 'category', { unique: false });
            store.createIndex('by_subCategory', 'subCategory', { unique: false });
          }
        };

        req.onsuccess = async () => {
          this.db = req.result;
          await this.loadFromIndexedDb();
          resolve();
        };

        req.onerror = () => {
          resolve(); // Fall back to localStorage / memory
        };
      } catch {
        resolve();
      }
    });
  }

  private async loadFromIndexedDb(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_MATERIALS, 'readonly');
        const store = tx.objectStore(STORE_MATERIALS);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: OdysseyLockerItem[] = req.result;
          if (records && records.length > 0) {
            this.items.clear();
            for (const item of records) {
              this.items.set(item.id.toLowerCase(), item);
            }
            this.notify();
          }
          resolve();
        };

        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async persistToIndexedDb(): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_MATERIALS, 'readwrite');
      const store = tx.objectStore(STORE_MATERIALS);
      store.clear();
      for (const item of this.items.values()) {
        store.put(item);
      }
    } catch (err) {
      console.warn('Failed to persist locker to IndexedDB:', err);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      this.populateMockData();
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_LOCKER_KEY);
      if (saved) {
        const parsed: Record<string, number> = JSON.parse(saved);
        this.items.clear();
        for (const [id, count] of Object.entries(parsed)) {
          this.setItemCount(id, count, false);
        }
        return;
      }
    } catch {
      // Fall through to mock
    }

    this.populateMockData();
  }

  private populateMockData(): void {
    this.items.clear();
    for (const [id, count] of Object.entries(DEFAULT_MOCK_ODYSSEY_LOCKER)) {
      this.setItemCount(id, count, false);
    }
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload: Record<string, number> = {};
      for (const [id, item] of this.items.entries()) {
        if (item.count > 0) {
          payload[id] = item.count;
        }
      }
      localStorage.setItem(STORAGE_LOCKER_KEY, JSON.stringify(payload));
      this.persistToIndexedDb();
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  /**
   * Set the quantity of an item by ID
   */
  public setItemCount(rawId: string, count: number, shouldPersist = true): void {
    const id = rawId.toLowerCase().trim();
    const safeCount = Math.max(0, Math.floor(count));

    const def = ODYSSEY_CATALOG_MAP.get(id);
    if (!def) {
      // Create fallback dynamic definition if new Frontier item
      const fallbackName = rawId
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();
      const fallbackItem: OdysseyLockerItem = {
        id,
        name: fallbackName,
        category: 'assets',
        subCategory: 'Tech',
        rarity: 'Standard',
        count: safeCount,
        baseValue: 1000,
        totalValue: safeCount * 1000,
        description: 'Odyssey micro-resource registered from journal or CAPI stream.',
        updatedAt: Date.now(),
      };
      if (safeCount > 0) {
        this.items.set(id, fallbackItem);
      } else {
        this.items.delete(id);
      }
    } else {
      if (safeCount > 0) {
        const item: OdysseyLockerItem = {
          id: def.id,
          name: def.name,
          category: def.category,
          subCategory: def.subCategory,
          rarity: def.rarity,
          count: safeCount,
          baseValue: def.baseValue,
          totalValue: safeCount * def.baseValue,
          isIllegal: def.isIllegal,
          description: def.description,
          updatedAt: Date.now(),
        };
        this.items.set(id, item);
      } else {
        this.items.delete(id);
      }
    }

    if (shouldPersist) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Commit in-memory changes to storage and notify subscribers
   */
  public commitChanges(): void {
    this.saveToStorage();
    this.notify();
  }

  /**
   * Increment or decrement item count
   */
  public adjustItemCount(rawId: string, delta: number): void {
    const id = rawId.toLowerCase().trim();
    const current = this.items.get(id)?.count ?? 0;
    this.setItemCount(id, current + delta, true);
  }

  /**
   * Ingest journal event: ShipLockerMaterials, ShipLocker, or BackpackMaterials
   */
  public ingestJournalShipLocker(event: JournalShipLockerEvent): { ingestedCount: number; totalStored: number } {
    let ingested = 0;

    // Helper to extract items array
    const processList = (list?: JournalLockerMaterialEntry[], defaultCat?: OdysseyCategory) => {
      if (!list || !Array.isArray(list)) return;
      for (const entry of list) {
        if (!entry.Name) continue;
        const normalizedId = entry.Name.toLowerCase()
          .replace(/_name$/i, '')
          .replace(/^\$|\$$/g, '')
          .replace(/\s+/g, '');

        const count = entry.Count ?? 0;
        this.setItemCount(normalizedId, count, false);
        ingested++;
      }
    };

    // Components are Assets (Chemicals, Circuits, Tech)
    processList(event.Components, 'assets');
    // Items are Goods
    processList(event.Items, 'goods');
    // Data entries
    processList(event.Data, 'data');
    // Consumables (if present in locker)
    processList(event.Consumables, 'goods');

    this.saveToStorage();
    this.notify();

    return {
      ingestedCount: ingested,
      totalStored: this.getAudit().totalItems,
    };
  }

  /**
   * Ingest CAPI profile Odyssey locker payload
   */
  public ingestCapiLocker(capiShipLocker: Record<string, Record<string, number>>): void {
    if (!capiShipLocker || typeof capiShipLocker !== 'object') return;

    for (const [categoryKey, items] of Object.entries(capiShipLocker)) {
      if (typeof items === 'object' && items !== null) {
        for (const [itemName, count] of Object.entries(items)) {
          const normalizedId = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
          this.setItemCount(normalizedId, Number(count) || 0, false);
        }
      }
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Get all items in the locker
   */
  public getAllItems(): OdysseyLockerItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get an item by ID
   */
  public getItem(rawId: string): OdysseyLockerItem | undefined {
    return this.items.get(rawId.toLowerCase().trim());
  }

  /**
   * Get quantity count of an item in locker
   */
  public getItemCount(rawId: string): number {
    return this.items.get(rawId.toLowerCase().trim())?.count ?? 0;
  }

  /**
   * Calculate 1,000-cap inventory audit metrics
   */
  public getAudit(): OdysseyLockerAudit {
    let totalItems = 0;
    let totalValuationCredits = 0;
    let assetsCount = 0;
    let goodsCount = 0;
    let dataCount = 0;

    const subCategoryCounts: Record<OdysseySubCategory, number> = {
      Chemicals: 0,
      Circuits: 0,
      Tech: 0,
      Goods: 0,
      Operational: 0,
      Financial: 0,
      Technical: 0,
    };

    for (const item of this.items.values()) {
      totalItems += item.count;
      totalValuationCredits += item.totalValue;

      if (item.category === 'assets') {
        assetsCount += item.count;
      } else if (item.category === 'goods') {
        goodsCount += item.count;
      } else if (item.category === 'data') {
        dataCount += item.count;
      }

      if (item.subCategory in subCategoryCounts) {
        subCategoryCounts[item.subCategory] += item.count;
      }
    }

    const capacityPercent = Math.min(100, (totalItems / ODYSSEY_LOCKER_CAPACITY) * 100);

    return {
      totalItems,
      maxCapacity: ODYSSEY_LOCKER_CAPACITY,
      capacityPercent: Math.round(capacityPercent * 10) / 10,
      isNearCap: totalItems >= 800,
      isAtCap: totalItems >= ODYSSEY_LOCKER_CAPACITY,
      totalValuationCredits,
      assetsCount,
      goodsCount,
      dataCount,
      subCategoryCounts,
    };
  }

  /**
   * Clear all items or reset to initial default
   */
  public resetToDefault(): void {
    this.populateMockData();
    this.notify();
  }

  public clearLocker(): void {
    this.items.clear();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Subscription helper for Svelte reactivity
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const odysseyLockerEngine = new OdysseyLockerEngine();
