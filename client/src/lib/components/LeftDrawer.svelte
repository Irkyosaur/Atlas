<script lang="ts">
  import Icon from '$components/Icon.svelte';

  export interface LayerSettings {
    powerplay2: boolean;
    thargoidWar: boolean;
    fleetCarriers: boolean;
    dssaNetwork: boolean;
    dssaOperationalOnly: boolean;
    dssaServiceFilter: {
      refuel: boolean;
      repair: boolean;
      armory: boolean;
      vistaGenomics: boolean;
      universalCartographics: boolean;
      pioneerSupplies: boolean;
    };
    expeditionLayer: boolean;
    poiCodexLayer: boolean;
    poiCategoryFilter: {
      generation_ship: boolean;
      guardian_structure: boolean;
      guardian_ruins: boolean;
      thargoid_surface_site: boolean;
      thargoid_titan_remnant: boolean;
      crashed_ship: boolean;
      abandoned_settlement: boolean;
      megaship: boolean;
    };
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
    activeExpeditionName?: string;
    onToggleLayer?: <K extends keyof LayerSettings>(key: K, value: LayerSettings[K]) => void;
    onOpenDssaFinder?: () => void;
    onOpenExpeditionTheater?: () => void;
    onOpenPoiCodex?: () => void;
    onOpenMarketTable?: () => void;
    onOpenSingleHop?: () => void;
    onOpenCircularLoop?: () => void;
  }

  let {
    layers = $bindable(),
    isOpen = $bindable(true),
    activeExpeditionName = 'Distant Worlds 2',
    onToggleLayer,
    onOpenDssaFinder,
    onOpenExpeditionTheater,
    onOpenPoiCodex,
    onOpenMarketTable,
    onOpenSingleHop,
    onOpenCircularLoop,
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
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Public berths & civilian routes</div>
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

      <!-- Section: Deep Space Support Array (DSSA) Havens (Stage 5.2) -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span class="flex items-center space-x-1.5">
            <Icon name="dssa" size={14} color="var(--hud-amber)" />
            <span>DSSA PERMANENT HAVENS</span>
          </span>
          <span class="text-[9px] text-[var(--hud-amber)] font-mono">42 REGIONS</span>
        </div>

        <!-- Master DSSA Layer Toggle -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border {layers.dssaNetwork ? 'border-[var(--hud-amber)]/60 shadow-[0_0_10px_rgba(255,179,0,0.15)]' : 'border-[var(--hud-orange)]/25'} hover:border-[var(--hud-amber)] cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full {layers.dssaNetwork ? 'bg-[var(--hud-amber)] shadow-[0_0_8px_#ffb300]' : 'bg-white/20'}"></span>
            <div>
              <div class="text-white font-medium">DSSA Haven Beacons</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Persistent 3D amber beacons & stalks</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.dssaNetwork}
            onchange={(e) => handleLayerToggle('dssaNetwork', e.currentTarget.checked)}
            class="accent-[var(--hud-amber)] w-4 h-4 cursor-pointer"
          />
        </label>

        {#if layers.dssaNetwork}
          <!-- Operational Only Toggle -->
          <div class="flex items-center justify-between px-2 py-1.5 rounded bg-black/30 border border-white/10 text-[10px]">
            <span class="text-white/80">OPERATIONAL CARRIERS ONLY:</span>
            <input
              type="checkbox"
              checked={layers.dssaOperationalOnly}
              onchange={(e) => handleLayerToggle('dssaOperationalOnly', e.currentTarget.checked)}
              class="accent-[var(--hud-amber)] w-3.5 h-3.5 cursor-pointer"
            />
          </div>

          <!-- Required Station Services Filters -->
          <div class="space-y-1.5">
            <div class="text-[10px] text-white/60">FILTER BY STATION SERVICES:</div>
            <div class="grid grid-cols-2 gap-1 text-[10px]">
              {#each (['refuel', 'repair', 'armory', 'vistaGenomics', 'universalCartographics', 'pioneerSupplies'] as const) as service}
                <button
                  type="button"
                  class="px-2 py-1 rounded text-left border flex items-center justify-between transition-colors {layers.dssaServiceFilter[service] ? 'bg-[var(--hud-amber)]/20 border-[var(--hud-amber)] text-[var(--hud-amber)] font-bold' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                  onclick={() => {
                    layers.dssaServiceFilter[service] = !layers.dssaServiceFilter[service];
                  }}
                >
                  <span class="capitalize">{service === 'vistaGenomics' ? 'Genomics' : service === 'universalCartographics' ? 'Cartographics' : service === 'pioneerSupplies' ? 'Pioneer' : service}</span>
                  <span class="w-1.5 h-1.5 rounded-full {layers.dssaServiceFilter[service] ? 'bg-[var(--hud-amber)]' : 'bg-white/20'}"></span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Emergency DSSA Haven Finder Launcher -->
          <button
            type="button"
            class="w-full py-2 px-3 rounded bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)]/60 text-[var(--hud-amber)] hover:bg-[var(--hud-amber)] hover:text-black font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
            onclick={() => {
              if (onOpenDssaFinder) onOpenDssaFinder();
            }}
          >
            <span>🚨</span>
            <span>NEAREST DSSA FINDER</span>
          </button>
        {/if}
      </div>

      <!-- Section: 4D Historical Expedition Playback (Stage 5.3) -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span class="flex items-center space-x-1.5">
            <Icon name="reticle" size={14} color="var(--hud-amber)" />
            <span>HISTORIC EXPEDITIONS</span>
          </span>
          <span class="text-[9px] text-[var(--hud-orange)] font-mono">4D THEATER</span>
        </div>

        <!-- Master Expedition Layer Toggle -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border {layers.expeditionLayer ? 'border-[var(--hud-orange)]/60 shadow-[0_0_10px_rgba(255,113,0,0.15)]' : 'border-[var(--hud-orange)]/25'} hover:border-[var(--hud-orange)] cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full {layers.expeditionLayer ? 'bg-[var(--hud-orange)] shadow-[0_0_8px_#ff7100]' : 'bg-white/20'}"></span>
            <div>
              <div class="text-white font-medium">Expedition & Swarm Layer</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">{activeExpeditionName}</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.expeditionLayer}
            onchange={(e) => handleLayerToggle('expeditionLayer', e.currentTarget.checked)}
            class="accent-[var(--hud-orange)] w-4 h-4 cursor-pointer"
          />
        </label>

        <!-- Expedition Theater Launch Button -->
        <button
          type="button"
          class="w-full py-2 px-3 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/60 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)] hover:text-black font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
          onclick={() => {
            if (onOpenExpeditionTheater) onOpenExpeditionTheater();
          }}
        >
          <span>🚀</span>
          <span>LAUNCH EXPEDITION THEATER</span>
        </button>
      </div>

      <!-- Section: Canonn POIs & Audio Codex (Stage 5.4) -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span class="flex items-center space-x-1.5">
            <Icon name="reticle" size={14} color="var(--hud-amber)" />
            <span>CANONN CODEX & POIS</span>
          </span>
          <span class="text-[9px] text-[var(--hud-orange)] font-mono">STAGE 5.4</span>
        </div>

        <!-- Master POI Codex Layer Toggle -->
        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border {layers.poiCodexLayer ? 'border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-[var(--hud-orange)]/25'} hover:border-amber-500 cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full {layers.poiCodexLayer ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-white/20'}"></span>
            <div>
              <div class="text-white font-medium">Generation Ships & POIs</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">3D Glyphs, Stalks & Transcripts</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.poiCodexLayer}
            onchange={(e) => handleLayerToggle('poiCodexLayer', e.currentTarget.checked)}
            class="accent-amber-500 w-4 h-4 cursor-pointer"
          />
        </label>

        {#if layers.poiCodexLayer}
          <!-- POI Category Filter Toggles -->
          <div class="space-y-1.5">
            <div class="text-[10px] text-white/60">POI SITE CLASSIFICATIONS:</div>
            <div class="grid grid-cols-2 gap-1 text-[10px]">
              <button
                type="button"
                class="px-2 py-1 rounded text-left border flex items-center justify-between transition-colors {layers.poiCategoryFilter.generation_ship ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => {
                  layers.poiCategoryFilter.generation_ship = !layers.poiCategoryFilter.generation_ship;
                }}
              >
                <span>Gen Ships</span>
                <span class="w-1.5 h-1.5 rounded-full {layers.poiCategoryFilter.generation_ship ? 'bg-amber-400' : 'bg-white/20'}"></span>
              </button>
              <button
                type="button"
                class="px-2 py-1 rounded text-left border flex items-center justify-between transition-colors {layers.poiCategoryFilter.guardian_structure ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => {
                  layers.poiCategoryFilter.guardian_structure = !layers.poiCategoryFilter.guardian_structure;
                  layers.poiCategoryFilter.guardian_ruins = layers.poiCategoryFilter.guardian_structure;
                }}
              >
                <span>Guardian</span>
                <span class="w-1.5 h-1.5 rounded-full {layers.poiCategoryFilter.guardian_structure ? 'bg-cyan-400' : 'bg-white/20'}"></span>
              </button>
              <button
                type="button"
                class="px-2 py-1 rounded text-left border flex items-center justify-between transition-colors {layers.poiCategoryFilter.thargoid_surface_site ? 'bg-lime-500/20 border-lime-500 text-lime-300 font-bold' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => {
                  layers.poiCategoryFilter.thargoid_surface_site = !layers.poiCategoryFilter.thargoid_surface_site;
                  layers.poiCategoryFilter.thargoid_titan_remnant = layers.poiCategoryFilter.thargoid_surface_site;
                }}
              >
                <span>Thargoid/Titan</span>
                <span class="w-1.5 h-1.5 rounded-full {layers.poiCategoryFilter.thargoid_surface_site ? 'bg-lime-400' : 'bg-white/20'}"></span>
              </button>
              <button
                type="button"
                class="px-2 py-1 rounded text-left border flex items-center justify-between transition-colors {layers.poiCategoryFilter.crashed_ship ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}"
                onclick={() => {
                  layers.poiCategoryFilter.crashed_ship = !layers.poiCategoryFilter.crashed_ship;
                }}
              >
                <span>Crashed Ships</span>
                <span class="w-1.5 h-1.5 rounded-full {layers.poiCategoryFilter.crashed_ship ? 'bg-rose-400' : 'bg-white/20'}"></span>
              </button>
            </div>
          </div>

          <!-- Open Codex Modal Button -->
          <button
            type="button"
            class="w-full py-2 px-3 rounded bg-amber-500/15 border border-amber-500/60 text-amber-300 hover:bg-amber-500 hover:text-black font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
            onclick={() => {
              if (onOpenPoiCodex) onOpenPoiCodex();
            }}
          >
            <span>📻</span>
            <span>OPEN AUDIO CODEX (THETIS)</span>
          </button>
        {/if}
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

      <!-- Section: Phase 06 Commodity Market & Trade Routes (Stage 6.1 & 6.2) -->
      <div class="pt-4 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
          <span>COMMODITY MARKETS & TRADE</span>
          <span class="text-[9px] text-[var(--ed-orange-dim)]">PHASE 06</span>
        </div>

        <div class="grid grid-cols-3 gap-1">
          <button
            type="button"
            class="py-2 px-1 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/60 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)] hover:text-black font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            onclick={() => {
              if (onOpenMarketTable) onOpenMarketTable();
            }}
          >
            <span>📊</span>
            <span>MARKET</span>
          </button>

          <button
            type="button"
            class="py-2 px-1 rounded bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)]/60 text-[var(--hud-amber)] hover:bg-[var(--hud-amber)] hover:text-black font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            onclick={() => {
              if (onOpenSingleHop) onOpenSingleHop();
            }}
          >
            <span>🚀</span>
            <span>SINGLE</span>
          </button>

          <button
            type="button"
            class="py-2 px-1 rounded bg-emerald-500/15 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500 hover:text-black font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            onclick={() => {
              if (onOpenCircularLoop) onOpenCircularLoop();
            }}
          >
            <span>🔄</span>
            <span>LOOPS</span>
          </button>
        </div>

        <label
          class="flex items-center justify-between p-2 rounded bg-black/40 border border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 cursor-pointer transition-colors"
        >
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full {layers.tradeRoutes ? 'bg-[var(--hud-amber)] shadow-[0_0_8px_var(--hud-amber)]' : 'bg-white/20'}"></span>
            <div>
              <div class="text-white font-medium">Trade Routes Overlay</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Inter-system commodity flow corridors</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={layers.tradeRoutes}
            onchange={(e) => handleLayerToggle('tradeRoutes', e.currentTarget.checked)}
            class="accent-[var(--hud-orange)] w-4 h-4 cursor-pointer"
          />
        </label>
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
            dssaNetwork: true,
            dssaOperationalOnly: true,
            dssaServiceFilter: {
              refuel: false,
              repair: false,
              armory: false,
              vistaGenomics: false,
              universalCartographics: false,
              pioneerSupplies: false,
            },
            expeditionLayer: true,
            poiCodexLayer: true,
            poiCategoryFilter: {
              generation_ship: true,
              guardian_structure: true,
              guardian_ruins: true,
              thargoid_surface_site: true,
              thargoid_titan_remnant: true,
              crashed_ship: true,
              abandoned_settlement: true,
              megaship: true,
            },
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
