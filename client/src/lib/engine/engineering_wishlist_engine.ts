// Location: atlas/client/src/lib/engine/engineering_wishlist_engine.ts
// Horizons & Odyssey Engineering Wishlist & Material Deficit Router Engine (Stage 9.4)
// Aggregates required engineering materials across selected modules/wishlist items,
// calculates deficits against inventory, and triangulates nearest material traders / high-grade farming POIs.

import {
  type MaterialCategory,
  type EngineeringMaterialCost,
  type MaterialRequirementsLedger,
  ENGINEERING_BLUEPRINTS,
  EXPERIMENTAL_EFFECTS,
} from './engineering_catalog';

export interface WishlistModuleItem {
  id: string; // unique wishlist entry ID
  moduleName: string; // e.g. "8A Frame Shift Drive"
  slotType: 'core' | 'optional' | 'hardpoint' | 'utility';
  shipType?: string; // e.g. "Anaconda"
  blueprintId: string; // e.g. "fsd_long_range"
  blueprintName: string; // e.g. "Increased Range"
  targetGrade: number; // 1 to 5
  rollsEstimate: number; // e.g. 15 rolls
  experimentalId?: string | null;
  experimentalName?: string | null;
  addedEpochMs: number;
}

export interface MaterialDeficitItem {
  name: string;
  category: MaterialCategory;
  grade: number; // 1 to 5
  required: number;
  inventory: number;
  deficit: number; // max(0, required - inventory)
  surplus: number; // max(0, inventory - required)
  nearestTraderSystem?: string;
  nearestTraderDistanceLy?: number;
  farmingLocationTip?: string;
}

export interface MaterialDeficitSummary {
  totalRequired: number;
  totalOwned: number;
  totalDeficit: number;
  rawDeficitCount: number;
  encodedDeficitCount: number;
  manufacturedDeficitCount: number;
  materials: MaterialDeficitItem[];
}

const STORAGE_WISHLIST_KEY = 'atlas_engineering_wishlist_v1';
const STORAGE_INVENTORY_KEY = 'atlas_engineering_inventory_v1';

// Typical commander starter materials inventory
export const DEFAULT_MOCK_INVENTORY: Record<string, number> = {
  // Raw
  'Iron': 180,
  'Nickel': 140,
  'Carbon': 95,
  'Phosphorus': 110,
  'Sulphur': 130,
  'Chromium': 42,
  'Vanadium': 36,
  'Zirconium': 22,
  'Manganese': 50,
  'Arsenic': 14,
  'Selenium': 18,
  'Cadmium': 12,
  'Ruthenium': 6,
  'Tellurium': 8,
  'Polonium': 4,
  'Antimony': 2,

  // Encoded
  'Ascan': 40,
  'Anomalous Bulk Scan Data': 24,
  'Datamined Wake Exceptions': 11,
  'Classified Scan Databanks': 15,
  'Cracked Industrial Firmware': 8,
  'Security Firmware Patch': 5,
  'Modified Consumer Firmware': 35,
  'Atypical Disrupted Wake Echoes': 60,
  'Strange Wake Solutions': 28,
  'Adaptive Encryptors Capture': 6,
  'Open Symmetric Keys': 12,
  'Anomalous Emission Data': 32,

  // Manufactured
  'Chemical Processors': 45,
  'Chemical Manipulators': 16,
  'Pharmaceutical Isolators': 5,
  'Imperial Shields': 12,
  'Proto Light Alloys': 18,
  'Proto Radiolic Alloys': 7,
  'Core Dynamics Composites': 8,
  'Military Supercapacitors': 6,
  'Thermic Alloys': 25,
  'Precipitated Alloys': 30,
  'High Density Composites': 22,
  'Grid Resistors': 40,
  'Focus Crystals': 35,
  'Refined Focus Crystals': 18,
  'Exquisite Focus Crystals': 9,
  'Biotech Conductors': 14,
  'Conductive Ceramics': 26,
};

