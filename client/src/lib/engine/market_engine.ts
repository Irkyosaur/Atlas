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
