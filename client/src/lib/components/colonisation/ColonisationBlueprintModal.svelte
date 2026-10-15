<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import SystemArchitectCanvas from '$components/colonisation/SystemArchitectCanvas.svelte';
  import {
    type CelestialBodyInfo,
    type PlacedAsset,
    type InfrastructureAssetType,
    type ColonisationBlueprint,
    INFRASTRUCTURE_CATALOG,
    validateAssetPlacement,
    getDevelopingColonySystem,
    encodeBlueprintToPermalink,
    decodeBlueprintFromPermalink,
    createDefaultBlueprint,
  } from '$engine/colonisation_engine';

  interface Props {
    isOpen: boolean;
    initialSystemName?: string;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    initialSystemName = 'Eol Prou RS-T d3-94',
    onClose,
  }: Props = $props();

  // Engine model state
  let colonySystem = $state(getDevelopingColonySystem());
  let blueprint = $state<ColonisationBlueprint>(createDefaultBlueprint(untrack(() => initialSystemName)));

  // Selection states
  let selectedAssetId = $state<string | null>('coriolis_alpha');
  let selectedBodyId = $state<string | null>('body_1');
  let viewMode = $state<'system' | 'body_detail'>('body_detail');

  // UI Drawer tabs
  let activeTab = $state<'catalog' | 'inspector' | 'blueprint_meta' | 'share'>('catalog');

  // New asset creation draft
  let pendingAssetType = $state<InfrastructureAssetType>('coriolis_starport');
  let assetNameDraft = $state('');

  // Share & Export Feedback
  let copyStatus = $state<string | null>(null);
  let importJsonDraft = $state('');
  let importError = $state<string | null>(null);

  // Active validation issues for currently selected asset
  const currentValidation = $derived.by(() => {
    if (!selectedAssetId) return { isValid: true, issues: [] };
    const asset = blueprint.assets.find((a) => a.id === selectedAssetId);
    if (!asset) return { isValid: true, issues: [] };

    const body = colonySystem.bodies.find((b) => b.id === asset.parentBodyId);
    if (!body) return { isValid: false, issues: [{ severity: 'error', code: 'NO_BODY', message: 'Parent body not found.' }] };

    return validateAssetPlacement(
      asset.assetType,
      body,
      {
        altitudeKm: asset.orbitalAltitudeKm,
        phaseDeg: asset.orbitalPhaseDeg,
        latitude: asset.surfaceLatitude,
        longitude: asset.surfaceLongitude,
      },
      blueprint.assets,
      asset.id
    );
  });

  const selectedBody = $derived.by(() => {
    return colonySystem.bodies.find((b) => b.id === selectedBodyId) || colonySystem.bodies[1] || colonySystem.bodies[0];
  });

  const selectedAsset = $derived.by(() => {
    return blueprint.assets.find((a) => a.id === selectedAssetId) || null;
  });

  // Aggregate Plan Stats
  const blueprintStats = $derived.by(() => {
    let totalCost = 0;
    let maxDays = 0;
    let orbitalCount = 0;
    let surfaceCount = 0;

    for (const a of blueprint.assets) {
      const meta = INFRASTRUCTURE_CATALOG[a.assetType];
      if (meta) {
        totalCost += meta.estimatedCostCr;
        maxDays = Math.max(maxDays, meta.constructionDays);
        if (meta.domain === 'orbital') orbitalCount++;
        else surfaceCount++;
      }
    }

    return {
      totalCost,
      maxDays,
      orbitalCount,
      surfaceCount,
      assetCount: blueprint.assets.length,
    };
  });

  onMount(() => {
    // Check for permalink in URL
    if (typeof window !== 'undefined') {
      const queryOrHash = window.location.search || window.location.hash;
      if (queryOrHash && queryOrHash.includes('colony_plan=')) {
        const decoded = decodeBlueprintFromPermalink(queryOrHash);
        if (decoded) {
          blueprint = decoded;
          if (blueprint.assets.length > 0) {
            selectedAssetId = blueprint.assets[0].id;
            selectedBodyId = blueprint.assets[0].parentBodyId;
          }
        }
      }
    }
  });

  function handleSelectBody(body: CelestialBodyInfo | null) {
    if (!body) return;
    selectedBodyId = body.id;
    // If selecting body, switch to detail view for easier placement
    viewMode = 'body_detail';
  }

  function handleSelectAsset(asset: PlacedAsset | null) {
    if (!asset) {
      selectedAssetId = null;
      return;
    }
    selectedAssetId = asset.id;
    selectedBodyId = asset.parentBodyId;
    activeTab = 'inspector';
  }

  function handleAddAsset(assetType: InfrastructureAssetType) {
    if (!selectedBody) return;
    const meta = INFRASTRUCTURE_CATALOG[assetType];
    const newId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newName = assetNameDraft.trim() || `${selectedBody.name} ${meta.name}`;

    const newAsset: PlacedAsset = {
      id: newId,
      assetType,
      customName: newName,
      parentBodyId: selectedBody.id,
      parentBodyName: selectedBody.name,
      domain: meta.domain,
      orbitalAltitudeKm: meta.domain === 'orbital' ? (meta.minOrbitAltitudeKm ?? 1000) + 500 : undefined,
      orbitalPhaseDeg: meta.domain === 'orbital' ? Math.floor(Math.random() * 360) : undefined,
      surfaceLatitude: meta.domain === 'surface' ? 0.0 : undefined,
      surfaceLongitude: meta.domain === 'surface' ? 0.0 : undefined,
      sponsorCmdr: blueprint.authorCmdr,
      createdAt: Date.now(),
      notes: `Planned ${meta.name} deployment.`,
    };

    blueprint.assets = [...blueprint.assets, newAsset];
    selectedAssetId = newId;
    assetNameDraft = '';
    activeTab = 'inspector';
  }

  function handleRemoveAsset(assetId: string) {
    blueprint.assets = blueprint.assets.filter((a) => a.id !== assetId);
    if (selectedAssetId === assetId) {
      selectedAssetId = blueprint.assets[0]?.id || null;
    }
  }

  function handleUpdateAssetPlacement(assetId: string, updates: Partial<PlacedAsset>) {
    blueprint.assets = blueprint.assets.map((a) => {
      if (a.id === assetId) {
        return { ...a, ...updates };
      }
      return a;
    });
  }

  function handleCopyPermalink() {
    const permalink = encodeBlueprintToPermalink(blueprint);
    const fullUrl = `${window.location.origin}${window.location.pathname}?${permalink}`;
    navigator.clipboard.writeText(fullUrl);
    copyStatus = 'Permalink copied to clipboard!';
    setTimeout(() => (copyStatus = null), 3000);
  }

  function handleExportJson() {
    const jsonStr = JSON.stringify(blueprint, null, 2);
    navigator.clipboard.writeText(jsonStr);
    copyStatus = 'Blueprint JSON copied to clipboard!';
    setTimeout(() => (copyStatus = null), 3000);
  }

  function handleImportJson() {
    importError = null;
    try {
      const parsed = JSON.parse(importJsonDraft);
      if (!parsed || !parsed.systemName || !Array.isArray(parsed.assets)) {
        throw new Error('Invalid colonisation blueprint JSON structure.');
      }
      blueprint = parsed;
      if (blueprint.assets.length > 0) {
        selectedAssetId = blueprint.assets[0].id;
        selectedBodyId = blueprint.assets[0].parentBodyId;
      }
      importJsonDraft = '';
      copyStatus = 'Blueprint imported successfully!';
      setTimeout(() => (copyStatus = null), 3000);
    } catch (e: any) {
      importError = e?.message || 'Failed to parse JSON blueprint.';
    }
  }

  function handleClose() {
    isOpen = false;
    onClose?.();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
    <div class="relative w-full max-w-7xl h-[92vh] flex flex-col bg-[#070b14] border border-[var(--hud-orange)] rounded shadow-2xl overflow-hidden font-sans">
      
      <!-- Modal Header -->
      <header class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-[#090e1a]">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-base sm:text-lg font-bold font-mono tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
              <span>🏛️ SYSTEM ARCHITECT // COLONISATION BLUEPRINTING</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
                STAGE 8.1
              </span>
            </h2>
            <p class="text-xs font-mono text-[var(--hud-orange)]/70">
              System: <span class="text-white font-bold">{blueprint.systemName}</span> | Economy Target: {blueprint.economyTarget} | Plan: {blueprint.planName}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- View switcher toggle -->
          <div class="flex items-center border border-[var(--hud-orange)]/35 rounded bg-black/50 p-0.5">
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-mono rounded transition-colors {viewMode === 'system' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/70 hover:text-white'}"
              onclick={() => (viewMode = 'system')}
            >
              🌌 SYSTEM VIEW
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-mono rounded transition-colors {viewMode === 'body_detail' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/70 hover:text-white'}"
              onclick={() => (viewMode = 'body_detail')}
            >
              🪐 BODY DETAIL
            </button>
          </div>

          <button
            type="button"
            class="p-1 rounded text-[var(--hud-orange)]/70 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10 transition-colors"
            onclick={handleClose}
            title="Close Architect View"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      </header>

      <!-- Main Workspace: 2-Column Split -->
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        <!-- Left: Interactive Canvas Rendering -->
        <div class="flex-1 relative h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-[var(--hud-orange)]/25">
          <SystemArchitectCanvas
            bodies={colonySystem.bodies}
            {blueprint}
            {selectedAssetId}
            {selectedBodyId}
            {viewMode}
            onSelectAsset={handleSelectAsset}
            onSelectBody={handleSelectBody}
            onAddAssetToBody={(b, t) => handleAddAsset(t)}
            onUpdateAssetPlacement={handleUpdateAssetPlacement}
          />

          <!-- Body Selector Pill Bar at top of canvas -->
          <div class="absolute top-12 left-4 right-4 flex items-center space-x-2 overflow-x-auto pb-1 z-10 pointer-events-auto">
            {#each colonySystem.bodies as body}
              <button
                type="button"
                class="px-2.5 py-1 text-[11px] font-mono rounded whitespace-nowrap border transition-all flex items-center space-x-1.5 {selectedBodyId === body.id ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] font-bold shadow-lg' : 'bg-black/80 text-[var(--hud-orange)]/80 border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] hover:text-white'}"
                onclick={() => {
                  selectedBodyId = body.id;
                  viewMode = 'body_detail';
                }}
              >
                <span>{body.type === 'star' ? '☀️' : body.type === 'planet' ? '🪐' : '🌑'}</span>
                <span>{body.name}</span>
                {#if blueprint.assets.filter(a => a.parentBodyId === body.id).length > 0}
                  <span class="ml-1 px-1 rounded text-[9px] {selectedBodyId === body.id ? 'bg-black text-[var(--hud-orange)]' : 'bg-[var(--hud-orange)]/20 text-[var(--hud-amber)]'}">
                    {blueprint.assets.filter(a => a.parentBodyId === body.id).length}
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Right: Management, Inspector & Blueprint Tabs -->
        <div class="w-full md:w-[460px] h-[45vh] md:h-full flex flex-col bg-[#05080f] overflow-hidden">
          
          <!-- Tab Navigation -->
          <div class="flex items-center border-b border-[var(--hud-orange)]/30 bg-[#080d1a] px-2 pt-2">
            <button
              type="button"
              class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'catalog' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
              onclick={() => (activeTab = 'catalog')}
            >
              📦 CATALOG
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'inspector' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
              onclick={() => (activeTab = 'inspector')}
            >
              🔍 INSPECTOR
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'blueprint_meta' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
              onclick={() => (activeTab = 'blueprint_meta')}
            >
              📊 BLUEPRINT
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-mono border-b-2 transition-all {activeTab === 'share' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold' : 'border-transparent text-[var(--hud-orange)]/50 hover:text-[var(--hud-orange)]/80'}"
              onclick={() => (activeTab = 'share')}
            >
              🔗 PERMALINK
            </button>
          </div>

          <!-- Tab Content Area -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            
            <!-- TAB 1: ASSET CATALOG & ADDING -->
            {#if activeTab === 'catalog'}
              <div class="space-y-4">
                <div class="p-3 rounded bg-black/40 border border-[var(--hud-orange)]/25">
                  <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block mb-1">
                    TARGET PARENT BODY
                  </span>
                  <div class="flex items-center justify-between text-xs font-mono">
                    <span class="text-white font-bold">{selectedBody?.name}</span>
                    <span class="text-[var(--hud-orange)]/80">{selectedBody?.subType}</span>
                  </div>
                  <div class="text-[11px] font-mono text-[var(--hud-orange)]/60 mt-1 flex space-x-3">
                    <span>Radius: {selectedBody?.radiusKm.toLocaleString()} km</span>
                    <span>Gravity: {selectedBody?.gravityG?.toFixed(2) ?? '1.0'}G</span>
                    <span>Landable: {selectedBody?.landable ? 'YES' : 'NO'}</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-xs font-mono text-[var(--hud-orange)] font-bold tracking-wider">
                    SELECT ASSET TO DEPLOY:
                  </span>

                  <div class="grid grid-cols-1 gap-2.5">
                    {#each Object.values(INFRASTRUCTURE_CATALOG) as meta}
                      <div class="p-2.5 rounded border border-[var(--hud-orange)]/25 bg-[#0a0f1d] hover:border-[var(--hud-orange)]/70 transition-all flex flex-col justify-between">
                        <div class="flex items-start justify-between">
                          <div class="flex items-center space-x-2">
                            <span class="text-lg">{meta.icon}</span>
                            <div>
                              <h4 class="text-xs font-mono font-bold text-white">{meta.name}</h4>
                              <span class="text-[10px] font-mono text-[var(--hud-orange)]/70">
                                {meta.category} • Pad: {meta.padSize}
                              </span>
                            </div>
                          </div>
                          <span class="text-[11px] font-mono text-[var(--hud-amber)]">
                            {(meta.estimatedCostCr / 1e9).toFixed(1)}B CR
                          </span>
                        </div>

                        <p class="text-[11px] text-[var(--hud-orange)]/80 mt-1.5 font-sans leading-relaxed">
                          {meta.description}
                        </p>

                        <div class="mt-2 pt-2 border-t border-[var(--hud-orange)]/15 flex items-center justify-between">
                          <span class="text-[10px] font-mono text-[var(--hud-orange)]/60">
                            Constr: {meta.constructionDays} days | Excl: {meta.exclusionRadiusKm}km
                          </span>
                          <button
                            type="button"
                            class="px-2.5 py-1 text-xs font-mono rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] text-[var(--hud-amber)] hover:text-black border border-[var(--hud-orange)]/40 transition-colors font-bold"
                            onclick={() => handleAddAsset(meta.type)}
                          >
                            + BLUEPRINT
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

            <!-- TAB 2: INSPECTOR & PLACEMENT VALIDATION -->
            {:else if activeTab === 'inspector'}
              {#if selectedAsset}
                {@const meta = INFRASTRUCTURE_CATALOG[selectedAsset.assetType]}
                <div class="space-y-4">
                  <!-- Header Card -->
                  <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/40 flex items-start justify-between">
                    <div class="flex items-center space-x-2.5">
                      <span class="text-2xl">{meta.icon}</span>
                      <div>
                        <input
                          type="text"
                          class="bg-transparent text-sm font-mono font-bold text-white border-b border-[var(--hud-orange)]/40 focus:border-[var(--hud-orange)] outline-none"
                          bind:value={selectedAsset.customName}
                        />
                        <span class="text-[10px] font-mono text-[var(--hud-orange)]/70 block mt-0.5">
                          {meta.name} • On: {selectedAsset.parentBodyName}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-mono rounded bg-red-900/40 hover:bg-red-800 border border-red-500/50 text-red-200"
                      onclick={() => handleRemoveAsset(selectedAsset.id)}
                      title="Deconstruct / Remove Asset"
                    >
                      REMOVE
                    </button>
                  </div>

                  <!-- Validation Alert Panel -->
                  <div class="p-3 rounded border {currentValidation.isValid ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-red-950/40 border-red-500/50'}">
                    <div class="flex items-center space-x-2 font-mono text-xs font-bold {currentValidation.isValid ? 'text-emerald-400' : 'text-red-400'}">
                      <span>{currentValidation.isValid ? '✅ VALID PLACEMENT ARCHITECTURE' : '⚠️ PLACEMENT CONFLICTS DETECTED'}</span>
                    </div>

                    {#if currentValidation.issues.length > 0}
                      <ul class="mt-2 space-y-1 text-[11px] font-mono">
                        {#each currentValidation.issues as issue}
                          <li class="{issue.severity === 'error' ? 'text-red-300' : issue.severity === 'warning' ? 'text-yellow-300' : 'text-blue-300'} flex items-start space-x-1.5">
                            <span>•</span>
                            <span>{issue.message}</span>
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="text-[11px] text-emerald-200/80 mt-1 font-mono">
                        All orbital stability, gravity envelope, and proximity exclusion constraints satisfied.
                      </p>
                    {/if}
                  </div>

                  <!-- Placement Parameter Controls -->
                  <div class="p-3 rounded bg-black/40 border border-[var(--hud-orange)]/20 space-y-3">
                    <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                      SPATIAL PLACEMENT PARAMETERS
                    </span>

                    {#if selectedAsset.domain === 'orbital'}
                      <div>
                        <div class="flex justify-between text-xs font-mono text-[var(--hud-orange)] mb-1">
                          <span>Orbital Altitude:</span>
                          <span class="text-white font-bold">{selectedAsset.orbitalAltitudeKm?.toLocaleString()} km</span>
                        </div>
                        <input
                          type="range"
                          min="200"
                          max="80000"
                          step="100"
                          class="w-full accent-[var(--hud-orange)]"
                          bind:value={selectedAsset.orbitalAltitudeKm}
                        />
                        <div class="flex justify-between text-[9px] font-mono text-[var(--hud-orange)]/50">
                          <span>Min: {meta.minOrbitAltitudeKm ?? 350} km</span>
                          <span>Max: {meta.maxOrbitAltitudeKm ?? 50000} km</span>
                        </div>
                      </div>

                      <div>
                        <div class="flex justify-between text-xs font-mono text-[var(--hud-orange)] mb-1">
                          <span>Orbital Phase Angle:</span>
                          <span class="text-white font-bold">{selectedAsset.orbitalPhaseDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="359"
                          step="1"
                          class="w-full accent-[var(--hud-orange)]"
                          bind:value={selectedAsset.orbitalPhaseDeg}
                        />
                      </div>
                    {:else}
                      <div>
                        <div class="flex justify-between text-xs font-mono text-[var(--hud-orange)] mb-1">
                          <span>Surface Latitude:</span>
                          <span class="text-white font-bold">{selectedAsset.surfaceLatitude?.toFixed(1)}°</span>
                        </div>
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          step="0.5"
                          class="w-full accent-[var(--hud-orange)]"
                          bind:value={selectedAsset.surfaceLatitude}
                        />
                      </div>

                      <div>
                        <div class="flex justify-between text-xs font-mono text-[var(--hud-orange)] mb-1">
                          <span>Surface Longitude:</span>
                          <span class="text-white font-bold">{selectedAsset.surfaceLongitude?.toFixed(1)}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="0.5"
                          class="w-full accent-[var(--hud-orange)]"
                          bind:value={selectedAsset.surfaceLongitude}
                        />
                      </div>
                    {/if}
                  </div>

                  <!-- Metadata notes -->
                  <div class="p-3 rounded bg-black/40 border border-[var(--hud-orange)]/20 space-y-2">
                    <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                      ARCHITECT NOTES & SPONSOR
                    </span>
                    <input
                      type="text"
                      placeholder="Sponsoring CMDR / Squadron"
                      class="w-full p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      bind:value={selectedAsset.sponsorCmdr}
                    />
                    <textarea
                      rows="2"
                      placeholder="Installation operational directive..."
                      class="w-full p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      bind:value={selectedAsset.notes}
                    ></textarea>
                  </div>
                </div>
              {:else}
                <div class="p-8 text-center text-xs font-mono text-[var(--hud-orange)]/60">
                  Select an asset on the canvas or from the blueprint list to inspect.
                </div>
              {/if}

            <!-- TAB 3: BLUEPRINT MASTER SUMMARY -->
            {:else if activeTab === 'blueprint_meta'}
              <div class="space-y-4">
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-2">
                  <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                    COLONISATION MASTER PLAN
                  </span>
                  <input
                    type="text"
                    class="w-full p-1.5 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/40 rounded text-white font-bold outline-none"
                    bind:value={blueprint.planName}
                  />
                  <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span class="text-[10px] text-[var(--hud-orange)]/70 block">Target Economy:</span>
                      <select
                        class="w-full p-1 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white outline-none"
                        bind:value={blueprint.economyTarget}
                      >
                        <option value="High Tech">High Tech</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Extraction">Extraction</option>
                        <option value="Refinery">Refinery</option>
                        <option value="Agriculture">Agriculture</option>
                        <option value="Colony">Colony</option>
                      </select>
                    </div>
                    <div>
                      <span class="text-[10px] text-[var(--hud-orange)]/70 block">Security Goal:</span>
                      <select
                        class="w-full p-1 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white outline-none"
                        bind:value={blueprint.securityStatus}
                      >
                        <option value="High">High Security</option>
                        <option value="Medium">Medium Security</option>
                        <option value="Low">Low Security</option>
                        <option value="Anarchy">Anarchy Haven</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Aggregated Metrics -->
                <div class="grid grid-cols-2 gap-2">
                  <div class="p-2.5 rounded bg-black/40 border border-[var(--hud-orange)]/20">
                    <span class="text-[10px] font-mono text-[var(--hud-orange)]/70 block">TOTAL ESTIMATED BUDGET</span>
                    <span class="text-base font-mono font-bold text-[var(--hud-amber)]">
                      {(blueprintStats.totalCost / 1e9).toFixed(2)}B CR
                    </span>
                  </div>
                  <div class="p-2.5 rounded bg-black/40 border border-[var(--hud-orange)]/20">
                    <span class="text-[10px] font-mono text-[var(--hud-orange)]/70 block">TOTAL TIMELINE</span>
                    <span class="text-base font-mono font-bold text-white">
                      ~{blueprintStats.maxDays} Days
                    </span>
                  </div>
                </div>

                <!-- Asset Roster List -->
                <div class="space-y-1.5">
                  <span class="text-xs font-mono text-[var(--hud-orange)] font-bold tracking-wider">
                    PLANNED ASSETS ({blueprint.assets.length}):
                  </span>
                  <div class="space-y-1 max-h-56 overflow-y-auto">
                    {#each blueprint.assets as asset}
                      {@const meta = INFRASTRUCTURE_CATALOG[asset.assetType]}
                      <button
                        type="button"
                        class="w-full p-2 rounded text-left text-xs font-mono border transition-all flex items-center justify-between {selectedAssetId === asset.id ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-orange)] text-white' : 'bg-black/40 border-[var(--hud-orange)]/20 text-[var(--hud-orange)]/80 hover:border-[var(--hud-orange)]/50'}"
                        onclick={() => {
                          selectedAssetId = asset.id;
                          selectedBodyId = asset.parentBodyId;
                          activeTab = 'inspector';
                        }}
                      >
                        <div class="flex items-center space-x-2">
                          <span>{meta.icon}</span>
                          <div>
                            <span class="font-bold">{asset.customName}</span>
                            <span class="text-[10px] text-[var(--hud-orange)]/60 block">
                              {asset.parentBodyName} • {asset.domain === 'orbital' ? `${asset.orbitalAltitudeKm?.toLocaleString()}km` : `${asset.surfaceLatitude?.toFixed(0)}°, ${asset.surfaceLongitude?.toFixed(0)}°`}
                            </span>
                          </div>
                        </div>
                        <span class="text-[11px] font-bold text-[var(--hud-amber)]">
                          {(meta.estimatedCostCr / 1e9).toFixed(1)}B
                        </span>
                      </button>
                    {/each}
                  </div>
                </div>
              </div>

            <!-- TAB 4: SHARE & PERMALINK -->
            {:else if activeTab === 'share'}
              <div class="space-y-4">
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-2">
                  <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                    SHAREABLE PERMALINK URL
                  </span>
                  <p class="text-[11px] text-[var(--hud-orange)]/80 font-sans">
                    Encode the entire star system master blueprint into a persistent, shareable URL state for wing commanders and factions.
                  </p>

                  <button
                    type="button"
                    class="w-full py-2 text-xs font-mono font-bold rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black transition-colors"
                    onclick={handleCopyPermalink}
                  >
                    📋 COPY SHAREABLE PERMALINK
                  </button>

                  <button
                    type="button"
                    class="w-full py-1.5 text-xs font-mono rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:bg-[var(--hud-orange)]/15 text-[var(--hud-orange)] transition-colors"
                    onclick={handleExportJson}
                  >
                    💾 EXPORT BLUEPRINT JSON
                  </button>
                </div>

                {#if copyStatus}
                  <div class="p-2 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono text-center">
                    {copyStatus}
                  </div>
                {/if}

                <!-- Import Blueprint -->
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-2">
                  <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                    IMPORT BLUEPRINT JSON
                  </span>
                  <textarea
                    rows="3"
                    placeholder="Paste exported blueprint JSON here..."
                    class="w-full p-2 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                    bind:value={importJsonDraft}
                  ></textarea>

                  {#if importError}
                    <div class="text-[11px] font-mono text-red-400">
                      {importError}
                    </div>
                  {/if}

                  <button
                    type="button"
                    class="w-full py-1.5 text-xs font-mono font-bold rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] hover:text-black transition-colors"
                    onclick={handleImportJson}
                    disabled={!importJsonDraft.trim()}
                  >
                    📥 LOAD BLUEPRINT
                  </button>
                </div>
              </div>
            {/if}

          </div>

          <!-- Bottom Footer Status -->
          <footer class="p-3 border-t border-[var(--hud-orange)]/25 bg-[#080d1a] flex items-center justify-between text-xs font-mono">
            <span class="text-[var(--hud-orange)]/70">
              Active Sponsor: <span class="text-white font-bold">{blueprint.authorCmdr}</span>
            </span>
            <span class="text-[var(--hud-amber)] font-bold">
              Budget: {(blueprintStats.totalCost / 1e9).toFixed(1)}B CR
            </span>
          </footer>

        </div>
      </div>

    </div>
  </div>
{/if}
