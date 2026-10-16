// Location: atlas/client/src/lib/engine/thargoid_war_engine.ts
// Thargoid War Frontline & Titan Maelstrom Intelligence Engine (Stage 14.1)

export type TitanState = 'Active' | 'Vulnerable' | 'Meltdown' | 'Destroyed';

export type WarSystemState =
  | 'Alert'
  | 'Invasion'
  | 'Infested' // Controlled / Infested
  | 'Controlled'
  | 'Cleared'
  | 'Counterstrike'
  | 'Recovery';

export interface TitanMaelstromRecord {
  id: string;
  name: string;
  systemName: string;
  coords: { x: number; y: number; z: number };
  radiusLy: number;
  state: TitanState;
  heartsRemaining: number; // 0 to 8
  totalHearts: number;
  causticCloudRadiusLy: number;
  controlledSystemsCount: number;
  activeInvasionsCount: number;
  tacticalPriority: number; // 1 = highest
  destructionDateUtc?: string; // For fallen Titans
}

export interface WarSystemRecord {
  systemAddress: string;
  systemName: string;
  coords: { x: number; y: number; z: number };
  maelstromName: string; // Associated Titan Maelstrom
  state: WarSystemState;
  defenseProgressPercent: number; // 0.0 - 100.0%
  remainingHours: number; // Hours until weekly tick / failure
  requiredProgressPerHour: number; // Calculated %/hr needed to succeed
  population: number;
  starportsDamaged: number;
  starportsAttacked: number;
  starportsUnderAttack: number;
  evacuationsActive: boolean;
  highPriority: boolean;
  distanceToTitanLy: number;
  spireSitesCount: number;
  lastUpdatedUtc: string;
}

export interface WarStateOverview {
  cycleEndsAtUtc: string;
  hoursUntilCycleReset: number;
  totalSystemsUnderAttack: number;
  totalAlerts: number;
  totalInvasions: number;
  totalControlled: number;
  totalClearedThisCycle: number;
  activeTitansCount: number;
  destroyedTitansCount: number;
  titans: TitanMaelstromRecord[];
  systems: WarSystemRecord[];
}

export interface WarFilterCriteria {
  state?: 'ALL' | WarSystemState;
  maelstrom?: 'ALL' | string;
  onlyHighPriority?: boolean;
  onlyEvacuations?: boolean;
  onlyCounterstrikeCandidates?: boolean;
  minDefenseProgress?: number;
  maxDefenseProgress?: number;
  searchQuery?: string;
}

/**
 * 8 Canonical Titan Maelstroms with Sol-relative coordinates and real status.
 * All 8 Titans (Taranis, Leigong, Hadad, Oya, Indra, Thor, Raijin, Cocijo).
 */