export const FARMING_TIPS: Record<string, string> = {
  // Raw
  'Selenium': 'HR 3230 3 a (Crystalline Shards) or LHS 417 9 E A',
  'Polonium': 'HIP 36601 C 1 a (Crystalline Shards, 1,500 LY bubble fringe)',
  'Tellurium': 'HIP 36601 C 3 b (Crystalline Shards)',
  'Ruthenium': 'HIP 36601 C 1 d (Crystalline Shards)',
  'Antimony': 'Outotz LS-K d8-3 B 5 c (Crystalline Shards)',
  'Technetium': 'HIP 36601 C 5 a (Crystalline Shards)',
  'Yttrium': 'Outotz LS-K d8-3 B 5 a (Crystalline Shards)',
  'Arsenic': 'Deciat 7 b or Trade down from Polonium at Raw Trader',

  // Encoded
  'Datamined Wake Exceptions': 'Famine Distribution Centers (High Wake scanning) or Jameson Crash Site cross-trade',
  'Adaptive Encryptors Capture': 'Jameson Crash Site (HIP 12099 1 b, Comms beacons)',
  'Cracked Industrial Firmware': 'Jameson Crash Site (HIP 12099 1 b) trade at Encoded Trader',
  'Classified Scan Databanks': 'Civil Unrest Starport beacon scanning or Encoded Trader',

  // Manufactured
  'Pharmaceutical Isolators': 'Outbreak Systems (High Grade Emissions HGE signal sources)',
  'Imperial Shields': 'Empire Boom/Election Systems (HGE Signal Sources, 60+ min)',
  'Core Dynamics Composites': 'Federation None/Election Systems (HGE Signal Sources)',
  'Military Supercapacitors': 'War / Civil War Systems (HGE Signal Sources)',
  'Biotech Conductors': 'Robigo Mines passenger missions / Wing combat reward vouchers',
  'Exquisite Focus Crystals': 'Robigo Mines passenger missions / High-threat assassination missions',
  'Chemical Manipulators': 'Dav\'s Hope (Hyades Sector AL-O b6-2) or Anarchy Outpost cargo ships',
};

export class EngineeringWishlistEngine {
  private wishlist: WishlistModuleItem[] = [];
  private inventory: Record<string, number> = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const storedWishlist = localStorage.getItem(STORAGE_WISHLIST_KEY);
        if (storedWishlist) {
          this.wishlist = JSON.parse(storedWishlist);
        } else {
          this.wishlist = this.getDefaultWishlist();
        }

