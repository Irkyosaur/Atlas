// Location: atlas/client/src/lib/engine/fleet_ledger_engine.ts
// Fleet Ledger Engine & Multi-Station Shipyard Manager (Phase 09, Stage 9.3)
// CAPI /fleet ingestion, multi-station inventory, outfitting inspection, 5% rebuy & ship transfer cost/time estimation.

import { SHIP_CHASSIS_CATALOG } from './ship_catalog';
import { cmdrProfileEngine } from './cmdr_profile_engine';
import { capiAuthEngine } from './capi_auth_engine';

export type HullClass = 'Small' | 'Medium' | 'Large';
export type ShipStatus = 'active' | 'stored' | 'in_transit';

export interface EngineeringModification {
  blueprintName: string;
  grade: number; // 1 to 5
  modifierPercent?: number; // e.g. 45 (+45% optimal mass)
  experimentalEffect?: string; // e.g. "Mass Manager", "Corrosive Shell", "Super Conduits"
}

export interface ShipOutfittingModule {
  id: string;
  slotType: 'core' | 'optional' | 'hardpoint' | 'utility' | 'armour';
  slotName: string; // e.g. "1D Power Plant", "Huge Hardpoint 1", "Size 7 Slot 1"
  moduleClass: number; // e.g. 7
  moduleRating: 'A' | 'B' | 'C' | 'D' | 'E' | 'G' | 'H' | 'I' | string;
  moduleName: string; // e.g. "7A Frame Shift Drive", "4A Prismatic Shield Generator"
  category: string; // e.g. "Frame Shift Drive", "Shield Generator", "Beam Laser"
  massTonnes: number;
  powerDrawMW?: number;
  ammo?: { clip: number; reserve: number };
  valueCredits: number;
  engineering?: EngineeringModification;
}

export interface ShipTransferEstimate {
  distanceLy: number;
  costCredits: number;
  durationSeconds: number;
  etaTimestamp?: number;
}

export interface PlayerFleetShip {
  id: string; // e.g. "ship-101"
  shipName: string; // Custom CMDR name, e.g. "APOLLO VOYAGER"
  shipType: string; // Ship model, e.g. "Anaconda"
  shipIdent: string; // Callsign / plate, e.g. "AT-881"
  hullClass: HullClass;
  status: ShipStatus;
  
  // Location
  currentSystem: string;
  currentStarport: string;
  coords: { x: number; y: number; z: number };
  
  // Financial metrics
  hullValue: number;
  modulesValue: number;
  totalValue: number;
  rebuyCost: number; // standard 5% (or 2.5% for alpha/beta backer / elite bonus)
  
  // Jump range and mass
  unladenJumpLy: number;
  ladenJumpLy: number;
  unladenMassTonnes: number;
  maxCargoCapacity: number;
  
  // Active transfer tracker
  transferProgress?: {
    originSystem: string;
    originStarport: string;
    destinationSystem: string;
    destinationStarport: string;
    startEpoch: number;
    arrivalEpoch: number;
    totalSeconds: number;
    remainingSeconds: number;
    transferCost: number;
  };

  // Detailed Outfitting breakdown
  coreModules: ShipOutfittingModule[];
  optionalModules: ShipOutfittingModule[];
  hardpointModules: ShipOutfittingModule[];
  utilityModules: ShipOutfittingModule[];
}

export interface FleetSummaryMetrics {
  totalShips: number;
  activeShip: PlayerFleetShip | null;
  totalFleetValue: number;
  totalRebuyExposure: number;
  totalCargoCapacity: number;
  shipsInTransitCount: number;
  stationLocationsCount: number;
}

export interface FleetLedgerFilter {
  searchQuery: string;
  systemFilter: string; // 'ALL' or specific system
  hullClass: 'ALL' | HullClass;
  status: 'ALL' | ShipStatus;
  sortBy: 'value' | 'name' | 'type' | 'rebuy' | 'distance';
  sortOrder: 'asc' | 'desc';
}

const STORAGE_KEY = 'atlas_fleet_ledger_state_v1';

// Known system coordinates reference for accurate distance calculation
export const REFERENCE_SYSTEM_COORDS: Record<string, { x: number; y: number; z: number }> = {
  'Sol': { x: 0, y: 0, z: 0 },
  'Shinrarta Dezhra': { x: 55.71875, y: 17.59375, z: 27.15625 },
  'Colonia': { x: -9530.5, y: -910.28125, z: 19808.125 },
  'Achenar': { x: 67.5, y: -119.375, z: 24.84375 },
  'Alioth': { x: -33.65625, y: -45.0625, z: 66.5 },
  'Deciat': { x: 122.625, y: -62.40625, z: -7.375 },
  'Maia': { x: -82.6875, y: -188.75, z: -359.84375 },
  'Lave': { x: 74.3125, y: 31.40625, z: 44.5 },
  'Eurybia': { x: 64.9375, y: -30.0625, z: 19.34375 },
  'Wolf 359': { x: 4.125, y: 4.75, z: 5.4375 },
  'HIP 36601': { x: -1674.84375, y: -390.15625, z: -875.25 },
  'Eol Prou RS-T d3-94': { x: -9531.0, y: -911.0, z: 19807.5 },
};

/**
 * Standard Default Fleet Roster
 * Showcases top Elite Dangerous ships across major starports with realistic engineered loadouts.
 */
