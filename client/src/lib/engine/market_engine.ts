// Location: atlas/client/src/lib/engine/market_engine.ts
// Real-Time Commodity Market & Supply/Demand Analytics Engine for Project Atlas (Stage 6.1)

export type CommodityCategory =
  | 'Metals'
  | 'Minerals'
  | 'Technology'
  | 'Weapons'
  | 'Narcotics'
  | 'Medical'
  | 'Consumer Items'
  | 'Chemicals'
  | 'Foods'
  | 'Industrial Materials';

export const COMMODITY_CATEGORIES: CommodityCategory[] = [
  'Metals',
  'Minerals',
  'Technology',
  'Weapons',
  'Narcotics',
  'Medical',
  'Consumer Items',
  'Chemicals',
  'Foods',
  'Industrial Materials',
];

export type LandingPadSize = 'Small' | 'Medium' | 'Large';

export interface CommodityRecord {
  id: string;
  name: string;
  category: CommodityCategory;
  averagePrice: number;
  maxBuyPrice: number;
  minSellPrice: number;
  isRare?: boolean;
  isIllicit?: boolean;
}

export interface StationMarketRecord {
  stationId: string;
  stationName: string;
  systemName: string;
  systemId64: string;
  coords: { x: number; y: number; z: number };
  distanceLy: number;
  stationType: string; // e.g. Coriolis Starport, Orbis Starport, Outpost, Planetary Port, Fleet Carrier
  isPlanetary: boolean;
  distanceLs: number;
  maxLandingPad: LandingPadSize;
  commodityName: string;
  commodityCategory: CommodityCategory;
  buyPrice: number;   // Price to buy from station
  sellPrice: number;  // Price to sell to station
  supply: number;     // Station supply volume
  supplyLevel: 'Low' | 'Med' | 'High' | 'Zero';
  demand: number;     // Station demand volume
  demandLevel: 'Low' | 'Med' | 'High' | 'Zero';
  marketUpdatedAt: number; // Unix timestamp in seconds or ms
  galacticAverage: number;
  buyVariancePct: number;  // Relative to galactic avg (positive = above avg, negative = bargain)
  sellVariancePct: number; // Relative to galactic avg (positive = premium profit, negative = below avg)
}

export interface MarketFilterOptions {
  searchQuery: string;
  category: CommodityCategory | 'All';
  padSize: LandingPadSize | 'Any';
  stationLocation: 'All' | 'Orbital' | 'Planetary';
  maxAgeHours: number; // e.g. 0 = unlimited, 6, 24, 48, 72
  minSupply: number;
  minDemand: number;
  sortField: 'buyPrice' | 'sellPrice' | 'supply' | 'demand' | 'distanceLs' | 'distanceLy' | 'age' | 'stationName' | 'commodityName';
  sortDirection: 'asc' | 'desc';
}

/**
 * Standard Canonical Commodities Catalog with galactic averages and category mappings.
 */
export const CANONICAL_COMMODITIES: CommodityRecord[] = [
  // Metals
  { id: 'gold', name: 'Gold', category: 'Metals', averagePrice: 47250, maxBuyPrice: 53100, minSellPrice: 42300 },
  { id: 'silver', name: 'Silver', category: 'Metals', averagePrice: 36500, maxBuyPrice: 41800, minSellPrice: 32200 },
  { id: 'platinum', name: 'Platinum', category: 'Metals', averagePrice: 285000, maxBuyPrice: 298000, minSellPrice: 265000 },
  { id: 'palladium', name: 'Palladium', category: 'Metals', averagePrice: 58000, maxBuyPrice: 66200, minSellPrice: 51000 },
  { id: 'titanium', name: 'Titanium', category: 'Metals', averagePrice: 10450, maxBuyPrice: 12100, minSellPrice: 8900 },
  { id: 'beryllium', name: 'Beryllium', category: 'Metals', averagePrice: 9100, maxBuyPrice: 11400, minSellPrice: 7800 },
  { id: 'cobalt', name: 'Cobalt', category: 'Metals', averagePrice: 7200, maxBuyPrice: 8800, minSellPrice: 5900 },
  { id: 'copper', name: 'Copper', category: 'Metals', averagePrice: 3100, maxBuyPrice: 3900, minSellPrice: 2400 },

  // Minerals
  { id: 'tritium', name: 'Tritium', category: 'Minerals', averagePrice: 52140, maxBuyPrice: 415000, minSellPrice: 49800 },
  { id: 'void_opals', name: 'Void Opals', category: 'Minerals', averagePrice: 450000, maxBuyPrice: 650000, minSellPrice: 380000 },
  { id: 'low_temperature_diamonds', name: 'Low Temperature Diamonds', category: 'Minerals', averagePrice: 380000, maxBuyPrice: 520000, minSellPrice: 310000 },
  { id: 'painite', name: 'Painite', category: 'Minerals', averagePrice: 290000, maxBuyPrice: 360000, minSellPrice: 240000 },
  { id: 'alexandrite', name: 'Alexandrite', category: 'Minerals', averagePrice: 420000, maxBuyPrice: 580000, minSellPrice: 350000 },
  { id: 'musgravite', name: 'Musgravite', category: 'Minerals', averagePrice: 490000, maxBuyPrice: 710000, minSellPrice: 410000 },
  { id: 'bauxite', name: 'Bauxite', category: 'Minerals', averagePrice: 1950, maxBuyPrice: 2600, minSellPrice: 1400 },

  // Technology
  { id: 'micro_controllers', name: 'Micro Controllers', category: 'Technology', averagePrice: 9500, maxBuyPrice: 13200, minSellPrice: 7900 },
  { id: 'superconductors', name: 'Superconductors', category: 'Technology', averagePrice: 7400, maxBuyPrice: 9800, minSellPrice: 6100 },
  { id: 'computer_components', name: 'Computer Components', category: 'Technology', averagePrice: 1850, maxBuyPrice: 2400, minSellPrice: 1400 },
  { id: 'bioreducing_lichen', name: 'Bioreducing Lichen', category: 'Technology', averagePrice: 2450, maxBuyPrice: 3300, minSellPrice: 1900 },
  { id: 'advanced_catalysers', name: 'Advanced Catalysers', category: 'Technology', averagePrice: 4100, maxBuyPrice: 5600, minSellPrice: 3200 },
  { id: 'auto_fabricators', name: 'Auto-Fabricators', category: 'Technology', averagePrice: 5300, maxBuyPrice: 7100, minSellPrice: 4200 },

  // Weapons
  { id: 'battle_weapons', name: 'Battle Weapons', category: 'Weapons', averagePrice: 8400, maxBuyPrice: 12500, minSellPrice: 6500, isIllicit: true },
  { id: 'personal_weapons', name: 'Personal Weapons', category: 'Weapons', averagePrice: 5200, maxBuyPrice: 7800, minSellPrice: 4100, isIllicit: true },
  { id: 'reactive_armour', name: 'Reactive Armour', category: 'Weapons', averagePrice: 3350, maxBuyPrice: 4600, minSellPrice: 2700 },
  { id: 'non_lethal_weapons', name: 'Non-lethal Weapons', category: 'Weapons', averagePrice: 2600, maxBuyPrice: 3600, minSellPrice: 2000 },

  // Narcotics
  { id: 'imperial_slaves', name: 'Imperial Slaves', category: 'Narcotics', averagePrice: 17200, maxBuyPrice: 21500, minSellPrice: 14800, isIllicit: true },
  { id: 'slaves', name: 'Slaves', category: 'Narcotics', averagePrice: 12300, maxBuyPrice: 16800, minSellPrice: 9500, isIllicit: true },
  { id: 'tobacco', name: 'Tobacco', category: 'Narcotics', averagePrice: 6100, maxBuyPrice: 7900, minSellPrice: 4900 },
  { id: 'wine', name: 'Wine', category: 'Narcotics', averagePrice: 1250, maxBuyPrice: 1800, minSellPrice: 900 },
  { id: 'beer', name: 'Beer', category: 'Narcotics', averagePrice: 850, maxBuyPrice: 1300, minSellPrice: 600 },

  // Medical
  { id: 'basic_medicines', name: 'Basic Medicines', category: 'Medical', averagePrice: 1450, maxBuyPrice: 5200, minSellPrice: 850 },
  { id: 'advanced_medicines', name: 'Advanced Medicines', category: 'Medical', averagePrice: 3200, maxBuyPrice: 7800, minSellPrice: 2400 },
  { id: 'performance_enhancers', name: 'Performance Enhancers', category: 'Medical', averagePrice: 7800, maxBuyPrice: 10500, minSellPrice: 6200 },
  { id: 'progenitor_cells', name: 'Progenitor Cells', category: 'Medical', averagePrice: 8100, maxBuyPrice: 11400, minSellPrice: 6800 },
  { id: 'agri_medicines', name: 'Agri-Medicines', category: 'Medical', averagePrice: 2100, maxBuyPrice: 3100, minSellPrice: 1600 },

  // Consumer Items
  { id: 'consumer_technology', name: 'Consumer Technology', category: 'Consumer Items', averagePrice: 7850, maxBuyPrice: 10400, minSellPrice: 6400 },
  { id: 'clothing', name: 'Clothing', category: 'Consumer Items', averagePrice: 1150, maxBuyPrice: 1650, minSellPrice: 850 },
  { id: 'domestic_appliances', name: 'Domestic Appliances', category: 'Consumer Items', averagePrice: 1420, maxBuyPrice: 1980, minSellPrice: 1100 },
  { id: 'survival_equipment', name: 'Survival Equipment', category: 'Consumer Items', averagePrice: 1380, maxBuyPrice: 1920, minSellPrice: 1020 },

  // Chemicals
  { id: 'hydrogen_fuel', name: 'Hydrogen Fuel', category: 'Chemicals', averagePrice: 290, maxBuyPrice: 520, minSellPrice: 180 },
  { id: 'mineral_oil', name: 'Mineral Oil', category: 'Chemicals', averagePrice: 890, maxBuyPrice: 1350, minSellPrice: 620 },
  { id: 'liquid_oxygen', name: 'Liquid Oxygen', category: 'Chemicals', averagePrice: 650, maxBuyPrice: 950, minSellPrice: 420 },
  { id: 'synthetic_reagents', name: 'Synthetic Reagents', category: 'Chemicals', averagePrice: 9200, maxBuyPrice: 12400, minSellPrice: 7600 },

  // Foods
  { id: 'food_cartridges', name: 'Food Cartridges', category: 'Foods', averagePrice: 820, maxBuyPrice: 1250, minSellPrice: 580 },
  { id: 'grain', name: 'Grain', category: 'Foods', averagePrice: 650, maxBuyPrice: 1050, minSellPrice: 420 },
  { id: 'fish', name: 'Fish', category: 'Foods', averagePrice: 1450, maxBuyPrice: 2100, minSellPrice: 1050 },
  { id: 'meat', name: 'Meat', category: 'Foods', averagePrice: 2150, maxBuyPrice: 2900, minSellPrice: 1650 },

  // Industrial Materials
  { id: 'polymers', name: 'Polymers', category: 'Industrial Materials', averagePrice: 880, maxBuyPrice: 1280, minSellPrice: 620 },
  { id: 'semiconductors', name: 'Semiconductors', category: 'Industrial Materials', averagePrice: 2150, maxBuyPrice: 2950, minSellPrice: 1680 },
  { id: 'insulating_membrane', name: 'Insulating Membrane', category: 'Industrial Materials', averagePrice: 11400, maxBuyPrice: 15600, minSellPrice: 9200 },
  { id: 'ceramic_composites', name: 'Ceramic Composites', category: 'Industrial Materials', averagePrice: 890, maxBuyPrice: 1320, minSellPrice: 640 },
];

