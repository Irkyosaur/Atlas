// Location: client/src/test/anomaly_detector.test.ts
// Stage 16.4: Astronomical Anomaly Detector & System Rarity Scorer Tests

import { describe, it, expect } from 'vitest';
import {
  astronomicalAnomalyDetector,
  type SystemEvaluationInput,
  type AstronomicalBody
} from '../lib/engine/anomaly_detector';

describe('Astronomical Anomaly Detector & System Rarity Scorer', () => {
  it('correctly maps 0-100 scores to standard rarity tiers and hex HUD colors', () => {
    expect(astronomicalAnomalyDetector.calculateTier(92)).toBe('Mythic Anomaly');
    expect(astronomicalAnomalyDetector.calculateTier(65)).toBe('Ultra-Rare');
    expect(astronomicalAnomalyDetector.calculateTier(45)).toBe('Rare');
    expect(astronomicalAnomalyDetector.calculateTier(20)).toBe('Uncommon');
    expect(astronomicalAnomalyDetector.calculateTier(8)).toBe('Common');

    expect(astronomicalAnomalyDetector.getTierColor('Mythic Anomaly')).toBe('#d946ef');
    expect(astronomicalAnomalyDetector.getTierColor('Ultra-Rare')).toBe('#06b6d4');
    expect(astronomicalAnomalyDetector.getTierColor('Rare')).toBe('#f59e0b');
  });

  it('detects Wolf-Rayet and Black Hole binaries with extreme score rating', () => {
    const input: SystemEvaluationInput = {
      systemName: 'HD 49798 Exotica',
      primaryStarClass: 'W',
      bodies: [
        {
          name: 'HD 49798 A',
          bodyType: 'Star',
          subType: 'Wolf-Rayet Star',
          spectralClass: 'WN',
          massSolar: 18.5,
          distanceLs: 0
        },
        {
          name: 'HD 49798 B',
          bodyType: 'Black Hole',
          subType: 'Black Hole',
          spectralClass: 'H',
          massSolar: 12.0,
          distanceLs: 1.8 // Close binary separation!
        }
      ]
    };

    const report = astronomicalAnomalyDetector.evaluateSystem(input);
    expect(report.rarityTier).toBe('Mythic Anomaly');
    expect(report.rarityScore).toBeGreaterThanOrEqual(85);
    expect(report.codexDetourRecommended).toBe(true);

    const wr = report.detectedAnomalies.find((a) => a.id.startsWith('stellar-wr'));
    expect(wr).toBeDefined();
    expect(wr?.severity).toBe('LEGENDARY');

    const bh = report.detectedAnomalies.find((a) => a.id.startsWith('stellar-bh'));
    expect(bh).toBeDefined();

    const closeBinary = report.detectedAnomalies.find((a) => a.category === 'GRAVITATIONAL_BINARY');
    expect(closeBinary).toBeDefined();
    expect(closeBinary?.severity).toBe('LEGENDARY');
  });

  it('detects ringed stars, super-rings, and shepherd moons inside rings', () => {
    const input: SystemEvaluationInput = {
      systemName: 'Collection of Wonders Special',
      bodies: [
        {
          name: 'Ringed Star Alpha',
          bodyType: 'Star',
          subType: 'M (Red dwarf) Star',
          spectralClass: 'M',
          rings: [
            {
              name: 'Alpha A Ring',
              ringClass: 'eRingClass_Rocky',
              innerRadiusKm: 500000,
              outerRadiusKm: 3500000 // Super-ring >3M km!
            }
          ]
        },
        {
          name: 'Ring Shepherd Moon 1',
          bodyType: 'Planet',
          subType: 'Rocky body',
          parentName: 'Ringed Star Alpha',
          // 0.015 AU = ~2,243,968 km (inside the 500,000 - 3,500,000 km ring disc)
          semiMajorAxisAU: 0.015,
          distanceLs: 300
        }
      ]
    };

    const report = astronomicalAnomalyDetector.evaluateSystem(input);
    expect(report.rarityTier).toBe('Ultra-Rare');
    expect(report.anomaliesByCategory.RING_SYSTEM.length).toBeGreaterThanOrEqual(3);

    const ringStar = report.detectedAnomalies.find((a) => a.id.startsWith('ring-star'));
    expect(ringStar).toBeDefined();

    const superRing = report.detectedAnomalies.find((a) => a.id.startsWith('ring-super'));
    expect(superRing).toBeDefined();

    const shepherd = report.detectedAnomalies.find((a) => a.id.startsWith('ring-shepherd'));
    expect(shepherd).toBeDefined();
  });

  it('detects colliding ring systems between close planetary pairs', () => {
    const input: SystemEvaluationInput = {
      systemName: 'Collision System',
      bodies: [
        {
          name: 'Twin Planet A',
          bodyType: 'Gas giant',
          parentName: 'Primary Star',
          semiMajorAxisAU: 1.000,
          rings: [
            {
              name: 'A Ring',
              ringClass: 'eRingClass_Icy',
              innerRadiusKm: 100000,
              outerRadiusKm: 600000
            }
          ]
        },
        {
          name: 'Twin Planet B',
          bodyType: 'Gas giant',
          parentName: 'Primary Star',
          // sep = 0.005 AU = ~747,989 km < (600,000 + 400,000) * 1.25 km
          semiMajorAxisAU: 1.005,
          rings: [
            {
              name: 'B Ring',
              ringClass: 'eRingClass_Icy',
              innerRadiusKm: 80000,
              outerRadiusKm: 400000
            }
          ]
        }
      ]
    };

    const report = astronomicalAnomalyDetector.evaluateSystem(input);
    const collision = report.detectedAnomalies.find((a) => a.id.startsWith('ring-collision'));
    expect(collision).toBeDefined();
    expect(collision?.points).toBe(40);
    expect(collision?.severity).toBe('LEGENDARY');
  });

  it('detects crushing landable high-G worlds and extreme cometary eccentricities', () => {
    const input: SystemEvaluationInput = {
      systemName: 'Achenar Extreme',
      bodies: [
        {
          name: 'Achenar 3',
          bodyType: 'Planet',
          subType: 'High metal content body',
          isLandable: true,
          surfaceGravityG: 6.7, // Extreme High-G > 6G!
          radiusKm: 12000,
          distanceLs: 220
        },
        {
          name: 'Hyper-Comet Body 4',
          bodyType: 'Planet',
          subType: 'Icy body',
          eccentricity: 0.965, // Extreme eccentricity > 0.85
          orbitalPeriodDays: 450,
          distanceLs: 1200
        }
      ]
    };

    const report = astronomicalAnomalyDetector.evaluateSystem(input);
    const highG = report.detectedAnomalies.find((a) => a.id.startsWith('surface-highg'));
    expect(highG).toBeDefined();
    expect(highG?.severity).toBe('LEGENDARY');

    const ecc = report.detectedAnomalies.find((a) => a.id.startsWith('orbit-ecc'));
    expect(ecc).toBeDefined();
    expect(ecc?.points).toBe(28);

    expect(report.recommendations.some((r) => r.priority === 'MANDATORY_DETOUR')).toBe(true);
  });

  it('generates standard report for benign solar system', () => {
    const input: SystemEvaluationInput = {
      systemName: 'Sol Typical',
      bodies: [
        {
          name: 'Sol 1',
          bodyType: 'Planet',
          isLandable: true,
          surfaceGravityG: 0.38,
          surfaceTemperatureK: 440,
          eccentricity: 0.205
        },
        {
          name: 'Sol 3',
          bodyType: 'Planet',
          isLandable: false,
          surfaceGravityG: 1.0,
          surfaceTemperatureK: 288,
          eccentricity: 0.016
        }
      ]
    };

    const report = astronomicalAnomalyDetector.evaluateSystem(input);
    expect(report.rarityTier).toBe('Common');
    expect(report.rarityScore).toBeLessThan(15);
    expect(report.codexDetourRecommended).toBe(false);
  });
});
