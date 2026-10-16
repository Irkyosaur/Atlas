// Location: atlas/client/src/test/security_challenge_engine.test.ts
// Tests for Stage 17.1: Cloudflare Turnstile & Micro-PoW Challenge Engine

import { describe, it, expect, beforeEach } from 'vitest';
import {
  securityEngine,
  sha256Hex,
  countLeadingZeroBits,
  type MicroPoWChallenge,
  type MicroPoWSolution,
} from '$engine/security_challenge_engine';

describe('Micro-PoW Bot Defense & Challenge Engine', () => {
  beforeEach(() => {
    securityEngine.setDifficulty(8); // Fast for unit testing (8 bits = 1 byte zero = '00...')
    securityEngine.setDevBypass(false);
    securityEngine.setTurnstileToken(null);
  });

  it('computes SHA-256 hex string accurately', async () => {
    // Known test vector: "abc" -> ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const hash = await sha256Hex('abc');
    expect(hash.toLowerCase()).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('counts leading zero bits correctly', () => {
    expect(countLeadingZeroBits('0000abc')).toBe(16);
    expect(countLeadingZeroBits('0abc')).toBe(4);
    expect(countLeadingZeroBits('8abc')).toBe(0); // 1000 in binary -> 0 leading zeroes
    expect(countLeadingZeroBits('4abc')).toBe(1); // 0100 in binary -> 1 leading zero
    expect(countLeadingZeroBits('2abc')).toBe(2); // 0010 in binary -> 2 leading zeroes
    expect(countLeadingZeroBits('1abc')).toBe(3); // 0001 in binary -> 3 leading zeroes
    expect(countLeadingZeroBits('08abc')).toBe(4 + 0);
    expect(countLeadingZeroBits('01abc')).toBe(4 + 3);
  });

  it('generates a valid challenge seed and expiration', () => {
    const challenge = securityEngine.generateClientChallenge(10);
    expect(challenge.seed).toMatch(/^atlas_chal_/);
    expect(challenge.difficulty).toBe(10);
    expect(challenge.algorithm).toBe('SHA-256');
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
  });

  it('solves micro-PoW challenge and satisfies difficulty threshold', async () => {
    const challenge: MicroPoWChallenge = {
      seed: 'atlas_test_seed_123',
      difficulty: 8, // 8 bits (2 hex zero characters)
      algorithm: 'SHA-256',
      expiresAt: Date.now() + 60000,
    };

    const solution: MicroPoWSolution = await securityEngine.solveChallenge(challenge);
    expect(solution.seed).toBe(challenge.seed);
    expect(solution.nonce).toBeGreaterThanOrEqual(0);
    expect(solution.leadingZeroBits).toBeGreaterThanOrEqual(challenge.difficulty);
    expect(solution.hash.startsWith('00')).toBe(true);

    const isValid = await securityEngine.validateSolution(challenge, solution);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or forged solutions', async () => {
    const challenge: MicroPoWChallenge = {
      seed: 'atlas_test_seed_tamper',
      difficulty: 8,
      algorithm: 'SHA-256',
      expiresAt: Date.now() + 60000,
    };

    const solution: MicroPoWSolution = await securityEngine.solveChallenge(challenge);

    // Tamper with nonce
    const tamperedSolution: MicroPoWSolution = {
      ...solution,
      nonce: solution.nonce + 9999,
    };

    const isValid = await securityEngine.validateSolution(challenge, tamperedSolution);
    expect(isValid).toBe(false);
  });

  it('generates HTTP security request headers with PoW solution and turnstile token', async () => {
    securityEngine.setTurnstileToken('mock_cf_token_xyz_999');
    const headers = await securityEngine.getSecurityHeaders();

    expect(headers['X-Atlas-PoW-Nonce']).toBeDefined();
    expect(headers['X-Atlas-PoW-Hash']).toBeDefined();
    expect(headers['X-Atlas-PoW-Timestamp']).toBeDefined();
    expect(headers['X-Atlas-PoW-Difficulty']).toBeDefined();
    expect(headers['X-Atlas-Turnstile-Token']).toBe('mock_cf_token_xyz_999');
  });

  it('handles dev bypass mode cleanly', async () => {
    securityEngine.setDevBypass(true);
    const headers = await securityEngine.getSecurityHeaders();

    expect(headers['X-Atlas-Client-Sec']).toBe('dev-bypass');
    expect(headers['X-Atlas-PoW-Nonce']).toBeUndefined();
  });
});
