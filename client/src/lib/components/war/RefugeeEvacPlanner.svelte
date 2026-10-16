<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import {
    CANONICAL_BURNING_STARPORTS,
    CANONICAL_RESCUE_MEGASHIPS,
    POPULAR_EVAC_SHIPS,
    HEAT_SINK_FLIGHT_PROFILE,
    CAUSTIC_DECON_PROTOCOL,
    planRefugeeCabinCapacity,
    findClosestRescueMegaships,
    computeEvacuationRoutePlan,
    filterEvacStarports,
    type EvacStarportRecord,
    type RescueMegashipRecord,
    type ShipCabinConfiguration,
    type StarportEvacStatus,
    type LandingPadSize,
  } from '$engine/refugee_evac_engine';

  interface Props {
    isOpen?: boolean;
    referenceSystem?: string;
    onClose?: () => void;
    onSelectSystem?: (systemName: string, coords: { x: number; y: number; z: number }) => void;
    onPlotRoute?: (originSystem: string, destSystem: string) => void;
  }

  let {
    isOpen = true,
    referenceSystem = 'Sol',
    onClose,
    onSelectSystem,
    onPlotRoute,
  }: Props = $props();

  // Navigation tab
  let activeTab = $state<'evac_ports' | 'capacity_planner' | 'megaships' | 'flight_protocols'>('evac_ports');

  // Filters for Starports
  let searchQuery = $state<string>('');
  let filterStatus = $state<'ALL' | StarportEvacStatus>('ALL');
  let filterDanger = $state<'ALL' | 'MODERATE' | 'HAZARDOUS' | 'EXTREME'>('ALL');

  // Selected Starport
  let selectedPortId = $state<string>(CANONICAL_BURNING_STARPORTS[0].id);
  let selectedPort = $derived<EvacStarportRecord>(
    CANONICAL_BURNING_STARPORTS.find((p) => p.id === selectedPortId) || CANONICAL_BURNING_STARPORTS[0]
  );

  // Selected Ship Preset for Capacity Planner
  let selectedShipModel = $state<string>('Anaconda');
  let customJumpRange = $state<number>(38.0);
  let selectedShipPreset = $derived(
    POPULAR_EVAC_SHIPS.find((s) => s.model === selectedShipModel) || POPULAR_EVAC_SHIPS[1]
  );

  // Generated Ship Configuration
  let shipConfig = $derived<ShipCabinConfiguration>(
    planRefugeeCabinCapacity(
      selectedShipPreset.model,
      selectedShipPreset.padSize,
      selectedShipPreset.optionalSlots,
      customJumpRange
    )
  );

  // Closest Megaships to Selected Port
  let nearbyMegaships = $derived(
    findClosestRescueMegaships(selectedPort.coords, CANONICAL_RESCUE_MEGASHIPS)
  );

  // Selected Destination Megaship
  let selectedMegashipId = $state<string>(CANONICAL_RESCUE_MEGASHIPS[0].id);
  let selectedMegaship = $derived<RescueMegashipRecord>(
    CANONICAL_RESCUE_MEGASHIPS.find((m) => m.id === selectedMegashipId) || CANONICAL_RESCUE_MEGASHIPS[0]
  );

  // Generated Evacuation Route Plan
  let routePlan = $derived(
    computeEvacuationRoutePlan(selectedPort, selectedMegaship, shipConfig)
  );

  // Filtered Starports List
  const filteredStarports = $derived(
    filterEvacStarports(CANONICAL_BURNING_STARPORTS, {
      status: filterStatus,
      dangerRating: filterDanger,
      searchQuery,
    })
  );

  // Status badge style helper
  function getStatusBadge(status: StarportEvacStatus): string {
    switch (status) {
      case 'CRITICAL_MELTDOWN':
        return 'text-red-400 border-red-500/60 bg-red-950/40 animate-pulse font-extrabold';
      case 'BURNING':
        return 'text-orange-400 border-orange-500/60 bg-orange-950/40 font-bold';
      case 'ATTACKED':
        return 'text-amber-400 border-amber-500/60 bg-amber-950/30';
      case 'EVACUATING':
        return 'text-cyan-400 border-cyan-500/60 bg-cyan-950/30';
      default:
        return 'text-stone-300 border-stone-600/40 bg-stone-900/40';
    }
  }

  function getDangerColor(danger: string): string {
    switch (danger) {
      case 'EXTREME':
        return 'text-red-400 border-red-500/50';
      case 'HAZARDOUS':
        return 'text-amber-400 border-amber-500/50';
      default:
        return 'text-emerald-400 border-emerald-500/50';
    }
  }
