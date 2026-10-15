<script lang="ts">
  // Location: atlas/client/src/lib/components/odyssey/OdysseyWishlistPlanner.svelte
  // On-Foot Suit & Weapon Engineering Blueprint Tracker & Wishlist Planner (Phase 10, Stage 10.4)
  // Provides:
  // - Interactive Wishlist builder: add suits (Maverick, Dominator, Artemis) and weapons (Karma, Takada, Manticore)
  // - Grade 1 through Grade 5 upgrade matrix configuration
  // - Modification slots picker (Night Vision, Extra Backpack, Audio Masking, Faster Shield Regen, etc.)
  // - Aggregate missing materials vs live Odyssey Locker inventory count
  // - Odyssey Engineer unlock statuses and progress trackers (Domino Green, Hero Ferrari, Kit Fowler, Baltanos, etc.)

  import { onMount, onDestroy } from 'svelte';
  import {
    odysseyWishlistEngine,
    type WishlistEquipmentItem,
    type WishlistSummary,
    type EngineerProgressView,
    type EngineerStatus,
  } from '$engine/odyssey_wishlist_engine';
  import {
    ODYSSEY_MODIFICATIONS,
    ODYSSEY_EQUIPMENT_CATALOG,
    type ModificationDefinition,
    type EquipmentDefinition,
    type ItemGrade,
  } from '$engine/odyssey_wishlist_catalog';
  import { odysseyLockerEngine } from '$engine/odyssey_locker_engine';

  let wishlist = $state<WishlistEquipmentItem[]>(odysseyWishlistEngine.getWishlist());
  let summary = $state<WishlistSummary>(odysseyWishlistEngine.computeSummary());
  let engineerList = $state<EngineerProgressView[]>(odysseyWishlistEngine.getEngineerProgressList());

  // Sub-tabs inside Wishlist Planner: 'planner' (Wishlist & Materials) vs 'engineers' (Engineer Unlock Trackers)
  let subView = $state<'planner' | 'engineers'>('planner');

  // Modal / Dropdown to add equipment
  let isAddEquipmentOpen = $state<boolean>(false);
  let selectedEquipmentToAdd = $state<string>('artemis');
  let selectedCurrentGradeToAdd = $state<ItemGrade>(1);
  let selectedTargetGradeToAdd = $state<ItemGrade>(5);

  // Filter for Engineers list
  let engineerRegionFilter = $state<'ALL' | 'Bubble' | 'Colonia'>('ALL');
  let engineerSearchQuery = $state<string>('');

  let unsubscribeWishlist: (() => void) | null = null;
  let unsubscribeLocker: (() => void) | null = null;

  onMount(() => {
    odysseyWishlistEngine.init();
    odysseyLockerEngine.init();

    unsubscribeWishlist = odysseyWishlistEngine.subscribe(() => {
      wishlist = odysseyWishlistEngine.getWishlist();
      summary = odysseyWishlistEngine.computeSummary();
      engineerList = odysseyWishlistEngine.getEngineerProgressList();
    });

    unsubscribeLocker = odysseyLockerEngine.subscribe(() => {
      summary = odysseyWishlistEngine.computeSummary();
    });
  });

  onDestroy(() => {
    if (unsubscribeWishlist) unsubscribeWishlist();
    if (unsubscribeLocker) unsubscribeLocker();
  });

  function handleAddEquipment() {
    odysseyWishlistEngine.addEquipmentToWishlist(
      selectedEquipmentToAdd,
      selectedCurrentGradeToAdd,
      selectedTargetGradeToAdd
    );
    isAddEquipmentOpen = false;
  }

  function handleGradeChange(instanceId: string, current: ItemGrade, target: ItemGrade) {
    odysseyWishlistEngine.updateWishlistGrades(instanceId, current, target);
  }

  function handleToggleMod(instanceId: string, modId: string) {
    odysseyWishlistEngine.toggleModification(instanceId, modId);
  }

  function handleRemoveItem(instanceId: string) {
    odysseyWishlistEngine.removeWishlistItem(instanceId);
  }

  function handleCycleEngineer(engineerId: string) {
    odysseyWishlistEngine.cycleEngineerStatus(engineerId);
  }

  const STATUS_BADGE: Record<EngineerStatus, { label: string; style: string }> = {
    locked: { label: 'LOCKED', style: 'bg-zinc-900 text-zinc-400 border-zinc-700' },
    discovered: { label: 'DISCOVERED', style: 'bg-blue-950 text-blue-300 border-blue-500/50' },
    invited: { label: 'INVITED', style: 'bg-amber-950 text-amber-300 border-amber-500/50' },
    unlocked: { label: 'UNLOCKED', style: 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
  };

  const filteredEngineers = $derived.by(() => {
    return engineerList.filter((entry) => {
      if (engineerRegionFilter !== 'ALL' && entry.engineer.region !== engineerRegionFilter) {
        return false;
      }
      if (engineerSearchQuery.trim()) {
        const q = engineerSearchQuery.toLowerCase().trim();
        const matchesName = entry.engineer.name.toLowerCase().includes(q);
        const matchesSystem = entry.engineer.system.toLowerCase().includes(q);
        const matchesSpecialties = entry.engineer.specialties.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesSystem && !matchesSpecialties) return false;
      }
      return true;
    });
  });

  function getAvailableModsForCategory(cat: 'suit' | 'weapon'): ModificationDefinition[] {
    return ODYSSEY_MODIFICATIONS.filter((m) => m.targetCategory === cat);
  }
