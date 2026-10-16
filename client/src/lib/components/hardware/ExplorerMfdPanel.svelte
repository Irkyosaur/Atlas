<script lang="ts">
  // Location: client/src/lib/components/hardware/ExplorerMfdPanel.svelte
  // Stage 15.3: Explorer MFD Dashboard (FSS Discovery, DSS Values, Bio-Distance Divergence Ring)

  import type { ExplorerTelemetryData } from '$engine/auxiliary_display_engine';

  interface Props {
    explorer: ExplorerTelemetryData;
    speedMs?: number;
    altitudeM?: number;
    gravityG?: number;
  }

  let { explorer, speedMs = 0, altitudeM = 0, gravityG = 1.0 }: Props = $props();

  function formatCredits(cr: number): string {
    if (cr >= 1000000) {
      return `${(cr / 1000000).toFixed(2)}M CR`;
    }
    if (cr >= 1000) {
      return `${(cr / 1000).toFixed(0)}K CR`;
    }
    return `${cr} CR`;
  }
</script>

<div class="h-full w-full flex flex-col space-y-4 p-4 bg-[#05080e]/95 text-hud-bright select-none font-mono">
  <!-- Top Explorer Status Banner -->
  <div class="flex items-center justify-between border-b border-cyan-500/30 pb-3">
    <div class="flex items-center space-x-3">
      <span class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider text-cyan-300">EXPLORER MFD // DEEP-SPACE CARTOGRAPHY</h2>
        <div class="text-[10px] text-white/50 tracking-wider">SYSTEM: {explorer.currentSystem} &bull; FSS & DSS RECONNAISSANCE</div>
      </div>
    </div>
    <div class="flex items-center space-x-3 text-xs">
      <div class="px-2 py-0.5 rounded bg-zinc-900 border border-cyan-500/40 text-cyan-300 font-bold">
        GRAVITY: {gravityG.toFixed(2)} G
      </div>
      <div class="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white/70">
        ALT: {altitudeM.toLocaleString()} m
      </div>
    </div>
  </div>

  <!-- Primary Grid: FSS Progress & High Value Bodies & Exobiology Distance -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
    <!-- Left Column: FSS System Discovery Sweep -->
    <div class="p-4 rounded-lg bg-black/60 border border-cyan-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <span class="text-xs font-bold text-cyan-400 tracking-wider">FULL SPECTRUM SYSTEM SCANNER (FSS)</span>
        <span class="text-[10px] text-white/50">RADIO FREQUENCY</span>
      </div>

      <div class="space-y-4">
        <div>
          <div class="flex justify-between items-baseline mb-1">
            <span class="text-xs text-white/60">BODIES DISCOVERED:</span>
            <span class="text-sm font-bold text-cyan-200">
              {explorer.bodiesDiscovered} / {explorer.bodyCountTotal}
            </span>
          </div>
          <div class="h-3 w-full bg-zinc-900 rounded overflow-hidden p-0.5 border border-cyan-500/40">
            <div
              class="h-full bg-cyan-400 rounded-sm transition-all duration-300"
              style="width: {explorer.fssProgressPercent}%;"
            ></div>
          </div>
          <div class="text-right text-[10px] text-cyan-400/90 font-bold mt-1">
            {explorer.fssProgressPercent.toFixed(1)}% COMPLETE
          </div>
        </div>

        <!-- DSS Mapped Summary -->
        <div class="p-3 rounded bg-zinc-950 border border-white/10 space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-white/60">DETAILED SURFACE SCANS:</span>
            <span class="text-amber-300 font-bold">{explorer.dssMappedCount} Mapped</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/60">ESTIMATED SYSTEM VALUE:</span>
            <span class="text-emerald-400 font-bold">{formatCredits(explorer.dssEstimatedValueCr)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/60">HONK BONUS (DISCOVERY SCAN):</span>
            <span class="text-cyan-300 font-bold">+100% FIRST DISCOVERED</span>
          </div>
        </div>
      </div>

      <div class="text-[10px] text-white/40 border-t border-cyan-500/20 pt-2">
        TUNE TUNING SLIDER TO SCAN UNKNOWN RADIO RESONANCES
      </div>
    </div>

    <!-- Center Column: High-Value DSS Target Bodies (ELW, WW, AW) -->
    <div class="p-4 rounded-lg bg-black/60 border border-amber-500/40 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="text-xs font-bold text-amber-400 tracking-wider">HIGH VALUE DSS TARGETS</span>
        </div>
        <span class="text-[10px] text-white/50">TERRAFORMABLE & BIO</span>
      </div>

      <div class="space-y-2.5 flex-1 overflow-y-auto">
        {#each explorer.highValueBodies as body}
          <div class="p-2.5 rounded bg-zinc-950/90 border border-amber-500/20 flex items-center justify-between text-xs">
            <div class="space-y-0.5">
              <div class="flex items-center space-x-1.5">
                <span class="text-amber-300 font-bold">{body.bodyName}</span>
                {#if body.isMapped}
                  <span class="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/40">MAPPED</span>
                {:else}
                  <span class="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/40">UNMAPPED</span>
                {/if}
              </div>
              <div class="text-[11px] text-white/60">{body.bodyType}</div>
              <div class="text-[10px] text-white/40">Distance: {body.distanceLs.toLocaleString()} Ls</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-emerald-400">{formatCredits(body.estimatedValueCr)}</div>
              <div class="text-[9px] text-white/40">WITH FIRST MAPPED</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="text-[10px] text-white/40 text-center border-t border-amber-500/20 pt-2">
        USE PROBES WITHIN EFFICIENCY TARGET FOR +200% MAPPING BONUS
      </div>
    </div>

    <!-- Right Column: Exobiology Genetic Divergence Distances -->
    <div class="p-4 rounded-lg bg-black/60 border border-emerald-500/30 flex flex-col justify-between space-y-4">
      <div class="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <span class="text-xs font-bold text-emerald-400 tracking-wider">EXOBIOLOGY GENETIC SAMPLER</span>
        <span class="text-[10px] text-white/50">DIVERGENCE DISTANCE</span>
      </div>

      <div class="space-y-3 flex-1 overflow-y-auto">
        {#each explorer.bioSignals as bio}
          <div class="p-3 rounded bg-zinc-950/90 border border-emerald-500/25 space-y-2 text-xs">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-bold text-emerald-300">{bio.species}</div>
                <div class="text-[10px] text-white/50">GENUS: {bio.genus}</div>
              </div>
              <div class="text-right">
                <span class="font-bold text-emerald-400">{formatCredits(bio.estimatedValueCr)}</span>
                <div class="text-[9px] text-white/40">Sample Step: {bio.sampleStep}/3</div>
              </div>
            </div>

            <!-- Distance Bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px]">
                <span class="text-white/60">Current Distance:</span>
                <span class="font-bold {bio.sampleReady ? 'text-emerald-300' : 'text-amber-400'}">
                  {bio.currentDistanceM} m / {bio.requiredDistanceM} m req
                </span>
              </div>
              <div class="h-2 w-full bg-zinc-900 rounded overflow-hidden border border-emerald-500/30">
                <div
                  class="h-full rounded-sm {bio.sampleReady ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}"
                  style="width: {Math.min(100, (bio.currentDistanceM / bio.requiredDistanceM) * 100)}%;"
                ></div>
              </div>
            </div>

            <div class="text-[10px] {bio.sampleReady ? 'text-emerald-400 font-bold' : 'text-amber-400'} flex items-center space-x-1">
              <span>{bio.sampleReady ? '✓ GENETIC CLONE PREVENTED - READY TO SAMPLE' : '⚠️ TOO CLOSE TO PREVIOUS COLONY (INCREASE DISTANCE)'}</span>
            </div>
          </div>
        {/each}
      </div>

      <div class="text-[10px] text-white/40 text-center border-t border-emerald-500/20 pt-2">
        FIRST LOGGED DISCOVERY VALUE: 5X PAYOUT AT VISTA GENOMICS
      </div>
    </div>
  </div>
</div>
