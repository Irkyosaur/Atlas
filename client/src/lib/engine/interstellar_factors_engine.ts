// Location: atlas/client/src/lib/engine/interstellar_factors_engine.ts
// Stage 13.3: Interstellar Factors Triangulator & Anti-Local Faction Safety Filter
// Handles:
// 1. Query Ananke GET /api/stations/services?service=interstellar_factors with embedded fallback registry.
// 2. Strict Anti-Local Faction safety guard:
//    - Exclude ANY Interstellar Factor located in a system where the issuing bounty/fine faction
//      has > 0% local influence (to prevent player arrest and detention ship transport).
//    - If the bounty is a Major Superpower bounty (e.g. Federation, Empire, Alliance),
//      exclude all systems controlled by or affiliated with that superpower, and any system where
//      the claiming/issuing superpower or minor faction is present.
// 3. Calculate 25% Interstellar Factor service fee surcharge on outstanding bounties and fines.
// 4. Notoriety decay countdown tracker (Notoriety drops by 1 point every 2 hours [7200 seconds] of active in-game flight time).

export type LandingPadSize = 'M' | 'L';
export type SuperpowerAllegiance = 'Federation' | 'Empire' | 'Alliance' | 'Independent';

export interface SystemFactionInfluence {
  factionName: string;
  influence: number; // 0.0 to 1.0 (e.g., 0.35 = 35%)
  allegiance?: SuperpowerAllegiance;
  isControlling?: boolean;
}

export interface InterstellarFactorStation {
  id: string;
  stationName: string;
  systemName: string;
  systemCoords: { x: number; y: number; z: number };
  systemSecurity: 'Anarchy' | 'Low' | 'Medium' | 'High';
  economy: string;
  landingPad: LandingPadSize;
  stationType: string;
  distanceLs: number;
  controllingFaction: string;
  allegiance: SuperpowerAllegiance;
  factionsPresent: SystemFactionInfluence[];
  distanceLy?: number; // Dynamically computed relative to reference system
}

export interface BountyOrFineRecord {
  id: string;
  type: 'Bounty' | 'Fine';
  amount: number;
  issuingFaction: string;
  superpowerAllegiance?: SuperpowerAllegiance;
  victimOrReason?: string;
  timestamp?: string;
}

export interface InterstellarFactorQueryFilter {
  referenceCoords: { x: number; y: number; z: number };
  bountiesAndFines?: BountyOrFineRecord[];
  maxDistanceLy?: number;
  maxArrivalLs?: number;
  minPadSize?: 'ANY' | LandingPadSize;
  securityFilter?: 'ALL' | 'Anarchy' | 'Low' | 'Medium' | 'High';
}

export interface InterstellarFactorSafetyReport {
  isSafe: boolean;
  blockedReasons: string[];
  claimingFactionsDetected: Array<{ factionName: string; influencePercent: number }>;
}

export interface SettlementFeeCalculation {
  baseAmount: number;
  surchargeFee: number; // 25%
  totalAmountPayable: number;
  bountyCount: number;
  fineCount: number;
}

export const INTERSTELLAR_FACTORS_SURCHARGE_RATE = 0.25; // 25% Frontier EDO surcharge
export const NOTORIETY_DECAY_INTERVAL_SECONDS = 7200; // 2 hours in flight per point

export function calculateEuclideanDistanceLy(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 100) / 100;
}

/**
 * Calculates the exact 25% Interstellar Factor service fee surcharge on bounties and fines.
 */
export function calculateSettlementFee(records: BountyOrFineRecord[]): SettlementFeeCalculation {
  let baseAmount = 0;
  let bountyCount = 0;
  let fineCount = 0;

  for (const item of records) {
    baseAmount += Math.max(0, item.amount);
    if (item.type === 'Bounty') {
      bountyCount++;
    } else {
      fineCount++;
    }
  }

  const surchargeFee = Math.round(baseAmount * INTERSTELLAR_FACTORS_SURCHARGE_RATE);
  const totalAmountPayable = baseAmount + surchargeFee;

  return {
    baseAmount,
    surchargeFee,
    totalAmountPayable,
    bountyCount,
    fineCount,
  };
}

