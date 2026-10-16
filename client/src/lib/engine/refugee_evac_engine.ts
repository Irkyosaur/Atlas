// Location: atlas/client/src/lib/engine/refugee_evac_engine.ts
// Refugee Evacuation Logistics & Damaged Starport Routing Engine (Stage 14.4)
// High-precision calculations for civilian passenger evacuations, passenger cabin layouts,
// closest Rescue Megaship routing, heat sink management, and caustic decontamination flight protocols.

export type StarportEvacStatus = 'BURNING' | 'ATTACKED' | 'EVACUATING' | 'CRITICAL_MELTDOWN';
export type LandingPadSize = 'S' | 'M' | 'L';
export type CabinClass = 'Economy' | 'Business';

export interface EvacStarportRecord {
  id: string;
  stationName: string;
  systemName: string;
  systemAddress?: string;
  coords: { x: number; y: number; z: number };
  bodyName: string;
  stationType: 'Coriolis' | 'Orbis' | 'Ocellus' | 'Asteroid Base' | 'Planetary Outpost';
  landingPadSize: LandingPadSize;
  evacStatus: StarportEvacStatus;
  interiorTemperatureK: number; // Internal thermal baseline (e.g. 850K - 1100K)
  heatBuildupRatePerSec: number; // Heat gain %/sec inside docking bay without sinks
  causticContaminationRisk: 'LOW' | 'MEDIUM' | 'SEVERE';
  activeRefugeeCount: number; // Number of civilians awaiting immediate extraction
  availableMissionsCount: number;
  assignedRescueMegashipId?: string;
  dangerRating: 'MODERATE' | 'HAZARDOUS' | 'EXTREME';
}

export interface RescueMegashipRecord {
  id: string;
  name: string;
  systemName: string;
  coords: { x: number; y: number; z: number };
  landingPadSize: LandingPadSize; // Megaships have Large pads
  dockingDistanceLs: number;
  allegiance: 'Federation' | 'Empire' | 'Alliance' | 'Independent';
  medicalFacilities: string;
  causticWashdownAvailable: boolean;
  passengerCapacityThreshold: number;
  operationalStatus: 'ACTIVE' | 'HIGH_DEMAND' | 'EVAC_ALERT';
}

export interface CabinModuleSpec {
  size: number; // 2, 3, 4, 5, 6
  cabinClass: CabinClass;
  capacity: number;
  massTons: number;
  costCr: number;
}

export interface ShipCabinConfiguration {
  shipModel: string;
  maxPadSize: LandingPadSize;
  standardJumpRangeLy: number;
  availableOptionalSlots: number[]; // e.g. [6, 6, 6, 5, 5, 4, 3, 2]
  totalEconomyCapacity: number;
  totalBusinessCapacity: number;
  optimalMixCapacity: number;
  optimalMixSlots: { slotSize: number; installedCabin: CabinClass; capacity: number }[];
  heatSinkLaunchersFitted: number;
  causticSinkLaunchersFitted: number;
  estimatedTurnaroundMin: number;
}

export interface EvacuationRoutePlan {
  originStation: EvacStarportRecord;
  destinationMegaship: RescueMegashipRecord;
  oneWayDistanceLy: number;
  roundTripDistanceLy: number;
  estimatedJumpsOneWay: number;
  estimatedJumpsRoundTrip: number;
  flightTimeMinutesRoundTrip: number;
  refugeesPerRun: number;
  runsNeededForEvac: number;
  totalFlightTimeHours: number;
  heatSinkUsageRecommendation: number; // minimum heat sinks per entry/exit
  recommendedSpeedThrustPercent: number;
  decontaminationProcedureRequired: boolean;
}

export interface CausticDeconProtocol {
  step: number;
  action: string;
  thresholdCondition: string;
  systemImpact: string;
  riskMitigation: string;
}

export interface HeatSinkFlightProfile {
  phase: string;
  recommendedSinkDeployPercent: number; // Heat % threshold to pop a sink
  silentRunningSuggested: boolean;
  dockingComputerSafe: boolean; // false inside burning ports!
  proceduralNote: string;
}

/**
 * Standard Passenger Cabin Database (Elite Dangerous specs)
 * Size: 2 to 6
 * Economy & Business configurations
 */