        const storedInventory = localStorage.getItem(STORAGE_INVENTORY_KEY);
        if (storedInventory) {
          this.inventory = JSON.parse(storedInventory);
        } else {
          this.inventory = { ...DEFAULT_MOCK_INVENTORY };
        }
      } catch (e) {
        console.warn('[EngineeringWishlistEngine] Load error', e);
        this.wishlist = this.getDefaultWishlist();
        this.inventory = { ...DEFAULT_MOCK_INVENTORY };
      }
    } else {
      this.wishlist = this.getDefaultWishlist();
      this.inventory = { ...DEFAULT_MOCK_INVENTORY };
    }
  }

  private getDefaultWishlist(): WishlistModuleItem[] {
    return [
      {
        id: 'wish-1',
        moduleName: '8A Frame Shift Drive',
        slotType: 'core',
        shipType: 'Anaconda',
        blueprintId: 'fsd_long_range',
        blueprintName: 'Increased FSD Range',
        targetGrade: 5,
        rollsEstimate: 15,
        experimentalId: 'exp_mass_manager',
        experimentalName: 'Mass Manager',
        addedEpochMs: Date.now() - 3600000,
      },
      {
        id: 'wish-2',
        moduleName: '7A Thrusters',
        slotType: 'core',
        shipType: 'Anaconda',
        blueprintId: 'thrusters_dirty',
        blueprintName: 'Dirty Thruster Tuning',
        targetGrade: 5,
        rollsEstimate: 15,
        experimentalId: 'exp_drag_drives',
        experimentalName: 'Drag Drives',
        addedEpochMs: Date.now() - 1800000,
      },
      {
        id: 'wish-3',
        moduleName: '7A Prismatic Shield Generator',
        slotType: 'optional',
        shipType: 'Fer-de-Lance',
        blueprintId: 'shield_reinforced',
        blueprintName: 'Reinforced Shields',
        targetGrade: 5,
        rollsEstimate: 15,
        experimentalId: 'exp_hi_cap',
        experimentalName: 'Hi-Cap',
        addedEpochMs: Date.now() - 900000,
      },
    ];
  }

  private saveState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(this.wishlist));
        localStorage.setItem(STORAGE_INVENTORY_KEY, JSON.stringify(this.inventory));
      } catch (e) {
        console.warn('[EngineeringWishlistEngine] Save error', e);
      }
    }
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    cb();
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch (e) {
        console.error('[EngineeringWishlistEngine] Listener failed', e);
      }
    }
  }

  public getWishlist(): WishlistModuleItem[] {
    return [...this.wishlist];
  }

  public getInventory(): Record<string, number> {
    return { ...this.inventory };
  }

  public addItem(item: Omit<WishlistModuleItem, 'id' | 'addedEpochMs'>): string {
    const id = `wish-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newItem: WishlistModuleItem = {
      ...item,
      id,
      addedEpochMs: Date.now(),
    };
    this.wishlist.push(newItem);
    this.saveState();
    return id;
  }

  public removeItem(id: string): void {
    this.wishlist = this.wishlist.filter((w) => w.id !== id);
    this.saveState();
  }

  public clearWishlist(): void {
    this.wishlist = [];
    this.saveState();
  }

  public setInventoryCount(materialName: string, count: number): void {
    this.inventory[materialName] = Math.max(0, count);
    this.saveState();
  }

  /**
   * Calculates required materials and deficits against owned inventory
   */
  public calculateDeficits(referenceSystem: string = 'Sol'): MaterialDeficitSummary {
    const tally: Record<string, { category: MaterialCategory; grade: number; required: number }> = {};

    for (const item of this.wishlist) {
      const bp = ENGINEERING_BLUEPRINTS[item.blueprintId];
      if (bp) {
        // Tally grades 1 through targetGrade
        for (let g = 1; g <= item.targetGrade; g++) {
          const gData = bp.grades[g];
          if (!gData) continue;
          const rolls = g === item.targetGrade ? 5 : g; // progressive roll estimate
          for (const mat of gData.materials) {
            if (!tally[mat.name]) {
              tally[mat.name] = {
                category: mat.category,
                grade: mat.grade,
                required: 0,
              };
            }
            tally[mat.name].required += mat.count * rolls;
          }
        }
      }

      // Experimental cost
      if (item.experimentalId) {
        const exp = EXPERIMENTAL_EFFECTS[item.experimentalId];
        if (exp) {
          for (const mat of exp.materials) {
            if (!tally[mat.name]) {
              tally[mat.name] = {
                category: mat.category,
                grade: mat.grade,
                required: 0,
              };
            }
            tally[mat.name].required += mat.count;
          }
        }
      }
    }

    const items: MaterialDeficitItem[] = [];
    let totalRequired = 0;
    let totalOwned = 0;
    let totalDeficit = 0;
    let rawDeficitCount = 0;
    let encodedDeficitCount = 0;
    let manufacturedDeficitCount = 0;

    for (const [name, data] of Object.entries(tally)) {
      const owned = this.inventory[name] || 0;
      const deficit = Math.max(0, data.required - owned);
      const surplus = Math.max(0, owned - data.required);

      totalRequired += data.required;
      totalOwned += Math.min(owned, data.required);
      if (deficit > 0) {
        totalDeficit += deficit;
        if (data.category === 'Raw') rawDeficitCount += deficit;
        if (data.category === 'Encoded') encodedDeficitCount += deficit;
        if (data.category === 'Manufactured') manufacturedDeficitCount += deficit;
      }

      // Nearest material trader stub / tip
      let traderSys = 'Sol';
      let traderDist = 12.4;
      if (data.category === 'Raw') {
        traderSys = 'Kuk (39.5 LY)';
        traderDist = 39.5;
      } else if (data.category === 'Encoded') {
        traderSys = 'Orerve (44.1 LY)';
        traderDist = 44.1;
      } else if (data.category === 'Manufactured') {
        traderSys = 'LP 816-60 (28.2 LY)';
        traderDist = 28.2;
      }

      items.push({
        name,
        category: data.category,
        grade: data.grade,
        required: data.required,
        inventory: owned,
        deficit,
        surplus,
        nearestTraderSystem: traderSys,
        nearestTraderDistanceLy: traderDist,
        farmingLocationTip: FARMING_TIPS[name] || 'Manufactured HGE / Mission Reward',
      });
    }

    // Sort by deficit desc, then grade desc, then name
    items.sort((a, b) => b.deficit - a.deficit || b.grade - a.grade || a.name.localeCompare(b.name));

    return {
      totalRequired,
      totalOwned,
      totalDeficit,
      rawDeficitCount,
      encodedDeficitCount,
      manufacturedDeficitCount,
      materials: items,
    };
  }
}

export const engineeringWishlistEngine = new EngineeringWishlistEngine();
