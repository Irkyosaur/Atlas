// Location: client/src/test/auxiliary_display_engine.test.ts
// Stage 15.3: Unit tests for Auxiliary Display Engine, Screen Wake Lock API & BroadcastChannel Sync

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuxiliaryDisplayEngine,
  DEFAULT_AUXILIARY_TELEMETRY,
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_TELEMETRY,
  type WindowLayoutConfig,
  type AuxiliaryTelemetrySnapshot,
} from '../lib/engine/auxiliary_display_engine';

describe('Auxiliary Display Engine & Multi-Monitor Popout (Stage 15.3)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
    });
  });

  describe('Screen Wake Lock API Handling', () => {
    it('detects wake lock support when navigator.wakeLock exists', () => {
      vi.stubGlobal('navigator', {
        wakeLock: {
          request: vi.fn(),
        },
      });

      const engine = new AuxiliaryDisplayEngine();
      expect(engine.checkWakeLockSupport()).toBe(true);
      expect(engine.isSupported()).toBe(true);
      engine.destroy();
    });

    it('gracefully reports unsupported when navigator.wakeLock is missing', () => {
      vi.stubGlobal('navigator', {});

      const engine = new AuxiliaryDisplayEngine();
      expect(engine.checkWakeLockSupport()).toBe(false);
      expect(engine.isSupported()).toBe(false);
      engine.destroy();
    });

    it('requests wake lock successfully and invokes status listener', async () => {
      let released = false;
      const mockSentinel = {
        addEventListener: vi.fn(),
        release: vi.fn().mockImplementation(async () => {
          released = true;
        }),
      };

      vi.stubGlobal('navigator', {
        wakeLock: {
          request: vi.fn().mockResolvedValue(mockSentinel),
        },
      });

      const engine = new AuxiliaryDisplayEngine();
      const stateListener = vi.fn();
      engine.onWakeLockChange(stateListener);

      const success = await engine.requestWakeLock();
      expect(success).toBe(true);
      expect(engine.getWakeLockState()).toBe(true);
      expect(stateListener).toHaveBeenCalledWith(true);

      // Release wake lock
      await engine.releaseWakeLock();
      expect(engine.getWakeLockState()).toBe(false);
      expect(stateListener).toHaveBeenCalledWith(false);

      engine.destroy();
    });

    it('handles wake lock request failure (e.g. low battery / background tab) gracefully', async () => {
      vi.stubGlobal('navigator', {
        wakeLock: {
          request: vi.fn().mockRejectedValue(new Error('WakeLock denied')),
        },
      });

      const engine = new AuxiliaryDisplayEngine();
      const success = await engine.requestWakeLock();
      expect(success).toBe(false);
      expect(engine.getWakeLockState()).toBe(false);

      engine.destroy();
    });
  });

  describe('BroadcastChannel Telemetry Synchronization', () => {
    it('initializes with default telemetry data for Combat, Mining, and Explorer modes', () => {
      const engine = new AuxiliaryDisplayEngine();
      const telemetry = engine.getTelemetry();

      expect(telemetry.combat.shieldPercent).toBe(100);
      expect(telemetry.combat.pips.sys).toBe(2.0);
      expect(telemetry.mining.cargoTons).toBe(214);
      expect(telemetry.mining.refineryBins.length).toBeGreaterThan(0);
      expect(telemetry.explorer.fssProgressPercent).toBe(75.0);
      expect(telemetry.explorer.highValueBodies.length).toBe(3);
      expect(telemetry.explorer.bioSignals.length).toBe(2);

      engine.destroy();
    });

    it('broadcasts telemetry updates and notifies subscribed listeners', () => {
      const postMessageSpy = vi.fn();
      vi.stubGlobal('BroadcastChannel', class {
        onmessage: any = null;
        postMessage = postMessageSpy;
        close = vi.fn();
      });

      const engine = new AuxiliaryDisplayEngine();
      const listenerSpy = vi.fn();
      const unsubscribe = engine.onTelemetryUpdate(listenerSpy);

      const updatedSnapshot: AuxiliaryTelemetrySnapshot = {
        ...DEFAULT_AUXILIARY_TELEMETRY,
        currentSystem: 'BEAGLE POINT',
        explorer: {
          ...DEFAULT_AUXILIARY_TELEMETRY.explorer,
          currentSystem: 'BEAGLE POINT',
          fssProgressPercent: 100.0,
        },
      };

      engine.broadcastTelemetry(updatedSnapshot);

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ATLAS_TELEMETRY_UPDATE',
          payload: expect.objectContaining({
            currentSystem: 'BEAGLE POINT',
          }),
        })
      );

      expect(listenerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          currentSystem: 'BEAGLE POINT',
        })
      );

      // Verify LocalStorage snapshot storage for cold boots
      expect(mockStorage[STORAGE_KEY_TELEMETRY]).toBeDefined();
      expect(mockStorage[STORAGE_KEY_TELEMETRY]).toContain('BEAGLE POINT');

      unsubscribe();
      engine.destroy();
    });
  });

  describe('Multi-Window Popout & Layout Persistence', () => {
    it('opens window with correct specs and records window config to LocalStorage', () => {
      const openSpy = vi.fn().mockReturnValue({
        closed: false,
        outerWidth: 1024,
        outerHeight: 768,
        screenX: 100,
        screenY: 100,
      });

      vi.stubGlobal('window', {
        location: {
          origin: 'http://localhost:5173',
          pathname: '/',
        },
        screen: {
          availWidth: 1920,
          availHeight: 1080,
        },
        open: openSpy,
        setInterval: vi.fn(),
        clearInterval: vi.fn(),
      });

      const engine = new AuxiliaryDisplayEngine();
      const win = engine.openPopoutWindow('EXPLORER', { width: 1024, height: 768 });

      expect(win).not.toBeNull();
      expect(openSpy).toHaveBeenCalledWith(
        'http://localhost:5173/?popout=mfd&mode=explorer',
        'atlas_mfd_popout_explorer',
        expect.stringContaining('width=1024')
      );

      const savedConfig = engine.getLayoutConfig('EXPLORER');
      expect(savedConfig).toBeDefined();
      expect(savedConfig?.mode).toBe('EXPLORER');
      expect(savedConfig?.width).toBe(1024);
      expect(savedConfig?.autoWakeLock).toBe(true);

      // Verify persisted layout
      expect(mockStorage[STORAGE_KEY_LAYOUT]).toBeDefined();
      expect(mockStorage[STORAGE_KEY_LAYOUT]).toContain('explorer');

      engine.destroy();
    });

    it('loads saved layout configuration upon engine instantiation', () => {
      const mockConfig: WindowLayoutConfig = {
        id: 'combat',
        title: 'COMBAT MFD',
        mode: 'COMBAT',
        width: 1200,
        height: 800,
        left: 200,
        top: 150,
        isBorderless: true,
        autoWakeLock: true,
      };

      mockStorage[STORAGE_KEY_LAYOUT] = JSON.stringify({
        version: 1,
        lastUpdated: Date.now(),
        activeLayouts: {
          COMBAT: mockConfig,
        },
      });

      const engine = new AuxiliaryDisplayEngine();
      const retrieved = engine.getLayoutConfig('COMBAT');
      expect(retrieved).toBeDefined();
      expect(retrieved?.width).toBe(1200);
      expect(retrieved?.height).toBe(800);

      engine.destroy();
    });
  });
});
