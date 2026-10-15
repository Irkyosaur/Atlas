<script lang="ts">
  // Location: atlas/client/src/lib/components/odyssey/OdysseyLockerModal.svelte
  // Odyssey Locker Manager & 1,000-Cap Inventory Audit Modal (Phase 10, Stage 10.1)
  // Provides on-foot Odyssey asset lockers (Assets, Goods, Data), capacity gauge,
  // category tabs with sub-categories, instant search, and quantity sorting.

  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    odysseyLockerEngine,
    type OdysseyLockerItem,
    type OdysseyLockerAudit,
    ODYSSEY_LOCKER_CAPACITY,
  } from '$engine/odyssey_locker_engine';
  import {
    type OdysseyCategory,
    type OdysseySubCategory,
    type OdysseyRarity,
  } from '$engine/odyssey_locker_catalog';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let audit = $state<OdysseyLockerAudit>(odysseyLockerEngine.getAudit());
  let allItems = $state<OdysseyLockerItem[]>(odysseyLockerEngine.getAllItems());

  // Category and SubCategory Filtering
  type MainTab = 'ALL' | 'assets' | 'goods' | 'data';
  let activeMainTab = $state<MainTab>('ALL');
  let activeSubCategory = $state<string>('ALL');

  // Search & Sorting
  let searchQuery = $state<string>('');
  let sortField = $state<'count' | 'name' | 'value' | 'rarity'>('count');
  let sortDirection = $state<'desc' | 'asc'>('desc');

  // Simulation / Ingestion JSON modal state
  let isJournalImportOpen = $state<boolean>(false);
  let journalJsonInput = $state<string>('');
  let importStatusMsg = $state<string | null>(null);

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    odysseyLockerEngine.init();
    unsubscribe = odysseyLockerEngine.subscribe(() => {
      audit = odysseyLockerEngine.getAudit();
      allItems = odysseyLockerEngine.getAllItems();
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  const RARITY_WEIGHT: Record<OdysseyRarity, number> = {
    'Very Common': 1,
    'Common': 2,
    'Standard': 3,
    'Rare': 4,
    'Very Rare': 5,
  };

  const RARITY_BADGE_STYLE: Record<OdysseyRarity, string> = {
    'Very Common': 'text-zinc-400 bg-zinc-900/60 border-zinc-700/60',
    'Common': 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40',
    'Standard': 'text-blue-400 bg-blue-950/40 border-blue-500/40',
    'Rare': 'text-purple-400 bg-purple-950/40 border-purple-500/40',
    'Very Rare': 'text-amber-400 bg-amber-950/40 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  };

  const SUBCATEGORY_STYLE: Record<OdysseySubCategory, { border: string; text: string; bg: string }> = {
    Chemicals: { border: 'border-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-950/20' },
    Circuits: { border: 'border-cyan-500/40', text: 'text-cyan-400', bg: 'bg-cyan-950/20' },
    Tech: { border: 'border-orange-500/40', text: 'text-orange-400', bg: 'bg-orange-950/20' },
    Goods: { border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-950/20' },
    Operational: { border: 'border-indigo-500/40', text: 'text-indigo-400', bg: 'bg-indigo-950/20' },
    Financial: { border: 'border-yellow-500/40', text: 'text-yellow-400', bg: 'bg-yellow-950/20' },
    Technical: { border: 'border-purple-500/40', text: 'text-purple-400', bg: 'bg-purple-950/20' },
  };

  // Sub-categories available based on active main tab
  const currentSubCategories = $derived(() => {
    if (activeMainTab === 'assets') {
      return ['ALL', 'Chemicals', 'Circuits', 'Tech'];
    }
    if (activeMainTab === 'goods') {
      return ['ALL', 'Goods'];
    }
    if (activeMainTab === 'data') {
      return ['ALL', 'Operational', 'Financial', 'Technical'];
    }
    return ['ALL', 'Chemicals', 'Circuits', 'Tech', 'Goods', 'Operational', 'Financial', 'Technical'];
  });

  // Filtered & Sorted items
  const displayedItems = $derived(() => {
    let list = allItems.filter((item) => {
      // Main tab filter
      if (activeMainTab !== 'ALL' && item.category !== activeMainTab) {
        return false;
      }
      // Sub-category filter
      if (activeSubCategory !== 'ALL' && item.subCategory !== activeSubCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSubCat = item.subCategory.toLowerCase().includes(query);
        const matchesRarity = item.rarity.toLowerCase().includes(query);
        if (!matchesName && !matchesSubCat && !matchesRarity) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'count') {
        cmp = a.count - b.count;
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'value') {
        cmp = a.totalValue - b.totalValue;
      } else if (sortField === 'rarity') {
        cmp = (RARITY_WEIGHT[a.rarity] || 0) - (RARITY_WEIGHT[b.rarity] || 0);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return list;
  });

  function handleMainTabSelect(tab: MainTab) {
    activeMainTab = tab;
    activeSubCategory = 'ALL';
  }

  function toggleSort(field: 'count' | 'name' | 'value' | 'rarity') {
    if (sortField === field) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortField = field;
      sortDirection = 'desc';
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleProcessJournalJson() {
    if (!journalJsonInput.trim()) return;
    try {
      const parsed = JSON.parse(journalJsonInput.trim());
      const result = odysseyLockerEngine.ingestJournalShipLocker(parsed);
      importStatusMsg = `Successfully synced ${result.ingestedCount} item entries into locker. Total count: ${result.totalStored} / 1,000.`;
      journalJsonInput = '';
      setTimeout(() => {
        isJournalImportOpen = false;
        importStatusMsg = null;
      }, 1500);
    } catch (err) {
      importStatusMsg = `JSON Parse Error: ${err instanceof Error ? err.message : 'Invalid event schema'}`;
    }
  }

  function handleLoadSampleJournal() {
    const sample = {
      event: 'ShipLockerMaterials',
      Components: [
        { Name: 'aerogel', Count: 25 },
        { Name: 'circuitboard', Count: 40 },
        { Name: 'titaniumplating', Count: 30 },
        { Name: 'graphene', Count: 12 },
        { Name: 'microthrusters', Count: 14 }
      ],
      Items: [
        { Name: 'weaponschematic', Count: 15 },
        { Name: 'catmedia', Count: 60 },
        { Name: 'ionbattery', Count: 80 }
      ],
      Data: [
        { Name: 'manufacturinginstructions', Count: 22 },
        { Name: 'settlementdefenceplans', Count: 8 },
        { Name: 'smearcampaignplans', Count: 5 }
      ]
    };
    journalJsonInput = JSON.stringify(sample, null, 2);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none font-mono text-white animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="locker-manager-title"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#050a14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.35)] overflow-hidden"
    >
      <!-- Scanline overlay effect -->
      <div class="pointer-events-none absolute inset-0 bg-scanlines opacity-20 z-10"></div>

      <!-- Top Header -->
      <div class="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/80 border-b border-[var(--hud-orange)]/40 z-20">
        <div class="flex items-center space-x-3">
          <Icon name="cargo" size={24} glow={true} color="var(--hud-orange)" />
          <div>
            <div class="flex items-center space-x-2">
              <h2 id="locker-manager-title" class="text-base sm:text-lg font-bold tracking-wider text-[var(--hud-amber)]">
                ODYSSEY ON-FOOT LOCKER MANAGER // INVENTORY AUDIT
              </h2>
              <span class="px-2 py-0.5 text-[10px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold uppercase">
                1,000-Cap Telemetry
              </span>
            </div>
            <div class="text-xs text-[var(--hud-orange-dim)] flex items-center space-x-3 mt-0.5">
              <span>JOURNAL `ShipLockerMaterials` / CAPI SYNC</span>
              <span class="text-white/20">|</span>
              <span class="text-emerald-400 font-bold">cmdr_materials_odyssey</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Journal Ingestion Simulator Button -->
          <button
            type="button"
            class="px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition-colors flex items-center space-x-1.5"
            onclick={() => (isJournalImportOpen = !isJournalImportOpen)}
            title="Import ShipLockerMaterials Journal Event JSON"
          >
            <span>📥</span>
            <span class="hidden sm:inline">JOURNAL SYNC</span>
          </button>

          <!-- Reset Default Demo Data Button -->
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-white/20 hover:border-amber-400/50 bg-black/40 hover:bg-amber-500/10 text-white/70 hover:text-amber-300 text-xs transition-colors"
            onclick={() => odysseyLockerEngine.resetToDefault()}
            title="Reset to default locker sample manifest"
          >
            RESET
          </button>

          <!-- Close Modal Button -->
          <button
            type="button"
            class="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 hover:border-red-500/50 transition-colors"
            onclick={onClose}
            aria-label="Close Odyssey Locker Modal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Capacity Gauge Banner (1,000-Item Cap Telemetry) -->
      <div class="px-4 sm:px-6 py-3 bg-black/60 border-b border-[var(--hud-orange)]/25 z-20">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center space-x-3">
            <span class="text-xs uppercase font-bold tracking-wider text-white/80">Locker Capacity:</span>
            <span
              class="text-sm font-bold {audit.isAtCap
                ? 'text-red-400 animate-pulse'
                : audit.isNearCap
                  ? 'text-amber-400'
                  : 'text-emerald-400'}"
            >
              {audit.totalItems} / {audit.maxCapacity} UNITS ({audit.capacityPercent}%)
            </span>
            {#if audit.isAtCap}
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/50">
                CAP REACHED // BARTENDER LIQUIDATION REQUIRED
              </span>
            {:else if audit.isNearCap}
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                CAP CRITICAL (&gt;80%)
              </span>
            {:else}
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                OPTIMAL CAPACITY
              </span>
            {/if}
          </div>

          <div class="flex items-center space-x-3 text-xs text-white/70">
            <span>
              TOTAL ESTIMATED VALUATION:
              <span class="text-[var(--hud-amber)] font-bold">
                {audit.totalValuationCredits.toLocaleString()} CR
              </span>
            </span>
          </div>
        </div>

        <!-- Meter Gauge Bar -->
        <div class="w-full h-3 rounded-full bg-zinc-900 border border-white/20 overflow-hidden relative p-0.5">
          <div
            class="h-full rounded-full transition-all duration-500 {audit.isAtCap
              ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : audit.isNearCap
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]'}"
            style="width: {audit.capacityPercent}%"
          ></div>

          <!-- 80% Cap Warning Notch -->
          <div
            class="absolute top-0 bottom-0 left-[80%] w-0.5 bg-amber-400/80 z-10"
            title="800 Item Threshold"
          ></div>
        </div>

        <!-- Category Breakdown Stats -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 pt-2 border-t border-white/10 text-[11px]">
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">ASSETS</span>
            <span class="font-bold text-amber-300">{audit.assetsCount} units</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">GOODS</span>
            <span class="font-bold text-emerald-300">{audit.goodsCount} units</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">DATA</span>
            <span class="font-bold text-indigo-300">{audit.dataCount} units</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">CHEMICALS</span>
            <span class="font-bold text-amber-400">{audit.subCategoryCounts.Chemicals}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">CIRCUITS</span>
            <span class="font-bold text-cyan-400">{audit.subCategoryCounts.Circuits}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/50 text-[10px]">TECH</span>
            <span class="font-bold text-orange-400">{audit.subCategoryCounts.Tech}</span>
          </div>
        </div>
      </div>

      <!-- Journal Ingestion Simulator Drawer (Collapsible) -->
      {#if isJournalImportOpen}
        <div class="p-4 bg-zinc-950/95 border-b border-cyan-500/40 z-20 flex flex-col space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
              <span>📥</span>
              <span>PASTE JOURNAL `ShipLockerMaterials` / `ShipLocker` JSON EVENT</span>
            </span>
            <button
              type="button"
              class="text-[11px] text-cyan-400 underline hover:text-cyan-200"
              onclick={handleLoadSampleJournal}
            >
              Insert Test Event Sample
            </button>
          </div>
          <textarea
            bind:value={journalJsonInput}
            class="w-full h-24 p-2 bg-black border border-cyan-500/30 rounded text-xs text-cyan-100 font-mono focus:border-cyan-400 focus:outline-none"
            placeholder="Paste journal JSON event here..."
          ></textarea>
          <div class="flex items-center justify-between">
            {#if importStatusMsg}
              <span class="text-xs text-amber-300 font-semibold">{importStatusMsg}</span>
            {:else}
              <span class="text-[11px] text-white/50">Supports Components (Assets), Items (Goods), and Data lists.</span>
            {/if}
            <div class="flex space-x-2">
              <button
                type="button"
                class="px-3 py-1 rounded bg-black/60 border border-white/20 text-xs hover:border-white/40"
                onclick={() => (isJournalImportOpen = false)}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs shadow-sm transition-colors"
                onclick={handleProcessJournalJson}
              >
                Ingest to Locker Vault
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Category Filter Tabs & SubCategory Selectors -->
      <div class="px-4 sm:px-6 py-2.5 bg-black/70 border-b border-[var(--hud-orange)]/20 flex flex-wrap items-center justify-between gap-3 z-20">
        <!-- Main Category Tabs -->
        <div class="flex items-center space-x-1 sm:space-x-2 text-xs">
          <button
            type="button"
            class="px-3 py-1 rounded border transition-colors {activeMainTab === 'ALL'
              ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
              : 'bg-black/40 text-[var(--hud-orange)] border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
            onclick={() => handleMainTabSelect('ALL')}
          >
            ALL ITEMS ({audit.totalItems})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded border transition-colors {activeMainTab === 'assets'
              ? 'bg-amber-500 text-black font-bold border-amber-300'
              : 'bg-black/40 text-amber-400 border-amber-500/30 hover:border-amber-400'}"
            onclick={() => handleMainTabSelect('assets')}
          >
            ASSETS ({audit.assetsCount})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded border transition-colors {activeMainTab === 'goods'
              ? 'bg-emerald-500 text-black font-bold border-emerald-300'
              : 'bg-black/40 text-emerald-400 border-emerald-500/30 hover:border-emerald-400'}"
            onclick={() => handleMainTabSelect('goods')}
          >
            GOODS ({audit.goodsCount})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded border transition-colors {activeMainTab === 'data'
              ? 'bg-indigo-500 text-black font-bold border-indigo-300'
              : 'bg-black/40 text-indigo-400 border-indigo-500/30 hover:border-indigo-400'}"
            onclick={() => handleMainTabSelect('data')}
          >
            DATA ({audit.dataCount})
          </button>
        </div>

        <!-- Search Bar and Count Sort Quick Toggle -->
        <div class="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <div class="relative flex-1 sm:w-64">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search items, rarity, subcategory..."
              class="w-full px-3 py-1 pl-8 bg-black/60 border border-[var(--hud-orange)]/40 rounded text-xs text-white placeholder-white/40 focus:border-[var(--hud-orange)] focus:outline-none"
            />
            <span class="absolute left-2.5 top-1.5 text-white/40 text-xs">🔍</span>
            {#if searchQuery}
              <button
                type="button"
                class="absolute right-2 top-1 text-white/50 hover:text-white"
                onclick={() => (searchQuery = '')}
              >
                ✕
              </button>
            {/if}
          </div>
        </div>
      </div>

      <!-- SubCategory Filter Pills -->
      <div class="px-4 sm:px-6 py-2 bg-black/40 border-b border-white/10 flex items-center space-x-2 overflow-x-auto text-xs z-20">
        <span class="text-white/40 text-[10px] uppercase font-bold tracking-wider">SUB-CATEGORY:</span>
        {#each currentSubCategories() as subCat}
          <button
            type="button"
            class="px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors {activeSubCategory === subCat
              ? 'bg-white/20 text-white font-bold border border-white/40'
              : 'bg-black/30 text-white/60 hover:text-white border border-white/10 hover:border-white/20'}"
            onclick={() => (activeSubCategory = subCat)}
          >
            {subCat}
          </button>
        {/each}
      </div>

      <!-- Inventory Grid / Table Header -->
      <div class="grid grid-cols-12 gap-2 px-4 sm:px-6 py-2 bg-black/90 border-b border-[var(--hud-orange)]/30 text-[11px] font-bold text-[var(--hud-orange-dim)] z-20">
        <button
          type="button"
          class="col-span-5 sm:col-span-4 text-left flex items-center space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('name')}
        >
          <span>ITEM NAME</span>
          {#if sortField === 'name'}
            <span>{sortDirection === 'desc' ? '▼' : '▲'}</span>
          {/if}
        </button>

        <span class="col-span-3 sm:col-span-2 text-left">SUBCATEGORY</span>

        <button
          type="button"
          class="col-span-2 sm:col-span-2 text-left flex items-center space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('rarity')}
        >
          <span>RARITY</span>
          {#if sortField === 'rarity'}
            <span>{sortDirection === 'desc' ? '▼' : '▲'}</span>
          {/if}
        </button>

        <button
          type="button"
          class="col-span-2 sm:col-span-2 text-right flex items-center justify-end space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('count')}
        >
          <span>COUNT</span>
          {#if sortField === 'count'}
            <span>{sortDirection === 'desc' ? '▼' : '▲'}</span>
          {/if}
        </button>

        <button
          type="button"
          class="hidden sm:col-span-2 sm:flex items-center justify-end space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('value')}
        >
          <span>VALUE (CR)</span>
          {#if sortField === 'value'}
            <span>{sortDirection === 'desc' ? '▼' : '▲'}</span>
          {/if}
        </button>
      </div>

      <!-- Main Item Rows List -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-2 divide-y divide-white/5 space-y-1">
        {#if displayedItems().length === 0}
          <div class="py-16 text-center text-white/40 flex flex-col items-center justify-center space-y-3">
            <span class="text-4xl">📦</span>
            <p class="text-sm">No items found matching the selected filter or search query.</p>
            <button
              type="button"
              class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 text-xs"
              onclick={() => {
                activeMainTab = 'ALL';
                activeSubCategory = 'ALL';
                searchQuery = '';
              }}
            >
              Clear All Filters
            </button>
          </div>
        {:else}
          {#each displayedItems() as item (item.id)}
            <div
              class="grid grid-cols-12 gap-2 py-2 items-center hover:bg-white/[0.03] transition-colors rounded px-1.5"
            >
              <!-- Name & Description Preview -->
              <div class="col-span-5 sm:col-span-4 flex flex-col">
                <div class="flex items-center space-x-1.5">
                  <span class="font-bold text-white text-xs sm:text-sm">{item.name}</span>
                  {#if item.isIllegal}
                    <span class="px-1 py-0.2 rounded text-[9px] bg-red-950/80 text-red-400 border border-red-500/50 font-bold">
                      ILLEGAL
                    </span>
                  {/if}
                </div>
                <span class="text-[10px] text-white/50 line-clamp-1" title={item.description}>
                  {item.description}
                </span>
              </div>

              <!-- Sub-Category Pill -->
              <div class="col-span-3 sm:col-span-2 flex items-center">
                <span
                  class="px-2 py-0.5 rounded text-[10px] border font-bold {SUBCATEGORY_STYLE[item.subCategory]?.border ?? 'border-white/20'} {SUBCATEGORY_STYLE[item.subCategory]?.text ?? 'text-white'} {SUBCATEGORY_STYLE[item.subCategory]?.bg ?? 'bg-white/10'}"
                >
                  {item.subCategory}
                </span>
              </div>

              <!-- Rarity Badge -->
              <div class="col-span-2 sm:col-span-2 flex items-center">
                <span
                  class="px-2 py-0.5 rounded text-[10px] border font-semibold {RARITY_BADGE_STYLE[item.rarity]}"
                >
                  {item.rarity}
                </span>
              </div>

              <!-- Quantity Controls (+ / -) & Count -->
              <div class="col-span-2 sm:col-span-2 flex items-center justify-end space-x-1 sm:space-x-2">
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center bg-black/60 border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                  onclick={() => odysseyLockerEngine.adjustItemCount(item.id, -1)}
                  title="Decrement count"
                >
                  -
                </button>
                <span class="w-8 text-right font-bold text-sm text-[var(--hud-amber)]">
                  {item.count}
                </span>
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center bg-black/60 border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                  onclick={() => odysseyLockerEngine.adjustItemCount(item.id, 1)}
                  title="Increment count"
                >
                  +
                </button>
              </div>

              <!-- Credit Valuation -->
              <div class="hidden sm:col-span-2 sm:flex flex-col items-end">
                <span class="font-bold text-xs text-white/90">
                  {item.totalValue.toLocaleString()} CR
                </span>
                <span class="text-[10px] text-white/40">
                  @{item.baseValue.toLocaleString()} ea
                </span>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Bottom Status Bar -->
      <div class="px-4 sm:px-6 py-2.5 bg-black/90 border-t border-[var(--hud-orange)]/40 flex items-center justify-between text-xs text-white/60 z-20">
        <div class="flex items-center space-x-3">
          <span>
            SHOWING: <span class="text-white font-bold">{displayedItems().length}</span> UNIQUE ITEMS
          </span>
          <span class="text-white/20">|</span>
          <span class="text-emerald-400">
            AUTO-SAVED TO INDEXEDDB VAULT
          </span>
        </div>

        <div class="flex items-center space-x-3">
          <span class="text-[10px] text-[var(--hud-orange-dim)]">
            PHASE 10 // STAGE 10.1 DELIVERABLE
          </span>
          <button
            type="button"
            class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] font-bold text-xs transition-colors"
            onclick={onClose}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
