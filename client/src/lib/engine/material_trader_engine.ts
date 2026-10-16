// Location: atlas/client/src/lib/engine/material_trader_engine.ts
// Material Traders Triangulator & Intra-Category Exchange Calculator (Stage 13.1)
// Handles:
// 1. Raw Materials (Geological), Encoded Materials (Data), and Manufactured Materials (Industrial).
// 2. Nearest Trader calculation from reference system with landing pad size and arrival distance filters.
// 3. Trade conversion rules:
//    - Intra-category trade ratio:
//      - Same category, same sub-category: 3:1 ratio per grade step difference
//        * Trading up 1 grade: 6 lower-grade items for 1 higher-grade item (Frontier rules: G1->G2 is 6:1, G2->G3 is 6:1, etc. Intra-category cross-column: 6:1 penalty factor)
//        * Trading down: 1 higher-grade item yields 3 lower-grade items per grade step.
//      - Cross-column / Cross-subcategory within same category: 6x cost multiplier.
// 4. Surplus & deficit calculation against player inventory and engineering recipes.

export type TraderType = 'Raw' | 'Encoded' | 'Manufactured';
export type LandingPadSize = 'M' | 'L';

export interface MaterialTraderStation {
  id: string;
  stationName: string;
  systemName: string;
  systemCoords: { x: number; y: number; z: number };
  traderType: TraderType;
  economy: string;
  landingPad: LandingPadSize;
  stationType: string;
  distanceLs: number;
  controllingFaction?: string;
  allegiance?: 'Federation' | 'Empire' | 'Alliance' | 'Independent';
  distanceLy?: number; // relative to query system
}

export interface MaterialNode {
  name: string;
  category: TraderType;
  subCategory: string; // e.g. "Chemicals", "Emission Data", "Raw Elements 1"
  grade: number; // 1 to 5
}

