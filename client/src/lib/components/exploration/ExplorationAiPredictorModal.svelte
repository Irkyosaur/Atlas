// Location: atlas/client/src/lib/components/exploration/ExplorationAiPredictorModal.svelte
// Stage 16.1: In-Browser Predictive AI Exploration Engine & Neural HUD Telemetry Modal

<script lang="ts">
  import { onMount } from 'svelte';
  import {
    explorationNeuralRuntime,
    SPECTRAL_CLASS_WEIGHTS
  } from '$engine/exploration_neural_runtime';
  import type {
    ExplorationInputFeatures,
    ExplorationPredictionResult,
    NeuralRuntimeStatus
  } from '$engine/neural_runtime_types';

  interface Props {
    isOpen?: boolean;
    referenceSystem?: string;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Sol',
    onClose
  }: Props = $props();

  // Input state
  let spectralClass = $state<string>('G');
  let starAgeMyr = $state<number>(4600);
  let starLuminosity = $state<number>(1.0);
  let metallicity = $state<number>(0.02);
  let habitableZoneInnerLs = $state<number>(450);
  let habitableZoneOuterLs = $state<number>(950);
  let totalBodies = $state<number>(28);
  let gasGiantsCount = $state<number>(4);

  // Runtime status & prediction
  let runtimeStatus = $state<NeuralRuntimeStatus>(explorationNeuralRuntime.getStatus());
  let prediction = $state<ExplorationPredictionResult | null>(null);
  let isEvaluating = $state<boolean>(false);
  let benchmarkRuns = $state<number[]>([]);
  let avgLatencyMs = $state<number>(0);

  import BodyProbabilityHudWidget from './BodyProbabilityHudWidget.svelte';
  import ExobiologyPredictorWidget from './ExobiologyPredictorWidget.svelte';
  import AstronomicalAnomalyWidget from './AstronomicalAnomalyWidget.svelte';

  // Modal view tab: neural network explorer vs. planetary body classifier vs. exobiology predictor vs. astronomical anomaly detector
  let activeTab = $state<'SYSTEM_AI' | 'BODY_CLASSIFIER' | 'EXOBIOLOGY' | 'ANOMALIES'>('SYSTEM_AI');

  const SPECTRAL_CLASSES = Object.keys(SPECTRAL_CLASS_WEIGHTS);

  // Preset Star System archetypes for quick evaluation
  const PRESET_SYSTEMS = [
    {
      label: 'Sol Archetype (G2V Main Sequence)',
      spectral: 'G',
      age: 4600,
      lum: 1.0,
      metal: 0.02,
      hzInner: 450,
      hzOuter: 950,
      bodies: 28,
      giants: 4
    },
    {
      label: 'Alpha Centauri A (G2V + High Metal)',
      spectral: 'G',
      age: 5300,
      lum: 1.5,
      metal: 0.22,
      hzInner: 550,
      hzOuter: 1150,
      bodies: 34,
      giants: 3
    },
    {
      label: 'Kepler-186 (M1V Red Dwarf Habitable)',
      spectral: 'M',
      age: 4000,
      lum: 0.04,
      metal: -0.26,
      hzInner: 90,
      hzOuter: 220,
      bodies: 18,
      giants: 1
    },
    {
      label: 'Trappist-1 (Ultra-Cool Dwarf 7 Terrestrial)',
      spectral: 'M',
      age: 7600,
      lum: 0.0005,
      metal: 0.04,
      hzInner: 15,
      hzOuter: 48,
      bodies: 7,
      giants: 0
    },
    {
      label: 'Eta Carinae Edge (F0V Hyper-Young Cluster)',
      spectral: 'F',
      age: 800,
      lum: 6.2,
      metal: 0.15,
      hzInner: 1100,
      hzOuter: 2400,
      bodies: 42,
      giants: 8
    }
  ];

  onMount(async () => {
    await explorationNeuralRuntime.init();
    runtimeStatus = explorationNeuralRuntime.getStatus();
    await runInference();
  });

  function applyPreset(preset: typeof PRESET_SYSTEMS[0]) {
    spectralClass = preset.spectral;
    starAgeMyr = preset.age;
    starLuminosity = preset.lum;
    metallicity = preset.metal;
    habitableZoneInnerLs = preset.hzInner;
    habitableZoneOuterLs = preset.hzOuter;
    totalBodies = preset.bodies;
    gasGiantsCount = preset.giants;
    runInference();
  }

  async function runInference() {
    isEvaluating = true;
    try {
      const input: ExplorationInputFeatures = {
        spectralClass,
        starAgeMyr,
        starLuminosity,
        metallicity,
        habitableZoneInnerLs,
        habitableZoneOuterLs,
        totalBodies,
        gasGiantsCount
      };

      prediction = await explorationNeuralRuntime.predict(input);
      runtimeStatus = explorationNeuralRuntime.getStatus();

      // Track benchmark latency window (last 10 runs)
      benchmarkRuns = [...benchmarkRuns.slice(-9), prediction.inferenceLatencyMs];
      avgLatencyMs = Number((benchmarkRuns.reduce((a, b) => a + b, 0) / benchmarkRuns.length).toFixed(2));
    } finally {
      isEvaluating = false;
    }
  }

  async function run100xBenchmark() {
    isEvaluating = true;
    const runs: number[] = [];
    const input: ExplorationInputFeatures = {
      spectralClass,
      starAgeMyr,
      starLuminosity,
      metallicity,
      habitableZoneInnerLs,
      habitableZoneOuterLs,
      totalBodies,
      gasGiantsCount
    };

    const startTotal = performance.now();
    for (let i = 0; i < 50; i++) {
      const res = await explorationNeuralRuntime.predict(input);
      runs.push(res.inferenceLatencyMs);
    }
    const totalTime = performance.now() - startTotal;
    benchmarkRuns = runs.slice(-10);
    avgLatencyMs = Number((totalTime / 50).toFixed(2));
    runtimeStatus = explorationNeuralRuntime.getStatus();
    isEvaluating = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
    <!-- Backdrop dismiss -->
    <button
      type="button"
      class="absolute inset-0 cursor-default"
      aria-label="Close Neural Engine Modal"
      onclick={() => {
        isOpen = false;
        onClose?.();
      }}
    ></button>

    <!-- Modal Container -->
    <div
      class="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl bg-zinc-950 border border-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.3)] text-zinc-100 overflow-hidden font-mono"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-zinc-900/60 to-zinc-950">
        <div class="flex items-center space-x-3">
          <span class="text-2xl animate-pulse">🧠</span>
          <div>
            <h2 class="text-base font-bold text-orange-400 tracking-wider flex items-center space-x-2">
              <span>EXPLORATION PREDICTIVE NEURAL RUNTIME</span>
              <span class="px-2 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                STAGE 16.1 ONNX WEB / WASM
              </span>
            </h2>
            <p class="text-xs text-zinc-400">
              In-Browser Deep Inference (<span class="text-amber-300">&lt;15MB</span> bundle footprint, WebGPU/WASM SIMD with Heuristic Fallback)
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Execution Provider Badge -->
          <div class="flex items-center space-x-2 px-3 py-1 rounded bg-black/60 border border-orange-500/30 text-xs">
            <span class="text-[10px] text-zinc-400 uppercase">PROVIDER:</span>
            <span class="font-bold text-emerald-400 uppercase tracking-wider">{runtimeStatus.activeProvider}</span>
            <span class="w-2 h-2 rounded-full {runtimeStatus.modelLoaded ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}"></span>
          </div>

          <button
            type="button"
            class="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      <!-- Tab Switcher Navigation -->
      <div class="flex items-center space-x-2 px-5 py-2.5 bg-black/60 border-b border-orange-500/20 text-xs">
        <button
          type="button"
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'SYSTEM_AI'
            ? 'bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)]'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'}"
          onclick={() => (activeTab = 'SYSTEM_AI')}
        >
          <span>🧠</span>
          <span>SYSTEM NEURAL VALUATION</span>
        </button>

        <button
          type="button"
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'BODY_CLASSIFIER'
            ? 'bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)]'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'}"
          onclick={() => (activeTab = 'BODY_CLASSIFIER')}
        >
          <span>🪐</span>
          <span>EARTH-LIKE & HIGH-VALUE BODY CLASSIFIER (STAGE 16.2)</span>
        </button>

        <button
          type="button"
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'EXOBIOLOGY'
            ? 'bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'}"
          onclick={() => (activeTab = 'EXOBIOLOGY')}
        >
          <span>🧬</span>
          <span>EXOBIOLOGY & VISTA GENOMICS (STAGE 16.3)</span>
        </button>

        <button
          type="button"
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'ANOMALIES'
            ? 'bg-fuchsia-500 text-black font-bold shadow-[0_0_12px_rgba(217,70,239,0.4)]'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'}"
          onclick={() => (activeTab = 'ANOMALIES')}
        >
          <span>✨</span>
          <span>ANOMALY & RARITY SCORER (STAGE 16.4)</span>
        </button>
      </div>

      <!-- Main Body Content -->
      {#if activeTab === 'ANOMALIES'}
        <div class="flex-1 overflow-y-auto p-5">
          <AstronomicalAnomalyWidget
            systemName={referenceSystem}
          />
        </div>
      {:else if activeTab === 'EXOBIOLOGY'}
        <div class="flex-1 overflow-y-auto p-5">
          <ExobiologyPredictorWidget
            systemName={referenceSystem}
            bodyName="{referenceSystem} 3 A"
            initialGravityG={0.32}
            initialTempK={215}
            initialAtmosphere="Thin Carbon dioxide"
            initialVolcanism="None"
            initialLandable={true}
          />
        </div>
      {:else if activeTab === 'BODY_CLASSIFIER'}
        <div class="flex-1 overflow-y-auto p-5">
          <BodyProbabilityHudWidget
            systemName={referenceSystem}
            spectralClass={spectralClass}
            luminositySolar={starLuminosity}
            massSolar={1.0}
            initialDistanceLs={habitableZoneInnerLs}
          />
        </div>
      {:else}
      <!-- Main Body Grid (Stage 16.1 System AI) -->
      <div class="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Left Column: Input Features & System Sliders (5 cols) -->
        <div class="lg:col-span-5 space-y-4">
          <!-- Quick Presets -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-orange-400/90 tracking-wide">
              LOAD STAR SYSTEM ARCHETYPE PRESET:
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each PRESET_SYSTEMS as preset}
                <button
                  type="button"
                  class="px-2.5 py-1 text-[11px] rounded bg-zinc-900 hover:bg-orange-500/20 border border-zinc-700 hover:border-orange-500/40 text-zinc-300 hover:text-orange-300 transition-colors text-left"
                  onclick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              {/each}
            </div>
          </div>

          <!-- Feature Form -->
          <div class="p-4 rounded-lg bg-black/40 border border-zinc-800 space-y-3.5">
            <div class="text-xs font-bold text-zinc-300 border-b border-zinc-800 pb-2 flex justify-between items-center">
              <span>FSS STELLAR TELEMETRY INPUTS</span>
              <span class="text-[10px] text-zinc-500 font-normal">8-D Normalized Vector</span>
            </div>

            <!-- Spectral Class -->
            <div class="grid grid-cols-2 gap-3 items-center">
              <label for="fss-spectral-class" class="text-xs text-zinc-400">Primary Star Spectral:</label>
              <select
                id="fss-spectral-class"
                bind:value={spectralClass}
                onchange={runInference}
                class="bg-zinc-900 border border-orange-500/40 text-orange-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-orange-400"
              >
                {#each SPECTRAL_CLASSES as sClass}
                  <option value={sClass}>{sClass} Class Star</option>
                {/each}
              </select>
            </div>

            <!-- Star Age -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <label for="fss-star-age" class="text-zinc-400">Stellar System Age:</label>
                <span class="text-amber-400 font-bold">{starAgeMyr.toLocaleString()} Myr</span>
              </div>
              <input
                id="fss-star-age"
                type="range"
                min="100"
                max="12000"
                step="100"
                bind:value={starAgeMyr}
                oninput={runInference}
                class="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <!-- Star Luminosity -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <label for="fss-luminosity" class="text-zinc-400">Solar Luminosity (L☉):</label>
                <span class="text-amber-400 font-bold">{starLuminosity.toFixed(2)} L☉</span>
              </div>
              <input
                id="fss-luminosity"
                type="range"
                min="0.001"
                max="15.0"
                step="0.05"
                bind:value={starLuminosity}
                oninput={runInference}
                class="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <!-- Habitable Zone Inner / Outer -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label for="fss-hz-inner" class="text-[11px] text-zinc-400">HZ Inner (Ls):</label>
                <input
                  id="fss-hz-inner"
                  type="number"
                  bind:value={habitableZoneInnerLs}
                  oninput={runInference}
                  class="w-full bg-zinc-900 border border-zinc-700 text-xs px-2 py-1 rounded text-zinc-200"
                />
              </div>
              <div class="space-y-1">
                <label for="fss-hz-outer" class="text-[11px] text-zinc-400">HZ Outer (Ls):</label>
                <input
                  id="fss-hz-outer"
                  type="number"
                  bind:value={habitableZoneOuterLs}
                  oninput={runInference}
                  class="w-full bg-zinc-900 border border-zinc-700 text-xs px-2 py-1 rounded text-zinc-200"
                />
              </div>
            </div>

            <!-- Total Bodies & Gas Giants -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label for="fss-total-bodies" class="text-[11px] text-zinc-400">FSS Honk Bodies:</label>
                <input
                  id="fss-total-bodies"
                  type="number"
                  min="1"
                  max="120"
                  bind:value={totalBodies}
                  oninput={runInference}
                  class="w-full bg-zinc-900 border border-zinc-700 text-xs px-2 py-1 rounded text-zinc-200"
                />
              </div>
              <div class="space-y-1">
                <label for="fss-gas-giants" class="text-[11px] text-zinc-400">Gas Giants:</label>
                <input
                  id="fss-gas-giants"
                  type="number"
                  min="0"
                  max="20"
                  bind:value={gasGiantsCount}
                  oninput={runInference}
                  class="w-full bg-zinc-900 border border-zinc-700 text-xs px-2 py-1 rounded text-zinc-200"
                />
              </div>
            </div>

            <!-- Run Benchmark Button -->
            <div class="pt-2 flex items-center justify-between">
              <button
                type="button"
                disabled={isEvaluating}
                onclick={runInference}
                class="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {isEvaluating ? 'COMPUTING...' : '⚡ PREDICT'}
              </button>

              <button
                type="button"
                disabled={isEvaluating}
                onclick={run100xBenchmark}
                class="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-orange-500/30 text-orange-300 text-xs transition-colors"
                title="Execute 50 consecutive inference cycles to measure sub-50ms latency"
              >
                ⏱️ BENCHMARK 50x
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Predictive Inferences & Valuation Telemetry (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Valuation Overview Card -->
          {#if prediction}
            <div class="p-4 rounded-lg bg-gradient-to-br from-zinc-900 to-black border border-orange-500/40 relative overflow-hidden">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-[10px] text-zinc-400 uppercase tracking-widest">ESTIMATED SYSTEM VALUATION</div>
                  <div class="text-3xl font-extrabold text-amber-300 tracking-tight">
                    {prediction.valuation.estimatedPayoutCredits.toLocaleString()} <span class="text-sm font-bold text-orange-400">CR</span>
                  </div>
                  <div class="text-xs text-zinc-400 mt-1">
                    Goldilocks Scan Band: <span class="text-zinc-200 font-bold">{prediction.valuation.recommendedScanBand}</span>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-[10px] text-zinc-400 uppercase tracking-widest">RARITY TIER</div>
                  <span class="inline-block mt-1 px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider {
                    prediction.valuation.systemRarityTier === 'LEGENDARY' ? 'bg-purple-900/40 text-purple-300 border border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.4)]' :
                    prediction.valuation.systemRarityTier === 'EXOTIC' ? 'bg-amber-900/40 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
                    prediction.valuation.systemRarityTier === 'RARE' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/60' :
                    prediction.valuation.systemRarityTier === 'UNCOMMON' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/60' :
                    'bg-zinc-800 text-zinc-400'
                  }">
                    ★ {prediction.valuation.systemRarityTier}
                  </span>
                </div>
              </div>
            </div>

            <!-- Probability Bars -->
            <div class="p-4 rounded-lg bg-black/40 border border-zinc-800 space-y-3">
              <div class="text-xs font-bold text-zinc-300 border-b border-zinc-800 pb-2 flex justify-between items-center">
                <span>PREDICTIVE CLASSIFIER PROBABILITIES</span>
                <span class="text-[10px] text-zinc-500">Neural Softmax / Sigmoid Outputs</span>
              </div>

              <!-- Earth-Like World (ELW) -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-emerald-400">🌍</span>
                    <span class="text-zinc-300 font-bold">Earth-Like World (ELW)</span>
                  </span>
                  <span class="text-emerald-400 font-bold">{(prediction.probabilities.elwProbability * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    class="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-300"
                    style="width: {prediction.probabilities.elwProbability * 100}%"
                  ></div>
                </div>
              </div>

              <!-- Terraformable Candidates -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-cyan-400">🌐</span>
                    <span class="text-zinc-300 font-bold">Terraformable Candidates (HMC / Water)</span>
                  </span>
                  <span class="text-cyan-400 font-bold">{(prediction.probabilities.terraformableProbability * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    class="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-300"
                    style="width: {prediction.probabilities.terraformableProbability * 100}%"
                  ></div>
                </div>
              </div>

              <!-- Water World -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-blue-400">💧</span>
                    <span class="text-zinc-300 font-bold">Water World</span>
                  </span>
                  <span class="text-blue-400 font-bold">{(prediction.probabilities.waterWorldProbability * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    class="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-300"
                    style="width: {prediction.probabilities.waterWorldProbability * 100}%"
                  ></div>
                </div>
              </div>

              <!-- Ammonia World -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-amber-400">🧪</span>
                    <span class="text-zinc-300 font-bold">Ammonia World (Thargoid Candidate)</span>
                  </span>
                  <span class="text-amber-400 font-bold">{(prediction.probabilities.ammoniaWorldProbability * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    class="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-300"
                    style="width: {prediction.probabilities.ammoniaWorldProbability * 100}%"
                  ></div>
                </div>
              </div>

              <!-- High-Value Bio Signatures -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-green-400">🌱</span>
                    <span class="text-zinc-300 font-bold">High-Value Exobiology Signatures (&gt;10M CR)</span>
                  </span>
                  <span class="text-green-400 font-bold">{(prediction.probabilities.highValueBioProbability * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    class="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-300"
                    style="width: {prediction.probabilities.highValueBioProbability * 100}%"
                  ></div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Latency & Model Diagnostics -->
          <div class="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between text-xs">
            <div class="space-y-0.5">
              <div class="text-[10px] text-zinc-400 uppercase">INFERENCE LATENCY (TARGET &lt;50ms)</div>
              <div class="font-bold text-emerald-400 flex items-center space-x-2">
                <span>⚡ {prediction?.inferenceLatencyMs ?? 0} ms</span>
                <span class="text-[11px] text-zinc-400 font-normal">| Avg (50x): {avgLatencyMs} ms</span>
              </div>
            </div>

            <div class="text-right space-y-0.5">
              <div class="text-[10px] text-zinc-400 uppercase">BUNDLE & MODEL CACHE</div>
              <div class="text-zinc-300 font-mono text-[11px]">
                {runtimeStatus.modelSizeBytes > 0 ? (runtimeStatus.modelSizeBytes / 1024).toFixed(1) + ' KB (ONNX)' : 'Embedded Heuristic Engine'}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/if}

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-orange-500/30 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
        <div>
          Atlas Neural Exploration Suite • Offline IndexedDB Caching • 100% Client-Side In-Browser
        </div>
        <div class="flex items-center space-x-3 text-zinc-400">
          <span>Inferences: <strong class="text-orange-400">{runtimeStatus.totalInferences}</strong></span>
          <span>WebGPU: <strong class={runtimeStatus.isWebGpuAvailable ? 'text-emerald-400' : 'text-zinc-500'}>{runtimeStatus.isWebGpuAvailable ? 'ACTIVE' : 'N/A'}</strong></span>
          <span>SIMD: <strong class={runtimeStatus.isSimdAvailable ? 'text-emerald-400' : 'text-zinc-500'}>{runtimeStatus.isSimdAvailable ? 'SUPPORTED' : 'OFFLINE'}</strong></span>
        </div>
      </div>
    </div>
  </div>
{/if}
