// Location: atlas/client/src/lib/engine/spire_site_engine.ts
// Spire Site Sabotage Operations & Orthrus Hunter Coordinator Engine (Stage 14.3)

export type SabotageTaskType = 'CONTAMINATED_SABOTAGE' | 'DRIVE_SABOTAGE' | 'BIOLOGICAL_EXTRACTION';

export interface SpireSurfaceCoords {
  latitude: number; // e.g. -28.455
  longitude: number; // e.g. 112.894
  formatted: string; // e.g. "-28.4550°, 112.8940°"
}

export interface PlanetarySpireSite {
  id: string; // e.g. 'spire-taranis-hyades-1'
  systemName: string;
  associatedTitan: 'Taranis' | 'Leigong' | 'Hadad' | 'Oya' | 'Indra' | 'Raijin' | 'Cocijo' | 'Thor';
  bodyName: string;
  surfaceCoords: SpireSurfaceCoords;
  gravityG: number; // Surface gravity in G
  gravityWarning: 'NORMAL' | 'ELEVATED' | 'HAZARDOUS_HIGH_G';
  distanceSolLy: number;
  systemCoords: { x: number; y: number; z: number };
  siteSecurityLevel: 'Active Countermeasures' | 'Heavy Anti-Air' | 'Severe Interceptor Patrols';
  recommendedEquipment: string[];
  activeMissions: SpireSabotageObjective[];
  cumulativeSabotageProgressPct: number; // 0% to 100%
  titanDamageContributionMHP: number; // Mega-Hitpoints contributed to Titan outer shield/hearts
}

export interface SpireSabotageObjective {
  id: string;
  type: SabotageTaskType;
  title: string;
  description: string;
  requiredCompoundOrTool: string;
  targetSubsystem: string;
  stepChecklist: string[];
  titanDefenseWeakeningPct: number; // Weekly reduction percentage per 100 runs
  rewardCreditsM: number;
  threatLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
}

export interface OrthrusSpawnProfile {
  id: string;
  siteId: string;
  spawnLocationDescription: string;
  spawnTrigger: string;
  estimatedInterceptDistanceKm: number;
  neutralizerOptimalWindowSec: {
    empChargeTimeSec: number; // Orthrus charges EMP shutdown field for 4.5s
    neutralizerTriggerAtSec: number; // Trigger neutralizer at exactly 3.2s - 4.0s
    neutralizerDurationSec: number; // Standard Shutdown Field Neutralizer active duration
  };
  combatVulnerabilities: string[];
  recommendedTactics: string[];
  payoutCreditsM: number; // Bond payout ~40M credits
}

export interface SpireSabotageState {
  totalSpiresActive: number;
  totalTitanDefenseWeakeningPct: number;
  sites: PlanetarySpireSite[];
}

/**
 * Canonical Spire Sites across Titan regions
 */
