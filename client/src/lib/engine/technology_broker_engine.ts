// Location: atlas/client/src/lib/engine/technology_broker_engine.ts
// Technology Brokers Catalog & Unlock Wishlist Engine (Stage 13.2)
// Handles:
// 1. Human Tech Brokers vs Guardian Tech Brokers stations catalog and nearest broker triangulation.
// 2. Comprehensive unlockable items catalog: Guardian FSD Boosters, Shield Boosters, Gauss Cannons,
//    Plasma Chargers, Shard Cannons, Hull Reinforcements, Module Reinforcements, Hybrid SLFs,
//    Corrosion Resistant Cargo Racks, Enzyme Missile Racks, Shock Cannons, Meta-Alloy Hull Reinforcements, Flechette Launchers.
// 3. Technology Unlock Wishlist with persistent local storage, inventory comparison, and deficit calculation.
// 4. Guardian Ruins & Structure Site coordinates with blueprint fragment types and obelisk guidelines.

export type BrokerType = 'Human' | 'Guardian';
export type TechCategory = 'Guardian Module' | 'Guardian Weapon' | 'Guardian Vessel' | 'Human Module' | 'Human Weapon';
export type LandingPadSize = 'M' | 'L';

export interface TechBrokerStation {
  id: string;
  stationName: string;
  systemName: string;
  systemCoords: { x: number; y: number; z: number };
  brokerType: BrokerType;
  economy: string;
  landingPad: LandingPadSize;
  stationType: string;
  distanceLs: number;
  controllingFaction?: string;
  allegiance?: 'Federation' | 'Empire' | 'Alliance' | 'Independent';
  distanceLy?: number; // Calculated dynamically relative to reference system
}

export interface TechIngredient {
  name: string;
  category: 'Guardian Material' | 'Guardian Data' | 'Guardian Commodity' | 'Human Material' | 'Human Commodity';
  quantity: number;
  isCommodity?: boolean;
  sourceTip?: string;
}

export interface TechUnlockItem {
  id: string;
  name: string;
  shortName: string;
  category: TechCategory;
  brokerType: BrokerType;
  description: string;
  sizeRatings: string[];
  blueprintTypeRequired?: 'Guardian Module Blueprint Fragment' | 'Guardian Weapon Blueprint Fragment' | 'Guardian Vessel Blueprint Fragment';
  ingredients: TechIngredient[];
  recommendedSite?: {
    systemName: string;
    bodyName: string;
    coords: { x: number; y: number; z: number };
    siteType: 'Structure' | 'Ruins';
    distanceLyFromSol: number;
  };
}

export interface GuardianSiteRoute {
  id: string;
  siteName: string;
  systemName: string;
  body: string;
  planetaryCoords: { lat: number; lon: number };
  systemCoords: { x: number; y: number; z: number };
  blueprintType: 'Guardian Module Blueprint Fragment' | 'Guardian Weapon Blueprint Fragment' | 'Guardian Vessel Blueprint Fragment';
  activeTerminal: string;
  relicRequired: string;
  distanceLyFromSol: number;
  notes: string;
}