export const DEFAULT_FLEET_ROSTER: PlayerFleetShip[] = [
  {
    id: 'ship-101',
    shipName: 'APOLLO VOYAGER',
    shipType: 'Anaconda',
    shipIdent: 'AT-881',
    hullClass: 'Large',
    status: 'active',
    currentSystem: 'Sol',
    currentStarport: 'Abraham Lincoln',
    coords: { x: 0, y: 0, z: 0 },
    hullValue: 146_969_450,
    modulesValue: 485_420_100,
    totalValue: 632_389_550,
    rebuyCost: Math.round(632_389_550 * 0.05),
    unladenJumpLy: 74.85,
    ladenJumpLy: 68.20,
    unladenMassTonnes: 1045.2,
    maxCargoCapacity: 224,
    coreModules: [
      {
        id: 'mod-1',
        slotType: 'armour',
        slotName: 'Bulkheads',
        moduleClass: 1,
        moduleRating: 'I',
        moduleName: 'Lightweight Alloy',
        category: 'Bulkheads',
        massTonnes: 0,
        valueCredits: 0,
        engineering: {
          blueprintName: 'Heavy Duty',
          grade: 5,
          modifierPercent: 32,
          experimentalEffect: 'Deep Plating',
        },
      },
      {
        id: 'mod-2',
        slotType: 'core',
        slotName: 'Power Plant',
        moduleClass: 8,
        moduleRating: 'A',
        moduleName: '8A Overcharged Power Plant',
        category: 'Power Plant',
        massTonnes: 80,
        powerDrawMW: 42.5,
        valueCredits: 162_000_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 40,
          experimentalEffect: 'Monstered',
        },
      },
      {
        id: 'mod-3',
        slotType: 'core',
        slotName: 'Thrusters',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Dirty Drive Thrusters',
        category: 'Thrusters',
        massTonnes: 128,
        valueCredits: 51_200_000,
        engineering: {
          blueprintName: 'Dirty Drives',
          grade: 5,
          modifierPercent: 45,
          experimentalEffect: 'Drag Drives',
        },
      },
      {
        id: 'mod-4',
        slotType: 'core',
        slotName: 'Frame Shift Drive',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Increased Range FSD (SCO)',
        category: 'Frame Shift Drive',
        massTonnes: 40,
        valueCredits: 16_100_000,
        engineering: {
          blueprintName: 'Increased Range',
          grade: 5,
          modifierPercent: 55,
          experimentalEffect: 'Mass Manager',
        },
      },
      {
        id: 'mod-5',
        slotType: 'core',
        slotName: 'Life Support',
        moduleClass: 5,
        moduleRating: 'D',
        moduleName: '5D Lightweight Life Support',
        category: 'Life Support',
        massTonnes: 8,
        valueCredits: 184_000,
        engineering: {
          blueprintName: 'Lightweight',
          grade: 4,
          modifierPercent: -70,
        },
      },
      {
        id: 'mod-6',
        slotType: 'core',
        slotName: 'Power Distributor',
        moduleClass: 8,
        moduleRating: 'A',
        moduleName: '8A Charge Enhanced Distributor',
        category: 'Power Distributor',
        massTonnes: 160,
        valueCredits: 27_400_000,
        engineering: {
          blueprintName: 'Charge Enhanced',
          grade: 5,
          modifierPercent: 44,
          experimentalEffect: 'Super Conduits',
        },
      },
      {
        id: 'mod-7',
        slotType: 'core',
        slotName: 'Sensors',
        moduleClass: 8,
        moduleRating: 'D',
        moduleName: '8D Long Range Sensors',
        category: 'Sensors',
        massTonnes: 64,
        valueCredits: 1_850_000,
        engineering: {
          blueprintName: 'Long Range',
          grade: 5,
          modifierPercent: 100,
        },
      },
      {
        id: 'mod-8',
        slotType: 'core',
        slotName: 'Fuel Tank',
        moduleClass: 5,
        moduleRating: 'C',
        moduleName: '5C Fuel Tank (32t)',
        category: 'Fuel Tank',
        massTonnes: 0,
        valueCredits: 92_000,
      },
    ],
    optionalModules: [
      {
        id: 'mod-9',
        slotType: 'optional',
        slotName: 'Class 7 Slot 1',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Fuel Scoop',
        category: 'Fuel Scoop',
        massTonnes: 0,
        valueCredits: 91_200_000,
      },
      {
        id: 'mod-10',
        slotType: 'optional',
        slotName: 'Class 7 Slot 2',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Prismatic Shield Generator',
        category: 'Shield Generator',
        massTonnes: 160,
        valueCredits: 82_400_000,
        engineering: {
          blueprintName: 'Reinforced',
          grade: 5,
          modifierPercent: 42,
          experimentalEffect: 'Hi-Cap',
        },
      },
      {
        id: 'mod-11',
        slotType: 'optional',
        slotName: 'Class 6 Slot 1',
        moduleClass: 6,
        moduleRating: 'E',
        moduleName: '6E Cargo Rack (64t)',
        category: 'Cargo Rack',
        massTonnes: 0,
        valueCredits: 230_000,
      },
      {
        id: 'mod-12',
        slotType: 'optional',
        slotName: 'Class 6 Slot 2',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Fighter Hangar (2-Bay)',
        category: 'Fighter Hangar',
        massTonnes: 40,
        valueCredits: 4_500_000,
      },
      {
        id: 'mod-13',
        slotType: 'optional',
        slotName: 'Class 5 Slot 1',
        moduleClass: 5,
        moduleRating: 'H',
        moduleName: '5H Guardian FSD Booster',
        category: 'Guardian Booster',
        massTonnes: 26,
        valueCredits: 3_200_000,
      },
      {
        id: 'mod-14',
        slotType: 'optional',
        slotName: 'Class 5 Slot 2',
        moduleClass: 5,
        moduleRating: 'A',
        moduleName: '5A Collector Limpet Controller',
        category: 'Limpet Controller',
        massTonnes: 20,
        valueCredits: 1_200_000,
      },
      {
        id: 'mod-15',
        slotType: 'optional',
        slotName: 'Class 4 Slot 1',
        moduleClass: 4,
        moduleRating: 'G',
        moduleName: '4G Planetary Vehicle Hangar (SRV)',
        category: 'Vehicle Hangar',
        massTonnes: 10,
        valueCredits: 84_000,
      },
      {
        id: 'mod-16',
        slotType: 'optional',
        slotName: 'Class 1 Slot 1',
        moduleClass: 1,
        moduleRating: 'I',
        moduleName: '1I Detailed Surface Scanner',
        category: 'Surface Scanner',
        massTonnes: 0,
        valueCredits: 250_000,
        engineering: {
          blueprintName: 'Expanded Probe Scanning Radius',
          grade: 5,
          modifierPercent: 50,
        },
      },
    ],
    hardpointModules: [
      {
        id: 'mod-17',
        slotType: 'hardpoint',
        slotName: 'Huge Hardpoint (C4)',
        moduleClass: 4,
        moduleRating: 'A',
        moduleName: '4A Gimballed Multi-Cannon',
        category: 'Multi-Cannon',
        massTonnes: 16,
        valueCredits: 14_000_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 70,
          experimentalEffect: 'Corrosive Shell',
        },
      },
      {
        id: 'mod-18',
        slotType: 'hardpoint',
        slotName: 'Large Hardpoint 1 (C3)',
        moduleClass: 3,
        moduleRating: 'C',
        moduleName: '3C Gimballed Beam Laser',
        category: 'Beam Laser',
        massTonnes: 8,
        valueCredits: 4_200_000,
        engineering: {
          blueprintName: 'Efficient Weapon',
          grade: 5,
          modifierPercent: -45,
          experimentalEffect: 'Thermal Vent',
        },
      },
      {
        id: 'mod-19',
        slotType: 'hardpoint',
        slotName: 'Large Hardpoint 2 (C3)',
        moduleClass: 3,
        moduleRating: 'C',
        moduleName: '3C Gimballed Beam Laser',
        category: 'Beam Laser',
        massTonnes: 8,
        valueCredits: 4_200_000,
        engineering: {
          blueprintName: 'Efficient Weapon',
          grade: 5,
          modifierPercent: -45,
          experimentalEffect: 'Thermal Vent',
        },
      },
      {
        id: 'mod-20',
        slotType: 'hardpoint',
        slotName: 'Large Hardpoint 3 (C3)',
        moduleClass: 3,
        moduleRating: 'C',
        moduleName: '3C Gimballed Multi-Cannon',
        category: 'Multi-Cannon',
        massTonnes: 8,
        valueCredits: 2_100_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 70,
          experimentalEffect: 'Incendiary Rounds',
        },
      },
      {
        id: 'mod-21',
        slotType: 'hardpoint',
        slotName: 'Medium Hardpoint 1 (C2)',
        moduleClass: 2,
        moduleRating: 'B',
        moduleName: '2B Railgun (Fixed)',
        category: 'Railgun',
        massTonnes: 4,
        valueCredits: 1_600_000,
        engineering: {
          blueprintName: 'Long Range',
          grade: 5,
          modifierPercent: 100,
          experimentalEffect: 'Super Penetrator',
        },
      },
      {
        id: 'mod-22',
        slotType: 'hardpoint',
        slotName: 'Medium Hardpoint 2 (C2)',
        moduleClass: 2,
        moduleRating: 'B',
        moduleName: '2B Railgun (Fixed)',
        category: 'Railgun',
        massTonnes: 4,
        valueCredits: 1_600_000,
        engineering: {
          blueprintName: 'Long Range',
          grade: 5,
          modifierPercent: 100,
          experimentalEffect: 'Feedback Cascade',
        },
      },
    ],
    utilityModules: [
      {
        id: 'mod-23',
        slotType: 'utility',
        slotName: 'Utility Mount 1',
        moduleClass: 0,
        moduleRating: 'A',
        moduleName: '0A Heavy Duty Shield Booster',
        category: 'Shield Booster',
        massTonnes: 3.5,
        valueCredits: 280_000,
        engineering: {
          blueprintName: 'Heavy Duty',
          grade: 5,
          modifierPercent: 65,
          experimentalEffect: 'Super Capacitors',
        },
      },
      {
        id: 'mod-24',
        slotType: 'utility',
        slotName: 'Utility Mount 2',
        moduleClass: 0,
        moduleRating: 'A',
        moduleName: '0A Resistance Augmented Shield Booster',
        category: 'Shield Booster',
        massTonnes: 3.5,
        valueCredits: 280_000,
        engineering: {
          blueprintName: 'Resistance Augmented',
          grade: 5,
          modifierPercent: 17,
          experimentalEffect: 'Thermo Block',
        },
      },
      {
        id: 'mod-25',
        slotType: 'utility',
        slotName: 'Utility Mount 3',
        moduleClass: 0,
        moduleRating: 'I',
        moduleName: '0I Heat Sink Launcher',
        category: 'Heat Sink',
        massTonnes: 1.3,
        valueCredits: 35_000,
        engineering: {
          blueprintName: 'Lightweight',
          grade: 5,
          modifierPercent: -80,
        },
      },
      {
        id: 'mod-26',
        slotType: 'utility',
        slotName: 'Utility Mount 4',
        moduleClass: 0,
        moduleRating: 'I',
        moduleName: '0I Point Defence',
        category: 'Point Defence',
        massTonnes: 0.5,
        valueCredits: 15_000,
      },
    ],
  },
  {
    id: 'ship-102',
    shipName: 'VALKYRIE ASCENDANT',
    shipType: 'Imperial Cutter',
    shipIdent: 'IC-700',
    hullClass: 'Large',
    status: 'stored',
    currentSystem: 'Shinrarta Dezhra',
    currentStarport: 'Jameson Memorial',
    coords: { x: 55.71875, y: 17.59375, z: 27.15625 },
    hullValue: 208_969_450,
    modulesValue: 712_800_000,
    totalValue: 921_769_450,
    rebuyCost: Math.round(921_769_450 * 0.05),
    unladenJumpLy: 38.45,
    ladenJumpLy: 27.60,
    unladenMassTonnes: 1480.0,
    maxCargoCapacity: 792,
    coreModules: [
      {
        id: 'mod-c1',
        slotType: 'armour',
        slotName: 'Bulkheads',
        moduleClass: 1,
        moduleRating: 'I',
        moduleName: 'Military Grade Composite',
        category: 'Bulkheads',
        massTonnes: 140,
        valueCredits: 180_000_000,
        engineering: {
          blueprintName: 'Heavy Duty',
          grade: 5,
          modifierPercent: 32,
          experimentalEffect: 'Deep Plating',
        },
      },
      {
        id: 'mod-c2',
        slotType: 'core',
        slotName: 'Power Plant',
        moduleClass: 8,
        moduleRating: 'A',
        moduleName: '8A Overcharged Power Plant',
        category: 'Power Plant',
        massTonnes: 80,
        powerDrawMW: 45.0,
        valueCredits: 162_000_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 40,
        },
      },
      {
        id: 'mod-c3',
        slotType: 'core',
        slotName: 'Thrusters',
        moduleClass: 8,
        moduleRating: 'A',
        moduleName: '8A Dirty Drive Thrusters',
        category: 'Thrusters',
        massTonnes: 160,
        valueCredits: 162_000_000,
        engineering: {
          blueprintName: 'Dirty Drives',
          grade: 5,
          modifierPercent: 45,
          experimentalEffect: 'Drag Drives',
        },
      },
      {
        id: 'mod-c4',
        slotType: 'core',
        slotName: 'Frame Shift Drive',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Increased Range FSD',
        category: 'Frame Shift Drive',
        massTonnes: 80,
        valueCredits: 51_200_000,
        engineering: {
          blueprintName: 'Increased Range',
          grade: 5,
          modifierPercent: 55,
          experimentalEffect: 'Mass Manager',
        },
      },
      {
        id: 'mod-c5',
        slotType: 'core',
        slotName: 'Life Support',
        moduleClass: 7,
        moduleRating: 'D',
        moduleName: '7D Life Support',
        category: 'Life Support',
        massTonnes: 32,
        valueCredits: 480_000,
      },
      {
        id: 'mod-c6',
        slotType: 'core',
        slotName: 'Power Distributor',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Charge Enhanced Distributor',
        category: 'Power Distributor',
        massTonnes: 80,
        valueCredits: 9_100_000,
        engineering: {
          blueprintName: 'Charge Enhanced',
          grade: 5,
          modifierPercent: 44,
          experimentalEffect: 'Super Conduits',
        },
      },
      {
        id: 'mod-c7',
        slotType: 'core',
        slotName: 'Sensors',
        moduleClass: 7,
        moduleRating: 'D',
        moduleName: '7D Sensors',
        category: 'Sensors',
        massTonnes: 32,
        valueCredits: 950_000,
      },
      {
        id: 'mod-c8',
        slotType: 'core',
        slotName: 'Fuel Tank',
        moduleClass: 6,
        moduleRating: 'C',
        moduleName: '6C Fuel Tank (64t)',
        category: 'Fuel Tank',
        massTonnes: 0,
        valueCredits: 240_000,
      },
    ],
    optionalModules: [
      {
        id: 'mod-c9',
        slotType: 'optional',
        slotName: 'Class 8 Slot 1',
        moduleClass: 8,
        moduleRating: 'A',
        moduleName: '8A Prismatic Shield Generator',
        category: 'Shield Generator',
        massTonnes: 320,
        valueCredits: 243_000_000,
        engineering: {
          blueprintName: 'Reinforced',
          grade: 5,
          modifierPercent: 42,
          experimentalEffect: 'Hi-Cap',
        },
      },
      {
        id: 'mod-c10',
        slotType: 'optional',
        slotName: 'Class 8 Slot 2',
        moduleClass: 8,
        moduleRating: 'E',
        moduleName: '8E Cargo Rack (256t)',
        category: 'Cargo Rack',
        massTonnes: 0,
        valueCredits: 1_200_000,
      },
      {
        id: 'mod-c11',
        slotType: 'optional',
        slotName: 'Class 6 Slot 1',
        moduleClass: 6,
        moduleRating: 'E',
        moduleName: '6E Cargo Rack (64t)',
        category: 'Cargo Rack',
        massTonnes: 0,
        valueCredits: 230_000,
      },
      {
        id: 'mod-c12',
        slotType: 'optional',
        slotName: 'Class 6 Slot 2',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Fuel Scoop',
        category: 'Fuel Scoop',
        massTonnes: 0,
        valueCredits: 28_000_000,
      },
    ],
    hardpointModules: [
      {
        id: 'mod-c13',
        slotType: 'hardpoint',
        slotName: 'Huge Hardpoint (C4)',
        moduleClass: 4,
        moduleRating: 'A',
        moduleName: '4A Gimballed Multi-Cannon',
        category: 'Multi-Cannon',
        massTonnes: 16,
        valueCredits: 14_000_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 70,
          experimentalEffect: 'Corrosive Shell',
        },
      },
    ],
    utilityModules: [
      {
        id: 'mod-c14',
        slotType: 'utility',
        slotName: 'Utility Mount 1',
        moduleClass: 0,
        moduleRating: 'A',
        moduleName: '0A Heavy Duty Shield Booster',
        category: 'Shield Booster',
        massTonnes: 3.5,
        valueCredits: 280_000,
      },
    ],
  },
  {
    id: 'ship-103',
    shipName: 'GHOST OF COLONIA',
    shipType: 'Krait Mk II',
    shipIdent: 'KM-442',
    hullClass: 'Medium',
    status: 'stored',
    currentSystem: 'Colonia',
    currentStarport: 'Jaques Station',
    coords: { x: -9530.5, y: -910.28125, z: 19808.125 },
    hullValue: 45_814_205,
    modulesValue: 184_600_000,
    totalValue: 230_414_205,
    rebuyCost: Math.round(230_414_205 * 0.05),
    unladenJumpLy: 56.40,
    ladenJumpLy: 51.10,
    unladenMassTonnes: 480.0,
    maxCargoCapacity: 128,
    coreModules: [
      {
        id: 'mod-k1',
        slotType: 'core',
        slotName: 'Power Plant',
        moduleClass: 7,
        moduleRating: 'A',
        moduleName: '7A Overcharged Power Plant',
        category: 'Power Plant',
        massTonnes: 40,
        valueCredits: 51_200_000,
        engineering: {
          blueprintName: 'Overcharged',
          grade: 5,
          modifierPercent: 40,
        },
      },
      {
        id: 'mod-k2',
        slotType: 'core',
        slotName: 'Thrusters',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Dirty Drive Thrusters',
        category: 'Thrusters',
        massTonnes: 40,
        valueCredits: 16_100_000,
        engineering: {
          blueprintName: 'Dirty Drives',
          grade: 5,
          modifierPercent: 45,
          experimentalEffect: 'Drag Drives',
        },
      },
      {
        id: 'mod-k3',
        slotType: 'core',
        slotName: 'Frame Shift Drive',
        moduleClass: 5,
        moduleRating: 'A',
        moduleName: '5A Engineered V1 FSD',
        category: 'Frame Shift Drive',
        massTonnes: 20,
        valueCredits: 5_100_000,
        engineering: {
          blueprintName: 'Increased Range & Fast Boot',
          grade: 5,
          modifierPercent: 62,
          experimentalEffect: 'Mass Manager',
        },
      },
    ],
    optionalModules: [
      {
        id: 'mod-k4',
        slotType: 'optional',
        slotName: 'Class 6 Slot 1',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Fuel Scoop',
        category: 'Fuel Scoop',
        massTonnes: 0,
        valueCredits: 28_000_000,
      },
      {
        id: 'mod-k5',
        slotType: 'optional',
        slotName: 'Class 6 Slot 2',
        moduleClass: 6,
        moduleRating: 'C',
        moduleName: '6C Bi-Weave Shield Generator',
        category: 'Shield Generator',
        massTonnes: 16,
        valueCredits: 3_800_000,
        engineering: {
          blueprintName: 'Thermal Resistant',
          grade: 5,
          modifierPercent: 38,
          experimentalEffect: 'Fast Charge',
        },
      },
    ],
    hardpointModules: [
      {
        id: 'mod-k6',
        slotType: 'hardpoint',
        slotName: 'Large Hardpoint 1 (C3)',
        moduleClass: 3,
        moduleRating: 'C',
        moduleName: '3C Plasma Accelerator',
        category: 'Plasma Accelerator',
        massTonnes: 8,
        valueCredits: 3_800_000,
        engineering: {
          blueprintName: 'Efficient Weapon',
          grade: 5,
          modifierPercent: -45,
          experimentalEffect: 'Target Lock Breaker',
        },
      },
      {
        id: 'mod-k7',
        slotType: 'hardpoint',
        slotName: 'Large Hardpoint 2 (C3)',
        moduleClass: 3,
        moduleRating: 'C',
        moduleName: '3C Plasma Accelerator',
        category: 'Plasma Accelerator',
        massTonnes: 8,
        valueCredits: 3_800_000,
        engineering: {
          blueprintName: 'Efficient Weapon',
          grade: 5,
          modifierPercent: -45,
          experimentalEffect: 'Plasma Slug',
        },
      },
    ],
    utilityModules: [
      {
        id: 'mod-k8',
        slotType: 'utility',
        slotName: 'Utility Mount 1',
        moduleClass: 0,
        moduleRating: 'I',
        moduleName: '0I Chaff Launcher',
        category: 'Chaff',
        massTonnes: 1.3,
        valueCredits: 25_000,
      },
    ],
  },
  {
    id: 'ship-104',
    shipName: 'STELLAR HORIZON',
    shipType: 'Asp Explorer',
    shipIdent: 'AX-09',
    hullClass: 'Medium',
    status: 'stored',
    currentSystem: 'Deciat',
    currentStarport: 'Garay Terminal',
    coords: { x: 122.625, y: -62.40625, z: -7.375 },
    hullValue: 6_661_153,
    modulesValue: 42_300_000,
    totalValue: 48_961_153,
    rebuyCost: Math.round(48_961_153 * 0.05),
    unladenJumpLy: 69.12,
    ladenJumpLy: 65.40,
    unladenMassTonnes: 290.0,
    maxCargoCapacity: 64,
    coreModules: [
      {
        id: 'mod-a1',
        slotType: 'core',
        slotName: 'Frame Shift Drive',
        moduleClass: 5,
        moduleRating: 'A',
        moduleName: '5A Engineered FSD V1',
        category: 'Frame Shift Drive',
        massTonnes: 20,
        valueCredits: 5_100_000,
        engineering: {
          blueprintName: 'Increased Range',
          grade: 5,
          modifierPercent: 58,
          experimentalEffect: 'Mass Manager',
        },
      },
    ],
    optionalModules: [
      {
        id: 'mod-a2',
        slotType: 'optional',
        slotName: 'Class 6 Slot 1',
        moduleClass: 6,
        moduleRating: 'A',
        moduleName: '6A Fuel Scoop',
        category: 'Fuel Scoop',
        massTonnes: 0,
        valueCredits: 28_000_000,
      },
    ],
    hardpointModules: [],
    utilityModules: [
      {
        id: 'mod-a3',
        slotType: 'utility',
        slotName: 'Utility Mount 1',
        moduleClass: 0,
        moduleRating: 'I',
        moduleName: '0I Heat Sink Launcher',
        category: 'Heat Sink',
        massTonnes: 1.3,
        valueCredits: 35_000,
      },
    ],
  },
  {
    id: 'ship-105',
    shipName: 'BLOOD HOUND',
    shipType: 'Fer-de-Lance',
    shipIdent: 'FD-101',
    hullClass: 'Medium',
    status: 'stored',
    currentSystem: 'Sol',
    currentStarport: 'Li Qing Jao',
    coords: { x: 0, y: 0, z: 0 },
    hullValue: 51_567_040,
    modulesValue: 120_400_000,
    totalValue: 171_967_040,
    rebuyCost: Math.round(171_967_040 * 0.05),
    unladenJumpLy: 19.80,
    ladenJumpLy: 18.50,
    unladenMassTonnes: 395.0,
    maxCargoCapacity: 8,
    coreModules: [],
    optionalModules: [],
    hardpointModules: [],
    utilityModules: [],
  },
  {
    id: 'ship-106',
    shipName: 'BEHEMOTH TITAN',
    shipType: 'Type-9 Heavy',
    shipIdent: 'T9-99',
    hullClass: 'Large',
    status: 'stored',
    currentSystem: 'Lave',
    currentStarport: 'Lave Station',
    coords: { x: 74.3125, y: 31.40625, z: 44.5 },
    hullValue: 76_555_840,
    modulesValue: 95_200_000,
    totalValue: 171_755_840,
    rebuyCost: Math.round(171_755_840 * 0.05),
    unladenJumpLy: 31.20,
    ladenJumpLy: 19.80,
    unladenMassTonnes: 1100.0,
    maxCargoCapacity: 752,
    coreModules: [],
    optionalModules: [],
    hardpointModules: [],
    utilityModules: [],
  },
  {
    id: 'ship-107',
    shipName: 'AEGIS RESOLUTE',
    shipType: 'Federal Corvette',
    shipIdent: 'FC-808',
    hullClass: 'Large',
    status: 'stored',
    currentSystem: 'Sol',
    currentStarport: 'Abraham Lincoln',
    coords: { x: 0, y: 0, z: 0 },
    hullValue: 187_969_450,
    modulesValue: 690_000_000,
    totalValue: 877_969_450,
    rebuyCost: Math.round(877_969_450 * 0.05),
    unladenJumpLy: 29.50,
    ladenJumpLy: 24.10,
    unladenMassTonnes: 1350.0,
    maxCargoCapacity: 256,
    coreModules: [],
    optionalModules: [],
    hardpointModules: [],
    utilityModules: [],
  },
];