// Canonical categorization of Horizons materials by category and sub-category
export const MATERIAL_TAXONOMY: MaterialNode[] = [
  // ================= RAW MATERIALS (Geological) =================
  // Sub-category: Category 1
  { name: 'Carbon', category: 'Raw', subCategory: 'Chemical Elements', grade: 1 },
  { name: 'Vanadium', category: 'Raw', subCategory: 'Chemical Elements', grade: 2 },
  { name: 'Niobium', category: 'Raw', subCategory: 'Chemical Elements', grade: 3 },
  { name: 'Yttrium', category: 'Raw', subCategory: 'Chemical Elements', grade: 4 },

  // Sub-category: Category 2
  { name: 'Phosphorus', category: 'Raw', subCategory: 'Thermodynamic Elements', grade: 1 },
  { name: 'Chromium', category: 'Raw', subCategory: 'Thermodynamic Elements', grade: 2 },
  { name: 'Molybdenum', category: 'Raw', subCategory: 'Thermodynamic Elements', grade: 3 },
  { name: 'Antimony', category: 'Raw', subCategory: 'Thermodynamic Elements', grade: 4 },

  // Sub-category: Category 3
  { name: 'Sulphur', category: 'Raw', subCategory: 'Conductive Elements', grade: 1 },
  { name: 'Manganese', category: 'Raw', subCategory: 'Conductive Elements', grade: 2 },
  { name: 'Cadmium', category: 'Raw', subCategory: 'Conductive Elements', grade: 3 },
  { name: 'Ruthenium', category: 'Raw', subCategory: 'Conductive Elements', grade: 4 },

  // Sub-category: Category 4
  { name: 'Iron', category: 'Raw', subCategory: 'Structural Elements', grade: 1 },
  { name: 'Zinc', category: 'Raw', subCategory: 'Structural Elements', grade: 2 },
  { name: 'Tin', category: 'Raw', subCategory: 'Structural Elements', grade: 3 },
  { name: 'Selenium', category: 'Raw', subCategory: 'Structural Elements', grade: 4 },

  // Sub-category: Category 5
  { name: 'Nickel', category: 'Raw', subCategory: 'Magnetic Elements', grade: 1 },
  { name: 'Germanium', category: 'Raw', subCategory: 'Magnetic Elements', grade: 2 },
  { name: 'Tungsten', category: 'Raw', subCategory: 'Magnetic Elements', grade: 3 },
  { name: 'Tellurium', category: 'Raw', subCategory: 'Magnetic Elements', grade: 4 },

  // Sub-category: Category 6
  { name: 'Rhenium', category: 'Raw', subCategory: 'Refractory Elements', grade: 1 },
  { name: 'Arsenic', category: 'Raw', subCategory: 'Refractory Elements', grade: 2 },
  { name: 'Mercury', category: 'Raw', subCategory: 'Refractory Elements', grade: 3 },
  { name: 'Polonium', category: 'Raw', subCategory: 'Refractory Elements', grade: 4 },

  // Sub-category: Category 7
  { name: 'Lead', category: 'Raw', subCategory: 'Radionuclide Elements', grade: 1 },
  { name: 'Zirconium', category: 'Raw', subCategory: 'Radionuclide Elements', grade: 2 },
  { name: 'Boron', category: 'Raw', subCategory: 'Radionuclide Elements', grade: 3 },
  { name: 'Technetium', category: 'Raw', subCategory: 'Radionuclide Elements', grade: 4 },

  // ================= ENCODED MATERIALS (Data) =================
  // Emission Data
  { name: 'Scrambled Emission Data', category: 'Encoded', subCategory: 'Emission Data', grade: 1 },
  { name: 'Anomalous Emission Data', category: 'Encoded', subCategory: 'Emission Data', grade: 2 },
  { name: 'Unexpected Emission Data', category: 'Encoded', subCategory: 'Emission Data', grade: 3 },
  { name: 'Exceptional Scrambled Emission Data', category: 'Encoded', subCategory: 'Emission Data', grade: 4 },
  { name: 'Abnormal Compact Emission Data', category: 'Encoded', subCategory: 'Emission Data', grade: 5 },

  // Wake Scans
  { name: 'Atypical Disrupted Wake Echoes', category: 'Encoded', subCategory: 'Wake Scans', grade: 1 },
  { name: 'Anomalous FSD Telemetry', category: 'Encoded', subCategory: 'Wake Scans', grade: 2 },
  { name: 'Strange Wake Solutions', category: 'Encoded', subCategory: 'Wake Scans', grade: 3 },
  { name: 'Eccentric Hyperspace Trajectories', category: 'Encoded', subCategory: 'Wake Scans', grade: 4 },
  { name: 'Datamined Wake Exceptions', category: 'Encoded', subCategory: 'Wake Scans', grade: 5 },

  // Shield Data
  { name: 'Distorted Shield Cycle Recordings', category: 'Encoded', subCategory: 'Shield Data', grade: 1 },
  { name: 'Inconsistent Shield Soak Analysis', category: 'Encoded', subCategory: 'Shield Data', grade: 2 },
  { name: 'Untypical Shield Scans', category: 'Encoded', subCategory: 'Shield Data', grade: 3 },
  { name: 'Aberrant Shield Pattern Analysis', category: 'Encoded', subCategory: 'Shield Data', grade: 4 },
  { name: 'Peculiar Shield Frequency Data', category: 'Encoded', subCategory: 'Shield Data', grade: 5 },

  // Encryption Files
  { name: 'Unusual Encrypted Files', category: 'Encoded', subCategory: 'Encryption Files', grade: 1 },
  { name: 'Tagged Encryption Codes', category: 'Encoded', subCategory: 'Encryption Files', grade: 2 },
  { name: 'Open Symmetric Keys', category: 'Encoded', subCategory: 'Encryption Files', grade: 3 },
  { name: 'Atypical Encryption Archives', category: 'Encoded', subCategory: 'Encryption Files', grade: 4 },
  { name: 'Adaptive Encryptors Capture', category: 'Encoded', subCategory: 'Encryption Files', grade: 5 },

  // Data Archives
  { name: 'Modified Consumer Firmware', category: 'Encoded', subCategory: 'Data Archives', grade: 1 },
  { name: 'Cracked Industrial Firmware', category: 'Encoded', subCategory: 'Data Archives', grade: 2 },
  { name: 'Security Firmware Patch', category: 'Encoded', subCategory: 'Data Archives', grade: 3 },
  { name: 'Specialised Legacy Firmware', category: 'Encoded', subCategory: 'Data Archives', grade: 4 },
  { name: 'Modified Embedded Firmware', category: 'Encoded', subCategory: 'Data Archives', grade: 5 },

  // Encoded Firmwares / Scans
  { name: 'Ascan', category: 'Encoded', subCategory: 'Scan Databanks', grade: 1 },
  { name: 'Anomalous Bulk Scan Data', category: 'Encoded', subCategory: 'Scan Databanks', grade: 2 },
  { name: 'Classified Scan Databanks', category: 'Encoded', subCategory: 'Scan Databanks', grade: 3 },
  { name: 'Divergent Scan Data', category: 'Encoded', subCategory: 'Scan Databanks', grade: 4 },
  { name: 'Classified Scan Fragment', category: 'Encoded', subCategory: 'Scan Databanks', grade: 5 },

  // ================= MANUFACTURED MATERIALS (Industrial) =================
  // Chemical
  { name: 'Chemical Storage Units', category: 'Manufactured', subCategory: 'Chemicals', grade: 1 },
  { name: 'Chemical Processors', category: 'Manufactured', subCategory: 'Chemicals', grade: 2 },
  { name: 'Chemical Distillery', category: 'Manufactured', subCategory: 'Chemicals', grade: 3 },
  { name: 'Chemical Manipulators', category: 'Manufactured', subCategory: 'Chemicals', grade: 4 },
  { name: 'Pharmaceutical Isolators', category: 'Manufactured', subCategory: 'Chemicals', grade: 5 },

  // Alloys
  { name: 'Compact Composites', category: 'Manufactured', subCategory: 'Composite Alloys', grade: 1 },
  { name: 'Filament Composites', category: 'Manufactured', subCategory: 'Composite Alloys', grade: 2 },
  { name: 'High Density Composites', category: 'Manufactured', subCategory: 'Composite Alloys', grade: 3 },
  { name: 'Proprietary Composites', category: 'Manufactured', subCategory: 'Composite Alloys', grade: 4 },
  { name: 'Core Dynamics Composites', category: 'Manufactured', subCategory: 'Composite Alloys', grade: 5 },

  // Heat Materials
  { name: 'Heat Conduction Wiring', category: 'Manufactured', subCategory: 'Thermic & Heat', grade: 1 },
  { name: 'Heat Dispersion Plate', category: 'Manufactured', subCategory: 'Thermic & Heat', grade: 2 },
  { name: 'Heat Exchangers', category: 'Manufactured', subCategory: 'Thermic & Heat', grade: 3 },
  { name: 'Heat Vanes', category: 'Manufactured', subCategory: 'Thermic & Heat', grade: 4 },
  { name: 'Proto Heat Radiators', category: 'Manufactured', subCategory: 'Thermic & Heat', grade: 5 },

  // Conductive
  { name: 'Basic Conductors', category: 'Manufactured', subCategory: 'Conductive', grade: 1 },
  { name: 'Conductive Components', category: 'Manufactured', subCategory: 'Conductive', grade: 2 },
  { name: 'Conductive Ceramics', category: 'Manufactured', subCategory: 'Conductive', grade: 3 },
  { name: 'Conductive Polymers', category: 'Manufactured', subCategory: 'Conductive', grade: 4 },
  { name: 'Biotech Conductors', category: 'Manufactured', subCategory: 'Conductive', grade: 5 },

  // Mechanical Components
  { name: 'Mechanical Scrap', category: 'Manufactured', subCategory: 'Mechanical', grade: 1 },
  { name: 'Mechanical Equipment', category: 'Manufactured', subCategory: 'Mechanical', grade: 2 },
  { name: 'Mechanical Components', category: 'Manufactured', subCategory: 'Mechanical', grade: 3 },
  { name: 'Configurable Components', category: 'Manufactured', subCategory: 'Mechanical', grade: 4 },
  { name: 'Improvised Components', category: 'Manufactured', subCategory: 'Mechanical', grade: 5 },

  // Shield Materials
  { name: 'Shield Emitters', category: 'Manufactured', subCategory: 'Shielding', grade: 1 },
  { name: 'Shielding Sensors', category: 'Manufactured', subCategory: 'Shielding', grade: 2 },
  { name: 'Compound Shielding', category: 'Manufactured', subCategory: 'Shielding', grade: 3 },
  { name: 'Imperial Shields', category: 'Manufactured', subCategory: 'Shielding', grade: 4 },
  { name: 'Military Supercapacitors', category: 'Manufactured', subCategory: 'Shielding', grade: 5 },

  // Crystals
  { name: 'Crystal Shards', category: 'Manufactured', subCategory: 'Crystals', grade: 1 },
  { name: 'Flawed Focus Crystals', category: 'Manufactured', subCategory: 'Crystals', grade: 2 },
  { name: 'Focus Crystals', category: 'Manufactured', subCategory: 'Crystals', grade: 3 },
  { name: 'Refined Focus Crystals', category: 'Manufactured', subCategory: 'Crystals', grade: 4 },
  { name: 'Exquisite Focus Crystals', category: 'Manufactured', subCategory: 'Crystals', grade: 5 },

  // Sensors & Circuits
  { name: 'Grid Resistors', category: 'Manufactured', subCategory: 'Circuits', grade: 1 },
  { name: 'Hybrid Capacitors', category: 'Manufactured', subCategory: 'Circuits', grade: 2 },
  { name: 'Electrochemical Arrays', category: 'Manufactured', subCategory: 'Circuits', grade: 3 },
  { name: 'Polymer Capacitors', category: 'Manufactured', subCategory: 'Circuits', grade: 4 },
  { name: 'Military Grade Alloys', category: 'Manufactured', subCategory: 'Circuits', grade: 5 },
];

