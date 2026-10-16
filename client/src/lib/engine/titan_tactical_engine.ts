// Location: atlas/client/src/lib/engine/titan_tactical_engine.ts
// Titan Tactical Heart Sabotage & Caustic Navigation Engine (Stage 14.2)

export interface TitanVentRecord {
  id: number; // 1 to 8
  name: string;
  angleDeg: number; // Angular position on Titan torus (0 to 360)
  status: 'DORMANT' | 'CHARGING' | 'ACTIVE_DISSIPATING' | 'SABOTAGED_EXHAUSTED';
  heatDissipationPct: number; // 0 to 100%
  recommendedAttackVector: string; // Flight vector
}

export interface TitanAnatomy {
  titanName: string;
  systemName: string;
  causticTorusRadiusMeters: number; // 15,000m
  asteroidBeltInnerRadiusMeters: number; // 35,000m
  asteroidBeltOuterRadiusMeters: number; // 50,000m
  vents: TitanVentRecord[];
  activeHeart: {
    heartIndex: number; // 1 to 8
    maxHealth: number; // Hull HP
    currentHealthPct: number; // 0 to 100%
    isVulnerable: boolean;
    exposureTimeRemainingSec: number;
    maxExposureDurationSec: number; // standard 30s window
  };
}

export interface CausticResistanceInput {
  hullArmor: number; // Raw armor HP
  causticResistancePct: number; // 0% to 50%
  causticSinkLaunchersCount: number; // e.g. 1 or 2
  synthAmmoAvailable: number; // basic/standard/premium synth count
  inInnerCoreCloud: boolean; // Caustic Torus cloud is 3x more lethal than outer cloud
}

export interface CausticResistanceResult {
  hullDegradationPerSecond: number; // HP/sec lost to caustic dot
  effectiveTimeToMeltSec: number; // Seconds until 0% hull without sinks
  sinkCapacityTotalSec: number; // Total seconds of caustic absorption available
  totalSurvivalTimeSec: number; // Combined sink absorption + hull melt time
  recommendedSinksForRun: number; // Sinks needed for a standard 10-minute bombing run
  synthResupplyRunsSupported: number;
}

export interface AXBuildWeapon {
  id: string;
  name: string;
  classSize: 'Small' | 'Medium' | 'Large' | 'Huge';
  category: 'Nanite Pylon' | 'Guardian Shard' | 'AX Multi-Cannon' | 'Caustic Sink' | 'Heat Sink';
  optimalRangeMeters: number;
  damageType: 'AX Explosive' | 'Thermal/AX' | 'Kinetic/AX' | 'Utility';
  convergenceScore: 'S' | 'A' | 'B' | 'C'; // Weapon convergence suitability for Titan vent/heart
  notes: string;
}

export interface RecommendedAXBuild {
  id: string;
  shipName: string;
  role: 'Vent Bomber (Nanite/Shard)' | 'Heart DPS (Shard/AX MC)' | 'Solo Speed Runner (Cold Krait)';
  hullArmor: number;
  boostSpeedMs: number;
  idleHeatPct: number;
  weapons: AXBuildWeapon[];
  tacticalNotes: string[];
}

export interface VentMetronomeState {
  currentPhase: 'APPROACH' | 'VENT_OPEN' | 'VENT_SABOTAGED' | 'HEART_EXPOSED' | 'COOLDOWN';
  phaseRemainingSec: number;
  phaseDurationSec: number;
  cycleCount: number;
  activeVentTarget: number; // 1 - 8
  damageWindowActive: boolean;
}