/**
 * Verifies whether an Interstellar Factor is legally safe to visit without player arrest/detention.
 *
 * Rules:
 * 1. If an issuing faction has > 0% local influence in the factor's system, it is strictly UNSAFE.
 * 2. If the bounty is a Major Superpower bounty (e.g. Federation), any system with that Superpower allegiance
 *    or where any issuing faction affiliated with that Superpower is present with >0% influence is UNSAFE.
 */
export function evaluateFactorSafety(
  station: InterstellarFactorStation,
  bountiesAndFines: BountyOrFineRecord[]
): InterstellarFactorSafetyReport {
  const blockedReasons: string[] = [];
  const claimingFactionsDetected: Array<{ factionName: string; influencePercent: number }> = [];

  for (const record of bountiesAndFines) {
    const issuingName = record.issuingFaction.trim().toLowerCase();
    const superpower = record.superpowerAllegiance;

    // Rule A: Check if issuing minor faction exists in station system with > 0% influence
    const localMatch = station.factionsPresent.find(
      (f) => f.factionName.trim().toLowerCase() === issuingName
    );

    if (localMatch && localMatch.influence > 0) {
      const pct = Math.round(localMatch.influence * 100);
      claimingFactionsDetected.push({
        factionName: localMatch.factionName,
        influencePercent: pct,
      });
      blockedReasons.push(
        `Issuing faction "${localMatch.factionName}" is present locally (${pct}% influence). Docking here triggers authority arrest!`
      );
    }

    // Rule B: Superpower Bounty checks
    // If player has a Federation bounty, all Federation systems or stations are hostile jurisdictions
    if (superpower && superpower !== 'Independent') {
      if (station.allegiance === superpower) {
        blockedReasons.push(
          `System allegiance is ${station.allegiance}. Claiming superpower bounty prevents safe laundering.`
        );
      }

      // Check if station system contains any minor faction of this superpower with local influence
      const superpowerFactionInSystem = station.factionsPresent.find(
        (f) => f.allegiance === superpower && f.influence > 0
      );
      if (superpowerFactionInSystem && station.allegiance !== superpower) {
        // Also unsafe if superpower claiming faction is present in an independent system
        const pct = Math.round(superpowerFactionInSystem.influence * 100);
        claimingFactionsDetected.push({
          factionName: superpowerFactionInSystem.factionName,
          influencePercent: pct,
        });
        blockedReasons.push(
          `Superpower minor faction "${superpowerFactionInSystem.factionName}" (${superpower}) present with ${pct}% local influence.`
        );
      }
    }
  }

  return {
    isSafe: blockedReasons.length === 0,
    blockedReasons,
    claimingFactionsDetected,
  };
}

/**
 * Filter and sort Interstellar Factors by distance, landing pad, arrival distance, and Anti-Local Faction safety.
 */
export function filterInterstellarFactors(
  stations: InterstellarFactorStation[],
  filter: InterstellarFactorQueryFilter
): Array<InterstellarFactorStation & { safety: InterstellarFactorSafetyReport }> {
  const result: Array<InterstellarFactorStation & { safety: InterstellarFactorSafetyReport }> = [];

  for (const station of stations) {
    // Arrival distance
    if (filter.maxArrivalLs !== undefined && station.distanceLs > filter.maxArrivalLs) {
      continue;
    }

    // Pad size
    if (filter.minPadSize === 'L' && station.landingPad !== 'L') {
      continue;
    }

    // Security filter
    if (filter.securityFilter && filter.securityFilter !== 'ALL' && station.systemSecurity !== filter.securityFilter) {
      continue;
    }

    const distLy = calculateEuclideanDistanceLy(filter.referenceCoords, station.systemCoords);
    if (filter.maxDistanceLy !== undefined && distLy > filter.maxDistanceLy) {
      continue;
    }

    const safety = evaluateFactorSafety(station, filter.bountiesAndFines ?? []);

    result.push({
      ...station,
      distanceLy: distLy,
      safety,
    });
  }

  // Sort primarily by safety (safe first), then by distanceLy ascending
  result.sort((a, b) => {
    if (a.safety.isSafe !== b.safety.isSafe) {
      return a.safety.isSafe ? -1 : 1;
    }
    return (a.distanceLy ?? 0) - (b.distanceLy ?? 0);
  });

  return result;
}

