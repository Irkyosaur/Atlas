<script lang="ts">
  // Location: atlas/client/src/lib/components/cockpit/ExobiologyDivergenceRing.svelte
  // Stage 12.4: Exobiology Colony Divergence Ring
  // Tracks user on-foot / SRV position relative to biological sample points,
  // displays real-time expanding distance ring vs required genus threshold (e.g., 150m, 500m, 800m, 1000m),
  // and signals glowing green divergence state once minimum clonal distance is achieved.

  import { onMount, onDestroy } from 'svelte';
  import {
    EXOBIOLOGY_GENUS_CATALOG,
    type ExobiologyGenusRecord,
    type BioSamplePoint,
  } from '$engine/flight_assist_engine';

  interface Props {
    selectedGenusKey?: string;
    onCompleteSpecies?: (genus: ExobiologyGenusRecord, totalPayoutCr: number) => void;
  }

  let {
    selectedGenusKey = 'stratum',
    onCompleteSpecies,
  }: Props = $props();

  let activeGenus = $state<ExobiologyGenusRecord>(
    EXOBIOLOGY_GENUS_CATALOG.find((g) => g.genusKey === selectedGenusKey) || EXOBIOLOGY_GENUS_CATALOG[0]
  );

  let currentSampleStep = $state<1 | 2 | 3>(1);
  let distanceTraveledM = $state<number>(0);
  let sampleHistory = $state<BioSamplePoint[]>([
    {
      sampleNumber: 1,
      latitude: -14.2851,
      longitude: 82.1092,
      xMeters: 0,
      yMeters: 0,
      timestamp: Date.now() - 45000,
    },
  ]);

  let isWalking = $state<boolean>(false);
  let walkTimer: any = null;
  let simulatedBearingDeg = $state<number>(45);

  function selectGenus(genus: ExobiologyGenusRecord) {
    activeGenus = genus;
    resetSampler();
  }

  function resetSampler() {
    currentSampleStep = 1;
    distanceTraveledM = 0;
    sampleHistory = [
      {
        sampleNumber: 1,
        latitude: -14.2851,
        longitude: 82.1092,
        xMeters: 0,
        yMeters: 0,
        timestamp: Date.now(),
      },
    ];
  }

  let requiredDistanceM = $derived<number>(activeGenus.canonicalDistanceM);
  let divergenceAchieved = $derived<boolean>(distanceTraveledM >= requiredDistanceM);
  let divergencePercent = $derived<number>(
    Math.min(100, Math.round((distanceTraveledM / requiredDistanceM) * 100))
  );

  function logNextSample() {
    if (!divergenceAchieved && currentSampleStep < 3) return;

    if (currentSampleStep === 1) {
      const rad = (simulatedBearingDeg * Math.PI) / 180;
      const x = Math.sin(rad) * distanceTraveledM;
      const y = Math.cos(rad) * distanceTraveledM;
      sampleHistory = [
        ...sampleHistory,
        {
          sampleNumber: 2,
          latitude: -14.2851 + y * 0.000009,
          longitude: 82.1092 + x * 0.000009,
          xMeters: x,
          yMeters: y,
          timestamp: Date.now(),
        },
      ];
      currentSampleStep = 2;
      distanceTraveledM = 0;
    } else if (currentSampleStep === 2) {
      const rad = ((simulatedBearingDeg + 30) * Math.PI) / 180;
      const x = Math.sin(rad) * distanceTraveledM;
      const y = Math.cos(rad) * distanceTraveledM;
      sampleHistory = [
        ...sampleHistory,
        {
          sampleNumber: 3,
          latitude: -14.2851 + y * 0.000009,
          longitude: 82.1092 + x * 0.000009,
          xMeters: x,
          yMeters: y,
          timestamp: Date.now(),
        },
      ];
      currentSampleStep = 3;
      isWalking = false;
      if (walkTimer) clearInterval(walkTimer);
      onCompleteSpecies?.(activeGenus, activeGenus.typicalValueCr);
    }
  }

  function toggleWalkSimulation() {
    if (isWalking) {
      isWalking = false;
      if (walkTimer) clearInterval(walkTimer);
    } else {
      isWalking = true;
      if (walkTimer) clearInterval(walkTimer);
      walkTimer = setInterval(() => {
        if (currentSampleStep < 3) {
          // simulate footsteps / SRV driving ~ 8 m/s
          distanceTraveledM = Math.round(distanceTraveledM + 6.5);
        }
      }, 100);
    }
  }

  onDestroy(() => {
    if (walkTimer) clearInterval(walkTimer);
  });

  // Calculate radar display coordinates (center = origin sample point)
  // Scale: ring radius = 65px representing requiredDistanceM
  let ringRadiusPx = 65;
  let playerRadiusPx = $derived<number>(
    Math.min(95, (distanceTraveledM / requiredDistanceM) * ringRadiusPx)
  );
  let playerX = $derived<number>(
    100 + Math.sin((simulatedBearingDeg * Math.PI) / 180) * playerRadiusPx
  );
  let playerY = $derived<number>(
    100 - Math.cos((simulatedBearingDeg * Math.PI) / 180) * playerRadiusPx
  );
