<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    CANONICAL_SPIRE_SITES,
    CANONICAL_ORTHRUS_PROFILES,
    evaluateGravityWarning,
    calculateCumulativeSabotageState,
    filterSpireSites,
    calculateGalacticDistance,
    type PlanetarySpireSite,
    type SpireSabotageObjective,
    type OrthrusSpawnProfile,
    type SabotageTaskType,
  } from '$engine/spire_site_engine';

  interface Props {
    isOpen?: boolean;
    referenceSystem?: string;
    onClose?: () => void;
    onSelectSite?: (site: PlanetarySpireSite) => void;
    onPlotRoute?: (systemName: string) => void;
  }

  let {
    isOpen = true,
    referenceSystem = 'Sol',
    onClose,
    onSelectSite,
    onPlotRoute,
  }: Props = $props();

  // Active top tab
  let activeTab = $state<'spires' | 'orthrus' | 'sabotage_guide' | 'impact'>('spires');

  // Filter states
  let searchQuery = $state<string>('');
  let filterTitan = $state<'ALL' | string>('ALL');
  let filterGravity = $state<'ALL' | 'NORMAL' | 'ELEVATED' | 'HAZARDOUS_HIGH_G'>('ALL');

  // Selected spire site for inspection
  let selectedSiteId = $state<string>(CANONICAL_SPIRE_SITES[0].id);
  let selectedSite = $derived<PlanetarySpireSite>(
    CANONICAL_SPIRE_SITES.find((s) => s.id === selectedSiteId) || CANONICAL_SPIRE_SITES[0]
  );

  // Selected sabotage task for step checklist inspection
  let selectedTaskId = $state<string>(CANONICAL_SPIRE_SITES[0].activeMissions[0].id);
  let selectedTask = $derived<SpireSabotageObjective | undefined>(
    selectedSite.activeMissions.find((m) => m.id === selectedTaskId) || selectedSite.activeMissions[0]
  );

  // Active Orthrus profile
  let orthrusProfile = $state<OrthrusSpawnProfile>(CANONICAL_ORTHRUS_PROFILES[0]);

  // EMP neutralizer timing interactive simulator
  let empTimerActive = $state<boolean>(false);
  let empElapsedSec = $state<number>(0.0);
  let empTimerInterval: ReturnType<typeof setInterval> | null = null;
  let neutralizerEngaged = $state<boolean>(false);
  let neutralizerFeedback = $state<string>('STANDBY: Press [START EMP SIMULATION] to practice shutdown field neutralization.');

  // Filtered Spire Sites
  let filteredSites = $derived.by(() => {
    return filterSpireSites(CANONICAL_SPIRE_SITES, {
      searchQuery,
      associatedTitan: filterTitan,
      gravityWarning: filterGravity,
    });
  });

  // Cumulative Sabotage Overview
  let sabotageState = $derived.by(() => {
    return calculateCumulativeSabotageState(CANONICAL_SPIRE_SITES);
  });

  function startEmpSimulation() {
    empTimerActive = true;
    empElapsedSec = 0.0;
    neutralizerEngaged = false;
    neutralizerFeedback = '⚠️ ORTHRUS CHARGING SHUTDOWN FIELD! Watch audio waveform / countdown...';

    if (empTimerInterval) clearInterval(empTimerInterval);
    const step = 50; // ms
    empTimerInterval = setInterval(() => {
      empElapsedSec = Number((empElapsedSec + step / 1000).toFixed(2));
      if (empElapsedSec >= 4.5) {
        // EMP fires
        if (empTimerInterval) clearInterval(empTimerInterval);
        empTimerActive = false;
        if (neutralizerEngaged) {
          neutralizerFeedback = '✅ PERFECT NEUTRALIZATION! Shutdown pulse fully absorbed. Orthrus thrusters vulnerable!';
        } else {
          neutralizerFeedback = '❌ SHIP SYSTEMS SHUT DOWN! Neutralizer was not held active during 4.5s pulse window.';
        }
      }
    }, step);
  }

  function engageNeutralizer() {
    if (!empTimerActive) return;
    neutralizerEngaged = true;
    if (empElapsedSec >= 3.2 && empElapsedSec <= 4.4) {
      neutralizerFeedback = `⚡ NEUTRALIZER CHARGED AT ${empElapsedSec}s: Green lock! Maintain trigger through 4.5s detonation!`;
    } else if (empElapsedSec < 3.2) {
      neutralizerFeedback = `⚠️ TRIGGERED EARLY AT ${empElapsedSec}s: Warning! Neutralizer capacitor may deplete before EMP blast!`;
    }
  }

  function resetEmpSimulation() {
    if (empTimerInterval) clearInterval(empTimerInterval);
    empTimerActive = false;
    empElapsedSec = 0.0;
    neutralizerEngaged = false;
    neutralizerFeedback = 'STANDBY: Press [START EMP SIMULATION] to practice shutdown field neutralization.';
  }

  // Copy coordinates to clipboard
  let copyNotice = $state<string | null>(null);
  function copyCoordinates(coords: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(coords);
      copyNotice = `Coordinates "${coords}" copied to clipboard!`;
      setTimeout(() => (copyNotice = null), 2500);
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none font-mono"
    role="dialog"
    aria-modal="true"
    aria-label="Spire Site Sabotage Operations and Orthrus Hunter Coordinator"
  >
    <div class="relative w-full h-full max-w-7xl flex flex-col bg-[#05080c] border border-emerald-500/60 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.25)]">
      <!-- Header Bar -->
      <div class="flex items-center justify-between px-4 py-3 bg-emerald-950/40 border-b border-emerald-500/40 shrink-0">
        <div class="flex items-center space-x-3">
          <span class="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"></span>
          <div>
            <h2 class="text-sm sm:text-base font-extrabold uppercase tracking-widest text-emerald-400">
              ☣️ SPIRE SITE SABOTAGE OPERATIONS & ORTHRUS HUNTER COORDINATOR // STAGE 14.3
            </h2>
            <div class="text-[11px] text-stone-400">
              Planetary Biomechanical Surface Spire Catalog • High-G Warnings • EMP Neutralizer Timings • Titan Defense Weakening
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          {#if copyNotice}
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {copyNotice}
            </span>
          {/if}
          <button
            type="button"
            onclick={() => onClose?.()}
            class="px-3 py-1 rounded bg-black/80 border border-stone-600 text-stone-300 hover:text-white hover:border-emerald-400 text-xs font-bold uppercase tracking-wider"
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      <!-- Navigation Sub-Tabs -->
      <div class="flex items-center space-x-1 px-4 py-2 bg-black/60 border-b border-emerald-500/20 text-xs shrink-0 overflow-x-auto">
        <button
          type="button"
          onclick={() => (activeTab = 'spires')}
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors {activeTab === 'spires'
            ? 'bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.7)]'
            : 'text-stone-300 hover:bg-emerald-500/15 border border-emerald-500/30'}"
        >
          <span>🪐 SPIRE SITES CATALOG ({filteredSites.length})</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'sabotage_guide')}
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors {activeTab === 'sabotage_guide'
            ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.7)]'
            : 'text-stone-300 hover:bg-amber-500/15 border border-amber-500/30'}"
        >
          <span>🛠️ SABOTAGE CHECKLISTS & TASKS</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'orthrus')}
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors {activeTab === 'orthrus'
            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.7)]'
            : 'text-stone-300 hover:bg-cyan-500/15 border border-cyan-500/30'}"
        >
          <span>🎯 ORTHRUS INTERCEPTOR & EMP TIMING</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'impact')}
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors {activeTab === 'impact'
            ? 'bg-purple-500 text-black font-bold shadow-[0_0_12px_rgba(168,85,247,0.7)]'
            : 'text-stone-300 hover:bg-purple-500/15 border border-purple-500/30'}"
        >
          <span>⚡ TITAN DEFENSE IMPACT ({sabotageState.totalTitanDefenseWeakeningPct}%)</span>
        </button>
      </div>

      <!-- Main Body Container -->
      <div class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-[#05080c] via-[#091118] to-[#040608]">
        {#if activeTab === 'spires'}
          <!-- SPIRE SITES CATALOG VIEW -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <!-- Left Filter & Site List (5 Cols) -->
            <div class="lg:col-span-5 flex flex-col space-y-3">
              <!-- Filters -->
              <div class="p-3 bg-black/60 border border-emerald-500/30 rounded-lg space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-emerald-400">SEARCH & TITAN REGION</span>
                  <span class="text-[10px] text-stone-400">{filteredSites.length} SPIRES MATCHED</span>
                </div>
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Search system, body or Titan..."
                  class="w-full px-2.5 py-1.5 bg-black/80 border border-emerald-500/40 rounded text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-400"
                />

                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label for="filter-titan-select" class="block text-[10px] text-stone-400 mb-1">TITAN MAELSTROM:</label>
                    <select
                      id="filter-titan-select"
                      bind:value={filterTitan}
                      class="w-full px-2 py-1 bg-black/80 border border-emerald-500/30 rounded text-xs text-stone-300 focus:outline-none"
                    >
                      <option value="ALL">ALL TITANS</option>
                      <option value="Taranis">Taranis</option>
                      <option value="Leigong">Leigong</option>
                      <option value="Hadad">Hadad</option>
                      <option value="Oya">Oya</option>
                      <option value="Indra">Indra</option>
                      <option value="Raijin">Raijin</option>
                      <option value="Cocijo">Cocijo</option>
                      <option value="Thor">Thor</option>
                    </select>
                  </div>

                  <div>
                    <label for="filter-gravity-select" class="block text-[10px] text-stone-400 mb-1">GRAVITY SAFETY:</label>
                    <select
                      id="filter-gravity-select"
                      bind:value={filterGravity}
                      class="w-full px-2 py-1 bg-black/80 border border-emerald-500/30 rounded text-xs text-stone-300 focus:outline-none"
                    >
                      <option value="ALL">ALL GRAVITIES</option>
                      <option value="NORMAL">NORMAL (&lt;1.1G)</option>
                      <option value="ELEVATED">ELEVATED (1.1G - 1.5G)</option>
                      <option value="HAZARDOUS_HIGH_G">HAZARDOUS (≥1.5G)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Site List Cards -->
              <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
                {#each filteredSites as site (site.id)}
                  <button
                    type="button"
                    onclick={() => {
                      selectedSiteId = site.id;
                      selectedTaskId = site.activeMissions[0].id;
                      onSelectSite?.(site);
                    }}
                    class="w-full text-left p-3 rounded-lg border transition-all {selectedSiteId === site.id
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-black/50 border-stone-800 hover:border-emerald-500/40 hover:bg-emerald-950/20'}"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-white tracking-wide">{site.systemName}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                        TITAN {site.associatedTitan.toUpperCase()}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
                      <span>{site.bodyName}</span>
                      <span>{site.distanceSolLy} LY from Sol</span>
                    </div>

                    <div class="flex items-center justify-between text-[10px] pt-1 border-t border-stone-800">
                      <span class="flex items-center space-x-1">
                        <span class="text-stone-500">GRAVITY:</span>
                        <span class="font-bold {site.gravityG >= 1.5 ? 'text-red-400' : site.gravityG >= 1.1 ? 'text-amber-400' : 'text-emerald-400'}">
                          {site.gravityG} G
                        </span>
                        {#if site.gravityWarning === 'HAZARDOUS_HIGH_G'}
                          <span class="px-1 bg-red-600/30 text-red-300 rounded text-[9px] font-bold">HIGH-G</span>
                        {/if}
                      </span>

                      <span class="text-stone-400">
                        SABOTAGE: <strong class="text-emerald-400">{site.cumulativeSabotageProgressPct}%</strong>
                      </span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Right Site Detail Inspector (7 Cols) -->
            <div class="lg:col-span-7 flex flex-col space-y-3">
              <div class="p-4 bg-black/60 border border-emerald-500/30 rounded-lg space-y-4">
                <!-- Top Header Info -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                  <div>
                    <div class="flex items-center space-x-2">
                      <h3 class="text-base font-extrabold text-emerald-400 uppercase tracking-wider">
                        {selectedSite.systemName}
                      </h3>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/50">
                        {selectedSite.bodyName}
                      </span>
                    </div>
                    <div class="text-xs text-stone-400 mt-0.5">
                      Target Titan: <span class="text-white font-bold">{selectedSite.associatedTitan}</span> • Security: <span class="text-amber-300">{selectedSite.siteSecurityLevel}</span>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      onclick={() => onPlotRoute?.(selectedSite.systemName)}
                      class="px-2.5 py-1.5 rounded bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs uppercase tracking-wide flex items-center space-x-1"
                    >
                      <span>⚡ PLOT JUMP</span>
                    </button>
                  </div>
                </div>

                <!-- Surface Landing Coordinates & Gravity Warning Card -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <!-- Surface Coordinates -->
                  <div class="p-3 bg-black/80 border border-emerald-500/40 rounded-lg space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-stone-400">SURFACE LANDING COORDINATES</span>
                      <button
                        type="button"
                        onclick={() => copyCoordinates(selectedSite.surfaceCoords.formatted)}
                        class="text-[10px] text-emerald-400 hover:text-white underline"
                        title="Copy coordinates"
                      >
                        [COPY]
                      </button>
                    </div>
                    <div class="text-lg font-extrabold text-emerald-300 tracking-wider">
                      {selectedSite.surfaceCoords.formatted}
                    </div>
                    <div class="text-[10px] text-stone-400">
                      Latitude: <span class="text-white">{selectedSite.surfaceCoords.latitude}°</span> • Longitude: <span class="text-white">{selectedSite.surfaceCoords.longitude}°</span>
                    </div>
                  </div>

                  <!-- Gravity Profile & Safety Warning -->
                  <div class="p-3 bg-black/80 border {selectedSite.gravityWarning === 'HAZARDOUS_HIGH_G' ? 'border-red-500/60 bg-red-950/20' : selectedSite.gravityWarning === 'ELEVATED' ? 'border-amber-500/60 bg-amber-950/20' : 'border-emerald-500/40'} rounded-lg space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-stone-400">SURFACE GRAVITY SAFETY</span>
                      {#if selectedSite.gravityWarning === 'HAZARDOUS_HIGH_G'}
                        <span class="px-1.5 py-0.5 rounded bg-red-600 text-black font-extrabold text-[9px]">
                          CRITICAL WARNING
                        </span>
                      {:else if selectedSite.gravityWarning === 'ELEVATED'}
                        <span class="px-1.5 py-0.5 rounded bg-amber-500 text-black font-extrabold text-[9px]">
                          CAUTION
                        </span>
                      {:else}
                        <span class="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold text-[9px]">
                          SAFE
                        </span>
                      {/if}
                    </div>
                    <div class="text-lg font-extrabold {selectedSite.gravityG >= 1.5 ? 'text-red-400' : selectedSite.gravityG >= 1.1 ? 'text-amber-400' : 'text-emerald-300'}">
                      {selectedSite.gravityG} G
                    </div>
                    <div class="text-[10px] {selectedSite.gravityWarning === 'HAZARDOUS_HIGH_G' ? 'text-red-300' : 'text-stone-400'}">
                      {#if selectedSite.gravityWarning === 'HAZARDOUS_HIGH_G'}
                        ⚠️ HIGH-G HAZARD: Flight Assist must remain ON. Vertical thrusters will not halt descent if downward velocity exceeds 50 m/s!
                      {:else if selectedSite.gravityWarning === 'ELEVATED'}
                        ⚠️ ELEVATED GRAVITY: Maintain pitch above 15° during final touchdown; watch SRV momentum.
                      {:else}
                        Standard low-G planetary glide profile. Standard landing thruster envelope.
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- Cumulative Progress & Impact -->
                <div class="p-3 bg-black/80 border border-stone-800 rounded-lg space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-stone-300">REGIONAL TITAN SABOTAGE PROGRESS</span>
                    <span class="font-extrabold text-emerald-400">{selectedSite.cumulativeSabotageProgressPct}%</span>
                  </div>
                  <div class="w-full h-2.5 bg-black rounded-full overflow-hidden border border-stone-700">
                    <div
                      class="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400"
                      style="width: {selectedSite.cumulativeSabotageProgressPct}%"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-stone-400">
                    <span>Titan Damage Contributed: <strong class="text-white">{selectedSite.titanDamageContributionMHP} MHP</strong></span>
                    <span>Weekly Defense Reduction: <strong class="text-amber-400">~{((selectedSite.cumulativeSabotageProgressPct / 100) * 5.0).toFixed(2)}%</strong></span>
                  </div>
                </div>

                <!-- Recommended Outfitting -->
                <div class="space-y-1.5">
                  <span class="text-[11px] font-bold text-stone-400 uppercase">RECOMMENDED OUTFITTING & COUNTERMEASURES:</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {#each selectedSite.recommendedEquipment as equip}
                      <div class="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-black/60 border border-stone-800 text-stone-300">
                        <span class="text-emerald-400">✔</span>
                        <span>{equip}</span>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Live Sabotage Objectives on Site -->
                <div class="space-y-2 pt-2 border-t border-stone-800">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-400 uppercase">LIVE SITE SABOTAGE MISSIONS ({selectedSite.activeMissions.length}):</span>
                    <button
                      type="button"
                      onclick={() => (activeTab = 'sabotage_guide')}
                      class="text-[11px] text-amber-400 hover:text-amber-300 underline"
                    >
                      Open Full Step-by-Step Checklist →
                    </button>
                  </div>

                  <div class="space-y-2">
                    {#each selectedSite.activeMissions as mission}
                      <div class="p-2.5 rounded bg-black/70 border border-stone-800 hover:border-emerald-500/40 space-y-1 text-xs">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-white">{mission.title}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded font-bold {mission.threatLevel === 'Extreme' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : mission.threatLevel === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}">
                            THREAT: {mission.threatLevel.toUpperCase()}
                          </span>
                        </div>
                        <p class="text-[11px] text-stone-400">{mission.description}</p>
                        <div class="flex items-center justify-between text-[10px] pt-1 text-stone-500">
                          <span>Target: <strong class="text-stone-300">{mission.targetSubsystem}</strong></span>
                          <span>Weakening: <strong class="text-emerald-400">+{mission.titanDefenseWeakeningPct}%</strong></span>
                          <span>Bounty: <strong class="text-amber-300">{mission.rewardCreditsM}M CR</strong></span>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'sabotage_guide'}
          <!-- SABOTAGE TASKS & STEP CHECKLISTS VIEW -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <!-- Left Task Selector (4 Cols) -->
            <div class="lg:col-span-4 flex flex-col space-y-2">
              <span class="text-xs font-bold text-amber-400 uppercase">AVAILABLE SABOTAGE PROTOCOLS</span>
              <div class="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {#each selectedSite.activeMissions as mission}
                  <button
                    type="button"
                    onclick={() => (selectedTaskId = mission.id)}
                    class="w-full text-left p-3 rounded-lg border transition-all {selectedTaskId === mission.id
                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-black/50 border-stone-800 hover:border-amber-500/40 hover:bg-amber-950/20'}"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-white">{mission.title}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded font-bold {mission.type === 'CONTAMINATED_SABOTAGE' ? 'bg-amber-500/20 text-amber-300' : mission.type === 'DRIVE_SABOTAGE' ? 'bg-red-500/20 text-red-300' : 'bg-cyan-500/20 text-cyan-300'} border border-current">
                        {mission.type === 'CONTAMINATED_SABOTAGE' ? 'CONTAMINATED' : mission.type === 'DRIVE_SABOTAGE' ? 'DRIVE CORE' : 'BIO EXTRACT'}
                      </span>
                    </div>
                    <div class="text-[11px] text-stone-400 line-clamp-2 mb-2">{mission.description}</div>
                    <div class="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-850">
                      <span>Titan Weakening: <strong class="text-emerald-400">+{mission.titanDefenseWeakeningPct}%</strong></span>
                      <span>Reward: <strong class="text-amber-400">{mission.rewardCreditsM}M CR</strong></span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Right Step-by-Step Execution Guide (8 Cols) -->
            <div class="lg:col-span-8 flex flex-col space-y-3">
              {#if selectedTask}
                <div class="p-4 bg-black/60 border border-amber-500/40 rounded-lg space-y-4">
                  <div class="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div>
                      <div class="flex items-center space-x-2">
                        <h3 class="text-base font-extrabold text-amber-400">{selectedTask.title}</h3>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {selectedTask.type}
                        </span>
                      </div>
                      <div class="text-xs text-stone-400 mt-0.5">{selectedTask.description}</div>
                    </div>

                    <div class="text-right">
                      <div class="text-[10px] text-stone-400">OPERATION PAYOUT</div>
                      <div class="text-lg font-extrabold text-amber-400">{selectedTask.rewardCreditsM}M CR</div>
                    </div>
                  </div>

                  <!-- Tactical Requirements Grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="p-3 bg-black/80 border border-stone-800 rounded">
                      <div class="text-[10px] text-stone-400 uppercase font-bold">REQUIRED COMPOUND / TOOL</div>
                      <div class="text-stone-200 font-bold mt-1 text-sm">{selectedTask.requiredCompoundOrTool}</div>
                    </div>

                    <div class="p-3 bg-black/80 border border-stone-800 rounded">
                      <div class="text-[10px] text-stone-400 uppercase font-bold">TARGET SUBSYSTEM / LOCATION</div>
                      <div class="text-emerald-300 font-bold mt-1 text-sm">{selectedTask.targetSubsystem}</div>
                    </div>
                  </div>

                  <!-- Step-by-Step Execution Checklist -->
                  <div class="space-y-2">
                    <span class="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      STEP-BY-STEP OPERATION CHECKLIST:
                    </span>

                    <div class="space-y-2">
                      {#each selectedTask.stepChecklist as step, index}
                        <div class="flex items-start space-x-3 p-3 bg-black/80 border border-stone-800 rounded-lg">
                          <span class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs shrink-0">
                            {index + 1}
                          </span>
                          <div class="text-xs text-stone-200 leading-relaxed pt-0.5">
                            {step}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <!-- Warning & Countermeasure Note -->
                  <div class="p-3 bg-red-950/20 border border-red-500/40 rounded-lg text-xs space-y-1">
                    <div class="font-bold text-red-400 flex items-center space-x-1.5">
                      <span>⚠️ SURFACE DEFENSE & BANSHEE HAZARDS</span>
                    </div>
                    <p class="text-stone-300 text-[11px] leading-relaxed">
                      Planetary spire defensive batteries fire caustic mortar shells with heavy homing arcs. If operating on foot or in an SRV, seek cover under arching bio-pillars immediately upon hearing the incoming whistle. Never loiter within 500m of the caldera without an active Shutdown Field Neutralizer ready.
                    </p>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {:else if activeTab === 'orthrus'}
          <!-- ORTHRUS INTERCEPTOR & EMP TIMING VIEW -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <!-- Left Orthrus Intel (6 Cols) -->
            <div class="lg:col-span-6 flex flex-col space-y-3">
              <div class="p-4 bg-black/60 border border-cyan-500/40 rounded-lg space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-stone-800">
                  <div>
                    <h3 class="text-base font-extrabold text-cyan-400 uppercase tracking-wider">
                      THARGOID ORTHRUS INTERCEPTOR
                    </h3>
                    <div class="text-xs text-stone-400">Non-Combat Logistic Flagship • High-Value Combat Bond Target</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-stone-400">COMBAT BOND</div>
                    <div class="text-lg font-extrabold text-amber-400">~{orthrusProfile.payoutCreditsM}M CR</div>
                  </div>
                </div>

                <div class="space-y-1.5 text-xs">
                  <div class="text-[10px] text-stone-400 uppercase font-bold">SPAWN LOCATION & TRIGGER:</div>
                  <div class="p-2.5 bg-black/80 border border-stone-800 rounded text-stone-200">
                    📍 {orthrusProfile.spawnLocationDescription}
                  </div>
                  <div class="text-[11px] text-cyan-300">
                    Trigger: {orthrusProfile.spawnTrigger}
                  </div>
                </div>

                <!-- Combat Vulnerabilities -->
                <div class="space-y-1.5 text-xs">
                  <div class="text-[10px] text-stone-400 uppercase font-bold">COMBAT VULNERABILITIES:</div>
                  <div class="space-y-1">
                    {#each orthrusProfile.combatVulnerabilities as vuln}
                      <div class="flex items-start space-x-2 text-stone-300">
                        <span class="text-cyan-400 font-bold shrink-0">▸</span>
                        <span class="text-[11px]">{vuln}</span>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Recommended Tactics -->
                <div class="space-y-1.5 text-xs pt-2 border-t border-stone-800">
                  <div class="text-[10px] text-stone-400 uppercase font-bold">RECOMMENDED HUNTING TACTICS:</div>
                  <div class="space-y-1.5">
                    {#each orthrusProfile.recommendedTactics as tactic, i}
                      <div class="flex items-start space-x-2 text-stone-300">
                        <span class="text-amber-400 font-bold text-xs shrink-0">{i + 1}.</span>
                        <span class="text-[11px]">{tactic}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Interactive EMP Neutralizer Timing Simulator (6 Cols) -->
            <div class="lg:col-span-6 flex flex-col space-y-3">
              <div class="p-4 bg-black/60 border border-cyan-500/40 rounded-lg space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-stone-800">
                  <div>
                    <h3 class="text-base font-extrabold text-cyan-400 uppercase tracking-wider">
                      EMP NEUTRALIZER TIMING GUIDE
                    </h3>
                    <div class="text-xs text-stone-400">Interactive Shutdown Field Waveform Metronome</div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40">
                    PRACTICE DRILL
                  </span>
                </div>

                <!-- Visual Timing Bar -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-stone-400">EMP CHARGE CYCLE:</span>
                    <span class="font-extrabold text-cyan-400 text-sm">{empElapsedSec.toFixed(2)}s / 4.50s</span>
                  </div>

                  <!-- Waveform visualization bar -->
                  <div class="relative w-full h-8 bg-black border border-stone-700 rounded overflow-hidden">
                    <!-- Optimal Window (3.2s to 4.4s) -->
                    <div
                      class="absolute top-0 bottom-0 bg-emerald-500/30 border-x border-emerald-400"
                      style="left: {(3.2 / 4.5) * 100}%; width: {((4.4 - 3.2) / 4.5) * 100}%"
                      title="Optimal Neutralizer Trigger Window (3.2s - 4.4s)"
                    >
                      <span class="absolute inset-0 flex items-center justify-center text-[9px] text-emerald-300 font-bold">
                        OPTIMAL WINDOW
                      </span>
                    </div>

                    <!-- Pulse Fire Line at 4.5s -->
                    <div class="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>

                    <!-- Elapsed progress bar -->
                    <div
                      class="h-full bg-cyan-500/50 transition-all duration-75"
                      style="width: {Math.min(100, (empElapsedSec / 4.5) * 100)}%"
                    ></div>
                  </div>

                  <div class="flex justify-between text-[10px] text-stone-500">
                    <span>0.0s (Howl Start)</span>
                    <span class="text-emerald-400 font-bold">3.2s - 4.2s (Trigger & Hold Neutralizer)</span>
                    <span class="text-red-400 font-bold">4.5s (EMP Detonation)</span>
                  </div>
                </div>

                <!-- Simulator Controls & Feedback -->
                <div class="p-3 bg-black/80 border border-stone-800 rounded-lg space-y-3">
                  <div class="text-xs font-bold {neutralizerFeedback.includes('PERFECT') ? 'text-emerald-400' : neutralizerFeedback.includes('SHUT DOWN') ? 'text-red-400' : 'text-stone-300'}">
                    {neutralizerFeedback}
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={empTimerActive}
                      onclick={startEmpSimulation}
                      class="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wide"
                    >
                      ▶ START EMP SIM
                    </button>

                    <button
                      type="button"
                      disabled={!empTimerActive || neutralizerEngaged}
                      onclick={engageNeutralizer}
                      class="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    >
                      ⚡ TRIGGER NEUTRALIZER
                    </button>

                    <button
                      type="button"
                      onclick={resetEmpSimulation}
                      class="px-3 py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wide"
                    >
                      ↺ RESET
                    </button>
                  </div>
                </div>

                <!-- Cockpit Advice -->
                <div class="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-xs space-y-1 text-stone-300">
                  <div class="font-bold text-cyan-300">💡 PILOT PRO-TIP:</div>
                  <p class="text-[11px] leading-relaxed">
                    Always assign your Shutdown Field Neutralizer to Primary Fire on Fire Group 2. Ensure your power distributor has at least 3 pips in SYS, as the neutralizer consumes up to 2.4 MW of capacitor energy during the hold phase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'impact'}
          <!-- TITAN DEFENSE IMPACT VIEW -->
          <div class="space-y-4">
            <div class="p-4 bg-black/60 border border-purple-500/40 rounded-lg space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                <div>
                  <h3 class="text-base font-extrabold text-purple-400 uppercase tracking-wider">
                    CUMULATIVE SPIRE SABOTAGE IMPACT ON TITAN DEFENSES
                  </h3>
                  <div class="text-xs text-stone-400">
                    Aegis Sabotage Operations • Weekly Planetary Resistance Erosion • Titan Vulnerability Thresholds
                  </div>
                </div>

                <div class="flex items-center space-x-3 text-right">
                  <div>
                    <div class="text-[10px] text-stone-400">TOTAL ACTIVE SPIRES</div>
                    <div class="text-xl font-extrabold text-white">{sabotageState.totalSpiresActive} SITES</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-stone-400">TOTAL REGIONAL DEFENSE WEAKENING</div>
                    <div class="text-xl font-extrabold text-purple-400">{sabotageState.totalTitanDefenseWeakeningPct}%</div>
                  </div>
                </div>
              </div>

              <!-- Impact Matrix by Titan -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {#each sabotageState.sites as site}
                  <div class="p-3 bg-black/80 border border-stone-800 hover:border-purple-500/40 rounded-lg space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white tracking-wide">TITAN {site.associatedTitan.toUpperCase()}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {site.cumulativeSabotageProgressPct}%
                      </span>
                    </div>

                    <div class="text-[11px] text-stone-400 truncate">{site.systemName}</div>

                    <div class="w-full h-1.5 bg-black rounded-full overflow-hidden border border-stone-800">
                      <div
                        class="h-full bg-gradient-to-r from-purple-600 to-emerald-400"
                        style="width: {site.cumulativeSabotageProgressPct}%"
                      ></div>
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-stone-500 pt-1">
                      <span>Defense Erode: <strong class="text-purple-300">~{((site.cumulativeSabotageProgressPct / 100) * 5.0).toFixed(2)}%</strong></span>
                      <span>MHP: <strong class="text-white">{site.titanDamageContributionMHP}</strong></span>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Strategic Doctrine Note -->
              <div class="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg text-xs space-y-1.5 text-stone-300">
                <div class="font-bold text-purple-300">⚡ STRATEGIC DOCTRINE: SPIRE SABOTAGE CORRELATION</div>
                <p class="text-[11px] leading-relaxed">
                  Sabotaging peripheral planetary Spire sites directly degrades the Thargoid Titan's caustic cloud density and increases the heat vulnerability duration of thermal vents by up to 35%. Wings that clear planetary Spires accelerate Titan heart vulnerability phases by several days ahead of the Thursday server tick.
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
