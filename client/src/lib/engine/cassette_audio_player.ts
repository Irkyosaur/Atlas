// Location: atlas/client/src/lib/engine/cassette_audio_player.ts
// Stage 5.4: Procedural Web Audio API Cassette Tape / Retro Radio Player & Filter Synthesizer

import type { AudioLogEntry } from './poi_catalog';

export interface CassetteTapeSettings {
  staticIntensity: number;   // 0.0 to 1.0 (noise level)
  wowFlutter: number;        // 0.0 to 1.0 (tape speed wobble)
  frequencyCutoff: number;   // 400 to 4000 Hz (bandpass/lowpass vintage filter)
  driveGain: number;         // 1.0 to 50.0 (tape saturation distortion)
  subBassRumble: number;     // 0.0 to 1.0 (engine/deep space rumble)
  radioSquelch: boolean;     // Squelch pop at start/end
}

export type PlayerState = 'idle' | 'playing' | 'paused' | 'stopped';

export class CassetteAudioPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private waveShaper: WaveShaperNode | null = null;

  // Active procedural generators
  private carrierOsc: OscillatorNode | null = null;
  private carrierGain: GainNode | null = null;
  private staticNode: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;
  private rumbleNode: AudioBufferSourceNode | null = null;
  private rumbleGain: GainNode | null = null;
  private flutterLfo: OscillatorNode | null = null;
  private speechSynth: SpeechSynthesisUtterance | null = null;

  // State
  private activeLog: AudioLogEntry | null = null;
  private currentState: PlayerState = 'idle';
  private playbackStartTime: number = 0;
  private playbackDuration: number = 0;
  private isMuted: boolean = false;
  private onStateChangeCb?: (state: PlayerState, progressSec: number, totalSec: number) => void;
  private progressInterval: number | null = null;

  public settings: CassetteTapeSettings = {
    staticIntensity: 0.35,
    wowFlutter: 0.25,
    frequencyCutoff: 1250,
    driveGain: 20.0,
    subBassRumble: 0.30,
    radioSquelch: true,
  };

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initAudioNodes() {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // 1. Master Output Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // 2. Vintage Cassette Bandpass Filter (warm lo-fi telephone/cassette characteristic)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.setValueAtTime(this.settings.frequencyCutoff, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // 3. Analog WaveShaper (Magnetic Tape Saturation Curve)
    this.waveShaper = this.ctx.createWaveShaper();
    this.waveShaper.curve = this.createDistortionCurve(this.settings.driveGain);
    this.waveShaper.oversample = '4x';

    // Route: [Internal Sources] -> WaveShaper -> Filter -> Master -> Destination
    this.waveShaper.connect(this.filterNode);
    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const buffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createNoiseBuffer(durationSec: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext missing');
    const bufferSize = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    // Pink noise + crackle filter
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      // Random tape crackle pop
      if (Math.random() < 0.0003) {
        output[i] += (Math.random() - 0.5) * 1.5;
      }
    }
    return buffer;
  }

  private playSquelchChirp(type: 'open' | 'close') {
    if (!this.ctx || !this.settings.radioSquelch || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    if (type === 'open') {
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.07);
    } else {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.09);
    }

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.10);
  }

  public onStateChange(cb: (state: PlayerState, progressSec: number, totalSec: number) => void) {
    this.onStateChangeCb = cb;
  }

  public playAudioLog(log: AudioLogEntry) {
    this.initAudioNodes();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop(); // Stop any currently playing log

    this.activeLog = log;
    this.playbackDuration = log.durationSec;
    this.playbackStartTime = this.ctx.currentTime;
    this.currentState = 'playing';

    // Apply presets
    const p = log.synthesisPreset;
    this.settings.frequencyCutoff = p.filterCutoffHz;
    this.settings.driveGain = p.distortionGain;
    this.settings.wowFlutter = p.wobbleHz / 4.0;

    if (this.filterNode) {
      this.filterNode.frequency.setValueAtTime(p.filterCutoffHz, this.ctx.currentTime);
    }
    if (this.waveShaper) {
      this.waveShaper.curve = this.createDistortionCurve(p.distortionGain);
    }

    // Play initial radio squelch
    this.playSquelchChirp('open');

    // 1. Cassette Magnetic Static Noise Generator
    const noiseBuffer = this.createNoiseBuffer(Math.max(log.durationSec + 2, 5));
    this.staticNode = this.ctx.createBufferSource();
    this.staticNode.buffer = noiseBuffer;
    this.staticNode.loop = true;

    this.staticGain = this.ctx.createGain();
    const staticVol = this.isMuted ? 0 : this.settings.staticIntensity * 0.45;
    this.staticGain.gain.setValueAtTime(staticVol, this.ctx.currentTime);

    this.staticNode.connect(this.staticGain);
    if (this.waveShaper) this.staticGain.connect(this.waveShaper);
    this.staticNode.start();

    // 2. Analog Carrier Frequency Hum + Wow & Flutter LFO
    this.carrierOsc = this.ctx.createOscillator();
    this.carrierGain = this.ctx.createGain();
    this.carrierOsc.type = 'triangle';
    this.carrierOsc.frequency.setValueAtTime(p.carrierFreq, this.ctx.currentTime);

    // Tape wow/flutter modulation oscillator
    this.flutterLfo = this.ctx.createOscillator();
    const flutterGain = this.ctx.createGain();
    this.flutterLfo.frequency.setValueAtTime(p.wobbleHz, this.ctx.currentTime);
    flutterGain.gain.setValueAtTime(14.0 * this.settings.wowFlutter, this.ctx.currentTime);
    this.flutterLfo.connect(flutterGain);
    flutterGain.connect(this.carrierOsc.frequency);
    this.flutterLfo.start();

    const carrierVol = this.isMuted ? 0 : 0.08;
    this.carrierGain.gain.setValueAtTime(carrierVol, this.ctx.currentTime);
    this.carrierOsc.connect(this.carrierGain);
    if (this.waveShaper) this.carrierGain.connect(this.waveShaper);
    this.carrierOsc.start();

    // 3. Speech Synthesis Vocal Track (if supported by browser)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop pending utterances

      this.speechSynth = new SpeechSynthesisUtterance(log.transcript);
      this.speechSynth.rate = 0.88; // Slightly deliberate retro radio cadence
      this.speechSynth.pitch = p.pitchBase / 120.0; // Pitch adjust for speaker
      this.speechSynth.volume = this.isMuted ? 0 : 1.0;

      // Select deep or robotic voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const engVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('George') || v.name.includes('Natural') || v.name.includes('UK'))) || voices[0];
        if (engVoice) {
          this.speechSynth.voice = engVoice;
        }
      }

      this.speechSynth.onend = () => {
        this.handlePlaybackComplete();
      };
      this.speechSynth.onerror = () => {
        // Fallback to timer
      };

      try {
        window.speechSynthesis.speak(this.speechSynth);
      } catch {
        // Speech synth may fail if user hasn't interacted
      }
    }

    // Start progress timer
    this.startProgressTicker();
  }

  private startProgressTicker() {
    this.clearProgressTicker();
    this.progressInterval = window.setInterval(() => {
      if (!this.ctx || this.currentState !== 'playing') return;
      const elapsed = this.ctx.currentTime - this.playbackStartTime;
      if (this.onStateChangeCb) {
        this.onStateChangeCb(this.currentState, Math.min(elapsed, this.playbackDuration), this.playbackDuration);
      }
      if (elapsed >= this.playbackDuration) {
        this.handlePlaybackComplete();
      }
    }, 150);
  }

  private clearProgressTicker() {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handlePlaybackComplete() {
    this.playSquelchChirp('close');
    this.stopGenerators();
    this.currentState = 'idle';
    if (this.onStateChangeCb && this.activeLog) {
      this.onStateChangeCb('idle', this.playbackDuration, this.playbackDuration);
    }
  }

  public pause() {
    if (this.currentState !== 'playing') return;
    this.currentState = 'paused';
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.stopGenerators();
    if (this.onStateChangeCb && this.ctx) {
      const elapsed = this.ctx.currentTime - this.playbackStartTime;
      this.onStateChangeCb('paused', elapsed, this.playbackDuration);
    }
  }

  public resume() {
    if (this.currentState !== 'paused' || !this.activeLog) return;
    this.playAudioLog(this.activeLog);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public stop() {
    this.currentState = 'stopped';
    this.clearProgressTicker();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.stopGenerators();
    if (this.onStateChangeCb) {
      this.onStateChangeCb('stopped', 0, this.playbackDuration);
    }
  }

  private stopGenerators() {
    this.clearProgressTicker();
    try {
      this.staticNode?.stop();
      this.staticNode?.disconnect();
    } catch {}
    try {
      this.carrierOsc?.stop();
      this.carrierOsc?.disconnect();
    } catch {}
    try {
      this.flutterLfo?.stop();
      this.flutterLfo?.disconnect();
    } catch {}
    try {
      this.rumbleNode?.stop();
      this.rumbleNode?.disconnect();
    } catch {}

    this.staticNode = null;
    this.carrierOsc = null;
    this.flutterLfo = null;
    this.rumbleNode = null;
  }

  public setStaticIntensity(val: number) {
    this.settings.staticIntensity = Math.max(0, Math.min(1, val));
    if (this.staticGain && this.ctx) {
      this.staticGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.settings.staticIntensity * 0.45,
        this.ctx.currentTime
      );
    }
  }

  public setWowFlutter(val: number) {
    this.settings.wowFlutter = Math.max(0, Math.min(1, val));
  }

  public setFrequencyCutoff(hz: number) {
    this.settings.frequencyCutoff = Math.max(300, Math.min(6000, hz));
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setValueAtTime(this.settings.frequencyCutoff, this.ctx.currentTime);
    }
  }

  public setDistortionDrive(gain: number) {
    this.settings.driveGain = Math.max(1, Math.min(60, gain));
    if (this.waveShaper) {
      this.waveShaper.curve = this.createDistortionCurve(this.settings.driveGain);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.speechSynth) {
      this.speechSynth.volume = muted ? 0 : 1.0;
    }
  }

  public isCurrentlyMuted(): boolean {
    return this.isMuted;
  }

  public destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const cassettePlayer = new CassetteAudioPlayer();
