// Location: atlas/client/src/lib/engine/flight_assist_engine.ts
// Stage 12.4: High-G Touchdown Assistant & Exobiology Divergence Ring
// Computes descent rate vs surface gravity (G) and safe vertical descent thruster counter-thrust velocity.
// Implements exobiology genus taxonomy database, colony radius requirements, and distance tracking.

export interface HighGDescentParams {
  altitudeM: number;       // Radar or barometric altitude above surface
  verticalSpeedMs: number; // Negative = sinking / descending, positive = climbing
  gravityG: number;        // Surface gravity in Gs (1G = 9.80665 m/s^2)
  glideAngleDeg?: number;  // Pitch or flight path glide angle (-90 deg to 0 deg)
  shipClass?: 'Small' | 'Medium' | 'Large' | 'Standard';
}

export type TouchdownWarningTier = 'NOMINAL' | 'CAUTION' | 'DANGER_PULL_UP' | 'CRITICAL_TERRAIN';

export interface TouchdownSafetyEvaluation {
  gravityG: number;
  altitudeM: number;
  verticalSpeedMs: number;
  sinkRateMs: number;                // absolute positive sink rate
  maxSafeSinkRateMs: number;         // Safe counter-thrust limit for this G & altitude
  thrustDecelCapabilityMs2: number;  // Estimated counter-thrust decel available (m/s^2)
  timeToImpactSeconds: number;       // Seconds remaining at current sink rate
  stoppingDistanceM: number;         // Distance needed to come to a full stop against gravity
  warningTier: TouchdownWarningTier;
  warningBannerText: string;
  flashingAlert: boolean;
  audioToneFrequencyHz: number | null; // e.g. 880Hz or 1100Hz warning tone
  audioPulseIntervalMs: number;
  recommendation: string;
}

/**
 * Baseline vertical thruster acceleration capacity by ship class:
 * In Elite Dangerous, bottom vertical thrusters provide roughly ~15 - 28 m/s^2 of upward thrust
 * depending on thruster engineering and ship mass.
 */
