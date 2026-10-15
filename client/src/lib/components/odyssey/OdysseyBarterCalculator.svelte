<script lang="ts">
  // Location: atlas/client/src/lib/components/odyssey/OdysseyBarterCalculator.svelte
  // Odyssey Concourse Bartender Barter Calculator & Material Trade Optimizer (Phase 10, Stage 10.3)
  // Provides:
  // - Category pool isolated asset swapping (Chemicals, Circuits, Tech)
  // - Clear warning & highlight for non-tradeable Goods & Data
  // - Barter Trade Optimizer targeting desired assets (Micro Hydraulics, Carbon Fibre, etc.)
  // - Surplus inventory surrender planner with wishlist lock protection and waste reduction
  // - Starport concierge listing nearest concourse Bartenders with pad sizes, system distance, and security
  // - Direct execution of simulated barter trades

  import { onMount, onDestroy } from 'svelte';
  import {
    odysseyBarterEngine,
    type BarterOptimizationResult,
    type BartenderContactStarport,
    type DirectTradeExchangeRate,
  } from '$engine/odyssey_barter_engine';
  import {
    odysseyLockerEngine,
    type OdysseyLockerItem,
  } from '$engine/odyssey_locker_engine';
  import {
    type OdysseySubCategory,
    type OdysseyItemDefinition,
    ODYSSEY_CATALOG_MAP,
  } from '$engine/odyssey_locker_catalog';
  import { odysseyTriageEngine } from '$engine/odyssey_triage_engine';

  interface Props {
    onClose?: () => void;
  }

  let { onClose }: Props = $props();

  let activeSubCategory = $state<OdysseySubCategory>('Tech');
  let selectedTargetId = $state<string>(odysseyBarterEngine.getSelectedTargetItemId());
  let desiredQuantity = $state<number>(odysseyBarterEngine.getDesiredQuantity());
  let preferSafeToSell = $state<boolean>(odysseyBarterEngine.getPreferSafeToSellFirst());
  let protectWishlist = $state<boolean>(odysseyBarterEngine.getProtectWishlistItems());

  let nearbyStarports = $state<BartenderContactStarport[]>(
    odysseyBarterEngine.getNearbyBartenderStarports(150)
  );

  let barterPlan = $derived.by(() => {
    // Re-evaluates automatically whenever selectedTargetId, desiredQuantity, preferSafeToSell, protectWishlist, or locker changes
    const _rev = lockerRevision;
    return odysseyBarterEngine.computeOptimalBarterPlan(selectedTargetId, desiredQuantity);
  });

  let lastTradeMessage = $state<{ success: boolean; text: string } | null>(null);

  // Quick 1:1 Rate Explorer
  let explorerSourceId = $state<string>('memorychip');
  let directRate = $derived.by(() => {
    try {
      return odysseyBarterEngine.calculateExchangeRate(explorerSourceId, selectedTargetId);
    } catch {
      return null;
    }
  });

  let unsubscribeBarter: (() => void) | null = null;
  let unsubscribeLocker: (() => void) | null = null;
  let lockerRevision = $state<number>(0);

  function syncEngineSettings() {
    odysseyBarterEngine.setSelectedTargetItemId(selectedTargetId);
    odysseyBarterEngine.setDesiredQuantity(desiredQuantity);
    odysseyBarterEngine.setPreferSafeToSellFirst(preferSafeToSell);
    odysseyBarterEngine.setProtectWishlistItems(protectWishlist);
  }

  onMount(() => {
    unsubscribeBarter = odysseyBarterEngine.subscribe(() => {
      lockerRevision++;
    });

    unsubscribeLocker = odysseyLockerEngine.subscribe(() => {
      lockerRevision++;
    });

    // Sync subcategory with currently selected target
    const currentTargetDef = ODYSSEY_CATALOG_MAP.get(selectedTargetId);
    if (currentTargetDef && currentTargetDef.category === 'assets') {
      activeSubCategory = currentTargetDef.subCategory;
    }
  });

  onDestroy(() => {
    if (unsubscribeBarter) unsubscribeBarter();
    if (unsubscribeLocker) unsubscribeLocker();
  });

  function handleSelectSubCategory(subCat: OdysseySubCategory) {
    activeSubCategory = subCat;
    const available = odysseyBarterEngine.getBarterableAssets(subCat);
    if (available.length > 0) {
      selectedTargetId = available[0].id;
      // Also pick a sensible default explorer source
      explorerSourceId = available[available.length - 1].id;
      syncEngineSettings();
    }
  }

  function handleSelectTarget(id: string) {
    selectedTargetId = id;
    syncEngineSettings();
  }

  function handleQuantityChange(delta: number) {
    desiredQuantity = Math.max(1, Math.min(100, desiredQuantity + delta));
    syncEngineSettings();
  }

  function handleExecuteTrade() {
    if (!barterPlan.isFullyFunded && barterPlan.unitsAcquirable === 0) return;
    const result = odysseyBarterEngine.executeBarterTrade(barterPlan);
    lastTradeMessage = { success: result.success, text: result.message };
    syncEngineSettings();
  }

  function getTargetDefinition(): OdysseyItemDefinition {
    return ODYSSEY_CATALOG_MAP.get(selectedTargetId) ?? ODYSSEY_CATALOG_MAP.get('aerogelgelpack')!;
  }

  const categoryAssets = $derived.by(() => {
    return odysseyBarterEngine.getBarterableAssets(activeSubCategory);
  });
