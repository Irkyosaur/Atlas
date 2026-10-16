<script lang="ts">
  import { onMount } from 'svelte';
  import {
    hmacNonceEngine,
    type HmacNonceState,
    HMAC_WINDOW_SECONDS,
  } from '$engine/hmac_nonce_engine';

  interface Props {
    compact?: boolean;
    onInspect?: () => void;
  }

  let { compact = false, onInspect }: Props = $props();

  let state = $state<HmacNonceState>(hmacNonceEngine.getState());

  onMount(() => {
    const unsub = hmacNonceEngine.subscribe((s) => {
      state = s;
    });
    return unsub;
  });

  // Calculate progress percentage of the 30-second window
  let windowProgressPct = $derived(
    Math.round(((HMAC_WINDOW_SECONDS - state.secondsRemaining) / HMAC_WINDOW_SECONDS) * 100)
  );

  let isNearExpiry = $derived(state.secondsRemaining <= 5);
</script>

<div
  class="font-mono flex items-center {compact ? 'text-[10px] space-x-1.5' : 'text-xs space-x-2'}"
  title="Dynamic 30s HMAC Nonce Challenge HUD [Phase 17, Stage 17.2]"
>
  <button
    type="button"
    onclick={() => onInspect?.()}
    class="flex items-center space-x-2 px-2.5 py-1 rounded bg-black/75 border transition-all cursor-pointer shadow-sm {state.replaysDetected > 0 ? 'border-amber-500/60 text-amber-400' : 'border-cyan-500/50 hover:border-cyan-400 text-cyan-300'}"
  >
    <!-- HMAC Key Icon with Rotating Indicator -->
    <span class="text-xs">🔑</span>
    <span class="font-extrabold tracking-wider uppercase text-[10px]">HMAC 30S</span>

    <!-- Rolling 30s Window Timer & Circular / Bar Gauge -->
    <div class="flex items-center space-x-1">
      <div class="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
        <div
          class="h-full transition-all duration-300 rounded-full {isNearExpiry ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}"
          style="width: {windowProgressPct}%"
        ></div>
      </div>
      <span class="font-bold tabular-nums text-[10px] {isNearExpiry ? 'text-amber-300 font-extrabold' : 'text-cyan-200'}">
        {state.secondsRemaining}s
      </span>
    </div>

    <!-- Active Nonce ID snippet -->
    {#if state.activeNonceId}
      <span class="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[9px] text-zinc-300 tracking-wider">
        {state.activeNonceId.slice(0, 10)}…
      </span>
    {/if}

    <!-- Replays Rejection Telemetry Counter -->
    {#if state.replaysDetected > 0}
      <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] font-bold">
        {state.replaysDetected} REPLAY-BLOCK
      </span>
    {/if}
  </button>
</div>
