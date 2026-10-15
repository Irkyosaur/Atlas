<script lang="ts">
  import WebGPUCanvas from '$components/WebGPUCanvas.svelte';
  import TopNavHeader from '$components/TopNavHeader.svelte';
  import LeftDrawer, { type LayerSettings } from '$components/LeftDrawer.svelte';
  import RightDrawer, { type SystemDossier } from '$components/RightDrawer.svelte';
  import HudReticle from '$components/HudReticle.svelte';
  import type { NavigationMode } from '$components/ModeSwitcher.svelte';
  import { DEFAULT_TELEMETRY, type SessionTelemetry } from '$engine/session_telemetry';
  import type { SystemRecord } from '$engine/ananke_client';

  let activeMode = $state<NavigationMode>('galaxy');
  let telemetry = $state<SessionTelemetry>({ ...DEFAULT_TELEMETRY });

  // Stage 1.4: Drawer state and layer settings
  let isLeftDrawerOpen = $state<boolean>(true);
  let isRightDrawerOpen = $state<boolean>(true);

  let layerSettings = $state<LayerSettings>({
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
  });

  // Stage 5.1: Live mouse-hover coords & estimated star density
  let hoverDensityInfo = $state<{ x: number; y: number; z: number; densityStarsKpc3: number } | null>(null);

  // Active dossier for selected star system
  let activeDossier = $state<SystemDossier>({
    system: {
      id64: '10477373803',
      name: 'SOL',
      x: 0,
      y: 0,
      z: 0,
      primaryStarClass: 'G',
      population: 22780871769,
      allegiance: 'Federation',
      security: 'High',
      government: 'Democracy',
      controllingFaction: 'Sol Workers\' Party',
    },
    allegiance: 'Federation',
    government: 'Democracy',
    economy: 'Refinery / High Tech',
    security: 'High Security',
    population: 22780871769,
    controllingFaction: 'Sol Workers\' Party',
    factions: [
      { name: 'Sol Workers\' Party', influence: 0.542, state: 'Boom', allegiance: 'Federation' },
      { name: 'Mother Gaia', influence: 0.218, state: 'None', allegiance: 'Federation' },
      { name: 'Federal Congress', influence: 0.145, state: 'Election', allegiance: 'Federation' },
      { name: 'Aegis Core', influence: 0.095, state: 'Expansion', allegiance: 'Independent' },
    ],
    primaryBody: {
      name: 'Earth',
      subType: 'Earth-like world',
      gravity: 1.0,
      surfaceTemperature: 288,
      surfacePressure: 1.0,
      atmosphereType: 'Suitable for water-based life',
      volcanism: 'Major water geysers',
      terraformState: 'Terraformed',
      landable: false,
    },
  });

  function handleSelectSystem(system: SystemRecord) {
    const dist = Math.sqrt(system.x * system.x + system.y * system.y + system.z * system.z);
    telemetry.currentSystem = system.name;
    telemetry.distanceSol = dist;

    // Update active dossier with selected system
    activeDossier.system = system;
    activeDossier.allegiance = system.allegiance || 'Independent';
    activeDossier.government = system.government || 'Corporate';
    activeDossier.security = system.security || 'Medium Security';
    activeDossier.population = system.population || 0;
    activeDossier.controllingFaction = system.controllingFaction || `${system.name} Corp`;

    // Ensure Right Drawer is open to present the dossier
    isRightDrawerOpen = true;
  }

  import HierarchyTree from '$components/HierarchyTree.svelte';
  import OrreryTimeline from '$components/OrreryTimeline.svelte';
  import DssTelemetryCard from '$components/DssTelemetryCard.svelte';
  import RoutePlannerPanel from '$components/RoutePlannerPanel.svelte';
  import type { HierarchyNodeData } from '$engine/hierarchy_parser';
  import type { CelestialAlignment } from '$engine/ephemeris';
  import type { RoutePlotResult, RouteWaypoint } from '$engine/route_pipeline';
  import {
    type PlanetarySurfaceParams,
    CANONICAL_LANDABLE_BIO_BODY,
  } from '$engine/dss_surface_pipeline';

  // Stage 3.3: Orbital time scrubber & ephemeris timeline state
  let orrerySimTimeSec = $state<number>(0);
  let lockedBodyName = $state<string | null>(null);
  let activeAlignments = $state<CelestialAlignment[]>([]);

  // Stage 3.4: DSS Surface Cartography & Exobiology state
  let currentSurfaceParams = $state<PlanetarySurfaceParams>({
    ...CANONICAL_LANDABLE_BIO_BODY,
  });

  // Stage 4.1: A* Route Planner HUD state
  let isRoutePlannerOpen = $state<boolean>(false);
  let plottedRouteWaypoints = $state<RouteWaypoint[]>([]);

  function handleRoutePlotted(result: RoutePlotResult) {
    plottedRouteWaypoints = result.waypoints;
  }

  function handleFocusWaypoint(wp: RouteWaypoint) {
    telemetry.currentSystem = wp.systemName;
    const dist = Math.sqrt(wp.x * wp.x + wp.y * wp.y + wp.z * wp.z);
    telemetry.distanceSol = dist;
    activeDossier.system = {
      id64: `${wp.x}_${wp.y}_${wp.z}`,
      name: wp.systemName,
      x: wp.x,
      y: wp.y,
      z: wp.z,
      primaryStarClass: wp.starClass,
      population: 0,
      allegiance: 'Independent',
      security: 'Medium',
    };
  }

  function handleAlignmentsDetected(alignments: CelestialAlignment[]) {
    activeAlignments = alignments;
  }

  function handleSelectHierarchyNode(node: HierarchyNodeData) {
    if (node.type === 'planet' || node.type === 'moon') {
      activeDossier.primaryBody = {
        name: node.name,
        subType: node.subType,
        gravity: node.gravityG ?? 1.0,
        surfaceTemperature: node.temperatureK ?? 288,
        surfacePressure: 1.0,
        atmosphereType: node.atmosphere || 'Standard atmosphere',
        volcanism: 'None',
        terraformState: node.terraformable ? 'Terraformable' : 'Not terraformable',
        landable: node.landable ?? false,
      };

      currentSurfaceParams = {
        name: node.name,
        subType: node.subType,
        radiusKm: node.radiusKm ?? 3000,
        gravityG: node.gravityG ?? 1.0,
        temperatureK: node.temperatureK ?? 288,
        volcanism: 'None',
        atmosphere: node.atmosphere || 'Standard atmosphere',
        landable: node.landable ?? false,
        dssHeatmapActive: currentSurfaceParams.dssHeatmapActive,
        specimens: node.landable ? CANONICAL_LANDABLE_BIO_BODY.specimens : [],
      };

      isRightDrawerOpen = true;
    }
  }
