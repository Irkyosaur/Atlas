<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type AssetRecipeKey,
    type AssetBomSummary,
    type NearbySupplierStation,
    ASSET_CONSTRUCTION_RECIPES,
    generateAssetBomSummary,
    findNearbySuppliers,
    colonisationBomEngine,
  } from '$engine/colonisation_bom_engine';

  interface Props {
    isOpen: boolean;
    initialAssetKey?: AssetRecipeKey;
    assetCustomName?: string;
    targetSystemName?: string;
    onClose?: () => void;
    onOpenHaulerModal?: (assetKey: AssetRecipeKey) => void;
  }

  let {
    isOpen = $bindable(false),
    initialAssetKey = 'planetary_outpost_t1',
    assetCustomName = 'Haven City Alpha',
    targetSystemName = 'Eol Prou RS-T d3-94',
    onClose,
    onOpenHaulerModal,
  }: Props = $props();

  // Selected recipe state
  let selectedAssetKey = $state<AssetRecipeKey>(untrack(() => initialAssetKey));

  $effect(() => {
    selectedAssetKey = initialAssetKey;
  });

  // Delivered materials ledger (persisted or local state)
  let deliveredMap = $state<Record<string, number>>({});

  // Active view tab inside drawer
  let activeTab = $state<'breakdown' | 'stages' | 'suppliers'>('breakdown');

  // Supplier filter state
  let selectedCommodityForSuppliers = $state<string>('titanium');
  let supplierPadFilter = $state<'Any' | 'Large'>('Large');

  // Subscribe to live cargo engine to get in-cargo numbers and auto-delivery events
  let liveCargoSync = $state(colonisationBomEngine.getState());

  // Listen for live deliveries to auto-update delivered map
  $effect(() => {
    const unsubDelivery = colonisationBomEngine.onDelivery((delivery) => {
      deliveredMap = {
        ...deliveredMap,
        [delivery.commodityId]: (deliveredMap[delivery.commodityId] || 0) + delivery.amount,
      };
    });

    const unsubSync = colonisationBomEngine.subscribe((state) => {
      liveCargoSync = state;
    });

    return () => {
      unsubDelivery();
      unsubSync();
    };
  });

  // Calculate live summary derived from selected recipe and delivered ledger
  const bomSummary = $derived.by<AssetBomSummary>(() => {
    return generateAssetBomSummary(
      selectedAssetKey,
      assetCustomName,
      deliveredMap,
      liveCargoSync.inventory
    );
  });

  // Nearby suppliers for the currently selected commodity
  const nearbySuppliers = $derived.by<NearbySupplierStation[]>(() => {
    return findNearbySuppliers(selectedCommodityForSuppliers, 45, supplierPadFilter);
  });

  function handleSelectCommoditySuppliers(commId: string) {
    selectedCommodityForSuppliers = commId;
    activeTab = 'suppliers';
  }

  function handleQuickSimulateDelivery(commodityId: string, amount: number) {
    colonisationBomEngine.recordUnloadDelivery(commodityId, amount, `${assetCustomName} Construction Hub`);
  }

  function handleResetDeliveries() {
    deliveredMap = {};
  }
</script>

