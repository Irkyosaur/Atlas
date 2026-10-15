/**
 * Atlas Shipbuilder Engine - Loadout Import & Export Codecs
 * Supports:
 * 1. Coriolis JSON (Standard Schema)
 * 2. EDSY SLEF (Standard Loadout Exchange Format JSON)
 * 3. Atlas Shortcode / Base64 URL Permalink
 */

import {
  SHIP_CHASSIS_CATALOG,
  SHIP_CHASSIS_MAP,
  type ShipChassis,
  type ShipLoadoutState,
  createStockLoadout,
} from './ship_catalog';
import {
  type ModuleEngineeringState,
  ENGINEERING_BLUEPRINTS,
  EXPERIMENTAL_EFFECTS,
} from './engineering_catalog';

export interface ExportedShipBuild {
  version: '1.0';
  generator: 'Atlas Shipbuilder';
  timestamp: string;
  shipId: string;
  shipName: string;
  buildTitle: string;
  loadout: ShipLoadoutState;
  engineering: Record<string, ModuleEngineeringState>;
}

export interface CoriolisModule {
  class: number;
  rating: string;
  blueprint?: {
    name: string;
    grade: number;
    percent?: number;
    special?: {
      name: string;
    };
  };
}

export interface CoriolisBuildFormat {
  schemaVersion?: number;
  name?: string;
  ship: string;
  components?: {
    standard?: Record<string, CoriolisModule>;
    internal?: (CoriolisModule | null)[];
    hardpoints?: (CoriolisModule | null)[];
    utility?: (CoriolisModule | null)[];
  };
}

export interface SlefSlotEntry {
  slot: string;
  item?: string;
  engineer?: {
    blueprint?: string;
    level?: number;
    quality?: number;
    experimental?: string;
  };
}

export interface SlefBuildFormat {
  header?: {
    software?: string;
    version?: string;
  };
  build?: {
    ship?: string;
    name?: string;
    modules?: SlefSlotEntry[];
  };
}

// ============================================================================
// ATLAS SHORTCODE & URL PERMALINK ENCODER / DECODER
// ============================================================================

export function exportAtlasBuildJson(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineering: Record<string, ModuleEngineeringState>,
  buildTitle: string = 'Atlas Custom Loadout'
): string {
  const payload: ExportedShipBuild = {
    version: '1.0',
    generator: 'Atlas Shipbuilder',
    timestamp: new Date().toISOString(),
    shipId: ship.id,
    shipName: ship.name,
    buildTitle,
    loadout,
    engineering,
  };
  return JSON.stringify(payload, null, 2);
}

export function exportAtlasShortcode(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineering: Record<string, ModuleEngineeringState>
): string {
  const raw = JSON.stringify({
    s: ship.id,
    l: loadout,
    e: engineering,
  });
  // Base64 encoding safe for URLs
  if (typeof btoa !== 'undefined') {
    return btoa(encodeURIComponent(raw));
  }
  return Buffer.from(raw).toString('base64');
}

export function importAtlasShortcode(shortcode: string): {
  shipId: string;
  loadout: ShipLoadoutState;
  engineering: Record<string, ModuleEngineeringState>;
} | null {
  try {
    let decoded = '';
    if (typeof atob !== 'undefined') {
      decoded = decodeURIComponent(atob(shortcode.trim()));
    } else {
      decoded = Buffer.from(shortcode.trim(), 'base64').toString('utf-8');
    }
    const data = JSON.parse(decoded);
    if (!data.s || !data.l) return null;
    return {
      shipId: data.s,
      loadout: data.l,
      engineering: data.e || {},
    };
  } catch (err) {
    console.error('Failed to parse Atlas shortcode:', err);
    return null;
  }
}

// ============================================================================
// CORIOLIS JSON IMPORT & EXPORT
// ============================================================================

