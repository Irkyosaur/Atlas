// Location: client/src/lib/engine/body_probability_classifier.ts
// Stage 16.2: Earth-Like & High-Value Body Probability Classifier
// Bayesian multi-class scoring engine for planetary classifications (ELW, Water World, Ammonia World,
// Terraformable HMC, High Metal Content, Gas Giant with Water/Ammonia life).

import {
  calculateHabitableZone,
  calculateEquilibriumTemperature,
  type StellarParameters,
  type HabitableZoneBoundary
} from './habitable_zone_calculator';

export type HighValueBodyClass =
  | 'EARTH_LIKE_WORLD'
  | 'WATER_WORLD'
  | 'AMMONIA_WORLD'
  | 'TERRAFORMABLE_HMC'
  | 'HIGH_METAL_CONTENT'
  | 'GAS_GIANT_WATER_LIFE'
  | 'GAS_GIANT_AMMONIA_LIFE'
  | 'METAL_RICH_BODY'
  | 'ROCKY_ICE_BODY';

export interface BodyClassificationProbability {
  bodyClass: HighValueBodyClass;
  label: string;
  probability: number;            // 0.00 to 1.00
  percentageFormatted: string;    // e.g. "87.4%"
  isPrimaryCandidate: boolean;
  isTerraformableCandidate: boolean;
  estimatedPayoutCr: number;      // FSS + DSS first discovery estimated credit payout
  confidenceInterval: [number, number]; // [lower, upper]
  heuristics: string[];           // Qualitative breakdown reasons (e.g. "Inside conservative Goldilocks band")
}

export interface CandidateBodyInput {
  bodyId?: number;
  bodyName?: string;
  distanceLs: number;
  earthMasses?: number;
  radiusKm?: number;
  surfaceGravityG?: number;
  surfaceTempK?: number;
  surfacePressureAtm?: number;
  atmosphereType?: string;
  volcanism?: string;
  orbitalEccentricity?: number;
  isLandable?: boolean;
}

export interface SystemProbabilityAssessment {
  star: StellarParameters;
  habitableZone: HabitableZoneBoundary;
  timestamp: number;
  predictions: BodyClassificationProbability[];
  highestValueTarget: BodyClassificationProbability | null;
  totalEstimatedSystemValueCr: number;
  goldilocksMatchScore: number; // 0 to 100 score indicating alignment with prime habitable parameters
  isGoldilocksCandidate: boolean;
  diagnosticNotes: string[];
}

// Canonical Elite Dangerous baseline exploration payouts (DSS + FSS + First Discovery)
export const BODY_CLASS_PAYOUTS: Record<HighValueBodyClass, number> = {
  EARTH_LIKE_WORLD: 3_250_000,
  WATER_WORLD: 1_200_000,
  AMMONIA_WORLD: 600_000,
  TERRAFORMABLE_HMC: 2_150_000,
  HIGH_METAL_CONTENT: 180_000,
  GAS_GIANT_WATER_LIFE: 350_000,
  GAS_GIANT_AMMONIA_LIFE: 320_000,
  METAL_RICH_BODY: 90_000,
  ROCKY_ICE_BODY: 30_000
};

// Friendly labels
export const BODY_CLASS_LABELS: Record<HighValueBodyClass, string> = {
  EARTH_LIKE_WORLD: 'Earth-Like World (ELW)',
  WATER_WORLD: 'Water World (WW)',
  AMMONIA_WORLD: 'Ammonia World (AW)',
  TERRAFORMABLE_HMC: 'Terraformable High Metal Content (THMC)',
  HIGH_METAL_CONTENT: 'High Metal Content World (HMC)',
  GAS_GIANT_WATER_LIFE: 'Gas Giant w/ Water-Based Life',
  GAS_GIANT_AMMONIA_LIFE: 'Gas Giant w/ Ammonia-Based Life',
  METAL_RICH_BODY: 'Metal-Rich Body (MRB)',
  ROCKY_ICE_BODY: 'Rocky Ice World'
};