export const CANONICAL_SPIRE_SITES: PlanetarySpireSite[] = [
  {
    id: 'spire-hyades-st-s4-c3-5',
    systemName: 'Hyades Sector ST-S 4-c3',
    associatedTitan: 'Taranis',
    bodyName: 'Hyades Sector ST-S 4-c3 5',
    surfaceCoords: {
      latitude: -28.4552,
      longitude: 112.8941,
      formatted: '-28.4552°, 112.8941°',
    },
    gravityG: 0.28,
    gravityWarning: 'NORMAL',
    distanceSolLy: 114.8,
    systemCoords: { x: 70.3, y: -45.1, z: -88.5 },
    siteSecurityLevel: 'Active Countermeasures',
    recommendedEquipment: [
      'Corrosive Resistant Cargo Rack (Class 4+)',
      'Shutdown Field Neutralizer',
      'Enhanced AX Multi-Cannons (Overcharged)',
      'Maverick Suit w/ Increased Backpack Cap',
    ],
    cumulativeSabotageProgressPct: 78.5,
    titanDamageContributionMHP: 142.0,
    activeMissions: [
      {
        id: 'sab-contam-01',
        type: 'CONTAMINATED_SABOTAGE',
        title: 'Contaminated Compound Injection',
        description: 'Harvest contaminated compounds from outer growth pods and inject into the Spire primary nutrient vents.',
        requiredCompoundOrTool: 'Impure Spire Mineral / Contaminated Bio-Capsule',
        targetSubsystem: 'Primary Nutrient Core Vents',
        stepChecklist: [
          'Land planetary vessel >= 3.5km outside anti-ship spore perimeter.',
          'Deploy SRV / On-foot Maverick operative to collect bio-containers from Spire roots.',
          'Ascend inner Spire gantry avoiding Banshee guardian drones.',
          'Inject contaminated biological agent into nutrient delivery vent shaft.',
          'Evacuate vent radius before caustic backflush surge.',
        ],
        titanDefenseWeakeningPct: 1.45,
        rewardCreditsM: 32.5,
        threatLevel: 'Moderate',
      },
      {
        id: 'sab-drive-01',
        type: 'DRIVE_SABOTAGE',
        title: 'FSD / Propulsion Disruption',
        description: 'Disable the Spire site atmospheric drive regulator coils using thermal and explosive ordnance.',
        requiredCompoundOrTool: 'Sub-surface Displacement Missiles / Torpedo Pylons',
        targetSubsystem: 'Atmospheric Stabilization Nodes (4x perimeter towers)',
        stepChecklist: [
          'Fly sub-orbital skim run within 1,200m of perimeter towers.',
          'Synchronize missile strike across all 4 stabilization nodes within 60s.',
          'Deploy ECM to neutralize incoming Banshee anti-ship munitions.',
          'Confirm harmonic collapse of atmospheric drive field.',
        ],
        titanDefenseWeakeningPct: 2.1,
        rewardCreditsM: 48.0,
        threatLevel: 'High',
      },
      {
        id: 'sab-bio-01',
        type: 'BIOLOGICAL_EXTRACTION',
        title: 'Spire Tissue & Embryo Extraction',
        description: 'Extract viable high-grade tissue samples from the central Spire caldera for Aegis research.',
        requiredCompoundOrTool: 'Research Limpet Controller + Caustic Cargo Racks',
        targetSubsystem: 'Upper Spire Caldera Organ Core',
        stepChecklist: [
          'Hover directly above central caldera at 450m altitude.',
          'Fire Research Limpet into active bio-gland during pulsing extraction window.',
          'Maintain ship position through thermal updrafts and caustic spray.',
          'Retrieve limpet payload and secure into Corrosion Resistant Cargo Rack.',
        ],
        titanDefenseWeakeningPct: 0.95,
        rewardCreditsM: 24.0,
        threatLevel: 'Moderate',
      },
    ],
  },
  {
    id: 'spire-bproperty-leigong-1',
    systemName: 'HIP 8887',
    associatedTitan: 'Leigong',
    bodyName: 'HIP 8887 A 2 b',
    surfaceCoords: {
      latitude: 45.1204,
      longitude: -15.6728,
      formatted: '+45.1204°, -15.6728°',
    },
    gravityG: 1.84,
    gravityWarning: 'HAZARDOUS_HIGH_G',
    distanceSolLy: 138.2,
    systemCoords: { x: 92.1, y: -62.4, z: -110.0 },
    siteSecurityLevel: 'Heavy Anti-Air',
    recommendedEquipment: [
      'Heavy Duty High-G Landing Thrusters',
      'Shield Boosters (Thermal/Kinetic Reinforced)',
      'Shutdown Field Neutralizer',
      'Corrosive Resistant Cargo Rack',
    ],
    cumulativeSabotageProgressPct: 91.2,
    titanDamageContributionMHP: 220.5,
    activeMissions: [
      {
        id: 'sab-contam-02',
        type: 'CONTAMINATED_SABOTAGE',
        title: 'High-G Nutrient Sabotage Run',
        description: 'Inject corrosive sludge into high-gravity stabilized spire roots under constant Banshee mortar fire.',
        requiredCompoundOrTool: 'Corrosive Biological Residue',
        targetSubsystem: 'Deep Root Nutrient Manifold',
        stepChecklist: [
          'Execute high-G planetary approach keeping pitch angle above 25° at all times.',
          'Deploy heavy SRV Scarab; note increased braking distance under 1.84G.',
          'Infiltrate deep root nutrient manifold beneath southern spire arches.',
          'Inject corrosive agent and trigger emergency retreat.',
        ],
        titanDefenseWeakeningPct: 1.8,
        rewardCreditsM: 42.0,
        threatLevel: 'Extreme',
      },
      {
        id: 'sab-drive-02',
        type: 'DRIVE_SABOTAGE',
        title: 'Thermal Core Destabilization',
        description: 'Overload the Spire core heatsinks to provoke regional planetary grid collapse.',
        requiredCompoundOrTool: 'Thermic AX Multi-Cannons / Supercharged Torpedoes',
        targetSubsystem: 'Thermal Exhaust Chimneys',
        stepChecklist: [
          'Locate active orange-glowing exhaust chimneys around Spire summit.',
          'Conduct strafing run targeting open chimney valves.',
          'Maintain flight assist to counter violent 1.84G downward inertia.',
          'Confirm core temperature runaway signature.',
        ],
        titanDefenseWeakeningPct: 2.4,
        rewardCreditsM: 55.0,
        threatLevel: 'Extreme',
      },
    ],
  },
  {
    id: 'spire-hadad-cephei-1',
    systemName: 'Cephei Sector BV-Y b4',
    associatedTitan: 'Hadad',
    bodyName: 'Cephei Sector BV-Y b4 1 a',
    surfaceCoords: {
      latitude: -12.3391,
      longitude: 84.1022,
      formatted: '-12.3391°, 84.1022°',
    },
    gravityG: 0.82,
    gravityWarning: 'NORMAL',
    distanceSolLy: 168.4,
    systemCoords: { x: 120.5, y: -22.3, z: -145.2 },
    siteSecurityLevel: 'Severe Interceptor Patrols',
    recommendedEquipment: [
      'Guardian Gauss Cannons / Mod Shards',
      'Shutdown Field Neutralizer (Engineered)',
      'Fast-Charge Bi-Weave or Heavy Prismatics',
      'Sub-Surface Displacement Missiles',
    ],
    cumulativeSabotageProgressPct: 62.0,
    titanDamageContributionMHP: 110.8,
    activeMissions: [
      {
        id: 'sab-bio-03',
        type: 'BIOLOGICAL_EXTRACTION',
        title: 'Embryo Organ Harvest',
        description: 'Gather intact unfertilized embryo sacs from lower Spire nursery chambers.',
        requiredCompoundOrTool: 'Bio-Sampler Limpets / Cargo Scoops',
        targetSubsystem: 'Lower Spire Embryo Incubators',
        stepChecklist: [
          'Clear incoming Orthrus scout interceptors before descending below 500m.',
          'Deploy research extraction drones targeting incubator clusters.',
          'Monitor EMP build-up alarms from patrolling Orthrus reinforcements.',
          'Extract and jump out before Cyclops/Basilisk interceptor arrival.',
        ],
        titanDefenseWeakeningPct: 1.6,
        rewardCreditsM: 38.0,
        threatLevel: 'High',
      },
    ],
  },
  {
    id: 'spire-oya-col-1',
    systemName: 'Col 285 Sector MG-A b14-0',
    associatedTitan: 'Oya',
    bodyName: 'Col 285 Sector MG-A b14-0 2',
    surfaceCoords: {
      latitude: 18.7291,
      longitude: -142.6019,
      formatted: '+18.7291°, -142.6019°',
    },
    gravityG: 1.15,
    gravityWarning: 'ELEVATED',
    distanceSolLy: 142.0,
    systemCoords: { x: 88.0, y: -30.5, z: -120.4 },
    siteSecurityLevel: 'Active Countermeasures',
    recommendedEquipment: [
      'Enhanced AX Multi-Cannons (Turret/Gimbal)',
      'Shutdown Field Neutralizer',
      'Hull Reinforcements (Heavy Duty / Deep Plating)',
      'Caustic Sink Launchers',
    ],
    cumulativeSabotageProgressPct: 84.0,
    titanDamageContributionMHP: 185.0,
    activeMissions: [
      {
        id: 'sab-contam-04',
        type: 'CONTAMINATED_SABOTAGE',
        title: 'Nutrient Circuit Rupture',
        description: 'Sever high-pressure biological hydraulic lines feeding the central spire column.',
        requiredCompoundOrTool: 'Kinetic High-Impact Explosive Charges',
        targetSubsystem: 'Hydraulic Pumping Junction Alpha',
        stepChecklist: [
          'Deploy on-foot demolition team at southern trench entrance.',
          'Plant timed charge at hydraulic junction bypass valve.',
          'Engage incoming Scythe / Banshee security forces.',
          'Detonate and record hydraulic pressure collapse.',
        ],
        titanDefenseWeakeningPct: 2.0,
        rewardCreditsM: 45.0,
        threatLevel: 'High',
      },
    ],
  },
  {
    id: 'spire-indra-hr-1',
    systemName: 'HR 1185',
    associatedTitan: 'Indra',
    bodyName: 'HR 1185 A 4',
    surfaceCoords: {
      latitude: -5.612,
      longitude: 63.8814,
      formatted: '-5.6120°, 63.8814°',
    },
    gravityG: 0.44,
    gravityWarning: 'NORMAL',
    distanceSolLy: 122.5,
    systemCoords: { x: 65.2, y: -52.0, z: -95.0 },
    siteSecurityLevel: 'Heavy Anti-Air',
    recommendedEquipment: [
      'Sub-Surface Extraction Missiles',
      'Shutdown Field Neutralizer',
      'Shield Boosters',
      'Maverick Engineering Suit',
    ],
    cumulativeSabotageProgressPct: 95.0,
    titanDamageContributionMHP: 240.0,
    activeMissions: [
      {
        id: 'sab-drive-05',
        type: 'DRIVE_SABOTAGE',
        title: 'Atmospheric Drive Core Destruction',
        description: 'Complete final drive sabotage to trigger irreversible collapse of the regional Spire network.',
        requiredCompoundOrTool: 'Nanite Torpedoes / Guardian Plasma Accelerators',
        targetSubsystem: 'Spire Drive Core Crucible',
        stepChecklist: [
          'Penetrate top shield curtain with synchronized wing torpedo barrage.',
          'Deliver direct hits to glowing drive core crucible.',
          'Neutralize Orthrus evacuation vessel upon premature departure.',
          'Evacuate high-energy blast perimeter within 90s.',
        ],
        titanDefenseWeakeningPct: 3.2,
        rewardCreditsM: 70.0,
        threatLevel: 'Extreme',
      },
    ],
  },
  {
    id: 'spire-raijin-pegasi-1',
    systemName: 'Pegasi Sector GW-V b2-5',
    associatedTitan: 'Raijin',
    bodyName: 'Pegasi Sector GW-V b2-5 3 a',
    surfaceCoords: {
      latitude: 33.1045,
      longitude: -78.4312,
      formatted: '+33.1045°, -78.4312°',
    },
    gravityG: 2.35,
    gravityWarning: 'HAZARDOUS_HIGH_G',
    distanceSolLy: 175.0,
    systemCoords: { x: 145.0, y: -18.0, z: -160.0 },
    siteSecurityLevel: 'Severe Interceptor Patrols',
    recommendedEquipment: [
      'Grade 5 Dirty Drive Thrusters (Maximum Vertical Thrust)',
      'Multiple Shutdown Field Neutralizers',
      'Caustic Sink Launchers',
      'Heavy Reinforced Hull',
    ],
    cumulativeSabotageProgressPct: 53.5,
    titanDamageContributionMHP: 98.0,
    activeMissions: [
      {
        id: 'sab-bio-06',
        type: 'BIOLOGICAL_EXTRACTION',
        title: 'Deep High-G Tissue Sampling',
        description: 'Harvest hyper-dense biological armor strands growing exclusively in high-gravity Spire crevices.',
        requiredCompoundOrTool: 'Penetrative Research Probe',
        targetSubsystem: 'Primary Outer Chitin Matrix',
        stepChecklist: [
          'Establish low hover at 200m; do NOT disable flight assist under 2.35G.',
          'Launch penetrative probe into chitin fissure.',
          'Withstand caustic mortar barrages while probe extracts tissue matrix.',
          'Boost vertically to high orbit to avoid gravitational stall.',
        ],
        titanDefenseWeakeningPct: 1.5,
        rewardCreditsM: 35.0,
        threatLevel: 'Extreme',
      },
    ],
  },
  {
    id: 'spire-cocijo-arietis-1',
    systemName: '69 Arietis',
    associatedTitan: 'Cocijo',
    bodyName: '69 Arietis B 2 a',
    surfaceCoords: {
      latitude: -71.205,
      longitude: 15.3402,
      formatted: '-71.2050°, 15.3402°',
    },
    gravityG: 0.55,
    gravityWarning: 'NORMAL',
    distanceSolLy: 130.4,
    systemCoords: { x: 80.4, y: -40.1, z: -105.0 },
    siteSecurityLevel: 'Active Countermeasures',
    recommendedEquipment: [
      'Enhanced AX Multi-Cannons',
      'Shutdown Field Neutralizer',
      'Thermal Shock Defenses',
      'SRV Scarab / Scorpion',
    ],
    cumulativeSabotageProgressPct: 88.0,
    titanDamageContributionMHP: 205.0,
    activeMissions: [
      {
        id: 'sab-contam-07',
        type: 'CONTAMINATED_SABOTAGE',
        title: 'Cryo-Thermal Biocide Distribution',
        description: 'Dispense biocide canisters into sub-polar spire nutrient veins to freeze nutrient flows.',
        requiredCompoundOrTool: 'Aegis Biocide Capsule Mark IV',
        targetSubsystem: 'Sub-polar Nutrient Arteries',
        stepChecklist: [
          'Land in ice canyon 2km north-west of Spire.',
          'Infiltrate frozen nutrient fissure with SRV Scorpion.',
          'Deploy biocide dispenser inside pumping manifold.',
          'Observe vein necrosis and return to drop-ship.',
        ],
        titanDefenseWeakeningPct: 1.9,
        rewardCreditsM: 40.0,
        threatLevel: 'High',
      },
    ],
  },
  {
    id: 'spire-thor-tauri-1',
    systemName: 'HIP 25679',
    associatedTitan: 'Thor',
    bodyName: 'HIP 25679 2 c',
    surfaceCoords: {
      latitude: 14.8821,
      longitude: -105.419,
      formatted: '+14.8821°, -105.4190°',
    },
    gravityG: 1.05,
    gravityWarning: 'NORMAL',
    distanceSolLy: 155.0,
    systemCoords: { x: 105.0, y: -35.0, z: -130.0 },
    siteSecurityLevel: 'Heavy Anti-Air',
    recommendedEquipment: [
      'Guardian Shard Cannons (Overcharged)',
      'Shutdown Field Neutralizer',
      'Fast Decontamination Limpets',
      'Corrosion Resistant Cargo Rack',
    ],
    cumulativeSabotageProgressPct: 71.0,
    titanDamageContributionMHP: 160.0,
    activeMissions: [
      {
        id: 'sab-drive-08',
        type: 'DRIVE_SABOTAGE',
        title: 'Spire Core Resonance Fracture',
        description: 'Induce structural acoustic resonance to crack the Spire outer spire shell.',
        requiredCompoundOrTool: 'Acoustic Resonance Torpedoes',
        targetSubsystem: 'Structural Harmonic Nodes',
        stepChecklist: [
          'Acquire targeting lock on 3 harmonic resonators at base of spire.',
          'Fire resonance torpedoes with precise 5-second staggering.',
          'Neutralize Orthrus interceptor attempting to damp harmonic frequency.',
          'Observe external shell fracture and structural destabilization.',
        ],
        titanDefenseWeakeningPct: 2.2,
        rewardCreditsM: 50.0,
        threatLevel: 'High',
      },
    ],
  },
];

