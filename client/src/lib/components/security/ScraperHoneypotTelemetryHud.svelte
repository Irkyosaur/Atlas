<script lang="ts">
  import { onMount } from 'svelte';
  import { honeypotEngine, type ScraperTelemetryState } from '$engine/honeypot_engine';

  interface Props {
    compact?: boolean;
    onInspect?: () => void;
  }

  let { compact = false, onInspect }: Props = $props();

  let state = $state<ScraperTelemetryState>(honeypotEngine.getState());

  onMount(() => {
    const unsub = honeypotEngine.subscribe((s) => {
      state = s;
    });
    return unsub;
  });

  let threatLevelColor = $derived(
    state.isScraperDetected
      ? 'border-rose-500/80 bg-rose-950/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
      : state.signals.length > 0
        ? 'border-amber-500/60 bg-amber-950/30 text-amber-300'
        : 'border-emerald-500/50 hover:border-emerald-400 bg-black/60 text-emerald-400'
  );
</script>

<div
  class="font-mono flex items-center {compact ? 'text-[10px] space-x-1' : 'text-xs space-x-2'}"
  title="Headless Browser & Automated Scraper Honeypot Defense HUD [Phase 17, Stage 17.4]"
>
  <button
    type="button"
    onclick={() => onInspect?.()}
    class="flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer shadow-sm {threatLevelColor}"
  >
    <!-- Honeypot Radar Icon -->
    <span class="text-xs">🍯</span>
    <span class="font-extrabold tracking-wider uppercase text-[10px]">HONEYPOT</span>

    {#if state.isScraperDetected}
      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
      <span class="text-[9px] px-1 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-700 font-bold uppercase">
        TARPIT ACTIVE
      </span>
      <span class="text-[9px] text-rose-300 font-mono tabular-nums">
        {state.tarpitDelayMs}ms
      </span>
    {:else}
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      <span class="text-[9px] text-zinc-400 hidden sm:inline">
        SCORE: {state.threatScore}%
      </span>
    {/if}

    {#if state.honeypotTrips > 0}
      <span class="text-[9px] px-1 rounded bg-amber-900/80 text-amber-200 border border-amber-600 font-bold">
        TRIPS: {state.honeypotTrips}
      </span>
    {/if}
  </button>
</div>
