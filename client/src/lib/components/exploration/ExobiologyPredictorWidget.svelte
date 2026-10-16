<!-- Location: client/src/lib/components/exploration/ExobiologyPredictorWidget.svelte -->
<!-- Stage 16.3: Exobiology Value Predictor & Vista Genomics Payout Calculator HUD Widget -->

<script lang="ts">
  import {
    exobiologyPredictor,
    type PlanetaryBioEvaluationInput,
    type ExobiologyEvaluationReport,
    type PredictedBioSpeciesResult
  } from '$engine/exobiology_predictor';
  import {
    EXOBIOLOGY_SPECIES_CATALOG,
    VISTA_FIRST_DISCOVERY_MULTIPLIER,
    type ExobiologySpecies
  } from '$engine/exobiology_taxonomy';

  interface Props {
    systemName?: string;
    bodyName?: string;
    initialGravityG?: number;
    initialTempK?: number;
    initialAtmosphere?: string;
    initialVolcanism?: string;
    initialLandable?: boolean;
    onSelectSpecies?: (species: ExobiologySpecies) => void;
  }

  let {
    systemName = 'Sol',
    bodyName = 'Target Body 3 A',
    initialGravityG = 0.28,
    initialTempK = 215,
    initialAtmosphere = 'Thin Carbon dioxide',
    initialVolcanism = 'None',
    initialLandable = true,
    onSelectSpecies
  }: Props = $props();

  // Widget Mode: PREDICTOR vs CALCULATOR vs ROUTE_PLANNER
  let activeMode = $state<'PREDICTOR' | 'CALCULATOR' | 'CATALOG'>('PREDICTOR');

  // Predictor Parameters
  let currentBodyName = $state<string>(bodyName);
  let gravityG = $state<number>(initialGravityG);
  let surfaceTempK = $state<number>(initialTempK);
  let atmosphereType = $state<string>(initialAtmosphere);
  let volcanism = $state<string>(initialVolcanism);
  let isLandable = $state<boolean>(initialLandable);
  let isFirstDiscovery = $state<boolean>(true);

  // Selected species for detail inspector
  let inspectSpecies = $state<PredictedBioSpeciesResult | null>(null);

  // Vista Genomics Interactive Calculator State
  let selectedCalculatorSpeciesId = $state<string>('stratum_tectonicas');
  let calculatorFirstDiscovery = $state<boolean>(true);
  let customSampleQuantity = $state<number>(1);

  // Filter in catalog
  let catalogSearchQuery = $state<string>('');
  let catalogGenusFilter = $state<string>('ALL');

  // Live evaluated report
  let evaluation = $derived<ExobiologyEvaluationReport>(
    exobiologyPredictor.evaluateBody({
      bodyName: currentBodyName,
      gravityG,
      surfaceTemperatureK: surfaceTempK,
      atmosphereType,
      volcanism,
      isLandable
    })
  );

  // Calculator computation
  let calculatorResult = $derived.by(() => {
    const sp = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === selectedCalculatorSpeciesId) || EXOBIOLOGY_SPECIES_CATALOG[0];
    const baseUnit = sp.basePayoutCr;
    const bonusUnit = calculatorFirstDiscovery ? baseUnit * (VISTA_FIRST_DISCOVERY_MULTIPLIER - 1) : 0;
    const totalUnit = baseUnit + bonusUnit;
    const totalBatch = totalUnit * customSampleQuantity;
    return {
      species: sp,
      baseUnit,
      bonusUnit,
      totalUnit,
      totalBatch,
      multiplier: calculatorFirstDiscovery ? VISTA_FIRST_DISCOVERY_MULTIPLIER : 1
    };
  });

  // Filtered Catalog
  let filteredCatalog = $derived.by(() => {
    return EXOBIOLOGY_SPECIES_CATALOG.filter((sp) => {
      const matchSearch =
        catalogSearchQuery.trim() === '' ||
        sp.fullName.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
        sp.notes.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
        sp.sampleType.toLowerCase().includes(catalogSearchQuery.toLowerCase());
      const matchGenus = catalogGenusFilter === 'ALL' || sp.genus.toLowerCase() === catalogGenusFilter.toLowerCase();
      return matchSearch && matchGenus;
    });
  });

  const ATMOSPHERE_PRESETS = [
    { label: 'Thin CO2 (Stratum Hotspot)', value: 'Thin Carbon dioxide' },
    { label: 'Thin Argon (Fonticulua / Icy)', value: 'Thin Argon' },
    { label: 'Thin Nitrogen (Osseus / Tussock)', value: 'Thin Nitrogen' },
    { label: 'Thin Sulfur Dioxide (Volucre)', value: 'Thin Sulfur dioxide' },
    { label: 'Thin Methane (Bacterium)', value: 'Thin Methane' },
    { label: 'Thin Water (Concha / Aleoida)', value: 'Thin Water' },
    { label: 'Thin Oxygen (Electricae)', value: 'Thin Oxygen' },
    { label: 'No Atmosphere (Airless)', value: 'No atmosphere' }
  ];

  const VOLCANISM_PRESETS = [
    { label: 'None (Geologically Dead)', value: 'None' },
    { label: 'Water Geysers (Icy Cryovolcanism)', value: 'Water Geysers' },
    { label: 'Carbon Dioxide Geysers', value: 'Carbon Dioxide Geysers' },
    { label: 'Sulfur Dioxide Geysers', value: 'Sulfur Dioxide Geysers' },
    { label: 'Silicate Vapour Geysers', value: 'Silicate Vapour Geysers' }
  ];

  const PRESET_WORLDS = [
    {
      label: 'Stratum Jackpot HMC (CO2)',
      name: 'Bleia Eud KC-L d8-2 3 a',
      gravity: 0.38,
      temp: 215,
      atmo: 'Thin Carbon dioxide',
      volc: 'None',
      landable: true
    },
    {
      label: 'Fonticulua Cryo-Moon (Argon + Geysers)',
      name: 'Outotz ZY-F d12-1 4 b',
      gravity: 0.12,
      temp: 110,
      atmo: 'Thin Argon',
      volc: 'Water Geysers',
      landable: true
    },
    {
      label: 'Osseus Rocky World (Nitrogen)',
      name: 'Dryao Chrea GG-Y c14-7 1',
      gravity: 0.22,
      temp: 165,
      atmo: 'Thin Nitrogen',
      volc: 'None',
      landable: true
    },
    {
      label: 'High-G Airless Barren (Uninhabitable)',
      name: 'Synuefe PR-L c23-9 2',
      gravity: 1.85,
      temp: 450,
      atmo: 'No atmosphere',
      volc: 'None',
      landable: true
    }
  ];

  function applyWorldPreset(preset: typeof PRESET_WORLDS[0]) {
    currentBodyName = preset.name;
    gravityG = preset.gravity;
    surfaceTempK = preset.temp;
    atmosphereType = preset.atmo;
    volcanism = preset.volc;
    isLandable = preset.landable;
  }
