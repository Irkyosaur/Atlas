/**
 * Atlas Shipbuilder Engine - Chassis Catalog & Hardpoint Schematics
 * Stage 7.1: Comprehensive Ship Chassis Catalog (39+ Flyable Hulls)
 * Source parity: Frontier Developments / EDCD Coriolis data schemas
 */

export type HardpointSize = 1 | 2 | 3 | 4;
export type HardpointSizeLabel = 'Small' | 'Medium' | 'Large' | 'Huge';

export interface HardpointSlot {
  id: string;
  size: HardpointSize;
  sizeLabel: HardpointSizeLabel;
  x: number; // SVG top-down coordinate X (0-400)
  y: number; // SVG top-down coordinate Y (0-500)
  mount: 'dorsal' | 'ventral' | 'flank' | 'wing' | 'center' | 'port' | 'starboard';
  label: string;
  installedModule?: string;
}

export interface UtilitySlot {
  id: string;
  x: number;
  y: number;
  label: string;
  installedModule?: string;
}

export interface CoreInternalsLayout {
  bulkheads: number;
  powerPlant: number;
  thrusters: number;
  frameShiftDrive: number;
  lifeSupport: number;
  powerDistributor: number;
  sensors: number;
  fuelTank: number;
}

export interface ShipChassis {
  id: string;
  name: string;
  manufacturer: string;
  shipClass: 1 | 2 | 3; // 1: Small, 2: Medium, 3: Large
  shipClassLabel: 'Small' | 'Medium' | 'Large';
  hullMass: number; // tonnes
  baseShield: number; // MJ
  baseArmour: number; // Hull HP
  speed: number; // m/s
  boost: number; // m/s
  pitch: number; // deg/sec
  roll: number; // deg/sec
  yaw: number; // deg/sec
  hardness: number;
  heatCapacity: number;
  crew: number;
  masslock: number;
  retailCost: number; // Credits
  hullCost: number; // Credits
  coreInternals: CoreInternalsLayout;
  optionalSlots: number[]; // Array of max sizes
  militarySlots: number[]; // Array of military compartment sizes
  hardpointSlots: HardpointSlot[];
  utilitySlots: UtilitySlot[];
  svgHullPath: string; // SVG path string normalized to 400x500 viewport
}

export interface ShipLoadoutState {
  shipId: string;
  shipName: string;
  coreModules: {
    bulkheads: string;
    powerPlant: string;
    thrusters: string;
    frameShiftDrive: string;
    lifeSupport: string;
    powerDistributor: string;
    sensors: string;
    fuelTank: string;
  };
  optionalModules: (string | null)[];
  militaryModules: (string | null)[];
  hardpointModules: (string | null)[];
  utilityModules: (string | null)[];
}

