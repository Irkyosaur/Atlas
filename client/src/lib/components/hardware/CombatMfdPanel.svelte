<script lang="ts">
  // Location: client/src/lib/components/hardware/CombatMfdPanel.svelte
  // Stage 15.3: Combat MFD Dashboard (Shields, Hull, Hostile Target Lock, WEP/SYS/ENG Pips)

  import type { CombatTelemetryData } from '$engine/auxiliary_display_engine';

  interface Props {
    combat: CombatTelemetryData;
    speedMs?: number;
    altitudeM?: number;
  }

  let { combat, speedMs = 0, altitudeM = 0 }: Props = $props();

  // Pip bar visualization helpers
  function getPipBlocks(val: number) {
    // 0 to 4.0 pips (8 half-pips)
    const blocks: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      blocks.push(i < Math.round(val * 2));
    }
    return blocks;
  }
</script>

<div class="h-full w-full flex flex-col space-y-4 p-4 bg-[#05080e]/95 text-hud-bright select-none font-mono">
  <!-- Top Combat Status Banner -->
  <div class="flex items-center justify-between border-b border-red-500/30 pb-3">
    <div class="flex items-center space-x-3">
      <span class="w-3 h-3 rounded-full {combat.isInDanger ? 'bg-red-500 animate-ping' : 'bg-red-500'}"></span>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider text-red-400">COMBAT MFD // WEAPONS & DEFENSE</h2>
        <div class="text-[10px] text-white/50 tracking-wider">PRIMARY TACTICAL TELEMETRY</div>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      {#if combat.beingInterdicted}
        <span class="px-2 py-0.5 rounded bg-red-600/30 border border-red-500 text-red-200 text-xs font-bold animate-pulse">
          INTERDICTION EVASION ACTIVE
        </span>
      {/if}
      <span class="px-2 py-0.5 rounded {combat.hardpointsDeployed ? 'bg-red-950/60 border border-red-500/80 text-red-300' : 'bg-zinc-900 border border-zinc-700 text-zinc-400'} text-xs font-bold">
        HARDPOINTS: {combat.hardpointsDeployed ? 'DEPLOYED' : 'RETRACTED'}
      </span>
    </div>
  </div>

  <!-- Primary Grid: Shields/Hull + Target Lock + Pips -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
    <!-- Left Column: Ship Vital Defenses -->
    <div class="p-4 rounded-lg bg-black/60 border border-orange-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-orange-500/20 pb-2">
        <span class="text-xs font-bold text-orange-400 tracking-wider">HULL & SHIELDS INTEGRITY</span>
        <span class="text-[10px] text-white/50">COCKPIT MAIN</span>
      </div>

      <!-- Shield Arc / Percent -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs">
          <span class="text-cyan-400 font-bold">SHIELD GENERATOR:</span>
          <span class="font-bold {combat.shieldPercent > 50 ? 'text-cyan-300' : combat.shieldPercent > 20 ? 'text-amber-400' : 'text-red-400'}">
            {combat.shieldPercent.toFixed(0)}%
          </span>
        </div>
        <div class="h-3.5 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-cyan-500/40">
          <div
            class="h-full rounded-sm transition-all duration-300 {combat.shieldPercent > 50 ? 'bg-cyan-400' : combat.shieldPercent > 20 ? 'bg-amber-400' : 'bg-red-500'}"
            style="width: {Math.max(0, Math.min(100, combat.shieldPercent))}%;"
          ></div>
        </div>
      </div>

      <!-- Hull Integrity Percent -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs">
          <span class="text-orange-400 font-bold">HULL ARMOR INTEGRITY:</span>
          <span class="font-bold {combat.hullPercent > 60 ? 'text-orange-300' : combat.hullPercent > 30 ? 'text-amber-400' : 'text-red-400'}">
            {combat.hullPercent.toFixed(0)}%
          </span>
        </div>
        <div class="h-3.5 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-orange-500/40">
          <div
            class="h-full rounded-sm transition-all duration-300 {combat.hullPercent > 60 ? 'bg-orange-500' : combat.hullPercent > 30 ? 'bg-amber-500' : 'bg-red-500'}"
            style="width: {Math.max(0, Math.min(100, combat.hullPercent))}%;"
          ></div>
        </div>
      </div>

      <!-- Flight Velocity & Altitude -->
      <div class="pt-3 border-t border-orange-500/20 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-white/40 block text-[10px]">CURRENT SPEED:</span>
          <span class="text-sm font-bold text-white">{speedMs.toFixed(0)} <span class="text-[10px] text-white/50">m/s</span></span>
        </div>
        <div>
          <span class="text-white/40 block text-[10px]">RADAR ALTITUDE:</span>
          <span class="text-sm font-bold text-white">{altitudeM.toLocaleString()} <span class="text-[10px] text-white/50">m</span></span>
        </div>
      </div>
    </div>

    <!-- Center Column: Hostile Target Lock Telemetry -->
    <div class="p-4 rounded-lg bg-black/60 border border-red-500/40 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-red-500/20 pb-2">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full {combat.targetLocked ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'}"></span>
          <span class="text-xs font-bold text-red-400 tracking-wider">TARGET SCANNER & LOCK</span>
        </div>
        <span class="text-[10px] px-1.5 py-0.2 rounded {combat.targetLocked ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-400'}">
          {combat.targetLocked ? 'LOCKED' : 'NO LOCK'}
        </span>
      </div>

      {#if combat.targetLocked}
        <div class="space-y-3">
          <div>
            <div class="text-[11px] text-white/50">TARGET VESSEL ID:</div>
            <div class="text-base font-bold text-red-200 tracking-wide">{combat.targetName}</div>
            <div class="text-xs text-red-400/80">{combat.targetShipType}</div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-cyan-400/90 font-bold">TARGET SHIELD:</span>
              <span class="font-bold text-cyan-300">{combat.targetShieldPercent.toFixed(0)}%</span>
            </div>
            <div class="h-2.5 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-cyan-500/30">
              <div
                class="h-full bg-cyan-400 rounded-sm transition-all"
                style="width: {Math.max(0, Math.min(100, combat.targetShieldPercent))}%;"
              ></div>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-red-400/90 font-bold">TARGET HULL:</span>
              <span class="font-bold text-red-300">{combat.targetHullPercent.toFixed(0)}%</span>
            </div>
            <div class="h-2.5 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-red-500/30">
              <div
                class="h-full bg-red-500 rounded-sm transition-all"
                style="width: {Math.max(0, Math.min(100, combat.targetHullPercent))}%;"
              ></div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between text-xs border-t border-red-500/20">
            <span class="text-white/50">DISTANCE TO TARGET:</span>
            <span class="font-bold text-amber-300 text-sm">{combat.targetDistanceM.toLocaleString()} m</span>
          </div>
        </div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-8">
          <div class="text-2xl text-zinc-600">🎯</div>
          <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">No Target Selected</div>
          <div class="text-[10px] text-zinc-600">Select target via sensor array or cycle targets</div>
        </div>
      {/if}

      <div class="text-[10px] text-white/40 text-center border-t border-red-500/20 pt-2">
        PASSIVE SCAN TELEMETRY // FRONTIER COMPLIANT
      </div>
    </div>

    <!-- Right Column: Power Distributor Pips (SYS / ENG / WEP) -->
    <div class="p-4 rounded-lg bg-black/60 border border-cyan-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <span class="text-xs font-bold text-cyan-400 tracking-wider">POWER DISTRIBUTOR PIPS</span>
        <span class="text-[10px] text-white/50">W/E/S HALF-PIPS</span>
      </div>

      <div class="space-y-4">
        <!-- SYS -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-cyan-300 font-bold">SYS [SYSTEMS / SHIELDS]</span>
            <span class="font-bold text-cyan-200">{combat.pips.sys.toFixed(1)}</span>
          </div>
          <div class="grid grid-cols-8 gap-1 h-3.5">
            {#each getPipBlocks(combat.pips.sys) as active}
              <div class="rounded-sm border border-cyan-500/40 {active ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-black/40'}"></div>
            {/each}
          </div>
        </div>

        <!-- ENG -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-amber-300 font-bold">ENG [ENGINES / THRUST]</span>
            <span class="font-bold text-amber-200">{combat.pips.eng.toFixed(1)}</span>
          </div>
          <div class="grid grid-cols-8 gap-1 h-3.5">
            {#each getPipBlocks(combat.pips.eng) as active}
              <div class="rounded-sm border border-amber-500/40 {active ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-black/40'}"></div>
            {/each}
          </div>
        </div>

        <!-- WEP -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-orange-400 font-bold">WEP [WEAPONS / THERMAL]</span>
            <span class="font-bold text-orange-200">{combat.pips.wep.toFixed(1)}</span>
          </div>
          <div class="grid grid-cols-8 gap-1 h-3.5">
            {#each getPipBlocks(combat.pips.wep) as active}
              <div class="rounded-sm border border-orange-500/40 {active ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-black/40'}"></div>
            {/each}
          </div>
        </div>
      </div>

      <div class="p-2.5 rounded bg-zinc-950/80 border border-white/10 text-[10px] space-y-1 text-white/60">
        <div class="flex justify-between">
          <span>SHIELD RECHARGE RESISTANCE:</span>
          <span class="text-cyan-300 font-bold">+{Math.round((combat.pips.sys / 4) * 60)}%</span>
        </div>
        <div class="flex justify-between">
          <span>BOOST / TURN RATE BONUS:</span>
          <span class="text-amber-300 font-bold">+{Math.round((combat.pips.eng / 4) * 30)}%</span>
        </div>
      </div>
    </div>
  </div>
</div>
