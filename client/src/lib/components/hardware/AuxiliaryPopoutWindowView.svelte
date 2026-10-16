<script lang="ts">
  // Location: client/src/lib/components/hardware/AuxiliaryPopoutWindowView.svelte
  // Stage 15.3: Dedicated Standalone Borderless Popout View for Auxiliary Monitors
  // Automatically requests Screen Wake Lock API on mount, listens to BroadcastChannel telemetry events,
  // and renders the selected MFD (Combat, Mining, or Explorer).

  import { onMount, onDestroy } from 'svelte';
  import {
    auxiliaryDisplayEngine,
    type MfdDashboardMode,
    type AuxiliaryTelemetrySnapshot,
  } from '$engine/auxiliary_display_engine';
  import CombatMfdPanel from '$components/hardware/CombatMfdPanel.svelte';
  import MiningMfdPanel from '$components/hardware/MiningMfdPanel.svelte';
  import ExplorerMfdPanel from '$components/hardware/ExplorerMfdPanel.svelte';

  interface Props {
    initialMode?: MfdDashboardMode;
  }

  let { initialMode = 'EXPLORER' }: Props = $props();

  let mode = $state<MfdDashboardMode>(initialMode);
  let telemetry = $state<AuxiliaryTelemetrySnapshot>(auxiliaryDisplayEngine.getTelemetry());
  let wakeLockActive = $state<boolean>(false);
  let wakeLockSupported = $state<boolean>(auxiliaryDisplayEngine.checkWakeLockSupport());
  let isFullscreen = $state<boolean>(false);
  let unsubTelemetry: (() => void) | null = null;
  let unsubWakeLock: (() => void) | null = null;

  onMount(async () => {
    // Determine mode from URL if provided (e.g. ?popout=mfd&mode=combat)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode')?.toUpperCase();
      if (urlMode === 'COMBAT' || urlMode === 'MINING' || urlMode === 'EXPLORER') {
        mode = urlMode as MfdDashboardMode;
      }

      // Automatically request screen wake lock to prevent auxiliary monitor sleep
      try {
        await auxiliaryDisplayEngine.requestWakeLock();
      } catch {
        // Fallback
      }
    }

    unsubWakeLock = auxiliaryDisplayEngine.onWakeLockChange((active) => {
      wakeLockActive = active;
    });

    unsubTelemetry = auxiliaryDisplayEngine.onTelemetryUpdate((tel) => {
      telemetry = tel;
    });
  });

  onDestroy(() => {
    if (unsubTelemetry) unsubTelemetry();
    if (unsubWakeLock) unsubWakeLock();
  });

  async function toggleWakeLock() {
    await auxiliaryDisplayEngine.toggleWakeLock();
  }

  function toggleFullscreen() {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          isFullscreen = true;
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          isFullscreen = false;
        }).catch(() => {});
      }
    }
  }
</script>

<div class="h-screen w-screen flex flex-col bg-[#020408] text-hud-bright select-none overflow-hidden font-mono">
  <!-- Minimalist Auxiliary Title Bar -->
  <header class="flex items-center justify-between px-4 py-2 bg-[#080d16] border-b border-orange-500/40 text-xs">
    <div class="flex items-center space-x-3">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="font-bold tracking-wider text-[var(--hud-orange)]">
        ATLAS MFD // {mode} // AUXILIARY DISPLAY
      </span>
      <span class="text-white/40">&bull;</span>
      <span class="text-white/60">SYS: <strong class="text-amber-300">{telemetry.currentSystem}</strong></span>
    </div>

    <!-- Mode Selector in popout header -->
    <div class="flex items-center space-x-2">
      <button
        type="button"
        class="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider {mode === 'EXPLORER' ? 'bg-cyan-500 text-black' : 'text-cyan-400 bg-black/40 hover:bg-cyan-500/20 border border-cyan-500/30'}"
        onclick={() => (mode = 'EXPLORER')}
      >
        EXPLORER
      </button>

      <button
        type="button"
        class="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider {mode === 'COMBAT' ? 'bg-red-500 text-black' : 'text-red-400 bg-black/40 hover:bg-red-500/20 border border-red-500/30'}"
        onclick={() => (mode = 'COMBAT')}
      >
        COMBAT
      </button>

      <button
        type="button"
        class="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider {mode === 'MINING' ? 'bg-amber-500 text-black' : 'text-amber-400 bg-black/40 hover:bg-amber-500/20 border border-amber-500/30'}"
        onclick={() => (mode = 'MINING')}
      >
        MINING
      </button>

      <!-- Wake Lock Toggle -->
      <button
        type="button"
        onclick={toggleWakeLock}
        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center space-x-1.5 transition-all {wakeLockActive
          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60'
          : 'bg-zinc-900 text-zinc-400 border-zinc-700'}"
        title="Toggle Screen Wake Lock API to prevent auxiliary display standby"
      >
        <span class="w-1.5 h-1.5 rounded-full {wakeLockActive ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
        <span>WAKE-LOCK: {wakeLockActive ? 'ON' : 'OFF'}</span>
      </button>

      <!-- Fullscreen Toggle -->
      <button
        type="button"
        onclick={toggleFullscreen}
        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white/80 border border-zinc-700"
        title="Toggle Fullscreen"
      >
        ⛶ FULLSCREEN
      </button>
    </div>
  </header>

  <!-- MFD Body Content -->
  <main class="flex-1 overflow-auto p-2">
    {#if mode === 'EXPLORER'}
      <ExplorerMfdPanel
        explorer={telemetry.explorer}
        speedMs={telemetry.speedMs}
        altitudeM={telemetry.altitudeM}
        gravityG={telemetry.gravityG}
      />
    {:else if mode === 'COMBAT'}
      <CombatMfdPanel
        combat={telemetry.combat}
        speedMs={telemetry.speedMs}
        altitudeM={telemetry.altitudeM}
      />
    {:else if mode === 'MINING'}
      <MiningMfdPanel
        mining={telemetry.mining}
        speedMs={telemetry.speedMs}
        altitudeM={telemetry.altitudeM}
      />
    {/if}
  </main>
</div>
