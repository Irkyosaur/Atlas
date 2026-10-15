<!-- Location: atlas/client/src/lib/components/DssTelemetryCard.svelte -->
<!-- Task 3.4.4: Planetary Surface Telemetry Sidecard with DSS Heatmap Toggle & Exobio Catalog -->
<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import type { PlanetarySurfaceParams } from '$engine/dss_surface_pipeline';

  interface Props {
    surfaceParams: PlanetarySurfaceParams;
    onToggleDssHeatmap?: (active: boolean) => void;
  }

  let { surfaceParams = $bindable(), onToggleDssHeatmap }: Props = $props();

  function toggleHeatmap() {
    surfaceParams.dssHeatmapActive = !surfaceParams.dssHeatmapActive;
    if (onToggleDssHeatmap) {
      onToggleDssHeatmap(surfaceParams.dssHeatmapActive);
    }
  }
</script>

<div class="pointer-events-auto flex flex-col gap-3 w-80 p-3.5 rounded-lg bg-black/85 border border-[var(--hud-orange)]/40 backdrop-blur-md shadow-2xl text-white font-mono select-none text-xs">
  <!-- Card Header -->
  <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/30 pb-2">
    <div class="flex items-center space-x-2">
      <Icon name="landable-arc" size={16} glow={true} color="var(--hud-orange)" />
      <span class="hud-system-name text-sm font-bold tracking-wider uppercase text-[var(--hud-amber)]">
        {surfaceParams.name}
      </span>
    </div>
    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {surfaceParams.landable
      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
      : 'bg-red-950/80 text-red-400 border border-red-500/40'}">
      {surfaceParams.landable ? 'LANDABLE' : 'NON-LANDABLE'}
    </span>
  </div>

  <!-- Body Subtype Banner -->
  <div class="text-[11px] text-white/70 italic px-1">
    {surfaceParams.subType}
  </div>

  <!-- Telemetry Data Grid -->
  <div class="grid grid-cols-2 gap-2 p-2 rounded bg-white/5 border border-white/10">
    <div class="flex flex-col">
      <span class="hud-data-label text-[10px]">SURFACE GRAVITY</span>
      <span class="hud-data-value text-sm font-bold text-white/95">
        {surfaceParams.gravityG.toFixed(2)} G
      </span>
    </div>

    <div class="flex flex-col">
      <span class="hud-data-label text-[10px]">TEMPERATURE</span>
      <span class="hud-data-value text-sm font-bold text-white/95">
        {surfaceParams.temperatureK} K
        <span class="text-[10px] text-white/40">({(surfaceParams.temperatureK - 273.15).toFixed(0)}°C)</span>
      </span>
    </div>

    <div class="flex flex-col">
      <span class="hud-data-label text-[10px]">PLANETARY RADIUS</span>
      <span class="hud-data-value text-xs text-white/90">
        {surfaceParams.radiusKm.toLocaleString()} KM
      </span>
    </div>

    <div class="flex flex-col">
      <span class="hud-data-label text-[10px]">VOLCANISM</span>
      <span class="hud-data-value text-xs text-white/90 truncate" title={surfaceParams.volcanism}>
        {surfaceParams.volcanism}
      </span>
    </div>

    <div class="col-span-2 flex flex-col pt-1 border-t border-white/5">
      <span class="hud-data-label text-[10px]">ATMOSPHERE COMPOSITION</span>
      <span class="hud-data-value text-xs text-cyan-300">
        {surfaceParams.atmosphere}
      </span>
    </div>
  </div>

  <!-- DSS Detailed Surface Scanner Heatmap Toggle -->
  <div class="flex items-center justify-between p-2 rounded bg-[var(--hud-orange)]/10 border border-[var(--hud-orange)]/30">
    <div class="flex flex-col">
      <span class="text-xs font-bold text-[var(--hud-amber)]">DSS BIO/GEO HEATMAP</span>
      <span class="text-[10px] text-white/50">Multi-band radial projection</span>
    </div>
    <button
      type="button"
      onclick={toggleHeatmap}
      class="px-2.5 py-1 rounded text-xs font-bold uppercase transition-all {surfaceParams.dssHeatmapActive
        ? 'bg-cyan-500 text-black border border-cyan-300 shadow-[0_0_10px_rgba(0,255,213,0.5)]'
        : 'bg-white/10 text-white/50 hover:text-white'}"
    >
      {surfaceParams.dssHeatmapActive ? 'ACTIVE' : 'OFF'}
    </button>
  </div>

  <!-- Exobiology Signals & Minimum Colony Distance Rings (Task 3.4.3) -->
  <div class="flex flex-col gap-1.5 pt-1">
    <div class="flex items-center justify-between text-[11px]">
      <span class="hud-data-label">EXOBIOLOGY SIGNALS:</span>
      <span class="text-emerald-400 font-bold">{surfaceParams.specimens.length} DETECTED</span>
    </div>

    {#if surfaceParams.specimens.length > 0}
      <div class="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
        {#each surfaceParams.specimens as spec}
          <div class="flex items-center justify-between p-1.5 rounded bg-black/40 border border-white/10 text-[11px]">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full border border-white/30" style="background-color: {spec.colorHex};"></span>
              <span class="font-bold text-white/90">{spec.species}</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-[10px] text-emerald-300 font-mono">
                {spec.minColonyDistanceMeters}m RING
              </span>
            </div>
          </div>
        {/each}
      </div>
      <div class="text-[9px] text-white/40 italic">
        * Rings represent minimum biological distance between gene samples.
      </div>
    {:else}
      <div class="p-2 text-center text-white/40 text-[11px] rounded bg-black/30 border border-white/5">
        No biological signals discovered on this world.
      </div>
    {/if}
  </div>
</div>