// 8 Canonical Thermal Vents around Titan Central Core
export const CANONICAL_TITAN_VENTS: TitanVentRecord[] = [
  { id: 1, name: 'Vent Alpha (000°)', angleDeg: 0, status: 'CHARGING', heatDissipationPct: 85, recommendedAttackVector: 'Pitch 0° Dorsal Entry' },
  { id: 2, name: 'Vent Beta (045°)', angleDeg: 45, status: 'DORMANT', heatDissipationPct: 15, recommendedAttackVector: 'Dorsal-Starboard 45° Skim' },
  { id: 3, name: 'Vent Gamma (090°)', angleDeg: 90, status: 'ACTIVE_DISSIPATING', heatDissipationPct: 95, recommendedAttackVector: 'Starboard Lateral Trench Run' },
  { id: 4, name: 'Vent Delta (135°)', angleDeg: 135, status: 'DORMANT', heatDissipationPct: 30, recommendedAttackVector: 'Aft-Starboard Angle' },
  { id: 5, name: 'Vent Epsilon (180°)', angleDeg: 180, status: 'ACTIVE_DISSIPATING', heatDissipationPct: 90, recommendedAttackVector: 'Aft Exhaust Spine Ingress' },
  { id: 6, name: 'Vent Zeta (225°)', angleDeg: 225, status: 'DORMANT', heatDissipationPct: 10, recommendedAttackVector: 'Aft-Port 225° Ingress' },
  { id: 7, name: 'Vent Eta (270°)', angleDeg: 270, status: 'CHARGING', heatDissipationPct: 75, recommendedAttackVector: 'Port Lateral Trench Run' },
  { id: 8, name: 'Vent Theta (315°)', angleDeg: 315, status: 'DORMANT', heatDissipationPct: 20, recommendedAttackVector: 'Fore-Port Flank Vector' },
];

export const CANONICAL_TITAN_ANATOMY: TitanAnatomy = {
  titanName: 'Titan Raijin',
  systemName: 'Pegasi Sector VK-L a9-4',
  causticTorusRadiusMeters: 15000,
  asteroidBeltInnerRadiusMeters: 35000,
  asteroidBeltOuterRadiusMeters: 55000,
  vents: CANONICAL_TITAN_VENTS,
  activeHeart: {
    heartIndex: 7,
    maxHealth: 1000000,
    currentHealthPct: 74.2,
    isVulnerable: false,
    exposureTimeRemainingSec: 0,
    maxExposureDurationSec: 32,
  },
};

export const RECOMMENDED_AX_WEAPONS: AXBuildWeapon[] = [
  {
    id: 'nanite_torp_med',
    name: 'Nanite Torpedo Pylon',
    classSize: 'Medium',
    category: 'Nanite Pylon',
    optimalRangeMeters: 2500,
    damageType: 'AX Explosive',
    convergenceScore: 'S',
    notes: 'Essential for sabotaging open Thermal Vents. Fires caustic nanites that plug the heat dissipation vents.',
  },
  {
    id: 'shard_cannon_large',
    name: 'Modified Guardian Shard Cannon',
    classSize: 'Large',
    category: 'Guardian Shard',
    optimalRangeMeters: 1500,
    damageType: 'Thermal/AX',
    convergenceScore: 'S',
    notes: 'Extreme burst DPS against exposed Titan Heart. Requires Guardian Nanite coating / Sirius heatsinks.',
  },
  {
    id: 'ax_multicannon_large',
    name: 'Enhanced AX Multi-Cannon (Gimballed)',
    classSize: 'Large',
    category: 'AX Multi-Cannon',
    optimalRangeMeters: 2000,
    damageType: 'Kinetic/AX',
    convergenceScore: 'A',
    notes: 'Sustained kinetic AX DPS on exposed heart with zero engineering unlock requirement.',
  },
  {
    id: 'sirius_heatsink',
    name: 'Sirius High-Capacity Heat Sink',
    classSize: 'Small',
    category: 'Heat Sink',
    optimalRangeMeters: 0,
    damageType: 'Utility',
    convergenceScore: 'S',
    notes: '5 heatsink capacity per launcher. Keeps ship thermals below 20% to prevent Titan turret tracking.',
  },
  {
    id: 'caustic_sink_launcher',
    name: 'Caustic Sink Launcher',
    classSize: 'Small',
    category: 'Caustic Sink',
    optimalRangeMeters: 0,
    damageType: 'Utility',
    convergenceScore: 'S',
    notes: 'Absorbs caustic goo accumulation and ejects hot caustic rounds before hull degradation occurs.',
  },
];

