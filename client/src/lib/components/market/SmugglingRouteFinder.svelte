<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type LandingPadSize,
    type SecurityLevel,
    type SmugglingQuery,
    type SmugglingRouteOpportunity,
    SHIP_CARGO_PRESETS,
    formatCredits,
  } from '$engine/market_engine';
  import { ananke } from '$engine/ananke_client';

  interface Props {
    isOpen: boolean;
    referenceSystem?: string;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
    onOpenMarketTable?: () => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Sol',
    onClose,
    onPlotRoute,
    onFocusSystem,
    onOpenMarketTable,
  }: Props = $props();

  // Query Parameters
  let currentSystem = $state<string>('Sol');
  let currentStation = $state<string>('');
  let cargoCapacity = $state<number>(728);
  let budgetCredits = $state<number>(25000000);
  let maxJumpRangeLy = $state<number>(35.0);
  let padSize = $state<LandingPadSize | 'Any'>('Large');
  let includePlanetary = $state<boolean>(true);
  let maxAgeHours = $state<number>(24);
  let targetJurisdiction = $state<'All' | 'Non-Anarchy Black Markets' | 'Anarchy Safe Havens'>('All');
  let illicitCommodityFilter = $state<string>('');
  let cargoCondition = $state<'Legal Purchase' | 'Stolen / Salvaged'>('Legal Purchase');
  let selectedPreset = $state<string>('cutter_shielded');

  // Results & UI State
  let opportunities = $state<SmugglingRouteOpportunity[]>([]);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);
  let selectedRoute = $state<SmugglingRouteOpportunity | null>(null);
  let sortBy = $state<'netProfitPerTon' | 'totalNetProfit' | 'scanningRiskFactor' | 'estimatedCrPerHour'>('netProfitPerTon');
  let sortDir = $state<'asc' | 'desc'>('desc');

  function handleSelectPreset(presetId: string) {
    selectedPreset = presetId;
    const preset = SHIP_CARGO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      cargoCapacity = preset.defaultCargoTons;
      padSize = preset.padSize;
    }
  }

  $effect(() => {
    if (referenceSystem && referenceSystem.trim().length > 0) {
      currentSystem = referenceSystem;
    }
  });

  async function executeSmugglingSearch() {
    isLoading = true;
    errorMsg = null;
    try {
      const query: SmugglingQuery = {
        currentSystem: currentSystem.trim() || 'Sol',
        currentStation: currentStation.trim() || undefined,
        cargoCapacity: Number(cargoCapacity) || 728,
        budgetCredits: Number(budgetCredits) || 10000000,
        maxJumpRangeLy: Number(maxJumpRangeLy) || 35.0,
        padSize,
        includePlanetary,
        maxAgeHours: Number(maxAgeHours) || 0,
        targetJurisdiction,
        illicitCommodityFilter: illicitCommodityFilter || undefined,
        cargoCondition,
      };

      const results = await ananke.getSmugglingRoutes(query);
      opportunities = results;
      if (results.length > 0) {
        selectedRoute = results[0];
      } else {
        selectedRoute = null;
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Failed to calculate smuggling trade routes.';
    } finally {
      isLoading = false;
    }
  }

  let sortedOpportunities = $derived.by(() => {
    const arr = [...opportunities];
    arr.sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'netProfitPerTon':
          diff = a.netProfitPerTon - b.netProfitPerTon;
          break;
        case 'totalNetProfit':
          diff = a.totalNetProfit - b.totalNetProfit;
          break;
        case 'scanningRiskFactor':
          diff = a.scanningRiskFactor - b.scanningRiskFactor;
          break;
        case 'estimatedCrPerHour':
          diff = a.estimatedCrPerHour - b.estimatedCrPerHour;
          break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return arr;
  });

  onMount(() => {
    if (isOpen) {
      executeSmugglingSearch();
    }
  });

  $effect(() => {
    if (isOpen && opportunities.length === 0 && !isLoading) {
      executeSmugglingSearch();
    }
  });

  function getSecurityBadge(sec: SecurityLevel): { label: string; bg: string; text: string; border: string } {
    switch (sec) {
      case 'Anarchy':
        return { label: 'ANARCHY', bg: 'bg-purple-950/80', text: 'text-purple-300 font-bold', border: 'border-purple-500/60' };
      case 'Low':
        return { label: 'LOW SEC', bg: 'bg-amber-950/70', text: 'text-amber-300 font-bold', border: 'border-amber-500/50' };
      case 'Medium':
        return { label: 'MED SEC', bg: 'bg-blue-950/70', text: 'text-blue-300', border: 'border-blue-500/50' };
      case 'High':
        return { label: 'HIGH SEC', bg: 'bg-red-950/80', text: 'text-rose-300 font-bold', border: 'border-red-500/60' };
    }
  }

  function getPatrolBadge(density: string): { label: string; color: string } {
    switch (density) {
      case 'None':
        return { label: 'ZERO PATROL', color: 'text-emerald-400' };
      case 'Sparse':
        return { label: 'SPARSE PATROL', color: 'text-amber-300' };
      case 'Moderate':
        return { label: 'MODERATE PATROL', color: 'text-orange-400' };
      case 'Heavy':
      case 'Extreme':
        return { label: 'HEAVY POLICE WINGS', color: 'text-rose-400 font-bold' };
      default:
        return { label: density, color: 'text-white/70' };
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md select-none animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-label="Black Market Smuggling Route Triangulator"
  >
    <!-- Main Modal -->
    <div
      class="relative w-full max-w-7xl h-[94vh] max-h-[960px] bg-[#06080e]/95 border-2 border-purple-500/50 rounded-lg flex flex-col shadow-[0_0_60px_rgba(168,85,247,0.25)] overflow-hidden font-mono"
    >
      <!-- Top Title Bar -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-black/40 to-transparent"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="#c084fc" />
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white tracking-widest flex items-center space-x-2">
              <span>BLACK MARKET SMUGGLING TRIANGULATOR</span>
              <span class="text-xs px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/50">
                STAGE 6.4 // LAWLESS SAFE HAVENS
              </span>
            </h2>
            <p class="text-[10px] text-white/50 tracking-wider">
              CONTRABAND ARBITRAGE, JURISDICTION SECURITY ENFORCEMENT & SILENT RUNNING RISK METRICS
            </p>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center space-x-2.5">
          {#if onOpenMarketTable}
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/50 hover:bg-[var(--hud-orange)] hover:text-black font-bold transition-all flex items-center space-x-1 cursor-pointer"
              onclick={() => {
                onClose();
                onOpenMarketTable();
              }}
              title="Return to Commodity Market Explorer"
            >
              <span>📊</span>
              <span>MARKET</span>
            </button>
          {/if}
          <button
            type="button"
            class="px-3 py-1 rounded text-xs text-purple-300 border border-purple-500/40 hover:bg-purple-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            onclick={executeSmugglingSearch}
            title="Recalculate smuggling routes"
          >
            <span class={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>{isLoading ? 'SCANNING...' : 'SCAN ROUTES'}</span>
          </button>
          <button
            type="button"
            class="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onclick={onClose}
            aria-label="Close Smuggling Triangulator"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      <!-- Main Layout Body (Left Form + Right Results & Dossier) -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <!-- Left Side: Smuggling Route Query Form (lg:col-span-4) -->
        <div class="lg:col-span-4 border-r border-purple-500/30 p-4 overflow-y-auto space-y-4 bg-black/40">
          <div class="flex items-center justify-between pb-2 border-b border-purple-500/20">
            <span class="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span>🏴‍☠️</span>
              <span>SMUGGLING PARAMETERS</span>
            </span>
            <span class="text-[9px] text-white/40">ANANKE :8000</span>
          </div>

          <!-- Ship Cargo Preset Selector -->
          <div class="space-y-1">
            <span class="text-[10px] text-white/70 block uppercase font-bold">SHIP CHASSIS PRESET:</span>
            <div class="grid grid-cols-3 gap-1">
              {#each SHIP_CARGO_PRESETS.slice(0, 6) as preset}
                <button
                  type="button"
                  class="px-1.5 py-1 text-[9px] uppercase rounded border transition-all text-center {selectedPreset === preset.id
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-sm'
                    : 'bg-black/40 border-white/10 text-white/50 hover:border-white/30'}"
                  onclick={() => handleSelectPreset(preset.id)}
                >
                  <div class="truncate">{preset.name.split(' ')[0]}</div>
                  <div class="text-[8px] text-white/40">{preset.defaultCargoTons}T ({preset.padSize})</div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Cargo Origin & Location -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="smuggle-curr-sys" class="text-[10px] text-white/70 block mb-0.5">ORIGIN SYSTEM</label>
              <input
                id="smuggle-curr-sys"
                type="text"
                bind:value={currentSystem}
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
                placeholder="e.g. Sol, Cubeo, Maia"
              />
            </div>
            <div>
              <label for="smuggle-curr-stn" class="text-[10px] text-white/70 block mb-0.5">SOURCE STATION (OPT)</label>
              <input
                id="smuggle-curr-stn"
                type="text"
                bind:value={currentStation}
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
                placeholder="Any"
              />
            </div>
          </div>

          <!-- Cargo Condition: Stolen vs Legal Purchase -->
          <div class="space-y-1">
            <span class="text-[10px] text-white/70 block uppercase font-bold">CARGO PROVENANCE & DISCOUNTS:</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                class="py-1.5 px-2 rounded text-[10px] uppercase font-bold border transition-all text-center {cargoCondition === 'Legal Purchase'
                  ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-sm'
                  : 'bg-black/30 border-white/10 text-white/40 hover:border-white/20'}"
                onclick={() => (cargoCondition = 'Legal Purchase')}
              >
                <div>Legal Purchase</div>
                <div class="text-[8px] font-normal text-white/50">Buy low at source station</div>
              </button>
              <button
                type="button"
                class="py-1.5 px-2 rounded text-[10px] uppercase font-bold border transition-all text-center {cargoCondition === 'Stolen / Salvaged'
                  ? 'bg-rose-600/30 border-rose-400 text-rose-200 shadow-sm'
                  : 'bg-black/30 border-white/10 text-white/40 hover:border-white/20'}"
                onclick={() => (cargoCondition = 'Stolen / Salvaged')}
              >
                <div>Stolen / Salvaged</div>
                <div class="text-[8px] font-normal text-rose-300/70">0 Cr cost // Fence at 75% Avg</div>
              </button>
            </div>
          </div>

          <!-- Target Jurisdiction Filter -->
          <div class="space-y-1">
            <span class="text-[10px] text-white/70 block uppercase font-bold">TARGET DESTINATION JURISDICTION:</span>
            <div class="grid grid-cols-3 gap-1">
              {#each (['All', 'Non-Anarchy Black Markets', 'Anarchy Safe Havens'] as const) as jur}
                <button
                  type="button"
                  class="py-1 px-1 rounded text-[9px] uppercase border transition-all text-center {targetJurisdiction === jur
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                    : 'bg-black/30 border-white/10 text-white/40 hover:border-white/20'}"
                  onclick={() => (targetJurisdiction = jur)}
                >
                  {jur === 'Non-Anarchy Black Markets' ? 'Black Markets' : jur === 'Anarchy Safe Havens' ? 'Anarchy Havens' : 'All Targets'}
                </button>
              {/each}
            </div>
          </div>

          <!-- Commodity Filter -->
          <div>
            <label for="smuggle-comm-filt" class="text-[10px] text-white/70 block mb-0.5">ILLICIT COMMODITY FILTER</label>
            <select
              id="smuggle-comm-filt"
              bind:value={illicitCommodityFilter}
              class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value="">All Illicit Goods (Weapons, Slaves, Narcotics, Tobacco)</option>
              <option value="Battle Weapons">Battle Weapons (Corporate/Democracy prohibited)</option>
              <option value="Personal Weapons">Personal Weapons</option>
              <option value="Imperial Slaves">Imperial Slaves (Empire legal, Fed/Alliance prohibited)</option>
              <option value="Slaves">Standard Slaves (Universally prohibited outside Anarchy)</option>
              <option value="Narcotics">Narcotics</option>
              <option value="Combat Stabilisers">Combat Stabilisers</option>
              <option value="Tobacco">Tobacco</option>
            </select>
          </div>

          <!-- Cargo Specs -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="smuggle-cargo-cap" class="text-[10px] text-white/70 block mb-0.5">CARGO CAPACITY (T)</label>
              <input
                id="smuggle-cargo-cap"
                type="number"
                bind:value={cargoCapacity}
                min="1"
                max="1000"
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label for="smuggle-budget" class="text-[10px] text-white/70 block mb-0.5">BUDGET (CR)</label>
              <input
                id="smuggle-budget"
                type="number"
                bind:value={budgetCredits}
                min="0"
                step="1000000"
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <!-- FSD Jump Range & Landing Pad -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="smuggle-jump-rng" class="text-[10px] text-white/70 block mb-0.5">MAX JUMP RANGE (LY)</label>
              <input
                id="smuggle-jump-rng"
                type="number"
                bind:value={maxJumpRangeLy}
                step="0.5"
                min="5"
                max="90"
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label for="smuggle-pad-size" class="text-[10px] text-white/70 block mb-0.5">PAD SIZE REQUIREMENT</label>
              <select
                id="smuggle-pad-size"
                bind:value={padSize}
                class="w-full px-2 py-1.5 rounded bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="Large">Large Pad (Cutter/Type-9/Anaconda)</option>
                <option value="Medium">Medium Pad (Python/Krait/Chieftain)</option>
                <option value="Small">Small Pad (Cobra/Viper/Hauler)</option>
                <option value="Any">Any Landing Pad</option>
              </select>
            </div>
          </div>

          <!-- Planetary Ports Toggle -->
          <label class="flex items-center space-x-2 text-xs text-white/80 cursor-pointer pt-1">
            <input
              type="checkbox"
              bind:checked={includePlanetary}
              class="accent-purple-500 rounded cursor-pointer"
            />
            <span>Include Planetary Surface Outposts</span>
          </label>

          <!-- Submit Button -->
          <button
            type="button"
            class="w-full py-2.5 rounded bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-purple-900/40 border border-purple-400/50 cursor-pointer transition-all flex items-center justify-center space-x-2"
            onclick={executeSmugglingSearch}
            disabled={isLoading}
          >
            <span>{isLoading ? 'CALCULATING JURISDICTIONS...' : 'TRIANGULATE SMUGGLING CORRIDORS'}</span>
          </button>
        </div>

        <!-- Right Side: Results & Tactical Dossier (lg:col-span-8) -->
        <div class="lg:col-span-8 flex flex-col h-full overflow-hidden bg-black/20">
          <!-- Sort & Summary Header -->
          <div class="p-3 border-b border-purple-500/30 bg-purple-950/20 flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs text-white flex items-center space-x-2">
              <span class="font-bold text-purple-300">{sortedOpportunities.length}</span>
              <span class="text-white/60">CONTRABAND CORRIDORS FOUND</span>
            </div>

            <!-- Sort Bar -->
            <div class="flex items-center space-x-1.5 text-[10px]">
              <span class="text-white/40">SORT BY:</span>
              {#each (['netProfitPerTon', 'totalNetProfit', 'scanningRiskFactor', 'estimatedCrPerHour'] as const) as field}
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border transition-colors {sortBy === field
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                    : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70'}"
                  onclick={() => {
                    if (sortBy === field) {
                      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                      sortBy = field;
                      sortDir = field === 'scanningRiskFactor' ? 'asc' : 'desc';
                    }
                  }}
                >
                  {field === 'netProfitPerTon' ? 'Profit/Ton' : field === 'totalNetProfit' ? 'Total Profit' : field === 'scanningRiskFactor' ? 'Scan Risk' : 'Cr/Hour'}
                  {sortBy === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              {/each}
            </div>
          </div>

          <!-- Scrollable Opportunities List -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
            {#if isLoading}
              <div class="flex flex-col items-center justify-center h-48 space-y-3 text-purple-400 font-mono">
                <div class="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                <div class="text-xs tracking-wider">TRIANGULATING INTERSTELLAR JURISDICTIONS & BLACK MARKETS...</div>
              </div>
            {:else if errorMsg}
              <div class="p-4 rounded border border-rose-500/50 bg-rose-950/30 text-rose-300 text-xs font-mono">
                {errorMsg}
              </div>
            {:else if sortedOpportunities.length === 0}
              <div class="flex flex-col items-center justify-center h-48 text-white/40 font-mono text-xs space-y-2">
                <span>NO SMUGGLING CORRIDORS MATCH CRITERIA.</span>
                <span class="text-[10px]">Increase jump range or switch target jurisdiction filter.</span>
              </div>
            {:else}
              {#each sortedOpportunities as opp (opp.id)}
                {@const isSelected = selectedRoute?.id === opp.id}
                {@const secBadge = getSecurityBadge(opp.targetSecurity)}
                {@const patrol = getPatrolBadge(opp.policePatrolDensity)}

                <div
                  role="button"
                  tabindex="0"
                  class="w-full text-left p-3.5 rounded border transition-all cursor-pointer block {isSelected
                    ? 'bg-purple-950/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-black/50 border-white/10 hover:border-purple-500/50 hover:bg-black/70'}"
                  onclick={() => (selectedRoute = opp)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectedRoute = opp;
                    }
                  }}
                >
                  <!-- Top Row: Commodity & Profit Badges -->
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center space-x-2">
                      <span class="text-sm font-bold text-white tracking-wide">{opp.commodityName}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold {opp.isStolen ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'}">
                        {opp.isStolen ? 'STOLEN FENCE' : 'ILLICIT CONTRABAND'}
                      </span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded border {secBadge.bg} {secBadge.text} {secBadge.border}">
                        {secBadge.label}
                      </span>
                    </div>

                    <div class="text-right">
                      <div class="text-sm font-bold text-emerald-400 font-mono">
                        +{formatCredits(opp.netProfitPerTon)} <span class="text-[10px] text-emerald-400/70">Cr/T</span>
                      </div>
                      <div class="text-[10px] text-white/50">
                        Net: <span class="text-white font-bold">{formatCredits(opp.totalNetProfit)} Cr</span>
                      </div>
                    </div>
                  </div>

                  <!-- Middle Row: Source -> Target Leg Details -->
                  <div class="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <!-- Source Acquisition -->
                    <div class="p-2 rounded bg-black/40 border border-white/5">
                      <div class="text-[9px] text-white/40 uppercase font-bold flex items-center justify-between">
                        <span>ACQUIRE AT (ORIGIN)</span>
                        <span class="text-[8px] {opp.sourceLegality === 'Legal' ? 'text-emerald-400' : 'text-amber-300'}">{opp.sourceLegality}</span>
                      </div>
                      <div class="font-bold text-white truncate">{opp.sourceStation}</div>
                      <div class="text-[10px] text-white/60">{opp.sourceSystem} · {opp.sourceDistanceLs} Ls · {opp.sourcePadSize} Pad</div>
                      <div class="text-[10px] text-purple-300 mt-1">
                        Buy: {opp.sourceBuyPrice > 0 ? formatCredits(opp.sourceBuyPrice) + ' Cr' : '0 Cr (Salvaged)'}
                      </div>
                    </div>

                    <!-- Target Black Market Fence -->
                    <div class="p-2 rounded bg-black/40 border border-white/5">
                      <div class="text-[9px] text-white/40 uppercase font-bold flex items-center justify-between">
                        <span>FENCE AT (DESTINATION)</span>
                        <span class="text-[8px] {opp.targetLegality.includes('Prohibited') ? 'text-rose-400 font-bold' : 'text-purple-300'}">{opp.targetLegality}</span>
                      </div>
                      <div class="font-bold text-white truncate">{opp.targetStation}</div>
                      <div class="text-[10px] text-white/60">{opp.targetSystem} · {opp.targetDistanceLs} Ls · {opp.targetPadSize} Pad</div>
                      <div class="text-[10px] text-emerald-300 mt-1">
                        Black Market: {formatCredits(opp.targetBlackMarketPrice)} Cr (+{formatCredits(opp.grossProfitPerTon)} Cr/T)
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Threat Telemetry Bar -->
                  <div class="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] gap-2">
                    <div class="flex items-center space-x-3">
                      <span class="text-white/50">{opp.jumpDistanceLy} Ly ({opp.jumpsCount} {opp.jumpsCount > 1 ? 'jumps' : 'jump'})</span>
                      <span class="text-white/30">|</span>
                      <span class={patrol.color}>{patrol.label}</span>
                      <span class="text-white/30">|</span>
                      <span class="text-white/70">
                        Scan Risk:
                        <span class="font-bold {opp.scanningRiskFactor > 60 ? 'text-rose-400' : opp.scanningRiskFactor > 30 ? 'text-amber-300' : 'text-emerald-400'}">
                          {opp.scanningRiskFactor}%
                        </span>
                      </span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <span class="text-white/60">Efficiency: <span class="text-purple-300 font-bold font-mono">{formatCredits(opp.estimatedCrPerHour)} Cr/hr</span></span>
                      {#if onPlotRoute}
                        <button
                          type="button"
                          class="px-2 py-0.5 rounded bg-purple-600/30 border border-purple-500/60 text-purple-200 hover:bg-purple-600 hover:text-white font-bold text-[9px] uppercase cursor-pointer transition-all"
                          onclick={(e) => {
                            e.stopPropagation();
                            onPlotRoute(opp.targetSystem);
                          }}
                        >
                          Plot Nav
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>

          <!-- Bottom Tactical Silent Running & Stealth Protocol Drawer (When Selected) -->
          {#if selectedRoute}
            <div class="border-t border-purple-500/30 p-3 bg-purple-950/30 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-purple-300">
                <span class="flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>STEALTH RUNNER TACTICAL PROTOCOL // {selectedRoute.targetStation} ({selectedRoute.targetSystem})</span>
                </span>
                <span class="text-[10px] text-white/50">
                  Potential Fine: {formatCredits(selectedRoute.fineRiskCreditsPerTon)} Cr/T
                </span>
              </div>

              <!-- Tips Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                {#each selectedRoute.smugglingTips as tip}
                  <div class="p-2 rounded bg-black/60 border border-purple-500/20 text-white/80 flex items-start space-x-1.5">
                    <span class="text-purple-400 font-bold">▶</span>
                    <span>{tip}</span>
                  </div>
                {/each}
              </div>

              <!-- Action Bar -->
              <div class="flex items-center justify-end space-x-2 pt-1">
                {#if onFocusSystem && selectedRoute.targetCoords}
                  <button
                    type="button"
                    class="px-3 py-1 rounded bg-black/50 border border-purple-500/40 text-purple-200 hover:bg-purple-500/20 text-xs font-bold uppercase transition-all cursor-pointer"
                    onclick={() => {
                      if (onFocusSystem && selectedRoute?.targetCoords) {
                        onFocusSystem(selectedRoute.targetCoords, selectedRoute.targetSystem);
                      }
                    }}
                  >
                    Focus System 3D
                  </button>
                {/if}
                {#if onPlotRoute}
                  <button
                    type="button"
                    class="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold uppercase transition-all shadow-md shadow-purple-900/50 cursor-pointer"
                    onclick={() => {
                      if (onPlotRoute && selectedRoute) {
                        onPlotRoute(selectedRoute.targetSystem);
                      }
                    }}
                  >
                    Lock Smuggling Route
                  </button>
                {/if}
              </div>
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
    animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>
