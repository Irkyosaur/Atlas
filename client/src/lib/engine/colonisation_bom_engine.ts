// Location: atlas/client/src/lib/engine/colonisation_bom_engine.ts
// Colonisation Bill of Materials (BOM) & Live Hauling Assistant Engine (Phase 08, Stage 8.2)

export type AssetRecipeKey =
  | 'coriolis_starport'
  | 'orbis_starport'
  | 'ocellus_starport'
  | 'planetary_outpost_t1'
  | 'planetary_outpost_t2'
  | 'planetary_outpost_t3'
  | 'bio_dome'
  | 'mining_extractor'
  | 'carrier_parking_slot';

export type ConstructionStageName =
  | 'Foundation & Core Excavation'
  | 'Primary Structural Frame'
  | 'Atmospheric & Power Subsystems'
  | 'Commissioning & Outfitting';

export interface StageCommodityRequirement {
  commodityId: string;
  name: string;
  category: string;
  requiredTonnage: number;
  averagePriceCr: number;
  icon?: string;
}

export interface ConstructionRecipeStage {
  stageNumber: number; // 1, 2, 3, 4
  stageName: ConstructionStageName;
  description: string;
  requirements: StageCommodityRequirement[];
}

export interface AssetConstructionRecipe {
  assetKey: AssetRecipeKey;
  assetName: string;
  category: 'Orbital Starport' | 'Surface Installation' | 'Logistics Infrastructure';
  totalDays: number;
  stages: ConstructionRecipeStage[];
}

export interface CargoShipPreset {
  id: string;
  name: string;
  hullClass: string;
  cargoCapacityTons: number;
  shieldedCapacityTons: number;
  defaultJumpRangeLy: number;
  isPopularHauler: boolean;
}

export interface BomCommodityAggregate {
  commodityId: string;
  name: string;
  category: string;
  totalRequiredTonnage: number;
  deliveredTonnage: number;
  inCargoTonnage: number;
  remainingTonnage: number;
  percentCompleted: number;
  unitPriceCr: number;
  totalCostCr: number;
  remainingCostCr: number;
  stagesSupplying: number[];
}

export interface AssetBomSummary {
  assetKey: AssetRecipeKey;
  assetName: string;
  customAssetName?: string;
  totalTonnage: number;
  deliveredTonnage: number;
  inCargoTonnage: number;
  remainingTonnage: number;
  percentCompleted: number;
  totalEstimatedCostCr: number;
  deliveredCostCr: number;
  remainingCostCr: number;
  commodities: BomCommodityAggregate[];
  stages: {
    stageNumber: number;
    stageName: ConstructionStageName;
    totalTonnage: number;
    deliveredTonnage: number;
    remainingTonnage: number;
    percentCompleted: number;
    isStageComplete: boolean;
    requirements: (StageCommodityRequirement & {
      delivered: number;
      remaining: number;
      percentCompleted: number;
    })[];
  }[];
}

export interface HaulingTripCalculation {
  ship: CargoShipPreset;
  effectiveCapacityTons: number;
  totalRunsRequired: number;
  completedRunsEquivalent: number;
  remainingRunsRequired: number;
  estimatedFlightHours: number; // Based on ~12 mins average per round trip
  estimatedFuelUsageTons: number;
}

export interface NearbySupplierStation {
  stationId: string;
  stationName: string;
  systemName: string;
  distanceLy: number;
  distanceLs: number;
  landingPad: 'Small' | 'Medium' | 'Large';
  isPlanetary: boolean;
  commodityId: string;
  commodityName: string;
  availableStockTons: number;
  buyPriceCr: number;
  costVariancePct: number;
  updatedAgoMins: number;
}

export interface LiveCargoItem {
  commodityId: string;
  name: string;
  count: number;
  stolen?: number;
}

export interface LiveCargoSyncState {
  isConnected: boolean;
  usingSimulation: boolean;
  lastUpdated: number;
  currentShipCargoUsed: number;
  currentShipCargoCapacity: number;
  inventory: Record<string, number>; // commodityId -> count
  recentDeliveries: {
    id: string;
    timestamp: number;
    commodityId: string;
    commodityName: string;
    amount: number;
    siteName: string;
  }[];
}

/**
 * Standard Cargo Ship Presets
 */
