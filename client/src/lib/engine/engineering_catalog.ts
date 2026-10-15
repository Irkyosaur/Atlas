/**
 * Atlas Shipbuilder Engine - Engineering Modifications, Blueprints & Experimental Effects
 * Stage 7.2: Comprehensive Module Engineering Customizer (G1-G5 Sliders)
 * Parity: Frontier Developments / Coriolis-data / EDSY / Inara
 */

export type MaterialCategory = 'Raw' | 'Encoded' | 'Manufactured';

export interface EngineeringMaterialCost {
  name: string;
  category: MaterialCategory;
  grade: number; // 1-5
  count: number;
}

export type EngineeringStatKey =
  | 'mass'
  | 'powerDraw'
  | 'powerGen'
  | 'integrity'
  | 'thermalLoad'
  | 'thermLoad'
  | 'optMass'
  | 'optMul'
  | 'sysCap'
  | 'engCap'
  | 'wepCap'
  | 'sysRate'
  | 'engRate'
  | 'wepRate'
  | 'range'
  | 'damage'
  | 'distDraw'
  | 'kinRes'
  | 'thermRes'
  | 'expRes'
  | 'regenRate'
  | 'brokenRegen'
  | 'hullReinforcement'
  | 'heatEfficiency';

export interface StatModifierRule {
  key: EngineeringStatKey;
  label: string;
  unit: '%' | 'T' | 'MW' | 's' | 'm' | 'HP' | 'deg';
  // compound multiplier factor at 100% of the grade, e.g. +0.40 for +40%, -0.15 for -15%
  maxFactor: number;
  isPositive: boolean; // whether positive value is beneficial
}

export interface EngineeringGradeBlueprint {
  grade: number;
  materials: EngineeringMaterialCost[];
  modifiers: {
    [key in EngineeringStatKey]?: number; // fractional delta at 100% grade, e.g. +0.40 for +40%
  };
}

export interface EngineeringBlueprint {
  id: string;
  name: string;
  description: string;
  appliesTo: string[]; // module types, e.g. 'thrusters', 'powerPlant', 'frameShiftDrive', 'weapons', etc.
  grades: Record<number, EngineeringGradeBlueprint>;
}

export interface ExperimentalEffect {
  id: string;
  name: string;
  description: string;
  appliesTo: string[];
  materials: EngineeringMaterialCost[];
  modifiers: {
    [key in EngineeringStatKey]?: number;
  };
}

export interface ModuleEngineeringState {
  blueprintId: string | null;
  grade: number; // 1 to 5 (0 = none)
  percent: number; // 0 to 100% (grade roll progress)
  experimentalId: string | null;
}

export interface ModuleBaseStats {
  moduleName: string;
  slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility';
  moduleType: string; // e.g. 'thrusters', 'powerPlant', 'frameShiftDrive', 'shieldGenerator', 'armour', 'weapons', 'distributor', etc.
  mass: number; // Tonnes
  powerDraw: number; // MW
  powerGen?: number; // MW (for power plant)
  integrity: number;
  thermalLoad: number;
  optMass?: number; // T
  optMul?: number; // % (e.g. 100)
  sysCap?: number; // MJ
  engCap?: number; // MJ
  wepCap?: number; // MJ
  sysRate?: number; // MW
  engRate?: number; // MW
  wepRate?: number; // MW
  range?: number; // m
  damage?: number; // DPS
  distDraw?: number; // MW / s
  kinRes?: number; // %
  thermRes?: number; // %
  expRes?: number; // %
  regenRate?: number; // MJ/s
  brokenRegen?: number; // MJ/s
  hullReinforcement?: number; // HP
  heatEfficiency?: number; // MW / MW (0.4 for 7A PP)
}

