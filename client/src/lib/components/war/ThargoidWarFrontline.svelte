<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import { ananke } from '$engine/ananke_client';
  import TitanTacticalGuide from '$components/war/TitanTacticalGuide.svelte';
  import {
    type TitanMaelstromRecord,
    type WarSystemRecord,
    type WarStateOverview,
    type WarSystemState,
    type WarFilterCriteria,
    filterWarSystems,
    compileWarStateOverview,
    CANONICAL_TITANS,
    CANONICAL_WAR_SYSTEMS,
  } from '$engine/thargoid_war_engine';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onSelectSystem?: (systemName: string, coords: { x: number; y: number; z: number }) => void;
    onFocusTitan?: (titan: TitanMaelstromRecord) => void;
  }

  let {
    isOpen = true,
    onClose,
    onSelectSystem,
    onFocusTitan,
  }: Props = $props();

  let isTacticalGuideOpen = $state<boolean>(false);

  // Live war state
  let warOverview = $state<WarStateOverview>(compileWarStateOverview(CANONICAL_TITANS, CANONICAL_WAR_SYSTEMS));
  let isLoading = $state<boolean>(false);
  let selectedTab = $state<'systems' | 'titans'>('systems');

  // Filters
  let filterState = $state<'ALL' | WarSystemState>('ALL');
  let filterMaelstrom = $state<'ALL' | string>('ALL');
  let filterHighPriority = $state<boolean>(false);
  let filterEvacuations = $state<boolean>(false);
  let filterCounterstrike = $state<boolean>(false);
  let searchQuery = $state<string>('');

  // Selected details
  let selectedSystem = $state<WarSystemRecord | null>(null);
  let selectedTitan = $state<TitanMaelstromRecord | null>(null);

  onMount(async () => {
    isLoading = true;
    try {
      const data = await ananke.getThargoidWarState();
      warOverview = data;
    } catch {
      // Keep canonical data
    } finally {
      isLoading = false;
    }
  });

  const filteredSystems = $derived(
    filterWarSystems(warOverview.systems, {
      state: filterState,
      maelstrom: filterMaelstrom,
      onlyHighPriority: filterHighPriority,
      onlyEvacuations: filterEvacuations,
      onlyCounterstrikeCandidates: filterCounterstrike,
      searchQuery: searchQuery,
    })
  );

  function getStateColor(state: WarSystemState | string): string {
    switch (state) {
      case 'Alert':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'Invasion':
        return 'text-red-400 border-red-500/40 bg-red-500/10';
      case 'Infested':
      case 'Controlled':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'Counterstrike':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'Cleared':
      case 'Recovery':
        return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
      default:
        return 'text-stone-300 border-stone-600/40 bg-stone-800/20';
    }
  }

  function getTitanStateBadge(state: string): string {
    switch (state) {
      case 'Active':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'Vulnerable':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse';
      case 'Meltdown':
        return 'bg-orange-600/30 text-orange-200 border-orange-500/60 animate-pulse';
      case 'Destroyed':
        return 'bg-stone-800/40 text-stone-400 border-stone-700/50 line-through';
      default:
        return 'bg-stone-800/20 text-stone-300 border-stone-700/30';
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
    <!-- Window Container -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950/95 border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_35px_rgba(255,113,0,0.18)] font-mono text-stone-200 overflow-hidden"
    >
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-black/60">
        <div class="flex items-center space-x-3">
          <span class="text-xl">☣️</span>
          <div>
            <h2 class="text-base sm:text-lg font-bold tracking-wider text-[var(--hud-orange)] uppercase flex items-center gap-2">
              ANTI-XENO WAR ROOM // THARGOID FRONTLINE & TITAN MAELSTROMS
              <span class="text-xs px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-400 bg-emerald-950/30">
                STAGE 14.1 LIVE
              </span>
            </h2>
            <p class="text-xs text-stone-400">
              Galactic Defense Frontline Boundary • 3D Caustic Threat Bubbles • Weekly Reset Cycle Tracking
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Refresh button -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border border-stone-700 bg-black/40 hover:border-[var(--hud-orange)] hover:text-[var(--hud-orange)] transition-all"
            onclick={async () => {
              isLoading = true;
              warOverview = await ananke.getThargoidWarState();
              isLoading = false;
            }}
            title="Refresh Live War Status"
          >
            {isLoading ? 'SYNCING...' : 'REFRESH'}
          </button>

          <!-- Close button -->
          <button
            type="button"
            class="p-1 rounded text-stone-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 transition-all"
            onclick={() => onClose?.()}
            title="Close War Room"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      <!-- Live Cycle Status Bar & Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-4 bg-black/40 border-b border-stone-800 text-xs">
        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Weekly Cycle Reset</span>
          <span class="text-sm font-bold text-amber-400 font-mono">
            {warOverview.hoursUntilCycleReset.toFixed(1)} hrs left
          </span>
          <span class="text-[10px] text-stone-400 block">Thu 07:00 UTC</span>
        </div>

        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Under Attack</span>
          <span class="text-sm font-bold text-red-400 font-mono">
            {warOverview.totalSystemsUnderAttack} Systems
          </span>
          <span class="text-[10px] text-stone-400 block">{warOverview.totalInvasions} Invasions, {warOverview.totalAlerts} Alerts</span>
        </div>

        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Controlled / Infested</span>
          <span class="text-sm font-bold text-emerald-400 font-mono">
            {warOverview.totalControlled} Systems
          </span>
          <span class="text-[10px] text-stone-400 block">Thargoid Matrix Hubs</span>
        </div>

        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Cleared Systems</span>
          <span class="text-sm font-bold text-blue-400 font-mono">
            {warOverview.totalClearedThisCycle} Cleared
          </span>
          <span class="text-[10px] text-stone-400 block">Humanity Counter-offensive</span>
        </div>

        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Active Titans</span>
          <span class="text-sm font-bold text-red-500 font-mono">
            {warOverview.activeTitansCount} / {warOverview.titans.length}
          </span>
          <span class="text-[10px] text-stone-400 block">Raijin, Cocijo</span>
        </div>

        <div class="p-2.5 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] tracking-wider uppercase">Fallen Titans</span>
          <span class="text-sm font-bold text-emerald-300 font-mono">
            {warOverview.destroyedTitansCount} Destroyed
          </span>
          <span class="text-[10px] text-stone-400 block">Taranis, Leigong, etc.</span>
        </div>
      </div>

      <!-- Sub-Navigation Tabs & Filters -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-black/30 border-b border-stone-800">
        <!-- Tabs -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {selectedTab === 'systems' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (selectedTab = 'systems')}
          >
            WAR FRONTLINE SYSTEMS ({filteredSystems.length})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {selectedTab === 'titans' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (selectedTab = 'titans')}
          >
            TITAN MAELSTROMS ({warOverview.titans.length})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center space-x-1.5 border border-amber-500/60 bg-amber-950/40 text-amber-300 hover:bg-amber-500/20"
            onclick={() => (isTacticalGuideOpen = true)}
            title="Open Interactive Titan Tactical Schematic & Vent Metronome [Stage 14.2]"
          >
            <span>🎯 TITAN TACTICAL GUIDE</span>
            <span class="px-1 py-0.2 text-[9px] rounded bg-amber-500 text-black font-extrabold">v14.2</span>
          </button>
        </div>

        <!-- System Filters (when tab = systems) -->
        {#if selectedTab === 'systems'}
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <!-- Search -->
            <input
              type="text"
              placeholder="Search system..."
              bind:value={searchQuery}
              class="px-2.5 py-1 rounded bg-black/60 border border-stone-700 text-stone-200 placeholder-stone-500 text-xs focus:border-[var(--hud-orange)] focus:outline-none w-36"
            />

            <!-- State Filter -->
            <select
              bind:value={filterState}
              class="px-2 py-1 rounded bg-black/60 border border-stone-700 text-stone-300 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
            >
              <option value="ALL">All States</option>
              <option value="Invasion">Invasions</option>
              <option value="Alert">Alerts</option>
              <option value="Infested">Infested</option>
              <option value="Controlled">Controlled</option>
              <option value="Counterstrike">Counterstrike</option>
              <option value="Cleared">Cleared</option>
            </select>

            <!-- Maelstrom Filter -->
            <select
              bind:value={filterMaelstrom}
              class="px-2 py-1 rounded bg-black/60 border border-stone-700 text-stone-300 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
            >
              <option value="ALL">All Maelstroms</option>
              {#each warOverview.titans as t}
                <option value={t.name}>{t.name} ({t.state})</option>
              {/each}
            </select>

            <!-- Quick Filter Badges -->
            <button
              type="button"
              class="px-2.5 py-1 rounded border text-[11px] font-bold transition-all {filterHighPriority ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/40 border-stone-800 text-stone-400 hover:border-stone-600'}"
              onclick={() => (filterHighPriority = !filterHighPriority)}
            >
              ⭐ PRIORITY TARGETS
            </button>

            <button
              type="button"
              class="px-2.5 py-1 rounded border text-[11px] font-bold transition-all {filterEvacuations ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-black/40 border-stone-800 text-stone-400 hover:border-stone-600'}"
              onclick={() => (filterEvacuations = !filterEvacuations)}
            >
              🚨 EVACUATION PORTS
            </button>

            <button
              type="button"
              class="px-2.5 py-1 rounded border text-[11px] font-bold transition-all {filterCounterstrike ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-black/40 border-stone-800 text-stone-400 hover:border-stone-600'}"
              onclick={() => (filterCounterstrike = !filterCounterstrike)}
            >
              ⚔️ COUNTER-STRIKE (&gt;80%)
            </button>
          </div>
        {/if}
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#if selectedTab === 'systems'}
          <!-- War Systems Table / Cards -->
          <div class="grid grid-cols-1 gap-2.5">
            {#each filteredSystems as sys}
              <div
                role="button"
                tabindex="0"
                class="p-3.5 rounded border bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 {selectedSystem?.systemAddress === sys.systemAddress ? 'border-[var(--hud-orange)] shadow-[0_0_15px_rgba(255,113,0,0.15)]' : 'border-stone-800'}"
                onclick={() => (selectedSystem = sys)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectedSystem = sys;
                  }
                }}
              >
                <!-- System Header & Maelstrom Origin -->
                <div class="flex-1 min-w-[220px]">
                  <div class="flex items-center space-x-2">
                    <span class="font-bold text-sm text-[var(--hud-orange)] tracking-wide">
                      {sys.systemName}
                    </span>
                    {#if sys.highPriority}
                      <span class="px-1.5 py-0.5 text-[9px] rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        High Priority
                      </span>
                    {/if}
                    {#if sys.evacuationsActive}
                      <span class="px-1.5 py-0.5 text-[9px] rounded font-bold bg-red-500/20 text-red-300 border border-red-500/40 uppercase">
                        Evacuations Active
                      </span>
                    {/if}
                  </div>

                  <div class="flex items-center space-x-3 text-xs text-stone-400 mt-1">
                    <span>Maelstrom: <strong class="text-stone-200">{sys.maelstromName}</strong> ({sys.distanceToTitanLy.toFixed(1)} LY)</span>
                    <span>•</span>
                    <span>Pop: <strong class="text-stone-200">{sys.population > 0 ? (sys.population / 1000000).toFixed(1) + 'M' : 'Unpopulated'}</strong></span>
                    {#if sys.spireSitesCount > 0}
                      <span>•</span>
                      <span class="text-emerald-400 font-bold">🏛️ {sys.spireSitesCount} Spire Site{sys.spireSitesCount > 1 ? 's' : ''}</span>
                    {/if}
                  </div>
                </div>

                <!-- State Badge & Defense Bar -->
                <div class="flex-1 min-w-[240px] max-w-md">
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase {getStateColor(sys.state)}">
                      {sys.state}
                    </span>
                    <span class="font-mono text-xs font-bold text-stone-200">
                      {sys.defenseProgressPercent.toFixed(1)}% Completed
                    </span>
                  </div>

                  <!-- Progress Bar -->
                  <div class="w-full h-2.5 rounded-full bg-stone-800 overflow-hidden relative border border-stone-700/60">
                    <div
                      class="h-full transition-all duration-500 {sys.defenseProgressPercent >= 100 ? 'bg-blue-400' : sys.defenseProgressPercent >= 80 ? 'bg-cyan-400' : sys.defenseProgressPercent >= 50 ? 'bg-amber-400' : 'bg-red-500'}"
                      style="width: {Math.min(100, Math.max(0, sys.defenseProgressPercent))}%"
                    ></div>
                  </div>

                  <!-- Cycle rate requirement -->
                  <div class="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                    <span>Reset in {sys.remainingHours.toFixed(0)}h</span>
                    {#if sys.defenseProgressPercent < 100}
                      <span class="text-amber-300 font-bold">
                        Required: +{sys.requiredProgressPerHour.toFixed(2)}% / hr
                      </span>
                    {:else}
                      <span class="text-blue-400 font-bold">Defense Target Cleared</span>
                    {/if}
                  </div>
                </div>

                <!-- Starport Status & Actions -->
                <div class="flex items-center space-x-3 text-xs">
                  {#if sys.starportsUnderAttack > 0 || sys.starportsDamaged > 0}
                    <div class="text-[11px] text-stone-300">
                      <div>🚨 {sys.starportsUnderAttack} Under Attack</div>
                      <div class="text-red-400">🔥 {sys.starportsDamaged} Damaged</div>
                    </div>
                  {/if}

                  <button
                    type="button"
                    class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 text-[var(--hud-amber)] font-bold text-xs uppercase transition-all"
                    onclick={(e) => {
                      e.stopPropagation();
                      onSelectSystem?.(sys.systemName, sys.coords);
                    }}
                    title="Focus System in 3D Galaxy View"
                  >
                    FOCUS 3D
                  </button>
                </div>
              </div>
            {/each}

            {#if filteredSystems.length === 0}
              <div class="p-8 text-center text-stone-500 border border-dashed border-stone-800 rounded">
                No war systems match the selected criteria.
              </div>
            {/if}
          </div>
        {:else}
          <!-- Titan Maelstroms View -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {#each warOverview.titans as titan}
              <div
                role="button"
                tabindex="0"
                class="p-4 rounded border bg-zinc-900/50 hover:bg-zinc-900/90 transition-all flex flex-col justify-between {selectedTitan?.id === titan.id ? 'border-[var(--hud-orange)] shadow-[0_0_15px_rgba(255,113,0,0.2)]' : 'border-stone-800'}"
                onclick={() => (selectedTitan = titan)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectedTitan = titan;
                  }
                }}
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-base font-bold text-[var(--hud-orange)] tracking-wide">
                      TITAN {titan.name.toUpperCase()}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border {getTitanStateBadge(titan.state)}">
                      {titan.state}
                    </span>
                  </div>

                  <div class="text-xs text-stone-400 mb-3 space-y-1">
                    <div>System: <strong class="text-stone-200">{titan.systemName}</strong></div>
                    <div>Caustic Bubble: <strong class="text-emerald-400">{titan.causticCloudRadiusLy} LY</strong> aura</div>
                    <div>Coords: [{titan.coords.x.toFixed(0)}, {titan.coords.y.toFixed(0)}, {titan.coords.z.toFixed(0)}] LY</div>
                    {#if titan.destructionDateUtc}
                      <div class="text-stone-400">Destroyed: {titan.destructionDateUtc.slice(0, 10)}</div>
                    {/if}
                  </div>

                  <!-- Hearts Integrity -->
                  <div class="space-y-1 mb-3">
                    <div class="flex justify-between text-[11px]">
                      <span class="text-stone-400">Thermal Hearts</span>
                      <span class="font-bold {titan.heartsRemaining > 0 ? 'text-red-400' : 'text-stone-500'}">
                        {titan.heartsRemaining} / {titan.totalHearts} Remaining
                      </span>
                    </div>

                    <!-- Heart Glyphs -->
                    <div class="flex items-center space-x-1">
                      {#each Array(titan.totalHearts) as _, idx}
                        <div
                          class="flex-1 h-2 rounded-sm border {idx < (titan.totalHearts - titan.heartsRemaining) ? 'bg-stone-800 border-stone-700 opacity-40' : 'bg-red-500 border-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]'}"
                          title="Heart {idx + 1}"
                        ></div>
                      {/each}
                    </div>
                  </div>

                  <!-- Controlled / Invasions -->
                  <div class="grid grid-cols-2 gap-2 text-center text-xs p-2 rounded bg-black/40 border border-stone-800/80 mb-3">
                    <div>
                      <span class="text-stone-400 block text-[10px]">Controlled</span>
                      <strong class="text-emerald-400 text-sm">{titan.controlledSystemsCount}</strong>
                    </div>
                    <div>
                      <span class="text-stone-400 block text-[10px]">Invasions</span>
                      <strong class="text-red-400 text-sm">{titan.activeInvasionsCount}</strong>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="pt-2 border-t border-stone-800 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    class="px-2 py-1 rounded bg-amber-950/40 border border-amber-500/50 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] uppercase transition-all"
                    onclick={(e) => {
                      e.stopPropagation();
                      isTacticalGuideOpen = true;
                    }}
                    title="Open Tactical Vent & Caustic Sabotage Guide"
                  >
                    🎯 SABOTAGE
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 text-[var(--hud-amber)] font-bold text-xs uppercase transition-all"
                    onclick={(e) => {
                      e.stopPropagation();
                      onFocusTitan?.(titan);
                      onSelectSystem?.(titan.systemName, titan.coords);
                    }}
                    title="Focus Titan Maelstrom in 3D Galaxy View"
                  >
                    FOCUS TITAN
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer Info Bar -->
      <div class="px-5 py-2.5 bg-black/80 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <div class="flex items-center space-x-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Volumetric Caustic Shaders Active on WebGPU Galaxy Layer</span>
        </div>
        <div class="flex items-center space-x-3">
          <span>Frontline boundary: <strong>Active Hubs ~15-22 LY</strong></span>
          <button
            type="button"
            class="px-3 py-1 rounded border border-stone-700 bg-stone-900 text-stone-300 hover:text-white hover:border-stone-500 uppercase text-xs"
            onclick={() => onClose?.()}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Stage 14.2: Titan Tactical Heart Sabotage & Caustic Navigation Guide Modal -->
<TitanTacticalGuide
  isOpen={isTacticalGuideOpen}
  onClose={() => (isTacticalGuideOpen = false)}
/>
