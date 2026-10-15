<script lang="ts">
  // Location: atlas/client/src/lib/components/fleet/CarrierRemoteModal.svelte
  // Fleet Carrier Remote Management & Market Tariffs Hub (Phase 09, Stage 9.4)
  // Integrates CAPI /fleetcarrier data, Carrier Name, Callsign, Docking Access (All, Friends, Squadron, None),
  // Notorious Docking status, Bank Balance & Upkeep Allocation, 0-100% Market Tariff Slider,
  // Jump Countdown Sequence & Destination Alerts, and Commodity Market Orders.

  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    fleetCarrierCapiEngine,
    FleetCarrierCapiEngine,
    type CarrierCapiData,
    type CarrierDockingAccess,
    type CarrierMarketOrder,
  } from '$engine/fleet_carrier_capi_engine';
  import { cmdrProfileEngine } from '$engine/cmdr_profile_engine';
  import { CARRIER_SERVICE_CATALOG } from '$engine/carrier_ledger_engine';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onPlotRouteToCarrier?: (systemName: string) => void;
  }

  let { isOpen = $bindable(false), onClose, onPlotRouteToCarrier }: Props = $props();

  let carrier = $state<CarrierCapiData>(fleetCarrierCapiEngine.getData());
  let cmdrCredits = $state<number>(cmdrProfileEngine.getProfile().credits);
  let activeTab = $state<'overview' | 'finances' | 'tariffs' | 'market' | 'jump'>('overview');

  // Input states for finance modal actions
  let depositAmountCr = $state<number>(100_000_000);
  let withdrawAmountCr = $state<number>(50_000_000);
  let feedbackMessage = $state<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Jump planner state
  let jumpTargetSystem = $state<string>('Colonia');
  let jumpDistanceLy = $state<number>(498.2);

  // New market order draft
  let isAddingOrder = $state<boolean>(false);
  let newOrderCommodity = $state<string>('Tritium');
  let newOrderType = $state<'buy' | 'sell'>('buy');
  let newOrderPrice = $state<number>(55000);
  let newOrderQuantity = $state<number>(1000);

  let unsubscribe: (() => void) | null = null;
  let unsubProfile: (() => void) | null = null;

  onMount(() => {
    unsubscribe = fleetCarrierCapiEngine.subscribe((data) => {
      carrier = { ...data };
    });
    unsubProfile = cmdrProfileEngine.subscribe((p) => {
      cmdrCredits = p.credits;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (unsubProfile) unsubProfile();
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  function handleDockingAccessChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as CarrierDockingAccess;
    fleetCarrierCapiEngine.setDockingAccess(val);
    showFeedback(`Docking permissions updated to: ${val.toUpperCase()}`, 'success');
  }

  function handleNotoriousToggle() {
    const newVal = !carrier.allowNotorious;
    fleetCarrierCapiEngine.setNotoriousDocking(newVal);
    showFeedback(
      `Notorious docking ${newVal ? 'ALLOWED (Wanted ships permitted)' : 'DENIED (Security protocol active)'}`,
      newVal ? 'info' : 'success'
    );
  }

  function handleTariffChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    fleetCarrierCapiEngine.setMarketTariff(val);
  }

  function handleDeposit() {
    const res = fleetCarrierCapiEngine.depositCredits(depositAmountCr);
    showFeedback(res.message, res.success ? 'success' : 'error');
  }

  function handleWithdraw() {
    const res = fleetCarrierCapiEngine.withdrawCredits(withdrawAmountCr);
    showFeedback(res.message, res.success ? 'success' : 'error');
  }

  function handleReserveChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    fleetCarrierCapiEngine.setReservedUpkeep(val);
  }

  function handleJumpInitiate() {
    if (!jumpTargetSystem.trim()) return;
    const res = fleetCarrierCapiEngine.initiateJump(jumpTargetSystem.trim(), jumpDistanceLy);
    showFeedback(res.message, res.success ? 'success' : 'error');
  }

  function handleJumpCancel() {
    const res = fleetCarrierCapiEngine.cancelJump();
    showFeedback(res.message, res.success ? 'success' : 'error');
  }

  function handleCreateOrder() {
    if (!newOrderCommodity.trim() || newOrderQuantity <= 0 || newOrderPrice <= 0) return;
    const order: CarrierMarketOrder = {
      commodityKey: newOrderCommodity.toLowerCase().replace(/\s+/g, ''),
      commodityName: newOrderCommodity,
      category: 'Commodity',
      type: newOrderType,
      priceCr: newOrderPrice,
      galacticAverageCr: Math.round(newOrderPrice * 0.95),
      quantity: newOrderQuantity,
      allocatedCargoTons: newOrderQuantity,
    };
    fleetCarrierCapiEngine.setMarketOrder(order);
    isAddingOrder = false;
    showFeedback(`Market order for ${newOrderQuantity}t ${newOrderCommodity} posted!`, 'success');
  }

  function handleRemoveOrder(order: CarrierMarketOrder) {
    fleetCarrierCapiEngine.removeMarketOrder(order.commodityKey, order.type);
    showFeedback(`Market order for ${order.commodityName} removed.`, 'info');
  }

  function showFeedback(text: string, type: 'success' | 'error' | 'info') {
    feedbackMessage = { text, type };
    setTimeout(() => {
      if (feedbackMessage?.text === text) {
        feedbackMessage = null;
      }
    }, 4000);
  }

  const fuelPercent = $derived(
    Math.round((carrier.fuelTons / Math.max(1, carrier.maxFuelTons)) * 100)
  );

  const cargoPercent = $derived(
    Math.round((carrier.cargoUsedTons / Math.max(1, carrier.cargoCapacityTons)) * 100)
  );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none font-mono text-[var(--hud-amber)]"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal Container -->
    <div
      class="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#080c14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.35)] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="carrier-mgmt-title"
    >
      <!-- Top Tactical Header Strip -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={22} glow={true} color="var(--hud-orange)" />
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 id="carrier-mgmt-title" class="text-base sm:text-lg font-bold tracking-wider text-white">
                FLEET CARRIER REMOTE CAPI MANAGEMENT
              </h2>
              <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/50 text-[10px] font-bold text-[var(--hud-orange)]">
                {carrier.callsign}
              </span>
              {#if carrier.jumpStatus.isJumping}
                <span class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/60 text-[10px] font-bold text-amber-300 animate-pulse flex items-center space-x-1">
                  <span>⚡ JUMP IN SEQUENCE</span>
                </span>
              {/if}
            </div>
            <div class="text-xs text-white/50">
              Vessel: <span class="text-white font-bold">{carrier.carrierName}</span> &bull; Current System: <span class="text-[var(--hud-orange)]">{carrier.currentSystem}</span> ({carrier.currentBody})
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          {#if onPlotRouteToCarrier}
            <button
              type="button"
              onclick={() => onPlotRouteToCarrier(carrier.currentSystem)}
              class="px-3 py-1 rounded bg-[var(--hud-orange)]/15 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/50 text-xs text-white font-bold transition-colors"
              title="Plot Nav Route to Carrier"
            >
              📍 PLOT TO CARRIER
            </button>
          {/if}

          <button
            type="button"
            onclick={onClose}
            class="w-7 h-7 rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] bg-black/40 hover:bg-[var(--hud-orange)]/20 text-white flex items-center justify-center text-xs transition-colors"
            title="Close Remote Carrier Management"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Jump Alert Banner (if jumping) -->
      {#if carrier.jumpStatus.isJumping}
        <div class="px-5 py-2.5 bg-amber-950/40 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-3 text-amber-300">
            <span class="text-lg">⏳</span>
            <div>
              <span class="font-bold uppercase tracking-wider text-white">Pending Hyperspace Jump to:</span>
              <span class="text-amber-400 font-bold ml-1">{carrier.jumpStatus.destinationSystem}</span>
              <span class="text-white/60 ml-2">({carrier.jumpStatus.distanceLy} LY &bull; Fuel: {carrier.jumpStatus.tritiumRequiredTons}t Tritium)</span>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm font-bold text-amber-400">
              T-MINUS: <span class="font-mono text-white text-base">{FleetCarrierCapiEngine.formatDuration(carrier.jumpStatus.countdownSecondsRemaining)}</span>
            </div>
            {#if carrier.jumpStatus.lockdownActive}
              <span class="px-2 py-0.5 rounded bg-red-500/30 border border-red-500 text-red-300 text-[10px] font-bold">
                LOCKDOWN ACTIVE
              </span>
            {:else}
              <button
                type="button"
                onclick={handleJumpCancel}
                class="px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/60 border border-red-500 text-[11px] text-white font-bold transition-colors"
              >
                ABORT JUMP
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Feedback Strip -->
      {#if feedbackMessage}
        <div class="px-5 py-1.5 text-xs font-bold border-b {feedbackMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : feedbackMessage.type === 'error' ? 'bg-red-950/40 border-red-500/50 text-red-300' : 'bg-blue-950/40 border-blue-500/50 text-blue-300'}">
          {feedbackMessage.text}
        </div>
      {/if}

      <!-- Top Quick Status Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-2.5 bg-black/60 border-b border-[var(--hud-orange)]/25 text-xs">
        <div>
          <div class="text-[10px] text-white/50 uppercase">CARRIER BANK BALANCE</div>
          <div class="text-sm font-bold text-white">{FleetCarrierCapiEngine.formatCredits(carrier.finances.bankBalanceCr)}</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">AVAILABLE FOR WITHDRAWAL</div>
          <div class="text-sm font-bold text-emerald-400">{FleetCarrierCapiEngine.formatCredits(carrier.finances.availableBalanceCr)}</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">TRITIUM FUEL DEPOT</div>
          <div class="text-sm font-bold text-cyan-400">{carrier.fuelTons} / {carrier.maxFuelTons} T ({fuelPercent}%)</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">MARKET TARIFF RATE</div>
          <div class="text-sm font-bold text-[var(--hud-orange)]">{carrier.marketTariffPercent}% TARIFF</div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center space-x-2 px-5 py-2 bg-black/40 border-b border-[var(--hud-orange)]/20 text-xs">
        <button
          type="button"
          onclick={() => (activeTab = 'overview')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'overview'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          🛸 OVERVIEW & DOCKING
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'finances')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'finances'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          💰 FINANCES & UPKEEP
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'tariffs')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'tariffs'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          📊 MARKET TARIFFS
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'market')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'market'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          📦 COMMODITY ORDERS ({carrier.marketOrders.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'jump')}
          class="px-3 py-1.5 rounded border transition-colors {activeTab === 'jump'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/30 text-white/70 border-white/10 hover:border-[var(--hud-orange)]/50'}"
        >
          ⚡ REMOTE JUMP PLOTTER
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- OVERVIEW TAB -->
        {#if activeTab === 'overview'}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Access & Security Card -->
            <div class="p-4 rounded-lg bg-black/40 border border-[var(--hud-orange)]/30 space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>🛡️ DOCKING ACCESS & SECURITY</span>
              </h3>

              <div class="space-y-3 text-xs">
                <div>
                  <label for="docking-access-select" class="block text-white/60 mb-1">DOCKING ACCESS PERMISSION</label>
                  <select
                    id="docking-access-select"
                    value={carrier.dockingAccess}
                    onchange={handleDockingAccessChange}
                    class="w-full px-3 py-2 rounded bg-black/70 border border-[var(--hud-orange)]/40 text-white font-mono focus:outline-none focus:border-[var(--hud-orange)]"
                  >
                    <option value="all">ALL COMMANDERS (Unrestricted Public Docking)</option>
                    <option value="friends">FRIENDS ONLY</option>
                    <option value="squadron">SQUADRON MEMBERS ONLY</option>
                    <option value="squadronfriends">SQUADRON & FRIENDS</option>
                    <option value="none">NONE (Owner Only / Complete Lockdown)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between p-3 rounded bg-black/60 border border-white/10">
                  <div>
                    <div class="font-bold text-white">ALLOW NOTORIOUS COMMANDERS</div>
                    <div class="text-[11px] text-white/50">Allow commanders with active crime notoriety or bounties to dock</div>
                  </div>
                  <button
                    type="button"
                    onclick={handleNotoriousToggle}
                    class="px-3 py-1 rounded text-xs font-bold transition-colors {carrier.allowNotorious ? 'bg-red-500/30 text-red-300 border border-red-500' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'}"
                  >
                    {carrier.allowNotorious ? 'PERMITTED' : 'BLOCKED'}
                  </button>
                </div>

                <div class="p-3 rounded bg-black/60 border border-white/10">
                  <div class="text-white/60 text-[11px] mb-1">CURRENT CARRIER SYSTEM COORDINATES</div>
                  <div class="font-mono text-cyan-400">
                    X: {carrier.coords.x.toFixed(1)} &bull; Y: {carrier.coords.y.toFixed(1)} &bull; Z: {carrier.coords.z.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            <!-- Capacity & Tritium Card -->
            <div class="p-4 rounded-lg bg-black/40 border border-[var(--hud-orange)]/30 space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>⛽ CAPACITY & LOGISTICS</span>
              </h3>

              <div class="space-y-4 text-xs">
                <div>
                  <div class="flex justify-between text-white/70 mb-1">
                    <span>Tritium Fuel Tank</span>
                    <span class="text-cyan-400 font-bold">{carrier.fuelTons} / {carrier.maxFuelTons} T</span>
                  </div>
                  <div class="w-full h-2 rounded bg-white/10 overflow-hidden">
                    <div class="h-full bg-cyan-500" style="width: {fuelPercent}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between text-white/70 mb-1">
                    <span>Cargo Hold Allocation</span>
                    <span class="text-amber-400 font-bold">{carrier.cargoUsedTons.toLocaleString()} / {carrier.cargoCapacityTons.toLocaleString()} T ({cargoPercent}%)</span>
                  </div>
                  <div class="w-full h-2 rounded bg-white/10 overflow-hidden">
                    <div class="h-full bg-amber-500" style="width: {cargoPercent}%"></div>
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">Available Free Space: {carrier.freeCargoTons.toLocaleString()} T</div>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 text-center">
                  <div class="p-2 rounded bg-black/60 border border-white/10">
                    <div class="text-[10px] text-white/50">ACTIVE SERVICES</div>
                    <div class="text-base font-bold text-white">
                      {Object.values(carrier.services).filter((s) => s === 'active').length} / 11
                    </div>
                  </div>
                  <div class="p-2 rounded bg-black/60 border border-white/10">
                    <div class="text-[10px] text-white/50">WEEKLY UPKEEP</div>
                    <div class="text-base font-bold text-amber-400">
                      {FleetCarrierCapiEngine.formatCredits(carrier.finances.weeklyUpkeepCostCr)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <!-- FINANCES TAB -->
        {:else if activeTab === 'finances'}
          <div class="space-y-5 text-xs">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="p-4 rounded-lg bg-black/40 border border-emerald-500/40">
                <div class="text-[10px] text-white/50 uppercase">TOTAL BANK BALANCE</div>
                <div class="text-xl font-bold text-white">{FleetCarrierCapiEngine.formatCredits(carrier.finances.bankBalanceCr)}</div>
                <div class="text-[10px] text-emerald-400 mt-1">Allocated in Carrier Treasury</div>
              </div>

              <div class="p-4 rounded-lg bg-black/40 border border-cyan-500/40">
                <div class="text-[10px] text-white/50 uppercase">AVAILABLE FOR WITHDRAWAL</div>
                <div class="text-xl font-bold text-cyan-400">{FleetCarrierCapiEngine.formatCredits(carrier.finances.availableBalanceCr)}</div>
                <div class="text-[10px] text-white/40 mt-1">Free balance above reserved upkeep</div>
              </div>

              <div class="p-4 rounded-lg bg-black/40 border border-amber-500/40">
                <div class="text-[10px] text-white/50 uppercase">RESERVED UPKEEP ALLOCATION</div>
                <div class="text-xl font-bold text-amber-400">{FleetCarrierCapiEngine.formatCredits(carrier.finances.reservedUpkeepCr)}</div>
                <div class="text-[10px] text-white/40 mt-1">Safety buffer against debt scrap</div>
              </div>
            </div>

            <!-- Transfer Funds Controls -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-lg bg-black/40 border border-[var(--hud-orange)]/30">
              <!-- Deposit -->
              <div class="space-y-3">
                <div class="font-bold text-white uppercase">DEPOSIT CREDITS (CMDR &rarr; CARRIER)</div>
                <div class="text-white/50 text-[11px]">Personal Balance: {FleetCarrierCapiEngine.formatCredits(cmdrCredits)}</div>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    bind:value={depositAmountCr}
                    min="1000000"
                    step="5000000"
                    class="flex-1 px-3 py-1.5 rounded bg-black/70 border border-white/20 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onclick={handleDeposit}
                    class="px-4 py-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500 text-white font-bold transition-colors"
                  >
                    DEPOSIT
                  </button>
                </div>
              </div>

              <!-- Withdraw -->
              <div class="space-y-3">
                <div class="font-bold text-white uppercase">WITHDRAW CREDITS (CARRIER &rarr; CMDR)</div>
                <div class="text-white/50 text-[11px]">Max Free Withdrawal: {FleetCarrierCapiEngine.formatCredits(carrier.finances.availableBalanceCr)}</div>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    bind:value={withdrawAmountCr}
                    min="1000000"
                    step="5000000"
                    max={carrier.finances.availableBalanceCr}
                    class="flex-1 px-3 py-1.5 rounded bg-black/70 border border-white/20 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onclick={handleWithdraw}
                    class="px-4 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-600/60 border border-cyan-500 text-white font-bold transition-colors"
                  >
                    WITHDRAW
                  </button>
                </div>
              </div>
            </div>

            <!-- Upkeep Reserve Slider -->
            <div class="p-4 rounded-lg bg-black/40 border border-[var(--hud-orange)]/30 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-bold text-white uppercase">UPKEEP ALLOCATION SAFETY BUFFER</div>
                  <div class="text-[11px] text-white/50">Protect funds from accidental withdrawal to ensure continuous weekly upkeep</div>
                </div>
                <div class="text-sm font-bold text-amber-400 font-mono">
                  {FleetCarrierCapiEngine.formatCredits(carrier.finances.reservedUpkeepCr)}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={carrier.finances.bankBalanceCr}
                step="10000000"
                value={carrier.finances.reservedUpkeepCr}
                oninput={handleReserveChange}
                class="w-full accent-[var(--hud-orange)] cursor-pointer"
              />
            </div>
          </div>

        <!-- TARIFFS TAB -->
        {:else if activeTab === 'tariffs'}
          <div class="space-y-6 text-xs">
            <div class="p-5 rounded-lg bg-black/40 border border-[var(--hud-orange)]/40 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-white uppercase tracking-wider">
                    COMMODITY MARKET TARIFF SLIDER (0% &ndash; 100%)
                  </h3>
                  <p class="text-white/60 text-xs mt-1">
                    Frontier Companion API remote tariff control. Sets the carrier commission percentage on visitor commodity trades.
                  </p>
                </div>
                <div class="text-2xl font-bold text-[var(--hud-orange)] font-mono px-4 py-1.5 rounded bg-[var(--hud-orange)]/10 border border-[var(--hud-orange)]/40">
                  {carrier.marketTariffPercent}%
                </div>
              </div>

              <!-- Main Slider -->
              <div class="pt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={carrier.marketTariffPercent}
                  oninput={handleTariffChange}
                  class="w-full h-3 accent-[var(--hud-orange)] cursor-pointer rounded-lg bg-black/80"
                />
                <div class="flex justify-between text-[11px] text-white/40 mt-1 font-mono">
                  <span>0% (Free Trade / Squadron Support)</span>
                  <span>50% (Standard Commercial)</span>
                  <span>100% (Maximum Frontier Tariff)</span>
                </div>
              </div>

              <!-- Tariff Breakdown Context -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-[11px]">
                <div class="p-3 rounded bg-black/60 border border-white/10">
                  <span class="text-white/50 block">BUY ORDER EFFECT:</span>
                  <span class="text-white">Visitors receive 100% of order price, carrier deposits tariff difference.</span>
                </div>
                <div class="p-3 rounded bg-black/60 border border-white/10">
                  <span class="text-white/50 block">SELL ORDER EFFECT:</span>
                  <span class="text-white">Carrier sells at base price + {carrier.marketTariffPercent}% surcharge into bank.</span>
                </div>
                <div class="p-3 rounded bg-black/60 border border-white/10">
                  <span class="text-white/50 block">ESTIMATED REVENUE:</span>
                  <span class="text-emerald-400 font-bold">~{(carrier.marketTariffPercent * 12500).toLocaleString()} CR / 100t avg cargo</span>
                </div>
              </div>
            </div>
          </div>

        <!-- COMMODITY ORDERS TAB -->
        {:else if activeTab === 'market'}
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-white font-bold uppercase">ACTIVE BUY & SELL COMMODITY ORDERS</span>
                <span class="text-white/50 text-[11px] ml-2">Total Orders: {carrier.marketOrders.length}</span>
              </div>
              <button
                type="button"
                onclick={() => (isAddingOrder = !isAddingOrder)}
                class="px-3 py-1 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold transition-colors"
              >
                {isAddingOrder ? '✕ CANCEL' : '+ CREATE ORDER'}
              </button>
            </div>

            <!-- New Order Form -->
            {#if isAddingOrder}
              <div class="p-4 rounded-lg bg-black/60 border border-[var(--hud-orange)] space-y-3">
                <div class="font-bold text-white uppercase text-xs">Create New Market Order</div>
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label for="order-commodity-input" class="block text-white/50 text-[10px] mb-1">COMMODITY</label>
                    <input
                      id="order-commodity-input"
                      type="text"
                      bind:value={newOrderCommodity}
                      placeholder="e.g. Tritium"
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label for="order-type-select" class="block text-white/50 text-[10px] mb-1">ORDER TYPE</label>
                    <select
                      id="order-type-select"
                      bind:value={newOrderType}
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    >
                      <option value="buy">BUY ORDER (Visitors Sell to Carrier)</option>
                      <option value="sell">SELL ORDER (Visitors Buy from Carrier)</option>
                    </select>
                  </div>
                  <div>
                    <label for="order-price-input" class="block text-white/50 text-[10px] mb-1">UNIT PRICE (CR)</label>
                    <input
                      id="order-price-input"
                      type="number"
                      bind:value={newOrderPrice}
                      min="100"
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label for="order-qty-input" class="block text-white/50 text-[10px] mb-1">QUANTITY (TONS)</label>
                    <input
                      id="order-qty-input"
                      type="number"
                      bind:value={newOrderQuantity}
                      min="1"
                      class="w-full px-2 py-1 rounded bg-black/70 border border-white/20 text-white font-mono"
                    />
                  </div>
                </div>
                <div class="flex justify-end pt-2">
                  <button
                    type="button"
                    onclick={handleCreateOrder}
                    class="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    POST ORDER
                  </button>
                </div>
              </div>
            {/if}

            <!-- Orders Table -->
            <div class="border border-white/10 rounded-lg overflow-hidden">
              <table class="w-full text-left font-mono">
                <thead class="bg-black/80 border-b border-white/10 text-[11px] text-white/50">
                  <tr>
                    <th class="p-2.5">COMMODITY</th>
                    <th class="p-2.5">TYPE</th>
                    <th class="p-2.5">QUANTITY</th>
                    <th class="p-2.5">PRICE</th>
                    <th class="p-2.5">GALACTIC AVG</th>
                    <th class="p-2.5">TOTAL ALLOCATION</th>
                    <th class="p-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-xs">
                  {#each carrier.marketOrders as order}
                    <tr class="hover:bg-white/5">
                      <td class="p-2.5 font-bold text-white">{order.commodityName}</td>
                      <td class="p-2.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold {order.type === 'buy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}">
                          {order.type.toUpperCase()}
                        </span>
                      </td>
                      <td class="p-2.5 text-white">{order.quantity.toLocaleString()} T</td>
                      <td class="p-2.5 text-amber-400 font-bold">{order.priceCr.toLocaleString()} CR</td>
                      <td class="p-2.5 text-white/50">{order.galacticAverageCr.toLocaleString()} CR</td>
                      <td class="p-2.5 text-white font-mono">{FleetCarrierCapiEngine.formatCredits(order.priceCr * order.quantity)}</td>
                      <td class="p-2.5 text-right">
                        <button
                          type="button"
                          onclick={() => handleRemoveOrder(order)}
                          class="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 text-[10px]"
                        >
                          REMOVE
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

        <!-- REMOTE JUMP PLOTTER TAB -->
        {:else if activeTab === 'jump'}
          <div class="space-y-5 text-xs">
            <div class="p-5 rounded-lg bg-black/40 border border-[var(--hud-orange)]/40 space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>⚡ FLEET CARRIER REMOTE HYPERSPACE JUMP SEQUENCER</span>
              </h3>
              <p class="text-white/60 text-xs">
                Initiate remote 500 LY jump via CAPI. Requires 15 minutes spool-up sequence and consumes Tritium fuel from depot.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="jump-target-input" class="block text-white/50 text-[10px] mb-1">DESTINATION STAR SYSTEM</label>
                  <input
                    id="jump-target-input"
                    type="text"
                    bind:value={jumpTargetSystem}
                    placeholder="e.g. Colonia or Sol"
                    class="w-full px-3 py-2 rounded bg-black/70 border border-white/20 text-white font-mono focus:outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>
                <div>
                  <label for="jump-distance-input" class="block text-white/50 text-[10px] mb-1">ESTIMATED DISTANCE (LY, MAX 500)</label>
                  <input
                    id="jump-distance-input"
                    type="number"
                    bind:value={jumpDistanceLy}
                    min="1"
                    max="500"
                    step="0.1"
                    class="w-full px-3 py-2 rounded bg-black/70 border border-white/20 text-white font-mono focus:outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>
              </div>

              <!-- Jump Fuel Estimate -->
              <div class="p-3 rounded bg-black/60 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div class="font-bold text-white">TRITIUM CONSUMPTION ESTIMATE</div>
                  <div class="text-[11px] text-white/50">Formula: 5 + floor((Distance &times; Mass) / 200,000)</div>
                </div>
                <div class="text-right">
                  <div class="text-base font-bold text-cyan-400">
                    ~{5 + Math.floor((jumpDistanceLy * (25000 + carrier.cargoUsedTons)) / 200000)} T
                  </div>
                  <div class="text-[10px] text-white/40">Available: {carrier.fuelTons} T</div>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                {#if carrier.jumpStatus.isJumping}
                  <button
                    type="button"
                    onclick={handleJumpCancel}
                    class="px-5 py-2 rounded bg-red-600/30 hover:bg-red-600/60 border border-red-500 text-white font-bold tracking-wider"
                  >
                    ABORT JUMP SEQUENCE
                  </button>
                {:else}
                  <button
                    type="button"
                    onclick={handleJumpInitiate}
                    class="px-5 py-2 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold tracking-wider"
                  >
                    INITIATE HYPERSPACE JUMP
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <div class="flex items-center justify-between px-5 py-2.5 bg-black/80 border-t border-[var(--hud-orange)]/30 text-xs">
        <div class="flex items-center space-x-2 text-white/50">
          <span>Frontier CAPI Status:</span>
          <span class="text-emerald-400 font-bold">CONNECTED // SYNCED</span>
          <span>&bull;</span>
          <span>Last sync: {new Date(carrier.lastSyncEpochMs).toLocaleTimeString()}</span>
        </div>
        <button
          type="button"
          onclick={() => fleetCarrierCapiEngine.fetchCapiCarrier()}
          class="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] border border-white/20 transition-colors"
        >
          🔄 REFRESH CAPI DATA
        </button>
      </div>
    </div>
  </div>
{/if}