export const CARGO_SHIP_PRESETS: CargoShipPreset[] = [
  {
    id: 'type9_heavy_shieldless',
    name: 'Type-9 Heavy (Shieldless Bulk)',
    hullClass: 'Heavy Freighter',
    cargoCapacityTons: 784,
    shieldedCapacityTons: 752,
    defaultJumpRangeLy: 19.8,
    isPopularHauler: true,
  },
  {
    id: 'cutter_max_cargo',
    name: 'Imperial Cutter (Shielded Trade)',
    hullClass: 'Imperial Flagship',
    cargoCapacityTons: 792,
    shieldedCapacityTons: 728,
    defaultJumpRangeLy: 27.4,
    isPopularHauler: true,
  },
  {
    id: 'type8_transporter',
    name: 'Type-8 Transporter (Medium Bulk)',
    hullClass: 'Medium Cargo Transport',
    cargoCapacityTons: 406,
    shieldedCapacityTons: 374,
    defaultJumpRangeLy: 24.2,
    isPopularHauler: true,
  },
  {
    id: 'python_freighter',
    name: 'Python (Outpost Medium King)',
    hullClass: 'Medium Multi-Role',
    cargoCapacityTons: 294,
    shieldedCapacityTons: 280,
    defaultJumpRangeLy: 30.5,
    isPopularHauler: true,
  },
  {
    id: 'anaconda_hauler',
    name: 'Anaconda (Long-Range Hauler)',
    hullClass: 'Heavy Explorer/Hauler',
    cargoCapacityTons: 468,
    shieldedCapacityTons: 436,
    defaultJumpRangeLy: 41.2,
    isPopularHauler: false,
  },
];

/**
 * Complete Colonisation Construction Recipes
 * Realistic materials matching Elite Dangerous lore and community standard colonisation expansions.
 */