// Canonical Technology Broker locations across the core bubble & Colonia
export const CANONICAL_TECH_BROKERS: TechBrokerStation[] = [
  // Guardian Tech Brokers
  {
    id: 'tb-jameson-memorial',
    stationName: 'Jameson Memorial',
    systemName: 'Shinrarta Dezhra',
    systemCoords: { x: 55.71875, y: 17.59375, z: 27.15625 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 341,
    controllingFaction: 'The Pilots Federation',
    allegiance: 'Independent',
  },
  {
    id: 'tb-deciat-garay',
    stationName: 'Garay Terminal',
    systemName: 'Deciat',
    systemCoords: { x: 122.625, y: -0.3125, z: -47.28125 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 489,
    controllingFaction: 'Deciat Green Party',
    allegiance: 'Independent',
  },
  {
    id: 'tb-rhs-sol-li-wei',
    stationName: 'Li Wei Terminal',
    systemName: 'Sol',
    systemCoords: { x: 0, y: 0, z: 0 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Ocellus Starport',
    distanceLs: 890,
    controllingFaction: 'Mother Gaia',
    allegiance: 'Federation',
  },
  {
    id: 'tb-rhs-cubeo-chelomey',
    stationName: 'Chelomey Orbital',
    systemName: 'Cubeo',
    systemCoords: { x: 110.25, y: -188.5, z: 4.3125 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 512,
    controllingFaction: 'Prismatic Imperium',
    allegiance: 'Empire',
  },
  {
    id: 'tb-rhs-alioth-irvin',
    stationName: 'Irvin Holdings',
    systemName: 'Alioth',
    systemCoords: { x: -33.65625, y: 80.09375, z: -100.9375 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 275,
    controllingFaction: 'Alioth Independents',
    allegiance: 'Alliance',
  },
  {
    id: 'tb-rhs-wolf397-trog',
    stationName: 'Trøger Station',
    systemName: 'Wolf 397',
    systemCoords: { x: 40.09375, y: 78.4375, z: 12.1875 },
    brokerType: 'Guardian',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 310,
    controllingFaction: 'Wolf 397 Public Industry',
    allegiance: 'Alliance',
  },
  {
    id: 'tb-rhs-colonia-dover',
    stationName: "Dover's Rock",
    systemName: 'Eol Prou SS-T d3-714',
    systemCoords: { x: -9530.5, y: -910.2, z: 19808.1 },
    brokerType: 'Guardian',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Asteroid Base',
    distanceLs: 120,
    controllingFaction: 'Colonia Council',
    allegiance: 'Independent',
  },

  // Human Tech Brokers
  {
    id: 'tb-human-lhs3447-dalton',
    stationName: 'Dalton Gateway',
    systemName: 'LHS 3447',
    systemCoords: { x: -4.28125, y: 1.84375, z: -12.9375 },
    brokerType: 'Human',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 1820,
    controllingFaction: 'LHS 3447 Free',
    allegiance: 'Independent',
  },
  {
    id: 'tb-human-inara-stewart',
    stationName: 'Stewart Ring',
    systemName: 'Diaguandri',
    systemCoords: { x: -42.59375, y: -68.46875, z: -18.78125 },
    brokerType: 'Human',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 395,
    controllingFaction: 'Diaguandri Citizens',
    allegiance: 'Independent',
  },
  {
    id: 'tb-human-rhea-carter',
    stationName: 'Carter Port',
    systemName: 'Rhea',
    systemCoords: { x: 67.28125, y: -9.53125, z: -11.03125 },
    brokerType: 'Human',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 142,
    controllingFaction: 'Rhea Cartel',
    allegiance: 'Federation',
  },
  {
    id: 'tb-human-macher-lebedev',
    stationName: 'Lebedev Installation',
    systemName: 'Macher',
    systemCoords: { x: -12.125, y: -34.8125, z: -62.4375 },
    brokerType: 'Human',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 280,
    controllingFaction: 'Macher Corp',
    allegiance: 'Federation',
  },
  {
    id: 'tb-human-colonia-jaques',
    stationName: 'Jaques Station',
    systemName: 'Colonia',
    systemCoords: { x: -9530.53125, y: -910.28125, z: 19808.125 },
    brokerType: 'Human',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 685,
    controllingFaction: 'Jaques',
    allegiance: 'Independent',
  },
];

// Unlockable Technology Catalog
export const CANONICAL_TECH_UNLOCKS: TechUnlockItem[] = [
  // 1. Guardian FSD Booster (The cornerstone module)
  {
    id: 'guardian_fsd_booster',
    name: 'Guardian Frame Shift Drive Booster',
    shortName: 'Guardian FSD Booster',
    category: 'Guardian Module',
    brokerType: 'Guardian',
    description: 'Increases hyperspace jump range by up to +10.50 LY (Size 5H) flat boost without impacting mass calculations.',
    sizeRatings: ['Class 1H (+4.00 LY)', 'Class 2H (+6.00 LY)', 'Class 3H (+7.75 LY)', 'Class 4H (+9.25 LY)', 'Class 5H (+10.50 LY)'],
    blueprintTypeRequired: 'Guardian Module Blueprint Fragment',
    recommendedSite: {
      systemName: 'Synuefe NL-N c23-4',
      bodyName: 'Synuefe NL-N c23-4 B 3',
      coords: { x: 748.2, y: -198.4, z: -890.1 },
      siteType: 'Structure',
      distanceLyFromSol: 785,
    },
    ingredients: [
      { name: 'Guardian Module Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Data Core at Guardian Structure (Synuefe NL-N c23-4)' },
      { name: 'Guardian Power Cell', category: 'Guardian Material', quantity: 21, sourceTip: 'Destructible Panels at Guardian Structures' },
      { name: 'Guardian Technology Component', category: 'Guardian Material', quantity: 21, sourceTip: 'Destructible Panels at Guardian Structures' },
      { name: 'Focus Crystals', category: 'Human Material', quantity: 24, sourceTip: 'High Grade Emissions or Combat Salvage' },
      { name: 'HN Shock Mount', category: 'Human Commodity', quantity: 8, isCommodity: true, sourceTip: 'High Tech / Industrial markets' },
    ],
  },

  // 2. Guardian Shield Booster
  {
    id: 'guardian_shield_booster',
    name: 'Guardian Shield Reinforcement Package',
    shortName: 'Guardian Shield Booster',
    category: 'Guardian Module',
    brokerType: 'Guardian',
    description: 'Provides flat shield HP boost regardless of base shield generator multiplier, running on auxiliary power.',
    sizeRatings: ['Class 1D (+38 MJ)', 'Class 2D (+77 MJ)', 'Class 3D (+115 MJ)', 'Class 4D (+153 MJ)', 'Class 5D (+215 MJ)'],
    blueprintTypeRequired: 'Guardian Module Blueprint Fragment',
    recommendedSite: {
      systemName: 'Synuefe NL-N c23-4',
      bodyName: 'Synuefe NL-N c23-4 B 3',
      coords: { x: 748.2, y: -198.4, z: -890.1 },
      siteType: 'Structure',
      distanceLyFromSol: 785,
    },
    ingredients: [
      { name: 'Guardian Module Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Data Core at Guardian Structure' },
      { name: 'Guardian Power Conduit', category: 'Guardian Material', quantity: 17, sourceTip: 'Guardian Sentinels & Panels' },
      { name: 'Guardian Sentinel Weapon Parts', category: 'Guardian Material', quantity: 20, sourceTip: 'Guardian Sentinels' },
      { name: 'Sensor Fragment', category: 'Human Material', quantity: 24, sourceTip: 'Crashed Thargoid Scout/Sensor sites' },
      { name: 'Hardware Diagnostic Sensor', category: 'Human Commodity', quantity: 10, isCommodity: true, sourceTip: 'High Tech planetary starports' },
    ],
  },

  // 3. Guardian Gauss Cannon
  {
    id: 'guardian_gauss_cannon',
    name: 'Guardian Gauss Cannon',
    shortName: 'Guardian Gauss Cannon',
    category: 'Guardian Weapon',
    brokerType: 'Guardian',
    description: 'Premier Anti-Xeno weapon firing high-velocity micro-slugs that inflict devastating kinetic and thermal damage to Thargoid hearts.',
    sizeRatings: ['Small (Fixed)', 'Medium (Fixed)'],
    blueprintTypeRequired: 'Guardian Weapon Blueprint Fragment',
    recommendedSite: {
      systemName: 'Synuefe EU-U b45-4',
      bodyName: 'Synuefe EU-U b45-4 B 3',
      coords: { x: 802.1, y: -241.6, z: -940.3 },
      siteType: 'Structure',
      distanceLyFromSol: 820,
    },
    ingredients: [
      { name: 'Guardian Weapon Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Data Core at Guardian Weapon Structure' },
      { name: 'Guardian Power Cell', category: 'Guardian Material', quantity: 18, sourceTip: 'Destructible Panels at Guardian Sites' },
      { name: 'Guardian Technology Component', category: 'Guardian Material', quantity: 20, sourceTip: 'Destructible Panels at Guardian Sites' },
      { name: 'Manganese', category: 'Human Material', quantity: 15, sourceTip: 'Raw Geological formations' },
      { name: 'Magnetic Emitter Coil', category: 'Human Commodity', quantity: 6, isCommodity: true, sourceTip: 'Industrial Starports' },
    ],
  },

  // 4. Guardian Plasma Charger
  {
    id: 'guardian_plasma_charger',
    name: 'Guardian Plasma Charger',
    shortName: 'Guardian Plasma Charger',
    category: 'Guardian Weapon',
    brokerType: 'Guardian',
    description: 'Chargeable plasma accelerator launching high-density spheres of energetic plasma. Excellent against Thargoid hull and shields.',
    sizeRatings: ['Small (Fixed/Turret)', 'Medium (Fixed/Turret)', 'Large (Fixed/Turret)'],
    blueprintTypeRequired: 'Guardian Weapon Blueprint Fragment',
    ingredients: [
      { name: 'Guardian Weapon Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Guardian Weapon Structure' },
      { name: 'Guardian Power Conduit', category: 'Guardian Material', quantity: 19, sourceTip: 'Guardian Sentinels & Panels' },
      { name: 'Guardian Sentinel Weapon Parts', category: 'Guardian Material', quantity: 21, sourceTip: 'Guardian Sentinels' },
      { name: 'Chromium', category: 'Human Material', quantity: 16, sourceTip: 'Raw Geological formations' },
      { name: 'Micro-Weave Cooling Hoses', category: 'Human Commodity', quantity: 8, isCommodity: true, sourceTip: 'Industrial / Refinery starports' },
    ],
  },

  // 5. Guardian Shard Cannon
  {
    id: 'guardian_shard_cannon',
    name: 'Guardian Shard Cannon',
    shortName: 'Guardian Shard Cannon',
    category: 'Guardian Weapon',
    brokerType: 'Guardian',
    description: 'Hybrid fragment shotgun weapon spraying shards coated in Guardian anti-biological charge. Devastating at point-blank range.',
    sizeRatings: ['Small (Fixed/Turret)', 'Medium (Fixed/Turret)', 'Large (Fixed/Turret)'],
    blueprintTypeRequired: 'Guardian Weapon Blueprint Fragment',
    ingredients: [
      { name: 'Guardian Weapon Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Guardian Weapon Structure' },
      { name: 'Guardian Sentinel Weapon Parts', category: 'Guardian Material', quantity: 20, sourceTip: 'Guardian Sentinels' },
      { name: 'Guardian Technology Component', category: 'Guardian Material', quantity: 18, sourceTip: 'Guardian Panels' },
      { name: 'Carbon', category: 'Human Material', quantity: 22, sourceTip: 'Surface prospecting' },
      { name: 'Reinforced Mounting Plate', category: 'Human Commodity', quantity: 12, isCommodity: true, sourceTip: 'Industrial markets' },
    ],
  },

  // 6. Guardian Hybrid Ship-Launched Fighters (SLF: Trident / Javelin / Lance)
  {
    id: 'guardian_hybrid_fighters',
    name: 'Guardian Hybrid Fighters (Trident / Javelin / Lance)',
    shortName: 'Guardian Hybrid SLFs',
    category: 'Guardian Vessel',
    brokerType: 'Guardian',
    description: 'Human-Guardian hybrid light fighters equipped with modified Plasma Chargers, Shard Cannons, or Gauss Rail beams.',
    sizeRatings: ['XG7 Trident', 'XG8 Javelin', 'XG9 Lance'],
    blueprintTypeRequired: 'Guardian Vessel Blueprint Fragment',
    recommendedSite: {
      systemName: 'Traikeu VE-K c11-0',
      bodyName: 'Traikeu VE-K c11-0 B 2',
      coords: { x: -440.0, y: 120.0, z: -1400.0 },
      siteType: 'Structure',
      distanceLyFromSol: 1530,
    },
    ingredients: [
      { name: 'Guardian Vessel Blueprint Fragment', category: 'Guardian Data', quantity: 1, sourceTip: 'Beacon + Structure Data Core (Vessel Site)' },
      { name: 'Guardian Power Cell', category: 'Guardian Material', quantity: 25, sourceTip: 'Guardian Site Destructible Panels' },
      { name: 'Guardian Technology Component', category: 'Guardian Material', quantity: 25, sourceTip: 'Guardian Site Destructible Panels' },
      { name: 'Pattern Epsilon Obelisk Data', category: 'Guardian Data', quantity: 26, sourceTip: 'Active Guardian Ancient Obelisks' },
      { name: 'Reinforced Mounting Plate', category: 'Human Commodity', quantity: 25, isCommodity: true, sourceTip: 'Industrial markets' },
    ],
  },

  // 7. Human Corrosion Resistant Cargo Rack
  {
    id: 'corrosion_resistant_cargo_rack',
    name: 'Corrosion Resistant Cargo Rack',
    shortName: 'Corrosion Resistant Racks',
    category: 'Human Module',
    brokerType: 'Human',
    description: 'Alloy cargo bay coated with anti-caustic resin, allowing transport of Thargoid Probes, Sensors, and Hearts without internal ship damage.',
    sizeRatings: ['Class 1E (2T)', 'Class 2E (4T)', 'Class 3E (8T)', 'Class 4E (16T)'],
    ingredients: [
      { name: 'Chemical Manipulators', category: 'Human Material', quantity: 18, sourceTip: 'Combat Aftermath / Hauler Wrecks' },
      { name: 'Iron', category: 'Human Material', quantity: 26, sourceTip: 'Surface prospecting' },
      { name: 'Meta-Alloys', category: 'Human Commodity', quantity: 16, isCommodity: true, sourceTip: 'Darnielle\'s Progress (Maia) or Thargoid Barnacles' },
      { name: 'Neofabric Insulation', category: 'Human Commodity', quantity: 12, isCommodity: true, sourceTip: 'Mission reward / High Tech markets' },
    ],
  },

  // 8. Human Shock Cannon
  {
    id: 'human_shock_cannon',
    name: 'Shock Cannon',
    shortName: 'Shock Cannon',
    category: 'Human Weapon',
    brokerType: 'Human',
    description: 'Rapid-firing kinetic cannon that delivers punishing burst damage at the expense of rapid heat generation.',
    sizeRatings: ['Small (Fixed/Gimbal/Turret)', 'Medium (Fixed/Gimbal/Turret)', 'Large (Fixed/Gimbal/Turret)'],
    ingredients: [
      { name: 'Vanadium', category: 'Human Material', quantity: 22, sourceTip: 'Geological surface prospecting' },
      { name: 'Tungsten', category: 'Human Material', quantity: 18, sourceTip: 'Raw trader or geological volcanic sites' },
      { name: 'Power Converter', category: 'Human Commodity', quantity: 12, isCommodity: true, sourceTip: 'Industrial stations' },
      { name: 'Ion Distributor', category: 'Human Commodity', quantity: 10, isCommodity: true, sourceTip: 'High Tech stations' },
    ],
  },

  // 9. Human Enzyme Missile Rack
  {
    id: 'enzyme_missile_rack',
    name: 'Enzyme Missile Rack',
    shortName: 'Enzyme Missiles',
    category: 'Human Weapon',
    brokerType: 'Human',
    description: 'Dumbfire missile carrying synthetic caustic enzyme compound that eats away at enemy hulls over time.',
    sizeRatings: ['Medium (Fixed/Gimbal)'],
    ingredients: [
      { name: 'Conductive Ceramics', category: 'Human Material', quantity: 20, sourceTip: 'Signal Sources / Combat Salvage' },
      { name: 'Iron', category: 'Human Material', quantity: 25, sourceTip: 'Surface prospecting' },
      { name: 'Radiation Baffle', category: 'Human Commodity', quantity: 14, isCommodity: true, sourceTip: 'Industrial / Extraction stations' },
      { name: 'Thermic Alloys', category: 'Human Material', quantity: 16, sourceTip: 'Pirate ship salvage / Combat aftermath' },
    ],
  },

  // 10. Human Remote Release Flechette Launcher
  {
    id: 'remote_release_flechette',
    name: 'Remote Release Flechette Launcher',
    shortName: 'Flechette Launcher',
    category: 'Human Weapon',
    brokerType: 'Human',
    description: 'Launches shrapnel canister manually detonated in proximity to damage external hardpoints and canopy through shields.',
    sizeRatings: ['Medium (Fixed/Turret)'],
    ingredients: [
      { name: 'Molybdenum', category: 'Human Material', quantity: 18, sourceTip: 'Raw geological formations' },
      { name: 'Grid Resistors', category: 'Human Material', quantity: 20, sourceTip: 'Encoded emissions / Hauler debris' },
      { name: 'Articular Bus', category: 'Human Commodity', quantity: 12, isCommodity: true, sourceTip: 'High Tech starports' },
      { name: 'CMM Composite', category: 'Human Commodity', quantity: 10, isCommodity: true, sourceTip: 'Industrial markets' },
    ],
  },
];

// Guardian Ruins & Structure Site Guidance Registry
export const CANONICAL_GUARDIAN_SITES: GuardianSiteRoute[] = [
  {
    id: 'site-synuefe-module',
    siteName: 'Synuefe NL-N c23-4 (Module Blueprint Site)',
    systemName: 'Synuefe NL-N c23-4',
    body: 'B 3',
    planetaryCoords: { lat: 48.18, lon: -27.76 },
    systemCoords: { x: 748.2, y: -198.4, z: -890.1 },
    blueprintType: 'Guardian Module Blueprint Fragment',
    activeTerminal: 'Central Altar Core (Activate 6 Energy Pylons, deploy Ancient Relic into slot)',
    relicRequired: 'Ancient Relic (Extract from elevated spire towers using SRV Dual Repeater)',
    distanceLyFromSol: 785,
    notes: 'Best site for Guardian FSD Booster, Shield Booster, and Hull Reinforcement blueprints. High Sentinel presence.',
  },
  {
    id: 'site-synuefe-weapon',
    siteName: 'Synuefe EU-U b45-4 (Weapon Blueprint Site)',
    systemName: 'Synuefe EU-U b45-4',
    body: 'B 3',
    planetaryCoords: { lat: -31.73, lon: -128.92 },
    systemCoords: { x: 802.1, y: -241.6, z: -940.3 },
    blueprintType: 'Guardian Weapon Blueprint Fragment',
    activeTerminal: 'Weapon Pylon Nexus (Charge 6 energy pylons with energy weapons/SRV repeater)',
    relicRequired: 'Ancient Relic',
    distanceLyFromSol: 820,
    notes: 'Primary site for Guardian Gauss Cannon, Plasma Charger, and Shard Cannon unlocks.',
  },
  {
    id: 'site-traikeu-vessel',
    siteName: 'Traikeu VE-K c11-0 (Vessel Blueprint Site)',
    systemName: 'Traikeu VE-K c11-0',
    body: 'B 2',
    planetaryCoords: { lat: 12.35, lon: -44.18 },
    systemCoords: { x: -440.0, y: 120.0, z: -1400.0 },
    blueprintType: 'Guardian Vessel Blueprint Fragment',
    activeTerminal: 'Guardian Ancient Data Core with Ancient Key requirement',
    relicRequired: 'Ancient Key (Acquired from Guardian Beacon orbital space installation in nearby system)',
    distanceLyFromSol: 1530,
    notes: 'Required for Guardian SLFs: Trident, Javelin, and Lance. Requires Guardian Ancient Key from space beacon.',
  },
  {
    id: 'site-col173-module',
    siteName: 'Col 173 Sector QU-O d6-25 (Alternative Module Site)',
    systemName: 'Col 173 Sector QU-O d6-25',
    body: '5 B',
    planetaryCoords: { lat: 5.42, lon: 16.91 },
    systemCoords: { x: 531.0, y: -212.0, z: -710.0 },
    blueprintType: 'Guardian Module Blueprint Fragment',
    activeTerminal: 'Central Structure Altar',
    relicRequired: 'Ancient Relic',
    distanceLyFromSol: 615,
    notes: 'Closest active Guardian Module Structure to Sol/Deciat bubble boundary. Flat terrain for easy SRV driving.',
  },
];

// Helper: Calculate 3D Euclidean distance between coordinates
export function calculateEuclideanDistanceLy(
  origin: { x: number; y: number; z: number },
  dest: { x: number; y: number; z: number }
): number {
  const dx = origin.x - dest.x;
  const dy = origin.y - dest.y;
  const dz = origin.z - dest.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 10) / 10;
}

// Find nearest technology brokers given reference system coordinates
export function findNearestTechBrokers(
  originCoords: { x: number; y: number; z: number },
  typeFilter: 'ALL' | BrokerType = 'ALL',
  padFilter: 'ANY' | LandingPadSize = 'ANY',
  brokers: TechBrokerStation[] = CANONICAL_TECH_BROKERS
): TechBrokerStation[] {
  return brokers
    .filter((b) => (typeFilter === 'ALL' || b.brokerType === typeFilter))
    .filter((b) => (padFilter === 'ANY' || b.landingPad === 'L' || b.landingPad === padFilter))
    .map((b) => ({
      ...b,
      distanceLy: calculateEuclideanDistanceLy(originCoords, b.systemCoords),
    }))
    .sort((a, b) => (a.distanceLy ?? 0) - (b.distanceLy ?? 0));
}

// Wishlist Engine with Local Storage Persistence
const STORAGE_TECH_WISHLIST_KEY = 'atlas_tech_brokers_wishlist_v1';

export class TechnologyBrokerEngine {
  private wishlistIds: Set<string> = new Set(['guardian_fsd_booster']);

  constructor() {
    this.loadWishlist();
  }

  private loadWishlist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_TECH_WISHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.wishlistIds = new Set(parsed);
        }
      }
    } catch {
      // Fallback
    }
  }

  private saveWishlist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_TECH_WISHLIST_KEY, JSON.stringify(Array.from(this.wishlistIds)));
    } catch {
      // Fallback
    }
  }

  getWishlist(): TechUnlockItem[] {
    return CANONICAL_TECH_UNLOCKS.filter((item) => this.wishlistIds.has(item.id));
  }

  isInWishlist(id: string): boolean {
    return this.wishlistIds.has(id);
  }

  toggleWishlist(id: string): boolean {
    if (this.wishlistIds.has(id)) {
      this.wishlistIds.delete(id);
    } else {
      this.wishlistIds.add(id);
    }
    this.saveWishlist();
    return this.wishlistIds.has(id);
  }

  addWishlist(id: string): void {
    this.wishlistIds.add(id);
    this.saveWishlist();
  }

  removeWishlist(id: string): void {
    this.wishlistIds.delete(id);
    this.saveWishlist();
  }

  // Calculate required ingredients vs player inventory
  calculateWishlistDeficits(
    inventory: Record<string, number>,
    activeItems?: TechUnlockItem[]
  ): {
    totalItems: number;
    ingredients: Array<{
      name: string;
      category: string;
      isCommodity: boolean;
      required: number;
      owned: number;
      deficit: number;
      isComplete: boolean;
      sourceTip?: string;
    }>;
    isFullyReady: boolean;
  } {
    const items = activeItems || this.getWishlist();
    const map = new Map<string, {
      name: string;
      category: string;
      isCommodity: boolean;
      required: number;
      owned: number;
      sourceTip?: string;
    }>();

    for (const item of items) {
      for (const ing of item.ingredients) {
        const cur = map.get(ing.name) || {
          name: ing.name,
          category: ing.category,
          isCommodity: !!ing.isCommodity,
          required: 0,
          owned: inventory[ing.name] ?? 0,
          sourceTip: ing.sourceTip,
        };
        cur.required += ing.quantity;
        map.set(ing.name, cur);
      }
    }

    const ingredients = Array.from(map.values()).map((ing) => {
      const deficit = Math.max(0, ing.required - ing.owned);
      return {
        ...ing,
        deficit,
        isComplete: deficit === 0,
      };
    });

    const isFullyReady = ingredients.length > 0 && ingredients.every((i) => i.isComplete);

    return {
      totalItems: items.length,
      ingredients,
      isFullyReady,
    };
  }
}

export const techBrokerEngine = new TechnologyBrokerEngine();
