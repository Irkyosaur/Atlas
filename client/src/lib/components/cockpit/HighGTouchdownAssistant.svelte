<script lang="ts">
  // Location: atlas/client/src/lib/components/cockpit/HighGTouchdownAssistant.svelte
  // Stage 12.4: High-G Touchdown Assistant
  // Computes descent rate vs surface gravity (G), monitors safe vertical velocity thresholds,
  // renders descent attitude ladder (-90° to 0°), radar altimeter, sink rate tape,
  // and triggers flashing amber/red warning banners with procedural WebAudio alert tones.

  import { onMount, onDestroy } from 'svelte';
  import {
    calculateTouchdownSafety,
    type TouchdownSafetyEvaluation,
    type TouchdownWarningTier,
  } from '$engine/flight_assist_engine';

  interface Props {
    altitudeM?: number;
    verticalSpeedMs?: number;
    surfaceGravityG?: number;
    glideAngleDeg?: number;
    headingDeg?: number;
    planetName?: string;
    bodyRadiusKm?: number;
    isSimulationMode?: boolean;
    onWarnKlaxon?: (tier: TouchdownWarningTier) => void;
  }

  let {
    altitudeM = 1450,
    verticalSpeedMs = -18.5,
    surfaceGravityG = 3.85,
    glideAngleDeg = -14.2,
    headingDeg = 248,
    planetName = 'Achenar 3',
    bodyRadiusKm = 6420,
    isSimulationMode = false,
    onWarnKlaxon,
  }: Props = $props();

  // Interactive controls for sim exploration
  let localGravity = $state<number>(0);
  let localAlt = $state<number>(0);
  let localVerticalSpeed = $state<number>(0);
  let localGlideAngle = $state<number>(0);
  let audioMuted = $state<boolean>(false);
  let simDescentActive = $state<boolean>(false);

  let simTimer: any = null;
  let audioCtx: AudioContext | null = null;
  let lastAudioBeepMs = 0;

  // React to prop changes if not in interactive override
  $effect(() => {
    if (!simDescentActive) {
      localGravity = surfaceGravityG;
      localAlt = altitudeM;
      localVerticalSpeed = verticalSpeedMs;
      localGlideAngle = glideAngleDeg;
    }
  });

  let safetyEval = $derived<TouchdownSafetyEvaluation>(
    calculateTouchdownSafety({
      altitudeM: localAlt,
      verticalSpeedMs: localVerticalSpeed,
      gravityG: localGravity,
      glideAngleDeg: localGlideAngle,
    })
  );

  function playAlertBeep(freqHz: number, durationMs: number = 100) {
    if (audioMuted || typeof window === 'undefined') return;
    const now = Date.now();
    if (now - lastAudioBeepMs < 120) return;
    lastAudioBeepMs = now;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') void audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;

      osc.type = freqHz > 1000 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freqHz, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + durationMs / 1000 + 0.05);
    } catch {
      // AudioContext unavailable or autoplay restricted
    }
  }

  // Trigger audio warning when safety eval dictates
  $effect(() => {
    if (safetyEval.audioToneFrequencyHz && safetyEval.warningTier !== 'NOMINAL') {
      playAlertBeep(safetyEval.audioToneFrequencyHz, safetyEval.audioPulseIntervalMs || 100);
      onWarnKlaxon?.(safetyEval.warningTier);
    }
  });

  function toggleSimDescent() {
    if (simDescentActive) {
      simDescentActive = false;
      if (simTimer) clearInterval(simTimer);
    } else {
      simDescentActive = true;
      if (simTimer) clearInterval(simTimer);
      simTimer = setInterval(() => {
        if (localAlt > 0) {
          localAlt = Math.max(0, localAlt + localVerticalSpeed * 0.1);
          // slight turbulence
          if (localAlt <= 5) {
            localAlt = 0;
            localVerticalSpeed = 0;
            simDescentActive = false;
            clearInterval(simTimer);
          }
        }
      }, 100);
    }
  }

  onDestroy(() => {
    if (simTimer) clearInterval(simTimer);
    if (audioCtx) {
      try {
        void audioCtx.close();
      } catch {
        // no-op
      }
    }
  });

  // Calculate ladder visual offsets
  let ladderOffsetPx = $derived<number>((localGlideAngle / 90) * 120);
