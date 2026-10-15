<script lang="ts">
  import { onMount } from 'svelte';
  import WebGPUCanvas from '$components/WebGPUCanvas.svelte';
  import TopNavHeader from '$components/TopNavHeader.svelte';
  import LeftDrawer, { type LayerSettings } from '$components/LeftDrawer.svelte';
  import RightDrawer, { type SystemDossier } from '$components/RightDrawer.svelte';
  import HudReticle from '$components/HudReticle.svelte';
  import DssaCarrierCard from '$components/DssaCarrierCard.svelte';
  import DssaEmergencyFinder from '$components/DssaEmergencyFinder.svelte';
  import type { NavigationMode } from '$components/ModeSwitcher.svelte';
  import { DEFAULT_TELEMETRY, type SessionTelemetry } from '$engine/session_telemetry';
  import { ananke, type SystemRecord } from '$engine/ananke_client';
  import {
    type DssaCarrier,
    EMBEDDED_DSSA_REGISTRY,
    filterDssaCarriers,
  } from '$engine/dssa_registry';
  import ExpeditionTheater from '$components/ExpeditionTheater.svelte';
  import {
    type Expedition,
    type ExpeditionWaypoint,
    DISTANT_WORLDS_2_EXPEDITION,
    parseExpeditionFromPermalink,
  } from '$engine/expeditions';

  let activeMode = $state<NavigationMode>('galaxy');
  let telemetry = $state<SessionTelemetry>({ ...DEFAULT_TELEMETRY });

  // Stage 1.4: Drawer state and layer settings
  let isLeftDrawerOpen = $state<boolean>(true);
  let isRightDrawerOpen = $state<boolean>(true);

  let layerSettings = $state<LayerSettings>({
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

  // Stage 5.2: DSSA Permanent Fleet Carrier Network State
  let dssaCarriers = $state<DssaCarrier[]>(EMBEDDED_DSSA_REGISTRY);
  let selectedDssaCarrier = $state<DssaCarrier | null>(null);
  let isDssaCardOpen = $state<boolean>(false);
  let isDssaFinderOpen = $state<boolean>(false);
  let routeOrigin = $state<string>('Sol');
  let routeDestination = $state<string>('Colonia');

  // Stage 5.3: 4D Historical Expedition Playback Theater State
  let activeExpedition = $state<Expedition>(DISTANT_WORLDS_2_EXPEDITION);
  let isExpeditionTheaterOpen = $state<boolean>(false);
  let expeditionPlaybackProgress = $state<number>(0.0);
  let isExpeditionPlaying = $state<boolean>(false);

  onMount(async () => {
    try {
      const carriers = await ananke.getDssaCarriers();
      if (carriers && carriers.length > 0) {
        dssaCarriers = carriers;
      }
    } catch {
      // Keep embedded fallback
    }

    // Stage 5.3: Check URL query / permalink for shared expeditions
    try {
      if (typeof window !== 'undefined') {
        const queryOrHash = window.location.search || window.location.hash;
        if (queryOrHash && queryOrHash.includes('expedition=')) {
          const permalinkExp = parseExpeditionFromPermalink(queryOrHash);
          if (permalinkExp) {
            activeExpedition = permalinkExp;
            isExpeditionTheaterOpen = true;
          }
        }
      }
    } catch {
      // Ignore permalink parse errors
    }
  });

  // Filtered DSSA carriers based on layer controls
  let activeDssaCarriers = $derived.by(() => {
    return filterDssaCarriers(dssaCarriers, {
      operationalOnly: layerSettings.dssaOperationalOnly,
      requiredServices: layerSettings.dssaServiceFilter,
    });
  });

  function handleSelectDssaCarrier(carrier: DssaCarrier) {
    selectedDssaCarrier = carrier;
    isDssaCardOpen = true;
    telemetry.currentSystem = carrier.systemName;
    const dist = Math.hypot(carrier.coords.x, carrier.coords.y, carrier.coords.z);
    telemetry.distanceSol = dist;
    activeDossier.system = {
      id64: `${carrier.coords.x}_${carrier.coords.y}_${carrier.coords.z}`,
      name: carrier.systemName,
      x: carrier.coords.x,
      y: carrier.coords.y,
      z: carrier.coords.z,
      primaryStarClass: 'Carrier Haven',
      population: 2500,
      allegiance: 'Independent',
      security: 'High',
    };
  }

  function handlePlotDssaEmergencyRoute(systemName: string) {
    routeOrigin = telemetry.currentSystem || 'Sol';
    routeDestination = systemName;
    isRoutePlannerOpen = true;
    isDssaCardOpen = false;
    isDssaFinderOpen = false;
  }

  function handleFocusDssaCarrierCoords(coords: { x: number; y: number; z: number }) {
    activeDossier.system = {
      id64: `${coords.x}_${coords.y}_${coords.z}`,
      name: selectedDssaCarrier?.systemName || 'DSSA Carrier',
      x: coords.x,
      y: coords.y,
      z: coords.z,
      primaryStarClass: 'Carrier Haven',
      population: 2500,
      allegiance: 'Independent',
      security: 'High',
    };
  }

  // Stage 5.3: Waypoint & Swarm selection handlers
  function handleSelectExpeditionWaypoint(wp: ExpeditionWaypoint) {
    telemetry.currentSystem = wp.systemName;
    const dist = Math.hypot(wp.coords.x, wp.coords.y, wp.coords.z);
    telemetry.distanceSol = dist;
    activeDossier.system = {
      id64: `${wp.coords.x}_${wp.coords.y}_${wp.coords.z}`,
      name: wp.systemName,
      x: wp.coords.x,
      y: wp.coords.y,
      z: wp.coords.z,
      primaryStarClass: 'Expedition Basecamp',
      population: activeExpedition.fleetRosterCount,
      allegiance: 'Independent',
      security: 'Medium',
    };
    isRightDrawerOpen = true;
  }

  function handleFocusExpeditionCoords(coords: { x: number; y: number; z: number }) {
    activeDossier.system = {
      id64: `${coords.x}_${coords.y}_${coords.z}`,
      name: activeExpedition.name,
      x: coords.x,
      y: coords.y,
      z: coords.z,
      primaryStarClass: 'Expedition Fleet',
      population: activeExpedition.fleetRosterCount,
      allegiance: 'Independent',
      security: 'High',
    };
  }

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
        dssaEnabled={layerSettings.dssaNetwork}
        dssaCarriers={activeDssaCarriers}
        selectedDssaCarrier={selectedDssaCarrier}
        heatmapDensity={layerSettings.heatmapDensity}
        heatmapColorRamp={layerSettings.heatmapColorRamp}
        heatmapBlending={layerSettings.heatmapBlending}
        orrerySimTimeSec={orrerySimTimeSec}
        lockedBodyName={lockedBodyName}
        surfaceParams={currentSurfaceParams}
        routeWaypoints={plottedRouteWaypoints}
        expedition={layerSettings.expeditionLayer ? activeExpedition : null}
        expeditionProgress={expeditionPlaybackProgress}
        expeditionActive={layerSettings.expeditionLayer}
        onAlignmentsDetected={handleAlignmentsDetected}
        onHoverCoordsChange={(info) => (hoverDensityInfo = info)}
        onSelectDssaCarrier={handleSelectDssaCarrier}
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
    bind:originQuery={routeOrigin}
    bind:destQuery={routeDestination}
    onPlotRoute={handleRoutePlotted}
    onClose={() => (isRoutePlannerOpen = false)}
    onFocusWaypoint={handleFocusWaypoint}
  />

  <!-- Stage 5.2: DSSA Permanent Carrier Status Card / Modal -->
  <DssaCarrierCard
    bind:isOpen={isDssaCardOpen}
    carrier={selectedDssaCarrier}
    onPlotRoute={handlePlotDssaEmergencyRoute}
    onFocusCamera={handleFocusDssaCarrierCoords}
    onClose={() => (isDssaCardOpen = false)}
  />

  <!-- Stage 5.2: Nearest DSSA Search & Emergency Locator Modal -->
  <DssaEmergencyFinder
    bind:isOpen={isDssaFinderOpen}
    referenceCoords={{ x: activeDossier.system.x, y: activeDossier.system.y, z: activeDossier.system.z }}
    referenceName={telemetry.currentSystem}
    onSelectCarrier={handleSelectDssaCarrier}
    onPlotRoute={handlePlotDssaEmergencyRoute}
    onClose={() => (isDssaFinderOpen = false)}
  />

  <!-- Stage 5.3: 4D Historical Expedition Playback Theater Modal -->
  <ExpeditionTheater
    bind:isOpen={isExpeditionTheaterOpen}
    bind:activeExpedition
    bind:playbackProgress={expeditionPlaybackProgress}
    bind:isPlaying={isExpeditionPlaying}
    onSelectWaypoint={handleSelectExpeditionWaypoint}
    onFocusCoords={handleFocusExpeditionCoords}
    onClose={() => (isExpeditionTheaterOpen = false)}
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

  <!-- Stage 1.4: Left Collapsible Drawer (Layer Toggles, Frontlines, Heatmap, DSSA, Expeditions) -->
  <LeftDrawer
    bind:layers={layerSettings}
    bind:isOpen={isLeftDrawerOpen}
    activeExpeditionName={activeExpedition.name}
    onOpenDssaFinder={() => (isDssaFinderOpen = true)}
    onOpenExpeditionTheater={() => (isExpeditionTheaterOpen = true)}
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

    <!-- Stage 5.2: DSSA Emergency Locator Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isDssaFinderOpen = !isDssaFinderOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isDssaFinderOpen
        ? 'bg-[var(--hud-amber)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)]/40'}"
    >
      <span>🚨 DSSA HAVENS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-amber)]/20 text-[var(--hud-amber)] border border-[var(--hud-amber)]/40 font-bold">
        {activeDssaCarriers.length}
      </span>
    </button>

    <!-- Stage 5.3: 4D Historical Expedition Playback Theater Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isExpeditionTheaterOpen = !isExpeditionTheaterOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isExpeditionTheaterOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
    >
      <span>🚀 EXPEDITIONS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold">
        {activeExpedition.name.includes(' ') ? activeExpedition.name.split(' ')[0] : activeExpedition.name}
      </span>
    </button>
  </div>
</main>