export const RECOMMENDED_TITAN_BUILDS: RecommendedAXBuild[] = [
  {
    id: 'krait_mk2_bomber',
    name: 'Krait Mk II - "Titan Bane" Torpedo Bomber',
    role: 'Vent Bomber (Nanite/Shard)',
    hullArmor: 3850,
    boostSpeedMs: 535,
    idleHeatPct: 14,
    weapons: [
      RECOMMENDED_AX_WEAPONS[0], // Nanite Pylon
      RECOMMENDED_AX_WEAPONS[1], // Mod Shard L
      RECOMMENDED_AX_WEAPONS[1], // Mod Shard L
      RECOMMENDED_AX_WEAPONS[3], // Sirius Sink
      RECOMMENDED_AX_WEAPONS[4], // Caustic Sink
    ],
    tacticalNotes: [
      'Sub-20% thermal signature makes Titan turrets miss 90% of pulse fire.',
      'Fire Nanite Torpedo at vent when orange heat threshold reaches >=80%.',
      'Boost to central core spine immediately after vent collapse to engage exposed Heart.',
    ],
  },
  {
    id: 'python_mk2_dps',
    name: 'Python Mk II - "Shard Lance" Core Striker',
    role: 'Heart DPS (Shard/AX MC)',
    hullArmor: 2980,
    boostSpeedMs: 562,
    idleHeatPct: 17,
    weapons: [
      RECOMMENDED_AX_WEAPONS[0], // Nanite Pylon
      RECOMMENDED_AX_WEAPONS[1], // Mod Shard
      RECOMMENDED_AX_WEAPONS[1], // Mod Shard
      RECOMMENDED_AX_WEAPONS[1], // Mod Shard
      RECOMMENDED_AX_WEAPONS[4], // Caustic Sink
    ],
    tacticalNotes: [
      'Unmatched forward 4x Large hardpoint convergence for maximum alpha strike on Titan Heart.',
      'SCO Overcharge allows zero-interdiction transit into the Maelstrom Asteroid Belt.',
    ],
  },
  {
    id: 'chieftain_solo',
    name: 'Alliance Chieftain - "Aegis Ghost" Solo Striker',
    role: 'Solo Speed Runner (Cold Krait)',
    hullArmor: 4420,
    boostSpeedMs: 548,
    idleHeatPct: 12,
    weapons: [
      RECOMMENDED_AX_WEAPONS[0], // Nanite Pylon
      RECOMMENDED_AX_WEAPONS[2], // AX MC Large
      RECOMMENDED_AX_WEAPONS[2], // AX MC Large
      RECOMMENDED_AX_WEAPONS[3], // Sirius Sink
      RECOMMENDED_AX_WEAPONS[4], // Caustic Sink
    ],
    tacticalNotes: [
      'Superb lateral thruster control inside the Asteroid Trench and Caustic Torus.',
      'Low thermal baseline permits continuous Cold Orbiting around the Titan Heart.',
    ],
  },
];

/**
 * Calculates caustic damage mitigation and ammo requirements.
 */
export function calculateCausticMitigation(input: CausticResistanceInput): CausticResistanceResult {
  const baseDegradationPerSec = input.inInnerCoreCloud ? 45.0 : 15.0; // Base caustic melt rate
  const resistanceFactor = Math.max(0.1, 1.0 - (input.causticResistancePct / 100));
  const hullDegradationPerSecond = Number((baseDegradationPerSec * resistanceFactor).toFixed(2));

  const effectiveTimeToMeltSec = hullDegradationPerSecond > 0 
    ? Math.round(input.hullArmor / hullDegradationPerSecond) 
    : 9999;

  // Each Caustic Sink absorbs caustic build-up for ~35 seconds in core cloud, ~60s in outer cloud
  const sinkAbsorptionTimePerUnit = input.inInnerCoreCloud ? 35 : 60;
  // A standard launcher holds 1 loaded + 5 reserve = 6 sinks
  const sinksPerLauncher = 6;
  const baseSinksTotal = Math.max(0, input.causticSinkLaunchersCount * sinksPerLauncher);
  const synthSinksTotal = Math.max(0, input.synthAmmoAvailable * sinksPerLauncher);
  const totalSinks = baseSinksTotal + synthSinksTotal;

  const sinkCapacityTotalSec = totalSinks * sinkAbsorptionTimePerUnit;
  const totalSurvivalTimeSec = sinkCapacityTotalSec + effectiveTimeToMeltSec;

  // A standard 10-minute bombing run (600 seconds)
  const standardRunDurationSec = 600;
  const sinksNeeded = Math.ceil(standardRunDurationSec / sinkAbsorptionTimePerUnit);

  return {
    hullDegradationPerSecond,
    effectiveTimeToMeltSec,
    sinkCapacityTotalSec,
    totalSurvivalTimeSec,
    recommendedSinksForRun: sinksNeeded,
    synthResupplyRunsSupported: input.synthAmmoAvailable,
  };
}

