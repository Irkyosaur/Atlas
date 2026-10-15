<script lang="ts">
  // Location: atlas/client/src/lib/components/fleet/FleetLedgerModal.svelte
  // Multi-Station Shipyard Fleet Ledger Modal (Phase 09, Stage 9.3)
  // Multi-station inventory, 5% rebuy insurance breakdown, ship transfer cost & ETA estimator, outfitting inspection trigger.

  import { onMount, onDestroy } from 'svelte';
  import {
    fleetLedgerEngine,
    FleetLedgerEngine,
    type PlayerFleetShip,
    type FleetSummaryMetrics,
    type HullClass,
    type ShipStatus,
  } from '$engine/fleet_ledger_engine';
  import { cmdrProfileEngine } from '$engine/cmdr_profile_engine';
  import OutfittingInspectorModal from './OutfittingInspectorModal.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onOpenShipbuilder?: (shipType?: string) => void;
  }

  let { isOpen = $bindable(false), onClose, onOpenShipbuilder }: Props = $props();

  let ships = $state<PlayerFleetShip[]>(fleetLedgerEngine.getShips());
  let metrics = $state<FleetSummaryMetrics>(fleetLedgerEngine.getSummaryMetrics());
  let selectedShipForOutfitting = $state<PlayerFleetShip | null>(null);
  let isOutfittingModalOpen = $state<boolean>(false);

  // Filters & Search
  let searchQuery = $state<string>('');
  let selectedSystemFilter = $state<string>('ALL');
  let selectedHullFilter = $state<'ALL' | HullClass>('ALL');
  let selectedStatusFilter = $state<'ALL' | ShipStatus>('ALL');
  let sortBy = $state<'value' | 'name' | 'type' | 'rebuy' | 'distance'>('value');

  // Transfer confirmation modal/card state
  let transferTargetShip = $state<PlayerFleetShip | null>(null);
  let transferFeedbackMessage = $state<string | null>(null);
  let transferFeedbackType = $state<'success' | 'error' | 'info'>('info');

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = fleetLedgerEngine.subscribe(() => {
      ships = [...fleetLedgerEngine.getShips()];
      metrics = fleetLedgerEngine.getSummaryMetrics();
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Unique systems for the filter dropdown
  let availableSystems = $derived.by(() => {
    const sys = new Set<string>();
    for (const s of ships) {
      sys.add(s.currentSystem);
    }
    return Array.from(sys).sort();
  });

  // Filtered & sorted ships list
  let filteredShips = $derived.by(() => {
    const profile = cmdrProfileEngine.getProfile();
    const currentSystem = profile.currentSystem || 'Sol';

    return ships
      .filter((s) => {
        // Search text
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = s.shipName.toLowerCase().includes(q);
          const matchesType = s.shipType.toLowerCase().includes(q);
          const matchesIdent = s.shipIdent.toLowerCase().includes(q);
          const matchesLocation = s.currentSystem.toLowerCase().includes(q) || s.currentStarport.toLowerCase().includes(q);
          if (!matchesName && !matchesType && !matchesIdent && !matchesLocation) {
            return false;
          }
        }

        // System
        if (selectedSystemFilter !== 'ALL' && s.currentSystem !== selectedSystemFilter) {
          return false;
        }

        // Hull
        if (selectedHullFilter !== 'ALL' && s.hullClass !== selectedHullFilter) {
          return false;
        }

        // Status
        if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'value') {
          return b.totalValue - a.totalValue;
        }
        if (sortBy === 'rebuy') {
          return b.rebuyCost - a.rebuyCost;
        }
        if (sortBy === 'name') {
          return a.shipName.localeCompare(b.shipName);
        }
        if (sortBy === 'type') {
          return a.shipType.localeCompare(b.shipType);
        }
        if (sortBy === 'distance') {
          const distA = fleetLedgerEngine.getDistanceToSystem(a, currentSystem);
          const distB = fleetLedgerEngine.getDistanceToSystem(b, currentSystem);
          return distA - distB;
        }
        return 0;
      });
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      if (isOutfittingModalOpen) {
        isOutfittingModalOpen = false;
      } else if (transferTargetShip) {
        transferTargetShip = null;
      } else {
        onClose();
      }
    }
  }

  function inspectShipOutfitting(ship: PlayerFleetShip) {
    selectedShipForOutfitting = ship;
    isOutfittingModalOpen = true;
  }

  function promptShipTransfer(ship: PlayerFleetShip) {
    transferTargetShip = ship;
    transferFeedbackMessage = null;
  }

  function confirmShipTransfer() {
    if (!transferTargetShip) return;

    const profile = cmdrProfileEngine.getProfile();
    const destSystem = profile.currentSystem || 'Sol';
    const destStarport = profile.currentStarport || 'Abraham Lincoln';

    const res = fleetLedgerEngine.initiateTransfer(transferTargetShip.id, destSystem, destStarport);
    if (res.success) {
      transferFeedbackType = 'success';
      transferFeedbackMessage = res.message;
      setTimeout(() => {
        transferTargetShip = null;
        transferFeedbackMessage = null;
      }, 3000);
    } else {
      transferFeedbackType = 'error';
      transferFeedbackMessage = res.message;
    }
  }

  function handleSwitchActiveShip(ship: PlayerFleetShip) {
    const res = fleetLedgerEngine.makeShipActive(ship.id);
    if (res.success) {
      transferFeedbackType = 'success';
      transferFeedbackMessage = res.message;
      setTimeout(() => {
        transferFeedbackMessage = null;
      }, 3000);
    } else {
      transferFeedbackType = 'error';
      transferFeedbackMessage = res.message;
    }
  }

  function handleExpedite(shipId: string) {
    fleetLedgerEngine.expediteTransfer(shipId);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal Window -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0b0c10] border border-[var(--hud-orange)]/60 rounded-xl shadow-[0_0_35px_rgba(255,119,0,0.25)] overflow-hidden font-mono text-[var(--hud-amber)]"
      role="dialog"
      aria-modal="true"
    >
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/35">
        <div class="flex items-center space-x-3">
          <span class="text-xl">🚀</span>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-bold uppercase tracking-wider text-white">
                SHIPYARD FLEET LEDGER & LOGISTICS
              </span>
              <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 text-[10px] font-bold text-[var(--hud-orange)]">
                MULTI-STATION INVENTORY
              </span>
            </div>
            <div class="text-xs text-white/50">
              Stationary assets, 5% insurance rebuy valuation, live shipyard transfers & outfitting inspection.
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            type="button"
            onclick={() => fleetLedgerEngine.resetToDefaultFleet()}
            class="px-2.5 py-1 rounded border border-white/20 hover:border-white/40 bg-black/40 text-[11px] text-white/70 hover:text-white transition-colors"
            title="Reset fleet roster to default demo ships"
          >
            Reset Catalog
          </button>
          <button
            type="button"
            onclick={onClose}
            class="w-7 h-7 rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] bg-black/40 hover:bg-[var(--hud-orange)]/20 text-white flex items-center justify-center text-xs transition-colors"
            title="Close Fleet Ledger"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Fleet Overview Hero Banner -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gradient-to-r from-black/90 via-black/75 to-black/90 border-b border-[var(--hud-orange)]/25 text-xs">
        <div class="bg-black/40 p-2.5 rounded border border-[var(--hud-orange)]/20">
          <div class="text-[10px] text-white/50 uppercase">TOTAL FLEET HULLS</div>
          <div class="text-lg font-bold text-white">{metrics.totalShips} Ships</div>
          <div class="text-[10px] text-[var(--hud-amber)]/70">{metrics.stationLocationsCount} Starports</div>
        </div>

        <div class="bg-black/40 p-2.5 rounded border border-[var(--hud-orange)]/20">
          <div class="text-[10px] text-white/50 uppercase">TOTAL FLEET VALUATION</div>
          <div class="text-lg font-bold text-emerald-400">
            {FleetLedgerEngine.formatCompactCredits(metrics.totalFleetValue)}
          </div>
          <div class="text-[10px] text-white/40">Hull & Modules combined</div>
        </div>

        <div class="bg-black/40 p-2.5 rounded border border-[var(--hud-orange)]/20">
          <div class="text-[10px] text-white/50 uppercase">TOTAL REBUY EXPOSURE</div>
          <div class="text-lg font-bold text-amber-400">
            {FleetLedgerEngine.formatCompactCredits(metrics.totalRebuyExposure)}
          </div>
          <div class="text-[10px] text-white/40">5% Pilot Federation Rebuy</div>
        </div>

        <div class="bg-black/40 p-2.5 rounded border border-[var(--hud-orange)]/20">
          <div class="text-[10px] text-white/50 uppercase">TOTAL CARGO CAPACITY</div>
          <div class="text-lg font-bold text-cyan-400">{metrics.totalCargoCapacity} T</div>
          <div class="text-[10px] text-white/40">Across all cargo bays</div>
        </div>

        <div class="bg-black/40 p-2.5 rounded border border-[var(--hud-orange)]/20 col-span-2 md:col-span-1">
          <div class="text-[10px] text-white/50 uppercase">ACTIVE COMMAND VESSEL</div>
          <div class="text-xs font-bold text-white truncate">
            {metrics.activeShip?.shipName || 'No Ship Active'}
          </div>
          <div class="text-[10px] text-emerald-400 truncate">
            {metrics.activeShip?.shipType || 'Docked'} &bull; [{metrics.activeShip?.shipIdent || 'N/A'}]
          </div>
        </div>
      </div>

      <!-- Feedback / Alert Banner -->
      {#if transferFeedbackMessage}
        <div
          class="px-5 py-2 text-xs flex items-center justify-between {transferFeedbackType === 'success'
            ? 'bg-emerald-950/60 border-b border-emerald-500/40 text-emerald-300'
            : transferFeedbackType === 'error'
            ? 'bg-red-950/60 border-b border-red-500/40 text-red-300'
            : 'bg-[var(--hud-orange)]/15 border-b border-[var(--hud-orange)]/30 text-[var(--hud-amber)]'}"
        >
          <div class="flex items-center space-x-2">
            <span>●</span>
            <span>{transferFeedbackMessage}</span>
          </div>
          <button
            type="button"
            onclick={() => (transferFeedbackMessage = null)}
            class="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      {/if}

      <!-- Transfer Confirmation Modal Sub-Drawer (if transfer triggered) -->
      {#if transferTargetShip}
        {@const profile = cmdrProfileEngine.getProfile()}
        {@const destSystem = profile.currentSystem || 'Sol'}
        {@const destStarport = profile.currentStarport || 'Abraham Lincoln'}
        {@const estimate = fleetLedgerEngine.estimateTransfer(transferTargetShip, destSystem)}

        <div class="p-4 bg-gradient-to-b from-blue-950/40 to-black/80 border-b border-blue-500/40 text-xs space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 text-blue-400 font-bold uppercase tracking-wider">
              <span>🚚</span>
              <span>CONFIRM SHIP TRANSFER DISPATCH</span>
            </div>
            <button
              type="button"
              onclick={() => (transferTargetShip = null)}
              class="text-white/60 hover:text-white text-xs"
            >
              Cancel ✕
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black/60 p-3 rounded border border-blue-500/25">
            <div>
              <div class="text-[10px] text-white/50 uppercase">VESSEL</div>
              <div class="text-sm font-bold text-white">{transferTargetShip.shipName}</div>
              <div class="text-[11px] text-[var(--hud-amber)]">{transferTargetShip.shipType} [{transferTargetShip.shipIdent}]</div>
            </div>
            <div>
              <div class="text-[10px] text-white/50 uppercase">ROUTING</div>
              <div class="text-xs text-white/80">From: <strong class="text-white">{transferTargetShip.currentStarport}</strong> ({transferTargetShip.currentSystem})</div>
              <div class="text-xs text-emerald-400">To: <strong class="text-white">{destStarport}</strong> ({destSystem})</div>
            </div>
            <div>
              <div class="text-[10px] text-white/50 uppercase">TRANSFER DISTANCE & ETA</div>
              <div class="text-sm font-bold text-cyan-400">{estimate.distanceLy} LY</div>
              <div class="text-[11px] text-white/70">ETA: ~{FleetLedgerEngine.formatDuration(estimate.durationSeconds)}</div>
            </div>
            <div>
              <div class="text-[10px] text-white/50 uppercase">TRANSFER FEE</div>
              <div class="text-sm font-bold text-amber-400">{FleetLedgerEngine.formatCredits(estimate.costCredits)}</div>
              <div class="text-[10px] text-white/40">Liquid balance: {FleetLedgerEngine.formatCompactCredits(profile.credits)}</div>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-1">
            <button
              type="button"
              onclick={() => (transferTargetShip = null)}
              class="px-3 py-1.5 rounded bg-black/60 border border-white/20 text-white/70 hover:text-white text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={confirmShipTransfer}
              class="px-4 py-1.5 rounded bg-blue-600/80 hover:bg-blue-500 border border-blue-400 text-white font-bold text-xs uppercase shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
            >
              Transfer Ship ({FleetLedgerEngine.formatCompactCredits(estimate.costCredits)})
            </button>
          </div>
        </div>
      {/if}

      <!-- Filtering & Search Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-black/60 border-b border-[var(--hud-orange)]/25 text-xs">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search ship name, model, callsign, or station..."
            class="w-full px-3 py-1.5 bg-black/80 border border-[var(--hud-orange)]/40 rounded text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--hud-orange)]"
          />
          {#if searchQuery}
            <button
              type="button"
              onclick={() => (searchQuery = '')}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center space-x-2 text-xs">
          <!-- Location Filter -->
          <div class="flex items-center space-x-1">
            <span class="text-white/50 text-[10px] uppercase">System:</span>
            <select
              bind:value={selectedSystemFilter}
              class="px-2 py-1 bg-black/80 border border-[var(--hud-orange)]/35 rounded text-white text-xs focus:outline-none focus:border-[var(--hud-orange)]"
            >
              <option value="ALL">All Systems ({availableSystems.length})</option>
              {#each availableSystems as sys}
                <option value={sys}>{sys}</option>
              {/each}
            </select>
          </div>

          <!-- Hull Class Filter -->
          <div class="flex items-center space-x-1">
            <span class="text-white/50 text-[10px] uppercase">Class:</span>
            <select
              bind:value={selectedHullFilter}
              class="px-2 py-1 bg-black/80 border border-[var(--hud-orange)]/35 rounded text-white text-xs focus:outline-none focus:border-[var(--hud-orange)]"
            >
              <option value="ALL">All Classes</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center space-x-1">
            <span class="text-white/50 text-[10px] uppercase">Status:</span>
            <select
              bind:value={selectedStatusFilter}
              class="px-2 py-1 bg-black/80 border border-[var(--hud-orange)]/35 rounded text-white text-xs focus:outline-none focus:border-[var(--hud-orange)]"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Cockpit</option>
              <option value="stored">Stored</option>
              <option value="in_transit">In Transit</option>
            </select>
          </div>

          <!-- Sort Selector -->
          <div class="flex items-center space-x-1">
            <span class="text-white/50 text-[10px] uppercase">Sort:</span>
            <select
              bind:value={sortBy}
              class="px-2 py-1 bg-black/80 border border-[var(--hud-orange)]/35 rounded text-white text-xs focus:outline-none focus:border-[var(--hud-orange)]"
            >
              <option value="value">Highest Valuation</option>
              <option value="rebuy">Highest Rebuy</option>
              <option value="distance">Nearest Distance</option>
              <option value="name">Ship Name</option>
              <option value="type">Ship Model</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Ships List Container -->
      <div class="flex-1 p-5 overflow-y-auto space-y-3">
        {#if filteredShips.length === 0}
          <div class="text-center py-12 text-white/50 space-y-2">
            <div class="text-3xl">🚀</div>
            <div class="text-sm font-bold text-white">No fleet vessels found matching criteria.</div>
            <div class="text-xs">Adjust your search terms or filter selections above.</div>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {#each filteredShips as ship (ship.id)}
              {@const profile = cmdrProfileEngine.getProfile()}
              {@const currentSystem = profile.currentSystem || 'Sol'}
              {@const distLy = fleetLedgerEngine.getDistanceToSystem(ship, currentSystem)}
              {@const isHere = distLy === 0}

              <div
                class="bg-black/60 border rounded-lg p-3.5 space-y-3 flex flex-col justify-between transition-all hover:bg-black/80 {ship.status === 'active'
                  ? 'border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : ship.status === 'in_transit'
                  ? 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'border-[var(--hud-orange)]/35 hover:border-[var(--hud-orange)]/60'}"
              >
                <!-- Card Header -->
                <div>
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
                        <span>{ship.shipName}</span>
                        <span class="text-[10px] text-white/50 font-normal">[{ship.shipIdent}]</span>
                      </div>
                      <div class="text-xs font-bold text-[var(--hud-orange)] mt-0.5">
                        {ship.shipType} &bull; <span class="text-white/60 font-normal">{ship.hullClass} Frame</span>
                      </div>
                    </div>

                    <!-- Status Badge -->
                    {#if ship.status === 'active'}
                      <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold">
                        ACTIVE COCKPIT
                      </span>
                    {:else if ship.status === 'in_transit'}
                      <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 text-[10px] font-bold animate-pulse">
                        IN TRANSIT
                      </span>
                    {:else}
                      <span class="px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/20 text-[10px] font-bold">
                        STORED
                      </span>
                    {/if}
                  </div>

                  <!-- Location & Transfer Status -->
                  {#if ship.status === 'in_transit' && ship.transferProgress}
                    <div class="mt-2.5 p-2 bg-cyan-950/30 border border-cyan-500/40 rounded space-y-1.5 text-[11px]">
                      <div class="flex items-center justify-between text-cyan-300 font-bold">
                        <span>Hyperspace Transit</span>
                        <span>{FleetLedgerEngine.formatDuration(ship.transferProgress.remainingSeconds)} remaining</span>
                      </div>
                      <div class="text-[10px] text-white/60">
                        {ship.transferProgress.originSystem} ➔ {ship.transferProgress.destinationSystem}
                      </div>
                      <div class="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-cyan-500/30">
                        <div
                          class="h-full bg-cyan-400 transition-all duration-1000"
                          style="width: {Math.min(100, Math.max(5, ((ship.transferProgress.totalSeconds - ship.transferProgress.remainingSeconds) / ship.transferProgress.totalSeconds) * 100))}%"
                        ></div>
                      </div>
                      <button
                        type="button"
                        onclick={() => handleExpedite(ship.id)}
                        class="text-[9px] text-cyan-400 hover:underline uppercase pt-0.5"
                      >
                        ⚡ Expedite Arrival (Dev-Fast)
                      </button>
                    </div>
                  {:else}
                    <div class="mt-2 flex items-center justify-between text-[11px] text-white/60">
                      <div>
                        <span>Station: </span>
                        <strong class="text-white">{ship.currentStarport}</strong>
                        <span class="text-white/40">({ship.currentSystem})</span>
                      </div>
                      <div class="text-right">
                        {#if isHere}
                          <span class="text-emerald-400 font-bold">In Local System</span>
                        {:else}
                          <span class="text-[var(--hud-amber)] font-bold">{distLy} LY</span>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Financial & Spec Metrics -->
                <div class="space-y-1.5 pt-2 border-t border-white/10 text-[11px]">
                  <div class="flex items-center justify-between">
                    <span class="text-white/50">Total Valuation:</span>
                    <span class="text-white font-bold">{FleetLedgerEngine.formatCredits(ship.totalValue)}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/50">5% Rebuy Insurance:</span>
                    <span class="text-amber-400 font-bold">{FleetLedgerEngine.formatCredits(ship.rebuyCost)}</span>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-white/40">
                    <span>Jump: {ship.unladenJumpLy} LY</span>
                    <span>Cargo: {ship.maxCargoCapacity} T</span>
                    <span>Mass: {ship.unladenMassTonnes} T</span>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="pt-2 border-t border-white/10 flex items-center space-x-1.5 text-xs">
                  <!-- Inspect Outfitting Button -->
                  <button
                    type="button"
                    onclick={() => inspectShipOutfitting(ship)}
                    class="flex-1 py-1.5 rounded bg-black/60 hover:bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold text-[11px] uppercase transition-colors"
                    title="Inspect Core, Optional, and Hardpoint Modules"
                  >
                    🛠️ Outfitting
                  </button>

                  {#if ship.status === 'active'}
                    <!-- Already Active -->
                    <div class="flex-1 py-1.5 text-center text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 rounded">
                      Current Cockpit
                    </div>
                  {:else if ship.status === 'in_transit'}
                    <!-- In Transit -->
                    <div class="flex-1 py-1.5 text-center text-[10px] font-bold text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/30 rounded">
                      In Hyperspace
                    </div>
                  {:else if isHere}
                    <!-- Docked at same station/system -> Can board -->
                    <button
                      type="button"
                      onclick={() => handleSwitchActiveShip(ship)}
                      class="flex-1 py-1.5 rounded bg-emerald-600/60 hover:bg-emerald-500/80 border border-emerald-400 text-white font-bold text-[11px] uppercase transition-colors"
                      title="Switch active command vessel"
                    >
                      ✓ Make Active
                    </button>
                  {:else}
                    <!-- In Remote System -> Ship Transfer button -->
                    <button
                      type="button"
                      onclick={() => promptShipTransfer(ship)}
                      class="flex-1 py-1.5 rounded bg-blue-600/50 hover:bg-blue-500/70 border border-blue-400 text-white font-bold text-[11px] uppercase transition-colors"
                      title="Request ship transfer to current station"
                    >
                      🚚 Transfer
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Bottom Status Bar -->
      <div class="flex items-center justify-between px-5 py-3 bg-black/80 border-t border-[var(--hud-orange)]/35 text-xs">
        <div class="flex items-center space-x-2 text-white/60">
          <span>Current Commander System:</span>
          <span class="text-white font-bold">{cmdrProfileEngine.getProfile().currentSystem}</span>
          <span>({cmdrProfileEngine.getProfile().currentStarport})</span>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-1.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/60 text-[var(--hud-amber)] font-bold text-xs uppercase transition-colors"
        >
          Close Ledger
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Outfitting Inspector Modal Mount -->
<OutfittingInspectorModal
  bind:isOpen={isOutfittingModalOpen}
  ship={selectedShipForOutfitting}
  onClose={() => (isOutfittingModalOpen = false)}
/>
