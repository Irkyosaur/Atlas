// Location: atlas/client/src/lib/engine/odyssey_barter_engine.ts
// Odyssey Concourse Bartender Barter Calculator & Material Trade Optimizer (Phase 10, Stage 10.3)
// Implements official Odyssey bartender trading rules:
// 1. Assets within the same category family (Chemicals, Circuits, Tech) can be exchanged at predefined fixed ratios.
// 2. Goods and Data cannot be bartered at Bartenders (Concourse buy/sell for credits only).
// 3. Trade Optimizer: select a desired target asset (e.g. Micro Hydraulics or Carbon Fibre) and compute
//    optimal surrender counts of surplus inventory to acquire it, respecting player wishlist locks and minimizing waste.
// 4. Locates nearest starports and outposts with active concourse Bartender contacts.

import {
  type OdysseyCategory,
  type OdysseySubCategory,
  type OdysseyItemDefinition,
  ODYSSEY_LOCKER_CATALOG,
  ODYSSEY_CATALOG_MAP,
} from './odyssey_locker_catalog';
import {
  odysseyLockerEngine,
  type OdysseyLockerItem,
  ODYSSEY_LOCKER_CAPACITY,
} from './odyssey_locker_engine';
import {
  odysseyTriageEngine,
} from './odyssey_triage_engine';

export interface BartenderContactStarport {
  id: string;
  name: string;
  system: string;
  distanceLy: number;
  stationType: string;
  hasConcourse: boolean;
  padSize: 'Small' | 'Medium' | 'Large';
  distanceLs: number;
  allegiance: 'Federation' | 'Empire' | 'Alliance' | 'Independent';
  economy: string;
  security: string;
  isAnarchy: boolean; // Anarchy bartenders also accept illegal contraband goods/data
}

export interface BarterSurrenderPlanItem {
  itemId: string;
  name: string;
  subCategory: OdysseySubCategory;
  availableCount: number;
  surrenderCount: number;
  barterValuePerUnit: number;
  totalBarterValueContributed: number;
  isWishlistProtected: boolean;
  isSafeToSell: boolean;
}

export interface BarterOptimizationResult {
  targetItemId: string;
  targetItemName: string;
  targetCategory: OdysseySubCategory;
  targetBarterCostPerUnit: number;
  desiredQuantity: number;
  totalBarterCostRequired: number;

  totalBarterValueGenerated: number;
  unitsAcquirable: number;
  surplusPointsWasted: number;
  isFullyFunded: boolean;
  deficitBarterPoints: number;

  surrenderPlan: BarterSurrenderPlanItem[];
  inventoryDelta: {
    surrenderTotalUnits: number;
    targetAcquiredUnits: number;
    netLockerCapacityChange: number; // e.g. -14 if surrendering 24 to get 10
  };
  explanationNotes: string[];
}

export interface DirectTradeExchangeRate {
  sourceItem: OdysseyItemDefinition;
  targetItem: OdysseyItemDefinition;
  isTradeable: boolean;
  reason?: string;
  unitsSourceNeededForOneTarget: number;
  pointsPerSource: number;
  costPerTarget: number;
  exactRatioStr: string; // e.g. "3 : 1" or "1.8 : 1"
}