/**
 * Step function to update or compute vent cycle metronome.
 */
export function tickVentMetronome(state: VentMetronomeState, deltaSec: number): VentMetronomeState {
  let { currentPhase, phaseRemainingSec, phaseDurationSec, cycleCount, activeVentTarget, damageWindowActive } = state;
  let remaining = phaseRemainingSec - deltaSec;

  if (remaining <= 0) {
    switch (currentPhase) {
      case 'APPROACH':
        currentPhase = 'VENT_OPEN';
        phaseDurationSec = 25; // 25s window for vents to stay open
        remaining = phaseDurationSec;
        damageWindowActive = false;
        break;
      case 'VENT_OPEN':
        // If not sabotaged, vents vent heat then heart exposure trigger
        currentPhase = 'VENT_SABOTAGED';
        phaseDurationSec = 8; // 8s transition for core destabilization
        remaining = phaseDurationSec;
        damageWindowActive = false;
        break;
      case 'VENT_SABOTAGED':
        currentPhase = 'HEART_EXPOSED';
        phaseDurationSec = 32; // 32s heart vulnerability window
        remaining = phaseDurationSec;
        damageWindowActive = true;
        break;
      case 'HEART_EXPOSED':
        currentPhase = 'COOLDOWN';
        phaseDurationSec = 20; // 20s Titan pushback wave & cooldown
        remaining = phaseDurationSec;
        damageWindowActive = false;
        break;
      case 'COOLDOWN':
        currentPhase = 'APPROACH';
        phaseDurationSec = 15;
        remaining = phaseDurationSec;
        damageWindowActive = false;
        cycleCount += 1;
        // Cycle active vent
        activeVentTarget = ((activeVentTarget % 8) + 1);
        break;
    }
  }

  return {
    currentPhase,
    phaseRemainingSec: Math.max(0, Number(remaining.toFixed(1))),
    phaseDurationSec,
    cycleCount,
    activeVentTarget,
    damageWindowActive,
  };
}

/**
 * Evaluates tactical convergence rating for ship hardpoint setup.
 */
export function evaluateConvergenceRating(weapons: AXBuildWeapon[]): { score: 'S' | 'A' | 'B' | 'C'; verdict: string } {
  const hasNanite = weapons.some(w => w.category === 'Nanite Pylon');
  const hasCaustic = weapons.some(w => w.category === 'Caustic Sink');
  const shardCount = weapons.filter(w => w.category === 'Guardian Shard').length;
  const axMcCount = weapons.filter(w => w.category === 'AX Multi-Cannon').length;

  if (hasNanite && hasCaustic && shardCount >= 2) {
    return { score: 'S', verdict: 'Optimal Meta Strike Group: Maximum Vent Sabotage & Heart Shred' };
  }
  if (hasNanite && hasCaustic && (shardCount >= 1 || axMcCount >= 2)) {
    return { score: 'A', verdict: 'Strong Combat Rating: Capable of Solo Heart Depletion' };
  }
  if (hasNanite) {
    return { score: 'B', verdict: 'Wing Saboteur Role: Reliant on Fleet for Primary Heart DPS' };
  }
  return { score: 'C', verdict: 'Sub-Optimal: Missing Essential Nanite Torpedo or Caustic Sink' };
}
