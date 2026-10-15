// Location: atlas/client/src/lib/engine/odyssey_wishlist_engine.ts
// Odyssey Wishlist Planner & Engineer Progression Tracker Engine (Phase 10, Stage 10.4)
// Allows commanders to:
// - Build wishlists containing suit upgrades (e.g. Artemis G1->G5), weapon upgrades, and desired modifications
// - Cross-reference total required materials with live Odyssey Locker inventory counts
// - Compute aggregate missing materials, surplus coverage, and total credit costs
// - Track Odyssey Engineer unlock states (Locked, Discovered, Invited, Unlocked)
// - Sync with localStorage and notify reactive Svelte 5 runes components

import {
  ODYSSEY_MODIFICATIONS,
  ODYSSEY_EQUIPMENT_CATALOG,
  ODYSSEY_ENGINEERS,
  type ModificationDefinition,
  type EquipmentDefinition,
  type EngineerDefinition,
  type ItemGrade,
  type MaterialCostItem,
} from './odyssey_wishlist_catalog';
import { odysseyLockerEngine } from './odyssey_locker_engine';

export interface WishlistEquipmentItem {
  instanceId: string;
  equipmentId: string;
  equipmentName: string;
  category: 'suit' | 'weapon';
  family?: string;
  currentGrade: ItemGrade;
  targetGrade: ItemGrade;
  selectedModIds: string[]; // up to 4 modifications based on targetGrade
}

export interface WishlistItemRequirement {
  itemId: string;
  name: string;
  requiredCount: number;
  lockerCount: number;
  missingCount: number;
  isSatisfied: boolean;
  usedInItems: string[]; // e.g. ["Artemis (G1->G5)", "Night Vision"]
}

export interface WishlistSummary {
  totalCreditCost: number;
  totalMaterialsRequired: number;
  totalMaterialsInLocker: number;
  totalMaterialsMissing: number;
  fulfillmentPercentage: number;
  isFullyReady: boolean;
  materialBreakdown: WishlistItemRequirement[];
}

export type EngineerStatus = 'locked' | 'discovered' | 'invited' | 'unlocked';

export interface EngineerProgressView {
  engineer: EngineerDefinition;
  status: EngineerStatus;
}

const STORAGE_WISHLIST_PLAN_KEY = 'atlas_odyssey_wishlist_plan_v1';
const STORAGE_ENGINEER_PROGRESS_KEY = 'atlas_odyssey_engineer_progress_v1';

export class OdysseyWishlistEngine {
  private wishlistItems: WishlistEquipmentItem[] = [];
  private engineerStatuses: Map<string, EngineerStatus> = new Map();
  private listeners: Set<() => void> = new Set();
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
    // Default initial mock wishlist if none stored
    const defaultWishlist: WishlistEquipmentItem[] = [
      {
        instanceId: 'plan_artemis_alpha',
        equipmentId: 'artemis',
        equipmentName: 'Artemis Suit',
        category: 'suit',
        family: 'Suits',
        currentGrade: 1,
        targetGrade: 5,
        selectedModIds: ['suit_night_vision', 'suit_extra_backpack', 'suit_jump_assist', 'suit_increased_sprint'],
      },
      {
        instanceId: 'plan_karma_ar50',
        equipmentId: 'karma_ar50',
        equipmentName: 'Karma AR-50',
        category: 'weapon',
        family: 'Karma (Kinetic)',
        currentGrade: 1,
        targetGrade: 3,
        selectedModIds: ['weapon_noise_suppressor', 'weapon_stability'],
      },
    ];

    // Default engineer statuses
    const defaultEngineers: Record<string, EngineerStatus> = {
      domino_green: 'unlocked',
      hero_ferrari: 'invited',
      wellington_beck: 'discovered',
      kit_fowler: 'discovered',
      jude_navarro: 'unlocked',
      terra_velasquez: 'discovered',
      oden_geiger: 'locked',
      yarden_bond: 'locked',
      baltanos: 'discovered',
      eleanor_bresa: 'discovered',
      rosa_dayette: 'locked',
      yi_shen: 'locked',
    };

    if (typeof window === 'undefined') {
      this.wishlistItems = defaultWishlist;
      for (const [id, st] of Object.entries(defaultEngineers)) {
        this.engineerStatuses.set(id, st);
      }
      return;
    }