export const SHIP_CHASSIS_CATALOG: ShipChassis[] = [
  {
    "id": "adder",
    "name": "Adder",
    "manufacturer": "Zorgon Peterson",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 35,
    "baseShield": 60,
    "baseArmour": 90,
    "speed": 220,
    "boost": 320,
    "pitch": 38,
    "roll": 100,
    "yaw": 14,
    "hardness": 35,
    "heatCapacity": 170,
    "crew": 2,
    "masslock": 7,
    "retailCost": 87808,
    "hullCost": 40833,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 3,
      "thrusters": 3,
      "frameShiftDrive": 3,
      "lifeSupport": 1,
      "powerDistributor": 2,
      "sensors": 3,
      "fuelTank": 3
    },
    "optionalSlots": [
      3,
      3,
      2,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M175,70 L225,70 L255,180 L265,350 L240,410 L160,410 L135,350 L145,180 Z"
  },
  {
    "id": "alliance_challenger",
    "name": "Alliance Challenger",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 450,
    "baseShield": 220,
    "baseArmour": 300,
    "speed": 204,
    "boost": 310,
    "pitch": 32,
    "roll": 90,
    "yaw": 16,
    "hardness": 65,
    "heatCapacity": 316,
    "crew": 2,
    "masslock": 13,
    "retailCost": 30472252,
    "hullCost": 29569804,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      6,
      3,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [
      4,
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 230,
        "mount": "center",
        "label": "M4 (Center)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 275,
        "mount": "port",
        "label": "S5 (Port)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 275,
        "mount": "starboard",
        "label": "S6 (Stbd)"
      },
      {
        "id": "hp-7",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 320,
        "mount": "center",
        "label": "S7 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 L250,120 L290,230 L320,335 L295,415 L235,425 L200,400 L165,425 L105,415 L80,335 L110,230 L150,120 Z"
  },
  {
    "id": "alliance_chieftain",
    "name": "Alliance Chieftain",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 400,
    "baseShield": 200,
    "baseArmour": 280,
    "speed": 230,
    "boost": 330,
    "pitch": 39,
    "roll": 92,
    "yaw": 16,
    "hardness": 65,
    "heatCapacity": 289,
    "crew": 2,
    "masslock": 13,
    "retailCost": 19382252,
    "hullCost": 18612476,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      5,
      4,
      2,
      2,
      1
    ],
    "militarySlots": [
      4,
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 140,
        "mount": "port",
        "label": "L1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 140,
        "mount": "starboard",
        "label": "L2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 185,
        "mount": "center",
        "label": "M3 (Center)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S5 (Stbd)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 275,
        "mount": "center",
        "label": "S6 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 L245,120 L280,230 L310,330 L285,410 L230,420 L200,400 L170,420 L115,410 L90,330 L120,230 L155,120 Z"
  },
  {
    "id": "alliance_crusader",
    "name": "Alliance Crusader",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 500,
    "baseShield": 200,
    "baseArmour": 300,
    "speed": 180,
    "boost": 300,
    "pitch": 32,
    "roll": 80,
    "yaw": 16,
    "hardness": 65,
    "heatCapacity": 316,
    "crew": 4,
    "masslock": 13,
    "retailCost": 22866341,
    "hullCost": 22096565,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      5,
      3,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [
      4,
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S5 (Stbd)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 275,
        "mount": "center",
        "label": "S6 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 L245,120 L285,230 L315,335 L290,415 L235,420 L200,400 L165,420 L110,415 L85,335 L115,230 L155,120 Z"
  },
  {
    "id": "anaconda",
    "name": "Anaconda",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 400,
    "baseShield": 350,
    "baseArmour": 525,
    "speed": 180,
    "boost": 240,
    "pitch": 25,
    "roll": 60,
    "yaw": 10,
    "hardness": 65,
    "heatCapacity": 334,
    "crew": 4,
    "masslock": 23,
    "retailCost": 146969451,
    "hullCost": 142456440,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 8,
      "thrusters": 7,
      "frameShiftDrive": 6,
      "lifeSupport": 5,
      "powerDistributor": 8,
      "sensors": 8,
      "fuelTank": 5
    },
    "optionalSlots": [
      7,
      6,
      6,
      6,
      5,
      5,
      5,
      4,
      4,
      4,
      2,
      1
    ],
    "militarySlots": [
      5
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 200,
        "y": 220,
        "mount": "ventral",
        "label": "H1 (Ventral)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 175,
        "y": 160,
        "mount": "dorsal",
        "label": "L1 (Dorsal Port)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 225,
        "y": 160,
        "mount": "dorsal",
        "label": "L2 (Dorsal Stbd)"
      },
      {
        "id": "hp-4",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 310,
        "mount": "dorsal",
        "label": "L3 (Dorsal Center)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 165,
        "y": 245,
        "mount": "flank",
        "label": "M1 (Flank Port)"
      },
      {
        "id": "hp-6",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 235,
        "y": 245,
        "mount": "flank",
        "label": "M2 (Flank Stbd)"
      },
      {
        "id": "hp-7",
        "size": 1,
        "sizeLabel": "Small",
        "x": 180,
        "y": 365,
        "mount": "dorsal",
        "label": "S1 (Aft Port)"
      },
      {
        "id": "hp-8",
        "size": 1,
        "sizeLabel": "Small",
        "x": 220,
        "y": 365,
        "mount": "dorsal",
        "label": "S2 (Aft Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 200,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 200,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 280,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 280,
        "label": "U6 (Stbd)"
      },
      {
        "id": "ut-7",
        "x": 115,
        "y": 360,
        "label": "U7 (Port)"
      },
      {
        "id": "ut-8",
        "x": 285,
        "y": 360,
        "label": "U8 (Stbd)"
      }
    ],
    "svgHullPath": "M200,40 L230,80 L238,150 L270,300 L270,410 L250,440 L230,420 L200,430 L170,420 L150,440 L130,410 L130,300 L162,150 L170,80 Z"
  },
  {
    "id": "asp",
    "name": "Asp Explorer",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 280,
    "baseShield": 140,
    "baseArmour": 210,
    "speed": 250,
    "boost": 340,
    "pitch": 38,
    "roll": 100,
    "yaw": 10,
    "hardness": 52,
    "heatCapacity": 272,
    "crew": 2,
    "masslock": 11,
    "retailCost": 6661154,
    "hullCost": 6145793,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 5,
      "thrusters": 5,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 4,
      "sensors": 5,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      5,
      3,
      3,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S5 (Port)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S6 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,70 L260,160 L280,280 L260,390 L200,420 L140,390 L120,280 L140,160 Z"
  },
  {
    "id": "asp_scout",
    "name": "Asp Scout",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 150,
    "baseShield": 120,
    "baseArmour": 180,
    "speed": 220,
    "boost": 300,
    "pitch": 40,
    "roll": 110,
    "yaw": 15,
    "hardness": 52,
    "heatCapacity": 210,
    "crew": 2,
    "masslock": 8,
    "retailCost": 3961154,
    "hullCost": 3819823,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 3,
      "powerDistributor": 4,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      5,
      4,
      3,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,75 L255,160 L275,275 L255,385 L200,415 L145,385 L125,275 L145,160 Z"
  },
  {
    "id": "beluga",
    "name": "Beluga Liner",
    "manufacturer": "Saud Kruger",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 950,
    "baseShield": 280,
    "baseArmour": 280,
    "speed": 200,
    "boost": 280,
    "pitch": 25,
    "roll": 60,
    "yaw": 17,
    "hardness": 60,
    "heatCapacity": 283,
    "crew": 4,
    "masslock": 18,
    "retailCost": 84532764,
    "hullCost": 79694761,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 6,
      "thrusters": 7,
      "frameShiftDrive": 7,
      "lifeSupport": 8,
      "powerDistributor": 6,
      "sensors": 5,
      "fuelTank": 7
    },
    "optionalSlots": [
      6,
      6,
      6,
      6,
      5,
      5,
      4,
      3,
      3,
      3,
      3,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 230,
        "mount": "port",
        "label": "M4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 230,
        "mount": "starboard",
        "label": "M5 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 240,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 240,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 360,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 360,
        "label": "U6 (Stbd)"
      }
    ],
    "svgHullPath": "M200,20 Q245,100 270,220 L290,390 L255,455 L200,435 L145,455 L110,390 Q130,220 155,100 Z"
  },
  {
    "id": "cobra_mk_iii",
    "name": "Cobra Mk III",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 180,
    "baseShield": 80,
    "baseArmour": 120,
    "speed": 280,
    "boost": 400,
    "pitch": 40,
    "roll": 100,
    "yaw": 10,
    "hardness": 35,
    "heatCapacity": 225,
    "crew": 2,
    "masslock": 8,
    "retailCost": 349718,
    "hullCost": 208372,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 3,
      "powerDistributor": 3,
      "sensors": 3,
      "fuelTank": 4
    },
    "optionalSlots": [
      4,
      4,
      4,
      2,
      2,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,80 L275,200 L320,340 L285,400 L230,380 L200,390 L170,380 L115,400 L80,340 L125,200 Z"
  },
  {
    "id": "cobra_mk_iv",
    "name": "Cobra Mk IV",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 210,
    "baseShield": 120,
    "baseArmour": 120,
    "speed": 200,
    "boost": 300,
    "pitch": 30,
    "roll": 90,
    "yaw": 10,
    "hardness": 35,
    "heatCapacity": 228,
    "crew": 2,
    "masslock": 8,
    "retailCost": 764720,
    "hullCost": 623374,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 3,
      "powerDistributor": 3,
      "sensors": 3,
      "fuelTank": 4
    },
    "optionalSlots": [
      4,
      4,
      4,
      4,
      3,
      3,
      2,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 185,
        "mount": "center",
        "label": "M2 (Center)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 275,
        "mount": "center",
        "label": "S5 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,80 L280,200 L325,345 L290,405 L230,385 L200,395 L170,385 L110,405 L75,345 L120,200 Z"
  },
  {
    "id": "diamondback_explorer",
    "name": "Diamondback Explorer",
    "manufacturer": "Lakon",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 260,
    "baseShield": 150,
    "baseArmour": 150,
    "speed": 260,
    "boost": 340,
    "pitch": 35,
    "roll": 90,
    "yaw": 13,
    "hardness": 42,
    "heatCapacity": 351,
    "crew": 1,
    "masslock": 10,
    "retailCost": 1894760,
    "hullCost": 1638277,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 5,
      "lifeSupport": 3,
      "powerDistributor": 4,
      "sensors": 3,
      "fuelTank": 5
    },
    "optionalSlots": [
      4,
      4,
      3,
      3,
      2,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,60 L235,140 L260,250 L290,370 L250,420 L200,390 L150,420 L110,370 L140,250 L165,140 Z"
  },
  {
    "id": "diamondback_scout",
    "name": "Diamondback Scout",
    "manufacturer": "Lakon",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 170,
    "baseShield": 120,
    "baseArmour": 120,
    "speed": 280,
    "boost": 380,
    "pitch": 42,
    "roll": 100,
    "yaw": 15,
    "hardness": 40,
    "heatCapacity": 346,
    "crew": 1,
    "masslock": 8,
    "retailCost": 564329,
    "hullCost": 463926,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 2,
      "powerDistributor": 3,
      "sensors": 2,
      "fuelTank": 4
    },
    "optionalSlots": [
      3,
      3,
      3,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,65 L235,140 L255,250 L280,365 L245,415 L200,385 L155,415 L120,365 L145,250 L165,140 Z"
  },
  {
    "id": "dolphin",
    "name": "Dolphin",
    "manufacturer": "Saud Kruger",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 140,
    "baseShield": 110,
    "baseArmour": 110,
    "speed": 250,
    "boost": 350,
    "pitch": 30,
    "roll": 100,
    "yaw": 20,
    "hardness": 35,
    "heatCapacity": 165,
    "crew": 1,
    "masslock": 9,
    "retailCost": 1337323,
    "hullCost": 1117906,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 5,
      "frameShiftDrive": 4,
      "lifeSupport": 4,
      "powerDistributor": 3,
      "sensors": 3,
      "fuelTank": 4
    },
    "optionalSlots": [
      5,
      4,
      4,
      3,
      2,
      2,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 140,
        "mount": "port",
        "label": "S1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 140,
        "mount": "starboard",
        "label": "S2 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      }
    ],
    "svgHullPath": "M200,40 Q235,110 250,220 L270,360 L240,420 L200,405 L160,420 L130,360 Q150,220 165,110 Z"
  },
  {
    "id": "eagle",
    "name": "Eagle",
    "manufacturer": "Core Dynamics",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 50,
    "baseShield": 60,
    "baseArmour": 40,
    "speed": 240,
    "boost": 350,
    "pitch": 50,
    "roll": 120,
    "yaw": 18,
    "hardness": 28,
    "heatCapacity": 165,
    "crew": 1,
    "masslock": 6,
    "retailCost": 44800,
    "hullCost": 10947,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 2,
      "thrusters": 3,
      "frameShiftDrive": 3,
      "lifeSupport": 1,
      "powerDistributor": 2,
      "sensors": 2,
      "fuelTank": 2
    },
    "optionalSlots": [
      3,
      2,
      1,
      1,
      1,
      1
    ],
    "militarySlots": [
      2
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "S1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      }
    ],
    "svgHullPath": "M200,50 L235,130 L285,280 L270,380 L225,395 L200,375 L175,395 L130,380 L115,280 L165,130 Z"
  },
  {
    "id": "federal_assault_ship",
    "name": "Federal Assault Ship",
    "manufacturer": "Core Dynamics",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 480,
    "baseShield": 200,
    "baseArmour": 300,
    "speed": 210,
    "boost": 350,
    "pitch": 38,
    "roll": 90,
    "yaw": 19,
    "hardness": 60,
    "heatCapacity": 286,
    "crew": 2,
    "masslock": 14,
    "retailCost": 19814210,
    "hullCost": 19111109,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      5,
      5,
      4,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 140,
        "mount": "port",
        "label": "L1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 140,
        "mount": "starboard",
        "label": "L2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M175,50 L225,50 L265,160 L280,320 L255,420 L145,420 L120,320 L135,160 Z"
  },
  {
    "id": "federal_corvette",
    "name": "Federal Corvette",
    "manufacturer": "Core Dynamics",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 900,
    "baseShield": 555,
    "baseArmour": 370,
    "speed": 200,
    "boost": 260,
    "pitch": 28,
    "roll": 75,
    "yaw": 8,
    "hardness": 70,
    "heatCapacity": 333,
    "crew": 4,
    "masslock": 24,
    "retailCost": 187969450,
    "hullCost": 183156068,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 8,
      "thrusters": 7,
      "frameShiftDrive": 6,
      "lifeSupport": 5,
      "powerDistributor": 8,
      "sensors": 8,
      "fuelTank": 5
    },
    "optionalSlots": [
      7,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4,
      3,
      1
    ],
    "militarySlots": [
      5,
      5
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 180,
        "y": 320,
        "mount": "dorsal",
        "label": "H1 (Dorsal Port)"
      },
      {
        "id": "hp-2",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 220,
        "y": 320,
        "mount": "dorsal",
        "label": "H2 (Dorsal Stbd)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 250,
        "mount": "ventral",
        "label": "L1 (Ventral Center)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 165,
        "y": 200,
        "mount": "dorsal",
        "label": "M1 (Dorsal Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 235,
        "y": 200,
        "mount": "dorsal",
        "label": "M2 (Dorsal Stbd)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 185,
        "y": 130,
        "mount": "dorsal",
        "label": "S1 (Nose Port)"
      },
      {
        "id": "hp-7",
        "size": 1,
        "sizeLabel": "Small",
        "x": 215,
        "y": 130,
        "mount": "dorsal",
        "label": "S2 (Nose Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 200,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 200,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 280,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 280,
        "label": "U6 (Stbd)"
      },
      {
        "id": "ut-7",
        "x": 115,
        "y": 360,
        "label": "U7 (Port)"
      },
      {
        "id": "ut-8",
        "x": 285,
        "y": 360,
        "label": "U8 (Stbd)"
      }
    ],
    "svgHullPath": "M200,30 L225,90 L240,210 L290,320 L290,420 L240,450 L215,430 L200,440 L185,430 L160,450 L110,420 L110,320 L160,210 L175,90 Z"
  },
  {
    "id": "federal_dropship",
    "name": "Federal Dropship",
    "manufacturer": "Core Dynamics",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 580,
    "baseShield": 200,
    "baseArmour": 300,
    "speed": 180,
    "boost": 300,
    "pitch": 30,
    "roll": 80,
    "yaw": 14,
    "hardness": 60,
    "heatCapacity": 331,
    "crew": 2,
    "masslock": 14,
    "retailCost": 14314210,
    "hullCost": 13510106,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 230,
        "mount": "port",
        "label": "M4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 230,
        "mount": "starboard",
        "label": "M5 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M170,55 L230,55 L270,170 L285,330 L260,425 L140,425 L115,330 L130,170 Z"
  },
  {
    "id": "federal_gunship",
    "name": "Federal Gunship",
    "manufacturer": "Core Dynamics",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 580,
    "baseShield": 250,
    "baseArmour": 350,
    "speed": 170,
    "boost": 280,
    "pitch": 25,
    "roll": 80,
    "yaw": 18,
    "hardness": 60,
    "heatCapacity": 325,
    "crew": 2,
    "masslock": 14,
    "retailCost": 35814210,
    "hullCost": 34814912,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 7,
      "sensors": 5,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      6,
      5,
      2,
      2,
      1
    ],
    "militarySlots": [
      4,
      4,
      4
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 230,
        "mount": "port",
        "label": "M4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 230,
        "mount": "starboard",
        "label": "M5 (Stbd)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 275,
        "mount": "port",
        "label": "S6 (Port)"
      },
      {
        "id": "hp-7",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 275,
        "mount": "starboard",
        "label": "S7 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M165,50 L235,50 L275,165 L290,335 L265,430 L135,430 L110,335 L125,165 Z"
  },
  {
    "id": "fer_de_lance",
    "name": "Fer-de-Lance",
    "manufacturer": "Zorgon Peterson",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 250,
    "baseShield": 300,
    "baseArmour": 225,
    "speed": 260,
    "boost": 350,
    "pitch": 38,
    "roll": 90,
    "yaw": 12,
    "hardness": 70,
    "heatCapacity": 224,
    "crew": 2,
    "masslock": 12,
    "retailCost": 51567040,
    "hullCost": 51242363,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 5,
      "frameShiftDrive": 4,
      "lifeSupport": 4,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 3
    },
    "optionalSlots": [
      5,
      4,
      4,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 200,
        "y": 260,
        "mount": "ventral",
        "label": "H1 (Ventral Spine)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 180,
        "y": 180,
        "mount": "dorsal",
        "label": "M1 (Dorsal Fwd Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 220,
        "y": 180,
        "mount": "dorsal",
        "label": "M2 (Dorsal Fwd Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 170,
        "y": 225,
        "mount": "dorsal",
        "label": "M3 (Dorsal Mid Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 230,
        "y": 225,
        "mount": "dorsal",
        "label": "M4 (Dorsal Mid Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 240,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 240,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 360,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 360,
        "label": "U6 (Stbd)"
      }
    ],
    "svgHullPath": "M200,40 L235,130 L260,260 L270,390 L240,430 L200,410 L160,430 L130,390 L140,260 L165,130 Z"
  },
  {
    "id": "hauler",
    "name": "Hauler",
    "manufacturer": "Zorgon Peterson",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 14,
    "baseShield": 50,
    "baseArmour": 100,
    "speed": 200,
    "boost": 300,
    "pitch": 36,
    "roll": 100,
    "yaw": 14,
    "hardness": 20,
    "heatCapacity": 123,
    "crew": 1,
    "masslock": 6,
    "retailCost": 52720,
    "hullCost": 30308,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 2,
      "thrusters": 2,
      "frameShiftDrive": 2,
      "lifeSupport": 1,
      "powerDistributor": 1,
      "sensors": 1,
      "fuelTank": 2
    },
    "optionalSlots": [
      3,
      3,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "S1 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M170,80 L230,80 L250,200 L255,360 L235,410 L165,410 L145,360 L150,200 Z"
  },
  {
    "id": "imperial_clipper",
    "name": "Imperial Clipper",
    "manufacturer": "Gutamaya",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 400,
    "baseShield": 180,
    "baseArmour": 270,
    "speed": 300,
    "boost": 380,
    "pitch": 40,
    "roll": 80,
    "yaw": 18,
    "hardness": 60,
    "heatCapacity": 304,
    "crew": 2,
    "masslock": 12,
    "retailCost": 22295860,
    "hullCost": 21116895,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 5,
      "fuelTank": 4
    },
    "optionalSlots": [
      7,
      6,
      4,
      4,
      3,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 140,
        "mount": "port",
        "label": "L1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 140,
        "mount": "starboard",
        "label": "L2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,45 Q235,120 270,200 L345,300 L320,400 L240,390 L200,410 L160,390 L80,400 L55,300 Q130,200 165,120 Z"
  },
  {
    "id": "imperial_courier",
    "name": "Imperial Courier",
    "manufacturer": "Gutamaya",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 35,
    "baseShield": 200,
    "baseArmour": 80,
    "speed": 280,
    "boost": 380,
    "pitch": 38,
    "roll": 90,
    "yaw": 16,
    "hardness": 30,
    "heatCapacity": 230,
    "crew": 1,
    "masslock": 7,
    "retailCost": 2542931,
    "hullCost": 2484137,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 3,
      "frameShiftDrive": 3,
      "lifeSupport": 1,
      "powerDistributor": 3,
      "sensors": 2,
      "fuelTank": 3
    },
    "optionalSlots": [
      3,
      3,
      2,
      2,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 Q230,130 250,220 L300,330 L270,390 L220,380 L200,390 L180,380 L130,390 L100,330 Q150,220 170,130 Z"
  },
  {
    "id": "imperial_cutter",
    "name": "Imperial Cutter",
    "manufacturer": "Gutamaya",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 1100,
    "baseShield": 600,
    "baseArmour": 400,
    "speed": 200,
    "boost": 320,
    "pitch": 18,
    "roll": 45,
    "yaw": 8,
    "hardness": 70,
    "heatCapacity": 327,
    "crew": 4,
    "masslock": 27,
    "retailCost": 208969451,
    "hullCost": 200493413,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 8,
      "thrusters": 8,
      "frameShiftDrive": 7,
      "lifeSupport": 7,
      "powerDistributor": 7,
      "sensors": 7,
      "fuelTank": 6
    },
    "optionalSlots": [
      8,
      8,
      6,
      6,
      6,
      5,
      5,
      4,
      3,
      1
    ],
    "militarySlots": [
      5,
      5
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 200,
        "y": 250,
        "mount": "ventral",
        "label": "H1 (Ventral Center)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 160,
        "mount": "dorsal",
        "label": "L1 (Dorsal Center)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 330,
        "mount": "dorsal",
        "label": "L2 (Dorsal Aft)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 145,
        "y": 260,
        "mount": "wing",
        "label": "M1 (Nacelle Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 255,
        "y": 260,
        "mount": "wing",
        "label": "M2 (Nacelle Stbd)"
      },
      {
        "id": "hp-6",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 125,
        "y": 320,
        "mount": "wing",
        "label": "M3 (Outer Port)"
      },
      {
        "id": "hp-7",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 275,
        "y": 320,
        "mount": "wing",
        "label": "M4 (Outer Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 200,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 200,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 280,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 280,
        "label": "U6 (Stbd)"
      },
      {
        "id": "ut-7",
        "x": 115,
        "y": 360,
        "label": "U7 (Port)"
      },
      {
        "id": "ut-8",
        "x": 285,
        "y": 360,
        "label": "U8 (Stbd)"
      }
    ],
    "svgHullPath": "M200,35 Q225,90 240,180 Q275,260 300,340 Q305,400 280,430 Q240,435 220,415 L200,425 L180,415 Q160,435 120,430 Q95,400 100,340 Q125,260 160,180 Q175,90 200,35 Z"
  },
  {
    "id": "imperial_eagle",
    "name": "Imperial Eagle",
    "manufacturer": "Gutamaya",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 50,
    "baseShield": 80,
    "baseArmour": 60,
    "speed": 300,
    "boost": 400,
    "pitch": 40,
    "roll": 100,
    "yaw": 15,
    "hardness": 28,
    "heatCapacity": 163,
    "crew": 1,
    "masslock": 6,
    "retailCost": 110830,
    "hullCost": 73023,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 3,
      "thrusters": 3,
      "frameShiftDrive": 3,
      "lifeSupport": 1,
      "powerDistributor": 2,
      "sensors": 2,
      "fuelTank": 2
    },
    "optionalSlots": [
      3,
      2,
      1,
      1,
      1,
      1
    ],
    "militarySlots": [
      2
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      }
    ],
    "svgHullPath": "M200,45 L240,125 L295,275 L280,380 L230,395 L200,375 L170,395 L120,380 L105,275 L160,125 Z"
  },
  {
    "id": "keelback",
    "name": "Keelback",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 180,
    "baseShield": 135,
    "baseArmour": 270,
    "speed": 200,
    "boost": 300,
    "pitch": 27,
    "roll": 100,
    "yaw": 15,
    "hardness": 45,
    "heatCapacity": 215,
    "crew": 2,
    "masslock": 8,
    "retailCost": 3126154,
    "hullCost": 2946463,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 1,
      "powerDistributor": 3,
      "sensors": 2,
      "fuelTank": 4
    },
    "optionalSlots": [
      5,
      5,
      4,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      }
    ],
    "svgHullPath": "M155,60 L245,60 L280,180 L285,340 L255,430 L145,430 L115,340 L120,180 Z"
  },
  {
    "id": "krait_mkii",
    "name": "Krait Mk II",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 320,
    "baseShield": 220,
    "baseArmour": 220,
    "speed": 240,
    "boost": 330,
    "pitch": 26,
    "roll": 90,
    "yaw": 10,
    "hardness": 55,
    "heatCapacity": 300,
    "crew": 3,
    "masslock": 16,
    "retailCost": 45814205,
    "hullCost": 44160710,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 7,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 7,
      "sensors": 6,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 170,
        "mount": "dorsal",
        "label": "L1 (Center Dorsal)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 170,
        "y": 210,
        "mount": "dorsal",
        "label": "L2 (Port Dorsal)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 230,
        "y": 210,
        "mount": "dorsal",
        "label": "L3 (Stbd Dorsal)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 155,
        "y": 280,
        "mount": "ventral",
        "label": "M1 (Port Ventral)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 245,
        "y": 280,
        "mount": "ventral",
        "label": "M2 (Stbd Ventral)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,60 L240,110 L300,280 L320,380 L290,410 L250,380 L200,400 L150,380 L110,410 L80,380 L100,280 L160,110 Z"
  },
  {
    "id": "krait_phantom",
    "name": "Krait Phantom",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 270,
    "baseShield": 200,
    "baseArmour": 180,
    "speed": 250,
    "boost": 350,
    "pitch": 26,
    "roll": 90,
    "yaw": 10,
    "hardness": 55,
    "heatCapacity": 300,
    "crew": 2,
    "masslock": 14,
    "retailCost": 37472252,
    "hullCost": 35741519,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 7,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 7,
      "sensors": 6,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      5,
      5,
      5,
      3,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 175,
        "y": 190,
        "mount": "dorsal",
        "label": "L1 (Port Dorsal)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 225,
        "y": 190,
        "mount": "dorsal",
        "label": "L2 (Stbd Dorsal)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 155,
        "y": 270,
        "mount": "ventral",
        "label": "M1 (Port Ventral)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 245,
        "y": 270,
        "mount": "ventral",
        "label": "M2 (Stbd Ventral)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,65 L245,115 L295,275 L310,375 L280,405 L245,375 L200,395 L155,375 L120,405 L90,375 L105,275 L155,115 Z"
  },
  {
    "id": "mamba",
    "name": "Mamba",
    "manufacturer": "Zorgon Peterson",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 250,
    "baseShield": 270,
    "baseArmour": 230,
    "speed": 310,
    "boost": 380,
    "pitch": 27,
    "roll": 80,
    "yaw": 10,
    "hardness": 70,
    "heatCapacity": 165,
    "crew": 2,
    "masslock": 12,
    "retailCost": 55867040,
    "hullCost": 55442918,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 5,
      "frameShiftDrive": 4,
      "lifeSupport": 4,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 3
    },
    "optionalSlots": [
      5,
      4,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 4,
        "sizeLabel": "Huge",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "H1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 185,
        "mount": "port",
        "label": "L2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 185,
        "mount": "starboard",
        "label": "L3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S5 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 240,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 240,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 360,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 360,
        "label": "U6 (Stbd)"
      }
    ],
    "svgHullPath": "M200,35 L230,110 L280,260 L300,400 L255,430 L200,395 L145,430 L100,400 L120,260 L170,110 Z"
  },
  {
    "id": "mandalay",
    "name": "Mandalay",
    "manufacturer": "Zorgon Peterson",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 230,
    "baseShield": 220,
    "baseArmour": 230,
    "speed": 280,
    "boost": 350,
    "pitch": 35,
    "roll": 96,
    "yaw": 28,
    "hardness": 55,
    "heatCapacity": 250,
    "crew": 2,
    "masslock": 11,
    "retailCost": 17639220,
    "hullCost": 16527192,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 5,
      "thrusters": 5,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 5,
      "sensors": 5,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      5,
      4,
      4,
      3,
      3,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M4 (Stbd)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S5 (Port)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S6 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 L245,130 L310,270 L295,385 L240,415 L200,395 L160,415 L105,385 L90,270 L155,130 Z"
  },
  {
    "id": "orca",
    "name": "Orca",
    "manufacturer": "Saud Kruger",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 290,
    "baseShield": 220,
    "baseArmour": 220,
    "speed": 300,
    "boost": 380,
    "pitch": 25,
    "roll": 55,
    "yaw": 18,
    "hardness": 55,
    "heatCapacity": 262,
    "crew": 2,
    "masslock": 16,
    "retailCost": 48539887,
    "hullCost": 47800723,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 5,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 6,
      "powerDistributor": 5,
      "sensors": 4,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      5,
      5,
      5,
      4,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,30 Q240,110 260,220 L280,380 L245,440 L200,420 L155,440 L120,380 Q140,220 160,110 Z"
  },
  {
    "id": "python",
    "name": "Python",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 350,
    "baseShield": 260,
    "baseArmour": 260,
    "speed": 230,
    "boost": 300,
    "pitch": 29,
    "roll": 90,
    "yaw": 10,
    "hardness": 65,
    "heatCapacity": 300,
    "crew": 2,
    "masslock": 17,
    "retailCost": 56978179,
    "hullCost": 55324684,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 7,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 7,
      "sensors": 6,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      6,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 160,
        "mount": "dorsal",
        "label": "L1 (Dorsal Top)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 180,
        "y": 240,
        "mount": "dorsal",
        "label": "L2 (Dorsal Port)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 220,
        "y": 240,
        "mount": "dorsal",
        "label": "L3 (Dorsal Stbd)"
      },
      {
        "id": "hp-4",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 175,
        "y": 330,
        "mount": "ventral",
        "label": "M1 (Ventral Port)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 225,
        "y": 330,
        "mount": "ventral",
        "label": "M2 (Ventral Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,50 L250,150 L275,320 L260,410 L220,430 L200,420 L180,430 L140,410 L125,320 L150,150 Z"
  },
  {
    "id": "python_nx",
    "name": "Python Mk II",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 450,
    "baseShield": 335,
    "baseArmour": 280,
    "speed": 256,
    "boost": 345,
    "pitch": 37.72,
    "roll": 92.76,
    "yaw": 12.74,
    "hardness": 70,
    "heatCapacity": 316,
    "crew": 2,
    "masslock": 17,
    "retailCost": 67527359,
    "hullCost": 64743724,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 6,
      "thrusters": 6,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 6,
      "sensors": 5,
      "fuelTank": 4
    },
    "optionalSlots": [
      6,
      4,
      3,
      2,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 180,
        "y": 170,
        "mount": "dorsal",
        "label": "L1 (Dorsal Fwd Port)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 220,
        "y": 170,
        "mount": "dorsal",
        "label": "L2 (Dorsal Fwd Stbd)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 175,
        "y": 240,
        "mount": "dorsal",
        "label": "L3 (Dorsal Mid Port)"
      },
      {
        "id": "hp-4",
        "size": 3,
        "sizeLabel": "Large",
        "x": 225,
        "y": 240,
        "mount": "dorsal",
        "label": "L4 (Dorsal Mid Stbd)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 170,
        "y": 330,
        "mount": "ventral",
        "label": "M1 (Ventral Port)"
      },
      {
        "id": "hp-6",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 230,
        "y": 330,
        "mount": "ventral",
        "label": "M2 (Ventral Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 240,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 240,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 360,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 360,
        "label": "U6 (Stbd)"
      }
    ],
    "svgHullPath": "M200,45 L255,145 L285,315 L270,415 L225,435 L200,425 L175,435 L130,415 L115,315 L145,145 Z"
  },
  {
    "id": "sidewinder",
    "name": "Sidewinder",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 25,
    "baseShield": 40,
    "baseArmour": 60,
    "speed": 220,
    "boost": 320,
    "pitch": 42,
    "roll": 110,
    "yaw": 16,
    "hardness": 20,
    "heatCapacity": 140,
    "crew": 1,
    "masslock": 6,
    "retailCost": 32000,
    "hullCost": 4588,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 2,
      "thrusters": 2,
      "frameShiftDrive": 2,
      "lifeSupport": 1,
      "powerDistributor": 1,
      "sensors": 1,
      "fuelTank": 1
    },
    "optionalSlots": [
      2,
      2,
      1,
      1,
      1,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 140,
        "mount": "port",
        "label": "S1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 140,
        "mount": "starboard",
        "label": "S2 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,100 L270,220 L280,350 L240,380 L200,365 L160,380 L120,350 L130,220 Z"
  },
  {
    "id": "type_10_defender",
    "name": "Type-10 Defender",
    "manufacturer": "Lakon",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 1200,
    "baseShield": 320,
    "baseArmour": 580,
    "speed": 179,
    "boost": 219,
    "pitch": 20,
    "roll": 20,
    "yaw": 8,
    "hardness": 75,
    "heatCapacity": 335,
    "crew": 4,
    "masslock": 26,
    "retailCost": 124755342,
    "hullCost": 121334619,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 8,
      "thrusters": 7,
      "frameShiftDrive": 7,
      "lifeSupport": 5,
      "powerDistributor": 7,
      "sensors": 4,
      "fuelTank": 6
    },
    "optionalSlots": [
      8,
      7,
      6,
      5,
      4,
      4,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [
      5,
      5
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "L1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 185,
        "mount": "port",
        "label": "L2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 185,
        "mount": "starboard",
        "label": "L3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 3,
        "sizeLabel": "Large",
        "x": 200,
        "y": 230,
        "mount": "center",
        "label": "L4 (Center)"
      },
      {
        "id": "hp-5",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 275,
        "mount": "port",
        "label": "M5 (Port)"
      },
      {
        "id": "hp-6",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 275,
        "mount": "starboard",
        "label": "M6 (Stbd)"
      },
      {
        "id": "hp-7",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 320,
        "mount": "center",
        "label": "M7 (Center)"
      },
      {
        "id": "hp-8",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 365,
        "mount": "port",
        "label": "S8 (Port)"
      },
      {
        "id": "hp-9",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 365,
        "mount": "starboard",
        "label": "S9 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 200,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 200,
        "label": "U4 (Stbd)"
      },
      {
        "id": "ut-5",
        "x": 120,
        "y": 280,
        "label": "U5 (Port)"
      },
      {
        "id": "ut-6",
        "x": 280,
        "y": 280,
        "label": "U6 (Stbd)"
      },
      {
        "id": "ut-7",
        "x": 115,
        "y": 360,
        "label": "U7 (Port)"
      },
      {
        "id": "ut-8",
        "x": 285,
        "y": 360,
        "label": "U8 (Stbd)"
      }
    ],
    "svgHullPath": "M130,50 L270,50 L330,180 L350,350 L300,445 L100,445 L50,350 L70,180 Z"
  },
  {
    "id": "type_6_transporter",
    "name": "Type-6 Transporter",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 155,
    "baseShield": 90,
    "baseArmour": 180,
    "speed": 220,
    "boost": 350,
    "pitch": 30,
    "roll": 100,
    "yaw": 17,
    "hardness": 35,
    "heatCapacity": 179,
    "crew": 1,
    "masslock": 8,
    "retailCost": 1045945,
    "hullCost": 866622,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 3,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 2,
      "powerDistributor": 3,
      "sensors": 2,
      "fuelTank": 4
    },
    "optionalSlots": [
      5,
      5,
      4,
      4,
      3,
      2,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 140,
        "mount": "port",
        "label": "S1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 140,
        "mount": "starboard",
        "label": "S2 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      }
    ],
    "svgHullPath": "M160,60 L240,60 L255,180 L265,340 L250,430 L150,430 L135,340 L145,180 Z"
  },
  {
    "id": "type_7_transport",
    "name": "Type-7 Transporter",
    "manufacturer": "Lakon",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 350,
    "baseShield": 155,
    "baseArmour": 340,
    "speed": 180,
    "boost": 300,
    "pitch": 22,
    "roll": 60,
    "yaw": 22,
    "hardness": 54,
    "heatCapacity": 226,
    "crew": 1,
    "masslock": 10,
    "retailCost": 17472252,
    "hullCost": 16783094,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 5,
      "thrusters": 5,
      "frameShiftDrive": 5,
      "lifeSupport": 4,
      "powerDistributor": 4,
      "sensors": 3,
      "fuelTank": 5
    },
    "optionalSlots": [
      6,
      6,
      6,
      5,
      5,
      5,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 140,
        "mount": "port",
        "label": "S1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 140,
        "mount": "starboard",
        "label": "S2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M150,50 L250,50 L270,170 L280,350 L265,440 L135,440 L120,350 L130,170 Z"
  },
  {
    "id": "type_8_transport",
    "name": "Type-8 Transporter",
    "manufacturer": "Lakon",
    "shipClass": 2,
    "shipClassLabel": "Medium",
    "hullMass": 400,
    "baseShield": 228,
    "baseArmour": 440,
    "speed": 200,
    "boost": 340,
    "pitch": 28,
    "roll": 60,
    "yaw": 18,
    "hardness": 58,
    "heatCapacity": 226,
    "crew": 1,
    "masslock": 18,
    "retailCost": 38453970,
    "hullCost": 34820576,
    "coreInternals": {
      "bulkheads": 2,
      "powerPlant": 5,
      "thrusters": 5,
      "frameShiftDrive": 5,
      "lifeSupport": 3,
      "powerDistributor": 4,
      "sensors": 3,
      "fuelTank": 5
    },
    "optionalSlots": [
      7,
      6,
      6,
      6,
      5,
      5,
      4,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S5 (Stbd)"
      },
      {
        "id": "hp-6",
        "size": 1,
        "sizeLabel": "Small",
        "x": 200,
        "y": 275,
        "mount": "center",
        "label": "S6 (Center)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M145,55 L255,55 L280,165 L295,335 L275,435 L125,435 L105,335 L120,165 Z"
  },
  {
    "id": "type_9_heavy",
    "name": "Type-9 Heavy",
    "manufacturer": "Lakon",
    "shipClass": 3,
    "shipClassLabel": "Large",
    "hullMass": 850,
    "baseShield": 240,
    "baseArmour": 480,
    "speed": 130,
    "boost": 200,
    "pitch": 20,
    "roll": 20,
    "yaw": 8,
    "hardness": 65,
    "heatCapacity": 289,
    "crew": 4,
    "masslock": 16,
    "retailCost": 76555842,
    "hullCost": 72116858,
    "coreInternals": {
      "bulkheads": 3,
      "powerPlant": 6,
      "thrusters": 7,
      "frameShiftDrive": 6,
      "lifeSupport": 5,
      "powerDistributor": 6,
      "sensors": 4,
      "fuelTank": 6
    },
    "optionalSlots": [
      8,
      8,
      7,
      6,
      5,
      4,
      4,
      3,
      3,
      2,
      1
    ],
    "militarySlots": [],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 200,
        "y": 140,
        "mount": "center",
        "label": "M1 (Center)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 185,
        "mount": "port",
        "label": "M2 (Port)"
      },
      {
        "id": "hp-3",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 185,
        "mount": "starboard",
        "label": "M3 (Stbd)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 230,
        "mount": "port",
        "label": "S4 (Port)"
      },
      {
        "id": "hp-5",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 230,
        "mount": "starboard",
        "label": "S5 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M140,50 L260,50 L310,180 L330,350 L290,440 L110,440 L70,350 L90,180 Z"
  },
  {
    "id": "viper",
    "name": "Viper",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 50,
    "baseShield": 105,
    "baseArmour": 70,
    "speed": 320,
    "boost": 400,
    "pitch": 35,
    "roll": 90,
    "yaw": 15,
    "hardness": 35,
    "heatCapacity": 195,
    "crew": 1,
    "masslock": 7,
    "retailCost": 142931,
    "hullCost": 96733,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 3,
      "thrusters": 3,
      "frameShiftDrive": 3,
      "lifeSupport": 2,
      "powerDistributor": 3,
      "sensors": 3,
      "fuelTank": 2
    },
    "optionalSlots": [
      3,
      3,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [
      3
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,60 L240,150 L260,290 L245,410 L200,390 L155,410 L140,290 L160,150 Z"
  },
  {
    "id": "viper_mk_iv",
    "name": "Viper Mk IV",
    "manufacturer": "Faulcon DeLacy",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 190,
    "baseShield": 150,
    "baseArmour": 150,
    "speed": 270,
    "boost": 340,
    "pitch": 30,
    "roll": 90,
    "yaw": 12,
    "hardness": 35,
    "heatCapacity": 209,
    "crew": 1,
    "masslock": 7,
    "retailCost": 437931,
    "hullCost": 312797,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 4,
      "frameShiftDrive": 4,
      "lifeSupport": 2,
      "powerDistributor": 3,
      "sensors": 3,
      "fuelTank": 4
    },
    "optionalSlots": [
      4,
      4,
      3,
      2,
      2,
      1,
      1,
      1
    ],
    "militarySlots": [
      3
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 159,
        "y": 140,
        "mount": "port",
        "label": "M1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 2,
        "sizeLabel": "Medium",
        "x": 241,
        "y": 140,
        "mount": "starboard",
        "label": "M2 (Stbd)"
      },
      {
        "id": "hp-3",
        "size": 1,
        "sizeLabel": "Small",
        "x": 167,
        "y": 185,
        "mount": "port",
        "label": "S3 (Port)"
      },
      {
        "id": "hp-4",
        "size": 1,
        "sizeLabel": "Small",
        "x": 233,
        "y": 185,
        "mount": "starboard",
        "label": "S4 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      }
    ],
    "svgHullPath": "M200,60 L245,150 L265,295 L250,415 L200,395 L150,415 L135,295 L155,150 Z"
  },
  {
    "id": "vulture",
    "name": "Vulture",
    "manufacturer": "Core Dynamics",
    "shipClass": 1,
    "shipClassLabel": "Small",
    "hullMass": 230,
    "baseShield": 240,
    "baseArmour": 160,
    "speed": 210,
    "boost": 340,
    "pitch": 42,
    "roll": 110,
    "yaw": 17,
    "hardness": 55,
    "heatCapacity": 237,
    "crew": 2,
    "masslock": 10,
    "retailCost": 4925615,
    "hullCost": 4692214,
    "coreInternals": {
      "bulkheads": 1,
      "powerPlant": 4,
      "thrusters": 5,
      "frameShiftDrive": 4,
      "lifeSupport": 3,
      "powerDistributor": 5,
      "sensors": 4,
      "fuelTank": 3
    },
    "optionalSlots": [
      5,
      4,
      2,
      1,
      1,
      1,
      1
    ],
    "militarySlots": [
      5
    ],
    "hardpointSlots": [
      {
        "id": "hp-1",
        "size": 3,
        "sizeLabel": "Large",
        "x": 151,
        "y": 140,
        "mount": "port",
        "label": "L1 (Port)"
      },
      {
        "id": "hp-2",
        "size": 3,
        "sizeLabel": "Large",
        "x": 249,
        "y": 140,
        "mount": "starboard",
        "label": "L2 (Stbd)"
      }
    ],
    "utilitySlots": [
      {
        "id": "ut-1",
        "x": 130,
        "y": 120,
        "label": "U1 (Port)"
      },
      {
        "id": "ut-2",
        "x": 270,
        "y": 120,
        "label": "U2 (Stbd)"
      },
      {
        "id": "ut-3",
        "x": 125,
        "y": 360,
        "label": "U3 (Port)"
      },
      {
        "id": "ut-4",
        "x": 275,
        "y": 360,
        "label": "U4 (Stbd)"
      }
    ],
    "svgHullPath": "M200,80 L250,130 L270,260 L265,390 L230,410 L200,395 L170,410 L135,390 L130,260 L150,130 Z"
  }
];

