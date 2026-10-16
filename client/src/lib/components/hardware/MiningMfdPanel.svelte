<script lang="ts">
  // Location: client/src/lib/components/hardware/MiningMfdPanel.svelte
  // Stage 15.3: Mining MFD Dashboard (Cargo Hold, Refinery Bins, Prospector Limpets, Yield Breakdown)

  import type { MiningTelemetryData } from '$engine/auxiliary_display_engine';

  interface Props {
    mining: MiningTelemetryData;
    speedMs?: number;
    altitudeM?: number;
  }

  let { mining, speedMs = 0, altitudeM = 0 }: Props = $props();
</script>

<div class="h-full w-full flex flex-col space-y-4 p-4 bg-[#05080e]/95 text-hud-bright select-none font-mono">
  <!-- Top Mining Status Banner -->
  <div class="flex items-center justify-between border-b border-amber-500/30 pb-3">
    <div class="flex items-center space-x-3">
      <span class="w-3 h-3 rounded-full bg-amber-400"></span>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider text-amber-400">MINING MFD // REFINERY & CARGO TELEMETRY</h2>
        <div class="text-[10px] text-white/50 tracking-wider">DEEP CORE & SURFACE LASER EXTRACTION</div>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <span class="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-xs font-bold text-amber-300">
        LIMPET CONTROLLER: {mining.prospectorLimpetsActive} / {mining.activeLimpetsMax} ACTIVE
      </span>
    </div>
  </div>

  <!-- Primary Grid: Cargo Hold + Refinery Bins + Asteroid Prospects -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
    <!-- Left Column: Cargo Hold Capacity & Utilization -->
    <div class="p-4 rounded-lg bg-black/60 border border-amber-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <span class="text-xs font-bold text-amber-400 tracking-wider">CARGO HOLD STATUS</span>
        <span class="text-[10px] text-white/50">TONNAGE</span>
      </div>

      <div class="space-y-3">
        <div class="flex items-baseline justify-between">
          <div>
            <div class="text-2xl font-bold text-amber-300">
              {mining.cargoTons} <span class="text-xs text-white/50">/ {mining.cargoCapacity} T</span>
            </div>
            <div class="text-[11px] text-white/40">TOTAL COMMODITY CARGO</div>
          </div>
          <div class="text-right">
            <span class="text-lg font-bold {mining.cargoPercent > 90 ? 'text-red-400' : 'text-emerald-400'}">
              {mining.cargoPercent.toFixed(1)}%
            </span>
            <div class="text-[10px] text-white/40">FILLED</div>
          </div>
        </div>

        <div class="h-4 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-amber-500/40">
          <div
            class="h-full rounded-sm transition-all duration-300 {mining.cargoPercent > 90 ? 'bg-red-500' : mining.cargoPercent > 70 ? 'bg-amber-400' : 'bg-emerald-400'}"
            style="width: {Math.max(0, Math.min(100, mining.cargoPercent))}%;"
          ></div>
        </div>

        <div class="p-3 rounded bg-zinc-950 border border-white/10 space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-white/60">CARGO REMAINING:</span>
            <span class="text-white font-bold">{Math.max(0, mining.cargoCapacity - mining.cargoTons)} T</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/60">PROSPECTOR CAPACITY:</span>
            <span class="text-amber-300 font-bold">{mining.prospectorLimpetsActive} deployed</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/60">APPROACH SPEED:</span>
            <span class="text-cyan-300 font-bold">{speedMs.toFixed(0)} m/s</span>
          </div>
        </div>
      </div>

      <div class="text-[10px] text-white/40 border-t border-amber-500/20 pt-2">
        AUTO-VENT UNWANTED MINERALS CONFIGURED IN REFINERY
      </div>
    </div>

    <!-- Center Column: Refinery Bins -->
    <div class="p-4 rounded-lg bg-black/60 border border-orange-500/40 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-orange-500/20 pb-2">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          <span class="text-xs font-bold text-orange-400 tracking-wider">REFINERY PROCESSING BINS</span>
        </div>
        <span class="text-[10px] text-white/50">{mining.refineryBins.length} BINS ACTIVE</span>
      </div>

      <div class="space-y-2.5 flex-1 overflow-y-auto">
        {#each mining.refineryBins as bin}
          <div class="p-2 rounded bg-zinc-950/90 border border-orange-500/20 space-y-1 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-white/50 text-[10px] font-bold">BIN #{bin.id}</span>
              <span class="text-amber-300 font-bold">{bin.material}</span>
              <span class="text-orange-400 font-bold text-[11px]">{bin.percent}%</span>
            </div>
            <div class="h-2 w-full bg-zinc-900 rounded overflow-hidden border border-orange-500/30">
              <div
                class="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-sm transition-all"
                style="width: {bin.percent}%;"
              ></div>
            </div>
          </div>
        {/each}
      </div>

      <div class="text-[10px] text-white/40 text-center border-t border-orange-500/20 pt-2">
        100% REFINED MINERAL AUTOMATICALLY CONVERTS TO 1T CANISTER
      </div>
    </div>

    <!-- Right Column: Last Prospected Asteroid Mineral Yield -->
    <div class="p-4 rounded-lg bg-black/60 border border-cyan-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <span class="text-xs font-bold text-cyan-400 tracking-wider">PROSPECTOR ASTEROID ANALYSIS</span>
        <span class="text-[10px] text-white/50">SURFACE & CORE</span>
      </div>

      {#if mining.lastProspectedAsteroid}
        <div class="space-y-4">
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs">
              <span class="text-cyan-200 font-bold">{mining.lastProspectedAsteroid.material1}</span>
              <span class="font-bold text-cyan-300">{mining.lastProspectedAsteroid.percent1.toFixed(1)}%</span>
            </div>
            <div class="h-2.5 w-full bg-zinc-900 rounded overflow-hidden border border-cyan-500/30">
              <div class="h-full bg-cyan-400 rounded-sm" style="width: {mining.lastProspectedAsteroid.percent1}%;"></div>
            </div>
          </div>

          {#if mining.lastProspectedAsteroid.material2}
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-amber-200 font-bold">{mining.lastProspectedAsteroid.material2}</span>
                <span class="font-bold text-amber-300">{mining.lastProspectedAsteroid.percent2?.toFixed(1)}%</span>
              </div>
              <div class="h-2.5 w-full bg-zinc-900 rounded overflow-hidden border border-amber-500/30">
                <div class="h-full bg-amber-400 rounded-sm" style="width: {mining.lastProspectedAsteroid.percent2}%;"></div>
              </div>
            </div>
          {/if}

          {#if mining.lastProspectedAsteroid.material3}
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-orange-200 font-bold">{mining.lastProspectedAsteroid.material3}</span>
                <span class="font-bold text-orange-300">{mining.lastProspectedAsteroid.percent3?.toFixed(1)}%</span>
              </div>
              <div class="h-2.5 w-full bg-zinc-900 rounded overflow-hidden border border-orange-500/30">
                <div class="h-full bg-orange-400 rounded-sm" style="width: {mining.lastProspectedAsteroid.percent3}%;"></div>
              </div>
            </div>
          {/if}

          <div class="p-3 rounded bg-zinc-950 border border-white/10 space-y-1 text-xs">
            <div class="flex justify-between text-white/60">
              <span>REMAINING MATERIAL CONTENT:</span>
              <span class="text-emerald-300 font-bold">{mining.lastProspectedAsteroid.remainingYieldPercent}%</span>
            </div>
            <div class="flex justify-between text-white/60">
              <span>EXTRACTION EFFICIENCY:</span>
              <span class="text-white font-bold">Class A Prospector (3.5x Bonus)</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-8">
          <div class="text-2xl text-zinc-600">💎</div>
          <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">No Asteroid Prospected</div>
          <div class="text-[10px] text-zinc-600">Fire prospector limpet at ring asteroid to analyze composition</div>
        </div>
      {/if}

      <div class="text-[10px] text-white/40 text-center border-t border-cyan-500/20 pt-2">
        A-RATED PROSPECTOR MULTIPLIER ACTIVE (+250% YIELD)
      </div>
    </div>
  </div>
</div>
