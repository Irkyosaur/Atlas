<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type CommodityRecord,
    type StationMarketRecord,
    type CommodityCategory,
    type LandingPadSize,
    COMMODITY_CATEGORIES,
    CANONICAL_COMMODITIES,
    formatMarketAge,
    formatCredits,
    filterAndSortMarketRecords,
    type MarketFilterOptions,
  } from '$engine/market_engine';
  import { ananke } from '$engine/ananke_client';

  interface Props {
    isOpen: boolean;
    referenceSystem?: string;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
    onOpenSingleHop?: () => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Sol',
    onClose,
    onPlotRoute,
    onFocusSystem,
    onOpenSingleHop,
  }: Props = $props();

  // State
  let commodities = $state<CommodityRecord[]>(CANONICAL_COMMODITIES);
  let stations = $state<StationMarketRecord[]>([]);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);

  // Filters & Sorting state
  let searchQuery = $state<string>('');
  let selectedCategory = $state<CommodityCategory | 'All'>('All');
  let selectedPadSize = $state<LandingPadSize | 'Any'>('Any');
  let stationLocation = $state<'All' | 'Orbital' | 'Planetary'>('All');
  let maxAgeHours = $state<number>(0); // 0 = all
  let sortField = $state<MarketFilterOptions['sortField']>('sellPrice');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  // Pagination
  let currentPage = $state<number>(1);
  let pageSize = $state<number>(10);

  // Selected station drawer / detail view
  let selectedStation = $state<StationMarketRecord | null>(null);

  // Ingest data on mount and whenever opened
  async function loadMarketData(targetCommodity?: string) {
    isLoading = true;
    errorMsg = null;
    try {
      const [comms, stns] = await Promise.all([
        ananke.getCommodities(),
        ananke.getMarketStations(targetCommodity, referenceSystem),
      ]);
      commodities = comms;
      stations = stns;
    } catch (err: any) {
      errorMsg = err?.message || 'Failed to connect to Ananke market feed. Serving cached local catalog.';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadMarketData();
  });

  // Filtered & Sorted Records
  let filteredRecords = $derived.by(() => {
    const opts: MarketFilterOptions = {
      searchQuery,
      category: selectedCategory,
      padSize: selectedPadSize,
      stationLocation,
      maxAgeHours,
      minSupply: 0,
      minDemand: 0,
      sortField,
      sortDirection,
    };
    return filterAndSortMarketRecords(stations, opts);
  });

  // Total pages
  let totalPages = $derived.by(() => {
    return Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  });

  // Paginated slice
  let paginatedRecords = $derived.by(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  });

  // Quick commodity chip selector
  function handleSelectCommodityChip(commName: string) {
    searchQuery = commName;
    currentPage = 1;
    loadMarketData(commName);
  }

  function handleSort(field: MarketFilterOptions['sortField']) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = field === 'buyPrice' || field === 'distanceLs' || field === 'distanceLy' ? 'asc' : 'desc';
    }
    currentPage = 1;
  }

  function handleResetFilters() {
    searchQuery = '';
    selectedCategory = 'All';
    selectedPadSize = 'Any';
    stationLocation = 'All';
    maxAgeHours = 0;
    sortField = 'sellPrice';
    sortDirection = 'desc';
    currentPage = 1;
    loadMarketData();
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-label="Commodity Market Table & Supply Demand Analytics"
  >
    <!-- Modal Window -->
    <div
      class="relative w-full max-w-7xl h-[92vh] max-h-[950px] bg-[#070b10]/95 border-2 border-[var(--hud-orange)]/60 rounded-lg flex flex-col shadow-[0_0_50px_rgba(255,113,0,0.25)] overflow-hidden font-mono"
    >
      <!-- Top Title Bar -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-gradient-to-r from-[var(--hud-orange)]/20 via-black/40 to-transparent"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white tracking-widest flex items-center space-x-2">
              <span>COMMODITY MARKET EXPLORER</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/25 text-[var(--hud-orange)] border border-[var(--hud-orange)]/50">
                LIVE FEED // ANANKE 6.1
              </span>
            </h2>
            <p class="text-[10px] text-white/50 tracking-wider">
              REAL-TIME COMMODITY PRICING, SUPPLY/DEMAND HEALTH MATRIX & STATION TELEMETRY
            </p>
          </div>
        </div>

        <!-- Controls: Single-Hop Shortcut, Refresh & Close -->
        <div class="flex items-center space-x-3">
          {#if onOpenSingleHop}
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs bg-[var(--hud-amber)]/20 text-[var(--hud-amber)] border border-[var(--hud-amber)]/50 hover:bg-[var(--hud-amber)] hover:text-black font-bold transition-all flex items-center space-x-1 cursor-pointer"
              onclick={() => {
                onClose();
                onOpenSingleHop();
              }}
              title="Launch Single-Hop Best Trade Router"
            >
              <span>🚀</span>
              <span>SINGLE-HOP ROUTER</span>
            </button>
          {/if}
          <button
            type="button"
            class="px-3 py-1 rounded text-xs text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 hover:bg-[var(--hud-orange)]/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            onclick={() => loadMarketData(searchQuery || undefined)}
            title="Refresh market data from Ananke backend"
          >
            <span class={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>{isLoading ? 'SYNCING...' : 'REFRESH'}</span>
          </button>
          <button
            type="button"
            class="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            onclick={onClose}
            aria-label="Close Market Table"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Filter Controls Toolbar -->
      <div class="px-5 py-3 border-b border-[var(--hud-orange)]/20 bg-black/50 space-y-3">
        <!-- Top Row: Search Input + Category Chips + Pad Size + Planetary Toggle -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Text Search Bar -->
          <div class="relative flex-1 min-w-[240px]">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search commodity (e.g. Tritium, Gold, Imperial Slaves), station, or system..."
              class="w-full bg-[#0a111a] border border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] rounded px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
              oninput={() => { currentPage = 1; }}
            />
            {#if searchQuery}
              <button
                type="button"
                class="absolute right-2 top-1.5 text-xs text-white/40 hover:text-white"
                onclick={() => { searchQuery = ''; currentPage = 1; }}
              >
                ✕
              </button>
            {/if}
          </div>

          <!-- Category Selector -->
          <div class="flex items-center space-x-1.5 text-xs">
            <span class="text-white/50 text-[11px]">CATEGORY:</span>
            <select
              bind:value={selectedCategory}
              class="bg-[#0a111a] border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] rounded px-2 py-1.5 text-xs focus:outline-none"
              onchange={() => { currentPage = 1; }}
            >
              <option value="All">All Categories</option>
              {#each COMMODITY_CATEGORIES as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <!-- Landing Pad Filter -->
          <div class="flex items-center space-x-1.5 text-xs">
            <span class="text-white/50 text-[11px]">PAD:</span>
            <div class="flex border border-[var(--hud-orange)]/40 rounded overflow-hidden">
              {#each ['Any', 'Large', 'Medium'] as pad}
                <button
                  type="button"
                  class="px-2 py-1 text-[11px] {selectedPadSize === pad
                    ? 'bg-[var(--hud-orange)] text-black font-bold'
                    : 'bg-[#0a111a] text-white/70 hover:bg-white/10'}"
                  onclick={() => { selectedPadSize = pad as any; currentPage = 1; }}
                >
                  {pad === 'Any' ? 'ALL PADS' : `${pad.toUpperCase()} ONLY`}
                </button>
              {/each}
            </div>
          </div>

          <!-- Planetary vs Orbital Filter -->
          <div class="flex items-center space-x-1.5 text-xs">
            <span class="text-white/50 text-[11px]">PORT:</span>
            <div class="flex border border-[var(--hud-orange)]/40 rounded overflow-hidden">
              {#each ['All', 'Orbital', 'Planetary'] as loc}
                <button
                  type="button"
                  class="px-2 py-1 text-[11px] {stationLocation === loc
                    ? 'bg-[var(--hud-orange)] text-black font-bold'
                    : 'bg-[#0a111a] text-white/70 hover:bg-white/10'}"
                  onclick={() => { stationLocation = loc as any; currentPage = 1; }}
                >
                  {loc.toUpperCase()}
                </button>
              {/each}
            </div>
          </div>

          <!-- Max Age Filter -->
          <div class="flex items-center space-x-1.5 text-xs">
            <span class="text-white/50 text-[11px]">MAX AGE:</span>
            <select
              bind:value={maxAgeHours}
              class="bg-[#0a111a] border border-[var(--hud-orange)]/40 text-white/80 rounded px-2 py-1.5 text-xs focus:outline-none"
              onchange={() => { currentPage = 1; }}
            >
              <option value={0}>Any Age</option>
              <option value={6}>&lt; 6 Hours</option>
              <option value={24}>&lt; 24 Hours</option>
              <option value={72}>&lt; 3 Days</option>
            </select>
          </div>

          <!-- Reset Filter Button -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors"
            onclick={handleResetFilters}
          >
            RESET
          </button>
        </div>

        <!-- Hot Market Commodity Quick Pickers -->
        <div class="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none text-[11px]">
          <span class="text-[var(--hud-amber)] font-bold uppercase shrink-0">HOT ASSETS:</span>
          {#each ['Tritium', 'Platinum', 'Painite', 'Gold', 'Imperial Slaves', 'Superconductors', 'Advanced Medicines', 'Consumer Technology'] as hotComm}
            <button
              type="button"
              class="px-2 py-0.5 rounded border transition-colors shrink-0 {searchQuery.toLowerCase() === hotComm.toLowerCase()
                ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]'
                : 'bg-black/40 text-white/80 border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] hover:text-white'}"
              onclick={() => handleSelectCommodityChip(hotComm)}
            >
              {hotComm}
            </button>
          {/each}
        </div>
      </div>

      <!-- Main Body: High-Performance Data Table -->
      <div class="flex-1 overflow-auto relative">
        {#if filteredRecords.length === 0}
          <div class="flex flex-col items-center justify-center h-64 text-center space-y-3">
            <div class="text-3xl opacity-40">📊</div>
            <div class="text-[var(--hud-orange)] font-bold text-sm">NO COMMODITY RECORDS MATCH CURRENT FILTERS</div>
            <p class="text-xs text-white/50 max-w-md">
              Try broadening your search term, switching category to 'All Categories', or loosening landing pad constraints.
            </p>
            <button
              type="button"
              class="px-4 py-1.5 rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/50 text-xs font-bold hover:bg-[var(--hud-orange)]/30"
              onclick={handleResetFilters}
            >
              RESET ALL FILTERS
            </button>
          </div>
        {:else}
          <table class="w-full border-collapse text-left text-xs">
            <!-- Table Header with Sort Indicators -->
            <thead class="sticky top-0 z-10 bg-[#0d1520] border-b border-[var(--hud-orange)]/40 uppercase text-[10px] text-[var(--hud-orange)] tracking-wider">
              <tr>
                <th class="p-3 cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('commodityName')}>
                  Commodity {sortField === 'commodityName' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('stationName')}>
                  Station & System {sortField === 'stationName' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3">Pad / Type</th>
                <th class="p-3 cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('distanceLs')}>
                  Arrival {sortField === 'distanceLs' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 text-right cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('buyPrice')}>
                  Buy Price {sortField === 'buyPrice' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 text-right cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('sellPrice')}>
                  Sell Price {sortField === 'sellPrice' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('supply')}>
                  Supply Health {sortField === 'supply' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('demand')}>
                  Demand Health {sortField === 'demand' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 text-right cursor-pointer hover:text-white transition-colors" onclick={() => handleSort('age')}>
                  Age {sortField === 'age' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th class="p-3 text-center">Action</th>
              </tr>
            </thead>

            <!-- Table Rows -->
            <tbody class="divide-y divide-[var(--hud-orange)]/15">
              {#each paginatedRecords as rec}
                <tr
                  class="hover:bg-[var(--hud-orange)]/10 transition-colors group {selectedStation?.stationId === rec.stationId ? 'bg-[var(--hud-orange)]/15' : ''}"
                >
                  <!-- Commodity Info -->
                  <td class="p-3 font-semibold text-white">
                    <div class="flex items-center space-x-2">
                      <span class="text-white font-bold">{rec.commodityName}</span>
                    </div>
                    <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-1.5 mt-0.5">
                      <span>{rec.commodityCategory}</span>
                      <span>•</span>
                      <span>Avg: {formatCredits(rec.galacticAverage)} Cr</span>
                    </div>
                  </td>

                  <!-- Station & System -->
                  <td class="p-3">
                    <div class="text-white font-bold group-hover:text-[var(--hud-amber)] transition-colors">
                      {rec.stationName}
                    </div>
                    <div class="text-[10px] text-white/50 flex items-center space-x-1.5 mt-0.5">
                      <span class="text-[var(--hud-orange)] font-semibold">{rec.systemName}</span>
                      <span>•</span>
                      <span>{rec.distanceLy.toFixed(1)} Ly</span>
                    </div>
                  </td>

                  <!-- Landing Pad & Port Type -->
                  <td class="p-3">
                    <div class="flex items-center space-x-1.5">
                      <span
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold {rec.maxLandingPad === 'Large'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : rec.maxLandingPad === 'Medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'}"
                      >
                        {rec.maxLandingPad[0]} PAD
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded text-[10px] {rec.isPlanetary
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}"
                      >
                        {rec.isPlanetary ? 'PLANETARY' : 'ORBITAL'}
                      </span>
                    </div>
                    <div class="text-[10px] text-white/40 mt-1 truncate max-w-[130px]">
                      {rec.stationType}
                    </div>
                  </td>

                  <!-- Distance to Arrival (Ls) -->
                  <td class="p-3">
                    <div class="text-white font-mono">
                      {new Intl.NumberFormat('en-US').format(Math.round(rec.distanceLs))} Ls
                    </div>
                    <div class="text-[10px] text-white/40 mt-0.5">
                      {rec.distanceLs > 100000 ? 'Deep cruise' : rec.distanceLs > 5000 ? 'Moderate' : 'Near star'}
                    </div>
                  </td>

                  <!-- Buy Price & Variance -->
                  <td class="p-3 text-right">
                    {#if rec.buyPrice > 0}
                      <div class="font-bold text-white">
                        {formatCredits(rec.buyPrice)} <span class="text-[10px] text-white/50">Cr</span>
                      </div>
                      <div class="text-[10px] mt-0.5 font-bold {rec.buyVariancePct <= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        {rec.buyVariancePct > 0 ? `+${rec.buyVariancePct}%` : `${rec.buyVariancePct}%`}
                      </div>
                    {:else}
                      <span class="text-white/30 italic">No Stock</span>
                    {/if}
                  </td>

                  <!-- Sell Price & Variance -->
                  <td class="p-3 text-right">
                    {#if rec.sellPrice > 0}
                      <div class="font-bold text-white">
                        {formatCredits(rec.sellPrice)} <span class="text-[10px] text-white/50">Cr</span>
                      </div>
                      <div class="text-[10px] mt-0.5 font-bold {rec.sellVariancePct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        {rec.sellVariancePct > 0 ? `+${rec.sellVariancePct}%` : `${rec.sellVariancePct}%`}
                      </div>
                    {:else}
                      <span class="text-white/30 italic">No Demand</span>
                    {/if}
                  </td>

                  <!-- Supply Health Bar -->
                  <td class="p-3 min-w-[140px]">
                    <div class="flex items-center justify-between text-[11px] mb-1">
                      <span class="text-white/70">{formatCredits(rec.supply)} t</span>
                      <span class="text-[9px] px-1 py-0.2 rounded font-bold {rec.supplyLevel === 'High'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : rec.supplyLevel === 'Med'
                        ? 'text-amber-400 bg-amber-500/10'
                        : rec.supplyLevel === 'Low'
                        ? 'text-orange-400 bg-orange-500/10'
                        : 'text-white/30'}">
                        {rec.supplyLevel}
                      </span>
                    </div>
                    <!-- Visual Health Meter -->
                    <div class="w-full h-1.5 bg-black/60 rounded overflow-hidden border border-white/10">
                      <div
                        class="h-full transition-all duration-300 {rec.supplyLevel === 'High'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : rec.supplyLevel === 'Med'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-orange-600 to-red-500'}"
                        style="width: {Math.min(100, Math.max(5, (rec.supply / 150000) * 100))}%"
                      ></div>
                    </div>
                  </td>

                  <!-- Demand Health Bar -->
                  <td class="p-3 min-w-[140px]">
                    <div class="flex items-center justify-between text-[11px] mb-1">
                      <span class="text-white/70">{formatCredits(rec.demand)} t</span>
                      <span class="text-[9px] px-1 py-0.2 rounded font-bold {rec.demandLevel === 'High'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : rec.demandLevel === 'Med'
                        ? 'text-amber-400 bg-amber-500/10'
                        : rec.demandLevel === 'Low'
                        ? 'text-orange-400 bg-orange-500/10'
                        : 'text-white/30'}">
                        {rec.demandLevel}
                      </span>
                    </div>
                    <!-- Visual Health Meter -->
                    <div class="w-full h-1.5 bg-black/60 rounded overflow-hidden border border-white/10">
                      <div
                        class="h-full transition-all duration-300 {rec.demandLevel === 'High'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : rec.demandLevel === 'Med'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-orange-600 to-red-500'}"
                        style="width: {Math.min(100, Math.max(5, (rec.demand / 100000) * 100))}%"
                      ></div>
                    </div>
                  </td>

                  <!-- Last Updated Age -->
                  <td class="p-3 text-right">
                    <span class="text-white/70 text-[11px]">{formatMarketAge(rec.marketUpdatedAt)}</span>
                  </td>

                  <!-- Actions: Route Plot & Camera Focus -->
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                      <button
                        type="button"
                        class="px-2 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] text-[var(--hud-orange)] hover:text-black border border-[var(--hud-orange)]/40 text-[10px] font-bold transition-all"
                        onclick={() => {
                          if (onPlotRoute) onPlotRoute(rec.systemName);
                        }}
                        title="Plot Route to Station System"
                      >
                        ROUTE
                      </button>
                      <button
                        type="button"
                        class="px-1.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 text-[10px] transition-all"
                        onclick={() => {
                          if (onFocusSystem) onFocusSystem(rec.coords, rec.systemName);
                        }}
                        title="Target System Coordinates on Galaxy Map"
                      >
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <!-- Footer: Pagination Controls & Data Metrics -->
      <div
        class="px-5 py-3 border-t border-[var(--hud-orange)]/30 bg-black/70 flex flex-wrap items-center justify-between gap-4 text-xs"
      >
        <div class="flex items-center space-x-3 text-white/60 text-[11px]">
          <span>
            SHOWING <strong class="text-white">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong class="text-white">{Math.min(filteredRecords.length, currentPage * pageSize)}</strong> OF <strong class="text-[var(--hud-orange)]">{filteredRecords.length}</strong> STATIONS
          </span>
          <span>•</span>
          <span>REF SYSTEM: <strong class="text-[var(--hud-amber)]">{referenceSystem}</strong></span>
          {#if errorMsg}
            <span class="text-amber-400">⚠️ {errorMsg}</span>
          {/if}
        </div>

        <!-- Pagination Buttons -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-2.5 py-1 rounded border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] disabled:opacity-30 disabled:pointer-events-none hover:bg-[var(--hud-orange)]/20 text-xs font-bold transition-all"
            disabled={currentPage <= 1}
            onclick={() => { currentPage = Math.max(1, currentPage - 1); }}
          >
            ◀ PREV
          </button>

          <span class="text-white/80 font-mono px-2">
            PAGE {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            class="px-2.5 py-1 rounded border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] disabled:opacity-30 disabled:pointer-events-none hover:bg-[var(--hud-orange)]/20 text-xs font-bold transition-all"
            disabled={currentPage >= totalPages}
            onclick={() => { currentPage = Math.min(totalPages, currentPage + 1); }}
          >
            NEXT ▶
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
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