export const CANONICAL_TITANS: TitanMaelstromRecord[] = [
  {
    id: 'titan_taranis',
    name: 'Taranis',
    systemName: 'Hyades Sector FB-N b7-6',
    coords: { x: -85.25, y: -60.125, z: -15.5 },
    radiusLy: 20.0,
    causticCloudRadiusLy: 18.5,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 8,
    destructionDateUtc: '3310-03-03T23:55:00Z',
  },
  {
    id: 'titan_leigong',
    name: 'Leigong',
    systemName: 'HIP 8887',
    coords: { x: 40.125, y: -80.25, z: -30.0 },
    radiusLy: 18.0,
    causticCloudRadiusLy: 16.0,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 7,
    destructionDateUtc: '3310-03-31T20:30:00Z',
  },
  {
    id: 'titan_hadad',
    name: 'Hadad',
    systemName: 'HIP 30377',
    coords: { x: 130.5, y: -50.0, z: 45.125 },
    radiusLy: 20.0,
    causticCloudRadiusLy: 18.0,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 6,
    destructionDateUtc: '3310-05-04T18:15:00Z',
  },
  {
    id: 'titan_oya',
    name: 'Oya',
    systemName: 'Cephei Sector BV-Y b4',
    coords: { x: -65.25, y: 72.5, z: 12.125 },
    radiusLy: 20.0,
    causticCloudRadiusLy: 17.5,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 5,
    destructionDateUtc: '3310-06-08T14:40:00Z',
  },
  {
    id: 'titan_indra',
    name: 'Indra',
    systemName: 'HR 1358',
    coords: { x: -45.125, y: -110.25, z: 5.0 },
    radiusLy: 22.0,
    causticCloudRadiusLy: 19.0,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 4,
    destructionDateUtc: '3310-07-15T09:20:00Z',
  },
  {
    id: 'titan_thor',
    name: 'Thor',
    systemName: 'Col 285 Sector IG-O c6-5',
    coords: { x: 60.0, y: -35.25, z: 110.5 },
    radiusLy: 18.0,
    causticCloudRadiusLy: 16.5,
    state: 'Destroyed',
    heartsRemaining: 0,
    totalHearts: 8,
    controlledSystemsCount: 0,
    activeInvasionsCount: 0,
    tacticalPriority: 3,
    destructionDateUtc: '3310-08-22T16:10:00Z',
  },
  {
    id: 'titan_raijin',
    name: 'Raijin',
    systemName: 'Pegasi Sector JH-V c2-9',
    coords: { x: 110.25, y: -75.0, z: -85.125 },
    radiusLy: 22.0,
    causticCloudRadiusLy: 20.0,
    state: 'Active',
    heartsRemaining: 3,
    totalHearts: 8,
    controlledSystemsCount: 14,
    activeInvasionsCount: 3,
    tacticalPriority: 1,
  },
  {
    id: 'titan_cocijo',
    name: 'Cocijo',
    systemName: 'Col 285 Sector BA-P c6-18',
    coords: { x: -120.0, y: -45.125, z: 65.5 },
    radiusLy: 20.0,
    causticCloudRadiusLy: 18.0,
    state: 'Vulnerable',
    heartsRemaining: 1,
    totalHearts: 8,
    controlledSystemsCount: 6,
    activeInvasionsCount: 2,
    tacticalPriority: 2,
  },
];

/**
 * Live Canonical War Frontline systems database across the bubble.
 */
