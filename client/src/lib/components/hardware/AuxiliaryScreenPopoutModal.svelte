<script lang="ts">
  // Location: client/src/lib/components/hardware/AuxiliaryScreenPopoutModal.svelte
  // Stage 15.3: Sim-Rig Secondary Screen Dashboards & PWA Wake-Lock Coordinator
  // Provides UI for configuring and launching Combat, Mining, and Explorer MFD dashboards into separate borderless auxiliary windows,
  // managing Screen Wake Lock API requests, and testing BroadcastChannel live telemetry sync.

  import { onMount, onDestroy } from 'svelte';
  import {
    auxiliaryDisplayEngine,
    type MfdDashboardMode,
    type WindowLayoutConfig,
    type AuxiliaryTelemetrySnapshot,
  } from '$engine/auxiliary_display_engine';
  import CombatMfdPanel from '$components/hardware/CombatMfdPanel.svelte';
  import MiningMfdPanel from '$components/hardware/MiningMfdPanel.svelte';
  import ExplorerMfdPanel from '$components/hardware/ExplorerMfdPanel.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let activeTab = $state<MfdDashboardMode>('EXPLORER');
  let wakeLockActive = $state<boolean>(auxiliaryDisplayEngine.getWakeLockState());
  let wakeLockSupported = $state<boolean>(auxiliaryDisplayEngine.checkWakeLockSupport());
  let currentTelemetry = $state<AuxiliaryTelemetrySnapshot>(auxiliaryDisplayEngine.getTelemetry());
  let savedLayouts = $state<Record<string, WindowLayoutConfig>>(auxiliaryDisplayEngine.getAllLayoutConfigs());
  let syncStatus = $state<string>('BroadcastChannel Active');

  let unsubWakeLock: (() => void) | null = null;
  let unsubTelemetry: (() => void) | null = null;

  onMount(() => {
    wakeLockSupported = auxiliaryDisplayEngine.checkWakeLockSupport();
    unsubWakeLock = auxiliaryDisplayEngine.onWakeLockChange((active) => {
      wakeLockActive = active;
    });

    unsubTelemetry = auxiliaryDisplayEngine.onTelemetryUpdate((tel) => {
      currentTelemetry = tel;
    });

    savedLayouts = auxiliaryDisplayEngine.getAllLayoutConfigs();
  });

  onDestroy(() => {
    if (unsubWakeLock) unsubWakeLock();
    if (unsubTelemetry) unsubTelemetry();
  });

  async function handleToggleWakeLock() {
    await auxiliaryDisplayEngine.toggleWakeLock();
  }

  function handleLaunchPopout(mode: MfdDashboardMode) {
    auxiliaryDisplayEngine.openPopoutWindow(mode);
    savedLayouts = auxiliaryDisplayEngine.getAllLayoutConfigs();
  }

  function handleSimulateTelemetryCycle() {
    // Inject dynamic mock changes to test BroadcastChannel sync across popouts
    const updated: AuxiliaryTelemetrySnapshot = {
      ...currentTelemetry,
      timestamp: Date.now(),
      speedMs: Math.round(200 + Math.random() * 250),
      combat: {
        ...currentTelemetry.combat,
        shieldPercent: Math.max(10, Math.min(100, currentTelemetry.combat.shieldPercent + (Math.random() * 20 - 10))),
        targetHullPercent: Math.max(5, Math.min(100, currentTelemetry.combat.targetHullPercent - Math.random() * 5)),
      },
      mining: {
        ...currentTelemetry.mining,
        cargoTons: Math.min(currentTelemetry.mining.cargoCapacity, currentTelemetry.mining.cargoTons + 1),
        cargoPercent: Math.min(100, ((currentTelemetry.mining.cargoTons + 1) / currentTelemetry.mining.cargoCapacity) * 100),
      },
      explorer: {
        ...currentTelemetry.explorer,
        fssProgressPercent: Math.min(100, currentTelemetry.explorer.fssProgressPercent + 5),
        bodiesDiscovered: Math.min(currentTelemetry.explorer.bodyCountTotal, currentTelemetry.explorer.bodiesDiscovered + 1),
      },
    };

    auxiliaryDisplayEngine.broadcastTelemetry(updated);
    syncStatus = `Synced at ${new Date().toLocaleTimeString()}`;
  }

  function handleResetLayouts() {
    auxiliaryDisplayEngine.resetLayoutDefaults();
    savedLayouts = {};
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
    <!-- Main Modal Container -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#070b12] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,113,0,0.35)] overflow-hidden text-hud-bright font-mono"
    >
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0d1624] to-[#070b12] border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <span class="text-xl">🖥️</span>
          <div>
            <h1 class="text-base font-bold uppercase tracking-wider text-[var(--hud-orange)]">
              Sim-Rig Secondary Screen Dashboards & PWA Wake-Lock [Stage 15.3]
            </h1>
            <div class="text-xs text-white/50 tracking-wider">
              MULTI-MONITOR BORDERLESS POPOUTS &bull; BROADCASTCHANNEL REAL-TIME SYNC
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Screen Wake Lock Toggle Button -->
          <button
            type="button"
            onclick={handleToggleWakeLock}
            class="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border flex items-center space-x-2 transition-all shadow-sm {wakeLockActive
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'}"
            title={wakeLockSupported ? 'Prevent display standby / screensaver during flight' : 'Wake Lock API unsupported on this browser'}
          >
            <span class="w-2 h-2 rounded-full {wakeLockActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
            <span>SCREEN WAKE LOCK: {wakeLockActive ? 'ACTIVE (PREVENTING SLEEP)' : 'OFF'}</span>
          </button>

          <!-- Close Button -->
          <button
            type="button"
            class="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onclick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Controls & Dashboard Mode Tabs -->
      <div class="flex items-center justify-between px-6 py-2.5 bg-black/50 border-b border-orange-500/20">
        <!-- MFD Mode Selector -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all {activeTab === 'EXPLORER'
              ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_10px_rgba(6,182,212,0.6)]'
              : 'text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/40'}"
            onclick={() => (activeTab = 'EXPLORER')}
          >
            🔭 EXPLORER MFD
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all {activeTab === 'COMBAT'
              ? 'bg-red-500 text-black font-extrabold shadow-[0_0_10px_rgba(239,68,68,0.6)]'
              : 'text-red-400 hover:bg-red-500/20 border border-red-500/40'}"
            onclick={() => (activeTab = 'COMBAT')}
          >
            ⚔️ COMBAT MFD
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all {activeTab === 'MINING'
              ? 'bg-amber-500 text-black font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.6)]'
              : 'text-amber-400 hover:bg-amber-500/20 border border-amber-500/40'}"
            onclick={() => (activeTab = 'MINING')}
          >
            ⛏️ MINING MFD
          </button>
        </div>

        <!-- Launch Popout & Test Sync Actions -->
        <div class="flex items-center space-x-3">
          <button
            type="button"
            class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/35 text-[var(--hud-amber)] border border-[var(--hud-orange)] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(255,113,0,0.2)]"
            onclick={() => handleLaunchPopout(activeTab)}
          >
            <span>↗</span>
            <span>POPOUT TO AUX SCREEN ({activeTab})</span>
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white/70 border border-zinc-700 text-xs font-bold uppercase tracking-wider transition-all"
            onclick={handleSimulateTelemetryCycle}
            title="Inject simulated telemetry to test BroadcastChannel synchronization"
          >
            📡 TEST SYNC
          </button>
        </div>
      </div>

      <!-- Preview Panel Frame -->
      <div class="flex-1 overflow-y-auto p-4 min-h-[460px] bg-black/40">
        {#if activeTab === 'EXPLORER'}
          <ExplorerMfdPanel
            explorer={currentTelemetry.explorer}
            speedMs={currentTelemetry.speedMs}
            altitudeM={currentTelemetry.altitudeM}
            gravityG={currentTelemetry.gravityG}
          />
        {:else if activeTab === 'COMBAT'}
          <CombatMfdPanel
            combat={currentTelemetry.combat}
            speedMs={currentTelemetry.speedMs}
            altitudeM={currentTelemetry.altitudeM}
          />
        {:else if activeTab === 'MINING'}
          <MiningMfdPanel
            mining={currentTelemetry.mining}
            speedMs={currentTelemetry.speedMs}
            altitudeM={currentTelemetry.altitudeM}
          />
        {/if}
      </div>

      <!-- Footer: Multi-Monitor Layout Info & Status -->
      <div class="px-6 py-3 bg-[#0d1624] border-t border-[var(--hud-orange)]/30 flex items-center justify-between text-xs text-white/60">
        <div class="flex items-center space-x-3">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-white/80">{syncStatus}</span>
          <span>&bull;</span>
          <span>Channel: <span class="text-orange-400">atlas_auxiliary_mfd_telemetry</span></span>
          {#if Object.keys(savedLayouts).length > 0}
            <span>&bull;</span>
            <span class="text-amber-300">
              Saved Popout Layouts: {Object.keys(savedLayouts).join(', ').toUpperCase()}
            </span>
          {/if}
        </div>

        <div class="flex items-center space-x-3">
          {#if Object.keys(savedLayouts).length > 0}
            <button
              type="button"
              class="text-xs text-red-400/80 hover:text-red-300 underline"
              onclick={handleResetLayouts}
            >
              Reset Window Geometry
            </button>
          {/if}
          <button
            type="button"
            class="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold tracking-wider uppercase transition-colors"
            onclick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
