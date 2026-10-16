// Location: client/src/test/exobiology_predictor.test.ts
// Stage 16.3: Exobiology Value Predictor & Vista Genomics Payout Calculator Tests

import { describe, it, expect } from 'vitest';
import { exobiologyPredictor } from '../lib/engine/exobiology_predictor';
import {
  EXOBIOLOGY_SPECIES_CATALOG,
  VISTA_FIRST_DISCOVERY_MULTIPLIER
} from '../lib/engine/exobiology_taxonomy';

describe('Exobiology Predictor & Vista Genomics Payout Calculator', () => {
  it('correctly has 5x multiplier for first discovery bonus', () => {
    expect(VISTA_FIRST_DISCOVERY_MULTIPLIER).toBe(5);
  });

  it('validates canonical species payouts and minimum clonal sampling distances', () => {
    const stratumTectonicas = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === 'stratum_tectonicas');
    expect(stratumTectonicas).toBeDefined();
    expect(stratumTectonicas?.basePayoutCr).toBe(19010800);
    expect(stratumTectonicas?.firstDiscoveryPayoutCr).toBe(19010800 * 5); // 95,054,000 CR
    expect(stratumTectonicas?.canonicalDistanceM).toBe(500);

    const electricae = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === 'electricae_pluma');
    expect(electricae).toBeDefined();
    expect(electricae?.canonicalDistanceM).toBe(1000);

    const fonticuluaCampestris = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === 'fonticulua_campestris');
    expect(fonticuluaCampestris?.basePayoutCr).toBe(20000000);
    expect(fonticuluaCampestris?.firstDiscoveryPayoutCr).toBe(100000000); // 100M CR!
  });

  it('predicts Stratum Tectonicas on prime CO2 rocky/metal worlds with moderate gravity', () => {
    const report = exobiologyPredictor.evaluateBody({
      bodyName: 'Outotz ST-I d9-4 A 1 b',
      gravityG: 0.35,
      surfaceTemperatureK: 210,
      atmosphereType: 'Thin Carbon dioxide',
      volcanism: 'None',
      isLandable: true
    });

    expect(report.isEligibleForExobiology).toBe(true);
    expect(report.recommendation).toBe('HIGH_PRIORITY_SURVEY');

    const stratum = report.predictedSpecies.find((s) => s.species.id === 'stratum_tectonicas');
    expect(stratum).toBeDefined();
    expect(stratum!.probability).toBeGreaterThan(0.70);
    expect(stratum!.payoutFirstDiscoveryCr).toBe(95054000);
    expect(stratum!.matchedConditions.length).toBeGreaterThan(0);
  });

  it('evaluates active geothermal volcanism for Fonticulua on icy moons', () => {
    const reportWithVolcanism = exobiologyPredictor.evaluateBody({
      bodyName: 'Col 285 Sector IC-Y b14-1 2 a',
      gravityG: 0.12,
      surfaceTemperatureK: 120,
      atmosphereType: 'Thin Argon',
      volcanism: 'Water Geysers',
      isLandable: true
    });

    const fonticulua = reportWithVolcanism.predictedSpecies.find((s) => s.species.id === 'fonticulua_campestris');
    expect(fonticulua).toBeDefined();
    expect(fonticulua!.probability).toBeGreaterThan(0.60);

    // Without volcanism, fonticulua probability drops severely
    const reportNoVolcanism = exobiologyPredictor.evaluateBody({
      bodyName: 'Col 285 Sector IC-Y b14-1 2 a',
      gravityG: 0.12,
      surfaceTemperatureK: 120,
      atmosphereType: 'Thin Argon',
      volcanism: 'None',
      isLandable: true
    });

    const fonticuluaInactive = reportNoVolcanism.predictedSpecies.find((s) => s.species.id === 'fonticulua_campestris');
    expect(fonticuluaInactive === undefined || fonticuluaInactive.probability < 0.20).toBe(true);
  });

  it('rejects airless or non-landable bodies', () => {
    const airlessReport = exobiologyPredictor.evaluateBody({
      bodyName: 'Airless Rock',
      gravityG: 0.5,
      surfaceTemperatureK: 200,
      atmosphereType: 'No atmosphere',
      isLandable: true
    });

    expect(airlessReport.isEligibleForExobiology).toBe(false);
    expect(airlessReport.recommendation).toBe('UNINHABITABLE');

    const nonLandableReport = exobiologyPredictor.evaluateBody({
      bodyName: 'Heavy Atmosphere High Metal',
      gravityG: 1.2,
      surfaceTemperatureK: 300,
      atmosphereType: 'Carbon dioxide',
      isLandable: false
    });

    expect(nonLandableReport.isEligibleForExobiology).toBe(false);
  });

  it('calculates single species payout with first discovery bonus', () => {
    const payout = exobiologyPredictor.calculatePayout('stratum_tectonicas', true);
    expect(payout.basePayoutCr).toBe(19010800);
    expect(payout.bonusPayoutCr).toBe(19010800 * 4);
    expect(payout.totalPayoutCr).toBe(19010800 * 5);
    expect(payout.multiplier).toBe(5);

    const nonFirstDiscovery = exobiologyPredictor.calculatePayout('stratum_tectonicas', false);
    expect(nonFirstDiscovery.multiplier).toBe(1);
    expect(nonFirstDiscovery.bonusPayoutCr).toBe(0);
    expect(nonFirstDiscovery.totalPayoutCr).toBe(19010800);
  });

  it('calculates route exobiology values across multiple waypoints', () => {
    const species1 = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === 'stratum_tectonicas')!;
    const species2 = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === 'fonticulua_campestris')!;

    const summary = exobiologyPredictor.calculateRouteBiologicalValue([
      {
        systemName: 'System A',
        bodyName: 'Body 1',
        distanceLs: 420,
        species: species1,
        isFirstDiscovery: true
      },
      {
        systemName: 'System A',
        bodyName: 'Body 1',
        distanceLs: 420,
        species: species2,
        isFirstDiscovery: true
      }
    ]);

    expect(summary.totalWaypoints).toBe(1);
    expect(summary.totalSpeciesScans).toBe(2);
    expect(summary.projectedTotalCredits).toBe(species1.firstDiscoveryPayoutCr + species2.firstDiscoveryPayoutCr);
    expect(summary.projectedTotalCredits).toBe(95054000 + 100000000);
    expect(summary.estimatedSurveyTimeMinutes).toBe(20);
  });
});
