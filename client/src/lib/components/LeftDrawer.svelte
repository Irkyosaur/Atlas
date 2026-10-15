<script lang="ts">
  import Icon from '$components/Icon.svelte';

  export interface LayerSettings {
    powerplay2: boolean;
    thargoidWar: boolean;
    fleetCarriers: boolean;
    heatmapDensity: 'off' | 'low' | 'medium' | 'high';
    heatmapColorRamp: 'inferno' | 'thermal' | 'void';
    heatmapBlending: 'additive' | 'standard';
    tradeRoutes: boolean;
    starSpectralFilter: {
      O: boolean;
      B: boolean;
      A: boolean;
      F: boolean;
      G: boolean;
      K: boolean;
      M: boolean;
      Neutron: boolean;
    };
  }

  interface Props {
    layers: LayerSettings;
    isOpen?: boolean;
    onToggleLayer?: <K extends keyof LayerSettings>(key: K, value: LayerSettings[K]) => void;
  }

  let {
    layers = $bindable(),
    isOpen = $bindable(true),
    onToggleLayer,
  }: Props = $props();

  function toggleDrawer() {
    isOpen = !isOpen;
  }

  function handleLayerToggle<K extends keyof LayerSettings>(key: K, val: LayerSettings[K]) {
    layers[key] = val;
    if (onToggleLayer) {
      onToggleLayer(key, val);
    }
  }

  function toggleSpectral(star: keyof LayerSettings['starSpectralFilter']) {
    layers.starSpectralFilter[star] = !layers.starSpectralFilter[star];
  }
</script>

<!-- Outer Drawer Container with hardware accelerated transitions -->
<aside
  class="absolute top-14 bottom-10 left-0 z-20 flex transition-transform duration-300 ease-out will-change-transform select-none {isOpen
    ? 'translate-x-0'
    : '-translate-x-[calc(100%-2.5rem)]'}"
  aria-label="Layer toggles and Cartography Filters"
