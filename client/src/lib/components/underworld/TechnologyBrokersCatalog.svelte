<script lang="ts">
  // Location: atlas/client/src/lib/components/underworld/TechnologyBrokersCatalog.svelte
  // Technology Brokers & Specialized Unlocks Catalog (Phase 13, Stage 13.2)
  // Compliant with Cobra HUD design system, Svelte 5 runes, passive telemetry, and FDF EULA.

  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type BrokerType,
    type TechCategory,
    type LandingPadSize,
    type TechBrokerStation,
    type TechUnlockItem,
    type GuardianSiteRoute,
    CANONICAL_TECH_UNLOCKS,
    CANONICAL_GUARDIAN_SITES,
    techBrokerEngine,
  } from '$engine/technology_broker_engine';
  import { engineeringWishlistEngine } from '$engine/engineering_wishlist_engine';
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
  let activeTab = $state<'catalog' | 'brokers' | 'wishlist' | 'ruins'>('catalog');

  // Query and filters
  let querySystem = $state<string>(referenceSystem);
  let selectedBrokerFilter = $state<'ALL' | BrokerType>('ALL');
  let selectedCategoryFilter = $state<'ALL' | TechCategory>('ALL');
  let selectedPadSize = $state<'ANY' | LandingPadSize>('ANY');
  let searchQuery = $state<string>('');

  // Selected item for detail view
  let selectedItemId = $state<string>('guardian_fsd_booster');
  let selectedItem = $derived<TechUnlockItem | undefined>(
    CANONICAL_TECH_UNLOCKS.find((i) => i.id === selectedItemId)
  );

  // Tech brokers list state
  let isLoadingBrokers = $state<boolean>(false);
  let brokersList = $state<TechBrokerStation[]>([]);

  // Player inventory & deficit state
  let playerInventory = $state<Record<string, number>>(engineeringWishlistEngine.getInventory());

  // Filtered items catalog
  let filteredItems = $derived<TechUnlockItem[]>(
    CANONICAL_TECH_UNLOCKS.filter((item) => {
      if (selectedBrokerFilter !== 'ALL' && item.brokerType !== selectedBrokerFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q) || item.shortName.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesIngredient = item.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesIngredient) return false;
      }
      return true;
    })
  );

  // Filtered brokers
  let filteredBrokers = $derived<TechBrokerStation[]>(
    brokersList
      .filter((b) => (selectedBrokerFilter === 'ALL' || b.brokerType === selectedBrokerFilter))
      .filter((b) => (selectedPadSize === 'ANY' || b.landingPad === 'L' || b.landingPad === selectedPadSize))
  );

  // Wishlist items & deficits
  let wishlistedItems = $state<TechUnlockItem[]>(techBrokerEngine.getWishlist());
  let wishlistDeficits = $derived(techBrokerEngine.calculateWishlistDeficits(playerInventory, wishlistedItems));

  // Single selected item deficit check
  let selectedItemDeficits = $derived(
    selectedItem ? techBrokerEngine.calculateWishlistDeficits(playerInventory, [selectedItem]) : null
  );

  // Nearest broker for selected item
  let nearestBrokerForSelected = $derived(
    selectedItem ? brokersList.find((b) => b.brokerType === selectedItem.brokerType) : null
  );

  // Load broker locations from Ananke client
  async function loadBrokers() {
    isLoadingBrokers = true;
    try {
      brokersList = await ananke.getTechnologyBrokers(querySystem);
    } catch {
      // Fallback handled in engine
    } finally {
      isLoadingBrokers = false;
    }
  }

  // Toggle wishlist state for item
  function toggleItemWishlist(id: string) {
    techBrokerEngine.toggleWishlist(id);
    wishlistedItems = techBrokerEngine.getWishlist();
  }

  // Quick navigation into item
  function selectAndOpenItem(item: TechUnlockItem) {
    selectedItemId = item.id;
    activeTab = 'catalog';
  }

  onMount(() => {
    loadBrokers();
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-label="Technology Brokers & Experimental Weaponry Unlocks Modal"
  >
    <div
      class="relative w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col rounded-lg bg-[var(--hud-bg,#0a0e14)] border border-[var(--hud-orange,#FF7100)]/60 shadow-[0_0_40px_rgba(255,113,0,0.25)] overflow-hidden font-mono text-stone-200"
    >
      <!-- Modal Header -->
      <header
        class="flex items-center justify-between px-6 py-4 border-b border-[var(--hud-orange,#FF7100)]/40 bg-gradient-to-r from-[var(--hud-orange,#FF7100)]/20 via-black/40 to-cyan-500/10 select-none"
      >
        <div class="flex items-center space-x-3">
          <div class="p-1.5 rounded bg-[var(--hud-orange,#FF7100)]/20 border border-[var(--hud-orange,#FF7100)] text-[var(--hud-orange,#FF7100)]">
            <Icon name="reticle" size={24} />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-lg font-bold tracking-wider text-[var(--hud-orange,#FF7100)] uppercase">
                TECHNOLOGY BROKERS & UNLOCKS
              </h2>
              <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-300">
                STAGE 13.2
              </span>
            </div>
            <p class="text-xs text-stone-400">
              Guardian & Human experimental unlocks, material deficit routing, and blueprint fragment sites
            </p>
          </div>
        </div>

        <!-- Navigation Tabs & Close -->
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1 p-1 rounded bg-black/50 border border-stone-800">
            <button
              type="button"
              class="px-3 py-1 text-xs font-bold uppercase rounded transition-all {activeTab === 'catalog'
                ? 'bg-[var(--hud-orange,#FF7100)] text-black shadow-sm'
                : 'text-stone-400 hover:text-white'}"
              onclick={() => (activeTab = 'catalog')}
            >
              Tech Catalog ({CANONICAL_TECH_UNLOCKS.length})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-bold uppercase rounded transition-all {activeTab === 'brokers'
                ? 'bg-[var(--hud-orange,#FF7100)] text-black shadow-sm'
                : 'text-stone-400 hover:text-white'}"
              onclick={() => (activeTab = 'brokers')}
            >
              Broker Stations
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-bold uppercase rounded transition-all {activeTab === 'wishlist'
                ? 'bg-[var(--hud-orange,#FF7100)] text-black shadow-sm'
                : 'text-stone-400 hover:text-white'}"
              onclick={() => (activeTab = 'wishlist')}
            >
              Wishlist Deficits ({wishlistedItems.length})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-bold uppercase rounded transition-all {activeTab === 'ruins'
                ? 'bg-[var(--hud-orange,#FF7100)] text-black shadow-sm'
                : 'text-stone-400 hover:text-white'}"
              onclick={() => (activeTab = 'ruins')}
            >
              Guardian Ruins
            </button>
          </div>

          <button
            type="button"
            class="p-2 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            onclick={() => onClose()}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- System Reference Sub-Header Bar -->
      <div class="px-6 py-2.5 bg-black/40 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center space-x-2">
          <span class="text-stone-400">REFERENCE SYSTEM:</span>
          <div class="flex items-center space-x-1">
            <input
              id="ref-sys-input"
              type="text"
              bind:value={querySystem}
              onkeydown={(e) => {
                if (e.key === 'Enter') loadBrokers();
              }}
              class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-orange,#FF7100)]/40 text-stone-100 focus:outline-none focus:border-[var(--hud-orange,#FF7100)] text-xs uppercase"
              placeholder="System name..."
            />
            <button
              type="button"
              onclick={() => loadBrokers()}
              class="px-2.5 py-1 rounded bg-[var(--hud-orange,#FF7100)]/20 hover:bg-[var(--hud-orange,#FF7100)]/40 border border-[var(--hud-orange,#FF7100)] text-[var(--hud-orange,#FF7100)] font-bold transition-all"
            >
              SET ORIGIN
            </button>
          </div>
        </div>

        <div class="flex items-center space-x-4 text-stone-400">
          <div>
            ACTIVE BROKERS: <span class="font-bold text-[var(--hud-orange,#FF7100)]">{brokersList.length}</span>
          </div>
          <div>
            GUARDIAN BROKERS: <span class="font-bold text-cyan-400">{brokersList.filter(b => b.brokerType === 'Guardian').length}</span>
          </div>
          <div>
            HUMAN BROKERS: <span class="font-bold text-amber-400">{brokersList.filter(b => b.brokerType === 'Human').length}</span>
          </div>
        </div>
      </div>

      <!-- Main Body Container -->
      <div class="flex-1 overflow-hidden p-6 flex flex-col">
        <!-- TAB 1: TECH CATALOG -->
        {#if activeTab === 'catalog'}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
            <!-- Left List (Catalog Navigation) -->
            <div class="lg:col-span-5 flex flex-col h-full overflow-hidden rounded border border-stone-800 bg-black/30">
              <!-- Search & Filters -->
              <div class="p-3 border-b border-stone-800 space-y-2 bg-black/40">
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Search unlocks (e.g. FSD, Gauss, Cargo)..."
                  class="w-full px-3 py-1.5 rounded bg-black/60 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-[var(--hud-orange,#FF7100)]"
                />

                <div class="flex items-center space-x-2 text-[11px]">
                  <span class="text-stone-400">FILTER:</span>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'ALL' ? 'bg-[var(--hud-orange,#FF7100)] text-black border-[var(--hud-orange,#FF7100)] font-bold' : 'border-stone-800 text-stone-400'}"
                    onclick={() => (selectedBrokerFilter = 'ALL')}
                  >
                    ALL
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'Guardian' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold' : 'border-stone-800 text-stone-400'}"
                    onclick={() => (selectedBrokerFilter = 'Guardian')}
                  >
                    GUARDIAN
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'Human' ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold' : 'border-stone-800 text-stone-400'}"
                    onclick={() => (selectedBrokerFilter = 'Human')}
                  >
                    HUMAN
                  </button>
                </div>
              </div>

              <!-- Item List Scrollable -->
              <div class="flex-1 overflow-y-auto divide-y divide-stone-800/60 p-2 space-y-1">
                {#each filteredItems as item}
                  {@const isSelected = selectedItemId === item.id}
                  {@const inWishlist = wishlistedItems.some(w => w.id === item.id)}
                  <div
                    class="p-3 rounded cursor-pointer transition-all border {isSelected
                      ? 'bg-[var(--hud-orange,#FF7100)]/15 border-[var(--hud-orange,#FF7100)] text-white shadow-sm'
                      : 'border-transparent hover:border-stone-700 bg-black/20 hover:bg-black/40 text-stone-300'}"
                    onclick={() => (selectedItemId = item.id)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') selectedItemId = item.id;
                    }}
                  >
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="font-bold text-xs {item.brokerType === 'Guardian' ? 'text-cyan-300' : 'text-amber-300'}">
                            {item.name}
                          </span>
                        </div>
                        <div class="text-[10px] text-stone-400 mt-0.5 flex items-center space-x-2">
                          <span class="px-1.5 py-0.2 rounded bg-black/50 border border-stone-800">
                            {item.category}
                          </span>
                          <span>{item.ingredients.length} required components</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="px-2 py-1 text-[10px] font-bold uppercase rounded border transition-all {inWishlist
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'border-stone-700 text-stone-400 hover:border-stone-500'}"
                        onclick={(e) => {
                          e.stopPropagation();
                          toggleItemWishlist(item.id);
                        }}
                      >
                        {inWishlist ? 'WISHLISTED' : '+ WISHLIST'}
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Right Detail Panel (Unlock Requirements & Deficits) -->
            <div class="lg:col-span-7 flex flex-col h-full overflow-hidden rounded border border-stone-800 bg-black/40 p-4 space-y-4">
              {#if selectedItem}
                <!-- Item Banner -->
                <div class="p-4 rounded border {selectedItem.brokerType === 'Guardian' ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-amber-500/40 bg-amber-950/20'} space-y-2">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {selectedItem.brokerType === 'Guardian' ? 'bg-cyan-500 text-black' : 'bg-amber-500 text-black'}">
                          {selectedItem.brokerType} Tech Broker
                        </span>
                        <span class="text-xs text-stone-400 uppercase font-mono">{selectedItem.category}</span>
                      </div>
                      <h3 class="text-lg font-bold text-stone-100 mt-1">{selectedItem.name}</h3>
                    </div>

                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-bold uppercase rounded border transition-all {wishlistedItems.some(w => w.id === selectedItem?.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'border-[var(--hud-orange,#FF7100)] text-[var(--hud-orange,#FF7100)] hover:bg-[var(--hud-orange,#FF7100)]/20'}"
                      onclick={() => toggleItemWishlist(selectedItem!.id)}
                    >
                      {wishlistedItems.some(w => w.id === selectedItem?.id) ? '✓ In Wishlist' : '+ Add To Wishlist'}
                    </button>
                  </div>

                  <p class="text-xs text-stone-300 leading-relaxed">{selectedItem.description}</p>

                  <div class="flex flex-wrap gap-1.5 pt-1">
                    {#each selectedItem.sizeRatings as rating}
                      <span class="px-2 py-0.5 rounded text-[10px] bg-black/60 border border-stone-700 text-stone-300 font-mono">
                        {rating}
                      </span>
                    {/each}
                  </div>
                </div>

                <!-- Required Unlock Ingredients & Player Inventory Check -->
                <div class="flex-1 overflow-y-auto space-y-2">
                  <div class="flex items-center justify-between text-xs text-stone-400 pb-1 border-b border-stone-800">
                    <span class="font-bold uppercase tracking-wider">Required Components & Materials</span>
                    <span>
                      STATUS:
                      {#if selectedItemDeficits?.isFullyReady}
                        <span class="text-emerald-400 font-bold">READY TO UNLOCK</span>
                      {:else}
                        <span class="text-red-400 font-bold">DEFICIT PENDING</span>
                      {/if}
                    </span>
                  </div>

                  <div class="divide-y divide-stone-800/80">
                    {#if selectedItemDeficits}
                      {#each selectedItemDeficits.ingredients as ing}
                        <div class="py-2.5 flex items-center justify-between text-xs">
                          <div class="space-y-0.5">
                            <div class="flex items-center space-x-2">
                              <span class="font-bold text-stone-200">{ing.name}</span>
                              {#if ing.isCommodity}
                                <span class="px-1.5 py-0.2 text-[9px] rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                                  COMMODITY
                                </span>
                              {:else}
                                <span class="px-1.5 py-0.2 text-[9px] rounded bg-stone-800 text-stone-400">
                                  {ing.category}
                                </span>
                              {/if}
                            </div>
                            {#if ing.sourceTip}
                              <div class="text-[10px] text-stone-400">
                                <span class="text-stone-500">Source:</span> {ing.sourceTip}
                              </div>
                            {/if}
                          </div>

                          <div class="flex items-center space-x-4">
                            <div class="text-right">
                              <div class="font-bold font-mono">
                                <span class="{ing.owned >= ing.required ? 'text-emerald-400' : 'text-amber-400'}">
                                  {ing.owned}
                                </span>
                                <span class="text-stone-500">/ {ing.required}</span>
                              </div>
                              <div class="text-[10px]">
                                {#if ing.deficit > 0}
                                  <span class="text-red-400 font-bold">-{ing.deficit} needed</span>
                                {:else}
                                  <span class="text-emerald-400">Complete</span>
                                {/if}
                              </div>
                            </div>
                          </div>
                        </div>
                      {/each}
                    {/if}
                  </div>
                </div>

                <!-- Nearest Broker for this unlock -->
                <div class="p-3 rounded bg-black/60 border border-stone-800 text-xs flex items-center justify-between">
                  <div>
                    <span class="text-stone-500 text-[10px] uppercase block">Nearest {selectedItem.brokerType} Broker from {querySystem}:</span>
                    {#if nearestBrokerForSelected}
                      <span class="font-bold text-stone-200">{nearestBrokerForSelected.stationName} ({nearestBrokerForSelected.systemName})</span>
                      <span class="text-stone-400 ml-2">~{nearestBrokerForSelected.distanceLy} LY</span>
                    {:else}
                      <span class="text-stone-400">Searching broker stations...</span>
                    {/if}
                  </div>

                  {#if nearestBrokerForSelected}
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-[var(--hud-orange,#FF7100)]/20 hover:bg-[var(--hud-orange,#FF7100)]/40 border border-[var(--hud-orange,#FF7100)] text-[var(--hud-orange,#FF7100)] text-xs font-bold transition-all"
                      onclick={() => onPlotRoute?.(nearestBrokerForSelected!.systemName)}
                    >
                      PLOT ROUTE
                    </button>
                  {/if}
                </div>
              {:else}
                <div class="h-full flex items-center justify-center text-stone-500 text-xs">
                  Select an item from the catalog to view requirements.
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- TAB 2: BROKER STATIONS -->
        {#if activeTab === 'brokers'}
          <div class="flex flex-col h-full overflow-hidden space-y-4">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2">
                <span class="text-stone-400">BROKER TYPE:</span>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'ALL' ? 'bg-[var(--hud-orange,#FF7100)] text-black border-[var(--hud-orange,#FF7100)] font-bold' : 'border-stone-800 text-stone-400'}"
                  onclick={() => (selectedBrokerFilter = 'ALL')}
                >
                  ALL
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'Guardian' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold' : 'border-stone-800 text-stone-400'}"
                  onclick={() => (selectedBrokerFilter = 'Guardian')}
                >
                  GUARDIAN
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border {selectedBrokerFilter === 'Human' ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold' : 'border-stone-800 text-stone-400'}"
                  onclick={() => (selectedBrokerFilter = 'Human')}
                >
                  HUMAN
                </button>
              </div>

              <div class="flex items-center space-x-2">
                <span class="text-stone-400">PAD SIZE:</span>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border {selectedPadSize === 'ANY' ? 'bg-[var(--hud-orange,#FF7100)] text-black border-[var(--hud-orange,#FF7100)] font-bold' : 'border-stone-800 text-stone-400'}"
                  onclick={() => (selectedPadSize = 'ANY')}
                >
                  ANY
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border {selectedPadSize === 'L' ? 'bg-[var(--hud-orange,#FF7100)] text-black border-[var(--hud-orange,#FF7100)] font-bold' : 'border-stone-800 text-stone-400'}"
                  onclick={() => (selectedPadSize = 'L')}
                >
                  LARGE (L) ONLY
                </button>
              </div>
            </div>

            <!-- Broker Station Cards -->
            <div class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#if isLoadingBrokers}
                <div class="col-span-full py-12 text-center text-stone-400 text-xs">
                  Triangulating technology brokers from {querySystem}...
                </div>
              {:else if filteredBrokers.length === 0}
                <div class="col-span-full py-12 text-center text-stone-400 text-xs">
                  No technology brokers match current filters.
                </div>
              {:else}
                {#each filteredBrokers as broker}
                  <div class="p-4 rounded border {broker.brokerType === 'Guardian' ? 'border-cyan-500/30 bg-cyan-950/10' : 'border-amber-500/30 bg-amber-950/10'} flex flex-col justify-between space-y-3">
                    <div>
                      <div class="flex items-center justify-between">
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase {broker.brokerType === 'Guardian' ? 'bg-cyan-500 text-black' : 'bg-amber-500 text-black'}">
                          {broker.brokerType} Tech Broker
                        </span>
                        <span class="text-xs font-mono font-bold text-[var(--hud-orange,#FF7100)]">
                          {broker.distanceLy ?? 0} LY
                        </span>
                      </div>

                      <h4 class="text-sm font-bold text-stone-100 mt-2">{broker.stationName}</h4>
                      <div class="text-xs text-stone-400">{broker.systemName}</div>

                      <div class="grid grid-cols-2 gap-2 mt-3 text-[11px] text-stone-400">
                        <div>Economy: <span class="text-stone-200">{broker.economy}</span></div>
                        <div>Pad Size: <span class="text-stone-200 font-bold">{broker.landingPad}</span></div>
                        <div>Arrival: <span class="text-stone-200">{broker.distanceLs} Ls</span></div>
                        <div>Type: <span class="text-stone-200">{broker.stationType}</span></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="w-full py-1.5 rounded bg-[var(--hud-orange,#FF7100)]/20 hover:bg-[var(--hud-orange,#FF7100)]/40 border border-[var(--hud-orange,#FF7100)] text-[var(--hud-orange,#FF7100)] text-xs font-bold transition-all text-center"
                      onclick={() => onPlotRoute?.(broker.systemName)}
                    >
                      PLOT ROUTE TO BROKER
                    </button>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}

        <!-- TAB 3: WISHLIST DEFICITS -->
        {#if activeTab === 'wishlist'}
          <div class="flex flex-col h-full overflow-hidden space-y-4">
            <div class="flex items-center justify-between text-xs pb-2 border-b border-stone-800">
              <div>
                <span class="font-bold text-stone-200">WISHLIST AGGREGATOR</span>
                <span class="text-stone-400 ml-2">({wishlistedItems.length} active technology unlocks)</span>
              </div>
              <div>
                {#if wishlistDeficits.isFullyReady}
                  <span class="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold">
                    ALL MATERIALS READY
                  </span>
                {:else}
                  <span class="px-2 py-1 rounded bg-amber-950/80 border border-amber-500 text-amber-300 font-bold">
                    INCOMPLETE DEFICITS DETECTED
                  </span>
                {/if}
              </div>
            </div>

            <!-- Active Wishlist Items Badges -->
            <div class="flex flex-wrap gap-2">
              {#each wishlistedItems as item}
                <div class="px-3 py-1.5 rounded bg-black/60 border border-stone-700 flex items-center space-x-2 text-xs">
                  <span class="font-bold {item.brokerType === 'Guardian' ? 'text-cyan-300' : 'text-amber-300'}">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    class="text-stone-500 hover:text-red-400 text-xs"
                    onclick={() => toggleItemWishlist(item.id)}
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>

            <!-- Aggregated Deficits Table -->
            <div class="flex-1 overflow-y-auto border border-stone-800 rounded bg-black/30">
              <table class="w-full text-xs text-left">
                <thead class="bg-black/60 text-stone-400 border-b border-stone-800 sticky top-0">
                  <tr>
                    <th class="p-3">INGREDIENT / COMPONENT</th>
                    <th class="p-3">TYPE</th>
                    <th class="p-3 text-right">REQUIRED</th>
                    <th class="p-3 text-right">INVENTORY</th>
                    <th class="p-3 text-right">DEFICIT</th>
                    <th class="p-3">FARMING GUIDANCE / SOURCE</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-800/60 font-mono">
                  {#if wishlistDeficits.ingredients.length === 0}
                    <tr>
                      <td colspan="6" class="p-8 text-center text-stone-500">
                        No items added to wishlist. Browse Tech Catalog to add modules or weapons.
                      </td>
                    </tr>
                  {:else}
                    {#each wishlistDeficits.ingredients as ing}
                      <tr class="hover:bg-black/20">
                        <td class="p-3 font-bold text-stone-200">{ing.name}</td>
                        <td class="p-3">
                          {#if ing.isCommodity}
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/80 border border-purple-500/40 text-purple-300">
                              Commodity
                            </span>
                          {:else}
                            <span class="text-stone-400 text-[11px]">{ing.category}</span>
                          {/if}
                        </td>
                        <td class="p-3 text-right text-stone-300 font-bold">{ing.required}</td>
                        <td class="p-3 text-right font-bold {ing.owned >= ing.required ? 'text-emerald-400' : 'text-amber-400'}">
                          {ing.owned}
                        </td>
                        <td class="p-3 text-right font-bold">
                          {#if ing.deficit > 0}
                            <span class="text-red-400">-{ing.deficit}</span>
                          {:else}
                            <span class="text-emerald-400">0</span>
                          {/if}
                        </td>
                        <td class="p-3 text-stone-400 text-[11px] font-sans">
                          {ing.sourceTip || 'Consult Codex or Material Traders'}
                        </td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        <!-- TAB 4: GUARDIAN RUINS & SITES -->
        {#if activeTab === 'ruins'}
          <div class="flex flex-col h-full overflow-hidden space-y-4">
            <div class="text-xs text-stone-400">
              Verified Guardian planetary structures for acquiring Module, Weapon, and Vessel blueprint fragments.
            </div>

            <div class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each CANONICAL_GUARDIAN_SITES as site}
                <div class="p-4 rounded border border-cyan-500/30 bg-cyan-950/10 flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500 text-black uppercase">
                        {site.blueprintType.replace('Guardian ', '')}
                      </span>
                      <span class="text-xs text-stone-400">~{site.distanceLyFromSol} LY from Sol</span>
                    </div>

                    <h4 class="text-sm font-bold text-stone-100 mt-2">{site.siteName}</h4>
                    <div class="text-xs text-cyan-300 font-mono mt-0.5">
                      Body: {site.body} | Lat: {site.planetaryCoords.lat.toFixed(2)}, Lon: {site.planetaryCoords.lon.toFixed(2)}
                    </div>

                    <div class="mt-3 space-y-1.5 text-xs text-stone-300">
                      <div>
                        <span class="text-stone-500">Terminal Process:</span> {site.activeTerminal}
                      </div>
                      <div>
                        <span class="text-stone-500">Key Required:</span> {site.relicRequired}
                      </div>
                      <div class="text-[11px] text-stone-400 italic">
                        "{site.notes}"
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="w-full py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500 text-cyan-300 text-xs font-bold transition-all text-center"
                    onclick={() => onPlotRoute?.(site.systemName)}
                  >
                    PLOT ROUTE TO GUARDIAN RUIN ({site.systemName})
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <footer class="px-6 py-3 border-t border-stone-800 bg-black/60 flex items-center justify-between text-xs text-stone-500">
        <div class="flex items-center space-x-2">
          <span>ATLAS PROTOCOL: TECHNOLOGY BROKER UNLOCK LEDGER</span>
          <span>•</span>
          <span>COMPLIANT WITH FRONTIER CAPI & ZERO-INJECTION STANDARDS</span>
        </div>
        <button
          type="button"
          class="px-4 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors"
          onclick={() => onClose()}
        >
          CLOSE
        </button>
      </footer>
    </div>
  </div>
{/if}
