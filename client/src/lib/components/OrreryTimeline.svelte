<!-- Location: atlas/client/src/lib/components/OrreryTimeline.svelte -->
<!-- Task 3.3.1, 3.3.2, 3.3.3, 3.3.4: Orbital Time-Scrubber Timeline, Ephemeris & Syzygy Alarms -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    dateToJulianDate,
    julianDateToDate,
    formatInGameDate,
    type CelestialAlignment,
  } from '$engine/ephemeris';

  interface Props {
    simTimeSec?: number;
    lockedBody?: string | null;
    alignments?: CelestialAlignment[];
    onTimeChange?: (seconds: number) => void;
    onLockBody?: (bodyName: string | null) => void;
  }

  let {
    simTimeSec = $bindable(0),
    lockedBody = $bindable(null),
    alignments = [],
    onTimeChange,
    onLockBody,
  }: Props = $props();

  // Playback speeds from 1x real-time up to 1,000,000x
  const SPEED_PRESETS = [
    { label: '1x (RT)', value: 1 },
    { label: '100x', value: 100 },
    { label: '1,000x', value: 1000 },
    { label: '10,000x', value: 10000 },
    { label: '100,000x', value: 100000 },
    { label: '1,000,000x', value: 1000000 },
  ];

  const BODIES = [
    { name: 'Sol', color: '#fff3a8' },
    { name: 'Mercury', color: '#ced4da' },
    { name: 'Venus', color: '#ffc067' },
    { name: 'Earth', color: '#4dabf7' },
    { name: 'Mars', color: '#ff6e41' },
    { name: 'Jupiter', color: '#ffb26b' },
    { name: 'Saturn', color: '#ffe082' },
    { name: 'Uranus', color: '#80deea' },
    { name: 'Neptune', color: '#4ba3e3' },
    { name: 'Pluto', color: '#b0bec5' },
  ];

  let isPlaying = $state<boolean>(true);
  let playbackSpeed = $state<number>(10000); // Default 10,000x (smooth planet movement)
  let baseEpochJd = dateToJulianDate(new Date());

  // Current Julian Date calculated from base epoch + simTimeSec
  let currentJd = $derived(baseEpochJd + simTimeSec / 86400.0);
  let formattedDate = $derived(formatInGameDate(currentJd));

  let animFrameId: number | null = null;
  let lastTimestamp = performance.now();

  function tick(timestamp: number) {
    const deltaMs = Math.min(100, timestamp - lastTimestamp);
    lastTimestamp = timestamp;

    if (isPlaying) {
      const deltaSec = (deltaMs / 1000.0) * playbackSpeed;
      simTimeSec += deltaSec;
      if (onTimeChange) {
        onTimeChange(simTimeSec);
      }
    }
    animFrameId = requestAnimationFrame(tick);
  }

  onMount(() => {
    lastTimestamp = performance.now();
    animFrameId = requestAnimationFrame(tick);
  });

  onDestroy(() => {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
  });

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  function stepTime(days: number) {
    simTimeSec += days * 86400;
    if (onTimeChange) {
      onTimeChange(simTimeSec);
    }
  }

  function resetEpoch() {
    simTimeSec = 0;
    if (onTimeChange) {
      onTimeChange(0);
    }
  }

  function handleSliderInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const days = parseFloat(target.value);
    simTimeSec = days * 86400;
    if (onTimeChange) {
      onTimeChange(simTimeSec);
    }
  }

  function setSpeed(speed: number) {
    playbackSpeed = speed;
  }

  function handleSelectBody(name: string) {
    if (lockedBody === name) {
      lockedBody = null;
      if (onLockBody) onLockBody(null);
    } else {
      lockedBody = name;
      if (onLockBody) onLockBody(name);
    }
  }
</script>

