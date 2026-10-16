// Location: atlas/client/src/test/honeypot_engine.test.ts
// Stage 17.4: Headless Browser & Automated Scraper Honeypots Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HoneypotEngine } from '../lib/engine/honeypot_engine';

describe('Stage 17.4: HoneypotEngine & Scraper Defense Tests', () => {
  let engine: HoneypotEngine;

  beforeEach(() => {
    engine = HoneypotEngine.getInstance();
    engine.resetDefenseState();
  });

  it('initializes with clean threat metrics and non-scraper status', () => {
    const state = engine.getState();
    expect(state.isScraperDetected).toBe(false);
    expect(state.threatScore).toBe(0);
    expect(state.honeypotTrips).toBe(0);
    expect(state.decoyResponsesPoisoned).toBe(0);
    expect(state.tarpitDelaysEnforced).toBe(0);
    expect(state.poisonModeEnabled).toBe(true);
  });

  it('records automated signals and elevates threat score', () => {
    engine.recordSignal({
      id: 'test-webdriver-flag',
      category: 'webdriver',
      description: 'Webdriver flag active in environment',
      weight: 60,
      detectedAt: Date.now(),
    });

    const state = engine.getState();
    expect(state.threatScore).toBe(60);
    expect(state.isScraperDetected).toBe(true);
    expect(state.signals.length).toBe(1);
    expect(state.signals[0].id).toBe('test-webdriver-flag');
  });

  it('trips invisible honeypot DOM traps and flags crawler', () => {
    engine.tripHoneypot('test_bulk_api_trap', 'clip_path');

    const state = engine.getState();
    expect(state.honeypotTrips).toBe(1);
    expect(state.isScraperDetected).toBe(true);
    expect(state.threatScore).toBe(100); // 85 weight + 50 trip penalty capped at 100
    expect(state.lastTripTimestamp).toBeTypeOf('number');
  });

  it('does not poison coordinates when scraper is not detected', () => {
    const original = { x: 100, y: 200, z: -300, name: 'Sol' };
    const result = engine.poisonCoordinates(original);

    expect(result.isPoisoned).toBe(false);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.z).toBe(-300);
    expect(result.name).toBe('Sol');
  });

  it('poisons synthetic coordinates and marks decoy when scraper is flagged', () => {
    // Elevate threat score
    engine.tripHoneypot('admin_secrets_trap', 'link_trap');

    const original = { x: 100, y: 200, z: -300, name: 'Shinrarta Dezhra' };
    const result = engine.poisonCoordinates(original);

    expect(result.isPoisoned).toBe(true);
    expect(result.name).toContain('DECOY');
    // Offset must differ from genuine coordinates
    expect(result.x).not.toBe(100);
    expect(result.y).not.toBe(200);
    expect(result.z).not.toBe(-300);

    const state = engine.getState();
    expect(state.decoyResponsesPoisoned).toBe(1);
  });

  it('poisons arrays of cartography system records under active bot detection', () => {
    engine.simulateBotDetection('puppeteer');

    const records = [
      { id64: '1', name: 'Colonia', x: -9530.5, y: -910.2, z: 19808.1 },
      { id64: '2', name: 'Achenar', x: 67.5, y: -119.4, z: 24.8 },
      { id64: '3', name: 'Alioth', x: -33.6, y: 33.7, z: -67.6 },
    ];

    const poisoned = engine.poisonSystemRecords(records);
    expect(poisoned.length).toBe(3);
    // At least one coordinate poisoned and modified
    expect(poisoned[0].x).not.toBe(-9530.5);

    const state = engine.getState();
    expect(state.decoyResponsesPoisoned).toBe(3);
  });

  it('enforces tarpit delays for detected scrapers', async () => {
    vi.useFakeTimers();

    engine.tripHoneypot('tarpit_trigger_trap');
    engine.setTarpitDelay(2000);

    const delayPromise = engine.applyTarpitDelayIfNeeded();

    vi.advanceTimersByTime(2000);
    const delay = await delayPromise;

    expect(delay).toBe(2000);
    const state = engine.getState();
    expect(state.tarpitDelaysEnforced).toBe(1);
    expect(state.totalTarpitLatencyMs).toBe(2000);

    vi.useRealTimers();
  });

  it('resets defense state back to nominal baseline', () => {
    engine.simulateBotDetection('canvas_noise');
    engine.tripHoneypot('trap');
    expect(engine.getState().threatScore).toBeGreaterThan(0);

    engine.resetDefenseState();
    const cleanState = engine.getState();
    expect(cleanState.threatScore).toBe(0);
    expect(cleanState.isScraperDetected).toBe(false);
    expect(cleanState.signals.length).toBe(0);
    expect(cleanState.honeypotTrips).toBe(0);
  });
});
