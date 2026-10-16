// Location: client/src/test/cockpit_audio_synthesizer.test.ts
// Stage 15.4: Unit tests for Cockpit Audio Synthesizer, Procedural Waveform Engine & VHF Filter

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CockpitAudioSynthesizer,
  DEFAULT_COCKPIT_AUDIO_SETTINGS,
  STORAGE_KEY_COCKPIT_AUDIO,
  type CockpitAudioSettings,
} from '../lib/engine/cockpit_audio_synthesizer';

describe('Cockpit Audio Synthesizer & WebAudio Engine (Stage 15.4)', () => {
  let mockStorage: Record<string, string> = {};

  // Mock WebAudio API structure
  class MockAudioNode {
    connect = vi.fn();
    disconnect = vi.fn();
  }

  class MockAudioParam {
    value: number = 0;
    setValueAtTime = vi.fn((val: number) => {
      this.value = val;
    });
    linearRampToValueAtTime = vi.fn((val: number) => {
      this.value = val;
    });
    exponentialRampToValueAtTime = vi.fn((val: number) => {
      this.value = val;
    });
  }

  class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam();
  }

  class MockBiquadFilterNode extends MockAudioNode {
    type: string = 'lowpass';
    frequency = new MockAudioParam();
    Q = new MockAudioParam();
  }

  class MockOscillatorNode extends MockAudioNode {
    type: string = 'sine';
    frequency = new MockAudioParam();
    start = vi.fn();
    stop = vi.fn();
  }

  class MockDynamicsCompressorNode extends MockAudioNode {
    threshold = new MockAudioParam();
    knee = new MockAudioParam();
    ratio = new MockAudioParam();
    attack = new MockAudioParam();
    release = new MockAudioParam();
  }

  class MockWaveShaperNode extends MockAudioNode {
    curve: Float32Array | null = null;
    oversample: string = 'none';
  }

  class MockAudioBufferSourceNode extends MockAudioNode {
    buffer: any = null;
    loop: boolean = false;
    start = vi.fn();
    stop = vi.fn();
  }

  class MockAudioBuffer {
    length: number;
    sampleRate: number;
    channels: Float32Array[];

    constructor(channels: number, length: number, sampleRate: number) {
      this.length = length;
      this.sampleRate = sampleRate;
      this.channels = Array.from({ length: channels }, () => new Float32Array(length));
    }

    getChannelData(index: number) {
      return this.channels[index];
    }
  }

  class MockAudioContext {
    currentTime = 0;
    state = 'running';
    sampleRate = 44100;
    destination = new MockAudioNode();

    createGain = vi.fn(() => new MockGainNode());
    createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
    createOscillator = vi.fn(() => new MockOscillatorNode());
    createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
    createWaveShaper = vi.fn(() => new MockWaveShaperNode());
    createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
    createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => {
      return new MockAudioBuffer(channels, length, sampleRate);
    });
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
  }

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

    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Audio Settings & Persistence', () => {
    it('initializes with default cockpit audio settings', () => {
      const synth = new CockpitAudioSynthesizer();
      const settings = synth.getSettings();

      expect(settings.masterMuted).toBe(false);
      expect(settings.masterVolume).toBe(DEFAULT_COCKPIT_AUDIO_SETTINGS.masterVolume);
      expect(settings.ambienceProfile).toBe('EXPLORER_CRUISE');
      expect(settings.radioFilterEnabled).toBe(false);
      expect(settings.compressorEnabled).toBe(true);
      synth.destroy();
    });

    it('updates and persists settings into localStorage', () => {
      const synth = new CockpitAudioSynthesizer();
      synth.updateSettings({
        masterVolume: 0.95,
        uiVolume: 0.70,
        ambienceProfile: 'HEAVY_HAULER',
        radioFilterEnabled: true,
      });

      const updated = synth.getSettings();
      expect(updated.masterVolume).toBe(0.95);
      expect(updated.uiVolume).toBe(0.70);
      expect(updated.ambienceProfile).toBe('HEAVY_HAULER');
      expect(updated.radioFilterEnabled).toBe(true);

      const stored = JSON.parse(mockStorage[STORAGE_KEY_COCKPIT_AUDIO]);
      expect(stored.masterVolume).toBe(0.95);
      expect(stored.ambienceProfile).toBe('HEAVY_HAULER');
      synth.destroy();
    });

    it('notifies registered subscribers upon settings change', () => {
      const synth = new CockpitAudioSynthesizer();
      const listener = vi.fn();
      const unsubscribe = synth.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);

      synth.updateSettings({ masterMuted: true });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[1][0].masterMuted).toBe(true);

      unsubscribe();
      synth.updateSettings({ masterMuted: false });
      expect(listener).toHaveBeenCalledTimes(2); // no further call
      synth.destroy();
    });
  });

  describe('Procedural UI Sound Synthesis', () => {
    it('initializes WebAudio context and compressor graph on first UI sound trigger', () => {
      const synth = new CockpitAudioSynthesizer();
      synth.playUiSound('holographic_click');

      const ctx = synth.initContext();
      expect(ctx).toBeTruthy();
      expect(ctx?.createDynamicsCompressor).toHaveBeenCalled();
      expect(ctx?.createGain).toHaveBeenCalled();
      synth.destroy();
    });

    it('synthesizes holographic click with frequency ramp without errors', () => {
      const synth = new CockpitAudioSynthesizer();
      expect(() => synth.playUiSound('holographic_click')).not.toThrow();
      expect(() => synth.playUiSound('rotary_tick')).not.toThrow();
      expect(() => synth.playUiSound('toggle_switch')).not.toThrow();
      expect(() => synth.playUiSound('drawer_slide_open')).not.toThrow();
      expect(() => synth.playUiSound('drawer_slide_close')).not.toThrow();
      expect(() => synth.playUiSound('error_buzzer')).not.toThrow();
      expect(() => synth.playUiSound('affirm_tone')).not.toThrow();
      expect(() => synth.playUiSound('target_lock')).not.toThrow();
      synth.destroy();
    });

    it('synthesizes FSD charging and jump flash without throwing errors', () => {
      const synth = new CockpitAudioSynthesizer();
      expect(() => synth.playUiSound('fsd_charge_start')).not.toThrow();
      expect(() => synth.playUiSound('fsd_charge_cancel')).not.toThrow();
      expect(() => synth.playUiSound('fsd_jump_flash')).not.toThrow();
      synth.destroy();
    });

    it('respects masterMuted by bypassing sound synthesis when muted', () => {
      const synth = new CockpitAudioSynthesizer();
      synth.updateSettings({ masterMuted: true });

      const ctx = synth.initContext();
      const oscCountBefore = (ctx?.createOscillator as any)?.mock?.calls?.length || 0;

      synth.playUiSound('holographic_click');
      const oscCountAfter = (ctx?.createOscillator as any)?.mock?.calls?.length || 0;

      expect(oscCountAfter).toBe(oscCountBefore);
      synth.destroy();
    });
  });

  describe('Cockpit Ambience Loops & VHF Radio Filter', () => {
    it('starts and stops procedural ambience generator with oscillator & pink noise routing', () => {
      const synth = new CockpitAudioSynthesizer();
      expect(synth.isAmbiencePlaying()).toBe(false);

      synth.startAmbience();
      expect(synth.isAmbiencePlaying()).toBe(true);

      synth.stopAmbience();
      synth.destroy();
    });

    it('supports switching ambience profiles (Combat, Supercruise, Heavy Hauler)', () => {
      const synth = new CockpitAudioSynthesizer();
      synth.startAmbience();

      synth.updateSettings({ ambienceProfile: 'COMBAT_ALERT' });
      expect(synth.getSettings().ambienceProfile).toBe('COMBAT_ALERT');

      synth.updateSettings({ ambienceProfile: 'SUPERCRUISE_DRONE' });
      expect(synth.getSettings().ambienceProfile).toBe('SUPERCRUISE_DRONE');

      synth.stopAmbience();
      synth.destroy();
    });

    it('toggles proximity alarm recurring loop', () => {
      vi.useFakeTimers();
      const synth = new CockpitAudioSynthesizer();

      expect(synth.isAlarmActive()).toBe(false);
      synth.startProximityAlarm(500);
      expect(synth.isAlarmActive()).toBe(true);

      vi.advanceTimersByTime(1100);

      synth.stopProximityAlarm();
      expect(synth.isAlarmActive()).toBe(false);
      synth.destroy();
      vi.useRealTimers();
    });

    it('engages VHF Radio acoustic filter without throwing errors', () => {
      const synth = new CockpitAudioSynthesizer();
      synth.updateSettings({ radioFilterEnabled: true, radioNoiseLevel: 0.5 });

      expect(synth.getSettings().radioFilterEnabled).toBe(true);
      expect(() => synth.playUiSound('radio_squelch_open')).not.toThrow();
      expect(() => synth.playUiSound('radio_squelch_close')).not.toThrow();
      synth.destroy();
    });
  });
});