export const PASSENGER_CABIN_SPECS: Record<string, CabinModuleSpec> = {
  '2E': { size: 2, cabinClass: 'Economy', capacity: 2, massTons: 2.5, costCr: 8000 },
  '3E': { size: 3, cabinClass: 'Economy', capacity: 4, massTons: 5.0, costCr: 19000 },
  '4E': { size: 4, cabinClass: 'Economy', capacity: 8, massTons: 10.0, costCr: 45000 },
  '5E': { size: 5, cabinClass: 'Economy', capacity: 16, massTons: 20.0, costCr: 108000 },
  '6E': { size: 6, cabinClass: 'Economy', capacity: 32, massTons: 40.0, costCr: 260000 },

  '2B': { size: 2, cabinClass: 'Business', capacity: 1, massTons: 2.5, costCr: 17000 },
  '3B': { size: 3, cabinClass: 'Business', capacity: 3, massTons: 5.0, costCr: 41000 },
  '4B': { size: 4, cabinClass: 'Business', capacity: 6, massTons: 10.0, costCr: 97000 },
  '5B': { size: 5, cabinClass: 'Business', capacity: 10, massTons: 20.0, costCr: 232000 },
  '6B': { size: 6, cabinClass: 'Business', capacity: 16, massTons: 40.0, costCr: 556000 },
};

/**
 * Canonical Flyable Evacuation Ships presets
 */
export const POPULAR_EVAC_SHIPS: {
  model: string;
  padSize: LandingPadSize;
  optionalSlots: number[];
  defaultJumpLy: number;
  heatSinkHardpoints: number;
  causticSinkHardpoints: number;
}[] = [
  {
    model: 'Python',
    padSize: 'M',
    optionalSlots: [6, 6, 6, 5, 5, 4, 3, 3, 2],
    defaultJumpLy: 28.5,
    heatSinkHardpoints: 3,
    causticSinkHardpoints: 1,
  },
  {
    model: 'Anaconda',
    padSize: 'L',
    optionalSlots: [7, 6, 6, 6, 5, 5, 5, 4, 4, 2, 1, 1],
    defaultJumpLy: 38.0,
    heatSinkHardpoints: 4,
    causticSinkHardpoints: 2,
  },
  {
    model: 'Cutter',
    padSize: 'L',
    optionalSlots: [8, 8, 6, 6, 6, 5, 5, 4, 3, 1],
    defaultJumpLy: 31.0,
    heatSinkHardpoints: 4,
    causticSinkHardpoints: 2,
  },
  {
    model: 'Corvette',
    padSize: 'L',
    optionalSlots: [7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 1],
    defaultJumpLy: 24.5,
    heatSinkHardpoints: 4,
    causticSinkHardpoints: 2,
  },
  {
    model: 'Orca',
    padSize: 'L',
    optionalSlots: [6, 6, 5, 5, 5, 4, 3, 2, 2],
    defaultJumpLy: 34.0,
    heatSinkHardpoints: 3,
    causticSinkHardpoints: 1,
  },
  {
    model: 'Beluga Liner',
    padSize: 'L',
    optionalSlots: [7, 6, 6, 6, 5, 5, 4, 4, 3, 3, 2],
    defaultJumpLy: 29.0,
    heatSinkHardpoints: 4,
    causticSinkHardpoints: 2,
  },
  {
    model: 'Type-7 Transporter',
    padSize: 'L',
    optionalSlots: [6, 6, 6, 5, 5, 5, 4, 3, 2, 2],
    defaultJumpLy: 26.0,
    heatSinkHardpoints: 3,
    causticSinkHardpoints: 1,
  },
  {
    model: 'Asp Explorer',
    padSize: 'M',
    optionalSlots: [6, 5, 3, 3, 3, 2, 2, 1],
    defaultJumpLy: 35.5,
    heatSinkHardpoints: 2,
    causticSinkHardpoints: 1,
  },
];

/**
 * Canonical Active Burning / Damaged Starports under Thargoid attack
 */
