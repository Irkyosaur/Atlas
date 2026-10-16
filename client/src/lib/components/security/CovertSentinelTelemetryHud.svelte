<script lang="ts">
  import { onMount } from 'svelte';
  import {
    covertSentinelEngine,
    type CovertSentinelState,
    type ThreatSeverity,
  } from '$engine/covert_sentinel_engine';

  interface Props {
    compact?: boolean;
    onInspect?: () => void;
  }

  let { compact = false, onInspect }: Props = $props();

  let state = $state<CovertSentinelState>(covertSentinelEngine.getState());

  onMount(() => {
    const unsub = covertSentinelEngine.subscribe((s) => {
      state = s;
    });
    return unsub;
  });

  let threatColorClass = $derived(() => {
    switch (state.threatLevel) {
      case 'rogue_clone':
        return 'border-rose-500 bg-rose-950/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse';
      case 'hostile':
        return 'border-rose-500/80 bg-rose-950/40 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.25)]';
      case 'suspicious':
        return 'border-amber-500/70 bg-amber-950/40 text-amber-300';
      case 'nominal':
      default:
        return 'border-emerald-500/50 hover:border-emerald-400 bg-black/60 text-emerald-400';
    }
  });
</script>

<div
  class="font-mono flex items-center {compact ? 'text-[10px] space-x-1' : 'text-xs space-x-2'}"
  title="Covert Anti-Clone Sentinel & Origin Trap HUD [Phase 18, Stage 18.1]"
>
  <button
    type="button"
    onclick={() => onInspect?.()}
    class="flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer shadow-sm {threatColorClass()}"
  >
    <!-- Radar / Sentinel Eye Icon -->
    <span class="text-xs">👁️</span>
    <span class="font-extrabold tracking-wider uppercase text-[10px]">SENTINEL</span>

    {#if state.isRogueDomain}
      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
      <span class="text-[9px] px-1 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-700 font-bold uppercase">
        {state.threatLevel === 'rogue_clone' ? 'ROGUE CLONE' : 'DOMAIN TRAP'}
      </span>
      {#if state.beaconsDispatched > 0}
        <span class="text-[9px] text-rose-300 font-mono tabular-nums">
          BCN: {state.beaconsDispatched}
        </span>
      {/if}
    {:else}
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      <span class="text-[9px] text-zinc-400 hidden sm:inline">
        {state.devOverrideActive ? 'DEV BYPASS' : 'ORIGIN OK'}
      </span>
    {/if}

    {#if state.isFramed}
      <span class="text-[9px] px-1 rounded bg-amber-900/80 text-amber-200 border border-amber-600 font-bold">
        FRAMED
      </span>
    {/if}
  </button>
</div>
