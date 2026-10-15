<!-- Location: atlas/client/src/lib/components/RoutePlannerPanel.svelte -->
<!-- Task 4.1.1, 4.1.2, 4.1.4: Route Planner HUD with Origin/Dest Autocomplete & Telemetry Ledger -->
<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import { ananke, type SystemRecord } from '$engine/ananke_client';
  import { plotRoute, type RoutePlotOptions } from '$engine/route_solver';
  import type { RoutePlotResult, RouteWaypoint } from '$engine/route_pipeline';

  interface Props {
    isOpen?: boolean;
    onPlotRoute?: (result: RoutePlotResult) => void;
    onClose?: () => void;
    onFocusWaypoint?: (wp: RouteWaypoint) => void;
  }

  let {
    isOpen = $bindable(false),
    onPlotRoute,
    onClose,
    onFocusWaypoint,
  }: Props = $props();

  let activeMode = $state<'ship' | 'neutron' | 'carrier'>('ship');
  let originQuery = $state<string>('Sol');
  let destQuery = $state<string>('Colonia');
  let maxJumpRange = $state<number>(65.0);
  let cargoMass = $state<number>(0);
  let carrierCargoMass = $state<number>(0); // 0 to 25,000 T
  let startingTritiumDepot = $state<number>(1000); // 0 to 1,000 T
  let fsdBoost = $state<RoutePlotOptions['fsdBoostLevel']>('standard');
  let useNeutronHighway = $state<boolean>(false);

  let isPlotting = $state<boolean>(false);
  let plotError = $state<string | null>(null);
  let currentResult = $state<RoutePlotResult | null>(null);

  // Autocomplete dropdown states
  let originSuggestions = $state<SystemRecord[]>([]);
  let destSuggestions = $state<SystemRecord[]>([]);
  let isOriginSearching = $state<boolean>(false);
  let isDestSearching = $state<boolean>(false);

  async function handleOriginInput() {
    if (originQuery.trim().length < 2) {
      originSuggestions = [];
      return;
    }
    isOriginSearching = true;
    try {
      originSuggestions = await ananke.searchAutocomplete(originQuery);
    } catch {
      originSuggestions = [];
    } finally {
      isOriginSearching = false;
    }
  }

  async function handleDestInput() {
    if (destQuery.trim().length < 2) {
      destSuggestions = [];
      return;
    }
    isDestSearching = true;
    try {
      destSuggestions = await ananke.searchAutocomplete(destQuery);
    } catch {
      destSuggestions = [];
    } finally {
      isDestSearching = false;
    }
  }

  function selectOrigin(name: string) {
    originQuery = name;
    originSuggestions = [];
  }

  function selectDest(name: string) {
    destQuery = name;
    destSuggestions = [];
  }

  async function executePlot() {
    if (!originQuery.trim() || !destQuery.trim()) {
      plotError = 'Please specify both Origin and Destination systems.';
      return;
    }

    isPlotting = true;
    plotError = null;

    try {
      const result = await plotRoute({
        origin: originQuery.trim(),
        destination: destQuery.trim(),
        routeType: activeMode,
        maxJumpRangeLy: activeMode === 'carrier' ? 500.0 : maxJumpRange,
        cargoMassTonnes: cargoMass,
        carrierCargoMassTonnes: carrierCargoMass,
        startingTritiumTonnes: startingTritiumDepot,
        fsdBoostLevel: fsdBoost,
        useNeutronHighway: activeMode === 'neutron',
      });

      currentResult = result;
      if (onPlotRoute) {
        onPlotRoute(result);
      }
    } catch (err: any) {
      plotError = err?.message || 'Failed to plot route.';
    } finally {
      isPlotting = false;
    }
  }

  function swapSystems() {
    const temp = originQuery;
    originQuery = destQuery;
    destQuery = temp;
  }
</script>