export const CANONICAL_BURNING_STARPORTS: EvacStarportRecord[] = [
  {
    id: 'port_weyl_gateway',
    stationName: 'Weyl Gateway',
    systemName: 'Pegasi Sector GW-V b2-1',
    systemAddress: '3932781001',
    coords: { x: 104.1, y: -71.2, z: -81.0 },
    bodyName: 'Pegasi Sector GW-V b2-1 3 a',
    stationType: 'Orbis',
    landingPadSize: 'L',
    evacStatus: 'BURNING',
    interiorTemperatureK: 1020,
    heatBuildupRatePerSec: 6.8,
    causticContaminationRisk: 'SEVERE',
    activeRefugeeCount: 14200,
    availableMissionsCount: 48,
    assignedRescueMegashipId: 'mega_cornwallis',
    dangerRating: 'EXTREME',
  },
  {
    id: 'port_laue_terminal',
    stationName: 'Laue Terminal',
    systemName: 'Pegasi Sector JH-V c2-11',
    systemAddress: '3932781002',
    coords: { x: 112.4, y: -78.1, z: -88.3 },
    bodyName: 'Pegasi Sector JH-V c2-11 2',
    stationType: 'Coriolis',
    landingPadSize: 'L',
    evacStatus: 'ATTACKED',
    interiorTemperatureK: 890,
    heatBuildupRatePerSec: 4.5,
    causticContaminationRisk: 'MEDIUM',
    activeRefugeeCount: 8900,
    availableMissionsCount: 32,
    assignedRescueMegashipId: 'mega_cornwallis',
    dangerRating: 'HAZARDOUS',
  },
  {
    id: 'port_baird_prospect',
    stationName: 'Baird Prospect',
    systemName: 'Col 285 Sector TS-H b11-0',
    systemAddress: '3932782001',
    coords: { x: -115.3, y: -48.0, z: 62.1 },
    bodyName: 'Col 285 Sector TS-H b11-0 1',
    stationType: 'Ocellus',
    landingPadSize: 'L',
    evacStatus: 'BURNING',
    interiorTemperatureK: 1150,
    heatBuildupRatePerSec: 7.9,
    causticContaminationRisk: 'SEVERE',
    activeRefugeeCount: 19800,
    availableMissionsCount: 64,
    assignedRescueMegashipId: 'mega_hms_solitude',
    dangerRating: 'EXTREME',
  },
  {
    id: 'port_feynman_dock',
    stationName: 'Feynman Dock',
    systemName: 'Col 285 Sector YT-F b12-3',
    systemAddress: '3932782002',
    coords: { x: -108.9, y: -42.5, z: 71.4 },
    bodyName: 'Col 285 Sector YT-F b12-3 4 b',
    stationType: 'Coriolis',
    landingPadSize: 'L',
    evacStatus: 'EVACUATING',
    interiorTemperatureK: 780,
    heatBuildupRatePerSec: 3.2,
    causticContaminationRisk: 'LOW',
    activeRefugeeCount: 6400,
    availableMissionsCount: 22,
    assignedRescueMegashipId: 'mega_hms_solitude',
    dangerRating: 'MODERATE',
  },
  {
    id: 'port_turing_station',
    stationName: 'Turing Station',
    systemName: 'HIP 20491',
    systemAddress: '3932783001',
    coords: { x: -84.2, y: -145.0, z: -120.3 },
    bodyName: 'HIP 20491 2',
    stationType: 'Asteroid Base',
    landingPadSize: 'L',
    evacStatus: 'BURNING',
    interiorTemperatureK: 980,
    heatBuildupRatePerSec: 5.9,
    causticContaminationRisk: 'SEVERE',
    activeRefugeeCount: 11500,
    availableMissionsCount: 41,
    assignedRescueMegashipId: 'mega_rescue_one',
    dangerRating: 'HAZARDOUS',
  },
  {
    id: 'port_shirley_ring',
    stationName: 'Shirley Ring',
    systemName: 'HIP 20890',
    systemAddress: '3932783002',
    coords: { x: -91.0, y: -152.1, z: -116.8 },
    bodyName: 'HIP 20890 5',
    stationType: 'Orbis',
    landingPadSize: 'L',
    evacStatus: 'CRITICAL_MELTDOWN',
    interiorTemperatureK: 1280,
    heatBuildupRatePerSec: 9.4,
    causticContaminationRisk: 'SEVERE',
    activeRefugeeCount: 24000,
    availableMissionsCount: 75,
    assignedRescueMegashipId: 'mega_rescue_one',
    dangerRating: 'EXTREME',
  },
];

/**
 * Designated Rescue Megaship Destinations (All have Large landing pads)
 */
