// Location: atlas/client/src/lib/components/hardware/CockpitAudioModal.svelte
// Stage 15.4: Procedural Cockpit Sound Effects, Ambience & VHF Acoustic Synthesizer Control Panel
// Full-fidelity tactile sim-rig audio studio for testing procedural UI soundscapes, ambience loops,
// alarms, master dynamics compression, and VHF radio acoustic filters without external audio files.

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    cockpitAudioSynthesizer,
    type CockpitAudioSettings,
    type CockpitAmbienceProfile,
    type CockpitUiSoundType,
  } from '$engine/cockpit_audio_synthesizer';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let settings = $state<CockpitAudioSettings>(cockpitAudioSynthesizer.getSettings());
  let isAmbienceActive = $state<boolean>(cockpitAudioSynthesizer.isAmbiencePlaying());
  let isAlarmActive = $state<boolean>(cockpitAudioSynthesizer.isAlarmActive());
  let lastPlayedSound = $state<string>('READY');
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = cockpitAudioSynthesizer.subscribe((updated) => {
      settings = updated;
      isAmbienceActive = cockpitAudioSynthesizer.isAmbiencePlaying();
      isAlarmActive = cockpitAudioSynthesizer.isAlarmActive();
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  function playSound(type: CockpitUiSoundType, label: string) {
    cockpitAudioSynthesizer.playUiSound(type);
    lastPlayedSound = label;
  }

  function handleMasterToggle() {
    cockpitAudioSynthesizer.updateSettings({ masterMuted: !settings.masterMuted });
    lastPlayedSound = settings.masterMuted ? 'AUDIO UNMUTED' : 'AUDIO MUTED';
  }

  function handleAmbienceToggle() {
    if (isAmbienceActive) {
      cockpitAudioSynthesizer.stopAmbience();
      isAmbienceActive = false;
      lastPlayedSound = 'AMBIENCE STOPPED';
    } else {
      cockpitAudioSynthesizer.startAmbience();
      isAmbienceActive = true;
      lastPlayedSound = `AMBIENCE STARTED (${settings.ambienceProfile})`;
    }
  }

  function handleProfileChange(profile: CockpitAmbienceProfile) {
    cockpitAudioSynthesizer.updateSettings({ ambienceProfile: profile });
    if (isAmbienceActive) {
      cockpitAudioSynthesizer.restartAmbience();
    }
    lastPlayedSound = `PROFILE: ${profile}`;
  }

  function handleAlarmToggle() {
    if (isAlarmActive) {
      cockpitAudioSynthesizer.stopProximityAlarm();
      isAlarmActive = false;
      lastPlayedSound = 'ALARM SILENCED';
    } else {
      cockpitAudioSynthesizer.startProximityAlarm(750);
      isAlarmActive = true;
      lastPlayedSound = 'PROXIMITY ALARM ACTIVE';
    }
  }

  function handleRadioFilterToggle() {
    cockpitAudioSynthesizer.updateSettings({ radioFilterEnabled: !settings.radioFilterEnabled });
    cockpitAudioSynthesizer.playUiSound(settings.radioFilterEnabled ? 'radio_squelch_open' : 'radio_squelch_close');
    lastPlayedSound = !settings.radioFilterEnabled ? 'VHF FILTER ENGAGED' : 'VHF FILTER BYPASSED';
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono text-zinc-200"
    role="dialog"
    aria-modal="true"
    aria-label="Cockpit Sound Effects & WebAudio Synthesizer Studio"
  >
    <!-- Modal Card Shell -->
    <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#05080c] border border-orange-500/60 rounded-lg shadow-[0_0_35px_rgba(255,113,0,0.25)] overflow-hidden">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-zinc-950/90 border-b border-orange-500/40">
        <div class="flex items-center space-x-3">
          <span class="text-xl">🔊</span>
          <div>
            <h2 class="text-sm font-black text-orange-400 tracking-wider uppercase">
              PROCEDURAL COCKPIT SOUND SYNTHESIZER
            </h2>
            <p class="text-[10px] text-zinc-400 tracking-wide">
              STAGE 15.4 // WEBAUDIO DSP ACOUSTIC FILTER, TACTILE UI SOUNDS & SIM-RIG AMBIENCE
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Last Tone Status Badge -->
          <div class="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded bg-black/60 border border-orange-500/30 text-[10px]">
            <span class="text-orange-400 font-bold">STATUS:</span>
            <span class="text-amber-300 font-extrabold">{lastPlayedSound}</span>
          </div>

          <button
            type="button"
            class="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-bold transition-colors"
            onclick={() => {
              cockpitAudioSynthesizer.playUiSound('holographic_click');
              onClose();
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      <!-- Modal Body (Scrollable Studio Controls) -->
      <div class="p-6 overflow-y-auto space-y-6">
        <!-- Master Master Output Strip -->
        <div class="bg-black/50 p-4 rounded-lg border border-orange-500/30 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold text-orange-300 uppercase tracking-wider flex items-center space-x-2">
              <span>🎚️</span>
              <span>MASTER DYNAMICS & OUTPUT GAIN BUS</span>
            </span>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                class="px-3 py-1 rounded text-xs font-extrabold tracking-wider border transition-all {settings.masterMuted
                  ? 'bg-red-600/40 border-red-500 text-red-200'
                  : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'}"
                onclick={handleMasterToggle}
              >
                {settings.masterMuted ? '🔇 MUTED' : '🔊 LIVE'}
              </button>
            </div>
          </div>

          <!-- Volume Fader Sliders Grid -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <!-- Master Volume -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-zinc-400">
                <span>MASTER GAIN</span>
                <span class="text-orange-300 font-bold">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={settings.masterVolume}
                oninput={() => cockpitAudioSynthesizer.updateSettings({ masterVolume: settings.masterVolume })}
                class="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded cursor-pointer"
              />
            </div>

            <!-- UI Sound FX Volume -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-zinc-400">
                <span>TACTILE UI SOUNDS</span>
                <span class="text-orange-300 font-bold">{Math.round(settings.uiVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={settings.uiVolume}
                oninput={() => cockpitAudioSynthesizer.updateSettings({ uiVolume: settings.uiVolume })}
                class="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded cursor-pointer"
              />
            </div>

            <!-- Ambience Volume -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-zinc-400">
                <span>REACTOR / AIR AMBIENCE</span>
                <span class="text-orange-300 font-bold">{Math.round(settings.ambienceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={settings.ambienceVolume}
                oninput={() => cockpitAudioSynthesizer.updateSettings({ ambienceVolume: settings.ambienceVolume })}
                class="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded cursor-pointer"
              />
            </div>

            <!-- Alarms Volume -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-zinc-400">
                <span>KLAXONS & WARNINGS</span>
                <span class="text-orange-300 font-bold">{Math.round(settings.alarmsVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={settings.alarmsVolume}
                oninput={() => cockpitAudioSynthesizer.updateSettings({ alarmsVolume: settings.alarmsVolume })}
                class="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        <!-- Section 1: Procedural Tactile Cockpit UI Sound FX Grid -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-2">
            <span>🔘</span>
            <span>PROCEDURAL TACTILE UI SOUNDPAD (LIVE SYNTHESIS)</span>
          </h3>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            <!-- Holographic Touch Click -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('holographic_click', 'HOLO CLICK')}
            >
              <div class="text-[10px] text-zinc-400">CAPACITIVE</div>
              <div class="text-xs font-bold text-orange-300">Holo Click</div>
            </button>

            <!-- Rotary Dial Tick -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('rotary_tick', 'ROTARY TICK')}
            >
              <div class="text-[10px] text-zinc-400">HARDWARE ENCODER</div>
              <div class="text-xs font-bold text-orange-300">Rotary Dial Tick</div>
            </button>

            <!-- Toggle Switch -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('toggle_switch', 'TOGGLE SWITCH')}
            >
              <div class="text-[10px] text-zinc-400">RELAY SNAP</div>
              <div class="text-xs font-bold text-orange-300">Toggle Switch</div>
            </button>

            <!-- Drawer Open -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('drawer_slide_open', 'DRAWER OPEN')}
            >
              <div class="text-[10px] text-zinc-400">HYDRAULIC SWEEP</div>
              <div class="text-xs font-bold text-orange-300">Drawer Slide Open</div>
            </button>

            <!-- Drawer Close -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('drawer_slide_close', 'DRAWER CLOSE')}
            >
              <div class="text-[10px] text-zinc-400">HYDRAULIC SWEEP</div>
              <div class="text-xs font-bold text-orange-300">Drawer Slide Close</div>
            </button>

            <!-- Confirm Tone -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('affirm_tone', 'CONFIRM CHIME')}
            >
              <div class="text-[10px] text-emerald-400">HARMONIC DUAL SINE</div>
              <div class="text-xs font-bold text-emerald-300">Affirm / OK</div>
            </button>

            <!-- Target Lock -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('target_lock', 'TARGET LOCK')}
            >
              <div class="text-[10px] text-cyan-400">TACTICAL RADAR</div>
              <div class="text-xs font-bold text-cyan-300">Target Lock</div>
            </button>

            <!-- Error Buzzer -->
            <button
              type="button"
              class="px-3 py-2.5 rounded bg-zinc-950/80 border border-red-500/30 hover:border-red-400 hover:bg-red-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('error_buzzer', 'ERROR BUZZER')}
            >
              <div class="text-[10px] text-red-400">DISSONANT SAWTOOTH</div>
              <div class="text-xs font-bold text-red-300">Error Buzzer</div>
            </button>
          </div>
        </div>

        <!-- Section 2: Environmental Flight Tones (FSD Charging & Proximity Klaxons) -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-2">
            <span>🚀</span>
            <span>FRAME SHIFT DRIVE & TACTICAL PROXIMITY SIMULATOR</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <!-- FSD Charge Spool Up -->
            <button
              type="button"
              class="p-3 rounded bg-zinc-950/80 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('fsd_charge_start', 'FSD CHARGING')}
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-300">FSD Spool Up</span>
                <span class="text-xs">⚡</span>
              </div>
              <p class="text-[10px] text-zinc-400 mt-1">Multi-octave subharmonic drive charging sweep (65Hz-680Hz)</p>
            </button>

            <!-- FSD Charge Cancel -->
            <button
              type="button"
              class="p-3 rounded bg-zinc-950/80 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('fsd_charge_cancel', 'FSD ABORTED')}
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-zinc-300">FSD Cancel</span>
                <span class="text-xs">⏹️</span>
              </div>
              <p class="text-[10px] text-zinc-400 mt-1">Drive thermal cutoff and turbine spool down sweep</p>
            </button>

            <!-- High-Wake Jump Flash -->
            <button
              type="button"
              class="p-3 rounded bg-zinc-950/80 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-left transition-all active:scale-[0.98]"
              onclick={() => playSound('fsd_jump_flash', 'JUMP FLASH')}
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-cyan-300">High-Wake Flash</span>
                <span class="text-xs">🌌</span>
              </div>
              <p class="text-[10px] text-zinc-400 mt-1">Hyperspace conduit entry shockwave & vacuum pop</p>
            </button>

            <!-- Proximity Alarm Loop Toggle -->
            <button
              type="button"
              class="p-3 rounded border text-left transition-all active:scale-[0.98] {isAlarmActive
                ? 'bg-red-950/80 border-red-500 text-red-200 animate-pulse'
                : 'bg-zinc-950/80 border-red-500/30 hover:border-red-400 hover:bg-red-500/10 text-red-300'}"
              onclick={handleAlarmToggle}
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold">{isAlarmActive ? 'Silence Alarm' : 'Proximity Alarm'}</span>
                <span class="text-xs">⚠️</span>
              </div>
              <p class="text-[10px] text-zinc-400 mt-1">Planetary surface & high-gravity proximity warning loop</p>
            </button>
          </div>
        </div>

        <!-- Section 3: Procedural Cockpit Ambience Loops -->
        <div class="space-y-3 bg-black/40 p-4 rounded-lg border border-orange-500/25">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-2">
                <span>🌌</span>
                <span>SIM-RIG COCKPIT AMBIENCE GENERATOR (PROCEDURAL LOOPS)</span>
              </h3>
              <p class="text-[10px] text-zinc-400 mt-0.5">
                Continuous dual-frequency reactor rumble, life support air flow & sub-bass cabin resonance.
              </p>
            </div>

            <button
              type="button"
              class="px-4 py-1.5 rounded text-xs font-extrabold tracking-wider border transition-all {isAmbienceActive
                ? 'bg-orange-500 border-orange-400 text-black font-black shadow-[0_0_15px_rgba(255,113,0,0.4)]'
                : 'bg-zinc-900 border-orange-500/40 text-orange-300 hover:bg-orange-500/20'}"
              onclick={handleAmbienceToggle}
            >
              {isAmbienceActive ? '⏹️ STOP AMBIENCE' : '▶ START AMBIENCE'}
            </button>
          </div>

          <!-- Ambience Acoustic Profiles -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              class="p-2.5 rounded border text-left text-xs transition-all {settings.ambienceProfile === 'EXPLORER_CRUISE'
                ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}"
              onclick={() => handleProfileChange('EXPLORER_CRUISE')}
            >
              <div class="font-bold text-orange-300">EXPLORER CRUISE</div>
              <div class="text-[10px] text-zinc-500">43Hz F1 / 65Hz C2 calm deep-space drone</div>
            </button>

            <button
              type="button"
              class="p-2.5 rounded border text-left text-xs transition-all {settings.ambienceProfile === 'COMBAT_ALERT'
                ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}"
              onclick={() => handleProfileChange('COMBAT_ALERT')}
            >
              <div class="font-bold text-red-300">COMBAT ALERT</div>
              <div class="text-[10px] text-zinc-500">73Hz D2 / 110Hz A2 energized high-draw hum</div>
            </button>

            <button
              type="button"
              class="p-2.5 rounded border text-left text-xs transition-all {settings.ambienceProfile === 'SUPERCRUISE_DRONE'
                ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}"
              onclick={() => handleProfileChange('SUPERCRUISE_DRONE')}
            >
              <div class="font-bold text-cyan-300">SUPERCRUISE</div>
              <div class="text-[10px] text-zinc-500">60Hz / 90Hz frame warping turbine drone</div>
            </button>

            <button
              type="button"
              class="p-2.5 rounded border text-left text-xs transition-all {settings.ambienceProfile === 'HEAVY_HAULER'
                ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}"
              onclick={() => handleProfileChange('HEAVY_HAULER')}
            >
              <div class="font-bold text-amber-300">HEAVY HAULER</div>
              <div class="text-[10px] text-zinc-500">36Hz D1 industrial mass freighter rumble</div>
            </button>
          </div>
        </div>

        <!-- Section 4: VHF Radio Acoustic Filter & Squelch Controls -->
        <div class="space-y-3 bg-black/40 p-4 rounded-lg border border-orange-500/25">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-2">
                <span>📻</span>
                <span>VHF RADIO ACOUSTIC FILTER & COVAS SQUELCH</span>
              </h3>
              <p class="text-[10px] text-zinc-400 mt-0.5">
                Bandpass filter (450Hz - 2800Hz), analog soft saturation, and RF mic squelch pop simulation.
              </p>
            </div>

            <button
              type="button"
              class="px-3.5 py-1.5 rounded text-xs font-extrabold tracking-wider border transition-all {settings.radioFilterEnabled
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'}"
              onclick={handleRadioFilterToggle}
            >
              {settings.radioFilterEnabled ? '📡 VHF FILTER ACTIVE' : 'BYPASS (CLEAN)'}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              class="px-3 py-1.5 rounded bg-zinc-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all"
              onclick={() => playSound('radio_squelch_open', 'SQUELCH OPEN')}
            >
              ⚡ Mic Key-Down Squelch
            </button>

            <button
              type="button"
              class="px-3 py-1.5 rounded bg-zinc-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all"
              onclick={() => playSound('radio_squelch_close', 'SQUELCH CLOSE')}
            >
              ⏹️ Mic Release Squelch
            </button>

            <div class="flex items-center space-x-2 ml-auto text-[11px] text-zinc-400">
              <span>RF NOISE LEVEL:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                bind:value={settings.radioNoiseLevel}
                oninput={() => cockpitAudioSynthesizer.updateSettings({ radioNoiseLevel: settings.radioNoiseLevel })}
                class="w-28 accent-cyan-400 bg-zinc-900 h-1.5 rounded cursor-pointer"
              />
              <span class="text-cyan-300 font-bold">{Math.round(settings.radioNoiseLevel * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div class="px-5 py-2.5 bg-zinc-950/90 border-t border-orange-500/30 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>
          <span>DYNAMICS COMPRESSION: </span>
          <span class="text-emerald-400 font-bold">ONLINE (-18dB THRESHOLD, 8:1 RATIO)</span>
        </div>
        <div class="text-orange-400/80">
          PROPRIETARY ZERO-ASSET WEBAUDIO GRAPH
        </div>
      </div>
    </div>
  </div>
{/if}
