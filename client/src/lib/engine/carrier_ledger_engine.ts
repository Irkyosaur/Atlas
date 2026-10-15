// Location: atlas/client/src/lib/engine/carrier_ledger_engine.ts
// Fleet Carrier Tritium Depot & Upkeep Ledger Engine (Phase 08, Stage 8.3)

export type CarrierServiceKey =
  | 'refuel'
  | 'repair'
  | 'armory'
  | 'shipyard'
  | 'outfitting'
  | 'vista_genomics'
  | 'pioneer_supplies'
  | 'bartender'
  | 'secure_warehouse'
  | 'universal_cartographics'
  | 'redemption_office';

export type ServiceStatus = 'active' | 'suspended' | 'uninstalled';

export interface CarrierServiceSpec {
  key: CarrierServiceKey;
  name: string;
  category: 'Ship Services' | 'Odyssey Concourse' | 'Administrative';
  icon: string;
  description: string;
  installCostCr: number;
  activeUpkeepCr: number;
  suspendedUpkeepCr: number;
  cargoCapacityTons: number;
  crewRole: string;
}

/**
 * Official Frontier Developments Fleet Carrier Module Schedule
 * Baseline Carrier purchase: 5,000,000,000 CR
 * Baseline weekly upkeep: 5,000,000 CR / week
 * Jump wear cost: 100,000 CR / jump
 * Decommissioning debt threshold: 250,000,000 CR (scrapped after sustained unresolved debt)
 */
export const CARRIER_SERVICE_CATALOG: Record<CarrierServiceKey, CarrierServiceSpec> = {
  refuel: {
    key: 'refuel',
    name: 'Refuel Station',
    category: 'Ship Services',
    icon: '⛽',
    description: 'Allows docked starships to purchase standard ship hydrogen fuel.',
    installCostCr: 40_000_000,
    activeUpkeepCr: 1_500_000, // Frontier live upkeep (40k in early beta, now 1.5M/wk active, 750k suspended)
    suspendedUpkeepCr: 750_000,
    cargoCapacityTons: 500,
    crewRole: 'Fuel Engineer',
  },
  repair: {
    key: 'repair',
    name: 'Repair Crews',
    category: 'Ship Services',
    icon: '🔧',
    description: 'Advanced ship maintenance and hull/canopy repair crews.',
    installCostCr: 50_000_000,
    activeUpkeepCr: 1_500_000,
    suspendedUpkeepCr: 750_000,
    cargoCapacityTons: 180,
    crewRole: 'Chief Mechanic',
  },
  armory: {
    key: 'armory',
    name: 'Armory (Rearm)',
    category: 'Ship Services',
    icon: '🛡️',
    description: 'Munitions restocking, heat sinks, chaff, countermeasures, and limpet fabrication.',
    installCostCr: 95_000_000,
    activeUpkeepCr: 1_500_000,
    suspendedUpkeepCr: 750_000,
    cargoCapacityTons: 250,
    crewRole: 'Chief Armourer',
  },
  shipyard: {
    key: 'shipyard',
    name: 'Shipyard',
    category: 'Ship Services',
    icon: '🚀',
    description: 'Storage, shipyard transfers, and sale of flyable starship hulls.',
    installCostCr: 250_000_000,
    activeUpkeepCr: 6_500_000,
    suspendedUpkeepCr: 1_800_000,
    cargoCapacityTons: 3_000,
    crewRole: 'Shipyard Manager',
  },
  outfitting: {
    key: 'outfitting',
    name: 'Outfitting',
    category: 'Ship Services',
    icon: '⚙️',
    description: 'Modular ship outfitting, hardpoints, internals, and module storehouse.',
    installCostCr: 250_000_000,
    activeUpkeepCr: 5_000_000,
    suspendedUpkeepCr: 1_500_000,
    cargoCapacityTons: 1_750,
    crewRole: 'Outfitting Specialist',
  },
  vista_genomics: {
    key: 'vista_genomics',
    name: 'Vista Genomics',
    category: 'Odyssey Concourse',
    icon: '🧬',
    description: 'Exobiology genetic survey data turning desk with 25% carrier commission.',
    installCostCr: 150_000_000,
    activeUpkeepCr: 1_500_000,
    suspendedUpkeepCr: 700_000,
    cargoCapacityTons: 120,
    crewRole: 'Exobiology Analyst',
  },
  pioneer_supplies: {
    key: 'pioneer_supplies',
    name: 'Pioneer Supplies',
    category: 'Odyssey Concourse',
    icon: '🔫',
    description: 'On-foot personal weapons, Artemis/Maverick suits, and tactical consumables store.',
    installCostCr: 250_000_000,
    activeUpkeepCr: 5_000_000,
    suspendedUpkeepCr: 1_500_000,
    cargoCapacityTons: 200,
    crewRole: 'Quartermaster',
  },
  bartender: {
    key: 'bartender',
    name: 'Concourse Bartender',
    category: 'Odyssey Concourse',
    icon: '🍸',
    description: 'Social lounge bartender enabling player barter of Odyssey engineering data & assets.',
    installCostCr: 200_000_000,
    activeUpkeepCr: 1_750_000,
    suspendedUpkeepCr: 1_250_000,
    cargoCapacityTons: 150,
    crewRole: 'Concourse Host',
  },
  secure_warehouse: {
    key: 'secure_warehouse',
    name: 'Secure Warehouse',
    category: 'Administrative',
    icon: '🗝️',
    description: 'Black market clearinghouse allowing visitors to trade stolen and illicit commodities.',
    installCostCr: 165_000_000,
    activeUpkeepCr: 2_000_000,
    suspendedUpkeepCr: 1_250_000,
    cargoCapacityTons: 250,
    crewRole: 'Smuggling Fence',
  },
  universal_cartographics: {
    key: 'universal_cartographics',
    name: 'Universal Cartographics',
    category: 'Administrative',
    icon: '🗺️',
    description: 'Deep-space exploration cartographic data redemption office with local tariff.',
    installCostCr: 150_000_000,
    activeUpkeepCr: 1_850_000,
    suspendedUpkeepCr: 700_000,
    cargoCapacityTons: 120,
    crewRole: 'Cartographer',
  },
  redemption_office: {
    key: 'redemption_office',
    name: 'Redemption Office',
    category: 'Administrative',
    icon: '⚖️',
    description: 'Interstellar bounties, combat bonds, and codex discovery voucher claims.',
    installCostCr: 150_000_000,
    activeUpkeepCr: 1_850_000,
    suspendedUpkeepCr: 850_000,
    cargoCapacityTons: 100,
    crewRole: 'Bounty Administrator',
  },
};

