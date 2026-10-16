// Location: atlas/client/src/lib/engine/cockpit_audio_synthesizer.ts
// Stage 15.4: Procedural Cockpit Sound Effects, Sim-Rig Ambience & VHF Radio Filter Synthesizer
// Zero-asset procedural WebAudio API sound engine matching authentic Elite Dangerous cockpit soundscapes.
// Features:
// 1. Procedural UI sounds: holographic button clicks, rotary dial ticks, drawer slides, error buzzers, toggle snaps.
// 2. Procedural Cockpit Ambience: subtle multi-oscillator low-frequency reactor hum, life support air hiss, FSD charge hum.
// 3. Proximity & Hazard Alarms: planetary proximity high-G alarm, heat warning siren, terrain collision warning.
// 4. VHF Radio Acoustic Filter: bandpass shaping, analog soft-saturation waveshaping, noise squelch burst, and radio chirp.
// 5. Dynamics Processing: Master DynamicsCompressorNode, gain controls, mute toggles, and state persistence.

export type CockpitUiSoundType =
  | 'holographic_click'
  | 'rotary_tick'
  | 'drawer_slide_open'
  | 'drawer_slide_close'
  | 'toggle_switch'
  | 'error_buzzer'
  | 'affirm_tone'
  | 'target_lock'
  | 'fsd_charge_start'
  | 'fsd_charge_cancel'
  | 'fsd_jump_flash'
  | 'proximity_alarm'
  | 'terrain_warning'
  | 'radio_squelch_open'
  | 'radio_squelch_close';

export type CockpitAmbienceProfile = 'OFF' | 'EXPLORER_CRUISE' | 'COMBAT_ALERT' | 'SUPERCRUISE_DRONE' | 'HEAVY_HAULER';

export interface CockpitAudioSettings {
  masterMuted: boolean;
  masterVolume: number;        // 0.0 to 1.0
  uiVolume: number;            // 0.0 to 1.0
  ambienceVolume: number;      // 0.0 to 1.0
  alarmsVolume: number;        // 0.0 to 1.0
  radioFilterEnabled: boolean; // VHF acoustic filter on comms & cues
  radioNoiseLevel: number;     // 0.0 to 1.0
  ambienceProfile: CockpitAmbienceProfile;
  compressorEnabled: boolean;
}

export const DEFAULT_COCKPIT_AUDIO_SETTINGS: CockpitAudioSettings = {
  masterMuted: false,
  masterVolume: 0.75,
  uiVolume: 0.85,
  ambienceVolume: 0.40,
  alarmsVolume: 0.90,
  radioFilterEnabled: false,
  radioNoiseLevel: 0.25,
  ambienceProfile: 'EXPLORER_CRUISE',
  compressorEnabled: true,
};

export const STORAGE_KEY_COCKPIT_AUDIO = 'atlas_cockpit_audio_settings_v1';

