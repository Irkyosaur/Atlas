<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type LandingPadSize,
    type SingleHopQuery,
    type SingleHopTradeOpportunity,
    SHIP_CARGO_PRESETS,
    formatCredits,
    formatMarketAge,
  } from '$engine/market_engine';
  import { ananke } from '$engine/ananke_client';

  interface Props {
    isOpen: boolean;
    referenceSystem?: string;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Sol',
    onClose,
    onPlotRoute,
    onFocusSystem,
  }: Props = $props();

  // Query Parameters
  let currentSystem = $state<string>('Sol');
  let currentStation = $state<string>('');
  let cargoCapacity = $state<number>(728); // Default 728T (Cutter Shielded)
  let budgetCredits = $state<number>(50000000); // 50M Cr
  let maxJumpRangeLy = $state<number>(35.0);
  let padSize = $state<LandingPadSize | 'Any'>('Large');
  let includePlanetary = $state<boolean>(true);
  let maxAgeHours = $state<number>(24); // 24h default to prevent ghost high-demand
  let minProfitPerTon = $state<number>(5000);
  let selectedPreset = $state<string>('cutter_shielded');

  // Results & UI State
  let opportunities = $state<SingleHopTradeOpportunity[]>([]);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);
  let selectedOpportunity = $state<SingleHopTradeOpportunity | null>(null);
  let sortBy = $state<'netProfitPerTon' | 'totalNetProfit' | 'estimatedCrPerHour' | 'jumpDistanceLy'>('netProfitPerTon');
  let sortDir = $state<'asc' | 'desc'>('desc');

  // Quick ship preset handler
  function handleSelectPreset(presetId: string) {
    selectedPreset = presetId;
    const preset = SHIP_CARGO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      cargoCapacity = preset.defaultCargoTons;
      padSize = preset.padSize;
    }
  }

  // Update currentSystem when referenceSystem changes
  $effect(() => {
    if (referenceSystem && referenceSystem.trim().length > 0) {
      currentSystem = referenceSystem;
    }
  });

  async function executeSingleHopSearch() {
    isLoading = true;
    errorMsg = null;
    try {
      const query: SingleHopQuery = {
        currentSystem: currentSystem.trim() || 'Sol',
        currentStation: currentStation.trim() || undefined,
        cargoCapacity: Number(cargoCapacity) || 728,
        budgetCredits: Number(budgetCredits) || 10000000,
        maxJumpRangeLy: Number(maxJumpRangeLy) || 35.0,
        padSize,
        includePlanetary,
        maxAgeHours: Number(maxAgeHours) || 0,
        minProfitPerTon: Number(minProfitPerTon) || 0,
      };

      const results = await ananke.getSingleHopTrades(query);
      opportunities = results;
      if (results.length > 0) {
        selectedOpportunity = results[0];
      } else {
        selectedOpportunity = null;
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Failed to search single-hop trade opportunities.';
    } finally {
      isLoading = false;
    }
  }

  // Sort opportunities
  let sortedOpportunities = $derived.by(() => {
    const list = [...opportunities];
    list.sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'netProfitPerTon':
          diff = a.netProfitPerTon - b.netProfitPerTon;
          break;
        case 'totalNetProfit':
          diff = a.totalNetProfit - b.totalNetProfit;
          break;
        case 'estimatedCrPerHour':
          diff = a.estimatedCrPerHour - b.estimatedCrPerHour;
          break;
        case 'jumpDistanceLy':
          diff = a.jumpDistanceLy - b.jumpDistanceLy;
          break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return list;
  });

  onMount(() => {
    executeSingleHopSearch();
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-label="Single-Hop Best Trade Router"
  >
    <!-- Main Modal Container -->
    <div
      class="relative w-full max-w-7xl h-[92vh] max-h-[960px] bg-[#070b10]/95 border-2 border-[var(--hud-orange)]/60 rounded-lg flex flex-col shadow-[0_0_50px_rgba(255,113,0,0.25)] overflow-hidden font-mono"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-gradient-to-r from-[var(--hud-orange)]/20 via-black/40 to-transparent"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white tracking-widest flex items-center space-x-2">
              <span>SINGLE-HOP BEST TRADE ROUTER</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/25 text-[var(--hud-orange)] border border-[var(--hud-orange)]/50">
                STAGE 6.2 // INARA-PARITY
              </span>
            </h2>
            <p class="text-[10px] text-white/50 tracking-wider">
              OPTIMIZED SINGLE JUMP COMMODITY RUNS, GRAVITY PENALTIES & LANDING PAD CONSTRAINTS
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button
            type="button"
            class="px-3 py-1 rounded text-xs text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 hover:bg-[var(--hud-orange)]/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            onclick={executeSingleHopSearch}
            title="Recalculate best single-hop trade routes"
          >
            <span class={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>{isLoading ? 'CALCULATING...' : 'FIND TRADES'}</span>
          </button>
          <button
            type="button"
            class="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            onclick={onClose}
            aria-label="Close Single Hop Finder"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Query Form Controls -->
      <div class="px-5 py-3 border-b border-[var(--hud-orange)]/20 bg-black/50 space-y-3">
        <!-- Ship Quick Presets -->
        <div class="flex items-center space-x-2 text-[11px] overflow-x-auto pb-1">
          <span class="text-white/50 shrink-0">SHIP PRESETS:</span>
          {#each SHIP_CARGO_PRESETS as preset}
            <button
              type="button"
              class="px-2 py-0.5 rounded border text-[10px] shrink-0 transition-colors {selectedPreset === preset.id ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]' : 'bg-black/40 text-white/70 border-white/10 hover:border-white/30'}"
              onclick={() => handleSelectPreset(preset.id)}
            >
              {preset.name} ({preset.defaultCargoTons}T • {preset.padSize[0]})
            </button>
          {/each}
        </div>

        <!-- Query Inputs Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
          <!-- Origin System -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              CURRENT SYSTEM
              <input
                type="text"
                bind:value={currentSystem}
                placeholder="e.g. Sol, Shinrarta Dezhra"
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              />
            </label>
          </div>

          <!-- Cargo Capacity (Tons) -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              CARGO CAPACITY (T)
              <input
                type="number"
                bind:value={cargoCapacity}
                min="1"
                max="1500"
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              />
            </label>
          </div>

          <!-- Available Budget (Credits) -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              BUDGET (CR)
              <input
                type="number"
                bind:value={budgetCredits}
                min="1000"
                step="5000000"
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              />
            </label>
          </div>

          <!-- Max Jump Range (Ly) -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              MAX JUMP RANGE (LY)
              <input
                type="number"
                bind:value={maxJumpRangeLy}
                min="5"
                max="90"
                step="0.5"
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              />
            </label>
          </div>

          <!-- Landing Pad Size Filter -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              REQUIRED PAD SIZE
              <select
                bind:value={padSize}
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="Large">Large (Starports / Outposts excluded)</option>
                <option value="Medium">Medium & Large</option>
                <option value="Small">Small, Medium & Large</option>
                <option value="Any">Any Pad Size</option>
              </select>
            </label>
          </div>

          <!-- Max Age Filter -->
          <div>
            <label class="block text-[10px] text-white/50 mb-0.5">
              DATA STALENESS CUTOFF
              <select
                bind:value={maxAgeHours}
                class="w-full mt-0.5 bg-[#0a111a] border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value={6}>&lt; 6 Hours (Ultra Fresh)</option>
                <option value={24}>&lt; 24 Hours (Recommended)</option>
                <option value={48}>&lt; 48 Hours</option>
                <option value={0}>All Data Ages</option>
              </select>
            </label>
          </div>
        </div>

        <!-- Checkboxes & Secondary Options -->
        <div class="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-white/5">
          <div class="flex items-center space-x-4">
            <label class="flex items-center space-x-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                bind:checked={includePlanetary}
                class="accent-[var(--hud-orange)] rounded"
              />
              <span>ALLOW PLANETARY PORTS (INCL. HIGH-G DOCKING PENALTY)</span>
            </label>
          </div>

          <div class="flex items-center space-x-2 text-xs">
            <span class="text-white/40">SORT BY:</span>
            <select
              bind:value={sortBy}
              class="bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] text-[11px] rounded px-1.5 py-0.5"
            >
              <option value="netProfitPerTon">Net Profit / Ton</option>
              <option value="totalNetProfit">Total Run Profit</option>
              <option value="estimatedCrPerHour">Cr / Hour Efficiency</option>
              <option value="jumpDistanceLy">Jump Distance (Ly)</option>
            </select>
            <button
              type="button"
              class="px-1.5 py-0.5 bg-black/40 border border-white/20 rounded text-[10px] text-white/70 hover:text-white"
              onclick={() => (sortDir = sortDir === 'asc' ? 'desc' : 'asc')}
            >
              {sortDir === 'asc' ? '▲ ASC' : '▼ DESC'}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Body: Results Table + Selected Opportunity Details Inspector -->
      <div class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <!-- Results Table List (Left / Main) -->
        <div class="flex-1 flex flex-col border-r border-[var(--hud-orange)]/20 overflow-hidden">
          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-black/70 border-b border-white/10 text-[10px] font-bold text-[var(--hud-orange)] uppercase tracking-wider">
            <div class="col-span-3">COMMODITY // ROUTE</div>
            <div class="col-span-2 text-center">PAD & DISTANCE</div>
            <div class="col-span-2 text-right">BUY @ SELL</div>
            <div class="col-span-2 text-right">NET PROFIT / T</div>
            <div class="col-span-2 text-right">TOTAL RUN PROFIT</div>
            <div class="col-span-1 text-center">ACTION</div>
          </div>

          <!-- Table Rows Scroll Container -->
          <div class="flex-1 overflow-y-auto divide-y divide-white/5">
            {#if isLoading}
              <div class="flex flex-col items-center justify-center h-48 space-y-3 text-white/40">
                <span class="animate-spin text-2xl">⏳</span>
                <span class="text-xs tracking-wider">SEARCHING HIGH-PROFIT SINGLE-HOP COMMODITY CORRIDORS...</span>
              </div>
            {:else if sortedOpportunities.length === 0}
              <div class="flex flex-col items-center justify-center h-48 space-y-2 text-white/40">
                <span class="text-xl">⚠️</span>
                <span class="text-xs">No single-hop trade runs match criteria within {maxJumpRangeLy} Ly.</span>
                <button
                  type="button"
                  class="text-[10px] text-[var(--hud-orange)] underline hover:text-white"
                  onclick={() => {
                    maxJumpRangeLy = 50;
                    padSize = 'Any';
                    maxAgeHours = 0;
                    executeSingleHopSearch();
                  }}
                >
                  Broaden search filters (Jump 50 Ly, Any pad size, Any age)
                </button>
              </div>
            {:else}
              {#each sortedOpportunities as opp (opp.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs transition-colors cursor-pointer {selectedOpportunity?.id === opp.id ? 'bg-[var(--hud-orange)]/15 border-l-4 border-[var(--hud-orange)]' : 'hover:bg-white/5'}"
                  onclick={() => (selectedOpportunity = opp)}
                >
                  <!-- Commodity & Route -->
                  <div class="col-span-3 min-w-0">
                    <div class="font-bold text-white truncate flex items-center space-x-1.5">
                      <span>{opp.commodityName}</span>
                      <span class="text-[9px] px-1 rounded bg-white/10 text-white/60 uppercase">{opp.commodityCategory}</span>
                    </div>
                    <div class="text-[10px] text-[var(--hud-orange)] truncate mt-0.5">
                      <span>{opp.sourceSystem}</span> ({opp.sourceStation})
                      <span class="text-white/40">➔</span>
                      <span>{opp.targetSystem}</span> ({opp.targetStation})
                    </div>
                  </div>

                  <!-- Pad & Distance -->
                  <div class="col-span-2 text-center text-[10px]">
                    <div class="flex items-center justify-center space-x-1">
                      <span class="px-1 py-0.2 rounded font-bold {opp.targetPadSize === 'Large' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : opp.targetPadSize === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-500/40' : 'bg-red-950 text-red-400 border border-red-500/40'}">
                        PAD {opp.targetPadSize[0]}
                      </span>
                      {#if opp.targetIsPlanetary}
                        <span class="px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 text-[9px]">PLANET</span>
                      {/if}
                    </div>
                    <div class="text-white/50 mt-0.5">
                      <span>{opp.jumpDistanceLy} Ly</span>
                      <span class="text-white/30">•</span>
                      <span>{opp.targetDistanceLs.toLocaleString()} Ls</span>
                    </div>
                  </div>

                  <!-- Buy & Sell Prices -->
                  <div class="col-span-2 text-right text-[11px]">
                    <div class="text-emerald-400 font-bold">{formatCredits(opp.targetSellPrice)} Cr</div>
                    <div class="text-[10px] text-white/40">Buy: {formatCredits(opp.sourceBuyPrice)} Cr</div>
                  </div>

                  <!-- Net Profit / Ton -->
                  <div class="col-span-2 text-right">
                    <div class="text-[var(--hud-amber)] font-bold text-xs">
                      +{formatCredits(opp.netProfitPerTon)} Cr/T
                    </div>
                    <div class="text-[9px] text-white/40">
                      Est. ~{opp.estimatedFlightDurationMin}m
                    </div>
                  </div>

                  <!-- Total Run Profit -->
                  <div class="col-span-2 text-right">
                    <div class="text-emerald-400 font-bold text-xs">
                      +{formatCredits(opp.totalNetProfit)} Cr
                    </div>
                    <div class="text-[9px] text-emerald-500/70">
                      {formatCredits(opp.estimatedCrPerHour)} Cr/hr
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="col-span-1 flex items-center justify-center space-x-1">
                    <button
                      type="button"
                      class="px-2 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] text-[var(--hud-orange)] hover:text-black font-bold text-[10px] border border-[var(--hud-orange)]/50 transition-colors"
                      onclick={(e) => {
                        e.stopPropagation();
                        if (onPlotRoute) onPlotRoute(opp.targetSystem);
                      }}
                      title="Plot route to target starport"
                    >
                      NAV
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Selected Opportunity Inspector Drawer (Right / 320px) -->
        <div class="w-full md:w-80 bg-black/40 p-4 flex flex-col space-y-3.5 overflow-y-auto text-xs">
          {#if selectedOpportunity}
            <div class="pb-2 border-b border-[var(--hud-orange)]/30">
              <div class="text-[10px] text-white/50 tracking-wider">SELECTED ROUTE INSPECTION</div>
              <div class="text-base font-bold text-white">{selectedOpportunity.commodityName}</div>
              <div class="text-[11px] text-[var(--hud-orange)] font-bold">
                +{formatCredits(selectedOpportunity.totalNetProfit)} Cr Total Profit
              </div>
            </div>

            <!-- Leg 1: Buy Station -->
            <div class="p-2.5 rounded bg-black/50 border border-emerald-500/30 space-y-1">
              <div class="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase">
                <span>1. BUY AT SOURCE</span>
                <span class="text-white/50">{formatMarketAge(selectedOpportunity.sourceUpdatedAt)}</span>
              </div>
              <div class="font-bold text-white">{selectedOpportunity.sourceStation}</div>
              <div class="text-[11px] text-white/70">{selectedOpportunity.sourceSystem} ({selectedOpportunity.sourceDistanceLs.toLocaleString()} Ls)</div>
              <div class="flex items-center justify-between pt-1 text-[11px]">
                <span class="text-white/50">Buy Price:</span>
                <span class="text-white font-bold">{formatCredits(selectedOpportunity.sourceBuyPrice)} Cr</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-white/50">Station Stock:</span>
                <span class="text-emerald-400 font-bold">{selectedOpportunity.sourceSupply.toLocaleString()} T</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-white/50 pt-0.5">
                <span>Pad Size: {selectedOpportunity.sourcePadSize}</span>
                {#if selectedOpportunity.sourceIsPlanetary}
                  <span class="text-purple-400">Planetary Surface Port</span>
                {:else}
                  <span>Orbital Starport</span>
                {/if}
              </div>
            </div>

            <!-- Leg 2: Sell Station -->
            <div class="p-2.5 rounded bg-black/50 border border-[var(--hud-orange)]/40 space-y-1">
              <div class="flex items-center justify-between text-[10px] font-bold text-[var(--hud-orange)] uppercase">
                <span>2. SELL AT DESTINATION</span>
                <span class="text-white/50">{formatMarketAge(selectedOpportunity.targetUpdatedAt)}</span>
              </div>
              <div class="font-bold text-white">{selectedOpportunity.targetStation}</div>
              <div class="text-[11px] text-white/70">{selectedOpportunity.targetSystem} ({selectedOpportunity.targetDistanceLs.toLocaleString()} Ls)</div>
              <div class="flex items-center justify-between pt-1 text-[11px]">
                <span class="text-white/50">Sell Price:</span>
                <span class="text-emerald-400 font-bold">{formatCredits(selectedOpportunity.targetSellPrice)} Cr</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-white/50">Station Demand:</span>
                <span class="text-white font-bold">{selectedOpportunity.targetDemand.toLocaleString()} T</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-white/50 pt-0.5">
                <span>Pad Size: {selectedOpportunity.targetPadSize}</span>
                {#if selectedOpportunity.targetIsPlanetary}
                  <span class="text-purple-400">Planetary Port ({selectedOpportunity.targetGravityG.toFixed(1)}G)</span>
                {:else}
                  <span>Orbital Starport</span>
                {/if}
              </div>
            </div>

            <!-- Run Financial Breakdown -->
            <div class="p-2.5 rounded bg-[#0a111a] border border-white/10 space-y-1 text-[11px]">
              <div class="text-[10px] font-bold text-white/70 uppercase">FINANCIAL BREAKDOWN</div>
              <div class="flex items-center justify-between">
                <span class="text-white/50">Cargo Hauled:</span>
                <span class="text-white font-bold">{selectedOpportunity.unitsTraded} Tons</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/50">Total Capital Cost:</span>
                <span class="text-white font-bold">{formatCredits(selectedOpportunity.totalCostCr)} Cr</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/50">Gross Margin / T:</span>
                <span class="text-white font-bold">+{formatCredits(selectedOpportunity.grossProfitPerTon)} Cr</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/50">Net Margin / T:</span>
                <span class="text-[var(--hud-amber)] font-bold">+{formatCredits(selectedOpportunity.netProfitPerTon)} Cr</span>
              </div>
              <div class="flex items-center justify-between border-t border-white/10 pt-1 font-bold">
                <span class="text-white">Net Total Profit:</span>
                <span class="text-emerald-400">+{formatCredits(selectedOpportunity.totalNetProfit)} Cr</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/50">Efficiency Rate:</span>
                <span class="text-emerald-400 font-bold">{formatCredits(selectedOpportunity.estimatedCrPerHour)} Cr / hr</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-2 space-y-2">
              <button
                type="button"
                class="w-full py-2 rounded bg-[var(--hud-orange)] text-black font-bold uppercase tracking-wider text-xs hover:bg-[var(--hud-amber)] transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-hud-glow"
                onclick={() => {
                  if (onPlotRoute && selectedOpportunity) {
                    onPlotRoute(selectedOpportunity.targetSystem);
                  }
                }}
              >
                <span>⚡ PLOT ROUTE TO TARGET</span>
              </button>

              {#if selectedOpportunity.targetCoords && onFocusSystem}
                <button
                  type="button"
                  class="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer"
                  onclick={() => {
                    if (selectedOpportunity?.targetCoords && onFocusSystem) {
                      onFocusSystem(selectedOpportunity.targetCoords, selectedOpportunity.targetSystem);
                    }
                  }}
                >
                  <span>🎯 FOCUS DESTINATION IN 3D</span>
                </button>
              {/if}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center h-full text-white/30 space-y-2">
              <span>🎯</span>
              <span>Select any trade run to inspect orbital parameters, landing gravity and margins.</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.985);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>