// Base prior distribution by spectral type (Bayesian Prior P(Class|Spectral))
// Based on empirical ED exploration archives (>100M scanned bodies)
const BAYESIAN_SPECTRAL_PRIORS: Record<string, Record<HighValueBodyClass, number>> = {
  G: {
    EARTH_LIKE_WORLD: 0.014,
    WATER_WORLD: 0.055,
    AMMONIA_WORLD: 0.010,
    TERRAFORMABLE_HMC: 0.120,
    HIGH_METAL_CONTENT: 0.420,
    GAS_GIANT_WATER_LIFE: 0.018,
    GAS_GIANT_AMMONIA_LIFE: 0.015,
    METAL_RICH_BODY: 0.080,
    ROCKY_ICE_BODY: 0.180
  },
  F: {
    EARTH_LIKE_WORLD: 0.012,
    WATER_WORLD: 0.048,
    AMMONIA_WORLD: 0.009,
    TERRAFORMABLE_HMC: 0.135,
    HIGH_METAL_CONTENT: 0.430,
    GAS_GIANT_WATER_LIFE: 0.020,
    GAS_GIANT_AMMONIA_LIFE: 0.014,
    METAL_RICH_BODY: 0.090,
    ROCKY_ICE_BODY: 0.160
  },
  K: {
    EARTH_LIKE_WORLD: 0.016,
    WATER_WORLD: 0.062,
    AMMONIA_WORLD: 0.012,
    TERRAFORMABLE_HMC: 0.110,
    HIGH_METAL_CONTENT: 0.380,
    GAS_GIANT_WATER_LIFE: 0.015,
    GAS_GIANT_AMMONIA_LIFE: 0.018,
    METAL_RICH_BODY: 0.070,
    ROCKY_ICE_BODY: 0.200
  },
  M: {
    EARTH_LIKE_WORLD: 0.002,
    WATER_WORLD: 0.035,
    AMMONIA_WORLD: 0.014,
    TERRAFORMABLE_HMC: 0.045,
    HIGH_METAL_CONTENT: 0.320,
    GAS_GIANT_WATER_LIFE: 0.008,
    GAS_GIANT_AMMONIA_LIFE: 0.022,
    METAL_RICH_BODY: 0.050,
    ROCKY_ICE_BODY: 0.350
  },
  A: {
    EARTH_LIKE_WORLD: 0.004,
    WATER_WORLD: 0.022,
    AMMONIA_WORLD: 0.006,
    TERRAFORMABLE_HMC: 0.080,
    HIGH_METAL_CONTENT: 0.450,
    GAS_GIANT_WATER_LIFE: 0.012,
    GAS_GIANT_AMMONIA_LIFE: 0.008,
    METAL_RICH_BODY: 0.140,
    ROCKY_ICE_BODY: 0.150
  },
  DEFAULT: {
    EARTH_LIKE_WORLD: 0.005,
    WATER_WORLD: 0.030,
    AMMONIA_WORLD: 0.008,
    TERRAFORMABLE_HMC: 0.060,
    HIGH_METAL_CONTENT: 0.350,
    GAS_GIANT_WATER_LIFE: 0.010,
    GAS_GIANT_AMMONIA_LIFE: 0.010,
    METAL_RICH_BODY: 0.080,
    ROCKY_ICE_BODY: 0.250
  }
};

export class BodyProbabilityClassifier {
  private static instance: BodyProbabilityClassifier | null = null;

  public static getInstance(): BodyProbabilityClassifier {
    if (!BodyProbabilityClassifier.instance) {
      BodyProbabilityClassifier.instance = new BodyProbabilityClassifier();
    }
    return BodyProbabilityClassifier.instance;
  }

