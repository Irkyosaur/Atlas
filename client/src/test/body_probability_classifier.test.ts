// Location: client/src/test/body_probability_classifier.test.ts
// Stage 16.2 Unit Tests: Habitable Zone & Body Probability Classifier

import { describe, it, expect } from 'vitest';
import {
  calculateHabitableZone,
  calculateEquilibriumTemperature,
  type StellarParameters
} from '../lib/engine/habitable_zone_calculator';
import {
  bodyProbabilityClassifier,
  type CandidateBodyInput
} from '../lib/engine/body_probability_classifier';

describe('Stage 16.2: Habitable Zone Calculator', () => {
  it('calculates accurate habitable zone boundaries for Sol (G2V, 1.0 L☉)', () => {
    const sol: StellarParameters = {
      spectralClass: 'G',
      luminositySolar: 1.0,
      effectiveTempK: 5778,
      massSolar: 1.0
    };

    const hz = calculateHabitableZone(sol);

    // Conservative HZ for Sol should be around ~0.95 - 1.68 AU
    expect(hz.innerConservativeAu).toBeGreaterThan(0.9);
    expect(hz.innerConservativeAu).toBeLessThan(1.05);

    expect(hz.outerConservativeAu).toBeGreaterThan(1.5);
    expect(hz.outerConservativeAu).toBeLessThan(1.8);

    // In Light Seconds (1 AU ≈ 499 Ls)
    // Inner ~ 470 - 520 Ls, Outer ~ 780 - 860 Ls
    expect(hz.innerConservativeLs).toBeGreaterThan(450);
    expect(hz.outerConservativeLs).toBeGreaterThan(750);
    expect(hz.recommendedCenterLs).toBeGreaterThan(600);
    expect(hz.recommendedBandLabel).toContain('Ls');
  });

  it('calculates habitable zone for Red Dwarf (M class, low luminosity)', () => {
    const redDwarf: StellarParameters = {
      spectralClass: 'M',
      luminositySolar: 0.001,
      effectiveTempK: 3000,
      massSolar: 0.15
    };

    const hz = calculateHabitableZone(redDwarf);

    // Red dwarf HZ should be much closer to star (under 50 Ls)
    expect(hz.innerConservativeLs).toBeLessThan(40);
    expect(hz.outerConservativeLs).toBeLessThan(80);
    expect(hz.tidalLockingBoundaryLs).toBeGreaterThan(hz.innerConservativeLs * 0.5);
  });

  it('calculates equilibrium temperature for planetary bodies', () => {
    const sol: StellarParameters = {
      spectralClass: 'G',
      luminositySolar: 1.0,
      effectiveTempK: 5778
    };

    // Earth at ~499 Ls (1 AU) with albedo 0.3 should be ~255 - 280 K
    const earthTemp = calculateEquilibriumTemperature(sol, 499.0, 0.3);
    expect(earthTemp).toBeGreaterThan(240);
    expect(earthTemp).toBeLessThan(290);

    // Inner hot body at 100 Ls
    const hotTemp = calculateEquilibriumTemperature(sol, 100.0, 0.3);
    expect(hotTemp).toBeGreaterThan(500);

    // Outer cold body at 2500 Ls
    const coldTemp = calculateEquilibriumTemperature(sol, 2500.0, 0.3);
    expect(coldTemp).toBeLessThan(150);
  });
});

describe('Stage 16.2: Body Probability Classifier', () => {
  it('correctly predicts Earth-Like World (ELW) for prime Earth candidate in Sol', () => {
    const sol: StellarParameters = {
      spectralClass: 'G',
      luminositySolar: 1.0,
      effectiveTempK: 5778,
      massSolar: 1.0
    };

    const earthCandidate: CandidateBodyInput = {
      bodyName: 'Earth',
      distanceLs: 499.0,
      earthMasses: 1.0,
      radiusKm: 6371,
      surfaceTempK: 288,
      surfaceGravityG: 1.0
    };

    const result = bodyProbabilityClassifier.evaluateCandidateBody(sol, earthCandidate);

    expect(result.isGoldilocksCandidate).toBe(true);
    expect(result.goldilocksMatchScore).toBeGreaterThanOrEqual(75);

    const elw = result.predictions.find((p) => p.bodyClass === 'EARTH_LIKE_WORLD');
    expect(elw).toBeDefined();
    expect(elw!.probability).toBeGreaterThan(0.20);
    expect(elw!.heuristics.length).toBeGreaterThan(0);
    expect(elw!.estimatedPayoutCr).toBeGreaterThan(3_000_000);
  });

  it('predicts Ammonia World in cold volatile corridor outside water HZ', () => {
    const star: StellarParameters = {
      spectralClass: 'K',
      luminositySolar: 0.35,
      effectiveTempK: 4500,
      massSolar: 0.75
    };

    const ammoniaCandidate: CandidateBodyInput = {
      bodyName: 'Ammonia Target',
      distanceLs: 950.0, // beyond primary water HZ
      earthMasses: 0.8,
      surfaceTempK: 205 // in liquid ammonia range
    };

    const result = bodyProbabilityClassifier.evaluateCandidateBody(star, ammoniaCandidate);
    const ammonia = result.predictions.find((p) => p.bodyClass === 'AMMONIA_WORLD');

    expect(ammonia).toBeDefined();
    expect(ammonia!.probability).toBeGreaterThan(0.10);
    expect(ammonia!.heuristics.some((h) => h.includes('ammonia'))).toBe(true);
  });

  it('predicts Metal-Rich Body for scorched inner orbits', () => {
    const star: StellarParameters = {
      spectralClass: 'G',
      luminositySolar: 1.0,
      effectiveTempK: 5778
    };

    const innerScorchedCandidate: CandidateBodyInput = {
      bodyName: 'Inner Scorched',
      distanceLs: 50.0,
      earthMasses: 0.4,
      surfaceTempK: 850
    };

    const result = bodyProbabilityClassifier.evaluateCandidateBody(star, innerScorchedCandidate);
    const mrb = result.predictions.find((p) => p.bodyClass === 'METAL_RICH_BODY');

    expect(mrb).toBeDefined();
    expect(mrb!.probability).toBeGreaterThan(0.15);
  });

  it('predicts Gas Giant with Life for large radius Jovian planets', () => {
    const star: StellarParameters = {
      spectralClass: 'G',
      luminositySolar: 1.0,
      effectiveTempK: 5778
    };

    const gasGiantCandidate: CandidateBodyInput = {
      bodyName: 'Jupiter Class',
      distanceLs: 850.0,
      earthMasses: 95.0,
      radiusKm: 65000,
      surfaceTempK: 240
    };

    const result = bodyProbabilityClassifier.evaluateCandidateBody(star, gasGiantCandidate);
    const waterLifeGiant = result.predictions.find((p) => p.bodyClass === 'GAS_GIANT_WATER_LIFE');

    expect(waterLifeGiant).toBeDefined();
    expect(waterLifeGiant!.heuristics.length).toBeGreaterThan(0);
  });
});
