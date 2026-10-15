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
</script>

<main class="relative w-screen h-screen overflow-hidden bg-[#030508] text-white font-sans select-none">
  <!-- WebGPU / WebGL2 Fullscreen Canvas -->
  <div class="absolute inset-0 z-0">
    <WebGPUCanvas
      selectedStar={activeDossier.system}
      powerplayEnabled={layerSettings.powerplay2}
      thargoidWarEnabled={layerSettings.thargoidWar}
    />
  </div>

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

  <!-- Stage 1.4: HUD Targeting Reticle with Corner Brackets & Crosshairs -->
  <HudReticle
    targetName={telemetry.currentSystem}
    targetDistanceLy={telemetry.distanceSol}
    locked={true}
  />

  <!-- Active View Indicator / Mode Banner (Bottom-Left) -->
  <div class="absolute bottom-3 left-14 z-20 flex items-center space-x-3 px-3 py-1.5 bg-black/60 border border-[var(--hud-orange)]/30 rounded backdrop-blur-sm font-mono text-xs">
    <span class="hud-data-label">MODE:</span>
    <span class="text-[var(--hud-amber)] font-bold uppercase tracking-wider">{activeMode} MAP</span>
    <span class="text-white/30">|</span>
    <span class="hud-data-label">KEYBOARD:</span>
    <span class="text-white/70">[G] [S] [O] [P]</span>
  </div>
</main>