export const CANONICAL_MATERIAL_TRADERS: MaterialTraderStation[] = [
  // Raw Traders
  {
    id: 'raw-deciat-garay',
    stationName: 'Garay Terminal',
    systemName: 'Deciat',
    systemCoords: { x: 122.625, y: -0.3125, z: -47.28125 },
    traderType: 'Raw',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 395,
    controllingFaction: 'Deciat Green Party',
    allegiance: 'Independent',
  },
  {
    id: 'raw-sol-li-qing',
    stationName: 'Li Qing Jao',
    systemName: 'Sol',
    systemCoords: { x: 0, y: 0, z: 0 },
    traderType: 'Raw',
    economy: 'Extraction',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 520,
    controllingFaction: 'Mother Gaia',
    allegiance: 'Federation',
  },
  {
    id: 'raw-lhs20-olin',
    stationName: 'Olin City',
    systemName: 'LHS 20',
    systemCoords: { x: -7.53125, y: -47.96875, z: -8.84375 },
    traderType: 'Raw',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 124,
    controllingFaction: 'LHS 20 Gold Universal Group',
    allegiance: 'Federation',
  },
  {
    id: 'raw-wolf397-trog',
    stationName: 'Trögel Orbital',
    systemName: 'Wolf 397',
    systemCoords: { x: 40.0625, y: 69.4375, z: -43.1875 },
    traderType: 'Raw',
    economy: 'Extraction',
    landingPad: 'M',
    stationType: 'Outpost',
    distanceLs: 48,
    controllingFaction: 'Wolf 397 Jet Dynamic Corp',
    allegiance: 'Alliance',
  },
  {
    id: 'raw-shinrarta-green',
    stationName: 'Green Enterprise',
    systemName: 'LHS 317',
    systemCoords: { x: 48.71875, y: -18.25, z: 27.53125 },
    traderType: 'Raw',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 630,
    controllingFaction: 'LHS 317 Silver Boys',
    allegiance: 'Independent',
  },

  // Encoded Traders
  {
    id: 'encoded-kui-guthrie',
    stationName: 'Guthrie Terminal',
    systemName: 'Kui Hsien',
    systemCoords: { x: 104.9375, y: -52.0625, z: -27.8125 },
    traderType: 'Encoded',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Ocellus Starport',
    distanceLs: 275,
    controllingFaction: 'Kui Hsien League',
    allegiance: 'Empire',
  },
  {
    id: 'encoded-sol-daedalus',
    stationName: 'Daedalus',
    systemName: 'Sol',
    systemCoords: { x: 0, y: 0, z: 0 },
    traderType: 'Encoded',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 44,
    controllingFaction: 'Federal Congress',
    allegiance: 'Federation',
  },
  {
    id: 'encoded-inara-cleve',
    stationName: 'Cleve Hub',
    systemName: 'Eravate',
    systemCoords: { x: -12.15625, y: -30.0625, z: -20.6875 },
    traderType: 'Encoded',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 31,
    controllingFaction: 'Eravate Free',
    allegiance: 'Independent',
  },
  {
    id: 'encoded-diaguandri-ray',
    stationName: 'Ray Gateway',
    systemName: 'Diaguandri',
    systemCoords: { x: -44.0625, y: -150.375, z: -23.4375 },
    traderType: 'Encoded',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 538,
    controllingFaction: 'Diaguandri Electronics',
    allegiance: 'Independent',
  },

  // Manufactured Traders
  {
    id: 'manu-ghang-mathews',
    stationName: 'Mathews Hub',
    systemName: 'Ghangir',
    systemCoords: { x: 135.03125, y: 15.6875, z: -35.125 },
    traderType: 'Manufactured',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 182,
    controllingFaction: 'Ghangir Commodities',
    allegiance: 'Independent',
  },
  {
    id: 'manu-leesti-george',
    stationName: 'George Lucas',
    systemName: 'Leesti',
    systemCoords: { x: 74.03125, y: 39.5, z: 66.84375 },
    traderType: 'Manufactured',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 290,
    controllingFaction: 'Alliance of Leesti',
    allegiance: 'Alliance',
  },
  {
    id: 'manu-sol-galle',
    stationName: 'Galle Orbital',
    systemName: 'Alpha Centauri',
    systemCoords: { x: 3.03125, y: -0.0625, z: 2.875 },
    traderType: 'Manufactured',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Ocellus Starport',
    distanceLs: 420,
    controllingFaction: 'Alpha Centauri Partners',
    allegiance: 'Federation',
  },
  {
    id: 'manu-jita-harrison',
    stationName: 'Harrison Port',
    systemName: 'HR 1257',
    systemCoords: { x: 110.125, y: -10.25, z: -55.875 },
    traderType: 'Manufactured',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 88,
    controllingFaction: 'HR 1257 Dynamic Mining',
    allegiance: 'Independent',
  },
  {
    id: 'manu-outpost-charn',
    stationName: 'Charnley Installation',
    systemName: 'LHS 1101',
    systemCoords: { x: -2.3125, y: -15.125, z: -3.5 },
    traderType: 'Manufactured',
    economy: 'Industrial',
    landingPad: 'M',
    stationType: 'Outpost',
    distanceLs: 16,
    controllingFaction: 'LHS 1101 Silver Corp',
    allegiance: 'Federation',
  },
];