/**
 * Canonical Orthrus Interceptor Spawn Profiles & Neutralizer Timings
 */
export const CANONICAL_ORTHRUS_PROFILES: OrthrusSpawnProfile[] = [
  {
    id: 'orthrus-profile-primary',
    siteId: 'all',
    spawnLocationDescription: 'Spire Central Caldera Rim (altitude 800m - 1,200m AGL)',
    spawnTrigger: 'Triggered when Spire Sabotage progress increases, or every 8-12 minutes during active CMDR presence',
    estimatedInterceptDistanceKm: 1.5,
    neutralizerOptimalWindowSec: {
      empChargeTimeSec: 4.5,
      neutralizerTriggerAtSec: 3.5, // Hold neutralizer between 3.2s and 4.2s for perfect pulse absorption
      neutralizerDurationSec: 5.0,
    },
    combatVulnerabilities: [
      'Unshielded Hull vulnerable to pure AX Kinetic/Thermal (Enhanced AX MCs shred hull in 12s)',
      'No primary offensive weapons (only fires Caustic Missiles and EMP Shutdown Field)',
      'Flees immediately when hull drops below 50% or when EMP fails',
      'Cannot deploy Thargon swarms',
    ],
    recommendedTactics: [
      'Pre-position wing fireteams around Caldera at 1,000m altitude.',
      'Listen for the distinct low-frequency acoustic howl signaling EMP charge initiation (4.5s countdown).',
      'Charge and hold Shutdown Field Neutralizer at the 3.5s mark (requires 100% SYS capacitor distributor pips).',
      'Once EMP dissipates, immediately focus all fire on Orthrus propulsion drive thrusters to prevent hyperjump wake escape.',
      'Collect Thargoid Orthrus Tissue Sample and Thargoid Heart via Research Limpets before kill confirmation.',
    ],
    payoutCreditsM: 40.0,
  },
];