/**
 * Standard High-Fidelity Stations Catalog with realistic commodity inventories,
 * orbital distances, pad sizes, and timestamps.
 */
export const CANONICAL_MARKET_STATIONS: StationMarketRecord[] = [
  // Tritium Core Hubs
  {
    stationId: 'st_sol_li',
    stationName: 'Li Qing Jao',
    systemName: 'Sol',
    systemId64: '10477373803',
    coords: { x: 0, y: 0, z: 0 },
    distanceLy: 0,
    stationType: 'Coriolis Starport',
    isPlanetary: false,
    distanceLs: 1240,
    maxLandingPad: 'Large',
    commodityName: 'Tritium',
    commodityCategory: 'Minerals',
    buyPrice: 50420,
    sellPrice: 49800,
    supply: 142580,
    supplyLevel: 'High',
    demand: 12000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 14 * 60 * 1000, // 14 mins ago
    galacticAverage: 52140,
    buyVariancePct: -3.3,
    sellVariancePct: -4.5,
  },
  {
    stationId: 'st_sol_mth',
    stationName: "M. Gorbachev",
    systemName: 'Sol',
    systemId64: '10477373803',
    coords: { x: 0, y: 0, z: 0 },
    distanceLy: 0,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 512,
    maxLandingPad: 'Large',
    commodityName: 'Gold',
    commodityCategory: 'Metals',
    buyPrice: 48900,
    sellPrice: 46800,
    supply: 68420,
    supplyLevel: 'High',
    demand: 35000,
    demandLevel: 'Med',
    marketUpdatedAt: Date.now() - 42 * 60 * 1000,
    galacticAverage: 47250,
    buyVariancePct: 3.5,
    sellVariancePct: -0.9,
  },
  {
    stationId: 'st_alfa_centauri_hut',
    stationName: 'Hutton Orbital',
    systemName: 'Alpha Centauri',
    systemId64: '286950797825',
    coords: { x: 3.03, y: -0.07, z: -3.15 },
    distanceLy: 4.37,
    stationType: 'Outpost',
    isPlanetary: false,
    distanceLs: 6391400,
    maxLandingPad: 'Medium',
    commodityName: 'Consumer Technology',
    commodityCategory: 'Consumer Items',
    buyPrice: 8950,
    sellPrice: 7200,
    supply: 450,
    supplyLevel: 'Low',
    demand: 8200,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 3.5 * 3600 * 1000,
    galacticAverage: 7850,
    buyVariancePct: 14.0,
    sellVariancePct: -8.3,
  },
  {
    stationId: 'st_barnard_miller',
    stationName: 'Miller Depot',
    systemName: "Barnard's Star",
    systemId64: '5489240176',
    coords: { x: -3.25, y: -4.43, z: 2.37 },
    distanceLy: 5.96,
    stationType: 'Planetary Port',
    isPlanetary: true,
    distanceLs: 340,
    maxLandingPad: 'Large',
    commodityName: 'Platinum',
    commodityCategory: 'Metals',
    buyPrice: 295000,
    sellPrice: 288400,
    supply: 840,
    supplyLevel: 'Low',
    demand: 92450,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 25 * 60 * 1000,
    galacticAverage: 285000,
    buyVariancePct: 3.5,
    sellVariancePct: 1.2,
  },
  {
    stationId: 'st_shinrarta_jameson',
    stationName: 'Jameson Memorial',
    systemName: 'Shinrarta Dezhra',
    systemId64: '3932277478106',
    coords: { x: 55.72, y: 17.59, z: 27.16 },
    distanceLy: 64.4,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 310,
    maxLandingPad: 'Large',
    commodityName: 'Superconductors',
    commodityCategory: 'Technology',
    buyPrice: 6980,
    sellPrice: 6540,
    supply: 520000,
    supplyLevel: 'High',
    demand: 18000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 8 * 60 * 1000,
    galacticAverage: 7400,
    buyVariancePct: -5.7,
    sellVariancePct: -11.6,
  },
  {
    stationId: 'st_shinrarta_jameson_trit',
    stationName: 'Jameson Memorial',
    systemName: 'Shinrarta Dezhra',
    systemId64: '3932277478106',
    coords: { x: 55.72, y: 17.59, z: 27.16 },
    distanceLy: 64.4,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 310,
    maxLandingPad: 'Large',
    commodityName: 'Tritium',
    commodityCategory: 'Minerals',
    buyPrice: 51200,
    sellPrice: 48900,
    supply: 98500,
    supplyLevel: 'High',
    demand: 45000,
    demandLevel: 'Med',
    marketUpdatedAt: Date.now() - 8 * 60 * 1000,
    galacticAverage: 52140,
    buyVariancePct: -1.8,
    sellVariancePct: -6.2,
  },
  {
    stationId: 'st_acheron_mining',
    stationName: 'Acheron Extraction Hub',
    systemName: 'Wolf 359',
    systemId64: '6241049281',
    coords: { x: 4.12, y: -6.21, z: 2.85 },
    distanceLy: 7.78,
    stationType: 'Planetary Outpost',
    isPlanetary: true,
    distanceLs: 182,
    maxLandingPad: 'Medium',
    commodityName: 'Painite',
    commodityCategory: 'Minerals',
    buyPrice: 320000,
    sellPrice: 295000,
    supply: 120,
    supplyLevel: 'Low',
    demand: 45000,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 55 * 60 * 1000,
    galacticAverage: 290000,
    buyVariancePct: 10.3,
    sellVariancePct: 1.7,
  },
  {
    stationId: 'st_cubeo_chelomey',
    stationName: 'Chelomey Orbital',
    systemName: 'Cubeo',
    systemId64: '14892019842',
    coords: { x: 12.3, y: -218.4, z: 4.2 },
    distanceLy: 218.8,
    stationType: 'Coriolis Starport',
    isPlanetary: false,
    distanceLs: 420,
    maxLandingPad: 'Large',
    commodityName: 'Imperial Slaves',
    commodityCategory: 'Narcotics',
    buyPrice: 15400,
    sellPrice: 19800,
    supply: 421000,
    supplyLevel: 'High',
    demand: 65000,
    demandLevel: 'Med',
    marketUpdatedAt: Date.now() - 18 * 60 * 1000,
    galacticAverage: 17200,
    buyVariancePct: -10.5,
    sellVariancePct: 15.1,
  },
  {
    stationId: 'st_cubeo_medina',
    stationName: 'Medina Vision',
    systemName: 'Cubeo',
    systemId64: '14892019842',
    coords: { x: 12.3, y: -218.4, z: 4.2 },
    distanceLy: 218.8,
    stationType: 'Ocellus Starport',
    isPlanetary: false,
    distanceLs: 680,
    maxLandingPad: 'Large',
    commodityName: 'Battle Weapons',
    commodityCategory: 'Weapons',
    buyPrice: 7200,
    sellPrice: 9600,
    supply: 35000,
    supplyLevel: 'Med',
    demand: 82000,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 110 * 60 * 1000,
    galacticAverage: 8400,
    buyVariancePct: -14.3,
    sellVariancePct: 14.3,
  },
  {
    stationId: 'st_colonia_jaques',
    stationName: 'Jaques Station',
    systemName: 'Colonia',
    systemId64: '148590123512',
    coords: { x: -9530.5, y: -910.2, z: 19808.1 },
    distanceLy: 22000.4,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 1520,
    maxLandingPad: 'Large',
    commodityName: 'Tritium',
    commodityCategory: 'Minerals',
    buyPrice: 53800,
    sellPrice: 51200,
    supply: 350000,
    supplyLevel: 'High',
    demand: 280000,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 5 * 60 * 1000,
    galacticAverage: 52140,
    buyVariancePct: 3.2,
    sellVariancePct: -1.8,
  },
  {
    stationId: 'st_colonia_dover',
    stationName: 'Dover Port',
    systemName: 'Colonia',
    systemId64: '148590123512',
    coords: { x: -9530.5, y: -910.2, z: 19808.1 },
    distanceLy: 22000.4,
    stationType: 'Planetary Port',
    isPlanetary: true,
    distanceLs: 890,
    maxLandingPad: 'Large',
    commodityName: 'Insulating Membrane',
    commodityCategory: 'Industrial Materials',
    buyPrice: 10200,
    sellPrice: 12900,
    supply: 14000,
    supplyLevel: 'Med',
    demand: 85000,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 4 * 3600 * 1000,
    galacticAverage: 11400,
    buyVariancePct: -10.5,
    sellVariancePct: 13.2,
  },
  {
    stationId: 'st_eotiarks_dock',
    stationName: 'Armstrong Gateway',
    systemName: 'Eotiarks',
    systemId64: '7192048123',
    coords: { x: 38.4, y: 12.1, z: -44.2 },
    distanceLy: 59.8,
    stationType: 'Coriolis Starport',
    isPlanetary: false,
    distanceLs: 245,
    maxLandingPad: 'Large',
    commodityName: 'Advanced Medicines',
    commodityCategory: 'Medical',
    buyPrice: 2850,
    sellPrice: 4200,
    supply: 84000,
    supplyLevel: 'High',
    demand: 12000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 32 * 60 * 1000,
    galacticAverage: 3200,
    buyVariancePct: -10.9,
    sellVariancePct: 31.3,
  },
  {
    stationId: 'st_lave_station',
    stationName: 'Lave Station',
    systemName: 'Lave',
    systemId64: '4120958172',
    coords: { x: 74.2, y: 34.1, z: -45.1 },
    distanceLy: 93.3,
    stationType: 'Coriolis Starport',
    isPlanetary: false,
    distanceLs: 290,
    maxLandingPad: 'Large',
    commodityName: 'Wine',
    commodityCategory: 'Narcotics',
    buyPrice: 1100,
    sellPrice: 1450,
    supply: 125000,
    supplyLevel: 'High',
    demand: 8000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 65 * 60 * 1000,
    galacticAverage: 1250,
    buyVariancePct: -12.0,
    sellVariancePct: 16.0,
  },
  {
    stationId: 'st_leesti_george',
    stationName: 'George Lucas',
    systemName: 'Leesti',
    systemId64: '4120958189',
    coords: { x: 75.8, y: 33.9, z: -43.8 },
    distanceLy: 93.1,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 312,
    maxLandingPad: 'Large',
    commodityName: 'Consumer Technology',
    commodityCategory: 'Consumer Items',
    buyPrice: 7120,
    sellPrice: 8450,
    supply: 220000,
    supplyLevel: 'High',
    demand: 15000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 15 * 60 * 1000,
    galacticAverage: 7850,
    buyVariancePct: -9.3,
    sellVariancePct: 7.6,
  },
  {
    stationId: 'st_diso_shifnal',
    stationName: 'Shifnalport',
    systemName: 'Diso',
    systemId64: '4120958190',
    coords: { x: 73.1, y: 32.5, z: -46.2 },
    distanceLy: 92.4,
    stationType: 'Ocellus Starport',
    isPlanetary: false,
    distanceLs: 410,
    maxLandingPad: 'Large',
    commodityName: 'Food Cartridges',
    commodityCategory: 'Foods',
    buyPrice: 740,
    sellPrice: 910,
    supply: 380000,
    supplyLevel: 'High',
    demand: 22000,
    demandLevel: 'Low',
    marketUpdatedAt: Date.now() - 48 * 60 * 1000,
    galacticAverage: 820,
    buyVariancePct: -9.8,
    sellVariancePct: 11.0,
  },
  {
    stationId: 'st_sol_daedalus',
    stationName: 'Daedalus',
    systemName: 'Sol',
    systemId64: '10477373803',
    coords: { x: 0, y: 0, z: 0 },
    distanceLy: 0,
    stationType: 'Orbis Starport',
    isPlanetary: false,
    distanceLs: 180,
    maxLandingPad: 'Large',
    commodityName: 'Hydrogen Fuel',
    commodityCategory: 'Chemicals',
    buyPrice: 260,
    sellPrice: 310,
    supply: 950000,
    supplyLevel: 'High',
    demand: 65000,
    demandLevel: 'Med',
    marketUpdatedAt: Date.now() - 20 * 60 * 1000,
    galacticAverage: 290,
    buyVariancePct: -10.3,
    sellVariancePct: 6.9,
  },
  {
    stationId: 'st_wolf_sullivan',
    stationName: 'Sullivan Base',
    systemName: 'Wolf 359',
    systemId64: '6241049281',
    coords: { x: 4.12, y: -6.21, z: 2.85 },
    distanceLy: 7.78,
    stationType: 'Outpost',
    isPlanetary: false,
    distanceLs: 480,
    maxLandingPad: 'Medium',
    commodityName: 'Tritium',
    commodityCategory: 'Minerals',
    buyPrice: 49950,
    sellPrice: 54100,
    supply: 3500,
    supplyLevel: 'Med',
    demand: 82000,
    demandLevel: 'High',
    marketUpdatedAt: Date.now() - 72 * 60 * 1000,
    galacticAverage: 52140,
    buyVariancePct: -4.2,
    sellVariancePct: 3.8,
  },
  {
    stationId: 'st_wolf_copernicus',
    stationName: 'Copernicus Observatory',
    systemName: 'Wolf 359',
    systemId64: '6241049281',
    coords: { x: 4.12, y: -6.21, z: 2.85 },
    distanceLy: 7.78,
    stationType: 'Planetary Outpost',
    isPlanetary: true,
    distanceLs: 92,
    maxLandingPad: 'Small',
    commodityName: 'Personal Weapons',
    commodityCategory: 'Weapons',
    buyPrice: 4700,
    sellPrice: 6200,
    supply: 850,
    supplyLevel: 'Low',
    demand: 12000,
    demandLevel: 'Med',
    marketUpdatedAt: Date.now() - 180 * 60 * 1000,
    galacticAverage: 5200,
    buyVariancePct: -9.6,
    sellVariancePct: 19.2,
  },
];

