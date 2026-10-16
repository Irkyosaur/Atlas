<script lang="ts">
  // Location: atlas/client/src/lib/components/underworld/MaterialTradersTriangulator.svelte
  // Material Traders Triangulator & Intra-Category Exchange Calculator (Phase 13, Stage 13.1)
  // Compliant with Cobra HUD design system, Svelte 5 runes, passive telemetry, and FDF EULA.

  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type TraderType,
    type LandingPadSize,
    type MaterialTraderStation,
    type TradeConversionResult,
    type MaterialNode,
    MATERIAL_TAXONOMY,
    CANONICAL_MATERIAL_TRADERS,
    calculateMaterialTrade,
    findNearestTraders,
  } from '$engine/material_trader_engine';
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
  let activeTab = $state<'triangulator' | 'exchange' | 'surplus'>('triangulator');

  // Triangulator filters
  let querySystem = $state<string>(referenceSystem);
  let selectedCategory = $state<'ALL' | TraderType>('ALL');
  let selectedPadSize = $state<'ANY' | LandingPadSize>('ANY');
  let maxArrivalDistanceLs = $state<number>(1000);
  let isLoadingTraders = $state<boolean>(false);
  let tradersList = $state<MaterialTraderStation[]>([]);

  // Exchange calculator state
  let exchangeCategory = $state<TraderType>('Manufactured');
  let sourceMaterialName = $state<string>('Pharmaceutical Isolators');
  let targetMaterialName = $state<string>('Chemical Manipulators');
  let desiredTargetCount = $state<number>(10);
  let tradeCalculation = $state<TradeConversionResult | null>(null);

  // Player inventory & deficit state
  let playerInventory = $state<Record<string, number>>(engineeringWishlistEngine.getInventory());
  let wishlistDeficits = $state(engineeringWishlistEngine.calculateDeficits());

  // Reactive options for exchange selector based on category
  let availableMaterialsForCategory = $derived<MaterialNode[]>(
    MATERIAL_TAXONOMY.filter((m) => m.category === exchangeCategory)
  );

  // Filtered traders list
  let displayTraders = $derived<MaterialTraderStation[]>(
    findNearestTraders(tradersList, {
      referenceCoords: { x: 0, y: 0, z: 0 }, // relative distances already tagged by Ananke/fallback
      traderType: selectedCategory,
      minLandingPad: selectedPadSize,
      maxArrivalLs: maxArrivalDistanceLs,
    })
  );

  // Trade-down opportunities for deficits
  let deficitTradeOpportunities = $derived(
    wishlistDeficits.materials
      .filter((m) => m.deficit > 0)
      .map((defMat) => {
        // Find potential surplus items in same category with higher or equal grade
        const candidates = Object.entries(playerInventory)
          .map(([name, count]) => {
            const tax = MATERIAL_TAXONOMY.find((t) => t.name.toLowerCase() === name.toLowerCase());
            return { name, count, tax };
          })
          .filter((c) => {
            if (!c.tax) return false;
            if (c.tax.category !== defMat.category) return false;
            if (c.count <= 1) return false;
            // Prefer trading down from higher grade
            return c.tax.grade >= defMat.grade;
          })
          .map((c) => {
            const tradeRes = calculateMaterialTrade(c.name, defMat.name, defMat.deficit);
            const canAffordCount = Math.min(c.count, tradeRes.sourceAmountRequired);
            return {
              candidateName: c.name,
              available: c.count,
              grade: c.tax!.grade,
              isSameSubCategory: c.tax!.subCategory === MATERIAL_TAXONOMY.find((t) => t.name === defMat.name)?.subCategory,
              requiredSource: tradeRes.sourceAmountRequired,
              ratioDescription: tradeRes.ratioDescription,
              hasEnough: c.count >= tradeRes.sourceAmountRequired,
            };
          })
          .sort((a, b) => (b.hasEnough ? 1 : 0) - (a.hasEnough ? 1 : 0));

        return {
          deficitMaterial: defMat,
          candidates,
        };
      })
  );

  async function loadTraders() {
    isLoadingTraders = true;
    try {
      tradersList = await ananke.getMaterialTraders(querySystem);
    } catch {
      tradersList = CANONICAL_MATERIAL_TRADERS;
    } finally {
      isLoadingTraders = false;
    }
  }

  function recalculateTrade() {
    tradeCalculation = calculateMaterialTrade(sourceMaterialName, targetMaterialName, desiredTargetCount);
  }

  function handleCategoryChange(cat: TraderType) {
    exchangeCategory = cat;
    const mats = MATERIAL_TAXONOMY.filter((m) => m.category === cat);
    if (mats.length >= 2) {
      sourceMaterialName = mats[0].name;
      targetMaterialName = mats[1].name;
    }
    recalculateTrade();
  }

  onMount(() => {
    loadTraders();
    recalculateTrade();
    const unsub = engineeringWishlistEngine.subscribe(() => {
      playerInventory = engineeringWishlistEngine.getInventory();
      wishlistDeficits = engineeringWishlistEngine.calculateDeficits();
    });
    return () => unsub();
  });

  $effect(() => {
    if (isOpen) {
      querySystem = referenceSystem;
      loadTraders();
    }
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200"
    onclick={handleBackdropClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-label="Material Traders Triangulator Modal"
  >
    <div
      class="relative w-full max-w-5xl h-[88vh] max-h-[900px] flex flex-col bg-[#070b10] border-2 border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_50px_rgba(255,113,0,0.25)] overflow-hidden"
    >
      <!-- Cobra HUD Header -->
      <header
        class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/40 flex-shrink-0"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={24} color="var(--hud-orange)" glow={true} />
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-black tracking-widest text-[var(--hud-orange)] uppercase font-mono">
                UNDERWORLD SERVICES // MATERIAL TRADERS
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
                STAGE 13.1
              </span>
            </div>
            <p class="text-[11px] font-mono text-[var(--hud-orange)]/70">
              Raw (Geological), Encoded (Data), and Manufactured (Industrial) Triangulation & Intra-Category Exchange
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Mode Tabs -->
          <div class="flex bg-black/60 border border-[var(--hud-orange)]/30 rounded p-0.5 font-mono text-xs">
            <button
              type="button"
              class="px-3 py-1 rounded transition-colors {activeTab === 'triangulator'
                ? 'bg-[var(--hud-orange)] text-black font-bold shadow-sm'
                : 'text-[var(--hud-amber)] hover:text-white hover:bg-white/5'}"
              onclick={() => (activeTab = 'triangulator')}
            >
              📍 NEAREST TRADERS
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded transition-colors {activeTab === 'exchange'
                ? 'bg-[var(--hud-orange)] text-black font-bold shadow-sm'
                : 'text-[var(--hud-amber)] hover:text-white hover:bg-white/5'}"
              onclick={() => (activeTab = 'exchange')}
            >
              ⚖️ CONVERSION CALCULATOR
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded transition-colors {activeTab === 'surplus'
                ? 'bg-[var(--hud-orange)] text-black font-bold shadow-sm'
                : 'text-[var(--hud-amber)] hover:text-white hover:bg-white/5'}"
              onclick={() => (activeTab = 'surplus')}
            >
              🔄 DEFICIT TRADE-DOWNS ({wishlistDeficits.materials.filter((m) => m.deficit > 0).length})
            </button>
          </div>

          <button
            type="button"
            class="p-1.5 rounded hover:bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] hover:text-white transition-colors"
            onclick={onClose}
            title="Close Modal (Esc)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Body Container -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs text-stone-300">
        <!-- ================= TAB 1: NEAREST TRADERS ================= -->
        {#if activeTab === 'triangulator'}
          <!-- Filter Controls Bar -->
          <div class="p-3 bg-black/50 border border-[var(--hud-orange)]/30 rounded flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-3 flex-wrap gap-y-2">
              <div class="flex items-center space-x-2">
                <span class="text-[var(--hud-orange)] font-bold">REF SYSTEM:</span>
                <input
                  type="text"
                  bind:value={querySystem}
                  onkeydown={(e) => e.key === 'Enter' && loadTraders()}
                  placeholder="e.g. Deciat, Sol, Shinrarta Dezhra"
                  class="bg-black/80 border border-[var(--hud-orange)]/50 rounded px-2.5 py-1 text-white font-mono w-44 focus:outline-none focus:border-[var(--hud-orange)]"
                />
                <button
                  type="button"
                  class="px-2.5 py-1 bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/40 border border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold rounded"
                  onclick={loadTraders}
                  disabled={isLoadingTraders}
                >
                  {isLoadingTraders ? 'SCANNING...' : 'LOCATE'}
                </button>
              </div>

              <!-- Category Filter Buttons -->
              <div class="flex items-center space-x-1 border-l border-stone-700 pl-3">
                <span class="text-stone-400 mr-1">TYPE:</span>
                {#each ['ALL', 'Raw', 'Encoded', 'Manufactured'] as cat}
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded border text-[11px] {selectedCategory === cat
                      ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] font-bold'
                      : 'border-stone-700 text-stone-300 hover:border-stone-500'}"
                    onclick={() => (selectedCategory = cat as any)}
                  >
                    {cat}
                  </button>
                {/each}
              </div>

              <!-- Landing Pad Size Filter -->
              <div class="flex items-center space-x-1 border-l border-stone-700 pl-3">
                <span class="text-stone-400 mr-1">PAD:</span>
                {#each ['ANY', 'M', 'L'] as pad}
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded border text-[11px] {selectedPadSize === pad
                      ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] font-bold'
                      : 'border-stone-700 text-stone-300 hover:border-stone-500'}"
                    onclick={() => (selectedPadSize = pad as any)}
                  >
                    {pad === 'ANY' ? 'ALL PADS' : `${pad}-PAD`}
                  </button>
                {/each}
              </div>

              <!-- Arrival Distance Filter -->
              <div class="flex items-center space-x-1 border-l border-stone-700 pl-3">
                <span class="text-stone-400 mr-1">MAX LS:</span>
                <select
                  bind:value={maxArrivalDistanceLs}
                  class="bg-black border border-stone-700 rounded px-2 py-0.5 text-stone-200"
                >
                  <option value={500}>&lt; 500 ls</option>
                  <option value={1000}>&lt; 1,000 ls</option>
                  <option value={5000}>&lt; 5,000 ls</option>
                  <option value={100000}>Any distance</option>
                </select>
              </div>
            </div>

            <div class="text-stone-400 text-[11px]">
              Found: <span class="text-[var(--hud-amber)] font-bold">{displayTraders.length}</span> material traders
            </div>
          </div>

          <!-- Traders Grid/Table -->
          <div class="border border-[var(--hud-orange)]/30 rounded overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-black/70 border-b border-[var(--hud-orange)]/30 text-[var(--hud-orange)] text-[11px]">
                  <th class="p-2.5">TRADER TYPE</th>
                  <th class="p-2.5">SYSTEM</th>
                  <th class="p-2.5">STATION</th>
                  <th class="p-2.5">STATION TYPE</th>
                  <th class="p-2.5">PAD</th>
                  <th class="p-2.5">ARRIVAL</th>
                  <th class="p-2.5">DISTANCE</th>
                  <th class="p-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-800">
                {#if displayTraders.length === 0}
                  <tr>
                    <td colspan="8" class="p-6 text-center text-stone-500">
                      No material traders matching current filter criteria.
                    </td>
                  </tr>
                {:else}
                  {#each displayTraders as trader}
                    <tr class="hover:bg-white/[0.03] transition-colors">
                      <td class="p-2.5">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-bold border {trader.traderType === 'Raw'
                            ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                            : trader.traderType === 'Encoded'
                              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
                              : 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'}"
                        >
                          {trader.traderType === 'Raw' ? '🪨 RAW' : trader.traderType === 'Encoded' ? '💾 ENCODED' : '⚙️ MANUFACTURED'}
                        </span>
                      </td>
                      <td class="p-2.5 font-bold text-white">{trader.systemName}</td>
                      <td class="p-2.5 text-[var(--hud-amber)]">{trader.stationName}</td>
                      <td class="p-2.5 text-stone-400">{trader.stationType}</td>
                      <td class="p-2.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold {trader.landingPad === 'L' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}">
                          {trader.landingPad}-PAD
                        </span>
                      </td>
                      <td class="p-2.5 text-stone-300">{trader.distanceLs.toLocaleString()} ls</td>
                      <td class="p-2.5 font-bold text-white">
                        {trader.distanceLy !== undefined ? `${trader.distanceLy.toFixed(1)} LY` : 'Nearby'}
                      </td>
                      <td class="p-2.5 text-right">
                        <button
                          type="button"
                          class="px-2.5 py-1 bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/40 border border-[var(--hud-orange)]/60 text-[var(--hud-orange)] hover:text-white rounded text-[11px] font-bold transition-colors"
                          onclick={() => onPlotRoute?.(trader.systemName)}
                        >
                          PLOT ROUTE
                        </button>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>

        <!-- ================= TAB 2: CONVERSION CALCULATOR ================= -->
        {:else if activeTab === 'exchange'}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left: Selector -->
            <div class="p-4 bg-black/60 border border-[var(--hud-orange)]/40 rounded space-y-4">
              <div class="flex items-center justify-between border-b border-stone-800 pb-2">
                <span class="font-bold text-[var(--hud-orange)] text-sm">MATERIAL TRADE SETUP</span>
                <div class="flex space-x-1">
                  {#each ['Raw', 'Encoded', 'Manufactured'] as cat}
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded text-[11px] border {exchangeCategory === cat
                        ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] font-bold'
                        : 'border-stone-700 text-stone-400'}"
                      onclick={() => handleCategoryChange(cat as TraderType)}
                    >
                      {cat}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Source Material -->
              <div class="space-y-1.5">
                <label class="block text-stone-400 text-[11px] font-bold">SOURCE MATERIAL (WHAT YOU GIVE):</label>
                <select
                  bind:value={sourceMaterialName}
                  onchange={recalculateTrade}
                  class="w-full bg-black border border-stone-700 rounded p-2 text-white font-mono"
                >
                  {#each availableMaterialsForCategory as mat}
                    <option value={mat.name}>
                      [G{mat.grade}] {mat.name} ({mat.subCategory}) - Owned: {playerInventory[mat.name] || 0}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- Target Material -->
              <div class="space-y-1.5">
                <label class="block text-stone-400 text-[11px] font-bold">TARGET MATERIAL (WHAT YOU RECEIVE):</label>
                <select
                  bind:value={targetMaterialName}
                  onchange={recalculateTrade}
                  class="w-full bg-black border border-stone-700 rounded p-2 text-white font-mono"
                >
                  {#each availableMaterialsForCategory as mat}
                    <option value={mat.name}>
                      [G{mat.grade}] {mat.name} ({mat.subCategory}) - Owned: {playerInventory[mat.name] || 0}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- Target Desired Quantity -->
              <div class="space-y-1.5">
                <label class="block text-stone-400 text-[11px] font-bold">DESIRED TARGET QUANTITY:</label>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    bind:value={desiredTargetCount}
                    oninput={recalculateTrade}
                    class="w-32 bg-black border border-stone-700 rounded p-2 text-white font-mono font-bold"
                  />
                  <div class="flex space-x-1">
                    {#each [1, 5, 10, 25, 50] as q}
                      <button
                        type="button"
                        class="px-2 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[11px]"
                        onclick={() => {
                          desiredTargetCount = q;
                          recalculateTrade();
                        }}
                      >
                        +{q}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>

              <!-- Rules Info Notice -->
              <div class="p-3 bg-stone-900/60 border border-stone-800 rounded text-[11px] space-y-1 text-stone-400">
                <div class="text-[var(--hud-amber)] font-bold">FRONTIER EXCHANGE RATIOS:</div>
                <p>• Same Sub-Category (Same Column): 3:1 ratio per grade difference.</p>
                <p>• Cross Sub-Category (Cross Column): 6:1 penalty factor applied.</p>
                <p>• Trading Down yields high multipliers (e.g. 1x G5 = 81x G1 in same sub-category).</p>
              </div>
            </div>

            <!-- Right: Breakdown Result -->
            <div class="p-4 bg-black/60 border border-[var(--hud-orange)]/40 rounded flex flex-col justify-between">
              {#if tradeCalculation}
                <div class="space-y-4">
                  <span class="font-bold text-[var(--hud-orange)] text-sm block border-b border-stone-800 pb-2">
                    CONVERSION LEDGER BREAKDOWN
                  </span>

                  <!-- Visual Flow -->
                  <div class="p-4 bg-black/90 border border-[var(--hud-orange)]/30 rounded flex items-center justify-between">
                    <div class="text-center flex-1">
                      <div class="text-2xl font-black text-rose-400">-{tradeCalculation.sourceAmountRequired}</div>
                      <div class="text-white font-bold text-xs">{tradeCalculation.sourceMaterial.name}</div>
                      <div class="text-[10px] text-stone-400">
                        Grade {tradeCalculation.sourceMaterial.grade} • {tradeCalculation.sourceMaterial.subCategory}
                      </div>
                      <div class="mt-1 text-[10px] {playerInventory[tradeCalculation.sourceMaterial.name] >= tradeCalculation.sourceAmountRequired ? 'text-emerald-400' : 'text-rose-400 font-bold'}">
                        In Inventory: {playerInventory[tradeCalculation.sourceMaterial.name] || 0}
                      </div>
                    </div>

                    <div class="px-4 text-center">
                      <div class="text-[var(--hud-orange)] text-xl font-bold">➔</div>
                      <div class="text-[10px] font-mono text-[var(--hud-amber)]">
                        {tradeCalculation.ratioDescription}
                      </div>
                    </div>

                    <div class="text-center flex-1">
                      <div class="text-2xl font-black text-emerald-400">+{tradeCalculation.targetAmountReceived}</div>
                      <div class="text-white font-bold text-xs">{tradeCalculation.targetMaterial.name}</div>
                      <div class="text-[10px] text-stone-400">
                        Grade {tradeCalculation.targetMaterial.grade} • {tradeCalculation.targetMaterial.subCategory}
                      </div>
                      <div class="mt-1 text-[10px] text-stone-400">
                        Current Owned: {playerInventory[tradeCalculation.targetMaterial.name] || 0}
                      </div>
                    </div>
                  </div>

                  <!-- Inventory Feasibility Status -->
                  {#if (playerInventory[tradeCalculation.sourceMaterial.name] || 0) < tradeCalculation.sourceAmountRequired}
                    <div class="p-3 bg-rose-950/30 border border-rose-800/60 rounded text-rose-300 text-xs flex items-center space-x-2">
                      <span>⚠️</span>
                      <span>
                        INSUFFICIENT INVENTORY: Missing <strong class="text-rose-200">{tradeCalculation.sourceAmountRequired - (playerInventory[tradeCalculation.sourceMaterial.name] || 0)}</strong> units of {tradeCalculation.sourceMaterial.name}.
                      </span>
                    </div>
                  {:else}
                    <div class="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded text-emerald-300 text-xs flex items-center space-x-2">
                      <span>✅</span>
                      <span>
                        FEASIBLE TRANSACTION: You hold sufficient stock to complete this trade with surplus remaining.
                      </span>
                    </div>
                  {/if}
                </div>

                <div class="pt-4 border-t border-stone-800 flex justify-end">
                  <button
                    type="button"
                    class="px-4 py-2 bg-[var(--hud-orange)] hover:bg-[#ff8800] text-black font-bold font-mono rounded tracking-wider"
                    onclick={() => (activeTab = 'triangulator')}
                  >
                    LOCATE {exchangeCategory.toUpperCase()} TRADER ➔
                  </button>
                </div>
              {/if}
            </div>
          </div>

        <!-- ================= TAB 3: DEFICIT TRADE-DOWNS ================= -->
        {:else if activeTab === 'surplus'}
          <div class="space-y-3">
            <div class="p-3 bg-black/60 border border-[var(--hud-orange)]/30 rounded flex items-center justify-between">
              <div>
                <span class="text-white font-bold text-sm">AUTOMATED WISHLIST DEFICIT RESOLVER</span>
                <p class="text-[11px] text-stone-400">
                  Matches missing engineering materials against your current surplus materials available to trade down.
                </p>
              </div>
              <div class="text-right text-[11px]">
                Active Deficits: <span class="text-rose-400 font-bold">{wishlistDeficits.materials.filter((m) => m.deficit > 0).length}</span>
              </div>
            </div>

            {#if deficitTradeOpportunities.length === 0}
              <div class="p-8 text-center text-stone-500 bg-black/40 border border-stone-800 rounded">
                No active engineering deficits found! Add modules to your Wishlist to calculate auto-trade down options.
              </div>
            {:else}
              <div class="space-y-3">
                {#each deficitTradeOpportunities as item}
                  <div class="p-3 bg-black/60 border border-stone-800 hover:border-[var(--hud-orange)]/40 rounded transition-colors space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                          DEFICIT: -{item.deficitMaterial.deficit}
                        </span>
                        <span class="text-white font-bold">{item.deficitMaterial.name}</span>
                        <span class="text-stone-400 text-[11px]">(Grade {item.deficitMaterial.grade} {item.deficitMaterial.category})</span>
                      </div>
                      <div class="text-[11px] text-stone-400">
                        Owned: {item.deficitMaterial.inventory} / Required: {item.deficitMaterial.required}
                      </div>
                    </div>

                    <!-- Candidate Donors Table -->
                    {#if item.candidates.length === 0}
                      <p class="text-[11px] text-stone-500 italic">
                        No higher or equal grade surplus materials in this category to trade down. Farm {item.deficitMaterial.name} directly.
                      </p>
                    {:else}
                      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {#each item.candidates.slice(0, 3) as cand}
                          <div class="p-2 bg-black/80 border {cand.hasEnough ? 'border-emerald-800/60 text-stone-200' : 'border-stone-800 text-stone-400'} rounded flex items-center justify-between text-[11px]">
                            <div>
                              <div class="font-bold {cand.hasEnough ? 'text-emerald-400' : 'text-stone-300'}">
                                {cand.candidateName} [G{cand.grade}]
                              </div>
                              <div class="text-[10px] text-stone-400">
                                Trade {cand.requiredSource} for {item.deficitMaterial.deficit} ({cand.ratioDescription})
                              </div>
                            </div>
                            <div class="text-right">
                              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold {cand.hasEnough ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-400'}">
                                {cand.available} in stock
                              </span>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer Telemetry Bar -->
      <footer
        class="flex items-center justify-between px-5 py-2.5 bg-black/90 border-t border-[var(--hud-orange)]/40 flex-shrink-0 font-mono text-[11px] text-stone-400"
      >
        <div class="flex items-center space-x-4">
          <span>ATLAS PROTOCOL // STAGE 13.1</span>
          <span class="text-stone-600">|</span>
          <span>ANANKE ENDPOINT: <strong class="text-[var(--hud-amber)]">GET /api/stations/traders</strong></span>
        </div>
        <div class="flex items-center space-x-3">
          <span class="text-stone-400">PASSIVE READ-ONLY // FDF EULA COMPLIANT</span>
          <button
            type="button"
            class="px-3 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-white rounded font-bold transition-colors"
            onclick={onClose}
          >
            CLOSE
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}