export const CANONICAL_RESCUE_MEGASHIPS: RescueMegashipRecord[] = [
  {
    id: 'mega_cornwallis',
    name: 'Rescue Ship Cornwallis',
    systemName: 'Tarach Tor',
    coords: { x: 92.5, y: -64.1, z: -72.0 },
    landingPadSize: 'L',
    dockingDistanceLs: 340,
    allegiance: 'Independent',
    medicalFacilities: 'Class IV Trauma & Severe Burn Intensive Unit',
    causticWashdownAvailable: true,
    passengerCapacityThreshold: 500000,
    operationalStatus: 'ACTIVE',
  },
  {
    id: 'mega_hms_solitude',
    name: 'Rescue Ship Solitude',
    systemName: 'LDS 785',
    coords: { x: -95.0, y: -38.2, z: 54.0 },
    landingPadSize: 'L',
    dockingDistanceLs: 512,
    allegiance: 'Federation',
    medicalFacilities: 'Federal Fleet Evac Center & Bio-Containment Labs',
    causticWashdownAvailable: true,
    passengerCapacityThreshold: 750000,
    operationalStatus: 'HIGH_DEMAND',
  },
  {
    id: 'mega_rescue_one',
    name: 'Rescue Ship Cinder',
    systemName: 'Vandermeer',
    coords: { x: -74.1, y: -130.4, z: -105.0 },
    landingPadSize: 'L',
    dockingDistanceLs: 210,
    allegiance: 'Alliance',
    medicalFacilities: 'Alliance Rapid Disaster Relief Bay & Refugee Triage',
    causticWashdownAvailable: true,
    passengerCapacityThreshold: 600000,
    operationalStatus: 'ACTIVE',
  },
  {
    id: 'mega_goddess_mercy',
    name: 'Rescue Ship Fortitude',
    systemName: 'Arque',
    coords: { x: 34.0, y: -12.5, z: 8.4 },
    landingPadSize: 'L',
    dockingDistanceLs: 680,
    allegiance: 'Empire',
    medicalFacilities: 'Imperial Humanitarian Relief & Field Reconstruction',
    causticWashdownAvailable: true,
    passengerCapacityThreshold: 900000,
    operationalStatus: 'ACTIVE',
  },
];

/**
 * Caustic Decontamination Flight Protocol (Station departure & interdiction response)
 */
export const CAUSTIC_DECON_PROTOCOL: CausticDeconProtocol[] = [
  {
    step: 1,
    action: 'Caustic Hull Sieve Identification',
    thresholdCondition: 'Green caustic sizzle sound, HUD caustic warning, hull HP degradation active',
    systemImpact: 'Continuous hull corrosion at 2.5 - 5.0 HP/sec bypasses normal shields',
    riskMitigation: 'Deploy Caustic Sink Launcher immediately or prepare for Overheat Cleansing',
  },
  {
    step: 2,
    action: 'Emergency Thermal Purge (Burn-Off)',
    thresholdCondition: 'Caustic sinks depleted or no launchers mounted',
    systemImpact: 'Deliberate heat boost to > 180% - 220% internal thermal capacity',
    riskMitigation: 'Activate Silent Running, charge FSD, or boost thrusters to spike temp above 180% until "Caustic Substance Dissolved" announces',
  },
  {
    step: 3,
    action: 'Instant Heat Sink Depressurization',
    thresholdCondition: 'Immediately upon Caustic Dissolved confirmation',
    systemImpact: 'Rapid drop from 200%+ down to < 20% within 3 seconds',
    riskMitigation: 'Eject heat sink immediately to stop internal component cookoff (Power Plant / FSD integrity)',
  },
  {
    step: 4,
    action: 'Megaship Caustic Decon Scrub Field',
    thresholdCondition: 'Final approach to Rescue Megaship within 5km',
    systemImpact: 'External atmospheric washdown vapor clears remaining biological traces',
    riskMitigation: 'Request docking clearance at 7.5km, reduce throttle, land directly on assigned pad for automated bio-scrub',
  },
];

/**
 * Heat Sink Management Guide for High-Temperature Starport Interiors
 */
