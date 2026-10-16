import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ANARCHY_HAVENS,
  filterAnarchyHavens,
  plotSafeAnarchyRoute,
  calculateEuclideanDistanceLy,
} from './anarchy_havens_engine';

describe('Anarchy Havens & Safe Route Engine (Stage 13.4)', () => {
  it('contains canonical anarchy haven stations with full zero police response', () => {
    expect(CANONICAL_ANARCHY_HAVENS.length).toBeGreaterThan(5);
    for (const haven of CANONICAL_ANARCHY_HAVENS) {
      expect(haven.government).toBe('Anarchy');
      expect(haven.systemSecurity).toBe('Anarchy');
      expect(haven.policeResponse).toBe('Zero');
      expect(haven.scanRiskPercent).toBe(0);
      expect(haven.services.blackMarket).toBe(true);
    }
  });

  it('filters havens requiring full re-arm and repair facilities and large pad size', () => {
    const deciatCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    const filtered = filterAnarchyHavens(CANONICAL_ANARCHY_HAVENS, {
      referenceCoords: deciatCoords,
      minPadSize: 'L',
      requireRearmAndRepair: true,
      requireBlackMarket: true,
      requireShipyard: true,
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const h of filtered) {
      expect(h.landingPad).toBe('L');
      expect(h.services.rearm).toBe(true);
      expect(h.services.repair).toBe(true);
      expect(h.services.shipyard).toBe(true);
      expect(h.services.blackMarket).toBe(true);
    }
  });

  it('includes Colonia haven Robardin Rock in Carcosa', () => {
    const carcosa = CANONICAL_ANARCHY_HAVENS.find((h) => h.systemName === 'Carcosa');
    expect(carcosa).toBeDefined();
    expect(carcosa?.region).toBe('Colonia');
    expect(carcosa?.stationType).toBe('Asteroid Base');
    expect(carcosa?.services.shipyard).toBe(true);
    expect(carcosa?.highValueSmugglingDemands.length).toBeGreaterThan(0);
  });

  it('plots a safe route through low-security / anarchy corridors to avoid Authority scans', () => {
    const origin = 'Deciat';
    const originCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    const dest = 'Harma';
    const destCoords = { x: 104.75, y: -80.125, z: 27.6875 };

    const route = plotSafeAnarchyRoute(origin, dest, originCoords, destCoords, 30.0);
    expect(route.jumpCount).toBeGreaterThan(1);
    expect(route.authorityAvoidanceRating).toBe('100% Zero Authority Scans');
    expect(route.waypoints.length).toBe(route.jumpCount + 1);

    // End waypoint must be the destination haven with Zero police risk
    const finalHop = route.waypoints[route.waypoints.length - 1];
    expect(finalHop.systemName).toBe('Harma');
    expect(finalHop.security).toBe('Anarchy');
    expect(finalHop.policeInterdictionRisk).toBe('Zero');
  });

  it('computes accurate 3D Euclidean distances in light-years', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: 20, z: 20 };
    const dist = calculateEuclideanDistanceLy(a, b);
    expect(dist).toBe(30.0);
  });
});
