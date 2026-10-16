// Location: atlas/client/src/test/hmac_nonce_engine.test.ts
// Unit & Integration Tests for Stage 17.2: Dynamic 30s HMAC Nonce Challenge Architecture

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hmacNonceEngine,
  hmacSha256Hex,
  DEFAULT_HMAC_SECRET,
  HMAC_WINDOW_SECONDS,
  HmacNonceEngine,
} from '$engine/hmac_nonce_engine';

describe('Dynamic 30s HMAC Nonce Challenge Architecture', () => {
  beforeEach(() => {
    hmacNonceEngine.resetReplayCache();
    hmacNonceEngine.setMasterSecret(DEFAULT_HMAC_SECRET);
  });

  afterEach(() => {
    hmacNonceEngine.resetReplayCache();
  });

  it('computes HMAC-SHA256 hex string accurately against standard test vectors', async () => {
    // RFC 4231 Test Case 2: key = "Jefe", data = "what do ya want for nothing?"
    // Expected HMAC-SHA256: 5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
    const key = 'Jefe';
    const data = 'what do ya want for nothing?';
    const hmac = await hmacSha256Hex(key, data);
    expect(hmac.toLowerCase()).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  it('tracks rolling 30-second window epochs and remaining seconds', () => {
    const fixedNowMs = 1776000000000; // Even epoch
    const engine = new HmacNonceEngine('test_secret', 30);
    engine.updateClock(fixedNowMs);

    const state = engine.getState();
    const expectedEpoch = Math.floor(fixedNowMs / 1000 / 30);
    expect(state.currentWindowEpoch).toBe(expectedEpoch);
    expect(state.secondsRemaining).toBeGreaterThanOrEqual(1);
    expect(state.secondsRemaining).toBeLessThanOrEqual(30);

    engine.destroy();
  });

  it('derives unique rotating salt/secret per 30s epoch', async () => {
    const secret1 = await hmacNonceEngine.deriveWindowSecret(100);
    const secret2 = await hmacNonceEngine.deriveWindowSecret(101);
    const secret1Repeat = await hmacNonceEngine.deriveWindowSecret(100);

    expect(secret1).toBeDefined();
    expect(secret2).toBeDefined();
    expect(secret1).not.toBe(secret2);
    expect(secret1).toBe(secret1Repeat);
  });

  it('generates signed outbound request headers matching specification', async () => {
    const method = 'POST';
    const path = '/api/cube-search';
    const headers = await hmacNonceEngine.signRequest(method, path);

    expect(headers['X-Atlas-Nonce-Id']).toMatch(/^atn_/);
    expect(headers['X-Atlas-Nonce']).toBe(headers['X-Atlas-Nonce-Id']);
    expect(headers['X-Atlas-Timestamp']).toBeDefined();
    expect(headers['X-Atlas-Signature']).toMatch(/^[0-9a-f]{64}$/);
    expect(Number(headers['X-Atlas-Window-Remaining'])).toBeGreaterThanOrEqual(0);
  });

  it('verifies valid HMAC request signature successfully', async () => {
    const method = 'POST';
    const path = '/api/cube-search';
    const nowSec = 1776000015;
    const headers = await hmacNonceEngine.signRequest(method, path, 'custom_nonce_123', nowSec);

    const verifyResult = await hmacNonceEngine.verifyRequest(
      method,
      path,
      headers['X-Atlas-Signature'],
      nowSec,
      headers['X-Atlas-Nonce-Id'],
      nowSec
    );

    // Note: signRequest automatically registers the nonce in local replay cache,
    // so checking verifyRequest on an already signed nonce tests replay block.
    // If we test with a freshly constructed signature outside the cache:
    hmacNonceEngine.resetReplayCache();
    const payload = hmacNonceEngine.formatCanonicalPayload(method, path, nowSec, 'fresh_nonce_456');
    const freshSig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, payload);

    const freshVerify = await hmacNonceEngine.verifyRequest(
      method,
      path,
      freshSig,
      nowSec,
      'fresh_nonce_456',
      nowSec
    );

    expect(freshVerify.valid).toBe(true);
    expect(freshVerify.skewStep).toBe(0);
  });

  it('detects and blocks replay attacks (same nonce / signature in active window)', async () => {
    const method = 'POST';
    const path = '/api/carrier-route';
    const nowSec = 1776000030;
    const nonce = 'replay_test_nonce_789';

    const payload = hmacNonceEngine.formatCanonicalPayload(method, path, nowSec, nonce);
    const sig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, payload);

    // First redemption: succeeds
    const firstAttempt = await hmacNonceEngine.verifyRequest(method, path, sig, nowSec, nonce, nowSec);
    expect(firstAttempt.valid).toBe(true);

    // Second redemption: blocked as replay attack
    const replayAttempt = await hmacNonceEngine.verifyRequest(method, path, sig, nowSec, nonce, nowSec);
    expect(replayAttempt.valid).toBe(false);
    expect(replayAttempt.reason).toContain('Replay attack detected');
    expect(hmacNonceEngine.getState().replaysDetected).toBe(1);
  });

  it('tolerates dual-window clock skew (±1 step / ±30s) across boundary edge', async () => {
    const method = 'GET';
    const path = '/api/system?systemName=Sol';
    const serverNowSec = 1776000060; // Epoch = 59200002

    // Client timestamp is in previous window (skew step -1, e.g. 25 seconds behind)
    const clientPastSec = serverNowSec - 25;
    const pastNonce = 'past_window_nonce';
    const pastPayload = hmacNonceEngine.formatCanonicalPayload(method, path, clientPastSec, pastNonce);
    const pastSig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, pastPayload);

    const pastVerify = await hmacNonceEngine.verifyRequest(
      method,
      path,
      pastSig,
      clientPastSec,
      pastNonce,
      serverNowSec
    );
    expect(pastVerify.valid).toBe(true);
    expect(pastVerify.skewStep).toBe(-1);

    // Client timestamp is in next window (skew step +1, e.g. 35 seconds ahead)
    const clientFutureSec = serverNowSec + 35;
    const futureNonce = 'future_window_nonce';
    const futurePayload = hmacNonceEngine.formatCanonicalPayload(method, path, clientFutureSec, futureNonce);
    const futureSig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, futurePayload);

    const futureVerify = await hmacNonceEngine.verifyRequest(
      method,
      path,
      futureSig,
      clientFutureSec,
      futureNonce,
      serverNowSec
    );
    expect(futureVerify.valid).toBe(true);
    expect(futureVerify.skewStep).toBe(1);

    // Skew step > ±1 (> 60s difference) is rejected
    const distantFutureSec = serverNowSec + 90;
    const distantNonce = 'distant_nonce';
    const distantPayload = hmacNonceEngine.formatCanonicalPayload(method, path, distantFutureSec, distantNonce);
    const distantSig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, distantPayload);

    const distantVerify = await hmacNonceEngine.verifyRequest(
      method,
      path,
      distantSig,
      distantFutureSec,
      distantNonce,
      serverNowSec
    );
    expect(distantVerify.valid).toBe(false);
    expect(distantVerify.reason).toContain('Clock skew exceeded dual-window tolerance');
  });

  it('rejects tampered signatures or methods', async () => {
    const method = 'POST';
    const path = '/api/cube-search';
    const nowSec = 1776000000;
    const nonce = 'tamper_test_nonce';

    const payload = hmacNonceEngine.formatCanonicalPayload(method, path, nowSec, nonce);
    const validSig = await hmacSha256Hex(DEFAULT_HMAC_SECRET, payload);

    // Tampered method: GET instead of POST
    const tamperedMethodRes = await hmacNonceEngine.verifyRequest(
      'GET',
      path,
      validSig,
      nowSec,
      nonce,
      nowSec
    );
    expect(tamperedMethodRes.valid).toBe(false);
    expect(tamperedMethodRes.reason).toBe('HMAC signature mismatch');

    // Tampered signature hex
    const badSig = '0000000000000000000000000000000000000000000000000000000000000000';
    const tamperedSigRes = await hmacNonceEngine.verifyRequest(
      method,
      path,
      badSig,
      nowSec,
      nonce,
      nowSec
    );
    expect(tamperedSigRes.valid).toBe(false);
    expect(tamperedSigRes.reason).toBe('HMAC signature mismatch');
  });
});
