<!-- Location: client/src/lib/components/exploration/AstronomicalAnomalyWidget.svelte -->
<!-- Stage 16.4: Astronomical Anomaly Detector & System Rarity Scorer HUD Widget -->

<script lang="ts">
  import {
    astronomicalAnomalyDetector,
    type SystemEvaluationInput,
    type SystemRarityReport,
    type DetectedAnomaly,
    type ExplorationDetourRecommendation,
    type AnomalyCategory,
    type AstronomicalBody
  } from '$engine/anomaly_detector';

  interface Props {
    systemName?: string;
    onSelectBody?: (bodyName: string) => void;
  }

  let {
    systemName = 'HD 49798 Exotica',
    onSelectBody
  }: Props = $props();

  // Preset System Scenarios for CMDR instant analysis & test demonstrations
  interface PresetScenario {
    id: string;
    label: string;
    description: string;
    data: SystemEvaluationInput;
  }

  const PRESET_SCENARIOS: PresetScenario[] = [
    {
      id: 'mythic_relic',
      label: 'Wolf-Rayet Singularity Dance (Mythic)',
      description: 'Wolf-Rayet high-mass stellar relic in contact binary with active 12 M☉ Black Hole',
      data: {
        systemName: 'HD 49798 Exotica',
        primaryStarClass: 'W',
        bodies: [
          {
            name: 'HD 49798 A',
            bodyType: 'Star',
            subType: 'Wolf-Rayet Star',
            spectralClass: 'WN',
            massSolar: 18.5,
            surfaceTemperatureK: 45000,
            distanceLs: 0
          },
          {
            name: 'HD 49798 B',
            bodyType: 'Black Hole',
            subType: 'Black Hole',
            spectralClass: 'H',
            massSolar: 12.0,
            distanceLs: 1.8
          },
          {
            name: 'HD 49798 C 1',
            bodyType: 'Planet',
            subType: 'High metal content body',
            isLandable: true,
            surfaceGravityG: 4.8,
            surfaceTemperatureK: 1450,
            distanceLs: 890
          }
        ]
      }
    },
    {
      id: 'colliding_super_rings',
      label: 'Colliding Mega-Rings & Shepherd Moons (Ultra-Rare)',
      description: 'Massive intersecting 3.5M km ring system with embedded orbital shepherd moon',
      data: {
        systemName: 'Collection of Wonders Special',
        primaryStarClass: 'M',
        bodies: [
          {
            name: 'Wonders Star Alpha',
            bodyType: 'Star',
            subType: 'M (Red dwarf) Star',
            spectralClass: 'M',
            rings: [
              {
                name: 'Alpha A Ring',
                ringClass: 'eRingClass_Rocky',
                innerRadiusKm: 500000,
                outerRadiusKm: 3500000
              }
            ],
            distanceLs: 0
          },
          {
            name: 'Shepherd Moon 1',
            bodyType: 'Planet',
            subType: 'Rocky body',
            parentName: 'Wonders Star Alpha',
            semiMajorAxisAU: 0.015,
            distanceLs: 240
          },
          {
            name: 'Twin Giant 1',
            bodyType: 'Gas giant',
            parentName: 'Wonders Star Alpha',
            semiMajorAxisAU: 1.000,
            rings: [{ name: 'Twin Ring A', ringClass: 'eRingClass_Icy', innerRadiusKm: 100000, outerRadiusKm: 650000 }],
            distanceLs: 498
          },
          {
            name: 'Twin Giant 2',
            bodyType: 'Gas giant',
            parentName: 'Wonders Star Alpha',
            semiMajorAxisAU: 1.004,
            rings: [{ name: 'Twin Ring B', ringClass: 'eRingClass_Icy', innerRadiusKm: 90000, outerRadiusKm: 420000 }],
            distanceLs: 501
          }
        ]
      }
    },
    {
      id: 'crushing_highg_comet',
      label: 'Crushing 7.2G World & Extreme Comet (Rare)',
      description: 'Lethal 7.2G landable rock world + hyper-eccentric cometary ice world (e=0.97)',
      data: {
        systemName: 'Achenar Extreme Anomaly',
        primaryStarClass: 'B',
        bodies: [
          {
            name: 'Achenar Heavy Prime',
            bodyType: 'Planet',
            subType: 'High metal content body',
            isLandable: true,
            surfaceGravityG: 7.2,
            radiusKm: 13500,
            surfaceTemperatureK: 310,
            distanceLs: 340
          },
          {
            name: 'Whiplash Comet 2',
            bodyType: 'Planet',
            subType: 'Icy body',
            eccentricity: 0.972,
            orbitalPeriodDays: 610,
            distanceLs: 2200
          },
          {
            name: 'Orbiting Blitz 3',
            bodyType: 'Planet',
            subType: 'Rocky body',
            orbitalPeriodDays: 0.18, // 4.3 hours
            distanceLs: 120
          }
        ]
      }
    },
    {
      id: 'sol_nominal',
      label: 'Sol Homeworld (Standard Common)',
      description: 'Baseline G2V yellow dwarf main sequence with standard terrestrial planets',
      data: {
        systemName: 'Sol System Nominal',
        primaryStarClass: 'G',
        bodies: [
          { name: 'Mercury', bodyType: 'Planet', isLandable: true, surfaceGravityG: 0.38, surfaceTemperatureK: 440, eccentricity: 0.205, distanceLs: 190 },
          { name: 'Venus', bodyType: 'Planet', isLandable: false, surfaceGravityG: 0.90, surfaceTemperatureK: 737, eccentricity: 0.007, distanceLs: 360 },
          { name: 'Earth', bodyType: 'Planet', isLandable: false, surfaceGravityG: 1.00, surfaceTemperatureK: 288, eccentricity: 0.016, distanceLs: 500 },
          { name: 'Mars', bodyType: 'Planet', isLandable: true, surfaceGravityG: 0.38, surfaceTemperatureK: 210, eccentricity: 0.093, distanceLs: 760 }
        ]
      }
    }
  ];

  let selectedScenarioId = $state<string>(PRESET_SCENARIOS[0].id);
  let activeTab = $state<'OVERVIEW' | 'ANOMALIES' | 'DETOURS' | 'CUSTOM_BUILDER'>('OVERVIEW');
  let selectedCategoryFilter = $state<AnomalyCategory | 'ALL'>('ALL');

  // Custom Builder inputs
  let customSystemName = $state<string>('Custom Survey Anomaly');
  let customPrimaryStarClass = $state<string>('O');
  let customBodies = $state<AstronomicalBody[]>([
    {
      name: 'Primary Star A',
      bodyType: 'Star',
      subType: 'Wolf-Rayet Star',
      spectralClass: 'WN',
      massSolar: 16.0,
      distanceLs: 0
    },
    {
      name: 'Companion B',
      bodyType: 'Neutron Star',
      subType: 'Neutron Star',
      spectralClass: 'N',
      massSolar: 1.4,
      distanceLs: 2.1
    },
    {
      name: 'Anomalous World 1',
      bodyType: 'Planet',
      subType: 'High metal content body',
      isLandable: true,
      surfaceGravityG: 4.5,
      surfaceTemperatureK: 1250,
      distanceLs: 420
    }
  ]);

  // Derived current input based on tab/scenario
  let currentSystemInput = $derived.by<SystemEvaluationInput>(() => {
    if (activeTab === 'CUSTOM_BUILDER') {
      return {
        systemName: customSystemName,
        primaryStarClass: customPrimaryStarClass,
        bodies: customBodies
      };
    }
    const found = PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId);
    return found ? found.data : PRESET_SCENARIOS[0].data;
  });

  // Evaluated report
  let report = $derived<SystemRarityReport>(
    astronomicalAnomalyDetector.evaluateSystem(currentSystemInput)
  );

  // Filtered anomalies
  let filteredAnomalies = $derived.by<DetectedAnomaly[]>(() => {
    if (selectedCategoryFilter === 'ALL') {
      return report.detectedAnomalies;
    }
    return report.detectedAnomalies.filter((a) => a.category === selectedCategoryFilter);
  });

  // Selected anomaly details modal/drawer inspector
  let inspectAnomaly = $state<DetectedAnomaly | null>(null);

  // Custom body builder helper
  let newBodyName = $state<string>('New Body');
  let newBodyType = $state<string>('Planet');
  let newBodySubType = $state<string>('High metal content body');
  let newBodyGravity = $state<number>(3.5);
  let newBodyEccentricity = $state<number>(0.92);
  let newBodyLandable = $state<boolean>(true);
  let newBodyDistanceLs = $state<number>(550);

  function addCustomBody() {
    customBodies = [
      ...customBodies,
      {
        name: newBodyName,
        bodyType: newBodyType,
        subType: newBodySubType,
        surfaceGravityG: newBodyGravity,
        eccentricity: newBodyEccentricity,
        isLandable: newBodyLandable,
        distanceLs: newBodyDistanceLs
      }
    ];
    newBodyName = `Body ${customBodies.length + 1}`;
  }

  function removeCustomBody(index: number) {
    customBodies = customBodies.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-4 text-xs font-mono">
  <!-- Header Bar with Quick Mode Switcher -->
  <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/60 border border-[var(--hud-orange)]/30 rounded">
    <div class="flex items-center space-x-2">
      <span class="w-2.5 h-2.5 rounded-full animate-ping" style="background-color: {report.tierColor}"></span>
      <span class="text-white font-bold text-sm tracking-wide">
        ASTRONOMICAL ANOMALY & RARITY SCORER
      </span>
    </div>

    <!-- Mode Navigation Tabs -->
    <div class="flex rounded border border-[var(--hud-orange)]/40 overflow-hidden text-[10px]">
      <button
        type="button"
        class="px-2.5 py-1 uppercase tracking-wider transition-colors {activeTab === 'OVERVIEW' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-zinc-300 hover:bg-[var(--hud-orange)]/15'}"
        onclick={() => (activeTab = 'OVERVIEW')}
      >
        SCORE OVERVIEW
      </button>
      <button
        type="button"
        class="px-2.5 py-1 uppercase tracking-wider transition-colors {activeTab === 'ANOMALIES' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-zinc-300 hover:bg-[var(--hud-orange)]/15'}"
        onclick={() => (activeTab = 'ANOMALIES')}
      >
        ANOMALIES ({report.detectedAnomalies.length})
      </button>
      <button
        type="button"
        class="px-2.5 py-1 uppercase tracking-wider transition-colors {activeTab === 'DETOURS' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-zinc-300 hover:bg-[var(--hud-orange)]/15'}"
        onclick={() => (activeTab = 'DETOURS')}
      >
        DETOUR ADVISORY ({report.recommendations.length})
      </button>
      <button
        type="button"
        class="px-2.5 py-1 uppercase tracking-wider transition-colors {activeTab === 'CUSTOM_BUILDER' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-zinc-300 hover:bg-[var(--hud-orange)]/15'}"
        onclick={() => (activeTab = 'CUSTOM_BUILDER')}
      >
        CUSTOM SIMULATOR
      </button>
    </div>
  </div>

  <!-- Scenario Preset Dropdown (When in Non-Custom Tab) -->
  {#if activeTab !== 'CUSTOM_BUILDER'}
    <div class="p-2.5 bg-black/40 border border-zinc-800 rounded flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center space-x-2">
        <span class="text-zinc-400 font-bold uppercase text-[10px]">ARCHETYPE SCENARIO:</span>
        <select
          aria-label="Preset Archetype Scenario"
          class="bg-zinc-950 border border-[var(--hud-orange)]/40 text-orange-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-[var(--hud-orange)]"
          bind:value={selectedScenarioId}
        >
          {#each PRESET_SCENARIOS as scenario}
            <option value={scenario.id}>{scenario.label}</option>
          {/each}
        </select>
      </div>
      <div class="text-[11px] text-zinc-400 italic">
        {PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId)?.description}
      </div>
    </div>
  {/if}

  <!-- TAB 1: OVERVIEW -->
  {#if activeTab === 'OVERVIEW'}
    <div class="space-y-4">
      <!-- Main Rarity Score & Tier Card -->
      <div class="p-4 bg-black/70 border-2 rounded shadow-lg relative overflow-hidden" style="border-color: {report.tierColor}">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="text-[10px] text-zinc-400 uppercase tracking-widest">ASTRONOMICAL SYSTEM RARITY INDEX</div>
            <div class="text-3xl font-extrabold tracking-wider flex items-center space-x-3">
              <span style="color: {report.tierColor}">{report.rarityTier.toUpperCase()}</span>
              <span class="text-zinc-500 text-lg">/</span>
              <span class="text-white font-mono">{report.rarityScore}<span class="text-xs text-zinc-400 font-normal"> / 100</span></span>
            </div>
            <div class="text-xs text-orange-200/90 max-w-xl leading-relaxed mt-1">
              {report.summaryMessage}
            </div>
          </div>

          <!-- Circular Metric Gauge -->
          <div class="flex flex-col items-center justify-center p-3 bg-zinc-950/80 rounded border border-zinc-800 min-w-32 text-center">
            <div class="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SCORE METRIC</div>
            <div class="text-2xl font-bold font-mono" style="color: {report.tierColor}">
              {report.rarityScore}%
            </div>
            <div class="w-24 bg-zinc-800 h-2 rounded mt-1.5 overflow-hidden">
              <div
                class="h-full rounded transition-all duration-500"
                style="width: {report.rarityScore}%; background-color: {report.tierColor}"
              ></div>
            </div>
          </div>
        </div>

        <!-- Codex Recommended Badge -->
        {#if report.codexDetourRecommended}
          <div class="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
            <span>★</span>
            <span>HIGH-PRIORITY CMDR CODEX DETOUR RECOMMENDED</span>
          </div>
        {/if}
      </div>

      <!-- Key Anomaly Category Counters -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">STELLAR EXOTICS</div>
          <div class="text-lg font-bold text-purple-400 font-mono mt-0.5">
            {report.anomaliesByCategory.STELLAR_EXOTIC.length}
          </div>
        </div>
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">RING SYSTEMS</div>
          <div class="text-lg font-bold text-cyan-400 font-mono mt-0.5">
            {report.anomaliesByCategory.RING_SYSTEM.length}
          </div>
        </div>
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">EXTREME ORBITS</div>
          <div class="text-lg font-bold text-amber-400 font-mono mt-0.5">
            {report.anomaliesByCategory.EXTREME_ORBIT.length}
          </div>
        </div>
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">SURFACE CRUSTS</div>
          <div class="text-lg font-bold text-rose-400 font-mono mt-0.5">
            {report.anomaliesByCategory.EXTREME_SURFACE.length}
          </div>
        </div>
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">CLOSE BINARIES</div>
          <div class="text-lg font-bold text-indigo-400 font-mono mt-0.5">
            {report.anomaliesByCategory.GRAVITATIONAL_BINARY.length}
          </div>
        </div>
        <div class="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded text-center">
          <div class="text-[9px] text-zinc-400 uppercase">EXOTIC ATMOS</div>
          <div class="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {report.anomaliesByCategory.ATMOSPHERIC_EXOTIC.length}
          </div>
        </div>
      </div>

      <!-- Highest Valued Body Banner -->
      {#if report.highestValuedBodyName}
        <div class="p-3 bg-zinc-900/60 border border-[var(--hud-orange)]/30 rounded flex items-center justify-between">
          <div>
            <div class="text-[9px] text-zinc-400 uppercase tracking-wider">HIGHEST SCORING CELESTIAL PHENOMENON:</div>
            <div class="text-sm font-bold text-orange-300">{report.highestValuedBodyName}</div>
          </div>
          {#if onSelectBody}
            <button
              type="button"
              class="px-2.5 py-1 bg-[var(--hud-orange)] text-black font-bold text-xs rounded hover:bg-orange-400"
              onclick={() => onSelectBody(report.highestValuedBodyName!)}
            >
              FOCUS BODY
            </button>
          {/if}
        </div>
      {/if}
    </div>

  <!-- TAB 2: ANOMALIES LIST -->
  {:else if activeTab === 'ANOMALIES'}
    <div class="space-y-3">
      <!-- Category Filter Pills -->
      <div class="flex flex-wrap gap-1.5 items-center">
        <span class="text-[10px] text-zinc-400 font-bold mr-1">FILTER CATEGORY:</span>
        {#each ['ALL', 'STELLAR_EXOTIC', 'RING_SYSTEM', 'EXTREME_ORBIT', 'EXTREME_SURFACE', 'GRAVITATIONAL_BINARY', 'ATMOSPHERIC_EXOTIC'] as cat}
          <button
            type="button"
            class="px-2 py-0.5 text-[10px] rounded transition-colors {selectedCategoryFilter === cat ? 'bg-orange-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'}"
            onclick={() => (selectedCategoryFilter = cat as any)}
          >
            {cat.replace('_', ' ')}
          </button>
        {/each}
      </div>

      {#if filteredAnomalies.length === 0}
        <div class="p-6 text-center text-zinc-500 border border-zinc-800 rounded bg-black/40">
          No anomalies detected in selected category.
        </div>
      {:else}
        <div class="space-y-2">
          {#each filteredAnomalies as anom}
            <div
              class="p-3 bg-black/50 border rounded transition-colors hover:border-[var(--hud-orange)]/60 cursor-pointer {inspectAnomaly?.id === anom.id ? 'border-[var(--hud-orange)] bg-orange-950/20' : 'border-zinc-800'}"
              onclick={() => (inspectAnomaly = inspectAnomaly?.id === anom.id ? null : anom)}
              onkeydown={(e) => { if (e.key === 'Enter') inspectAnomaly = inspectAnomaly?.id === anom.id ? null : anom; }}
              role="button"
              tabindex="0"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center space-x-2">
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase {anom.severity === 'LEGENDARY' ? 'bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-500/50' : anom.severity === 'EXCEPTIONAL' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/50' : 'bg-amber-900/60 text-amber-300 border border-amber-500/50'}">
                    {anom.severity}
                  </span>
                  <span class="text-white font-bold text-xs">{anom.name}</span>
                </div>
                <div class="text-[11px] font-bold text-orange-400">
                  +{anom.points} PTS
                </div>
              </div>

              <div class="mt-1.5 text-zinc-300 text-[11px] leading-relaxed">
                {anom.description}
              </div>

              <!-- Expanded Details -->
              {#if inspectAnomaly?.id === anom.id}
                <div class="mt-3 pt-2.5 border-t border-zinc-800 space-y-1.5 text-[10px]">
                  <div class="text-amber-300">
                    <span class="font-bold text-zinc-400">SCIENTIFIC VALUE:</span> {anom.scientificValue}
                  </div>
                  <div class="flex flex-wrap gap-2 text-zinc-400">
                    <div><span class="font-bold">TARGET:</span> {anom.targetBodyName}</div>
                    <div><span class="font-bold">DETOUR:</span> {anom.detourPriority}</div>
                  </div>
                  {#if Object.keys(anom.metrics).length > 0}
                    <div class="p-2 bg-zinc-950 rounded border border-zinc-800 flex flex-wrap gap-3">
                      {#each Object.entries(anom.metrics) as [key, val]}
                        <div><span class="text-zinc-500">{key}:</span> <span class="text-white font-bold">{val}</span></div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- TAB 3: DETOUR ADVISORY -->
  {:else if activeTab === 'DETOURS'}
    <div class="space-y-3">
      <div class="text-zinc-400 text-xs">
        Real-time exploration recommendations for detour-worthy astronomical phenomena.
      </div>

      {#if report.recommendations.length === 0}
        <div class="p-6 text-center text-zinc-500 border border-zinc-800 rounded bg-black/40">
          No mandatory or high-value detour targets identified in this system.
        </div>
      {:else}
        <div class="space-y-2">
          {#each report.recommendations as rec}
            <div class="p-3 bg-black/60 border border-zinc-800 rounded hover:border-orange-500/50 transition-colors">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase {rec.priority === 'MANDATORY_DETOUR' ? 'bg-rose-900/60 text-rose-300 border border-rose-500/50' : 'bg-amber-900/60 text-amber-300 border border-amber-500/50'}">
                    {rec.priority.replace('_', ' ')}
                  </span>
                  <span class="text-white font-bold text-xs">{rec.title}</span>
                </div>
                <div class="text-amber-400 text-xs">
                  {'★'.repeat(rec.estimatedPhotoOpRating)}{'☆'.repeat(5 - rec.estimatedPhotoOpRating)}
                </div>
              </div>

              <div class="mt-1.5 text-zinc-300 text-[11px]">
                {rec.rationale}
              </div>

              <div class="mt-2 flex flex-wrap items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-800/80">
                <div class="flex items-center space-x-3">
                  <div>TARGET: <span class="text-white font-bold">{rec.bodyName}</span></div>
                  <div>DISTANCE: <span class="text-orange-300 font-bold">{rec.detourDistanceLs.toLocaleString()} Ls</span></div>
                </div>

                {#if onSelectBody}
                  <button
                    type="button"
                    class="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded"
                    onclick={() => onSelectBody(rec.bodyName)}
                  >
                    LOCK NAV WAYPOINT
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- TAB 4: CUSTOM SIMULATOR BUILDER -->
  {:else if activeTab === 'CUSTOM_BUILDER'}
    <div class="space-y-4">
      <div class="p-3 bg-black/50 border border-zinc-800 rounded space-y-3">
        <div class="text-xs font-bold text-orange-400">CELESTIAL SYSTEM PARAMETERS</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="custom-system-name" class="block text-zinc-400 text-[10px] uppercase font-bold mb-1">SYSTEM DESIGNATION</label>
            <input
              id="custom-system-name"
              type="text"
              class="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-white"
              bind:value={customSystemName}
            />
          </div>
          <div>
            <label for="custom-primary-star-class" class="block text-zinc-400 text-[10px] uppercase font-bold mb-1">PRIMARY STAR SPECTRAL CLASS</label>
            <input
              id="custom-primary-star-class"
              type="text"
              class="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-white"
              bind:value={customPrimaryStarClass}
            />
          </div>
        </div>
      </div>

      <!-- Add Body Form -->
      <div class="p-3 bg-zinc-950/80 border border-zinc-800 rounded space-y-3">
        <div class="text-xs font-bold text-zinc-300">ADD CELESTIAL BODY TO SIMULATION</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label for="new-body-name" class="text-[9px] text-zinc-400 block mb-0.5">NAME</label>
            <input id="new-body-name" type="text" class="w-full bg-black border border-zinc-800 px-2 py-1 rounded text-white" bind:value={newBodyName} />
          </div>
          <div>
            <label for="new-body-subtype" class="text-[9px] text-zinc-400 block mb-0.5">SUBTYPE</label>
            <input id="new-body-subtype" type="text" class="w-full bg-black border border-zinc-800 px-2 py-1 rounded text-white" bind:value={newBodySubType} />
          </div>
          <div>
            <label for="new-body-gravity" class="text-[9px] text-zinc-400 block mb-0.5">GRAVITY (G)</label>
            <input id="new-body-gravity" type="number" step="0.1" class="w-full bg-black border border-zinc-800 px-2 py-1 rounded text-white" bind:value={newBodyGravity} />
          </div>
          <div>
            <label for="new-body-eccentricity" class="text-[9px] text-zinc-400 block mb-0.5">ECCENTRICITY</label>
            <input id="new-body-eccentricity" type="number" step="0.05" class="w-full bg-black border border-zinc-800 px-2 py-1 rounded text-white" bind:value={newBodyEccentricity} />
          </div>
        </div>
        <div class="flex items-center justify-between">
          <label class="flex items-center space-x-2 text-zinc-300">
            <input type="checkbox" bind:checked={newBodyLandable} />
            <span>LANDABLE SURFACE</span>
          </label>
          <button
            type="button"
            class="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded"
            onclick={addCustomBody}
          >
            ADD BODY
          </button>
        </div>
      </div>

      <!-- Current Body Stack -->
      <div class="space-y-1.5">
        <div class="text-[10px] text-zinc-400 uppercase font-bold">CURRENT CATALOGUED BODIES ({customBodies.length}):</div>
        {#each customBodies as b, i}
          <div class="p-2 bg-black/40 border border-zinc-800 rounded flex items-center justify-between text-[11px]">
            <div>
              <span class="text-white font-bold">{b.name}</span>
              <span class="text-zinc-400 ml-2">({b.subType || b.bodyType})</span>
              {#if b.surfaceGravityG !== undefined}<span class="text-amber-400 ml-2">{b.surfaceGravityG}G</span>{/if}
              {#if b.eccentricity !== undefined}<span class="text-cyan-400 ml-2">e={b.eccentricity}</span>{/if}
            </div>
            <button
              type="button"
              class="text-rose-400 hover:text-rose-300 px-2 py-0.5"
              onclick={() => removeCustomBody(i)}
            >
              REMOVE
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
