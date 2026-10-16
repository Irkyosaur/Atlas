<script lang="ts">
  // Location: atlas/client/src/lib/components/sync/CovasAudioPanel.svelte
  // Stage 11.4: Real-Time Audio Cue Synthesizer & Speech Announcements
  // Interactive COVAS Voice & WebAudio Procedural Cue Synthesizer Console with volume/pitch/rate
  // sliders, voice gender/profile selector, per-category alert toggles, real-time 24-band spectrum
  // analyzer, and one-click verification triggers (including "Simulate Earth-Like World Scan").

  import { onMount, onDestroy } from 'svelte';
  import {
    covasAudioEngine,
    COVAS_VOICE_PROFILES,
    type CovasAudioSettings,
    type CovasAnnouncementRecord,
    type CovasCueCategory,
    type CovasVoiceProfileId,
  } from '$engine/covas_audio_engine';

  let settings = $state<CovasAudioSettings>(covasAudioEngine.getSettings());
  let history = $state<CovasAnnouncementRecord[]>(covasAudioEngine.getHistory());
  let spectrumBins = $state<number[]>(covasAudioEngine.getSpectrumBins());
  let isSpeaking = $state<boolean>(false);
  let systemVoices = $state<SpeechSynthesisVoice[]>([]);
  let customAnnouncementText = $state<string>(
    'High-Value Body Detected. Terraformable Water World confirmed in orbital sector.'
  );
  let lastTriggerBanner = $state<string>(
    'COVAS Synthesizer Ready ? Select a trigger below or click SIMULATE EARTH-LIKE WORLD SCAN to verify WebAudio + Speech output.'
  );

  let unsubscribe: (() => void) | null = null;
  let spectrumTimer: ReturnType<typeof setInterval> | null = null;

  const ALERT_CATEGORY_META: Array<{
    key: CovasCueCategory;
    label: string;
    badge: string;
    cueSummary: string;
  }> = [
    {
      key: 'HIGH_VALUE_BODY',
      label: 'High-Value Body (ELW / Terraformable)',
      badge: 'DISCOVERY',
      cueSummary: '528-1056Hz Harmonic Triad Chime',
    },
    {
      key: 'FSD_SUPERCHARGED',
      label: 'FSD Supercharged (Jet-Cone Boost)',
      badge: 'NAV BOOST',
      cueSummary: '180-1480Hz FM Rising Sweep',
    },
    {
      key: 'HIGH_G_APPROACH',
      label: 'High-G Planet Approach (>1.5G)',
      badge: 'WARNING',
      cueSummary: '880/622Hz Tritone Klaxon',
    },
    {
      key: 'LOW_FUEL_WARNING',
      label: 'Low Fuel Warning (<15% Reservoir)',
      badge: 'CRITICAL',
      cueSummary: '740->440Hz Amber Double-Beep',
    },
    {
      key: 'HEAT_WARNING',
      label: 'Thermal Overload (>100% Heat)',
      badge: 'CRITICAL',
      cueSummary: '988Hz Rapid Strobe Alarm',
    },
    {
      key: 'SHIELDS_OFFLINE',
      label: 'Shields Offline Transition',
      badge: 'WARNING',
      cueSummary: '415Hz Deflector Collapse Alert',
    },
    {
      key: 'DOCKING_GRANTED',
      label: 'Docking Clearance Granted',
      badge: 'FLIGHT CTL',
      cueSummary: '587->880Hz Starport Two-Tone',
    },
    {
      key: 'TELEMETRY_PULSE',
      label: 'Cockpit Telemetry Ping',
      badge: 'PULSE',
      cueSummary: '659->987Hz Confirmation Blip',
    },
  ];

  let activeProfile = $derived(
    COVAS_VOICE_PROFILES.find((p) => p.id === settings.voiceProfileId) ?? COVAS_VOICE_PROFILES[0]
  );

  onMount(() => {
    unsubscribe = covasAudioEngine.subscribe((nextSettings, nextHistory, nextBins, speaking) => {
      settings = nextSettings;
      history = nextHistory;
      spectrumBins = nextBins;
      isSpeaking = speaking;
    });

    const loadVoices = () => {
      systemVoices = covasAudioEngine.getAvailableSystemVoices();
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    spectrumTimer = setInterval(() => {
      spectrumBins = covasAudioEngine.getSpectrumBins();
    }, 180);
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (spectrumTimer) clearInterval(spectrumTimer);
  });

  function handleSelectProfile(profileId: CovasVoiceProfileId) {
    covasAudioEngine.updateSettings({ voiceProfileId: profileId });
    const p = COVAS_VOICE_PROFILES.find((item) => item.id === profileId);
    if (p) {
      lastTriggerBanner = `Switched COVAS Voice Profile -> ${p.name} (${p.callsign} | Pitch ${p.basePitch}x | EQ ${p.biquadCenterHz}Hz)`;
    }
  }

  function handleSliderChange(field: keyof CovasAudioSettings, value: number) {
    covasAudioEngine.updateSettings({ [field]: value } as Partial<CovasAudioSettings>);
  }

  function handleSimulateElwScan() {
    const rec = covasAudioEngine.simulateEarthLikeWorldScan();
    if (rec) {
      lastTriggerBanner = `VERIFICATION TRIGGERED -> [${rec.voiceProfileName}] "${rec.spokenText}" + ${rec.cuePatternName}`;
    }
  }

  function handleTriggerPreset(preset: 'FSD' | 'HIGH_G' | 'LOW_FUEL' | 'DOCKING') {
    let rec: CovasAnnouncementRecord | null = null;
    if (preset === 'FSD') {
      rec = covasAudioEngine.triggerAlert({
        category: 'FSD_SUPERCHARGED',
        severity: 'INFO',
        spokenText:
          'Frame Shift Drive operating beyond safety limits. Frame Shift Drive Supercharged.',
        systemName: "Jackson's Lighthouse",
        systemAddressId64: '145824203299',
        telemetryMetric: 'Jet-Cone Boost 400% | Jump Range 284.6 LY',
        forcePlay: true,
      });
    } else if (preset === 'HIGH_G') {
      rec = covasAudioEngine.triggerAlert({
        category: 'HIGH_G_APPROACH',
        severity: 'WARNING',
        spokenText:
          'Warning: High-Gravity Planetary Approach. Surface gravity 4.12 G. Monitor vertical descent rate.',
        systemName: 'Achenar',
        systemAddressId64: '124572190347',
        bodyName: 'Achenar 3',
        telemetryMetric: '4.12 G | Descent -48 m/s',
        forcePlay: true,
      });
    } else if (preset === 'LOW_FUEL') {
      rec = covasAudioEngine.triggerAlert({
        category: 'LOW_FUEL_WARNING',
        severity: 'CRITICAL',
        spokenText:
          'Warning: Main fuel reservoir low. 11 percent remaining. Route to nearest scoopable KGBFOAM star.',
        systemName: 'Oevasy SG-Y d0',
        systemAddressId64: '394810294810',
        telemetryMetric: '3.5 / 32.0 T (11%)',
        forcePlay: true,
      });
    } else {
      rec = covasAudioEngine.triggerAlert({
        category: 'DOCKING_GRANTED',
        severity: 'INFO',
        spokenText: 'Docking request granted. Landing pad 04 assigned at Jameson Memorial.',
        systemName: 'Shinrarta Dezhra',
        systemAddressId64: '3932277478106',
        telemetryMetric: 'Jameson Memorial | Pad #04',
        forcePlay: true,
      });
    }
    if (rec) {
      lastTriggerBanner = `COVAS CUE FIRED -> [${rec.category}] "${rec.spokenText}"`;
    }
  }

  function handleCustomSpeak() {
    if (!customAnnouncementText.trim()) return;
    const rec = covasAudioEngine.triggerAlert({
      category: 'TELEMETRY_PULSE',
      severity: 'INFO',
      spokenText: customAnnouncementText.trim(),
      systemName: 'Sol',
      systemAddressId64: '10477373803',
      telemetryMetric: 'Manual Cockpit Announcement',
      forcePlay: true,
    });
    if (rec) {
      lastTriggerBanner = `CUSTOM COVAS UTTERANCE -> "${rec.spokenText}"`;
    }
  }
</script>

<div class="rounded bg-black/90 border border-[var(--hud-orange)]/45 overflow-hidden">
  <!-- Header Bar -->
  <div
    class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1d1106] via-[#120b05] to-black border-b border-[var(--hud-orange)]/35"
  >
    <div class="flex items-center space-x-2.5">
      <span
        class="px-2 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] tracking-widest uppercase"
      >
        STAGE 11.4 // COVAS SYNTH
      </span>
      <span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-amber)]">
        REAL-TIME AUDIO CUE SYNTHESIZER &amp; COVAS SPEECH ANNOUNCEMENTS (WEBAUDIO + SPEECHSYNTHESIS)
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase {isSpeaking
          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
          : 'bg-white/5 border-white/15 text-white/60'}"
      >
        {isSpeaking ? '?? COVAS SPEAKING' : 'COVAS STANDBY'}
      </span>

      <button
        type="button"
        onclick={() => covasAudioEngine.updateSettings({ masterEnabled: !settings.masterEnabled })}
        class="px-2.5 py-1 rounded border text-[10px] font-bold uppercase transition-colors {settings.masterEnabled
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
          : 'bg-red-500/20 border-red-500/50 text-red-300'}"
      >
        {settings.masterEnabled ? '? MASTER AUDIO ON' : '? MASTER MUTED'}
      </button>

      <button
        type="button"
        onclick={handleSimulateElwScan}
        class="px-3 py-1 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(255,113,0,0.35)] transition-colors"
      >
        ?? SIMULATE EARTH-LIKE WORLD SCAN
      </button>
    </div>
  </div>

  <!-- Status Banner -->
  <div
    class="px-4 py-1.5 bg-black/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]"
  >
    <div class="text-cyan-300 font-mono truncate">{lastTriggerBanner}</div>
    <div class="text-[10px] text-white/50 font-mono">
      Profile: <span class="text-[var(--hud-amber)] font-bold">{activeProfile.name}</span> |
      Callsign: <span class="text-white/80">{activeProfile.callsign}</span> |
      EQ Center: <span class="text-emerald-300">{activeProfile.biquadCenterHz} Hz</span>
    </div>
  </div>

  <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left Column (5 cols): Voice Gender/Profile Selector + Volume/Pitch/Rate Sliders -->
    <div class="lg:col-span-5 space-y-3">
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--hud-amber)]">
            1. COVAS VOICE GENDER &amp; COCKPIT PROFILE SELECTION
          </span>
          <span class="text-[9px] text-white/40 uppercase">Web Speech API</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          {#each COVAS_VOICE_PROFILES as profile}
            <button
              type="button"
              onclick={() => handleSelectProfile(profile.id)}
              class="p-2 rounded border text-left transition-all {settings.voiceProfileId ===
              profile.id
                ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-orange)] text-white shadow-[0_0_12px_rgba(255,113,0,0.2)]'
                : 'bg-black/60 border-white/10 text-white/70 hover:border-white/30'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-[var(--hud-amber)]">{profile.name}</span>
                <span class="text-[9px] px-1 rounded bg-white/10 text-cyan-300">
                  {profile.genderLabel}
                </span>
              </div>
              <div class="text-[9px] text-white/50 mt-0.5 truncate">{profile.description}</div>
            </button>
          {/each}
        </div>

        {#if systemVoices.length > 0}
          <div class="pt-1">
            <label class="block text-[9px] uppercase text-white/50 mb-1">
              OS SpeechSynthesis Voice Override ({systemVoices.length} installed)
              <select
                value={settings.preferredSystemVoiceUri}
                onchange={(e) =>
                  covasAudioEngine.updateSettings({
                    preferredSystemVoiceUri: (e.currentTarget as HTMLSelectElement).value,
                  })}
                class="mt-1 w-full px-2 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] text-[10px]"
              >
                <option value="">Auto-Match COVAS Gender Profile</option>
                {#each systemVoices as v}
                  <option value={v.voiceURI}>{v.name} ({v.lang})</option>
                {/each}
              </select>
            </label>
          </div>
        {/if}
      </div>

      <!-- Sliders: Master, Speech, Cue, Pitch, Rate, Robotic Filter -->
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--hud-amber)]">
            2. GAIN, ROBOTIC PITCH, RATE &amp; BIQUAD FILTER MATRIX
          </span>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onclick={() =>
                covasAudioEngine.updateSettings({ speechEnabled: !settings.speechEnabled })}
              class="px-1.5 py-0.5 rounded text-[9px] font-bold border {settings.speechEnabled
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-white/40'}"
            >
              TTS: {settings.speechEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onclick={() =>
                covasAudioEngine.updateSettings({
                  proceduralCuesEnabled: !settings.proceduralCuesEnabled,
                })}
              class="px-1.5 py-0.5 rounded text-[9px] font-bold border {settings.proceduralCuesEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/40'}"
            >
              SYNTH CUES: {settings.proceduralCuesEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Master Gain</span>
              <span class="text-[var(--hud-amber)] font-bold">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              oninput={(e) =>
                handleSliderChange('masterVolume', Number((e.currentTarget as HTMLInputElement).value))}
              class="w-full accent-[var(--hud-orange)] cursor-pointer"
            />
          </label>

          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Voice Gain</span>
              <span class="text-[var(--hud-amber)] font-bold">
                {Math.round(settings.speechVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.speechVolume}
              oninput={(e) =>
                handleSliderChange('speechVolume', Number((e.currentTarget as HTMLInputElement).value))}
              class="w-full accent-[var(--hud-orange)] cursor-pointer"
            />
          </label>

          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Procedural Chime Gain</span>
              <span class="text-emerald-300 font-bold">
                {Math.round(settings.cueVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.cueVolume}
              oninput={(e) =>
                handleSliderChange('cueVolume', Number((e.currentTarget as HTMLInputElement).value))}
              class="w-full accent-emerald-400 cursor-pointer"
            />
          </label>

          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Robotic Ring-Mod Mix</span>
              <span class="text-cyan-300 font-bold">
                {Math.round(settings.roboticFilterMix * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.roboticFilterMix}
              oninput={(e) =>
                handleSliderChange(
                  'roboticFilterMix',
                  Number((e.currentTarget as HTMLInputElement).value)
                )}
              class="w-full accent-cyan-400 cursor-pointer"
            />
          </label>

          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Robotic Pitch Scale</span>
              <span class="text-[var(--hud-amber)] font-bold">
                {(activeProfile.basePitch * settings.pitchMultiplier).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.05"
              value={settings.pitchMultiplier}
              oninput={(e) =>
                handleSliderChange(
                  'pitchMultiplier',
                  Number((e.currentTarget as HTMLInputElement).value)
                )}
              class="w-full accent-[var(--hud-orange)] cursor-pointer"
            />
          </label>

          <label class="block">
            <div class="flex justify-between text-white/70">
              <span>Cadence Rate Scale</span>
              <span class="text-[var(--hud-amber)] font-bold">
                {(activeProfile.baseRate * settings.rateMultiplier).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.45"
              step="0.05"
              value={settings.rateMultiplier}
              oninput={(e) =>
                handleSliderChange(
                  'rateMultiplier',
                  Number((e.currentTarget as HTMLInputElement).value)
                )}
              class="w-full accent-[var(--hud-orange)] cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- Middle Column (4 cols): Individual Alert Toggles + 24-Band WebAudio Spectrum -->
    <div class="lg:col-span-4 space-y-3">
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--hud-amber)]">
            3. PER-EVENT ALERT ENABLE / DISABLE TOGGLES
          </span>
          <span class="text-[9px] text-white/40">8 TRIGGERS</span>
        </div>

        <div class="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {#each ALERT_CATEGORY_META as item}
            {@const enabled = settings.alertToggles[item.key]}
            <div
              class="flex items-center justify-between px-2.5 py-1.5 rounded bg-black/70 border {enabled
                ? 'border-[var(--hud-orange)]/35'
                : 'border-white/5 opacity-60'}"
            >
              <div class="min-w-0 pr-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-white truncate">{item.label}</span>
                  <span
                    class="px-1 py-0.2 rounded bg-white/10 text-[8px] font-bold text-[var(--hud-amber)]"
                  >
                    {item.badge}
                  </span>
                </div>
                <div class="text-[9px] text-white/45 truncate">{item.cueSummary}</div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onclick={() => covasAudioEngine.playProceduralCue(item.key)}
                  class="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold"
                  title="Preview procedural WebAudio cue"
                >
                  ? TONE
                </button>
                <button
                  type="button"
                  onclick={() => covasAudioEngine.toggleAlertCategory(item.key)}
                  class="px-2 py-0.5 rounded text-[9px] font-bold uppercase border {enabled
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border-white/15 text-white/40'}"
                >
                  {enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Real-Time WebAudio 24-Band Spectrum Analyzer -->
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-2">
        <div class="flex items-center justify-between text-[10px]">
          <span class="font-bold uppercase tracking-wider text-[var(--hud-amber)]">
            WEBAUDIO Biquad + Ring-Mod Spectrum (24-Bin FFT)
          </span>
          <span class="text-[9px] text-emerald-300 font-mono">
            {activeProfile.ringModHz}Hz Mod / {activeProfile.biquadCenterHz}Hz Peaking
          </span>
        </div>

        <div class="h-14 flex items-end gap-1 px-2 py-1.5 rounded bg-black border border-white/10">
          {#each spectrumBins as bin, idx}
            <div
              class="flex-1 rounded-t transition-all duration-150 {idx % 3 === 0
                ? 'bg-[var(--hud-orange)]'
                : idx % 2 === 0
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'}"
              style="height: {Math.max(8, Math.min(100, bin))}%"
            ></div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Right Column (3 cols): Quick Cue Test Matrix & Recent Announcement Log -->
    <div class="lg:col-span-3 space-y-3">
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-2">
        <span class="block text-[10px] font-bold uppercase tracking-wider text-[var(--hud-amber)]">
          4. COCKPIT VOICE &amp; KLAXON TEST DECK
        </span>

        <div class="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onclick={handleSimulateElwScan}
            class="col-span-2 px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold uppercase text-left"
          >
            ?? Scan: Earth-Like World (ELW)
          </button>

          <button
            type="button"
            onclick={() => handleTriggerPreset('FSD')}
            class="px-2 py-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase"
          >
            ? FSD Supercharge
          </button>

          <button
            type="button"
            onclick={() => handleTriggerPreset('HIGH_G')}
            class="px-2 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 text-[10px] font-bold uppercase"
          >
            ?? High-G (4.12G)
          </button>

          <button
            type="button"
            onclick={() => handleTriggerPreset('LOW_FUEL')}
            class="px-2 py-1.5 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-500/50 text-red-300 text-[10px] font-bold uppercase"
          >
            ? Low Fuel (11%)
          </button>

          <button
            type="button"
            onclick={() => handleTriggerPreset('DOCKING')}
            class="px-2 py-1.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/35 border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] text-[10px] font-bold uppercase"
          >
            ?? Docking Pad 04
          </button>
        </div>

        <div class="pt-1 flex gap-1.5">
          <input
            type="text"
            bind:value={customAnnouncementText}
            placeholder="Custom COVAS speech..."
            class="flex-1 min-w-0 px-2 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-white text-[10px]"
          />
          <button
            type="button"
            onclick={handleCustomSpeak}
            class="px-2.5 py-1 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] uppercase shrink-0"
          >
            SPEAK
          </button>
        </div>
      </div>

      <!-- Recent Announcements Log -->
      <div class="p-3 rounded bg-[#0c0c10] border border-white/10 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--hud-amber)]">
            RECENT COVAS ANNOUNCEMENTS ({history.length})
          </span>
          <button
            type="button"
            onclick={() => covasAudioEngine.clearHistory()}
            class="text-[9px] text-white/40 hover:text-white uppercase"
          >
            CLEAR
          </button>
        </div>

        <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {#each history.slice(0, 8) as rec (rec.id)}
            <div class="p-1.5 rounded bg-black/80 border border-white/10 text-[10px]">
              <div class="flex items-center justify-between gap-1">
                <span class="font-bold text-[var(--hud-amber)]">[{rec.category}]</span>
                <span class="text-[9px] text-white/40">{rec.timestamp.slice(11, 19)} UTC</span>
              </div>
              <div class="text-white/90 leading-snug mt-0.5">"{rec.spokenText}"</div>
              <div class="flex items-center justify-between text-[9px] text-cyan-300/80 mt-0.5">
                <span class="truncate">{rec.cuePatternName}</span>
                {#if rec.systemAddressId64}
                  <span class="shrink-0 ml-1">id64:{rec.systemAddressId64}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
