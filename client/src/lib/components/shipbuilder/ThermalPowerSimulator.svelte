<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import type { ShipChassis, ShipLoadoutState } from '$engine/ship_catalog';
  import type { ModuleEngineeringState } from '$engine/engineering_catalog';
  import {
    type PowerPriority,
    type PipDistribution,
    type ShipSimulationResult,
    simulateShipPowerAndThermal,
  } from '$engine/thermal_power_engine';

  interface Props {
    isOpen: boolean;
    ship: ShipChassis;
    loadout: ShipLoadoutState;
    engineeringMap: Record<string, ModuleEngineeringState>;
    onClose: () => void;
  }

  let {
    isOpen = $bindable(false),
    ship,
    loadout,
    engineeringMap,
    onClose,
  }: Props = $props();

  // Interactive controls
  let pips = $state<PipDistribution>({ sys: 2, eng: 0, wep: 4 });
  let isFiring = $state<boolean>(true);
  let isSilentRunning = $state<boolean>(false);
  let priorityOverrides = $state<Record<string, PowerPriority>>({});
  let disabledModules = $state<Record<string, boolean>>({});

  // Active sub-tab in drawer: 'overview' | 'power' | 'distributor' | 'thermal'
  let activeTab = $state<'overview' | 'power' | 'distributor' | 'thermal'>('overview');

  // Simulation computation
  let simResult = $derived<ShipSimulationResult>(
    simulateShipPowerAndThermal(
      ship,
      loadout,
      engineeringMap,
      priorityOverrides,
      disabledModules,
      pips,
      isFiring,
      isSilentRunning
    )
  );

  // Quick preset loader for verification: Federal Corvette 4 Overcharged Incendiary MCs
  function applyCorvetteVerificationPreset() {
    // hp-1 (Huge), hp-2 (Huge), hp-4 (Medium), hp-5 (Medium)
    engineeringMap['hp-1'] = {
      blueprintId: 'weapon_overcharged',
      grade: 5,
      percent: 100,
      experimentalId: 'incendiary_rounds',
    };
    engineeringMap['hp-2'] = {
      blueprintId: 'weapon_overcharged',
      grade: 5,
      percent: 100,
      experimentalId: 'incendiary_rounds',
    };
    engineeringMap['hp-4'] = {
      blueprintId: 'weapon_overcharged',
      grade: 5,
      percent: 100,
      experimentalId: 'incendiary_rounds',
    };
    engineeringMap['hp-5'] = {
      blueprintId: 'weapon_overcharged',
      grade: 5,
      percent: 100,
      experimentalId: 'incendiary_rounds',
    };
    pips = { sys: 2, eng: 0, wep: 4 };
    isFiring = true;
    isSilentRunning = false;
  }

  function adjustPips(system: 'sys' | 'eng' | 'wep', delta: number) {
    const current = pips[system];
    const totalPips = pips.sys + pips.eng + pips.wep;
    const nextVal = Math.max(0, Math.min(4, +(current + delta).toFixed(1)));

    if (delta > 0 && totalPips >= 6) {
      // Must reduce another pip
      const others = (['sys', 'eng', 'wep'] as const).filter((k) => k !== system && pips[k] > 0);
      if (others.length > 0) {
        pips[others[0]] = Math.max(0, +(pips[others[0]] - delta).toFixed(1));
      }
    }
    pips[system] = nextVal;
  }

  function toggleModule(slotId: string) {
    disabledModules[slotId] = !disabledModules[slotId];
  }

  function changePriority(slotId: string, pri: PowerPriority) {
    priorityOverrides[slotId] = pri;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-y-0 right-0 z-50 w-full sm:w-[620px] lg:w-[680px] bg-[#030712]/95 border-l-2 border-[var(--hud-orange)] backdrop-blur-xl shadow-[-15px_0_40px_rgba(255,102,0,0.25)] flex flex-col font-mono text-white animate-slide-left select-none overflow-hidden"
    role="dialog"
    aria-label="Thermal & Power Simulator"
  >
    <!-- Header -->
    <div class="px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-black/80 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
        <div>
          <h2 class="text-sm font-bold tracking-wider text-[var(--hud-orange)] uppercase">
            THERMAL & POWER SIMULATOR // {ship.name}
          </h2>
          <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-2">
            <span>PRIORITIES 1-5</span>
            <span>•</span>
            <span>WEP DRAIN</span>
            <span>•</span>
            <span>HEAT DISSIPATION</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        {#if ship.id === 'federal_corvette'}
          <button
            type="button"
            class="px-2 py-1 text-[10px] rounded border border-yellow-500/50 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-900/50 transition-colors font-bold"
            onclick={applyCorvetteVerificationPreset}
            title="Load 4x Overcharged Incendiary MC Verification Preset"
          >
            ⚡ 4x OC INCENDIARY MC PRESET
          </button>
        {/if}

        <button
          type="button"
          class="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 transition-colors"
          onclick={() => {
            isOpen = false;
            onClose();
          }}
          aria-label="Close Simulator"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="flex border-b border-[var(--hud-orange)]/25 bg-black/60 text-xs">
      {#each [
        { id: 'overview', label: 'OVERVIEW & PIP RATIOS' },
        { id: 'power', label: 'POWER GROUPS (1-5)' },
        { id: 'distributor', label: 'DISTRIBUTOR / WEP' },
        { id: 'thermal', label: 'HEAT CURVES' },
      ] as tab}
        <button
          type="button"
          class="flex-1 py-2 text-center border-b-2 font-medium transition-colors text-[11px] {activeTab === tab.id
            ? 'border-[var(--hud-amber)] text-[var(--hud-amber)] bg-[var(--hud-orange)]/15 font-bold'
            : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'}"
          onclick={() => (activeTab = tab.id as any)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Scrollable Content Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Top Tactical Gauges: Power Bar & Heat Status -->
      <div class="grid grid-cols-2 gap-3 bg-black/60 p-3 rounded border border-[var(--hud-orange)]/30">
        <!-- Power Plant Capacity Gauge -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--ed-orange-dim)] uppercase">POWER DEPLOYED</span>
            <span class="font-bold {simResult.powerPlant.deployedUsagePercent > 100 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}">
              {simResult.powerPlant.deployedDrawMW} / {simResult.powerPlant.maxPowerMW} MW ({simResult.powerPlant.deployedUsagePercent}%)
            </span>
          </div>

          <!-- Multi-tier Power Bar -->
          <div class="relative w-full h-4 bg-gray-950 rounded overflow-hidden border border-white/20">
            <!-- 40% Destruction threshold line -->
            <div class="absolute left-[40%] top-0 bottom-0 w-0.5 bg-red-600 z-20" title="40% Power Plant Destruction Level"></div>
            <!-- 50% Malfunction threshold line -->
            <div class="absolute left-[50%] top-0 bottom-0 w-0.5 bg-yellow-500 z-20" title="50% Malfunction Threshold"></div>
            <!-- 100% Max Power line -->
            <div class="absolute left-[100%] top-0 bottom-0 w-0.5 bg-white z-20"></div>

            <!-- Retracted Fill -->
            <div
              class="h-full bg-cyan-600/70 absolute left-0 top-0 transition-all duration-300"
              style="width: {Math.min(100, simResult.powerPlant.retractedUsagePercent)}%"
              title="Retracted Draw: {simResult.powerPlant.retractedDrawMW} MW"
            ></div>

            <!-- Deployed Fill -->
            <div
              class="h-full absolute left-0 top-0 transition-all duration-300 {simResult.powerPlant.deployedUsagePercent > 100
                ? 'bg-red-500/80 shadow-[0_0_10px_red]'
                : 'bg-[var(--hud-orange)]/80'}"
              style="width: {Math.min(100, simResult.powerPlant.deployedUsagePercent)}%"
              title="Deployed Draw: {simResult.powerPlant.deployedDrawMW} MW"
            ></div>
          </div>

          <div class="flex justify-between text-[9px] text-white/50 px-0.5">
            <span class="text-red-400">40% DESTRUCT</span>
            <span class="text-yellow-400">50% MALFUNCTION</span>
            <span>100% NOMINAL</span>
          </div>
        </div>

        <!-- Thermal Heat Status Gauge -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--ed-orange-dim)] uppercase">THERMAL EQUILIBRIUM</span>
            <span class="font-bold {simResult.thermal.equilibriumHeatFiringPercent >= 100 ? 'text-red-400 animate-pulse' : simResult.thermal.equilibriumHeatFiringPercent > 66 ? 'text-yellow-400' : 'text-cyan-400'}">
              {simResult.thermal.equilibriumHeatFiringPercent}% SUSTAINED
            </span>
          </div>

          <!-- Heat Level Gauge -->
          <div class="relative w-full h-4 bg-gray-950 rounded overflow-hidden border border-white/20">
            <!-- 66% Warning line -->
            <div class="absolute left-[66%] top-0 bottom-0 w-0.5 bg-yellow-500 z-20" title="66% Radar Detectable"></div>
            <!-- 100% Damage line -->
            <div class="absolute left-[100%] top-0 bottom-0 w-0.5 bg-red-600 z-20" title="100% Module Damage"></div>

            <!-- Idle Heat Fill -->
            <div
              class="h-full bg-cyan-500/70 absolute left-0 top-0 transition-all duration-300"
              style="width: {Math.min(100, simResult.thermal.restingHeatPercent)}%"
              title="Resting Heat: {simResult.thermal.restingHeatPercent}%"
            ></div>

            <!-- Firing Heat Indicator -->
            <div
              class="h-full absolute left-0 top-0 transition-all duration-300 {simResult.thermal.equilibriumHeatFiringPercent >= 100
                ? 'bg-red-500/80 shadow-[0_0_10px_red]'
                : 'bg-yellow-500/60'}"
              style="width: {Math.min(100, simResult.thermal.equilibriumHeatFiringPercent)}%"
              title="Firing Equilibrium: {simResult.thermal.equilibriumHeatFiringPercent}%"
            ></div>
          </div>

          <div class="flex justify-between text-[9px] text-white/50 px-0.5">
            <span>RESTING {simResult.thermal.restingHeatPercent}%</span>
            <span class="text-yellow-400">66% RADAR</span>
            <span class="text-red-400">100% CRITICAL</span>
          </div>
        </div>
      </div>

      <!-- TAB 1: OVERVIEW & PIP DISTRIBUTION -->
      {#if activeTab === 'overview'}
        <!-- Pip Allocation Controls -->
        <div class="p-3 bg-black/60 rounded border border-[var(--hud-orange)]/30 space-y-3">
          <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/20 pb-1">
            <span class="text-[var(--hud-amber)] font-bold text-xs">POWER DISTRIBUTOR PIP ALLOCATION</span>
            <span class="text-[10px] text-white/50">TOTAL: {(pips.sys + pips.eng + pips.wep).toFixed(1)} / 6.0 PIPS</span>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <!-- SYS PIPS -->
            <div class="p-2.5 rounded bg-blue-950/20 border border-blue-500/30 space-y-1.5">
              <div class="text-[10px] text-blue-400 font-bold uppercase">SYS (SHIELDS)</div>
              <div class="text-lg font-bold text-cyan-300">{pips.sys.toFixed(1)}</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.sysRechargeRate} MW/s</div>
              <div class="flex justify-center space-x-1">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-400/40 hover:bg-blue-800"
                  onclick={() => adjustPips('sys', -0.5)}
                  disabled={pips.sys <= 0}
                >
                  -
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-400/40 hover:bg-blue-800"
                  onclick={() => adjustPips('sys', 0.5)}
                  disabled={pips.sys >= 4}
                >
                  +
                </button>
              </div>
            </div>

            <!-- ENG PIPS -->
            <div class="p-2.5 rounded bg-yellow-950/20 border border-yellow-500/30 space-y-1.5">
              <div class="text-[10px] text-yellow-400 font-bold uppercase">ENG (PROPULSION)</div>
              <div class="text-lg font-bold text-yellow-300">{pips.eng.toFixed(1)}</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.engRechargeRate} MW/s</div>
              <div class="flex justify-center space-x-1">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-400/40 hover:bg-yellow-800"
                  onclick={() => adjustPips('eng', -0.5)}
                  disabled={pips.eng <= 0}
                >
                  -
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-400/40 hover:bg-yellow-800"
                  onclick={() => adjustPips('eng', 0.5)}
                  disabled={pips.eng >= 4}
                >
                  +
                </button>
              </div>
            </div>

            <!-- WEP PIPS -->
            <div class="p-2.5 rounded bg-red-950/20 border border-red-500/30 space-y-1.5">
              <div class="text-[10px] text-red-400 font-bold uppercase">WEP (WEAPONS)</div>
              <div class="text-lg font-bold text-red-300">{pips.wep.toFixed(1)}</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.wepRechargeRate} MW/s</div>
              <div class="flex justify-center space-x-1">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-400/40 hover:bg-red-800"
                  onclick={() => adjustPips('wep', -0.5)}
                  disabled={pips.wep <= 0}
                >
                  -
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-400/40 hover:bg-red-800"
                  onclick={() => adjustPips('wep', 0.5)}
                  disabled={pips.wep >= 4}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Simulation Toggles: Sustained Fire & Silent Running -->
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="p-3 rounded border text-left flex items-center justify-between transition-colors {isFiring
              ? 'bg-red-950/40 border-red-500 text-red-200'
              : 'bg-black/40 border-white/20 text-white/60 hover:border-white/40'}"
            onclick={() => (isFiring = !isFiring)}
          >
            <div>
              <div class="font-bold text-xs">SUSTAINED WEAPON FIRE</div>
              <div class="text-[10px] text-white/50">{isFiring ? 'Active Weapons Firing' : 'Cease Fire / Idle'}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold {isFiring ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-white/50'}">
              {isFiring ? 'FIRING' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            class="p-3 rounded border text-left flex items-center justify-between transition-colors {isSilentRunning
              ? 'bg-purple-950/40 border-purple-500 text-purple-200'
              : 'bg-black/40 border-white/20 text-white/60 hover:border-white/40'}"
            onclick={() => (isSilentRunning = !isSilentRunning)}
          >
            <div>
              <div class="font-bold text-xs">SILENT RUNNING MODE</div>
              <div class="text-[10px] text-white/50">{isSilentRunning ? 'Radiators Closed (No Cooling)' : 'Radiators Open (Dissipating)'}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold {isSilentRunning ? 'bg-purple-600 text-white animate-pulse' : 'bg-white/10 text-white/50'}">
              {isSilentRunning ? 'SILENT' : 'NORMAL'}
            </span>
          </button>
        </div>

        <!-- Summary KPI Grid -->
        <div class="grid grid-cols-3 gap-2.5 text-xs">
          <div class="p-2.5 rounded bg-black/60 border border-[var(--hud-orange)]/25">
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">WEP Cap Drain Time</div>
            <div class="text-base font-bold {simResult.distributor.isInfiniteFire ? 'text-emerald-400' : 'text-red-400'}">
              {simResult.distributor.isInfiniteFire ? 'INFINITE' : `${simResult.distributor.wepDrainTimeSeconds}s`}
            </div>
            <div class="text-[9px] text-white/50">Draw: {simResult.distributor.totalWeaponDrawMW} MW</div>
          </div>

          <div class="p-2.5 rounded bg-black/60 border border-[var(--hud-orange)]/25">
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Time to 100% Heat</div>
            <div class="text-base font-bold {simResult.thermal.timeToOverheatSeconds ? 'text-red-400' : 'text-emerald-400'}">
              {simResult.thermal.timeToOverheatSeconds ? `${simResult.thermal.timeToOverheatSeconds}s` : 'STABLE'}
            </div>
            <div class="text-[9px] text-white/50">Damage Threshold</div>
          </div>

          <div class="p-2.5 rounded bg-black/60 border border-[var(--hud-orange)]/25">
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Silent Running Limit</div>
            <div class="text-base font-bold text-purple-400">
              {simResult.thermal.silentRunningTimeToOverheat}s
            </div>
            <div class="text-[9px] text-white/50">Resting to 100%</div>
          </div>
        </div>
      {/if}

      <!-- TAB 2: POWER GROUPS (1 THROUGH 5) -->
      {#if activeTab === 'power'}
        <div class="space-y-3">
          <div class="text-xs text-[var(--ed-orange-dim)]">
            Manage power groups 1 through 5. When total draw exceeds power plant output, higher numbered groups shut down automatically.
          </div>

          <!-- Priority Group Summary Rows -->
          <div class="space-y-1.5">
            {#each [1, 2, 3, 4, 5] as pri}
              {@const pData = simResult.powerPlant.priorityDraws[pri as PowerPriority]}
              <div class="p-2 rounded bg-black/60 border flex items-center justify-between text-xs {pData.isActiveDeployed
                ? 'border-[var(--hud-orange)]/30 text-white'
                : 'border-red-500/40 bg-red-950/20 text-red-300'}">
                <div class="flex items-center space-x-2">
                  <span class="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/50 text-[var(--hud-amber)]">
                    P{pri}
                  </span>
                  <div>
                    <div class="font-bold">Priority Group {pri}</div>
                    <div class="text-[10px] text-white/50">Group Draw: {pData.drawMW.toFixed(2)} MW</div>
                  </div>
                </div>

                <div class="text-right">
                  <div class="font-bold">{pData.cumulativeMW.toFixed(2)} MW ({pData.cumulativePercent}%)</div>
                  <div class="text-[10px] {pData.isActiveDeployed ? 'text-emerald-400' : 'text-red-400 font-bold'}">
                    {pData.isActiveDeployed ? 'ONLINE' : 'OFFLINE (INSUFFICIENT POWER)'}
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Module Power Assignment List -->
          <div class="space-y-1 pt-2 border-t border-[var(--hud-orange)]/20">
            <div class="text-[11px] font-bold text-[var(--hud-amber)] mb-2">MODULE POWER & PRIORITY MAPPING</div>
            <div class="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {#each simResult.modules as mod}
                <div class="p-2 rounded bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2 flex-1">
                    <button
                      type="button"
                      class="w-4 h-4 rounded border text-[9px] flex items-center justify-center font-bold {mod.isEnabled
                        ? 'bg-emerald-600/60 border-emerald-400 text-white'
                        : 'bg-red-950/60 border-red-500 text-red-300'}"
                      onclick={() => toggleModule(mod.slotId)}
                      title={mod.isEnabled ? 'Module Enabled' : 'Module Disabled'}
                    >
                      {mod.isEnabled ? '✓' : '✗'}
                    </button>
                    <div>
                      <div class="font-medium text-white {mod.isEnabled ? '' : 'line-through text-white/40'}">{mod.name}</div>
                      <div class="text-[10px] text-[var(--ed-orange-dim)]">{mod.category.toUpperCase()} • {mod.powerDraw} MW</div>
                    </div>
                  </div>

                  <!-- Priority Selector (1-5) -->
                  <div class="flex items-center space-x-1">
                    {#each [1, 2, 3, 4, 5] as priNum}
                      <button
                        type="button"
                        class="w-5 h-5 rounded text-[10px] font-bold border transition-colors {mod.priority === priNum
                          ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-amber)]'
                          : 'bg-black/50 text-white/50 border-white/20 hover:text-white'}"
                        onclick={() => changePriority(mod.slotId, priNum as PowerPriority)}
                      >
                        {priNum}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB 3: DISTRIBUTOR & WEP DRAIN CURVE -->
      {#if activeTab === 'distributor'}
        <div class="space-y-3">
          <!-- Distributor Specs Ribbon -->
          <div class="grid grid-cols-3 gap-2 bg-black/60 p-3 rounded border border-[var(--hud-orange)]/30 text-center text-xs">
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">SYS CAP / RECHARGE</div>
              <div class="font-bold text-cyan-300">{simResult.distributor.sysCapacity} MJ</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.sysRechargeRate} MW/s</div>
            </div>
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">ENG CAP / RECHARGE</div>
              <div class="font-bold text-yellow-300">{simResult.distributor.engCapacity} MJ</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.engRechargeRate} MW/s</div>
            </div>
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">WEP CAP / RECHARGE</div>
              <div class="font-bold text-red-300">{simResult.distributor.wepCapacity} MJ</div>
              <div class="text-[9px] text-white/50">+{simResult.distributor.wepRechargeRate} MW/s</div>
            </div>
          </div>

          <!-- WEP Drain Analytics Card -->
          <div class="p-3 bg-black/60 rounded border border-[var(--hud-orange)]/30 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[var(--hud-amber)] font-bold">WEP CAPACITOR DISCHARGE SIMULATION</span>
              <span class="font-bold {simResult.distributor.isInfiniteFire ? 'text-emerald-400' : 'text-red-400'}">
                {simResult.distributor.isInfiniteFire ? 'SUSTAINED FIRE: INFINITE' : `EXHAUSTION IN ${simResult.distributor.wepDrainTimeSeconds} SECONDS`}
              </span>
            </div>

            <!-- SVG Drain Curve Graph -->
            <div class="h-44 bg-gray-950/80 rounded border border-white/20 p-2 flex flex-col justify-between">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <!-- Grid Lines -->
                <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2" />

                <!-- Drain Curve Polyline -->
                {#if simResult.distributor.wepDrainCurve.length > 1}
                  {@const points = simResult.distributor.wepDrainCurve.map((pt, i, arr) => {
                    const x = (i / (arr.length - 1)) * 500;
                    const y = 120 - (pt.percent / 100) * 110;
                    return `${x},${y}`;
                  }).join(' ')}
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="2.5"
                    points={points}
                  />
                  <!-- Fill beneath curve -->
                  <polygon
                    fill="rgba(239, 68, 68, 0.15)"
                    points={`0,120 ${points} 500,120`}
                  />
                {/if}
              </svg>

              <div class="flex justify-between text-[9px] text-white/50 pt-1 border-t border-white/10">
                <span>0s (100% WEP)</span>
                <span>30s</span>
                <span>60s (Sustained Fire Limit)</span>
              </div>
            </div>

            <div class="text-[10px] text-white/60">
              Total active weapon distributor draw: <span class="text-red-400 font-bold">{simResult.distributor.totalWeaponDrawMW} MW</span>. 
              WEP recharge at {pips.wep} pips: <span class="text-emerald-400 font-bold">+{simResult.distributor.wepRechargeRate} MW/s</span>.
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB 4: THERMAL HEAT CURVES -->
      {#if activeTab === 'thermal'}
        <div class="space-y-3">
          <!-- Thermal Parameters Banner -->
          <div class="grid grid-cols-3 gap-2 bg-black/60 p-3 rounded border border-[var(--hud-orange)]/30 text-center text-xs">
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">HULL HEAT CAPACITY</div>
              <div class="font-bold text-white">{simResult.thermal.hullHeatCapacity} BTUs</div>
            </div>
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">PP EFFICIENCY</div>
              <div class="font-bold text-yellow-300">{simResult.powerPlantEfficiency.toFixed(2)} MW/MW</div>
            </div>
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">COOLING CONSTANT</div>
              <div class="font-bold text-cyan-300">{simResult.thermal.coolingConstant}</div>
            </div>
          </div>

          <!-- Heat Spike Curve Visualization -->
          <div class="p-3 bg-black/60 rounded border border-[var(--hud-orange)]/30 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[var(--hud-amber)] font-bold">WEAPONS FIRING HEAT DISSIPATION SPIKE</span>
              <span class="font-bold {simResult.thermal.timeToOverheatSeconds ? 'text-red-400' : 'text-emerald-400'}">
                {simResult.thermal.timeToOverheatSeconds ? `OVERHEAT (100%) IN ${simResult.thermal.timeToOverheatSeconds}s` : 'THERMALLY BALANCED'}
              </span>
            </div>

            <!-- Heat Curve SVG -->
            <div class="h-48 bg-gray-950/80 rounded border border-white/20 p-2 flex flex-col justify-between">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                <!-- 100% Critical Heat Warning Line -->
                <line x1="0" y1="20" x2="500" y2="20" stroke="#ef4444" stroke-dasharray="4" stroke-width="1.5" />
                <text x="5" y="16" fill="#ef4444" font-size="8" font-family="monospace">100% DAMAGE THRESHOLD</text>

                <!-- 66% Radar Signature Line -->
                <line x1="0" y1="58" x2="500" y2="58" stroke="#eab308" stroke-dasharray="2" stroke-width="1" />
                <text x="5" y="54" fill="#eab308" font-size="8" font-family="monospace">66% RADAR DETECTION</text>

                <!-- Polyline for dynamic heat curve -->
                {#if simResult.thermal.heatCurve.length > 1}
                  {@const hPoints = simResult.thermal.heatCurve.map((pt, i, arr) => {
                    const x = (i / (arr.length - 1)) * 500;
                    // Clamp to max 120%
                    const y = 130 - (Math.min(120, pt.heatPercent) / 120) * 120;
                    return `${x},${y}`;
                  }).join(' ')}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    stroke-width="2.5"
                    points={hPoints}
                  />
                  <polygon
                    fill="rgba(249, 115, 22, 0.15)"
                    points={`0,130 ${hPoints} 500,130`}
                  />
                {/if}
              </svg>

              <div class="flex justify-between text-[9px] text-white/50 pt-1 border-t border-white/10">
                <span>0s (Resting {simResult.thermal.restingHeatPercent}%)</span>
                <span>30s</span>
                <span>60s (Equilibrium {simResult.thermal.equilibriumHeatFiringPercent}%)</span>
              </div>
            </div>

            <div class="text-[10px] text-white/60">
              Idle equilibrium: <span class="text-cyan-400 font-bold">{simResult.thermal.restingHeatPercent}%</span>.
              Sustained firing equilibrium: <span class="text-orange-400 font-bold">{simResult.thermal.equilibriumHeatFiringPercent}%</span>.
              Dissipation follows radiant cooling <span class="font-mono text-white/80">Rate = C * (H/100)²</span>.
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer Controls -->
    <div class="px-5 py-3 border-t border-[var(--hud-orange)]/40 bg-black/80 flex items-center justify-between text-xs">
      <div class="text-[10px] text-white/50">
        EDSY / CORIOLIS VERIFIED ALGORITHMS
      </div>
      <button
        type="button"
        class="px-4 py-1.5 rounded bg-[var(--hud-orange)] text-black font-bold hover:bg-[var(--hud-amber)] transition-colors shadow-[0_0_10px_rgba(255,153,0,0.3)]"
        onclick={() => {
          isOpen = false;
          onClose();
        }}
      >
        CLOSE SIMULATOR
      </button>
    </div>
  </div>
{/if}
