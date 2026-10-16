// Location: atlas/client/src/test/neural_runtime.test.ts
// Unit and Integration Tests for Stage 16.1: In-Browser Neural Model Runtime

import { describe, it, expect, beforeEach } from 'vitest';
import {
  explorationNeuralRuntime,
  SPECTRAL_CLASS_WEIGHTS
} from '../lib/engine/exploration_neural_runtime';
import type { ExplorationInputFeatures } from '../lib/engine/neural_runtime_types';

describe('Stage 16.1: ExplorationNeuralRuntime', () => {
  beforeEach(async () => {
    await explorationNeuralRuntime.init();
  });

  it('initializes runtime status with execution provider and SIMD checks', () => {
    const status = explorationNeuralRuntime.getStatus();
    expect(status.isInitialized).toBe(true);
    expect(['webgpu', 'wasm', 'wasm-simd', 'cpu', 'heuristic-fallback']).toContain(status.activeProvider);
    expect(typeof status.isSimdAvailable).toBe('boolean');
    expect(typeof status.isWebGpuAvailable).toBe('boolean');
  });

  it('normalizes 8-dimensional astronomical input features accurately', () => {
    const input: ExplorationInputFeatures = {
      spectralClass: 'G',
      starAgeMyr: 4600,
      starLuminosity: 1.0,
      metallicity: 0.02,
      habitableZoneInnerLs: 450,
      habitableZoneOuterLs: 950,
      totalBodies: 28,
      gasGiantsCount: 4
    };

    const vector = explorationNeuralRuntime.extractFeatureVector(input);
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(8);

    // Verify spectral class weight for 'G'
    expect(vector[0]).toBeCloseTo(SPECTRAL_CLASS_WEIGHTS['G'], 2);
    // Age normalized (4600 / 10000 = 0.46)
    expect(vector[1]).toBeCloseTo(0.46, 2);
    // Luminosity normalized (1.0 / 10.0 = 0.1)
    expect(vector[2]).toBeCloseTo(0.1, 2);
    // Gas giants normalized (4 / 10 = 0.4)
    expect(vector[7]).toBeCloseTo(0.4, 2);
  });

  it('executes client-side prediction in sub-50ms latency', async () => {
    const input: ExplorationInputFeatures = {
      spectralClass: 'F',
      starAgeMyr: 3200,
      starLuminosity: 2.1,
      metallicity: 0.1,
      habitableZoneInnerLs: 750,
      habitableZoneOuterLs: 1600,
      totalBodies: 32,
      gasGiantsCount: 3
    };

    const res = await explorationNeuralRuntime.predict(input);
    expect(res).toBeDefined();
    expect(res.inferenceLatencyMs).toBeLessThan(50);
    expect(res.probabilities.elwProbability).toBeGreaterThan(0);
    expect(res.probabilities.elwProbability).toBeLessThanOrEqual(1);
    expect(res.probabilities.terraformableProbability).toBeGreaterThan(0);
    expect(res.valuation.estimatedPayoutCredits).toBeGreaterThan(1_000_000);
    expect(res.valuation.recommendedScanBand).toContain('Ls');
  });

  it('calculates higher ELW and terraformable probabilities for Goldilocks class systems (G/F/K)', async () => {
    const goldilocksInput: ExplorationInputFeatures = {
      spectralClass: 'G',
      starAgeMyr: 4600,
      starLuminosity: 1.0,
      metallicity: 0.02,
      habitableZoneInnerLs: 450,
      habitableZoneOuterLs: 950,
      totalBodies: 30,
      gasGiantsCount: 4
    };

    const hostileInput: ExplorationInputFeatures = {
      spectralClass: 'Y', // Ultra-cold brown dwarf
      starAgeMyr: 300,
      starLuminosity: 0.00001,
      metallicity: -1.5,
      habitableZoneInnerLs: 2,
      habitableZoneOuterLs: 8,
      totalBodies: 4,
      gasGiantsCount: 0
    };

    const goldilocksRes = await explorationNeuralRuntime.predict(goldilocksInput);
    const hostileRes = await explorationNeuralRuntime.predict(hostileInput);

    expect(goldilocksRes.probabilities.elwProbability).toBeGreaterThan(hostileRes.probabilities.elwProbability);
    expect(goldilocksRes.valuation.estimatedPayoutCredits).toBeGreaterThan(hostileRes.valuation.estimatedPayoutCredits);
  });

  it('accurately assigns system rarity tiers based on prediction score', async () => {
    const highValueInput: ExplorationInputFeatures = {
      spectralClass: 'F',
      starAgeMyr: 4000,
      starLuminosity: 1.8,
      metallicity: 0.25,
      habitableZoneInnerLs: 600,
      habitableZoneOuterLs: 1300,
      totalBodies: 45,
      gasGiantsCount: 5
    };

    const res = await explorationNeuralRuntime.predict(highValueInput);
    expect(['RARE', 'EXOTIC', 'LEGENDARY']).toContain(res.valuation.systemRarityTier);
  });
});