export const CANONICAL_WAR_SYSTEMS: WarSystemRecord[] = [
  // Raijin Frontline
  {
    systemAddress: '3932781001',
    systemName: 'Pegasi Sector GW-V b2-1',
    coords: { x: 104.1, y: -71.2, z: -81.0 },
    maelstromName: 'Raijin',
    state: 'Invasion',
    defenseProgressPercent: 68.5,
    remainingHours: 34,
    requiredProgressPerHour: 0.93,
    population: 4850000,
    starportsDamaged: 1,
    starportsAttacked: 1,
    starportsUnderAttack: 1,
    evacuationsActive: true,
    highPriority: true,
    distanceToTitanLy: 8.2,
    spireSitesCount: 1,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932781002',
    systemName: 'Pegasi Sector JH-V c2-11',
    coords: { x: 112.4, y: -78.1, z: -88.3 },
    maelstromName: 'Raijin',
    state: 'Alert',
    defenseProgressPercent: 82.0,
    remainingHours: 34,
    requiredProgressPerHour: 0.53,
    population: 120000,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: true,
    distanceToTitanLy: 4.8,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932781003',
    systemName: 'Pegasi Sector VK-L a9-0',
    coords: { x: 101.8, y: -79.5, z: -79.2 },
    maelstromName: 'Raijin',
    state: 'Infested',
    defenseProgressPercent: 24.2,
    remainingHours: 34,
    requiredProgressPerHour: 2.23,
    population: 0,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 11.4,
    spireSitesCount: 2,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932781004',
    systemName: 'HIP 11110',
    coords: { x: 115.0, y: -70.4, z: -92.1 },
    maelstromName: 'Raijin',
    state: 'Counterstrike',
    defenseProgressPercent: 91.4,
    remainingHours: 34,
    requiredProgressPerHour: 0.25,
    population: 18200000,
    starportsDamaged: 2,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: true,
    highPriority: true,
    distanceToTitanLy: 9.8,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932781005',
    systemName: 'Pegasi Sector BQ-Y d88',
    coords: { x: 108.5, y: -74.2, z: -83.7 },
    maelstromName: 'Raijin',
    state: 'Controlled',
    defenseProgressPercent: 12.0,
    remainingHours: 34,
    requiredProgressPerHour: 2.59,
    population: 0,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 2.7,
    spireSitesCount: 1,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },

  // Cocijo Frontline
  {
    systemAddress: '3932782001',
    systemName: 'Col 285 Sector BA-P c6-17',
    coords: { x: -118.2, y: -43.8, z: 64.1 },
    maelstromName: 'Cocijo',
    state: 'Invasion',
    defenseProgressPercent: 54.0,
    remainingHours: 34,
    requiredProgressPerHour: 1.35,
    population: 2450000,
    starportsDamaged: 1,
    starportsAttacked: 1,
    starportsUnderAttack: 1,
    evacuationsActive: true,
    highPriority: true,
    distanceToTitanLy: 3.1,
    spireSitesCount: 1,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932782002',
    systemName: 'HIP 20485',
    coords: { x: -114.5, y: -48.2, z: 61.0 },
    maelstromName: 'Cocijo',
    state: 'Alert',
    defenseProgressPercent: 94.6,
    remainingHours: 34,
    requiredProgressPerHour: 0.16,
    population: 9400000,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: true,
    distanceToTitanLy: 7.9,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932782003',
    systemName: 'Col 285 Sector WY-F b12-3',
    coords: { x: -125.0, y: -41.0, z: 69.2 },
    maelstromName: 'Cocijo',
    state: 'Controlled',
    defenseProgressPercent: 41.5,
    remainingHours: 34,
    requiredProgressPerHour: 1.72,
    population: 0,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 7.6,
    spireSitesCount: 2,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932782004',
    systemName: 'Col 285 Sector AF-E b13-1',
    coords: { x: -112.0, y: -49.5, z: 68.0 },
    maelstromName: 'Cocijo',
    state: 'Cleared',
    defenseProgressPercent: 100.0,
    remainingHours: 34,
    requiredProgressPerHour: 0.0,
    population: 3100000,
    starportsDamaged: 1,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 9.2,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },

  // Historic Fallen Frontline Examples (Cleared / Recovery)
  {
    systemAddress: '3932783001',
    systemName: 'Hyades Sector ST-Q b5-2',
    coords: { x: -82.0, y: -58.5, z: -14.0 },
    maelstromName: 'Taranis',
    state: 'Recovery',
    defenseProgressPercent: 100.0,
    remainingHours: 0,
    requiredProgressPerHour: 0.0,
    population: 6200000,
    starportsDamaged: 2,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 4.1,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
  {
    systemAddress: '3932783002',
    systemName: 'HIP 20890',
    coords: { x: 38.0, y: -78.5, z: -28.0 },
    maelstromName: 'Leigong',
    state: 'Cleared',
    defenseProgressPercent: 100.0,
    remainingHours: 0,
    requiredProgressPerHour: 0.0,
    population: 14500000,
    starportsDamaged: 0,
    starportsAttacked: 0,
    starportsUnderAttack: 0,
    evacuationsActive: false,
    highPriority: false,
    distanceToTitanLy: 3.5,
    spireSitesCount: 0,
    lastUpdatedUtc: '3310-10-15T12:00:00Z',
  },
];

/**
 * Calculates Euclidean distance in light years between two 3D points.
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
 * Calculates next weekly server maintenance tick (Thursday 07:00:00 UTC).
 */
export function calculateNextThursdayResetUtc(now = new Date()): { nextResetDate: Date; hoursRemaining: number } {
  const resetDate = new Date(now.getTime());
  resetDate.setUTCMilliseconds(0);
  resetDate.setUTCSeconds(0);
  resetDate.setUTCMinutes(0);
  resetDate.setUTCHours(7);

  // Day of week: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const day = resetDate.getUTCDay();
  let daysToAdd = (4 - day + 7) % 7;
  if (daysToAdd === 0 && now.getTime() >= resetDate.getTime()) {
    daysToAdd = 7;
  }
  resetDate.setUTCDate(resetDate.getUTCDate() + daysToAdd);

  const diffMs = resetDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(1)));

  return { nextResetDate: resetDate, hoursRemaining };
}

