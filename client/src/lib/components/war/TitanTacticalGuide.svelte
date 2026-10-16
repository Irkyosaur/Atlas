<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    CANONICAL_TITAN_ANATOMY,
    CANONICAL_TITAN_VENTS,
    RECOMMENDED_TITAN_BUILDS,
    RECOMMENDED_AX_WEAPONS,
    calculateCausticMitigation,
    tickVentMetronome,
    evaluateConvergenceRating,
    type TitanVentRecord,
    type RecommendedAXBuild,
    type VentMetronomeState,
  } from '$engine/titan_tactical_engine';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let {
    isOpen = true,
    onClose,
  }: Props = $props();

  // Active view tab within Titan Guide
  let activeTab = $state<'schematic' | 'metronome' | 'caustic' | 'builds'>('schematic');

  // Selected vent for schematic inspection
  let selectedVent = $state<TitanVentRecord>(CANONICAL_TITAN_VENTS[0]);

  // Metronome state
  let metronomeState = $state<VentMetronomeState>({
    currentPhase: 'VENT_OPEN',
    phaseRemainingSec: 25.0,
    phaseDurationSec: 25.0,
    cycleCount: 1,
    activeVentTarget: 1,
    damageWindowActive: false,
  });

  let metronomeActive = $state<boolean>(true);
  let metronomeInterval: ReturnType<typeof setInterval> | null = null;

  // Caustic Calculator state
  let calcHullArmor = $state<number>(3850);
  let calcCausticResist = $state<number>(15);
  let calcSinkLaunchers = $state<number>(1);
  let calcSynthAmmo = $state<number>(2);
  let calcInInnerCloud = $state<boolean>(true);

  // Recommended Build selection
  let selectedBuild = $state<RecommendedAXBuild>(RECOMMENDED_TITAN_BUILDS[0]);

  const causticResult = $derived(
    calculateCausticMitigation({
      hullArmor: calcHullArmor,
      causticResistancePct: calcCausticResist,
      causticSinkLaunchersCount: calcSinkLaunchers,
      synthAmmoAvailable: calcSynthAmmo,
      inInnerCoreCloud: calcInInnerCloud,
    })
  );

  const convergenceVerdict = $derived(evaluateConvergenceRating(selectedBuild.weapons));

  onMount(() => {
    metronomeInterval = setInterval(() => {
      if (metronomeActive) {
        metronomeState = tickVentMetronome(metronomeState, 0.2);
        // keep selectedVent synchronized with active metronome target if matching
        if (metronomeState.currentPhase === 'VENT_OPEN' || metronomeState.currentPhase === 'VENT_SABOTAGED') {
          const match = CANONICAL_TITAN_VENTS.find((v) => v.id === metronomeState.activeVentTarget);
          if (match) selectedVent = match;
        }
      }
    }, 200);
  });

  onDestroy(() => {
    if (metronomeInterval) clearInterval(metronomeInterval);
  });

  function getPhaseColor(phase: VentMetronomeState['currentPhase']): string {
    switch (phase) {
      case 'APPROACH':
        return 'text-blue-400 border-blue-500/50 bg-blue-950/40';
      case 'VENT_OPEN':
        return 'text-amber-400 border-amber-500/50 bg-amber-950/40 animate-pulse';
      case 'VENT_SABOTAGED':
        return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
      case 'HEART_EXPOSED':
        return 'text-red-400 border-red-500/70 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse';
      case 'COOLDOWN':
        return 'text-stone-400 border-stone-600/50 bg-stone-900/40';
    }
  }

  function getVentStatusColor(status: TitanVentRecord['status']): string {
    switch (status) {
      case 'ACTIVE_DISSIPATING':
        return 'fill-amber-400 stroke-amber-300';
      case 'CHARGING':
        return 'fill-orange-500 stroke-orange-400';
      case 'SABOTAGED_EXHAUSTED':
        return 'fill-purple-600 stroke-purple-400';
      case 'DORMANT':
      default:
        return 'fill-stone-700 stroke-stone-600';
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono select-none">
    <!-- Window Container -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950/95 border border-[var(--hud-orange)]/70 rounded-lg shadow-[0_0_40px_rgba(255,113,0,0.22)] text-stone-200 overflow-hidden"
    >
      <!-- Title Header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-black/60 shrink-0">
        <div class="flex items-center space-x-3">
          <span class="text-2xl">🎯</span>
          <div>
            <h2 class="text-base sm:text-lg font-bold tracking-wider text-[var(--hud-orange)] uppercase flex items-center gap-2">
              TITAN TACTICAL SABOTAGE & CAUSTIC NAVIGATION GUIDE
              <span class="text-xs px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-400 bg-emerald-950/30">
                STAGE 14.2
              </span>
            </h2>
            <p class="text-xs text-stone-400">
              Interactive 3D/2D Titan Anatomy Schematic • Synchronized Thermal Vent Metronome • Caustic Hull Melting & AX Convergence
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Active Titan indicator -->
          <span class="px-2.5 py-1 text-xs rounded border border-red-500/50 bg-red-950/40 text-red-300 font-bold">
            TARGET: {CANONICAL_TITAN_ANATOMY.titanName}
          </span>
          <button
            type="button"
            class="p-1 rounded text-stone-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 transition-all"
            onclick={() => onClose?.()}
            title="Close Tactical Guide"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      <!-- Navigation Bar -->
      <div class="flex items-center justify-between px-5 py-2.5 bg-black/40 border-b border-stone-800 shrink-0">
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'schematic' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'schematic')}
          >
            TITAN ANATOMY SCHEMATIC
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'metronome' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'metronome')}
          >
            VENT METRONOME & HEART TIMER
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'caustic' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'caustic')}
          >
            CAUSTIC MITIGATION CALCULATOR
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'builds' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'builds')}
          >
            RECOMMENDED AX BUILDS & WEAPONS
          </button>
        </div>

        <!-- Quick Status readout -->
        <div class="hidden sm:flex items-center space-x-3 text-xs">
          <span class="text-stone-400">HEART #7 HEALTH:</span>
          <span class="text-red-400 font-bold">{CANONICAL_TITAN_ANATOMY.activeHeart.currentHealthPct}%</span>
          <span class="text-stone-600">|</span>
          <span class="text-stone-400">METRONOME:</span>
          <span class="font-bold {metronomeState.damageWindowActive ? 'text-red-400 animate-pulse' : 'text-amber-400'}">
            {metronomeState.currentPhase} ({metronomeState.phaseRemainingSec.toFixed(1)}s)
          </span>
        </div>
      </div>

      <!-- Main Body Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        {#if activeTab === 'schematic'}
          <!-- 3D/2D Titan Anatomy Schematic -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Tactical Interactive SVG Model -->
            <div class="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-lg bg-black/60 border border-stone-800">
              <div class="w-full flex items-center justify-between mb-2">
                <span class="text-xs text-amber-400 uppercase font-bold tracking-wider">
                  RADIAL CROSS-SECTION // CORE & 8 DISSIPATION VENTS
                </span>
                <span class="text-[10px] text-stone-400">Click a vent node (1-8) to lock attack vector</span>
              </div>

              <!-- SVG Schematic -->
              <svg viewBox="0 0 500 500" class="w-full max-w-[420px] aspect-square">
                <!-- Background grid lines -->
                <circle cx="250" cy="250" r="230" fill="none" stroke="#22c55e" stroke-width="1" stroke-dasharray="3,3" opacity="0.2" />
                <circle cx="250" cy="250" r="180" fill="none" stroke="#eab308" stroke-width="1.2" stroke-dasharray="4,4" opacity="0.4" />
                <circle cx="250" cy="250" r="110" fill="none" stroke="#f97316" stroke-width="1.5" opacity="0.6" />

                <!-- Outer Caustic Cloud Asteroid Belt -->
                <circle cx="250" cy="250" r="220" fill="rgba(34, 197, 94, 0.04)" stroke="rgba(34, 197, 94, 0.3)" stroke-width="12" stroke-dasharray="10 5" />
                <text x="250" y="38" text-anchor="middle" fill="#4ade80" font-size="9" letter-spacing="1">
                  MAELSTROM ASTEROID BELT (35-55 KM)
                </text>

                <!-- Inner Caustic Torus -->
                <circle cx="250" cy="250" r="140" fill="rgba(234, 179, 8, 0.05)" stroke="rgba(234, 179, 8, 0.4)" stroke-width="16" stroke-dasharray="2 4" />
                <text x="250" y="125" text-anchor="middle" fill="#facc15" font-size="8" letter-spacing="1">
                  CAUSTIC TORUS (15 KM)
                </text>

                <!-- Titan Hull Biomechanical Shell -->
                <polygon
                  points="250,170 300,190 325,235 320,285 275,320 225,320 180,285 175,235 200,190"
                  fill="#1c1917"
                  stroke="#fb923c"
                  stroke-width="2"
                  opacity="0.9"
                />

                <!-- Central Vulnerable Heart -->
                <circle
                  cx="250"
                  cy="250"
                  r={metronomeState.damageWindowActive ? "34" : "24"}
                  fill={metronomeState.damageWindowActive ? "#ef4444" : "#7f1d1d"}
                  stroke="#f87171"
                  stroke-width={metronomeState.damageWindowActive ? "4" : "2"}
                  class="transition-all duration-300 cursor-pointer"
                />
                <text x="250" y="254" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold">
                  {metronomeState.damageWindowActive ? "HEART OPEN!" : "CORE #7"}
                </text>

                <!-- 8 Radial Vents -->
                {#each CANONICAL_TITAN_VENTS as vent}
                  {@const rad = ((vent.angleDeg - 90) * Math.PI) / 180}
                  {@const vx = 250 + 85 * Math.cos(rad)}
                  {@const vy = 250 + 85 * Math.sin(rad)}
                  {@const lx = 250 + 105 * Math.cos(rad)}
                  {@const ly = 250 + 105 * Math.sin(rad)}
                  {@const isSelected = selectedVent.id === vent.id}
                  {@const isMetronomeTarget = metronomeState.activeVentTarget === vent.id}

                  <!-- Vent node line to core -->
                  <line x1="250" y1="250" x2={vx} y2={vy} stroke="#44403c" stroke-width="1.5" />

                  <!-- Vent Circle Button -->
                  <g
                    class="cursor-pointer"
                    role="button"
                    tabindex="0"
                    onclick={() => (selectedVent = vent)}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        selectedVent = vent;
                      }
                    }}
                    aria-label="Select {vent.name}"
                  >
                    {#if isSelected || isMetronomeTarget}
                      <circle
                        cx={vx}
                        cy={vy}
                        r="16"
                        fill="none"
                        stroke={isMetronomeTarget ? "#f59e0b" : "#38bdf8"}
                        stroke-width="2"
                        stroke-dasharray="3 2"
                        class="animate-spin origin-center"
                      />
                    {/if}
                    <circle
                      cx={vx}
                      cy={vy}
                      r="10"
                      class="{getVentStatusColor(vent.status)} transition-all hover:scale-125"
                    />
                    <text x={vx} y={vy + 3} text-anchor="middle" fill="#000" font-size="8" font-weight="bold">
                      {vent.id}
                    </text>
                    <text x={lx} y={ly + 3} text-anchor="middle" fill="#a8a29e" font-size="7">
                      {vent.angleDeg}°
                    </text>
                  </g>
                {/each}
              </svg>
            </div>

            <!-- Vent Dossier & Attack Flight Plan -->
            <div class="lg:col-span-5 flex flex-col justify-between p-4 rounded-lg bg-zinc-900/60 border border-stone-800 space-y-4">
              <div>
                <div class="flex items-center justify-between pb-2 border-b border-stone-700">
                  <h3 class="text-sm font-bold text-[var(--hud-orange)] uppercase">
                    THERMAL VENT #{selectedVent.id}: {selectedVent.name}
                  </h3>
                  <span class="px-2 py-0.5 text-[10px] rounded border font-bold uppercase {selectedVent.status === 'ACTIVE_DISSIPATING' ? 'border-amber-500/50 text-amber-300 bg-amber-950/40' : 'border-stone-700 text-stone-400 bg-black/40'}">
                    {selectedVent.status}
                  </span>
                </div>

                <div class="mt-3 space-y-2.5 text-xs">
                  <div class="flex justify-between py-1 border-b border-stone-800">
                    <span class="text-stone-400">Radial Angular Coordinate:</span>
                    <span class="font-bold text-amber-400">{selectedVent.angleDeg}° Azimuth</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-stone-800">
                    <span class="text-stone-400">Heat Dissipation Level:</span>
                    <span class="font-bold {selectedVent.heatDissipationPct >= 80 ? 'text-red-400' : 'text-stone-300'}">
                      {selectedVent.heatDissipationPct}%
                    </span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-stone-800">
                    <span class="text-stone-400">Recommended Flight Vector:</span>
                    <span class="font-bold text-cyan-300">{selectedVent.recommendedAttackVector}</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-stone-800">
                    <span class="text-stone-400">Munition Requirement:</span>
                    <span class="font-bold text-emerald-400">1x Nanite Torpedo Pylon</span>
                  </div>
                </div>

                <!-- Tactical instructions box -->
                <div class="mt-4 p-3 rounded bg-black/50 border border-amber-500/30 text-xs space-y-1.5 text-stone-300">
                  <span class="text-amber-400 font-bold block uppercase tracking-wider text-[11px]">
                    ✈️ INGRESS PROTOCOL:
                  </span>
                  <p>1. Keep throttle at boost speed through outer caustic cloud until entering the asteroid safe zone.</p>
                  <p>2. Drop thermal signature below 20% using Sirius Heat Sinks before approaching the dorsal torus.</p>
                  <p>3. Align crosshairs with Vent #{selectedVent.id}. Wait for heat plume to flash yellow/orange.</p>
                  <p>4. Deploy Nanite Torpedo from 2,000m. Once sabotaged, divert full throttle to the Central Heart.</p>
                </div>
              </div>

              <!-- Vent selection strip -->
              <div class="pt-3 border-t border-stone-800">
                <span class="text-[10px] text-stone-400 block mb-1.5 uppercase">Direct Vent Selector:</span>
                <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {#each CANONICAL_TITAN_VENTS as v}
                    <button
                      type="button"
                      class="px-2 py-1 text-xs rounded border text-center font-bold {selectedVent.id === v.id ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)]' : 'bg-black/60 text-stone-300 border-stone-700 hover:border-stone-500'}"
                      onclick={() => (selectedVent = v)}
                    >
                      #{v.id}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'metronome'}
          <!-- Vent Cycle Metronome & Synchronized Timer -->
          <div class="p-5 rounded-lg bg-black/60 border border-stone-800 space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-[var(--hud-orange)] uppercase">
                  SYNCHRONIZED THERMAL VENT METRONOME
                </h3>
                <p class="text-xs text-stone-400">
                  Real-time audio/visual combat cadence for Nanite Vent Sabotage and Central Heart Damage Windows.
                </p>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded border font-bold transition-all {metronomeActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/60' : 'bg-stone-800 text-stone-400 border-stone-700'}"
                  onclick={() => (metronomeActive = !metronomeActive)}
                >
                  {metronomeActive ? '⏸ PAUSE METRONOME' : '▶ RESUME CADENCE'}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500"
                  onclick={() => {
                    metronomeState = {
                      currentPhase: 'VENT_OPEN',
                      phaseRemainingSec: 25.0,
                      phaseDurationSec: 25.0,
                      cycleCount: 1,
                      activeVentTarget: 1,
                      damageWindowActive: false,
                    };
                  }}
                >
                  RESET
                </button>
              </div>
            </div>

            <!-- Giant Metronome Stage Banner -->
            <div class="p-6 rounded-lg border flex flex-col items-center justify-center space-y-2 {getPhaseColor(metronomeState.currentPhase)}">
              <span class="text-xs uppercase tracking-widest font-bold opacity-80">
                CURRENT COMBAT STAGE // CYCLE #{metronomeState.cycleCount}
              </span>
              <div class="text-3xl sm:text-5xl font-black tracking-wider uppercase font-mono">
                {metronomeState.currentPhase.replace('_', ' ')}
              </div>
              <div class="text-xl sm:text-2xl font-bold font-mono">
                {metronomeState.phaseRemainingSec.toFixed(1)}s REMAINING
              </div>

              <!-- Phase Progress Bar -->
              <div class="w-full max-w-md h-3 bg-black/60 rounded-full overflow-hidden mt-3 border border-white/20">
                <div
                  class="h-full bg-current transition-all duration-200"
                  style="width: {((metronomeState.phaseDurationSec - metronomeState.phaseRemainingSec) / metronomeState.phaseDurationSec) * 100}%"
                ></div>
              </div>
            </div>

            <!-- Sequence Step Indicators -->
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div class="p-3 rounded border text-xs {metronomeState.currentPhase === 'APPROACH' ? 'border-blue-500 bg-blue-950/40 text-blue-300' : 'border-stone-800 bg-zinc-900/40 text-stone-500'}">
                <span class="block font-bold mb-1">1. APPROACH (15s)</span>
                <span>Cold Torus transit. Drop heat &lt;20%.</span>
              </div>
              <div class="p-3 rounded border text-xs {metronomeState.currentPhase === 'VENT_OPEN' ? 'border-amber-500 bg-amber-950/40 text-amber-300' : 'border-stone-800 bg-zinc-900/40 text-stone-500'}">
                <span class="block font-bold mb-1">2. VENT OPEN (25s)</span>
                <span>Active Target: <strong>Vent #{metronomeState.activeVentTarget}</strong>. Fire Nanites.</span>
              </div>
              <div class="p-3 rounded border text-xs {metronomeState.currentPhase === 'VENT_SABOTAGED' ? 'border-purple-500 bg-purple-950/40 text-purple-300' : 'border-stone-800 bg-zinc-900/40 text-stone-500'}">
                <span class="block font-bold mb-1">3. DESTABILIZING (8s)</span>
                <span>Vents plugged. Core heat building up.</span>
              </div>
              <div class="p-3 rounded border text-xs {metronomeState.currentPhase === 'HEART_EXPOSED' ? 'border-red-500 bg-red-950/50 text-red-300 animate-pulse' : 'border-stone-800 bg-zinc-900/40 text-stone-500'}">
                <span class="block font-bold mb-1">4. HEART DPS (32s)</span>
                <span>Vulnerable Core open! Unleash Shards & AX MCs!</span>
              </div>
              <div class="p-3 rounded border text-xs {metronomeState.currentPhase === 'COOLDOWN' ? 'border-stone-600 bg-stone-900/60 text-stone-300' : 'border-stone-800 bg-zinc-900/40 text-stone-500'}">
                <span class="block font-bold mb-1">5. PUSHBACK (20s)</span>
                <span>Titan pulse wave. Brace and reset sinks.</span>
              </div>
            </div>
          </div>
        {:else if activeTab === 'caustic'}
          <!-- Caustic Damage Mitigation Calculator -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Inputs -->
            <div class="lg:col-span-6 p-4 rounded-lg bg-zinc-900/60 border border-stone-800 space-y-4 text-xs">
              <h3 class="text-sm font-bold text-[var(--hud-orange)] uppercase pb-2 border-b border-stone-700">
                SHIP DEFENSE & AMMUNITION PARAMETERS
              </h3>

              <div>
                <label for="hull-armor-input" class="block text-stone-400 mb-1">Hull Armor HP ({calcHullArmor} HP):</label>
                <input
                  id="hull-armor-input"
                  type="range"
                  min="1500"
                  max="6500"
                  step="50"
                  bind:value={calcHullArmor}
                  class="w-full accent-[var(--hud-orange)]"
                />
              </div>

              <div>
                <label for="caustic-resist-input" class="block text-stone-400 mb-1">Caustic Resistance ({calcCausticResist}%):</label>
                <input
                  id="caustic-resist-input"
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  bind:value={calcCausticResist}
                  class="w-full accent-[var(--hud-orange)]"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="sink-launchers-select" class="block text-stone-400 mb-1">Caustic Sink Launchers:</label>
                  <select
                    id="sink-launchers-select"
                    bind:value={calcSinkLaunchers}
                    class="w-full px-2.5 py-1.5 rounded bg-black/60 border border-stone-700 text-stone-200"
                  >
                    <option value={1}>1 Launcher (6 Sinks)</option>
                    <option value={2}>2 Launchers (12 Sinks)</option>
                  </select>
                </div>

                <div>
                  <label for="synth-ammo-select" class="block text-stone-400 mb-1">Synthesis Resupplies:</label>
                  <select
                    id="synth-ammo-select"
                    bind:value={calcSynthAmmo}
                    class="w-full px-2.5 py-1.5 rounded bg-black/60 border border-stone-700 text-stone-200"
                  >
                    <option value={0}>0 (No Mats)</option>
                    <option value={1}>1 Synth (+6 Sinks)</option>
                    <option value={2}>2 Synths (+12 Sinks)</option>
                    <option value={4}>4 Synths (+24 Sinks)</option>
                  </select>
                </div>
              </div>

              <div class="pt-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={calcInInnerCloud}
                    class="rounded accent-emerald-500"
                  />
                  <span class="text-stone-300 font-bold">Inner Core Cloud Ingress (3x Caustic Toxicity)</span>
                </label>
              </div>
            </div>

            <!-- Outputs & Survival Forecast -->
            <div class="lg:col-span-6 p-4 rounded-lg bg-black/60 border border-stone-800 space-y-4">
              <h3 class="text-sm font-bold text-emerald-400 uppercase pb-2 border-b border-stone-700">
                SURVIVAL ANALYSIS & SINK PROJECTIONS
              </h3>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded bg-zinc-900/60 border border-stone-800">
                  <span class="text-stone-400 block text-[10px] uppercase">Hull Degradation Rate</span>
                  <span class="text-base font-bold text-red-400 font-mono">
                    {causticResult.hullDegradationPerSecond} HP/s
                  </span>
                  <span class="text-[10px] text-stone-500 block">Melts in {causticResult.effectiveTimeToMeltSec}s without sinks</span>
                </div>

                <div class="p-3 rounded bg-zinc-900/60 border border-stone-800">
                  <span class="text-stone-400 block text-[10px] uppercase">Total Caustic Sink Buffer</span>
                  <span class="text-base font-bold text-emerald-400 font-mono">
                    {Math.round(causticResult.sinkCapacityTotalSec / 60)} min ({causticResult.sinkCapacityTotalSec}s)
                  </span>
                  <span class="text-[10px] text-stone-500 block">Absorption capacity</span>
                </div>

                <div class="p-3 rounded bg-zinc-900/60 border border-stone-800">
                  <span class="text-stone-400 block text-[10px] uppercase">Total Cloud Survival Time</span>
                  <span class="text-base font-bold text-amber-400 font-mono">
                    {(causticResult.totalSurvivalTimeSec / 60).toFixed(1)} minutes
                  </span>
                  <span class="text-[10px] text-stone-500 block">Until hull breach</span>
                </div>

                <div class="p-3 rounded bg-zinc-900/60 border border-stone-800">
                  <span class="text-stone-400 block text-[10px] uppercase">Standard 10-Min Run Need</span>
                  <span class="text-base font-bold text-cyan-300 font-mono">
                    {causticResult.recommendedSinksForRun} Sinks
                  </span>
                  <span class="text-[10px] text-stone-500 block">Required for extraction</span>
                </div>
              </div>

              <!-- Recommendation Banner -->
              <div class="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 text-xs text-stone-300">
                <span class="text-emerald-400 font-bold block mb-1">
                  ✓ TACTICAL RECOMMENDATION:
                </span>
                {#if causticResult.sinkCapacityTotalSec >= 600}
                  Safe operation profile. Your onboard sinks and synths easily cover a full 10-minute bombing and extraction run without taking hull damage.
                {:else}
                  ⚠️ Caution: Sinks expire in {(causticResult.sinkCapacityTotalSec / 60).toFixed(1)} min. Prepare synthesis materials (Iron, Nickel, Carbon, Sulphur) for field resupply.
                {/if}
              </div>
            </div>
          </div>
        {:else if activeTab === 'builds'}
          <!-- Recommended AX Builds & Weapon Convergence -->
          <div class="space-y-4">
            <!-- Build Selector Strip -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {#each RECOMMENDED_TITAN_BUILDS as b}
                <button
                  type="button"
                  class="p-3 rounded-lg border text-left transition-all {selectedBuild.id === b.id ? 'bg-[var(--hud-orange)]/15 border-[var(--hud-orange)] shadow-[0_0_15px_rgba(255,113,0,0.25)]' : 'bg-black/60 border-stone-800 hover:border-stone-600'}"
                  onclick={() => (selectedBuild = b)}
                >
                  <span class="text-xs font-bold text-[var(--hud-orange)] block">{b.name}</span>
                  <span class="text-[10px] text-stone-400 block">{b.role}</span>
                  <div class="flex items-center space-x-2 mt-2 text-[10px] font-mono text-stone-300">
                    <span>Armor: {b.hullArmor}</span>
                    <span>•</span>
                    <span>Speed: {b.boostSpeedMs} m/s</span>
                  </div>
                </button>
              {/each}
            </div>

            <!-- Build Detail Panel -->
            <div class="p-4 rounded-lg bg-black/60 border border-stone-800 space-y-4 text-xs">
              <div class="flex flex-wrap items-center justify-between pb-3 border-b border-stone-700">
                <div>
                  <h4 class="text-sm font-bold text-[var(--hud-orange)] uppercase">
                    {selectedBuild.name}
                  </h4>
                  <span class="text-stone-400 text-xs">{selectedBuild.role}</span>
                </div>

                <!-- Hardpoint Convergence Rating -->
                <div class="flex items-center space-x-2">
                  <span class="text-stone-400">Convergence Rating:</span>
                  <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                    GRADE {convergenceVerdict.score}
                  </span>
                </div>
              </div>

              <!-- Weapon Loadout Grid -->
              <div>
                <span class="text-[11px] font-bold text-stone-400 uppercase block mb-2">Installed Weaponry:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {#each selectedBuild.weapons as w}
                    <div class="p-2.5 rounded bg-zinc-900/70 border border-stone-800">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-stone-200">{w.name}</span>
                        <span class="text-[9px] px-1 py-0.2 rounded border border-stone-700 bg-black/40 text-stone-400">
                          {w.classSize}
                        </span>
                      </div>
                      <div class="text-[10px] text-stone-400 mt-1">
                        Category: <strong class="text-stone-300">{w.category}</strong> • Dmg: <strong class="text-stone-300">{w.damageType}</strong>
                      </div>
                      <p class="text-[10px] text-stone-400 mt-1 italic">{w.notes}</p>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Tactical Field Notes -->
              <div class="p-3 rounded bg-zinc-900/50 border border-stone-800 text-stone-300 space-y-1">
                <span class="font-bold text-[var(--hud-orange)] uppercase text-[11px] block">
                  Tactical Notes & Operation Rules:
                </span>
                <ul class="list-disc pl-4 space-y-1 text-[11px]">
                  {#each selectedBuild.tacticalNotes as note}
                    <li>{note}</li>
                  {/each}
                </ul>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Bottom Footer -->
      <div class="flex items-center justify-between px-5 py-2.5 bg-black/60 border-t border-stone-800 text-xs shrink-0">
        <span class="text-stone-400">
          Aegis Tactical Intel • Titan Raijin Heart Exposure Standard: 32.0s
        </span>
        <button
          type="button"
          class="px-4 py-1.5 rounded bg-[var(--hud-orange)] text-black font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          onclick={() => onClose?.()}
        >
          DISMISS GUIDE
        </button>
      </div>
    </div>
  </div>
{/if}