/**
 * Normalizes landing pad strings from backend or DB to standard LandingPadSize.
 */
export function normalizeLandingPad(rawPad?: string | null): LandingPadSize {
  if (!rawPad) return 'Large';
  const lower = rawPad.toLowerCase();
  if (lower.includes('large') || lower.includes('l') || lower === '3') return 'Large';
  if (lower.includes('medium') || lower.includes('m') || lower === '2') return 'Medium';
  if (lower.includes('small') || lower.includes('s') || lower === '1') return 'Small';
  return 'Large';
}

/**
 * Formats elapsed age into human-readable shorthand (e.g. "12m ago", "3h ago", "2d ago").
 */
export function formatMarketAge(timestampMsOrSec: number): string {
  if (!timestampMsOrSec || timestampMsOrSec <= 0) return 'Just now';
  const timestampMs = timestampMsOrSec < 1e11 ? timestampMsOrSec * 1000 : timestampMsOrSec;
  const elapsedSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));

  if (elapsedSec < 60) return `${elapsedSec}s ago`;
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return `${elapsedMin}m ago`;
  const elapsedHours = Math.floor(elapsedMin / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

/**
 * Formats credits with standard thousands separators (e.g., 285,000 Cr).
 */
export function formatCredits(credits: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(credits));
}

/**
 * Classifies supply and demand numbers into categorical levels (Zero, Low, Med, High).
 */
export function classifyHealthLevel(volume: number): 'Zero' | 'Low' | 'Med' | 'High' {
  if (volume <= 0) return 'Zero';
  if (volume < 2000) return 'Low';
  if (volume < 50000) return 'Med';
  return 'High';
}

/**
 * Filter & sort station market records according to user criteria.
 */
export function filterAndSortMarketRecords(
  records: StationMarketRecord[],
  options: MarketFilterOptions
): StationMarketRecord[] {
  const query = options.searchQuery.trim().toLowerCase();
  const maxAgeMs = options.maxAgeHours > 0 ? options.maxAgeHours * 3600 * 1000 : Infinity;
  const now = Date.now();

  const filtered = records.filter((rec) => {
    // Search query matching commodity, station, or star system
    if (query) {
      const matchName = rec.commodityName.toLowerCase().includes(query);
      const matchStation = rec.stationName.toLowerCase().includes(query);
      const matchSystem = rec.systemName.toLowerCase().includes(query);
      const matchCategory = rec.commodityCategory.toLowerCase().includes(query);
      if (!matchName && !matchStation && !matchSystem && !matchCategory) {
        return false;
      }
    }

    // Category filter
    if (options.category !== 'All' && rec.commodityCategory !== options.category) {
      return false;
    }

    // Landing pad filter: Large requires Large pad; Medium accepts Med or Large; Small accepts any
    if (options.padSize !== 'Any') {
      if (options.padSize === 'Large' && rec.maxLandingPad !== 'Large') return false;
      if (options.padSize === 'Medium' && rec.maxLandingPad === 'Small') return false;
    }

    // Planetary vs Orbital filter
    if (options.stationLocation === 'Orbital' && rec.isPlanetary) return false;
    if (options.stationLocation === 'Planetary' && !rec.isPlanetary) return false;

    // Age filter
    if (maxAgeMs !== Infinity) {
      const recTimeMs = rec.marketUpdatedAt < 1e11 ? rec.marketUpdatedAt * 1000 : rec.marketUpdatedAt;
      if (now - recTimeMs > maxAgeMs) return false;
    }

    // Volume filters
    if (options.minSupply > 0 && rec.supply < options.minSupply) return false;
    if (options.minDemand > 0 && rec.demand < options.minDemand) return false;

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let diff = 0;
    switch (options.sortField) {
      case 'buyPrice':
        diff = a.buyPrice - b.buyPrice;
        break;
      case 'sellPrice':
        diff = a.sellPrice - b.sellPrice;
        break;
      case 'supply':
        diff = a.supply - b.supply;
        break;
      case 'demand':
        diff = a.demand - b.demand;
        break;
      case 'distanceLs':
        diff = a.distanceLs - b.distanceLs;
        break;
      case 'distanceLy':
        diff = a.distanceLy - b.distanceLy;
        break;
      case 'age':
        diff = b.marketUpdatedAt - a.marketUpdatedAt; // Newest first for asc
        break;
      case 'stationName':
        diff = a.stationName.localeCompare(b.stationName);
        break;
      case 'commodityName':
        diff = a.commodityName.localeCompare(b.commodityName);
        break;
    }

    return options.sortDirection === 'asc' ? diff : -diff;
  });

  return filtered;
}

/**
 * Stage 6.2: Single-Hop Best Trade Finder types & calculation engine
 */

export interface SingleHopQuery {
  currentSystem: string;
  currentStation?: string;
  cargoCapacity: number;     // e.g. 728T for Cutter, 784T Shieldless, 280T Python
  budgetCredits: number;     // Current available credits
  maxJumpRangeLy: number;    // Loaded FSD single jump range
  padSize: LandingPadSize | 'Any'; // Large, Medium, Small, Any
  includePlanetary: boolean; // Allow planetary ports
  maxAgeHours: number;       // Data staleness cutoff (6h, 24h, 48h, 0 for all)
  minProfitPerTon?: number;  // Optional profit filter
  commodityFilter?: string;  // Optional filter to specific commodity
}

export interface SingleHopTradeOpportunity {
  id: string;
  commodityName: string;
  commodityCategory: CommodityCategory;
  // Origin / Source (Buy)
  sourceSystem: string;
  sourceStation: string;
  sourcePadSize: LandingPadSize;
  sourceDistanceLs: number;
  sourceIsPlanetary: boolean;
  sourceGravityG: number;
  sourceBuyPrice: number;
  sourceSupply: number;
  sourceUpdatedAt: number;
  // Destination / Target (Sell)
  targetSystem: string;
  targetStation: string;
  targetPadSize: LandingPadSize;
  targetDistanceLs: number;
  targetIsPlanetary: boolean;
  targetGravityG: number;
  targetSellPrice: number;
  targetDemand: number;
  targetUpdatedAt: number;
  // Navigation & Metrics
  jumpDistanceLy: number;
  jumpsCount: number; // 1 jump for single-hop
  unitsTraded: number; // min(cargoCapacity, affordableUnits, sourceSupply, targetDemand)
  totalCostCr: number;
  grossProfitPerTon: number; // targetSellPrice - sourceBuyPrice
  netProfitPerTon: number;   // Gross profit adjusted for gravity fuel/thrust penalties
  totalGrossProfit: number;
  totalNetProfit: number;    // netProfitPerTon * unitsTraded
  estimatedFlightDurationMin: number; // Supercruise + orbital descent + docking
  estimatedCrPerHour: number; // (totalNetProfit / (flightMin / 60))
  sourceCoords?: { x: number; y: number; z: number };
  targetCoords?: { x: number; y: number; z: number };
}

/**
 * Supercruise non-linear travel time estimation:
 * $t_{sc} \approx A \cdot d^{0.33} + B$
 * Where $d$ is distance in light-seconds (Ls).
 * Returns estimated travel time in seconds.
 */
