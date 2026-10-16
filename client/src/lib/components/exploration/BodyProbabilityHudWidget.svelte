<!-- Location: client/src/lib/components/exploration/BodyProbabilityHudWidget.svelte -->
<!-- Stage 16.2: Earth-Like & High-Value Body Probability Classifier HUD Telemetry Widget -->

<script lang="ts">
  import {
    bodyProbabilityClassifier,
    BODY_CLASS_PAYOUTS,
    type CandidateBodyInput,
    type SystemProbabilityAssessment
  } from '$engine/body_probability_classifier';
  import { calculateHabitableZone, type StellarParameters } from '$engine/habitable_zone_calculator';

  interface Props {
    systemName?: string;
    spectralClass?: string;
    luminositySolar?: number;
    effectiveTempK?: number;
    massSolar?: number;
    initialDistanceLs?: number;
    initialEarthMasses?: number;
    onSelectScanTarget?: (targetName: string, distanceLs: number) => void;
  }

  let {
    systemName = 'Sol Archetype',
    spectralClass = 'G',
    luminositySolar = 1.0,
    effectiveTempK = 5778,
    massSolar = 1.0,
    initialDistanceLs = 499,
    initialEarthMasses = 1.0,
    onSelectScanTarget
  }: Props = $props();

  // Internal reactive inputs
  let currentSpectral = $state<string>('G');
  let currentLuminosity = $state<number>(1.0);
  let currentEffectiveTemp = $state<number>(5778);
  let currentMass = $state<number>(1.0);

  let targetDistanceLs = $state<number>(499);
  let targetMass = $state<number>(1.0);
  let targetRadiusKm = $state<number>(6371);
  let selectedBodyTypeFilter = $state<string>('ALL');

  $effect(() => {
    currentSpectral = spectralClass;
    currentLuminosity = luminositySolar;
    currentEffectiveTemp = effectiveTempK;
    currentMass = massSolar;
    targetDistanceLs = initialDistanceLs;
    targetMass = initialEarthMasses;
  });

  // Compute assessment reactively
  let assessment = $derived.by<SystemProbabilityAssessment>(() => {
    const star: StellarParameters = {
      spectralClass: currentSpectral,
      luminositySolar: currentLuminosity,
      effectiveTempK: currentEffectiveTemp,
      massSolar: currentMass
    };

    const candidate: CandidateBodyInput = {
      bodyName: `${systemName} 3`,
      distanceLs: targetDistanceLs,
      earthMasses: targetMass,
      radiusKm: targetRadiusKm
    };

    return bodyProbabilityClassifier.evaluateCandidateBody(star, candidate);
  });

  // Filtered predictions
  let filteredPredictions = $derived.by(() => {
    if (selectedBodyTypeFilter === 'ALL') {
      return assessment.predictions;
    }
    if (selectedBodyTypeFilter === 'HIGH_VALUE') {
      return assessment.predictions.filter((p) =>
        ['EARTH_LIKE_WORLD', 'WATER_WORLD', 'AMMONIA_WORLD', 'TERRAFORMABLE_HMC'].includes(p.bodyClass)
      );
    }
    if (selectedBodyTypeFilter === 'TERRAFORMABLE') {
      return assessment.predictions.filter((p) => p.isTerraformableCandidate);
    }
    return assessment.predictions;
  });

  function formatCredits(cr: number): string {
    if (cr >= 1_000_000) return `${(cr / 1_000_000).toFixed(2)}M CR`;
    if (cr >= 1_000) return `${(cr / 1_000).toFixed(0)}K CR`;
    return `${cr} CR`;
  }

  // Pre-configured stellar profiles
  const STELLAR_PROFILES = [
    { label: 'Sol (G2V)', spectral: 'G', lum: 1.0, temp: 5778, mass: 1.0, orbitLs: 499 },
    { label: 'Trappist-1 (M8V)', spectral: 'M', lum: 0.0005, temp: 2566, mass: 0.09, orbitLs: 25 },
    { label: 'Vega (A0V)', spectral: 'A', lum: 40.1, temp: 9600, mass: 2.1, orbitLs: 3150 },
    { label: 'Tau Ceti (G8V)', spectral: 'G', lum: 0.52, temp: 5344, mass: 0.78, orbitLs: 360 },
    { label: 'Epsilon Indi (K5V)', spectral: 'K', lum: 0.22, temp: 4620, mass: 0.76, orbitLs: 235 },
    { label: 'Proxima Centauri (M5.5V)', spectral: 'M', lum: 0.0017, temp: 3042, mass: 0.12, orbitLs: 42 }
  ];

  function applyProfile(p: typeof STELLAR_PROFILES[0]) {
    currentSpectral = p.spectral;
    currentLuminosity = p.lum;
    currentEffectiveTemp = p.temp;
    currentMass = p.mass;
    targetDistanceLs = p.orbitLs;
  }