export const BASELINE_CARRIER_WEEKLY_UPKEEP_CR = 5_000_000;
export const CARRIER_JUMP_OPERATIONAL_COST_CR = 100_000;
export const MAX_TRITIUM_DEPOT_CAPACITY_TONS = 1_000;
export const MAX_CARRIER_CARGO_CAPACITY_TONS = 25_000;
export const DEBT_DECOMMISSION_THRESHOLD_CR = 250_000_000;
export const TRITIUM_LOW_WARNING_THRESHOLD_TONS = 200;

export interface CarrierLedgerState {
  carrierName: string;
  callsign: string;
  currentSystem: string;
  currentBody: string;
  carrierBankBalanceCr: number;
  jumpsPerWeek: number;
  
  // Tritium fuel tracking
  tritiumTankTons: number;      // 0 - 1,000t dedicated tank
  tritiumCargoReservesTons: number; // 0 - 25,000t stored in cargo hold
  otherCargoMassTons: number;   // Non-tritium cargo mass
  
  // Module states
  services: Record<CarrierServiceKey, ServiceStatus>;
  
  // Custom notes or mission profile
  missionProfile: 'Deep Space Explorer' | 'Bubble Trading Hub' | 'Fleet Command' | 'Mining Depot';
  lastUpdatedEpochMs: number;
}

export interface UpkeepCalculation {
  baselineUpkeepCr: number;
  installedModulesCount: number;
  activeModulesCount: number;
  suspendedModulesCount: number;
  modulesUpkeepCr: number;
  jumpCostPerWeekCr: number;
  totalWeeklyUpkeepCr: number;
  monthlyUpkeepCr: number;
  annualUpkeepCr: number;
  
  // Capacity usage
  modulesReservedCargoTons: number;
  totalCargoUsedTons: number;
  freeCargoCapacityTons: number;
  
  // Service itemized breakdown
  serviceBreakdown: Array<{
    spec: CarrierServiceSpec;
    status: ServiceStatus;
    weeklyCostCr: number;
  }>;
}

