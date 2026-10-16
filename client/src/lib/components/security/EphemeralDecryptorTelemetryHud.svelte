<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ephemeralDecryptor,
    type DecryptorTelemetryState,
  } from '$engine/ephemeral_decryptor';

  interface Props {
    compact?: boolean;
    onInspect?: () => void;
  }

  let { compact = false, onInspect }: Props = $props();

  let state = $state<DecryptorTelemetryState>(ephemeralDecryptor.getState());

  onMount(() => {
    const unsub = ephemeralDecryptor.subscribe((s) => {
      state = s;
    });
    return unsub;
  });
</script>

<div
  class="font-mono flex items-center {compact ? 'text-[10px] space-x-1.5' : 'text-xs space-x-2'}"
  title="Ephemeral WebAssembly Asset Decryptor & Zero-Retention Memory Sentinel [Phase 17, Stage 17.3]"
>
  <button
    type="button"
    onclick={() => onInspect?.()}
    class="flex items-center space-x-2 px-2.5 py-1 rounded bg-black/75 border transition-all cursor-pointer shadow-sm {state.activeKeyHandles > 0 ? 'border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-indigo-500/50 hover:border-indigo-400 text-indigo-300'}"
  >
    <!-- Decryptor Lock/Key Icon -->
    <span class="text-xs">🔐</span>
    <span class="font-extrabold tracking-wider uppercase text-[10px]">WASM DECRYPT</span>

    <!-- Key & Memory Stats -->
    <div class="flex items-center space-x-1.5">
      <span class="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] border border-zinc-700">
        KEYS: <span class="font-bold {state.activeKeyHandles > 0 ? 'text-emerald-400' : 'text-zinc-400'}">{state.activeKeyHandles}</span>
      </span>

      {#if state.activeAllocatedBytes > 0}
        <span class="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
          {(state.activeAllocatedBytes / 1024).toFixed(1)} KB RAM
        </span>
      {:else}
        <span class="hidden sm:inline text-[9px] text-zinc-500">
          ZERO-RETENTION
        </span>
      {/if}
    </div>

    <!-- WASM Accel Dot -->
    {#if state.wasmAccelerated}
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" title="WebAssembly Acceleration Active"></span>
    {/if}
  </button>
</div>
