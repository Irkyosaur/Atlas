// Location: atlas/client/src/lib/engine/odyssey_triage_engine.ts
// Odyssey "Safe-to-Sell" Clean List, Junk Asset Triage & Wishlist Protection Engine (Phase 10, Stage 10.2)
// Identifies useless Odyssey goods and data safe for liquidation at concourse Bartenders,
// enforces user wishlist protection for engineering recipes, computes windfall credits,
// and executes simulated one-click bulk sell with undo capability.

import {
  type OdysseyItemCrossReference,
  type OdysseyBlueprintDefinition,
  ODYSSEY_CROSS_REFERENCE_TABLE,
  ODYSSEY_BLUEPRINTS,
  getOdysseyItemCrossReference,
} from './odyssey_blueprint_catalog';
import {
  odysseyLockerEngine,
  type OdysseyLockerItem,
  ODYSSEY_LOCKER_CAPACITY,
} from './odyssey_locker_engine';

export type TriageItemStatus =
  | 'safe_to_sell' // Zero blueprint/unlock utility, safe for 100% liquidation
  | 'engineering_material' // Used in suit or weapon upgrades/modifications
  | 'engineer_unlock' // Critical requirement for unlocking on-foot engineer
  | 'wishlist_locked'; // Actively locked/protected by the commander's engineering wishlist

export interface OdysseyTriageItemView {
  item: OdysseyLockerItem;
  crossRef: OdysseyItemCrossReference;
  status: TriageItemStatus;
  isSafeToSell: boolean; // True ONLY if status === 'safe_to_sell' AND NOT locked by wishlist
  isWishlistProtected: boolean;
  isManuallyLocked: boolean;
}

export interface OdysseyLiquidationSummary {
  totalWindfallCredits: number;
  totalSafeUnits: number;
  totalSafeUniqueTypes: number;
  capacityFreedPercent: number;
  newCapacityAfterSale: number;
  currentCapacity: number;
  breakdown: {
    goodsCredits: number;
    goodsUnits: number;
    dataCredits: number;
    dataUnits: number;
    assetsCredits: number;
    assetsUnits: number;
  };
  safeItemsList: OdysseyTriageItemView[];
}

export interface LiquidationExecutionResult {
  unitsSold: number;
  uniqueTypesSold: number;
  creditsEarned: number;
  freedSlots: number;
  remainingLockerCount: number;
  timestamp: number;
}

const STORAGE_WISHLIST_KEY = 'atlas_odyssey_wishlist_v1';
const STORAGE_MANUAL_LOCKS_KEY = 'atlas_odyssey_manual_locks_v1';

export class OdysseyTriageEngine {
  private activeBlueprintIds: Set<string> = new Set();
  private manuallyLockedItemIds: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private lastLiquidationSnapshot: Record<string, number> | null = null;
  private isInitialized = false;