export const SHIP_CHASSIS_MAP: Record<string, ShipChassis> = Object.fromEntries(
  SHIP_CHASSIS_CATALOG.map((s) => [s.id, s])
);

export function createStockLoadout(ship: ShipChassis): ShipLoadoutState {
  const c = ship.coreInternals;
  return {
    shipId: ship.id,
    shipName: ship.name,
    coreModules: {
      bulkheads: c.bulkheads + "C Lightweight Alloys",
      powerPlant: c.powerPlant + "E Power Plant",
      thrusters: c.thrusters + "E Thrusters",
      frameShiftDrive: c.frameShiftDrive + "E Frame Shift Drive",
      lifeSupport: c.lifeSupport + "E Life Support",
      powerDistributor: c.powerDistributor + "E Power Distributor",
      sensors: c.sensors + "E Sensors",
      fuelTank: c.fuelTank + "C Fuel Tank (32T)",
    },
    optionalModules: ship.optionalSlots.map((size, idx) => {
      if (idx === 0) return size + "E Cargo Rack (" + Math.pow(2, size) + "T)";
      if (idx === 1) return size + "E Shield Generator";
      return null;
    }),
    militaryModules: ship.militarySlots.map(() => null),
    hardpointModules: ship.hardpointSlots.map((hp, idx) => {
      if (idx < 2) return hp.size + "F Pulse Laser (Fixed)";
      return null;
    }),
    utilityModules: ship.utilitySlots.map(() => null),
  };
}