/**
 * Evaluate surface gravity warning level
 */
export function evaluateGravityWarning(gravityG: number): 'NORMAL' | 'ELEVATED' | 'HAZARDOUS_HIGH_G' {
  if (gravityG >= 1.5) {
    return 'HAZARDOUS_HIGH_G';
  }
  if (gravityG >= 1.1) {
    return 'ELEVATED';
  }
  return 'NORMAL';
}

/**
 * Calculate total regional Titan defense weakening from cumulative Spire sabotages
 */
export function calculateCumulativeSabotageState(sites: PlanetarySpireSite[] = CANONICAL_SPIRE_SITES): SpireSabotageState {
  const totalSpiresActive = sites.length;
  const totalWeakening = sites.reduce((sum, site) => {
    // Each site's cumulative progress provides up to 5% Titan defense reduction
    const siteImpact = (site.cumulativeSabotageProgressPct / 100) * 5.0;
    return sum + siteImpact;
  }, 0);

  return {
    totalSpiresActive,
    totalTitanDefenseWeakeningPct: Number(totalWeakening.toFixed(2)),
    sites,
  };
}

/**
 * Filter Spire sites by system search, associated Titan, and gravity profile
 */
export interface SpireFilterCriteria {
  searchQuery?: string;
  associatedTitan?: 'ALL' | string;
  gravityWarning?: 'ALL' | 'NORMAL' | 'ELEVATED' | 'HAZARDOUS_HIGH_G';
  minProgressPct?: number;
}

export function filterSpireSites(
  sites: PlanetarySpireSite[],
  criteria: SpireFilterCriteria
): PlanetarySpireSite[] {
  return sites.filter((site) => {
    if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
      const q = criteria.searchQuery.toLowerCase().trim();
      const matchName = site.systemName.toLowerCase().includes(q);
      const matchBody = site.bodyName.toLowerCase().includes(q);
      const matchTitan = site.associatedTitan.toLowerCase().includes(q);
      if (!matchName && !matchBody && !matchTitan) {
        return false;
      }
    }

    if (criteria.associatedTitan && criteria.associatedTitan !== 'ALL') {
      if (site.associatedTitan.toLowerCase() !== criteria.associatedTitan.toLowerCase()) {
        return false;
      }
    }

    if (criteria.gravityWarning && criteria.gravityWarning !== 'ALL') {
      if (site.gravityWarning !== criteria.gravityWarning) {
        return false;
      }
    }

    if (criteria.minProgressPct !== undefined) {
      if (site.cumulativeSabotageProgressPct < criteria.minProgressPct) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate distance between two coordinates in 3D galactic space
 */
export function calculateGalacticDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(1));
}
