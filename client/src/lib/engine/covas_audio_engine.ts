// Location: atlas/client/src/lib/engine/covas_audio_engine.ts
// Stage 11.4: Real-Time Audio Cue Synthesizer & Speech Announcements
// Zero-asset procedural WebAudio API cue synthesizer (discovery chimes, FSD supercharge sweep,
// high-G and low-fuel warning klaxons, frequency telemetry pulses) paired with Web Speech API
// (window.speechSynthesis) robotic COVAS cockpit voice announcements.
// Strictly enforces Cobra HUD aesthetic, id64 string preservation, and standalone architecture.

import type { JournalEventRecord, CommanderVfsSlot, StatusTelemetrySnapshot } from '$engine/journal_watcher_engine';

export type CovasVoiceProfileId = 'verity_female' | 'victor_male' | 'celeste_synth' | 'system_default';

export interface CovasVoiceProfile {
  id: CovasVoiceProfileId;
  name: string;
  genderLabel: string;
  callsign: string;
  basePitch: number;
  baseRate: number;
  ringModHz: number;
  biquadCenterHz: number;
  description: string;
}

export type CovasCueCategory =
  | 'HIGH_VALUE_BODY'
  | 'FSD_SUPERCHARGED'
  | 'HIGH_G_APPROACH'
  | 'LOW_FUEL_WARNING'
  | 'HEAT_WARNING'
  | 'SHIELDS_OFFLINE'
  | 'DOCKING_GRANTED'
  | 'TELEMETRY_PULSE';

export interface CovasAlertToggleMap {
  HIGH_VALUE_BODY: boolean;
  FSD_SUPERCHARGED: boolean;
  HIGH_G_APPROACH: boolean;
  LOW_FUEL_WARNING: boolean;
  HEAT_WARNING: boolean;
  SHIELDS_OFFLINE: boolean;
  DOCKING_GRANTED: boolean;
  TELEMETRY_PULSE: boolean;
}

export interface CovasAudioSettings {
  masterEnabled: boolean;
  speechEnabled: boolean;
  proceduralCuesEnabled: boolean;
  masterVolume: number;       // 0.0 to 1.0
  speechVolume: number;       // 0.0 to 1.0
  cueVolume: number;          // 0.0 to 1.0
  pitchMultiplier: number;    // 0.5 to 1.6
  rateMultiplier: number;     // 0.7 to 1.5
  roboticFilterMix: number;   // 0.0 to 1.0
  voiceProfileId: CovasVoiceProfileId;
  preferredSystemVoiceUri: string;
  alertToggles: CovasAlertToggleMap;
}

export interface CovasAnnouncementRecord {
  id: string;
  timestamp: string;
  category: CovasCueCategory;
  severity: 'INFO' | 'DISCOVERY' | 'WARNING' | 'CRITICAL';
  voiceProfileName: string;
  spokenText: string;
  cuePatternName: string;
  systemName?: string;
  systemAddressId64?: string;
  bodyName?: string;
  telemetryMetric?: string;
  durationMs: number;
}

export const COVAS_VOICE_PROFILES: CovasVoiceProfile[] = [
  {
    id: 'verity_female',
    name: 'VERITY [FEMALE]',
    genderLabel: 'Female',
    callsign: 'COVAS-VRT-01',
    basePitch: 0.94,
    baseRate: 1.02,
    ringModHz: 42,
    biquadCenterHz: 1850,
    description: 'Standard Faulcon DeLacy / Brewer Corp cockpit voice with crisp upper-mid clarity.',
  },
  {
    id: 'victor_male',
    name: 'VICTOR [MALE]',
    genderLabel: 'Male',
    callsign: 'COVAS-VCT-02',
    basePitch: 0.78,
    baseRate: 0.98,
    ringModHz: 34,
    biquadCenterHz: 1420,
    description: 'Core Dynamics tactical baritone profile with low-mid resonant cockpit EQ.',
  },
  {
    id: 'celeste_synth',
    name: 'CELESTE [SYNTH]',
    genderLabel: 'Harmonic Synth',
    callsign: 'COVAS-CLS-03',
    basePitch: 1.12,
    baseRate: 1.06,
    ringModHz: 58,
    biquadCenterHz: 2240,
    description: 'Gutamaya harmonic vocal synthesizer with metallic ring-modulated shimmer.',
  },
  {
    id: 'system_default',
    name: 'OS NATIVE [DIRECT]',
    genderLabel: 'System Default',
    callsign: 'COVAS-SYS-04',
    basePitch: 1.0,
    baseRate: 1.0,
    ringModHz: 28,
    biquadCenterHz: 1650,
    description: 'Direct OS speechSynthesis voice with minimal robotic modulation.',
  },
];

