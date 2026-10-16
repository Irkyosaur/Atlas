<script lang="ts">
  // Location: atlas/client/src/lib/components/underworld/AnarchyHavensNavigator.svelte
  // Bribe Stations & Anarchy Havens Navigator (Phase 13, Stage 13.4)
  // Compliant with Cobra HUD design system, Svelte 5 runes, passive telemetry, and FDF EULA.

  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type LandingPadSize,
    type SecurityRating,
    type RegionCategory,
    type AnarchyHavenStation,
    type SafeRoutePlotResult,
    CANONICAL_ANARCHY_HAVENS,
    filterAnarchyHavens,
    plotSafeAnarchyRoute,
    calculateEuclideanDistanceLy,
  } from '$engine/anarchy_havens_engine';
  import { ananke } from '$engine/ananke_client';

  interface Props {
    isOpen: boolean;
    referenceSystem?: string;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Deciat',
    onClose,
    onPlotRoute,
  }: Props = $props();

  // Active view tab
  let activeTab = $state<'havens' | 'smuggling' | 'corridor'>('havens');

  // Query and filters
  let querySystem = $state<string>(referenceSystem);
  let selectedRegion = $state<'ALL' | RegionCategory>('ALL');
  let selectedPadSize = $state<'ANY' | LandingPadSize>('ANY');
  let requireBlackMarket = $state<boolean>(true);
  let requireShipyard = $state<boolean>(false);
  let requireOutfitting = $state<boolean>(false);
  let requireRearmAndRepair = $state<boolean>(true); // Verification criterion: full re-arm and repair
  let requireInterstellarFactors = $state<boolean>(false);
  let maxArrivalDistanceLs = $state<number>(3000);
  let maxDistanceLy = $state<number>(250);
  let pirateActivityFilter = $state<'ALL' | 'High' | 'Severe' | 'Extreme' | 'Controlled Havens'>('ALL');
  let searchQuery = $state<string>('');

  // Selected station for details
  let selectedHaven = $state<AnarchyHavenStation | null>(null);

  // Safe route planner corridor state
  let corridorOrigin = $state<string>(referenceSystem);
  let corridorDest = $state<string>('Harma');
  let shipJumpRangeLy = $state<number>(35.0);
  let plottedCorridor = $state<SafeRoutePlotResult | null>(null);
  let isPlottingCorridor = $state<boolean>(false);

  // Raw and filtered stations
  let isLoadingHavens = $state<boolean>(false);
  let rawHavensList = $state<AnarchyHavenStation[]>([]);

  // Update querySystem when referenceSystem changes
  $effect(() => {
    if (referenceSystem && !querySystem) {
      querySystem = referenceSystem;
      corridorOrigin = referenceSystem;
    }
  });

  async function loadHavens(): Promise<void> {
    isLoadingHavens = true;
    try {
      rawHavensList = await ananke.getAnarchyHavens(querySystem);
    } catch {
      rawHavensList = CANONICAL_ANARCHY_HAVENS;
    } finally {
      isLoadingHavens = false;
      if (!selectedHaven && rawHavensList.length > 0) {
        selectedHaven = rawHavensList[0];
      }
    }
  }

  onMount(() => {
    loadHavens();
  });

  // Calculate reference coordinates dynamically
  let referenceCoords = $derived<{ x: number; y: number; z: number }>(() => {
    const found = rawHavensList.find(
      (s) => s.systemName.toLowerCase() === querySystem.trim().toLowerCase()
    );
    if (found) return found.systemCoords;
    if (querySystem.trim().toLowerCase() === 'deciat') {
      return { x: 122.625, y: -0.3125, z: -47.28125 };
    }
    if (querySystem.trim().toLowerCase() === 'sol') {
      return { x: 0, y: 0, z: 0 };
    }
    if (querySystem.trim().toLowerCase() === 'colonia') {
      return { x: -9530.5, y: -910.125, z: 19808.125 };
    }
    return { x: 0, y: 0, z: 0 };
  });

  // Filtered havens derived list
  let filteredHavens = $derived<AnarchyHavenStation[]>(() => {
    const filtered = filterAnarchyHavens(rawHavensList, {
      referenceCoords: referenceCoords(),
      region: selectedRegion,
      minPadSize: selectedPadSize,
      requireBlackMarket,
      requireShipyard,
      requireOutfitting,
      requireRearmAndRepair,
      requireInterstellarFactors,
      maxDistanceLy,
      maxArrivalLs: maxArrivalDistanceLs,
      pirateActivityFilter,
    });

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (s) =>
        s.stationName.toLowerCase().includes(q) ||
        s.systemName.toLowerCase().includes(q) ||
        s.controllingFaction.toLowerCase().includes(q) ||
        s.pirateSyndicate.toLowerCase().includes(q)
    );
  });

  // High-value smuggling aggregated catalog
  let highValueSmugglingList = $derived(() => {
    const items: Array<{
      station: AnarchyHavenStation;
      demand: import('$engine/anarchy_havens_engine').SmugglingDemandMarket;
    }> = [];

    for (const station of filteredHavens()) {
      for (const demand of station.highValueSmugglingDemands) {
        items.push({ station, demand });
      }
    }

    // Sort by profit margin descending
    return items.sort(
      (a, b) => b.demand.profitMarginPercent - a.demand.profitMarginPercent
    );
  });

  async function handlePlotCorridor(): Promise<void> {
    isPlottingCorridor = true;
    try {
      let origCoords = { x: 0, y: 0, z: 0 };
      let destCoords = { x: 104.75, y: -80.125, z: 27.6875 }; // Harma default

      const origSys = await ananke.getSystemByName(corridorOrigin);
      if (origSys) {
        origCoords = { x: origSys.x, y: origSys.y, z: origSys.z };
      } else if (corridorOrigin.toLowerCase() === 'deciat') {
        origCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
      }

      const destSys = await ananke.getSystemByName(corridorDest);
      if (destSys) {
        destCoords = { x: destSys.x, y: destSys.y, z: destSys.z };
      } else {
        const destHaven = rawHavensList.find(
          (h) => h.systemName.toLowerCase() === corridorDest.toLowerCase()
        );
        if (destHaven) destCoords = destHaven.systemCoords;
      }

      plottedCorridor = plotSafeAnarchyRoute(
        corridorOrigin,
        corridorDest,
        origCoords,
        destCoords,
        shipJumpRangeLy,
        rawHavensList
      );
    } catch {
      plottedCorridor = null;
    } finally {
      isPlottingCorridor = false;
    }
  }

  function handleSelectStation(station: AnarchyHavenStation): void {
    selectedHaven = station;
    corridorDest = station.systemName;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
  >
    <!-- Modal Window Container -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0b0c10] border-2 border-red-500/70 rounded-lg shadow-[0_0_40px_rgba(239,68,68,0.35)] overflow-hidden font-mono"
    >
      <!-- Top Title Bar -->
      <div
        class="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-red-950/80 via-black to-red-950/80 border-b border-red-500/50"
      >
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 rounded bg-red-600/25 border border-red-500 flex items-center justify-center text-red-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            ☠️
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-base sm:text-lg font-bold text-red-300 tracking-wider">
                ANARCHY HAVENS & LAWLESS STATIONS NAVIGATOR
              </h2>
              <span
                class="px-2 py-0.5 text-[10px] rounded bg-red-600/30 text-red-200 border border-red-500/60 font-bold animate-pulse"
              >
                STAGE 13.4
              </span>
              <span
                class="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              >
                ZERO POLICE SCAN RISK
              </span>
            </div>
            <p class="text-[11px] text-stone-400">
              Lawless pirate starports, zero Authority response, unmonitored docking bays & illicit cargo corridors.
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded text-stone-400 hover:text-red-400 hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/40"
          title="Close Navigator"
        >
          <Icon name="xmark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation Tabs & Reference System Bar -->
      <div
        class="flex flex-wrap items-center justify-between px-5 py-2.5 bg-black/60 border-b border-red-500/30 gap-3 text-xs"
      >
        <!-- Tabs -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            onclick={() => (activeTab = 'havens')}
            class="px-3.5 py-1.5 rounded transition-all flex items-center space-x-1.5 border {activeTab ===
            'havens'
              ? 'bg-red-600 text-black font-bold border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
              : 'text-stone-300 bg-black/40 border-stone-800 hover:border-red-500/50 hover:text-red-300'}"
          >
            <span>🏴 LAWLESS HAVENS</span>
            <span class="text-[10px] opacity-80">({filteredHavens().length})</span>
          </button>

          <button
            type="button"
            onclick={() => (activeTab = 'smuggling')}
            class="px-3.5 py-1.5 rounded transition-all flex items-center space-x-1.5 border {activeTab ===
            'smuggling'
              ? 'bg-red-600 text-black font-bold border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
              : 'text-stone-300 bg-black/40 border-stone-800 hover:border-red-500/50 hover:text-red-300'}"
          >
            <span>📦 HIGH-VALUE SMUGGLING</span>
            <span class="text-[10px] opacity-80">({highValueSmugglingList().length})</span>
          </button>

          <button
            type="button"
            onclick={() => (activeTab = 'corridor')}
            class="px-3.5 py-1.5 rounded transition-all flex items-center space-x-1.5 border {activeTab ===
            'corridor'
              ? 'bg-red-600 text-black font-bold border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
              : 'text-stone-300 bg-black/40 border-stone-800 hover:border-red-500/50 hover:text-red-300'}"
          >
            <span>🛡️ SAFE ROUTE CORRIDOR</span>
            {#if plottedCorridor}
              <span class="text-[10px] px-1 bg-black/50 text-emerald-300 rounded">
                {plottedCorridor.jumpCount} HOPS
              </span>
            {/if}
          </button>
        </div>

        <!-- Reference System & Quick Sync -->
        <div class="flex items-center space-x-2">
          <span class="text-stone-400 text-[11px]">REFERENCE SYSTEM:</span>
          <div class="relative flex items-center">
            <input
              type="text"
              bind:value={querySystem}
              onkeydown={(e) => e.key === 'Enter' && loadHavens()}
              placeholder="e.g. Deciat, Harma, Sol"
              class="px-2.5 py-1 w-36 sm:w-44 bg-black/80 border border-red-500/50 rounded text-stone-100 text-xs focus:border-red-400 focus:outline-none"
            />
            <button
              type="button"
              onclick={loadHavens}
              disabled={isLoadingHavens}
              class="ml-1.5 px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/50 text-[11px] font-bold"
            >
              {isLoadingHavens ? 'LOCATING...' : 'REFRESH'}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area based on Tab -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {#if activeTab === 'havens'}
          <!-- Filters Row -->
          <div
            class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 bg-red-950/20 border border-red-500/30 rounded text-xs"
          >
            <!-- Region Filter -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">REGION:</span>
              <select
                bind:value={selectedRegion}
                class="w-full bg-black/80 border border-red-500/40 rounded px-2 py-1 text-stone-200 focus:outline-none text-xs"
              >
                <option value="ALL">All Regions</option>
                <option value="Bubble">Core Bubble</option>
                <option value="Colonia">Colonia Region</option>
                <option value="Pleiades">Pleiades Nebula</option>
                <option value="Witch Head">Witch Head Nebula</option>
              </select>
            </div>

            <!-- Min Pad Size -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">MIN LANDING PAD:</span>
              <select
                bind:value={selectedPadSize}
                class="w-full bg-black/80 border border-red-500/40 rounded px-2 py-1 text-stone-200 focus:outline-none text-xs"
              >
                <option value="ANY">Any Pad (M / L)</option>
                <option value="L">Large Pad Only (L)</option>
              </select>
            </div>

            <!-- Full Rearm & Repair Toggle (Verification Standard) -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">RE-ARM & REPAIR:</span>
              <button
                type="button"
                onclick={() => (requireRearmAndRepair = !requireRearmAndRepair)}
                class="w-full py-1 px-2 rounded border text-center font-bold text-xs transition-colors {requireRearmAndRepair
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                  : 'bg-black/60 text-stone-400 border-stone-800'}"
              >
                {requireRearmAndRepair ? '✓ FULL FACILITY' : 'ANY SERVICES'}
              </button>
            </div>

            <!-- Shipyard Toggle -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">SHIPYARD:</span>
              <button
                type="button"
                onclick={() => (requireShipyard = !requireShipyard)}
                class="w-full py-1 px-2 rounded border text-center font-bold text-xs transition-colors {requireShipyard
                  ? 'bg-red-600/30 text-red-300 border-red-500'
                  : 'bg-black/60 text-stone-400 border-stone-800'}"
              >
                {requireShipyard ? '✓ SHIPYARD REQUIRED' : 'OPTIONAL'}
              </button>
            </div>

            <!-- Outfitting Toggle -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">OUTFITTING:</span>
              <button
                type="button"
                onclick={() => (requireOutfitting = !requireOutfitting)}
                class="w-full py-1 px-2 rounded border text-center font-bold text-xs transition-colors {requireOutfitting
                  ? 'bg-red-600/30 text-red-300 border-red-500'
                  : 'bg-black/60 text-stone-400 border-stone-800'}"
              >
                {requireOutfitting ? '✓ OUTFITTING REQUIRED' : 'OPTIONAL'}
              </button>
            </div>

            <!-- Interstellar Factors Toggle -->
            <div>
              <span class="text-stone-400 text-[10px] block mb-1">INTERSTELLAR FACTORS:</span>
              <button
                type="button"
                onclick={() => (requireInterstellarFactors = !requireInterstellarFactors)}
                class="w-full py-1 px-2 rounded border text-center font-bold text-xs transition-colors {requireInterstellarFactors
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500'
                  : 'bg-black/60 text-stone-400 border-stone-800'}"
              >
                {requireInterstellarFactors ? '✓ FACTOR ON-SITE' : 'OPTIONAL'}
              </button>
            </div>
          </div>

          <!-- Search Bar & Summary -->
          <div class="flex items-center justify-between text-xs text-stone-400">
            <div class="flex items-center space-x-2">
              <span>FOUND <strong class="text-red-300">{filteredHavens().length}</strong> LAWLESS HAVENS</span>
              <span class="text-stone-600">|</span>
              <span class="text-emerald-400 font-bold">100% SCAN IMMUNITY ON APPROACH</span>
            </div>

            <div class="w-64">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Filter by station, syndicate..."
                class="w-full bg-black/70 border border-stone-700 focus:border-red-500 rounded px-2.5 py-1 text-xs text-stone-200 focus:outline-none"
              />
            </div>
          </div>

          <!-- Split View: Station Cards Grid & Station Inspector Detail -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Left List: Haven Cards -->
            <div class="lg:col-span-7 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {#if filteredHavens().length === 0}
                <div
                  class="p-8 text-center bg-black/40 border border-red-500/30 rounded text-stone-400 text-sm"
                >
                  <p class="text-red-400 font-bold mb-1">NO ANARCHY HAVENS MATCH CURRENT CRITERIA</p>
                  <p class="text-xs text-stone-500">
                    Try loosening pad size requirements or expanding the distance search radius.
                  </p>
                </div>
              {:else}
                {#each filteredHavens() as haven (haven.id)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    onclick={() => handleSelectStation(haven)}
                    class="p-3.5 rounded border transition-all cursor-pointer {selectedHaven?.id === haven.id
                      ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-black/50 border-red-900/40 hover:border-red-500/60 hover:bg-black/70'}"
                  >
                    <div class="flex items-start justify-between">
                      <div class="space-y-1">
                        <div class="flex items-center space-x-2">
                          <span class="font-bold text-red-300 text-sm tracking-wide">
                            {haven.stationName}
                          </span>
                          <span
                            class="px-1.5 py-0.5 text-[9px] rounded font-bold {haven.landingPad === 'L'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}"
                          >
                            PAD {haven.landingPad}
                          </span>
                          <span
                            class="px-1.5 py-0.5 text-[9px] rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          >
                            {haven.stationType}
                          </span>
                        </div>

                        <div class="flex items-center space-x-2 text-xs text-stone-400">
                          <span class="text-stone-300 font-bold">{haven.systemName}</span>
                          <span>•</span>
                          <span>{haven.region} Region</span>
                          <span>•</span>
                          <span class="text-red-400">{haven.distanceLs.toLocaleString()} Ls</span>
                        </div>
                      </div>

                      <!-- Distance & Quick Route Button -->
                      <div class="text-right space-y-1">
                        <div class="text-sm font-bold text-red-400">
                          {haven.distanceLy !== undefined ? `${haven.distanceLy.toFixed(1)} Ly` : '-- Ly'}
                        </div>
                        <button
                          type="button"
                          onclick={(e) => {
                            e.stopPropagation();
                            onPlotRoute?.(haven.systemName);
                          }}
                          class="px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-black border border-red-500/50 text-[10px] font-bold transition-all"
                        >
                          NAV TO HAVEN
                        </button>
                      </div>
                    </div>

                    <!-- Facility Badges & Syndicate -->
                    <div class="mt-2.5 pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div class="flex flex-wrap items-center gap-1.5">
                        {#if haven.services.blackMarket}
                          <span class="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60 font-bold">
                            BLACK MARKET
                          </span>
                        {/if}
                        {#if haven.services.rearm && haven.services.repair}
                          <span class="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-bold">
                            RE-ARM & REPAIR
                          </span>
                        {/if}
                        {#if haven.services.shipyard}
                          <span class="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">SHIPYARD</span>
                        {/if}
                        {#if haven.services.outfitting}
                          <span class="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">OUTFITTING</span>
                        {/if}
                        {#if haven.services.interstellarFactors}
                          <span class="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                            FACTORS
                          </span>
                        {/if}
                      </div>

                      <div class="text-stone-400">
                        Syndicate: <strong class="text-stone-300">{haven.controllingFaction}</strong>
                      </div>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Right Inspector Detail Card -->
            <div class="lg:col-span-5 bg-black/60 border border-red-500/40 rounded p-4 space-y-4">
              {#if selectedHaven}
                <div class="border-b border-red-500/30 pb-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-red-400 font-bold tracking-wider uppercase">
                      HAVEN SECURITY DOSSIER
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      0% SCAN PROBABILITY
                    </span>
                  </div>
                  <h3 class="text-lg font-bold text-red-200 mt-1">
                    {selectedHaven.stationName}
                  </h3>
                  <p class="text-xs text-stone-400">
                    System: <strong class="text-stone-200">{selectedHaven.systemName}</strong> ({selectedHaven.region})
                  </p>
                </div>

                <!-- Lawless Guarantees -->
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="p-2 rounded bg-black/70 border border-stone-800">
                    <span class="text-[10px] text-stone-400 block">SECURITY RATING</span>
                    <strong class="text-red-400 font-bold text-sm">ANARCHY (LAWLESS)</strong>
                  </div>
                  <div class="p-2 rounded bg-black/70 border border-stone-800">
                    <span class="text-[10px] text-stone-400 block">POLICE RESPONSE</span>
                    <strong class="text-emerald-400 font-bold text-sm">ZERO AUTHORITY</strong>
                  </div>
                  <div class="p-2 rounded bg-black/70 border border-stone-800">
                    <span class="text-[10px] text-stone-400 block">PIRATE ACTIVITY</span>
                    <strong class="text-amber-400 font-bold text-sm">{selectedHaven.pirateActivityLevel}</strong>
                  </div>
                  <div class="p-2 rounded bg-black/70 border border-stone-800">
                    <span class="text-[10px] text-stone-400 block">MAX LANDING PAD</span>
                    <strong class="text-cyan-400 font-bold text-sm">PAD {selectedHaven.landingPad} (M / L)</strong>
                  </div>
                </div>

                <!-- Controlling Syndicate -->
                <div class="p-2.5 rounded bg-red-950/20 border border-red-500/30 text-xs space-y-1">
                  <div class="text-[10px] text-red-400 font-bold">CONTROLLING UNDERWORLD SYNDICATE</div>
                  <div class="text-stone-200 font-bold">{selectedHaven.pirateSyndicate}</div>
                  <div class="text-[11px] text-stone-400">
                    Affiliation: {selectedHaven.allegiance} • Controlling Faction: {selectedHaven.controllingFaction}
                  </div>
                </div>

                <!-- High-Value Black Market Demands in This Haven -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-stone-300 font-bold">BLACK MARKET PURCHASING DEMANDS:</span>
                    <span class="text-[10px] text-stone-500">NO FINES ASSESSED</span>
                  </div>

                  <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {#each selectedHaven.highValueSmugglingDemands as demand}
                      <div class="p-2 rounded bg-black/80 border border-stone-800 flex items-center justify-between text-xs">
                        <div>
                          <div class="text-stone-200 font-bold">{demand.commodityName}</div>
                          <div class="text-[10px] text-stone-400">
                            Demand: {demand.demandQuantity.toLocaleString()} T • {demand.category}
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-emerald-400 font-bold">
                            {demand.blackMarketBuyPrice.toLocaleString()} CR/T
                          </div>
                          <div class="text-[10px] text-emerald-300">
                            +{demand.profitMarginPercent.toFixed(1)}% OVER AVG
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Actions -->
                <div class="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onclick={() => {
                      corridorDest = selectedHaven!.systemName;
                      activeTab = 'corridor';
                      handlePlotCorridor();
                    }}
                    class="flex-1 py-2 rounded bg-red-600 hover:bg-red-500 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  >
                    PLOT SAFE CORRIDOR TO HAVEN
                  </button>

                  <button
                    type="button"
                    onclick={() => onPlotRoute?.(selectedHaven!.systemName)}
                    class="px-4 py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700"
                  >
                    DIRECT NAV
                  </button>
                </div>
              {:else}
                <div class="h-full flex items-center justify-center p-8 text-stone-500 text-xs text-center">
                  Select an Anarchy Haven station to inspect security protocols and facilities.
                </div>
              {/if}
            </div>
          </div>

        {:else if activeTab === 'smuggling'}
          <!-- High-Value Smuggling Destinations View -->
          <div class="space-y-3">
            <div class="p-3 bg-red-950/20 border border-red-500/30 rounded text-xs text-stone-300 flex items-center justify-between">
              <div>
                <strong class="text-red-300">HIGH-MARGIN SMUGGLING OPPORTUNITIES</strong>
                <p class="text-[11px] text-stone-400">
                  Deliver illicit narcotics, restricted munitions, and salvaged commodities into lawless havens paying premium margins.
                </p>
              </div>
              <span class="px-2 py-1 rounded bg-black/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                GUARANTEED NO AUTHORITY SCANS
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {#each highValueSmugglingList() as item}
                <div class="p-3.5 bg-black/60 border border-stone-800 hover:border-red-500/50 rounded space-y-2.5 transition-all">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="text-sm font-bold text-stone-100">{item.demand.commodityName}</div>
                      <div class="text-[11px] text-stone-400">Category: {item.demand.category}</div>
                    </div>
                    <span class="px-1.5 py-0.5 text-[10px] rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      +{item.demand.profitMarginPercent.toFixed(1)}% PROFIT
                    </span>
                  </div>

                  <div class="p-2 rounded bg-black/80 border border-stone-800/80 text-xs space-y-1">
                    <div class="flex justify-between">
                      <span class="text-stone-400">Buyer Haven:</span>
                      <strong class="text-red-300">{item.station.stationName}</strong>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-stone-400">System:</span>
                      <span class="text-stone-200">{item.station.systemName} ({item.station.region})</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-stone-400">Black Market Price:</span>
                      <strong class="text-emerald-400">{item.demand.blackMarketBuyPrice.toLocaleString()} CR/T</strong>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-stone-400">Galactic Average:</span>
                      <span class="text-stone-400">{item.demand.galacticAveragePrice.toLocaleString()} CR/T</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-stone-400">Demand Volume:</span>
                      <span class="text-amber-300">{item.demand.demandQuantity.toLocaleString()} T</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onclick={() => {
                      handleSelectStation(item.station);
                      activeTab = 'havens';
                    }}
                    class="w-full py-1.5 rounded bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-bold transition-all"
                  >
                    VIEW HAVEN DETAILS
                  </button>
                </div>
              {/each}
            </div>
          </div>

        {:else if activeTab === 'corridor'}
          <!-- Safe Route Corridor Plotter (Avoiding Authority Interdictions) -->
          <div class="space-y-4">
            <div class="p-3.5 bg-red-950/20 border border-red-500/40 rounded text-xs space-y-1">
              <div class="flex items-center space-x-2">
                <span class="text-base">🛡️</span>
                <strong class="text-red-300 text-sm">LOW-SECURITY / ANARCHY SAFE ROUTE CORRIDOR</strong>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  NOTORIETY & ILLICIT CARGO PROTECTED
                </span>
              </div>
              <p class="text-stone-400 text-[11px]">
                Calculates transit routes avoiding High and Medium security systems to prevent System Authority interdictions,
                scans, and detention center transports when operating with Notoriety (1..10) or contraband.
              </p>
            </div>

            <!-- Corridor Input Form -->
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-black/60 border border-stone-800 rounded text-xs">
              <div>
                <span class="text-stone-400 text-[10px] block mb-1">ORIGIN SYSTEM:</span>
                <input
                  type="text"
                  bind:value={corridorOrigin}
                  placeholder="e.g. Deciat"
                  class="w-full bg-black/80 border border-stone-700 rounded px-2.5 py-1 text-stone-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <span class="text-stone-400 text-[10px] block mb-1">HAVEN DESTINATION:</span>
                <input
                  type="text"
                  bind:value={corridorDest}
                  placeholder="e.g. Harma"
                  class="w-full bg-black/80 border border-stone-700 rounded px-2.5 py-1 text-stone-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <span class="text-stone-400 text-[10px] block mb-1">SHIP JUMP RANGE (LY):</span>
                <input
                  type="number"
                  bind:value={shipJumpRangeLy}
                  min="10"
                  max="90"
                  step="0.5"
                  class="w-full bg-black/80 border border-stone-700 rounded px-2.5 py-1 text-stone-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div class="flex items-end">
                <button
                  type="button"
                  onclick={handlePlotCorridor}
                  disabled={isPlottingCorridor}
                  class="w-full py-1.5 rounded bg-red-600 hover:bg-red-500 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  {isPlottingCorridor ? 'CALCULATING...' : 'PLOT SAFE CORRIDOR'}
                </button>
              </div>
            </div>

            <!-- Plotted Corridor Results -->
            {#if plottedCorridor}
              <div class="p-4 bg-black/60 border border-red-500/50 rounded space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
                  <div class="flex items-center space-x-3 text-xs">
                    <span class="text-stone-300">
                      Route: <strong class="text-red-300">{plottedCorridor.origin}</strong> → <strong class="text-emerald-300">{plottedCorridor.destination}</strong>
                    </span>
                    <span class="text-stone-500">|</span>
                    <span class="text-cyan-400 font-bold">{plottedCorridor.jumpCount} Jumps ({plottedCorridor.totalDistanceLy} Ly)</span>
                    <span class="text-stone-500">|</span>
                    <span class="text-amber-300 font-bold">~{plottedCorridor.estimatedTravelTimeMin} Min Flight Time</span>
                  </div>

                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    {plottedCorridor.authorityAvoidanceRating}
                  </span>
                </div>

                <!-- Waypoint Sequence -->
                <div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {#each plottedCorridor.waypoints as hop, i}
                    <div class="p-2.5 rounded bg-black/80 border border-stone-800 flex items-center justify-between text-xs">
                      <div class="flex items-center space-x-3">
                        <span class="w-6 h-6 rounded bg-stone-900 border border-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-300">
                          {i === 0 ? 'START' : i === plottedCorridor.waypoints.length - 1 ? 'GOAL' : i}
                        </span>
                        <div>
                          <div class="flex items-center space-x-2">
                            <strong class="text-stone-200">{hop.systemName}</strong>
                            {#if hop.isSafeHaven}
                              <span class="px-1.5 py-0.2 text-[9px] rounded bg-red-600/30 text-red-300 border border-red-500/50 font-bold">
                                LAWLESS HAVEN
                              </span>
                            {/if}
                          </div>
                          <div class="text-[10px] text-stone-400">
                            Security: <strong class={hop.security === 'Anarchy' ? 'text-red-400' : 'text-amber-400'}>{hop.security}</strong> • Gov: {hop.government}
                          </div>
                        </div>
                      </div>

                      <div class="text-right">
                        <div class="text-xs text-stone-300 font-bold">
                          {hop.jumpDistanceLy > 0 ? `+${hop.jumpDistanceLy} Ly` : 'Origin'}
                        </div>
                        <div class="text-[10px] text-emerald-400">
                          Police Interdiction: {hop.policeInterdictionRisk}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Inject into main route planner button -->
                <div class="pt-2 flex justify-end">
                  <button
                    type="button"
                    onclick={() => onPlotRoute?.(plottedCorridor!.destination)}
                    class="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  >
                    SEND CORRIDOR TO SHIP NAVIGATION
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Bottom Status Bar -->
      <div
        class="flex flex-wrap items-center justify-between px-5 py-2.5 bg-black/80 border-t border-red-500/40 text-[11px] text-stone-400"
      >
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ANARCHY HAVENS INTELLIGENCE FEED ACTIVE</span>
          <span class="text-stone-600">|</span>
          <span class="text-stone-400">STATIONS MONITORED: <strong class="text-red-300">{rawHavensList.length}</strong></span>
        </div>

        <div class="flex items-center space-x-3">
          <span class="text-emerald-400">ZERO COP SCAN RISK</span>
          <span class="text-stone-600">|</span>
          <button
            type="button"
            onclick={onClose}
            class="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-600"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