export function estimateSupercruiseTimeSeconds(distanceLs: number): number {
  if (distanceLs <= 0) return 30;
  // Baseline acceleration + deceleration profile
  // 500 Ls ~ 100s, 10,000 Ls ~ 280s, 6,000,000 Ls (Hutton) ~ 5400s (1.5h)
  const scSec = 35 + 8.5 * Math.pow(Math.max(1, distanceLs), 0.33);
  return Math.round(scSec);
}

/**
 * Calculates planetary atmospheric/gravity docking penalty.
 * High-G or planetary descents add glide time (~90s) and minor thruster wear/fuel delta.
 */
export function calculatePlanetaryLandingPenalty(isPlanetary: boolean, gravityG = 1.0): {
  extraTimeSeconds: number;
  gravityCrPerTonPenalty: number;
} {
  if (!isPlanetary) {
    return { extraTimeSeconds: 0, gravityCrPerTonPenalty: 0 };
  }
  // Orbital cruise + glide + surface high-G descent
  const extraTime = Math.round(75 + Math.max(0, (gravityG - 1.0)) * 45);
  // Fuel burn / high thrust cost penalty per ton (e.g. 15-40 Cr/T)
  const gravityCost = Math.round(20 * Math.max(0.5, gravityG));
  return { extraTimeSeconds: extraTime, gravityCrPerTonPenalty: gravityCost };
}

/**
 * Standard ship loadout cargo presets for quick selection
 */
export interface ShipCargoPreset {
  id: string;
  name: string;
  defaultCargoTons: number;
  padSize: LandingPadSize;
  description: string;
}

export const SHIP_CARGO_PRESETS: ShipCargoPreset[] = [
  { id: 'cutter_max', name: 'Imperial Cutter (Shieldless)', defaultCargoTons: 784, padSize: 'Large', description: 'Galactic King of Bulk Hauling' },
  { id: 'cutter_shielded', name: 'Imperial Cutter (Shielded)', defaultCargoTons: 728, padSize: 'Large', description: 'Standard 728T Safe Commercial Run' },
  { id: 'type9_heavy', name: 'Type-9 Heavy (Shielded)', defaultCargoTons: 748, padSize: 'Large', description: 'Massive volume, standard commercial freighter' },
  { id: 'anaconda', name: 'Anaconda (Multi-role)', defaultCargoTons: 440, padSize: 'Large', description: 'High jump range long-distance trader' },
  { id: 'python_mk1', name: 'Python (Medium Pad King)', defaultCargoTons: 280, padSize: 'Medium', description: 'Accesses Outposts & Medium starports' },
  { id: 'python_mk2', name: 'Python Mk II (Fast Haul)', defaultCargoTons: 160, padSize: 'Medium', description: 'Medium agile runner' },
  { id: 'krait_mk2', name: 'Krait Mk II', defaultCargoTons: 216, padSize: 'Medium', description: 'Armed medium transport' },
  { id: 'asp_exp', name: 'Asp Explorer', defaultCargoTons: 112, padSize: 'Medium', description: 'Budget long-range rare trader' },
  { id: 'cobra_mk3', name: 'Cobra Mk III', defaultCargoTons: 48, padSize: 'Small', description: 'Small pad nimble contraband runner' },
];

/**
 * Calculates a complete Single-Hop trade opportunity between source & target stations.
 */
export function calculateSingleHopOpportunity(
  source: StationMarketRecord,
  target: StationMarketRecord,
  query: SingleHopQuery
): SingleHopTradeOpportunity | null {
  // Pad size compatibility
  if (query.padSize === 'Large') {
    if (source.maxLandingPad !== 'Large' || target.maxLandingPad !== 'Large') return null;
  } else if (query.padSize === 'Medium') {
    if (source.maxLandingPad === 'Small' || target.maxLandingPad === 'Small') return null;
  }

  // Planetary filter
  if (!query.includePlanetary && (source.isPlanetary || target.isPlanetary)) {
    return null;
  }

  // Same station check
  if (source.stationId === target.stationId && source.systemName === target.systemName) {
    return null;
  }

  // Distance check
  const dx = (target.coords?.x ?? 0) - (source.coords?.x ?? 0);
  const dy = (target.coords?.y ?? 0) - (source.coords?.y ?? 0);
  const dz = (target.coords?.z ?? 0) - (source.coords?.z ?? 0);
  const distLy = Math.max(0.1, Number(Math.hypot(dx, dy, dz).toFixed(2)));

  if (query.maxJumpRangeLy > 0 && distLy > query.maxJumpRangeLy) {
    return null;
  }

  // Age filter (source or target)
  const now = Date.now();
  if (query.maxAgeHours > 0) {
    const maxAgeMs = query.maxAgeHours * 3600 * 1000;
    const sAge = source.marketUpdatedAt < 1e11 ? source.marketUpdatedAt * 1000 : source.marketUpdatedAt;
    const tAge = target.marketUpdatedAt < 1e11 ? target.marketUpdatedAt * 1000 : target.marketUpdatedAt;
    if (now - sAge > maxAgeMs || now - tAge > maxAgeMs) {
      return null;
    }
  }

  // Price & Profit
  const buyPrice = source.buyPrice;
  const sellPrice = target.sellPrice;
  if (buyPrice <= 0 || sellPrice <= 0) return null;

  const grossProfitPerTon = sellPrice - buyPrice;
  if (grossProfitPerTon <= 0) return null;

  // Planetary gravity penalties
  const srcGrav = source.isPlanetary ? 1.2 : 0;
  const tgtGrav = target.isPlanetary ? 1.1 : 0;
  const srcPenalty = calculatePlanetaryLandingPenalty(source.isPlanetary, srcGrav);
  const tgtPenalty = calculatePlanetaryLandingPenalty(target.isPlanetary, tgtGrav);

  const totalGravityPenaltyCrPerTon = srcPenalty.gravityCrPerTonPenalty + tgtPenalty.gravityCrPerTonPenalty;
  const netProfitPerTon = Math.max(0, grossProfitPerTon - totalGravityPenaltyCrPerTon);

  if (query.minProfitPerTon && netProfitPerTon < query.minProfitPerTon) {
    return null;
  }

  // Cargo volume limited by: ship cargo capacity, wallet budget, source stock, target demand
  const affordableUnits = query.budgetCredits > 0 ? Math.floor(query.budgetCredits / buyPrice) : query.cargoCapacity;
  const stockLimit = source.supply > 0 ? source.supply : query.cargoCapacity;
  const demandLimit = target.demand > 0 ? target.demand : query.cargoCapacity;

  const unitsTraded = Math.max(0, Math.min(query.cargoCapacity, affordableUnits, stockLimit, demandLimit));
  if (unitsTraded <= 0) return null;

  const totalCostCr = unitsTraded * buyPrice;
  const totalGrossProfit = unitsTraded * grossProfitPerTon;
  const totalNetProfit = unitsTraded * netProfitPerTon;

  // Flight time computation:
  // Undocking (45s) + Hyperspace Jump (45s) + Target SC + Docking (60s) + Planetary glide if any
  const scSeconds = estimateSupercruiseTimeSeconds(target.distanceLs);
  const totalSeconds = 45 + 45 + scSeconds + 60 + srcPenalty.extraTimeSeconds + tgtPenalty.extraTimeSeconds;
  const flightMin = Math.max(2.5, Number((totalSeconds / 60).toFixed(1)));

  const hours = flightMin / 60;
  const estimatedCrPerHour = Math.round(totalNetProfit / hours);

  return {
    id: `${source.stationId}->${target.stationId}_${source.commodityName}`,
    commodityName: source.commodityName,
    commodityCategory: source.commodityCategory,
    sourceSystem: source.systemName,
    sourceStation: source.stationName,
    sourcePadSize: source.maxLandingPad,
    sourceDistanceLs: source.distanceLs,
    sourceIsPlanetary: source.isPlanetary,
    sourceGravityG: srcGrav,
    sourceBuyPrice: buyPrice,
    sourceSupply: source.supply,
    sourceUpdatedAt: source.marketUpdatedAt,
    targetSystem: target.systemName,
    targetStation: target.stationName,
    targetPadSize: target.maxLandingPad,
    targetDistanceLs: target.distanceLs,
    targetIsPlanetary: target.isPlanetary,
    targetGravityG: tgtGrav,
    targetSellPrice: sellPrice,
    targetDemand: target.demand,
    targetUpdatedAt: target.marketUpdatedAt,
    jumpDistanceLy: distLy,
    jumpsCount: 1,
    unitsTraded,
    totalCostCr,
    grossProfitPerTon,
    netProfitPerTon,
    totalGrossProfit,
    totalNetProfit,
    estimatedFlightDurationMin: flightMin,
    estimatedCrPerHour,
    sourceCoords: source.coords,
    targetCoords: target.coords,
  };
}

/**
 * Offline fallback Single-Hop routing engine that matches commodity pairs
 * between canonical high-fidelity stations within jump range.
 */
export function calculateOfflineSingleHopTrades(
  query: SingleHopQuery,
  stationsCatalog: StationMarketRecord[] = CANONICAL_MARKET_STATIONS
): SingleHopTradeOpportunity[] {
  const sourceNameClean = query.currentSystem.trim().toLowerCase();
  const stationNameClean = query.currentStation?.trim().toLowerCase();

  // Find source stations matching origin system (or all if wildcard/not found)
  let originCandidates = stationsCatalog.filter((s) => {
    const matchSys = s.systemName.toLowerCase() === sourceNameClean;
    if (stationNameClean && stationNameClean.length > 0) {
      return matchSys && s.stationName.toLowerCase().includes(stationNameClean);
    }
    return matchSys;
  });

  // If no source station found in current system, take stations closest to origin or all stations as candidates
  if (originCandidates.length === 0) {
    originCandidates = stationsCatalog.slice(0, 15);
  }

  const results: SingleHopTradeOpportunity[] = [];

  for (const src of originCandidates) {
    // Look for target stations that buy this commodity
    const targets = stationsCatalog.filter(
      (tgt) =>
        tgt.commodityName.toLowerCase() === src.commodityName.toLowerCase() &&
        (tgt.stationId !== src.stationId || tgt.systemName !== src.systemName)
    );

    for (const tgt of targets) {
      const opp = calculateSingleHopOpportunity(src, tgt, query);
      if (opp) {
        results.push(opp);
      }
    }
  }

  // Sort by net profit per ton descending
  results.sort((a, b) => b.netProfitPerTon - a.netProfitPerTon);

  return results;
}

// ============================================================================
// Stage 6.3: Multi-Stop Circular Trade Loop Router & Cr/Hour Optimizer
// ============================================================================

export interface CircularLoopQuery {
  currentSystem: string;
  currentStation?: string;
  hopsCount: 2 | 3 | 4;          // 2-hop, 3-hop, or 4-hop circular loop
  cargoCapacity: number;         // Tons
  budgetCredits: number;         // Current Credits
  maxJumpRangeLy: number;        // Loaded jump range
  padSize: LandingPadSize | 'Any';
  includePlanetary: boolean;
  maxAgeHours: number;           // Data age cutoff
  minProfitPerTon?: number;      // Leg minimum profit filter
  fuelTankCapacityTons?: number; // Ship fuel tank (e.g. 32T / 64T)
  fuelConsumptionPerLy?: number; // Avg fuel burn per Ly (e.g. 0.8T/Ly)
  requireFuelStops?: boolean;    // Flag fuel stop needs
}

