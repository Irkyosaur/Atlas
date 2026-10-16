<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import type { SystemRecord, BodyRecord } from '$engine/ananke_client';
  import { bridgeClient } from '$engine/bridge_client';
  import { bodyProbabilityClassifier, BODY_CLASS_LABELS } from '$engine/body_probability_classifier';
  import { exobiologyPredictor, type ExobiologyEvaluationReport } from '$engine/exobiology_predictor';
  import {
    astronomicalAnomalyDetector,
    type SystemRarityReport,
    type AstronomicalBody
  } from '$engine/anomaly_detector';

  export interface SystemDossier {
    system: SystemRecord;
    bodies?: BodyRecord[];
    allegiance: string;
    government: string;
    economy: string;
    security: string;
    population: number;
    controllingFaction: string;
    factions: {
      name: string;
      influence: number;
      state: string;
      allegiance: string;
    }[];
    primaryBody?: {
      name: string;
      subType: string;
      gravity: number; // in G
      surfaceTemperature: number; // Kelvin
      surfacePressure: number; // Atmospheres
      atmosphereType: string;
      volcanism: string;
      terraformState: string;
      landable: boolean;
    };
  }

  interface Props {
    dossier: SystemDossier;
    isOpen?: boolean;
    onClose?: () => void;
  }

  let {
    dossier = $bindable(),
    isOpen = $bindable(true),
    onClose,
  }: Props = $props();

  let activeTab = $state<'system' | 'body' | 'factions'>('system');
  let targetLockFeedback = $state<string | null>(null);

  function handleSetInGameTarget(includeBody: boolean = false) {
    const sysName = dossier.system.name;
    const sysId64 = String(dossier.system.id64 || '10477373803');
    const bodyName = includeBody && dossier.primaryBody ? dossier.primaryBody.name : undefined;
    bridgeClient.injectNavTarget(sysName, sysId64, {
      bodyName,
      entityKind: includeBody ? 'BODY' : 'SYSTEM',
      starPos: [dossier.system.x, dossier.system.y, dossier.system.z],
      starClass: dossier.system.primaryStarClass,
    });
    targetLockFeedback = `Target Locked in Nav Computer: ${sysName}${bodyName ? ` (${bodyName})` : ''}`;
    setTimeout(() => {
      targetLockFeedback = null;
    }, 3500);
  }

  // Stage 16.2: Body classification assessment
  let bodyProbabilityAssessment = $derived.by(() => {
    const starClass = dossier.system.primaryStarClass?.charAt(0) || 'G';
    const star = {
      spectralClass: starClass,
      luminositySolar: starClass === 'O' ? 1000 : starClass === 'B' ? 100 : starClass === 'A' ? 20 : starClass === 'F' ? 2.5 : starClass === 'G' ? 1.0 : starClass === 'K' ? 0.4 : 0.05
    };
    const bodyDistanceLs = dossier.primaryBody ? 499.0 : 499.0;
    return bodyProbabilityClassifier.evaluateCandidateBody(star, {
      bodyName: dossier.primaryBody?.name || `${dossier.system.name} 1`,
      distanceLs: bodyDistanceLs,
      earthMasses: dossier.primaryBody?.gravity ? Math.pow(dossier.primaryBody.gravity, 1.2) : 1.0,
      surfaceTempK: dossier.primaryBody?.surfaceTemperature || 288,
      surfaceGravityG: dossier.primaryBody?.gravity || 1.0
    });
  });

  // Stage 16.3: Exobiology value predictor & Vista Genomics payout calculation
  let exobiologyEvaluation = $derived.by<ExobiologyEvaluationReport>(() => {
    return exobiologyPredictor.evaluateBody({
      bodyName: dossier.primaryBody?.name || dossier.system.name,
      gravityG: dossier.primaryBody?.gravity || 0.35,
      surfaceTemperatureK: dossier.primaryBody?.surfaceTemperature || 215,
      surfacePressureAtm: dossier.primaryBody?.surfacePressure || 0.05,
      atmosphereType: dossier.primaryBody?.atmosphereType || 'Thin Carbon dioxide',
      volcanism: dossier.primaryBody?.volcanism || 'None',
      isLandable: dossier.primaryBody?.landable ?? true
    });
  });

  // Stage 16.4: Astronomical Anomaly & System Rarity Scorer
  let systemRarityReport = $derived.by<SystemRarityReport>(() => {
    const bodiesList: AstronomicalBody[] = [];
    if (dossier.primaryBody) {
      bodiesList.push({
        name: dossier.primaryBody.name,
        bodyType: 'Planet',
        subType: dossier.primaryBody.subType,
        surfaceGravityG: dossier.primaryBody.gravity,
        surfaceTemperatureK: dossier.primaryBody.surfaceTemperature,
        surfacePressureAtm: dossier.primaryBody.surfacePressure,
        atmosphereType: dossier.primaryBody.atmosphereType,
        volcanism: dossier.primaryBody.volcanism,
        isLandable: dossier.primaryBody.landable,
        distanceLs: 499
      });
    }

    if (dossier.bodies) {
      for (const b of dossier.bodies) {
        if (!bodiesList.some((x) => x.name === b.name)) {
          bodiesList.push({
            name: b.name,
            bodyType: b.bodyType || 'Planet',
            subType: b.subType,
            surfaceGravityG: b.gravity,
            surfaceTemperatureK: b.surfaceTemperature,
            isLandable: b.isLandable,
            distanceLs: b.distanceLs || 500
          });
        }
      }
    }

    return astronomicalAnomalyDetector.evaluateSystem({
      systemName: dossier.system.name,
      primaryStarClass: dossier.system.primaryStarClass,
      bodies: bodiesList
    });
  });

  function toggleDrawer() {
    isOpen = !isOpen;
    if (!isOpen && onClose) {
      onClose();
    }
  }