</script>

<div class="w-full flex flex-col space-y-4 p-4 rounded-xl bg-zinc-950/95 border border-orange-500/40 text-zinc-100 font-mono shadow-[0_0_35px_rgba(249,115,22,0.15)] select-none">
  <!-- HUD Header -->
  <div class="flex flex-wrap items-center justify-between border-b border-orange-500/30 pb-3 gap-2">
    <div class="flex items-center space-x-3">
      <span class="text-2xl animate-pulse">🪐</span>
      <div>
        <div class="flex items-center space-x-2">
          <h3 class="text-sm font-bold text-orange-400 tracking-wider uppercase">
            EARTH-LIKE & HIGH-VALUE BODY PROBABILITY CLASSIFIER
          </h3>
          <span class="px-2 py-0.5 text-[9px] rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
            STAGE 16.2
          </span>
        </div>
        <p class="text-[11px] text-zinc-400">
          Bayesian Multi-Class Heuristic Inference & Goldilocks Habitable Zone Solver
        </p>
      </div>
    </div>

    <!-- Overall Goldilocks Alignment Indicator -->
    <div class="flex items-center space-x-3 text-xs">
      <div class="px-3 py-1.5 rounded bg-black/60 border border-orange-500/30 flex items-center space-x-2">
        <span class="text-[10px] text-zinc-400 uppercase">GOLDILOCKS SCORE:</span>
        <span class="font-bold {assessment.goldilocksMatchScore >= 75 ? 'text-emerald-400' : assessment.goldilocksMatchScore >= 50 ? 'text-amber-400' : 'text-zinc-400'}">
          {assessment.goldilocksMatchScore}%
        </span>
        <span class="w-2.5 h-2.5 rounded-full {assessment.isGoldilocksCandidate ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'}"></span>
      </div>

      <div class="px-3 py-1.5 rounded bg-black/60 border border-zinc-700 flex items-center space-x-1.5">
        <span class="text-[10px] text-zinc-400 uppercase">SYS VALUE:</span>
        <span class="font-bold text-amber-300">{formatCredits(assessment.totalEstimatedSystemValueCr)}</span>
      </div>
    </div>
  </div>

  <!-- Quick Profiles Toolbar -->
  <div class="space-y-1.5">
    <div class="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider">
      STELLAR ARCHETYPE BENCHMARKS:
    </div>
    <div class="flex flex-wrap gap-1.5">
      {#each STELLAR_PROFILES as prof}
        <button
          type="button"
          class="px-2 py-1 text-[11px] rounded bg-zinc-900 hover:bg-orange-500/20 border border-zinc-700 hover:border-orange-500/40 text-zinc-300 hover:text-orange-300 transition-colors"
          onclick={() => applyProfile(prof)}
        >
          {prof.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Habitable Zone Band Visualization Strip -->
  <div class="p-3 rounded-lg bg-black/50 border border-zinc-800 space-y-2">
    <div class="flex justify-between items-center text-xs">
      <span class="font-bold text-zinc-300 flex items-center space-x-1.5">
        <span>☀️</span>
        <span>HABITABLE ZONE BOUNDARIES (KOPPARAPU RADIATIVE MODEL)</span>
      </span>
      <span class="text-[11px] text-orange-400 font-bold">
        Goldilocks Center: {assessment.habitableZone.recommendedCenterLs.toLocaleString()} Ls
      </span>
    </div>

    <!-- Scaled Graphic Bar -->
    <div class="relative w-full h-7 bg-zinc-900 rounded overflow-hidden border border-zinc-700 flex items-center">
      <!-- Too Hot Zone -->
      <div class="h-full bg-red-950/40 border-r border-red-500/30 flex items-center justify-center text-[9px] text-red-400/80" style="width: 25%;">
        TOO HOT (INNER)
      </div>
      <!-- Optimistic Inward -->
      <div class="h-full bg-amber-950/40 border-r border-amber-500/30 flex items-center justify-center text-[9px] text-amber-400/80" style="width: 15%;">
        RECENT VENUS
      </div>
      <!-- Conservative Goldilocks Band -->
      <div class="h-full bg-emerald-950/60 border-r border-emerald-500/50 flex items-center justify-center text-[9px] font-bold text-emerald-300" style="width: 28%;">
        ★ GOLDILOCKS HABITABLE BAND ({assessment.habitableZone.recommendedBandLabel})
      </div>
      <!-- Early Mars Optimistic -->
      <div class="h-full bg-cyan-950/40 border-r border-cyan-500/30 flex items-center justify-center text-[9px] text-cyan-400/80" style="width: 12%;">
        EARLY MARS
      </div>
      <!-- Too Cold Outer -->
      <div class="h-full bg-blue-950/40 flex items-center justify-center text-[9px] text-blue-400/80" style="width: 20%;">
        SUB-ZERO (OUTER)
      </div>
    </div>

    <!-- Orbital distance metrics row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-zinc-400 pt-1">
      <div>Conservative In: <strong class="text-zinc-200">{assessment.habitableZone.innerConservativeLs} Ls</strong></div>
      <div>Conservative Out: <strong class="text-zinc-200">{assessment.habitableZone.outerConservativeLs} Ls</strong></div>
      <div>Tidal Lock Limit: <strong class="text-amber-400">{assessment.habitableZone.tidalLockingBoundaryLs} Ls</strong></div>
      <div>Equilibrium Window: <strong class="text-emerald-400">260K - 320K</strong></div>
    </div>
  </div>

  <!-- Interactive Parameter Sliders -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-black/40 border border-zinc-800 text-xs">
    <!-- Star Param Sliders -->
    <div class="space-y-2.5">
      <div class="text-[11px] font-bold text-orange-400/90 border-b border-zinc-800 pb-1">
        STELLAR HOST ATTRIBUTES
      </div>
      <div class="flex justify-between items-center">
        <label for="widget-spectral-class" class="text-zinc-400">Spectral Class:</label>
        <select
          id="widget-spectral-class"
          bind:value={currentSpectral}
          class="bg-zinc-900 border border-zinc-700 text-orange-300 px-2 py-0.5 rounded text-xs"
        >
          <option value="O">O (Blue-White)</option>
          <option value="B">B (Blue-White)</option>
          <option value="A">A (White)</option>
          <option value="F">F (Yellow-White)</option>
          <option value="G">G (Yellow Main Sequence)</option>
          <option value="K">K (Orange Dwarf)</option>
          <option value="M">M (Red Dwarf)</option>
        </select>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between">
          <label for="widget-luminosity" class="text-zinc-400">Solar Luminosity (L☉):</label>
          <span class="text-amber-300 font-bold">{currentLuminosity.toFixed(2)}</span>
        </div>
        <input
          id="widget-luminosity"
          type="range"
          min="0.0001"
          max="10.0"
          step="0.01"
          bind:value={currentLuminosity}
          class="w-full accent-orange-500 cursor-pointer"
        />
      </div>

      <div class="space-y-1">
        <div class="flex justify-between">
          <label for="widget-effective-temp" class="text-zinc-400">Stellar Surface Temp (K):</label>
          <span class="text-amber-300 font-bold">{currentEffectiveTemp} K</span>
        </div>
        <input
          id="widget-effective-temp"
          type="range"
          min="2000"
          max="15000"
          step="100"
          bind:value={currentEffectiveTemp}
          class="w-full accent-orange-500 cursor-pointer"
        />
      </div>
    </div>

    <!-- Candidate Body Sliders -->
    <div class="space-y-2.5">
      <div class="text-[11px] font-bold text-orange-400/90 border-b border-zinc-800 pb-1">
        CANDIDATE PLANETARY BODY ORBIT
      </div>
      <div class="space-y-1">
        <div class="flex justify-between">
          <label for="widget-distance-ls" class="text-zinc-400">Orbital Distance (Ls):</label>
          <span class="text-cyan-300 font-bold">{targetDistanceLs.toLocaleString()} Ls</span>
        </div>
        <input
          id="widget-distance-ls"
          type="range"
          min="5"
          max="6000"
          step="10"
          bind:value={targetDistanceLs}
          class="w-full accent-cyan-500 cursor-pointer"
        />
      </div>

      <div class="space-y-1">
        <div class="flex justify-between">
          <label for="widget-earth-mass" class="text-zinc-400">Planetary Mass (M⊕):</label>
          <span class="text-cyan-300 font-bold">{targetMass.toFixed(2)} M⊕</span>
        </div>
        <input
          id="widget-earth-mass"
          type="range"
          min="0.05"
          max="15.0"
          step="0.05"
          bind:value={targetMass}
          class="w-full accent-cyan-500 cursor-pointer"
        />
      </div>

      <div class="space-y-1">
        <div class="flex justify-between">
          <label for="widget-radius-km" class="text-zinc-400">Planetary Radius (km):</label>
          <span class="text-cyan-300 font-bold">{targetRadiusKm.toLocaleString()} km</span>
        </div>
        <input
          id="widget-radius-km"
          type="range"
          min="1000"
          max="25000"
          step="250"
          bind:value={targetRadiusKm}
          class="w-full accent-cyan-500 cursor-pointer"
        />
      </div>
    </div>
  </div>

  <!-- Filters & Probability Breakdown Table -->
  <div class="space-y-3">
    <div class="flex items-center justify-between text-xs">
      <div class="font-bold text-zinc-300">
        BAYESIAN CLASSIFICATION PROBABILITIES ({filteredPredictions.length} CLASSES)
      </div>

      <!-- Filter Buttons -->
      <div class="flex items-center space-x-1">
        <button
          type="button"
          class="px-2 py-0.5 rounded text-[10px] {selectedBodyTypeFilter === 'ALL' ? 'bg-orange-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'}"
          onclick={() => (selectedBodyTypeFilter = 'ALL')}
        >
          ALL
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-[10px] {selectedBodyTypeFilter === 'HIGH_VALUE' ? 'bg-orange-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'}"
          onclick={() => (selectedBodyTypeFilter = 'HIGH_VALUE')}
        >
          HIGH-VALUE
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-[10px] {selectedBodyTypeFilter === 'TERRAFORMABLE' ? 'bg-orange-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'}"
          onclick={() => (selectedBodyTypeFilter = 'TERRAFORMABLE')}
        >
          TERRAFORMABLE
        </button>
      </div>
    </div>

    <!-- Probability Items Grid -->
    <div class="space-y-2">
      {#each filteredPredictions as pred}
        <div class="p-2.5 rounded-lg bg-zinc-900/80 border {pred.isPrimaryCandidate ? 'border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.2)]' : 'border-zinc-800'} space-y-1.5 transition-all text-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              {#if pred.isPrimaryCandidate}
                <span class="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold text-[9px] border border-orange-500/40">
                  TOP MATCH
                </span>
              {/if}
              <span class="font-bold {pred.isPrimaryCandidate ? 'text-orange-300' : 'text-zinc-200'}">
                {pred.label}
              </span>
              {#if pred.isTerraformableCandidate}
                <span class="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/30">
                  TERRAFORMABLE CANDIDATE
                </span>
              {/if}
            </div>

            <div class="flex items-center space-x-3">
              <span class="font-mono text-zinc-400 text-[11px]">
                Payout: <strong class="text-emerald-400">{formatCredits(pred.estimatedPayoutCr)}</strong>
              </span>
              <span class="font-bold font-mono text-sm {pred.probability > 0.4 ? 'text-emerald-400' : pred.probability > 0.15 ? 'text-amber-400' : 'text-zinc-400'}">
                {pred.percentageFormatted}
              </span>
            </div>
          </div>

          <!-- Probability Bar -->
          <div class="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-zinc-800">
            <div
              class="h-full rounded-full transition-all duration-300 {pred.bodyClass === 'EARTH_LIKE_WORLD' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : pred.bodyClass === 'WATER_WORLD' ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : pred.bodyClass === 'AMMONIA_WORLD' ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-orange-600 to-orange-400'}"
              style="width: {pred.probability * 100}%"
            ></div>
          </div>

          <!-- Heuristics Chips -->
          {#if pred.heuristics && pred.heuristics.length > 0}
            <div class="flex flex-wrap gap-1 text-[10px] text-zinc-400 pt-0.5">
              {#each pred.heuristics as rule}
                <span class="px-1.5 py-0.5 rounded bg-black/50 border border-zinc-800 text-zinc-400">
                  &bull; {rule}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Bottom Diagnostic Notes -->
  {#if assessment.diagnosticNotes.length > 0}
    <div class="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
      <div class="text-[10px] uppercase font-bold text-zinc-500">REAL-TIME DIAGNOSTIC TELEMETRY:</div>
      {#each assessment.diagnosticNotes as note}
        <div class="text-zinc-300">&bull; {note}</div>
      {/each}
    </div>
  {/if}
</div>