</script>

{#if isOpen}
  <!-- Modal Overlay -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md">
    <!-- Main HUD Shell -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950/95 border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_35px_rgba(255,113,0,0.18)] font-mono text-stone-200 overflow-hidden"
    >
      <!-- Title Bar -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-black/70">
        <div class="flex items-center space-x-3">
          <span class="text-xl">🚨</span>
          <div>
            <h2 class="text-base sm:text-lg font-bold tracking-wider text-[var(--hud-orange)] uppercase flex items-center gap-2">
              REFUGEE EVACUATION LOGISTICS & DAMAGED STARPORT ROUTER
              <span class="text-xs px-2 py-0.5 rounded border border-orange-500/60 text-orange-400 bg-orange-950/40">
                STAGE 14.4
              </span>
            </h2>
            <p class="text-xs text-stone-400">
              Civilian Rescue Operations • Cabin Capacity Optimization • Rescue Megaship Round-Trip Paths • Heat Sink & Decon Guides
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Close button -->
          <button
            type="button"
            class="p-1 rounded text-stone-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 transition-all"
            onclick={() => onClose?.()}
            title="Close Evacuation Planner"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      <!-- Quick Metrics Summary Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3 bg-black/50 border-b border-stone-800 text-xs">
        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Active Evac Ports</span>
          <span class="text-sm font-bold text-orange-400 font-mono">
            {CANONICAL_BURNING_STARPORTS.length} Stations
          </span>
          <span class="text-[10px] text-stone-400 block">Pegasi / Col 285 / HIP</span>
        </div>

        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Total Civilians in Peril</span>
          <span class="text-sm font-bold text-red-400 font-mono">
            {CANONICAL_BURNING_STARPORTS.reduce((acc, p) => acc + p.activeRefugeeCount, 0).toLocaleString()}
          </span>
          <span class="text-[10px] text-stone-400 block">Pending Extraction</span>
        </div>

        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Max Payload (Anaconda)</span>
          <span class="text-sm font-bold text-emerald-400 font-mono">
            192 Refugees/run
          </span>
          <span class="text-[10px] text-stone-400 block">Economy Configuration</span>
        </div>

        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Rescue Megaships</span>
          <span class="text-sm font-bold text-cyan-400 font-mono">
            {CANONICAL_RESCUE_MEGASHIPS.length} Active Hubs
          </span>
          <span class="text-[10px] text-stone-400 block">All with Large Pads</span>
        </div>

        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Interior Thermals</span>
          <span class="text-sm font-bold text-amber-400 font-mono">
            Up to 1,280 K
          </span>
          <span class="text-[10px] text-stone-400 block">+9.4% Heat / sec</span>
        </div>

        <div class="p-2 rounded bg-zinc-900/60 border border-stone-800">
          <span class="text-stone-400 block text-[10px] uppercase">Caustic Protocol</span>
          <span class="text-sm font-bold text-red-500 font-mono">
            Thermal Purge 200%
          </span>
          <span class="text-[10px] text-stone-400 block">Emergency Burn-off</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-black/40 border-b border-stone-800">
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'evac_ports' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'evac_ports')}
          >
            🔥 BURNING STARPORTS ({filteredStarports.length})
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'capacity_planner' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'capacity_planner')}
          >
            💺 REFUGEE CAPACITY PLANNER
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'megaships' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'megaships')}
          >
            🚢 RESCUE MEGASHIPS ({CANONICAL_RESCUE_MEGASHIPS.length})
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-bold uppercase transition-all {activeTab === 'flight_protocols' ? 'bg-[var(--hud-orange)] text-black' : 'bg-stone-900 border border-stone-700 text-stone-300 hover:border-stone-500'}"
            onclick={() => (activeTab = 'flight_protocols')}
          >
            🛡️ HEAT SINK & DECON PROTOCOLS
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 p-5 overflow-y-auto space-y-5">
        {#if activeTab === 'evac_ports'}
          <!-- 1. Starports Mapping & Filtering -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- Left: Starport List & Filter -->
            <div class="lg:col-span-1 space-y-3">
              <div class="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search station or system..."
                  bind:value={searchQuery}
                  class="w-full px-2.5 py-1.5 rounded bg-black/60 border border-stone-700 text-stone-200 placeholder-stone-500 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                />
              </div>

              <div class="flex items-center space-x-2 text-xs">
                <select
                  bind:value={filterStatus}
                  class="w-1/2 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="BURNING">Burning</option>
                  <option value="ATTACKED">Attacked</option>
                  <option value="EVACUATING">Evacuating</option>
                  <option value="CRITICAL_MELTDOWN">Critical Meltdown</option>
                </select>

                <select
                  bind:value={filterDanger}
                  class="w-1/2 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                >
                  <option value="ALL">All Danger</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HAZARDOUS">Hazardous</option>
                  <option value="EXTREME">Extreme</option>
                </select>
              </div>

              <!-- List of stations -->
              <div class="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                {#each filteredStarports as port}
                  <button
                    type="button"
                    class="w-full text-left p-3 rounded border transition-all {port.id === selectedPortId ? 'bg-orange-950/30 border-[var(--hud-orange)] text-white' : 'bg-zinc-900/50 border-stone-800 text-stone-300 hover:border-stone-600'}"
                    onclick={() => (selectedPortId = port.id)}
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-xs uppercase text-stone-100">{port.stationName}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded border {getStatusBadge(port.evacStatus)}">
                        {port.evacStatus}
                      </span>
                    </div>

                    <div class="text-[11px] text-stone-400 mt-1">
                      {port.systemName} • {port.stationType}
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-stone-500 mt-2">
                      <span>👥 {port.activeRefugeeCount.toLocaleString()} refugees</span>
                      <span class="text-orange-400 font-bold">🌡️ {port.interiorTemperatureK} K</span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Right: Selected Starport Tactical Card & Evac Route -->
            <div class="lg:col-span-2 space-y-4">
              <!-- Starport Card -->
              <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-base font-bold text-[var(--hud-orange)] uppercase flex items-center gap-2">
                      <span>{selectedPort.stationName}</span>
                      <span class="text-xs px-2 py-0.5 rounded border {getStatusBadge(selectedPort.evacStatus)}">
                        {selectedPort.evacStatus}
                      </span>
                    </h3>
                    <p class="text-xs text-stone-400 mt-0.5">
                      System: <strong class="text-stone-200">{selectedPort.systemName}</strong> • Body: {selectedPort.bodyName}
                    </p>
                  </div>

                  <div class="flex space-x-2">
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded border border-cyan-500/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-500/20"
                      onclick={() => onSelectSystem?.(selectedPort.systemName, selectedPort.coords)}
                    >
                      VIEW GALAXY
                    </button>
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded border border-orange-500/50 bg-orange-950/30 text-orange-300 hover:bg-orange-500/20 font-bold"
                      onclick={() => onPlotRoute?.(selectedPort.systemName, selectedMegaship.systemName)}
                    >
                      PLOT ROUND-TRIP
                    </button>
                  </div>
                </div>

                <!-- Starport Status Badges -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div class="p-2 rounded bg-black/40 border border-stone-800">
                    <span class="text-stone-400 text-[10px] block">Interior Temp</span>
                    <span class="text-sm font-bold text-orange-400 font-mono">{selectedPort.interiorTemperatureK} K</span>
                    <span class="text-[10px] text-stone-400 block">+{selectedPort.heatBuildupRatePerSec}% heat/sec</span>
                  </div>

                  <div class="p-2 rounded bg-black/40 border border-stone-800">
                    <span class="text-stone-400 text-[10px] block">Refugees Waiting</span>
                    <span class="text-sm font-bold text-red-400 font-mono">{selectedPort.activeRefugeeCount.toLocaleString()}</span>
                    <span class="text-[10px] text-stone-400 block">{selectedPort.availableMissionsCount} active missions</span>
                  </div>

                  <div class="p-2 rounded bg-black/40 border border-stone-800">
                    <span class="text-stone-400 text-[10px] block">Caustic Risk</span>
                    <span class="text-sm font-bold text-emerald-400 font-mono">{selectedPort.causticContaminationRisk}</span>
                    <span class="text-[10px] text-stone-400 block">Scythe interdiction</span>
                  </div>

                  <div class="p-2 rounded bg-black/40 border border-stone-800">
                    <span class="text-stone-400 text-[10px] block">Hazard Rating</span>
                    <span class="text-sm font-bold font-mono {getDangerColor(selectedPort.dangerRating)}">{selectedPort.dangerRating}</span>
                    <span class="text-[10px] text-stone-400 block">Pad: {selectedPort.landingPadSize} (Max)</span>
                  </div>
                </div>
              </div>

              <!-- Evacuation Route Optimizer To Closest Megaships -->
              <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛸 OPTIMAL ROUND-TRIP RESCUE CORRIDOR</span>
                  </h4>
                  <span class="text-[10px] text-stone-400">
                    Calculated for <strong>{shipConfig.shipModel}</strong> ({shipConfig.totalEconomyCapacity} PAX)
                  </span>
                </div>

                <!-- Closest Megaships Selector -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {#each nearbyMegaships as mega}
                    <button
                      type="button"
                      class="text-left p-2.5 rounded border transition-all {mega.id === selectedMegashipId ? 'bg-cyan-950/40 border-cyan-400 text-white' : 'bg-black/40 border-stone-800 text-stone-300 hover:border-stone-600'}"
                      onclick={() => (selectedMegashipId = mega.id)}
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-xs">{mega.name}</span>
                        <span class="text-cyan-400 font-bold">{mega.distanceLy} LY</span>
                      </div>
                      <div class="text-[11px] text-stone-400 mt-0.5">
                        {mega.systemName} • {mega.allegiance}
                      </div>
                      <div class="text-[10px] text-stone-400 mt-1">
                        {mega.medicalFacilities}
                      </div>
                    </button>
                  {/each}
                </div>

                <!-- Evacuation Flight Calculations -->
                <div class="p-3 rounded bg-black/60 border border-stone-800 space-y-2 text-xs">
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span class="text-stone-400 text-[10px] block">Round-Trip Distance:</span>
                      <span class="text-stone-200 font-bold">{routePlan.roundTripDistanceLy} LY</span>
                      <span class="text-[10px] text-stone-400 block">({routePlan.oneWayDistanceLy} LY one-way)</span>
                    </div>

                    <div>
                      <span class="text-stone-400 text-[10px] block">Jumps Per Loop:</span>
                      <span class="text-cyan-300 font-bold">{routePlan.estimatedJumpsRoundTrip} Jumps</span>
                      <span class="text-[10px] text-stone-400 block">({routePlan.estimatedJumpsOneWay} jumps/leg)</span>
                    </div>

                    <div>
                      <span class="text-stone-400 text-[10px] block">Est. Time Per Run:</span>
                      <span class="text-amber-300 font-bold">{routePlan.flightTimeMinutesRoundTrip} Min</span>
                      <span class="text-[10px] text-stone-400 block">Including dock/turnaround</span>
                    </div>

                    <div>
                      <span class="text-stone-400 text-[10px] block">Sinks Recommended:</span>
                      <span class="text-orange-400 font-bold">{routePlan.heatSinkUsageRecommendation} sinks/run</span>
                      <span class="text-[10px] text-stone-400 block">Ingress + Egress</span>
                    </div>
                  </div>

                  <div class="border-t border-stone-800 pt-2 flex items-center justify-between text-xs">
                    <span class="text-stone-400">
                      Total Runs Needed to Empty Starport: <strong class="text-white">{routePlan.runsNeededForEvac} runs</strong>
                    </span>
                    <span class="text-stone-400">
                      Estimated Campaign Time: <strong class="text-emerald-400">{routePlan.totalFlightTimeHours} hours</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'capacity_planner'}
          <!-- 2. Refugee Capacity Planner -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-[var(--hud-orange)] uppercase tracking-wider">
                PASSENGER CABIN CONFIGURATION & REFUGEE CAPACITY PLANNER
              </h3>
              <span class="text-xs text-stone-400">Optimize passenger cabins to maximize evacuated civilians per hour</span>
            </div>

            <!-- Ship Selector & Jump Range input -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded bg-zinc-900/60 border border-stone-800 text-xs">
              <div>
                <label for="evac-ship-select" class="block text-stone-400 text-[10px] uppercase font-bold mb-1">SELECT EVACUATION VESSEL:</label>
                <select
                  id="evac-ship-select"
                  bind:value={selectedShipModel}
                  class="w-full px-2.5 py-1.5 rounded bg-black border border-stone-700 text-stone-200 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                >
                  {#each POPULAR_EVAC_SHIPS as ship}
                    <option value={ship.model}>{ship.model} (Pad: {ship.padSize}, Slots: {ship.optionalSlots.length})</option>
                  {/each}
                </select>
              </div>

              <div>
                <label for="evac-jump-range" class="block text-stone-400 text-[10px] uppercase font-bold mb-1">LOADED JUMP RANGE (LY):</label>
                <input
                  id="evac-jump-range"
                  type="number"
                  step="0.5"
                  min="10"
                  max="80"
                  bind:value={customJumpRange}
                  class="w-full px-2.5 py-1.5 rounded bg-black border border-stone-700 text-stone-200 text-xs focus:border-[var(--hud-orange)] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label for="evac-dest-select" class="block text-stone-400 text-[10px] uppercase font-bold mb-1">DESIGNATED RESCUE MEGASHIP:</label>
                <select
                  id="evac-dest-select"
                  bind:value={selectedMegashipId}
                  class="w-full px-2.5 py-1.5 rounded bg-black border border-stone-700 text-stone-200 text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                >
                  {#each CANONICAL_RESCUE_MEGASHIPS as mega}
                    <option value={mega.id}>{mega.name} ({mega.systemName})</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Capacity Comparison Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3.5 rounded bg-zinc-900/80 border border-emerald-500/40 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-emerald-400 uppercase">MAXIMUM ECONOMY LAYOUT</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">RECOMMENDED</span>
                </div>
                <div class="text-2xl font-bold font-mono text-white">
                  {shipConfig.totalEconomyCapacity} <span class="text-xs font-normal text-stone-400">Civilian Refugees</span>
                </div>
                <p class="text-[11px] text-stone-400">
                  Fills all optional internal slots with Economy Passenger Cabins (up to Size 6, 32 PAX each). Ideal for rapid mass extraction.
                </p>
              </div>

              <div class="p-3.5 rounded bg-zinc-900/80 border border-amber-500/40 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-amber-400 uppercase">BALANCED HYBRID (VIP + MASS)</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">HIGH CREDITS</span>
                </div>
                <div class="text-2xl font-bold font-mono text-white">
                  {shipConfig.optimalMixCapacity} <span class="text-xs font-normal text-stone-400">Total Refugees</span>
                </div>
                <p class="text-[11px] text-stone-400">
                  Allocates 1-2 Business Cabins for VIP Station Directors / high-paying passengers alongside Economy mass manifests.
                </p>
              </div>

              <div class="p-3.5 rounded bg-zinc-900/80 border border-stone-700 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-stone-300 uppercase">PURE BUSINESS CLASS</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">LUXURY</span>
                </div>
                <div class="text-2xl font-bold font-mono text-white">
                  {shipConfig.totalBusinessCapacity} <span class="text-xs font-normal text-stone-400">Refugees</span>
                </div>
                <p class="text-[11px] text-stone-400">
                  Full Business Cabins (16 PAX max per class-6 slot). Provides maximum individual mission credit rewards at lower throughput.
                </p>
              </div>
            </div>

            <!-- Slot Breakdown Table -->
            <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
              <h4 class="text-xs font-bold text-stone-200 uppercase tracking-wider">
                RECOMMENDED CABIN COMPARTMENT FITMENT (CHASSIS: {shipConfig.shipModel})
              </h4>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {#each shipConfig.optimalMixSlots as slot, idx}
                  <div class="p-2 rounded bg-black/60 border border-stone-800 flex items-center justify-between">
                    <div>
                      <span class="text-stone-400 text-[10px] block">Slot {idx + 1} (Size {slot.slotSize})</span>
                      <span class="font-bold text-stone-200">
                        {Math.min(slot.slotSize, 6)}C {slot.installedCabin}
                      </span>
                    </div>
                    <span class="px-2 py-1 rounded bg-stone-800 text-orange-400 font-mono font-bold">
                      +{slot.capacity} PAX
                    </span>
                  </div>
                {/each}
              </div>

              <!-- Recommended Utilities -->
              <div class="p-3 rounded bg-black/40 border border-stone-800 flex items-center justify-between text-xs">
                <span class="text-stone-300">
                  Recommended Utility Hardpoints: <strong>{shipConfig.heatSinkLaunchersFitted}x Heat Sink Launchers</strong> + <strong>{shipConfig.causticSinkLaunchersFitted}x Caustic Sink</strong>
                </span>
                <span class="text-orange-400 font-mono">
                  Engineered with High-Capacity Heatsinks recommended
                </span>
              </div>
            </div>
          </div>

        {:else if activeTab === 'megaships'}
          <!-- 3. Rescue Megaships Overview -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-[var(--hud-orange)] uppercase tracking-wider">
                DESIGNATED RESCUE MEGASHIP DESTINATIONS (ALL LARGE PADS)
              </h3>
              <span class="text-xs text-stone-400">Equipped with severe burn trauma units and automated caustic washdown bays</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each CANONICAL_RESCUE_MEGASHIPS as mega}
                <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
                  <div class="flex items-start justify-between">
                    <div>
                      <h4 class="text-sm font-bold text-white uppercase flex items-center gap-2">
                        <span>{mega.name}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/50 text-cyan-300 bg-cyan-950/30">
                          {mega.allegiance}
                        </span>
                      </h4>
                      <p class="text-xs text-stone-400 mt-0.5">
                        System: <strong class="text-stone-200">{mega.systemName}</strong> • Orbit Distance: {mega.dockingDistanceLs} Ls
                      </p>
                    </div>

                    <span class="text-xs px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-300 bg-emerald-950/30 font-bold">
                      {mega.operationalStatus}
                    </span>
                  </div>

                  <div class="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1 text-xs">
                    <div class="text-stone-300">
                      🏥 Medical: <span class="text-stone-400">{mega.medicalFacilities}</span>
                    </div>
                    <div class="text-stone-300">
                      🧪 Caustic Washdown: <span class="text-emerald-400 font-bold">{mega.causticWashdownAvailable ? 'AVAILABLE (AUTOMATED DECON)' : 'NONE'}</span>
                    </div>
                    <div class="text-stone-300">
                      👥 Evacuee Capacity: <span class="text-amber-300 font-mono">{mega.passengerCapacityThreshold.toLocaleString()} Civilians</span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1">
                    <span class="text-[11px] text-stone-400">
                      Pad Support: <strong class="text-white">Small, Medium & Large</strong>
                    </span>
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded border border-[var(--hud-orange)] text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10"
                      onclick={() => onSelectSystem?.(mega.systemName, mega.coords)}
                    >
                      NAVIGATE TO MEGASHIP
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>

        {:else if activeTab === 'flight_protocols'}
          <!-- 4. Heat Sink Management & Caustic Decontamination Flight Protocols -->
          <div class="space-y-5">
            <!-- Heat Sink Management Guide -->
            <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔥 HIGH-TEMPERATURE STARPORT HEAT SINK MANAGEMENT GUIDE</span>
                </h4>
                <span class="text-[10px] text-red-400 font-bold">
                  ⚠️ STRICTLY NO AUTO-DOCK INSIDE BURNING STATIONS
                </span>
              </div>

              <div class="space-y-2">
                {#each HEAT_SINK_FLIGHT_PROFILE as profile}
                  <div class="p-3 rounded bg-black/60 border border-stone-800 space-y-1 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-stone-200">{profile.phase}</span>
                      <span class="text-orange-400 font-mono font-bold">
                        Pop Sink at: ≥ {profile.recommendedSinkDeployPercent}% Heat
                      </span>
                    </div>
                    <p class="text-stone-400 text-[11px]">
                      {profile.proceduralNote}
                    </p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Caustic Decontamination Protocol -->
            <div class="p-4 rounded-lg bg-zinc-900/70 border border-stone-700 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>☣️ CAUSTIC DECONTAMINATION & OVERHEAT PURGE PROTOCOL</span>
                </h4>
                <span class="text-[10px] text-emerald-300">
                  Standard Anti-Xeno Search & Rescue Procedure
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {#each CAUSTIC_DECON_PROTOCOL as step}
                  <div class="p-3 rounded bg-black/60 border border-stone-800 space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-emerald-300">Step {step.step}: {step.action}</span>
                    </div>
                    <div class="text-[11px] text-stone-400">
                      <strong>Indicator:</strong> {step.thresholdCondition}
                    </div>
                    <div class="text-[11px] text-stone-400">
                      <strong>Impact:</strong> {step.systemImpact}
                    </div>
                    <div class="text-[11px] text-amber-300/90 bg-amber-950/20 p-1.5 rounded border border-amber-500/20">
                      <strong>Protocol:</strong> {step.riskMitigation}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <div class="px-5 py-2.5 bg-black/80 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <div class="flex items-center space-x-2">
          <span class="inline-block w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
          <span>Search & Rescue Evacuation Corridors Active across Frontline</span>
        </div>

        <div class="flex items-center space-x-3">
          <button
            type="button"
            class="px-3 py-1 rounded border border-stone-700 bg-stone-900 text-stone-300 hover:text-white hover:border-stone-500 uppercase text-xs"
            onclick={() => onClose?.()}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
