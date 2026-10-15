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

  let originQuery = $state<string>('Sol');
  let destQuery = $state<string>('Colonia');
  let maxJumpRange = $state<number>(65.0);
  let cargoMass = $state<number>(0);
  let fsdBoost = $state<RoutePlotOptions['fsdBoostLevel']>('standard');

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
        maxJumpRangeLy: maxJumpRange,
        cargoMassTonnes: cargoMass,
        fsdBoostLevel: fsdBoost,
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

    <!-- Inputs & Sliders Container -->
    <div class="p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[calc(85vh-5rem)]">
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

      <!-- Sliders: Max Jump Range & Cargo Mass -->
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
            <span class="hud-data-label">CARGO MASS:</span>
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

      <!-- Action Button -->
      <button
        type="button"
        onclick={executePlot}
        disabled={isPlotting}
        class="w-full py-2.5 rounded font-bold uppercase tracking-wider transition-all text-xs {isPlotting
          ? 'bg-amber-700/50 text-white/50 cursor-wait'
          : 'bg-[var(--hud-orange)] text-black hover:bg-orange-500 shadow-[0_0_12px_rgba(255,113,0,0.6)]'}"
      >
        {isPlotting ? 'CALCULATING JUMP HOPS...' : 'PLOT A* ROUTE'}
      </button>

      {#if plotError}
        <div class="p-2 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-[11px]">
          {plotError}
        </div>
      {/if}

      <!-- Task 4.1.4: Route Telemetry Ledger -->
      {#if currentResult}
        <div class="flex flex-col gap-2 pt-2 border-t border-[var(--hud-orange)]/30">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--hud-amber)]">
            <span>ROUTE TELEMETRY LEDGER</span>
            <span class="text-white/50 text-[10px]">{currentResult.jumpCount} TOTAL HOPS</span>
          </div>

          <div class="grid grid-cols-3 gap-2 p-2 rounded bg-black/50 border border-white/10 text-[11px]">
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">TOTAL DISTANCE</span>
              <span class="font-bold text-white/95">{currentResult.totalDistanceLy.toFixed(1)} LY</span>
            </div>
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">EST. TRAVEL TIME</span>
              <span class="font-bold text-cyan-300">~{currentResult.estimatedTravelTimeMin.toFixed(0)} MIN</span>
            </div>
            <div class="flex flex-col">
              <span class="hud-data-label text-[9px]">TOTAL FUEL</span>
              <span class="font-bold text-amber-300">~{currentResult.totalFuelTonnes.toFixed(1)} T</span>
            </div>
          </div>

          <!-- Waypoints Sequential List -->
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {#each currentResult.waypoints as wp, idx}
              <button
                type="button"
                onclick={() => onFocusWaypoint?.(wp)}
                class="flex items-center justify-between p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors"
              >
                <div class="flex items-center space-x-2 truncate">
                  <span class="text-[10px] font-mono text-white/40 w-5">#{idx + 1}</span>
                  <span class="font-bold text-white/90 truncate text-[11px]">{wp.systemName}</span>
                </div>
                <div class="flex items-center space-x-1.5 whitespace-nowrap">
                  <span class="text-[10px] px-1 py-0.2 rounded font-bold {wp.isScoopable ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}">
                    {wp.starClass}
                  </span>
                  <span class="text-[10px] text-white/60 font-mono">
                    {wp.jumpDistanceLy.toFixed(1)} LY
                  </span>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </aside>
{/if}