export function exportCoriolisJson(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineering: Record<string, ModuleEngineeringState>,
  buildTitle: string = 'Atlas Export'
): string {
  const coriolisObj: CoriolisBuildFormat = {
    schemaVersion: 4,
    name: buildTitle,
    ship: ship.id,
    components: {
      standard: {
        bulkheads: {
          class: ship.coreInternals.bulkheads,
          rating: 'I',
          blueprint: engineering['core-bulkheads']?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[engineering['core-bulkheads'].blueprintId]?.name || 'Heavy Duty Armour',
                grade: engineering['core-bulkheads'].grade,
                percent: engineering['core-bulkheads'].percent / 100,
              }
            : undefined,
        },
        powerPlant: {
          class: ship.coreInternals.powerPlant,
          rating: 'A',
          blueprint: engineering['core-pp']?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[engineering['core-pp'].blueprintId]?.name || 'Overcharged',
                grade: engineering['core-pp'].grade,
                percent: engineering['core-pp'].percent / 100,
              }
            : undefined,
        },
        thrusters: {
          class: ship.coreInternals.thrusters,
          rating: 'A',
          blueprint: engineering['core-thrusters']?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[engineering['core-thrusters'].blueprintId]?.name || 'Dirty Drives',
                grade: engineering['core-thrusters'].grade,
                percent: engineering['core-thrusters'].percent / 100,
              }
            : undefined,
        },
        frameShiftDrive: {
          class: ship.coreInternals.frameShiftDrive,
          rating: 'A',
          blueprint: engineering['core-fsd']?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[engineering['core-fsd'].blueprintId]?.name || 'Increased Range',
                grade: engineering['core-fsd'].grade,
                percent: engineering['core-fsd'].percent / 100,
              }
            : undefined,
        },
        lifeSupport: {
          class: ship.coreInternals.lifeSupport,
          rating: 'D',
        },
        powerDistributor: {
          class: ship.coreInternals.powerDistributor,
          rating: 'A',
          blueprint: engineering['core-pd']?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[engineering['core-pd'].blueprintId]?.name || 'Charge Enhanced',
                grade: engineering['core-pd'].grade,
                percent: engineering['core-pd'].percent / 100,
              }
            : undefined,
        },
        sensors: {
          class: ship.coreInternals.sensors,
          rating: 'D',
        },
        fuelTank: {
          class: ship.coreInternals.fuelTank,
          rating: 'C',
        },
      },
      internal: ship.optionalSlots.map((size, idx) => {
        const item = loadout.optionalModules[idx];
        const eng = engineering[`optional-${idx}`];
        if (!item) return null;
        return {
          class: size,
          rating: 'A',
          blueprint: eng?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered',
                grade: eng.grade,
                percent: eng.percent / 100,
              }
            : undefined,
        };
      }),
      hardpoints: ship.hardpointSlots.map((hp, idx) => {
        const item = loadout.hardpointModules[idx];
        const eng = engineering[hp.id];
        if (!item) return null;
        return {
          class: hp.size,
          rating: 'C',
          blueprint: eng?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered',
                grade: eng.grade,
                percent: eng.percent / 100,
              }
            : undefined,
        };
      }),
      utility: ship.utilitySlots.map((ut, idx) => {
        const item = loadout.utilityModules[idx];
        const eng = engineering[ut.id];
        if (!item) return null;
        return {
          class: 0,
          rating: 'A',
          blueprint: eng?.blueprintId
            ? {
                name: ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered',
                grade: eng.grade,
                percent: eng.percent / 100,
              }
            : undefined,
        };
      }),
    },
  };

  return JSON.stringify(coriolisObj, null, 2);
}

export function importCoriolisJson(jsonStr: string): {
  ship: ShipChassis;
  loadout: ShipLoadoutState;
  engineering: Record<string, ModuleEngineeringState>;
} | null {
  try {
    const data: CoriolisBuildFormat = JSON.parse(jsonStr);
    const shipKey = (data.ship || '').toLowerCase().replace(/[\s_-]+/g, '');

    // Match ship in catalog
    const foundShip = SHIP_CHASSIS_CATALOG.find(
      (s) => s.id.toLowerCase().replace(/[\s_-]+/g, '') === shipKey || s.name.toLowerCase().replace(/[\s_-]+/g, '') === shipKey
    ) || SHIP_CHASSIS_MAP['anaconda'];

    const newLoadout: ShipLoadoutState = createStockLoadout(foundShip);
    const newEngineering: Record<string, ModuleEngineeringState> = {};

    if (data.components?.standard) {
      const std = data.components.standard;
      const coreMap: Record<string, string> = {
        bulkheads: 'core-bulkheads',
        powerPlant: 'core-pp',
        thrusters: 'core-thrusters',
        frameShiftDrive: 'core-fsd',
        powerDistributor: 'core-pd',
      };

      for (const [key, slotId] of Object.entries(coreMap)) {
        const comp = std[key];
        if (comp?.blueprint) {
          // Find matching blueprint ID
          const bpName = comp.blueprint.name.toLowerCase();
          const matchBp = Object.values(ENGINEERING_BLUEPRINTS).find(
            (b) => b.name.toLowerCase().includes(bpName) || bpName.includes(b.name.toLowerCase())
          );
          if (matchBp) {
            newEngineering[slotId] = {
              blueprintId: matchBp.id,
              grade: comp.blueprint.grade || 5,
              percent: Math.round((comp.blueprint.percent || 1.0) * 100),
              experimentalId: null,
            };
          }
        }
      }
    }

    // Optional internals
    if (data.components?.internal && Array.isArray(data.components.internal)) {
      data.components.internal.forEach((comp, idx) => {
        if (idx < foundShip.optionalSlots.length && comp) {
          const slotId = `optional-${idx}`;
          if (comp.blueprint) {
            const bpName = comp.blueprint.name.toLowerCase();
            const matchBp = Object.values(ENGINEERING_BLUEPRINTS).find((b) =>
              b.name.toLowerCase().includes(bpName)
            );
            if (matchBp) {
              newEngineering[slotId] = {
                blueprintId: matchBp.id,
                grade: comp.blueprint.grade || 5,
                percent: Math.round((comp.blueprint.percent || 1.0) * 100),
                experimentalId: null,
              };
            }
          }
        }
      });
    }

    return {
      ship: foundShip,
      loadout: newLoadout,
      engineering: newEngineering,
    };
  } catch (err) {
    console.error('Failed to parse Coriolis JSON:', err);
    return null;
  }
}