// Canonical known starports with active concourse Bartender services
export const CANONICAL_BARTENDER_STARPORTS: BartenderContactStarport[] = [
  {
    id: 'st_sol_li_qing',
    name: 'Li Qing Jao',
    system: 'Sol',
    distanceLy: 0.0,
    stationType: 'Coriolis Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 1240,
    allegiance: 'Federation',
    economy: 'Refinery / High Tech',
    security: 'High',
    isAnarchy: false,
  },
  {
    id: 'st_sol_gorbachev',
    name: 'M. Gorbachev',
    system: 'Sol',
    distanceLy: 0.0,
    stationType: 'Orbis Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 512,
    allegiance: 'Federation',
    economy: 'Industrial',
    security: 'High',
    isAnarchy: false,
  },
  {
    id: 'st_sol_earth_cradle',
    name: 'Columbus Orbital',
    system: 'Sol',
    distanceLy: 0.0,
    stationType: 'Ocellus Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 890,
    allegiance: 'Federation',
    economy: 'Service / Extraction',
    security: 'High',
    isAnarchy: false,
  },
  {
    id: 'st_alpha_centauri_hutton',
    name: 'Hutton Orbital',
    system: 'Alpha Centauri',
    distanceLy: 4.37,
    stationType: 'Outpost',
    hasConcourse: true,
    padSize: 'Medium',
    distanceLs: 6784404,
    allegiance: 'Independent',
    economy: 'Industrial',
    security: 'Low',
    isAnarchy: false,
  },
  {
    id: 'st_shinrarta_jameson',
    name: 'Jameson Memorial',
    system: 'Shinrarta Dezhra',
    distanceLy: 64.8,
    stationType: 'Orbis Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 320,
    allegiance: 'Independent',
    economy: 'High Tech / Industrial',
    security: 'High',
    isAnarchy: false,
  },
  {
    id: 'st_wolf359_lounge',
    name: 'Lomas Terminal',
    system: 'Wolf 359',
    distanceLy: 7.78,
    stationType: 'Coriolis Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 420,
    allegiance: 'Federation',
    economy: 'Refinery',
    security: 'Medium',
    isAnarchy: false,
  },
  {
    id: 'st_anarchy_haven',
    name: 'Blackgate Haven',
    system: 'Archon Ridge',
    distanceLy: 28.4,
    stationType: 'Asteroid Base',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 180,
    allegiance: 'Independent',
    economy: 'Anarchy / Smuggling',
    security: 'Anarchy',
    isAnarchy: true,
  },
  {
    id: 'st_procyon_port',
    name: 'Cygni Depot',
    system: 'Procyon',
    distanceLy: 11.4,
    stationType: 'Ocellus Starport',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 650,
    allegiance: 'Federation',
    economy: 'High Tech',
    security: 'High',
    isAnarchy: false,
  },
  {
    id: 'st_barnards_star_boston',
    name: 'Boston Base',
    system: "Barnard's Star",
    distanceLy: 5.96,
    stationType: 'Planetary Port',
    hasConcourse: true,
    padSize: 'Large',
    distanceLs: 840,
    allegiance: 'Federation',
    economy: 'Refinery / Extraction',
    security: 'Medium',
    isAnarchy: false,
  },
];

export class OdysseyBarterEngine {
  private listeners: Set<() => void> = new Set();
  private selectedTargetItemId: string = 'aerogelgelpack'; // Default: Micro Hydraulics
  private desiredQuantity: number = 5;
  private preferSafeToSellFirst: boolean = true;
  private protectWishlistItems: boolean = true;
  private customSurrenderAllocations: Map<string, number> = new Map();

  constructor() {}

  /**
   * Subscribe to barter engine changes
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[OdysseyBarterEngine] Listener error:', err);
      }
    });
  }

  public getSelectedTargetItemId(): string {
    return this.selectedTargetItemId;
  }

  public setSelectedTargetItemId(id: string): void {
    const item = ODYSSEY_CATALOG_MAP.get(id.toLowerCase());
    if (item && item.category === 'assets') {
      this.selectedTargetItemId = item.id;
      this.customSurrenderAllocations.clear();
      this.notify();
    }
  }

  public getDesiredQuantity(): number {
    return this.desiredQuantity;
  }

  public setDesiredQuantity(qty: number): void {
    this.desiredQuantity = Math.max(1, Math.min(100, Math.round(qty)));
    this.notify();
  }

  public getPreferSafeToSellFirst(): boolean {
    return this.preferSafeToSellFirst;
  }

  public setPreferSafeToSellFirst(prefer: boolean): void {
    this.preferSafeToSellFirst = prefer;
    this.notify();
  }

  public getProtectWishlistItems(): boolean {
    return this.protectWishlistItems;
  }

  public setProtectWishlistItems(protect: boolean): void {
    this.protectWishlistItems = protect;
    this.notify();
  }

  public setCustomSurrenderCount(itemId: string, count: number): void {
    if (count <= 0) {
      this.customSurrenderAllocations.delete(itemId);
    } else {
      this.customSurrenderAllocations.set(itemId, count);
    }
    this.notify();
  }

  public clearCustomAllocations(): void {
    this.customSurrenderAllocations.clear();
    this.notify();
  }

  /**
   * Checks whether an item category can be traded at a Bartender.
   * Per Frontier rules: Assets (Chemicals, Circuits, Tech) are barterable.
   * Goods and Data CANNOT be bartered at Bartenders (only sold for credits).
   */
  public isTradeableAtBartender(itemIdOrCategory: string): { isTradeable: boolean; reason: string } {
    const item = ODYSSEY_CATALOG_MAP.get(itemIdOrCategory.toLowerCase());
    if (!item) {
      if (itemIdOrCategory.toLowerCase() === 'assets') {
        return { isTradeable: true, reason: 'Assets are tradeable at Concourse Bartenders.' };
      }
      return {
        isTradeable: false,
        reason: 'Goods and Data cannot be bartered at Bartenders. Sell them for credits or keep for blueprints.',
      };
    }

    if (item.category === 'assets') {
      return {
        isTradeable: true,
        reason: `Tradeable within the ${item.subCategory} category pool at Bartenders.`,
      };
    }

    if (item.category === 'goods') {
      return {
        isTradeable: false,
        reason: 'NON-TRADEABLE: Goods cannot be bartered with Bartenders. They can only be sold for credits or delivered to Engineers.',
      };
    }

    return {
      isTradeable: false,
      reason: 'NON-TRADEABLE: Data files cannot be bartered with Bartenders. They can only be sold for credits or downloaded for blueprints.',
    };
  }