</script>

<div class="flex flex-col h-full bg-zinc-950 text-white font-mono text-xs overflow-hidden">
  <!-- Top Planner Sub-Header -->
  <div class="p-3 bg-black/80 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
    <div class="flex items-center space-x-3">
      <span class="p-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-lg">
        🛠️
      </span>
      <div>
        <div class="flex items-center space-x-2">
          <h2 class="text-sm font-bold text-amber-300 uppercase tracking-wider">
            ON-FOOT SUIT & WEAPON ENGINEERING BLUEPRINT TRACKER
          </h2>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300">
            STAGE 10.4
          </span>
        </div>
        <p class="text-[11px] text-white/60 mt-0.5">
          Plan G1➔G5 upgrades, assign tactical modifications, audit missing locker items, and track engineer unlocks.
        </p>
      </div>
    </div>

    <!-- Sub-View Navigation Tabs -->
    <div class="flex items-center space-x-2">
      <div class="flex items-center bg-black/60 p-0.5 rounded border border-white/10">
        <button
          type="button"
          class="px-3 py-1 rounded text-xs font-bold transition-all {subView === 'planner'
            ? 'bg-amber-500 text-black shadow-sm'
            : 'text-amber-300/80 hover:text-white'}"
          onclick={() => (subView = 'planner')}
        >
          📋 WISHLIST PLANNER ({wishlist.length})
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded text-xs font-bold transition-all {subView === 'engineers'
            ? 'bg-purple-500 text-black shadow-sm'
            : 'text-purple-300/80 hover:text-white'}"
          onclick={() => (subView = 'engineers')}
        >
          🧑‍🔧 ODYSSEY ENGINEERS ({engineerList.filter((e) => e.status === 'unlocked').length}/{engineerList.length})
        </button>
      </div>

      {#if subView === 'planner'}
        <button
          type="button"
          class="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-colors"
          onclick={() => (isAddEquipmentOpen = true)}
        >
          <span>+</span>
          <span>ADD SUIT / WEAPON</span>
        </button>
      {/if}
    </div>
  </div>

  {#if subView === 'planner'}
    <!-- Wishlist Aggregate Fulfillment Telemetry Banner -->
    <div class="px-4 py-2 bg-gradient-to-r from-amber-950/40 via-black to-zinc-950 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-white/60">WISHLIST READINESS:</span>
          <span class="font-bold {summary.isFullyReady ? 'text-emerald-400' : 'text-amber-400'}">
            {summary.fulfillmentPercentage}% COMPLETE
          </span>
          {#if summary.isFullyReady}
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
              ✓ READY TO FABRICATE
            </span>
          {:else}
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
              {summary.totalMaterialsMissing} ITEMS MISSING
            </span>
          {/if}
        </div>

        <span class="text-white/20">|</span>

        <div>
          <span class="text-white/60">TOTAL CREDITS:</span>
          <strong class="text-amber-300 ml-1">{summary.totalCreditCost.toLocaleString()} CR</strong>
        </div>

        <span class="text-white/20">|</span>

        <div>
          <span class="text-white/60">MATERIALS:</span>
          <span class="text-emerald-400 font-bold ml-1">{summary.totalMaterialsInLocker}</span>
          <span class="text-white/40">/ {summary.totalMaterialsRequired} in locker</span>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          class="px-2.5 py-0.5 rounded bg-black/60 border border-white/20 hover:border-white/40 text-[11px] text-white/70"
          onclick={() => odysseyWishlistEngine.resetWishlistToDefault()}
          title="Reset Wishlist & Engineer states to sample defaults"
        >
          Reset Demo
        </button>
        <button
          type="button"
          class="px-2.5 py-0.5 rounded bg-red-950/40 border border-red-500/40 hover:bg-red-500/20 text-[11px] text-red-300"
          onclick={() => odysseyWishlistEngine.clearWishlist()}
        >
          Clear Wishlist
        </button>
      </div>
    </div>

    <!-- Main Split Screen: Left = Wishlist Items & Mods / Right = Missing Materials Aggregate -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      <!-- Left Column: Wishlist Equipment Cards (7 cols) -->
      <div class="lg:col-span-7 border-r border-white/10 flex flex-col bg-black/40 overflow-hidden">
        <div class="p-2.5 bg-zinc-900/60 border-b border-white/10 flex items-center justify-between text-xs">
          <span class="font-bold uppercase tracking-wider text-amber-300">
            PLANNED SUITS & WEAPONS ({wishlist.length})
          </span>
          <span class="text-[10px] text-white/50">Click modification badges to toggle</span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          {#if wishlist.length === 0}
            <div class="py-16 text-center text-white/40 flex flex-col items-center justify-center space-y-3">
              <span class="text-4xl">🛠️</span>
              <p class="text-sm font-semibold">Wishlist is currently empty.</p>
              <button
                type="button"
                class="px-3 py-1 rounded bg-amber-500 text-black font-bold text-xs"
                onclick={() => (isAddEquipmentOpen = true)}
              >
                + Add Suit or Weapon to Plan
              </button>
            </div>
          {:else}
            {#each wishlist as item (item.instanceId)}
              {@const maxModSlots = Math.max(0, item.targetGrade - 1)}
              {@const availableMods = getAvailableModsForCategory(item.category)}
              <div class="p-3 rounded border border-white/10 bg-black/60 flex flex-col space-y-2.5 hover:border-amber-500/40 transition-colors">
                <!-- Card Header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="p-1 rounded text-sm {item.category === 'suit' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'}">
                      {item.category === 'suit' ? '🦺' : '🔫'}
                    </span>
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="font-bold text-sm text-white">{item.equipmentName}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] bg-black/60 border border-white/20 text-white/60">
                          {item.family}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Grade Selectors & Delete -->
                  <div class="flex items-center space-x-2">
                    <div class="flex items-center space-x-1 text-xs">
                      <span class="text-[10px] text-white/50">Grade:</span>
                      <select
                        class="bg-black border border-white/20 rounded px-1 py-0.5 text-xs text-amber-300 font-bold focus:outline-none"
                        value={item.currentGrade}
                        onchange={(e) => handleGradeChange(item.instanceId, Number(e.currentTarget.value) as ItemGrade, item.targetGrade)}
                      >
                        <option value={1}>G1</option>
                        <option value={2}>G2</option>
                        <option value={3}>G3</option>
                        <option value={4}>G4</option>
                        <option value={5}>G5</option>
                      </select>
                      <span class="text-white/40">➔</span>
                      <select
                        class="bg-black border border-amber-500/50 rounded px-1 py-0.5 text-xs text-amber-300 font-bold focus:outline-none"
                        value={item.targetGrade}
                        onchange={(e) => handleGradeChange(item.instanceId, item.currentGrade, Number(e.currentTarget.value) as ItemGrade)}
                      >
                        <option value={1}>G1</option>
                        <option value={2}>G2</option>
                        <option value={3}>G3</option>
                        <option value={4}>G4</option>
                        <option value={5}>G5</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      class="text-white/40 hover:text-red-400 p-1 text-xs"
                      onclick={() => handleRemoveItem(item.instanceId)}
                      title="Remove from wishlist"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <!-- Modification Slots Header -->
                <div class="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span class="text-white/60">
                    MODIFICATION SLOTS ({item.selectedModIds.length} / {maxModSlots} Unlocked at G{item.targetGrade}):
                  </span>
                  {#if item.selectedModIds.length >= maxModSlots && maxModSlots > 0}
                    <span class="text-[10px] text-amber-400">All available slots filled</span>
                  {:else if maxModSlots === 0}
                    <span class="text-[10px] text-white/40">Upgrade to G2+ to unlock mod slots</span>
                  {/if}
                </div>

                <!-- Modification Chips Grid -->
                <div class="flex flex-wrap gap-1.5">
                  {#each availableMods as mod (mod.id)}
                    {@const isSelected = item.selectedModIds.includes(mod.id)}
                    {@const canAdd = isSelected || item.selectedModIds.length < maxModSlots}
                    <button
                      type="button"
                      class="px-2 py-1 rounded text-[11px] border text-left transition-all flex items-center space-x-1.5 {isSelected
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : canAdd
                          ? 'bg-black/50 border-white/10 hover:border-white/30 text-white/60'
                          : 'bg-black/30 border-white/5 text-white/30 cursor-not-allowed opacity-60'}"
                      onclick={() => handleToggleMod(item.instanceId, mod.id)}
                      disabled={!canAdd}
                      title="{mod.description} (Engineers: {mod.engineers.join(', ')})"
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span class="font-semibold">{mod.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Right Column: Aggregate Missing Materials Checklist (5 cols) -->
      <div class="lg:col-span-5 flex flex-col bg-black/20 overflow-hidden">
        <div class="p-2.5 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between text-xs">
          <span class="font-bold uppercase tracking-wider text-cyan-300">
            AGGREGATE MATERIALS CHECKLIST ({summary.materialBreakdown.length})
          </span>
          <span class="text-[10px] text-white/50">Locker vs Needed</span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          {#if summary.materialBreakdown.length === 0}
            <div class="py-16 text-center text-white/40 flex flex-col items-center justify-center space-y-2">
              <span class="text-2xl">📦</span>
              <span class="text-xs">No materials currently required.</span>
            </div>
          {:else}
            {#each summary.materialBreakdown as req (req.itemId)}
              <div class="p-2 rounded border transition-colors flex items-center justify-between text-xs {req.isSatisfied
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/20 border-red-500/40 text-red-200'}">
                <div class="flex flex-col flex-1 pr-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs">{req.isSatisfied ? '✓' : '⚠️'}</span>
                    <span class="font-bold text-white text-xs">{req.name}</span>
                  </div>
                  <span class="text-[9px] text-white/40 line-clamp-1 mt-0.5" title={req.usedInItems.join(', ')}>
                    {req.usedInItems.join(' • ')}
                  </span>
                </div>

                <div class="flex flex-col items-end shrink-0">
                  <div class="flex items-center space-x-1.5 font-bold">
                    <span class="{req.lockerCount >= req.requiredCount ? 'text-emerald-400' : 'text-amber-400'}">
                      {req.lockerCount}
                    </span>
                    <span class="text-white/40">/ {req.requiredCount}</span>
                  </div>
                  {#if !req.isSatisfied}
                    <span class="text-[10px] text-red-400 font-bold mt-0.5">
                      Need +{req.missingCount} more
                    </span>
                  {:else}
                    <span class="text-[9px] text-emerald-400 font-semibold mt-0.5">
                      Covered
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Sub-View: Odyssey Engineers Unlock Directory & Progress Trackers -->
    <div class="flex-1 flex flex-col overflow-hidden bg-black/40">
      <!-- Filter Bar for Engineers -->
      <div class="p-2.5 bg-black/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div class="flex items-center space-x-2">
          <span class="text-white/50 text-[10px] uppercase font-bold">REGION:</span>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors {engineerRegionFilter === 'ALL'
              ? 'bg-purple-600 text-black border-purple-400'
              : 'bg-black/40 text-purple-300 border-white/10 hover:border-white/30'}"
            onclick={() => (engineerRegionFilter = 'ALL')}
          >
            ALL REGIONS ({engineerList.length})
          </button>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors {engineerRegionFilter === 'Bubble'
              ? 'bg-cyan-600 text-black border-cyan-400'
              : 'bg-black/40 text-cyan-300 border-white/10 hover:border-white/30'}"
            onclick={() => (engineerRegionFilter = 'Bubble')}
          >
            BUBBLE ({engineerList.filter((e) => e.engineer.region === 'Bubble').length})
          </button>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors {engineerRegionFilter === 'Colonia'
              ? 'bg-emerald-600 text-black border-emerald-400'
              : 'bg-black/40 text-emerald-300 border-white/10 hover:border-white/30'}"
            onclick={() => (engineerRegionFilter = 'Colonia')}
          >
            COLONIA ({engineerList.filter((e) => e.engineer.region === 'Colonia').length})
          </button>
        </div>

        <div class="flex items-center space-x-2">
          <input
            type="text"
            bind:value={engineerSearchQuery}
            placeholder="Search engineers, systems, specialties..."
            class="w-64 px-2.5 py-1 bg-black border border-white/20 rounded text-xs text-white placeholder-white/40 focus:border-purple-400 focus:outline-none"
          />
          {#if engineerSearchQuery}
            <button
              type="button"
              class="text-white/50 hover:text-white text-xs"
              onclick={() => (engineerSearchQuery = '')}
            >
              ✕
            </button>
          {/if}
        </div>
      </div>

      <!-- Engineer Cards Grid -->
      <div class="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each filteredEngineers as item (item.engineer.id)}
          {@const badge = STATUS_BADGE[item.status]}
          <div class="p-3 rounded border border-white/10 bg-black/60 hover:border-purple-500/40 transition-colors flex flex-col justify-between space-y-2">
            <div>
              <!-- Header -->
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-sm text-white">{item.engineer.name}</h3>
                  <div class="text-[10px] text-white/50 flex items-center space-x-1.5 mt-0.5">
                    <span>{item.engineer.location}</span>
                    <span>•</span>
                    <span class="text-cyan-300">{item.engineer.system}</span>
                    <span>({item.engineer.region})</span>
                  </div>
                </div>

                <!-- Status Badge Button (Cycles Locked -> Discovered -> Invited -> Unlocked) -->
                <button
                  type="button"
                  class="px-2 py-0.5 rounded border text-[10px] font-bold transition-all {badge.style}"
                  onclick={() => handleCycleEngineer(item.engineer.id)}
                  title="Click to cycle unlock state"
                >
                  {badge.label}
                </button>
              </div>

              <!-- Referral Chain -->
              <div class="text-[10px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded p-1.5 mt-2">
                <span class="font-bold text-amber-300">Referral:</span> {item.engineer.referralChain}
              </div>

              <!-- Unlock Requirements -->
              <div class="mt-2 space-y-1 text-[11px]">
                <div class="text-white/70">
                  <span class="text-white/40 text-[10px] uppercase font-bold">Invite:</span> {item.engineer.inviteRequirement}
                </div>
                <div class="text-emerald-300/90">
                  <span class="text-emerald-400/50 text-[10px] uppercase font-bold">Unlock Task:</span> {item.engineer.unlockRequirement}
                </div>
              </div>
            </div>

            <!-- Specialties Footer -->
            <div class="pt-2 border-t border-white/5">
              <span class="text-[9px] text-white/40 uppercase font-bold">SPECIALTIES:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#each item.engineer.specialties as spec}
                  <span class="px-1.5 py-0.2 rounded text-[9px] bg-purple-950/40 border border-purple-500/30 text-purple-200">
                    {spec}
                  </span>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Add Equipment Modal Overlay -->
  {#if isAddEquipmentOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => {
        if (e.target === e.currentTarget) isAddEquipmentOpen = false;
      }}
    >
      <div class="w-full max-w-md bg-zinc-950 border border-amber-500 rounded p-4 flex flex-col space-y-3 font-mono text-xs">
        <div class="flex items-center justify-between border-b border-amber-500/30 pb-2">
          <span class="font-bold text-sm text-amber-300">ADD SUIT OR WEAPON TO PLANNER</span>
          <button
            type="button"
            class="text-white/60 hover:text-white"
            onclick={() => (isAddEquipmentOpen = false)}
          >
            ✕
          </button>
        </div>

        <div>
          <label for="select-equipment-input" class="block text-white/60 mb-1">SELECT SUIT OR WEAPON:</label>
          <select
            id="select-equipment-input"
            bind:value={selectedEquipmentToAdd}
            class="w-full bg-black border border-white/20 rounded p-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <optgroup label="Odyssey Suits">
              {#each ODYSSEY_EQUIPMENT_CATALOG.filter((e) => e.category === 'suit') as equip}
                <option value={equip.id}>{equip.name} ({equip.family})</option>
              {/each}
            </optgroup>
            <optgroup label="Odyssey Personal Weapons">
              {#each ODYSSEY_EQUIPMENT_CATALOG.filter((e) => e.category === 'weapon') as equip}
                <option value={equip.id}>{equip.name} ({equip.family})</option>
              {/each}
            </optgroup>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="select-starting-grade-input" class="block text-white/60 mb-1">STARTING GRADE:</label>
            <select
              id="select-starting-grade-input"
              bind:value={selectedCurrentGradeToAdd}
              class="w-full bg-black border border-white/20 rounded p-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              <option value={1}>Grade 1 (Stock)</option>
              <option value={2}>Grade 2</option>
              <option value={3}>Grade 3 (Store bought)</option>
              <option value={4}>Grade 4</option>
              <option value={5}>Grade 5</option>
            </select>
          </div>
          <div>
            <label for="select-target-grade-input" class="block text-white/60 mb-1">TARGET GRADE:</label>
            <select
              id="select-target-grade-input"
              bind:value={selectedTargetGradeToAdd}
              class="w-full bg-black border border-amber-500/50 rounded p-1.5 text-xs text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
            >
              <option value={1}>Grade 1</option>
              <option value={2}>Grade 2 (1 Mod Slot)</option>
              <option value={3}>Grade 3 (2 Mod Slots)</option>
              <option value={4}>Grade 4 (3 Mod Slots)</option>
              <option value={5}>Grade 5 (4 Mod Slots)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-white/10">
          <button
            type="button"
            class="px-3 py-1 rounded bg-black border border-white/20 text-white/70 hover:text-white"
            onclick={() => (isAddEquipmentOpen = false)}
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold"
            onclick={handleAddEquipment}
          >
            Add to Wishlist
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
