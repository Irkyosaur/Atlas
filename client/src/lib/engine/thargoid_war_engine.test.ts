import { describe, it, expect } from 'vitest';
import {
  CANONICAL_TITANS,
  CANONICAL_WAR_SYSTEMS,
  calculateEuclideanDistanceLy,
  calculateNextThursdayResetUtc,
  calculateRequiredProgressPerHour,
  filterWarSystems,
  compileWarStateOverview,
} from './thargoid_war_engine';

describe('Thargoid War Frontline & Titan Maelstrom Engine (Stage 14.1)', () => {
  it('contains all 8 canonical Titan Maelstroms with Sol-relative coordinates', () => {
    expect(CANONICAL_TITANS.length).toBe(8);

    const titanNames = CANONICAL_TITANS.map((t) => t.name);
    expect(titanNames).toContain('Taranis');
    expect(titanNames).toContain('Leigong');
    expect(titanNames).toContain('Hadad');
    expect(titanNames).toContain('Oya');
    expect(titanNames).toContain('Indra');
    expect(titanNames).toContain('Thor');
    expect(titanNames).toContain('Raijin');
    expect(titanNames).toContain('Cocijo');

    for (const titan of CANONICAL_TITANS) {
      expect(titan.causticCloudRadiusLy).toBeGreaterThanOrEqual(15.0);
      expect(titan.causticCloudRadiusLy).toBeLessThanOrEqual(25.0);
      expect(typeof titan.coords.x).toBe('number');
      expect(typeof titan.coords.y).toBe('number');
      expect(typeof titan.coords.z).toBe('number');
      expect(titan.totalHearts).toBe(8);
    }
  });

  it('accurately tracks Active vs Destroyed Titans', () => {
    const active = CANONICAL_TITANS.filter((t) => t.state === 'Active' || t.state === 'Vulnerable');
    const destroyed = CANONICAL_TITANS.filter((t) => t.state === 'Destroyed');

    expect(active.length).toBeGreaterThan(0);
    expect(destroyed.length).toBeGreaterThan(0);

    const raijin = CANONICAL_TITANS.find((t) => t.name === 'Raijin');
    expect(raijin).toBeDefined();
    expect(raijin?.state).toBe('Active');
    expect(raijin?.heartsRemaining).toBe(3);

    const taranis = CANONICAL_TITANS.find((t) => t.name === 'Taranis');
    expect(taranis).toBeDefined();
    expect(taranis?.state).toBe('Destroyed');
    expect(taranis?.heartsRemaining).toBe(0);
    expect(taranis?.destructionDateUtc).toBeDefined();
  });

  it('calculates the next Thursday 07:00 UTC weekly reset correctly', () => {
    // Test on Wednesday 12:00 UTC (19 hours until reset)
    const wednesdayNoon = new Date('2026-10-14T12:00:00Z');
    const resetWed = calculateNextThursdayResetUtc(wednesdayNoon);
    expect(resetWed.nextResetDate.getUTCDay()).toBe(4); // Thursday
    expect(resetWed.nextResetDate.getUTCHours()).toBe(7);
    expect(resetWed.hoursRemaining).toBeCloseTo(19.0, 1);

    // Test on Friday 12:00 UTC (6 days - 5 hours = 139 hours until next reset)
    const fridayNoon = new Date('2026-10-16T12:00:00Z');
    const resetFri = calculateNextThursdayResetUtc(fridayNoon);
    expect(resetFri.nextResetDate.getUTCDay()).toBe(4);
    expect(resetFri.hoursRemaining).toBeGreaterThan(130);
  });

  it('calculates required defense progress per hour correctly', () => {
    // 60% done, 20 hours remaining => 40% / 20 hrs = 2.0%/hr
    expect(calculateRequiredProgressPerHour(60.0, 20)).toBe(2.0);

    // 100% complete => 0%/hr
    expect(calculateRequiredProgressPerHour(100.0, 10)).toBe(0.0);

    // 0 hours remaining => 0%/hr
    expect(calculateRequiredProgressPerHour(50.0, 0)).toBe(0.0);
  });

  it('filters frontline systems by state, high priority, and evacuation status', () => {
    const highPri = filterWarSystems(CANONICAL_WAR_SYSTEMS, {
      onlyHighPriority: true,
    });
    expect(highPri.length).toBeGreaterThan(0);
    expect(highPri.every((s) => s.highPriority)).toBe(true);

    const evac = filterWarSystems(CANONICAL_WAR_SYSTEMS, {
      onlyEvacuations: true,
    });
    expect(evac.length).toBeGreaterThan(0);
    expect(evac.every((s) => s.evacuationsActive)).toBe(true);

    const invasionRaijin = filterWarSystems(CANONICAL_WAR_SYSTEMS, {
      state: 'Invasion',
      maelstrom: 'Raijin',
    });
    expect(invasionRaijin.length).toBeGreaterThan(0);
    expect(invasionRaijin.every((s) => s.state === 'Invasion' && s.maelstromName === 'Raijin')).toBe(true);
  });

  it('compiles comprehensive WarStateOverview', () => {
    const overview = compileWarStateOverview(CANONICAL_TITANS, CANONICAL_WAR_SYSTEMS);
    expect(overview.titans.length).toBe(8);
    expect(overview.systems.length).toBeGreaterThan(5);
    expect(overview.hoursUntilCycleReset).toBeGreaterThan(0);
    expect(overview.totalSystemsUnderAttack).toBeGreaterThan(0);
    expect(overview.activeTitansCount).toBe(2);
    expect(overview.destroyedTitansCount).toBe(6);
  });
});
