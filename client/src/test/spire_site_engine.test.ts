import { describe, it, expect } from 'vitest';
import {
  CANONICAL_SPIRE_SITES,
  CANONICAL_ORTHRUS_PROFILES,
  evaluateGravityWarning,
  calculateCumulativeSabotageState,
  filterSpireSites,
  calculateGalacticDistance,
  type PlanetarySpireSite,
  type SpireFilterCriteria,
} from '../lib/engine/spire_site_engine';

describe('Spire Site Sabotage Operations & Orthrus Hunter Coordinator Engine (Stage 14.3)', () => {
  it('catalogs all 8 canonical planetary Spire sites with precise coordinates and gravity', () => {
    expect(CANONICAL_SPIRE_SITES.length).toBe(8);

    for (const site of CANONICAL_SPIRE_SITES) {
      expect(site.id).toBeDefined();
      expect(site.systemName.length).toBeGreaterThan(0);
      expect(site.bodyName.length).toBeGreaterThan(0);
      expect(site.surfaceCoords.latitude).toBeGreaterThanOrEqual(-90);
      expect(site.surfaceCoords.latitude).toBeLessThanOrEqual(90);
      expect(site.surfaceCoords.longitude).toBeGreaterThanOrEqual(-180);
      expect(site.surfaceCoords.longitude).toBeLessThanOrEqual(180);
      expect(site.surfaceCoords.formatted).toContain('°');
      expect(site.gravityG).toBeGreaterThan(0);
      expect(site.activeMissions.length).toBeGreaterThan(0);
      expect(site.titanDamageContributionMHP).toBeGreaterThan(0);
    }
  });

  it('accurately evaluates gravity warnings based on surface G thresholds', () => {
    expect(evaluateGravityWarning(0.28)).toBe('NORMAL');
    expect(evaluateGravityWarning(1.0)).toBe('NORMAL');
    expect(evaluateGravityWarning(1.15)).toBe('ELEVATED');
    expect(evaluateGravityWarning(1.49)).toBe('ELEVATED');
    expect(evaluateGravityWarning(1.5)).toBe('HAZARDOUS_HIGH_G');
    expect(evaluateGravityWarning(2.35)).toBe('HAZARDOUS_HIGH_G');
  });

  it('provides step-by-step sabotage checklists for Contaminated, Drive, and Bio tasks', () => {
    const site = CANONICAL_SPIRE_SITES[0];
    const taskTypes = site.activeMissions.map((m) => m.type);

    expect(taskTypes).toContain('CONTAMINATED_SABOTAGE');
    expect(taskTypes).toContain('DRIVE_SABOTAGE');
    expect(taskTypes).toContain('BIOLOGICAL_EXTRACTION');

    for (const mission of site.activeMissions) {
      expect(mission.stepChecklist.length).toBeGreaterThanOrEqual(4);
      expect(mission.requiredCompoundOrTool.length).toBeGreaterThan(0);
      expect(mission.targetSubsystem.length).toBeGreaterThan(0);
      expect(mission.titanDefenseWeakeningPct).toBeGreaterThan(0);
    }
  });

  it('maps Orthrus Interceptor spawn locations and shutdown field neutralizer timing', () => {
    expect(CANONICAL_ORTHRUS_PROFILES.length).toBeGreaterThanOrEqual(1);
    const profile = CANONICAL_ORTHRUS_PROFILES[0];

    expect(profile.spawnLocationDescription).toContain('Spire Central Caldera');
    expect(profile.neutralizerOptimalWindowSec.empChargeTimeSec).toBe(4.5);
    expect(profile.neutralizerOptimalWindowSec.neutralizerTriggerAtSec).toBe(3.5);
    expect(profile.neutralizerOptimalWindowSec.neutralizerDurationSec).toBe(5.0);
    expect(profile.combatVulnerabilities.length).toBeGreaterThanOrEqual(3);
    expect(profile.recommendedTactics.length).toBeGreaterThanOrEqual(3);
    expect(profile.payoutCreditsM).toBe(40.0);
  });

  it('calculates cumulative Spire sabotage impact on regional Titan defense weakening', () => {
    const state = calculateCumulativeSabotageState(CANONICAL_SPIRE_SITES);
    expect(state.totalSpiresActive).toBe(8);
    expect(state.totalTitanDefenseWeakeningPct).toBeGreaterThan(25.0);
    expect(state.totalTitanDefenseWeakeningPct).toBeLessThan(40.0);
  });

  it('correctly filters Spire sites by system search, Titan association, and gravity profile', () => {
    // Search query
    const resultsName = filterSpireSites(CANONICAL_SPIRE_SITES, { searchQuery: 'Hyades' });
    expect(resultsName.length).toBe(1);
    expect(resultsName[0].associatedTitan).toBe('Taranis');

    // Filter by Titan
    const resultsTitan = filterSpireSites(CANONICAL_SPIRE_SITES, { associatedTitan: 'Leigong' });
    expect(resultsTitan.length).toBe(1);
    expect(resultsTitan[0].systemName).toBe('HIP 8887');

    // Filter by Hazardous High-G
    const resultsHighG = filterSpireSites(CANONICAL_SPIRE_SITES, { gravityWarning: 'HAZARDOUS_HIGH_G' });
    expect(resultsHighG.length).toBe(2); // HIP 8887 (1.84G) and Pegasi Sector GW-V b2-5 (2.35G)
    expect(resultsHighG.every((s) => s.gravityG >= 1.5)).toBe(true);

    // Galactic distance
    const dist = calculateGalacticDistance({ x: 0, y: 0, z: 0 }, { x: 30, y: 40, z: 0 });
    expect(dist).toBe(50.0);
  });
});
