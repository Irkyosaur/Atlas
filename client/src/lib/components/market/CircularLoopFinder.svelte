<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type LandingPadSize,
    type CircularLoopQuery,
    type CircularTradeLoop,
    type TradeLoopLeg,
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
  let hopsCount = $state<2 | 3 | 4>(2);
  let cargoCapacity = $state<number>(728); // Imperial Cutter (Shielded)
  let budgetCredits = $state<number>(50000000); // 50M Cr
  let maxJumpRangeLy = $state<number>(35.0);
  let padSize = $state<LandingPadSize | 'Any'>('Large');
  let includePlanetary = $state<boolean>(true);
  let maxAgeHours = $state<number>(24);
  let minProfitPerTon = $state<number>(1000);
  let fuelTankCapacityTons = $state<number>(64);
  let fuelConsumptionPerLy = $state<number>(0.8);
  let selectedPreset = $state<string>('cutter_shielded');

  // Results & UI State
  let loops = $state<CircularTradeLoop[]>([]);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);
  let selectedLoop = $state<CircularTradeLoop | null>(null);
  let sortBy = $state<'crPerHour' | 'totalNetProfitCr' | 'profitPerTonPerRound' | 'totalRoundTripMinutes'>('crPerHour');
  let sortDir = $state<'asc' | 'desc'>('desc');

  // Quick ship preset handler
  function handleSelectPreset(presetId: string) {
    selectedPreset = presetId;
    const preset = SHIP_CARGO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      cargoCapacity = preset.defaultCargoTons;
      padSize = preset.padSize;
      if (preset.id.startsWith('cutter')) {
        fuelTankCapacityTons = 64;
      } else if (preset.id.startsWith('type9')) {
        fuelTankCapacityTons = 64;
      } else if (preset.id.startsWith('python')) {
        fuelTankCapacityTons = 32;
      } else {
        fuelTankCapacityTons = 32;
      }
    }
  }

  // Update currentSystem when referenceSystem changes
  $effect(() => {
    if (referenceSystem && referenceSystem.trim().length > 0) {
      currentSystem = referenceSystem;
    }
  });

  async function executeCircularSearch() {
    isLoading = true;
    errorMsg = null;
    try {
      const query: CircularLoopQuery = {
        currentSystem: currentSystem.trim() || 'Sol',
        currentStation: currentStation.trim() || undefined,
        hopsCount,
        cargoCapacity: Number(cargoCapacity) || 728,
        budgetCredits: Number(budgetCredits) || 10000000,
        maxJumpRangeLy: Number(maxJumpRangeLy) || 35.0,
        padSize,
        includePlanetary,
        maxAgeHours: Number(maxAgeHours) || 0,
        minProfitPerTon: Number(minProfitPerTon) || 0,
        fuelTankCapacityTons: Number(fuelTankCapacityTons) || 64,
        fuelConsumptionPerLy: Number(fuelConsumptionPerLy) || 0.8,
      };

      const results = await ananke.getCircularTradeLoops(query);
      loops = results;
      if (results.length > 0) {
        selectedLoop = results[0];
      } else {
        selectedLoop = null;
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Failed to search circular trade loops.';
    } finally {
      isLoading = false;
    }
  }

  // Sort loops
  let sortedLoops = $derived.by(() => {
    const list = [...loops];
    list.sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'crPerHour':
          diff = a.crPerHour - b.crPerHour;
          break;
        case 'totalNetProfitCr':
          diff = a.totalNetProfitCr - b.totalNetProfitCr;
          break;
        case 'profitPerTonPerRound':
          diff = a.profitPerTonPerRound - b.profitPerTonPerRound;
          break;
        case 'totalRoundTripMinutes':
          diff = a.totalRoundTripMinutes - b.totalRoundTripMinutes;
          break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return list;
  });

  // On mount or open
  onMount(() => {
    if (isOpen && loops.length === 0) {
      executeCircularSearch();
    }
  });

  $effect(() => {
    if (isOpen && loops.length === 0 && !isLoading) {
      executeCircularSearch();
    }
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-mono select-none"
    role="dialog"
    aria-modal="true"
    aria-label="Multi-Stop Circular Trade Loop Router"
  >
    <!-- Outer Window Frame -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#05070a] border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_35px_rgba(255,113,0,0.25)] overflow-hidden"
    >
      <!-- Header Bar -->
      <div class="px-5 py-3.5 border-b border-[var(--hud-orange)]/40 flex items-center justify-between bg-black/60">
        <div class="flex items-center space-x-3">
          <div class="p-1.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)]">
            <Icon name="reticle" size={18} glow={true} color="var(--hud-orange)" />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-bold tracking-wider text-[var(--hud-orange)]">
                CIRCULAR TRADE LOOP OPTIMIZER
              </span>
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-[var(--hud-amber)]/20 text-[var(--hud-amber)] border border-[var(--hud-amber)]/40 font-bold">
                CR/HOUR MAXIMIZER
              </span>
              <span class="text-[10px] text-[var(--ed-orange-dim)] font-mono">STAGE 6.3</span>
            </div>
            <p class="text-[11px] text-[var(--ed-orange-dim)]">
              Multi-hop closed loop routing with non-linear Supercruise $t \approx A \cdot d^{0.33}$, gravity descent penalties & fuel stop detection.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-1.5 rounded text-[var(--ed-orange-dim)] hover:text-white hover:bg-white/10 transition-colors"
          onclick={onClose}
          aria-label="Close Loop Finder"
        >
          <span class="text-lg leading-none">✕</span>
        </button>
      </div>

      <!-- Main Layout Body (Left Config Sidebar + Right Results/Detail) -->
      <div class="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--hud-orange)]/25">
        
        <!-- Left Filter & Query Panel (Scrollable) -->
        <div class="w-full lg:w-80 p-4 space-y-4 overflow-y-auto bg-black/40 text-xs">
          <!-- Origin Location -->
          <div class="space-y-1.5">
            <span class="hud-data-label text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
              ORIGIN SYSTEM & STARPORT
            </span>
            <div class="space-y-1">
              <input
                type="text"
                bind:value={currentSystem}
                placeholder="Star system (e.g. Sol, Cubeo)"
                class="w-full px-2.5 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-white placeholder-white/30 focus:border-[var(--hud-orange)] focus:outline-none"
              />
              <input
                type="text"
                bind:value={currentStation}
                placeholder="Station (Optional, e.g. Li Qing Jao)"
                class="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/20 text-white placeholder-white/30 focus:border-[var(--hud-orange)] focus:outline-none text-[11px]"
              />
            </div>
          </div>

          <!-- Circular Hops Count (2-Hop, 3-Hop, 4-Hop) -->
          <div class="space-y-1.5">
            <span class="hud-data-label text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
              CIRCULAR HOPS (LEGS)
            </span>
            <div class="grid grid-cols-3 gap-1">
              {#each ([2, 3, 4] as const) as hops}
                <button
                  type="button"
                  class="py-1.5 rounded text-center border font-bold text-xs transition-all {hopsCount === hops
                    ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] shadow-[0_0_10px_rgba(255,113,0,0.3)]'
                    : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'}"
                  onclick={() => (hopsCount = hops)}
                >
                  {hops}-HOP
                </button>
              {/each}
            </div>
            <div class="text-[10px] text-white/50">
              {hopsCount === 2 ? 'Direct round-trip between 2 stations.' : hopsCount === 3 ? 'Triangle itinerary returning to origin.' : 'Quad loop itinerary returning to origin.'}
            </div>
          </div>

          <!-- Vessel Cargo Preset -->
          <div class="space-y-1.5">
            <span class="hud-data-label text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
              SHIP CLASS PRESET
            </span>
            <select
              bind:value={selectedPreset}
              onchange={(e) => handleSelectPreset(e.currentTarget.value)}
              class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white focus:outline-none text-xs"
            >
              {#each SHIP_CARGO_PRESETS as preset}
                <option value={preset.id}>
                  {preset.name} ({preset.defaultCargoTons}T, {preset.padSize})
                </option>
              {/each}
            </select>
          </div>

          <!-- Capacity & Budget Grid -->
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <span class="text-[10px] text-white/70">CARGO (TONS):</span>
              <input
                type="number"
                bind:value={cargoCapacity}
                min="1"
                max="1000"
                class="w-full px-2 py-1 rounded bg-black/60 border border-white/20 text-white focus:border-[var(--hud-orange)] focus:outline-none"
              />
            </div>
            <div class="space-y-1">
              <span class="text-[10px] text-white/70">BUDGET (CR):</span>
              <input
                type="number"
                bind:value={budgetCredits}
                step="1000000"
                class="w-full px-2 py-1 rounded bg-black/60 border border-white/20 text-white focus:border-[var(--hud-orange)] focus:outline-none"
              />
            </div>
          </div>

          <!-- Jump Range & Pad Size -->
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <span class="text-[10px] text-white/70">MAX JUMP (LY):</span>
              <input
                type="number"
                bind:value={maxJumpRangeLy}
                step="0.5"
                min="5"
                class="w-full px-2 py-1 rounded bg-black/60 border border-white/20 text-white focus:border-[var(--hud-orange)] focus:outline-none"
              />
            </div>
            <div class="space-y-1">
              <span class="text-[10px] text-white/70">PAD SIZE:</span>
              <select
                bind:value={padSize}
                class="w-full px-2 py-1 rounded bg-black/60 border border-white/20 text-white focus:border-[var(--hud-orange)] focus:outline-none"
              >
                <option value="Large">Large Only</option>
                <option value="Medium">Medium & Large</option>
                <option value="Any">Any Pad</option>
              </select>
            </div>
          </div>

          <!-- Fuel Tank & Burn Parameters -->
          <div class="p-2.5 rounded bg-black/30 border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-[10px] text-[var(--hud-amber)] font-bold">
              <span>FUEL CONSTRAINT MODEL</span>
              <span>AUTO-CHECK</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <span class="text-[9px] text-white/60">TANK SIZE (T):</span>
                <input
                  type="number"
                  bind:value={fuelTankCapacityTons}
                  min="8"
                  max="128"
                  class="w-full px-2 py-0.5 rounded bg-black/60 border border-white/20 text-white text-[11px]"
                />
              </div>
              <div class="space-y-1">
                <span class="text-[9px] text-white/60">BURN (T/LY):</span>
                <input
                  type="number"
                  bind:value={fuelConsumptionPerLy}
                  step="0.1"
                  min="0.1"
                  class="w-full px-2 py-0.5 rounded bg-black/60 border border-white/20 text-white text-[11px]"
                />
              </div>
            </div>
          </div>

          <!-- Toggles (Planetary, Age) -->
          <div class="space-y-2 pt-1">
            <label class="flex items-center justify-between p-2 rounded bg-black/30 border border-white/10 cursor-pointer">
              <span class="text-white/80">Allow Planetary Ports</span>
              <input
                type="checkbox"
                bind:checked={includePlanetary}
                class="accent-[var(--hud-orange)] w-4 h-4 cursor-pointer"
              />
            </label>

            <div class="flex items-center justify-between text-[10px] text-white/70">
              <span>MAX DATA AGE:</span>
              <select
                bind:value={maxAgeHours}
                class="px-2 py-1 rounded bg-black/80 border border-white/20 text-white focus:outline-none"
              >
                <option value={6}>Max 6 Hours</option>
                <option value={24}>Max 24 Hours</option>
                <option value={48}>Max 48 Hours</option>
                <option value={0}>Any Age</option>
              </select>
            </div>
          </div>

          <!-- Search Action Button -->
          <button
            type="button"
            class="w-full py-2.5 px-3 rounded bg-[var(--hud-orange)] text-black font-bold uppercase tracking-wider text-xs hover:bg-[var(--hud-amber)] transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(255,113,0,0.3)] disabled:opacity-50 cursor-pointer"
            onclick={executeCircularSearch}
            disabled={isLoading}
          >
            {#if isLoading}
              <span class="animate-spin text-sm">↻</span>
              <span>CALCULATING ITINERARIES...</span>
            {:else}
              <span>OPTIMIZE CIRCULAR LOOPS</span>
            {/if}
          </button>
        </div>

        <!-- Right Content Area (Loops Table & Detailed Itinerary Inspection) -->
        <div class="flex-1 flex flex-col min-h-0 bg-[#070a0f]/90 overflow-hidden">
          
          <!-- Top Sort & Metric Summary Bar -->
          <div class="p-3 border-b border-[var(--hud-orange)]/30 flex flex-wrap items-center justify-between gap-2 bg-black/30 text-xs">
            <div class="flex items-center space-x-2 text-[var(--ed-orange-dim)]">
              <span>FOUND:</span>
              <span class="text-white font-bold">{sortedLoops.length} CIRCULAR ITINERARIES</span>
            </div>

            <!-- Sort Buttons -->
            <div class="flex items-center space-x-1.5 text-[11px]">
              <span class="text-white/50 text-[10px]">SORT BY:</span>
              <button
                type="button"
                class="px-2 py-0.5 rounded border transition-colors {sortBy === 'crPerHour' ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]' : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'}"
                onclick={() => {
                  if (sortBy === 'crPerHour') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                  else { sortBy = 'crPerHour'; sortDir = 'desc'; }
                }}
              >
                Cr / Hour {sortBy === 'crPerHour' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded border transition-colors {sortBy === 'totalNetProfitCr' ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]' : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'}"
                onclick={() => {
                  if (sortBy === 'totalNetProfitCr') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                  else { sortBy = 'totalNetProfitCr'; sortDir = 'desc'; }
                }}
              >
                Round Profit {sortBy === 'totalNetProfitCr' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded border transition-colors {sortBy === 'totalRoundTripMinutes' ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]' : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'}"
                onclick={() => {
                  if (sortBy === 'totalRoundTripMinutes') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                  else { sortBy = 'totalRoundTripMinutes'; sortDir = 'asc'; }
                }}
              >
                Duration {sortBy === 'totalRoundTripMinutes' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          {#if errorMsg}
            <div class="m-3 p-3 rounded bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          {/if}

          <!-- Itinerary Grid / Selection -->
          <div class="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-[var(--hud-orange)]/20 overflow-hidden">
            
            <!-- Left Itineraries List -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              {#if sortedLoops.length === 0 && !isLoading}
                <div class="p-8 text-center text-white/40 space-y-2">
                  <div class="text-2xl">🔄</div>
                  <div>No circular trade loops found matching criteria.</div>
                  <div class="text-[10px]">Try increasing Max Jump Range or setting Landing Pad to Medium / Any.</div>
                </div>
              {:else}
                {#each sortedLoops as loop (loop.id)}
                  <button
                    type="button"
                    class="w-full text-left p-3 rounded border transition-all cursor-pointer relative overflow-hidden {selectedLoop?.id === loop.id
                      ? 'bg-[var(--hud-orange)]/15 border-[var(--hud-orange)] shadow-[0_0_12px_rgba(255,113,0,0.2)]'
                      : 'bg-black/30 border-white/10 hover:border-[var(--hud-orange)]/40 hover:bg-black/50'}"
                    onclick={() => (selectedLoop = loop)}
                  >
                    <!-- Header Info -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/20">
                          {loop.hopsCount}-HOP LOOP
                        </span>
                        <span class="text-xs font-bold text-white">
                          {loop.originSystem} ({loop.originStation})
                        </span>
                      </div>

                      <div class="text-right">
                        <div class="text-xs font-bold text-emerald-400">
                          +{formatCredits(loop.crPerHour)} Cr/hr
                        </div>
                        <div class="text-[10px] text-white/60">
                          {formatCredits(loop.totalNetProfitCr)} Cr / round
                        </div>
                      </div>
                    </div>

                    <!-- Legs Summary Pills -->
                    <div class="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {#each loop.legs as leg, idx}
                        <div class="px-2 py-1 rounded bg-black/50 border border-white/15 flex items-center space-x-1">
                          <span class="text-[var(--hud-amber)] font-bold">Leg {idx + 1}:</span>
                          <span class="text-white">{leg.commodityName}</span>
                          <span class="text-white/40">→</span>
                          <span class="text-[var(--hud-orange)]">{leg.toStation}</span>
                          <span class="text-emerald-400 font-mono">+{formatCredits(leg.legNetProfit)}</span>
                        </div>
                      {/each}
                    </div>

                    <!-- Flight Stats & Fuel Stop Badge -->
                    <div class="mt-2 flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
                      <div class="flex items-center space-x-3">
                        <span>{loop.totalDistanceLy} Ly total ({loop.totalJumps} jumps)</span>
                        <span>⏱ ~{loop.totalRoundTripMinutes} min round trip</span>
                      </div>
                      {#if loop.fuelStopRequired}
                        <span class="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
                          ⛽ FUEL STOP ADVISORY
                        </span>
                      {/if}
                    </div>
                  </button>
                {/each}
              {/if}
            </div>

            <!-- Right Detail Panel: Step-by-Step Navigation & Economic Breakdown -->
            {#if selectedLoop}
              <div class="w-full md:w-96 p-4 overflow-y-auto space-y-4 bg-black/60 text-xs">
                
                <!-- Selected Loop Overview Card -->
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/40 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="hud-data-label text-[10px] text-[var(--hud-amber)] font-bold uppercase">
                      ROUND TRIP METRICS
                    </span>
                    <span class="text-[10px] font-bold text-emerald-400">
                      EFFICIENCY SCORE
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-center pt-1">
                    <div class="p-2 rounded bg-black/40 border border-emerald-500/30">
                      <div class="text-[10px] text-emerald-400/80">TRUE Cr/HOUR</div>
                      <div class="text-sm font-bold text-emerald-400">
                        {formatCredits(selectedLoop.crPerHour)}
                      </div>
                    </div>
                    <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/30">
                      <div class="text-[10px] text-[var(--hud-orange)]/80">PROFIT / ROUND</div>
                      <div class="text-sm font-bold text-white">
                        {formatCredits(selectedLoop.totalNetProfitCr)}
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 text-white/70">
                    <div class="bg-black/30 p-1 rounded">
                      <div class="text-white/40">DURATION</div>
                      <div class="font-bold text-white">~{selectedLoop.totalRoundTripMinutes}m</div>
                    </div>
                    <div class="bg-black/30 p-1 rounded">
                      <div class="text-white/40">DISTANCE</div>
                      <div class="font-bold text-white">{selectedLoop.totalDistanceLy} Ly</div>
                    </div>
                    <div class="bg-black/30 p-1 rounded">
                      <div class="text-white/40">PROFIT / TON</div>
                      <div class="font-bold text-emerald-400">+{formatCredits(selectedLoop.profitPerTonPerRound)}</div>
                    </div>
                  </div>
                </div>

                <!-- Step-by-Step Navigation Instructions Header -->
                <div class="space-y-1">
                  <span class="hud-data-label text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
                    STEP-BY-STEP FLIGHT INSTRUCTIONS
                  </span>
                  <p class="text-[10px] text-white/50">
                    Follow legs consecutively to maximize trade loop momentum.
                  </p>
                </div>

                <!-- Leg by Leg Flight Plan Cards -->
                <div class="space-y-3">
                  {#each selectedLoop.legs as leg, idx}
                    <div class="p-3 rounded bg-black/40 border border-white/15 space-y-2 relative">
                      <!-- Leg Header -->
                      <div class="flex items-center justify-between">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--hud-orange)] text-black">
                          LEG {idx + 1} OF {selectedLoop.legs.length}
                        </span>
                        <span class="text-xs font-bold text-emerald-400">
                          +{formatCredits(leg.legNetProfit)} Cr
                        </span>
                      </div>

                      <!-- Navigation Action Instruction -->
                      <div class="p-2 rounded bg-black/60 border border-[var(--hud-orange)]/30 text-[11px] leading-relaxed text-white">
                        <span class="text-[var(--hud-amber)] font-bold">INSTRUCTION:</span>
                        <div>{leg.navigationInstruction}</div>
                      </div>

                      <!-- Commodities & Price Details -->
                      <div class="grid grid-cols-2 gap-2 text-[10px]">
                        <div class="p-1.5 rounded bg-black/30 border border-white/10">
                          <div class="text-white/50">BUY AT {leg.fromStation}:</div>
                          <div class="font-bold text-white">{formatCredits(leg.buyPrice)} Cr/T</div>
                          <div class="text-[9px] text-white/40">Pad: {leg.fromPadSize} | {leg.fromDistanceLs} Ls</div>
                        </div>
                        <div class="p-1.5 rounded bg-black/30 border border-white/10">
                          <div class="text-white/50">SELL AT {leg.toStation}:</div>
                          <div class="font-bold text-emerald-400">{formatCredits(leg.sellPrice)} Cr/T</div>
                          <div class="text-[9px] text-white/40">Pad: {leg.toPadSize} | {leg.toDistanceLs} Ls</div>
                        </div>
                      </div>

                      <!-- Leg Telemetry Readout -->
                      <div class="flex items-center justify-between text-[10px] text-white/60 pt-1 border-t border-white/5">
                        <span>{leg.unitsTraded} Tons Traded</span>
                        <span>⏱ ~{leg.legDurationMinutes} min ({leg.jumpsCount} {leg.jumpsCount > 1 ? 'jumps' : 'jump'})</span>
                      </div>

                      <!-- Fuel Stop Warning if needed -->
                      {#if leg.needsFuelStop}
                        <div class="p-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300 flex items-center space-x-1">
                          <span>⛽</span>
                          <span>Fuel scoop star or station refuel required on this leg.</span>
                        </div>
                      {/if}

                      <!-- Action Button: Plot Route or Focus -->
                      <div class="flex items-center space-x-1.5 pt-1">
                        <button
                          type="button"
                          class="flex-1 py-1 px-2 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/60 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)] hover:text-black font-bold text-[10px] transition-all flex items-center justify-center space-x-1"
                          onclick={() => {
                            if (onPlotRoute) onPlotRoute(leg.toSystem);
                          }}
                        >
                          <span>🗺</span>
                          <span>PLOT TO {leg.toSystem}</span>
                        </button>
                        {#if leg.toCoords}
                          <button
                            type="button"
                            class="py-1 px-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 text-[10px] transition-colors"
                            onclick={() => {
                              if (onFocusSystem && leg.toCoords) onFocusSystem(leg.toCoords, leg.toSystem);
                            }}
                          >
                            <span>🎯 FOCUS</span>
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Master Itinerary Action -->
                <button
                  type="button"
                  class="w-full py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                  onclick={() => {
                    if (onPlotRoute && selectedLoop?.legs[0]) {
                      onPlotRoute(selectedLoop.legs[0].toSystem);
                    }
                  }}
                >
                  <span>🚀</span>
                  <span>ENGAGE TRADE LOOP (LEG 1)</span>
                </button>

              </div>
            {/if}
          </div>
        </div>

      </div>

      <!-- Footer Bar -->
      <div class="px-5 py-2.5 border-t border-[var(--hud-orange)]/30 bg-black/80 flex items-center justify-between text-[11px] text-[var(--ed-orange-dim)]">
        <div class="flex items-center space-x-4">
          <span>Non-linear SC: t ≈ 35 + 8.5 · d^0.33 s</span>
          <span>Docking: 60s</span>
          <span>Jump: 45s</span>
        </div>
        <div>
          <span>Project Atlas • Stage 6.3</span>
        </div>
      </div>
    </div>
  </div>
{/if}