  /**
   * Returns list of all barterable assets (Chemicals, Circuits, Tech)
   */
  public getBarterableAssets(subCategory?: OdysseySubCategory): OdysseyItemDefinition[] {
    return ODYSSEY_LOCKER_CATALOG.filter((item) => {
      if (item.category !== 'assets') return false;
      if (subCategory && item.subCategory !== subCategory) return false;
      return true;
    });
  }

  /**
   * Calculates the direct 1:1 barter ratio between any two assets in the same category.
   */
  public calculateExchangeRate(sourceItemId: string, targetItemId: string): DirectTradeExchangeRate {
    const src = ODYSSEY_CATALOG_MAP.get(sourceItemId.toLowerCase());
    const tgt = ODYSSEY_CATALOG_MAP.get(targetItemId.toLowerCase());

    if (!src || !tgt) {
      throw new Error(`Invalid item IDs for barter calculation: ${sourceItemId}, ${targetItemId}`);
    }

    if (src.category !== 'assets' || tgt.category !== 'assets') {
      return {
        sourceItem: src,
        targetItem: tgt,
        isTradeable: false,
        reason: 'Bartender only barters Assets. Goods and Data cannot be traded.',
        unitsSourceNeededForOneTarget: 0,
        pointsPerSource: 0,
        costPerTarget: 0,
        exactRatioStr: 'N/A',
      };
    }

    if (src.subCategory !== tgt.subCategory) {
      return {
        sourceItem: src,
        targetItem: tgt,
        isTradeable: false,
        reason: `Cross-category barter prohibited: Cannot trade ${src.subCategory} for ${tgt.subCategory}.`,
        unitsSourceNeededForOneTarget: 0,
        pointsPerSource: 0,
        costPerTarget: 0,
        exactRatioStr: 'N/A',
      };
    }

    const srcPoints = src.barterValue ?? 3;
    const tgtCost = tgt.barterCost ?? 7;
    const unitsNeeded = Math.ceil(tgtCost / srcPoints);
    const rawRatio = (tgtCost / srcPoints).toFixed(1);

    return {
      sourceItem: src,
      targetItem: tgt,
      isTradeable: true,
      unitsSourceNeededForOneTarget: unitsNeeded,
      pointsPerSource: srcPoints,
      costPerTarget: tgtCost,
      exactRatioStr: `${unitsNeeded} : 1 (${rawRatio}x value)`,
    };
  }