// ============================================================================
// EDSY SLEF IMPORT & EXPORT
// ============================================================================

export function exportEdsySlefJson(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineering: Record<string, ModuleEngineeringState>,
  buildTitle: string = 'Atlas Loadout'
): string {
  const modules: SlefSlotEntry[] = [];

  // Core slots
  const coreSlotNames = [
    { key: 'bulkheads', slot: 'Armor', id: 'core-bulkheads' },
    { key: 'powerPlant', slot: 'PowerPlant', id: 'core-pp' },
    { key: 'thrusters', slot: 'MainEngines', id: 'core-thrusters' },
    { key: 'frameShiftDrive', slot: 'FrameShiftDrive', id: 'core-fsd' },
    { key: 'lifeSupport', slot: 'LifeSupport', id: 'core-ls' },
    { key: 'powerDistributor', slot: 'PowerDistributor', id: 'core-pd' },
    { key: 'sensors', slot: 'Radar', id: 'core-sensors' },
    { key: 'fuelTank', slot: 'FuelTank', id: 'core-fuel' },
  ];

  for (const c of coreSlotNames) {
    const eng = engineering[c.id];
    modules.push({
      slot: c.slot,
      item: (loadout.coreModules as any)[c.key] || 'Standard',
      engineer: eng?.blueprintId
        ? {
            blueprint: ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name,
            level: eng.grade,
            quality: +(eng.percent / 100).toFixed(2),
            experimental: eng.experimentalId ? EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name : undefined,
          }
        : undefined,
    });
  }

  // Optional slots
  ship.optionalSlots.forEach((_, idx) => {
    const slotId = `optional-${idx}`;
    const installed = loadout.optionalModules[idx];
    const eng = engineering[slotId];
    if (installed) {
      modules.push({
        slot: `Slot${idx < 9 ? '0' : ''}${idx + 1}_Size${ship.optionalSlots[idx]}`,
        item: installed,
        engineer: eng?.blueprintId
          ? {
              blueprint: ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name,
              level: eng.grade,
              quality: +(eng.percent / 100).toFixed(2),
              experimental: eng.experimentalId ? EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name : undefined,
            }
          : undefined,
      });
    }
  });

  const slef: SlefBuildFormat = {
    header: {
      software: 'Atlas Shipbuilder',
      version: '1.0',
    },
    build: {
      ship: ship.id,
      name: buildTitle,
      modules,
    },
  };

  return JSON.stringify(slef, null, 2);
}

export function importEdsySlefJson(jsonStr: string): {
  ship: ShipChassis;
  loadout: ShipLoadoutState;
  engineering: Record<string, ModuleEngineeringState>;
} | null {
  try {
    const data: SlefBuildFormat = JSON.parse(jsonStr);
    const shipName = (data.build?.ship || '').toLowerCase().replace(/[\s_-]+/g, '');
    const foundShip = SHIP_CHASSIS_CATALOG.find(
      (s) => s.id.toLowerCase().replace(/[\s_-]+/g, '') === shipName || s.name.toLowerCase().replace(/[\s_-]+/g, '') === shipName
    ) || SHIP_CHASSIS_MAP['anaconda'];

    const newLoadout = createStockLoadout(foundShip);
    const newEngineering: Record<string, ModuleEngineeringState> = {};

    if (data.build?.modules && Array.isArray(data.build.modules)) {
      for (const m of data.build.modules) {
        if (!m.engineer?.blueprint) continue;
        const bpName = m.engineer.blueprint.toLowerCase();
        const matchBp = Object.values(ENGINEERING_BLUEPRINTS).find((b) =>
          b.name.toLowerCase().includes(bpName)
        );
        if (!matchBp) continue;

        let targetSlotId: string | null = null;
        if (m.slot.includes('MainEngines')) targetSlotId = 'core-thrusters';
        else if (m.slot.includes('FrameShiftDrive')) targetSlotId = 'core-fsd';
        else if (m.slot.includes('PowerPlant')) targetSlotId = 'core-pp';
        else if (m.slot.includes('PowerDistributor')) targetSlotId = 'core-pd';
        else if (m.slot.includes('Armor')) targetSlotId = 'core-bulkheads';

        if (targetSlotId) {
          newEngineering[targetSlotId] = {
            blueprintId: matchBp.id,
            grade: m.engineer.level || 5,
            percent: Math.round((m.engineer.quality || 1.0) * 100),
            experimentalId: null,
          };
        }
      }
    }

    return {
      ship: foundShip,
      loadout: newLoadout,
      engineering: newEngineering,
    };
  } catch (err) {
    console.error('Failed to parse EDSY SLEF JSON:', err);
    return null;
  }
}