export const ASSET_CONSTRUCTION_RECIPES: Record<AssetRecipeKey, AssetConstructionRecipe> = {
  // Planetary Outpost Tier 1 (Verification target)
  planetary_outpost_t1: {
    assetKey: 'planetary_outpost_t1',
    assetName: 'Planetary Outpost Tier 1',
    category: 'Surface Installation',
    totalDays: 14,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Bedrock grading, seismic bedrock anchors, sub-surface foundation pylons.',
        requirements: [
          { commodityId: 'surface_stabilisers', name: 'Surface Stabilisers', category: 'Industrial Materials', requiredTonnage: 320, averagePriceCr: 6500 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 540, averagePriceCr: 4200 },
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 280, averagePriceCr: 890 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Erecting pressurized habitat bulkheads, landing pad truss framework, and heavy gantry cranes.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 680, averagePriceCr: 10450 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 190, averagePriceCr: 3400 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 210, averagePriceCr: 11400 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Reactor array integration, closed-loop water filtration, atmospheric scrubbers and distribution conduits.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 140, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 220, averagePriceCr: 7400 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 110, averagePriceCr: 1350 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 180, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Med-bay deployment, flight traffic telemetry arrays, terminal trade consoles, emergency survival caches.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 80, averagePriceCr: 5800 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 240, averagePriceCr: 820 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 120, averagePriceCr: 5300 },
        ],
      },
    ],
  },

  // Planetary Outpost Tier 2
  planetary_outpost_t2: {
    assetKey: 'planetary_outpost_t2',
    assetName: 'Planetary Outpost Tier 2 (Expanded Port)',
    category: 'Surface Installation',
    totalDays: 21,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Secondary pad expansion, underground subterranean rail routing and bedrock dampeners.',
        requirements: [
          { commodityId: 'surface_stabilisers', name: 'Surface Stabilisers', category: 'Industrial Materials', requiredTonnage: 650, averagePriceCr: 6500 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 1100, averagePriceCr: 4200 },
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 580, averagePriceCr: 890 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Multi-deck concourse superstructure and twin medium/large landing pad hydraulic lifts.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 1400, averagePriceCr: 10450 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 380, averagePriceCr: 3400 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 420, averagePriceCr: 11400 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Auxiliary fusion reactor cells, high-density supercon battery banks, atmospheric dome pressurization.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 320, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 450, averagePriceCr: 7400 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 360, averagePriceCr: 1850 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 230, averagePriceCr: 1350 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Advanced medical wing, Pioneer trade depot, commodity storage vaults and automated security systems.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 160, averagePriceCr: 5800 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 260, averagePriceCr: 5300 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 500, averagePriceCr: 820 },
        ],
      },
    ],
  },

  // Planetary Outpost Tier 3
  planetary_outpost_t3: {
    assetKey: 'planetary_outpost_t3',
    assetName: 'Planetary Outpost Tier 3 (Surface Metropolis)',
    category: 'Surface Installation',
    totalDays: 35,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Massive multi-crater terra-grading, subterranean hyper-transit tubes, deep geothermic boreholes.',
        requirements: [
          { commodityId: 'surface_stabilisers', name: 'Surface Stabilisers', category: 'Industrial Materials', requiredTonnage: 1500, averagePriceCr: 6500 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 2600, averagePriceCr: 4200 },
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 1200, averagePriceCr: 890 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Heavy planetary high-rise arcology framing, Quad-Large landing apron, automated gantry towers.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 3200, averagePriceCr: 10450 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 850, averagePriceCr: 3400 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 950, averagePriceCr: 11400 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Tri-core fusion reactor grid, district climate regulators, closed-loop hydroponic water scrubbers.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 750, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 1050, averagePriceCr: 7400 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 800, averagePriceCr: 1850 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 500, averagePriceCr: 1350 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Universal Cartographics planetary annex, shipyard maintenance cranes, full hospital diagnostic suites.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 350, averagePriceCr: 5800 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 580, averagePriceCr: 5300 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 1200, averagePriceCr: 820 },
        ],
      },
    ],
  },

  // Coriolis Starport
  coriolis_starport: {
    assetKey: 'coriolis_starport',
    assetName: 'Coriolis Starport',
    category: 'Orbital Starport',
    totalDays: 30,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Orbital keel alignment, counterweight rotational bearing assembly, central mail-slot docking axis.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 2800, averagePriceCr: 10450 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 4500, averagePriceCr: 4200 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 950, averagePriceCr: 3400 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Cuboctahedral armored outer shell, hangar bay bulkheads, rotational inertia dampening rings.',
        requirements: [
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 2100, averagePriceCr: 890 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 1250, averagePriceCr: 11400 },
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 3500, averagePriceCr: 10450 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Dual orbital capital fusion generators, magnetic airlocks, internal atmosphere pressurization.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 950, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 1350, averagePriceCr: 7400 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 750, averagePriceCr: 1350 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 1100, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Internal concourse modules, automated flight control ATC radar towers, trauma hospital bays.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 420, averagePriceCr: 5800 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 1800, averagePriceCr: 820 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 720, averagePriceCr: 5300 },
        ],
      },
    ],
  },

  // Orbis Starport
  orbis_starport: {
    assetKey: 'orbis_starport',
    assetName: 'Orbis Starport',
    category: 'Orbital Starport',
    totalDays: 60,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Central longitudinal hub spine, magnetic spin collar joints, central hangar docking canal.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 5200, averagePriceCr: 10450 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 8400, averagePriceCr: 4200 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 1800, averagePriceCr: 3400 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Twin 1.0G centrifugal gravity habitat rings, interconnecting transit spokes, exterior radiator arrays.',
        requirements: [
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 4200, averagePriceCr: 890 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 2600, averagePriceCr: 11400 },
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 6800, averagePriceCr: 10450 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Quad-core orbital magnetic reactor complex, bio-ring atmospheric pressure envelope, hydro-scrubbers.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 1900, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 2800, averagePriceCr: 7400 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 1600, averagePriceCr: 1350 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 2200, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Luxury botanical gardens, high-density residential rings, orbital shipyard dry-dock gantries.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 850, averagePriceCr: 5800 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 3600, averagePriceCr: 820 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 1400, averagePriceCr: 5300 },
        ],
      },
    ],
  },

  // Ocellus Starport
  ocellus_starport: {
    assetKey: 'ocellus_starport',
    assetName: 'Ocellus Starport',
    category: 'Orbital Starport',
    totalDays: 45,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Pre-fabricated propulsion module detachment, spherical reinforced forward bow framing.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 3800, averagePriceCr: 10450 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 6200, averagePriceCr: 4200 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 1350, averagePriceCr: 3400 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Spherical pressurized bow shell, radial hangar bays, heavy composite shield armor plating.',
        requirements: [
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 3100, averagePriceCr: 890 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 1900, averagePriceCr: 11400 },
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 4900, averagePriceCr: 10450 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Integrated ionic power plants, central atmospheric scrubbing core, coolant loop conduits.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 1400, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 2000, averagePriceCr: 7400 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 1150, averagePriceCr: 1350 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 1600, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Deep-exploration scientific labs, exobiology analysis pods, long-range subspace telemetry.',
        requirements: [
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 620, averagePriceCr: 5800 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 2600, averagePriceCr: 820 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 1050, averagePriceCr: 5300 },
        ],
      },
    ],
  },

  // Hydroponic Bio Dome
  bio_dome: {
    assetKey: 'bio_dome',
    assetName: 'Hydroponic Bio Dome',
    category: 'Surface Installation',
    totalDays: 14,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Surface bedrock leveling, thermal subterranean wells, foundation retaining ring.',
        requirements: [
          { commodityId: 'surface_stabilisers', name: 'Surface Stabilisers', category: 'Industrial Materials', requiredTonnage: 180, averagePriceCr: 6500 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 320, averagePriceCr: 4200 },
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 160, averagePriceCr: 890 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Pressurized geodesic dome framework, radiation-filtering transparent polymer panels.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 290, averagePriceCr: 10450 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 110, averagePriceCr: 3400 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 150, averagePriceCr: 11400 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Full-spectrum horticultural lamps, automated nutrient delivery plumbing, CO2 recycling.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 90, averagePriceCr: 2800 },
          { commodityId: 'water_purifiers', name: 'Water Purifiers', category: 'Industrial Materials', requiredTonnage: 180, averagePriceCr: 1350 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 130, averagePriceCr: 7400 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Algae spore inoculation, seed vaults, automated harvesting drones, soil culture beds.',
        requirements: [
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 200, averagePriceCr: 820 },
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 80, averagePriceCr: 5300 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 110, averagePriceCr: 1850 },
        ],
      },
    ],
  },

  // Planetary Mining Extractor
  mining_extractor: {
    assetKey: 'mining_extractor',
    assetName: 'Planetary Mining Extractor',
    category: 'Surface Installation',
    totalDays: 18,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Deep-crust shaft boring, high-pressure volcanic blast shoring, heavy slag pit foundations.',
        requirements: [
          { commodityId: 'surface_stabilisers', name: 'Surface Stabilisers', category: 'Industrial Materials', requiredTonnage: 360, averagePriceCr: 6500 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 680, averagePriceCr: 4200 },
          { commodityId: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', requiredTonnage: 310, averagePriceCr: 890 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Tungsten-carbide rotary drill head assembly, mineral conveyor trestles, ore hopper silos.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 720, averagePriceCr: 10450 },
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 220, averagePriceCr: 3400 },
          { commodityId: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', requiredTonnage: 190, averagePriceCr: 11400 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'Mega-watt geothermal turbines, electromagnetic mineral separators, exhaust scrubbers.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 210, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 310, averagePriceCr: 7400 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 190, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'Automated haulage skimmers, ore quality spectrometers, emergency survival shelters.',
        requirements: [
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 160, averagePriceCr: 5300 },
          { commodityId: 'medical_diagnostic_equipment', name: 'Medical Diagnostic Equipment', category: 'Medical', requiredTonnage: 70, averagePriceCr: 5800 },
          { commodityId: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', requiredTonnage: 280, averagePriceCr: 820 },
        ],
      },
    ],
  },

  // Fleet Carrier Parking Slot
  carrier_parking_slot: {
    assetKey: 'carrier_parking_slot',
    assetName: 'Fleet Carrier Parking Slot',
    category: 'Logistics Infrastructure',
    totalDays: 7,
    stages: [
      {
        stageNumber: 1,
        stageName: 'Foundation & Core Excavation',
        description: 'Orbital mooring lane survey, gravitational gradient anchoring buoy deploy.',
        requirements: [
          { commodityId: 'titanium', name: 'Titanium', category: 'Metals', requiredTonnage: 120, averagePriceCr: 10450 },
          { commodityId: 'steel', name: 'Steel', category: 'Metals', requiredTonnage: 200, averagePriceCr: 4200 },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Primary Structural Frame',
        description: 'Navigation transponder array, mooring guide buoys, localized traffic warning transmitters.',
        requirements: [
          { commodityId: 'structural_regulators', name: 'Structural Regulators', category: 'Technology', requiredTonnage: 60, averagePriceCr: 3400 },
          { commodityId: 'computer_components', name: 'Computer Components', category: 'Technology', requiredTonnage: 90, averagePriceCr: 1850 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Atmospheric & Power Subsystems',
        description: 'RTG isotope power batteries, automated station-keeping thrusters.',
        requirements: [
          { commodityId: 'power_generators', name: 'Power Generators', category: 'Industrial Materials', requiredTonnage: 50, averagePriceCr: 2800 },
          { commodityId: 'superconductors', name: 'Superconductors', category: 'Technology', requiredTonnage: 40, averagePriceCr: 7400 },
        ],
      },
      {
        stageNumber: 4,
        stageName: 'Commissioning & Outfitting',
        description: 'System-wide ATC beacon registry broadcast and Drake-class navigation handshake lock.',
        requirements: [
          { commodityId: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', requiredTonnage: 30, averagePriceCr: 5300 },
        ],
      },
    ],
  },
};

/**
 * Maps generic asset type (from colonisation_engine.ts) to detailed recipe key
 */
export function mapAssetTypeToRecipeKey(assetType: string): AssetRecipeKey {
  if (assetType === 'coriolis_starport') return 'coriolis_starport';
  if (assetType === 'orbis_starport') return 'orbis_starport';
  if (assetType === 'ocellus_starport') return 'ocellus_starport';
  if (assetType === 'planetary_outpost') return 'planetary_outpost_t1';
  if (assetType === 'bio_dome') return 'bio_dome';
  if (assetType === 'mining_extractor') return 'mining_extractor';
  if (assetType === 'carrier_parking_slot') return 'carrier_parking_slot';
  return 'planetary_outpost_t1';
}

/**
 * Calculates aggregate Bill of Materials (BOM) for an asset given delivered and in-cockpit cargo counts
 */
export function generateAssetBomSummary(
  recipeKey: AssetRecipeKey,
  customName?: string,
  deliveredMap: Record<string, number> = {},
  inCargoMap: Record<string, number> = {}
): AssetBomSummary {
  const recipe = ASSET_CONSTRUCTION_RECIPES[recipeKey] || ASSET_CONSTRUCTION_RECIPES.planetary_outpost_t1;

  const aggMap: Record<string, BomCommodityAggregate> = {};
  let totalTonnage = 0;
  let totalCostCr = 0;

  const stagesSummary = recipe.stages.map((st) => {
    let stageTotalTons = 0;
    let stageDeliveredTons = 0;

    const requirements = st.requirements.map((req) => {
      const delivered = deliveredMap[req.commodityId] || 0;
      // We attribute deliveries proportionally or stage-wise
      const reqRemaining = Math.max(0, req.requiredTonnage - delivered);
      const stagePct = req.requiredTonnage > 0 ? Math.min(100, Math.round((delivered / req.requiredTonnage) * 100)) : 100;

      stageTotalTons += req.requiredTonnage;
      stageDeliveredTons += Math.min(req.requiredTonnage, delivered);

      if (!aggMap[req.commodityId]) {
        aggMap[req.commodityId] = {
          commodityId: req.commodityId,
          name: req.name,
          category: req.category,
          totalRequiredTonnage: 0,
          deliveredTonnage: 0,
          inCargoTonnage: inCargoMap[req.commodityId] || 0,
          remainingTonnage: 0,
          percentCompleted: 0,
          unitPriceCr: req.averagePriceCr,
          totalCostCr: 0,
          remainingCostCr: 0,
          stagesSupplying: [],
        };
      }

      aggMap[req.commodityId].totalRequiredTonnage += req.requiredTonnage;
      if (!aggMap[req.commodityId].stagesSupplying.includes(st.stageNumber)) {
        aggMap[req.commodityId].stagesSupplying.push(st.stageNumber);
      }

      totalTonnage += req.requiredTonnage;
      totalCostCr += req.requiredTonnage * req.averagePriceCr;

      return {
        ...req,
        delivered: Math.min(req.requiredTonnage, delivered),
        remaining: reqRemaining,
        percentCompleted: stagePct,
      };
    });

    const stagePct = stageTotalTons > 0 ? Math.min(100, Math.round((stageDeliveredTons / stageTotalTons) * 100)) : 100;

    return {
      stageNumber: st.stageNumber,
      stageName: st.stageName,
      totalTonnage: stageTotalTons,
      deliveredTonnage: stageDeliveredTons,
      remainingTonnage: Math.max(0, stageTotalTons - stageDeliveredTons),
      percentCompleted: stagePct,
      isStageComplete: stageDeliveredTons >= stageTotalTons,
      requirements,
    };
  });

  // Calculate aggregates
  let aggregateDeliveredTons = 0;
  let aggregateInCargoTons = 0;
  let aggregateDeliveredCostCr = 0;

  const commodityList: BomCommodityAggregate[] = Object.values(aggMap).map((agg) => {
    const delivered = deliveredMap[agg.commodityId] || 0;
    const inCargo = inCargoMap[agg.commodityId] || 0;
    const remaining = Math.max(0, agg.totalRequiredTonnage - delivered);
    const pct = agg.totalRequiredTonnage > 0 ? Math.min(100, Math.round((delivered / agg.totalRequiredTonnage) * 100)) : 100;

    agg.deliveredTonnage = delivered;
    agg.inCargoTonnage = inCargo;
    agg.remainingTonnage = remaining;
    agg.percentCompleted = pct;
    agg.totalCostCr = agg.totalRequiredTonnage * agg.unitPriceCr;
    agg.remainingCostCr = remaining * agg.unitPriceCr;

    aggregateDeliveredTons += Math.min(agg.totalRequiredTonnage, delivered);
    aggregateInCargoTons += inCargo;
    aggregateDeliveredCostCr += Math.min(agg.totalRequiredTonnage, delivered) * agg.unitPriceCr;

    return agg;
  });

  const totalRemainingTons = Math.max(0, totalTonnage - aggregateDeliveredTons);
  const totalPercentCompleted = totalTonnage > 0 ? Math.min(100, Math.round((aggregateDeliveredTons / totalTonnage) * 100)) : 100;
  const remainingCostCr = Math.max(0, totalCostCr - aggregateDeliveredCostCr);

  return {
    assetKey: recipe.assetKey,
    assetName: recipe.assetName,
    customAssetName: customName,
    totalTonnage,
    deliveredTonnage: aggregateDeliveredTons,
    inCargoTonnage: aggregateInCargoTons,
    remainingTonnage: totalRemainingTons,
    percentCompleted: totalPercentCompleted,
    totalEstimatedCostCr: totalCostCr,
    deliveredCostCr: aggregateDeliveredCostCr,
    remainingCostCr,
    commodities: commodityList.sort((a, b) => b.totalRequiredTonnage - a.totalRequiredTonnage),
    stages: stagesSummary,
  };
}

/**
 * Calculates hauling trips and time metrics for a given cargo capacity
 */
export function calculateHaulingRuns(
  remainingTonnage: number,
  totalTonnage: number,
  shipPreset: CargoShipPreset,
  customCapacity?: number
): HaulingTripCalculation {
  const capacity = customCapacity && customCapacity > 0 ? customCapacity : shipPreset.cargoCapacityTons;
  const safeCapacity = Math.max(1, capacity);

  const totalRunsRequired = Math.ceil(totalTonnage / safeCapacity);
  const remainingRunsRequired = Math.ceil(remainingTonnage / safeCapacity);
  const completedRunsEquivalent = Math.max(0, totalRunsRequired - remainingRunsRequired);

  // Flight time: approx 12 minutes per round trip (supercruise, landing, loading, unloading)
  const roundTripMins = 12;
  const estimatedFlightHours = Number(((remainingRunsRequired * roundTripMins) / 60).toFixed(1));

  // Fuel usage estimate: approx 8 tons of fuel per round trip
  const estimatedFuelUsageTons = remainingRunsRequired * 8;

  return {
    ship: shipPreset,
    effectiveCapacityTons: safeCapacity,
    totalRunsRequired,
    completedRunsEquivalent,
    remainingRunsRequired,
    estimatedFlightHours,
    estimatedFuelUsageTons,
  };
}

/**
 * Canonical Nearby High-Stock Suppliers for Colonisation Materials
 */
export const CANONICAL_SUPPLIERS: NearbySupplierStation[] = [
  // Titanium Suppliers
  {
    stationId: 'sup_sol_titanium',
    stationName: 'Gorbatko Orbital',
    systemName: 'Sol',
    distanceLy: 14.2,
    distanceLs: 420,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'titanium',
    commodityName: 'Titanium',
    availableStockTons: 185400,
    buyPriceCr: 9850,
    costVariancePct: -5.7,
    updatedAgoMins: 12,
  },
  {
    stationId: 'sup_alpha_titanium',
    stationName: 'Titan Heavy Foundry',
    systemName: 'Alpha Centauri',
    distanceLy: 4.3,
    distanceLs: 1200,
    landingPad: 'Large',
    isPlanetary: true,
    commodityId: 'titanium',
    commodityName: 'Titanium',
    availableStockTons: 94200,
    buyPriceCr: 10100,
    costVariancePct: -3.3,
    updatedAgoMins: 45,
  },

  // Steel Suppliers
  {
    stationId: 'sup_sirius_steel',
    stationName: 'Patterson Enterprise',
    systemName: 'Sirius',
    distanceLy: 8.6,
    distanceLs: 740,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'steel',
    commodityName: 'Steel',
    availableStockTons: 240000,
    buyPriceCr: 3950,
    costVariancePct: -6.0,
    updatedAgoMins: 8,
  },
  {
    stationId: 'sup_ross_steel',
    stationName: 'Boyd Terminal',
    systemName: 'Ross 128',
    distanceLy: 11.0,
    distanceLs: 510,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'steel',
    commodityName: 'Steel',
    availableStockTons: 112000,
    buyPriceCr: 4100,
    costVariancePct: -2.4,
    updatedAgoMins: 22,
  },

  // Superconductors
  {
    stationId: 'sup_wolf_supercond',
    stationName: 'Goldstein Port',
    systemName: 'Wolf 359',
    distanceLy: 7.8,
    distanceLs: 890,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'superconductors',
    commodityName: 'Superconductors',
    availableStockTons: 78500,
    buyPriceCr: 7100,
    costVariancePct: -4.1,
    updatedAgoMins: 15,
  },
  {
    stationId: 'sup_procyon_supercond',
    stationName: 'Cramer Hub',
    systemName: 'Procyon',
    distanceLy: 11.4,
    distanceLs: 630,
    landingPad: 'Large',
    isPlanetary: true,
    commodityId: 'superconductors',
    commodityName: 'Superconductors',
    availableStockTons: 52400,
    buyPriceCr: 7350,
    costVariancePct: -0.7,
    updatedAgoMins: 60,
  },

  // Surface Stabilisers
  {
    stationId: 'sup_sol_stabilisers',
    stationName: 'Columbus Station',
    systemName: 'Sol',
    distanceLy: 14.2,
    distanceLs: 890,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'surface_stabilisers',
    commodityName: 'Surface Stabilisers',
    availableStockTons: 86400,
    buyPriceCr: 6200,
    costVariancePct: -4.6,
    updatedAgoMins: 19,
  },

  // Structural Regulators
  {
    stationId: 'sup_bernard_regulators',
    stationName: 'Boston Base',
    systemName: "Barnard's Star",
    distanceLy: 5.9,
    distanceLs: 340,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'structural_regulators',
    commodityName: 'Structural Regulators',
    availableStockTons: 63200,
    buyPriceCr: 3250,
    costVariancePct: -4.4,
    updatedAgoMins: 31,
  },

  // Ceramic Composites
  {
    stationId: 'sup_sol_ceramic',
    stationName: 'Burnell Station',
    systemName: 'Sol',
    distanceLy: 14.2,
    distanceLs: 450,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'ceramic_composites',
    commodityName: 'Ceramic Composites',
    availableStockTons: 154000,
    buyPriceCr: 840,
    costVariancePct: -5.6,
    updatedAgoMins: 14,
  },

  // Insulating Membrane
  {
    stationId: 'sup_sirius_insulating',
    stationName: 'Lucid Complex',
    systemName: 'Sirius',
    distanceLy: 8.6,
    distanceLs: 910,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'insulating_membrane',
    commodityName: 'Insulating Membrane',
    availableStockTons: 42100,
    buyPriceCr: 10900,
    costVariancePct: -4.4,
    updatedAgoMins: 25,
  },

  // Power Generators
  {
    stationId: 'sup_luyten_generators',
    stationName: 'Ashby City',
    systemName: "Luyten's Star",
    distanceLy: 12.3,
    distanceLs: 670,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'power_generators',
    commodityName: 'Power Generators',
    availableStockTons: 88400,
    buyPriceCr: 2650,
    costVariancePct: -5.4,
    updatedAgoMins: 10,
  },

  // Water Purifiers
  {
    stationId: 'sup_alpha_purifiers',
    stationName: 'Eden Bio Station',
    systemName: 'Alpha Centauri',
    distanceLy: 4.3,
    distanceLs: 1800,
    landingPad: 'Medium',
    isPlanetary: true,
    commodityId: 'water_purifiers',
    commodityName: 'Water Purifiers',
    availableStockTons: 64200,
    buyPriceCr: 1280,
    costVariancePct: -5.2,
    updatedAgoMins: 38,
  },

  // Computer Components
  {
    stationId: 'sup_sol_computers',
    stationName: 'M. Gorbachev',
    systemName: 'Sol',
    distanceLy: 14.2,
    distanceLs: 980,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'computer_components',
    commodityName: 'Computer Components',
    availableStockTons: 119000,
    buyPriceCr: 1720,
    costVariancePct: -7.0,
    updatedAgoMins: 7,
  },

  // Medical Diagnostic Equipment
  {
    stationId: 'sup_ross_med',
    stationName: 'Pasteur Medical Center',
    systemName: 'Ross 128',
    distanceLy: 11.0,
    distanceLs: 420,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'medical_diagnostic_equipment',
    commodityName: 'Medical Diagnostic Equipment',
    availableStockTons: 38400,
    buyPriceCr: 5450,
    costVariancePct: -6.0,
    updatedAgoMins: 16,
  },

  // Food Cartridges
  {
    stationId: 'sup_epsilon_food',
    stationName: 'Agri-Silo 04',
    systemName: 'Epsilon Eridani',
    distanceLy: 10.5,
    distanceLs: 310,
    landingPad: 'Large',
    isPlanetary: true,
    commodityId: 'food_cartridges',
    commodityName: 'Food Cartridges',
    availableStockTons: 310000,
    buyPriceCr: 760,
    costVariancePct: -7.3,
    updatedAgoMins: 9,
  },

  // Auto-Fabricators
  {
    stationId: 'sup_sol_fabricators',
    stationName: 'Titan City Fabrications',
    systemName: 'Sol',
    distanceLy: 14.2,
    distanceLs: 1450,
    landingPad: 'Large',
    isPlanetary: false,
    commodityId: 'auto_fabricators',
    commodityName: 'Auto-Fabricators',
    availableStockTons: 49800,
    buyPriceCr: 5050,
    costVariancePct: -4.7,
    updatedAgoMins: 20,
  },
];

/**
 * Filters supplier stations for a specific commodity within an operational range
 */
export function findNearbySuppliers(
  commodityId: string,
  maxRadiusLy = 35,
  padFilter: 'Any' | 'Large' = 'Any'
): NearbySupplierStation[] {
  return CANONICAL_SUPPLIERS.filter((s) => {
    if (s.commodityId !== commodityId) return false;
    if (s.distanceLy > maxRadiusLy) return false;
    if (padFilter === 'Large' && s.landingPad !== 'Large') return false;
    return true;
  }).sort((a, b) => a.distanceLy - b.distanceLy);
}

/**
 * Colonisation Hauling & Live Cargo Sync Engine Service
 * Connects to local EDill bridge WebSocket (`ws://127.0.0.1:8999/ws/telemetry`) or provides mock/simulated Cargo stream
 */
export class ColonisationBomEngine {
  private ws: WebSocket | null = null;
  private wsUrl = 'ws://127.0.0.1:8999/ws/telemetry';
  private syncState: LiveCargoSyncState = {
    isConnected: false,
    usingSimulation: false,
    lastUpdated: Date.now(),
    currentShipCargoUsed: 0,
    currentShipCargoCapacity: 784,
    inventory: {},
    recentDeliveries: [],
  };

  private listeners: Set<(state: LiveCargoSyncState) => void> = new Set();
  private deliveryListeners: Set<(delivery: { commodityId: string; amount: number; siteName: string }) => void> = new Set();
  private reconnectTimer: any = null;

  constructor() {
    // Initial default cargo setup
    this.syncState.inventory = {
      titanium: 0,
      steel: 0,
      surface_stabilisers: 0,
      superconductors: 0,
      computer_components: 0,
      power_generators: 0,
      water_purifiers: 0,
    };
  }

  public getState(): LiveCargoSyncState {
    return { ...this.syncState };
  }

  public subscribe(listener: (state: LiveCargoSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public onDelivery(listener: (delivery: { commodityId: string; amount: number; siteName: string }) => void): () => void {
    this.deliveryListeners.add(listener);
    return () => this.deliveryListeners.delete(listener);
  }

  private notify() {
    const st = this.getState();
    for (const l of this.listeners) {
      try {
        l(st);
      } catch (err) {
        console.error('Error in BOM engine listener:', err);
      }
    }
  }

  /**
   * Connect to local EDill bridge
   */
  public connect(url?: string) {
    if (typeof window === 'undefined') return;
    if (url) this.wsUrl = url;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.syncState.isConnected = true;
        this.syncState.usingSimulation = false;
        this.notify();
        // Subscribe to Cargo and Market topics
        this.send({
          type: 'subscribe',
          topics: ['Cargo', 'CargoDepot', 'MarketBuy', 'MarketSell', 'CommunityGoal'],
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingTelemetry(data);
        } catch {
          // Ignore non-json frames
        }
      };

      this.ws.onclose = () => {
        this.syncState.isConnected = false;
        this.notify();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.syncState.isConnected = false;
        this.notify();
      };
    } catch {
      this.syncState.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // If native not available, don't spam errors
      if (!this.syncState.isConnected && !this.syncState.usingSimulation) {
        this.connect();
      }
    }, 10000);
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Parse journal / Cargo.json / telemetry payloads
   */
  public handleIncomingTelemetry(msg: any) {
    if (!msg) return;

    // Direct Cargo event from journal / Status
    if (msg.event === 'Cargo' || msg.topic === 'Cargo' || msg.Vessel === 'Ship') {
      const inventory = msg.Inventory || msg.inventory || [];
      const newInv: Record<string, number> = {};
      let totalUsed = 0;

      if (Array.isArray(inventory)) {
        for (const item of inventory) {
          const rawName: string = item.Name || item.name || '';
          const key = rawName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          const count = Number(item.Count || item.count || 0);
          newInv[key] = (newInv[key] || 0) + count;
          totalUsed += count;
        }
      }

      this.syncState.inventory = newInv;
      this.syncState.currentShipCargoUsed = totalUsed;
      this.syncState.lastUpdated = Date.now();
      this.notify();
      return;
    }

    // CargoDepot or MarketSell unloading at colony site
    if (msg.event === 'CargoDepot' || msg.event === 'MarketSell' || msg.event === 'CommunityGoal') {
      const rawName: string = msg.CargoType || msg.Type || msg.commodity || '';
      const key = rawName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const count = Number(msg.Count || msg.Amount || 0);
      const site = msg.StationName || msg.MarketName || 'Colony Construction Depot';

      if (key && count > 0) {
        this.recordUnloadDelivery(key, count, site);
      }
    }
  }

  /**
   * Manually record or simulate an unloading delivery at construction site
   */
  public recordUnloadDelivery(commodityId: string, amount: number, siteName = 'Colony Construction Depot') {
    const key = commodityId.toLowerCase().replace(/\s+/g, '_');
    // Decrement from ship inventory if present
    if (this.syncState.inventory[key]) {
      this.syncState.inventory[key] = Math.max(0, this.syncState.inventory[key] - amount);
      this.syncState.currentShipCargoUsed = Math.max(0, this.syncState.currentShipCargoUsed - amount);
    }

    const deliveryRecord = {
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      commodityId: key,
      commodityName: key.replace(/_/g, ' ').toUpperCase(),
      amount,
      siteName,
    };

    this.syncState.recentDeliveries = [deliveryRecord, ...this.syncState.recentDeliveries.slice(0, 19)];
    this.syncState.lastUpdated = Date.now();

    // Trigger delivery listeners
    for (const dl of this.deliveryListeners) {
      try {
        dl({ commodityId: key, amount, siteName });
      } catch (e) {
        console.error('Error in delivery listener:', e);
      }
    }

    this.notify();
  }

  /**
   * Load ship cargo (e.g. simulate buying at supplier station)
   */
  public loadShipCargo(commodityId: string, amount: number) {
    const key = commodityId.toLowerCase().replace(/\s+/g, '_');
    const freeCapacity = Math.max(0, this.syncState.currentShipCargoCapacity - this.syncState.currentShipCargoUsed);
    const actualAdd = Math.min(amount, freeCapacity);

    this.syncState.inventory[key] = (this.syncState.inventory[key] || 0) + actualAdd;
    this.syncState.currentShipCargoUsed += actualAdd;
    this.syncState.lastUpdated = Date.now();
    this.notify();
    return actualAdd;
  }

  /**
   * Activate Simulated Telemetry Mode for testing without a running game client
   */
  public enableSimulationMode(shipPreset: CargoShipPreset = CARGO_SHIP_PRESETS[0]) {
    this.syncState.usingSimulation = true;
    this.syncState.isConnected = true;
    this.syncState.currentShipCargoCapacity = shipPreset.cargoCapacityTons;
    this.syncState.currentShipCargoUsed = 0;
    this.syncState.inventory = {};
    this.syncState.lastUpdated = Date.now();
    this.notify();
  }

  public setShipCargoCapacity(capacity: number) {
    this.syncState.currentShipCargoCapacity = capacity;
    this.notify();
  }
}

// Global Singleton for Colonisation BOM & Live Hauling Sync
export const colonisationBomEngine = new ColonisationBomEngine();