/**
 * Calculates Euclidean 3D spatial distance in Light Years
 */
export function calculateEuclideanDistanceLy(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2));
}

/**
 * Calculates exact trade conversion cost according to Frontier Material Trader rules.
 * 
 * Rules:
 * - Trade is ONLY allowed within the same primary category (Raw <-> Raw, Encoded <-> Encoded, Manufactured <-> Manufactured).
 * - Same sub-category (same column):
 *   - Trading down (Higher Grade -> Lower Grade):
 *     1 G(N) gives 3^step G(N - step).
 *     e.g., G5 -> G4 gives 3, G5 -> G3 gives 9, G5 -> G2 gives 27, G5 -> G1 gives 81.
 *   - Trading up (Lower Grade -> Higher Grade):
 *     Step cost factor is 6 per grade.
 *     e.g., G4 -> G5 costs 6 G4, G3 -> G5 costs 36 G3.
 * - Cross sub-category (different column, same main category):
 *   - Frontier applies an additional 6:1 penalty factor across columns.
 *   - Trading cross-column at same grade: 6 from source = 1 to target.
 *   - Trading down cross-column:
 *     Base receive is divided by 6. If source grade > target grade, base yield 3^step / 6.
 *     Or in terms of source items needed per 1 target:
 *     Cost in source items = ceil(6 / (3^step)).
 *     e.g. G5 to G4 cross: 6 / 3 = 2 G5 gives 1 G4 (or 1 G5 gives 1.5 rounded according to integer trade blocks).
 *   - In official trade matrix:
 *     Sub-category match: factor = 1.
 *     Cross-category match: factor = 6.
 */