<div class="pointer-events-auto flex flex-col gap-1.5 w-full max-w-5xl mx-auto px-4 py-2.5 rounded-lg bg-black/80 border border-[var(--hud-orange)]/40 backdrop-blur-md shadow-2xl text-white font-mono select-none">
  <!-- Top Bar: Ephemeris Clock, Julian Date, Alignment Alarms, Target Lock Selector -->
  <div class="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
    <!-- Julian Date & In-Game 3310+ Timestamp -->
    <div class="flex items-center space-x-3">
      <div class="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] font-bold">
        <span class="w-2 h-2 rounded-full {isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
        <span>EPHEMERIS: {formattedDate.gameDateString}</span>
      </div>
      <span class="text-white/80">{formattedDate.timeString}</span>
      <span class="text-white/40 text-[10px] tracking-widest">{formattedDate.jdString}</span>
    </div>

    <!-- Active Alignment / Syzygy Indicator -->
    <div class="flex items-center space-x-2">
      {#if alignments.length > 0}
        {@const top = alignments[0]}
        <div class="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] animate-pulse">
          <span class="text-xs">⚡</span>
          <span class="font-bold uppercase tracking-wider">{top.type}:</span>
          <span>{top.bodyA} ↔ {top.bodyB} ({top.angularSeparationDeg.toFixed(1)}°)</span>
        </div>
      {:else}
        <span class="text-white/30 text-[11px]">No immediate syzygy alignment</span>
      {/if}
    </div>

    <!-- Target Body Lock Selector (Mercury..Pluto) -->
    <div class="flex items-center space-x-1">
      <span class="text-[10px] text-white/50 uppercase tracking-wider mr-1">Camera Lock:</span>
      {#each BODIES as b}
        <button
          type="button"
          onclick={() => handleSelectBody(b.name)}
          class="px-1.5 py-0.5 rounded text-[10px] transition-all font-mono uppercase {lockedBody === b.name
            ? 'bg-[var(--hud-orange)] text-black font-bold border border-[var(--hud-orange)] shadow-[0_0_8px_rgba(255,113,0,0.6)]'
            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'}"
          title="Lock camera target to {b.name}"
        >
          {b.name.slice(0, 3)}
        </button>
      {/each}
      {#if lockedBody}
        <button
          type="button"
          onclick={() => handleSelectBody(lockedBody!)}
          class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300"
          title="Clear camera body lock"
        >
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- Middle Bar: Timeline Scrub Slider with +/- 1 Year Range -->
  <div class="flex items-center space-x-3 pt-1">
    <button
      type="button"
      onclick={resetEpoch}
      class="px-2 py-1 text-[10px] tracking-wider uppercase rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 active:scale-95"
      title="Reset timeline to present epoch"
    >
      NOW
    </button>

    <div class="relative flex-1 flex items-center">
      <input
        type="range"
        min="-365"
        max="365"
        step="0.05"
        value={simTimeSec / 86400.0}
        oninput={handleSliderInput}
        class="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[var(--hud-orange)] border border-white/10"
      />
    </div>

    <div class="text-[11px] font-mono text-[var(--hud-amber)] w-24 text-right">
      {(simTimeSec / 86400.0) >= 0 ? '+' : ''}{(simTimeSec / 86400.0).toFixed(1)} DAYS
    </div>
  </div>

  <!-- Bottom Bar: Play/Pause, Step Controls, Speed Multipliers -->
  <div class="flex items-center justify-between text-xs pt-1">
    <!-- Play / Step Controls -->
    <div class="flex items-center space-x-1.5">
      <button
        type="button"
        onclick={() => stepTime(-1)}
        class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 active:scale-95 text-[11px]"
        title="Step -1 Day"
      >
        ⏮ -1D
      </button>

      <button
        type="button"
        onclick={togglePlay}
        class="flex items-center space-x-1.5 px-3 py-1 rounded font-bold uppercase tracking-wider text-[11px] transition-all {isPlaying
          ? 'bg-[var(--hud-orange)] text-black border border-[var(--hud-orange)] shadow-[0_0_10px_rgba(255,113,0,0.5)]'
          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'}"
      >
        <span>{isPlaying ? '⏸ PAUSE' : '▶ PLAY'}</span>
      </button>

      <button
        type="button"
        onclick={() => stepTime(1)}
        class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 active:scale-95 text-[11px]"
        title="Step +1 Day"
      >
        +1D ⏭
      </button>

      <button
        type="button"
        onclick={() => stepTime(30)}
        class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 active:scale-95 text-[11px]"
        title="Step +30 Days"
      >
        +30D ⏩
      </button>
    </div>

    <!-- Speed Multiplier Buttons -->
    <div class="flex items-center space-x-1">
      <span class="text-[10px] text-white/40 uppercase tracking-wider mr-1">Time Warp:</span>
      {#each SPEED_PRESETS as preset}
        <button
          type="button"
          onclick={() => setSpeed(preset.value)}
          class="px-2 py-0.5 rounded text-[10px] font-mono transition-all {playbackSpeed === preset.value
            ? 'bg-[var(--hud-amber)] text-black font-bold border border-[var(--hud-amber)] shadow-[0_0_6px_rgba(255,170,0,0.6)]'
            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'}"
        >
          {preset.label}
        </button>
      {/each}
    </div>
  </div>
</div>