/**
 * High-fidelity canonical registry of Interstellar Factors across the Core Bubble,
 * Pleiades, Witch Head, and Colonia, including minor faction influence distributions
 * for complete jurisdiction verification.
 */
export const CANONICAL_INTERSTELLAR_FACTORS: InterstellarFactorStation[] = [
  // 1. Deciat proximity - Garay Terminal (Deciat system itself has local factions)
  {
    id: 'deciat_garay_terminal',
    stationName: 'Garay Terminal',
    systemName: 'Deciat',
    systemCoords: { x: 122.625, y: -0.3125, z: -47.28125 },
    systemSecurity: 'Medium',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 340,
    controllingFaction: 'Deciat Independents',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Deciat Independents', influence: 0.52, allegiance: 'Independent', isControlling: true },
      { factionName: 'Elite Federation of Pilots', influence: 0.28, allegiance: 'Independent' },
      { factionName: 'Deciat Industry Corp', influence: 0.20, allegiance: 'Federation' },
    ],
  },
  // 2. Anarchy haven near Deciat: HIP 110028 - Obsidian Hideout
  {
    id: 'hip110028_obsidian_hideout',
    stationName: 'Obsidian Hideout',
    systemName: 'HIP 110028',
    systemCoords: { x: 118.2, y: 4.8, z: -51.1 },
    systemSecurity: 'Anarchy',
    economy: 'Extraction',
    landingPad: 'L',
    stationType: 'Asteroid Base',
    distanceLs: 125,
    controllingFaction: 'HIP 110028 Pirate Brotherhood',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'HIP 110028 Pirate Brotherhood', influence: 0.85, allegiance: 'Independent', isControlling: true },
      { factionName: 'Lawless Syndicate of 110028', influence: 0.15, allegiance: 'Independent' },
    ],
  },
  // 3. Low-Security Independent hub: HR 6421 - Napier Terminal
  {
    id: 'hr6421_napier_terminal',
    stationName: 'Napier Terminal',
    systemName: 'HR 6421',
    systemCoords: { x: 110.5, y: -8.4, z: -42.8 },
    systemSecurity: 'Low',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 420,
    controllingFaction: 'HR 6421 Free Union',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'HR 6421 Free Union', influence: 0.65, allegiance: 'Independent', isControlling: true },
      { factionName: 'Silver Network Traders', influence: 0.35, allegiance: 'Independent' },
    ],
  },
  // 4. Sol Proximity - Independent / Anarchy: LHS 380 - Weyl Orbital
  {
    id: 'lhs380_weyl_orbital',
    stationName: 'Weyl Orbital',
    systemName: 'LHS 380',
    systemCoords: { x: -6.40625, y: -7.125, z: 12.03125 },
    systemSecurity: 'Low',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 512,
    controllingFaction: 'LHS 380 Corporation',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'LHS 380 Corporation', influence: 0.70, allegiance: 'Independent', isControlling: true },
      { factionName: 'Independent LHS 380 Freeholders', influence: 0.30, allegiance: 'Independent' },
    ],
  },
  // 5. Sol Proximity - Federation System: Alpha Centauri - Hutton Orbital (Medium pad / far)
  {
    id: 'alpha_centauri_hutton',
    stationName: 'Hutton Orbital',
    systemName: 'Alpha Centauri',
    systemCoords: { x: 3.03125, y: -0.0625, z: 3.15625 },
    systemSecurity: 'Medium',
    economy: 'Refinery',
    landingPad: 'M',
    stationType: 'Outpost',
    distanceLs: 6784404,
    controllingFaction: 'Hutton Orbital Truckers Co-Operative',
    allegiance: 'Federation',
    factionsPresent: [
      { factionName: 'Hutton Orbital Truckers Co-Operative', influence: 0.75, allegiance: 'Federation', isControlling: true },
      { factionName: 'Alpha Centauri Values Party', influence: 0.25, allegiance: 'Federation' },
    ],
  },
  // 6. Sol Proximity - LP 98-132 - King Outpost
  {
    id: 'lp98_132_king_outpost',
    stationName: 'King Outpost',
    systemName: 'LP 98-132',
    systemCoords: { x: 8.53125, y: -19.46875, z: 3.5 },
    systemSecurity: 'Anarchy',
    economy: 'Industrial',
    landingPad: 'M',
    stationType: 'Outpost',
    distanceLs: 280,
    controllingFaction: 'LP 98-132 Purple Mafia',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'LP 98-132 Purple Mafia', influence: 0.90, allegiance: 'Independent', isControlling: true },
      { factionName: 'LP 98-132 Clan', influence: 0.10, allegiance: 'Independent' },
    ],
  },
  // 7. Shinrarta Dezhra Proximity - CD-34 9020 - Carmen Ring
  {
    id: 'cd34_9020_carmen_ring',
    stationName: 'Carmen Ring',
    systemName: 'CD-34 9020',
    systemCoords: { x: 55.4375, y: -38.75, z: 29.84375 },
    systemSecurity: 'Low',
    economy: 'Extraction',
    landingPad: 'L',
    stationType: 'Ocellus Starport',
    distanceLs: 180,
    controllingFaction: 'Independent CD-34 Network',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Independent CD-34 Network', influence: 0.72, allegiance: 'Independent', isControlling: true },
      { factionName: 'CD-34 Mining Pioneers', influence: 0.28, allegiance: 'Independent' },
    ],
  },
  // 8. Empire Border Hub - Dvorsi - Finney Dock
  {
    id: 'dvorsi_finney_dock',
    stationName: 'Finney Dock',
    systemName: 'Dvorsi',
    systemCoords: { x: -28.125, y: -102.375, z: 59.5 },
    systemSecurity: 'Medium',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 395,
    controllingFaction: 'Dvorsi Imperial League',
    allegiance: 'Empire',
    factionsPresent: [
      { factionName: 'Dvorsi Imperial League', influence: 0.61, allegiance: 'Empire', isControlling: true },
      { factionName: 'Empire Consulate Dvorsi', influence: 0.25, allegiance: 'Empire' },
      { factionName: 'Dvorsi Crimson Clan', influence: 0.14, allegiance: 'Independent' },
    ],
  },
  // 9. Empire Anarchy Haven - HR 706 - The Pit
  {
    id: 'hr706_the_pit',
    stationName: 'The Pit',
    systemName: 'HR 706',
    systemCoords: { x: -35.2, y: -115.0, z: 62.4 },
    systemSecurity: 'Anarchy',
    economy: 'Extraction',
    landingPad: 'L',
    stationType: 'Asteroid Base',
    distanceLs: 88,
    controllingFaction: 'Kremainn Free Smugglers',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Kremainn Free Smugglers', influence: 0.88, allegiance: 'Independent', isControlling: true },
      { factionName: 'HR 706 Syndicate', influence: 0.12, allegiance: 'Independent' },
    ],
  },
  // 10. Alliance Border Hub - Alioth Proximity - 78 Ursae Majoris - Townshend Station
  {
    id: '78_ursae_majoris_townshend',
    stationName: 'Townshend Station',
    systemName: '78 Ursae Majoris',
    systemCoords: { x: -32.5625, y: 78.1875, z: 8.78125 },
    systemSecurity: 'Low',
    economy: 'High Tech',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 210,
    controllingFaction: 'Alioth Independents',
    allegiance: 'Alliance',
    factionsPresent: [
      { factionName: 'Alioth Independents', influence: 0.68, allegiance: 'Alliance', isControlling: true },
      { factionName: '78 Ursae Majoris Defence Force', influence: 0.32, allegiance: 'Alliance' },
    ],
  },
  // 11. Alliance Anarchy Safehouse - Wolf 406 - Hamilton Gateway
  {
    id: 'wolf406_hamilton_gateway',
    stationName: 'Hamilton Gateway',
    systemName: 'Wolf 406',
    systemCoords: { x: -16.2, y: 88.5, z: -12.1 },
    systemSecurity: 'Anarchy',
    economy: 'Industrial',
    landingPad: 'L',
    stationType: 'Coriolis Starport',
    distanceLs: 310,
    controllingFaction: 'Wolf 406 Raiders',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Wolf 406 Raiders', influence: 0.92, allegiance: 'Independent', isControlling: true },
      { factionName: 'Alliance Outcasts', influence: 0.08, allegiance: 'Alliance' },
    ],
  },
  // 12. Colonia Hub - Colonia - Jaques Station
  {
    id: 'colonia_jaques_station',
    stationName: 'Jaques Station',
    systemName: 'Colonia',
    systemCoords: { x: -9530.5, y: -910.28125, z: 19808.125 },
    systemSecurity: 'Low',
    economy: 'Refinery',
    landingPad: 'L',
    stationType: 'Orbis Starport',
    distanceLs: 1520,
    controllingFaction: 'Jaques Foundation',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Jaques Foundation', influence: 0.65, allegiance: 'Independent', isControlling: true },
      { factionName: 'Colonia Council', influence: 0.35, allegiance: 'Independent' },
    ],
  },
  // 13. Colonia Anarchy Haven - Luchtaine - Dervish Platform
  {
    id: 'luchtaine_dervish_platform',
    stationName: 'Dervish Platform',
    systemName: 'Luchtaine',
    systemCoords: { x: -9522.1, y: -908.4, z: 19815.3 },
    systemSecurity: 'Anarchy',
    economy: 'Extraction',
    landingPad: 'M',
    stationType: 'Outpost',
    distanceLs: 440,
    controllingFaction: 'Luchtaine Free Cartel',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Luchtaine Free Cartel', influence: 0.95, allegiance: 'Independent', isControlling: true },
      { factionName: 'Colonia Drifters', influence: 0.05, allegiance: 'Independent' },
    ],
  },
  // 14. Maia / Pleiades Hub - Darnielle's Progress
  {
    id: 'maia_darnielles_progress',
    stationName: "Darnielle's Progress",
    systemName: 'Maia',
    systemCoords: { x: -81.78125, y: -259.34375, z: -379.625 },
    systemSecurity: 'Low',
    economy: 'Planetary Port',
    landingPad: 'L',
    stationType: 'Surface Starport',
    distanceLs: 980,
    controllingFaction: 'Cooper Research Associates',
    allegiance: 'Independent',
    factionsPresent: [
      { factionName: 'Cooper Research Associates', influence: 0.58, allegiance: 'Independent', isControlling: true },
      { factionName: 'The Engineers Hub', influence: 0.42, allegiance: 'Independent' },
    ],
  },
];