</script>

<main class="relative w-screen h-screen overflow-hidden bg-[#030508] text-white font-sans select-none">
  <!-- Dynamic Viewport: WebGPU Galaxy Engine or 2D System Hierarchy Tree Layout -->
  {#if activeMode === 'system'}
    <div class="absolute inset-0 z-10 pt-14 pb-10">
      <HierarchyTree
        systemName={telemetry.currentSystem}
        onSelectNode={handleSelectHierarchyNode}
      />
    </div>
  {:else}
    <!-- WebGPU / WebGL2 Fullscreen Canvas for Galaxy & 3D Orrery Views -->
    <div class="absolute inset-0 z-0">
      <WebGPUCanvas
        activeMode={activeMode}
        selectedStar={activeDossier.system}
        powerplayEnabled={layerSettings.powerplay2}
        thargoidWarEnabled={layerSettings.thargoidWar}
        heatmapDensity={layerSettings.heatmapDensity}
        heatmapColorRamp={layerSettings.heatmapColorRamp}
        heatmapBlending={layerSettings.heatmapBlending}
        orrerySimTimeSec={orrerySimTimeSec}
        lockedBodyName={lockedBodyName}
        surfaceParams={currentSurfaceParams}
        routeWaypoints={plottedRouteWaypoints}
        onAlignmentsDetected={handleAlignmentsDetected}
        onHoverCoordsChange={(info) => (hoverDensityInfo = info)}
      />
    </div>
  {/if}

  <!-- Stage 3.3: Orrery Ephemeris Timeline & Syzygy Alignment Controller (Active in Orrery Mode) -->
  {#if activeMode === 'orrery'}
    <div class="absolute bottom-14 inset-x-0 z-20 px-6 pointer-events-none">
      <OrreryTimeline
        bind:simTimeSec={orrerySimTimeSec}
        bind:lockedBody={lockedBodyName}
        alignments={activeAlignments}
      />
    </div>
  {/if}

  <!-- Stage 3.4: DSS Surface Cartography Telemetry Card (Active in Surface Mode) -->
  {#if activeMode === 'surface'}
    <div class="absolute top-20 left-16 z-20 pointer-events-none">
      <DssTelemetryCard bind:surfaceParams={currentSurfaceParams} />
    </div>
  {/if}

  <!-- Stage 4.1: A* Route Planner HUD Panel -->
  <RoutePlannerPanel
    bind:isOpen={isRoutePlannerOpen}
    onPlotRoute={handleRoutePlotted}
    onClose={() => (isRoutePlannerOpen = false)}
    onFocusWaypoint={handleFocusWaypoint}
  />

  <!-- CRT Scanline & Chromatic Vignette Overlays -->
  <div class="crt-overlay"></div>
  <div class="crt-vignette"></div>

  <!-- Ambient Cobra HUD Glow Lines (Top & Bottom) -->
  <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--hud-orange)]/80 to-transparent z-30"></div>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[var(--hud-orange)]/50 to-transparent z-30"></div>

  <!-- Stage 1.3: Top Navigation Header with Search, Mode Switcher & Telemetry -->
  <TopNavHeader
    bind:activeMode
    bind:telemetry
    onSelectSystem={handleSelectSystem}
  />

  <!-- Stage 1.4: Left Collapsible Drawer (Layer Toggles, Frontlines, Heatmap) -->
  <LeftDrawer
    bind:layers={layerSettings}
    bind:isOpen={isLeftDrawerOpen}
  />

  <!-- Stage 1.4: Right Collapsible Drawer (System & Body Dossiers, Factions) -->
  <RightDrawer
    bind:dossier={activeDossier}
    bind:isOpen={isRightDrawerOpen}
  />

  <!-- Stage 1.4 & Stage 5.1: HUD Targeting Reticle with Corner Brackets, Crosshairs & Density Readout -->
  <HudReticle
    targetName={telemetry.currentSystem}
    targetDistanceLy={telemetry.distanceSol}
    estimatedDensityStarsKpc3={layerSettings.heatmapDensity !== 'off' ? hoverDensityInfo?.densityStarsKpc3 : null}
    locked={true}
  />

  <!-- Active View Indicator / Mode Banner (Bottom-Left) -->
  <div class="absolute bottom-3 left-14 z-20 flex items-center space-x-3 px-3 py-1.5 bg-black/60 border border-[var(--hud-orange)]/30 rounded backdrop-blur-sm font-mono text-xs">
    <span class="hud-data-label">MODE:</span>
    <span class="text-[var(--hud-amber)] font-bold uppercase tracking-wider">{activeMode} MAP</span>
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isRoutePlannerOpen = !isRoutePlannerOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isRoutePlannerOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30'}"
    >
      <span>⚡ ROUTE PLANNER</span>
      {#if plottedRouteWaypoints.length > 0}
        <span class="px-1 py-0.2 text-[9px] rounded bg-emerald-500 text-black font-bold">
          {plottedRouteWaypoints.length} JUMPS
        </span>
      {/if}
    </button>
  </div>
</main>
