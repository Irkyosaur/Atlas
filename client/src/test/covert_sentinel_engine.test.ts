// Location: atlas/client/src/test/covert_sentinel_engine.test.ts
// Stage 18.1: Covert Origin Validation & Rogue Domain Traps Tests
// Covert Anti-Clone Telemetry Sentinel (NO ORB)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CovertSentinelEngine,
  DEFAULT_AUTHORIZED_DOMAINS,
  DEFAULT_ALERT_WEBHOOK_URL,
} from '../lib/engine/covert_sentinel_engine';

describe('Stage 18.1: CovertSentinelEngine Tests', () => {
  let sentinel: CovertSentinelEngine;

  beforeEach(() => {
    sentinel = CovertSentinelEngine.getInstance();
    sentinel.resetToNominal();
  });

  it('initializes with nominal status and authorized domain rules', () => {
    const state = sentinel.getState();
    expect(state.isValidOrigin).toBe(true);
    expect(state.isRogueDomain).toBe(false);
    expect(state.threatLevel).toBe('nominal');
    expect(state.isFramed).toBe(false);
    expect(state.violations.length).toBe(0);
    expect(state.authorizedDomains).toEqual(DEFAULT_AUTHORIZED_DOMAINS);
    expect(state.covertAlertWebhookUrl).toBe(DEFAULT_ALERT_WEBHOOK_URL);
  });

  it('validates authorized domains and subdomains accurately', () => {
    sentinel.evaluateRuntimeOrigin({
      hostname: 'atlas.ed-cartography.space',
      origin: 'https://atlas.ed-cartography.space',
      isTopFramed: false,
    });
    expect(sentinel.getState().isValidOrigin).toBe(true);
    expect(sentinel.getState().threatLevel).toBe('nominal');

    // Wildcard subdomain
    sentinel.evaluateRuntimeOrigin({
      hostname: 'subdomain.ed-atlas.pages.dev',
      origin: 'https://subdomain.ed-atlas.pages.dev',
      isTopFramed: false,
    });
    expect(sentinel.getState().isValidOrigin).toBe(true);
    expect(sentinel.getState().threatLevel).toBe('nominal');
  });

  it('detects unauthorized rogue clone domains and marks hostile threat level', () => {
    sentinel.evaluateRuntimeOrigin({
      hostname: 'rogue-atlas-clone.ru',
      origin: 'https://rogue-atlas-clone.ru',
      isTopFramed: false,
    });

    const state = sentinel.getState();
    expect(state.isValidOrigin).toBe(false);
    expect(state.isRogueDomain).toBe(true);
    expect(state.threatLevel).toBe('hostile');
    expect(state.violations.length).toBe(1);
    expect(state.violations[0]).toContain("Host 'rogue-atlas-clone.ru' is not in authorized domain registry");
  });

  it('detects iframe frame nesting on authorized domain and flags suspicious threat level', () => {
    sentinel.evaluateRuntimeOrigin({
      hostname: 'localhost',
      origin: 'http://localhost',
      isTopFramed: true,
    });

    const state = sentinel.getState();
    expect(state.isValidOrigin).toBe(false);
    expect(state.isRogueDomain).toBe(true);
    expect(state.isFramed).toBe(true);
    expect(state.threatLevel).toBe('suspicious');
    expect(state.violations.length).toBe(1);
    expect(state.violations[0]).toContain('ROGUE_IFRAME_NESTING');
  });

  it('detects rogue cloned mirror wrapped inside foreign iframe as rogue_clone', () => {
    sentinel.evaluateRuntimeOrigin({
      hostname: 'stolen-cartography.biz',
      origin: 'https://stolen-cartography.biz',
      isTopFramed: true,
    });

    const state = sentinel.getState();
    expect(state.isValidOrigin).toBe(false);
    expect(state.isRogueDomain).toBe(true);
    expect(state.isFramed).toBe(true);
    expect(state.threatLevel).toBe('rogue_clone');
    expect(state.violations.length).toBe(2);
  });

  it('suppresses WebGPU compute pipeline execution when rogue clone is detected', () => {
    expect(sentinel.shouldSuppressWebGpuCompute()).toBe(false);

    sentinel.simulateRogueContext('pirate-atlas-site.net', false);
    expect(sentinel.shouldSuppressWebGpuCompute()).toBe(true);
    expect(sentinel.getState().webGpuSuppressedFrames).toBe(1);
  });

  it('injects subtle navigational coordinate error drift for rogue mirrors', () => {
    const coords = { x: 1000.0, y: -500.0, z: 25000.0 };

    // When nominal, coordinates remain exact
    const exact = sentinel.injectSubtleNavigationNoise({ ...coords });
    expect(exact.x).toBe(1000.0);
    expect(exact.y).toBe(-500.0);
    expect(exact.z).toBe(25000.0);

    // Trip rogue clone detection
    sentinel.simulateRogueContext('stolen-ed-maps.com', false);
    const drifted = sentinel.injectSubtleNavigationNoise({ ...coords });

    expect(drifted.x).not.toBe(1000.0);
    expect(drifted.y).not.toBe(-500.0);
    expect(drifted.z).not.toBe(25000.0);
    expect(sentinel.getState().navigationErrorsInjected).toBe(1);
  });

  it('generates cryptographically signed covert security beacon with HMAC digest', async () => {
    sentinel.simulateRogueContext('unauthorized-mirror.io', true);

    const beacon = await sentinel.generateBeaconPayload();
    expect(beacon.beaconId).toContain('sentinel_');
    expect(beacon.threatLevel).toBe('rogue_clone');
    expect(beacon.hostname).toBe('unauthorized-mirror.io');
    expect(beacon.isFramed).toBe(true);
    expect(beacon.violations.length).toBe(2);
    expect(beacon.signature).toBeTypeOf('string');
    expect(beacon.signature.length).toBeGreaterThan(0);
  });

  it('supports dev override bypass to allow local debugging', () => {
    sentinel.simulateRogueContext('unauthorized-mirror.io', true);
    expect(sentinel.getState().isRogueDomain).toBe(true);

    sentinel.setDevOverride(true);
    expect(sentinel.getState().devOverrideActive).toBe(true);
    expect(sentinel.getState().isValidOrigin).toBe(true);
    expect(sentinel.getState().isRogueDomain).toBe(false);
    expect(sentinel.getState().threatLevel).toBe('nominal');
  });

  it('dispatches covert beacon to direct standalone webhook without crashing', async () => {
    sentinel.simulateRogueContext('hostile-rip.org', false);

    const result = await sentinel.dispatchCovertSecurityBeacon();
    expect(result).toBe(true);
    expect(sentinel.getState().beaconsDispatched).toBeGreaterThan(0);
    expect(sentinel.getState().lastBeaconTimestamp).toBeTypeOf('number');

    // Throttles rapid follow-up dispatch
    const throttled = await sentinel.dispatchCovertSecurityBeacon();
    expect(throttled).toBe(false);
  });
});