export const DEFAULT_MOCK_BOUNTIES_AND_FINES: BountyOrFineRecord[] = [
  {
    id: 'crime_01',
    type: 'Bounty',
    amount: 150000,
    issuingFaction: 'Deciat Industry Corp',
    superpowerAllegiance: 'Federation',
    victimOrReason: 'Murder / Unlawful Destruction of System Defense Craft',
    timestamp: '3310-10-15T22:15:00Z',
  },
  {
    id: 'crime_02',
    type: 'Fine',
    amount: 12500,
    issuingFaction: 'Deciat Independents',
    superpowerAllegiance: 'Independent',
    victimOrReason: 'Reckless Flying / Starport Speeding Infraction',
    timestamp: '3310-10-15T22:45:00Z',
  },
  {
    id: 'crime_03',
    type: 'Bounty',
    amount: 45000,
    issuingFaction: 'Federation Congress Police',
    superpowerAllegiance: 'Federation',
    victimOrReason: 'Assault on Federal Security Service Vessel',
    timestamp: '3310-10-15T23:05:00Z',
  },
];

const STORAGE_NOTORIETY_KEY = 'atlas_cmdr_notoriety_state';
const STORAGE_BOUNTIES_KEY = 'atlas_cmdr_bounties_fines_state';

export interface NotorietyTrackerState {
  notoriety: number; // 0 to 10
  flightSecondsElapsed: number; // 0 to 7200 per point
  isFlightTimerActive: boolean;
  lastDecayTimestamp?: number;
}

