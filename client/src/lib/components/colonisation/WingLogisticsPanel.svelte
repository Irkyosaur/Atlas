<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    wingLogisticsEngine,
    type WingSessionState,
    type WingCmdr,
    type CommodityClaim,
    type DeliveryAuditRecord,
  } from '$engine/wing_logistics_engine';
  import {
    ASSET_CONSTRUCTION_RECIPES,
    type AssetRecipeKey,
    type AssetBomSummary,
    type BomCommodityAggregate,
  } from '$engine/colonisation_bom_engine';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
    onOpenBomManifest?: (key: AssetRecipeKey) => void;
    onOpenHaulingAssistant?: (key: AssetRecipeKey) => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
    onOpenBomManifest,
    onOpenHaulingAssistant,
  }: Props = $props();

  // Engine state subscription
  let session = $state<WingSessionState>(wingLogisticsEngine.getState());

  onMount(() => {
    const unsub = wingLogisticsEngine.subscribe((s) => {
      session = s;
    });
    return unsub;
  });

  // Active view tab inside panel
  let activeTab = $state<'checklist' | 'claims' | 'audit' | 'wing_room'>('checklist');

  // Local user CMDR profile for actions
  let currentCmdrName = $state<string>('CMDR Jameson Alpha');
  let currentCmdrShip = $state<string>('Imperial Cutter (728t)');

  // Claim Allocation Form Modal / Draft
  let isClaimModalOpen = $state<boolean>(false);
  let claimCommodityId = $state<string>('titanium');
  let claimTonnage = $state<number>(728);

  // Delivery Log Form Modal / Draft
  let isDeliveryModalOpen = $state<boolean>(false);
  let deliverCommodityId = $state<string>('titanium');
  let deliverTonnage = $state<number>(728);
  let deliverNote = $state<string>('Delivered to surface landing zone pad 01');

  // WebSocket custom URL
  let customWsUrl = $state<string>('ws://127.0.0.1:8999');

  // Flash message for user actions
  let statusBanner = $state<string | null>(null);
  let bannerTimer: any = null;

  function showStatus(msg: string) {
    statusBanner = msg;
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      statusBanner = null;
    }, 4000);
  }

  // Derived current BOM summary based on live wing session state
  const liveBom = $derived.by<AssetBomSummary>(() => {
    return wingLogisticsEngine.calculateCurrentBom();
  });

  // Calculate wing totals
  const wingMetrics = $derived.by(() => {
    const totalReq = liveBom.totalTonnage;
    const delivered = liveBom.deliveredTonnage;
    const remaining = liveBom.remainingTonnage;
    const pct = liveBom.percentCompleted;

    // Total active allocated tonnage by CMDRs in flight
    const activeAllocatedTonnage = session.claims
      .filter((c) => c.status === 'active' || c.status === 'in_transit')
      .reduce((acc, c) => acc + c.allocatedTonnage, 0);

    // Number of deliveries logged
    const totalDeliveriesCount = session.auditLog.length;

    return {
      totalReq,
      delivered,
      remaining,
      pct,
      activeAllocatedTonnage,
      totalDeliveriesCount,
      activeCmdrsCount: Object.values(session.commanders).length,
    };
  });

  function handleLogDelivery() {
    const commodity = liveBom.commodities.find((c) => c.commodityId === deliverCommodityId);
    const commodityName = commodity ? commodity.name : deliverCommodityId;

    const record = wingLogisticsEngine.logCommodityDelivery({
      cmdrId: 'cmdr_local',
      cmdrName: currentCmdrName,
      commodityId: deliverCommodityId,
      commodityName,
      tonnageDelivered: Number(deliverTonnage),
      note: deliverNote.trim() || undefined,
    });

    showStatus(`Logged ${deliverTonnage}t of ${commodityName}! Remaining shortfall: ${record.remainingShortfall}t`);
    isDeliveryModalOpen = false;
  }

  function handleQuickDeliver(commodity: BomCommodityAggregate) {
    deliverCommodityId = commodity.commodityId;
    deliverTonnage = Math.min(commodity.remainingTonnage, 728);
    deliverNote = `Offloaded at ${session.siteName}`;
    isDeliveryModalOpen = true;
  }

  function handleCreateClaim() {
    const commodity = liveBom.commodities.find((c) => c.commodityId === claimCommodityId);
    const commodityName = commodity ? commodity.name : claimCommodityId;

    wingLogisticsEngine.claimAllocation({
      cmdrId: 'cmdr_local',
      cmdrName: currentCmdrName,
      commodityId: claimCommodityId,
      commodityName,
      allocatedTonnage: Number(claimTonnage),
    });

    showStatus(`Claimed hauling allocation of ${claimTonnage}t for ${commodityName}`);
    isClaimModalOpen = false;
  }

  function handleQuickClaim(commodity: BomCommodityAggregate) {
    claimCommodityId = commodity.commodityId;
    claimTonnage = Math.min(commodity.remainingTonnage, 728);
    isClaimModalOpen = true;
  }

  function handleSimulatePeerDelivery() {
    wingLogisticsEngine.triggerSimulatedWingDelivery();
    showStatus('Simulated peer delivery broadcast received!');
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  }

  function formatTimeAgo(timestamp: number): string {
    const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
    <div
      class="relative w-full max-w-6xl h-[92vh] flex flex-col bg-[#070b14] border border-[var(--hud-orange)] rounded shadow-2xl overflow-hidden font-sans"
    >
      <!-- Panel Header -->
      <header class="flex items-center justify-between px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-[#090e1a]">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={22} glow={true} color="var(--hud-orange)" />
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="text-base sm:text-lg font-bold font-mono tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
                <span>🛰️ WING LOGISTICS TRACKER</span>
                <span class="text-xs px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)]">
                  STAGE 8.4
                </span>
              </h2>
              <!-- Live Broadcast Status Badge -->
              {#if session.connectionStatus === 'connected'}
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>WEBSOCKET LIVE</span>
                </span>
              {:else if session.connectionStatus === 'simulated'}
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span>SIMULATED BROADCAST</span>
                </span>
              {:else}
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-red-500/20 text-red-400 border border-red-500/40 flex items-center space-x-1">
                  <span>DISCONNECTED</span>
                </span>
              {/if}
            </div>
            <p class="text-xs font-mono text-[var(--hud-orange)]/70">
              Session: <span class="text-white font-bold">{session.sessionName}</span> ({session.sessionId}) | Target: <span class="text-[var(--hud-amber)] font-bold">{session.siteName}</span> [{session.systemName}]
            </p>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center space-x-2">
          <!-- Fast Simulation Trigger -->
          <button
            type="button"
            class="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-mono rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 text-[var(--hud-amber)] transition-all font-bold"
            onclick={handleSimulatePeerDelivery}
            title="Simulate an immediate incoming delivery broadcast from a wing peer"
          >
            <span>⚡ SIMULATE PEER DROP</span>
          </button>

          <!-- Delivery Log Button -->
          <button
            type="button"
            class="px-3 py-1 text-xs font-mono rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/80 text-black font-bold transition-all shadow-md flex items-center space-x-1"
            onclick={() => {
              deliverCommodityId = liveBom.commodities[0]?.commodityId || 'titanium';
              deliverTonnage = 728;
              isDeliveryModalOpen = true;
            }}
          >
            <span>📦</span>
            <span>LOG DELIVERY</span>
          </button>

          <button
            type="button"
            class="p-1 rounded text-[var(--hud-orange)]/70 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10 transition-colors ml-2"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
            title="Close Wing Logistics Panel"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      </header>

      <!-- Status Notification Banner -->
      {#if statusBanner}
        <div class="px-4 py-2 bg-[var(--hud-orange)]/20 border-b border-[var(--hud-orange)]/50 text-[var(--hud-amber)] text-xs font-mono flex items-center justify-between animate-fade-in">
          <div class="flex items-center space-x-2">
            <span class="text-sm">🔔</span>
            <span class="font-bold">{statusBanner}</span>
          </div>
          <button type="button" class="text-xs text-[var(--hud-orange)] hover:underline" onclick={() => (statusBanner = null)}>
            DISMISS
          </button>
        </div>
      {/if}

      <!-- Top Summary Metrics Bar -->
      <section class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3 bg-[#0a0f1e] border-b border-[var(--hud-orange)]/25 text-xs font-mono">
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">TOTAL BOM DEMAND</span>
          <span class="text-sm font-bold text-white">{formatNumber(wingMetrics.totalReq)} <span class="text-[10px] text-[var(--hud-orange)]">t</span></span>
        </div>
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">DELIVERED TONNAGE</span>
          <span class="text-sm font-bold text-emerald-400">{formatNumber(wingMetrics.delivered)} <span class="text-[10px] text-emerald-500">t</span></span>
        </div>
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">REMAINING SHORTFALL</span>
          <span class="text-sm font-bold text-amber-400">{formatNumber(wingMetrics.remaining)} <span class="text-[10px] text-amber-500">t</span></span>
        </div>
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">CONSTRUCTION PROGRESS</span>
          <span class="text-sm font-bold text-[var(--hud-orange)]">{wingMetrics.pct.toFixed(1)}%</span>
        </div>
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">ALLOCATED IN-FLIGHT</span>
          <span class="text-sm font-bold text-sky-400">{formatNumber(wingMetrics.activeAllocatedTonnage)} <span class="text-[10px] text-sky-500">t</span></span>
        </div>
        <div class="p-2 rounded bg-black/40 border border-[var(--hud-orange)]/20">
          <span class="text-[var(--hud-orange)]/70 block text-[10px]">ACTIVE WING CMDRS</span>
          <span class="text-sm font-bold text-purple-400">{wingMetrics.activeCmdrsCount} CMDRs</span>
        </div>
      </section>

      <!-- Overall Global Progress Bar -->
      <div class="px-5 py-2.5 bg-black/40 border-b border-[var(--hud-orange)]/20 flex flex-col space-y-1">
        <div class="flex items-center justify-between text-xs font-mono">
          <span class="text-[var(--hud-orange)]/80 flex items-center space-x-2">
            <span class="font-bold text-white">{session.siteName}</span>
            <span>// Construction Phase Completion</span>
          </span>
          <span class="text-[var(--hud-amber)] font-bold">{formatNumber(wingMetrics.delivered)} / {formatNumber(wingMetrics.totalReq)} t ({wingMetrics.pct.toFixed(1)}%)</span>
        </div>
        <div class="w-full h-3 bg-black/80 rounded border border-[var(--hud-orange)]/35 overflow-hidden flex">
          <div
            class="h-full bg-gradient-to-r from-[var(--hud-orange)] via-[var(--hud-amber)] to-emerald-400 transition-all duration-500 relative"
            style="width: {wingMetrics.pct}%"
          >
            <div class="absolute inset-0 bg-white/10 animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="flex items-center space-x-1 px-4 py-2 border-b border-[var(--hud-orange)]/25 bg-[#080d1a] text-xs font-mono">
        <button
          type="button"
          class="px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 {activeTab === 'checklist' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/80 hover:bg-[var(--hud-orange)]/15 hover:text-white'}"
          onclick={() => (activeTab = 'checklist')}
        >
          <span>📊</span>
          <span>BOM CHECKLIST & PROGRESS</span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 {activeTab === 'claims' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/80 hover:bg-[var(--hud-orange)]/15 hover:text-white'}"
          onclick={() => (activeTab = 'claims')}
        >
          <span>🎯</span>
          <span>HAULING ALLOCATIONS ({session.claims.length})</span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 {activeTab === 'audit' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/80 hover:bg-[var(--hud-orange)]/15 hover:text-white'}"
          onclick={() => (activeTab = 'audit')}
        >
          <span>📜</span>
          <span>DELIVERY AUDIT LOG ({session.auditLog.length})</span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 {activeTab === 'wing_room' ? 'bg-[var(--hud-orange)] text-black font-bold' : 'text-[var(--hud-orange)]/80 hover:bg-[var(--hud-orange)]/15 hover:text-white'}"
          onclick={() => (activeTab = 'wing_room')}
        >
          <span>👥</span>
          <span>WING SESSION ROOM ({Object.keys(session.commanders).length})</span>
        </button>
      </nav>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 font-mono text-xs">
        
        <!-- TAB 1: Shared Delivery Checklist & Real-Time Progress Bars (Req 2 & 3) -->
        {#if activeTab === 'checklist'}
          <div class="flex flex-col space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--hud-orange)]/25">
              <div>
                <h3 class="text-sm font-bold text-[var(--hud-orange)]">
                  SHARED COLONISATION DELIVERY CHECKLIST
                </h3>
                <p class="text-[11px] text-[var(--hud-orange)]/70">
                  Target Blueprint: {liveBom.assetName} | Multi-user synchronized delivery progress with real-time shortfalls.
                </p>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold transition-all"
                  onclick={() => {
                    claimCommodityId = liveBom.commodities[0]?.commodityId || 'titanium';
                    isClaimModalOpen = true;
                  }}
                >
                  + CLAIM ALLOCATION
                </button>
                {#if onOpenBomManifest}
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold transition-all"
                    onclick={() => onOpenBomManifest(session.targetAssetKey)}
                  >
                    FULL BOM DETAILS
                  </button>
                {/if}
              </div>
            </div>

            <!-- Stage-by-Stage Breakdown with Real-Time Progress Bars -->
            <div class="flex flex-col space-y-6">
              {#each liveBom.stages as stg}
                <div class="rounded border border-[var(--hud-orange)]/30 bg-black/40 overflow-hidden">
                  <!-- Stage Header -->
                  <div class="px-4 py-2.5 bg-[#0a1020] border-b border-[var(--hud-orange)]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div class="flex items-center space-x-2">
                      <span class="w-5 h-5 rounded-full bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40 flex items-center justify-center font-bold text-[11px]">
                        {stg.stageNumber}
                      </span>
                      <span class="font-bold text-white text-xs">{stg.stageName}</span>
                      {#if stg.isStageComplete}
                        <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                          COMPLETE ✓
                        </span>
                      {/if}
                    </div>
                    <div class="flex items-center space-x-3 text-[11px]">
                      <span class="text-[var(--hud-orange)]/70">
                        {formatNumber(stg.deliveredTonnage)} / {formatNumber(stg.totalTonnage)} t
                      </span>
                      <span class="text-[var(--hud-amber)] font-bold">
                        {stg.percentCompleted.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <!-- Stage Progress Line -->
                  <div class="w-full h-1.5 bg-black/70">
                    <div
                      class="h-full bg-gradient-to-r from-[var(--hud-orange)] to-emerald-400 transition-all duration-300"
                      style="width: {stg.percentCompleted}%"
                    ></div>
                  </div>

                  <!-- Commodity Checklist Table -->
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-black/60 text-[var(--hud-orange)]/70 border-b border-[var(--hud-orange)]/15">
                        <tr>
                          <th class="py-2 px-3">Commodity</th>
                          <th class="py-2 px-3">Category</th>
                          <th class="py-2 px-3 text-right">Required</th>
                          <th class="py-2 px-3 text-right">Delivered</th>
                          <th class="py-2 px-3 text-right">Shortfall</th>
                          <th class="py-2 px-3">Progress</th>
                          <th class="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-[var(--hud-orange)]/10">
                        {#each stg.requirements as req}
                          {@const aggregate = liveBom.commodities.find((c) => c.commodityId === req.commodityId)}
                          {@const deliveredVal = aggregate ? aggregate.deliveredTonnage : req.delivered}
                          {@const shortfallVal = aggregate ? aggregate.remainingTonnage : req.remaining}
                          {@const pctVal = aggregate ? aggregate.percentCompleted : req.percentCompleted}
                          {@const isDone = shortfallVal <= 0}

                          <tr class="hover:bg-[var(--hud-orange)]/5 transition-colors">
                            <td class="py-2 px-3 font-bold text-white flex items-center space-x-2">
                              {#if isDone}
                                <span class="text-emerald-400">✓</span>
                              {:else}
                                <span class="text-[var(--hud-orange)]/50">○</span>
                              {/if}
                              <span>{req.name}</span>
                            </td>
                            <td class="py-2 px-3 text-[var(--hud-orange)]/70">{req.category}</td>
                            <td class="py-2 px-3 text-right text-white font-mono">{formatNumber(req.requiredTonnage)} t</td>
                            <td class="py-2 px-3 text-right font-mono {isDone ? 'text-emerald-400 font-bold' : 'text-white'}">
                              {formatNumber(deliveredVal)} t
                            </td>
                            <td class="py-2 px-3 text-right font-mono {shortfallVal > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}">
                              {formatNumber(shortfallVal)} t
                            </td>
                            <td class="py-2 px-3 w-48">
                              <div class="flex items-center space-x-2">
                                <div class="flex-1 h-2 bg-black/70 rounded border border-[var(--hud-orange)]/30 overflow-hidden">
                                  <div
                                    class="h-full transition-all duration-300 {isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[var(--hud-orange)] to-[var(--hud-amber)]'}"
                                    style="width: {pctVal}%"
                                  ></div>
                                </div>
                                <span class="text-[10px] w-10 text-right font-bold {isDone ? 'text-emerald-400' : 'text-[var(--hud-amber)]'}">
                                  {pctVal.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td class="py-2 px-3 text-right">
                              <div class="flex items-center justify-end space-x-1.5">
                                {#if !isDone}
                                  <button
                                    type="button"
                                    class="px-2 py-0.5 text-[11px] rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold transition-all"
                                    onclick={() => aggregate && handleQuickClaim(aggregate)}
                                    title="Claim hauling allocation for {req.name}"
                                  >
                                    CLAIM
                                  </button>
                                  <button
                                    type="button"
                                    class="px-2 py-0.5 text-[11px] rounded bg-[var(--hud-orange)]/25 hover:bg-[var(--hud-orange)] border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] hover:text-black font-bold transition-all"
                                    onclick={() => aggregate && handleQuickDeliver(aggregate)}
                                    title="Log delivery of {req.name}"
                                  >
                                    DROP
                                  </button>
                                {:else}
                                  <span class="text-emerald-400 text-[10px] font-bold">FULFILLED</span>
                                {/if}
                              </div>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- TAB 2: CMDR Hauling Allocations & Claims (Req 2) -->
        {#if activeTab === 'claims'}
          <div class="flex flex-col space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--hud-orange)]/25">
              <div>
                <h3 class="text-sm font-bold text-[var(--hud-orange)]">
                  ACTIVE CMDR HAULING CLAIMS & ALLOCATIONS
                </h3>
                <p class="text-[11px] text-[var(--hud-orange)]/70">
                  Wing commanders claim quotas to prevent double-purchasing and coordinate transport pipelines.
                </p>
              </div>
              <button
                type="button"
                class="px-3 py-1 text-xs rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/80 text-black font-bold transition-all shadow"
                onclick={() => (isClaimModalOpen = true)}
              >
                + NEW HAULING CLAIM
              </button>
            </div>

            {#if session.claims.length === 0}
              <div class="p-8 text-center border border-dashed border-[var(--hud-orange)]/30 rounded bg-black/20">
                <p class="text-[var(--hud-orange)]/60 text-sm">No hauling claims registered in this wing session.</p>
                <button
                  type="button"
                  class="mt-3 px-3 py-1.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] font-bold text-xs"
                  onclick={() => (isClaimModalOpen = true)}
                >
                  Claim First Commodity Run
                </button>
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each session.claims as claim}
                  {@const cmdr = session.commanders[claim.cmdrId]}
                  <div class="p-3 rounded border border-[var(--hud-orange)]/30 bg-black/40 flex flex-col justify-between space-y-3">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="w-2.5 h-2.5 rounded-full" style="background-color: {cmdr?.colorHex || '#f59e0b'}"></span>
                          <span class="font-bold text-white text-xs">{claim.cmdrName}</span>
                        </div>
                        <span class="text-[10px] text-[var(--hud-orange)]/70 font-mono block mt-0.5">
                          {cmdr?.shipModel || 'Cargo Ship'} | Claimed {formatTimeAgo(claim.claimedAt)}
                        </span>
                      </div>
                      
                      <!-- Claim Status Badge -->
                      {#if claim.status === 'completed'}
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                          DELIVERED
                        </span>
                      {:else if claim.status === 'in_transit'}
                        <span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 text-[10px] font-bold animate-pulse">
                          IN TRANSIT
                        </span>
                      {:else}
                        <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                          ACTIVE CLAIM
                        </span>
                      {/if}
                    </div>

                    <!-- Quota Details -->
                    <div class="p-2 rounded bg-[#090e1a] border border-[var(--hud-orange)]/20 flex items-center justify-between">
                      <div>
                        <span class="text-[10px] text-[var(--hud-orange)]/70 block">COMMODITY</span>
                        <span class="font-bold text-white text-xs">{claim.commodityName}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-[10px] text-[var(--hud-orange)]/70 block">ALLOCATION</span>
                        <span class="font-bold text-[var(--hud-amber)] text-xs">{formatNumber(claim.allocatedTonnage)} t</span>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center justify-between pt-1 border-t border-[var(--hud-orange)]/15 text-[11px]">
                      <button
                        type="button"
                        class="text-red-400 hover:text-red-300 transition-colors"
                        onclick={() => wingLogisticsEngine.removeClaim(claim.id)}
                      >
                        Abandon
                      </button>

                      <div class="flex items-center space-x-1.5">
                        {#if claim.status === 'active'}
                          <button
                            type="button"
                            class="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold"
                            onclick={() => wingLogisticsEngine.updateClaimStatus(claim.id, 'in_transit')}
                          >
                            Mark In Transit
                          </button>
                        {/if}
                        {#if claim.status !== 'completed'}
                          <button
                            type="button"
                            class="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold"
                            onclick={() => {
                              deliverCommodityId = claim.commodityId;
                              deliverTonnage = claim.allocatedTonnage;
                              deliverNote = `Fulfilled allocation by ${claim.cmdrName}`;
                              isDeliveryModalOpen = true;
                            }}
                          >
                            Log Delivery
                          </button>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- TAB 3: Delivery Audit History (Req 4) -->
        {#if activeTab === 'audit'}
          <div class="flex flex-col space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--hud-orange)]/25">
              <div>
                <h3 class="text-sm font-bold text-[var(--hud-orange)]">
                  DELIVERY AUDIT TRAIL // REAL-TIME LOG
                </h3>
                <p class="text-[11px] text-[var(--hud-orange)]/70">
                  Chronological tamper-evident audit record showing timestamp, CMDR name, tonnage delivered, and remaining shortfall.
                </p>
              </div>
              <span class="text-[11px] text-[var(--hud-amber)] font-bold">
                {session.auditLog.length} Records Ingested
              </span>
            </div>

            <div class="rounded border border-[var(--hud-orange)]/30 bg-black/40 overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-black/60 text-[var(--hud-orange)]/70 border-b border-[var(--hud-orange)]/20">
                  <tr>
                    <th class="py-2.5 px-3">Timestamp</th>
                    <th class="py-2.5 px-3">CMDR Name</th>
                    <th class="py-2.5 px-3">Commodity</th>
                    <th class="py-2.5 px-3 text-right">Tonnage Delivered</th>
                    <th class="py-2.5 px-3 text-right">Prev Shortfall</th>
                    <th class="py-2.5 px-3 text-right">Remaining Shortfall</th>
                    <th class="py-2.5 px-3">Notes & Target</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--hud-orange)]/10 font-mono">
                  {#each session.auditLog as log}
                    {@const cmdr = session.commanders[log.cmdrId]}
                    <tr class="hover:bg-[var(--hud-orange)]/5 transition-colors">
                      <td class="py-2 px-3 text-[var(--hud-orange)]/70 whitespace-nowrap">
                        <span class="text-white font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span class="text-[10px] text-[var(--hud-orange)]/50 block">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </td>
                      <td class="py-2 px-3 whitespace-nowrap">
                        <div class="flex items-center space-x-1.5">
                          <span class="w-2 h-2 rounded-full" style="background-color: {cmdr?.colorHex || '#f59e0b'}"></span>
                          <span class="text-white font-bold">{log.cmdrName}</span>
                        </div>
                      </td>
                      <td class="py-2 px-3 text-white font-bold whitespace-nowrap">
                        {log.commodityName}
                      </td>
                      <td class="py-2 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                        +{formatNumber(log.tonnageDelivered)} t
                      </td>
                      <td class="py-2 px-3 text-right text-[var(--hud-orange)]/70 whitespace-nowrap">
                        {formatNumber(log.previousShortfall)} t
                      </td>
                      <td class="py-2 px-3 text-right text-amber-400 font-bold whitespace-nowrap">
                        {formatNumber(log.remainingShortfall)} t
                      </td>
                      <td class="py-2 px-3 text-[var(--hud-orange)]/80 text-[11px]">
                        <span>{log.note || `${log.siteName} [${log.systemName}]`}</span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        <!-- TAB 4: Wing Session Room & Multi-User WebSocket Network (Req 1) -->
        {#if activeTab === 'wing_room'}
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- Left 2 Cols: Session Network & Configuration -->
            <div class="lg:col-span-2 flex flex-col space-y-4">
              <div class="pb-2 border-b border-[var(--hud-orange)]/25">
                <h3 class="text-sm font-bold text-[var(--hud-orange)]">
                  WING MULTI-USER COLLABORATION ROOM
                </h3>
                <p class="text-[11px] text-[var(--hud-orange)]/70">
                  Connect via WebSocket broadcast mesh or browser BroadcastChannel to collaborate in real-time.
                </p>
              </div>

              <!-- Connection Control Card -->
              <div class="p-4 rounded border border-[var(--hud-orange)]/30 bg-black/40 flex flex-col space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white text-xs">SYNCHRONIZATION STATUS</span>
                  {#if session.connectionStatus === 'connected'}
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                      ACTIVE WEBSOCKET
                    </span>
                  {:else if session.connectionStatus === 'simulated'}
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                      PEER BROADCAST SIMULATOR
                    </span>
                  {:else}
                    <span class="px-2 py-0.5 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/40 text-xs font-bold">
                      LOCAL ISOLATED
                    </span>
                  {/if}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label for="wing-ws-url-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">EDILL / WEBSOCKET ENDPOINT</label>
                    <input
                      id="wing-ws-url-input"
                      type="text"
                      bind:value={customWsUrl}
                      class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="wing-session-id-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">SESSION ROOM IDENTIFIER</label>
                    <input
                      id="wing-session-id-input"
                      type="text"
                      bind:value={session.sessionId}
                      class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:border-[var(--hud-orange)] focus:outline-none"
                      disabled
                    />
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/80 text-black font-bold text-xs transition-colors"
                    onclick={() => wingLogisticsEngine.connectWebSocket(customWsUrl)}
                  >
                    CONNECT WEBSOCKET
                  </button>

                  <button
                    type="button"
                    class="px-3 py-1.5 rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] hover:bg-[var(--hud-orange)]/15 font-bold text-xs transition-colors"
                    onclick={() => wingLogisticsEngine.toggleSimulation()}
                  >
                    {session.simulatedBroadcastMode ? 'DISABLE SIMULATION' : 'ENABLE SIMULATION'}
                  </button>

                  <button
                    type="button"
                    class="px-3 py-1.5 rounded border border-red-500/40 hover:border-red-500 text-red-400 hover:bg-red-500/15 font-bold text-xs transition-colors ml-auto"
                    onclick={() => {
                      if (confirm('Reset wing session progress back to default demo state?')) {
                        wingLogisticsEngine.resetSession();
                        showStatus('Wing session reset to initial state.');
                      }
                    }}
                  >
                    RESET SESSION
                  </button>
                </div>
              </div>

              <!-- Colonisation Target Selector -->
              <div class="p-4 rounded border border-[var(--hud-orange)]/30 bg-black/40 flex flex-col space-y-3">
                <span class="font-bold text-white text-xs">BLUEPRINT PROJECT TARGET</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label for="wing-target-asset-select" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">TARGET BLUEPRINT</label>
                    <select
                      id="wing-target-asset-select"
                      class="w-full px-2 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
                      value={session.targetAssetKey}
                      onchange={(e) => {
                        const target = e.currentTarget.value as AssetRecipeKey;
                        wingLogisticsEngine.setTargetAsset(target);
                      }}
                    >
                      {#each Object.entries(ASSET_CONSTRUCTION_RECIPES) as [key, recipe]}
                        <option value={key}>{recipe.assetName}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label for="wing-site-name-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">CONSTRUCTION SITE NAME</label>
                    <input
                      id="wing-site-name-input"
                      type="text"
                      bind:value={session.siteName}
                      onblur={() => wingLogisticsEngine.setTargetAsset(session.targetAssetKey, session.siteName, session.systemName)}
                      class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="wing-system-name-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">STAR SYSTEM</label>
                    <input
                      id="wing-system-name-input"
                      type="text"
                      bind:value={session.systemName}
                      onblur={() => wingLogisticsEngine.setTargetAsset(session.targetAssetKey, session.siteName, session.systemName)}
                      class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Col: Active Wing Roster -->
            <div class="flex flex-col space-y-3">
              <div class="pb-2 border-b border-[var(--hud-orange)]/25 flex items-center justify-between">
                <h3 class="text-sm font-bold text-[var(--hud-orange)]">
                  WING CMDR ROSTER
                </h3>
                <span class="text-[10px] text-emerald-400 font-bold">
                  {Object.values(session.commanders).length} ONLINE
                </span>
              </div>

              <div class="flex flex-col space-y-2">
                {#each Object.values(session.commanders) as cmdr}
                  {@const cmdrClaims = session.claims.filter((c) => c.cmdrId === cmdr.id)}
                  {@const cmdrDeliveries = session.auditLog.filter((a) => a.cmdrId === cmdr.id)}
                  {@const totalDelivered = cmdrDeliveries.reduce((acc, d) => acc + d.tonnageDelivered, 0)}

                  <div class="p-3 rounded border border-[var(--hud-orange)]/25 bg-black/40 flex flex-col space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: {cmdr.colorHex}"></span>
                        <span class="font-bold text-white text-xs">{cmdr.name}</span>
                      </div>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        ACTIVE
                      </span>
                    </div>

                    <div class="text-[10px] text-[var(--hud-orange)]/70 flex items-center justify-between">
                      <span>{cmdr.shipModel} ({cmdr.cargoCapacityTons}t)</span>
                      <span>{cmdr.currentSystem}</span>
                    </div>

                    <div class="pt-1.5 border-t border-[var(--hud-orange)]/15 flex items-center justify-between text-[11px]">
                      <span class="text-[var(--hud-orange)]/60">Delivered:</span>
                      <span class="text-emerald-400 font-bold">{formatNumber(totalDelivered)} t</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

      </div>

      <!-- Footer Bar -->
      <footer class="px-5 py-2.5 border-t border-[var(--hud-orange)]/30 bg-[#080d1a] flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div class="flex items-center space-x-3">
          <span class="text-[var(--hud-orange)]/70">
            Active Identity: <span class="text-white font-bold">{currentCmdrName}</span> ({currentCmdrShip})
          </span>
        </div>
        <div class="flex items-center space-x-2">
          {#if onOpenHaulingAssistant}
            <button
              type="button"
              class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] font-bold transition-all text-xs"
              onclick={() => onOpenHaulingAssistant(session.targetAssetKey)}
            >
              🚛 HAULING RUN CALCULATOR
            </button>
          {/if}
          <button
            type="button"
            class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] hover:text-black font-bold transition-all text-xs"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
          >
            CLOSE PANEL
          </button>
        </div>
      </footer>
    </div>
  </div>

  <!-- POPUP MODAL: Log Delivery -->
  {#if isDeliveryModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="w-full max-w-md bg-[#0a0f1e] border border-[var(--hud-orange)] rounded shadow-2xl p-5 font-mono text-xs flex flex-col space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--hud-orange)]/30">
          <h4 class="font-bold text-white text-sm flex items-center space-x-2">
            <span>📦</span>
            <span>LOG COMPLETED COMMODITY DELIVERY</span>
          </h4>
          <button type="button" class="text-[var(--hud-orange)] hover:text-white" onclick={() => (isDeliveryModalOpen = false)}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div>
          <label for="deliver-commodity-select" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">SELECT COMMODITY</label>
          <select
            id="deliver-commodity-select"
            bind:value={deliverCommodityId}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          >
            {#each liveBom.commodities as com}
              <option value={com.commodityId}>
                {com.name} ({com.category}) - Shortfall: {formatNumber(com.remainingTonnage)}t
              </option>
            {/each}
          </select>
        </div>

        <div>
          <label for="deliver-tonnage-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">TONNAGE DELIVERED (METRIC TONS)</label>
          <input
            id="deliver-tonnage-input"
            type="number"
            min="1"
            max="10000"
            bind:value={deliverTonnage}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          />
        </div>

        <div>
          <label for="deliver-cmdr-name-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">HAULING CMDR</label>
          <input
            id="deliver-cmdr-name-input"
            type="text"
            bind:value={currentCmdrName}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          />
        </div>

        <div>
          <label for="deliver-audit-notes-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">AUDIT NOTES / SITE (OPTIONAL)</label>
          <input
            id="deliver-audit-notes-input"
            type="text"
            bind:value={deliverNote}
            placeholder="e.g. Surface pad delivery via Cutter"
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          />
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--hud-orange)]/25">
          <button
            type="button"
            class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 font-bold"
            onclick={() => (isDeliveryModalOpen = false)}
          >
            CANCEL
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/80 text-black font-bold shadow"
            onclick={handleLogDelivery}
            disabled={deliverTonnage <= 0}
          >
            CONFIRM & BROADCAST
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- POPUP MODAL: Claim Hauling Allocation -->
  {#if isClaimModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="w-full max-w-md bg-[#0a0f1e] border border-[var(--hud-orange)] rounded shadow-2xl p-5 font-mono text-xs flex flex-col space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--hud-orange)]/30">
          <h4 class="font-bold text-white text-sm flex items-center space-x-2">
            <span>🎯</span>
            <span>CLAIM HAULING ALLOCATION</span>
          </h4>
          <button type="button" class="text-[var(--hud-orange)] hover:text-white" onclick={() => (isClaimModalOpen = false)}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div>
          <label for="claim-commodity-select" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">SELECT COMMODITY TO HAUL</label>
          <select
            id="claim-commodity-select"
            bind:value={claimCommodityId}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          >
            {#each liveBom.commodities as com}
              <option value={com.commodityId}>
                {com.name} - Remaining Shortfall: {formatNumber(com.remainingTonnage)}t
              </option>
            {/each}
          </select>
        </div>

        <div>
          <label for="claim-tonnage-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">PLANNED HAULING TONNAGE</label>
          <input
            id="claim-tonnage-input"
            type="number"
            min="1"
            max="10000"
            bind:value={claimTonnage}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          />
        </div>

        <div>
          <label for="claim-cmdr-name-input" class="text-[10px] text-[var(--hud-orange)]/70 block mb-1">CMDR NAME</label>
          <input
            id="claim-cmdr-name-input"
            type="text"
            bind:value={currentCmdrName}
            class="w-full px-2.5 py-1.5 rounded bg-black/80 border border-[var(--hud-orange)]/40 text-white font-mono text-xs focus:outline-none"
          />
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--hud-orange)]/25">
          <button
            type="button"
            class="px-3 py-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 font-bold"
            onclick={() => (isClaimModalOpen = false)}
          >
            CANCEL
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/80 text-black font-bold shadow"
            onclick={handleCreateClaim}
            disabled={claimTonnage <= 0}
          >
            CLAIM ALLOCATION
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