export function calculateTouchdownSafety(params: HighGDescentParams): TouchdownSafetyEvaluation {
  const gAcc = Math.max(0.01, params.gravityG) * 9.80665; // local acceleration due to gravity
  const sinkRate = Math.max(0, -params.verticalSpeedMs); // downward speed is positive sink
  const alt = Math.max(0, params.altitudeM);

  // Bottom thrusters typically provide ~22 m/s^2 baseline on exploration/utility vessels
  const thrusterMaxUpwardAcc = 24.5;
  const netDecelCapability = Math.max(0.5, thrusterMaxUpwardAcc - gAcc);

  // Safe maximum descent rate as a function of altitude and local gravity:
  // v_safe = sqrt(2 * a_net * h_margin)
  // Close to surface (< 100m), touchdown speed must be under 5 m/s (or under 2 m/s on > 2G)
  let maxSafeSinkRate: number;
  if (alt < 50) {
    maxSafeSinkRate = Math.max(1.5, Math.min(5.0, 6.0 / Math.max(1, params.gravityG)));
  } else if (alt < 200) {
    maxSafeSinkRate = Math.max(4.0, Math.min(15.0, 18.0 / Math.max(0.8, params.gravityG)));
  } else if (alt < 1000) {
    maxSafeSinkRate = Math.max(12.0, Math.min(45.0, 50.0 / Math.max(0.6, params.gravityG)));
  } else {
    maxSafeSinkRate = Math.max(25.0, Math.min(120.0, 140.0 / Math.max(0.5, params.gravityG)));
  }

  // Calculate physics stopping distance: s = v^2 / (2 * a_net)
  const stoppingDistance = (sinkRate * sinkRate) / (2 * netDecelCapability);
  const timeToImpact = sinkRate > 0.1 ? alt / sinkRate : 999;

  let warningTier: TouchdownWarningTier = 'NOMINAL';
  let bannerText = 'DESCENT RATE NOMINAL';
  let flashing = false;
  let toneHz: number | null = null;
  let pulseMs = 0;
  let recommendation = 'Maintain stable approach glide';

  if (params.gravityG >= 2.5 && alt > 0 && alt < 3000) {
    if (stoppingDistance >= alt * 0.85 || (sinkRate > maxSafeSinkRate * 1.5 && alt < 500)) {
      warningTier = 'CRITICAL_TERRAIN';
      bannerText = 'PULL UP! TERRAIN IMPACT IMMINENT';
      flashing = true;
      toneHz = 1100;
      pulseMs = 140;
      recommendation = 'MAX VERTICAL BOOST — LEVEL ATTITUDE HORIZON';
    } else if (stoppingDistance >= alt * 0.55 || sinkRate > maxSafeSinkRate) {
      warningTier = 'DANGER_PULL_UP';
      bannerText = `HIGH-G WARNING: ${params.gravityG.toFixed(2)}G — SINK RATE EXCESSIVE`;
      flashing = true;
      toneHz = 880;
      pulseMs = 280;
      recommendation = 'REDUCE PITCH — APPLY COUNTER-THRUST';
    } else if (params.gravityG >= 2.0 && sinkRate > maxSafeSinkRate * 0.7) {
      warningTier = 'CAUTION';
      bannerText = `HIGH-G CAUTION: ${params.gravityG.toFixed(2)}G SURFACE GRAVITY`;
      flashing = false;
      toneHz = 520;
      pulseMs = 600;
      recommendation = 'Monitor descent ladder closely';
    }
  } else if (alt > 0 && alt < 500 && sinkRate > maxSafeSinkRate) {
    if (alt < 100 && sinkRate > 10) {
      warningTier = 'CRITICAL_TERRAIN';
      bannerText = 'TERRAIN! SINK RATE CRITICAL';
      flashing = true;
      toneHz = 1100;
      pulseMs = 150;
      recommendation = 'DECELERATE TOUCHDOWN SPEED';
    } else {
      warningTier = 'CAUTION';
      bannerText = 'SINK RATE ADVISORY';
      flashing = false;
      toneHz = 587;
      pulseMs = 500;
      recommendation = 'Counter-thrust to stabilize glide';
    }
  }

  return {
    gravityG: params.gravityG,
    altitudeM: alt,
    verticalSpeedMs: params.verticalSpeedMs,
    sinkRateMs: Number(sinkRate.toFixed(1)),
    maxSafeSinkRateMs: Number(maxSafeSinkRate.toFixed(1)),
    thrustDecelCapabilityMs2: Number(netDecelCapability.toFixed(2)),
    timeToImpactSeconds: Number(Math.min(999, timeToImpact).toFixed(1)),
    stoppingDistanceM: Number(stoppingDistance.toFixed(1)),
    warningTier,
    warningBannerText: bannerText,
    flashingAlert: flashing,
    audioToneFrequencyHz: toneHz,
    audioPulseIntervalMs: pulseMs,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Exobiology Genus Taxonomy & Clonal Divergence Ring
// ---------------------------------------------------------------------------

export interface ExobiologyGenusRecord {
  genusKey: string;
  genusName: string;
  canonicalDistanceM: number; // Minimum required distance from sample 1 -> 2 -> 3
  typicalValueCr: number;
  sampleType: 'Bacterial Colony' | 'Fungal Growth' | 'Plant Specimen' | 'Organic Crystal';
  typicalColor: string;
  notes: string;
}

export const EXOBIOLOGY_GENUS_CATALOG: ExobiologyGenusRecord[] = [
  {
    genusKey: 'stratum',
    genusName: 'Stratum',
    canonicalDistanceM: 500,
    typicalValueCr: 19010800,
    sampleType: 'Plant Specimen',
    typicalColor: '#10b981',
    notes: 'Stratum Tectonicas / Laminata — Highest value bio-signature in Horizons/Odyssey.',
  },
  {
    genusKey: 'aleoida',
    genusName: 'Aleoida',
    canonicalDistanceM: 150,
    typicalValueCr: 12934900,
    sampleType: 'Plant Specimen',
    typicalColor: '#06b6d4',
    notes: 'Aleoida Gravis / Araneata — Distinct branching flora clustered in rocky plains.',
  },
  {
    genusKey: 'clypeus',
    genusName: 'Clypeus',
    canonicalDistanceM: 150,
    typicalValueCr: 8418000,
    sampleType: 'Plant Specimen',
    typicalColor: '#a855f7',
    notes: 'Clypeus Lacrimam — Shielded domed vegetation found in rocky fissures.',
  },
  {
    genusKey: 'frutexa',
    genusName: 'Frutexa',
    canonicalDistanceM: 150,
    typicalValueCr: 1632500,
    sampleType: 'Plant Specimen',
    typicalColor: '#f59e0b',
    notes: 'Frutexa Metallicum / Flabellum — Shrub-like scrubland colonial flora.',
  },
  {
    genusKey: 'tussock',
    genusName: 'Tussock',
    canonicalDistanceM: 200,
    typicalValueCr: 7721500,
    sampleType: 'Plant Specimen',
    typicalColor: '#84cc16',
    notes: 'Tussock Capillum / Albata — Clumped tall fibrous grass colonies.',
  },
  {
    genusKey: 'bacterium',
    genusName: 'Bacterium',
    canonicalDistanceM: 500,
    typicalValueCr: 1000000,
    sampleType: 'Bacterial Colony',
    typicalColor: '#eab308',
    notes: 'Bacterium Aurasus / Cerbrus — Thin iridescent microbial biofilm sheets.',
  },
  {
    genusKey: 'fonticulua',
    genusName: 'Fonticulua',
    canonicalDistanceM: 500,
    typicalValueCr: 20000000,
    sampleType: 'Plant Specimen',
    typicalColor: '#ec4899',
    notes: 'Fonticulua Campestris — Geothermal fountain vent flora, exceptionally valuable.',
  },
  {
    genusKey: 'ossea',
    genusName: 'Ossea',
    canonicalDistanceM: 800,
    typicalValueCr: 2855300,
    sampleType: 'Organic Crystal',
    typicalColor: '#f97316',
    notes: 'Ossea Spiralis — Calcified bone-like skeletal pillars requiring wide traversal.',
  },
  {
    genusKey: 'tubus',
    genusName: 'Tubus',
    canonicalDistanceM: 800,
    typicalValueCr: 11849100,
    sampleType: 'Plant Specimen',
    typicalColor: '#38bdf8',
    notes: 'Tubus Rosarium / Conifer — Tall hollow chimney tubes found in canyon basins.',
  },
  {
    genusKey: 'concha',
    genusName: 'Concha',
    canonicalDistanceM: 150,
    typicalValueCr: 4774300,
    sampleType: 'Plant Specimen',
    typicalColor: '#14b8a6',
    notes: 'Concha Biconcavis — Spiral shell-like organo-mineral formations.',
  },
  {
    genusKey: 'electricae',
    genusName: 'Electricae',
    canonicalDistanceM: 1000,
    typicalValueCr: 6786000,
    sampleType: 'Plant Specimen',
    typicalColor: '#818cf8',
    notes: 'Electricae Pluma — Bio-electric discharge organisms; requires 1,000m separation.',
  },
  {
    genusKey: 'recepta',
    genusName: 'Recepta',
    canonicalDistanceM: 150,
    typicalValueCr: 14209500,
    sampleType: 'Plant Specimen',
    typicalColor: '#f43f5e',
    notes: 'Recepta Deltahedron — Hexagonal cup chalices with luminous centers.',
  },
];

export interface BioSamplePoint {
  sampleNumber: 1 | 2 | 3;
  latitude: number;
  longitude: number;
  xMeters: number;
  yMeters: number;
  timestamp: number;
}

export interface ExobiologyDivergenceState {
  activeGenus: ExobiologyGenusRecord;
  currentSampleStep: 1 | 2 | 3; // 1 = first sample logged, seeking 2; 2 = seeking 3; 3 = complete
  samples: BioSamplePoint[];
  distanceTraveledM: number;
  divergenceAchieved: boolean; // true if distanceTraveledM >= canonicalDistanceM
  divergencePercent: number;  // 0% - 100%+
}