class InterstellarFactorsEngine {
  private notorietyState: NotorietyTrackerState = {
    notoriety: 2,
    flightSecondsElapsed: 2840,
    isFlightTimerActive: true,
  };

  private bountiesAndFines: BountyOrFineRecord[] = [...DEFAULT_MOCK_BOUNTIES_AND_FINES];
  private timerHandle: any = null;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.loadState();
    this.startFlightTimer();
  }

  private loadState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawNotoriety = localStorage.getItem(STORAGE_NOTORIETY_KEY);
      if (rawNotoriety) {
        this.notorietyState = {
          ...this.notorietyState,
          ...JSON.parse(rawNotoriety),
        };
      }
      const rawBounties = localStorage.getItem(STORAGE_BOUNTIES_KEY);
      if (rawBounties) {
        const parsed = JSON.parse(rawBounties);
        if (Array.isArray(parsed)) {
          this.bountiesAndFines = parsed;
        }
      }
    } catch {
      // Local storage fallback
    }
  }

  private saveState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_NOTORIETY_KEY, JSON.stringify(this.notorietyState));
      localStorage.setItem(STORAGE_BOUNTIES_KEY, JSON.stringify(this.bountiesAndFines));
    } catch {
      // Local storage fallback
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    for (const sub of this.subscribers) {
      sub();
    }
    this.saveState();
  }

  public getNotorietyState(): NotorietyTrackerState {
    return { ...this.notorietyState };
  }

  public getBountiesAndFines(): BountyOrFineRecord[] {
    return [...this.bountiesAndFines];
  }

  public setNotoriety(notoriety: number): void {
    this.notorietyState.notoriety = Math.max(0, Math.min(10, Math.floor(notoriety)));
    this.notorietyState.flightSecondsElapsed = 0;
    this.notify();
  }

  public toggleFlightTimer(active?: boolean): void {
    this.notorietyState.isFlightTimerActive =
      active !== undefined ? active : !this.notorietyState.isFlightTimerActive;
    this.notify();
  }

  public addBountyOrFine(record: Omit<BountyOrFineRecord, 'id'>): void {
    const newRecord: BountyOrFineRecord = {
      ...record,
      id: `crime_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.bountiesAndFines.push(newRecord);
    this.notify();
  }

  public removeBountyOrFine(id: string): void {
    this.bountiesAndFines = this.bountiesAndFines.filter((b) => b.id !== id);
    this.notify();
  }

  public clearAllBountiesAndFines(): void {
    this.bountiesAndFines = [];
    this.notify();
  }

  public resetToDefaultMockCrimes(): void {
    this.bountiesAndFines = [...DEFAULT_MOCK_BOUNTIES_AND_FINES];
    this.notorietyState.notoriety = 2;
    this.notorietyState.flightSecondsElapsed = 2840;
    this.notify();
  }

  private startFlightTimer(): void {
    if (this.timerHandle) return;
    this.timerHandle = setInterval(() => {
      if (!this.notorietyState.isFlightTimerActive || this.notorietyState.notoriety <= 0) {
        return;
      }

      this.notorietyState.flightSecondsElapsed += 1;

      if (this.notorietyState.flightSecondsElapsed >= NOTORIETY_DECAY_INTERVAL_SECONDS) {
        this.notorietyState.notoriety = Math.max(0, this.notorietyState.notoriety - 1);
        this.notorietyState.flightSecondsElapsed = 0;
        this.notorietyState.lastDecayTimestamp = Date.now();
      }

      // Notify once every 10 seconds or when notoriety decays
      if (
        this.notorietyState.flightSecondsElapsed % 5 === 0 ||
        this.notorietyState.notoriety === 0
      ) {
        this.notify();
      }
    }, 1000);
  }
}

export const interstellarFactorsEngine = new InterstellarFactorsEngine();