export interface TradeConversionResult {
  valid: boolean;
  reason?: string;
  sourceMaterial: MaterialNode;
  targetMaterial: MaterialNode;
  ratioDescription: string;
  sourceAmountRequired: number;
  targetAmountReceived: number;
  exchangeRate: number; // target per source item
}

export function calculateMaterialTrade(
  sourceName: string,
  targetName: string,
  targetDesiredCount: number = 1
): TradeConversionResult {
  const source = MATERIAL_TAXONOMY.find((m) => m.name.toLowerCase() === sourceName.toLowerCase());
  const target = MATERIAL_TAXONOMY.find((m) => m.name.toLowerCase() === targetName.toLowerCase());

  if (!source || !target) {
    return {
      valid: false,
      reason: 'Material not recognized in taxonomy',
      sourceMaterial: source || { name: sourceName, category: 'Raw', subCategory: 'Unknown', grade: 1 },
      targetMaterial: target || { name: targetName, category: 'Raw', subCategory: 'Unknown', grade: 1 },
      ratioDescription: 'Invalid',
      sourceAmountRequired: 0,
      targetAmountReceived: 0,
      exchangeRate: 0,
    };
  }

  if (source.category !== target.category) {
    return {
      valid: false,
      reason: `Cross-category trade not permitted (${source.category} cannot be traded for ${target.category})`,
      sourceMaterial: source,
      targetMaterial: target,
      ratioDescription: 'Prohibited',
      sourceAmountRequired: 0,
      targetAmountReceived: 0,
      exchangeRate: 0,
    };
  }

  if (source.name === target.name) {
    return {
      valid: true,
      sourceMaterial: source,
      targetMaterial: target,
      ratioDescription: '1 : 1 (Identical material)',
      sourceAmountRequired: targetDesiredCount,
      targetAmountReceived: targetDesiredCount,
      exchangeRate: 1,
    };
  }

  const isSameSubCategory = source.subCategory === target.subCategory;
  const gradeDiff = target.grade - source.grade; // >0 means trading up, <0 means trading down

  let sourcePerTarget: number;
  let targetPerSource: number;

  if (gradeDiff === 0) {
    // Same grade, different sub-category
    // 6 source -> 1 target
    sourcePerTarget = 6;
    targetPerSource = 1 / 6;
  } else if (gradeDiff > 0) {
    // Trading UP: costs 6x per grade level.
    // If cross subcategory, multiply by an additional 6.
    const crossFactor = isSameSubCategory ? 1 : 6;
    sourcePerTarget = Math.pow(6, gradeDiff) * crossFactor;
    targetPerSource = 1 / sourcePerTarget;
  } else {
    // Trading DOWN: 1 source gives 3^(|gradeDiff|) target.
    // If cross subcategory, divide target by 6 (or cost 6 / 3^(|gradeDiff|)).
    const stepsDown = Math.abs(gradeDiff);
    const intraYield = Math.pow(3, stepsDown);
    if (isSameSubCategory) {
      targetPerSource = intraYield;
      sourcePerTarget = 1 / intraYield;
    } else {
      // Cross-column penalty is 1/6 yield
      targetPerSource = intraYield / 6;
      sourcePerTarget = 6 / intraYield;
    }
  }

  let sourceRequired: number;
  let targetReceived: number;

  if (sourcePerTarget >= 1) {
    // Standard N source for 1 target
    const unitSource = Math.round(sourcePerTarget);
    sourceRequired = unitSource * targetDesiredCount;
    targetReceived = targetDesiredCount;
  } else {
    // 1 source gives multiple target
    const unitTarget = Math.round(targetPerSource);
    sourceRequired = Math.ceil(targetDesiredCount / unitTarget);
    targetReceived = sourceRequired * unitTarget;
  }

  const ratioDescription =
    sourcePerTarget >= 1
      ? `${Math.round(sourcePerTarget)} : 1 (${source.name} ➔ ${target.name})`
      : `1 : ${Math.round(targetPerSource)} (${source.name} ➔ ${target.name})`;

  return {
    valid: true,
    sourceMaterial: source,
    targetMaterial: target,
    ratioDescription,
    sourceAmountRequired: sourceRequired,
    targetAmountReceived: targetReceived,
    exchangeRate: targetPerSource,
  };
}

