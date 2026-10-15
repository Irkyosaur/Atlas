<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type CarrierServiceKey,
    type ServiceStatus,
    type CarrierLedgerState,
    CARRIER_SERVICE_CATALOG,
    BASELINE_CARRIER_WEEKLY_UPKEEP_CR,
    CARRIER_JUMP_OPERATIONAL_COST_CR,
    MAX_TRITIUM_DEPOT_CAPACITY_TONS,
    MAX_CARRIER_CARGO_CAPACITY_TONS,
    TRITIUM_LOW_WARNING_THRESHOLD_TONS,
    DEBT_DECOMMISSION_THRESHOLD_CR,
    calculateCarrierUpkeep,
    calculateFinancialRunway,
    calculateTritiumAutonomy,
    calculateJumpTritiumFuel,
    carrierLedgerEngine,
  } from '$engine/carrier_ledger_engine';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
    onPlotRouteToCarrier?: (systemName: string) => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
    onPlotRouteToCarrier,
  }: Props = $props();

  // Reactive state from engine singleton
  let ledgerState = $state<CarrierLedgerState>(carrierLedgerEngine.getState());

  // Subscribe to changes
  onMount(() => {
    const unsub = carrierLedgerEngine.subscribe((s) => {
      ledgerState = s;
    });
    return unsub;
  });

  // UI Tabs inside panel
  let activeTab = $state<'overview' | 'services' | 'tritium' | 'manual_ingest'>('overview');

  // Interactive transfer draft
  let transferTritiumDraft = $state<number>(100);
  let transferSuccessMsg = $state<string | null>(null);

  // Manual Profile Ingest draft
  let rawJsonProfileDraft = $state<string>('');
  let ingestError = $state<string | null>(null);
  let ingestSuccess = $state<string | null>(null);

  // Derived Calculations
  const upkeep = $derived(calculateCarrierUpkeep(ledgerState));
  const runway = $derived(calculateFinancialRunway(ledgerState.carrierBankBalanceCr, upkeep.totalWeeklyUpkeepCr));
  const autonomy = $derived(
    calculateTritiumAutonomy(
      ledgerState.tritiumTankTons,
      ledgerState.tritiumCargoReservesTons,
      upkeep.totalCargoUsedTons
    )
  );

  // Formatter utilities
  function formatCr(val: number): string {
    return Math.round(val).toLocaleString('en-US');
  }

  function formatCompactCr(val: number): string {
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(0) + 'K';
    return val.toLocaleString('en-US');
  }

  function handleServiceToggle(key: CarrierServiceKey, newStatus: ServiceStatus) {
    carrierLedgerEngine.setServiceStatus(key, newStatus);
  }

  function handleTransferTritium() {
    const res = carrierLedgerEngine.transferTritiumToTank(transferTritiumDraft);
    if (res.success) {
      transferSuccessMsg = `Transferred ${res.transferred}t Tritium into Depot Tank!`;
      setTimeout(() => (transferSuccessMsg = null), 3000);
    }
  }

  function handleImportProfile() {
    ingestError = null;
    ingestSuccess = null;
    try {
      const parsed = JSON.parse(rawJsonProfileDraft);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format.');
      }
      carrierLedgerEngine.ingestFromProfile(parsed);
      ingestSuccess = 'Carrier profile ingested and synced successfully!';
      rawJsonProfileDraft = '';
      setTimeout(() => (ingestSuccess = null), 4000);
    } catch (e: any) {
      ingestError = e?.message || 'Failed to parse Carrier JSON.';
    }
  }

  function handleLoadTemplateProfile(type: 'dssa_deep_space' | 'mining_depot' | 'bubble_trader') {
    if (type === 'dssa_deep_space') {
      carrierLedgerEngine.ingestFromProfile({
        carrierName: 'DSSA DESTINY CALLS',
        callsign: 'V6H-99P',
        currentSystem: 'Amundsen\'s Vision',
        currentBody: 'Haven Ring A',
        carrierBankBalanceCr: 3_800_000_000,
        jumpsPerWeek: 1,
        tritiumTankTons: 950,
        tritiumCargoReservesTons: 12_000,
        otherCargoMassTons: 500,
        missionProfile: 'Deep Space Explorer',
        services: {
          refuel: 'active',
          repair: 'active',
          armory: 'active',
          shipyard: 'suspended',
          outfitting: 'suspended',
          vista_genomics: 'active',
          pioneer_supplies: 'suspended',
          bartender: 'active',
          secure_warehouse: 'uninstalled',
          universal_cartographics: 'active',
          redemption_office: 'uninstalled',
        },
      });
    } else if (type === 'mining_depot') {
      carrierLedgerEngine.ingestFromProfile({
        carrierName: 'KOLBEIN EXTRACTION HUB',
        callsign: 'KOL-777',
        currentSystem: 'Col 285 Sector CC-K a38-2',
        currentBody: '1 b Ring',
        carrierBankBalanceCr: 850_000_000,
        jumpsPerWeek: 8,
        tritiumTankTons: 420,
        tritiumCargoReservesTons: 8_500,
        otherCargoMassTons: 11_200,
        missionProfile: 'Mining Depot',
        services: {
          refuel: 'active',
          repair: 'active',
          armory: 'active',
          shipyard: 'uninstalled',
          outfitting: 'uninstalled',
          vista_genomics: 'uninstalled',
          pioneer_supplies: 'uninstalled',
          bartender: 'uninstalled',
          secure_warehouse: 'uninstalled',
          universal_cartographics: 'uninstalled',
          redemption_office: 'uninstalled',
        },
      });
    } else {
      carrierLedgerEngine.ingestFromProfile({
        carrierName: 'SOL COMMERCE EMBASSY',
        callsign: 'SOL-01X',
        currentSystem: 'Sol',
        currentBody: 'Earth High Orbit',
        carrierBankBalanceCr: 5_200_000_000,
        jumpsPerWeek: 12,
        tritiumTankTons: 1_000,
        tritiumCargoReservesTons: 2_000,
        otherCargoMassTons: 15_000,
        missionProfile: 'Bubble Trading Hub',
        services: {
          refuel: 'active',
          repair: 'active',
          armory: 'active',
          shipyard: 'active',
          outfitting: 'active',
          vista_genomics: 'active',
          pioneer_supplies: 'active',
          bartender: 'active',
          secure_warehouse: 'active',
          universal_cartographics: 'active',
          redemption_office: 'active',
        },
      });
    }
  }

  function handleClose() {
    isOpen = false;
    onClose?.();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
    <div
      class="relative w-full max-w-6xl h-[90vh] flex flex-col bg-[#070b14] border border-[var(--hud-orange)] rounded shadow-2xl overflow-hidden font-sans select-none"
    >
      <!-- Modal Header -->
      <header class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-[#090e1a]">
        <div class="flex items-center space-x-3">
          <Icon name="fleet-carrier" size={22} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-base sm:text-lg font-bold font-mono tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
              <span>FLEET CARRIER // TRITIUM DEPOT & UPKEEP LEDGER</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
                STAGE 8.3
              </span>
            </h2>
            <p class="text-xs font-mono text-[var(--hud-orange)]/70">
              Vessel: <span class="text-white font-bold">{ledgerState.carrierName}</span> [{ledgerState.callsign}] | Location: <span class="text-[var(--hud-amber)] font-bold">{ledgerState.currentSystem}</span> ({ledgerState.currentBody})
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          {#if onPlotRouteToCarrier}
            <button
              type="button"
              class="px-3 py-1 text-xs font-mono rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] hover:text-black font-bold transition-all flex items-center space-x-1.5"
              onclick={() => onPlotRouteToCarrier(ledgerState.currentSystem)}
              title="Plot interstellar route to Carrier location"
            >
              <span>🚀</span>
              <span>PLOT ROUTE</span>
            </button>
          {/if}

          <button
            type="button"
            class="p-1 rounded text-[var(--hud-orange)]/70 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10 transition-colors"
            onclick={handleClose}
            title="Close Ledger"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      </header>

      <!-- Subheader / Tabs -->
      <div class="flex items-center justify-between px-5 border-b border-[var(--hud-orange)]/30 bg-[#080d1a]">
        <div class="flex space-x-2">
          <button
            type="button"
            class="py-2.5 px-4 text-xs font-mono border-b-2 transition-all flex items-center space-x-2 {activeTab === 'overview' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-orange)]/60 hover:text-white'}"
            onclick={() => (activeTab = 'overview')}
          >
            <span>📊</span>
            <span>OVERVIEW & RUNWAY</span>
          </button>

          <button
            type="button"
            class="py-2.5 px-4 text-xs font-mono border-b-2 transition-all flex items-center space-x-2 {activeTab === 'services' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-orange)]/60 hover:text-white'}"
            onclick={() => (activeTab = 'services')}
          >
            <span>🛠️</span>
            <span>SERVICES & UPKEEP ({upkeep.activeModulesCount}/{upkeep.installedModulesCount})</span>
          </button>

          <button
            type="button"
            class="py-2.5 px-4 text-xs font-mono border-b-2 transition-all flex items-center space-x-2 {activeTab === 'tritium' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-orange)]/60 hover:text-white'}"
            onclick={() => (activeTab = 'tritium')}
          >
            <span>⛽</span>
            <span class="flex items-center space-x-1.5">
              <span>TRITIUM DEPOT</span>
              {#if autonomy.isTankLow}
                <span class="px-1 py-0.2 text-[9px] rounded bg-red-950 text-red-400 border border-red-500/50 font-bold">LOW</span>
              {/if}
            </span>
          </button>

          <button
            type="button"
            class="py-2.5 px-4 text-xs font-mono border-b-2 transition-all flex items-center space-x-2 {activeTab === 'manual_ingest' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-orange)]/60 hover:text-white'}"
            onclick={() => (activeTab = 'manual_ingest')}
          >
            <span>📥</span>
            <span>PROFILE SYNC / INGEST</span>
          </button>
        </div>

        <!-- Quick Status Indicator -->
        <div class="hidden md:flex items-center space-x-4 text-xs font-mono py-1">
          <div class="flex items-center space-x-1.5">
            <span class="text-[var(--hud-orange)]/60">RUNWAY:</span>
            <span class="font-bold {runway.runwayStatus === 'healthy' ? 'text-emerald-400' : runway.runwayStatus === 'caution' ? 'text-amber-400' : 'text-red-400'}">
              {runway.weeksRemaining.toFixed(1)} WEEKS ({runway.monthsRemaining.toFixed(1)} MO)
            </span>
          </div>
          <div class="text-[var(--hud-orange)]/40">|</div>
          <div class="flex items-center space-x-1.5">
            <span class="text-[var(--hud-orange)]/60">BURN:</span>
            <span class="text-[var(--hud-amber)] font-bold">{formatCompactCr(upkeep.totalWeeklyUpkeepCr)} CR/wk</span>
          </div>
        </div>
      </div>

      <!-- Main Body Area -->
      <div class="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-6">

        <!-- ================= TAB 1: OVERVIEW & RUNWAY ================= -->
        {#if activeTab === 'overview'}
          <!-- Top KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- Carrier Bank Balance -->
            <div class="p-4 rounded bg-[#0a0f1e] border border-[var(--hud-orange)]/30 flex flex-col justify-between shadow-sm">
              <div class="flex items-center justify-between text-[11px] text-[var(--hud-orange)]/70 uppercase">
                <span>CARRIER BANK BALANCE</span>
                <span>🏦</span>
              </div>
              <div class="my-2">
                <div class="text-xl sm:text-2xl font-bold font-mono text-white">
                  {formatCr(ledgerState.carrierBankBalanceCr)} <span class="text-xs text-[var(--hud-amber)]">CR</span>
                </div>
                <div class="text-[10px] text-[var(--hud-orange)]/60 mt-0.5">
                  {(ledgerState.carrierBankBalanceCr / 1e9).toFixed(3)} Billion Credits
                </div>
              </div>
              <div class="flex items-center space-x-1 pt-2 border-t border-[var(--hud-orange)]/15">
                <button
                  type="button"
                  class="flex-1 py-1 text-[10px] rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold transition-all text-center"
                  onclick={() => carrierLedgerEngine.adjustBankBalance(100_000_000)}
                >
                  +100M
                </button>
                <button
                  type="button"
                  class="flex-1 py-1 text-[10px] rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold transition-all text-center"
                  onclick={() => carrierLedgerEngine.adjustBankBalance(500_000_000)}
                >
                  +500M
                </button>
                <button
                  type="button"
                  class="flex-1 py-1 text-[10px] rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold transition-all text-center"
                  onclick={() => carrierLedgerEngine.adjustBankBalance(-100_000_000)}
                >
                  -100M
                </button>
              </div>
            </div>

            <!-- Weekly Upkeep Burn -->
            <div class="p-4 rounded bg-[#0a0f1e] border border-[var(--hud-orange)]/30 flex flex-col justify-between shadow-sm">
              <div class="flex items-center justify-between text-[11px] text-[var(--hud-orange)]/70 uppercase">
                <span>WEEKLY MAINTENANCE BURN</span>
                <span>🔥</span>
              </div>
              <div class="my-2">
                <div class="text-xl sm:text-2xl font-bold font-mono text-[var(--hud-amber)]">
                  {formatCr(upkeep.totalWeeklyUpkeepCr)} <span class="text-xs text-white/70">CR/wk</span>
                </div>
                <div class="text-[10px] text-[var(--hud-orange)]/60 mt-0.5">
                  Base: 5.0M | Modules: {formatCompactCr(upkeep.modulesUpkeepCr)} | Jumps: {formatCompactCr(upkeep.jumpCostPerWeekCr)}
                </div>
              </div>
              <div class="pt-2 border-t border-[var(--hud-orange)]/15 text-[10px] flex justify-between text-white/70">
                <span>Monthly: {formatCompactCr(upkeep.monthlyUpkeepCr)} CR</span>
                <span>Annual: {formatCompactCr(upkeep.annualUpkeepCr)} CR</span>
              </div>
            </div>

            <!-- Financial Runway -->
            <div class="p-4 rounded bg-[#0a0f1e] border border-[var(--hud-orange)]/30 flex flex-col justify-between shadow-sm">
              <div class="flex items-center justify-between text-[11px] text-[var(--hud-orange)]/70 uppercase">
                <span>SOLVENCY RUNWAY</span>
                <span class="w-2.5 h-2.5 rounded-full {runway.runwayStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : runway.runwayStatus === 'caution' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}"></span>
              </div>
              <div class="my-2">
                <div class="text-xl sm:text-2xl font-bold font-mono {runway.runwayStatus === 'healthy' ? 'text-emerald-400' : runway.runwayStatus === 'caution' ? 'text-amber-400' : 'text-red-400'}">
                  {runway.weeksRemaining.toFixed(1)} <span class="text-xs text-white/70">WEEKS</span>
                </div>
                <div class="text-[10px] text-[var(--hud-orange)]/70 mt-0.5">
                  Approx. <span class="text-white font-bold">{runway.monthsRemaining.toFixed(1)} months</span> ({runway.daysRemaining} days remaining)
                </div>
              </div>
              <div class="pt-2 border-t border-[var(--hud-orange)]/15 text-[10px] flex justify-between text-white/70">
                <span>Status:</span>
                <span class="uppercase font-bold {runway.runwayStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}">
                  {runway.runwayStatus}
                </span>
              </div>
            </div>

            <!-- Tritium Depot Balance -->
            <div class="p-4 rounded bg-[#0a0f1e] border border-[var(--hud-orange)]/30 flex flex-col justify-between shadow-sm">
              <div class="flex items-center justify-between text-[11px] text-[var(--hud-orange)]/70 uppercase">
                <span>TRITIUM TANK DEPOT</span>
                <span>⛽</span>
              </div>
              <div class="my-2">
                <div class="text-xl sm:text-2xl font-bold font-mono {autonomy.isTankLow ? 'text-red-400' : 'text-white'}">
                  {ledgerState.tritiumTankTons} <span class="text-xs text-[var(--hud-orange)]">/ 1,000 T</span>
                </div>
                <div class="text-[10px] text-[var(--hud-orange)]/60 mt-0.5">
                  Cargo Reserves: <span class="text-white font-bold">{ledgerState.tritiumCargoReservesTons.toLocaleString()}t</span> | Total: {autonomy.totalTritiumTons.toLocaleString()}t
                </div>
              </div>
              <!-- Tank Gauge Bar -->
              <div class="w-full bg-black/60 h-2 rounded overflow-hidden border border-white/10 mt-1">
                <div
                  class="h-full transition-all duration-500 {autonomy.isTankLow ? 'bg-red-500' : 'bg-gradient-to-r from-[var(--hud-orange)] to-[var(--hud-amber)]'}"
                  style="width: {autonomy.tankPercent}%"
                ></div>
              </div>
            </div>

          </div>

          <!-- Mid Section: Interactive Operational Simulator & Runway Details -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            <!-- Left 2 Cols: Jump Tax & Flight Operations Simulator -->
            <div class="lg:col-span-2 p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-4">
              <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-base">🚀</span>
                  <span class="font-bold text-[var(--hud-amber)] uppercase tracking-wider">
                    OPERATIONAL JUMP TAX & ACTIVITY SIMULATOR
                  </span>
                </div>
                <span class="text-[10px] text-[var(--hud-orange)]/70">100,000 CR / JUMP</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="flex justify-between text-xs text-[var(--hud-orange)] mb-1">
                    <span>Projected Carrier Jumps per Week:</span>
                    <span class="text-white font-bold">{ledgerState.jumpsPerWeek} jumps</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    class="w-full accent-[var(--hud-orange)] cursor-pointer"
                    value={ledgerState.jumpsPerWeek}
                    oninput={(e) => carrierLedgerEngine.setJumpsPerWeek(parseInt(e.currentTarget.value) || 0)}
                  />
                  <div class="flex justify-between text-[10px] text-[var(--hud-orange)]/50 mt-0.5">
                    <span>0 (Stationary)</span>
                    <span>25 (Active Mission)</span>
                    <span>50 (Deep Explorer)</span>
                  </div>
                </div>

                <div class="p-3 rounded bg-black/40 border border-[var(--hud-orange)]/20 space-y-2">
                  <div class="flex justify-between text-[11px]">
                    <span class="text-[var(--hud-orange)]/70">Weekly Jump Cost:</span>
                    <span class="text-white font-bold">{formatCr(upkeep.jumpCostPerWeekCr)} CR</span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-[var(--hud-orange)]/70">Estimated Fuel Consumption:</span>
                    <span class="text-[var(--hud-amber)] font-bold">
                      ~{(ledgerState.jumpsPerWeek * autonomy.fuelPer500LyJumpTons).toLocaleString()}t Tritium / wk
                    </span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-[var(--hud-orange)]/70">Carrier Jump Distance Max:</span>
                    <span class="text-white font-bold">{(ledgerState.jumpsPerWeek * 500).toLocaleString()} LY / wk</span>
                  </div>
                </div>
              </div>

              <!-- Solvency & Decommissioning Projection -->
              <div class="p-4 rounded bg-black/50 border border-[var(--hud-orange)]/25 space-y-3">
                <div class="flex items-center justify-between text-xs font-bold text-[var(--hud-orange)] uppercase">
                  <span>🚨 DECOMMISSIONING & DEBT THRESHOLD LEDGER</span>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/40">
                    FRONTIER DEBT CEILING: 250M CR
                  </span>
                </div>

                <p class="text-[11px] text-white/80 leading-relaxed">
                  Under Frontier Carrier mechanics, when Carrier Bank Balance reaches 0 CR, installed services are automatically suspended to minimize burn. The carrier enters provisional debt until an accumulated debt ceiling of <span class="text-red-400 font-bold">250,000,000 CR</span> is breached, triggering irreversible decommissioning and asset scrap.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--hud-orange)]/15">
                  <div class="p-2 rounded bg-[#0a0f1d] border border-white/5">
                    <div class="text-[10px] text-[var(--hud-orange)]/60">CASH EXHAUSTION:</div>
                    <div class="text-sm font-bold text-white mt-0.5">
                      {runway.weeksRemaining.toFixed(1)} Weeks
                    </div>
                  </div>
                  <div class="p-2 rounded bg-[#0a0f1d] border border-white/5">
                    <div class="text-[10px] text-[var(--hud-orange)]/60">WITH 250M DEBT BUFFER:</div>
                    <div class="text-sm font-bold text-[var(--hud-amber)] mt-0.5">
                      {runway.totalRunwayWeeksWithDebt.toFixed(1)} Weeks
                    </div>
                  </div>
                  <div class="p-2 rounded bg-[#0a0f1d] border border-white/5">
                    <div class="text-[10px] text-[var(--hud-orange)]/60">PROJECTED SCRAP DATE:</div>
                    <div class="text-sm font-bold text-red-400 mt-0.5">
                      {runway.decommissionDateEstimate}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right 1 Col: Capacity & Cargo Breakdown -->
            <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-4 flex flex-col justify-between">
              <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
                  <span class="font-bold text-[var(--hud-amber)] uppercase tracking-wider">
                    CARRIER MASS & CARGO ALLOCATION
                  </span>
                  <span class="text-[10px] text-[var(--hud-orange)]/70">25,000 T MAX</span>
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between text-xs">
                    <span class="text-[var(--hud-orange)]/80">Installed Services Reserved:</span>
                    <span class="text-white font-bold">{upkeep.modulesReservedCargoTons.toLocaleString()} T</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-[var(--hud-orange)]/80">Tritium Reserves in Cargo:</span>
                    <span class="text-[var(--hud-amber)] font-bold">{ledgerState.tritiumCargoReservesTons.toLocaleString()} T</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-[var(--hud-orange)]/80">General Trade Goods:</span>
                    <span class="text-white font-bold">{ledgerState.otherCargoMassTons.toLocaleString()} T</span>
                  </div>
                  <div class="flex justify-between text-xs pt-1 border-t border-[var(--hud-orange)]/20 font-bold">
                    <span class="text-emerald-400">Available Cargo Space:</span>
                    <span class="text-emerald-300">{upkeep.freeCargoCapacityTons.toLocaleString()} T</span>
                  </div>
                </div>

                <!-- Capacity Progress Bar -->
                <div class="space-y-1 pt-2">
                  <div class="flex justify-between text-[10px] text-[var(--hud-orange)]/60">
                    <span>USED: {upkeep.totalCargoUsedTons.toLocaleString()} T</span>
                    <span>{Math.round((upkeep.totalCargoUsedTons / MAX_CARRIER_CARGO_CAPACITY_TONS) * 100)}%</span>
                  </div>
                  <div class="w-full bg-black/60 h-3 rounded overflow-hidden flex border border-white/10">
                    <div
                      class="bg-blue-600 h-full"
                      style="width: {(upkeep.modulesReservedCargoTons / MAX_CARRIER_CARGO_CAPACITY_TONS) * 100}%"
                      title="Modules Space: {upkeep.modulesReservedCargoTons}t"
                    ></div>
                    <div
                      class="bg-[var(--hud-orange)] h-full"
                      style="width: {(ledgerState.tritiumCargoReservesTons / MAX_CARRIER_CARGO_CAPACITY_TONS) * 100}%"
                      title="Tritium Cargo: {ledgerState.tritiumCargoReservesTons}t"
                    ></div>
                    <div
                      class="bg-purple-600 h-full"
                      style="width: {(ledgerState.otherCargoMassTons / MAX_CARRIER_CARGO_CAPACITY_TONS) * 100}%"
                      title="Other Cargo: {ledgerState.otherCargoMassTons}t"
                    ></div>
                  </div>
                  <div class="flex items-center space-x-3 text-[9px] text-[var(--hud-orange)]/60 pt-1">
                    <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded bg-blue-600"></span><span>Modules</span></span>
                    <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded bg-[var(--hud-orange)]"></span><span>Tritium</span></span>
                    <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded bg-purple-600"></span><span>Cargo</span></span>
                  </div>
                </div>
              </div>

              <!-- Quick Mission Profile Selector -->
              <div class="p-3 rounded bg-black/40 border border-[var(--hud-orange)]/20 space-y-2">
                <span class="text-[10px] text-[var(--hud-orange)]/70 uppercase font-bold block">
                  MISSION PROFILE
                </span>
                <div class="grid grid-cols-2 gap-1.5">
                  {#each (['Fleet Command', 'Deep Space Explorer', 'Bubble Trading Hub', 'Mining Depot'] as const) as prof}
                    <button
                      type="button"
                      class="p-1.5 rounded text-[10px] border transition-all text-center {ledgerState.missionProfile === prof ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-orange)]' : 'bg-black/40 text-[var(--hud-orange)]/70 border-white/10 hover:border-[var(--hud-orange)]/40 hover:text-white'}"
                      onclick={() => carrierLedgerEngine.updateCarrierMeta(ledgerState.carrierName, ledgerState.callsign, ledgerState.currentSystem, ledgerState.currentBody, prof)}
                    >
                      {prof}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

          </div>

        <!-- ================= TAB 2: SERVICES & UPKEEP ================= -->
        {:else if activeTab === 'services'}
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 rounded bg-[#090e1b] border border-[var(--hud-orange)]/25">
              <div class="flex items-center space-x-3">
                <span class="text-xl">🛠️</span>
                <div>
                  <h3 class="text-sm font-bold text-[var(--hud-orange)]">ACTIVE SERVICE ROSTER & WEEKLY UPKEEP</h3>
                  <p class="text-[11px] text-[var(--hud-orange)]/70">
                    Frontier maintenance schedule: Active services cost full upkeep; Suspended services pay ~30-50% retainer fee; Uninstalled services incur zero upkeep.
                  </p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-[var(--hud-orange)]/60">TOTAL SERVICES UPKEEP:</div>
                <div class="text-base font-bold text-[var(--hud-amber)] font-mono">
                  {formatCr(upkeep.modulesUpkeepCr)} CR / week
                </div>
              </div>
            </div>

            <!-- Service Modules List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each upkeep.serviceBreakdown as item}
                <div class="p-3.5 rounded bg-[#0a0f1d] border {item.status === 'active' ? 'border-[var(--hud-orange)]/50 bg-[#0e1628]' : item.status === 'suspended' ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/10 opacity-75'} transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-2.5">
                        <span class="text-xl">{item.spec.icon}</span>
                        <div>
                          <div class="font-bold text-white flex items-center space-x-2">
                            <span>{item.spec.name}</span>
                            <span class="px-1.5 py-0.2 rounded text-[9px] uppercase border {item.status === 'active' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : item.status === 'suspended' ? 'bg-amber-950 text-amber-300 border-amber-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-700'}">
                              {item.status}
                            </span>
                          </div>
                          <div class="text-[10px] text-[var(--hud-orange)]/60">
                            {item.spec.category} • Crew: {item.spec.crewRole} • Space: {item.spec.cargoCapacityTons} T
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-xs font-bold font-mono text-[var(--hud-amber)]">
                          {formatCr(item.weeklyCostCr)} <span class="text-[10px] text-white/50">CR/wk</span>
                        </div>
                        <div class="text-[9px] text-[var(--hud-orange)]/50">
                          Install: {formatCompactCr(item.spec.installCostCr)}
                        </div>
                      </div>
                    </div>

                    <p class="text-[11px] text-white/70 mt-2 font-sans leading-relaxed">
                      {item.spec.description}
                    </p>
                  </div>

                  <!-- State Toggle Buttons: Active / Suspended / Uninstalled -->
                  <div class="grid grid-cols-3 gap-1 pt-2 border-t border-[var(--hud-orange)]/15">
                    <button
                      type="button"
                      class="py-1 px-2 rounded text-[10px] uppercase font-bold border transition-all text-center {item.status === 'active' ? 'bg-emerald-600 text-black border-emerald-500 shadow-sm' : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-500/50 hover:text-emerald-400'}"
                      onclick={() => handleServiceToggle(item.spec.key, 'active')}
                    >
                      ONLINE
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded text-[10px] uppercase font-bold border transition-all text-center {item.status === 'suspended' ? 'bg-amber-500 text-black border-amber-400 shadow-sm' : 'bg-black/30 border-white/10 text-white/60 hover:border-amber-500/50 hover:text-amber-400'}"
                      onclick={() => handleServiceToggle(item.spec.key, 'suspended')}
                    >
                      PAUSED
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded text-[10px] uppercase font-bold border transition-all text-center {item.status === 'uninstalled' ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-black/30 border-white/10 text-white/60 hover:border-zinc-500 hover:text-zinc-300'}"
                      onclick={() => handleServiceToggle(item.spec.key, 'uninstalled')}
                    >
                      OFF
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>

        <!-- ================= TAB 3: TRITIUM DEPOT ================= -->
        {:else if activeTab === 'tritium'}
          <div class="space-y-5">
            <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-3">
              <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-xl">⛽</span>
                  <span class="font-bold text-[var(--hud-amber)] uppercase tracking-wider text-sm">
                    TRITIUM FUEL GAUGE & DISTANCE AUTONOMY CALCULATOR
                  </span>
                </div>
                {#if autonomy.isTankLow}
                  <div class="px-2.5 py-1 rounded bg-red-950 text-red-400 border border-red-500 font-bold text-xs flex items-center space-x-1 animate-pulse">
                    <span>⚠️</span>
                    <span>DEPOT TANK UNDER 200T THRESHOLD</span>
                  </div>
                {/if}
              </div>

              <!-- Main Visual Fuel Gauge with Warning Threshold Markers -->
              <div class="space-y-2 pt-2">
                <div class="flex justify-between text-xs font-bold">
                  <span class="text-white">
                    PRIMARY DEPOT TANK: {ledgerState.tritiumTankTons} / 1,000 T ({autonomy.tankPercent}%)
                  </span>
                  <span class="{autonomy.isTankLow ? 'text-red-400' : 'text-emerald-400'}">
                    {autonomy.isTankLow ? 'CRITICAL LOW FUEL LEVEL' : 'OPERATIONAL FUEL LEVEL'}
                  </span>
                </div>

                <div class="relative w-full h-8 bg-black/80 rounded border border-[var(--hud-orange)]/40 overflow-hidden shadow-inner">
                  <!-- Low fuel warning threshold line (200t = 20%) -->
                  <div
                    class="absolute top-0 bottom-0 left-[20%] w-0.5 bg-red-500 z-20 pointer-events-none"
                    title="200t Low Fuel Warning Threshold"
                  ></div>
                  <div class="absolute top-0.5 left-[20.5%] text-[9px] text-red-400 z-20 font-bold pointer-events-none">
                    200T LIMIT
                  </div>

                  <!-- Fuel Level Fill -->
                  <div
                    class="h-full transition-all duration-500 {autonomy.isTankLow ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500' : 'bg-gradient-to-r from-orange-600 via-[var(--hud-orange)] to-[var(--hud-amber)]'}"
                    style="width: {autonomy.tankPercent}%"
                  ></div>
                </div>

                <div class="flex justify-between text-[10px] text-[var(--hud-orange)]/60 font-mono">
                  <span>0t (Depleted)</span>
                  <span class="text-red-400">200t Warning Threshold</span>
                  <span>500t (Half Tank)</span>
                  <span>1,000t (Max Capacity)</span>
                </div>
              </div>

              <!-- Manual Tank Slider -->
              <div class="pt-2">
                <div class="flex justify-between text-xs text-[var(--hud-orange)] mb-1">
                  <span>Adjust Active Tank Level:</span>
                  <span class="text-white font-bold">{ledgerState.tritiumTankTons} T</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  class="w-full accent-[var(--hud-orange)] cursor-pointer"
                  value={ledgerState.tritiumTankTons}
                  oninput={(e) => carrierLedgerEngine.setTritiumTank(parseInt(e.currentTarget.value) || 0)}
                />
              </div>
            </div>

            <!-- Inter-tank Transfer & Cargo Hold Reserves -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Cargo Hold Tritium Reserves -->
              <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-3">
                <span class="text-xs font-bold text-[var(--hud-amber)] uppercase block">
                  CARGO HOLD TRITIUM RESERVES
                </span>
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold font-mono text-white">
                      {ledgerState.tritiumCargoReservesTons.toLocaleString()} <span class="text-xs text-[var(--hud-orange)]">T</span>
                    </div>
                    <div class="text-[10px] text-[var(--hud-orange)]/60">
                      Onboard cargo storage available for tank refueling
                    </div>
                  </div>
                  <span class="text-3xl">📦</span>
                </div>

                <div class="space-y-1 pt-1">
                  <div class="flex justify-between text-xs text-[var(--hud-orange)] mb-1">
                    <span>Adjust Reserves in Cargo:</span>
                    <span class="text-white font-bold">{ledgerState.tritiumCargoReservesTons.toLocaleString()} T</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="100"
                    class="w-full accent-[var(--hud-orange)] cursor-pointer"
                    value={ledgerState.tritiumCargoReservesTons}
                    oninput={(e) => carrierLedgerEngine.setTritiumCargoReserves(parseInt(e.currentTarget.value) || 0)}
                  />
                </div>

                <!-- Transfer into Depot Tank -->
                <div class="pt-3 border-t border-[var(--hud-orange)]/20 space-y-2">
                  <span class="text-[11px] text-[var(--hud-orange)] font-bold block">
                    TRANSFER RESERVES TO DEPOT TANK
                  </span>
                  <div class="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={1000 - ledgerState.tritiumTankTons}
                      class="w-32 p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/40 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      bind:value={transferTritiumDraft}
                    />
                    <button
                      type="button"
                      class="flex-1 py-1.5 px-3 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] hover:text-black font-bold transition-all"
                      onclick={handleTransferTritium}
                      disabled={ledgerState.tritiumTankTons >= 1000 || ledgerState.tritiumCargoReservesTons <= 0}
                    >
                      TRANSFER TO DEPOT
                    </button>
                  </div>
                  {#if transferSuccessMsg}
                    <div class="text-[10px] text-emerald-400 font-bold">{transferSuccessMsg}</div>
                  {/if}
                </div>
              </div>

              <!-- Distance Autonomy Curve -->
              <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-3">
                <span class="text-xs font-bold text-[var(--hud-amber)] uppercase block">
                  FLIGHT AUTONOMY PROJECTIONS (500 LY HOPS)
                </span>

                <div class="space-y-2.5">
                  <div class="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="text-[var(--hud-orange)]/70">Burn per 500 LY Max Hop:</span>
                      <span class="text-[var(--hud-amber)] font-bold">{autonomy.fuelPer500LyJumpTons} T Tritium</span>
                    </div>
                    <div class="text-[10px] text-[var(--hud-orange)]/50">
                      Formula: 5 + floor(Dist * (Cargo Mass {upkeep.totalCargoUsedTons}t + 25,000) / 200,000)
                    </div>
                  </div>

                  <div class="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="text-[var(--hud-orange)]/70">Tank-Only Max Range:</span>
                      <span class="text-white font-bold">{autonomy.maxDistanceTankOnlyLy.toLocaleString()} LY</span>
                    </div>
                    <div class="text-[10px] text-[var(--hud-orange)]/50">
                      {autonomy.maxJumpsTankOnly} consecutive 500 LY hops without cargo reload
                    </div>
                  </div>

                  <div class="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="text-[var(--hud-orange)]/70">Total Range (Reserves + Tank):</span>
                      <span class="text-emerald-400 font-bold">{autonomy.maxDistanceTotalReservesLy.toLocaleString()} LY</span>
                    </div>
                    <div class="text-[10px] text-[var(--hud-orange)]/50">
                      {autonomy.maxJumpsTotalReserves} total jumps ({autonomy.totalTritiumTons.toLocaleString()}t aggregate fuel)
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        <!-- ================= TAB 4: MANUAL INGEST / PROFILE ================= -->
        {:else if activeTab === 'manual_ingest'}
          <div class="space-y-5">
            <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-3">
              <span class="font-bold text-[var(--hud-amber)] uppercase tracking-wider text-sm block">
                CMDR PROFILE & FLEET CARRIER STATUS INGESTION
              </span>
              <p class="text-[11px] text-white/80 leading-relaxed font-sans">
                Paste player journal status, CAPI fleet ledger, or manual JSON export below to update active services, Tritium reserves, and carrier bank balance.
              </p>

              <!-- Quick Templates -->
              <div class="space-y-1.5 pt-2">
                <span class="text-[10px] text-[var(--hud-orange)]/70 uppercase font-bold block">
                  LOAD PRESET CARRIER ARCHETYPES:
                </span>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="py-1 px-3 rounded bg-black/50 border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs font-bold transition-all"
                    onclick={() => handleLoadTemplateProfile('dssa_deep_space')}
                  >
                    🌌 DSSA Explorer Haven (Amundsen's Vision)
                  </button>
                  <button
                    type="button"
                    class="py-1 px-3 rounded bg-black/50 border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs font-bold transition-all"
                    onclick={() => handleLoadTemplateProfile('bubble_trader')}
                  >
                    🏛️ Sol Commerce Public Hub (All Services Active)
                  </button>
                  <button
                    type="button"
                    class="py-1 px-3 rounded bg-black/50 border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs font-bold transition-all"
                    onclick={() => handleLoadTemplateProfile('mining_depot')}
                  >
                    ⛏️ Deep Core Mining Extraction Depot (Minimal Upkeep)
                  </button>
                </div>
              </div>

              <!-- JSON Paste Input -->
              <div class="space-y-2 pt-2">
                <span class="text-xs text-[var(--hud-orange)] font-bold block">
                  PASTE CARRIER PROFILE JSON:
                </span>
                <textarea
                  rows="6"
                  class="w-full p-2.5 text-xs font-mono bg-black/70 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                  placeholder="Paste JSON profile here (e.g. carrierName, callsign, carrierBankBalanceCr, tritiumTankTons, services...)"
                  bind:value={rawJsonProfileDraft}
                ></textarea>

                <div class="flex items-center space-x-3">
                  <button
                    type="button"
                    class="py-2 px-4 rounded bg-[var(--hud-orange)] text-black font-bold uppercase tracking-wider text-xs hover:bg-[var(--hud-amber)] transition-all shadow-md"
                    onclick={handleImportProfile}
                    disabled={!rawJsonProfileDraft.trim()}
                  >
                    SYNC CARRIER PROFILE
                  </button>

                  <button
                    type="button"
                    class="py-2 px-3 rounded bg-black/40 border border-white/20 text-white/60 hover:text-white text-xs transition-all"
                    onclick={() => carrierLedgerEngine.resetToDefault()}
                  >
                    RESET TO DEFAULTS
                  </button>
                </div>

                {#if ingestError}
                  <div class="p-2 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold">
                    ⚠️ {ingestError}
                  </div>
                {/if}
                {#if ingestSuccess}
                  <div class="p-2 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                    ✓ {ingestSuccess}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Manual Editor Fields -->
            <div class="p-4 rounded bg-[#090e1b] border border-[var(--hud-orange)]/30 space-y-3">
              <span class="font-bold text-[var(--hud-amber)] uppercase tracking-wider text-sm block">
                METADATA & CALLSIGN CUSTOMIZER
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label class="text-[10px] text-[var(--hud-orange)]/70 uppercase block mb-1">
                    Carrier Name
                    <input
                      type="text"
                      class="w-full mt-1 p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      value={ledgerState.carrierName}
                      onchange={(e) => carrierLedgerEngine.updateCarrierMeta(e.currentTarget.value, ledgerState.callsign, ledgerState.currentSystem, ledgerState.currentBody)}
                    />
                  </label>
                </div>

                <div>
                  <label class="text-[10px] text-[var(--hud-orange)]/70 uppercase block mb-1">
                    Callsign
                    <input
                      type="text"
                      class="w-full mt-1 p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      value={ledgerState.callsign}
                      onchange={(e) => carrierLedgerEngine.updateCarrierMeta(ledgerState.carrierName, e.currentTarget.value, ledgerState.currentSystem, ledgerState.currentBody)}
                    />
                  </label>
                </div>

                <div>
                  <label class="text-[10px] text-[var(--hud-orange)]/70 uppercase block mb-1">
                    Current System
                    <input
                      type="text"
                      class="w-full mt-1 p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      value={ledgerState.currentSystem}
                      onchange={(e) => carrierLedgerEngine.updateCarrierMeta(ledgerState.carrierName, ledgerState.callsign, e.currentTarget.value, ledgerState.currentBody)}
                    />
                  </label>
                </div>

                <div>
                  <label class="text-[10px] text-[var(--hud-orange)]/70 uppercase block mb-1">
                    Orbit Body
                    <input
                      type="text"
                      class="w-full mt-1 p-1.5 text-xs font-mono bg-black/60 border border-[var(--hud-orange)]/30 rounded text-white focus:border-[var(--hud-orange)] outline-none"
                      value={ledgerState.currentBody}
                      onchange={(e) => carrierLedgerEngine.updateCarrierMeta(ledgerState.carrierName, ledgerState.callsign, ledgerState.currentSystem, e.currentTarget.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>
        {/if}

      </div>

      <!-- Footer Bar -->
      <footer class="p-3 border-t border-[var(--hud-orange)]/30 bg-[#080d1a] flex items-center justify-between text-xs font-mono">
        <div class="flex items-center space-x-2 text-[var(--hud-orange)]/70">
          <span>ATLAS FLEET CARRIER SYSTEM</span>
          <span>•</span>
          <span>DEPOT STATUS: <strong class="{autonomy.isTankLow ? 'text-red-400' : 'text-emerald-400'}">{ledgerState.tritiumTankTons}T</strong></span>
        </div>
        <div class="text-[var(--hud-amber)] font-bold">
          TOTAL UPKEEP: {formatCr(upkeep.totalWeeklyUpkeepCr)} CR / WK
        </div>
      </footer>

    </div>
  </div>
{/if}
