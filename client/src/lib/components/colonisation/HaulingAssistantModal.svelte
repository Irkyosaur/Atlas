<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import {
    type AssetRecipeKey,
    type CargoShipPreset,
    type HaulingTripCalculation,
    type LiveCargoSyncState,
    CARGO_SHIP_PRESETS,
    generateAssetBomSummary,
    calculateHaulingRuns,
    colonisationBomEngine,
  } from '$engine/colonisation_bom_engine';

  interface Props {
    isOpen: boolean;
    assetKey?: AssetRecipeKey;
    assetCustomName?: string;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    assetKey = 'planetary_outpost_t1',
    assetCustomName = 'Haven City Alpha',
    onClose,
  }: Props = $props();

  // Ship preset selection
  let selectedShipId = $state<string>(CARGO_SHIP_PRESETS[0].id);
  let customCapacityInput = $state<number>(784);

  // Delivered materials ledger
  let deliveredMap = $state<Record<string, number>>({});

  // Telemetry status
  let syncState = $state<LiveCargoSyncState>(colonisationBomEngine.getState());

  // Simulation controls
  let simCommodity = $state<string>('titanium');
  let simAmount = $state<number>(784);
  let feedbackNotice = $state<string | null>(null);

  // Subscribe to engine state & deliveries
  $effect(() => {
    const unsubDelivery = colonisationBomEngine.onDelivery((delivery) => {
      deliveredMap = {
        ...deliveredMap,
        [delivery.commodityId]: (deliveredMap[delivery.commodityId] || 0) + delivery.amount,
      };
      showFeedback(`Delivered ${delivery.amount}t ${delivery.commodityId.replace(/_/g, ' ').toUpperCase()} to ${delivery.siteName}`);
    });

    const unsubSync = colonisationBomEngine.subscribe((st) => {
      syncState = st;
      if (st.currentShipCargoCapacity) {
        customCapacityInput = st.currentShipCargoCapacity;
      }
    });

    return () => {
      unsubDelivery();
      unsubSync();
    };
  });

  const activeShipPreset = $derived.by<CargoShipPreset>(() => {
    return CARGO_SHIP_PRESETS.find((s) => s.id === selectedShipId) || CARGO_SHIP_PRESETS[0];
  });

  // Generate live summary
  const bomSummary = $derived.by(() => {
    return generateAssetBomSummary(assetKey, assetCustomName, deliveredMap, syncState.inventory);
  });

  // Calculate hauling run metrics
  const haulingCalc = $derived.by<HaulingTripCalculation>(() => {
    return calculateHaulingRuns(
      bomSummary.remainingTonnage,
      bomSummary.totalTonnage,
      activeShipPreset,
      customCapacityInput
    );
  });

  function showFeedback(msg: string) {
    feedbackNotice = msg;
    setTimeout(() => {
      if (feedbackNotice === msg) feedbackNotice = null;
    }, 4000);
  }

  function handleSelectShipPreset(preset: CargoShipPreset) {
    selectedShipId = preset.id;
    customCapacityInput = preset.cargoCapacityTons;
    colonisationBomEngine.setShipCargoCapacity(preset.cargoCapacityTons);
  }

  function handleSimulateLoadCargo() {
    const loaded = colonisationBomEngine.loadShipCargo(simCommodity, simAmount);
    showFeedback(`Loaded ${loaded}t of ${simCommodity.toUpperCase()} into ship cargo hold.`);
  }

  function handleSimulateUnloadDeliver() {
    const inHold = syncState.inventory[simCommodity] || 0;
    const unloadCount = inHold > 0 ? inHold : simAmount;
    colonisationBomEngine.recordUnloadDelivery(simCommodity, unloadCount, `${assetCustomName} Construction Hub`);
  }

  function handleEnableSimMode() {
    colonisationBomEngine.enableSimulationMode(activeShipPreset);
    showFeedback('Simulated EDill Telemetry Stream Enabled.');
  }

  function handleClose() {
    isOpen = false;
    onClose?.();
  }
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
    <div class="relative w-full max-w-5xl h-[88vh] flex flex-col bg-[#070b14] border border-[var(--hud-orange)] rounded shadow-2xl overflow-hidden font-sans select-none">
      
      <!-- Modal Header -->
      <header class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-[#090e1a]">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-base sm:text-lg font-bold font-mono tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
              <span>🚛 LIVE HAULING ASSISTANT & CARGO SYNC</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
                STAGE 8.2
              </span>
            </h2>
            <p class="text-xs font-mono text-[var(--hud-orange)]/70">
              Colony Site: <span class="text-white font-bold">{assetCustomName}</span> ({bomSummary.assetName})
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-1 rounded text-[var(--hud-orange)]/70 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10 transition-colors"
          onclick={handleClose}
          title="Close Hauling Assistant"
        >
          <Icon name="close" size={20} />
        </button>
      </header>

      <!-- Main Modal Content: 2-Column Split -->
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        <!-- Left Column: Ship Setup, Run Calculator & EDill Telemetry Bridge -->
        <div class="w-full md:w-[480px] p-4 border-b md:border-b-0 md:border-r border-[var(--hud-orange)]/25 flex flex-col space-y-4 overflow-y-auto bg-[#05080f]">
          
          <!-- EDill Live Telemetry Status Banner -->
          <div class="p-3 rounded bg-black/60 border {syncState.isConnected ? 'border-emerald-500/60' : 'border-amber-500/40'} space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="relative flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full {syncState.isConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 {syncState.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                </span>
                <span class="text-xs font-mono font-bold {syncState.isConnected ? 'text-emerald-400' : 'text-amber-400'}">
                  {syncState.isConnected ? (syncState.usingSimulation ? 'EDILL SIMULATED CARGO STREAM' : 'EDILL WEBSOCKET CONNECTED') : 'EDILL COCKPIT BRIDGE OFFLINE'}
                </span>
              </div>

              {#if !syncState.isConnected || !syncState.usingSimulation}
                <button
                  type="button"
                  class="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] text-[var(--hud-amber)] hover:text-black border border-[var(--hud-orange)]/40 transition-colors"
                  onclick={handleEnableSimMode}
                >
                  USE SIM STREAM
                </button>
              {/if}
            </div>

            <p class="text-[11px] font-mono text-[var(--hud-orange)]/70">
              Host: <span class="text-white">ws://127.0.0.1:8999/ws/telemetry</span> • Ingests live <span class="text-white">Cargo.json</span> &amp; <span class="text-white">CargoDepot</span> unloads.
            </p>
          </div>

          <!-- Ship Cargo Configuration Preset Selector -->
          <div class="p-3 rounded bg-black/50 border border-[var(--hud-orange)]/30 space-y-2.5">
            <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
              CARGO SHIP CONFIGURATION
            </span>

            <div class="grid grid-cols-1 gap-1.5">
              {#each CARGO_SHIP_PRESETS as preset}
                <button
                  type="button"
                  class="w-full p-2 rounded text-left text-xs font-mono border transition-all flex items-center justify-between {selectedShipId === preset.id ? 'bg-[var(--hud-orange)] text-black border-[var(--hud-orange)] font-bold shadow-sm' : 'bg-black/60 border-[var(--hud-orange)]/25 text-[var(--hud-orange)]/80 hover:border-[var(--hud-orange)]/60 hover:text-white'}"
                  onclick={() => handleSelectShipPreset(preset)}
                >
                  <div>
                    <span>{preset.name}</span>
                    <span class="text-[10px] opacity-75 block">
                      {preset.hullClass} • {preset.defaultJumpRangeLy} LY Jump
                    </span>
                  </div>
                  <span class="text-xs font-bold font-mono">
                    {preset.cargoCapacityTons} t
                  </span>
                </button>
              {/each}
            </div>

            <!-- Custom Hold Input -->
            <div class="pt-2 border-t border-[var(--hud-orange)]/15 flex items-center justify-between text-xs font-mono">
              <span class="text-[var(--hud-orange)]/70">Custom Hold Capacity:</span>
              <div class="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="1200"
                  class="w-20 p-1 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/40 rounded text-right text-white font-bold outline-none"
                  bind:value={customCapacityInput}
                />
                <span class="text-[var(--hud-orange)]/70">t</span>
              </div>
            </div>
          </div>

          <!-- Trip & Hauling Math Dashboard -->
          <div class="p-3.5 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-3">
            <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
              HAULING RUN METRICS
            </span>

            <div class="grid grid-cols-2 gap-2 text-center font-mono">
              <div class="p-2.5 rounded bg-black/80 border border-[var(--hud-orange)]/20">
                <span class="text-[10px] text-[var(--hud-orange)]/70 block">REMAINING RUNS</span>
                <span class="text-lg font-bold text-[var(--hud-amber)]">
                  {haulingCalc.remainingRunsRequired} Trips
                </span>
                <span class="text-[10px] text-[var(--hud-orange)]/60 block">
                  {haulingCalc.completedRunsEquivalent} / {haulingCalc.totalRunsRequired} Done
                </span>
              </div>

              <div class="p-2.5 rounded bg-black/80 border border-[var(--hud-orange)]/20">
                <span class="text-[10px] text-[var(--hud-orange)]/70 block">EST. FLIGHT TIME</span>
                <span class="text-lg font-bold text-white">
                  ~{haulingCalc.estimatedFlightHours} Hours
                </span>
                <span class="text-[10px] text-[var(--hud-orange)]/60 block">
                  ~{haulingCalc.estimatedFuelUsageTons}t Tritium/Fuel
                </span>
              </div>
            </div>

            <!-- In-Cockpit Cargo Hold Telemetry Gauge -->
            <div class="p-2.5 rounded bg-black/40 border border-[var(--hud-orange)]/20 space-y-1.5 font-mono">
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--hud-orange)]/80">Current Ship Cargo Hold:</span>
                <span class="text-white font-bold">{syncState.currentShipCargoUsed} / {syncState.currentShipCargoCapacity} t</span>
              </div>
              <div class="w-full h-2 rounded bg-black/80 border border-[var(--hud-orange)]/25 overflow-hidden">
                <div
                  class="h-full bg-cyan-400 transition-all duration-300"
                  style="width: {Math.min(100, Math.round((syncState.currentShipCargoUsed / (syncState.currentShipCargoCapacity || 1)) * 100))}%"
                ></div>
              </div>
            </div>
          </div>

          <!-- In-Cockpit Simulator Panel -->
          <div class="p-3 rounded bg-black/50 border border-[var(--hud-orange)]/25 space-y-2 font-mono text-xs">
            <span class="text-[var(--hud-amber)] font-bold block">
              COCKPIT SIMULATOR (TEST BED)
            </span>

            <div class="grid grid-cols-2 gap-2">
              <select
                class="p-1 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/30 rounded text-white outline-none"
                bind:value={simCommodity}
              >
                {#each bomSummary.commodities as c}
                  <option value={c.commodityId}>{c.name}</option>
                {/each}
              </select>

              <input
                type="number"
                min="1"
                max={customCapacityInput}
                class="p-1 text-xs font-mono bg-black/80 border border-[var(--hud-orange)]/30 rounded text-right text-white outline-none"
                bind:value={simAmount}
              />
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                class="py-1.5 px-2 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-colors"
                onclick={handleSimulateLoadCargo}
              >
                📦 LOAD HOLD
              </button>
              <button
                type="button"
                class="py-1.5 px-2 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-colors"
                onclick={handleSimulateUnloadDeliver}
              >
                🏗️ UNLOAD & DELIVER
              </button>
            </div>
          </div>

          {#if feedbackNotice}
            <div class="p-2 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs font-mono text-center">
              {feedbackNotice}
            </div>
          {/if}

        </div>

        <!-- Right Column: Live Material Checklist & Decrementing Progress -->
        <div class="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto bg-[#070b14]">
          
          <!-- Summary Header -->
          <div class="flex items-center justify-between pb-2 border-b border-[var(--hud-orange)]/20">
            <div>
              <h3 class="text-sm font-mono font-bold text-white">
                LIVE MATERIAL MANIFEST & DEFICITS
              </h3>
              <span class="text-xs font-mono text-[var(--hud-orange)]/70">
                Decrements automatically as commodities are unloaded in-game.
              </span>
            </div>

            <div class="text-right font-mono text-xs">
              <span class="text-emerald-400 font-bold">{bomSummary.percentCompleted}% COMPLETE</span>
              <span class="text-[var(--hud-orange)]/60 block">{bomSummary.remainingTonnage.toLocaleString()} t remaining</span>
            </div>
          </div>

          <!-- Manifest Item Cards -->
          <div class="space-y-2">
            {#each bomSummary.commodities as item}
              <div class="p-3 rounded bg-black/60 border {item.remainingTonnage === 0 ? 'border-emerald-500/50 bg-emerald-950/15' : 'border-[var(--hud-orange)]/25'} flex flex-col space-y-2">
                <div class="flex items-start justify-between font-mono">
                  <div class="flex items-center space-x-2">
                    <span class="text-base">{item.remainingTonnage === 0 ? '✅' : '📦'}</span>
                    <div>
                      <span class="text-xs font-bold text-white">{item.name}</span>
                      <span class="text-[10px] text-[var(--hud-orange)]/70 block">
                        Category: {item.category} • Cost: {(item.totalCostCr / 1e6).toFixed(2)}M CR
                      </span>
                    </div>
                  </div>

                  <div class="text-right">
                    <span class="text-xs font-bold {item.remainingTonnage === 0 ? 'text-emerald-400' : 'text-[var(--hud-amber)]'}">
                      {item.remainingTonnage === 0 ? 'FULL QUOTA DELIVERED' : `${item.remainingTonnage.toLocaleString()} t NEEDED`}
                    </span>
                    <span class="text-[10px] text-[var(--hud-orange)]/60 block">
                      {item.deliveredTonnage} / {item.totalRequiredTonnage} t ({item.percentCompleted}%)
                    </span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-2 rounded bg-black/80 border border-[var(--hud-orange)]/20 overflow-hidden">
                  <div
                    class="h-full transition-all duration-300 {item.remainingTonnage === 0 ? 'bg-emerald-400' : 'bg-[var(--hud-orange)]'}"
                    style="width: {item.percentCompleted}%"
                  ></div>
                </div>

                <!-- In-Hold & Fast Unload Option -->
                <div class="flex items-center justify-between pt-1 border-t border-[var(--hud-orange)]/10 text-xs font-mono">
                  <span class="text-[11px] {item.inCargoTonnage > 0 ? 'text-cyan-300 font-bold' : 'text-[var(--hud-orange)]/50'}">
                    {item.inCargoTonnage > 0 ? `🚀 ${item.inCargoTonnage}t in current ship cargo` : 'Cargo hold empty'}
                  </span>

                  {#if item.remainingTonnage > 0}
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] text-[var(--hud-amber)] hover:text-black border border-[var(--hud-orange)]/40 text-[10px] font-bold transition-colors"
                      onclick={() => colonisationBomEngine.recordUnloadDelivery(item.commodityId, Math.min(item.remainingTonnage, haulingCalc.effectiveCapacityTons), `${assetCustomName} Construction Hub`)}
                    >
                      UNLOAD 1 RUN ({Math.min(item.remainingTonnage, haulingCalc.effectiveCapacityTons)}t)
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          <!-- Recent Deliveries Feed -->
          {#if syncState.recentDeliveries.length > 0}
            <div class="mt-4 p-3 rounded bg-black/60 border border-[var(--hud-orange)]/20 space-y-2">
              <span class="text-xs font-mono text-[var(--hud-amber)] font-bold block">
                RECENT DELIVERIES LOG
              </span>

              <div class="space-y-1 max-h-36 overflow-y-auto">
                {#each syncState.recentDeliveries as del}
                  <div class="flex items-center justify-between text-[11px] font-mono p-1 rounded bg-black/40 border border-[var(--hud-orange)]/10">
                    <span class="text-emerald-400 font-bold">+{del.amount}t {del.commodityName}</span>
                    <span class="text-[var(--hud-orange)]/70">{del.siteName}</span>
                    <span class="text-[var(--hud-orange)]/50">{new Date(del.timestamp).toLocaleTimeString()}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

        </div>
      </div>

      <!-- Footer Bar -->
      <footer class="px-5 py-3 border-t border-[var(--hud-orange)]/35 bg-[#090e1a] flex items-center justify-between text-xs font-mono">
        <span class="text-[var(--hud-orange)]/70">
          Hauler: <span class="text-white font-bold">{activeShipPreset.name}</span> ({haulingCalc.effectiveCapacityTons}t)
        </span>

        <span class="text-[var(--hud-amber)] font-bold">
          Estimated Haul Budget: {(bomSummary.remainingCostCr / 1e6).toFixed(2)}M CR Remaining
        </span>
      </footer>

    </div>
  </div>
{/if}