export interface TradeLoopLeg {
  legIndex: number;
  fromSystem: string;
  fromStation: string;
  fromPadSize: LandingPadSize;
  fromDistanceLs: number;
  fromIsPlanetary: boolean;
  commodityName: string;
  commodityCategory: CommodityCategory;
  buyPrice: number;
  toSystem: string;
  toStation: string;
  toPadSize: LandingPadSize;
  toDistanceLs: number;
  toIsPlanetary: boolean;
  sellPrice: number;
  jumpDistanceLy: number;
  jumpsCount: number;
  unitsTraded: number;
  grossProfitPerTon: number;
  netProfitPerTon: number;
  legNetProfit: number;
  legDurationMinutes: number;
  needsFuelStop: boolean;
  navigationInstruction: string;
  fromCoords?: { x: number; y: number; z: number };
  toCoords?: { x: number; y: number; z: number };
}

export interface CircularTradeLoop {
  id: string;
  originSystem: string;
  originStation: string;
  hopsCount: number;
  totalDistanceLy: number;
  totalJumps: number;
  totalRoundTripMinutes: number;
  totalNetProfitCr: number;
  profitPerTonPerRound: number;
  crPerHour: number;
  fuelStopRequired: boolean;
  legs: TradeLoopLeg[];
}

/**
 * Calculates estimated flight duration for an individual trade leg:
 * Includes Undocking (45s) + Hyperspace Jumps (45s per jump) + Supercruise travel (t = A * d^0.33)
 * + Planetary glide/descent penalty + Docking (60s).
 */
export function calculateLegDurationMinutes(
  jumpDistanceLy: number,
  jumpsCount: number,
  targetDistanceLs: number,
  sourceIsPlanetary: boolean,
  targetIsPlanetary: boolean
): number {
  const undockSec = 45;
  const jumpsSec = Math.max(1, jumpsCount) * 45;
  const scSec = estimateSupercruiseTimeSeconds(targetDistanceLs);
  const srcPenalty = calculatePlanetaryLandingPenalty(sourceIsPlanetary, 1.1);
  const tgtPenalty = calculatePlanetaryLandingPenalty(targetIsPlanetary, 1.1);
  const dockSec = 60;

  const totalSec = undockSec + jumpsSec + scSec + srcPenalty.extraTimeSeconds + tgtPenalty.extraTimeSeconds + dockSec;
  return Number((totalSec / 60).toFixed(1));
}

/**
 * Evaluates whether a leg or series of legs exceeds fuel range without scoop/station refuel.
 */
export function evaluateFuelConstraint(
  distanceLy: number,
  fuelTankTons = 32,
  fuelPerLy = 0.8
): boolean {
  const maxRangeOnTank = fuelTankTons / Math.max(0.1, fuelPerLy);
  return distanceLy > maxRangeOnTank * 0.85; // Flag if leg distance consumes > 85% of full tank
}

/**
 * Computes a single directional leg between two stations for a given commodity.
 */
export function computeTradeLeg(
  from: StationMarketRecord,
  to: StationMarketRecord,
  legIndex: number,
  query: CircularLoopQuery
): TradeLoopLeg | null {
  // Pad size compatibility
  if (query.padSize === 'Large') {
    if (from.maxLandingPad !== 'Large' || to.maxLandingPad !== 'Large') return null;
  } else if (query.padSize === 'Medium') {
    if (from.maxLandingPad === 'Small' || to.maxLandingPad === 'Small') return null;
  }

  // Planetary filter
  if (!query.includePlanetary && (from.isPlanetary || to.isPlanetary)) {
    return null;
  }

  // Same station check
  if (from.stationId === to.stationId && from.systemName === to.systemName) {
    return null;
  }

  // Distance check
  const dx = (to.coords?.x ?? 0) - (from.coords?.x ?? 0);
  const dy = (to.coords?.y ?? 0) - (from.coords?.y ?? 0);
  const dz = (to.coords?.z ?? 0) - (from.coords?.z ?? 0);
  const distLy = Math.max(0.1, Number(Math.hypot(dx, dy, dz).toFixed(2)));

  const maxRange = query.maxJumpRangeLy > 0 ? query.maxJumpRangeLy : 35.0;
  const jumpsCount = Math.ceil(distLy / maxRange);

  // Commodity profitability check
  if (from.buyPrice <= 0 || to.sellPrice <= 0) return null;
  const grossProfitPerTon = to.sellPrice - from.buyPrice;
  if (grossProfitPerTon <= 0) return null;

  // Planetary gravity penalties
  const srcPenalty = calculatePlanetaryLandingPenalty(from.isPlanetary, 1.1);
  const tgtPenalty = calculatePlanetaryLandingPenalty(to.isPlanetary, 1.1);
  const gravityPenalties = srcPenalty.gravityCrPerTonPenalty + tgtPenalty.gravityCrPerTonPenalty;
  const netProfitPerTon = Math.max(0, grossProfitPerTon - gravityPenalties);

  if (query.minProfitPerTon && netProfitPerTon < query.minProfitPerTon) {
    return null;
  }

  // Units traded
  const affordableUnits = query.budgetCredits > 0 ? Math.floor(query.budgetCredits / from.buyPrice) : query.cargoCapacity;
  const stockLimit = from.supply > 0 ? from.supply : query.cargoCapacity;
  const demandLimit = to.demand > 0 ? to.demand : query.cargoCapacity;
  const unitsTraded = Math.max(0, Math.min(query.cargoCapacity, affordableUnits, stockLimit, demandLimit));
  if (unitsTraded <= 0) return null;

  const legNetProfit = unitsTraded * netProfitPerTon;
  const legDurationMinutes = calculateLegDurationMinutes(
    distLy,
    jumpsCount,
    to.distanceLs,
    from.isPlanetary,
    to.isPlanetary
  );

  const needsFuelStop = evaluateFuelConstraint(
    distLy,
    query.fuelTankCapacityTons ?? 32,
    query.fuelConsumptionPerLy ?? 0.8
  );

  const navigationInstruction = `Buy [${from.commodityName}] at [${from.stationName}] (${from.systemName}) -> Jump (${distLy} Ly, ${jumpsCount} ${jumpsCount > 1 ? 'jumps' : 'jump'}) -> Sell at [${to.stationName}] (${to.systemName})`;

  return {
    legIndex,
    fromSystem: from.systemName,
    fromStation: from.stationName,
    fromPadSize: from.maxLandingPad,
    fromDistanceLs: from.distanceLs,
    fromIsPlanetary: from.isPlanetary,
    commodityName: from.commodityName,
    commodityCategory: from.commodityCategory,
    buyPrice: from.buyPrice,
    toSystem: to.systemName,
    toStation: to.stationName,
    toPadSize: to.maxLandingPad,
    toDistanceLs: to.distanceLs,
    toIsPlanetary: to.isPlanetary,
    sellPrice: to.sellPrice,
    jumpDistanceLy: distLy,
    jumpsCount,
    unitsTraded,
    grossProfitPerTon,
    netProfitPerTon,
    legNetProfit,
    legDurationMinutes,
    needsFuelStop,
    navigationInstruction,
    fromCoords: from.coords,
    toCoords: to.coords,
  };
}

/**
 * Offline simulation loop router for 2-hop, 3-hop, and 4-hop circular itineraries.
 * Synthesizes cross-station bilateral or multilateral commodity trade pairings.
 */
