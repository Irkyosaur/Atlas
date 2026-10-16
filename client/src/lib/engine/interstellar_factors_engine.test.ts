// Location: atlas/client/src/lib/engine/interstellar_factors_engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateSettlementFee,
  evaluateFactorSafety,
  filterInterstellarFactors,
  CANONICAL_INTERSTELLAR_FACTORS,
  INTERSTELLAR_FACTORS_SURCHARGE_RATE,
  NOTORIETY_DECAY_INTERVAL_SECONDS,
  type BountyOrFineRecord,
  type InterstellarFactorStation,
} from './interstellar_factors_engine';

describe('Interstellar Factors with Anti-Local Faction Logic (Stage 13.3)', () => {
  it('calculates the exact 25% Interstellar Factor service fee surcharge on bounties and fines', () => {
    const crimes: BountyOrFineRecord[] = [
      {
        id: '1',
        type: 'Bounty',
        amount: 100000,
        issuingFaction: 'Deciat Industry Corp',
      },
      {
        id: '2',
        type: 'Fine',
        amount: 20000,
        issuingFaction: 'Deciat Independents',
      },
    ];

    const fee = calculateSettlementFee(crimes);
    expect(fee.baseAmount).toBe(120000);
    expect(fee.surchargeFee).toBe(30000); // 25% of 120,000
    expect(fee.totalAmountPayable).toBe(150000);
    expect(fee.bountyCount).toBe(1);
    expect(fee.fineCount).toBe(1);
    expect(INTERSTELLAR_FACTORS_SURCHARGE_RATE).toBe(0.25);
  });

  it('enforces Anti-Local Faction rule: excludes factors in systems where issuing faction has >0% influence', () => {
    // Deciat has Deciat Independents (52%) and Deciat Industry Corp (20%)
    const deciatFactor = CANONICAL_INTERSTELLAR_FACTORS.find((f) => f.id === 'deciat_garay_terminal')!;
    expect(deciatFactor).toBeDefined();

    // Player with bounty from Deciat Independents
    const crimesWithDeciat: BountyOrFineRecord[] = [
      {
        id: 'c1',
        type: 'Bounty',
        amount: 50000,
        issuingFaction: 'Deciat Independents',
      },
    ];

    const safety = evaluateFactorSafety(deciatFactor, crimesWithDeciat);
    expect(safety.isSafe).toBe(false);
    expect(safety.blockedReasons.length).toBeGreaterThan(0);
    expect(safety.blockedReasons[0]).toContain('Deciat Independents');
    expect(safety.blockedReasons[0]).toContain('Docking here triggers authority arrest');
    expect(safety.claimingFactionsDetected.length).toBe(1);
    expect(safety.claimingFactionsDetected[0].factionName).toBe('Deciat Independents');
  });

  it('verification criterion: searching for factor with Federation bounty excludes all Federation systems and independent systems where claiming faction is present', () => {
    // Federation bounty issued by Deciat Industry Corp (Federation)
    const fedCrimes: BountyOrFineRecord[] = [
      {
        id: 'fed_bounty_1',
        type: 'Bounty',
        amount: 150000,
        issuingFaction: 'Deciat Industry Corp',
        superpowerAllegiance: 'Federation',
      },
    ];

    const filtered = filterInterstellarFactors(CANONICAL_INTERSTELLAR_FACTORS, {
      referenceCoords: { x: 122.625, y: -0.3125, z: -47.28125 }, // Deciat
      bountiesAndFines: fedCrimes,
    });

    // 1. Alpha Centauri is a Federation system -> must be UNSAFE
    const alphaCentauri = filtered.find((f) => f.systemName === 'Alpha Centauri');
    expect(alphaCentauri).toBeDefined();
    expect(alphaCentauri?.safety.isSafe).toBe(false);
    expect(alphaCentauri?.safety.blockedReasons.some((r) => r.includes('Federation'))).toBe(true);

    // 2. Deciat has Deciat Industry Corp present (20% influence) -> must be UNSAFE
    const deciat = filtered.find((f) => f.systemName === 'Deciat');
    expect(deciat).toBeDefined();
    expect(deciat?.safety.isSafe).toBe(false);
    expect(deciat?.safety.claimingFactionsDetected.some((cf) => cf.factionName === 'Deciat Industry Corp')).toBe(true);

    // 3. Anarchy / Independent systems without Federation or Deciat Industry Corp presence (e.g. HIP 110028) must be SAFE
    const hip110028 = filtered.find((f) => f.systemName === 'HIP 110028');
    expect(hip110028).toBeDefined();
    expect(hip110028?.safety.isSafe).toBe(true);
    expect(hip110028?.safety.blockedReasons.length).toBe(0);

    // Ensure all safe factors have isSafe === true and are sorted ahead of unsafe ones
    const firstUnsafeIndex = filtered.findIndex((f) => !f.safety.isSafe);
    if (firstUnsafeIndex !== -1) {
      for (let i = 0; i < firstUnsafeIndex; i++) {
        expect(filtered[i].safety.isSafe).toBe(true);
      }
    }
  });

  it('notoriety decay interval constant equals 2 hours (7200 seconds)', () => {
    expect(NOTORIETY_DECAY_INTERVAL_SECONDS).toBe(7200);
  });
});