  /**
   * Classify candidate planetary body probabilities given stellar parameters and orbital telemetry
   */
  public evaluateCandidateBody(
    star: StellarParameters,
    candidate: CandidateBodyInput
  ): SystemProbabilityAssessment {
    const hz = calculateHabitableZone(star);
    const spectralClass = star.spectralClass.trim().toUpperCase().charAt(0) || 'G';
    const priors = BAYESIAN_SPECTRAL_PRIORS[spectralClass] || BAYESIAN_SPECTRAL_PRIORS.DEFAULT;

    // Derived or given equilibrium temp
    const distLs = Math.max(candidate.distanceLs, 1.0);
    const estimatedTempK = candidate.surfaceTempK ?? calculateEquilibriumTemperature(star, distLs);
    const mass = candidate.earthMasses ?? (candidate.radiusKm ? Math.pow(candidate.radiusKm / 6371.0, 3.3) : 1.0);
    const gravity = candidate.surfaceGravityG ?? (candidate.radiusKm ? mass / Math.pow(candidate.radiusKm / 6371.0, 2) : 1.0);

    // Habitable Zone Positional Factors
    const inConservativeHz = distLs >= hz.innerConservativeLs && distLs <= hz.outerConservativeLs;
    const inOptimisticHz = distLs >= hz.innerOptimisticLs && distLs <= hz.outerOptimisticLs;
    const isTidallyLocked = distLs <= hz.tidalLockingBoundaryLs;

    // Distance normalized ratio relative to center of HZ
    const hzRatio = distLs / Math.max(hz.recommendedCenterLs, 1.0);
    const hzProximity = Math.exp(-Math.pow(Math.log(hzRatio), 2) / 0.35); // Gaussian bell curve centered at HZ mid

    // Likelihood multipliers
    const scores: Record<HighValueBodyClass, number> = {
      EARTH_LIKE_WORLD: priors.EARTH_LIKE_WORLD,
      WATER_WORLD: priors.WATER_WORLD,
      AMMONIA_WORLD: priors.AMMONIA_WORLD,
      TERRAFORMABLE_HMC: priors.TERRAFORMABLE_HMC,
      HIGH_METAL_CONTENT: priors.HIGH_METAL_CONTENT,
      GAS_GIANT_WATER_LIFE: priors.GAS_GIANT_WATER_LIFE,
      GAS_GIANT_AMMONIA_LIFE: priors.GAS_GIANT_AMMONIA_LIFE,
      METAL_RICH_BODY: priors.METAL_RICH_BODY,
      ROCKY_ICE_BODY: priors.ROCKY_ICE_BODY
    };

    const heuristicsMap: Record<HighValueBodyClass, string[]> = {
      EARTH_LIKE_WORLD: [],
      WATER_WORLD: [],
      AMMONIA_WORLD: [],
      TERRAFORMABLE_HMC: [],
      HIGH_METAL_CONTENT: [],
      GAS_GIANT_WATER_LIFE: [],
      GAS_GIANT_AMMONIA_LIFE: [],
      METAL_RICH_BODY: [],
      ROCKY_ICE_BODY: []
    };

    // 1. Earth-Like World (ELW) Heuristics
    // Mass: 0.2 - 2.5 Earths, Temp: 260K - 320K, Radius: 3500 - 9000 km, Inside HZ, Non-tidal locking preferred
    if (inConservativeHz) {
      scores.EARTH_LIKE_WORLD *= 4.5 * hzProximity;
      heuristicsMap.EARTH_LIKE_WORLD.push('Inside Conservative Habitable Zone');
    } else if (inOptimisticHz) {
      scores.EARTH_LIKE_WORLD *= 2.2 * hzProximity;
      heuristicsMap.EARTH_LIKE_WORLD.push('Inside Optimistic Habitable Zone');
    } else {
      scores.EARTH_LIKE_WORLD *= 0.05;
      heuristicsMap.EARTH_LIKE_WORLD.push('Outside Habitable Radiative Envelope');
    }

    if (estimatedTempK >= 260 && estimatedTempK <= 320) {
      scores.EARTH_LIKE_WORLD *= 2.5;
      heuristicsMap.EARTH_LIKE_WORLD.push(`Equilibrium Temp (${estimatedTempK} K) matches Goldilocks window (260-320K)`);
    } else {
      scores.EARTH_LIKE_WORLD *= 0.15;
    }

    if (mass >= 0.2 && mass <= 2.8) {
      scores.EARTH_LIKE_WORLD *= 2.0;
      heuristicsMap.EARTH_LIKE_WORLD.push(`Planetary mass (${mass.toFixed(2)} M⊕) within ELW retention bounds`);
    } else {
      scores.EARTH_LIKE_WORLD *= 0.1;
    }

    if (!isTidallyLocked) {
      scores.EARTH_LIKE_WORLD *= 1.4;
      heuristicsMap.EARTH_LIKE_WORLD.push('Outside tidal locking radius (free planetary rotation)');
    } else {
      scores.EARTH_LIKE_WORLD *= 0.4;
      heuristicsMap.EARTH_LIKE_WORLD.push('Tidally locked orbit reduces ELW atmospheric stability');
    }

    // 2. Terraformable HMC Heuristics
    if (inOptimisticHz && mass >= 0.1 && mass <= 3.5) {
      scores.TERRAFORMABLE_HMC *= 3.8 * hzProximity;
      heuristicsMap.TERRAFORMABLE_HMC.push('Ideal mass and radiation flux for terraforming candidate');
    } else if (distLs < hz.innerOptimisticLs && distLs > hz.innerOptimisticLs * 0.6) {
      scores.TERRAFORMABLE_HMC *= 1.8;
      heuristicsMap.TERRAFORMABLE_HMC.push('Warm-boundary inner terraformable corridor');
    }

    // 3. Water World Heuristics
    if (estimatedTempK >= 240 && estimatedTempK <= 380) {
      scores.WATER_WORLD *= 2.8 * Math.max(hzProximity, 0.4);
      heuristicsMap.WATER_WORLD.push(`Stable liquid surface water equilibrium (${estimatedTempK} K)`);
    }
    if (inConservativeHz) {
      heuristicsMap.WATER_WORLD.push('Candidate for Terraformable Water World bonus');
    }

    // 4. Ammonia World Heuristics
    // Ammonia worlds thrive in colder zones (170K - 245K), typically outside the water HZ (1.1x to 3.5x outer HZ)
    const isAmmoniaThermalBand = estimatedTempK >= 165 && estimatedTempK <= 245;
    const isAmmoniaOrbit = distLs >= hz.outerConservativeLs * 0.9 && distLs <= hz.outerOptimisticLs * 3.5;
    if (isAmmoniaThermalBand || isAmmoniaOrbit) {
      scores.AMMONIA_WORLD *= 12.0;
      heuristicsMap.AMMONIA_WORLD.push(`Cold liquid ammonia solvent range (${estimatedTempK} K) outside water HZ`);
    } else {
      scores.AMMONIA_WORLD *= 0.2;
    }

    // High Metal Content base dampening when far outside warm zone
    if (distLs > hz.outerOptimisticLs * 1.5) {
      scores.HIGH_METAL_CONTENT *= 0.35;
    }

    // 5. Gas Giants with Life
    if (mass > 8.0 || (candidate.radiusKm && candidate.radiusKm > 15000)) {
      if (estimatedTempK >= 220 && estimatedTempK <= 340) {
        scores.GAS_GIANT_WATER_LIFE *= 5.0;
        heuristicsMap.GAS_GIANT_WATER_LIFE.push('Atmospheric water vapor convection cloud layer');
      }
      if (estimatedTempK >= 140 && estimatedTempK <= 220) {
        scores.GAS_GIANT_AMMONIA_LIFE *= 5.2;
        heuristicsMap.GAS_GIANT_AMMONIA_LIFE.push('Sub-zero ammonia aerosol cloud biological zone');
      }
    } else {
      scores.GAS_GIANT_WATER_LIFE *= 0.05;
      scores.GAS_GIANT_AMMONIA_LIFE *= 0.05;
    }

    // 6. Metal-Rich Body Heuristics (close to star, high temp >600K)
    if (distLs < hz.innerOptimisticLs * 0.5 || estimatedTempK > 550) {
      scores.METAL_RICH_BODY *= 3.5;
      heuristicsMap.METAL_RICH_BODY.push('Close-orbit stellar radiative baking stripped silicate mantle');
    } else {
      scores.METAL_RICH_BODY *= 0.25;
    }

    // 7. Rocky Ice Body (Cold Outer System)
    if (distLs > hz.outerOptimisticLs * 2.5 || estimatedTempK < 150) {
      scores.ROCKY_ICE_BODY *= 3.0;
      heuristicsMap.ROCKY_ICE_BODY.push('Outer system volatile freeze zone beyond snowline');
    }

    // Normalize probabilities using Softmax / Bayesian marginal sum
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const classes = Object.keys(scores) as HighValueBodyClass[];

    const predictions: BodyClassificationProbability[] = classes.map((bClass) => {
      const prob = Math.min(Math.max(scores[bClass] / Math.max(totalScore, 0.0001), 0.001), 0.999);
      const isTerraformable = bClass === 'TERRAFORMABLE_HMC' || (bClass === 'WATER_WORLD' && inConservativeHz);
      const payout = BODY_CLASS_PAYOUTS[bClass] * (isTerraformable ? 1.4 : 1.0);
      const lower = Math.max(0, prob - 0.06);
      const upper = Math.min(1.0, prob + 0.06);

      return {
        bodyClass: bClass,
        label: BODY_CLASS_LABELS[bClass],
        probability: Number(prob.toFixed(3)),
        percentageFormatted: `${(prob * 100).toFixed(1)}%`,
        isPrimaryCandidate: false, // will mark highest below
        isTerraformableCandidate: isTerraformable,
        estimatedPayoutCr: Math.round(payout),
        confidenceInterval: [Number(lower.toFixed(3)), Number(upper.toFixed(3))],
        heuristics: heuristicsMap[bClass]
      };
    });

    // Sort by descending probability
    predictions.sort((a, b) => b.probability - a.probability);
    if (predictions.length > 0) {
      predictions[0].isPrimaryCandidate = true;
    }

    // Overall Goldilocks score (0-100)
    let goldilocksScore = 0;
    if (inConservativeHz) {
      goldilocksScore = 80 + Math.round(hzProximity * 20);
    } else if (inOptimisticHz) {
      goldilocksScore = 55 + Math.round(hzProximity * 25);
    } else if (hzRatio >= 0.5 && hzRatio <= 2.0) {
      goldilocksScore = Math.round(hzProximity * 50);
    } else {
      goldilocksScore = Math.max(5, Math.round(15 / Math.max(hzRatio, 0.1)));
    }

    const totalSystemValueCr = predictions.reduce(
      (sum, p) => sum + Math.round(p.probability * p.estimatedPayoutCr),
      0
    );

    const diagnosticNotes: string[] = [];
    if (inConservativeHz) {
      diagnosticNotes.push(`Orbital distance (${distLs.toLocaleString()} Ls) directly inside conservative Goldilocks band.`);
    } else if (inOptimisticHz) {
      diagnosticNotes.push(`Orbital distance (${distLs.toLocaleString()} Ls) inside optimistic habitable envelope.`);
    } else if (distLs < hz.innerOptimisticLs) {
      diagnosticNotes.push(`Hot inner zone: high solar irradiation (${distLs.toLocaleString()} Ls vs ${hz.innerConservativeLs} Ls threshold).`);
    } else {
      diagnosticNotes.push(`Cold outer zone: sub-freezing volatile envelope (${distLs.toLocaleString()} Ls vs ${hz.outerConservativeLs} Ls limit).`);
    }

    return {
      star,
      habitableZone: hz,
      timestamp: Date.now(),
      predictions,
      highestValueTarget: predictions[0] || null,
      totalEstimatedSystemValueCr: totalSystemValueCr,
      goldilocksMatchScore: Math.min(Math.max(goldilocksScore, 0), 100),
      isGoldilocksCandidate: inConservativeHz || inOptimisticHz,
      diagnosticNotes
    };
  }
}

export const bodyProbabilityClassifier = BodyProbabilityClassifier.getInstance();