</script>

<div class="high-g-assistant bg-black/90 border border-[#FF7100]/40 rounded-lg p-3 font-mono text-white flex flex-col space-y-3 select-none">
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-[#FF7100]/30 pb-2">
    <div class="flex items-center space-x-2">
      <span class="w-2.5 h-2.5 rounded-full {safetyEval.warningTier === 'CRITICAL_TERRAIN' ? 'bg-red-500 animate-ping' : safetyEval.warningTier === 'DANGER_PULL_UP' ? 'bg-red-500' : safetyEval.warningTier === 'CAUTION' ? 'bg-amber-400' : 'bg-emerald-500'}"></span>
      <span class="text-xs font-extrabold uppercase tracking-widest text-[#FF7100]">
        HIGH-G TOUCHDOWN ASSISTANT
      </span>
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-bold">
        {planetName}
      </span>
    </div>

    <div class="flex items-center space-x-2">
      <button
        type="button"
        onclick={() => (audioMuted = !audioMuted)}
        class="text-[10px] px-2 py-0.5 rounded border {audioMuted ? 'border-red-500/50 text-red-400 bg-red-950/20' : 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20'}"
        title="Toggle Audio Warnings"
      >
        {audioMuted ? '🔇 KLAXON OFF' : '🔊 AUDIO ON'}
      </button>

      <button
        type="button"
        onclick={toggleSimDescent}
        class="text-[10px] px-2 py-0.5 rounded border border-[#FF7100]/50 text-amber-300 hover:bg-[#FF7100]/20 font-bold"
        title="Toggle Simulated Descent Loop"
      >
        {simDescentActive ? '⏸ PAUSE SIM' : '▶ SIM DESCENT'}
      </button>
    </div>
  </div>

  <!-- Warning Banner Display (Flashing when critical/danger) -->
  {#if safetyEval.warningTier !== 'NOMINAL'}
    <div
      class="px-3 py-2 rounded text-center font-extrabold text-xs tracking-wider border-2 transition-all {safetyEval.warningTier === 'CRITICAL_TERRAIN'
        ? 'bg-red-600/30 border-red-500 text-red-100 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]'
        : safetyEval.warningTier === 'DANGER_PULL_UP'
          ? 'bg-red-500/20 border-red-500 text-red-200 animate-pulse'
          : 'bg-amber-500/20 border-amber-400 text-amber-200'}"
    >
      <div class="text-sm uppercase tracking-widest">⚠️ {safetyEval.warningBannerText} ⚠️</div>
      <div class="text-[10px] font-bold mt-0.5 opacity-90">{safetyEval.recommendation}</div>
    </div>
  {:else}
    <div class="px-2 py-1 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] text-center font-bold tracking-wider">
      ✓ SURFACE DESCENT PROFILE NOMINAL • COUNTER-THRUST MARGIN SAFE
    </div>
  {/if}

  <!-- Main Attitude Ladder & Telemetry Dual Display -->
  <div class="grid grid-cols-12 gap-3 items-stretch">
    <!-- Left Column: Attitude Ladder SVG (-90° to 0° glide angle & pitch) -->
    <div class="col-span-7 bg-[#05060a] border border-[#FF7100]/30 rounded p-2 flex flex-col items-center relative overflow-hidden">
      <div class="w-full flex items-center justify-between text-[10px] text-white/60 mb-1 border-b border-white/10 pb-1">
        <span>GLIDE ANGLE LADDER</span>
        <span class="text-cyan-300 font-bold">{localGlideAngle.toFixed(1)}°</span>
      </div>

      <!-- Attitude Ladder SVG -->
      <svg viewBox="0 0 200 160" class="w-full h-40">
        <defs>
          <clipPath id="ladder-view-clip">
            <rect x="0" y="0" width="200" height="160" rx="4" />
          </clipPath>
        </defs>

        <g clip-path="url(#ladder-view-clip)">
          <!-- Ground Gradient for Surface Proximity -->
          <rect
            x="0"
            y="{100 + ladderOffsetPx}"
            width="200"
            height="160"
            fill="rgba(255, 113, 0, 0.15)"
          />

          <!-- Zero Horizon Line -->
          <g transform="translate(0, {80 + ladderOffsetPx})">
            <line x1="20" y1="0" x2="180" y2="0" stroke="#FF7100" stroke-width="2" />
            <text x="185" y="4" fill="#FF7100" font-size="9" font-weight="bold">0°</text>
            <text x="5" y="4" fill="#FF7100" font-size="9" font-weight="bold">0°</text>
          </g>

          <!-- Ladder Rung: -15 deg -->
          <g transform="translate(0, {80 + ladderOffsetPx + 24})">
            <line x1="55" y1="0" x2="145" y2="0" stroke="rgba(255,113,0,0.6)" stroke-width="1.5" stroke-dasharray="6 3" />
            <text x="150" y="3" fill="#fbbf24" font-size="8">-15°</text>
          </g>

          <!-- Ladder Rung: -30 deg -->
          <g transform="translate(0, {80 + ladderOffsetPx + 48})">
            <line x1="65" y1="0" x2="135" y2="0" stroke="rgba(255,113,0,0.7)" stroke-width="1.5" stroke-dasharray="6 3" />
            <text x="140" y="3" fill="#fbbf24" font-size="8">-30°</text>
          </g>

          <!-- Ladder Rung: -45 deg -->
          <g transform="translate(0, {80 + ladderOffsetPx + 72})">
            <line x1="75" y1="0" x2="125" y2="0" stroke="rgba(239,68,68,0.7)" stroke-width="1.5" stroke-dasharray="4 2" />
            <text x="130" y="3" fill="#ef4444" font-size="8">-45°</text>
          </g>

          <!-- Ladder Rung: -60 deg -->
          <g transform="translate(0, {80 + ladderOffsetPx + 96})">
            <line x1="85" y1="0" x2="115" y2="0" stroke="rgba(239,68,68,0.85)" stroke-width="1.5" stroke-dasharray="3 2" />
            <text x="120" y="3" fill="#ef4444" font-size="8">-60°</text>
          </g>

          <!-- Fixed Center Bore Reticle -->
          <circle cx="100" cy="80" r="3.5" fill="#22d3ee" />
          <path d="M 68 80 L 88 80 L 92 86 M 132 80 L 112 80 L 108 86" fill="none" stroke="#22d3ee" stroke-width="2" />
        </g>

        <!-- Compass Heading Readout at Top -->
        <rect x="75" y="4" width="50" height="14" rx="2" fill="rgba(0,0,0,0.8)" stroke="#FF7100" stroke-width="1" />
        <text x="100" y="15" fill="#FF7100" font-size="9" font-weight="bold" text-anchor="middle">
          HDG {headingDeg.toFixed(0).padStart(3, '0')}°
        </text>
      </svg>
    </div>

    <!-- Right Column: Radar Altimeter & Sink Rate Vertical Tape -->
    <div class="col-span-5 bg-[#05060a] border border-[#FF7100]/30 rounded p-2 flex flex-col justify-between">
      <div class="space-y-2 text-[11px]">
        <!-- Gravity Readout -->
        <div class="flex items-center justify-between border-b border-white/10 pb-1">
          <span class="text-white/60">SURFACE G:</span>
          <span class="font-extrabold text-sm {localGravity >= 3.0 ? 'text-red-400' : localGravity >= 1.5 ? 'text-amber-300' : 'text-emerald-300'}">
            {localGravity.toFixed(2)} G
          </span>
        </div>

        <!-- Radar Altitude Readout -->
        <div class="flex items-center justify-between border-b border-white/10 pb-1">
          <span class="text-white/60">RADAR ALT:</span>
          <span class="font-extrabold text-sm text-cyan-300">
            {localAlt >= 1000 ? `${(localAlt / 1000).toFixed(2)} km` : `${localAlt.toFixed(0)} m`}
          </span>
        </div>

        <!-- Vertical Velocity / Sink Rate -->
        <div class="flex items-center justify-between border-b border-white/10 pb-1">
          <span class="text-white/60">SINK RATE:</span>
          <span class="font-extrabold text-sm {safetyEval.sinkRateMs > safetyEval.maxSafeSinkRateMs ? 'text-red-400' : 'text-emerald-300'}">
            {safetyEval.sinkRateMs.toFixed(1)} m/s
          </span>
        </div>

        <!-- Max Safe Threshold -->
        <div class="flex items-center justify-between border-b border-white/10 pb-1">
          <span class="text-white/60">SAFE LIMIT:</span>
          <span class="font-bold text-amber-300">
            ≤ {safetyEval.maxSafeSinkRateMs.toFixed(1)} m/s
          </span>
        </div>

        <!-- Stopping Distance -->
        <div class="flex items-center justify-between border-b border-white/10 pb-1">
          <span class="text-white/60">STOPPING DIST:</span>
          <span class="font-bold {safetyEval.stoppingDistanceM >= localAlt ? 'text-red-400' : 'text-white'}">
            {safetyEval.stoppingDistanceM.toFixed(0)} m
          </span>
        </div>

        <!-- Time to Impact -->
        <div class="flex items-center justify-between">
          <span class="text-white/60">IMPACT EST:</span>
          <span class="font-bold {safetyEval.timeToImpactSeconds < 10 ? 'text-red-400 font-extrabold' : 'text-cyan-300'}">
            {safetyEval.timeToImpactSeconds >= 999 ? '∞' : `${safetyEval.timeToImpactSeconds.toFixed(1)} s`}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Interactive Sliders for Flight Testing & Verification -->
  <div class="p-2.5 rounded bg-black/60 border border-white/10 space-y-2 text-[10px]">
    <div class="flex items-center justify-between text-white/70 font-bold">
      <span class="text-amber-300 uppercase">Interactive Flight Vector Controls</span>
      <span>Test Planetary Approaches</span>
    </div>

    <!-- Surface Gravity Slider -->
    <div class="flex items-center space-x-2">
      <span class="w-20 text-white/60">GRAVITY:</span>
      <input
        type="range"
        min="0.1"
        max="10.0"
        step="0.05"
        bind:value={localGravity}
        class="flex-1 accent-[#FF7100]"
      />
      <span class="w-14 text-right text-cyan-300 font-bold">{localGravity.toFixed(2)} G</span>
    </div>

    <!-- Vertical Descent Rate Slider -->
    <div class="flex items-center space-x-2">
      <span class="w-20 text-white/60">VERT VEL:</span>
      <input
        type="range"
        min="-80"
        max="20"
        step="0.5"
        bind:value={localVerticalSpeed}
        class="flex-1 accent-[#FF7100]"
      />
      <span class="w-14 text-right {localVerticalSpeed < -safetyEval.maxSafeSinkRateMs ? 'text-red-400' : 'text-emerald-300'} font-bold">
        {localVerticalSpeed.toFixed(1)} m/s
      </span>
    </div>

    <!-- Altitude Slider -->
    <div class="flex items-center space-x-2">
      <span class="w-20 text-white/60">ALTITUDE:</span>
      <input
        type="range"
        min="0"
        max="5000"
        step="10"
        bind:value={localAlt}
        class="flex-1 accent-[#FF7100]"
      />
      <span class="w-14 text-right text-amber-300 font-bold">{localAlt.toFixed(0)} m</span>
    </div>

    <!-- Glide Angle Slider -->
    <div class="flex items-center space-x-2">
      <span class="w-20 text-white/60">GLIDE ANGLE:</span>
      <input
        type="range"
        min="-90"
        max="0"
        step="1"
        bind:value={localGlideAngle}
        class="flex-1 accent-[#FF7100]"
      />
      <span class="w-14 text-right text-cyan-300 font-bold">{localGlideAngle.toFixed(0)}°</span>
    </div>
  </div>
</div>