</script>

<div class="exobio-divergence-ring bg-black/90 border border-emerald-500/40 rounded-lg p-3 font-mono text-white flex flex-col space-y-3 select-none">
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-emerald-500/30 pb-2">
    <div class="flex items-center space-x-2">
      <span class="w-2.5 h-2.5 rounded-full {divergenceAchieved ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-amber-400'}"></span>
      <span class="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
        EXOBIOLOGY DIVERGENCE RING
      </span>
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-500/30">
        VISTA GENOMICS
      </span>
    </div>

    <!-- Walk Sim & Reset Buttons -->
    <div class="flex items-center space-x-2">
      <button
        type="button"
        onclick={toggleWalkSimulation}
        class="text-[10px] px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 font-bold"
        title="Simulate Traversal (On-Foot / SRV)"
      >
        {isWalking ? '⏸ PAUSE WALK' : '🚶 SIM TRAVERSAL'}
      </button>

      <button
        type="button"
        onclick={resetSampler}
        class="text-[10px] px-2 py-0.5 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40"
        title="Reset Sampler"
      >
        ↺ RESET
      </button>
    </div>
  </div>

  <!-- Genus Selection Quick-Chips -->
  <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-thin">
    {#each EXOBIOLOGY_GENUS_CATALOG as genus}
      <button
        type="button"
        onclick={() => selectGenus(genus)}
        class="px-2 py-1 rounded border transition-all whitespace-nowrap shrink-0 {activeGenus.genusKey === genus.genusKey
          ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
          : 'bg-black/60 border-white/10 text-white/60 hover:text-white hover:border-white/30'}"
      >
        <span>{genus.genusName}</span>
        <span class="ml-1 opacity-70">({genus.canonicalDistanceM}m)</span>
      </button>
    {/each}
  </div>

  <!-- Divergence Status Banner -->
  <div
    class="px-3 py-2 rounded text-center border-2 transition-all {divergenceAchieved
      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.5)]'
      : 'bg-amber-500/15 border-amber-400/60 text-amber-200'}"
  >
    {#if currentSampleStep === 3}
      <div class="text-sm font-extrabold uppercase tracking-widest text-emerald-300">
        ✓ GENETIC DIVERSITY 3/3 LOGGED • CANISTER READY
      </div>
      <div class="text-[10px] font-bold text-white/80 mt-0.5">
        Species fully catalogued. Vista Genomics payout: {activeGenus.typicalValueCr.toLocaleString()} CR
      </div>
    {:else if divergenceAchieved}
      <div class="text-sm font-extrabold uppercase tracking-widest text-emerald-300 animate-pulse">
        ✓ VALID GENETIC DIVERGENCE REACHED ({distanceTraveledM}m ≥ {requiredDistanceM}m)
      </div>
      <div class="text-[10px] font-bold text-white/90 mt-0.5">
        Clonal radius cleared. Log sample #{currentSampleStep + 1} with Artemis Genetic Sampler.
      </div>
    {:else}
      <div class="text-xs font-bold uppercase tracking-wider text-amber-300">
        CLONAL ZONE: {distanceTraveledM}m / {requiredDistanceM}m ({divergencePercent}%)
      </div>
      <div class="text-[10px] text-white/70 mt-0.5">
        Travel {(requiredDistanceM - distanceTraveledM)}m more from previous sample before harvesting.
      </div>
    {/if}
  </div>

  <!-- Main Grid: Radar Ring & Sample Matrix -->
  <div class="grid grid-cols-12 gap-3 items-center">
    <!-- Left: Radar Ring SVG -->
    <div class="col-span-6 bg-[#030706] border border-emerald-500/30 rounded p-2 flex flex-col items-center justify-center relative">
      <div class="absolute top-1.5 left-2 text-[9px] text-emerald-400/80 font-bold">
        BEARING: {simulatedBearingDeg}°
      </div>

      <!-- SVG Compass & Distance Ring -->
      <svg viewBox="0 0 200 200" class="w-48 h-48">
        <!-- Background Grid Rings -->
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(16,185,129,0.15)" stroke-width="1" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(16,185,129,0.2)" stroke-width="1" stroke-dasharray="2 3" />
        <circle cx="100" cy="100" r="35" fill="none" stroke="rgba(16,185,129,0.15)" stroke-width="1" />

        <!-- Crosshair Axes -->
        <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(16,185,129,0.2)" stroke-width="1" />
        <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(16,185,129,0.2)" stroke-width="1" />

        <!-- Required Clonal Divergence Threshold Perimeter (r = 65) -->
        <circle
          cx="100"
          cy="100"
          r={ringRadiusPx}
          fill={divergenceAchieved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.06)'}
          stroke={divergenceAchieved ? '#10b981' : '#f59e0b'}
          stroke-width={divergenceAchieved ? '2.5' : '1.5'}
          stroke-dasharray={divergenceAchieved ? 'none' : '4 3'}
        />

        <!-- Origin Sample Point Marker (Sample #1 or #2) -->
        <circle cx="100" cy="100" r="5" fill="#f59e0b" />
        <text x="100" y="115" fill="#f59e0b" font-size="8" font-weight="bold" text-anchor="middle">
          SAMPLE #{currentSampleStep}
        </text>

        <!-- Dynamic Expanding Traversal Ring -->
        <circle
          cx="100"
          cy="100"
          r={playerRadiusPx}
          fill="none"
          stroke={divergenceAchieved ? '#10b981' : '#22d3ee'}
          stroke-width="1.5"
          opacity="0.8"
        />

        <!-- Traversal Vector Line to Player -->
        <line
          x1="100"
          y1="100"
          x2={playerX}
          y2={playerY}
          stroke={divergenceAchieved ? '#10b981' : '#22d3ee'}
          stroke-width="1.5"
          stroke-dasharray="2 2"
        />

        <!-- Current Player Position Pip -->
        <circle
          cx={playerX}
          cy={playerY}
          r="4.5"
          fill={divergenceAchieved ? '#10b981' : '#22d3ee'}
          class={divergenceAchieved ? 'animate-ping' : ''}
        />
        <circle
          cx={playerX}
          cy={playerY}
          r="4"
          fill={divergenceAchieved ? '#10b981' : '#22d3ee'}
        />

        <!-- Ring Label -->
        <text
          x="100"
          y={100 - ringRadiusPx - 4}
          fill={divergenceAchieved ? '#10b981' : '#f59e0b'}
          font-size="8"
          font-weight="bold"
          text-anchor="middle"
        >
          MIN DISTANCE: {requiredDistanceM}m
        </text>
      </svg>
    </div>

    <!-- Right: Telemetry Readout & Sample Step Progression -->
    <div class="col-span-6 space-y-2 text-[11px]">
      <div class="p-2 rounded bg-black border border-white/10 space-y-1">
        <div class="flex items-center justify-between text-white/70">
          <span>ACTIVE GENUS:</span>
          <span class="font-extrabold text-emerald-300">{activeGenus.genusName.toUpperCase()}</span>
        </div>
        <div class="flex items-center justify-between text-white/70">
          <span>SAMPLE TYPE:</span>
          <span class="text-cyan-300">{activeGenus.sampleType}</span>
        </div>
        <div class="flex items-center justify-between text-white/70">
          <span>VISTA PAYOUT:</span>
          <span class="font-bold text-[#FF7100]">{activeGenus.typicalValueCr.toLocaleString()} CR</span>
        </div>
        <div class="flex items-center justify-between text-white/70">
          <span>REQUIRED DISTANCE:</span>
          <span class="font-extrabold text-amber-300">{requiredDistanceM} METERS</span>
        </div>
      </div>

      <!-- 3-Step Sample Canister Progress -->
      <div class="p-2 rounded bg-black border border-emerald-500/30 space-y-1.5">
        <div class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
          GENETIC CANISTER SAMPLES (3 TOTAL)
        </div>

        <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          {#each [1, 2, 3] as step}
            <div
              class="p-1.5 rounded border {step <= sampleHistory.length
                ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 font-bold'
                : 'bg-black/50 border-white/10 text-white/40'}"
            >
              <div>SAMPLE #{step}</div>
              <div class="text-[9px] mt-0.5">
                {step <= sampleHistory.length ? 'LOGGED ✓' : 'PENDING'}
              </div>
            </div>
          {/each}
        </div>

        {#if currentSampleStep < 3}
          <button
            type="button"
            onclick={logNextSample}
            disabled={!divergenceAchieved}
            class="w-full mt-2 py-1.5 rounded font-extrabold text-xs uppercase tracking-wider transition-all {divergenceAchieved
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.6)] cursor-pointer'
              : 'bg-white/10 border border-white/20 text-white/40 cursor-not-allowed'}"
          >
            {divergenceAchieved ? `LOG SAMPLE #${currentSampleStep + 1} ✓` : `NEED +${requiredDistanceM - distanceTraveledM}m`}
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Traversal Distance Slider Override -->
  <div class="p-2 rounded bg-black/60 border border-white/10 flex items-center space-x-2 text-[10px]">
    <span class="text-white/60 shrink-0">TRAVELED:</span>
    <input
      type="range"
      min="0"
      max={requiredDistanceM * 1.5}
      step="5"
      bind:value={distanceTraveledM}
      class="flex-1 accent-emerald-500"
    />
    <span class="w-16 text-right font-bold {divergenceAchieved ? 'text-emerald-300' : 'text-amber-300'}">
      {distanceTraveledM} m
    </span>
  </div>
</div>