{#if isOpen}
  <!-- Slide-out Drawer Panel (Right Side) -->
  <aside
    class="fixed inset-y-0 right-0 z-50 w-full sm:w-[580px] bg-[#070b14]/95 border-l border-[var(--hud-orange)]/60 backdrop-blur-xl shadow-2xl flex flex-col font-sans transition-all duration-300 select-none"
  >
    <!-- Drawer Header -->
    <header class="p-4 border-b border-[var(--hud-orange)]/35 bg-[#0a0f1d] flex items-center justify-between">
      <div class="flex items-center space-x-2.5">
        <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
        <div>
          <h3 class="text-sm sm:text-base font-bold font-mono text-[var(--hud-orange)] flex items-center space-x-2">
            <span>📋 COLONISATION BILL OF MATERIALS</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
              BOM v8.2
            </span>
          </h3>
          <p class="text-xs font-mono text-[var(--hud-orange)]/70">
            Target: <span class="text-white font-bold">{bomSummary.customAssetName || bomSummary.assetName}</span> | {targetSystemName}
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          class="p-1 rounded text-[var(--hud-orange)]/70 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10 transition-colors"
          onclick={() => {
            isOpen = false;
            onClose?.();
          }}
          title="Close BOM Drawer"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
    </header>

    <!-- Asset Selector Bar & Quick Stats -->
    <div class="p-3 border-b border-[var(--hud-orange)]/25 bg-[#090d18] space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <label for="recipe-select" class="text-xs font-mono text-[var(--hud-orange)]/80 whitespace-nowrap">
          Target Asset:
        </label>
        <select
          id="recipe-select"
          class="flex-1 p-1.5 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/40 rounded text-white focus:border-[var(--hud-orange)] outline-none"
          bind:value={selectedAssetKey}
        >
          {#each Object.values(ASSET_CONSTRUCTION_RECIPES) as recipe}
            <option value={recipe.assetKey}>
              {recipe.assetName} ({recipe.category})
            </option>
          {/each}
        </select>
      </div>

      <!-- Aggregate Progress & Metric Badges -->
      <div class="grid grid-cols-3 gap-2 text-center font-mono">
        <div class="p-2 rounded bg-black/50 border border-[var(--hud-orange)]/25">
          <span class="text-[10px] text-[var(--hud-orange)]/70 block">TOTAL TONNAGE</span>
          <span class="text-xs sm:text-sm font-bold text-white">
            {bomSummary.totalTonnage.toLocaleString()} t
          </span>
          <span class="text-[10px] text-[var(--hud-amber)] block">
            {bomSummary.remainingTonnage.toLocaleString()} t left
          </span>
        </div>

        <div class="p-2 rounded bg-black/50 border border-[var(--hud-orange)]/25">
          <span class="text-[10px] text-[var(--hud-orange)]/70 block">COMPLETION</span>
          <span class="text-xs sm:text-sm font-bold text-emerald-400">
            {bomSummary.percentCompleted}%
          </span>
          <span class="text-[10px] text-[var(--hud-orange)]/60 block">
            {bomSummary.deliveredTonnage.toLocaleString()} t paid
          </span>
        </div>

        <div class="p-2 rounded bg-black/50 border border-[var(--hud-orange)]/25">
          <span class="text-[10px] text-[var(--hud-orange)]/70 block">EST. BUDGET</span>
          <span class="text-xs sm:text-sm font-bold text-[var(--hud-amber)]">
            {(bomSummary.totalEstimatedCostCr / 1e6).toFixed(1)}M CR
          </span>
          <span class="text-[10px] text-white/60 block">
            {(bomSummary.remainingCostCr / 1e6).toFixed(1)}M left
          </span>
        </div>
      </div>

      <!-- Main Progress Bar -->
      <div class="space-y-1">
        <div class="flex justify-between text-[11px] font-mono text-[var(--hud-orange)]/75">
          <span>Overall Construction Progress</span>
          <span class="text-white font-bold">{bomSummary.deliveredTonnage} / {bomSummary.totalTonnage} t</span>
        </div>
        <div class="w-full h-2 rounded-full bg-black/70 border border-[var(--hud-orange)]/35 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[var(--hud-orange)] transition-all duration-300"
            style="width: {bomSummary.percentCompleted}%"
          ></div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center border-b border-[var(--hud-orange)]/30 bg-[#080d1a] px-3 pt-2">
      <button
        type="button"
        class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'breakdown' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
        onclick={() => (activeTab = 'breakdown')}
      >
        📦 MATERIALS ({bomSummary.commodities.length})
      </button>
      <button
        type="button"
        class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'stages' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
        onclick={() => (activeTab = 'stages')}
      >
        🏗️ STAGES ({bomSummary.stages.length})
      </button>
      <button
        type="button"
        class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'suppliers' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
        onclick={() => (activeTab = 'suppliers')}
      >
        🛰️ SUPPLIERS
      </button>
    </div>

    <!-- Tab Content Scrollable Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      
      <!-- TAB 1: COMMODITY BREAKDOWN -->
      {#if activeTab === 'breakdown'}
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs font-mono text-[var(--hud-orange)]/70 pb-1 border-b border-[var(--hud-orange)]/15">
            <span>COMMODITY DEFICIT BREAKDOWN</span>
            <span class="text-[10px]">CLICK SUPPLIERS TO LOCATE</span>
          </div>

          {#each bomSummary.commodities as item}
            <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/70 transition-all flex flex-col space-y-2">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-mono font-bold text-white">{item.name}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-black/80 border border-[var(--hud-orange)]/30 text-[var(--hud-orange)]/80">
                      {item.category}
                    </span>
                  </div>
                  <span class="text-[11px] font-mono text-[var(--hud-orange)]/60">
                    Est. Unit: {item.unitPriceCr.toLocaleString()} CR | Total: {(item.totalCostCr / 1e6).toFixed(2)}M CR
                  </span>
                </div>

                <div class="text-right font-mono">
                  <span class="text-xs font-bold {item.remainingTonnage === 0 ? 'text-emerald-400' : 'text-[var(--hud-amber)]'}">
                    {item.remainingTonnage === 0 ? 'COMPLETED' : `${item.remainingTonnage.toLocaleString()} t DEFICIT`}
                  </span>
                  <span class="text-[10px] text-[var(--hud-orange)]/70 block">
                    {item.deliveredTonnage} / {item.totalRequiredTonnage} t ({item.percentCompleted}%)
                  </span>
                </div>
              </div>

              <!-- Commodity Progress Bar -->
              <div class="w-full h-1.5 rounded-full bg-black/80 border border-[var(--hud-orange)]/20 overflow-hidden">
                <div
                  class="h-full bg-[var(--hud-orange)] transition-all duration-300"
                  style="width: {item.percentCompleted}%"
                ></div>
              </div>

              <!-- Quick Action Row -->
              <div class="flex items-center justify-between pt-1 border-t border-[var(--hud-orange)]/10 text-xs font-mono">
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 hover:bg-[var(--hud-orange)]/30 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30 text-[10px] transition-colors"
                    onclick={() => handleSelectCommoditySuppliers(item.commodityId)}
                  >
                    🛰️ SOURCING STATIONS
                  </button>

                  {#if item.inCargoTonnage > 0}
                    <span class="text-[10px] text-emerald-400 font-bold">
                      📦 In Hold: {item.inCargoTonnage}t
                    </span>
                  {/if}
                </div>

                <!-- Simulation / Unload Checkoff Button -->
                {#if item.remainingTonnage > 0}
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[10px] transition-colors"
                    onclick={() => handleQuickSimulateDelivery(item.commodityId, Math.min(item.remainingTonnage, 100))}
                    title="Simulate / Record manual cargo delivery"
                  >
                    + DELIVER 100t
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>

      <!-- TAB 2: STAGE-BY-STAGE REQUIREMENTS -->
      {:else if activeTab === 'stages'}
        <div class="space-y-4">
          {#each bomSummary.stages as st}
            <div class="p-3.5 rounded bg-black/60 border {st.isStageComplete ? 'border-emerald-500/50' : 'border-[var(--hud-orange)]/30'} space-y-2.5">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-xs font-mono font-bold text-white flex items-center space-x-2">
                    <span class="px-1.5 py-0.2 rounded bg-[var(--hud-orange)]/20 text-[var(--hud-amber)]">
                      STAGE {st.stageNumber}
                    </span>
                    <span>{st.stageName}</span>
                  </h4>
                  <span class="text-[11px] font-mono text-[var(--hud-orange)]/70 block mt-0.5">
                    Stage Tonnage: {st.deliveredTonnage} / {st.totalTonnage} t ({st.percentCompleted}%)
                  </span>
                </div>

                <span class="text-xs font-mono font-bold {st.isStageComplete ? 'text-emerald-400' : 'text-[var(--hud-amber)]'}">
                  {st.isStageComplete ? '✅ COMPLETE' : 'IN PROGRESS'}
                </span>
              </div>

              <!-- Stage Progress -->
              <div class="w-full h-1.5 rounded-full bg-black/80 border border-[var(--hud-orange)]/20 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-[var(--hud-orange)] to-emerald-400 transition-all duration-300"
                  style="width: {st.percentCompleted}%"
                ></div>
              </div>

              <!-- Stage Requirements List -->
              <div class="space-y-1.5 pt-1">
                {#each st.requirements as req}
                  <div class="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-black/40 border border-[var(--hud-orange)]/15">
                    <div>
                      <span class="text-white font-bold">{req.name}</span>
                      <span class="text-[10px] text-[var(--hud-orange)]/60 ml-1.5">
                        ({(req.averagePriceCr * req.requiredTonnage / 1e3).toFixed(0)}k CR)
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="{req.remaining === 0 ? 'text-emerald-400' : 'text-[var(--hud-amber)]'} font-bold">
                        {req.delivered} / {req.requiredTonnage} t
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

      <!-- TAB 3: NEAREST SUPPLIER FINDER -->
      {:else if activeTab === 'suppliers'}
        <div class="space-y-3">
          <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-[var(--hud-amber)] font-bold">
                SUPPLIER SOURCING LOCATOR
              </span>
              <span class="text-[10px] font-mono text-[var(--hud-orange)]/60">
                Max Radius: 45 LY
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="supplier-commodity-select" class="text-[10px] font-mono text-[var(--hud-orange)]/70 block">Commodity:</label>
                <select
                  id="supplier-commodity-select"
                  class="w-full p-1 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/30 rounded text-white outline-none"
                  bind:value={selectedCommodityForSuppliers}
                >
                  {#each bomSummary.commodities as c}
                    <option value={c.commodityId}>{c.name}</option>
                  {/each}
                </select>
              </div>

              <div>
                <label for="supplier-pad-select" class="text-[10px] font-mono text-[var(--hud-orange)]/70 block">Pad Size:</label>
                <select
                  id="supplier-pad-select"
                  class="w-full p-1 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/30 rounded text-white outline-none"
                  bind:value={supplierPadFilter}
                >
                  <option value="Large">Large Pads Only (T-9 / Cutter)</option>
                  <option value="Any">Any Landing Pad (Include Medium)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Supplier Results List -->
          <div class="space-y-2">
            {#if nearbySuppliers.length === 0}
              <div class="p-6 text-center text-xs font-mono text-[var(--hud-orange)]/60">
                No high-stock suppliers located for this commodity within 45 LY.
              </div>
            {:else}
              {#each nearbySuppliers as sup}
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 transition-all flex flex-col space-y-1.5">
                  <div class="flex items-start justify-between">
                    <div>
                      <h5 class="text-xs font-mono font-bold text-white flex items-center space-x-1.5">
                        <span>{sup.stationName}</span>
                        <span class="text-[10px] px-1 rounded {sup.isPlanetary ? 'bg-amber-900/40 text-amber-300' : 'bg-cyan-900/40 text-cyan-300'}">
                          {sup.isPlanetary ? 'PLANETARY' : 'ORBITAL'}
                        </span>
                      </h5>
                      <span class="text-[11px] font-mono text-[var(--hud-orange)]/70">
                        System: <span class="text-white font-bold">{sup.systemName}</span> • {sup.distanceLy.toFixed(1)} LY • {sup.distanceLs.toLocaleString()} Ls
                      </span>
                    </div>

                    <div class="text-right font-mono">
                      <span class="text-xs font-bold text-emerald-400">
                        {sup.buyPriceCr.toLocaleString()} CR
                      </span>
                      <span class="text-[10px] text-emerald-300/80 block">
                        {sup.costVariancePct > 0 ? `+${sup.costVariancePct}%` : `${sup.costVariancePct}%`} avg
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-[var(--hud-orange)]/10 text-[11px] font-mono">
                    <span class="text-[var(--hud-orange)]/80">
                      Stock: <span class="text-white font-bold">{sup.availableStockTons.toLocaleString()} t</span> ({sup.landingPad} Pad)
                    </span>
                    <span class="text-[var(--hud-orange)]/60 text-[10px]">
                      Updated {sup.updatedAgoMins}m ago
                    </span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

    </div>

    <!-- Bottom Actions / Live Hauling Trigger -->
    <footer class="p-3.5 border-t border-[var(--hud-orange)]/35 bg-[#0a0f1d] flex items-center justify-between gap-3">
      <button
        type="button"
        class="px-3 py-2 text-xs font-mono rounded bg-black/60 border border-[var(--hud-orange)]/30 hover:bg-[var(--hud-orange)]/15 text-[var(--hud-orange)]/80 transition-colors"
        onclick={handleResetDeliveries}
        title="Reset local delivery counts"
      >
        ↺ RESET BOM
      </button>

      <button
        type="button"
        class="flex-1 py-2 text-xs font-mono font-bold rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black transition-all shadow-md flex items-center justify-center space-x-1.5"
        onclick={() => onOpenHaulerModal?.(selectedAssetKey)}
      >
        <span>🚛 LAUNCH LIVE HAULING ASSISTANT</span>
      </button>
    </footer>
  </aside>
{/if}