type CovasEngineSubscriber = (
  settings: CovasAudioSettings,
  history: CovasAnnouncementRecord[],
  spectrumBins: number[],
  isSpeaking: boolean
) => void;

const HIGH_VALUE_PLANET_CLASSES = [
  'earthlike body',
  'earth-like world',
  'water world',
  'ammonia world',
];

class CovasAudioEngine {
  private settings: CovasAudioSettings = {
    masterEnabled: true,
    speechEnabled: true,
    proceduralCuesEnabled: true,
    masterVolume: 0.85,
    speechVolume: 0.9,
    cueVolume: 0.8,
    pitchMultiplier: 1.0,
    rateMultiplier: 1.0,
    roboticFilterMix: 0.65,
    voiceProfileId: 'verity_female',
    preferredSystemVoiceUri: '',
    alertToggles: {
      HIGH_VALUE_BODY: true,
      FSD_SUPERCHARGED: true,
      HIGH_G_APPROACH: true,
      LOW_FUEL_WARNING: true,
      HEAT_WARNING: true,
      SHIELDS_OFFLINE: true,
      DOCKING_GRANTED: true,
      TELEMETRY_PULSE: true,
    },
  };

  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private masterGainNode: GainNode | null = null;
  private subscribers = new Set<CovasEngineSubscriber>();
  private history: CovasAnnouncementRecord[] = [];
  private isSpeaking = false;
  private spectrumBins: number[] = Array(24).fill(6);
  private lastLowFuelAlertBySlot = new Map<string, number>();
  private lastHighGAlertBySlot = new Map<string, number>();
  private lastShieldsAlertBySlot = new Map<string, boolean>();
  private seenEventIds = new Set<string>();

  constructor() {
    this.seedInitialHistory();
  }

  private seedInitialHistory(): void {
    const now = Date.now();
    this.history = [
      {
        id: 'covas_seed_1',
        timestamp: new Date(now - 42000).toISOString(),
        category: 'HIGH_VALUE_BODY',
        severity: 'DISCOVERY',
        voiceProfileName: 'VERITY [FEMALE]',
        spokenText: 'High-Value Body Detected. Earth-Like World confirmed at Synuefe XO-P c22-17 A 4.',
        cuePatternName: 'Harmonic Triad Discovery Chime (528Hz -> 660Hz -> 792Hz -> 1056Hz)',
        systemName: 'Synuefe XO-P c22-17',
        systemAddressId64: '5068792389291',
        bodyName: 'Synuefe XO-P c22-17 A 4',
        telemetryMetric: 'Earth-Like World | Est. 3.24M CR',
        durationMs: 1450,
      },
      {
        id: 'covas_seed_2',
        timestamp: new Date(now - 24000).toISOString(),
        category: 'FSD_SUPERCHARGED',
        severity: 'INFO',
        voiceProfileName: 'VERITY [FEMALE]',
        spokenText: 'Frame Shift Drive operating beyond safety limits. Frame Shift Drive Supercharged.',
        cuePatternName: 'Neutron Cone FM Rising Sweep (180Hz -> 1480Hz + Sub Bass)',
        systemName: "Jackson's Lighthouse",
        systemAddressId64: '145824203299',
        telemetryMetric: 'Boost Factor 400% | Range 284.6 LY',
        durationMs: 1320,
      },
      {
        id: 'covas_seed_3',
        timestamp: new Date(now - 9000).toISOString(),
        category: 'HIGH_G_APPROACH',
        severity: 'WARNING',
        voiceProfileName: 'VERITY [FEMALE]',
        spokenText: 'Warning: High-Gravity Planetary Approach. Surface gravity 3.85 G. Check vertical descent thruster authority.',
        cuePatternName: 'Dual-Oscillator High-G Klaxon (880Hz / 622Hz Tritone Pulse)',
        systemName: 'Achenar',
        systemAddressId64: '124572190347',
        bodyName: 'Achenar 3',
        telemetryMetric: '3.85 G | Alt 18.4 km',
        durationMs: 1620,
      },
    ];
  }