    try {
      const savedPlans = localStorage.getItem(STORAGE_WISHLIST_PLAN_KEY);
      if (savedPlans) {
        this.wishlistItems = JSON.parse(savedPlans);
      } else {
        this.wishlistItems = defaultWishlist;
        this.saveWishlist();
      }

      const savedEng = localStorage.getItem(STORAGE_ENGINEER_PROGRESS_KEY);
      if (savedEng) {
        const parsed: Record<string, EngineerStatus> = JSON.parse(savedEng);
        for (const [id, st] of Object.entries(parsed)) {
          this.engineerStatuses.set(id, st);
        }
      } else {
        for (const [id, st] of Object.entries(defaultEngineers)) {
          this.engineerStatuses.set(id, st);
        }
        this.saveEngineers();
      }
    } catch {
      this.wishlistItems = defaultWishlist;
    }
  }

  private saveWishlist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_WISHLIST_PLAN_KEY, JSON.stringify(this.wishlistItems));
    } catch {
      // ignore
    }
  }

  private saveEngineers(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, EngineerStatus> = {};
      for (const [id, st] of this.engineerStatuses.entries()) {
        obj[id] = st;
      }
      localStorage.setItem(STORAGE_ENGINEER_PROGRESS_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  // =========================================================================
  // WISHLIST MUTATIONS
  // =========================================================================

  public getWishlist(): WishlistEquipmentItem[] {
    return [...this.wishlistItems];
  }

  public addEquipmentToWishlist(
    equipmentId: string,
    currentGrade: ItemGrade = 1,
    targetGrade: ItemGrade = 5
  ): WishlistEquipmentItem | null {
    const equip = ODYSSEY_EQUIPMENT_CATALOG.find((e) => e.id === equipmentId);
    if (!equip) return null;

    const newItem: WishlistEquipmentItem = {
      instanceId: `plan_${equip.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      equipmentId: equip.id,
      equipmentName: equip.name,
      category: equip.category,
      family: equip.family,
      currentGrade,
      targetGrade: Math.max(currentGrade, targetGrade) as ItemGrade,
      selectedModIds: [],
    };

    this.wishlistItems.push(newItem);
    this.saveWishlist();
    this.notify();
    return newItem;
  }

  public removeWishlistItem(instanceId: string): void {
    this.wishlistItems = this.wishlistItems.filter((i) => i.instanceId !== instanceId);
    this.saveWishlist();
    this.notify();
  }

  public updateWishlistGrades(instanceId: string, currentGrade: ItemGrade, targetGrade: ItemGrade): void {
    const item = this.wishlistItems.find((i) => i.instanceId === instanceId);
    if (!item) return;

    item.currentGrade = currentGrade;
    item.targetGrade = Math.max(currentGrade, targetGrade) as ItemGrade;

    // Truncate mods if targetGrade has fewer slots:
    // G1=0 slots, G2=1 slot, G3=2 slots, G4=3 slots, G5=4 slots
    const maxSlots = Math.max(0, item.targetGrade - 1);
    if (item.selectedModIds.length > maxSlots) {
      item.selectedModIds = item.selectedModIds.slice(0, maxSlots);
    }

    this.saveWishlist();
    this.notify();
  }

  public toggleModification(instanceId: string, modId: string): boolean {
    const item = this.wishlistItems.find((i) => i.instanceId === instanceId);
    if (!item) return false;

    const maxSlots = Math.max(0, item.targetGrade - 1);
    const existingIndex = item.selectedModIds.indexOf(modId);

    if (existingIndex >= 0) {
      item.selectedModIds.splice(existingIndex, 1);
    } else {
      if (item.selectedModIds.length >= maxSlots) {
        return false; // Slot limit reached
      }
      item.selectedModIds.push(modId);
    }

    this.saveWishlist();
    this.notify();
    return true;
  }

  public clearWishlist(): void {
    this.wishlistItems = [];
    this.saveWishlist();
    this.notify();
  }

  public resetWishlistToDefault(): void {
    localStorage.removeItem(STORAGE_WISHLIST_PLAN_KEY);
    localStorage.removeItem(STORAGE_ENGINEER_PROGRESS_KEY);
    this.wishlistItems = [];
    this.engineerStatuses.clear();
    this.loadState();
    this.notify();
  }

  // =========================================================================
  // SUMMARY & MATERIAL BREAKDOWN CALCULATION
  // =========================================================================

  public computeSummary(): WishlistSummary {
    let totalCreditCost = 0;
    const requirementsMap = new Map<string, { name: string; count: number; sources: Set<string> }>();

    // 1. Accumulate upgrade costs (tiers from currentGrade to targetGrade)
    for (const item of this.wishlistItems) {
      const equip = ODYSSEY_EQUIPMENT_CATALOG.find((e) => e.id === item.equipmentId);
      if (!equip) continue;

      if (item.targetGrade > item.currentGrade) {
        for (const tier of equip.upgradeCosts) {
          if (tier.fromGrade >= item.currentGrade && tier.toGrade <= item.targetGrade) {
            totalCreditCost += tier.credits;
            for (const mat of tier.materials) {
              const existing = requirementsMap.get(mat.itemId) ?? {
                name: mat.name,
                count: 0,
                sources: new Set<string>(),
              };
              existing.count += mat.count;
              existing.sources.add(`${item.equipmentName} (G${item.currentGrade}->G${item.targetGrade})`);
              requirementsMap.set(mat.itemId, existing);
            }
          }
        }
      }

      // 2. Accumulate modification costs
      for (const modId of item.selectedModIds) {
        const modDef = ODYSSEY_MODIFICATIONS.find((m) => m.id === modId);
        if (!modDef) continue;

        for (const mat of modDef.requiredMaterials) {
          const existing = requirementsMap.get(mat.itemId) ?? {
            name: mat.name,
            count: 0,
            sources: new Set<string>(),
          };
          existing.count += mat.count;
          existing.sources.add(`${modDef.name} [Mod]`);
          requirementsMap.set(mat.itemId, existing);
        }
      }
    }

    // 3. Compare with live locker counts
    const materialBreakdown: WishlistItemRequirement[] = [];
    let totalMaterialsRequired = 0;
    let totalMaterialsInLocker = 0;
    let totalMaterialsMissing = 0;

    for (const [itemId, req] of requirementsMap.entries()) {
      const lockerCount = odysseyLockerEngine.getItemCount(itemId);
      const missingCount = Math.max(0, req.count - lockerCount);
      const isSatisfied = missingCount === 0;

      totalMaterialsRequired += req.count;
      totalMaterialsInLocker += Math.min(req.count, lockerCount);
      totalMaterialsMissing += missingCount;

      materialBreakdown.push({
        itemId,
        name: req.name,
        requiredCount: req.count,
        lockerCount,
        missingCount,
        isSatisfied,
        usedInItems: Array.from(req.sources),
      });
    }

    // Sort: missing materials first, then descending required count
    materialBreakdown.sort((a, b) => {
      if (a.isSatisfied !== b.isSatisfied) {
        return a.isSatisfied ? 1 : -1;
      }
      return b.missingCount - a.missingCount;
    });

    const fulfillmentPercentage =
      totalMaterialsRequired > 0
        ? Math.round((totalMaterialsInLocker / totalMaterialsRequired) * 100)
        : 100;

    return {
      totalCreditCost,
      totalMaterialsRequired,
      totalMaterialsInLocker,
      totalMaterialsMissing,
      fulfillmentPercentage,
      isFullyReady: totalMaterialsMissing === 0 && this.wishlistItems.length > 0,
      materialBreakdown,
    };
  }

  // =========================================================================
  // ENGINEER PROGRESSION TRACKER
  // =========================================================================

  public getEngineerProgressList(): EngineerProgressView[] {
    return ODYSSEY_ENGINEERS.map((eng) => ({
      engineer: eng,
      status: this.engineerStatuses.get(eng.id) ?? 'locked',
    }));
  }

  public setEngineerStatus(engineerId: string, status: EngineerStatus): void {
    this.engineerStatuses.set(engineerId, status);
    this.saveEngineers();
    this.notify();
  }

  public cycleEngineerStatus(engineerId: string): EngineerStatus {
    const current = this.engineerStatuses.get(engineerId) ?? 'locked';
    const order: EngineerStatus[] = ['locked', 'discovered', 'invited', 'unlocked'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    const nextStatus = order[nextIndex];
    this.setEngineerStatus(engineerId, nextStatus);
    return nextStatus;
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

export const odysseyWishlistEngine = new OdysseyWishlistEngine();