export const HEAT_SINK_FLIGHT_PROFILE: HeatSinkFlightProfile[] = [
  {
    phase: '1. Mail Slot Ingress (Entry)',
    recommendedSinkDeployPercent: 75,
    silentRunningSuggested: false,
    dockingComputerSafe: false,
    proceduralNote: 'DO NOT USE AUTO-DOCK. Auto-docking computers loiter in the thermal updraft and will cook ship to 150%+ before landing. Align manually at 1.5km, boost through slot.',
  },
  {
    phase: '2. Landing Pad Descent & Touchdown',
    recommendedSinkDeployPercent: 85,
    silentRunningSuggested: false,
    dockingComputerSafe: false,
    proceduralNote: 'Deploy 1st heat sink as soon as landing gear deploys inside the bay. Debris and falling beams cause collision damage. Use night vision to spot obstructions.',
  },
  {
    phase: '3. Evacuation Manifest Boarding',
    recommendedSinkDeployPercent: 90,
    silentRunningSuggested: false,
    dockingComputerSafe: false,
    proceduralNote: 'Once locked to pad, interior hangar elevator lowers instantly. Starport air conditioning stabilizes ship while docked. Fill passenger manifests rapidly.',
  },
  {
    phase: '4. Mail Slot Egress (Departure)',
    recommendedSinkDeployPercent: 70,
    silentRunningSuggested: false,
    dockingComputerSafe: false,
    proceduralNote: 'Take off vertically, align with toaster rack, deploy 2nd heat sink when crossing the threshold. Watch for Thargoid Scythe/Hunter interdictions in mass lock zone.',
  },
  {
    phase: '5. Low Wake Escape & Hyperspace Charge',
    recommendedSinkDeployPercent: 80,
    silentRunningSuggested: false,
    dockingComputerSafe: false,
    proceduralNote: 'Clear 5km station radius, engage FSD immediately. If Thargoids engage, pop heat sink to drop below 20% radar lock and break gimbal convergence.',
  },
];

/**
 * Calculate Euclidean 3D galactic distance in Light Years
 */
export function calculateGalacticDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate optimal passenger cabin allocation for a given set of optional internal module slots.
 * Compares pure Economy vs mixed Economy/Business to maximize civilian throughput.
 */
export function planRefugeeCabinCapacity(
  shipModel: string,
  padSize: LandingPadSize,
  optionalSlotSizes: number[],
  jumpRangeLy = 30.0
): ShipCabinConfiguration {
  const sortedSlots = [...optionalSlotSizes].sort((a, b) => b - a);

  // Pure Economy configuration
  let totalEconomy = 0;
  for (const s of sortedSlots) {
    const capped = Math.min(s, 6);
    const spec = PASSENGER_CABIN_SPECS[`${capped}E`];
    if (spec) {
      totalEconomy += spec.capacity;
    }
  }

  // Pure Business configuration
  let totalBusiness = 0;
  for (const s of sortedSlots) {
    const capped = Math.min(s, 6);
    const spec = PASSENGER_CABIN_SPECS[`${capped}B`];
    if (spec) {
      totalBusiness += spec.capacity;
    }
  }

  // Optimal mix: Economy in largest slots for massive groups,
  // 1-2 Business cabins in smaller slots (size 3-4) for VIP rescue missions which carry high reputation
  let optimalCapacity = 0;
  const optimalMixSlots: { slotSize: number; installedCabin: CabinClass; capacity: number }[] = [];

  for (let i = 0; i < sortedSlots.length; i++) {
    const s = sortedSlots[i];
    const capped = Math.min(s, 6);
    // Put 1 Business cabin in slot index 2 or 3 if slot size <= 4, else Economy
    const useBusiness = i >= 2 && capped <= 4 && capped >= 3 && optimalMixSlots.filter((m) => m.installedCabin === 'Business').length < 2;
    const cabinClass: CabinClass = useBusiness ? 'Business' : 'Economy';
    const key = `${capped}${cabinClass === 'Economy' ? 'E' : 'B'}`;
    const spec = PASSENGER_CABIN_SPECS[key];
    const cap = spec ? spec.capacity : 0;

    optimalCapacity += cap;
    optimalMixSlots.push({
      slotSize: s,
      installedCabin: cabinClass,
      capacity: cap,
    });
  }

  return {
    shipModel,
    maxPadSize: padSize,
    standardJumpRangeLy: jumpRangeLy,
    availableOptionalSlots: sortedSlots,
    totalEconomyCapacity: totalEconomy,
    totalBusinessCapacity: totalBusiness,
    optimalMixCapacity: optimalCapacity,
    optimalMixSlots,
    heatSinkLaunchersFitted: padSize === 'L' ? 4 : 3,
    causticSinkLaunchersFitted: 1,
    estimatedTurnaroundMin: 8.5,
  };
}