/**
 * Triangulates nearest material traders based on user filters.
 */
export interface NearestTraderFilter {
  referenceCoords: { x: number; y: number; z: number };
  traderType?: 'ALL' | TraderType;
  minLandingPad?: 'ANY' | LandingPadSize;
  maxArrivalLs?: number;
  limit?: number;
}

export function findNearestTraders(
  traders: MaterialTraderStation[],
  filter: NearestTraderFilter
): MaterialTraderStation[] {
  let list = traders.map((t) => ({
    ...t,
    distanceLy: calculateEuclideanDistanceLy(filter.referenceCoords, t.systemCoords),
  }));

  if (filter.traderType && filter.traderType !== 'ALL') {
    list = list.filter((t) => t.traderType === filter.traderType);
  }

  if (filter.minLandingPad && filter.minLandingPad === 'L') {
    list = list.filter((t) => t.landingPad === 'L');
  }

  if (filter.maxArrivalLs && filter.maxArrivalLs > 0) {
    list = list.filter((t) => t.distanceLs <= filter.maxArrivalLs!);
  }

  list.sort((a, b) => (a.distanceLy ?? 0) - (b.distanceLy ?? 0));

  if (filter.limit && filter.limit > 0) {
    return list.slice(0, filter.limit);
  }

  return list;
}
