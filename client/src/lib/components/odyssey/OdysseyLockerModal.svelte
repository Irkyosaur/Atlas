<script lang="ts">
  // Location: atlas/client/src/lib/components/odyssey/OdysseyLockerModal.svelte
  // Odyssey Locker Manager & "Safe-to-Sell" Junk Asset Triage (Phase 10, Stage 10.1 & 10.2)
  // Provides on-foot Odyssey asset lockers (Assets, Goods, Data), capacity gauge,
  // category tabs with sub-categories, instant search, quantity sorting,
  // Safe-to-Sell clean list triage, user wishlist protection, bartender windfall calculation,
  // and one-click bulk liquidation simulation.

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
  import {
    odysseyTriageEngine,
    type OdysseyTriageItemView,
    type OdysseyLiquidationSummary,
    type LiquidationExecutionResult,
  } from '$engine/odyssey_triage_engine';
  import {
    ODYSSEY_BLUEPRINTS,
    type OdysseyBlueprintDefinition,
  } from '$engine/odyssey_blueprint_catalog';
  import OdysseyBarterCalculator from './OdysseyBarterCalculator.svelte';
  import OdysseyWishlistPlanner from './OdysseyWishlistPlanner.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let audit = $state<OdysseyLockerAudit>(odysseyLockerEngine.getAudit());
  let allItems = $state<OdysseyLockerItem[]>(odysseyLockerEngine.getAllItems());

  // Safe-to-Sell & Triage State (Stage 10.2)
  let isSafeToSellOnly = $state<boolean>(false);
  let isWishlistDrawerOpen = $state<boolean>(false);
  let liquidationSummary = $state<OdysseyLiquidationSummary>(
    odysseyTriageEngine.calculateLiquidationSummary(odysseyLockerEngine.getAllItems())
  );
  let canUndo = $state<boolean>(odysseyTriageEngine.hasUndoAvailable());
  let lastExecutionResult = $state<LiquidationExecutionResult | null>(null);
  let selectedBlueprintFilter = $state<string>('ALL');

  // View Mode: 'locker' (Inventory / Triage) vs 'barter' (Bartender) vs 'wishlist' (Suit & Weapon Wishlist / Engineers)
  let viewMode = $state<'locker' | 'barter' | 'wishlist'>('locker');

  // Category and SubCategory Filtering
  type MainTab = 'ALL' | 'assets' | 'goods' | 'data';
  let activeMainTab = $state<MainTab>('ALL');
  let activeSubCategory = $state<string>('ALL');

  // Search & Sorting
  let searchQuery = $state<string>('');
  let sortField = $state<'count' | 'name' | 'value' | 'rarity' | 'status'>('count');
  let sortDirection = $state<'desc' | 'asc'>('desc');

  // Simulation / Ingestion JSON modal state
  let isJournalImportOpen = $state<boolean>(false);
  let journalJsonInput = $state<string>('');
  let importStatusMsg = $state<string | null>(null);

  let unsubscribeLocker: (() => void) | null = null;
  let unsubscribeTriage: (() => void) | null = null;

  onMount(() => {
    odysseyLockerEngine.init();
    odysseyTriageEngine.init();

    unsubscribeLocker = odysseyLockerEngine.subscribe(() => {
      audit = odysseyLockerEngine.getAudit();
      allItems = odysseyLockerEngine.getAllItems();
      liquidationSummary = odysseyTriageEngine.calculateLiquidationSummary(allItems);
      canUndo = odysseyTriageEngine.hasUndoAvailable();
    });

    unsubscribeTriage = odysseyTriageEngine.subscribe(() => {
      liquidationSummary = odysseyTriageEngine.calculateLiquidationSummary(allItems);
      canUndo = odysseyTriageEngine.hasUndoAvailable();
    });
  });

  onDestroy(() => {
    if (unsubscribeLocker) unsubscribeLocker();
    if (unsubscribeTriage) unsubscribeTriage();
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

  // Filtered & Sorted items with integrated Triage
  const displayedItems = $derived(() => {
    let list: OdysseyTriageItemView[] = allItems.map((item) => odysseyTriageEngine.triageItem(item));

    list = list.filter((triaged) => {
      // Safe-to-Sell Mode: only non-critical junk with zero blueprints/unlocks AND not wishlist protected
      if (isSafeToSellOnly && !triaged.isSafeToSell) {
        return false;
      }
      // Main tab filter
      if (activeMainTab !== 'ALL' && triaged.item.category !== activeMainTab) {
        return false;
      }
      // Sub-category filter
      if (activeSubCategory !== 'ALL' && triaged.item.subCategory !== activeSubCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = triaged.item.name.toLowerCase().includes(query);
        const matchesSubCat = triaged.item.subCategory.toLowerCase().includes(query);
        const matchesRarity = triaged.item.rarity.toLowerCase().includes(query);
        const matchesStatus = triaged.status.toLowerCase().includes(query);
        const matchesBlueprints = triaged.crossRef.blueprints.some((bp) => bp.toLowerCase().includes(query));
        const matchesUnlocks = triaged.crossRef.engineerUnlocks.some((u) => u.toLowerCase().includes(query));
        if (
          !matchesName &&
          !matchesSubCat &&
          !matchesRarity &&
          !matchesStatus &&
          !matchesBlueprints &&
          !matchesUnlocks
        ) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'count') {
        cmp = a.item.count - b.item.count;
      } else if (sortField === 'name') {
        cmp = a.item.name.localeCompare(b.item.name);
      } else if (sortField === 'value') {
        cmp = a.item.totalValue - b.item.totalValue;
      } else if (sortField === 'rarity') {
        cmp = (RARITY_WEIGHT[a.item.rarity] || 0) - (RARITY_WEIGHT[b.item.rarity] || 0);
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return list;
  });

  function handleMainTabSelect(tab: MainTab) {
    activeMainTab = tab;
    activeSubCategory = 'ALL';
  }

  function toggleSort(field: 'count' | 'name' | 'value' | 'rarity' | 'status') {
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

  function handleLiquidateAllSafeToSell() {
    if (liquidationSummary.totalSafeUnits <= 0) return;
    const result = odysseyTriageEngine.liquidateSafeToSell();
    lastExecutionResult = result;
    canUndo = true;
  }

  function handleUndoLiquidation() {
    const success = odysseyTriageEngine.undoLiquidation();
    if (success) {
      lastExecutionResult = null;
      canUndo = false;
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
        { Name: 'microthrusters', Count: 14 },
      ],
      Items: [
        { Name: 'weaponschematic', Count: 15 },
        { Name: 'catmedia', Count: 60 },
        { Name: 'ionbattery', Count: 80 },
        { Name: 'lockerkeys', Count: 25 },
      ],
      Data: [
        { Name: 'manufacturinginstructions', Count: 22 },
        { Name: 'settlementdefenceplans', Count: 8 },
        { Name: 'smearcampaignplans', Count: 5 },
        { Name: 'airqualityreports', Count: 35 },
      ],
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
      class="relative w-full max-w-7xl max-h-[94vh] flex flex-col bg-[#050a14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.35)] overflow-hidden"
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
                ODYSSEY LOCKER // "SAFE-TO-SELL" JUNK ASSET TRIAGE
              </h2>
              <span class="px-2 py-0.5 text-[10px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold uppercase">
                Stage 10.2
              </span>
            </div>
            <div class="text-xs text-[var(--hud-orange-dim)] flex items-center space-x-3 mt-0.5">
              <span>BARTENDER CONCOURSE LIQUIDATION & WISHLIST PROTECTION</span>
              <span class="text-white/20">|</span>
              <span class="text-emerald-400 font-bold">1,000-CAP TRIAGE</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- View Mode Toggle: Locker Vault vs Barter Calculator vs Wishlist Planner -->
          <div class="flex items-center bg-black/60 p-0.5 rounded border border-[var(--hud-orange)]/40 mr-1">
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs font-bold transition-all {viewMode === 'locker'
                ? 'bg-[var(--hud-orange)] text-black shadow-sm'
                : 'text-white/70 hover:text-white'}"
              onclick={() => (viewMode = 'locker')}
            >
              📦 LOCKER VAULT
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs font-bold transition-all {viewMode === 'barter'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300'}"
              onclick={() => (viewMode = 'barter')}
            >
              🍸 BARTER
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs font-bold transition-all {viewMode === 'wishlist'
                ? 'bg-purple-500 text-black shadow-sm'
                : 'text-purple-300/80 hover:text-purple-200'}"
              onclick={() => (viewMode = 'wishlist')}
            >
              🛠️ WISHLIST & ENGINEERS
            </button>
          </div>

          <!-- Safe-to-Sell Quick Toggle -->
          <button
            type="button"
            class="px-3 py-1.5 rounded border text-xs font-bold transition-all flex items-center space-x-1.5 {isSafeToSellOnly
              ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : 'border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-500/20 text-emerald-300'}"
            onclick={() => (isSafeToSellOnly = !isSafeToSellOnly)}
            title="Filter inventory to isolate only safe-to-sell junk items (Cat Media, Locker Keys, obsolete data)"
          >
            <span>🛡️</span>
            <span>{isSafeToSellOnly ? 'SAFE-TO-SELL ACTIVE' : 'SAFE-TO-SELL FILTER'}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] {isSafeToSellOnly ? 'bg-black/30 text-emerald-200' : 'bg-emerald-900/60 text-emerald-300'}">
              {liquidationSummary.totalSafeUnits}
            </span>
          </button>

          <!-- Wishlist Drawer Toggle Button -->
          <button
            type="button"
            class="px-3 py-1.5 rounded border text-xs font-bold transition-all flex items-center space-x-1.5 {isWishlistDrawerOpen
              ? 'bg-amber-500 text-black border-amber-300'
              : 'border-amber-500/40 bg-amber-950/30 hover:bg-amber-500/20 text-amber-300'}"
            onclick={() => (isWishlistDrawerOpen = !isWishlistDrawerOpen)}
            title="Configure Active Engineering Wishlist Protection"
          >
            <span>🔒</span>
            <span class="hidden sm:inline">WISHLIST</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] {isWishlistDrawerOpen ? 'bg-black/30 text-amber-200' : 'bg-amber-900/60 text-amber-300'}">
              {odysseyTriageEngine.getActiveBlueprintIds().length}
            </span>
          </button>

          <!-- Journal Ingestion Simulator Button -->
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition-colors flex items-center space-x-1"
            onclick={() => (isJournalImportOpen = !isJournalImportOpen)}
            title="Import ShipLockerMaterials Journal Event JSON"
          >
            <span>📥</span>
            <span class="hidden md:inline">SYNC</span>
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
      <div class="px-4 sm:px-6 py-2.5 bg-black/60 border-b border-[var(--hud-orange)]/25 z-20">
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

          <div class="flex items-center space-x-4 text-xs text-white/70">
            <span>
              TOTAL ESTIMATED VALUATION:
              <span class="text-[var(--hud-amber)] font-bold">
                {audit.totalValuationCredits.toLocaleString()} CR
              </span>
            </span>
            <span>
              BARTENDER WINDFALL:
              <span class="text-emerald-400 font-bold">
                +{liquidationSummary.totalWindfallCredits.toLocaleString()} CR
              </span>
            </span>
          </div>
        </div>

        <!-- Meter Gauge Bar -->
        <div class="w-full h-2.5 rounded-full bg-zinc-900 border border-white/20 overflow-hidden relative p-0.5">
          <div
            class="h-full rounded-full transition-all duration-500 {audit.isAtCap
              ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : audit.isNearCap
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]'}"
            style="width: {audit.capacityPercent}%"
          ></div>
          <!-- 80% Cap Warning Notch -->
          <div class="absolute top-0 bottom-0 left-[80%] w-0.5 bg-amber-400/80 z-10" title="800 Item Threshold"></div>
        </div>
      </div>

      <!-- Bartender Windfall Liquidation Banner (Stage 10.2 Deliverable) -->
      <div class="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950/50 via-black to-zinc-950 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 z-20">
        <div class="flex items-center space-x-3 text-xs">
          <span class="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm">
            🍸
          </span>
          <div class="flex flex-col">
            <div class="flex items-center space-x-2">
              <span class="font-bold text-white uppercase tracking-wider">
                CONCOURSE BARTENDER LIQUIDATION TRIAGE
              </span>
              <span class="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                SAFE TO SELL: {liquidationSummary.totalSafeUnits} UNITS ({liquidationSummary.totalSafeUniqueTypes} TYPES)
              </span>
            </div>
            <div class="text-[11px] text-white/60 flex items-center space-x-2 mt-0.5">
              <span>Station Concourse Lounge // Instant Credit Windfall:</span>
              <span class="text-emerald-300 font-bold text-xs">
                +{liquidationSummary.totalWindfallCredits.toLocaleString()} CR
              </span>
              <span class="text-white/30">•</span>
              <span>Reclaims:</span>
              <span class="text-amber-300 font-bold">
                -{liquidationSummary.totalSafeUnits} Slots ({liquidationSummary.capacityFreedPercent}% Capacity)
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2 text-xs">
          {#if canUndo}
            <button
              type="button"
              class="px-3 py-1.5 rounded border border-amber-500/60 bg-amber-950/40 hover:bg-amber-500/20 text-amber-300 font-bold transition-colors flex items-center space-x-1"
              onclick={handleUndoLiquidation}
              title="Revert the most recent bulk liquidation"
            >
              <span>↩️</span>
              <span>UNDO LIQUIDATION</span>
            </button>
          {/if}

          <button
            type="button"
            class="px-4 py-1.5 rounded font-bold text-xs transition-all flex items-center space-x-2 {liquidationSummary.totalSafeUnits > 0
              ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer'
              : 'bg-zinc-800 text-white/40 border border-white/10 cursor-not-allowed'}"
            disabled={liquidationSummary.totalSafeUnits <= 0}
            onclick={handleLiquidateAllSafeToSell}
            title="Bulk sell all non-wishlist safe-to-sell assets at Concourse Bartender"
          >
            <span>💰</span>
            <span>LIQUIDATE ALL SAFE-TO-SELL (+{liquidationSummary.totalWindfallCredits.toLocaleString()} CR)</span>
          </button>
        </div>
      </div>

      <!-- Bulk Liquidation Toast Banner -->
      {#if lastExecutionResult}
        <div class="px-4 sm:px-6 py-2 bg-emerald-950/90 border-b border-emerald-400 text-xs flex items-center justify-between text-emerald-200 z-20 animate-fade-in">
          <div class="flex items-center space-x-2">
            <span>✅</span>
            <span>
              <strong>CONCOURSE BARTENDER TRANSACTION EXECUTED:</strong> Liquidated
              <span class="font-bold text-white">{lastExecutionResult.unitsSold}</span> junk units across
              <span class="font-bold text-white">{lastExecutionResult.uniqueTypesSold}</span> item types.
              Earned <span class="font-bold text-emerald-300">+{lastExecutionResult.creditsEarned.toLocaleString()} CR</span>.
              New locker capacity: <span class="font-bold text-amber-300">{lastExecutionResult.remainingLockerCount} / 1,000</span>.
            </span>
          </div>
          <button
            type="button"
            class="text-[10px] text-white/60 hover:text-white underline ml-3"
            onclick={() => (lastExecutionResult = null)}
          >
            Dismiss
          </button>
        </div>
      {/if}

      <!-- Wishlist Protection Configuration Drawer (Collapsible) -->
      {#if isWishlistDrawerOpen}
        <div class="p-4 bg-zinc-950 border-b border-amber-500/40 z-20 flex flex-col space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-sm">🔒</span>
              <span class="text-xs font-bold text-amber-300 uppercase tracking-wider">
                ACTIVE ENGINEERING WISHLIST PROTECTION (STAGE 10.2)
              </span>
              <span class="text-[10px] text-white/50">
                Items needed for active blueprints are permanently locked and cannot be flagged as safe to sell.
              </span>
            </div>
            <div class="flex space-x-2">
              <button
                type="button"
                class="px-2.5 py-0.5 rounded text-[11px] bg-amber-950/40 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                onclick={() => odysseyTriageEngine.clearWishlist()}
              >
                Clear All
              </button>
              <button
                type="button"
                class="px-2.5 py-0.5 rounded text-[11px] bg-zinc-800 text-white/70 hover:text-white"
                onclick={() => (isWishlistDrawerOpen = false)}
              >
                Close
              </button>
            </div>
          </div>

          <!-- Blueprint Chips Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {#each ODYSSEY_BLUEPRINTS as bp (bp.id)}
              {@const isChecked = odysseyTriageEngine.isBlueprintInWishlist(bp.id)}
              <button
                type="button"
                class="p-2 rounded border text-left transition-all flex flex-col justify-between {isChecked
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-black/40 border-white/10 hover:border-white/30 text-white/60'}"
                onclick={() => odysseyTriageEngine.toggleBlueprintWishlist(bp.id)}
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs {isChecked ? 'text-amber-300' : 'text-white'}">
                    {bp.name}
                  </span>
                  <span class="text-xs">{isChecked ? '🔒' : '○'}</span>
                </div>
                <span class="text-[10px] text-white/40 line-clamp-1 mt-1">{bp.description}</span>
                <div class="flex flex-wrap gap-1 mt-1.5">
                  {#each bp.requiredMaterials as mat}
                    <span class="px-1 py-0.2 rounded text-[9px] bg-black/60 text-amber-200/70 border border-amber-500/20">
                      {mat.itemId}
                    </span>
                  {/each}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

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

      {#if viewMode === 'barter'}
        <!-- Stage 10.3: Concourse Bartender Barter Calculator & Optimizer View -->
        <div class="flex-1 overflow-hidden">
          <OdysseyBarterCalculator />
        </div>
      {:else if viewMode === 'wishlist'}
        <!-- Stage 10.4: On-Foot Suit & Weapon Engineering Blueprint Tracker & Wishlist Planner -->
        <div class="flex-1 overflow-hidden">
          <OdysseyWishlistPlanner />
        </div>
      {:else}
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
          <div class="relative flex-1 sm:w-72">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search items, blueprints, rarity, status..."
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
          class="col-span-4 sm:col-span-3 text-left flex items-center space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('name')}
        >
          <span>ITEM NAME</span>
          {#if sortField === 'name'}
            <span>{sortDirection === 'desc' ? '▼' : '▲'}</span>
          {/if}
        </button>

        <span class="hidden sm:col-span-2 sm:block text-left">SUBCATEGORY</span>

        <button
          type="button"
          class="col-span-4 sm:col-span-3 text-left flex items-center space-x-1 hover:text-[var(--hud-orange)]"
          onclick={() => toggleSort('status')}
        >
          <span>TRIAGE STATUS</span>
          {#if sortField === 'status'}
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
          class="col-span-2 sm:col-span-2 text-right flex items-center justify-end space-x-1 hover:text-[var(--hud-orange)]"
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
            <p class="text-sm">
              {isSafeToSellOnly
                ? 'All junk items have been successfully liquidated or protected by your active engineering wishlist.'
                : 'No items found matching the selected filter or search query.'}
            </p>
            <button
              type="button"
              class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 text-xs"
              onclick={() => {
                isSafeToSellOnly = false;
                activeMainTab = 'ALL';
                activeSubCategory = 'ALL';
                searchQuery = '';
              }}
            >
              Clear All Filters
            </button>
          </div>
        {:else}
          {#each displayedItems() as triaged (triaged.item.id)}
            <div
              class="grid grid-cols-12 gap-2 py-2 items-center hover:bg-white/[0.03] transition-colors rounded px-1.5 {triaged.isSafeToSell
                ? 'border-l-2 border-emerald-500/60 bg-emerald-950/10'
                : triaged.status === 'wishlist_locked'
                  ? 'border-l-2 border-amber-400/60 bg-amber-950/10'
                  : ''}"
            >
              <!-- Name & Description Preview -->
              <div class="col-span-4 sm:col-span-3 flex flex-col">
                <div class="flex items-center space-x-1.5">
                  <button
                    type="button"
                    class="p-0.5 rounded text-xs transition-colors {triaged.isWishlistProtected
                      ? 'text-amber-400 hover:text-amber-200'
                      : 'text-white/30 hover:text-white'}"
                    onclick={() => odysseyTriageEngine.toggleManualItemLock(triaged.item.id)}
                    title={triaged.isWishlistProtected
                      ? 'Wishlist Locked: Click to toggle manual commander lock'
                      : 'Click to lock and protect from sale'}
                  >
                    {triaged.isWishlistProtected ? '🔒' : '🔓'}
                  </button>
                  <span class="font-bold text-white text-xs sm:text-sm">{triaged.item.name}</span>
                  {#if triaged.item.isIllegal}
                    <span class="px-1 py-0.2 rounded text-[9px] bg-red-950/80 text-red-400 border border-red-500/50 font-bold">
                      ILLEGAL
                    </span>
                  {/if}
                </div>
                <span class="text-[10px] text-white/50 line-clamp-1" title={triaged.item.description}>
                  {triaged.item.description}
                </span>
              </div>

              <!-- Sub-Category Pill -->
              <div class="hidden sm:col-span-2 sm:flex items-center space-x-1.5">
                <span
                  class="px-2 py-0.5 rounded text-[10px] border font-bold {SUBCATEGORY_STYLE[triaged.item.subCategory]?.border ?? 'border-white/20'} {SUBCATEGORY_STYLE[triaged.item.subCategory]?.text ?? 'text-white'} {SUBCATEGORY_STYLE[triaged.item.subCategory]?.bg ?? 'bg-white/10'}"
                >
                  {triaged.item.subCategory}
                </span>
                <span class="px-1.5 py-0.5 rounded text-[9px] border font-semibold {RARITY_BADGE_STYLE[triaged.item.rarity]}">
                  {triaged.item.rarity}
                </span>
              </div>

              <!-- Triage Status Badge & Blueprint Cross-Ref -->
              <div class="col-span-4 sm:col-span-3 flex flex-col justify-center">
                {#if triaged.status === 'wishlist_locked'}
                  <div class="flex items-center space-x-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                      🔒 WISHLIST LOCKED
                    </span>
                  </div>
                  <span class="text-[9px] text-amber-200/60 line-clamp-1 mt-0.5" title={triaged.crossRef.safeToSellReason}>
                    Protected by active engineering wishlist
                  </span>
                {:else if triaged.status === 'safe_to_sell'}
                  <div class="flex items-center space-x-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                      🛡️ SAFE TO SELL
                    </span>
                  </div>
                  <span class="text-[9px] text-emerald-400/70 line-clamp-1 mt-0.5" title={triaged.crossRef.safeToSellReason}>
                    0 recipes • Bartender liquidation ready
                  </span>
                {:else if triaged.status === 'engineer_unlock'}
                  <div class="flex items-center space-x-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/60">
                      🔓 ENGINEER UNLOCK
                    </span>
                  </div>
                  <span class="text-[9px] text-purple-300/70 line-clamp-1 mt-0.5" title={triaged.crossRef.engineerUnlocks.join(', ')}>
                    {triaged.crossRef.engineerUnlocks.join(', ')}
                  </span>
                {:else}
                  <div class="flex items-center space-x-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/60">
                      ⚙️ BLUEPRINT
                    </span>
                    {#if triaged.crossRef.isCritical}
                      <span class="px-1 py-0.2 rounded text-[9px] bg-red-950 text-red-400 border border-red-500/50 font-bold">
                        VITAL
                      </span>
                    {/if}
                  </div>
                  <span class="text-[9px] text-cyan-200/60 line-clamp-1 mt-0.5" title={triaged.crossRef.blueprints.join(', ')}>
                    {triaged.crossRef.blueprints.join(', ')}
                  </span>
                {/if}
              </div>

              <!-- Quantity Controls (+ / -) & Count -->
              <div class="col-span-2 sm:col-span-2 flex items-center justify-end space-x-1 sm:space-x-2">
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center bg-black/60 border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                  onclick={() => odysseyLockerEngine.adjustItemCount(triaged.item.id, -1)}
                  title="Decrement count"
                >
                  -
                </button>
                <span class="w-8 text-right font-bold text-sm text-[var(--hud-amber)]">
                  {triaged.item.count}
                </span>
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center bg-black/60 border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                  onclick={() => odysseyLockerEngine.adjustItemCount(triaged.item.id, 1)}
                  title="Increment count"
                >
                  +
                </button>
              </div>

              <!-- Credit Valuation -->
              <div class="col-span-2 sm:col-span-2 flex flex-col items-end">
                <span class="font-bold text-xs {triaged.isSafeToSell ? 'text-emerald-400' : 'text-white/90'}">
                  {triaged.item.totalValue.toLocaleString()} CR
                </span>
                <span class="text-[10px] text-white/40">
                  @{triaged.item.baseValue.toLocaleString()} ea
                </span>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      {/if}

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
          <span class="text-white/20">|</span>
          <span class="text-amber-300">
            {odysseyTriageEngine.getActiveBlueprintIds().length} WISHLIST BLUEPRINTS ACTIVE
          </span>
        </div>

        <div class="flex items-center space-x-3">
          <span class="text-[10px] text-[var(--hud-orange-dim)]">
            PHASE 10 // STAGE 10.2 DELIVERABLE
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