  /**
   * Core Barter Optimizer:
   * Given a target asset and desired quantity, finds the optimal combination
   * of surplus locker assets in the same category to surrender.
   * Priority:
   * 1. Items flagged as Safe-to-Sell (no active blueprint utility)
   * 2. Non-wishlist surplus assets with highest surplus counts
   * 3. Minimizes wasted points (remainder above target cost)
   * 4. Excludes active wishlist protected items if protection is enabled
   */
  public computeOptimalBarterPlan(
    targetItemId: string = this.selectedTargetItemId,
    desiredQuantity: number = this.desiredQuantity
  ): BarterOptimizationResult {
    const targetDef = ODYSSEY_CATALOG_MAP.get(targetItemId.toLowerCase());
    if (!targetDef || targetDef.category !== 'assets') {
      const fallbackDef = ODYSSEY_CATALOG_MAP.get('aerogelgelpack')!;
      return this.computeOptimalBarterPlan(fallbackDef.id, desiredQuantity);
    }

    const targetBarterCost = targetDef.barterCost ?? 7;
    const totalCostRequired = targetBarterCost * desiredQuantity;
    const lockerItems = odysseyLockerEngine.getAllItems();

    // Filter candidate surplus materials strictly in the SAME subCategory
    const candidates = lockerItems
      .filter((lockerItem) => {
        if (lockerItem.id === targetDef.id) return false; // Cannot trade an item for itself
        const def = ODYSSEY_CATALOG_MAP.get(lockerItem.id);
        if (!def || def.category !== 'assets') return false;
        return def.subCategory === targetDef.subCategory;
      })
      .map((lockerItem) => {
        const def = ODYSSEY_CATALOG_MAP.get(lockerItem.id)!;
        const triageView = odysseyTriageEngine.triageItem(lockerItem);
        const isWishlistProtected = odysseyTriageEngine.isItemWishlistProtected(lockerItem.id);
        const isSafeToSell = triageView.isSafeToSell;
        const barterValue = def.barterValue ?? 3;

        // Custom override if user hand-tuned the surrender slider
        const customCount = this.customSurrenderAllocations.get(lockerItem.id);

        return {
          itemId: lockerItem.id,
          name: lockerItem.name,
          subCategory: def.subCategory,
          availableCount: lockerItem.count,
          barterValuePerUnit: barterValue,
          isWishlistProtected,
          isSafeToSell,
          customCount,
        };
      });

    // Sort candidates:
    // 1. Items with custom allocations first
    // 2. Safe-to-Sell items first (if preferSafeToSellFirst is on)
    // 3. Unprotected before protected
    // 4. Highest available inventory count
    candidates.sort((a, b) => {
      if (a.customCount !== undefined && b.customCount === undefined) return -1;
      if (b.customCount !== undefined && a.customCount === undefined) return 1;

      if (this.protectWishlistItems) {
        if (!a.isWishlistProtected && b.isWishlistProtected) return -1;
        if (a.isWishlistProtected && !b.isWishlistProtected) return 1;
      }

      if (this.preferSafeToSellFirst) {
        if (a.isSafeToSell && !b.isSafeToSell) return -1;
        if (!a.isSafeToSell && b.isSafeToSell) return 1;
      }

      return b.availableCount - a.availableCount;
    });

    let accumulatedValue = 0;
    const planItems: BarterSurrenderPlanItem[] = [];
    const notes: string[] = [];

    // Phase A: Apply manual/custom allocations if any
    for (const cand of candidates) {
      if (cand.customCount !== undefined && cand.customCount > 0) {
        const surrender = Math.min(cand.availableCount, cand.customCount);
        const contributed = surrender * cand.barterValuePerUnit;
        accumulatedValue += contributed;
        planItems.push({
          itemId: cand.itemId,
          name: cand.name,
          subCategory: cand.subCategory,
          availableCount: cand.availableCount,
          surrenderCount: surrender,
          barterValuePerUnit: cand.barterValuePerUnit,
          totalBarterValueContributed: contributed,
          isWishlistProtected: cand.isWishlistProtected,
          isSafeToSell: cand.isSafeToSell,
        });
      }
    }

    // Phase B: Greedy allocation to meet totalCostRequired
    if (accumulatedValue < totalCostRequired) {
      for (const cand of candidates) {
        if (cand.customCount !== undefined) continue; // Already handled

        // Skip wishlist protected if enabled
        if (this.protectWishlistItems && cand.isWishlistProtected) {
          continue;
        }

        if (cand.availableCount <= 0) continue;

        const neededValue = totalCostRequired - accumulatedValue;
        const unitsNeeded = Math.ceil(neededValue / cand.barterValuePerUnit);
        const unitsToTake = Math.min(cand.availableCount, unitsNeeded);

        if (unitsToTake > 0) {
          const contributed = unitsToTake * cand.barterValuePerUnit;
          accumulatedValue += contributed;

          planItems.push({
            itemId: cand.itemId,
            name: cand.name,
            subCategory: cand.subCategory,
            availableCount: cand.availableCount,
            surrenderCount: unitsToTake,
            barterValuePerUnit: cand.barterValuePerUnit,
            totalBarterValueContributed: contributed,
            isWishlistProtected: cand.isWishlistProtected,
            isSafeToSell: cand.isSafeToSell,
          });
        }

        if (accumulatedValue >= totalCostRequired) break;
      }
    }

    const unitsAcquirable = Math.floor(accumulatedValue / targetBarterCost);
    const surplusPointsWasted = accumulatedValue % targetBarterCost;
    const isFullyFunded = unitsAcquirable >= desiredQuantity;
    const deficitBarterPoints = Math.max(0, totalCostRequired - accumulatedValue);

    const totalSurrenderUnits = planItems.reduce((acc, p) => acc + p.surrenderCount, 0);
    const actualAcquired = isFullyFunded ? desiredQuantity : unitsAcquirable;
    const netChange = actualAcquired - totalSurrenderUnits;

    if (isFullyFunded) {
      notes.push(
        `Optimal barter plan found: Surrender ${totalSurrenderUnits} ${targetDef.subCategory} assets to receive ${desiredQuantity}x ${targetDef.name}.`
      );
    } else {
      notes.push(
        `Partial funding: Current inventory can acquire ${unitsAcquirable} of ${desiredQuantity} ${targetDef.name} (${deficitBarterPoints} barter points missing).`
      );
    }

    if (surplusPointsWasted > 0) {
      notes.push(
        `Wasted Points Warning: ${surplusPointsWasted} remainder barter points will be absorbed by the Bartender (no refund).`
      );
    }

    return {
      targetItemId: targetDef.id,
      targetItemName: targetDef.name,
      targetCategory: targetDef.subCategory,
      targetBarterCostPerUnit: targetBarterCost,
      desiredQuantity,
      totalBarterCostRequired: totalCostRequired,
      totalBarterValueGenerated: accumulatedValue,
      unitsAcquirable,
      surplusPointsWasted,
      isFullyFunded,
      deficitBarterPoints,
      surrenderPlan: planItems,
      inventoryDelta: {
        surrenderTotalUnits: totalSurrenderUnits,
        targetAcquiredUnits: actualAcquired,
        netLockerCapacityChange: netChange,
      },
      explanationNotes: notes,
    };
  }