export class FleetLedgerEngine {
  private ships: PlayerFleetShip[] = [];
  private listeners: Array<() => void> = [];
  private timerInterval: any = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.ships = parsed;
          } else {
            this.ships = JSON.parse(JSON.stringify(DEFAULT_FLEET_ROSTER));
          }
        } catch {
          this.ships = JSON.parse(JSON.stringify(DEFAULT_FLEET_ROSTER));
        }
      } else {
        this.ships = JSON.parse(JSON.stringify(DEFAULT_FLEET_ROSTER));
      }

      this.startTransferHeartbeat();
    } else {
      this.ships = JSON.parse(JSON.stringify(DEFAULT_FLEET_ROSTER));
    }
  }

  private startTransferHeartbeat(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      let modified = false;
      const now = Date.now();

      for (const ship of this.ships) {
        if (ship.status === 'in_transit' && ship.transferProgress) {
          const rem = Math.max(0, Math.round((ship.transferProgress.arrivalEpoch - now) / 1000));
          ship.transferProgress.remainingSeconds = rem;

          if (rem <= 0) {
            // Transfer completed! Ship has arrived at destination
            ship.status = 'stored';
            ship.currentSystem = ship.transferProgress.destinationSystem;
            ship.currentStarport = ship.transferProgress.destinationStarport;
            const targetCoords = REFERENCE_SYSTEM_COORDS[ship.currentSystem] || { x: 0, y: 0, z: 0 };
            ship.coords = { ...targetCoords };
            delete ship.transferProgress;
            modified = true;
          } else {
            modified = true;
          }
        }
      }

      if (modified) {
        this.persist();
        this.notify();
      }
    }, 1000);
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (e) {
        console.error('[FleetLedgerEngine] listener error', e);
      }
    }
  }

  private persist(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ships));
      } catch (e) {
        console.warn('[FleetLedgerEngine] Failed to persist fleet:', e);
      }
    }
  }

  public getShips(): PlayerFleetShip[] {
    return this.ships;
  }

  public getShipById(id: string): PlayerFleetShip | undefined {
    return this.ships.find((s) => s.id === id);
  }

  public getActiveShip(): PlayerFleetShip | null {
    return this.ships.find((s) => s.status === 'active') || null;
  }

  /**
   * Calculate distance in Ly between ship location and target system.
   */
  public getDistanceToSystem(ship: PlayerFleetShip, targetSystem: string): number {
    if (ship.currentSystem.toLowerCase() === targetSystem.toLowerCase()) {
      return 0;
    }

    const shipCoords = ship.coords || REFERENCE_SYSTEM_COORDS[ship.currentSystem];
    const targetCoords = REFERENCE_SYSTEM_COORDS[targetSystem];

    if (shipCoords && targetCoords) {
      const dx = shipCoords.x - targetCoords.x;
      const dy = shipCoords.y - targetCoords.y;
      const dz = shipCoords.z - targetCoords.z;
      return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 10) / 10;
    }

    // Heuristic fallbacks if coordinates are not hardcoded
    if (ship.currentSystem === 'Colonia' || targetSystem === 'Colonia') {
      return 22000.5;
    }

    return 65.4;
  }

  /**
   * Ship transfer calculation according to Frontier formulas:
   * Cost = Math.round((0.00006 * shipValue * distanceLy) + (0.0002 * shipValue) + 100)
   * Duration = Math.round(300 + (10 * distanceLy)) seconds
   */
  public estimateTransfer(ship: PlayerFleetShip, destSystem: string): ShipTransferEstimate {
    const distanceLy = this.getDistanceToSystem(ship, destSystem);

    if (distanceLy <= 0) {
      return {
        distanceLy: 0,
        costCredits: 0,
        durationSeconds: 0,
      };
    }

    const cost = Math.round(0.00006 * ship.totalValue * distanceLy + 0.0002 * ship.totalValue + 100);
    const durationSeconds = Math.round(300 + 10 * distanceLy);

    return {
      distanceLy,
      costCredits: cost,
      durationSeconds,
      etaTimestamp: Date.now() + durationSeconds * 1000,
    };
  }

  /**
   * Initiate a simulated ship transfer from its current station to player's current system/station.
   */
  public initiateTransfer(
    shipId: string,
    destSystem: string,
    destStarport: string
  ): { success: boolean; message: string; cost?: number } {
    const ship = this.getShipById(shipId);
    if (!ship) {
      return { success: false, message: 'Ship not found' };
    }

    if (ship.status === 'active') {
      return { success: false, message: 'Cannot transfer currently active ship.' };
    }

    if (ship.status === 'in_transit') {
      return { success: false, message: 'Ship is already in transit.' };
    }

    const estimate = this.estimateTransfer(ship, destSystem);
    if (estimate.distanceLy <= 0) {
      return { success: false, message: 'Ship is already docked at this star system.' };
    }

    // Verify commander credits
    const profile = cmdrProfileEngine.getProfile();
    if (profile.credits < estimate.costCredits) {
      return {
        success: false,
        message: `Insufficient liquid credits (${cmdrProfileEngine.constructor.name ? FleetLedgerEngine.formatCredits(estimate.costCredits) : estimate.costCredits + ' CR'} required).`,
      };
    }

    // Deduct credits from commander profile
    profile.credits -= estimate.costCredits;
    cmdrProfileEngine.updateProfile(profile);

    // Set transit progress
    const now = Date.now();
    ship.status = 'in_transit';
    ship.transferProgress = {
      originSystem: ship.currentSystem,
      originStarport: ship.currentStarport,
      destinationSystem: destSystem,
      destinationStarport: destStarport,
      startEpoch: now,
      arrivalEpoch: now + estimate.durationSeconds * 1000,
      totalSeconds: estimate.durationSeconds,
      remainingSeconds: estimate.durationSeconds,
      transferCost: estimate.costCredits,
    };

    this.persist();
    this.notify();

    return {
      success: true,
      message: `Ship transfer initiated for ${ship.shipName}. Estimated arrival: ${Math.round(estimate.durationSeconds / 60)} minutes.`,
      cost: estimate.costCredits,
    };
  }

  /**
   * Expedite or instant-complete transfer (developer/testing convenience).
   */
  public expediteTransfer(shipId: string): void {
    const ship = this.getShipById(shipId);
    if (ship && ship.status === 'in_transit' && ship.transferProgress) {
      ship.status = 'stored';
      ship.currentSystem = ship.transferProgress.destinationSystem;
      ship.currentStarport = ship.transferProgress.destinationStarport;
      const targetCoords = REFERENCE_SYSTEM_COORDS[ship.currentSystem] || { x: 0, y: 0, z: 0 };
      ship.coords = { ...targetCoords };
      delete ship.transferProgress;

      this.persist();
      this.notify();
    }
  }

  /**
   * Switch the active vessel. Must be located at current player location.
   */
  public makeShipActive(shipId: string): { success: boolean; message: string } {
    const targetShip = this.getShipById(shipId);
    if (!targetShip) {
      return { success: false, message: 'Ship not found.' };
    }

    if (targetShip.status === 'active') {
      return { success: true, message: 'Ship is already active.' };
    }

    if (targetShip.status === 'in_transit') {
      return { success: false, message: 'Cannot board a ship currently in hyperspace transfer transit.' };
    }

    const currentProfile = cmdrProfileEngine.getProfile();
    // In Elite, switching ship requires being at that shipyard station or switching cockpit
    // Update previous active ship to stored
    for (const ship of this.ships) {
      if (ship.status === 'active') {
        ship.status = 'stored';
      }
    }

    targetShip.status = 'active';

    // Update commander profile active ship
    currentProfile.currentShipName = targetShip.shipName;
    currentProfile.currentShipType = targetShip.shipType;
    currentProfile.currentShipIdent = targetShip.shipIdent;
    currentProfile.currentSystem = targetShip.currentSystem;
    currentProfile.currentStarport = targetShip.currentStarport;
    cmdrProfileEngine.updateProfile(currentProfile);

    this.persist();
    this.notify();

    return {
      success: true,
      message: `Cockpit command transferred to ${targetShip.shipName} (${targetShip.shipType}).`,
    };
  }

  /**
   * Calculate summary metrics across the fleet.
   */
  public getSummaryMetrics(): FleetSummaryMetrics {
    let totalFleetValue = 0;
    let totalRebuyExposure = 0;
    let totalCargoCapacity = 0;
    let shipsInTransitCount = 0;
    const locations = new Set<string>();
    let activeShip: PlayerFleetShip | null = null;

    for (const ship of this.ships) {
      totalFleetValue += ship.totalValue;
      totalRebuyExposure += ship.rebuyCost;
      totalCargoCapacity += ship.maxCargoCapacity;
      locations.add(`${ship.currentSystem}:${ship.currentStarport}`);

      if (ship.status === 'active') {
        activeShip = ship;
      }
      if (ship.status === 'in_transit') {
        shipsInTransitCount++;
      }
    }

    return {
      totalShips: this.ships.length,
      activeShip,
      totalFleetValue,
      totalRebuyExposure,
      totalCargoCapacity,
      shipsInTransitCount,
      stationLocationsCount: locations.size,
    };
  }

  /**
   * Ingest live Frontier CAPI /fleet response data.
   */
  public ingestCapiFleetPayload(payload: any): void {
    if (!payload || (!payload.ships && !Array.isArray(payload))) {
      return;
    }

    const rawList = Array.isArray(payload) ? payload : payload.ships;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return;
    }

    // Process CAPI fleet payload
    const parsedShips: PlayerFleetShip[] = rawList.map((raw: any, index: number) => {
      const rawName = String(raw.name || '').toLowerCase();
      const chassis = SHIP_CHASSIS_CATALOG.find((c) => c.id === rawName || c.name.toLowerCase() === rawName) || SHIP_CHASSIS_CATALOG[0];
      const hullVal = raw.value?.hull || chassis.retailCost || 100_000_000;
      const modVal = raw.value?.modules || Math.round(hullVal * 1.5);
      const totalVal = hullVal + modVal;

      return {
        id: `capi-ship-${raw.id || index}`,
        shipName: raw.shipName || raw.userShipName || `VESSEL ${index + 1}`,
        shipType: chassis.name,
        shipIdent: raw.shipID || raw.userShipId || `PX-${100 + index}`,
        hullClass: chassis.shipClassLabel as HullClass,
        status: raw.currentShip ? 'active' : 'stored',
        currentSystem: raw.station?.system || 'Sol',
        currentStarport: raw.station?.name || 'Abraham Lincoln',
        coords: REFERENCE_SYSTEM_COORDS[raw.station?.system || 'Sol'] || { x: 0, y: 0, z: 0 },
        hullValue: hullVal,
        modulesValue: modVal,
        totalValue: totalVal,
        rebuyCost: Math.round(totalVal * 0.05),
        unladenJumpLy: 45.0,
        ladenJumpLy: 38.0,
        unladenMassTonnes: chassis.hullMass,
        maxCargoCapacity: 128,
        coreModules: [],
        optionalModules: [],
        hardpointModules: [],
        utilityModules: [],
      };
    });

    this.ships = parsedShips;
    this.persist();
    this.notify();
  }

  /**
   * Reset to default canonical fleet.
   */
  public resetToDefaultFleet(): void {
    this.ships = JSON.parse(JSON.stringify(DEFAULT_FLEET_ROSTER));
    this.persist();
    this.notify();
  }

  /**
   * Format credit string with standard CR suffix.
   */
  public static formatCredits(amount: number): string {
    return new Intl.NumberFormat('en-US').format(Math.floor(amount)) + ' CR';
  }

  /**
   * Format compact credits (e.g., 632.39 M CR).
   */
  public static formatCompactCredits(amount: number): string {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(2) + ' B CR';
    }
    if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + ' M CR';
    }
    return new Intl.NumberFormat('en-US').format(Math.floor(amount)) + ' CR';
  }

  /**
   * Format duration in seconds to MM:SS or HH:MM:SS.
   */
  public static formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
}

export const fleetLedgerEngine = new FleetLedgerEngine();
