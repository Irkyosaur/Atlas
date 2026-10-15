<script lang="ts">
  // Location: atlas/client/src/lib/components/fleet/EngineeringWishlistModal.svelte
  // Horizons & Odyssey Engineering Wishlist & Material Deficit Router Modal (Phase 09, Stage 9.4)
  // Displays engineering module wishlist items, calculates required materials vs. owned inventory,
  // computes deficits, and provides routing tips / nearest material traders.

  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    engineeringWishlistEngine,
    type WishlistModuleItem,
    type MaterialDeficitSummary,
    type MaterialDeficitItem,
  } from '$engine/engineering_wishlist_engine';
  import { type MaterialCategory } from '$engine/engineering_catalog';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
  }

  let { isOpen = $bindable(false), onClose, onPlotRoute }: Props = $props();

  let wishlist = $state<WishlistModuleItem[]>(engineeringWishlistEngine.getWishlist());
  let inventory = $state<Record<string, number>>(engineeringWishlistEngine.getInventory());
  let deficits = $state<MaterialDeficitSummary>(engineeringWishlistEngine.calculateDeficits());

  let activeTab = $state<'wishlist' | 'deficits' | 'inventory'>('deficits');
  let categoryFilter = $state<'ALL' | MaterialCategory>('ALL');
  let deficitOnlyFilter = $state<boolean>(true);

  // New wishlist item form
  let isAddingWish = $state<boolean>(false);
  let newModuleName = $state<string>('7A Thrusters');
  let newShipType = $state<string>('Anaconda');
  let newBlueprintId = $state<string>('thrusters_dirty');
  let newBlueprintName = $state<string>('Dirty Thruster Tuning');
  let newTargetGrade = $state<number>(5);
  let newExperimentalId = $state<string>('exp_drag_drives');
  let newExperimentalName = $state<string>('Drag Drives');

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = engineeringWishlistEngine.subscribe(() => {
      wishlist = engineeringWishlistEngine.getWishlist();
      inventory = engineeringWishlistEngine.getInventory();
      deficits = engineeringWishlistEngine.calculateDeficits();
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  function handleAddWishlistItem() {
    engineeringWishlistEngine.addItem({
      moduleName: newModuleName,
      slotType: 'core',
      shipType: newShipType,
      blueprintId: newBlueprintId,
      blueprintName: newBlueprintName,
      targetGrade: newTargetGrade,
      rollsEstimate: 15,
      experimentalId: newExperimentalId || undefined,
      experimentalName: newExperimentalName || undefined,
    });
    isAddingWish = false;
  }

  function handleRemoveWishlistItem(id: string) {
    engineeringWishlistEngine.removeItem(id);
  }

  function handleUpdateInventory(name: string, count: number) {
    engineeringWishlistEngine.setInventoryCount(name, count);
  }

  const filteredMaterials = $derived(
    deficits.materials.filter((m) => {
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
      if (deficitOnlyFilter && m.deficit <= 0) return false;
      return true;
    })
  );

  function getGradeStars(grade: number): string {
    return '★'.repeat(grade);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none font-mono text-[var(--hud-amber)]"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal Window -->
    <div
      class="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#060a12] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.35)] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wishlist-modal-title"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <Icon name="cargo" size={22} glow={true} color="var(--hud-orange)" />
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 id="wishlist-modal-title" class="text-base sm:text-lg font-bold tracking-wider text-white">
                ENGINEERING WISHLIST & MATERIAL DEFICIT ROUTER
              </h2>
              <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/50 text-[10px] font-bold text-[var(--hud-orange)]">
                HORIZONS & ODYSSEY
              </span>
            </div>
            <div class="text-xs text-white/50">
              Wishlist Modules: <span class="text-white font-bold">{wishlist.length}</span> &bull; Total Deficit: <span class="text-amber-400 font-bold">{deficits.totalDeficit} materials</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onclick={onClose}
          class="w-7 h-7 rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] bg-black/40 hover:bg-[var(--hud-orange)]/20 text-white flex items-center justify-center text-xs transition-colors"
          title="Close Wishlist & Deficit Router"
        >
          ✕
        </button>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-2.5 bg-black/60 border-b border-[var(--hud-orange)]/25 text-xs">
        <div>
          <div class="text-[10px] text-white/50 uppercase">TOTAL DEFICIT</div>
          <div class="text-sm font-bold text-amber-400">{deficits.totalDeficit} UNITS MISSING</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">RAW DEFICIT</div>
          <div class="text-sm font-bold text-amber-500">{deficits.rawDeficitCount} UNITS</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">ENCODED DEFICIT</div>
          <div class="text-sm font-bold text-cyan-400">{deficits.encodedDeficitCount} UNITS</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">MANUFACTURED DEFICIT</div>
          <div class="text-sm font-bold text-orange-400">{deficits.manufacturedDeficitCount} UNITS</div>
        </div>
      </div>

      <!-- Nav Tabs -->
      <div class="flex items-center space-x-2 px-5 py-2 bg-black/40 border-b border-[var(--hud-orange)]/20 text-xs">
        <button
          type="button"
          onclick={() => (activeTab = 'deficits')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'deficits'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          📉 MATERIAL DEFICIT ROUTER ({deficits.materials.filter((m) => m.deficit > 0).length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'wishlist')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'wishlist'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          📝 PLANNED MODULES ({wishlist.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'inventory')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'inventory'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          🎒 MATERIAL INVENTORY AUDIT
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- DEFICITS TAB -->
        {#if activeTab === 'deficits'}
          <div class="space-y-4 text-xs">
            <!-- Filter Bar -->
            <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-black/40 border border-white/10">
              <div class="flex items-center space-x-2">
                <span class="text-white/50 text-[11px]">CATEGORY:</span>
                <button
                  type="button"
                  onclick={() => (categoryFilter = 'ALL')}
                  class="px-2 py-0.5 rounded text-[10px] {categoryFilter === 'ALL' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-white/70 hover:bg-white/10'}"
                >
                  ALL
                </button>
                <button
                  type="button"
                  onclick={() => (categoryFilter = 'Raw')}
                  class="px-2 py-0.5 rounded text-[10px] {categoryFilter === 'Raw' ? 'bg-amber-500 text-black font-bold' : 'text-amber-400 hover:bg-white/10'}"
                >
                  RAW
                </button>
                <button
                  type="button"
                  onclick={() => (categoryFilter = 'Encoded')}
                  class="px-2 py-0.5 rounded text-[10px] {categoryFilter === 'Encoded' ? 'bg-cyan-500 text-black font-bold' : 'text-cyan-400 hover:bg-white/10'}"
                >
                  ENCODED
                </button>
                <button
                  type="button"
                  onclick={() => (categoryFilter = 'Manufactured')}
                  class="px-2 py-0.5 rounded text-[10px] {categoryFilter === 'Manufactured' ? 'bg-orange-500 text-black font-bold' : 'text-orange-400 hover:bg-white/10'}"
                >
                  MANUFACTURED
                </button>
              </div>

              <div class="flex items-center space-x-2">
                <label class="flex items-center space-x-2 cursor-pointer text-white/70 text-[11px]">
                  <input
                    type="checkbox"
                    bind:checked={deficitOnlyFilter}
                    class="accent-[var(--hud-orange)]"
                  />
                  <span>Show Deficits Only</span>
                </label>
              </div>
            </div>

            <!-- Deficits Table -->
            <div class="border border-white/10 rounded-lg overflow-hidden">
              <table class="w-full text-left font-mono">
                <thead class="bg-black/80 border-b border-white/10 text-[11px] text-white/50">
                  <tr>
                    <th class="p-2.5">MATERIAL NAME</th>
                    <th class="p-2.5">CATEGORY</th>
                    <th class="p-2.5">GRADE</th>
                    <th class="p-2.5">REQUIRED</th>
                    <th class="p-2.5">OWNED</th>
                    <th class="p-2.5">DEFICIT</th>
                    <th class="p-2.5">RECOMMENDED SOURCING / TRADER</th>
                    {#if onPlotRoute}
                      <th class="p-2.5 text-right">ACTION</th>
                    {/if}
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-xs">
                  {#each filteredMaterials as mat}
                    <tr class="hover:bg-white/5">
                      <td class="p-2.5 font-bold text-white">{mat.name}</td>
                      <td class="p-2.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold {mat.category === 'Raw' ? 'bg-amber-500/20 text-amber-300' : mat.category === 'Encoded' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-orange-500/20 text-orange-300'}">
                          {mat.category}
                        </span>
                      </td>
                      <td class="p-2.5 text-amber-400">{getGradeStars(mat.grade)} (G{mat.grade})</td>
                      <td class="p-2.5 text-white">{mat.required}</td>
                      <td class="p-2.5 text-white/70">{mat.inventory}</td>
                      <td class="p-2.5 font-bold {mat.deficit > 0 ? 'text-red-400' : 'text-emerald-400'}">
                        {mat.deficit > 0 ? `-${mat.deficit}` : 'READY'}
                      </td>
                      <td class="p-2.5 text-white/70 text-[11px]">
                        <div>{mat.farmingLocationTip}</div>
                        {#if mat.nearestTraderSystem}
                          <div class="text-cyan-400 text-[10px]">Trader: {mat.nearestTraderSystem}</div>
                        {/if}
                      </td>
                      {#if onPlotRoute}
                        <td class="p-2.5 text-right">
                          {#if mat.nearestTraderSystem}
                            <button
                              type="button"
                              onclick={() => onPlotRoute && onPlotRoute(mat.nearestTraderSystem?.split(' ')[0] || 'Sol')}
                              class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/40 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 text-[10px]"
                            >
                              PLOT
                            </button>
                          {/if}
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

        <!-- WISHLIST TAB -->
        {:else if activeTab === 'wishlist'}
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white uppercase">WISHLIST MODULE SPECIFICATIONS</span>
              <button
                type="button"
                onclick={() => (isAddingWish = !isAddingWish)}
                class="px-3 py-1 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold transition-colors"
              >
                {isAddingWish ? '✕ CANCEL' : '+ ADD MODULE'}
              </button>
            </div>

            {#if isAddingWish}
              <div class="p-4 rounded-lg bg-black/60 border border-[var(--hud-orange)] space-y-3">
                <div class="font-bold text-white uppercase">Add Engineering Blueprint to Wishlist</div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label for="wish-module-input" class="block text-white/50 text-[10px] mb-1">MODULE</label>
                    <input
                      id="wish-module-input"
                      type="text"
                      bind:value={newModuleName}
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label for="wish-ship-input" class="block text-white/50 text-[10px] mb-1">TARGET SHIP</label>
                    <input
                      id="wish-ship-input"
                      type="text"
                      bind:value={newShipType}
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label for="wish-blueprint-select" class="block text-white/50 text-[10px] mb-1">ENGINEERING BLUEPRINT</label>
                    <select
                      id="wish-blueprint-select"
                      bind:value={newBlueprintId}
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    >
                      <option value="fsd_long_range">Increased FSD Range</option>
                      <option value="thrusters_dirty">Dirty Thrusters</option>
                      <option value="power_plant_overcharged">Overcharged Power Plant</option>
                      <option value="distributor_charge_enhanced">Charge Enhanced Power Distributor</option>
                      <option value="shield_reinforced">Reinforced Shields</option>
                      <option value="heavy_duty_armour">Heavy Duty Armour</option>
                    </select>
                  </div>
                </div>
                <div class="flex justify-end pt-2">
                  <button
                    type="button"
                    onclick={handleAddWishlistItem}
                    class="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    SAVE TO WISHLIST
                  </button>
                </div>
              </div>
            {/if}

            <div class="space-y-3">
              {#each wishlist as item}
                <div class="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="font-bold text-white text-sm">{item.moduleName}</span>
                      {#if item.shipType}
                        <span class="px-2 py-0.2 rounded bg-white/10 text-white/60 text-[10px]">
                          {item.shipType}
                        </span>
                      {/if}
                    </div>
                    <div class="text-white/60 text-[11px] mt-0.5">
                      Blueprint: <span class="text-amber-400 font-bold">{item.blueprintName}</span> (G{item.targetGrade})
                      {#if item.experimentalName}
                        &bull; Experimental: <span class="text-cyan-400 font-bold">{item.experimentalName}</span>
                      {/if}
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => handleRemoveWishlistItem(item.id)}
                    class="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 text-[10px]"
                  >
                    REMOVE
                  </button>
                </div>
              {/each}
            </div>
          </div>

        <!-- INVENTORY TAB -->
        {:else if activeTab === 'inventory'}
          <div class="space-y-4 text-xs">
            <div class="font-bold text-white uppercase">MATERIAL AUDIT & INVENTORY BALANCES</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {#each Object.entries(inventory) as [name, count]}
                <div class="p-2.5 rounded bg-black/40 border border-white/10 flex items-center justify-between">
                  <span class="text-white font-mono text-[11px] truncate max-w-[160px]">{name}</span>
                  <input
                    type="number"
                    value={count}
                    onchange={(e) => handleUpdateInventory(name, parseInt((e.target as HTMLInputElement).value) || 0)}
                    min="0"
                    max="300"
                    class="w-16 px-1.5 py-0.5 rounded bg-black/70 border border-white/20 text-right text-cyan-400 font-mono text-xs focus:outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-5 py-2.5 bg-black/80 border-t border-[var(--hud-orange)]/30 text-xs">
        <div class="text-white/50 text-[11px]">
          Engineering Catalog: v7.2 &bull; Synced with Inara & Frontier Ingest Schematics
        </div>
        <button
          type="button"
          onclick={() => engineeringWishlistEngine.clearWishlist()}
          class="px-3 py-1 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[11px] transition-colors"
        >
          CLEAR WISHLIST
        </button>
      </div>
    </div>
  </div>
{/if}
