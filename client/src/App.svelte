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
  import PoiCodexModal from '$components/PoiCodexModal.svelte';
  import {
    type PoiRecord,
    type PoiCategory,
    CANONICAL_POI_CATALOG,
  } from '$engine/poi_catalog';
  import { offlineExplorationCache } from '$engine/offline_exploration_cache';
  import CommodityMarketTable from '$components/market/CommodityMarketTable.svelte';
  import SingleHopFinder from '$components/market/SingleHopFinder.svelte';
  import CircularLoopFinder from '$components/market/CircularLoopFinder.svelte';
  import SmugglingRouteFinder from '$components/market/SmugglingRouteFinder.svelte';
  import ShipbuilderWorkspace from '$components/shipbuilder/ShipbuilderWorkspace.svelte';
  import ColonisationBlueprintModal from '$components/colonisation/ColonisationBlueprintModal.svelte';
  import ColonisationBomDrawer from '$components/colonisation/ColonisationBomDrawer.svelte';
  import HaulingAssistantModal from '$components/colonisation/HaulingAssistantModal.svelte';
  import CarrierLedgerPanel from '$components/colonisation/CarrierLedgerPanel.svelte';
  import WingLogisticsPanel from '$components/colonisation/WingLogisticsPanel.svelte';
  import CapiAuthModal from '$components/dossier/CapiAuthModal.svelte';
  import CmdrDossierModal from '$components/dossier/CmdrDossierModal.svelte';
  import FleetLedgerModal from '$components/fleet/FleetLedgerModal.svelte';
  import CarrierRemoteModal from '$components/fleet/CarrierRemoteModal.svelte';
  import EngineeringWishlistModal from '$components/fleet/EngineeringWishlistModal.svelte';
  import OdysseyLockerModal from '$components/odyssey/OdysseyLockerModal.svelte';
  import JournalSyncModal from '$components/sync/JournalSyncModal.svelte';
  import NativeBridgeModal from '$components/cockpit/NativeBridgeModal.svelte';
  import GlassCockpitTouchDeck from '$components/cockpit/GlassCockpitTouchDeck.svelte';
  import MaterialTradersTriangulator from '$components/underworld/MaterialTradersTriangulator.svelte';
  import TechnologyBrokersCatalog from '$components/underworld/TechnologyBrokersCatalog.svelte';
  import InterstellarFactorsLocator from '$components/underworld/InterstellarFactorsLocator.svelte';
  import AnarchyHavensNavigator from '$components/underworld/AnarchyHavensNavigator.svelte';
  import ThargoidWarFrontline from '$components/war/ThargoidWarFrontline.svelte';
  import { bridgeClient, type FleetInstanceTelemetry } from '$engine/bridge_client';
  import type { AssetRecipeKey } from '$engine/colonisation_bom_engine';

  let activeMode = $state<NavigationMode>('galaxy');
  let telemetry = $state<SessionTelemetry>({ ...DEFAULT_TELEMETRY });

  // Stage 13.1: Material Traders Triangulator & Intra-Category Exchange Calculator Modal State
  let isMaterialTradersOpen = $state<boolean>(false);

  // Stage 13.2: Technology Brokers & Experimental Weaponry Unlocks Modal State
  let isTechBrokersOpen = $state<boolean>(false);

  // Stage 13.3: Interstellar Factors Locator & Anti-Local Faction Safety Filter Modal State
  let isInterstellarFactorsOpen = $state<boolean>(false);

  // Stage 13.4: Bribe Stations & Anarchy Havens Navigator Modal State
  let isAnarchyHavensOpen = $state<boolean>(false);

  // Stage 14.1: Anti-Xeno War Room & Thargoid Frontline Modal State
  let isThargoidWarOpen = $state<boolean>(false);

  // Stage 12.3: Dedicated Tablet/iPad Glass Cockpit Touch Layout Modal / Fullscreen Mode
  let isTouchMfdOpen = $state<boolean>(false);
  let touchFleetInstances = $state<FleetInstanceTelemetry[]>(bridgeClient.getFleetInstances());
  let touchActiveInstanceUuid = $state<string>(bridgeClient.getActiveInstanceUuid());
  let touchActiveInstance = $derived<FleetInstanceTelemetry>(
    touchFleetInstances.find((i) => i.instance_uuid === touchActiveInstanceUuid) || touchFleetInstances[0]
  );

  // Stage 12.1: Local Native IPC WebSocket Bridge (:8999) & Multi-Ship Fleet Coordinator Modal State
  let isNativeBridgeOpen = $state<boolean>(false);

  // Stage 11.1: HTML5 File System Access API & Multi-Box VFS Journal Watcher Modal State
  let isJournalSyncOpen = $state<boolean>(false);

  // Stage 10.1: Odyssey On-Foot Locker Manager & 1,000-Cap Inventory Audit Modal State
  let isOdysseyLockerOpen = $state<boolean>(false);

  // Stage 9.4: Fleet Carrier Remote Management & Market Tariffs Modal State
  let isCarrierRemoteOpen = $state<boolean>(false);

  // Stage 9.4: Horizons & Odyssey Engineering Wishlist & Material Deficit Modal State
  let isWishlistOpen = $state<boolean>(false);

  // Stage 9.3: Multi-Station Fleet Ledger Modal State
  let isFleetLedgerOpen = $state<boolean>(false);

  // Stage 9.2: CMDR Dossier & Verified Ranks Modal State
  let isCmdrDossierOpen = $state<boolean>(false);

  // Stage 9.1: Frontier CAPI OAuth2 & Atlas API Key Vault Modal State
  let isCapiAuthOpen = $state<boolean>(false);

  // Stage 8.1: System Architect & Colonisation Blueprinting Modal State
  let isColonisationOpen = $state<boolean>(false);
  // Stage 8.2: BOM & Hauling Assistant Modal State
  let isBomDrawerOpen = $state<boolean>(false);
  let isHaulerModalOpen = $state<boolean>(false);
  let activeBomRecipeKey = $state<AssetRecipeKey>('planetary_outpost_t1');
  let activeBomCustomName = $state<string>('Haven City Alpha');

  // Stage 8.3: Fleet Carrier Tritium Depot & Upkeep Ledger State
  let isCarrierLedgerOpen = $state<boolean>(false);

  // Stage 8.4: Wing Logistics Tracker & Shared Construction Progress State
  let isWingLogisticsOpen = $state<boolean>(false);

  // Stage 7.1: Shipbuilder Workspace Modal State
  let isShipbuilderOpen = $state<boolean>(false);

  // Stage 6.1: Real-Time Commodity Market Table State
  let isMarketTableOpen = $state<boolean>(false);
  // Stage 6.2: Single-Hop Best Trade Router State
  let isSingleHopOpen = $state<boolean>(false);
  // Stage 6.3: Multi-Stop Circular Trade Loop Router State
  let isCircularLoopOpen = $state<boolean>(false);
  // Stage 6.4: Black Market Smuggling Route Triangulator State
  let isSmugglingOpen = $state<boolean>(false);

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

  // Stage 5.4: Canonn Points of Interest, Generation Ships & Audio Codex State
  let poisList = $state<PoiRecord[]>(CANONICAL_POI_CATALOG);
  let selectedPoi = $state<PoiRecord | null>(CANONICAL_POI_CATALOG[0]); // Default to Generation Ship Thetis
  let isPoiCodexOpen = $state<boolean>(false);

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
        const queryOrHash = window.location.search || window.location.hash || '';
        const pathname = window.location.pathname || '';
        if (queryOrHash.includes('expedition=')) {
          const permalinkExp = parseExpeditionFromPermalink(queryOrHash);
          if (permalinkExp) {
            activeExpedition = permalinkExp;
            isExpeditionTheaterOpen = true;
          }
        }
        // Stage 12.3: Support /cockpit/touch URL path or ?view=cockpit/touch or #/cockpit/touch
        if (
          pathname.includes('/cockpit/touch') ||
          queryOrHash.includes('cockpit/touch') ||
          queryOrHash.includes('view=touch') ||
          queryOrHash.includes('mfd=touch')
        ) {
          isTouchMfdOpen = true;
        }

        // Subscribe to live fleet instances for touch MFD
        bridgeClient.subscribeState((_, nextFleet, nextActiveUuid) => {
          touchFleetInstances = nextFleet;
          touchActiveInstanceUuid = nextActiveUuid;
        });
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

  // Stage 5.4: Canonn POI & Audio Codex handlers
  let activePois = $derived.by(() => {
    if (!layerSettings.poiCodexLayer) return [];
    return poisList.filter((poi) => {
      return (layerSettings.poiCategoryFilter as any)[poi.category] ?? true;
    });
  });

  function handleSelectPoi(poi: PoiRecord) {
    selectedPoi = poi;
    isPoiCodexOpen = true;
    telemetry.currentSystem = poi.systemName;
    const dist = Math.hypot(poi.coords.x, poi.coords.y, poi.coords.z);
    telemetry.distanceSol = dist;
    activeDossier.system = {
      id64: `${poi.coords.x}_${poi.coords.y}_${poi.coords.z}`,
      name: poi.name,
      x: poi.coords.x,
      y: poi.coords.y,
      z: poi.coords.z,
      primaryStarClass: poi.categoryLabel,
      population: 0,
      allegiance: 'Independent',
      security: poi.threatLevel === 'Extreme' ? 'Anarchy' : 'Medium',
    };
    isRightDrawerOpen = true;
  }

  function handleFocusPoiCoords(coords: { x: number; y: number; z: number }) {
    activeDossier.system = {
      id64: `${coords.x}_${coords.y}_${coords.z}`,
      name: selectedPoi?.name || 'Point of Interest',
      x: coords.x,
      y: coords.y,
      z: coords.z,
      primaryStarClass: selectedPoi?.categoryLabel || 'Canonn POI',
      population: 0,
      allegiance: 'Independent',
      security: 'Medium',
    };
  }

  function handlePlotPoiRoute(systemName: string) {
    routeOrigin = telemetry.currentSystem || 'Sol';
    routeDestination = systemName;
    isRoutePlannerOpen = true;
    isPoiCodexOpen = false;
  }

  // Stage 6.1 & 6.2 & 6.3: Market Table, Single Hop & Circular Loop Trade event handlers
  function handlePlotMarketRoute(systemName: string) {
    routeOrigin = telemetry.currentSystem || 'Sol';
    routeDestination = systemName;
    isRoutePlannerOpen = true;
    isMarketTableOpen = false;
    isSingleHopOpen = false;
    isCircularLoopOpen = false;
  }

  // Stage 8.3: Fleet Carrier Route Plotting handler
  function handlePlotCarrierRoute(systemName: string) {
    routeOrigin = telemetry.currentSystem || 'Sol';
    routeDestination = systemName;
    isRoutePlannerOpen = true;
    isCarrierLedgerOpen = false;
  }

  function handleFocusMarketCoords(coords: { x: number; y: number; z: number }, systemName: string) {
    telemetry.currentSystem = systemName;
    const dist = Math.hypot(coords.x, coords.y, coords.z);
    telemetry.distanceSol = dist;
    activeDossier.system = {
      id64: `${coords.x}_${coords.y}_${coords.z}`,
      name: systemName,
      x: coords.x,
      y: coords.y,
      z: coords.z,
      primaryStarClass: 'Starport Market',
      population: 50000,
      allegiance: 'Independent',
      security: 'High',
    };
    isRightDrawerOpen = true;
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
        poiCodexEnabled={layerSettings.poiCodexLayer}
        pois={activePois}
        selectedPoi={selectedPoi}
        onAlignmentsDetected={handleAlignmentsDetected}
        onHoverCoordsChange={(info) => (hoverDensityInfo = info)}
        onSelectDssaCarrier={handleSelectDssaCarrier}
        onSelectPoi={handleSelectPoi}
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

  <!-- Stage 5.4: Canonn Megaship, Generation Ship & POI Audio Codex Modal -->
  <PoiCodexModal
    bind:isOpen={isPoiCodexOpen}
    bind:selectedPoi
    onSelectPoi={handleSelectPoi}
    onPlotRoute={handlePlotPoiRoute}
    onFocusCoords={handleFocusPoiCoords}
    onClose={() => (isPoiCodexOpen = false)}
  />

  <!-- Stage 6.1: Real-Time Commodity Market Table & Supply/Demand Analytics Modal -->
  <CommodityMarketTable
    bind:isOpen={isMarketTableOpen}
    referenceSystem={telemetry.currentSystem}
    onPlotRoute={handlePlotMarketRoute}
    onFocusSystem={handleFocusMarketCoords}
    onClose={() => (isMarketTableOpen = false)}
    onOpenSingleHop={() => (isSingleHopOpen = true)}
    onOpenCircularLoop={() => (isCircularLoopOpen = true)}
    onOpenSmuggling={() => (isSmugglingOpen = true)}
  />

  <!-- Stage 6.2: Single-Hop Best Trade Router Modal -->
  <SingleHopFinder
    bind:isOpen={isSingleHopOpen}
    referenceSystem={telemetry.currentSystem}
    onPlotRoute={handlePlotMarketRoute}
    onFocusSystem={handleFocusMarketCoords}
    onClose={() => (isSingleHopOpen = false)}
    onOpenCircularLoop={() => (isCircularLoopOpen = true)}
  />

  <!-- Stage 6.3: Multi-Stop Circular Trade Loop Router & Cr/Hour Optimizer Modal -->
  <CircularLoopFinder
    bind:isOpen={isCircularLoopOpen}
    referenceSystem={telemetry.currentSystem}
    onPlotRoute={handlePlotMarketRoute}
    onFocusSystem={handleFocusMarketCoords}
    onClose={() => (isCircularLoopOpen = false)}
  />

  <!-- Stage 6.4: Black Market Smuggling Route Triangulator Modal -->
  <SmugglingRouteFinder
    bind:isOpen={isSmugglingOpen}
    referenceSystem={telemetry.currentSystem}
    onPlotRoute={handlePlotMarketRoute}
    onFocusSystem={handleFocusMarketCoords}
    onClose={() => (isSmugglingOpen = false)}
    onOpenMarketTable={() => (isMarketTableOpen = true)}
  />

  <!-- Stage 7.1: Shipbuilder Workspace Modal (39 Flyable Hulls & Hardpoint Schematics) -->
  <ShipbuilderWorkspace
    bind:isOpen={isShipbuilderOpen}
    selectedShipId="anaconda"
    onClose={() => (isShipbuilderOpen = false)}
  />

  <!-- Stage 8.1: System Architect & Colonisation Blueprinting Modal -->
  <ColonisationBlueprintModal
    bind:isOpen={isColonisationOpen}
    initialSystemName={telemetry.currentSystem || 'Eol Prou RS-T d3-94'}
    onClose={() => (isColonisationOpen = false)}
  />

  <!-- Stage 8.2: Colonisation Bill of Materials (BOM) Drawer -->
  <ColonisationBomDrawer
    bind:isOpen={isBomDrawerOpen}
    initialAssetKey={activeBomRecipeKey}
    assetCustomName={activeBomCustomName}
    targetSystemName={telemetry.currentSystem || 'Eol Prou RS-T d3-94'}
    onOpenHaulerModal={(key) => {
      activeBomRecipeKey = key;
      isHaulerModalOpen = true;
    }}
  />

  <!-- Stage 8.2: Live Hauling Assistant & EDill Cargo Sync Modal -->
  <HaulingAssistantModal
    bind:isOpen={isHaulerModalOpen}
    assetKey={activeBomRecipeKey}
    assetCustomName={activeBomCustomName}
  />

  <!-- Stage 8.3: Fleet Carrier Tritium Depot & Upkeep Ledger Panel -->
  <CarrierLedgerPanel
    bind:isOpen={isCarrierLedgerOpen}
    onClose={() => (isCarrierLedgerOpen = false)}
    onPlotRouteToCarrier={(systemName) => handlePlotCarrierRoute(systemName)}
  />

  <!-- Stage 8.4: Wing Logistics Tracker & Shared Construction Progress Panel -->
  <WingLogisticsPanel
    bind:isOpen={isWingLogisticsOpen}
    onClose={() => (isWingLogisticsOpen = false)}
    onOpenBomManifest={(key) => {
      activeBomRecipeKey = key;
      isBomDrawerOpen = true;
    }}
    onOpenHaulingAssistant={(key) => {
      activeBomRecipeKey = key;
      isHaulerModalOpen = true;
    }}
  />

  <!-- Stage 9.1: Frontier CAPI OAuth2 / PKCE Flow & Atlas API Key Vault Modal -->
  <CapiAuthModal
    bind:isOpen={isCapiAuthOpen}
    onClose={() => (isCapiAuthOpen = false)}
  />

  <!-- Stage 9.2: CMDR Dossier, Verified Ranks & Badges Modal -->
  <CmdrDossierModal
    bind:isOpen={isCmdrDossierOpen}
    onClose={() => (isCmdrDossierOpen = false)}
    onOpenCapiSettings={() => (isCapiAuthOpen = true)}
    onOpenFleetLedger={() => (isFleetLedgerOpen = true)}
  />

  <!-- Stage 9.3: Multi-Station Shipyard Fleet Ledger Modal -->
  <FleetLedgerModal
    bind:isOpen={isFleetLedgerOpen}
    onClose={() => (isFleetLedgerOpen = false)}
    onOpenShipbuilder={() => (isShipbuilderOpen = true)}
  />

  <!-- Stage 9.4: Fleet Carrier Remote CAPI Management & Market Tariffs Modal -->
  <CarrierRemoteModal
    bind:isOpen={isCarrierRemoteOpen}
    onClose={() => (isCarrierRemoteOpen = false)}
    onPlotRouteToCarrier={(systemName) => handlePlotCarrierRoute(systemName)}
  />

  <!-- Stage 9.4: Horizons & Odyssey Engineering Wishlist & Material Deficit Router Modal -->
  <EngineeringWishlistModal
    bind:isOpen={isWishlistOpen}
    onClose={() => (isWishlistOpen = false)}
    onPlotRoute={(systemName) => handlePlotCarrierRoute(systemName)}
  />

  <!-- Stage 10.1: Odyssey On-Foot Locker Manager & 1,000-Cap Inventory Audit Modal -->
  <OdysseyLockerModal
    bind:isOpen={isOdysseyLockerOpen}
    onClose={() => (isOdysseyLockerOpen = false)}
  />

  <!-- Stage 11.1: HTML5 File System Access API & Multi-Box VFS Journal Watcher Modal -->
  <JournalSyncModal
    bind:isOpen={isJournalSyncOpen}
    onClose={() => (isJournalSyncOpen = false)}
    onFocusSystem={(sysName, coords) => handleFocusMarketCoords({ x: coords[0], y: coords[1], z: coords[2] }, sysName)}
    onSyncPrimaryTelemetry={(slot) => {
      const dist = Math.hypot(slot.starPos[0], slot.starPos[1], slot.starPos[2]);
      telemetry = {
        ...telemetry,
        currentSystem: slot.currentSystem,
        distanceSol: Number(dist.toFixed(2)),
        activeShip: `${slot.shipType.toUpperCase()} (${slot.shipIdent})`,
        shipHullPercent: slot.hullPercent,
      };
    }}
  />

  <!-- Stage 12.1: Local Native IPC WebSocket Bridge (ws://127.0.0.1:8999) & Multi-Ship Fleet Coordinator Modal -->
  <NativeBridgeModal
    bind:isOpen={isNativeBridgeOpen}
    onClose={() => (isNativeBridgeOpen = false)}
    onFocusSystem={handleFocusMarketCoords}
    onSyncPrimaryTelemetry={(inst) => {
      const dist = Math.hypot(inst.star_pos[0], inst.star_pos[1], inst.star_pos[2]);
      telemetry = {
        ...telemetry,
        currentSystem: inst.current_system,
        distanceSol: Number(dist.toFixed(2)),
        activeShip: `${inst.ship_type.toUpperCase()} (${inst.ship_ident})`,
        shipHullPercent: Math.round(inst.hull_percent),
      };
    }}
  />

  <!-- Stage 13.1: Material Traders Triangulator (Raw, Encoded, Manufactured) Modal -->
  <MaterialTradersTriangulator
    bind:isOpen={isMaterialTradersOpen}
    referenceSystem={telemetry.currentSystem || 'Deciat'}
    onClose={() => (isMaterialTradersOpen = false)}
    onPlotRoute={(targetSys) => {
      routePlannerEndSystem = targetSys;
      isRoutePlannerOpen = true;
      isMaterialTradersOpen = false;
    }}
  />

  <!-- Stage 13.2: Technology Brokers & Experimental Weaponry Unlocks Modal -->
  <TechnologyBrokersCatalog
    bind:isOpen={isTechBrokersOpen}
    referenceSystem={telemetry.currentSystem || 'Deciat'}
    onClose={() => (isTechBrokersOpen = false)}
    onPlotRoute={(targetSys) => {
      routePlannerEndSystem = targetSys;
      isRoutePlannerOpen = true;
      isTechBrokersOpen = false;
    }}
  />

  <!-- Stage 13.3: Interstellar Factors Triangulator & Anti-Local Faction Safety Filter Modal -->
  <InterstellarFactorsLocator
    bind:isOpen={isInterstellarFactorsOpen}
    referenceSystem={telemetry.currentSystem || 'Deciat'}
    onClose={() => (isInterstellarFactorsOpen = false)}
    onPlotRoute={(targetSys) => {
      routePlannerEndSystem = targetSys;
      isRoutePlannerOpen = true;
      isInterstellarFactorsOpen = false;
    }}
  />

  <!-- Stage 13.4: Bribe Stations & Anarchy Havens Navigator Modal -->
  <AnarchyHavensNavigator
    bind:isOpen={isAnarchyHavensOpen}
    referenceSystem={telemetry.currentSystem || 'Deciat'}
    onClose={() => (isAnarchyHavensOpen = false)}
    onPlotRoute={(targetSys) => {
      routePlannerEndSystem = targetSys;
      isRoutePlannerOpen = true;
      isAnarchyHavensOpen = false;
    }}
  />

  <!-- Stage 14.1: Anti-Xeno War Room & Thargoid Frontline Modal -->
  <ThargoidWarFrontline
    isOpen={isThargoidWarOpen}
    onClose={() => (isThargoidWarOpen = false)}
    onSelectSystem={(sysName, coords) => {
      handleFocusMarketCoords(coords.x, coords.y, coords.z);
      telemetry.currentSystem = sysName;
    }}
    onFocusTitan={(titan) => {
      handleFocusMarketCoords(titan.coords.x, titan.coords.y, titan.coords.z);
      telemetry.currentSystem = titan.systemName;
    }}
  />

  <!-- Stage 12.3: Dedicated Tablet/iPad Glass Cockpit Touch Layout Modal / Fullscreen Mode -->
  {#if isTouchMfdOpen}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-label="Glass Cockpit MFD Touch Deck"
    >
      <div class="relative w-full h-full max-w-7xl flex flex-col bg-[#05080c] border-2 border-[#FF7100]/70 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(255,113,0,0.3)]">
        <!-- Touch Header Bar with Close and Fullscreen Controls -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-[#FF7100]/15 border-b border-[#FF7100]/50 shrink-0">
          <div class="flex items-center space-x-2.5">
            <span class="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            <span class="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#FF7100] font-mono">
              📱 GLASS COCKPIT MFD TOUCH DECK // STAGE 12.3
            </span>
            <span class="hidden sm:inline-block px-2 py-0.5 text-[10px] rounded bg-[#FF7100]/25 text-amber-300 font-bold font-mono">
              TABLET / SIM-RIG ZERO-SCROLL
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <button
              type="button"
              onclick={() => (isNativeBridgeOpen = true)}
              class="px-3 py-1.5 rounded bg-black/80 border border-[#FF7100]/60 text-[#FF7100] hover:bg-[#FF7100]/20 font-mono text-xs font-bold uppercase tracking-wider"
              title="Open IPC Bridge Settings"
            >
              🔌 BRIDGE CONFIG
            </button>
            <button
              type="button"
              onclick={() => (isTouchMfdOpen = false)}
              class="px-3 py-1.5 rounded bg-black/80 border border-white/30 text-white/80 hover:text-white hover:border-[#FF7100] font-mono text-xs font-bold uppercase tracking-wider"
              title="Close Touch Cockpit"
            >
              ✕ EXIT MFD
            </button>
          </div>
        </div>

        <!-- Glass Cockpit Touch Deck Component Container (Zero Vertical Scroll) -->
        <div class="flex-1 min-h-0 p-2 sm:p-3 overflow-hidden flex flex-col">
          <GlassCockpitTouchDeck
            fleetInstances={touchFleetInstances}
            activeInstance={touchActiveInstance}
            onSelectInstance={(uuid) => {
              bridgeClient.setActiveInstanceUuid(uuid);
              touchActiveInstanceUuid = uuid;
            }}
            onFocusSystem={handleFocusMarketCoords}
            onNotifyBanner={(msg) => {
              // passive feedback
            }}
          />
        </div>
      </div>
    </div>
  {/if}

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
    onOpenShipbuilder={() => (isShipbuilderOpen = true)}
    onOpenColonisation={() => (isColonisationOpen = true)}
    onOpenCarrierLedger={() => (isCarrierLedgerOpen = true)}
    onOpenWingLogistics={() => (isWingLogisticsOpen = true)}
    onOpenCapiAuth={() => (isCapiAuthOpen = true)}
    onOpenDossier={() => (isCmdrDossierOpen = true)}
    onOpenFleetLedger={() => (isFleetLedgerOpen = true)}
    onOpenCarrierRemote={() => (isCarrierRemoteOpen = true)}
    onOpenWishlist={() => (isWishlistOpen = true)}
    onOpenOdysseyLocker={() => (isOdysseyLockerOpen = true)}
    onOpenJournalSync={() => (isJournalSyncOpen = true)}
    onOpenNativeBridge={() => (isNativeBridgeOpen = true)}
    onOpenTouchCockpit={() => (isTouchMfdOpen = true)}
    onOpenMaterialTraders={() => (isMaterialTradersOpen = true)}
    onOpenTechBrokers={() => (isTechBrokersOpen = true)}
    onOpenInterstellarFactors={() => (isInterstellarFactorsOpen = true)}
    onOpenAnarchyHavens={() => (isAnarchyHavensOpen = true)}
    onOpenThargoidWar={() => (isThargoidWarOpen = true)}
  />

  <!-- Stage 1.4: Left Collapsible Drawer (Layer Toggles, Frontlines, Heatmap, DSSA, Expeditions, POI Codex, Market) -->
  <LeftDrawer
    bind:layers={layerSettings}
    bind:isOpen={isLeftDrawerOpen}
    activeExpeditionName={activeExpedition.name}
    onOpenDssaFinder={() => (isDssaFinderOpen = true)}
    onOpenExpeditionTheater={() => (isExpeditionTheaterOpen = true)}
    onOpenPoiCodex={() => (isPoiCodexOpen = true)}
    onOpenMarketTable={() => (isMarketTableOpen = true)}
    onOpenSingleHop={() => (isSingleHopOpen = true)}
    onOpenCircularLoop={() => (isCircularLoopOpen = true)}
    onOpenSmuggling={() => (isSmugglingOpen = true)}
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

    <!-- Stage 5.4: Canonn POIs & Generation Ship Audio Codex Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isPoiCodexOpen = !isPoiCodexOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isPoiCodexOpen
        ? 'bg-amber-500 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.6)]'
        : 'text-amber-400 hover:bg-amber-500/15 border border-amber-500/40'}"
    >
      <span>📻 CODEX & POIS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
        {activePois.length}
      </span>
    </button>

    <!-- Stage 6.1: Real-Time Commodity Market Table Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isMarketTableOpen = !isMarketTableOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isMarketTableOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
    >
      <span>📊 COMMODITY MARKET</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold">
        LIVE
      </span>
    </button>

    <!-- Stage 6.2: Single-Hop Best Trade Finder Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isSingleHopOpen = !isSingleHopOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isSingleHopOpen
        ? 'bg-[var(--hud-amber)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)]/40'}"
    >
      <span>🚀 SINGLE-HOP</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-amber)]/20 text-[var(--hud-amber)] border border-[var(--hud-amber)]/40 font-bold">
        BEST
      </span>
    </button>

    <!-- Stage 8.2: Colonisation BOM & Live Hauling Assistant Buttons -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isBomDrawerOpen = !isBomDrawerOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isBomDrawerOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Colonisation Bill of Materials (BOM) [Stage 8.2]"
    >
      <span>📋 BOM</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold">
        v8.2
      </span>
    </button>

    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isHaulerModalOpen = !isHaulerModalOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isHaulerModalOpen
        ? 'bg-[var(--hud-amber)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)]/40'}"
      title="Open Live Hauling Assistant & EDill Cockpit Cargo Sync [Stage 8.2]"
    >
      <span>🚛 HAULER</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
        LIVE
      </span>
    </button>

    <!-- Stage 8.3: Fleet Carrier Tritium Depot & Upkeep Ledger Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isCarrierLedgerOpen = !isCarrierLedgerOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isCarrierLedgerOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Fleet Carrier Tritium Depot & Upkeep Ledger [Stage 8.3]"
    >
      <span>⛽ CARRIER</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 font-bold">
        LEDGER
      </span>
    </button>

    <!-- Stage 8.4: Wing Logistics Tracker Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isWingLogisticsOpen = !isWingLogisticsOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isWingLogisticsOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Wing Logistics Tracker & Shared Construction Progress [Stage 8.4]"
    >
      <span>🛰️ WING</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
        SYNC
      </span>
    </button>

    <!-- Stage 9.2: CMDR Dossier & Verified Ranks Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isCmdrDossierOpen = !isCmdrDossierOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isCmdrDossierOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Commander Dossier, Ranks & Badges [Stage 9.2]"
    >
      <span>👨‍🚀 DOSSIER</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
        ELITE
      </span>
    </button>

    <!-- Stage 9.4: Fleet Carrier Remote CAPI Management Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isCarrierRemoteOpen = !isCarrierRemoteOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isCarrierRemoteOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Fleet Carrier Remote Management & Market Tariffs [Stage 9.4]"
    >
      <span>🛸 CARRIER CAPI</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
        REMOTE
      </span>
    </button>

    <!-- Stage 9.4: Engineering Wishlist & Material Deficit Router Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isWishlistOpen = !isWishlistOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isWishlistOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Engineering Wishlist & Material Deficit Router [Stage 9.4]"
    >
      <span>📋 WISHLIST</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
        MATERIALS
      </span>
    </button>

    <!-- Stage 10.1: Odyssey Locker Manager & 1,000-Cap Inventory Audit Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isOdysseyLockerOpen = !isOdysseyLockerOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isOdysseyLockerOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Odyssey On-Foot Locker Manager & 1,000-Cap Inventory Audit [Stage 10.1]"
    >
      <span>🧰 LOCKER</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
        1,000 CAP
      </span>
    </button>

    <!-- Stage 11.1: HTML5 File System Access API & Multi-Box VFS Journal Watcher Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isJournalSyncOpen = !isJournalSyncOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isJournalSyncOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open HTML5 Journal Directory Watcher & Multi-Box VFS Ingestion [Stage 11.1]"
    >
      <span>📡 VFS JOURNAL SYNC</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
        4x VFS
      </span>
    </button>

    <!-- Stage 12.1: Local Native IPC WebSocket Bridge (:8999) & Multi-Ship Fleet Coordinator Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isNativeBridgeOpen = !isNativeBridgeOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isNativeBridgeOpen
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
        : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40'}"
      title="Open Local Native IPC WebSocket Bridge (ws://127.0.0.1:8999) & Multi-Ship Fleet Coordinator [Stage 12.1]"
    >
      <span>🔌 IPC BRIDGE :8999</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
        FLEET MUX
      </span>
    </button>

    <!-- Stage 12.3: Tablet/iPad Glass Cockpit Touch Layout Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isTouchMfdOpen = !isTouchMfdOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isTouchMfdOpen
        ? 'bg-[#FF7100] text-black font-bold shadow-[0_0_15px_rgba(255,113,0,0.8)]'
        : 'text-amber-400 hover:bg-[#FF7100]/15 border border-[#FF7100]/50'}"
      title="Open Dedicated Tablet/iPad Glass Cockpit Touch Layout (Zero-Scroll MFD) [Stage 12.3]"
    >
      <span>📱 GLASS COCKPIT TOUCH</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[#FF7100]/25 text-[#FF7100] border border-[#FF7100]/50 font-bold">
        MFD DECK
      </span>
    </button>

    <!-- Stage 13.1: Material Traders Triangulator Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isMaterialTradersOpen = !isMaterialTradersOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isMaterialTradersOpen
        ? 'bg-[#FF7100] text-black font-bold shadow-[0_0_15px_rgba(255,113,0,0.8)]'
        : 'text-orange-400 hover:bg-[#FF7100]/15 border border-[#FF7100]/50'}"
      title="Open Material Traders Triangulator & Intra-Category Exchange Calculator [Stage 13.1]"
    >
      <span>⚖️ MATERIAL TRADERS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-[#FF7100]/25 text-[#FF7100] border border-[#FF7100]/50 font-bold">
        G1-G5
      </span>
    </button>

    <!-- Stage 13.2: Technology Brokers & Experimental Weaponry Unlocks Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isTechBrokersOpen = !isTechBrokersOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isTechBrokersOpen
        ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.8)]'
        : 'text-cyan-300 hover:bg-cyan-500/15 border border-cyan-500/50'}"
      title="Open Technology Brokers Catalog & Unlock Wishlist [Stage 13.2]"
    >
      <span>🔬 TECH BROKERS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-bold">
        UNLOCKS
      </span>
    </button>

    <!-- Stage 13.3: Interstellar Factors Triangulator & Anti-Local Faction Safety Filter Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isInterstellarFactorsOpen = !isInterstellarFactorsOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isInterstellarFactorsOpen
        ? 'bg-red-500 text-black font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]'
        : 'text-red-400 hover:bg-red-500/15 border border-red-500/50'}"
      title="Open Interstellar Factors Locator & Anti-Local Faction Guard [Stage 13.3]"
    >
      <span>⚖️ FACTORS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-red-500/25 text-red-300 border border-red-500/50 font-bold">
        CLEAR
      </span>
    </button>

    <!-- Stage 13.4: Bribe Stations & Anarchy Havens Navigator Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isAnarchyHavensOpen = !isAnarchyHavensOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isAnarchyHavensOpen
        ? 'bg-red-600 text-black font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]'
        : 'text-red-300 hover:bg-red-600/20 border border-red-600/60'}"
      title="Open Anarchy Havens & Lawless Pirate Stations Navigator [Stage 13.4]"
    >
      <span>☠️ HAVENS</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-red-600/25 text-red-200 border border-red-600/50 font-bold">
        LAWLESS
      </span>
    </button>

    <!-- Stage 14.1: Anti-Xeno War Room & Thargoid Frontline Button -->
    <span class="text-white/30">|</span>
    <button
      type="button"
      onclick={() => (isThargoidWarOpen = !isThargoidWarOpen)}
      class="flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors {isThargoidWarOpen
        ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.8)]'
        : 'text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/50'}"
      title="Open Anti-Xeno War Room, Frontline Boundaries & Titan Maelstroms [Stage 14.1]"
    >
      <span>☣️ WAR ROOM</span>
      <span class="px-1 py-0.2 text-[9px] rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold">
        AX
      </span>
    </button>
  </div>
</main>