  constructor() {
    this.loadState();
  }

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.loadState();
  }

  private loadState(): void {
    if (typeof window === 'undefined') {
      // Default sample wishlist for offline / demo mode
      this.activeBlueprintIds.add('suit_night_vision');
      this.activeBlueprintIds.add('suit_extra_backpack');
      return;
    }

    try {
      const savedWishlist = localStorage.getItem(STORAGE_WISHLIST_KEY);
      if (savedWishlist) {
        const parsed: string[] = JSON.parse(savedWishlist);
        this.activeBlueprintIds = new Set(parsed);
      } else {
        // Default recommended wishlists
        this.activeBlueprintIds.add('suit_night_vision');
        this.activeBlueprintIds.add('suit_extra_backpack');
        this.saveWishlist();
      }

      const savedLocks = localStorage.getItem(STORAGE_MANUAL_LOCKS_KEY);
      if (savedLocks) {
        const parsedLocks: string[] = JSON.parse(savedLocks);
        this.manuallyLockedItemIds = new Set(parsedLocks);
      }
    } catch {
      // Fallback
      this.activeBlueprintIds.add('suit_night_vision');
      this.activeBlueprintIds.add('suit_extra_backpack');
    }
  }

  private saveWishlist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(Array.from(this.activeBlueprintIds)));
    } catch {
      // ignore
    }
  }

  private saveManualLocks(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_MANUAL_LOCKS_KEY, JSON.stringify(Array.from(this.manuallyLockedItemIds)));
    } catch {
      // ignore
    }
  }

  // =========================================================================
  // WISHLIST & MANUAL LOCK MANAGEMENT
  // =========================================================================

  public getActiveBlueprintIds(): string[] {
    return Array.from(this.activeBlueprintIds);
  }

  public getActiveBlueprints(): OdysseyBlueprintDefinition[] {
    return ODYSSEY_BLUEPRINTS.filter((bp) => this.activeBlueprintIds.has(bp.id));
  }

  public getAllAvailableBlueprints(): OdysseyBlueprintDefinition[] {
    return ODYSSEY_BLUEPRINTS;
  }

  public toggleBlueprintWishlist(blueprintId: string): void {
    if (this.activeBlueprintIds.has(blueprintId)) {
      this.activeBlueprintIds.delete(blueprintId);
    } else {
      this.activeBlueprintIds.add(blueprintId);
    }
    this.saveWishlist();
    this.notify();
  }

  public isBlueprintInWishlist(blueprintId: string): boolean {
    return this.activeBlueprintIds.has(blueprintId);
  }

  public toggleManualItemLock(rawItemId: string): void {
    const id = rawItemId.toLowerCase().trim();
    if (this.manuallyLockedItemIds.has(id)) {
      this.manuallyLockedItemIds.delete(id);
    } else {
      this.manuallyLockedItemIds.add(id);
    }
    this.saveManualLocks();
    this.notify();
  }

  public isItemManuallyLocked(rawItemId: string): boolean {
    return this.manuallyLockedItemIds.has(rawItemId.toLowerCase().trim());
  }

  /**
   * Evaluates whether an item is protected by any active wishlist blueprint OR manually locked.
   * If protected, it can NEVER be classified as safe to sell or bulk-liquidated.
   */
  public isItemWishlistProtected(rawItemId: string): boolean {
    const id = rawItemId.toLowerCase().trim();

    // 1. Check manual commander locks
    if (this.manuallyLockedItemIds.has(id)) {
      return true;
    }

    // 2. Check active engineering blueprints on wishlist
    for (const bp of ODYSSEY_BLUEPRINTS) {
      if (this.activeBlueprintIds.has(bp.id)) {
        for (const mat of bp.requiredMaterials) {
          if (mat.itemId.toLowerCase() === id) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public clearWishlist(): void {
    this.activeBlueprintIds.clear();
    this.saveWishlist();
    this.notify();
  }

  public clearManualLocks(): void {
    this.manuallyLockedItemIds.clear();
    this.saveManualLocks();
    this.notify();
  }

  // =========================================================================
  // TRIAGE CLASSIFICATION & AUDIT
  // =========================================================================

  /**
   * Classifies an individual inventory item with full triage status
   */
  public triageItem(item: OdysseyLockerItem): OdysseyTriageItemView {
    const crossRef = getOdysseyItemCrossReference(item.id);
    const isWishlistProtected = this.isItemWishlistProtected(item.id);
    const isManuallyLocked = this.isItemManuallyLocked(item.id);

    let status: TriageItemStatus;

    if (isWishlistProtected) {
      // User wishlist protection permanently locks item and overrides safe-to-sell
      status = 'wishlist_locked';
    } else if (crossRef.role === 'safe_to_sell') {
      status = 'safe_to_sell';
    } else if (crossRef.role === 'engineer_unlock') {
      status = 'engineer_unlock';
    } else {
      status = 'engineering_material';
    }

    const isSafeToSell = status === 'safe_to_sell';

    return {
      item,
      crossRef,
      status,
      isSafeToSell,
      isWishlistProtected,
      isManuallyLocked,
    };
  }

  /**
   * Computes the complete Concourse Bartender liquidation summary across locker inventory
   */
  public calculateLiquidationSummary(inventory: OdysseyLockerItem[]): OdysseyLiquidationSummary {
    let totalWindfallCredits = 0;
    let totalSafeUnits = 0;
    let goodsCredits = 0;
    let goodsUnits = 0;
    let dataCredits = 0;
    let dataUnits = 0;
    let assetsCredits = 0;
    let assetsUnits = 0;

    const safeItemsList: OdysseyTriageItemView[] = [];
    let currentCapacity = 0;

    for (const item of inventory) {
      currentCapacity += item.count;
      if (item.count <= 0) continue;

      const triaged = this.triageItem(item);
      if (triaged.isSafeToSell) {
        const itemValuation = item.count * item.baseValue;
        totalWindfallCredits += itemValuation;
        totalSafeUnits += item.count;
        safeItemsList.push(triaged);

        if (item.category === 'goods') {
          goodsCredits += itemValuation;
          goodsUnits += item.count;
        } else if (item.category === 'data') {
          dataCredits += itemValuation;
          dataUnits += item.count;
        } else {
          assetsCredits += itemValuation;
          assetsUnits += item.count;
        }
      }
    }

    const capacityFreedPercent = Math.round(((totalSafeUnits / ODYSSEY_LOCKER_CAPACITY) * 100) * 10) / 10;
    const newCapacityAfterSale = Math.max(0, currentCapacity - totalSafeUnits);

    return {
      totalWindfallCredits,
      totalSafeUnits,
      totalSafeUniqueTypes: safeItemsList.length,
      capacityFreedPercent,
      newCapacityAfterSale,
      currentCapacity,
      breakdown: {
        goodsCredits,
        goodsUnits,
        dataCredits,
        dataUnits,
        assetsCredits,
        assetsUnits,
      },
      safeItemsList,
    };
  }

  // =========================================================================
  // BULK SELL SIMULATION & EXECUTION
  // =========================================================================

  /**
   * Simulates one-click liquidation of all safe-to-sell items at nearest Concourse Bartender.
   * Decrements counts to 0 in odysseyLockerEngine and preserves an undo snapshot.
   */
  public liquidateSafeToSell(): LiquidationExecutionResult {
    const allItems = odysseyLockerEngine.getAllItems();
    const summary = this.calculateLiquidationSummary(allItems);

    // Capture snapshot for undo
    this.lastLiquidationSnapshot = {};
    for (const triaged of summary.safeItemsList) {
      this.lastLiquidationSnapshot[triaged.item.id] = triaged.item.count;
      // Set count to 0 in engine
      odysseyLockerEngine.setItemCount(triaged.item.id, 0, false);
    }

    // Persist changes
    odysseyLockerEngine.commitChanges();
    const audit = odysseyLockerEngine.getAudit();

    this.notify();

    return {
      unitsSold: summary.totalSafeUnits,
      uniqueTypesSold: summary.totalSafeUniqueTypes,
      creditsEarned: summary.totalWindfallCredits,
      freedSlots: summary.totalSafeUnits,
      remainingLockerCount: audit.totalItems,
      timestamp: Date.now(),
    };
  }

  /**
   * Reverts the most recent bulk liquidation by restoring previous quantities
   */
  public undoLiquidation(): boolean {
    if (!this.lastLiquidationSnapshot || Object.keys(this.lastLiquidationSnapshot).length === 0) {
      return false;
    }

    for (const [id, count] of Object.entries(this.lastLiquidationSnapshot)) {
      odysseyLockerEngine.setItemCount(id, count, false);
    }

    odysseyLockerEngine.commitChanges();
    this.lastLiquidationSnapshot = null;
    this.notify();
    return true;
  }

  public hasUndoAvailable(): boolean {
    return this.lastLiquidationSnapshot !== null && Object.keys(this.lastLiquidationSnapshot).length > 0;
  }

  // =========================================================================
  // REACTIVE SUBSCRIPTIONS
  // =========================================================================

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

export const odysseyTriageEngine = new OdysseyTriageEngine();