</script>

<div class="flex flex-col h-full bg-zinc-950 text-white font-mono text-xs overflow-hidden">
  <!-- Top Barter Header & Category Selector -->
  <div class="p-4 bg-black/80 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
    <div class="flex items-center space-x-3">
      <span class="p-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-lg">
        🍸
      </span>
      <div>
        <div class="flex items-center space-x-2">
          <h2 class="text-sm font-bold text-amber-300 uppercase tracking-wider">
            CONCOURSE BARTENDER BARTER CALCULATOR & TRADE OPTIMIZER
          </h2>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300">
            STAGE 10.3
          </span>
        </div>
        <p class="text-[11px] text-white/60 mt-0.5">
          Assets swap at fixed ratios within category families. Goods & Data cannot be bartered (credit liquidation only).
        </p>
      </div>
    </div>

    <!-- Category Family Tabs (Chemicals, Circuits, Tech) -->
    <div class="flex items-center space-x-1.5 bg-black/60 p-1 rounded border border-white/10">
      <span class="text-[10px] text-white/40 uppercase font-bold px-2">POOL:</span>
      <button
        type="button"
        class="px-3 py-1 rounded text-xs font-bold transition-all {activeSubCategory === 'Chemicals'
          ? 'bg-amber-500 text-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
          : 'text-amber-400/80 hover:text-amber-300 hover:bg-white/5'}"
        onclick={() => handleSelectSubCategory('Chemicals')}
      >
        CHEMICALS ({odysseyBarterEngine.getBarterableAssets('Chemicals').length})
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded text-xs font-bold transition-all {activeSubCategory === 'Circuits'
          ? 'bg-cyan-500 text-black border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
          : 'text-cyan-400/80 hover:text-cyan-300 hover:bg-white/5'}"
        onclick={() => handleSelectSubCategory('Circuits')}
      >
        CIRCUITS ({odysseyBarterEngine.getBarterableAssets('Circuits').length})
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded text-xs font-bold transition-all {activeSubCategory === 'Tech'
          ? 'bg-orange-500 text-black border border-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.4)]'
          : 'text-orange-400/80 hover:text-orange-300 hover:bg-white/5'}"
        onclick={() => handleSelectSubCategory('Tech')}
      >
        TECH ({odysseyBarterEngine.getBarterableAssets('Tech').length})
      </button>
    </div>
  </div>

  <!-- Non-Tradeable Notice Alert Banner -->
  <div class="px-4 py-2 bg-gradient-to-r from-red-950/40 via-black to-zinc-950 border-b border-red-500/20 flex items-center justify-between text-[11px] shrink-0">
    <div class="flex items-center space-x-2 text-red-300/90">
      <span class="text-xs">⚠️</span>
      <span class="font-bold">NON-BARTERABLE INVENTORY RULE:</span>
      <span class="text-white/70">
        Goods (e.g. Schematics, Medkits) and Data (e.g. Manufacturing Instructions) <strong>CANNOT</strong> be bartered at Bartenders. Use the
        <span class="text-emerald-400 font-semibold">Triage Clean List</span> to sell junk Goods/Data for credits.
      </span>
    </div>
    <div class="flex items-center space-x-3 text-white/50 text-[10px]">
      <span>CONCOURSE RESTRICTION: No Cross-Category Trades</span>
    </div>
  </div>

  <!-- Main Split Layout -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
    <!-- Left Column: Target Asset Selector & Configuration (5 cols) -->
    <div class="lg:col-span-5 border-r border-white/10 flex flex-col bg-black/40 overflow-hidden">
      <!-- Target Asset Picker Header -->
      <div class="p-3 bg-zinc-900/60 border-b border-white/10 flex items-center justify-between">
        <span class="font-bold text-xs uppercase tracking-wider text-amber-300">
          1. SELECT DESIRED TARGET ASSET ({activeSubCategory})
        </span>
        <div class="flex items-center space-x-2">
          <label class="text-[10px] text-white/60 flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={protectWishlist}
              onchange={syncEngineSettings}
              class="accent-amber-500"
            />
            <span>Lock Wishlist</span>
          </label>
          <label class="text-[10px] text-white/60 flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={preferSafeToSell}
              onchange={syncEngineSettings}
              class="accent-emerald-500"
            />
            <span>Surplus First</span>
          </label>
        </div>
      </div>

      <!-- Target Asset Cards Grid -->
      <div class="p-3 overflow-y-auto space-y-2 flex-1">
        {#each categoryAssets as asset (asset.id)}
          {@const isSelected = selectedTargetId === asset.id}
          {@const lockerCount = odysseyLockerEngine.getItemCount(asset.id)}
          <button
            type="button"
            class="w-full p-2.5 rounded border text-left transition-all flex items-center justify-between {isSelected
              ? 'bg-amber-950/40 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-black/50 border-white/10 hover:border-white/30 text-white/80'}"
            onclick={() => handleSelectTarget(asset.id)}
          >
            <div class="flex flex-col flex-1 pr-3">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-xs {isSelected ? 'text-amber-300' : 'text-white'}">
                  {asset.name}
                </span>
                <span class="px-1.5 py-0.2 rounded text-[9px] bg-black/60 border border-white/20 text-white/60">
                  {asset.rarity}
                </span>
              </div>
              <span class="text-[10px] text-white/40 line-clamp-1 mt-0.5">{asset.description}</span>
            </div>

            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center space-x-1">
                <span class="text-[10px] text-white/40">Cost:</span>
                <span class="text-xs font-bold text-amber-400">{asset.barterCost ?? 7} pts</span>
              </div>
              <span class="text-[10px] text-white/60 mt-0.5">
                In Locker: <strong class="text-white">{lockerCount}</strong>
              </span>
            </div>
          </button>
        {/each}
      </div>

      <!-- Quantity Target Selector & Quick Presets -->
      <div class="p-3 bg-zinc-950 border-t border-white/10 flex flex-col space-y-2 shrink-0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-white/80">DESIRED TARGET UNITS:</span>
          <div class="flex items-center space-x-1">
            <button
              type="button"
              class="w-6 h-6 rounded bg-black border border-white/20 hover:border-white/40 text-white font-bold"
              onclick={() => handleQuantityChange(-5)}
            >
              -5
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded bg-black border border-white/20 hover:border-white/40 text-white font-bold"
              onclick={() => handleQuantityChange(-1)}
            >
              -1
            </button>
            <input
              type="number"
              min="1"
              max="100"
              bind:value={desiredQuantity}
              onchange={syncEngineSettings}
              class="w-12 text-center bg-black border border-amber-500/50 rounded py-0.5 text-xs text-amber-300 font-bold focus:outline-none"
            />
            <button
              type="button"
              class="w-6 h-6 rounded bg-black border border-white/20 hover:border-white/40 text-white font-bold"
              onclick={() => handleQuantityChange(1)}
            >
              +1
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded bg-black border border-white/20 hover:border-white/40 text-white font-bold"
              onclick={() => handleQuantityChange(5)}
            >
              +5
            </button>
          </div>
        </div>

        <!-- Target Summary Pill -->
        <div class="p-2 rounded bg-black/60 border border-amber-500/30 flex items-center justify-between text-xs">
          <span>
            Goal: <strong class="text-amber-300">{desiredQuantity}x {getTargetDefinition().name}</strong>
          </span>
          <span class="text-white/60">
            Total Barter Points: <strong class="text-amber-400">{barterPlan.totalBarterCostRequired} pts</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Right Column: Barter Optimizer Plan & Nearest Bartenders (7 cols) -->
    <div class="lg:col-span-7 flex flex-col bg-black/20 overflow-hidden">
      <!-- Optimizer Funding Status Banner -->
      <div class="p-3 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-2">
          <span class="text-xs uppercase font-bold tracking-wider text-amber-300">
            2. OPTIMAL SURRENDER INVENTORY PLAN
          </span>
          {#if barterPlan.isFullyFunded}
            <span class="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              ✓ 100% FUNDED
            </span>
          {:else}
            <span class="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              PARTIAL: {barterPlan.unitsAcquirable} / {barterPlan.desiredQuantity}
            </span>
          {/if}
        </div>

        <div class="flex items-center space-x-3 text-xs">
          <span>
            Generated: <strong class="text-emerald-400">{barterPlan.totalBarterValueGenerated} pts</strong>
          </span>
          {#if barterPlan.surplusPointsWasted > 0}
            <span class="text-amber-300" title="Excess remainder points lost to bartender">
              Wasted: {barterPlan.surplusPointsWasted} pts
            </span>
          {/if}
        </div>
      </div>

      <!-- Feedback Banner if trade executed -->
      {#if lastTradeMessage}
        <div class="p-2.5 bg-emerald-950/90 border-b border-emerald-500/50 flex items-center justify-between shrink-0">
          <span class="text-xs text-emerald-200 font-semibold flex items-center space-x-1.5">
            <span>✓</span>
            <span>{lastTradeMessage.text}</span>
          </span>
          <button
            type="button"
            class="text-[10px] text-white/60 hover:text-white underline ml-3"
            onclick={() => (lastTradeMessage = null)}
          >
            Dismiss
          </button>
        </div>
      {/if}

      <!-- Surrender Manifest Table -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        {#if barterPlan.surrenderPlan.length === 0}
          <div class="p-8 text-center text-white/40 flex flex-col items-center justify-center space-y-2">
            <span class="text-2xl">📦</span>
            <span class="text-sm font-semibold">No surplus {activeSubCategory} assets available to surrender.</span>
            <p class="text-xs max-w-sm">
              Your locker has zero surplus materials in this category or all items are protected by your active engineering wishlist.
            </p>
          </div>
        {:else}
          <div class="text-[10px] text-white/50 uppercase font-bold tracking-wider px-1">
            SURPLUS ASSETS TO SURRENDER (ALGORITHM-OPTIMIZED FOR ZERO WASTE):
          </div>

          <div class="space-y-1.5">
            {#each barterPlan.surrenderPlan as item (item.itemId)}
              <div class="p-2 rounded bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-3">
                  <span class="text-amber-400 font-bold w-12 text-right">
                    -{item.surrenderCount}x
                  </span>
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="font-bold text-white">{item.name}</span>
                      {#if item.isWishlistProtected}
                        <span class="px-1 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/30">
                          WISHLIST
                        </span>
                      {/if}
                      {#if item.isSafeToSell}
                        <span class="px-1 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                          SAFE SURPLUS
                        </span>
                      {/if}
                    </div>
                    <span class="text-[10px] text-white/40">
                      Available: {item.availableCount} in locker // Yields {item.barterValuePerUnit} pts each
                    </span>
                  </div>
                </div>

                <div class="flex flex-col items-end">
                  <span class="font-bold text-emerald-400">
                    +{item.totalBarterValueContributed} pts
                  </span>
                  <span class="text-[10px] text-white/40">
                    Remains: {item.availableCount - item.surrenderCount}
                  </span>
                </div>
              </div>
            {/each}
          </div>

          <!-- Inventory Delta Telemetry -->
          <div class="mt-3 p-2.5 rounded bg-zinc-900/60 border border-white/10 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <span class="text-white/60">Locker Slot Impact:</span>
              <span class="font-bold {barterPlan.inventoryDelta.netLockerCapacityChange <= 0 ? 'text-emerald-400' : 'text-amber-400'}">
                {barterPlan.inventoryDelta.netLockerCapacityChange} SLOTS
              </span>
              <span class="text-white/40">
                (Surrender {barterPlan.inventoryDelta.surrenderTotalUnits} → Receive {barterPlan.inventoryDelta.targetAcquiredUnits})
              </span>
            </div>
            <button
              type="button"
              class="px-4 py-1.5 rounded font-bold transition-all {barterPlan.isFullyFunded || barterPlan.unitsAcquirable > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-zinc-800 text-white/40 cursor-not-allowed'}"
              onclick={handleExecuteTrade}
              disabled={!barterPlan.isFullyFunded && barterPlan.unitsAcquirable === 0}
            >
              EXECUTE BARTENDER TRADE
            </button>
          </div>
        {/if}

        <!-- Nearest Concourse Bartender Starports (Stage 10.3 Requirement #3) -->
        <div class="mt-4 pt-3 border-t border-white/10">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-xs uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
              <span>📍</span>
              <span>NEAREST STARPORTS WITH ACTIVE CONCOURSE BARTENDER CONTACTS</span>
            </span>
            <span class="text-[10px] text-white/40">Sorted by Ly proximity</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each nearbyStarports.slice(0, 4) as port (port.id)}
              <div class="p-2 rounded bg-black/60 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors flex flex-col justify-between space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-white">{port.name}</span>
                  <span class="text-cyan-300 font-mono font-bold text-xs">
                    {port.distanceLy.toFixed(1)} LY
                  </span>
                </div>
                <div class="flex items-center space-x-2 text-[10px] text-white/50">
                  <span>{port.system}</span>
                  <span>•</span>
                  <span>{port.stationType}</span>
                  <span>•</span>
                  <span>Pad: {port.padSize}</span>
                </div>
                <div class="flex items-center justify-between text-[9px] pt-1 border-t border-white/5">
                  <span class="text-white/40">{port.distanceLs.toLocaleString()} Ls to arrival</span>
                  <span class="{port.isAnarchy ? 'text-purple-400 font-bold' : 'text-emerald-400'}">
                    {port.isAnarchy ? 'ANARCHY (Black Market Bartender)' : 'LEGAL BARTENDER'}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
