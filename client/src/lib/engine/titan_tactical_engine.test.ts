import { describe, it, expect } from 'vitest';
import {
  CANONICAL_TITAN_VENTS,
  CANONICAL_TITAN_ANATOMY,
  RECOMMENDED_AX_WEAPONS,
  RECOMMENDED_TITAN_BUILDS,
  calculateCausticMitigation,
  tickVentMetronome,
  evaluateConvergenceRating,
  type VentMetronomeState,
} from './titan_tactical_engine';

describe('Titan Tactical Heart Sabotage & Caustic Navigation Engine (Stage 14.2)', () => {
  it('defines all 8 canonical Thermal Vents in 360-degree radial formation', () => {
    expect(CANONICAL_TITAN_VENTS.length).toBe(8);

    const ventAngles = CANONICAL_TITAN_VENTS.map((v) => v.angleDeg);
    expect(ventAngles).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);

    for (const vent of CANONICAL_TITAN_VENTS) {
      expect(vent.id).toBeGreaterThanOrEqual(1);
      expect(vent.id).toBeLessThanOrEqual(8);
      expect(vent.recommendedAttackVector.length).toBeGreaterThan(5);
      expect(vent.heatDissipationPct).toBeGreaterThanOrEqual(0);
      expect(vent.heatDissipationPct).toBeLessThanOrEqual(100);
    }
  });

  it('provides complete Titan anatomical envelope', () => {
    const anatomy = CANONICAL_TITAN_ANATOMY;
    expect(anatomy.titanName).toContain('Titan');
    expect(anatomy.causticTorusRadiusMeters).toBe(15000);
    expect(anatomy.asteroidBeltInnerRadiusMeters).toBe(35000);
    expect(anatomy.asteroidBeltOuterRadiusMeters).toBe(55000);
    expect(anatomy.activeHeart.heartIndex).toBeGreaterThanOrEqual(1);
    expect(anatomy.activeHeart.maxExposureDurationSec).toBeGreaterThan(20);
  });

  it('accurately calculates caustic mitigation and ammo requirements', () => {
    // Scenario 1: Unshielded hull in inner core cloud, 0% resistance, 1 launcher, 0 synths
    const resCoreNoResist = calculateCausticMitigation({
      hullArmor: 3000,
      causticResistancePct: 0,
      causticSinkLaunchersCount: 1,
      synthAmmoAvailable: 0,
      inInnerCoreCloud: true,
    });

    expect(resCoreNoResist.hullDegradationPerSecond).toBe(45);
    expect(resCoreNoResist.effectiveTimeToMeltSec).toBe(Math.round(3000 / 45)); // ~67s
    expect(resCoreNoResist.sinkCapacityTotalSec).toBe(6 * 35); // 210s
    expect(resCoreNoResist.totalSurvivalTimeSec).toBe(210 + 67);
    expect(resCoreNoResist.recommendedSinksForRun).toBe(Math.ceil(600 / 35)); // 18 sinks

    // Scenario 2: Heavy engineered hull with 30% caustic resistance and 2 launchers + 2 synths in outer cloud
    const resOuterEngineered = calculateCausticMitigation({
      hullArmor: 4500,
      causticResistancePct: 30,
      causticSinkLaunchersCount: 2,
      synthAmmoAvailable: 2,
      inInnerCoreCloud: false,
    });

    expect(resOuterEngineered.hullDegradationPerSecond).toBe(10.5); // 15 * 0.70
    expect(resOuterEngineered.sinkCapacityTotalSec).toBe((2 * 6 + 2 * 6) * 60); // 24 sinks * 60s = 1440s
    expect(resOuterEngineered.synthResupplyRunsSupported).toBe(2);
  });

  it('simulates vent cycle metronome transitions and heart exposure windows', () => {
    let state: VentMetronomeState = {
      currentPhase: 'APPROACH',
      phaseRemainingSec: 2,
      phaseDurationSec: 15,
      cycleCount: 0,
      activeVentTarget: 1,
      damageWindowActive: false,
    };

    // Tick forward 3 seconds -> transitions to VENT_OPEN
    state = tickVentMetronome(state, 3);
    expect(state.currentPhase).toBe('VENT_OPEN');
    expect(state.phaseDurationSec).toBe(25);
    expect(state.damageWindowActive).toBe(false);

    // Fast-forward to VENT_SABOTAGED
    state = tickVentMetronome({ ...state, phaseRemainingSec: 1 }, 2);
    expect(state.currentPhase).toBe('VENT_SABOTAGED');

    // Fast-forward to HEART_EXPOSED
    state = tickVentMetronome({ ...state, phaseRemainingSec: 1 }, 2);
    expect(state.currentPhase).toBe('HEART_EXPOSED');
    expect(state.damageWindowActive).toBe(true);
    expect(state.phaseDurationSec).toBe(32);

    // Fast-forward through cooldown to next cycle
    state = tickVentMetronome({ ...state, phaseRemainingSec: 1 }, 2);
    expect(state.currentPhase).toBe('COOLDOWN');
    expect(state.damageWindowActive).toBe(false);

    state = tickVentMetronome({ ...state, phaseRemainingSec: 1 }, 2);
    expect(state.currentPhase).toBe('APPROACH');
    expect(state.cycleCount).toBe(1);
    expect(state.activeVentTarget).toBe(2); // Next vent in sequence
  });

  it('evaluates weapon convergence score accurately', () => {
    const metaKrait = RECOMMENDED_TITAN_BUILDS[0];
    const ratingS = evaluateConvergenceRating(metaKrait.weapons);
    expect(ratingS.score).toBe('S');
    expect(ratingS.verdict).toContain('Optimal');

    // Missing nanite
    const missingNanite = RECOMMENDED_AX_WEAPONS.filter((w) => w.category !== 'Nanite Pylon');
    const ratingC = evaluateConvergenceRating(missingNanite);
    expect(ratingC.score).toBe('C');
  });
});