{#if isOpen}
  <aside
    class="pointer-events-auto absolute top-16 left-6 z-30 w-96 max-h-[85vh] flex flex-col rounded-lg bg-black/90 border border-[var(--hud-orange)]/45 backdrop-blur-md shadow-2xl text-white font-mono select-none overflow-hidden text-xs"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-[var(--hud-orange)]/15 border-b border-[var(--hud-orange)]/35">
      <div class="flex items-center space-x-2">
        <Icon name="reticle" size={16} glow={true} color="var(--hud-orange)" />
        <span class="hud-title text-sm font-bold tracking-wider text-[var(--hud-amber)]">
          A* ROUTE PLANNER // NAV
        </span>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="text-white/60 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
        title="Close Route Planner"
      >
        ✕
      </button>
    </div>

    <!-- Navigation Mode Tabs -->
    <div class="grid grid-cols-3 bg-black/60 border-b border-[var(--hud-orange)]/25 text-[10px] font-bold">
      <button
        type="button"
        onclick={() => (activeMode = 'ship')}
        class="py-2 text-center transition-colors border-r border-white/10 {activeMode === 'ship'
          ? 'bg-[var(--hud-orange)]/25 text-[var(--hud-amber)] border-b-2 border-b-[var(--hud-orange)] font-extrabold'
          : 'text-white/50 hover:text-white hover:bg-white/5'}"
      >
        SHIP (A*)
      </button>
      <button
        type="button"
        onclick={() => (activeMode = 'neutron')}
        class="py-2 text-center transition-colors border-r border-white/10 {activeMode === 'neutron'
          ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400 font-extrabold'
          : 'text-white/50 hover:text-white hover:bg-white/5'}"
      >
        NEUTRON (4X)
      </button>
      <button
        type="button"
        onclick={() => (activeMode = 'carrier')}
        class="py-2 text-center transition-colors {activeMode === 'carrier'
          ? 'bg-amber-500/25 text-amber-300 border-b-2 border-b-amber-400 font-extrabold'
          : 'text-white/50 hover:text-white hover:bg-white/5'}"
      >
        CARRIER (500 LY)
      </button>
    </div>

    <!-- Inputs & Sliders Container -->
    <div class="p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[calc(85vh-7rem)]">
      <!-- Origin Input -->
      <div class="relative flex flex-col gap-1">
        <span class="hud-data-label text-[10px]">ORIGIN SYSTEM</span>
        <div class="flex items-center rounded bg-white/5 border border-white/15 px-2.5 py-1.5 focus-within:border-[var(--hud-orange)]">
          <input
            type="text"
            bind:value={originQuery}
            oninput={handleOriginInput}
            placeholder="Origin (e.g. Sol)..."
            class="w-full bg-transparent outline-none text-white font-mono placeholder-white/30 text-xs uppercase"
          />
          {#if isOriginSearching}
            <span class="text-[10px] text-white/40 animate-pulse">...</span>
          {/if}
        </div>
        {#if originSuggestions.length > 0}
          <div class="absolute top-14 inset-x-0 z-40 bg-black/95 border border-[var(--hud-orange)]/50 rounded shadow-xl max-h-36 overflow-y-auto">
            {#each originSuggestions as s}
              <button
                type="button"
                onclick={() => selectOrigin(s.name)}
                class="w-full text-left px-3 py-1.5 hover:bg-[var(--hud-orange)]/20 text-white/90 font-mono text-xs flex justify-between"
              >
                <span>{s.name}</span>
                <span class="text-white/40 text-[10px]">{s.primaryStarClass} Class</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Swap Button -->
      <div class="flex justify-center -my-1.5">
        <button
          type="button"
          onclick={swapSystems}
          class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px]"
          title="Swap Origin and Destination"
        >
          ⇅ SWAP
        </button>
      </div>

      <!-- Destination Input -->
      <div class="relative flex flex-col gap-1">
        <span class="hud-data-label text-[10px]">DESTINATION SYSTEM</span>
        <div class="flex items-center rounded bg-white/5 border border-white/15 px-2.5 py-1.5 focus-within:border-[var(--hud-orange)]">
          <input
            type="text"
            bind:value={destQuery}
            oninput={handleDestInput}
            placeholder="Destination (e.g. Colonia)..."
            class="w-full bg-transparent outline-none text-white font-mono placeholder-white/30 text-xs uppercase"
          />
          {#if isDestSearching}
            <span class="text-[10px] text-white/40 animate-pulse">...</span>
          {/if}
        </div>
        {#if destSuggestions.length > 0}
          <div class="absolute top-14 inset-x-0 z-40 bg-black/95 border border-[var(--hud-orange)]/50 rounded shadow-xl max-h-36 overflow-y-auto">
            {#each destSuggestions as s}
              <button
                type="button"
                onclick={() => selectDest(s.name)}
                class="w-full text-left px-3 py-1.5 hover:bg-[var(--hud-orange)]/20 text-white/90 font-mono text-xs flex justify-between"
              >
                <span>{s.name}</span>
                <span class="text-white/40 text-[10px]">{s.primaryStarClass} Class</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Ship Modes (Standard A* / Neutron) Configuration Controls -->
      {#if activeMode !== 'carrier'}
        <div class="grid grid-cols-2 gap-3 p-2.5 rounded bg-white/5 border border-white/10">
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-[10px]">
              <span class="hud-data-label">JUMP RANGE:</span>
              <span class="text-[var(--hud-amber)] font-bold">{maxJumpRange.toFixed(1)} LY</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="0.5"
              bind:value={maxJumpRange}
              class="w-full h-1 bg-black/60 rounded accent-[var(--hud-orange)]"
            />
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-[10px]">
              <span class="hud-data-label">SHIP CARGO:</span>
              <span class="text-[var(--hud-amber)] font-bold">{cargoMass} T</span>
            </div>
            <input
              type="range"
              min="0"
              max="750"
              step="10"
              bind:value={cargoMass}
              class="w-full h-1 bg-black/60 rounded accent-[var(--hud-orange)]"
            />
          </div>

          <!-- FSD Boost Synthesis Selector -->
          <div class="col-span-2 flex flex-col gap-1 pt-1 border-t border-white/5">
            <span class="hud-data-label text-[10px]">FSD SYNTHESIS BOOST</span>
            <div class="grid grid-cols-4 gap-1">
              <button
                type="button"
                onclick={() => (fsdBoost = 'standard')}
                class="px-1.5 py-1 rounded text-[10px] font-bold transition-colors {fsdBoost === 'standard'
                  ? 'bg-[var(--hud-orange)] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'}"
              >
                1.0x NONE
              </button>
              <button
                type="button"
                onclick={() => (fsdBoost = 'synthesis_basic')}
                class="px-1.5 py-1 rounded text-[10px] font-bold transition-colors {fsdBoost === 'synthesis_basic'
                  ? 'bg-[var(--hud-orange)] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'}"
              >
                +25% BASIC
              </button>
              <button
                type="button"
                onclick={() => (fsdBoost = 'synthesis_standard')}
                class="px-1.5 py-1 rounded text-[10px] font-bold transition-colors {fsdBoost === 'synthesis_standard'
                  ? 'bg-[var(--hud-orange)] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'}"
              >
                +50% STD
              </button>
              <button
                type="button"
                onclick={() => (fsdBoost = 'synthesis_premium')}
                class="px-1.5 py-1 rounded text-[10px] font-bold transition-colors {fsdBoost === 'synthesis_premium'
                  ? 'bg-[var(--hud-orange)] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'}"
              >
                +100% PREM
              </button>
            </div>
          </div>
        </div>
      {:else}
        <!-- Task 4.3.1: Fleet Carrier 500 LY Configuration Controls -->
        <div class="flex flex-col gap-3 p-2.5 rounded bg-amber-950/20 border border-amber-500/35">
          <div class="flex items-center justify-between text-[11px] font-bold text-amber-300">
            <span>FLEET CARRIER SPECIFICATIONS</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">MAX 500.0 LY</span>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-[10px]">
              <span class="hud-data-label">CARGO MASS (0 - 25,000 T):</span>
              <span class="text-amber-300 font-bold">{carrierCargoMass.toLocaleString()} T</span>
            </div>
            <input
              type="range"
              min="0"
              max="25000"
              step="500"
              bind:value={carrierCargoMass}
              class="w-full h-1 bg-black/60 rounded accent-amber-400"
            />
            <div class="flex justify-between text-[8px] text-white/40">
              <span>0 T (Dry 25k T)</span>
              <span>12,500 T</span>
              <span>25,000 T (Max 50k T)</span>
            </div>
          </div>

          <div class="flex flex-col gap-1 pt-1 border-t border-amber-500/20">
            <div class="flex justify-between items-center text-[10px]">
              <span class="hud-data-label">STARTING TRITIUM DEPOT:</span>
              <span class="text-amber-300 font-bold">{startingTritiumDepot.toLocaleString()} T</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              bind:value={startingTritiumDepot}
              class="w-full h-1 bg-black/60 rounded accent-amber-400"
            />
            <div class="flex justify-between text-[8px] text-white/40">
              <span>100 T</span>
              <span>500 T</span>
              <span>1,000 T (Full Depot)</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Action Button -->
      <button
        type="button"
        onclick={executePlot}
        disabled={isPlotting}
        class="w-full py-2.5 rounded font-bold uppercase tracking-wider transition-all text-xs {isPlotting
          ? 'bg-amber-700/50 text-white/50 cursor-wait'
          : activeMode === 'carrier'
          ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
          : activeMode === 'neutron'
          ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
          : 'bg-[var(--hud-orange)] text-black hover:bg-orange-500 shadow-[0_0_12px_rgba(255,113,0,0.6)]'}"
      >
        {isPlotting
          ? 'CALCULATING JUMP HOPS...'
          : activeMode === 'carrier'
          ? 'PLOT FLEET CARRIER (500 LY) EXPEDITION'
          : activeMode === 'neutron'
          ? 'PLOT 4X NEUTRON HIGHWAY ROUTE'
          : 'PLOT A* SHIP ROUTE'}
      </button>

      {#if plotError}
        <div class="p-2 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-[11px]">
          {plotError}
        </div>
      {/if}

      <!-- Task 4.1.4, 4.2.4 & 4.3.4: Route Telemetry Ledger & Jump Timing Schedule -->
      {#if currentResult}
        <div class="flex flex-col gap-2 pt-2 border-t border-[var(--hud-orange)]/30">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--hud-amber)]">
            <span>{currentResult.routeType === 'carrier' ? 'CARRIER EXPEDITION LEDGER' : 'ROUTE TELEMETRY LEDGER'}</span>
            <span class="text-white/50 text-[10px]">{currentResult.jumpCount} TOTAL HOPS</span>
          </div>

          <div class="grid grid-cols-3 gap-2 p-2 rounded bg-black/50 border border-white/10 text-[11px]">
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">TOTAL DISTANCE</span>
              <span class="font-bold text-white/95">{currentResult.totalDistanceLy.toFixed(1)} LY</span>
            </div>
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">EST. TRAVEL TIME</span>
              <span class="font-bold {currentResult.routeType === 'carrier' ? 'text-amber-300' : 'text-cyan-300'}">
                {currentResult.routeType === 'carrier'
                  ? `${Math.floor(currentResult.estimatedTravelTimeMin / 60)}h ${currentResult.estimatedTravelTimeMin % 60}m`
                  : `~${currentResult.estimatedTravelTimeMin.toFixed(0)} MIN`}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">{currentResult.routeType === 'carrier' ? 'TRITIUM BURN' : 'TOTAL FUEL'}</span>
              <span class="font-bold text-amber-300">
                {currentResult.routeType === 'carrier'
                  ? `${currentResult.totalTritiumRequiredTonnes} T`
                  : `~${currentResult.totalFuelTonnes.toFixed(1)} T`}
              </span>
            </div>
          </div>

          <!-- Carrier Expedition Stats & Tritium Depot Balance (Task 4.3.1, 4.3.2) -->
          {#if currentResult.routeType === 'carrier'}
            <div class="flex flex-col gap-1.5 p-2 rounded bg-amber-950/30 border border-amber-500/35 text-[10px]">
              <div class="flex justify-between items-center">
                <span class="text-amber-400 font-bold">STARTING DEPOT: {currentResult.startingDepotTritiumTonnes} T</span>
                <span class="font-bold {currentResult.tritiumRestockNeeded ? 'text-red-400' : 'text-emerald-400'}">
                  REMAINING: {currentResult.remainingDepotTritiumTonnes} T
                </span>
              </div>
              <!-- Tritium fuel bar -->
              <div class="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                <div
                  class="h-full transition-all {currentResult.tritiumRestockNeeded ? 'bg-red-500' : 'bg-amber-400'}"
                  style="width: {Math.max(0, Math.min(100, Math.round(((currentResult.remainingDepotTritiumTonnes || 0) / (currentResult.startingDepotTritiumTonnes || 1000)) * 100)))}%"
                ></div>
              </div>
              <div class="flex justify-between text-[9px] text-white/50">
                <span>Cycle: 15m spin-up + 5m cooldown</span>
                {#if currentResult.tritiumRestockNeeded}
                  <span class="text-red-300 font-bold animate-pulse">⚠ MIDWAY RESTOCK REQUIRED</span>
                {:else}
                  <span class="text-emerald-300">✓ DEPOT SUFFICIENT</span>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Neutron Highway Stats (Task 4.2.3, 4.2.4) -->
          {#if currentResult.neutronBoostCount && currentResult.neutronBoostCount > 0}
            <div class="grid grid-cols-3 gap-2 p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-[10px]">
              <div class="flex flex-col">
                <span class="text-cyan-400 font-bold">NEUTRON HOPS</span>
                <span class="text-white font-mono">{currentResult.neutronBoostCount} (4x BOOST)</span>
              </div>
              <div class="flex flex-col">
                <span class="text-emerald-400 font-bold">REFUEL STOPS</span>
                <span class="text-white font-mono">{currentResult.refuelStopCount || 0} SCOOPS</span>
              </div>
              <div class="flex flex-col">
                <span class="text-amber-400 font-bold">FSD HEALTH</span>
                <span class="font-mono {currentResult.finalFsdHealthPercent! < 85 ? 'text-amber-300 font-bold' : 'text-emerald-300'}">
                  {currentResult.finalFsdHealthPercent}%
                </span>
              </div>
            </div>
          {/if}

          <!-- Waypoints Sequential List & Carrier Jump Schedule Timeline (Task 4.3.4) -->
          <div class="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
            {#each currentResult.waypoints as wp, idx}
              <button
                type="button"
                onclick={() => onFocusWaypoint?.(wp)}
                class="flex flex-col p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors gap-1"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-[10px] font-mono text-white/40 w-5">#{idx + 1}</span>
                    <div class="flex flex-col truncate">
                      <span class="font-bold text-white/90 truncate text-[11px]">{wp.systemName}</span>
                      {#if wp.isCarrierHop && idx > 0}
                        <span class="text-[9px] text-amber-300 font-mono">
                          🔥 {wp.tritiumBurnTonnes}T Tritium • Depot: {wp.remainingTritiumTonnes}T
                        </span>
                      {:else if wp.isNeutronBoost}
                        <span class="text-[9px] text-cyan-300 font-mono">⚡ 400% NEUTRON JET</span>
                      {:else if wp.isRefuelStop}
                        <span class="text-[9px] text-emerald-300 font-mono">⛽ REFUEL STOP</span>
                      {:else if wp.isRepairStop}
                        <span class="text-[9px] text-amber-300 font-mono">🛠 REPAIR STATION (ADV. MAINT)</span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center space-x-1.5 whitespace-nowrap">
                    <span class="text-[10px] px-1 py-0.2 rounded font-bold {wp.isCarrierHop ? 'bg-amber-950 text-amber-300' : wp.isNeutronBoost ? 'bg-cyan-900 text-cyan-200' : wp.isScoopable ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}">
                      {wp.starClass}
                    </span>
                    <span class="text-[10px] text-white/60 font-mono">
                      {wp.jumpDistanceLy.toFixed(1)} LY
                    </span>
                  </div>
                </div>

                <!-- Carrier Jump Schedule Timeline Row (Task 4.3.4) -->
                {#if wp.isCarrierHop && idx > 0}
                  <div class="flex items-center justify-between text-[9px] px-2 py-1 rounded bg-black/40 border border-amber-500/20 text-white/70 font-mono">
                    <span class="text-amber-200">⏳ 15m Spin-up Lock</span>
                    <span class="text-amber-400">⚡ Jump Execution</span>
                    <span class="text-cyan-300">❄ 5m Cooldown Lock</span>
                    <span class="text-white/40">+{idx * 20}m total</span>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </aside>
{/if}
