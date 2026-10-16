import { describe, it, expect } from 'vitest';
import {
  CANONICAL_BURNING_STARPORTS,
  CANONICAL_RESCUE_MEGASHIPS,
  POPULAR_EVAC_SHIPS,
  HEAT_SINK_FLIGHT_PROFILE,
  CAUSTIC_DECON_PROTOCOL,
  planRefugeeCabinCapacity,
  findClosestRescueMegaships,
  computeEvacuationRoutePlan,
  filterEvacStarports,
  calculateGalacticDistance,
} from './refugee_evac_engine';

describe('Refugee Evacuation Logistics & Damaged Starport Routing Engine (Stage 14.4)', () => {
  it('catalogs canonical burning and damaged starports with active passenger evac missions', () => {
    expect(CANONICAL_BURNING_STARPORTS.length).toBeGreaterThanOrEqual(6);

    for (const port of CANONICAL_BURNING_STARPORTS) {
      expect(port.id).toBeDefined();
      expect(port.stationName.length).toBeGreaterThan(0);
      expect(port.systemName.length).toBeGreaterThan(0);
      expect(port.landingPadSize).toBe('L');
      expect(port.interiorTemperatureK).toBeGreaterThan(700);
      expect(port.heatBuildupRatePerSec).toBeGreaterThan(0);
      expect(port.activeRefugeeCount).toBeGreaterThan(0);
      expect(port.availableMissionsCount).toBeGreaterThan(0);
      expect(['BURNING', 'ATTACKED', 'EVACUATING', 'CRITICAL_MELTDOWN']).toContain(port.evacStatus);
    }
  });

  it('catalogs canonical Rescue Megaships with Large landing pads and bio-containment', () => {
    expect(CANONICAL_RESCUE_MEGASHIPS.length).toBeGreaterThanOrEqual(4);

    for (const ship of CANONICAL_RESCUE_MEGASHIPS) {
      expect(ship.id).toBeDefined();
      expect(ship.name).toContain('Rescue Ship');
      expect(ship.landingPadSize).toBe('L');
      expect(ship.causticWashdownAvailable).toBe(true);
      expect(ship.passengerCapacityThreshold).toBeGreaterThan(100000);
      expect(ship.dockingDistanceLs).toBeGreaterThan(0);
    }
  });

  it('calculates refugee passenger cabin configurations and maximum civilian payload', () => {
    // Anaconda: slots [7, 6, 6, 6, 5, 5, 5, 4, 4, 2, 1, 1]
    const anacondaPreset = POPULAR_EVAC_SHIPS.find((s) => s.model === 'Anaconda')!;
    const plan = planRefugeeCabinCapacity(
      anacondaPreset.model,
      anacondaPreset.padSize,
      anacondaPreset.optionalSlots,
      anacondaPreset.defaultJumpLy
    );

    expect(plan.shipModel).toBe('Anaconda');
    expect(plan.totalEconomyCapacity).toBeGreaterThan(150); // Capped slots sum: 32+32+32+32+16+16+16+8+8+2 = 192
    expect(plan.totalBusinessCapacity).toBeLessThan(plan.totalEconomyCapacity);
    expect(plan.optimalMixCapacity).toBeGreaterThan(0);
    expect(plan.optimalMixSlots.length).toBe(anacondaPreset.optionalSlots.length);
  });

  it('identifies closest Rescue Megaship destinations with Large landing pads', () => {
    const originCoords = CANONICAL_BURNING_STARPORTS[0].coords; // Weyl Gateway in Pegasi Sector GW-V b2-1
    const closest = findClosestRescueMegaships(originCoords, CANONICAL_RESCUE_MEGASHIPS);

    expect(closest.length).toBe(CANONICAL_RESCUE_MEGASHIPS.length);
    expect(closest[0].distanceLy).toBeLessThan(closest[closest.length - 1].distanceLy);
    // Closest to Weyl Gateway is Rescue Ship Cornwallis (~17.5 LY)
    expect(closest[0].id).toBe('mega_cornwallis');
    expect(closest[0].landingPadSize).toBe('L');
  });

  it('computes round-trip evacuation flight plans with heat sink management recommendations', () => {
    const port = CANONICAL_BURNING_STARPORTS[0];
    const megaship = CANONICAL_RESCUE_MEGASHIPS[0];
    const cutterPreset = POPULAR_EVAC_SHIPS.find((s) => s.model === 'Cutter')!;
    const shipConfig = planRefugeeCabinCapacity(
      cutterPreset.model,
      cutterPreset.padSize,
      cutterPreset.optionalSlots,
      cutterPreset.defaultJumpLy
    );

    const plan = computeEvacuationRoutePlan(port, megaship, shipConfig);

    expect(plan.oneWayDistanceLy).toBeGreaterThan(0);
    expect(plan.roundTripDistanceLy).toBeCloseTo(plan.oneWayDistanceLy * 2, 1);
    expect(plan.estimatedJumpsRoundTrip).toBeGreaterThanOrEqual(2);
    expect(plan.flightTimeMinutesRoundTrip).toBeGreaterThan(0);
    expect(plan.refugeesPerRun).toBe(shipConfig.totalEconomyCapacity);
    expect(plan.runsNeededForEvac).toBeGreaterThan(0);
    expect(plan.totalFlightTimeHours).toBeGreaterThan(0);
    expect(plan.heatSinkUsageRecommendation).toBeGreaterThanOrEqual(2);
  });

  it('provides heat sink management profiles and caustic decontamination flight protocol', () => {
    expect(HEAT_SINK_FLIGHT_PROFILE.length).toBe(5);
    for (const phase of HEAT_SINK_FLIGHT_PROFILE) {
      expect(phase.phase.length).toBeGreaterThan(0);
      expect(phase.recommendedSinkDeployPercent).toBeGreaterThan(50);
      expect(phase.dockingComputerSafe).toBe(false); // Disallow auto-dock in burning stations
      expect(phase.proceduralNote.length).toBeGreaterThan(0);
    }

    expect(CAUSTIC_DECON_PROTOCOL.length).toBe(4);
    for (const step of CAUSTIC_DECON_PROTOCOL) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.action.length).toBeGreaterThan(0);
      expect(step.thresholdCondition.length).toBeGreaterThan(0);
      expect(step.riskMitigation.length).toBeGreaterThan(0);
    }
  });

  it('filters evac starports accurately by status, pad size, and danger rating', () => {
    const burningOnly = filterEvacStarports(CANONICAL_BURNING_STARPORTS, { status: 'BURNING' });
    expect(burningOnly.every((s) => s.evacStatus === 'BURNING')).toBe(true);

    const extremeOnly = filterEvacStarports(CANONICAL_BURNING_STARPORTS, { dangerRating: 'EXTREME' });
    expect(extremeOnly.every((s) => s.dangerRating === 'EXTREME')).toBe(true);
    expect(extremeOnly.length).toBeGreaterThanOrEqual(2);

    const searched = filterEvacStarports(CANONICAL_BURNING_STARPORTS, { searchQuery: 'Weyl' });
    expect(searched.length).toBe(1);
    expect(searched[0].stationName).toBe('Weyl Gateway');
  });
});