  /**
   * Executes the barter trade in the local locker vault simulation:
   * Deducts surrendered items, adds the target item, and updates the inventory audit.
   */
  public executeBarterTrade(plan: BarterOptimizationResult): { success: boolean; message: string } {
    if (!plan.isFullyFunded && plan.unitsAcquirable === 0) {
      return { success: false, message: 'Insufficient barter points to acquire even 1 unit.' };
    }

    const unitsToAcquire = plan.isFullyFunded ? plan.desiredQuantity : plan.unitsAcquirable;

    // Deduct surrendered materials
    for (const item of plan.surrenderPlan) {
      if (item.surrenderCount > 0) {
        odysseyLockerEngine.adjustItemCount(item.itemId, -item.surrenderCount);
      }
    }

    // Add acquired target asset
    odysseyLockerEngine.adjustItemCount(plan.targetItemId, unitsToAcquire);

    this.customSurrenderAllocations.clear();
    this.notify();

    return {
      success: true,
      message: `Successfully bartered for ${unitsToAcquire}x ${plan.targetItemName} at Concourse Bartender!`,
    };
  }

  /**
   * Returns nearby starports with active Bartenders, sorted by distance from current location
   */
  public getNearbyBartenderStarports(maxDistanceLy = 100): BartenderContactStarport[] {
    return CANONICAL_BARTENDER_STARPORTS.filter((s) => s.distanceLy <= maxDistanceLy).sort(
      (a, b) => a.distanceLy - b.distanceLy
    );
  }
}

export const odysseyBarterEngine = new OdysseyBarterEngine();