export function calculateOfflineCircularLoops(
  query: CircularLoopQuery,
  stationsCatalog: StationMarketRecord[] = CANONICAL_MARKET_STATIONS
): CircularTradeLoop[] {
  const originClean = query.currentSystem.trim().toLowerCase();
  const stationClean = query.currentStation?.trim().toLowerCase();

  // Find candidate origin stations
  let originStations = stationsCatalog.filter((s) => {
    const match = s.systemName.toLowerCase() === originClean;
    if (stationClean && stationClean.length > 0) {
      return match && s.stationName.toLowerCase().includes(stationClean);
    }
    return match;
  });

  if (originStations.length === 0) {
    originStations = stationsCatalog.slice(0, 10);
  }

  // Pre-filter stations by landing pad & planetary constraints
  const eligibleStations = stationsCatalog.filter((st) => {
    if (query.padSize === 'Large' && st.maxLandingPad !== 'Large') return false;
    if (query.padSize === 'Medium' && st.maxLandingPad === 'Small') return false;
    if (!query.includePlanetary && st.isPlanetary) return false;
    return true;
  });

  const loops: CircularTradeLoop[] = [];

  for (const origin of originStations) {
    if (query.hopsCount === 2) {
      // 2-Hop Circular Loop: Origin -> St2 -> Origin
      for (const st2 of eligibleStations) {
        if (st2.stationId === origin.stationId && st2.systemName === origin.systemName) continue;

        // Leg 1: Origin -> St2
        // Find commodity at Origin that St2 buys profitably
        const leg1CommodityOrigins = eligibleStations.filter(
          (s) => s.stationId === origin.stationId && s.systemName === origin.systemName
        );
        const leg2CommoditySt2s = eligibleStations.filter(
          (s) => s.stationId === st2.stationId && s.systemName === st2.systemName
        );

        for (const src1 of leg1CommodityOrigins) {
          // Find matching commodity sell at st2
          const tgt1Candidates = eligibleStations.filter(
            (s) =>
              s.stationId === st2.stationId &&
              s.systemName === st2.systemName &&
              s.commodityName.toLowerCase() === src1.commodityName.toLowerCase()
          );

          for (const tgt1 of tgt1Candidates) {
            const leg1 = computeTradeLeg(src1, tgt1, 1, query);
            if (!leg1) continue;

            // Leg 2: St2 -> Origin
            for (const src2 of leg2CommoditySt2s) {
              const tgt2Candidates = eligibleStations.filter(
                (s) =>
                  s.stationId === origin.stationId &&
                  s.systemName === origin.systemName &&
                  s.commodityName.toLowerCase() === src2.commodityName.toLowerCase()
              );

              for (const tgt2 of tgt2Candidates) {
                const leg2 = computeTradeLeg(src2, tgt2, 2, query);
                if (!leg2) continue;

                // Found complete 2-hop circular loop!
                const totalDist = Number((leg1.jumpDistanceLy + leg2.jumpDistanceLy).toFixed(2));
                const totalJumps = leg1.jumpsCount + leg2.jumpsCount;
                const totalDuration = Number((leg1.legDurationMinutes + leg2.legDurationMinutes).toFixed(1));
                const totalProfit = leg1.legNetProfit + leg2.legNetProfit;
                const profitPerTon = leg1.netProfitPerTon + leg2.netProfitPerTon;
                const hours = Math.max(0.05, totalDuration / 60);
                const crPerHour = Math.round(totalProfit / hours);

                loops.push({
                  id: `loop_2hop_${origin.stationId}_${st2.stationId}_${leg1.commodityName}_${leg2.commodityName}`,
                  originSystem: origin.systemName,
                  originStation: origin.stationName,
                  hopsCount: 2,
                  totalDistanceLy: totalDist,
                  totalJumps,
                  totalRoundTripMinutes: totalDuration,
                  totalNetProfitCr: totalProfit,
                  profitPerTonPerRound: profitPerTon,
                  crPerHour,
                  fuelStopRequired: leg1.needsFuelStop || leg2.needsFuelStop,
                  legs: [leg1, leg2],
                });
              }
            }
          }
        }
      }
    } else if (query.hopsCount === 3) {
      // 3-Hop Circular Loop: Origin -> St2 -> St3 -> Origin
      for (const st2 of eligibleStations.slice(0, 8)) {
        if (st2.stationId === origin.stationId) continue;
        for (const st3 of eligibleStations.slice(0, 8)) {
          if (st3.stationId === st2.stationId || st3.stationId === origin.stationId) continue;

          // Attempt to build legs
          const leg1 = computeTradeLeg(origin, st2, 1, query);
          const leg2 = computeTradeLeg(st2, st3, 2, query);
          const leg3 = computeTradeLeg(st3, origin, 3, query);

          if (leg1 && leg2 && leg3) {
            const totalDist = Number((leg1.jumpDistanceLy + leg2.jumpDistanceLy + leg3.jumpDistanceLy).toFixed(2));
            const totalJumps = leg1.jumpsCount + leg2.jumpsCount + leg3.jumpsCount;
            const totalDuration = Number((leg1.legDurationMinutes + leg2.legDurationMinutes + leg3.legDurationMinutes).toFixed(1));
            const totalProfit = leg1.legNetProfit + leg2.legNetProfit + leg3.legNetProfit;
            const profitPerTon = leg1.netProfitPerTon + leg2.netProfitPerTon + leg3.netProfitPerTon;
            const hours = Math.max(0.05, totalDuration / 60);
            const crPerHour = Math.round(totalProfit / hours);

            loops.push({
              id: `loop_3hop_${origin.stationId}_${st2.stationId}_${st3.stationId}`,
              originSystem: origin.systemName,
              originStation: origin.stationName,
              hopsCount: 3,
              totalDistanceLy: totalDist,
              totalJumps,
              totalRoundTripMinutes: totalDuration,
              totalNetProfitCr: totalProfit,
              profitPerTonPerRound: profitPerTon,
              crPerHour,
              fuelStopRequired: leg1.needsFuelStop || leg2.needsFuelStop || leg3.needsFuelStop,
              legs: [leg1, leg2, leg3],
            });
          }
        }
      }
    } else if (query.hopsCount === 4) {
      // 4-Hop Circular Loop: Origin -> St2 -> St3 -> St4 -> Origin
      for (const st2 of eligibleStations.slice(0, 5)) {
        if (st2.stationId === origin.stationId) continue;
        for (const st3 of eligibleStations.slice(0, 5)) {
          if (st3.stationId === st2.stationId || st3.stationId === origin.stationId) continue;
          for (const st4 of eligibleStations.slice(0, 5)) {
            if (st4.stationId === st3.stationId || st4.stationId === st2.stationId || st4.stationId === origin.stationId) continue;

            const leg1 = computeTradeLeg(origin, st2, 1, query);
            const leg2 = computeTradeLeg(st2, st3, 2, query);
            const leg3 = computeTradeLeg(st3, st4, 3, query);
            const leg4 = computeTradeLeg(st4, origin, 4, query);

            if (leg1 && leg2 && leg3 && leg4) {
              const totalDist = Number((leg1.jumpDistanceLy + leg2.jumpDistanceLy + leg3.jumpDistanceLy + leg4.jumpDistanceLy).toFixed(2));
              const totalJumps = leg1.jumpsCount + leg2.jumpsCount + leg3.jumpsCount + leg4.jumpsCount;
              const totalDuration = Number((leg1.legDurationMinutes + leg2.legDurationMinutes + leg3.legDurationMinutes + leg4.legDurationMinutes).toFixed(1));
              const totalProfit = leg1.legNetProfit + leg2.legNetProfit + leg3.legNetProfit + leg4.legNetProfit;
              const profitPerTon = leg1.netProfitPerTon + leg2.netProfitPerTon + leg3.netProfitPerTon + leg4.netProfitPerTon;
              const hours = Math.max(0.05, totalDuration / 60);
              const crPerHour = Math.round(totalProfit / hours);

              loops.push({
                id: `loop_4hop_${origin.stationId}_${st2.stationId}_${st3.stationId}_${st4.stationId}`,
                originSystem: origin.systemName,
                originStation: origin.stationName,
                hopsCount: 4,
                totalDistanceLy: totalDist,
                totalJumps,
                totalRoundTripMinutes: totalDuration,
                totalNetProfitCr: totalProfit,
                profitPerTonPerRound: profitPerTon,
                crPerHour,
                fuelStopRequired: leg1.needsFuelStop || leg2.needsFuelStop || leg3.needsFuelStop || leg4.needsFuelStop,
                legs: [leg1, leg2, leg3, leg4],
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate and sort by Cr/Hour descending
  const uniqueMap = new Map<string, CircularTradeLoop>();
  for (const l of loops) {
    if (!uniqueMap.has(l.id)) {
      uniqueMap.set(l.id, l);
    }
  }

  const sorted = Array.from(uniqueMap.values());
  sorted.sort((a, b) => b.crPerHour - a.crPerHour);

  return sorted;
}

/**
 * ============================================================================
 * Stage 6.4: Black Market Smuggling Engine & Illicit Goods Navigator
 * ============================================================================
 */

export type SecurityLevel = 'Low' | 'Medium' | 'High' | 'Anarchy';
export type GovernmentType =
  | 'Anarchy'
  | 'Corporate'
  | 'Democracy'
  | 'Confederacy'
  | 'Dictatorship'
  | 'Feudal'
  | 'Patronage'
  | 'Theocracy'
  | 'Prison'
  | 'None';
export type AllegianceType = 'Federation' | 'Empire' | 'Alliance' | 'Independent';

export interface StationBlackMarketInfo {
  stationId: string;
  stationName: string;
  systemName: string;
  hasBlackMarket: boolean;
  government: GovernmentType;
  allegiance: AllegianceType;
  securityLevel: SecurityLevel;
  prohibitedCommodities: string[];
  policePatrolDensity: 'None' | 'Sparse' | 'Moderate' | 'Heavy' | 'Extreme';
  scanningRiskScore: number; // 0 to 100%
  heatSignatureThreshold: number; // e.g., 20% thermal limit for silent running
}

export interface SmugglingQuery {
  currentSystem: string;
  currentStation?: string;
  cargoCapacity: number;
  budgetCredits: number;
  maxJumpRangeLy: number;
  padSize: LandingPadSize | 'Any';
  includePlanetary: boolean;
  maxAgeHours: number;
  targetJurisdiction?: 'All' | 'Non-Anarchy Black Markets' | 'Anarchy Safe Havens';
  illicitCommodityFilter?: string; // e.g. Battle Weapons, Imperial Slaves, etc.
  cargoCondition?: 'Legal Purchase' | 'Stolen / Salvaged';
}

export interface SmugglingRouteOpportunity {
  id: string;
  commodityName: string;
  commodityCategory: CommodityCategory;
  isStolen: boolean;
  // Origin (Where to acquire legally or cheaply, e.g. Anarchy or producer hub)
  sourceSystem: string;
  sourceStation: string;
  sourcePadSize: LandingPadSize;
  sourceDistanceLs: number;
  sourceIsPlanetary: boolean;
  sourceBuyPrice: number;
  sourceSupply: number;
  sourceGovernment: GovernmentType;
  sourceSecurity: SecurityLevel;
  sourceLegality: 'Legal' | 'Illicit';
  // Destination (Where to smuggle into Black Market or fence in Anarchy safe haven)
  targetSystem: string;
  targetStation: string;
  targetPadSize: LandingPadSize;
  targetDistanceLs: number;
  targetIsPlanetary: boolean;
  targetBlackMarketPrice: number;
  targetDemand: number;
  targetGovernment: GovernmentType;
  targetAllegiance: AllegianceType;
  targetSecurity: SecurityLevel;
  targetHasBlackMarket: boolean;
  targetLegality: 'Prohibited (Smuggle)' | 'Legal (Safe Haven)';
  // Threat & Navigation Indicators
  policePatrolDensity: 'None' | 'Sparse' | 'Moderate' | 'Heavy' | 'Extreme';
  scanningRiskFactor: number; // 0% - 100%
  fineRiskCreditsPerTon: number; // Potential fine if caught with illegal cargo
  jumpDistanceLy: number;
  jumpsCount: number;
  unitsTraded: number;
  totalInvestmentCr: number;
  grossProfitPerTon: number;
  netProfitPerTon: number;
  totalNetProfit: number;
  estimatedFlightDurationMin: number;
  estimatedCrPerHour: number;
  smugglingTips: string[];
  sourceCoords?: { x: number; y: number; z: number };
  targetCoords?: { x: number; y: number; z: number };
}

/**
 * Standard illicit and regulated goods cross-referenced with jurisdiction legality rules.
 */
export const ILLICIT_COMMODITY_RULES: Record<
  string,
  {
    prohibitedIn: {
      allegiances?: AllegianceType[];
      governments?: GovernmentType[];
      exceptAnarchy?: boolean;
    };
    galacticAverage: number;
    baseBlackMarketMarkup: number; // Multiplier on standard market demand sell price
    stolenAcquisitionDiscount: number; // If stolen/salvaged, cost = 0 or steep fence markdown
    fineRatio: number; // Fine as multiplier of commodity galactic average if caught scanning
  }
> = {
  'Battle Weapons': {
    prohibitedIn: {
      governments: ['Democracy', 'Corporate', 'Confederacy'],
      exceptAnarchy: true,
    },
    galacticAverage: 8400,
    baseBlackMarketMarkup: 1.55,
    stolenAcquisitionDiscount: 0.65,
    fineRatio: 3.5,
  },
  'Personal Weapons': {
    prohibitedIn: {
      governments: ['Democracy', 'Corporate'],
      exceptAnarchy: true,
    },
    galacticAverage: 5200,
    baseBlackMarketMarkup: 1.45,
    stolenAcquisitionDiscount: 0.65,
    fineRatio: 2.5,
  },
  'Slaves': {
    prohibitedIn: {
      allegiances: ['Federation', 'Alliance'],
      governments: ['Democracy', 'Corporate', 'Confederacy', 'Patronage', 'Theocracy'],
      exceptAnarchy: true,
    },
    galacticAverage: 12300,
    baseBlackMarketMarkup: 1.85,
    stolenAcquisitionDiscount: 0.55,
    fineRatio: 4.0,
  },
  'Imperial Slaves': {
    prohibitedIn: {
      allegiances: ['Federation', 'Alliance'],
      governments: ['Democracy', 'Corporate', 'Confederacy'],
      exceptAnarchy: true,
    },
    galacticAverage: 17200,
    baseBlackMarketMarkup: 1.70,
    stolenAcquisitionDiscount: 0.60,
    fineRatio: 3.8,
  },
  'Narcotics': {
    prohibitedIn: {
      governments: ['Democracy', 'Corporate', 'Theocracy', 'Dictatorship'],
      exceptAnarchy: true,
    },
    galacticAverage: 9500,
    baseBlackMarketMarkup: 1.60,
    stolenAcquisitionDiscount: 0.60,
    fineRatio: 3.0,
  },
  'Combat Stabilisers': {
    prohibitedIn: {
      governments: ['Democracy', 'Confederacy'],
      exceptAnarchy: true,
    },
    galacticAverage: 10500,
    baseBlackMarketMarkup: 1.40,
    stolenAcquisitionDiscount: 0.70,
    fineRatio: 2.0,
  },
  'Tobacco': {
    prohibitedIn: {
      governments: ['Theocracy'],
      exceptAnarchy: true,
    },
    galacticAverage: 6100,
    baseBlackMarketMarkup: 1.30,
    stolenAcquisitionDiscount: 0.75,
    fineRatio: 1.5,
  },
};

/**
 * Registry of known station Black Markets and Jurisdictions.
 */
export const CANONICAL_BLACK_MARKETS: StationBlackMarketInfo[] = [
  // Sol System (High Security Federation Hub - Black Market available at M. Gorbachev & Daedalus)
  {
    stationId: 'st_sol_mth',
    stationName: "M. Gorbachev",
    systemName: 'Sol',
    hasBlackMarket: true,
    government: 'Democracy',
    allegiance: 'Federation',
    securityLevel: 'High',
    prohibitedCommodities: ['Battle Weapons', 'Personal Weapons', 'Slaves', 'Imperial Slaves', 'Narcotics'],
    policePatrolDensity: 'Heavy',
    scanningRiskScore: 78,
    heatSignatureThreshold: 18,
  },
  {
    stationId: 'st_sol_daedalus',
    stationName: 'Daedalus',
    systemName: 'Sol',
    hasBlackMarket: true,
    government: 'Democracy',
    allegiance: 'Federation',
    securityLevel: 'High',
    prohibitedCommodities: ['Battle Weapons', 'Personal Weapons', 'Slaves', 'Imperial Slaves', 'Narcotics'],
    policePatrolDensity: 'Heavy',
    scanningRiskScore: 75,
    heatSignatureThreshold: 18,
  },
  // Alpha Centauri (Medium Security Anarchy-adjacent outpost)
  {
    stationId: 'st_alfa_centauri_hut',
    stationName: 'Hutton Orbital',
    systemName: 'Alpha Centauri',
    hasBlackMarket: true,
    government: 'Democracy',
    allegiance: 'Federation',
    securityLevel: 'Medium',
    prohibitedCommodities: ['Slaves', 'Imperial Slaves', 'Battle Weapons'],
    policePatrolDensity: 'Sparse',
    scanningRiskScore: 32,
    heatSignatureThreshold: 25,
  },
  // Wolf 359 (Corporate Medium Security)
  {
    stationId: 'st_wolf_sullivan',
    stationName: 'Sullivan Base',
    systemName: 'Wolf 359',
    hasBlackMarket: true,
    government: 'Corporate',
    allegiance: 'Federation',
    securityLevel: 'Medium',
    prohibitedCommodities: ['Battle Weapons', 'Slaves', 'Imperial Slaves', 'Narcotics'],
    policePatrolDensity: 'Moderate',
    scanningRiskScore: 54,
    heatSignatureThreshold: 22,
  },
  {
    stationId: 'st_acheron_mining',
    stationName: 'Acheron Extraction Hub',
    systemName: 'Wolf 359',
    hasBlackMarket: true,
    government: 'Corporate',
    allegiance: 'Federation',
    securityLevel: 'Low',
    prohibitedCommodities: ['Battle Weapons', 'Slaves'],
    policePatrolDensity: 'Sparse',
    scanningRiskScore: 28,
    heatSignatureThreshold: 28,
  },
  // Cubeo (Empire Capital Power Base - Imperial Slaves are LEGAL, but Slaves and Narcotics prohibited)
  {
    stationId: 'st_cubeo_chelomey',
    stationName: 'Chelomey Orbital',
    systemName: 'Cubeo',
    hasBlackMarket: true,
    government: 'Patronage',
    allegiance: 'Empire',
    securityLevel: 'High',
    prohibitedCommodities: ['Slaves', 'Narcotics'],
    policePatrolDensity: 'Heavy',
    scanningRiskScore: 72,
    heatSignatureThreshold: 20,
  },
  {
    stationId: 'st_cubeo_medina',
    stationName: 'Medina Vision',
    systemName: 'Cubeo',
    hasBlackMarket: true,
    government: 'Patronage',
    allegiance: 'Empire',
    securityLevel: 'High',
    prohibitedCommodities: ['Slaves', 'Narcotics'],
    policePatrolDensity: 'Extreme',
    scanningRiskScore: 82,
    heatSignatureThreshold: 17,
  },
  // Shinrarta Dezhra (Founders World - High Security with undercover Black Market contact)
  {
    stationId: 'st_shinrarta_jameson',
    stationName: 'Jameson Memorial',
    systemName: 'Shinrarta Dezhra',
    hasBlackMarket: true,
    government: 'Democracy',
    allegiance: 'Independent',
    securityLevel: 'High',
    prohibitedCommodities: ['Battle Weapons', 'Slaves', 'Imperial Slaves', 'Narcotics'],
    policePatrolDensity: 'Extreme',
    scanningRiskScore: 88,
    heatSignatureThreshold: 15,
  },
  // Lave / Old Worlds Cluster (Dictatorship / Corporate / Anarchy safe havens)
  {
    stationId: 'st_lave_station',
    stationName: 'Lave Station',
    systemName: 'Lave',
    hasBlackMarket: true,
    government: 'Dictatorship',
    allegiance: 'Alliance',
    securityLevel: 'Medium',
    prohibitedCommodities: ['Slaves', 'Imperial Slaves', 'Battle Weapons'],
    policePatrolDensity: 'Moderate',
    scanningRiskScore: 48,
    heatSignatureThreshold: 24,
  },
  {
    stationId: 'st_diso_shifnal',
    stationName: 'Shifnalport',
    systemName: 'Diso',
    hasBlackMarket: true,
    government: 'Democracy',
    allegiance: 'Alliance',
    securityLevel: 'Low',
    prohibitedCommodities: ['Slaves', 'Imperial Slaves'],
    policePatrolDensity: 'Sparse',
    scanningRiskScore: 35,
    heatSignatureThreshold: 26,
  },
  // Anarchy Safe Havens (Zero police patrol, 0% scan risk, ALL illicit goods legal)
  {
    stationId: 'st_archon_pegasi_pirate',
    stationName: 'Smuggler\'s Den',
    systemName: 'Pegasi Sector PN-T b3-0',
    hasBlackMarket: true,
    government: 'Anarchy',
    allegiance: 'Independent',
    securityLevel: 'Anarchy',
    prohibitedCommodities: [],
    policePatrolDensity: 'None',
    scanningRiskScore: 2,
    heatSignatureThreshold: 99,
  },
  {
    stationId: 'st_anarchy_haven_kured',
    stationName: 'Black Rock Citadel',
    systemName: 'Kured',
    hasBlackMarket: true,
    government: 'Anarchy',
    allegiance: 'Independent',
    securityLevel: 'Anarchy',
    prohibitedCommodities: [],
    policePatrolDensity: 'None',
    scanningRiskScore: 0,
    heatSignatureThreshold: 99,
  },
  {
    stationId: 'st_anarchy_haven_maia',
    stationName: 'Obsidian Freeport',
    systemName: 'Maia',
    hasBlackMarket: true,
    government: 'Anarchy',
    allegiance: 'Independent',
    securityLevel: 'Anarchy',
    prohibitedCommodities: [],
    policePatrolDensity: 'None',
    scanningRiskScore: 0,
    heatSignatureThreshold: 99,
  },
];

/**
 * Checks legality of a commodity in a given station/system jurisdiction.
 */
export function checkCommodityLegality(
  commodityName: string,
  government: GovernmentType,
  allegiance: AllegianceType,
  security: SecurityLevel
): { isLegal: boolean; isProhibited: boolean; reason?: string } {
  if (security === 'Anarchy' || government === 'Anarchy') {
    return { isLegal: true, isProhibited: false, reason: 'Anarchy jurisdiction (No law enforcement)' };
  }

  const rule = ILLICIT_COMMODITY_RULES[commodityName];
  if (!rule) {
    return { isLegal: true, isProhibited: false };
  }

  if (rule.prohibitedIn.allegiances && rule.prohibitedIn.allegiances.includes(allegiance)) {
    return {
      isLegal: false,
      isProhibited: true,
      reason: `Prohibited by ${allegiance} interstellar law`,
    };
  }

  if (rule.prohibitedIn.governments && rule.prohibitedIn.governments.includes(government)) {
    return {
      isLegal: false,
      isProhibited: true,
      reason: `Prohibited by local ${government} jurisdiction`,
    };
  }

  return { isLegal: true, isProhibited: false };
}

/**
 * Calculates police patrol density, scanning risk score, and fine penalty.
 */
export function calculateScanningRisk(
  security: SecurityLevel,
  government: GovernmentType,
  distanceLs: number,
  isPlanetary: boolean
): {
  policePatrolDensity: 'None' | 'Sparse' | 'Moderate' | 'Heavy' | 'Extreme';
  scanningRiskScore: number;
} {
  if (security === 'Anarchy' || government === 'Anarchy') {
    return { policePatrolDensity: 'None', scanningRiskScore: 0 };
  }

  let baseRisk = 50;
  let density: 'None' | 'Sparse' | 'Moderate' | 'Heavy' | 'Extreme' = 'Moderate';

  if (security === 'High') {
    baseRisk = 75;
    density = 'Heavy';
  } else if (security === 'Low') {
    baseRisk = 25;
    density = 'Sparse';
  }

  if (isPlanetary) {
    baseRisk -= 10; // Planetary ports have fewer orbital patrol wings
  }

  if (distanceLs > 5000) {
    baseRisk += 5; // Long cruise might attract interdictions
  }

  if (security === 'High' && government === 'Democracy') {
    density = 'Extreme';
    baseRisk = Math.min(95, baseRisk + 12);
  }

  return {
    policePatrolDensity: density,
    scanningRiskScore: Math.max(5, Math.min(95, baseRisk)),
  };
}

/**
 * Smuggling Route Triangulator
 * Computes high-margin smuggling runs from legal producers / anarchy outposts into high-demand Black Markets
 * or from non-anarchy salvage into Anarchy safe havens.
 */
export function calculateOfflineSmugglingRoutes(
  query: SmugglingQuery,
  stationsCatalog: StationMarketRecord[] = CANONICAL_MARKET_STATIONS,
  blackMarketsCatalog: StationBlackMarketInfo[] = CANONICAL_BLACK_MARKETS
): SmugglingRouteOpportunity[] {
  const originClean = query.currentSystem.trim().toLowerCase();
  const maxRange = query.maxJumpRangeLy > 0 ? query.maxJumpRangeLy : 35.0;
  const isStolenCargo = query.cargoCondition === 'Stolen / Salvaged';

  // Merge station info with black market database
  const bmLookup = new Map<string, StationBlackMarketInfo>();
  for (const bm of blackMarketsCatalog) {
    bmLookup.set(`${bm.systemName}::${bm.stationName}`.toLowerCase(), bm);
    bmLookup.set(bm.stationId, bm);
  }

  // Helper to retrieve BM details or build realistic default for station
  function getBmInfo(rec: StationMarketRecord): StationBlackMarketInfo {
    const key = `${rec.systemName}::${rec.stationName}`.toLowerCase();
    const existing = bmLookup.get(key) || bmLookup.get(rec.stationId);
    if (existing) return existing;

    // Default synthesis if not in catalog
    const isAnarchy = rec.systemName.includes('Pegasi') || rec.systemName.includes('Kured');
    return {
      stationId: rec.stationId,
      stationName: rec.stationName,
      systemName: rec.systemName,
      hasBlackMarket: !rec.isPlanetary || isAnarchy,
      government: isAnarchy ? 'Anarchy' : 'Democracy',
      allegiance: isAnarchy ? 'Independent' : 'Federation',
      securityLevel: isAnarchy ? 'Anarchy' : 'Medium',
      prohibitedCommodities: isAnarchy ? [] : ['Battle Weapons', 'Slaves', 'Imperial Slaves'],
      policePatrolDensity: isAnarchy ? 'None' : 'Moderate',
      scanningRiskScore: isAnarchy ? 0 : 50,
      heatSignatureThreshold: 22,
    };
  }

  // Commodities eligible for smuggling
  const illicitNames = Object.keys(ILLICIT_COMMODITY_RULES);

  // Candidate source stations
  const sourceCandidates = stationsCatalog.filter((st) => {
    if (query.padSize === 'Large' && st.maxLandingPad !== 'Large') return false;
    if (query.padSize === 'Medium' && st.maxLandingPad === 'Small') return false;
    if (!query.includePlanetary && st.isPlanetary) return false;
    if (query.illicitCommodityFilter && st.commodityName.toLowerCase() !== query.illicitCommodityFilter.toLowerCase()) {
      return false;
    }
    // Must either be in illicit list or have high demand spread
    return illicitNames.includes(st.commodityName) || st.commodityCategory === 'Weapons' || st.commodityCategory === 'Narcotics';
  });

  // Candidate destination stations (Stations with active Black Markets or Anarchy safe havens)
  const targetCandidates = stationsCatalog.filter((st) => {
    if (query.padSize === 'Large' && st.maxLandingPad !== 'Large') return false;
    if (query.padSize === 'Medium' && st.maxLandingPad === 'Small') return false;
    if (!query.includePlanetary && st.isPlanetary) return false;
    const bm = getBmInfo(st);
    if (!bm.hasBlackMarket) return false;

    if (query.targetJurisdiction === 'Non-Anarchy Black Markets') {
      return bm.securityLevel !== 'Anarchy';
    }
    if (query.targetJurisdiction === 'Anarchy Safe Havens') {
      return bm.securityLevel === 'Anarchy';
    }
    return true;
  });

  const opportunities: SmugglingRouteOpportunity[] = [];

  for (const src of sourceCandidates) {
    const srcBm = getBmInfo(src);
    const rule = ILLICIT_COMMODITY_RULES[src.commodityName] || {
      galacticAverage: src.galacticAverage || 10000,
      baseBlackMarketMarkup: 1.5,
      stolenAcquisitionDiscount: 0.65,
      fineRatio: 3.0,
      prohibitedIn: { exceptAnarchy: true },
    };

    const srcLegality = checkCommodityLegality(src.commodityName, srcBm.government, srcBm.allegiance, srcBm.securityLevel);

    for (const tgt of targetCandidates) {
      if (src.stationId === tgt.stationId && src.systemName === tgt.systemName) continue;

      const tgtBm = getBmInfo(tgt);
      const tgtLegality = checkCommodityLegality(src.commodityName, tgtBm.government, tgtBm.allegiance, tgtBm.securityLevel);

      // We want either:
      // A) Source is legal/cheaper and Target is prohibited (Black Market smuggling run)
      // B) Cargo is stolen and Target has Black Market / Anarchy fence
      // C) Target is Anarchy Safe Haven
      const isTargetProhibited = tgtLegality.isProhibited;
      const isTargetSafeHaven = tgtBm.securityLevel === 'Anarchy';

      if (!isTargetProhibited && !isTargetSafeHaven && !isStolenCargo) {
        continue;
      }

      // Distance
      const dx = (tgt.coords?.x ?? 0) - (src.coords?.x ?? 0);
      const dy = (tgt.coords?.y ?? 0) - (src.coords?.y ?? 0);
      const dz = (tgt.coords?.z ?? 0) - (src.coords?.z ?? 0);
      const distLy = Math.max(0.1, Number(Math.hypot(dx, dy, dz).toFixed(2)));
      const jumpsCount = Math.ceil(distLy / maxRange);

      // Financial Calculation
      // If stolen, cost to pilot is zero Cr purchase (or nominal fence transfer fee)
      // If legal purchase, source.buyPrice
      const buyPrice = isStolenCargo ? 0 : src.buyPrice;

      // Sell Price at Target Black Market:
      // In Elite Dangerous, Black Market pays ~75% of galactic average for stolen goods,
      // but pays a massive 140%-190% premium markup for highly demanded prohibited illicit goods!
      let bmSellPrice = 0;
      if (isStolenCargo) {
        bmSellPrice = Math.round(rule.galacticAverage * 0.75);
      } else {
        const markup = rule.baseBlackMarketMarkup;
        const baseDemandPrice = tgt.sellPrice > 0 ? tgt.sellPrice : rule.galacticAverage;
        bmSellPrice = Math.round(baseDemandPrice * markup);
      }

      const grossProfitPerTon = bmSellPrice - buyPrice;
      if (grossProfitPerTon <= 0) continue;

      // Penalties (fuel, planetary gravity if applicable)
      const srcPen = calculatePlanetaryLandingPenalty(src.isPlanetary, 1.1);
      const tgtPen = calculatePlanetaryLandingPenalty(tgt.isPlanetary, 1.1);
      const netProfitPerTon = Math.max(0, grossProfitPerTon - (srcPen.gravityCrPerTonPenalty + tgtPen.gravityCrPerTonPenalty));

      // Capacity & Units traded
      const affordableUnits = buyPrice > 0 ? Math.floor(query.budgetCredits / buyPrice) : query.cargoCapacity;
      const unitsTraded = Math.min(query.cargoCapacity, affordableUnits, src.supply > 0 ? src.supply : query.cargoCapacity);
      if (unitsTraded <= 0) continue;

      const totalInvestmentCr = buyPrice * unitsTraded;
      const totalNetProfit = netProfitPerTon * unitsTraded;

      const flightDurationMin = calculateLegDurationMinutes(
        distLy,
        jumpsCount,
        tgt.distanceLs,
        src.isPlanetary,
        tgt.isPlanetary
      );

      const hours = Math.max(0.05, flightDurationMin / 60);
      const estimatedCrPerHour = Math.round(totalNetProfit / hours);

      // Scanning risk & patrol density
      const risk = calculateScanningRisk(tgtBm.securityLevel, tgtBm.government, tgt.distanceLs, tgt.isPlanetary);
      const fineRiskCreditsPerTon = isTargetProhibited ? Math.round(rule.galacticAverage * rule.fineRatio) : 0;

      // Stealth runner tactical tips
      const tips: string[] = [];
      if (isTargetSafeHaven) {
        tips.push('Anarchy haven: Zero patrol wings, zero scanning risk. Full safe dock.');
      } else {
        if (risk.scanningRiskScore > 70) {
          tips.push('HIGH RISK: Deploy Heatsink & engage Silent Running at 6km out from mailslot.');
        } else {
          tips.push('Maintain speed above 200 m/s on final axis approach to break security scan locks.');
        }
        if (tgtBm.heatSignatureThreshold < 20) {
          tips.push(`Station thermal sensors active: Keep ship heat signature strictly below ${tgtBm.heatSignatureThreshold}%.`);
        }
        tips.push(`Potential scanning fine: ${formatCredits(fineRiskCreditsPerTon)} Cr/ton if scanned by authority ships.`);
      }

      opportunities.push({
        id: `smuggle_${src.stationId}_${tgt.stationId}_${src.commodityName}_${isStolenCargo ? 'stolen' : 'illicit'}`,
        commodityName: src.commodityName,
        commodityCategory: src.commodityCategory,
        isStolen: isStolenCargo,
        sourceSystem: src.systemName,
        sourceStation: src.stationName,
        sourcePadSize: src.maxLandingPad,
        sourceDistanceLs: src.distanceLs,
        sourceIsPlanetary: src.isPlanetary,
        sourceBuyPrice: buyPrice,
        sourceSupply: src.supply,
        sourceGovernment: srcBm.government,
        sourceSecurity: srcBm.securityLevel,
        sourceLegality: srcLegality.isLegal ? 'Legal' : 'Illicit',
        targetSystem: tgt.systemName,
        targetStation: tgt.stationName,
        targetPadSize: tgt.maxLandingPad,
        targetDistanceLs: tgt.distanceLs,
        targetIsPlanetary: tgt.isPlanetary,
        targetBlackMarketPrice: bmSellPrice,
        targetDemand: tgt.demand > 0 ? tgt.demand : 50000,
        targetGovernment: tgtBm.government,
        targetAllegiance: tgtBm.allegiance,
        targetSecurity: tgtBm.securityLevel,
        targetHasBlackMarket: tgtBm.hasBlackMarket,
        targetLegality: isTargetProhibited ? 'Prohibited (Smuggle)' : 'Legal (Safe Haven)',
        policePatrolDensity: risk.policePatrolDensity,
        scanningRiskFactor: risk.scanningRiskScore,
        fineRiskCreditsPerTon,
        jumpDistanceLy: distLy,
        jumpsCount,
        unitsTraded,
        totalInvestmentCr,
        grossProfitPerTon,
        netProfitPerTon,
        totalNetProfit,
        estimatedFlightDurationMin: flightDurationMin,
        estimatedCrPerHour,
        smugglingTips: tips,
        sourceCoords: src.coords,
        targetCoords: tgt.coords,
      });
    }
  }

  // Sort by net profit per ton descending
  opportunities.sort((a, b) => b.netProfitPerTon - a.netProfitPerTon);

  return opportunities;
}