export interface FinancialRunway {
  carrierBalanceCr: number;
  weeklyBurnRateCr: number;
  weeksRemaining: number;
  monthsRemaining: number;
  daysRemaining: number;
  
  // Decommissioning / debt runway
  debtBufferCr: number; // additional 250M CR buffer before terminal decommissioning
  totalRunwayWeeksWithDebt: number;
  decommissionDateEstimate: string; // ISO or human date
  runwayStatus: 'healthy' | 'caution' | 'critical' | 'debt';
}

export interface TritiumAutonomy {
  tankBalanceTons: number;
  cargoReservesTons: number;
  totalTritiumTons: number;
  tankPercent: number;
  isTankLow: boolean; // < 200t
  
  // Autonomy metrics based on standard 500 LY jump burn curve
  fuelPer500LyJumpTons: number;
  maxJumpsTankOnly: number;
  maxDistanceTankOnlyLy: number;
  maxJumpsTotalReserves: number;
  maxDistanceTotalReservesLy: number;
}

/**
 * Calculates fuel consumption for a given jump distance and cargo mass.
 * Exact Elite Dangerous Fleet Carrier Tritium Formula:
 * Fuel = 5 + floor( (Distance * (Mass + 25000)) / 200000 )
 * Baseline carrier dry mass is 25,000 T.
 */
export function calculateJumpTritiumFuel(distanceLy: number, onboardCargoTons: number): number {
  if (distanceLy <= 0) return 0;
  const clampedDist = Math.min(500.0, Math.max(0.1, distanceLy));
  const clampedCargo = Math.min(25000.0, Math.max(0, onboardCargoTons));
  return 5 + Math.floor((clampedDist * (clampedCargo + 25000.0)) / 200000.0);
}

/**
 * Calculates full weekly upkeep, monthly upkeep, and capacity metrics.
 */
export function calculateCarrierUpkeep(state: CarrierLedgerState): UpkeepCalculation {
  let modulesUpkeepCr = 0;
  let modulesReservedCargoTons = 0;
  let installedModulesCount = 0;
  let activeModulesCount = 0;
  let suspendedModulesCount = 0;

  const serviceBreakdown = (Object.keys(CARRIER_SERVICE_CATALOG) as CarrierServiceKey[]).map((key) => {
    const spec = CARRIER_SERVICE_CATALOG[key];
    const status = state.services[key] || 'uninstalled';
    let cost = 0;

    if (status === 'active') {
      cost = spec.activeUpkeepCr;
      modulesUpkeepCr += cost;
      modulesReservedCargoTons += spec.cargoCapacityTons;
      installedModulesCount++;
      activeModulesCount++;
    } else if (status === 'suspended') {
      cost = spec.suspendedUpkeepCr;
      modulesUpkeepCr += cost;
      modulesReservedCargoTons += spec.cargoCapacityTons;
      installedModulesCount++;
      suspendedModulesCount++;
    }

    return {
      spec,
      status,
      weeklyCostCr: cost,
    };
  });

  const jumpCostPerWeekCr = (Math.max(0, state.jumpsPerWeek) || 0) * CARRIER_JUMP_OPERATIONAL_COST_CR;
  const totalWeeklyUpkeepCr = BASELINE_CARRIER_WEEKLY_UPKEEP_CR + modulesUpkeepCr + jumpCostPerWeekCr;
  const monthlyUpkeepCr = Math.round(totalWeeklyUpkeepCr * 4.285714); // ~30 days / 7
  const annualUpkeepCr = Math.round(totalWeeklyUpkeepCr * 52.142857);

  const totalCargoUsedTons =
    modulesReservedCargoTons +
    Math.max(0, state.tritiumCargoReservesTons) +
    Math.max(0, state.otherCargoMassTons);

  const freeCargoCapacityTons = Math.max(0, MAX_CARRIER_CARGO_CAPACITY_TONS - totalCargoUsedTons);

  return {
    baselineUpkeepCr: BASELINE_CARRIER_WEEKLY_UPKEEP_CR,
    installedModulesCount,
    activeModulesCount,
    suspendedModulesCount,
    modulesUpkeepCr,
    jumpCostPerWeekCr,
    totalWeeklyUpkeepCr,
    monthlyUpkeepCr,
    annualUpkeepCr,
    modulesReservedCargoTons,
    totalCargoUsedTons,
    freeCargoCapacityTons,
    serviceBreakdown,
  };
}