  public getSettings(): CovasAudioSettings {
    return {
      ...this.settings,
      alertToggles: { ...this.settings.alertToggles },
    };
  }

  public updateSettings(partial: Partial<CovasAudioSettings>): CovasAudioSettings {
    this.settings = {
      ...this.settings,
      ...partial,
      alertToggles: {
        ...this.settings.alertToggles,
        ...(partial.alertToggles ?? {}),
      },
    };
    if (this.masterGainNode && this.audioCtx) {
      const targetGain = this.settings.masterEnabled ? this.settings.masterVolume : 0;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.02);
    }
    this.notifySubscribers();
    return this.getSettings();
  }

  public toggleAlertCategory(category: CovasCueCategory): CovasAudioSettings {
    this.settings.alertToggles = {
      ...this.settings.alertToggles,
      [category]: !this.settings.alertToggles[category],
    };
    this.notifySubscribers();
    return this.getSettings();
  }

  public getHistory(): CovasAnnouncementRecord[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.notifySubscribers();
  }

  public getSpectrumBins(): number[] {
    if (this.analyserNode && this.audioCtx && this.audioCtx.state === 'running') {
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);
      const nextBins: number[] = [];
      for (let i = 0; i < 24; i++) {
        const val = data[i] ?? 0;
        nextBins.push(Math.max(6, Math.round((val / 255) * 100)));
      }
      if (nextBins.some((b) => b > 8)) {
        this.spectrumBins = nextBins;
      }
    }
    return [...this.spectrumBins];
  }

  public getAvailableSystemVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    try {
      return window.speechSynthesis.getVoices();
    } catch {
      return [];
    }
  }

  public subscribe(cb: CovasEngineSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.getSettings(), this.getHistory(), this.getSpectrumBins(), this.isSpeaking);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notifySubscribers(): void {
    const s = this.getSettings();
    const h = this.getHistory();
    const bins = this.getSpectrumBins();
    for (const cb of this.subscribers) {
      cb(s, h, bins, this.isSpeaking);
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextCtor();
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = this.settings.masterEnabled ? this.settings.masterVolume : 0;

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.72;

      this.masterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getActiveVoiceProfile(): CovasVoiceProfile {
    return (
      COVAS_VOICE_PROFILES.find((p) => p.id === this.settings.voiceProfileId) ??
      COVAS_VOICE_PROFILES[0]
    );
  }

  public playProceduralCue(category: CovasCueCategory): { patternName: string; durationMs: number } {
    const profile = this.getActiveVoiceProfile();
    const patternInfo = this.getCueMetadata(category);

    this.animateSyntheticSpectrum(category);

    if (!this.settings.masterEnabled || !this.settings.proceduralCuesEnabled) {
      return patternInfo;
    }

    const ctx = this.ensureAudioContext();
    if (!ctx || !this.masterGainNode) {
      return patternInfo;
    }

    const now = ctx.currentTime;
    const cueGainValue = Math.max(0.001, this.settings.masterVolume * this.settings.cueVolume);

    const cockpitFilter = ctx.createBiquadFilter();
    cockpitFilter.type = 'peaking';
    cockpitFilter.frequency.setValueAtTime(profile.biquadCenterHz, now);
    cockpitFilter.Q.setValueAtTime(1.4 + this.settings.roboticFilterMix * 2.5, now);
    cockpitFilter.gain.setValueAtTime(3.5 * this.settings.roboticFilterMix, now);
    cockpitFilter.connect(this.masterGainNode);

    switch (category) {
      case 'HIGH_VALUE_BODY': {
        const freqs = [528, 660, 792, 1056];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          const start = now + idx * 0.11;
          osc.frequency.setValueAtTime(freq, start);
          noteGain.gain.setValueAtTime(0.0001, start);
          noteGain.gain.exponentialRampToValueAtTime(cueGainValue * 0.35, start + 0.025);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
          osc.connect(noteGain);
          noteGain.connect(cockpitFilter);
          osc.start(start);
          osc.stop(start + 0.5);
        });
        break;
      }

      case 'FSD_SUPERCHARGED': {
        const carrier = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const env = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(180, now);
        carrier.frequency.exponentialRampToValueAtTime(1480, now + 0.85);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(profile.ringModHz, now);
        modGain.gain.setValueAtTime(65 * this.settings.roboticFilterMix, now);

        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(cueGainValue * 0.32, now + 0.12);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(env);
        env.connect(cockpitFilter);

        carrier.start(now);
        mod.start(now);
        carrier.stop(now + 0.98);
        mod.stop(now + 0.98);
        break;
      }

      case 'HIGH_G_APPROACH': {
        for (let pulse = 0; pulse < 3; pulse++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const pStart = now + pulse * 0.24;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, pStart);
          osc.frequency.setValueAtTime(622, pStart + 0.11);

          g.gain.setValueAtTime(0.0001, pStart);
          g.gain.exponentialRampToValueAtTime(cueGainValue * 0.38, pStart + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, pStart + 0.21);

          osc.connect(g);
          g.connect(cockpitFilter);
          osc.start(pStart);
          osc.stop(pStart + 0.22);
        }
        break;
      }

      case 'LOW_FUEL_WARNING': {
        const steps = [740, 493.88, 740, 440];
        steps.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t0 = now + idx * 0.15;
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(cueGainValue * 0.26, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
          osc.connect(g);
          g.connect(cockpitFilter);
          osc.start(t0);
          osc.stop(t0 + 0.14);
        });
        break;
      }

      case 'HEAT_WARNING':
      case 'SHIELDS_OFFLINE': {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t0 = now + i * 0.12;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(category === 'HEAT_WARNING' ? 987.77 : 415.3, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(cueGainValue * 0.3, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
          osc.connect(g);
          g.connect(cockpitFilter);
          osc.start(t0);
          osc.stop(t0 + 0.11);
        }
        break;
      }

      case 'DOCKING_GRANTED':
      case 'TELEMETRY_PULSE':
      default: {
        const freqs = category === 'DOCKING_GRANTED' ? [587.33, 880] : [659.25, 987.77];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t0 = now + idx * 0.09;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(cueGainValue * 0.25, t0 + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
          osc.connect(g);
          g.connect(cockpitFilter);
          osc.start(t0);
          osc.stop(t0 + 0.15);
        });
        break;
      }
    }

    if (this.settings.speechEnabled && this.settings.roboticFilterMix > 0.15) {
      const voxCarrier = ctx.createOscillator();
      const voxGain = ctx.createGain();
      voxCarrier.type = 'sine';
      voxCarrier.frequency.setValueAtTime(profile.ringModHz * 4, now + 0.15);
      voxGain.gain.setValueAtTime(0.0001, now + 0.15);
      voxGain.gain.exponentialRampToValueAtTime(
        cueGainValue * 0.06 * this.settings.roboticFilterMix,
        now + 0.25
      );
      voxGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
      voxCarrier.connect(voxGain);
      voxGain.connect(cockpitFilter);
      voxCarrier.start(now + 0.15);
      voxCarrier.stop(now + 1.2);
    }

    return patternInfo;
  }

  private getCueMetadata(category: CovasCueCategory): { patternName: string; durationMs: number } {
    switch (category) {
      case 'HIGH_VALUE_BODY':
        return {
          patternName: 'Harmonic Triad Discovery Chime (528Hz -> 660Hz -> 792Hz -> 1056Hz)',
          durationMs: 1450,
        };
      case 'FSD_SUPERCHARGED':
        return {
          patternName: 'Neutron Cone FM Rising Sweep (180Hz -> 1480Hz + Sub Bass)',
          durationMs: 1320,
        };
      case 'HIGH_G_APPROACH':
        return {
          patternName: 'Dual-Oscillator High-G Klaxon (880Hz / 622Hz Tritone Pulse)',
          durationMs: 1620,
        };
      case 'LOW_FUEL_WARNING':
        return {
          patternName: 'Descending Amber Caution Double-Beep (740Hz -> 440Hz)',
          durationMs: 1280,
        };
      case 'HEAT_WARNING':
        return {
          patternName: 'Thermal Overload Rapid Strobe Alarm (987.77Hz)',
          durationMs: 1180,
        };
      case 'SHIELDS_OFFLINE':
        return {
          patternName: 'Deflector Collapse Low-Mid Alert (415.3Hz)',
          durationMs: 1240,
        };
      case 'DOCKING_GRANTED':
        return {
          patternName: 'Starport Flight Control Clearance Two-Tone (587Hz -> 880Hz)',
          durationMs: 960,
        };
      case 'TELEMETRY_PULSE':
      default:
        return {
          patternName: 'Cockpit Telemetry Ping (659Hz -> 987Hz)',
          durationMs: 640,
        };
    }
  }

  private animateSyntheticSpectrum(category: CovasCueCategory): void {
    const seed =
      category === 'HIGH_VALUE_BODY'
        ? 85
        : category === 'HIGH_G_APPROACH'
          ? 96
          : category === 'FSD_SUPERCHARGED'
            ? 90
            : 74;
    this.spectrumBins = Array.from({ length: 24 }, (_, idx) => {
      const wave = Math.sin((idx / 24) * Math.PI) * seed;
      const harmonic = ((idx * 17 + seed) % 29) * 0.9;
      return Math.min(100, Math.max(12, Math.round(wave * 0.72 + harmonic)));
    });
    this.notifySubscribers();
  }

  public speakAnnouncement(spokenText: string): void {
    if (!this.settings.masterEnabled || !this.settings.speechEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const profile = this.getActiveVoiceProfile();
      const utterance = new SpeechSynthesisUtterance(spokenText);

      const voices = this.getAvailableSystemVoices();
      if (this.settings.preferredSystemVoiceUri) {
        const matched = voices.find((v) => v.voiceURI === this.settings.preferredSystemVoiceUri);
        if (matched) utterance.voice = matched;
      } else if (voices.length > 0) {
        const wantFemale = profile.id === 'verity_female' || profile.id === 'celeste_synth';
        const wantMale = profile.id === 'victor_male';
        const genderVoice = voices.find((v) => {
          const n = v.name.toLowerCase();
          if (wantFemale) {
            return (
              n.includes('zira') ||
              n.includes('hazel') ||
              n.includes('susan') ||
              n.includes('female') ||
              n.includes('samantha') ||
              n.includes('google uk english female')
            );
          }
          if (wantMale) {
            return (
              n.includes('david') ||
              n.includes('george') ||
              n.includes('mark') ||
              n.includes('male') ||
              n.includes('daniel') ||
              n.includes('google uk english male')
            );
          }
          return false;
        });
        if (genderVoice) utterance.voice = genderVoice;
      }

      const finalPitch = Math.max(
        0.4,
        Math.min(1.8, Number((profile.basePitch * this.settings.pitchMultiplier).toFixed(2)))
      );
      const finalRate = Math.max(
        0.6,
        Math.min(1.7, Number((profile.baseRate * this.settings.rateMultiplier).toFixed(2)))
      );
      utterance.pitch = finalPitch;
      utterance.rate = finalRate;
      utterance.volume = Math.max(
        0,
        Math.min(1, Number((this.settings.masterVolume * this.settings.speechVolume).toFixed(2)))
      );

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notifySubscribers();
      };
      utterance.onend = () => {
        this.isSpeaking = false;
        this.notifySubscribers();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        this.notifySubscribers();
      };

      this.isSpeaking = true;
      this.notifySubscribers();
      synth.speak(utterance);
    } catch {
      this.isSpeaking = false;
    }
  }

  public triggerAlert(params: {
    category: CovasCueCategory;
    severity: 'INFO' | 'DISCOVERY' | 'WARNING' | 'CRITICAL';
    spokenText: string;
    systemName?: string;
    systemAddressId64?: string;
    bodyName?: string;
    telemetryMetric?: string;
    forcePlay?: boolean;
  }): CovasAnnouncementRecord | null {
    if (!params.forcePlay && !this.settings.alertToggles[params.category]) {
      return null;
    }

    const profile = this.getActiveVoiceProfile();
    const cueInfo = this.playProceduralCue(params.category);
    this.speakAnnouncement(params.spokenText);

    const record: CovasAnnouncementRecord = {
      id: `covas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      category: params.category,
      severity: params.severity,
      voiceProfileName: profile.name,
      spokenText: params.spokenText,
      cuePatternName: cueInfo.patternName,
      systemName: params.systemName,
      systemAddressId64: params.systemAddressId64 ? String(params.systemAddressId64) : undefined,
      bodyName: params.bodyName,
      telemetryMetric: params.telemetryMetric,
      durationMs: cueInfo.durationMs,
    };

    this.history = [record, ...this.history].slice(0, 50);
    this.notifySubscribers();
    return record;
  }

  public processJournalEvent(evt: JournalEventRecord): CovasAnnouncementRecord | null {
    if (this.seenEventIds.has(evt.id)) return null;
    this.seenEventIds.add(evt.id);

    const raw = evt.rawJson ?? {};
    const eventName = evt.event;

    if (eventName === 'Scan' || eventName === 'SAAScanComplete') {
      const planetClass = String(raw.PlanetClass ?? '').toLowerCase();
      const terraformState = String(raw.TerraformState ?? '').toLowerCase();
      const isHighValueClass = HIGH_VALUE_PLANET_CLASSES.some((c) => planetClass.includes(c));
      const isTerraformable =
        terraformState.includes('terraformable') || terraformState.includes('terraforming');

      if (isHighValueClass || isTerraformable || eventName === 'SAAScanComplete') {
        const bodyLabel = evt.bodyName ?? String(raw.BodyName ?? 'Unknown Body');
        const classDisplay =
          String(raw.PlanetClass ?? '') ||
          (isTerraformable ? 'Terraformable Body' : 'High-Value Planetary Body');
        return this.triggerAlert({
          category: 'HIGH_VALUE_BODY',
          severity: 'DISCOVERY',
          spokenText: `High-Value Body Detected. ${classDisplay} at ${bodyLabel}.`,
          systemName: evt.systemName,
          systemAddressId64: evt.systemAddressId64,
          bodyName: bodyLabel,
          telemetryMetric: `${classDisplay}${isTerraformable ? ' (Terraformable)' : ''}`,
        });
      }
    }

    if (
      eventName === 'JetConeBoost' ||
      (eventName === 'FSDJump' && (Boolean(raw.BoostUsed) || Number(raw.BoostValue ?? 1) > 1))
    ) {
      const boostVal = Number(raw.BoostValue ?? 4.0);
      return this.triggerAlert({
        category: 'FSD_SUPERCHARGED',
        severity: 'INFO',
        spokenText: 'Frame Shift Drive operating beyond safety limits. Frame Shift Drive Supercharged.',
        systemName: evt.systemName,
        systemAddressId64: evt.systemAddressId64,
        telemetryMetric: `Jet-Cone Boost x${boostVal.toFixed(1)}`,
      });
    }

    if (eventName === 'ApproachBody' || (eventName === 'Scan' && Number(raw.SurfaceGravity ?? 0) > 14.7)) {
      const rawGravity = Number(raw.SurfaceGravity ?? 24.5);
      const gForce = rawGravity > 8 ? rawGravity / 9.80665 : rawGravity;
      if (gForce >= 1.5 || eventName === 'ApproachBody') {
        const bodyLabel = evt.bodyName ?? String(raw.Body ?? raw.BodyName ?? 'Planetary Body');
        return this.triggerAlert({
          category: 'HIGH_G_APPROACH',
          severity: 'WARNING',
          spokenText: `Warning: High-Gravity Planetary Approach. ${bodyLabel} gravity ${gForce.toFixed(2)} G.`,
          systemName: evt.systemName,
          systemAddressId64: evt.systemAddressId64,
          bodyName: bodyLabel,
          telemetryMetric: `${gForce.toFixed(2)} G Surface Gravity`,
        });
      }
    }

    if (eventName === 'DockingGranted') {
      const pad = raw.LandingPad ?? 12;
      const station = String(raw.StationName ?? 'Starport');
      return this.triggerAlert({
        category: 'DOCKING_GRANTED',
        severity: 'INFO',
        spokenText: `Docking request granted. Proceed to landing pad ${pad} at ${station}.`,
        systemName: evt.systemName,
        systemAddressId64: evt.systemAddressId64,
        telemetryMetric: `${station} | Pad #${pad}`,
      });
    }

    if (eventName === 'HeatWarning' || eventName === 'HeatDamage') {
      return this.triggerAlert({
        category: 'HEAT_WARNING',
        severity: 'CRITICAL',
        spokenText: 'Warning: Temperature critical. Taking internal module heat damage.',
        systemName: evt.systemName,
        systemAddressId64: evt.systemAddressId64,
        telemetryMetric: 'Thermal Load > 100%',
      });
    }

    return null;
  }

  public evaluateSlotTelemetry(slot: CommanderVfsSlot): void {
    const snap: StatusTelemetrySnapshot | null = slot.statusSnapshot;
    if (!snap) return;

    const now = Date.now();

    const fuelRatio = slot.fuelCapacity > 0 ? slot.fuelMain / slot.fuelCapacity : 1;
    const lowFuelFlag = (snap.flags & (1 << 19)) !== 0;
    if (fuelRatio <= 0.15 || lowFuelFlag) {
      const prevAlert = this.lastLowFuelAlertBySlot.get(slot.slotId) ?? 0;
      if (now - prevAlert > 45000) {
        this.lastLowFuelAlertBySlot.set(slot.slotId, now);
        this.triggerAlert({
          category: 'LOW_FUEL_WARNING',
          severity: 'CRITICAL',
          spokenText: `Warning: Main fuel reservoir low. ${(fuelRatio * 100).toFixed(0)} percent remaining.`,
          systemName: slot.currentSystem,
          systemAddressId64: slot.systemAddressId64,
          telemetryMetric: `${slot.fuelMain.toFixed(1)} / ${slot.fuelCapacity.toFixed(1)} T (${(fuelRatio * 100).toFixed(0)}%)`,
        });
      }
    }

    const gravityG = snap.gravity ?? 0;
    if (gravityG >= 1.5) {
      const prevHighG = this.lastHighGAlertBySlot.get(slot.slotId) ?? 0;
      if (now - prevHighG > 45000) {
        this.lastHighGAlertBySlot.set(slot.slotId, now);
        this.triggerAlert({
          category: 'HIGH_G_APPROACH',
          severity: 'WARNING',
          spokenText: `Warning: High-Gravity Planetary Approach. Surface gravity ${gravityG.toFixed(2)} G.`,
          systemName: slot.currentSystem,
          systemAddressId64: slot.systemAddressId64,
          bodyName: snap.bodyName ?? slot.currentSystem,
          telemetryMetric: `${gravityG.toFixed(2)} G | Alt ${Math.round(snap.altitude ?? 0).toLocaleString()} m`,
        });
      }
    }

    const prevShield = this.lastShieldsAlertBySlot.get(slot.slotId) ?? true;
    if (prevShield && !slot.shieldUp) {
      this.triggerAlert({
        category: 'SHIELDS_OFFLINE',
        severity: 'CRITICAL',
        spokenText: 'Warning: Shields offline.',
        systemName: slot.currentSystem,
        systemAddressId64: slot.systemAddressId64,
        telemetryMetric: `Hull ${slot.hullPercent}%`,
      });
    }
    this.lastShieldsAlertBySlot.set(slot.slotId, slot.shieldUp);
  }

  public simulateEarthLikeWorldScan(): CovasAnnouncementRecord | null {
    return this.triggerAlert({
      category: 'HIGH_VALUE_BODY',
      severity: 'DISCOVERY',
      spokenText:
        'High-Value Body Detected. Earth-Like World confirmed at Synuefe XO-P c22-17 A 4. Terraform state optimal.',
      systemName: 'Synuefe XO-P c22-17',
      systemAddressId64: '5068792389291',
      bodyName: 'Synuefe XO-P c22-17 A 4',
      telemetryMetric: 'Earth-Like World | 0.98 G | Est. 3,245,800 CR',
      forcePlay: true,
    });
  }
}

export const covasAudioEngine = new CovasAudioEngine();