export class CockpitAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private alarmsGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // VHF Radio Filter chain nodes
  private vhfHighpass: BiquadFilterNode | null = null;
  private vhfLowpass: BiquadFilterNode | null = null;
  private vhfDistortion: WaveShaperNode | null = null;
  private vhfGain: GainNode | null = null;

  // Ambience loop state nodes
  private subDroneOsc1: OscillatorNode | null = null;
  private subDroneOsc2: OscillatorNode | null = null;
  private subDroneGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private ambienceRunning: boolean = false;

  // Proximity alarm state
  private activeAlarmOsc: OscillatorNode | null = null;
  private activeAlarmGain: GainNode | null = null;
  private alarmInterval: number | null = null;

  private settings: CockpitAudioSettings = { ...DEFAULT_COCKPIT_AUDIO_SETTINGS };
  private listeners: Set<(settings: CockpitAudioSettings) => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COCKPIT_AUDIO);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_COCKPIT_AUDIO_SETTINGS, ...parsed };
      }
    } catch {
      // Keep defaults
    }
  }

  public saveSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_COCKPIT_AUDIO, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors
    }
    this.notify();
  }

  public subscribe(fn: (settings: CockpitAudioSettings) => void): () => void {
    this.listeners.add(fn);
    fn(this.getSettings());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getSettings());
      } catch {
        // ignore
      }
    }
  }

  public getSettings(): CockpitAudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<CockpitAudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.applyGains();
    if (partial.ambienceProfile !== undefined || partial.ambienceVolume !== undefined || partial.masterMuted !== undefined) {
      if (this.ambienceRunning) {
        this.restartAmbience();
      }
    }
    this.saveSettings();
  }

  /**
   * Initialize WebAudio Context and dynamic routing graph
   */
  public initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx =
        typeof AudioContext !== 'undefined'
          ? AudioContext
          : typeof window !== 'undefined'
            ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            : null;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain) {
      this.setupRoutingGraph(this.ctx);
    }

    return this.ctx;
  }

  private setupRoutingGraph(ctx: AudioContext) {
    // 1. Dynamics Compressor for rich, punchy cockpit audio without clipping
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-18, ctx.currentTime);
    this.compressor.knee.setValueAtTime(20, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.20, ctx.currentTime);

    // 2. Master Gain
    this.masterGain = ctx.createGain();

    // 3. Channel sub-buses
    this.uiGain = ctx.createGain();
    this.ambienceGain = ctx.createGain();
    this.alarmsGain = ctx.createGain();

    // 4. VHF Radio Filter Chain (Bandpass 400Hz - 3200Hz + Soft Overdrive Saturation)
    this.vhfHighpass = ctx.createBiquadFilter();
    this.vhfHighpass.type = 'highpass';
    this.vhfHighpass.frequency.setValueAtTime(450, ctx.currentTime);
    this.vhfHighpass.Q.setValueAtTime(1.2, ctx.currentTime);

    this.vhfLowpass = ctx.createBiquadFilter();
    this.vhfLowpass.type = 'lowpass';
    this.vhfLowpass.frequency.setValueAtTime(2800, ctx.currentTime);
    this.vhfLowpass.Q.setValueAtTime(1.5, ctx.currentTime);

    this.vhfDistortion = ctx.createWaveShaper();
    this.vhfDistortion.curve = this.createVhfDistortionCurve(16);
    this.vhfDistortion.oversample = '2x';

    this.vhfGain = ctx.createGain();
    this.vhfGain.gain.setValueAtTime(1.15, ctx.currentTime);

    // Wire VHF chain: [Highpass -> Lowpass -> Waveshaper -> VHF Gain]
    this.vhfHighpass.connect(this.vhfLowpass);
    this.vhfLowpass.connect(this.vhfDistortion);
    this.vhfDistortion.connect(this.vhfGain);

    // Channel routing:
    // UI, Ambience, and Alarms route into Compressor
    this.uiGain.connect(this.compressor);
    this.ambienceGain.connect(this.compressor);
    this.alarmsGain.connect(this.compressor);

    // Compressor -> Master Gain -> Destination
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.applyGains();
  }

  private createVhfDistortionCurve(k: number = 16): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private applyGains() {
    if (!this.ctx || !this.masterGain || !this.uiGain || !this.ambienceGain || !this.alarmsGain) return;
    const now = this.ctx.currentTime;
    const effectiveMaster = this.settings.masterMuted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    this.uiGain.gain.setValueAtTime(this.settings.uiVolume, now);
    this.ambienceGain.gain.setValueAtTime(this.settings.ambienceVolume, now);
    this.alarmsGain.gain.setValueAtTime(this.settings.alarmsVolume, now);
  }

  // =========================================================================
  // 1. Procedural Cockpit UI Sound Synthesis
  // =========================================================================

  public playUiSound(sound: CockpitUiSoundType) {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiGain) return;

    const now = ctx.currentTime;

    switch (sound) {
      case 'holographic_click':
        this.synthesizeHoloClick(ctx, now);
        break;
      case 'rotary_tick':
        this.synthesizeRotaryTick(ctx, now);
        break;
      case 'drawer_slide_open':
        this.synthesizeDrawerSlide(ctx, now, true);
        break;
      case 'drawer_slide_close':
        this.synthesizeDrawerSlide(ctx, now, false);
        break;
      case 'toggle_switch':
        this.synthesizeToggleSwitch(ctx, now);
        break;
      case 'error_buzzer':
        this.synthesizeErrorBuzzer(ctx, now);
        break;
      case 'affirm_tone':
        this.synthesizeAffirmTone(ctx, now);
        break;
      case 'target_lock':
        this.synthesizeTargetLock(ctx, now);
        break;
      case 'fsd_charge_start':
        this.synthesizeFsdCharge(ctx, now);
        break;
      case 'fsd_charge_cancel':
        this.synthesizeFsdCancel(ctx, now);
        break;
      case 'fsd_jump_flash':
        this.synthesizeJumpFlash(ctx, now);
        break;
      case 'proximity_alarm':
        this.triggerProximityPulse(ctx, now);
        break;
      case 'terrain_warning':
        this.synthesizeTerrainWarning(ctx, now);
        break;
      case 'radio_squelch_open':
        this.synthesizeRadioSquelch(ctx, now, true);
        break;
      case 'radio_squelch_close':
        this.synthesizeRadioSquelch(ctx, now, false);
        break;
    }
  }

  /**
   * Crisp futuristic holographic capacitive touch click (high-pitch dual sine with micro decay)
   */
  private synthesizeHoloClick(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.035);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Precision sim-rig rotary dial click (wooden-textured metallic transient)
   */
  private synthesizeRotaryTick(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.02);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  /**
   * Cockpit drawer hydraulic sliding sweep
   */
  private synthesizeDrawerSlide(ctx: AudioContext, now: number, isOpen: boolean) {
    const noiseBuffer = this.generatePinkNoise(ctx, 0.22);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4.0, now);

    const startFreq = isOpen ? 350 : 1600;
    const endFreq = isOpen ? 1600 : 350;

    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.20);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    noiseSource.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    noiseSource.start(now);
    noiseSource.stop(now + 0.23);
  }

  /**
   * Tactile toggle switch snap (analog cockpit relay clack)
   */
  private synthesizeToggleSwitch(ctx: AudioContext, now: number) {
    // Pulse 1: mechanical clack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.015);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    this.routeToDestination(gain, this.uiGain!);
    osc.start(now);
    osc.stop(now + 0.02);

    // Pulse 2: electrical latch confirmation
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latchOsc.type = 'sine';
    latchOsc.frequency.setValueAtTime(1250, now + 0.012);

    latchGain.gain.setValueAtTime(0.001, now + 0.012);
    latchGain.gain.linearRampToValueAtTime(0.15, now + 0.015);
    latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    latchOsc.connect(latchGain);
    this.routeToDestination(latchGain, this.uiGain!);
    latchOsc.start(now + 0.012);
    latchOsc.stop(now + 0.05);
  }

  /**
   * Harsh Elite Dangerous style error buzzer / invalid action warning
   */
  private synthesizeErrorBuzzer(ctx: AudioContext, now: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(145, now);
    osc2.frequency.setValueAtTime(148.5, now); // slight detune creates dissonant beating

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.30, now + 0.01);
    gain.gain.setValueAtTime(0.30, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    this.routeToDestination(gain, this.alarmsGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.23);
    osc2.stop(now + 0.23);
  }

  /**
   * Harmonious affirmative confirmation chime (ascending two-tone triad)
   */
  private synthesizeAffirmTone(ctx: AudioContext, now: number) {
    const tones = [784.0, 1046.5]; // G5, C6
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const toneTime = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, toneTime);

      gain.gain.setValueAtTime(0.001, toneTime);
      gain.gain.linearRampToValueAtTime(0.25, toneTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneTime + 0.14);

      osc.connect(gain);
      this.routeToDestination(gain, this.uiGain!);

      osc.start(toneTime);
      osc.stop(toneTime + 0.15);
    });
  }

  /**
   * Tactical target acquisition lock tone (interlocking high-tech chirps)
   */
  private synthesizeTargetLock(ctx: AudioContext, now: number) {
    const frequencies = [1174.66, 1760.0]; // D6, A6
    frequencies.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.20, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.10);

      osc.connect(gain);
      this.routeToDestination(gain, this.uiGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.11);
    });
  }

  /**
   * Frame Shift Drive charging low-to-high turbine spin up
   */
  private synthesizeFsdCharge(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    subOsc.type = 'sine';

    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 1.2);

    subOsc.frequency.setValueAtTime(32.5, now);
    subOsc.frequency.exponentialRampToValueAtTime(340, now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.40, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 1.4);
    subOsc.stop(now + 1.4);
  }

  /**
   * FSD drive charge interrupted / canceled spool down
   */
  private synthesizeFsdCancel(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.45);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  /**
   * High-wake jump entry flash sound (resonant white noise explosion into silence)
   */
  private synthesizeJumpFlash(ctx: AudioContext, now: number) {
    const noiseBuffer = this.generatePinkNoise(ctx, 0.7);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.65);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

    noiseSource.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    noiseSource.start(now);
    noiseSource.stop(now + 0.7);
  }

  /**
   * Planetary proximity / High-G terrain collision warning klaxon
   */
  private synthesizeTerrainWarning(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    this.routeToDestination(gain, this.alarmsGain!);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Proximity radar pulse
   */
  private triggerProximityPulse(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(784, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.30, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    this.routeToDestination(gain, this.alarmsGain!);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * VHF Radio mic open / close squelch burst with RF burst noise
   */
  private synthesizeRadioSquelch(ctx: AudioContext, now: number, isOpen: boolean) {
    const duration = isOpen ? 0.07 : 0.05;
    const noiseBuffer = this.generatePinkNoise(ctx, duration);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1950, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    const squelchLevel = Math.max(0.08, this.settings.radioNoiseLevel * 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(squelchLevel, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    this.routeToDestination(gain, this.uiGain!);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.01);
  }

  // =========================================================================
  // 2. Procedural Cockpit Ambience Loops (Sub-bass Reactor + Life Support)
  // =========================================================================

  public startAmbience() {
    if (this.ambienceRunning || this.settings.ambienceProfile === 'OFF') return;
    const ctx = this.initContext();
    if (!ctx || !this.ambienceGain) return;

    const now = ctx.currentTime;
    const profile = this.settings.ambienceProfile;

    let f1 = 55.0; // A1
    let f2 = 82.4; // E2
    let noiseCutoff = 350;
    let noiseGainAmt = 0.08;

    if (profile === 'EXPLORER_CRUISE') {
      f1 = 43.65; // F1 (peaceful deep space reactor hum)
      f2 = 65.41; // C2
      noiseCutoff = 280;
      noiseGainAmt = 0.05;
    } else if (profile === 'COMBAT_ALERT') {
      f1 = 73.42; // D2 (tense energized hum)
      f2 = 110.0; // A2
      noiseCutoff = 550;
      noiseGainAmt = 0.12;
    } else if (profile === 'SUPERCRUISE_DRONE') {
      f1 = 60.0;
      f2 = 90.0;
      noiseCutoff = 420;
      noiseGainAmt = 0.09;
    } else if (profile === 'HEAVY_HAULER') {
      f1 = 36.7; // D1 (massive industrial freighter rumble)
      f2 = 55.0; // A1
      noiseCutoff = 220;
      noiseGainAmt = 0.07;
    }

    // 1. Dual sub-harmonic oscillators
    this.subDroneOsc1 = ctx.createOscillator();
    this.subDroneOsc2 = ctx.createOscillator();
    this.subDroneGain = ctx.createGain();

    this.subDroneOsc1.type = 'sine';
    this.subDroneOsc2.type = 'triangle';
    this.subDroneOsc1.frequency.setValueAtTime(f1, now);
    this.subDroneOsc2.frequency.setValueAtTime(f2, now);

    this.subDroneGain.gain.setValueAtTime(0.001, now);
    this.subDroneGain.gain.linearRampToValueAtTime(0.20, now + 1.5);

    this.subDroneOsc1.connect(this.subDroneGain);
    this.subDroneOsc2.connect(this.subDroneGain);
    this.subDroneGain.connect(this.ambienceGain);

    this.subDroneOsc1.start(now);
    this.subDroneOsc2.start(now);

    // 2. Continuous life-support / cabin airflow noise loop
    const noiseBuffer = this.generatePinkNoise(ctx, 4.0);
    this.noiseNode = ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.setValueAtTime(noiseCutoff, now);
    this.noiseFilter.Q.setValueAtTime(1.0, now);

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.001, now);
    this.noiseGain.gain.linearRampToValueAtTime(noiseGainAmt, now + 1.5);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.ambienceGain);

    this.noiseNode.start(now);
    this.ambienceRunning = true;
  }

  public stopAmbience() {
    if (!this.ambienceRunning || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.subDroneGain) {
      this.subDroneGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    }
    if (this.noiseGain) {
      this.noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    }

    setTimeout(() => {
      try {
        this.subDroneOsc1?.stop();
        this.subDroneOsc2?.stop();
        this.subDroneOsc1?.disconnect();
        this.subDroneOsc2?.disconnect();
        this.noiseNode?.stop();
        this.noiseNode?.disconnect();
      } catch {
        // ignore already stopped
      }
      this.subDroneOsc1 = null;
      this.subDroneOsc2 = null;
      this.subDroneGain = null;
      this.noiseNode = null;
      this.noiseGain = null;
      this.noiseFilter = null;
      this.ambienceRunning = false;
    }, 550);
  }

  public restartAmbience() {
    this.stopAmbience();
    if (this.settings.ambienceProfile !== 'OFF') {
      setTimeout(() => this.startAmbience(), 600);
    }
  }

  public isAmbiencePlaying(): boolean {
    return this.ambienceRunning;
  }

  // =========================================================================
  // 3. Proximity Alarm Recurring Loop Controller
  // =========================================================================

  public startProximityAlarm(intervalMs: number = 700) {
    if (this.alarmInterval !== null) return;
    this.playUiSound('proximity_alarm');
    this.alarmInterval = setInterval(() => {
      this.playUiSound('proximity_alarm');
    }, intervalMs) as unknown as number;
  }

  public stopProximityAlarm() {
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  public isAlarmActive(): boolean {
    return this.alarmInterval !== null;
  }

  // =========================================================================
  // 4. VHF Radio Acoustic Filter Routing
  // =========================================================================

  private routeToDestination(sourceGain: GainNode, normalDestination: GainNode) {
    if (this.settings.radioFilterEnabled && this.vhfHighpass && this.vhfGain) {
      sourceGain.connect(this.vhfHighpass);
      this.vhfGain.connect(normalDestination);
    } else {
      sourceGain.connect(normalDestination);
    }
  }

  // =========================================================================
  // 5. Procedural Noise Generation
  // =========================================================================

  private generatePinkNoise(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * Teardown engine and close audio context
   */
  public destroy() {
    this.stopProximityAlarm();
    this.stopAmbience();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.uiGain = null;
    this.ambienceGain = null;
    this.alarmsGain = null;
    this.compressor = null;
    this.vhfHighpass = null;
    this.vhfLowpass = null;
    this.vhfDistortion = null;
    this.vhfGain = null;
    this.listeners.clear();
  }
}

export const cockpitAudioSynthesizer = new CockpitAudioSynthesizer();