/**
 * Identify closest Rescue Megaship destinations with Large landing pads
 */
export function findClosestRescueMegaships(
  originCoords: { x: number; y: number; z: number },
  rescueShips: RescueMegashipRecord[] = CANONICAL_RESCUE_MEGASHIPS
): (RescueMegashipRecord & { distanceLy: number })[] {
  return rescueShips
    .map((ship) => ({
      ...ship,
      distanceLy: Number(calculateGalacticDistance(originCoords, ship.coords).toFixed(2)),
    }))
    .sort((a, b) => a.distanceLy - b.distanceLy);
}

/**
 * Compute round-trip evacuation route plan between attacked starport and closest Rescue Megaship
 */
export function computeEvacuationRoutePlan(
  station: EvacStarportRecord,
  megaship: RescueMegashipRecord,
  shipConfig: ShipCabinConfiguration
): EvacuationRoutePlan {
  const oneWayDistanceLy = Number(calculateGalacticDistance(station.coords, megaship.coords).toFixed(2));
  const roundTripDistanceLy = Number((oneWayDistanceLy * 2).toFixed(2));

  const effectiveJump = Math.max(10.0, shipConfig.standardJumpRangeLy);
  const estimatedJumpsOneWay = Math.max(1, Math.ceil(oneWayDistanceLy / effectiveJump));
  const estimatedJumpsRoundTrip = estimatedJumpsOneWay * 2;

  // Flight time estimates: ~45 sec per jump, plus 3 min station docking/undocking ingress/egress, plus 2 min megaship turnaround
  const jumpTimeMinutesRoundTrip = (estimatedJumpsRoundTrip * 45) / 60;
  const stationOperationsMinutes = 7.0; // Ingress, docking, passenger board, egress, decon
  const flightTimeMinutesRoundTrip = Number((jumpTimeMinutesRoundTrip + stationOperationsMinutes).toFixed(1));

  const refugeesPerRun = shipConfig.totalEconomyCapacity > 0 ? shipConfig.totalEconomyCapacity : 32;
  const runsNeededForEvac = Math.ceil(station.activeRefugeeCount / refugeesPerRun);
  const totalFlightTimeHours = Number(((runsNeededForEvac * flightTimeMinutesRoundTrip) / 60).toFixed(1));

  // Heat sink recommendation based on interior temperature
  const sinksNeeded = station.interiorTemperatureK > 1000 ? 3 : station.interiorTemperatureK > 850 ? 2 : 1;

  return {
    originStation: station,
    destinationMegaship: megaship,
    oneWayDistanceLy,
    roundTripDistanceLy,
    estimatedJumpsOneWay,
    estimatedJumpsRoundTrip,
    flightTimeMinutesRoundTrip,
    refugeesPerRun,
    runsNeededForEvac,
    totalFlightTimeHours,
    heatSinkUsageRecommendation: sinksNeeded,
    recommendedSpeedThrustPercent: station.interiorTemperatureK > 1000 ? 90 : 75,
    decontaminationProcedureRequired: station.causticContaminationRisk === 'SEVERE',
  };
}

/**
 * Filter burning starports by status, search term, or pad size
 */
export function filterEvacStarports(
  starports: EvacStarportRecord[],
  criteria: {
    status?: 'ALL' | StarportEvacStatus;
    searchQuery?: string;
    padSize?: 'ALL' | LandingPadSize;
    dangerRating?: 'ALL' | 'MODERATE' | 'HAZARDOUS' | 'EXTREME';
  }
): EvacStarportRecord[] {
  return starports.filter((p) => {
    if (criteria.status && criteria.status !== 'ALL' && p.evacStatus !== criteria.status) {
      return false;
    }
    if (criteria.padSize && criteria.padSize !== 'ALL' && p.landingPadSize !== criteria.padSize) {
      return false;
    }
    if (criteria.dangerRating && criteria.dangerRating !== 'ALL' && p.dangerRating !== criteria.dangerRating) {
      return false;
    }
    if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
      const q = criteria.searchQuery.toLowerCase().trim();
      const match =
        p.stationName.toLowerCase().includes(q) ||
        p.systemName.toLowerCase().includes(q) ||
        p.stationType.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}