>
  <!-- Main Drawer Panel -->
  <div
    class="w-72 sm:w-80 h-full bg-[var(--hud-bg)]/92 border-r border-t border-b border-[var(--hud-orange)]/40 backdrop-blur-md flex flex-col shadow-2xl overflow-hidden"
  >
    <!-- Drawer Header -->
    <div class="px-4 py-3 border-b border-[var(--hud-orange)]/30 flex items-center justify-between bg-black/40">
      <div class="flex items-center space-x-2">
        <Icon name="reticle" size={16} glow={true} color="var(--hud-orange)" />
        <span class="hud-data-label font-bold tracking-wider text-xs text-[var(--hud-orange)]">
          CARTOGRAPHY FILTERS & LAYERS
        </span>
      </div>
      <span class="text-[10px] font-mono text-[var(--ed-orange-dim)]">V2.4</span>
    </div>

    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-mono text-xs divide-y divide-[var(--hud-orange)]/20">
      <!-- Section 1: Strategic Tactical Overlays -->
      <div class="space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span>STRATEGIC OVERLAYS</span>
          <span class="text-[9px] text-[var(--ed-orange-dim)]">POLITICAL/AX</span>
        </div>

        <!-- Powerplay 2.0 Toggle -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full {layers.powerplay2 ? 'bg-[#ff9800] shadow-[0_0_8px_#ff9800]' : 'bg-white/20'}"></span>
            <div>
              <div class="text-white font-medium">Powerplay 2.0</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Stronghold & sphere of influence</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.powerplay2}
            onchange={(e) => handleLayerToggle('powerplay2', e.currentTarget.checked)}
            class="accent-[var(--hud-orange)] w-4 h-4 cursor-pointer"
          />
        </label>

        <!-- Thargoid War Frontlines -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <Icon name="maelstrom" size={16} glow={layers.thargoidWar} />
            <div>
              <div class="text-white font-medium flex items-center space-x-1.5">
                <span>Thargoid War</span>
                <span class="px-1 text-[9px] bg-red-950/80 text-red-400 border border-red-500/40 rounded">AX FRONT</span>
              </div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Titan invasion zones & recovery</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.thargoidWar}
            onchange={(e) => handleLayerToggle('thargoidWar', e.currentTarget.checked)}
            class="accent-red-500 w-4 h-4 cursor-pointer"
          />
        </label>

        <!-- Fleet Carriers Presence -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <Icon name="fleet-carrier" size={16} glow={layers.fleetCarriers} />
            <div>
              <div class="text-white font-medium">Fleet Carriers</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Public DSSA & squadron berths</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.fleetCarriers}
            onchange={(e) => handleLayerToggle('fleetCarriers', e.currentTarget.checked)}
            class="accent-cyan-400 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      <!-- Section 2: Heatmap & Stellar Density -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span>STELLAR HEATMAP DENSITY</span>
          <span class="text-[9px] text-[var(--hud-orange)] uppercase">{layers.heatmapDensity}</span>
        </div>

        <!-- Density Level Buttons -->
        <div class="grid grid-cols-4 gap-1.5 bg-black/40 p-1.5 rounded border border-[var(--hud-orange)]/25">
          {#each ['off', 'low', 'medium', 'high'] as const as level}
            <button
              type="button"
              class="py-1 rounded text-center text-[10px] uppercase transition-all {layers.heatmapDensity === level
                ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
                : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20'}"
              onclick={() => handleLayerToggle('heatmapDensity', level)}
            >
              {level}
            </button>
          {/each}
        </div>

        {#if layers.heatmapDensity !== 'off'}
          <!-- Color Ramp Selector -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[10px] text-white/70">
              <span>COLOR TRANSFER RAMP:</span>
              <span class="text-[var(--hud-amber)] font-bold uppercase">{layers.heatmapColorRamp}</span>
            </div>
            <div class="grid grid-cols-3 gap-1">
              <button
                type="button"
                class="px-1.5 py-1 rounded text-[9px] uppercase border transition-all text-center {layers.heatmapColorRamp === 'inferno'
                  ? 'bg-gradient-to-r from-purple-950 via-orange-950 to-amber-950 border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold shadow-sm'
                  : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => handleLayerToggle('heatmapColorRamp', 'inferno')}
                title="EDAstro Legacy Colormap (Purple-Orange-Yellow)"
              >
                EDASTRO
              </button>
              <button
                type="button"
                class="px-1.5 py-1 rounded text-[9px] uppercase border transition-all text-center {layers.heatmapColorRamp === 'thermal'
                  ? 'bg-gradient-to-r from-cyan-950 via-emerald-950 to-red-950 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                  : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => handleLayerToggle('heatmapColorRamp', 'thermal')}
                title="Thermal Density Ramp (Cyan-Green-Amber-Plasma Red)"
              >
                THERMAL
              </button>
              <button
                type="button"
                class="px-1.5 py-1 rounded text-[9px] uppercase border transition-all text-center {layers.heatmapColorRamp === 'void'
                  ? 'bg-gradient-to-r from-indigo-950 to-cyan-950 border-indigo-400 text-indigo-300 font-bold shadow-sm'
                  : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => handleLayerToggle('heatmapColorRamp', 'void')}
                title="Unvisited Exploration Void Mode (Emphasizes virgin unexplored sectors)"
              >
                VOID EXP
              </button>
            </div>
          </div>

          <!-- Blend Mode -->
          <div class="flex items-center justify-between text-[10px] text-white/70 pt-1">
            <span>BLENDING MODE:</span>
            <div class="flex space-x-1">
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[9px] uppercase border {layers.heatmapBlending === 'additive'
                  ? 'bg-[var(--hud-orange)] text-black font-bold'
                  : 'bg-black/30 border-white/10 text-white/50'}"
                onclick={() => handleLayerToggle('heatmapBlending', 'additive')}
              >
                ADDITIVE
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[9px] uppercase border {layers.heatmapBlending === 'standard'
                  ? 'bg-[var(--hud-orange)] text-black font-bold'
                  : 'bg-black/30 border-white/10 text-white/50'}"
                onclick={() => handleLayerToggle('heatmapBlending', 'standard')}
              >
                ALPHA
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Section 3: Spectral Class Star Filters -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span>SPECTRAL CLASS FILTERS</span>
          <span class="text-[9px] text-[var(--ed-orange-dim)]">KGBFOAM</span>
        </div>

        <div class="grid grid-cols-4 gap-1.5">
          {#each (['O', 'B', 'A', 'F', 'G', 'K', 'M', 'Neutron'] as const) as star}
            <button
              type="button"
              class="px-2 py-1.5 rounded text-xs font-mono uppercase border transition-all flex items-center justify-between {layers.starSpectralFilter[star]
                ? 'bg-black/80 border-[var(--hud-orange)] text-white shadow-sm'
                : 'bg-black/20 border-white/10 text-white/30'}"
              onclick={() => toggleSpectral(star)}
            >
              <span class="font-bold">{star}</span>
              <span
                class="w-1.5 h-1.5 rounded-full {layers.starSpectralFilter[star]
                  ? 'bg-[var(--hud-orange)]'
                  : 'bg-white/20'}"
              ></span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Drawer Footer Actions -->
    <div class="p-3 border-t border-[var(--hud-orange)]/30 bg-black/60 flex items-center justify-between text-[11px]">
      <button
        type="button"
        class="text-[var(--ed-orange-dim)] hover:text-[var(--hud-orange)] uppercase"
        onclick={() => {
          layers = {
            powerplay2: true,
            thargoidWar: true,
            fleetCarriers: true,
            heatmapDensity: 'medium',
            heatmapColorRamp: 'inferno',
            heatmapBlending: 'additive',
            tradeRoutes: false,
            starSpectralFilter: {
              O: true,
              B: true,
              A: true,
              F: true,
              G: true,
              K: true,
              M: true,
              Neutron: true,
            },
          };
        }}
      >
        RESET FILTERS
      </button>

      <span class="text-[var(--hud-orange)] font-mono">100% ONLINE</span>
    </div>
  </div>

  <!-- Collapsible Toggle Tab Handle -->
  <button
    type="button"
    class="w-10 h-28 my-auto bg-[var(--hud-bg)]/95 border-r border-t border-b border-[var(--hud-orange)]/50 rounded-r flex flex-col items-center justify-center text-[var(--hud-orange)] hover:text-white hover:bg-[var(--hud-orange)]/25 transition-colors shadow-lg cursor-pointer"
    onclick={toggleDrawer}
    aria-label={isOpen ? 'Collapse Layers Drawer' : 'Expand Layers Drawer'}
    title={isOpen ? 'Collapse Filters (Left)' : 'Expand Filters (Left)'}
  >
    <div class="text-[9px] font-mono uppercase tracking-widest -rotate-90 whitespace-nowrap mb-2">
      {isOpen ? 'COLLAPSE' : 'LAYERS'}
    </div>
    <span class="text-xs transition-transform duration-200 {isOpen ? 'rotate-180' : ''}">
      ▶
    </span>
  </button>
</aside>