/**
 * Computes required defense progress percentage per hour to reach 100% before reset.
 */
export function calculateRequiredProgressPerHour(currentPercent: number, remainingHours: number): number {
  if (currentPercent >= 100.0 || remainingHours <= 0) {
    return 0.0;
  }
  const needed = 100.0 - currentPercent;
  return Number((needed / remainingHours).toFixed(2));
}

/**
 * Filters live war systems according to criteria.
 */
export function filterWarSystems(
  systems: WarSystemRecord[],
  criteria: WarFilterCriteria
): WarSystemRecord[] {
  return systems.filter((sys) => {
    if (criteria.state && criteria.state !== 'ALL' && sys.state !== criteria.state) {
      return false;
    }
    if (criteria.maelstrom && criteria.maelstrom !== 'ALL' && sys.maelstromName.toLowerCase() !== criteria.maelstrom.toLowerCase()) {
      return false;
    }
    if (criteria.onlyHighPriority && !sys.highPriority) {
      return false;
    }
    if (criteria.onlyEvacuations && !sys.evacuationsActive) {
      return false;
    }
    if (criteria.onlyCounterstrikeCandidates && sys.state !== 'Counterstrike' && sys.defenseProgressPercent < 80.0) {
      return false;
    }
    if (criteria.minDefenseProgress !== undefined && sys.defenseProgressPercent < criteria.minDefenseProgress) {
      return false;
    }
    if (criteria.maxDefenseProgress !== undefined && sys.defenseProgressPercent > criteria.maxDefenseProgress) {
      return false;
    }
    if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
      const q = criteria.searchQuery.trim().toLowerCase();
      const matchName = sys.systemName.toLowerCase().includes(q);
      const matchMaelstrom = sys.maelstromName.toLowerCase().includes(q);
      if (!matchName && !matchMaelstrom) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Compiles a comprehensive WarStateOverview from titans and war systems.
 */
export function compileWarStateOverview(
  titans: TitanMaelstromRecord[] = CANONICAL_TITANS,
  systems: WarSystemRecord[] = CANONICAL_WAR_SYSTEMS,
  now = new Date()
): WarStateOverview {
  const { nextResetDate, hoursRemaining } = calculateNextThursdayResetUtc(now);

  const updatedSystems = systems.map((sys) => {
    const hours = sys.remainingHours > 0 ? sys.remainingHours : hoursRemaining;
    const reqProgress = calculateRequiredProgressPerHour(sys.defenseProgressPercent, hours);
    return {
      ...sys,
      remainingHours: hours,
      requiredProgressPerHour: reqProgress,
    };
  });

  const activeTitans = titans.filter((t) => t.state === 'Active' || t.state === 'Vulnerable');
  const destroyedTitans = titans.filter((t) => t.state === 'Destroyed');

  let alerts = 0;
  let invasions = 0;
  let controlled = 0;
  let cleared = 0;

  for (const s of updatedSystems) {
    if (s.state === 'Alert') alerts++;
    else if (s.state === 'Invasion') invasions++;
    else if (s.state === 'Controlled' || s.state === 'Infested') controlled++;
    else if (s.state === 'Cleared') cleared++;
  }

  return {
    cycleEndsAtUtc: nextResetDate.toISOString(),
    hoursUntilCycleReset: hoursRemaining,
    totalSystemsUnderAttack: alerts + invasions,
    totalAlerts: alerts,
    totalInvasions: invasions,
    totalControlled: controlled,
    totalClearedThisCycle: cleared,
    activeTitansCount: activeTitans.length,
    destroyedTitansCount: destroyedTitans.length,
    titans,
    systems: updatedSystems,
  };
}