/**
 * Projects financial runway and decommission timeline.
 */
export function calculateFinancialRunway(
  carrierBalanceCr: number,
  weeklyBurnRateCr: number
): FinancialRunway {
  const safeBurn = Math.max(1, weeklyBurnRateCr);
  const weeksRemaining = carrierBalanceCr > 0 ? carrierBalanceCr / safeBurn : 0;
  const monthsRemaining = weeksRemaining / 4.285714;
  const daysRemaining = Math.floor(weeksRemaining * 7);

  // Elite Dangerous gives a 250M debt buffer before ship scrapping
  const totalFundsWithDebt = carrierBalanceCr + DEBT_DECOMMISSION_THRESHOLD_CR;
  const totalRunwayWeeksWithDebt = totalFundsWithDebt > 0 ? totalFundsWithDebt / safeBurn : 0;

  const decommissionTimestamp = Date.now() + totalRunwayWeeksWithDebt * 7 * 24 * 60 * 60 * 1000;
  const decommissionDateEstimate = new Date(decommissionTimestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  let runwayStatus: FinancialRunway['runwayStatus'] = 'healthy';
  if (carrierBalanceCr < 0) {
    runwayStatus = 'debt';
  } else if (weeksRemaining < 4) {
    runwayStatus = 'critical';
  } else if (weeksRemaining < 12) {
    runwayStatus = 'caution';
  }

  return {
    carrierBalanceCr,
    weeklyBurnRateCr,
    weeksRemaining,
    monthsRemaining,
    daysRemaining,
    debtBufferCr: DEBT_DECOMMISSION_THRESHOLD_CR,
    totalRunwayWeeksWithDebt,
    decommissionDateEstimate,
    runwayStatus,
  };
}

/**
 * Computes Tritium fuel autonomy and warning threshold.
 */
export function calculateTritiumAutonomy(
  tankBalanceTons: number,
  cargoReservesTons: number,
  totalCargoLoadTons: number
): TritiumAutonomy {
  const clampedTank = Math.min(MAX_TRITIUM_DEPOT_CAPACITY_TONS, Math.max(0, tankBalanceTons));
  const clampedReserves = Math.max(0, cargoReservesTons);
  const totalTritium = clampedTank + clampedReserves;
  const tankPercent = Math.round((clampedTank / MAX_TRITIUM_DEPOT_CAPACITY_TONS) * 100);
  const isTankLow = clampedTank < TRITIUM_LOW_WARNING_THRESHOLD_TONS;

  // Average 500 LY jump consumption given current cargo weight
  const fuelPer500Ly = calculateJumpTritiumFuel(500, totalCargoLoadTons);
  const safeFuelPerJump = Math.max(1, fuelPer500Ly);

  const maxJumpsTankOnly = Math.floor(clampedTank / safeFuelPerJump);
  const maxDistanceTankOnlyLy = maxJumpsTankOnly * 500;

  const maxJumpsTotalReserves = Math.floor(totalTritium / safeFuelPerJump);
  const maxDistanceTotalReservesLy = maxJumpsTotalReserves * 500;

  return {
    tankBalanceTons: clampedTank,
    cargoReservesTons: clampedReserves,
    totalTritiumTons: totalTritium,
    tankPercent,
    isTankLow,
    fuelPer500LyJumpTons: fuelPer500Ly,
    maxJumpsTankOnly,
    maxDistanceTankOnlyLy,
    maxJumpsTotalReserves,
    maxDistanceTotalReservesLy,
  };
}

/**
 * Default initial carrier state (e.g. Haven-class public DSSA / Colonisation carrier)
 */
export function createDefaultCarrierLedgerState(): CarrierLedgerState {
  return {
    carrierName: 'INV COBRA HORIZON',
    callsign: 'X3T-89L',
    currentSystem: 'Eol Prou RS-T d3-94',
    currentBody: 'Haven Primary',
    carrierBankBalanceCr: 1_250_000_000, // 1.25 Billion CR
    jumpsPerWeek: 5,
    tritiumTankTons: 840,
    tritiumCargoReservesTons: 4_500,
    otherCargoMassTons: 3_200,
    services: {
      refuel: 'active',
      repair: 'active',
      armory: 'active',
      shipyard: 'active',
      outfitting: 'active',
      vista_genomics: 'active',
      pioneer_supplies: 'suspended',
      bartender: 'active',
      secure_warehouse: 'uninstalled',
      universal_cartographics: 'active',
      redemption_office: 'uninstalled',
    },
    missionProfile: 'Fleet Command',
    lastUpdatedEpochMs: Date.now(),
  };
}

// LocalStorage persistence key
const STORAGE_KEY = 'atlas_fleet_carrier_ledger_v1';

export class CarrierLedgerEngine {
  private state: CarrierLedgerState;
  private listeners: Array<(state: CarrierLedgerState) => void> = [];

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): CarrierLedgerState {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = window.localStorage.getItem(STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.carrierName && parsed.services) {
            return {
              ...createDefaultCarrierLedgerState(),
              ...parsed,
            };
          }
        }
      } catch {
        // Fall back to default
      }
    }
    return createDefaultCarrierLedgerState();
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // Ignore storage write issues
      }
    }
  }

  public getState(): CarrierLedgerState {
    return { ...this.state };
  }

  public subscribe(cb: (state: CarrierLedgerState) => void): () => void {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    this.state.lastUpdatedEpochMs = Date.now();
    this.saveToStorage();
    const snap = this.getState();
    for (const l of this.listeners) {
      l(snap);
    }
  }

  public updateCarrierMeta(
    name: string,
    callsign: string,
    system: string,
    body: string,
    profile?: CarrierLedgerState['missionProfile']
  ): void {
    this.state.carrierName = name.trim() || 'UNTITLED CARRIER';
    this.state.callsign = callsign.trim().toUpperCase() || 'XXX-000';
    this.state.currentSystem = system.trim() || 'Sol';
    this.state.currentBody = body.trim() || 'Sol 1';
    if (profile) this.state.missionProfile = profile;
    this.notify();
  }

  public setBankBalance(balanceCr: number): void {
    this.state.carrierBankBalanceCr = Math.round(balanceCr);
    this.notify();
  }

  public adjustBankBalance(deltaCr: number): void {
    this.state.carrierBankBalanceCr += Math.round(deltaCr);
    this.notify();
  }

  public setJumpsPerWeek(count: number): void {
    this.state.jumpsPerWeek = Math.max(0, Math.round(count));
    this.notify();
  }

  public setTritiumTank(tons: number): void {
    this.state.tritiumTankTons = Math.min(
      MAX_TRITIUM_DEPOT_CAPACITY_TONS,
      Math.max(0, Math.round(tons))
    );
    this.notify();
  }

  public setTritiumCargoReserves(tons: number): void {
    this.state.tritiumCargoReservesTons = Math.max(0, Math.round(tons));
    this.notify();
  }

  public setOtherCargoMass(tons: number): void {
    this.state.otherCargoMassTons = Math.max(0, Math.round(tons));
    this.notify();
  }

  public setServiceStatus(serviceKey: CarrierServiceKey, status: ServiceStatus): void {
    this.state.services = {
      ...this.state.services,
      [serviceKey]: status,
    };
    this.notify();
  }

  public transferTritiumToTank(tons: number): { success: boolean; transferred: number } {
    const spaceInTank = MAX_TRITIUM_DEPOT_CAPACITY_TONS - this.state.tritiumTankTons;
    if (spaceInTank <= 0 || this.state.tritiumCargoReservesTons <= 0) {
      return { success: false, transferred: 0 };
    }

    const toTransfer = Math.min(spaceInTank, this.state.tritiumCargoReservesTons, Math.max(0, tons));
    this.state.tritiumTankTons += toTransfer;
    this.state.tritiumCargoReservesTons -= toTransfer;
    this.notify();
    return { success: true, transferred: toTransfer };
  }

  public ingestFromProfile(profile: Partial<CarrierLedgerState>): void {
    this.state = {
      ...this.state,
      ...profile,
      services: {
        ...this.state.services,
        ...(profile.services || {}),
      },
    };
    this.notify();
  }

  public resetToDefault(): void {
    this.state = createDefaultCarrierLedgerState();
    this.notify();
  }
}

// Global singleton instance
export const carrierLedgerEngine = new CarrierLedgerEngine();