</script>

<!-- Outer Drawer Container with hardware accelerated transitions -->
<aside
  class="absolute top-14 bottom-10 right-0 z-20 flex flex-row-reverse transition-transform duration-300 ease-out will-change-transform select-none {isOpen
    ? 'translate-x-0'
    : 'translate-x-[calc(100%-2.5rem)]'}"
  aria-label="System and Body Dossier Panel"
>
  <!-- Main Drawer Panel -->
  <div
    class="w-80 sm:w-96 h-full bg-[var(--hud-bg)]/92 border-l border-t border-b border-[var(--hud-orange)]/40 backdrop-blur-md flex flex-col shadow-2xl overflow-hidden"
  >
    <!-- Drawer Header -->
    <div class="px-4 py-3 border-b border-[var(--hud-orange)]/30 flex items-center justify-between bg-black/40">
      <div class="flex items-center space-x-2 truncate">
        <Icon name="reticle" size={16} glow={true} color="var(--hud-orange)" />
        <span class="hud-system-name text-sm font-bold tracking-wider truncate">
          {dossier.system.name}
        </span>
      </div>
      <div class="text-[10px] font-mono text-[var(--hud-amber)] px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30 whitespace-nowrap">
        STAR CLASS {dossier.system.primaryStarClass?.charAt(0) || 'G'}
      </div>
    </div>

    <!-- Sub-navigation Tabs -->
    <div class="flex border-b border-[var(--hud-orange)]/25 text-xs font-mono bg-black/50">
      <button
        type="button"
        class="flex-1 py-2 text-center uppercase tracking-wider transition-colors {activeTab === 'system'
          ? 'bg-[var(--hud-orange)] text-black font-bold'
          : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10'}"
        onclick={() => (activeTab = 'system')}
      >
        SYSTEM
      </button>
      <button
        type="button"
        class="flex-1 py-2 text-center uppercase tracking-wider transition-colors {activeTab === 'body'
          ? 'bg-[var(--hud-orange)] text-black font-bold'
          : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10'}"
        onclick={() => (activeTab = 'body')}
      >
        PRIMARY BODY
      </button>
      <button
        type="button"
        class="flex-1 py-2 text-center uppercase tracking-wider transition-colors {activeTab === 'factions'
          ? 'bg-[var(--hud-orange)] text-black font-bold'
          : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10'}"
        onclick={() => (activeTab = 'factions')}
      >
        FACTIONS
      </button>
    </div>

    <!-- Scrollable Tab Content Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
      {#if activeTab === 'system'}
        <!-- System Dossier Overview -->
        <div class="space-y-3">
          <div class="bg-black/40 border border-[var(--hud-orange)]/25 rounded p-3 space-y-2">
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase tracking-wider">CIVILIZATION & POLITICS</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="hud-data-label">ALLEGIANCE:</span>
                <div class="text-white font-bold">{dossier.allegiance}</div>
              </div>
              <div>
                <span class="hud-data-label">GOVERNMENT:</span>
                <div class="text-white font-bold">{dossier.government}</div>
              </div>
              <div>
                <span class="hud-data-label">SECURITY:</span>
                <div class="text-[var(--hud-amber)] font-bold">{dossier.security}</div>
              </div>
              <div>
                <span class="hud-data-label">ECONOMY:</span>
                <div class="text-white font-bold">{dossier.economy}</div>
              </div>
            </div>
          </div>

          <div class="bg-black/40 border border-[var(--hud-orange)]/25 rounded p-3 space-y-2">
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase tracking-wider">DEMOGRAPHICS & CARTOGRAPHY</div>
            <div class="space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="hud-data-label">POPULATION:</span>
                <span class="text-white font-bold">
                  {dossier.population > 0 ? dossier.population.toLocaleString() : 'UNINHABITED'}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="hud-data-label">CONTROLLING FACTION:</span>
                <span class="text-[var(--hud-amber)] truncate ml-2">{dossier.controllingFaction}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="hud-data-label">COORDINATES:</span>
                <span class="text-white/80">
                  {dossier.system.x.toFixed(1)}, {dossier.system.y.toFixed(1)}, {dossier.system.z.toFixed(1)}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="hud-data-label">SYSTEM ID64:</span>
                <span class="text-cyan-300 font-mono text-[11px]">
                  {dossier.system.id64 || '10477373803'}
                </span>
              </div>
            </div>
          </div>

          <!-- Stage 16.4: Astronomical Anomaly & System Rarity Telemetry Card -->
          <div class="bg-black/60 border rounded p-3 space-y-2" style="border-color: {systemRarityReport.tierColor}">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                SYSTEM RARITY INDEX
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style="color: {systemRarityReport.tierColor}; background-color: {systemRarityReport.tierColor}20; border: 1px solid {systemRarityReport.tierColor}60">
                {systemRarityReport.rarityTier}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-xs text-zinc-400">ANOMALY SCORE:</span>
              <span class="font-bold text-sm font-mono" style="color: {systemRarityReport.tierColor}">
                {systemRarityReport.rarityScore} / 100
              </span>
            </div>

            <div class="w-full bg-zinc-800 h-1.5 rounded overflow-hidden">
              <div
                class="h-full rounded transition-all duration-300"
                style="width: {systemRarityReport.rarityScore}%; background-color: {systemRarityReport.tierColor}"
              ></div>
            </div>

            {#if systemRarityReport.detectedAnomalies.length > 0}
              <div class="text-[10px] text-zinc-300 pt-1 border-t border-zinc-800">
                <span class="text-amber-400 font-bold">★ {systemRarityReport.detectedAnomalies.length} ANOMALIES:</span>
                <span class="ml-1 text-zinc-400">{systemRarityReport.detectedAnomalies[0].name}</span>
              </div>
            {/if}
          </div>

          <!-- Stage 12.2: One-Click Reverse Waypoint Injection & In-Game Target Lock -->
          <div class="bg-black/60 border border-[#FF7100]/40 rounded p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-[#FF7100] font-bold uppercase tracking-wider">
                ?? IN-COCKPIT NAV TARGET INJECTOR
              </span>
              <span class="text-[9px] text-emerald-300 font-mono">ws://127.0.0.1:8999</span>
            </div>
            <button
              type="button"
              onclick={() => handleSetInGameTarget(false)}
              class="w-full py-2 px-3 rounded bg-[#FF7100]/20 border border-[#FF7100] text-[#FF7100] hover:bg-[#FF7100] hover:text-black font-bold uppercase tracking-wider text-[11px] transition-all"
            >
              ? SET IN-GAME TARGET ({dossier.system.name})
            </button>
            {#if dossier.primaryBody}
              <button
                type="button"
                onclick={() => handleSetInGameTarget(true)}
                class="w-full py-1.5 px-3 rounded bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 font-bold uppercase tracking-wider text-[10px] transition-all"
              >
                ?? LOCK BODY IN NAV ({dossier.primaryBody.name})
              </button>
            {/if}
            {#if targetLockFeedback}
              <div class="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                ? {targetLockFeedback}
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'body'}
        <!-- Primary Body Telemetry (gravity, temperature, atmosphere) -->
        <div class="space-y-3">
          {#if dossier.primaryBody}
            <div class="bg-black/40 border border-[var(--hud-orange)]/25 rounded p-3 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[11px] text-[var(--ed-orange-bright)] font-bold uppercase">{dossier.primaryBody.name}</div>
                  <div class="text-[10px] text-[var(--ed-orange-dim)]">{dossier.primaryBody.subType}</div>
                </div>
                {#if dossier.primaryBody.landable}
                  <div class="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px]">
                    <Icon name="landable-arc" size={14} glow={false} />
                    <span>LANDABLE</span>
                  </div>
                {/if}
              </div>

              <!-- Physical Characteristics Grid -->
              <div class="grid grid-cols-2 gap-2.5 pt-2 border-t border-[var(--hud-orange)]/20">
                <div class="p-2 bg-black/50 rounded border border-white/5">
                  <div class="hud-data-label text-[10px]">GRAVITY</div>
                  <div class="text-sm font-bold text-white mt-0.5">
                    {dossier.primaryBody.gravity.toFixed(2)} G
                  </div>
                </div>

                <div class="p-2 bg-black/50 rounded border border-white/5">
                  <div class="hud-data-label text-[10px]">SURFACE TEMP</div>
                  <div class="text-sm font-bold text-white mt-0.5">
                    {dossier.primaryBody.surfaceTemperature} K
                    <span class="text-[10px] text-white/40">({(dossier.primaryBody.surfaceTemperature - 273.15).toFixed(0)}°C)</span>
                  </div>
                </div>

                <div class="p-2 bg-black/50 rounded border border-white/5">
                  <div class="hud-data-label text-[10px]">ATMOSPHERE</div>
                  <div class="text-xs font-medium text-[var(--hud-amber)] mt-0.5 truncate" title={dossier.primaryBody.atmosphereType}>
                    {dossier.primaryBody.atmosphereType}
                  </div>
                </div>

                <div class="p-2 bg-black/50 rounded border border-white/5">
                  <div class="hud-data-label text-[10px]">PRESSURE</div>
                  <div class="text-sm font-bold text-white mt-0.5">
                    {dossier.primaryBody.surfacePressure.toFixed(2)} Atm
                  </div>
                </div>
              </div>

              <div class="text-[11px] space-y-1 pt-1">
                <div class="flex justify-between">
                  <span class="hud-data-label">VOLCANISM:</span>
                  <span class="text-white/80">{dossier.primaryBody.volcanism || 'No volcanism'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="hud-data-label">TERRAFORM:</span>
                  <span class="text-emerald-400">{dossier.primaryBody.terraformState || 'Not terraformable'}</span>
                </div>
              </div>
            </div>

            <!-- Stage 16.2: Predictive AI Planetary Classification Telemetry -->
            <div class="bg-black/60 border border-orange-500/40 rounded p-3 space-y-2">
              <div class="flex items-center justify-between border-b border-orange-500/20 pb-1.5">
                <span class="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                  🪐 AI BODY CLASSIFICATION (STAGE 16.2)
                </span>
                <span class="text-[9px] text-emerald-300 font-mono">
                  Goldilocks: {bodyProbabilityAssessment.goldilocksMatchScore}%
                </span>
              </div>

              {#if bodyProbabilityAssessment.highestValueTarget}
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-zinc-300 font-bold">Predicted Type:</span>
                  <span class="text-amber-300 font-bold">{bodyProbabilityAssessment.highestValueTarget.label}</span>
                </div>
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-zinc-300 font-bold">Confidence:</span>
                  <span class="text-emerald-400 font-bold">{bodyProbabilityAssessment.highestValueTarget.percentageFormatted}</span>
                </div>
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-zinc-300 font-bold">Estimated Payout:</span>
                  <span class="text-cyan-300 font-mono font-bold">
                    {(bodyProbabilityAssessment.highestValueTarget.estimatedPayoutCr).toLocaleString()} CR
                  </span>
                </div>
              {/if}

              <div class="text-[9px] text-zinc-400 pt-1 border-t border-zinc-800">
                Goldilocks Scan Band: <strong class="text-orange-300">{bodyProbabilityAssessment.habitableZone.recommendedBandLabel}</strong>
              </div>
            </div>

            <!-- Stage 16.3: Exobiology Value Predictor & Vista Genomics Payout Calculator -->
            <div class="bg-black/60 border border-emerald-500/40 rounded p-3 space-y-2">
              <div class="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                  <span>🧬</span>
                  <span>EXOBIOLOGY & VISTA PAYOUT (STAGE 16.3)</span>
                </span>
                <span class="text-[9px] text-emerald-300 font-mono">
                  {exobiologyEvaluation.expectedSpeciesCount} SPECIES
                </span>
              </div>

              {#if exobiologyEvaluation.isEligibleForExobiology && exobiologyEvaluation.predictedSpecies.length > 0}
                {#if exobiologyEvaluation.highestValueSpecies}
                  <div class="flex justify-between items-center text-[11px]">
                    <span class="text-zinc-300 font-bold">Top Flora:</span>
                    <span class="text-emerald-300 font-bold">{exobiologyEvaluation.highestValueSpecies.species.fullName}</span>
                  </div>
                  <div class="flex justify-between items-center text-[11px]">
                    <span class="text-zinc-300 font-bold">Clonal Distance:</span>
                    <span class="text-amber-300 font-mono font-bold">{exobiologyEvaluation.highestValueSpecies.species.canonicalDistanceM}m</span>
                  </div>
                  <div class="flex justify-between items-center text-[11px]">
                    <span class="text-zinc-300 font-bold">Fit Probability:</span>
                    <span class="text-cyan-300 font-bold">{exobiologyEvaluation.highestValueSpecies.percentageFormatted}</span>
                  </div>
                {/if}

                <div class="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 flex justify-between items-center text-[11px] mt-1">
                  <span class="text-emerald-300 font-bold">5x First Discovery:</span>
                  <span class="text-emerald-400 font-mono font-bold text-xs">
                    {(exobiologyEvaluation.totalEstimatedFirstDiscoveryCr).toLocaleString()} CR
                  </span>
                </div>
              {:else}
                <div class="text-[10px] text-zinc-500 italic py-1">
                  {exobiologyEvaluation.ineligibilityReason || 'No biological signatures predicted for this environment.'}
                </div>
              {/if}
            </div>
          {:else}
            <div class="text-center py-8 text-[var(--ed-orange-dim)]">
              NO BODY TELEMETRY SCAN AVAILABLE
            </div>
          {/if}
        </div>

      {:else if activeTab === 'factions'}
        <!-- Faction Breakdown -->
        <div class="space-y-2.5">
          <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase tracking-wider">
            LOCAL SYSTEM INFLUENCE BREAKDOWN
          </div>

          {#each dossier.factions as faction}
            <div class="p-2.5 bg-black/40 border border-[var(--hud-orange)]/20 rounded space-y-1.5 hover:border-[var(--hud-orange)]/50 transition-colors">
              <div class="flex justify-between items-center">
                <span class="text-white font-bold truncate text-[11px]">{faction.name}</span>
                <span class="text-[var(--hud-amber)] font-mono font-bold">
                  {(faction.influence * 100).toFixed(1)}%
                </span>
              </div>

              <!-- Influence Bar -->
              <div class="w-full bg-white/10 h-1 rounded overflow-hidden">
                <div
                  class="bg-[var(--hud-orange)] h-full rounded transition-all duration-300"
                  style="width: {Math.min(100, Math.max(0, faction.influence * 100))}%;"
                ></div>
              </div>

              <div class="flex justify-between text-[10px] text-[var(--ed-orange-dim)]">
                <span>{faction.allegiance}</span>
                <span class="text-[var(--hud-orange)] font-medium uppercase">{faction.state}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Drawer Footer System ID -->
    <div class="p-3 border-t border-[var(--hud-orange)]/30 bg-black/60 flex items-center justify-between text-[11px] font-mono">
      <span class="text-[var(--ed-orange-dim)]">ID64: {dossier.system.id64}</span>
      <span class="text-[var(--hud-orange)]">TELEMETRY LOCK</span>
    </div>
  </div>

  <!-- Collapsible Toggle Tab Handle -->
  <button
    type="button"
    class="w-10 h-28 my-auto bg-[var(--hud-bg)]/95 border-l border-t border-b border-[var(--hud-orange)]/50 rounded-l flex flex-col items-center justify-center text-[var(--hud-orange)] hover:text-white hover:bg-[var(--hud-orange)]/25 transition-colors shadow-lg cursor-pointer"
    onclick={toggleDrawer}
    aria-label={isOpen ? 'Collapse Dossier Drawer' : 'Expand Dossier Drawer'}
    title={isOpen ? 'Collapse Dossier (Right)' : 'Expand Dossier (Right)'}
  >
    <div class="text-[9px] font-mono uppercase tracking-widest rotate-90 whitespace-nowrap mb-2">
      {isOpen ? 'COLLAPSE' : 'DOSSIER'}
    </div>
    <span class="text-xs transition-transform duration-200 {isOpen ? 'rotate-180' : ''}">
      ◀
    </span>
  </button>
</aside>
