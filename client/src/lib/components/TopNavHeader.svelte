<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import TopSearchBar from '$components/TopSearchBar.svelte';
  import ModeSwitcher, { type NavigationMode } from '$components/ModeSwitcher.svelte';
  import TelemetryBadge from '$components/TelemetryBadge.svelte';
  import type { SessionTelemetry } from '$engine/session_telemetry';
  import type { SystemRecord } from '$engine/ananke_client';

  interface Props {
    activeMode: NavigationMode;
    telemetry: SessionTelemetry;
    onModeChange?: (mode: NavigationMode) => void;
    onSelectSystem?: (system: SystemRecord) => void;
    onOpenShipbuilder?: () => void;
    onOpenColonisation?: () => void;
    onOpenCarrierLedger?: () => void;
    onOpenWingLogistics?: () => void;
    onOpenCapiAuth?: () => void;
    onOpenDossier?: () => void;
    onOpenFleetLedger?: () => void;
  }

  let {
    activeMode = $bindable('galaxy'),
    telemetry = $bindable(),
    onModeChange,
    onSelectSystem,
    onOpenShipbuilder,
    onOpenColonisation,
    onOpenCarrierLedger,
    onOpenWingLogistics,
    onOpenCapiAuth,
    onOpenDossier,
    onOpenFleetLedger,
  }: Props = $props();
</script>

<header
  class="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[var(--hud-bg)]/90 border-b border-[var(--hud-orange)]/35 backdrop-blur-md gap-4 select-none"
>
  <!-- Left: Logo & Top Search Autocomplete -->
  <div class="flex items-center space-x-3 sm:space-x-5">
    <div class="flex items-center space-x-2">
      <Icon name="reticle" size={22} glow={true} color="var(--hud-orange)" />
      <span class="hud-title text-sm sm:text-base font-bold tracking-wider">
        ATLAS <span class="text-xs text-[var(--hud-orange)] tracking-widest">// NAV-CORP</span>
      </span>
    </div>

    <!-- Top Search Bar with keyboard shortcut -->
    <TopSearchBar {onSelectSystem} />
  </div>

  <!-- Center: Mode Switcher Tab Group (G, S, O, P), Shipbuilder, Colonisation & Fleet Carrier Trigger -->
  <div class="hidden md:flex items-center justify-center space-x-3">
    <ModeSwitcher bind:activeMode {onModeChange} />

    <!-- Stage 7.1: In-Browser Shipbuilder & Outfitting Trigger Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenShipbuilder?.()}
      title="Open Shipbuilder & Hardpoint Outfitting Workspace [Phase 07]"
    >
      <span class="text-[11px]">🛠️</span>
      <span class="font-bold">SHIPYARD</span>
    </button>

    <!-- Stage 8.1: System Architect & Colonisation Blueprinting Trigger Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenColonisation?.()}
      title="Open System Architect & Colonisation Hub [Phase 08]"
    >
      <span class="text-[11px]">🏛️</span>
      <span class="font-bold">COLONISATION</span>
    </button>

    <!-- Stage 8.3: Fleet Carrier Tritium Depot & Upkeep Ledger Trigger Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenCarrierLedger?.()}
      title="Open Fleet Carrier Tritium Depot & Upkeep Ledger [Phase 08, Stage 8.3]"
    >
      <span class="text-[11px]">⛽</span>
      <span class="font-bold">CARRIER</span>
    </button>

    <!-- Stage 8.4: Wing Logistics Tracker & Shared Construction Progress Trigger Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenWingLogistics?.()}
      title="Open Wing Logistics Tracker & Shared Construction Progress [Phase 08, Stage 8.4]"
    >
      <span class="text-[11px]">🛰️</span>
      <span class="font-bold">WING LOGISTICS</span>
    </button>

    <!-- Stage 9.1: Frontier CAPI OAuth2 / PKCE & Atlas API Key Vault Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenCapiAuth?.()}
      title="Open Frontier CAPI OAuth2 / PKCE Flow & Atlas API Key Manager [Phase 09, Stage 9.1]"
    >
      <span class="text-[11px]">🔑</span>
      <span class="font-bold">CAPI & KEYS</span>
    </button>

    <!-- Stage 9.3: Multi-Station Fleet Ledger & Ship Transfer Button -->
    <button
      type="button"
      class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
      onclick={() => onOpenFleetLedger?.()}
      title="Open Multi-Station Shipyard Fleet Ledger & Rebuy Estimator [Phase 09, Stage 9.3]"
    >
      <span class="text-[11px]">🚀</span>
      <span class="font-bold">FLEET</span>
    </button>
  </div>

  <!-- Right: Live Session Telemetry Badges -->
  <div class="flex items-center space-x-2">
    <!-- Mobile/Compact Buttons -->
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenShipbuilder?.()}
      title="Open Shipbuilder"
    >
      🛠️
    </button>
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenColonisation?.()}
      title="Open Colonisation Architect"
    >
      🏛️
    </button>
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenCarrierLedger?.()}
      title="Open Carrier Ledger"
    >
      ⛽
    </button>
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenWingLogistics?.()}
      title="Open Wing Logistics Tracker"
    >
      🛰️
    </button>
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenCapiAuth?.()}
      title="Open CAPI & API Key Vault"
    >
      🔑
    </button>
    <button
      type="button"
      class="md:hidden px-2 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-mono text-xs"
      onclick={() => onOpenFleetLedger?.()}
      title="Open Fleet Ledger"
    >
      🚀
    </button>
    <TelemetryBadge {telemetry} {onOpenDossier} />
  </div>
</header>