// -------------------------------------------------------------
// ENGINEERING BLUEPRINTS CATALOG
// -------------------------------------------------------------
export const ENGINEERING_BLUEPRINTS: Record<string, EngineeringBlueprint> = {
  // --- THRUSTERS ---
  thrusters_dirty: {
    id: 'thrusters_dirty',
    name: 'Dirty Drive Tuning',
    description: 'Increases thruster optimal multiplier and top speed drastically at the expense of higher thermal load and power draw.',
    appliesTo: ['thrusters'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Specialised Legacy Firmware', category: 'Encoded', grade: 1, count: 1 }],
        modifiers: { optMul: 0.15, optMass: -0.04, thermLoad: 0.20, powerDraw: 0.04, integrity: -0.03 },
      },
      2: {
        grade: 2,
        materials: [
          { name: 'Specialised Legacy Firmware', category: 'Encoded', grade: 1, count: 1 },
          { name: 'Mechanical Modules', category: 'Manufactured', grade: 2, count: 1 },
        ],
        modifiers: { optMul: 0.22, optMass: -0.06, thermLoad: 0.30, powerDraw: 0.06, integrity: -0.06 },
      },
      3: {
        grade: 3,
        materials: [
          { name: 'Modified Consumer Firmware', category: 'Encoded', grade: 2, count: 1 },
          { name: 'Cracked Industrial Firmware', category: 'Encoded', grade: 3, count: 1 },
        ],
        modifiers: { optMul: 0.29, optMass: -0.08, thermLoad: 0.40, powerDraw: 0.08, integrity: -0.09 },
      },
      4: {
        grade: 4,
        materials: [
          { name: 'Cracked Industrial Firmware', category: 'Encoded', grade: 3, count: 1 },
          { name: 'Chemical Manipulators', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Cadmium', category: 'Raw', grade: 4, count: 1 },
        ],
        modifiers: { optMul: 0.35, optMass: -0.10, thermLoad: 0.50, powerDraw: 0.10, integrity: -0.12 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Cracked Industrial Firmware', category: 'Encoded', grade: 3, count: 1 },
          { name: 'Cadmium', category: 'Raw', grade: 4, count: 1 },
          { name: 'Pharmaceutical Isolators', category: 'Manufactured', grade: 5, count: 1 },
        ],
        // Exact Inara / Coriolis Grade 5 dirty drives maximums:
        modifiers: { optMul: 0.40, optMass: -0.125, thermLoad: 0.60, powerDraw: 0.12, integrity: -0.15 },
      },
    },
  },
  thrusters_clean: {
    id: 'thrusters_clean',
    name: 'Clean Drive Tuning',
    description: 'Reduces thruster thermal load significantly with moderate speed gains at the cost of higher power draw.',
    appliesTo: ['thrusters'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Specialised Legacy Firmware', category: 'Encoded', grade: 1, count: 1 }],
        modifiers: { optMul: 0.08, optMass: -0.02, thermLoad: -0.20, powerDraw: 0.04, integrity: -0.03 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Mechanical Equipment', category: 'Manufactured', grade: 2, count: 1 }],
        modifiers: { optMul: 0.14, optMass: -0.04, thermLoad: -0.32, powerDraw: 0.07, integrity: -0.06 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { optMul: 0.19, optMass: -0.06, thermLoad: -0.42, powerDraw: 0.10, integrity: -0.09 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { optMul: 0.24, optMass: -0.08, thermLoad: -0.52, powerDraw: 0.13, integrity: -0.12 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Tin', category: 'Raw', grade: 4, count: 1 },
          { name: 'Abnormal Compact Emissions Data', category: 'Encoded', grade: 5, count: 1 },
        ],
        modifiers: { optMul: 0.28, optMass: -0.10, thermLoad: -0.60, powerDraw: 0.16, integrity: -0.16 },
      },
    },
  },

  // --- FRAME SHIFT DRIVE ---
  fsd_increased_range: {
    id: 'fsd_increased_range',
    name: 'Increased Range FSD',
    description: 'Substantially increases FSD optimal mass for greater jump ranges at the expense of module integrity and power draw.',
    appliesTo: ['frameShiftDrive'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Atypical Disrupted Wake Echoes', category: 'Encoded', grade: 1, count: 1 }],
        modifiers: { optMass: 0.15, mass: 0.06, integrity: -0.03, powerDraw: 0.03 },
      },
      2: {
        grade: 2,
        materials: [
          { name: 'Atypical Disrupted Wake Echoes', category: 'Encoded', grade: 1, count: 1 },
          { name: 'Chemical Processors', category: 'Manufactured', grade: 2, count: 1 },
        ],
        modifiers: { optMass: 0.25, mass: 0.12, integrity: -0.06, powerDraw: 0.06 },
      },
      3: {
        grade: 3,
        materials: [
          { name: 'Phosphorus', category: 'Raw', grade: 1, count: 1 },
          { name: 'Chemical Processors', category: 'Manufactured', grade: 2, count: 1 },
          { name: 'Strange Wake Solutions', category: 'Encoded', grade: 3, count: 1 },
        ],
        modifiers: { optMass: 0.35, mass: 0.18, integrity: -0.09, powerDraw: 0.09 },
      },
      4: {
        grade: 4,
        materials: [
          { name: 'Manganese', category: 'Raw', grade: 2, count: 1 },
          { name: 'Chemical Distillery', category: 'Manufactured', grade: 3, count: 1 },
          { name: 'Eccentric Hyperspace Trajectories', category: 'Encoded', grade: 4, count: 1 },
        ],
        modifiers: { optMass: 0.45, mass: 0.24, integrity: -0.12, powerDraw: 0.12 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Arsenic', category: 'Raw', grade: 3, count: 1 },
          { name: 'Chemical Manipulators', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Datamined Wake Exceptions', category: 'Encoded', grade: 5, count: 1 },
        ],
        modifiers: { optMass: 0.55, mass: 0.30, integrity: -0.15, powerDraw: 0.15 },
      },
    },
  },

  // --- POWER PLANT ---
  power_plant_overcharged: {
    id: 'power_plant_overcharged',
    name: 'Overcharged Power Plant',
    description: 'Increases power generation dramatically at the expense of heat efficiency and structural integrity.',
    appliesTo: ['powerPlant'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Sulphur', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { powerGen: 0.12, heatEfficiency: 0.05, integrity: -0.05 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { powerGen: 0.19, heatEfficiency: 0.10, integrity: -0.10 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Chemical Distillery', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { powerGen: 0.26, heatEfficiency: 0.15, integrity: -0.15 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { powerGen: 0.33, heatEfficiency: 0.20, integrity: -0.20 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Chemical Manipulators', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Tellurium', category: 'Raw', grade: 4, count: 1 },
        ],
        modifiers: { powerGen: 0.40, heatEfficiency: 0.25, integrity: -0.25 },
      },
    },
  },
  power_plant_armoured: {
    id: 'power_plant_armoured',
    name: 'Armoured Power Plant',
    description: 'Reinforces integrity and improves heat efficiency with a minor boost to power output, at the cost of mass.',
    appliesTo: ['powerPlant'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Worn Shield Emitters', category: 'Manufactured', grade: 1, count: 1 }],
        modifiers: { integrity: 0.30, heatEfficiency: -0.04, powerGen: 0.04, mass: 0.05 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Carbon', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { integrity: 0.50, heatEfficiency: -0.07, powerGen: 0.06, mass: 0.10 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'High Density Composites', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { integrity: 0.70, heatEfficiency: -0.10, powerGen: 0.08, mass: 0.15 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Proprietary Composites', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { integrity: 0.90, heatEfficiency: -0.11, powerGen: 0.10, mass: 0.20 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Core Dynamics Composites', category: 'Manufactured', grade: 5, count: 1 },
          { name: 'Military Supercapacitors', category: 'Manufactured', grade: 5, count: 1 },
          { name: 'Selenium', category: 'Raw', grade: 4, count: 1 },
        ],
        modifiers: { integrity: 1.20, heatEfficiency: -0.12, powerGen: 0.12, mass: 0.25 },
      },
    },
  },

  // --- POWER DISTRIBUTOR ---
  distributor_charge_enhanced: {
    id: 'distributor_charge_enhanced',
    name: 'Charge Enhanced Distributor',
    description: 'Dramatically improves recharge rates across all three capacitors at the expense of a slight drop in total capacity.',
    appliesTo: ['powerDistributor'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Worn Shield Emitters', category: 'Manufactured', grade: 1, count: 1 }],
        modifiers: { sysRate: 0.12, engRate: 0.12, wepRate: 0.12, sysCap: -0.02, engCap: -0.02, wepCap: -0.02 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { sysRate: 0.21, engRate: 0.21, wepRate: 0.21, sysCap: -0.03, engCap: -0.03, wepCap: -0.03 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Chemical Distillery', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { sysRate: 0.29, engRate: 0.29, wepRate: 0.29, sysCap: -0.04, engCap: -0.04, wepCap: -0.04 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { sysRate: 0.37, engRate: 0.37, wepRate: 0.37, sysCap: -0.045, engCap: -0.045, wepCap: -0.045 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Cracked Industrial Firmware', category: 'Encoded', grade: 3, count: 1 },
          { name: 'Chemical Manipulators', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Exquisite Focus Crystals', category: 'Manufactured', grade: 5, count: 1 },
        ],
        modifiers: { sysRate: 0.45, engRate: 0.45, wepRate: 0.45, sysCap: -0.05, engCap: -0.05, wepCap: -0.05 },
      },
    },
  },

  // --- SHIELD GENERATOR ---
  shield_reinforced: {
    id: 'shield_reinforced',
    name: 'Reinforced Shields',
    description: 'Increases shield strength and all resistances at the expense of distributor draw and broken recharge time.',
    appliesTo: ['shieldGenerator', 'optional'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Phosphorus', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { optMass: 0.08, kinRes: 0.04, thermRes: 0.04, expRes: 0.04, brokenRegen: -0.02, distDraw: 0.03 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { optMass: 0.15, kinRes: 0.07, thermRes: 0.07, expRes: 0.07, brokenRegen: -0.04, distDraw: 0.05 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { optMass: 0.23, kinRes: 0.10, thermRes: 0.10, expRes: 0.10, brokenRegen: -0.06, distDraw: 0.07 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Improvised Components', category: 'Manufactured', grade: 5, count: 1 }],
        modifiers: { optMass: 0.30, kinRes: 0.13, thermRes: 0.13, expRes: 0.13, brokenRegen: -0.08, distDraw: 0.10 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Arsenic', category: 'Raw', grade: 3, count: 1 },
          { name: 'Conductive Polymers', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Improvised Components', category: 'Manufactured', grade: 5, count: 1 },
        ],
        modifiers: { optMass: 0.38, kinRes: 0.165, thermRes: 0.165, expRes: 0.165, brokenRegen: -0.10, distDraw: 0.12 },
      },
    },
  },

  // --- ARMOUR & HULL REINFORCEMENT (HRP) ---
  armour_heavy_duty: {
    id: 'armour_heavy_duty',
    name: 'Heavy Duty Armour / HRP',
    description: 'Vastly reinforces structural hull integrity and kinetic/explosive resistances at the cost of module mass.',
    appliesTo: ['bulkheads', 'military', 'optional'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Carbon', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { hullReinforcement: 0.12, kinRes: 0.04, expRes: 0.04, thermRes: 0.03, mass: 0.08 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'High Density Composites', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { hullReinforcement: 0.20, kinRes: 0.06, expRes: 0.06, thermRes: 0.04, mass: 0.15 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Proprietary Composites', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { hullReinforcement: 0.30, kinRes: 0.08, expRes: 0.08, thermRes: 0.05, mass: 0.22 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Core Dynamics Composites', category: 'Manufactured', grade: 5, count: 1 }],
        modifiers: { hullReinforcement: 0.40, kinRes: 0.10, expRes: 0.10, thermRes: 0.06, mass: 0.28 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Core Dynamics Composites', category: 'Manufactured', grade: 5, count: 1 },
          { name: 'Military Supercapacitors', category: 'Manufactured', grade: 5, count: 1 },
          { name: 'Selenium', category: 'Raw', grade: 4, count: 1 },
        ],
        modifiers: { hullReinforcement: 0.54, kinRes: 0.14, expRes: 0.14, thermRes: 0.08, mass: 0.35 },
      },
    },
  },

  // --- WEAPONS: OVERCHARGED ---
  weapon_overcharged: {
    id: 'weapon_overcharged',
    name: 'Overcharged Weapon Tuning',
    description: 'Increases raw damage per shot substantially at the expense of distributor draw and thermal load.',
    appliesTo: ['hardpoint'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Nickel', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { damage: 0.18, distDraw: 0.08, thermLoad: 0.04 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { damage: 0.31, distDraw: 0.15, thermLoad: 0.07 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Chemical Distillery', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { damage: 0.44, distDraw: 0.22, thermLoad: 0.10 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { damage: 0.57, distDraw: 0.29, thermLoad: 0.12 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Zirconium', category: 'Raw', grade: 2, count: 1 },
          { name: 'Conductive Polymers', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Modified Embedded Firmware', category: 'Encoded', grade: 5, count: 1 },
        ],
        modifiers: { damage: 0.70, distDraw: 0.35, thermLoad: 0.15 },
      },
    },
  },

  // --- WEAPONS: LONG RANGE ---
  weapon_long_range: {
    id: 'weapon_long_range',
    name: 'Long Range Weapon',
    description: 'Eliminates damage fall-off and doubles effective engagement range at the cost of increased mass and power draw.',
    appliesTo: ['hardpoint'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Sulphur', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { range: 0.25, mass: 0.06, powerDraw: 0.03 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { range: 0.50, mass: 0.12, powerDraw: 0.06 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Focus Crystals', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { range: 0.75, mass: 0.18, powerDraw: 0.09 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Refined Focus Crystals', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { range: 0.90, mass: 0.24, powerDraw: 0.12 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Cracked Industrial Firmware', category: 'Encoded', grade: 3, count: 1 },
          { name: 'Conductive Polymers', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Exquisite Focus Crystals', category: 'Manufactured', grade: 5, count: 1 },
        ],
        modifiers: { range: 1.00, mass: 0.30, powerDraw: 0.15 },
      },
    },
  },

  // --- WEAPONS: EFFICIENT ---
  weapon_efficient: {
    id: 'weapon_efficient',
    name: 'Efficient Weapon Tuning',
    description: 'Heavily reduces weapon thermal generation, distributor draw, and power consumption with moderate damage increases.',
    appliesTo: ['hardpoint'],
    grades: {
      1: {
        grade: 1,
        materials: [{ name: 'Sulphur', category: 'Raw', grade: 1, count: 1 }],
        modifiers: { thermLoad: -0.20, distDraw: -0.15, powerDraw: -0.10, damage: 0.04 },
      },
      2: {
        grade: 2,
        materials: [{ name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { thermLoad: -0.32, distDraw: -0.25, powerDraw: -0.18, damage: 0.09 },
      },
      3: {
        grade: 3,
        materials: [{ name: 'Chemical Distillery', category: 'Manufactured', grade: 3, count: 1 }],
        modifiers: { thermLoad: -0.44, distDraw: -0.35, powerDraw: -0.26, damage: 0.14 },
      },
      4: {
        grade: 4,
        materials: [{ name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 }],
        modifiers: { thermLoad: -0.52, distDraw: -0.42, powerDraw: -0.32, damage: 0.19 },
      },
      5: {
        grade: 5,
        materials: [
          { name: 'Proto Heat Radiators', category: 'Manufactured', grade: 5, count: 1 },
          { name: 'Conductive Polymers', category: 'Manufactured', grade: 4, count: 1 },
          { name: 'Exquisite Focus Crystals', category: 'Manufactured', grade: 5, count: 1 },
        ],
        modifiers: { thermLoad: -0.60, distDraw: -0.50, powerDraw: -0.40, damage: 0.24 },
      },
    },
  },
};

// -------------------------------------------------------------
// EXPERIMENTAL EFFECTS CATALOG
// -------------------------------------------------------------
export const EXPERIMENTAL_EFFECTS: Record<string, ExperimentalEffect> = {
  // Thruster Experimentals
  drag_drives: {
    id: 'drag_drives',
    name: 'Drag Drives',
    description: 'Increases optimal multiplier by an additional +4.3% at the cost of +10% thermal load.',
    appliesTo: ['thrusters'],
    materials: [
      { name: 'Atypical Encryption Archives', category: 'Encoded', grade: 4, count: 1 },
      { name: 'Thermic Alloys', category: 'Manufactured', grade: 4, count: 1 },
      { name: 'Cadmium', category: 'Raw', grade: 4, count: 1 },
    ],
    modifiers: { optMul: 0.043, thermLoad: 0.10 },
  },
  drive_distributors: {
    id: 'drive_distributors',
    name: 'Drive Distributors',
    description: 'Expands optimal mass threshold by +10%, optimizing performance curves under heavy payload loads.',
    appliesTo: ['thrusters'],
    materials: [
      { name: 'Specialised Legacy Firmware', category: 'Encoded', grade: 1, count: 1 },
      { name: 'Mechanical Components', category: 'Manufactured', grade: 3, count: 1 },
    ],
    modifiers: { optMass: 0.10 },
  },
  thermal_spread_thrusters: {
    id: 'thermal_spread_thrusters',
    name: 'Thermal Spread (Thrusters)',
    description: 'Improves heat dissipation, reducing thermal generation by 10%.',
    appliesTo: ['thrusters'],
    materials: [
      { name: 'Heat Dispersion Plate', category: 'Manufactured', grade: 2, count: 1 },
      { name: 'Sulphur', category: 'Raw', grade: 1, count: 1 },
    ],
    modifiers: { thermLoad: -0.10 },
  },
  stripped_down_thrusters: {
    id: 'stripped_down_thrusters',
    name: 'Stripped Down (Thrusters)',
    description: 'Replaces casing with ultralight alloy structures, reducing module mass by 10%.',
    appliesTo: ['thrusters'],
    materials: [
      { name: 'Iron', category: 'Raw', grade: 1, count: 5 },
      { name: 'Hybrid Capacitors', category: 'Manufactured', grade: 2, count: 3 },
      { name: 'Proto Light Alloys', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { mass: -0.10 },
  },

  // FSD Experimentals
  mass_manager: {
    id: 'mass_manager',
    name: 'Mass Manager',
    description: 'Sensory tuning algorithms increase FSD optimal mass by +4% (synergistic on Class 5+ drives).',
    appliesTo: ['frameShiftDrive'],
    materials: [
      { name: 'Atypical Disrupted Wake Echoes', category: 'Encoded', grade: 1, count: 3 },
      { name: 'Galvanising Alloys', category: 'Manufactured', grade: 2, count: 1 },
      { name: 'Eccentric Hyperspace Trajectories', category: 'Encoded', grade: 4, count: 1 },
    ],
    modifiers: { optMass: 0.04, integrity: -0.08 },
  },
  deep_charge: {
    id: 'deep_charge',
    name: 'Deep Charge',
    description: 'Increases maximum fuel consumption per jump by 10%, giving slight range boost on Class 4 and smaller drives.',
    appliesTo: ['frameShiftDrive'],
    materials: [
      { name: 'Phosphorus', category: 'Raw', grade: 1, count: 3 },
      { name: 'Chemical Processors', category: 'Manufactured', grade: 2, count: 1 },
    ],
    modifiers: { optMass: 0.02, powerDraw: 0.05 },
  },

  // Power Plant Experimentals
  monstered: {
    id: 'monstered',
    name: 'Monstered',
    description: 'Oversized reactor components boost total power generation by +5% at the cost of +10% mass.',
    appliesTo: ['powerPlant'],
    materials: [
      { name: 'Grid Resistors', category: 'Manufactured', grade: 1, count: 5 },
      { name: 'Vanadium', category: 'Raw', grade: 2, count: 3 },
      { name: 'Polymer Capacitors', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { powerGen: 0.05, mass: 0.10 },
  },
  thermal_spread_pp: {
    id: 'thermal_spread_pp',
    name: 'Thermal Spread (Power Plant)',
    description: 'Improves reactor cooling conduits, reducing heat efficiency rating by 10% (cooler ship operation).',
    appliesTo: ['powerPlant'],
    materials: [
      { name: 'Grid Resistors', category: 'Manufactured', grade: 1, count: 5 },
      { name: 'Vanadium', category: 'Raw', grade: 2, count: 3 },
      { name: 'Heat Vanes', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { heatEfficiency: -0.10 },
  },
  stripped_down_pp: {
    id: 'stripped_down_pp',
    name: 'Stripped Down (Power Plant)',
    description: 'Minimizes chassis casing to reduce power plant mass by 10%.',
    appliesTo: ['powerPlant'],
    materials: [
      { name: 'Grid Resistors', category: 'Manufactured', grade: 1, count: 5 },
      { name: 'Vanadium', category: 'Raw', grade: 2, count: 3 },
      { name: 'Proprietary Composites', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { mass: -0.10 },
  },

  // Power Distributor Experimentals
  super_conduits: {
    id: 'super_conduits',
    name: 'Super Conduits',
    description: 'Advanced superconductors accelerate capacitor recharge rates by an extra +4% across SYS, ENG, and WEP.',
    appliesTo: ['powerDistributor'],
    materials: [
      { name: 'Conductive Ceramics', category: 'Manufactured', grade: 4, count: 1 },
      { name: 'Security Firmware Patch', category: 'Encoded', grade: 4, count: 1 },
    ],
    modifiers: { sysRate: 0.04, engRate: 0.04, wepRate: 0.04, sysCap: -0.03, engCap: -0.03, wepCap: -0.03 },
  },
  cluster_capacitors: {
    id: 'cluster_capacitors',
    name: 'Cluster Capacitors',
    description: 'Expands total capacitor reserve energy capacity by +8% across all banks.',
    appliesTo: ['powerDistributor'],
    materials: [
      { name: 'Hybrid Capacitors', category: 'Manufactured', grade: 2, count: 2 },
      { name: 'Electrochemical Arrays', category: 'Manufactured', grade: 3, count: 1 },
    ],
    modifiers: { sysCap: 0.08, engCap: 0.08, wepCap: 0.08, sysRate: -0.02, engRate: -0.02, wepRate: -0.02 },
  },

  // Shield Generator Experimentals
  fast_charge: {
    id: 'fast_charge',
    name: 'Fast Charge',
    description: 'Accelerates shield regeneration and reforming rates by +15% with a tiny -1.5% resistance penalty.',
    appliesTo: ['shieldGenerator', 'optional'],
    materials: [
      { name: 'Worn Shield Emitters', category: 'Manufactured', grade: 1, count: 5 },
      { name: 'Flawed Focus Crystals', category: 'Manufactured', grade: 2, count: 3 },
      { name: 'Compound Shielding', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { regenRate: 0.15, brokenRegen: 0.15, kinRes: -0.015, thermRes: -0.015, expRes: -0.015 },
  },
  hi_cap: {
    id: 'hi_cap',
    name: 'Hi-Cap (High Capacity)',
    description: 'Expands raw shield energy capacity by +5.5% at the cost of +25% mass and +10% power draw.',
    appliesTo: ['shieldGenerator', 'optional'],
    materials: [
      { name: 'Worn Shield Emitters', category: 'Manufactured', grade: 1, count: 5 },
      { name: 'Polymer Capacitors', category: 'Manufactured', grade: 4, count: 1 },
    ],
    modifiers: { optMass: 0.055, mass: 0.25, powerDraw: 0.10 },
  },

  // Armour Experimentals
  deep_plating: {
    id: 'deep_plating',
    name: 'Deep Plating',
    description: 'Multi-layer composite plating boosts overall hull hitpoints by +8% with a slight mass penalty.',
    appliesTo: ['bulkheads', 'military', 'optional'],
    materials: [
      { name: 'High Density Composites', category: 'Manufactured', grade: 3, count: 2 },
      { name: 'Proto Composite Radiators', category: 'Manufactured', grade: 5, count: 1 },
    ],
    modifiers: { hullReinforcement: 0.08, mass: 0.10 },
  },

  // Hardpoint Weapon Experimentals
  corrosive_shell: {
    id: 'corrosive_shell',
    name: 'Corrosive Shell',
    description: 'Applies caustic substance debuffing target hull hardness (+20 AP boost & +25% damage amplification) at -20% ammo capacity.',
    appliesTo: ['hardpoint'],
    materials: [
      { name: 'Chemical Processors', category: 'Manufactured', grade: 2, count: 2 },
      { name: 'Compound Shielding', category: 'Manufactured', grade: 4, count: 1 },
      { name: 'Arsenic', category: 'Raw', grade: 3, count: 1 },
    ],
    modifiers: { damage: 0.05 },
  },
  thermal_conduit: {
    id: 'thermal_conduit',
    name: 'Thermal Conduit',
    description: 'Scales weapon damage upward by up to +60% when ship internal heat exceeds 90% (peaking at 150%).',
    appliesTo: ['hardpoint'],
    materials: [
      { name: 'Heat Dispersion Plate', category: 'Manufactured', grade: 2, count: 5 },
      { name: 'Sulphur', category: 'Raw', grade: 1, count: 5 },
      { name: 'Tempered Alloys', category: 'Manufactured', grade: 1, count: 5 },
    ],
    modifiers: { damage: 0.10 },
  },
  thermal_vent: {
    id: 'thermal_vent',
    name: 'Thermal Vent',
    description: 'Dissipates ship heat directly into target when beam strikes hit, drastically cooling ship temperature.',
    appliesTo: ['hardpoint'],
    materials: [
      { name: 'Focus Crystals', category: 'Manufactured', grade: 3, count: 3 },
      { name: 'Modified Embedded Firmware', category: 'Encoded', grade: 5, count: 1 },
      { name: 'Zirconium', category: 'Raw', grade: 2, count: 2 },
    ],
    modifiers: { thermLoad: -0.25 },
  },
  oversized: {
    id: 'oversized',
    name: 'Oversized',
    description: 'Scaled up munition housing grants a direct +3% damage boost at the cost of +5% power draw.',
    appliesTo: ['hardpoint'],
    materials: [
      { name: 'Mechanical Equipment', category: 'Manufactured', grade: 2, count: 2 },
      { name: 'Phase Alloys', category: 'Manufactured', grade: 3, count: 1 },
    ],
    modifiers: { damage: 0.03, powerDraw: 0.05 },
  },
  incendiary_rounds: {
    id: 'incendiary_rounds',
    name: 'Incendiary Rounds',
    description: 'Modifies weapon munition to convert majority kinetic damage to thermal energy, increasing thermal load by 200%.',
    appliesTo: ['hardpoint'],
    materials: [
      { name: 'Phosphorus', category: 'Raw', grade: 1, count: 3 },
      { name: 'Conductive Components', category: 'Manufactured', grade: 3, count: 1 },
      { name: 'Proto Heat Radiators', category: 'Manufactured', grade: 5, count: 1 },
    ],
    modifiers: { thermLoad: 2.00, distDraw: 0.10 },
  },
};

// -------------------------------------------------------------
// DEFAULT STATS LOOKUP FOR SHIPS & STANDARD SLOTS
// -------------------------------------------------------------
export function getDefaultModuleStats(
  slotId: string,
  slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility',
  size: number = 7,
  installedName: string = ''
): ModuleBaseStats {
  if (slotId === 'core-thrusters' || slotId.includes('thrusters')) {
    // 7A Thrusters default
    const is7A = size === 7 || installedName.includes('7A');
    return {
      moduleName: `${size}A Thrusters`,
      slotType: 'core',
      moduleType: 'thrusters',
      mass: is7A ? 80.0 : Math.round(size * 10),
      powerDraw: is7A ? 8.4 : 5.0,
      integrity: is7A ? 144 : 120,
      thermalLoad: 28.5,
      optMass: is7A ? 2160 : 1400,
      optMul: 100.0,
    };
  }

  if (slotId === 'core-fsd' || slotId.includes('fsd')) {
    return {
      moduleName: `${size}A Frame Shift Drive`,
      slotType: 'core',
      moduleType: 'frameShiftDrive',
      mass: size === 7 ? 64.0 : size === 6 ? 40.0 : 20.0,
      powerDraw: 0.9,
      integrity: 150,
      thermalLoad: 18.0,
      optMass: size === 7 ? 2700 : size === 6 ? 1800 : 1050,
    };
  }

  if (slotId === 'core-pp' || slotId.includes('powerPlant')) {
    return {
      moduleName: `${size}A Power Plant`,
      slotType: 'core',
      moduleType: 'powerPlant',
      mass: size === 7 ? 32.0 : size === 8 ? 64.0 : 20.0,
      powerDraw: 0.0,
      powerGen: size === 7 ? 30.0 : size === 8 ? 36.0 : 25.0,
      integrity: 160,
      thermalLoad: 10.0,
      heatEfficiency: 0.40,
    };
  }

  if (slotId === 'core-pd' || slotId.includes('powerDistributor')) {
    const is8A = size === 8;
    const is7A = size === 7;
    return {
      moduleName: `${size}A Power Distributor`,
      slotType: 'core',
      moduleType: 'powerDistributor',
      mass: is8A ? 32.0 : is7A ? 25.0 : 16.0,
      powerDraw: is8A ? 1.05 : 0.8,
      integrity: is8A ? 165 : 130,
      thermalLoad: 5.0,
      sysCap: is8A ? 74.0 : 60.0,
      engCap: is8A ? 58.0 : 45.0,
      wepCap: is8A ? 84.0 : 65.0,
      sysRate: is8A ? 5.6 : 4.8,
      engRate: is8A ? 5.0 : 4.2,
      wepRate: is8A ? 7.2 : 6.8,
    };
  }

  if (slotId.startsWith('hp-') || slotType === 'hardpoint') {
    const isMediumOrLarge = size >= 2;
    return {
      moduleName: isMediumOrLarge ? `Class ${size} Multi-Cannon (Gimballed)` : `Class ${size} Pulse Laser (Fixed)`,
      slotType: 'hardpoint',
      moduleType: 'hardpoint',
      mass: size === 4 ? 16.0 : size === 3 ? 8.0 : size === 2 ? 4.0 : 2.0,
      powerDraw: size === 4 ? 2.5 : size === 3 ? 1.6 : size === 2 ? 1.0 : 0.6,
      integrity: 64,
      thermalLoad: 4.0,
      damage: size === 4 ? 35.0 : size === 3 ? 24.0 : size === 2 ? 15.0 : 8.5,
      range: 4000,
      distDraw: 1.2,
    };
  }

  if (slotType === 'military') {
    return {
      moduleName: `Class ${size} Hull Reinforcement Package`,
      slotType: 'military',
      moduleType: 'military',
      mass: size * 4.0,
      powerDraw: 0.0,
      integrity: 250,
      thermalLoad: 0.0,
      hullReinforcement: size * 110,
      kinRes: 2.0,
      thermRes: 2.0,
      expRes: 2.0,
    };
  }

  if (slotId === 'core-bulkheads') {
    return {
      moduleName: 'Lightweight Military Bulkheads',
      slotType: 'core',
      moduleType: 'bulkheads',
      mass: 0.0,
      powerDraw: 0.0,
      integrity: 350,
      thermalLoad: 0.0,
      hullReinforcement: 300,
      kinRes: -20,
      thermRes: 0,
      expRes: -40,
    };
  }

  // Optional internal
  return {
    moduleName: size >= 5 ? `Class ${size}A Shield Generator` : `Class ${size} Cargo Rack`,
    slotType: 'optional',
    moduleType: size >= 5 ? 'shieldGenerator' : 'optional',
    mass: size >= 5 ? 32.0 : 0.0,
    powerDraw: size >= 5 ? 4.8 : 0.0,
    integrity: 140,
    thermalLoad: size >= 5 ? 2.5 : 0.0,
    optMass: size >= 5 ? 1060 : undefined,
    regenRate: size >= 5 ? 2.2 : undefined,
    brokenRegen: size >= 5 ? 5.8 : undefined,
    kinRes: 40,
    thermRes: -20,
    expRes: 50,
  };
}

// -------------------------------------------------------------
// COMPOUND MULTIPLIER AND STAT CALCULATION
// -------------------------------------------------------------
export interface CalculatedModuleStats extends ModuleBaseStats {
  modifiedMass: number;
  modifiedPowerDraw: number;
  modifiedPowerGen?: number;
  modifiedIntegrity: number;
  modifiedThermalLoad: number;
  modifiedOptMass?: number;
  modifiedOptMul?: number;
  modifiedSysRate?: number;
  modifiedEngRate?: number;
  modifiedWepRate?: number;
  modifiedDamage?: number;
  modifiedRange?: number;
  modifiedHullReinforcement?: number;
  modifiedHeatEfficiency?: number;
}

/**
 * Calculates compound multipliers on base module stats for given engineering state
 */
export function calculateEngineeredStats(
  base: ModuleBaseStats,
  eng: ModuleEngineeringState | undefined
): CalculatedModuleStats {
  if (!eng || !eng.blueprintId || eng.grade === 0) {
    // Unengineered base values
    return {
      ...base,
      modifiedMass: base.mass,
      modifiedPowerDraw: base.powerDraw,
      modifiedPowerGen: base.powerGen,
      modifiedIntegrity: base.integrity,
      modifiedThermalLoad: base.thermalLoad,
      modifiedOptMass: base.optMass,
      modifiedOptMul: base.optMul,
      modifiedSysRate: base.sysRate,
      modifiedEngRate: base.engRate,
      modifiedWepRate: base.wepRate,
      modifiedDamage: base.damage,
      modifiedRange: base.range,
      modifiedHullReinforcement: base.hullReinforcement,
      modifiedHeatEfficiency: base.heatEfficiency,
    };
  }

  const blueprint = ENGINEERING_BLUEPRINTS[eng.blueprintId];
  const gradeData = blueprint?.grades[eng.grade];
  const progressRatio = Math.max(0, Math.min(100, eng.percent)) / 100;

  // Experimental effect
  const experimental = eng.experimentalId ? EXPERIMENTAL_EFFECTS[eng.experimentalId] : null;

  // Helper for applying compound multiplier: Stat * (1 + blueprintDelta * progressRatio) * (1 + expDelta)
  function applyModifier(baseVal: number | undefined, statKey: EngineeringStatKey): number | undefined {
    if (baseVal === undefined) return undefined;
    let bpDelta = (gradeData?.modifiers[statKey] || 0) * progressRatio;
    let expDelta = experimental?.modifiers[statKey] || 0;
    if (statKey === 'thermalLoad') {
      bpDelta = (gradeData?.modifiers['thermalLoad'] ?? gradeData?.modifiers['thermLoad'] ?? 0) * progressRatio;
      expDelta = experimental?.modifiers['thermalLoad'] ?? experimental?.modifiers['thermLoad'] ?? 0;
    }
    const compoundMultiplier = (1 + bpDelta) * (1 + expDelta);
    return baseVal * compoundMultiplier;
  }

  // Specific calculation for OptMultiplier (e.g. 100% base + 40% dirty + 4.3% drag)
  let finalOptMul: number | undefined = undefined;
  if (base.optMul !== undefined) {
    const bpDelta = (gradeData?.modifiers['optMul'] || 0) * progressRatio;
    const expDelta = experimental?.modifiers['optMul'] || 0;
    // Frontier math: baseOptMul * (1 + bpDelta + expDelta) or (1 + bpDelta) * (1 + expDelta)
    // For 7A Dirty G5 + Drag Drives: 100% * (1 + 0.40) * (1 + 0.043) = 146.02% or 140% + 4.3% = 144.3%
    // Both standard representations calculate as (1 + bpDelta) * (1 + expDelta) in EDSY:
    finalOptMul = +(base.optMul * (1 + bpDelta) * (1 + expDelta)).toFixed(2);
  }

  return {
    ...base,
    modifiedMass: +Math.max(0, (applyModifier(base.mass, 'mass') ?? base.mass)).toFixed(2),
    modifiedPowerDraw: +Math.max(0, (applyModifier(base.powerDraw, 'powerDraw') ?? base.powerDraw)).toFixed(2),
    modifiedPowerGen: base.powerGen !== undefined ? +Math.max(0, (applyModifier(base.powerGen, 'powerGen') ?? base.powerGen)).toFixed(2) : undefined,
    modifiedIntegrity: +Math.max(1, (applyModifier(base.integrity, 'integrity') ?? base.integrity)).toFixed(1),
    modifiedThermalLoad: +Math.max(0, (applyModifier(base.thermalLoad, 'thermalLoad') ?? base.thermalLoad)).toFixed(2),
    modifiedOptMass: base.optMass !== undefined ? +Math.max(0, (applyModifier(base.optMass, 'optMass') ?? base.optMass)).toFixed(1) : undefined,
    modifiedOptMul: finalOptMul,
    modifiedSysRate: base.sysRate !== undefined ? +Math.max(0, (applyModifier(base.sysRate, 'sysRate') ?? base.sysRate)).toFixed(2) : undefined,
    modifiedEngRate: base.engRate !== undefined ? +Math.max(0, (applyModifier(base.engRate, 'engRate') ?? base.engRate)).toFixed(2) : undefined,
    modifiedWepRate: base.wepRate !== undefined ? +Math.max(0, (applyModifier(base.wepRate, 'wepRate') ?? base.wepRate)).toFixed(2) : undefined,
    modifiedDamage: base.damage !== undefined ? +Math.max(0, (applyModifier(base.damage, 'damage') ?? base.damage)).toFixed(2) : undefined,
    modifiedRange: base.range !== undefined ? +Math.max(0, (applyModifier(base.range, 'range') ?? base.range)).toFixed(0) : undefined,
    modifiedHullReinforcement: base.hullReinforcement !== undefined ? +Math.max(0, (applyModifier(base.hullReinforcement, 'hullReinforcement') ?? base.hullReinforcement)).toFixed(1) : undefined,
    modifiedHeatEfficiency: base.heatEfficiency !== undefined ? +Math.max(0.1, (applyModifier(base.heatEfficiency, 'heatEfficiency') ?? base.heatEfficiency)).toFixed(3) : undefined,
  };
}

// -------------------------------------------------------------
// MATERIAL REQUIREMENTS LEDGER
// -------------------------------------------------------------
export interface MaterialLedgerItem {
  name: string;
  category: MaterialCategory;
  grade: number;
  count: number;
}

export interface MaterialRequirementsLedger {
  raw: MaterialLedgerItem[];
  encoded: MaterialLedgerItem[];
  manufactured: MaterialLedgerItem[];
  totalRolls: number;
  totalMaterialsCount: number;
}

/**
 * Computes the total engineering material ledger for an entire ship build
 * Accounts for 1 roll on G1, 2 rolls on G2, 3 rolls on G3, 4 rolls on G4, 5 rolls on G5 (15 total to max G5)
 * Plus fixed experimentals cost.
 */
export function calculateMaterialLedger(
  loadoutEngineering: Record<string, ModuleEngineeringState>
): MaterialRequirementsLedger {
  const tally: Record<string, MaterialLedgerItem> = {};
  let totalRolls = 0;

  for (const eng of Object.values(loadoutEngineering)) {
    if (!eng || !eng.blueprintId || eng.grade === 0) continue;

    const blueprint = ENGINEERING_BLUEPRINTS[eng.blueprintId];
    if (!blueprint) continue;

    // Rolls per grade: G1=1, G2=2, G3=3, G4=4, G5=5
    // If user is at Grade 3 with 50%, they completed G1 (1 roll) + G2 (2 rolls) + G3 partial (ceil(3 * 0.5) = 2 rolls)
    for (let g = 1; g <= eng.grade; g++) {
      const gData = blueprint.grades[g];
      if (!gData) continue;

      let rollsForThisGrade = g;
      if (g === eng.grade) {
        // partial rolls based on percent slider
        rollsForThisGrade = Math.max(1, Math.ceil(g * (Math.max(1, eng.percent) / 100)));
      }

      totalRolls += rollsForThisGrade;

      for (const mat of gData.materials) {
        const key = mat.name;
        if (!tally[key]) {
          tally[key] = {
            name: mat.name,
            category: mat.category,
            grade: mat.grade,
            count: 0,
          };
        }
        tally[key].count += mat.count * rollsForThisGrade;
      }
    }

    // Experimental effect cost (fixed single roll)
    if (eng.experimentalId) {
      const exp = EXPERIMENTAL_EFFECTS[eng.experimentalId];
      if (exp) {
        for (const mat of exp.materials) {
          const key = mat.name;
          if (!tally[key]) {
            tally[key] = {
              name: mat.name,
              category: mat.category,
              grade: mat.grade,
              count: 0,
            };
          }
          tally[key].count += mat.count;
        }
      }
    }
  }

  const raw = Object.values(tally)
    .filter((m) => m.category === 'Raw')
    .sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name));
  const encoded = Object.values(tally)
    .filter((m) => m.category === 'Encoded')
    .sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name));
  const manufactured = Object.values(tally)
    .filter((m) => m.category === 'Manufactured')
    .sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name));

  const totalMaterialsCount = Object.values(tally).reduce((acc, curr) => acc + curr.count, 0);

  return {
    raw,
    encoded,
    manufactured,
    totalRolls,
    totalMaterialsCount,
  };
}