</script>

<div class="space-y-4 font-mono text-xs text-zinc-200">
  <!-- Mode Selector Sub-Nav -->
  <div class="flex items-center justify-between border-b border-orange-500/30 pb-3">
    <div class="flex items-center space-x-2">
      <span class="text-xl">🧬</span>
      <div>
        <div class="text-sm font-bold text-orange-400 tracking-wider">
          EXOBIOLOGY VALUE PREDICTOR & VISTA GENOMICS CALCULATOR
        </div>
        <div class="text-[10px] text-zinc-400">
          Predictive habitat matrix &bull; 5x First Discovery multiplier &bull; Clonal distance alarms
        </div>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="flex items-center space-x-1 bg-black/60 p-1 rounded border border-orange-500/20">
      <button
        type="button"
        class="px-2.5 py-1 rounded text-[11px] transition-all {activeMode === 'PREDICTOR'
          ? 'bg-orange-500 text-black font-bold shadow-[0_0_8px_rgba(249,115,22,0.4)]'
          : 'text-zinc-400 hover:text-white'}"
        onclick={() => (activeMode = 'PREDICTOR')}
      >
        HABITAT PREDICTOR
      </button>

      <button
        type="button"
        class="px-2.5 py-1 rounded text-[11px] transition-all {activeMode === 'CALCULATOR'
          ? 'bg-orange-500 text-black font-bold shadow-[0_0_8px_rgba(249,115,22,0.4)]'
          : 'text-zinc-400 hover:text-white'}"
        onclick={() => (activeMode = 'CALCULATOR')}
      >
        VISTA PAYOUT CALC
      </button>

      <button
        type="button"
        class="px-2.5 py-1 rounded text-[11px] transition-all {activeMode === 'CATALOG'
          ? 'bg-orange-500 text-black font-bold shadow-[0_0_8px_rgba(249,115,22,0.4)]'
          : 'text-zinc-400 hover:text-white'}"
        onclick={() => (activeMode = 'CATALOG')}
      >
        SPECIES TAXONOMY
      </button>
    </div>
  </div>

  {#if activeMode === 'PREDICTOR'}
    <!-- MODE 1: HABITAT PREDICTOR -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- Left Column: Environmental Inputs & Presets (5 cols) -->
      <div class="lg:col-span-5 space-y-3">
        <!-- Planetary Archetypes -->
        <div class="bg-black/40 border border-orange-500/20 rounded p-2.5 space-y-1.5">
          <div class="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
            QUICK PLANETARY ARCHETYPE PRESETS:
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            {#each PRESET_WORLDS as preset}
              <button
                type="button"
                class="p-1.5 rounded bg-zinc-900/80 hover:bg-orange-950/40 border border-zinc-800 hover:border-orange-500/40 text-left transition-all"
                onclick={() => applyWorldPreset(preset)}
              >
                <div class="text-[10px] text-amber-300 font-bold truncate">{preset.label}</div>
                <div class="text-[9px] text-zinc-400 truncate">{preset.atmo} &bull; {preset.gravity}G</div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Environmental Parameter Sliders -->
        <div class="bg-black/50 border border-orange-500/20 rounded p-3 space-y-3">
          <div class="text-[10px] font-bold text-orange-400 uppercase tracking-wider border-b border-orange-500/20 pb-1">
            ENVIRONMENTAL TELEMETRY INPUTS
          </div>

          <!-- Body Name -->
          <div>
            <label for="exo-body-name" class="block text-[10px] text-zinc-400">PLANETARY BODY NAME:</label>
            <input
              id="exo-body-name"
              type="text"
              bind:value={currentBodyName}
              class="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 text-orange-300 px-2 py-1 rounded text-xs mt-1"
            />
          </div>

          <!-- Surface Gravity G -->
          <div>
            <div class="flex justify-between items-center text-[10px]">
              <label for="exo-gravity-slider" class="text-zinc-400">SURFACE GRAVITY:</label>
              <span class="text-cyan-300 font-bold">{gravityG.toFixed(2)} G</span>
            </div>
            <input
              id="exo-gravity-slider"
              type="range"
              min="0.01"
              max="2.5"
              step="0.01"
              bind:value={gravityG}
              class="w-full accent-orange-500 mt-1 cursor-pointer"
            />
            <div class="flex justify-between text-[9px] text-zinc-400">
              <span>0.01 G (Micro)</span>
              <span>0.40 G (Prime)</span>
              <span>2.50 G (Heavy)</span>
            </div>
          </div>

          <!-- Surface Temperature K -->
          <div>
            <div class="flex justify-between items-center text-[10px]">
              <label for="exo-temp-slider" class="text-zinc-400">SURFACE TEMPERATURE:</label>
              <span class="text-amber-300 font-bold">{surfaceTempK} K ({(surfaceTempK - 273.15).toFixed(0)}°C)</span>
            </div>
            <input
              id="exo-temp-slider"
              type="range"
              min="50"
              max="500"
              step="1"
              bind:value={surfaceTempK}
              class="w-full accent-amber-500 mt-1 cursor-pointer"
            />
            <div class="flex justify-between text-[9px] text-zinc-400">
              <span>50 K (Cryo)</span>
              <span>210 K (Goldilocks Bio)</span>
              <span>500 K (Scorched)</span>
            </div>
          </div>

          <!-- Atmosphere Selection -->
          <div>
            <label for="exo-atmo-select" class="block text-[10px] text-zinc-400">ATMOSPHERIC COMPOSITION:</label>
            <select
              id="exo-atmo-select"
              bind:value={atmosphereType}
              class="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 text-orange-300 px-2 py-1 rounded text-xs mt-1"
            >
              {#each ATMOSPHERE_PRESETS as preset}
                <option value={preset.value}>{preset.label}</option>
              {/each}
            </select>
          </div>

          <!-- Volcanism Selection -->
          <div>
            <label for="exo-volc-select" class="block text-[10px] text-zinc-400">GEOTHERMAL / VOLCANISM:</label>
            <select
              id="exo-volc-select"
              bind:value={volcanism}
              class="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 text-orange-300 px-2 py-1 rounded text-xs mt-1"
            >
              {#each VOLCANISM_PRESETS as preset}
                <option value={preset.value}>{preset.label}</option>
              {/each}
            </select>
          </div>

          <!-- Landable Toggle -->
          <div class="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span class="text-[10px] text-zinc-300">LANDABLE FOR ODYSSEY SURVEY:</span>
            <input
              type="checkbox"
              bind:checked={isLandable}
              class="accent-orange-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <!-- Right Column: Evaluation Matrix & Species Predictions (7 cols) -->
      <div class="lg:col-span-7 space-y-3">
        <!-- Summary Score Banner -->
        <div class="bg-black/60 border {evaluation.recommendation === 'HIGH_PRIORITY_SURVEY' ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : evaluation.recommendation === 'STANDARD_SURVEY' ? 'border-orange-500/40' : 'border-zinc-800'} rounded p-3">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-[10px] text-zinc-400 uppercase tracking-wider">PREDICTED SURVEY CLASSIFICATION</div>
              <div class="text-sm font-bold {evaluation.recommendation === 'HIGH_PRIORITY_SURVEY' ? 'text-emerald-400' : evaluation.recommendation === 'STANDARD_SURVEY' ? 'text-amber-400' : 'text-zinc-500'}">
                {evaluation.recommendation === 'HIGH_PRIORITY_SURVEY' ? '⚡ HIGH-VALUE BIO TARGET (JACKPOT DETECTED)' : evaluation.recommendation === 'STANDARD_SURVEY' ? '✓ VIABLE EXOBIOLOGY SURVEY SITE' : '✕ UNINHABITABLE / NEGLIGIBLE VALUE'}
              </div>
            </div>

            <!-- Expected Species Pill -->
            <div class="text-right">
              <div class="text-[10px] text-zinc-400">EXPECTED GENERA</div>
              <div class="text-lg font-bold text-cyan-400">{evaluation.predictedSpecies.length} CANDIDATES</div>
            </div>
          </div>

          <!-- Payout Projection -->
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-orange-500/20">
            <div class="p-2 rounded bg-black/40 border border-zinc-800">
              <div class="text-[10px] text-zinc-400">ESTIMATED BASE PAYOUT:</div>
              <div class="text-sm font-bold text-zinc-200">
                {(evaluation.totalEstimatedBasePayoutCr).toLocaleString()} CR
              </div>
            </div>

            <div class="p-2 rounded bg-emerald-950/30 border border-emerald-500/40">
              <div class="text-[10px] text-emerald-300 font-bold flex items-center space-x-1">
                <span>FIRST DISCOVERY (5x MULTIPLIER):</span>
                <span class="px-1 py-0.2 rounded bg-emerald-500/20 text-[9px]">BONUS</span>
              </div>
              <div class="text-base font-bold text-emerald-400">
                {(evaluation.totalEstimatedFirstDiscoveryCr).toLocaleString()} CR
              </div>
            </div>
          </div>
        </div>

        <!-- Predicted Species List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] text-orange-400/90 font-bold">
            <span>PREDICTED COMPATIBLE SPECIES ({evaluation.predictedSpecies.length}):</span>
            <span class="text-[10px] text-zinc-400 font-normal">Sorted by Environmental Probability</span>
          </div>

          {#if evaluation.predictedSpecies.length === 0}
            <div class="p-6 rounded bg-black/40 border border-zinc-800 text-center text-zinc-500">
              <div class="text-2xl mb-1">🪐</div>
              <div>No biological species match this planetary environmental envelope.</div>
              <div class="text-[10px] text-zinc-600 mt-1">
                {evaluation.ineligibilityReason || 'Adjust surface temperature, atmospheric chemistry, or check landability.'}
              </div>
            </div>
          {:else}
            <div class="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {#each evaluation.predictedSpecies as pred}
                <button
                  type="button"
                  class="w-full text-left p-2.5 rounded bg-zinc-950/80 border hover:border-orange-500/60 transition-all cursor-pointer {pred.isHighValueTarget ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-zinc-800'}"
                  onclick={() => {
                    inspectSpecies = pred;
                    onSelectSpecies?.(pred.species);
                  }}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="w-2.5 h-2.5 rounded-full" style="background-color: {pred.species.typicalColor}"></span>
                      <div>
                        <div class="font-bold text-zinc-100 flex items-center space-x-2">
                          <span>{pred.species.fullName}</span>
                          {#if pred.isHighValueTarget}
                            <span class="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              JACKPOT
                            </span>
                          {/if}
                        </div>
                        <div class="text-[10px] text-zinc-400">
                          {pred.species.sampleType} &bull; Min Clonal Separation: <span class="text-amber-300 font-bold">{pred.species.canonicalDistanceM}m</span>
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <div class="text-xs font-bold text-emerald-400">
                        {(pred.payoutFirstDiscoveryCr).toLocaleString()} CR
                      </div>
                      <div class="text-[10px] text-cyan-300">
                        Fit Confidence: <span class="font-bold">{pred.percentageFormatted}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Suitability Progress Bar -->
                  <div class="w-full bg-zinc-900 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      class="h-full rounded-full {pred.probability >= 0.8 ? 'bg-emerald-500' : pred.probability >= 0.5 ? 'bg-amber-500' : 'bg-cyan-500'}"
                      style="width: {pred.suitabilityScore}%"
                    ></div>
                  </div>

                  <!-- Matched Condition Badges -->
                  <div class="flex flex-wrap gap-1 mt-2">
                    {#each pred.matchedConditions.slice(0, 2) as condition}
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                        ✓ {condition}
                      </span>
                    {/each}
                    {#each pred.unmatchedWarnings.slice(0, 1) as warning}
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
                        ⚠ {warning}
                      </span>
                    {/each}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

  {:else if activeMode === 'CALCULATOR'}
    <!-- MODE 2: VISTA GENOMICS PAYOUT CALCULATOR -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- Left Config (5 cols) -->
      <div class="lg:col-span-5 bg-black/50 border border-orange-500/20 rounded p-4 space-y-4">
        <div class="text-xs font-bold text-orange-400 uppercase tracking-wider border-b border-orange-500/20 pb-1">
          GENOME SAMPLE CART ESTIMATOR
        </div>

        <!-- Species Selector -->
        <div class="space-y-1">
          <label for="exo-calc-species-select" class="block text-[10px] text-zinc-400">SELECT EXOBIOLOGY SPECIES:</label>
          <select
            id="exo-calc-species-select"
            bind:value={selectedCalculatorSpeciesId}
            class="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 text-orange-300 px-2 py-1.5 rounded text-xs"
          >
            {#each EXOBIOLOGY_SPECIES_CATALOG as sp}
              <option value={sp.id}>
                {sp.fullName} ({(sp.basePayoutCr / 1000000).toFixed(1)}M CR Base)
              </option>
            {/each}
          </select>
        </div>

        <!-- First Discovery Checkbox -->
        <div class="p-3 rounded bg-zinc-900/60 border border-orange-500/20 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-400">FIRST DISCOVERY BONUS</span>
            <input
              type="checkbox"
              bind:checked={calculatorFirstDiscovery}
              class="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>
          <p class="text-[10px] text-zinc-400 leading-relaxed">
            Grants an official <span class="text-emerald-300 font-bold">5x total multiplier</span> (1x Base + 4x First Logged Bonus) when submitted to Vista Genomics.
          </p>
        </div>

        <!-- Number of bodies / samples scanned -->
        <div class="space-y-1">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-zinc-400">NUMBER OF COLONY SYSTEM SCANS:</span>
            <span class="text-cyan-300 font-bold">{customSampleQuantity}</span>
          </div>
          <input
            type="number"
            min="1"
            max="100"
            bind:value={customSampleQuantity}
            class="w-full bg-zinc-950 border border-zinc-700 text-white px-2 py-1 rounded text-xs"
          />
        </div>

        <!-- Clonal Distance Reminder -->
        <div class="p-3 rounded bg-black/40 border border-cyan-500/30 text-[10px] space-y-1">
          <div class="font-bold text-cyan-300 flex items-center space-x-1">
            <span>📏 CLONAL SEPARATION ALERT:</span>
          </div>
          <div class="text-zinc-300">
            {calculatorResult.species.fullName} requires a minimum travel distance of:
          </div>
          <div class="text-base font-bold text-amber-300">
            {calculatorResult.species.canonicalDistanceM} METERS
          </div>
          <div class="text-zinc-400 text-[9px]">
            Sampling closer than this radius fails genomic divergence validation.
          </div>
        </div>
      </div>

      <!-- Right Result Ledger (7 cols) -->
      <div class="lg:col-span-7 bg-black/60 border border-emerald-500/30 rounded p-4 space-y-4">
        <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-500/20 pb-1">
          VISTA GENOMICS DISPATCH SLIP
        </div>

        <div class="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Specimen Classification:</span>
            <span class="font-bold text-white text-sm">{calculatorResult.species.fullName}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Specimen Type:</span>
            <span class="text-amber-300">{calculatorResult.species.sampleType}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">Vista Baseline Unit Value:</span>
            <span class="text-zinc-200">{(calculatorResult.baseUnit).toLocaleString()} CR</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">First Discovery Multiplier:</span>
            <span class="text-emerald-400 font-bold">{calculatorResult.multiplier}x Payout</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-zinc-400">First Discovery Bonus per Unit:</span>
            <span class="text-emerald-300 font-mono">{(calculatorResult.bonusUnit).toLocaleString()} CR</span>
          </div>
        </div>

        <!-- Total Payout Big Card -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-black border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <div class="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
            TOTAL VISTA GENOMICS PAYOUT CREDITS
          </div>
          <div class="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight mt-1">
            {(calculatorResult.totalBatch).toLocaleString()} CR
          </div>
          <div class="text-[10px] text-zinc-400 mt-1">
            Net payout for {customSampleQuantity} &times; {calculatorResult.species.fullName}
            {#if calculatorFirstDiscovery}
              (Includes {((calculatorResult.bonusUnit * customSampleQuantity)).toLocaleString()} CR first discovery bonus)
            {/if}
          </div>
        </div>

        <div class="text-[10px] text-zinc-400 leading-relaxed border-t border-zinc-800 pt-2">
          Note: Biological samples must be turned in at any Vista Genomics counter aboard Starports, Planetary Outposts, or Fleet Carriers. Death in-game prior to docking causes loss of unredeemed samples.
        </div>
      </div>
    </div>

  {:else}
    <!-- MODE 3: FULL TAXONOMY CATALOG & MINIMUM CLONAL DISTANCES -->
    <div class="space-y-3">
      <!-- Search and Filter Bar -->
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search species (e.g. Stratum, Fonticulua, Bacterium)..."
          bind:value={catalogSearchQuery}
          class="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 focus:border-orange-500 text-orange-300 px-3 py-1.5 rounded text-xs"
        />

        <select
          bind:value={catalogGenusFilter}
          class="bg-zinc-950 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-xs"
        >
          <option value="ALL">ALL GENERA</option>
          <option value="Stratum">STRATUM</option>
          <option value="Fonticulua">FONTICULUA</option>
          <option value="Tubus">TUBUS</option>
          <option value="Concha">CONCHA</option>
          <option value="Osseus">OSSEUS</option>
          <option value="Bacterium">BACTERIUM</option>
          <option value="Electricae">ELECTRICAE</option>
          <option value="Aleoida">ALEOIDA</option>
          <option value="Clypeus">CLYPEUS</option>
          <option value="Frutexa">FRUTEXA</option>
          <option value="Tussock">TUSSOCK</option>
          <option value="Recepta">RECEPTA</option>
        </select>
      </div>

      <!-- Catalog Table Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {#each filteredCatalog as sp}
          <div class="p-3 rounded bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 transition-all space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full" style="background-color: {sp.typicalColor}"></span>
                <span class="font-bold text-white text-xs">{sp.fullName}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold">
                {sp.canonicalDistanceM}m
              </span>
            </div>

            <p class="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
              {sp.notes}
            </p>

            <div class="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px]">
              <div>
                <span class="text-zinc-400">Base:</span>
                <span class="text-zinc-200 font-mono">{(sp.basePayoutCr / 1000000).toFixed(1)}M CR</span>
              </div>
              <div>
                <span class="text-emerald-400 font-bold">5x Bonus:</span>
                <span class="text-emerald-300 font-mono font-bold">{(sp.firstDiscoveryPayoutCr / 1000000).toFixed(1)}M CR</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
