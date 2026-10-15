<!-- Location: atlas/client/src/lib/components/DssaEmergencyFinder.svelte -->
<!-- Deep Space Support Array (DSSA) Nearest Haven & Emergency Locator (Stage 5.2) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type DssaCarrier,
    type DssaCarrierServices,
    findNearestDssa,
    EMBEDDED_DSSA_REGISTRY,
  } from '$engine/dssa_registry';
  import { ananke } from '$engine/ananke_client';
  import { audioSynthesizer } from '$engine/audio_synthesizer';

  interface Props {
    isOpen?: boolean;
    referenceCoords?: { x: number; y: number; z: number };
    referenceName?: string;
    onClose?: () => void;
    onSelectCarrier?: (carrier: DssaCarrier) => void;
    onPlotRoute?: (systemName: string) => void;
  }

  let {
    isOpen = $bindable(false),
    referenceCoords = { x: 0, y: 0, z: 0 },
    referenceName = 'SOL',
    onClose,
    onSelectCarrier,
    onPlotRoute,
  }: Props = $props();

  let allCarriers = $state<DssaCarrier[]>(EMBEDDED_DSSA_REGISTRY);
  let searchQuery = $state<string>('');
  let selectedRegion = $state<string>('all');
  let operationalOnly = $state<boolean>(true);

  // Service filters
  let requiredServices = $state<Partial<Record<keyof DssaCarrierServices, boolean>>>({
    refuel: false,
    repair: false,
    armory: false,
    vistaGenomics: false,
    universalCartographics: false,
    pioneerSupplies: false,
  });

  // Load live data from Ananke GET /api/carriers/dssa on mount
  onMount(async () => {
    try {
      const carriers = await ananke.getDssaCarriers();
      if (carriers && carriers.length > 0) {
        allCarriers = carriers;
      }
    } catch {
      // Keep embedded
    }
  });

  // Derive all unique regions
  let availableRegions = $derived.by(() => {
    const set = new Set<string>();
    for (const c of allCarriers) {
      if (c.region) set.add(c.region);
    }
    return Array.from(set).sort();
  });

  // Computed nearest sorted carriers
  let results = $derived.by(() => {
    return findNearestDssa(
      allCarriers,
      referenceCoords,
      {
        searchQuery,
        region: selectedRegion === 'all' ? undefined : selectedRegion,
        operationalOnly,
        requiredServices,
      },
      50
    );
  });

  let nearestCarrier = $derived(results.length > 0 ? results[0] : null);

  function toggleService(service: keyof DssaCarrierServices) {
    requiredServices[service] = !requiredServices[service];
  }

  function handleQuickRegion(region: string) {
    selectedRegion = region;
    audioSynthesizer.playChime('chime');
  }

  function handleSelect(carrier: DssaCarrier) {
    audioSynthesizer.playChime('affirm');
    if (onSelectCarrier) {
      onSelectCarrier(carrier);
    }
  }

  function handlePlotEmergency(carrier: DssaCarrier) {
    audioSynthesizer.playChime('target_lock');
    if (onPlotRoute) {
      onPlotRoute(carrier.systemName);
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md transition-opacity"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dssa-finder-title"
  >
    <div
      class="relative w-full max-w-2xl bg-[var(--hud-bg)]/95 border-2 border-[var(--hud-amber)] rounded shadow-[0_0_40px_rgba(255,179,0,0.3)] flex flex-col max-h-[85vh] font-mono text-xs overflow-hidden select-none"
    >
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-black/60 border-b border-[var(--hud-amber)]/40 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded bg-[var(--hud-amber)]/15 border border-[var(--hud-amber)] flex items-center justify-center shadow-hud-glow">
            <Icon name="dssa" size={22} color="var(--hud-amber)" />
          </div>
          <div>
            <h2 id="dssa-finder-title" class="text-sm sm:text-base font-bold text-white tracking-wider flex items-center space-x-2">
              <span>DSSA EMERGENCY HAVEN LOCATOR</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] bg-[var(--hud-amber)] text-black font-bold">
                {results.length} HAVENS
              </span>
            </h2>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">
              REFERENCE: <span class="text-[var(--hud-orange)] font-bold">{referenceName}</span>
              ({referenceCoords.x.toFixed(0)}, {referenceCoords.y.toFixed(0)}, {referenceCoords.z.toFixed(0)} LY)
            </div>
          </div>
        </div>

        <button
          type="button"
          class="w-7 h-7 rounded border border-white/20 text-white/60 hover:text-white hover:border-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/20 transition-colors flex items-center justify-center cursor-pointer"
          onclick={() => {
            isOpen = false;
            if (onClose) onClose();
          }}
          aria-label="Close Haven Locator"
        >
          ✕
        </button>
      </div>

      <!-- Controls & Search Filtering -->
      <div class="p-4 space-y-3 bg-black/40 border-b border-white/10">
        <!-- Search input and Region select -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search by system, callsign, or region..."
              class="w-full px-3 py-2 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[var(--hud-amber)] focus:ring-1 focus:ring-[var(--hud-amber)]"
            />
            {#if searchQuery}
              <button
                type="button"
                class="absolute right-2 top-2 text-white/40 hover:text-white"
                onclick={() => (searchQuery = '')}
              >
                ✕
              </button>
            {/if}
          </div>

          <div class="flex items-center space-x-2">
            <select
              bind:value={selectedRegion}
              class="flex-1 px-3 py-2 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-white text-xs focus:outline-none focus:border-[var(--hud-amber)]"
            >
              <option value="all">ALL GALACTIC REGIONS</option>
              {#each availableRegions as region}
                <option value={region}>{region.toUpperCase()}</option>
              {/each}
            </select>

            <label class="flex items-center space-x-1.5 px-2 py-2 rounded bg-black/50 border border-white/15 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                bind:checked={operationalOnly}
                class="accent-[var(--hud-amber)]"
              />
              <span class="text-[10px] text-white">OPERATIONAL</span>
            </label>
          </div>
        </div>

        <!-- Quick Region Chips -->
        <div class="flex flex-wrap items-center gap-1 text-[10px]">
          <span class="text-[var(--ed-orange-dim)] mr-1">QUICK:</span>
          {#each ['The Abyss', 'Formidine Rift', 'Galactic Centre', 'Colonia', 'Kepler\'s Crest', 'The Void'] as quickReg}
            <button
              type="button"
              class="px-2 py-0.5 rounded border transition-colors {selectedRegion === quickReg ? 'bg-[var(--hud-amber)] text-black font-bold border-[var(--hud-amber)]' : 'bg-black/30 border-white/15 text-white/70 hover:border-[var(--hud-amber)]'}"
              onclick={() => handleQuickRegion(selectedRegion === quickReg ? 'all' : quickReg)}
            >
              {quickReg}
            </button>
          {/each}
        </div>

        <!-- Service Requirement Toggles -->
        <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
          <span class="text-[10px] text-[var(--hud-amber)] font-bold mr-1">REQUIRED SERVICES:</span>
          {#each (['refuel', 'repair', 'armory', 'vistaGenomics', 'universalCartographics', 'pioneerSupplies'] as const) as srv}
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[10px] border flex items-center space-x-1 transition-colors {requiredServices[srv] ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold' : 'bg-black/30 border-white/15 text-white/50 hover:border-white/30'}"
              onclick={() => toggleService(srv)}
            >
              <span>{requiredServices[srv] ? '✓' : '+'}</span>
              <span class="capitalize">{srv === 'vistaGenomics' ? 'Genomics' : srv === 'universalCartographics' ? 'Carto' : srv === 'pioneerSupplies' ? 'Pioneer' : srv}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Top Banner: Highlight Closest Emergency Haven -->
      {#if nearestCarrier}
        <div class="px-5 py-2.5 bg-gradient-to-r from-[var(--hud-amber)]/20 via-black/40 to-transparent border-b border-[var(--hud-amber)]/40 flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[var(--hud-amber)] animate-pulse shadow-[0_0_8px_#ffb300]"></span>
            <div>
              <div class="text-[9px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
                CLOSEST EMERGENCY HAVEN
              </div>
              <div class="text-xs text-white font-bold flex items-center space-x-2">
                <span>{nearestCarrier.name}</span>
                <span class="text-[var(--hud-orange)] font-mono">({nearestCarrier.systemName})</span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <div class="text-right">
              <div class="text-sm text-[var(--hud-amber)] font-bold">
                {nearestCarrier.distanceLy?.toLocaleString(undefined, { maximumFractionDigits: 1 })} LY
              </div>
              <div class="text-[9px] text-white/50">{nearestCarrier.region}</div>
            </div>

            <button
              type="button"
              class="px-3 py-1.5 rounded bg-[var(--hud-amber)] text-black font-bold uppercase text-[10px] shadow-sm hover:bg-[var(--hud-orange)] transition-colors cursor-pointer"
              onclick={() => handlePlotEmergency(nearestCarrier)}
            >
              ⚡ PLOT ROUTE
            </button>
          </div>
        </div>
      {/if}

      <!-- Scrollable Results List -->
      <div class="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
        {#if results.length === 0}
          <div class="py-12 text-center text-white/40">
            <div class="text-base mb-1">NO MATCHING DSSA HAVENS FOUND</div>
            <div class="text-xs">Try clearing service filters or widening the region selection.</div>
          </div>
        {:else}
          {#each results as carrier}
            <div
              class="p-3 rounded hover:bg-white/5 transition-colors flex items-center justify-between gap-4 border border-transparent hover:border-[var(--hud-amber)]/30 group"
            >
              <!-- Carrier Meta -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-white truncate group-hover:text-[var(--hud-amber)]">
                    {carrier.name}
                  </span>
                  <span class="text-[10px] text-[var(--hud-orange)] font-mono">
                    [{carrier.callsign}]
                  </span>
                  <span class="px-1 text-[9px] rounded {carrier.operationalStatus === 'Operational' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'}">
                    {carrier.operationalStatus}
                  </span>
                </div>

                <div class="text-[11px] text-white/80 mt-0.5 flex items-center space-x-2">
                  <span class="font-bold">{carrier.systemName}</span>
                  {#if carrier.bodyName}
                    <span class="text-white/40">· {carrier.bodyName}</span>
                  {/if}
                  <span class="text-white/40">·</span>
                  <span class="text-[var(--hud-amber)]/90">{carrier.region}</span>
                </div>

                <!-- Service Badges -->
                <div class="flex flex-wrap items-center gap-1.5 mt-1.5 text-[9px]">
                  {#if carrier.services.refuel}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-white/70 border border-white/10">Refuel</span>
                  {/if}
                  {#if carrier.services.repair}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-white/70 border border-white/10">Repair</span>
                  {/if}
                  {#if carrier.services.armory}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-white/70 border border-white/10">Armory</span>
                  {/if}
                  {#if carrier.services.vistaGenomics}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-emerald-300 border border-emerald-500/30">Genomics</span>
                  {/if}
                  {#if carrier.services.universalCartographics}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-cyan-300 border border-cyan-500/30">Carto</span>
                  {/if}
                  {#if carrier.services.pioneerSupplies}
                    <span class="px-1 py-0.2 rounded bg-black/50 text-amber-300 border border-amber-500/30">Pioneer</span>
                  {/if}
                </div>
              </div>

              <!-- Distance & Actions -->
              <div class="flex items-center space-x-2 shrink-0">
                <div class="text-right">
                  <div class="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--hud-amber)]">
                    {carrier.distanceLy?.toLocaleString(undefined, { maximumFractionDigits: 1 })} LY
                  </div>
                  <div class="text-[9px] text-white/40">DISTANCE</div>
                </div>

                <div class="flex flex-col space-y-1">
                  <button
                    type="button"
                    class="px-2 py-1 rounded bg-black/60 border border-white/20 text-white hover:border-[var(--hud-amber)] text-[10px] transition-colors"
                    onclick={() => handleSelect(carrier)}
                  >
                    DOSSIER
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 rounded bg-[var(--hud-amber)]/20 border border-[var(--hud-amber)] text-[var(--hud-amber)] hover:bg-[var(--hud-amber)] hover:text-black font-bold text-[10px] transition-all"
                    onclick={() => handlePlotEmergency(carrier)}
                  >
                    ⚡ PLOT
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer Info -->
      <div class="p-3 bg-black/60 border-t border-[var(--hud-amber)]/30 flex items-center justify-between text-[10px] text-white/60">
        <div class="flex items-center space-x-2">
          <Icon name="dssa" size={16} color="var(--hud-amber)" />
          <span>OFFICIAL DEEP SPACE SUPPORT ARRAY NETWORK</span>
        </div>
        <div>
          AUTONOMOUS EMERGENCY HAVENS (42 REGIONS)
        </div>
      </div>
    </div>
  </div>
{/if}
