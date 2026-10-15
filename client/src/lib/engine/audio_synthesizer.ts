// Location: atlas/client/src/lib/engine/audio_synthesizer.ts
// Task 4.4.3: Procedural WebAudio Synthesizer for Elite Dangerous Navigation HUD Chimes
// Generates synthesized dual-tone harmonic chimes without external mp3/wav audio assets

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural futuristic navigation waypoint chime (dual sinusoidal harmonized bell)
   */
  public playWaypointChime(type: 'copy' | 'advance' | 'complete' = 'copy') {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'copy') {
      // Crisp 880Hz -> 1760Hz double ping with subtle high-tech decay
      this.playTone(ctx, 880, now, 0.08, 'sine', 0.15);
      this.playTone(ctx, 1320, now + 0.06, 0.12, 'sine', 0.18);
      this.playTone(ctx, 1760, now + 0.12, 0.20, 'triangle', 0.12);
    } else if (type === 'advance') {
      // Upward melodic high-wake progression (FSD jump waypoint locked)
      this.playTone(ctx, 523.25, now, 0.1, 'sine', 0.15); // C5
      this.playTone(ctx, 659.25, now + 0.08, 0.1, 'sine', 0.15); // E5
      this.playTone(ctx, 783.99, now + 0.16, 0.15, 'sine', 0.2); // G5
      this.playTone(ctx, 1046.50, now + 0.24, 0.35, 'sine', 0.25); // C6
    } else if (type === 'complete') {
      // Majestic chord arrival confirmation
      this.playTone(ctx, 440, now, 0.4, 'triangle', 0.2);
      this.playTone(ctx, 554.37, now + 0.05, 0.4, 'sine', 0.2);
      this.playTone(ctx, 659.25, now + 0.1, 0.5, 'sine', 0.2);
      this.playTone(ctx, 880, now + 0.15, 0.7, 'sine', 0.25);
    }
  }

  /**
   * General purpose HUD chime trigger
   */
  public playChime(name: string = 'copy') {
    if (name === 'target_lock' || name === 'advance') {
      this.playWaypointChime('advance');
    } else if (name === 'affirm' || name === 'complete') {
      this.playWaypointChime('complete');
    } else {
      this.playWaypointChime('copy');
    }
  }


  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    waveType: OscillatorType,
    peakVolume: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Speech synthesized computer confirmation cue ("Waypoint copied: Sol")
   */
  public speakWaypoint(systemName: string) {
    if (this.isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any prior pending speech
      const utterance = new SpeechSynthesisUtterance(`Waypoint copied: ${systemName}`);
      utterance.rate = 1.15;
      utterance.pitch = 1.05;
      utterance.volume = 0.8;

      // Select high-clarity english voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('Samantha')));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis failures in headless / unsupported environments
    }
  }
}

export const audioSynthesizer = new AudioSynthesizer();
