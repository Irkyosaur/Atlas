<script lang="ts">
  // Location: atlas/client/src/lib/components/underworld/InterstellarFactorsLocator.svelte
  // Interstellar Factors Locator & Anti-Local Faction Safety Guard (Phase 13, Stage 13.3)
  // Compliant with Cobra HUD design system, Svelte 5 runes, passive telemetry, and FDF EULA.

  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type LandingPadSize,
    type SuperpowerAllegiance,
    type InterstellarFactorStation,
    type BountyOrFineRecord,
    type InterstellarFactorSafetyReport,
    type SettlementFeeCalculation,
    calculateSettlementFee,
    filterInterstellarFactors,
    interstellarFactorsEngine,
    NOTORIETY_DECAY_INTERVAL_SECONDS,
  } from '$engine/interstellar_factors_engine';
  import { ananke } from '$engine/ananke_client';

  interface Props {
    isOpen: boolean;
    referenceSystem?: string;
    onClose: () => void;
    onPlotRoute?: (systemName: string) => void;
  }

  let {
    isOpen = $bindable(false),
    referenceSystem = 'Deciat',
    onClose,
    onPlotRoute,
  }: Props = $props();

  // Active view tab
  let activeTab = $state<'factors' | 'crimes' | 'notoriety'>('factors');

  // Query and filters
  let querySystem = $state<string>(referenceSystem);
  let selectedPadSize = $state<'ANY' | LandingPadSize>('ANY');
  let selectedSecurity = $state<'ALL' | 'Anarchy' | 'Low' | 'Medium' | 'High'>('ALL');
  let maxArrivalDistanceLs = $state<number>(2000);
  let maxDistanceLy = $state<number>(150);
  let showOnlySafeFactors = $state<boolean>(true);
  let searchQuery = $state<string>('');

  // Engine state subscriptions
  let bountiesAndFines = $state<BountyOrFineRecord[]>(interstellarFactorsEngine.getBountiesAndFines());
  let notorietyState = $state(interstellarFactorsEngine.getNotorietyState());

  // Stations from Ananke / fallback
  let isLoadingFactors = $state<boolean>(false);
  let rawFactorsList = $state<InterstellarFactorStation[]>([]);

  // Form for adding custom bounty/fine
  let newCrimeType = $state<'Bounty' | 'Fine'>('Bounty');
  let newCrimeAmount = $state<number>(50000);
  let newCrimeFaction = $state<string>('');
  let newCrimeAllegiance = $state<SuperpowerAllegiance>('Federation');
  let newCrimeReason = $state<string>('');

  // Surcharge and fees calculation
  let settlementFee = $derived<SettlementFeeCalculation>(calculateSettlementFee(bountiesAndFines));

  // Filtered and evaluated factors
  let evaluatedFactors = $derived.by(() => {
    const list = filterInterstellarFactors(rawFactorsList, {
      referenceCoords: { x: 0, y: 0, z: 0 },
      bountiesAndFines,
      maxDistanceLy,
      maxArrivalLs: maxArrivalDistanceLs,
      minPadSize: selectedPadSize,
      securityFilter: selectedSecurity,
    });

    let filtered = list;
    if (showOnlySafeFactors) {
      filtered = filtered.filter((f) => f.safety.isSafe);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (f) =>
          f.systemName.toLowerCase().includes(q) ||
          f.stationName.toLowerCase().includes(q) ||
          f.controllingFaction.toLowerCase().includes(q)
      );
    }
    return filtered;
  });

  // Safe vs Blocked count summary
  let safeCount = $derived<number>(evaluatedFactors.filter((f) => f.safety.isSafe).length);
  let blockedCount = $derived<number>(evaluatedFactors.filter((f) => !f.safety.isSafe).length);

  // Notoriety countdown formatting
  let flightSecondsRemaining = $derived<number>(
    Math.max(0, NOTORIETY_DECAY_INTERVAL_SECONDS - notorietyState.flightSecondsElapsed)
  );
  let hoursRemaining = $derived<number>(Math.floor(flightSecondsRemaining / 3600));
  let minutesRemaining = $derived<number>(Math.floor((flightSecondsRemaining % 3600) / 60));
  let secondsRemaining = $derived<number>(flightSecondsRemaining % 60);

  // Progress percentage to next point decay
  let decayProgressPct = $derived<number>(
    Math.min(100, Math.round((notorietyState.flightSecondsElapsed / NOTORIETY_DECAY_INTERVAL_SECONDS) * 100))
  );

  onMount(() => {
    querySystem = referenceSystem;
    loadFactors();

    const unsub = interstellarFactorsEngine.subscribe(() => {
      bountiesAndFines = interstellarFactorsEngine.getBountiesAndFines();
      notorietyState = interstellarFactorsEngine.getNotorietyState();
    });

    return () => {
      unsub();
    };
  });

  async function loadFactors() {
    isLoadingFactors = true;
    try {
      rawFactorsList = await ananke.getInterstellarFactors(querySystem);
    } finally {
      isLoadingFactors = false;
    }
  }

  function handleAddCrime() {
    if (!newCrimeFaction.trim() || newCrimeAmount <= 0) return;
    interstellarFactorsEngine.addBountyOrFine({
      type: newCrimeType,
      amount: newCrimeAmount,
      issuingFaction: newCrimeFaction.trim(),
      superpowerAllegiance: newCrimeAllegiance,
      victimOrReason: newCrimeReason.trim() || 'Unspecified Jurisdiction Infraction',
    });
    newCrimeFaction = '';
    newCrimeReason = '';
    newCrimeAmount = 50000;
  }

  function handleRemoveCrime(id: string) {
    interstellarFactorsEngine.removeBountyOrFine(id);
  }

  function handleClearAllCrimes() {
    interstellarFactorsEngine.clearAllBountiesAndFines();
  }

  function handleResetCrimes() {
    interstellarFactorsEngine.resetToDefaultMockCrimes();
  }

  function handleIncrementNotoriety() {
    interstellarFactorsEngine.setNotoriety(Math.min(10, notorietyState.notoriety + 1));
  }

  function handleDecrementNotoriety() {
    interstellarFactorsEngine.setNotoriety(Math.max(0, notorietyState.notoriety - 1));
  }

  function handleToggleTimer() {
    interstellarFactorsEngine.toggleFlightTimer();
  }

  function formatCredits(cr: number): string {
    return cr.toLocaleString() + ' CR';
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0b0c10] border border-[#FF7100]/60 rounded-lg shadow-[0_0_30px_rgba(255,113,0,0.3)] text-stone-200 font-mono overflow-hidden select-none"
    >
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between px-4 py-3 bg-[#15171e] border-b border-[#FF7100]/40">
        <div class="flex items-center space-x-3">
          <div class="p-1.5 rounded bg-[#FF7100]/20 border border-[#FF7100]/60 text-[#FF7100]">
            <span class="text-lg">⚖️</span>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-base font-bold text-amber-400 tracking-wider">
                INTERSTELLAR FACTORS LOCATOR
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-400 border border-red-500/50 font-bold uppercase">
                ANTI-LOCAL FACTION GUARD ACTIVE
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
                STAGE 13.3
              </span>
            </div>
            <p class="text-[11px] text-stone-400">
              Clear outstanding bounties and fines safely without authority arrest, detention ship transport, or jurisdiction lock.
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Notoriety Badge in Header -->
          <div
            class="flex items-center space-x-1.5 px-2.5 py-1 rounded border {notorietyState.notoriety > 0
              ? 'bg-red-950/60 border-red-500/60 text-red-400 animate-pulse'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'}"
            title="Current Commander Notoriety Rating (0-10). Notoriety prevents Interstellar Factor access until decayed."
          >
            <span class="text-xs">☠️ NOTORIETY:</span>
            <span class="text-sm font-bold">{notorietyState.notoriety}</span>
          </div>

          <!-- Outstanding Surcharge Badge -->
          <div class="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded bg-[#FF7100]/15 border border-[#FF7100]/40 text-[#FF7100] text-xs">
            <span>DUE:</span>
            <span class="font-bold">{formatCredits(settlementFee.totalAmountPayable)}</span>
            <span class="text-[10px] text-stone-400">(+25% Fee)</span>
          </div>

          <button
            type="button"
            onclick={onClose}
            class="px-2.5 py-1 rounded bg-stone-800/80 hover:bg-stone-700 border border-stone-600 text-stone-300 text-xs transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center px-4 py-2 bg-[#101217] border-b border-stone-800 space-x-2 text-xs">
        <button
          type="button"
          onclick={() => (activeTab = 'factors')}
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'factors'
            ? 'bg-[#FF7100] text-black font-bold shadow-[0_0_12px_rgba(255,113,0,0.6)]'
            : 'text-stone-400 hover:text-white hover:bg-white/5 border border-transparent'}"
        >
          <span>🛰️ NEAREST FACTORS</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] {activeTab === 'factors' ? 'bg-black/30 text-black' : 'bg-stone-800 text-stone-300'}">
            {evaluatedFactors.length}
          </span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'crimes')}
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'crimes'
            ? 'bg-[#FF7100] text-black font-bold shadow-[0_0_12px_rgba(255,113,0,0.6)]'
            : 'text-stone-400 hover:text-white hover:bg-white/5 border border-transparent'}"
        >
          <span>📋 BOUNTIES & FINES</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] {activeTab === 'crimes' ? 'bg-black/30 text-black' : 'bg-stone-800 text-stone-300'}">
            {bountiesAndFines.length}
          </span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'notoriety')}
          class="flex items-center space-x-2 px-3 py-1.5 rounded transition-all {activeTab === 'notoriety'
            ? 'bg-[#FF7100] text-black font-bold shadow-[0_0_12px_rgba(255,113,0,0.6)]'
            : 'text-stone-400 hover:text-white hover:bg-white/5 border border-transparent'}"
        >
          <span>⏳ NOTORIETY DECAY TIMER</span>
          {#if notorietyState.notoriety > 0}
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-red-500 text-black font-bold">
              {notorietyState.notoriety} PTS
            </span>
          {/if}
        </button>
      </div>

      <!-- Main Body Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- ================= TAB 1: FACTORS LOCATOR ================= -->
        {#if activeTab === 'factors'}
          <!-- Filter Controls Bar -->
          <div class="p-3 rounded bg-[#13151b] border border-stone-800 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <!-- Reference System -->
            <div class="space-y-1">
              <label for="filter-query-system" class="text-stone-400 text-[10px] font-bold uppercase">Reference System:</label>
              <div class="flex items-center space-x-1">
                <input
                  id="filter-query-system"
                  type="text"
                  bind:value={querySystem}
                  placeholder="e.g. Deciat, Sol..."
                  class="w-full px-2 py-1 bg-black/60 border border-stone-700 rounded text-amber-300 focus:outline-none focus:border-[#FF7100]"
                />
                <button
                  type="button"
                  onclick={loadFactors}
                  class="px-2 py-1 bg-[#FF7100]/20 hover:bg-[#FF7100]/30 border border-[#FF7100]/50 text-[#FF7100] rounded font-bold"
                  title="Search from this system"
                >
                  GO
                </button>
              </div>
            </div>

            <!-- Min Landing Pad -->
            <div class="space-y-1">
              <label for="filter-pad-size" class="text-stone-400 text-[10px] font-bold uppercase">Landing Pad:</label>
              <select
                id="filter-pad-size"
                bind:value={selectedPadSize}
                class="w-full px-2 py-1 bg-black/60 border border-stone-700 rounded text-stone-200 focus:outline-none focus:border-[#FF7100]"
              >
                <option value="ANY">Any Pad Size (M & L)</option>
                <option value="L">Large (L) Pad Only</option>
              </select>
            </div>

            <!-- System Security Filter -->
            <div class="space-y-1">
              <label for="filter-security" class="text-stone-400 text-[10px] font-bold uppercase">System Security:</label>
              <select
                id="filter-security"
                bind:value={selectedSecurity}
                class="w-full px-2 py-1 bg-black/60 border border-stone-700 rounded text-stone-200 focus:outline-none focus:border-[#FF7100]"
              >
                <option value="ALL">All Security Ratings</option>
                <option value="Anarchy">Anarchy Havens Only</option>
                <option value="Low">Low Security Only</option>
                <option value="Medium">Medium Security</option>
                <option value="High">High Security</option>
              </select>
            </div>

            <!-- Max Arrival Distance (Ls) -->
            <div class="space-y-1">
              <label for="filter-arrival-ls" class="text-stone-400 text-[10px] font-bold uppercase">Max Arrival (Ls):</label>
              <input
                id="filter-arrival-ls"
                type="number"
                bind:value={maxArrivalDistanceLs}
                step="500"
                min="100"
                max="500000"
                class="w-full px-2 py-1 bg-black/60 border border-stone-700 rounded text-stone-200 focus:outline-none focus:border-[#FF7100]"
              />
            </div>

            <!-- Search / Text Filter -->
            <div class="space-y-1">
              <label for="filter-station-search" class="text-stone-400 text-[10px] font-bold uppercase">Search Station / Faction:</label>
              <input
                id="filter-station-search"
                type="text"
                bind:value={searchQuery}
                placeholder="Filter by name..."
                class="w-full px-2 py-1 bg-black/60 border border-stone-700 rounded text-stone-200 focus:outline-none focus:border-[#FF7100]"
              />
            </div>
          </div>

          <!-- Safety Guard Warning Banner & Safe Toggle -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-black/40 border border-stone-800 gap-3">
            <div class="flex items-center space-x-3">
              <label class="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={showOnlySafeFactors}
                  class="rounded bg-black border-stone-700 text-[#FF7100] focus:ring-0"
                />
                <span class="text-xs font-bold text-amber-300">
                  HIDE DANGEROUS / ARREST RISKS ONLY ({safeCount} Safe / {blockedCount} Blocked)
                </span>
              </label>
            </div>

            <div class="text-[11px] text-stone-400 flex items-center space-x-4">
              <span class="flex items-center space-x-1">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Safe to Dock</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>Arrest Risk (Issuing Faction Present)</span>
              </span>
            </div>
          </div>

          <!-- Factor Station Cards Grid -->
          {#if isLoadingFactors}
            <div class="p-12 text-center text-amber-400 space-y-2">
              <div class="inline-block animate-spin text-2xl">⏳</div>
              <p class="text-sm">Triangulating Interstellar Factors & cross-referencing faction presence...</p>
            </div>
          {:else if evaluatedFactors.length === 0}
            <div class="p-12 text-center text-stone-400 space-y-3 bg-[#13151b] rounded border border-stone-800">
              <p class="text-sm font-bold text-amber-400">NO INTERSTELLAR FACTORS MATCHING CURRENT CRITERIA</p>
              <p class="text-xs text-stone-500">
                Try disabling "Hide Dangerous", increasing arrival distance, or clearing specific local bounties.
              </p>
            </div>
          {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {#each evaluatedFactors as factor (factor.id)}
                <div
                  class="p-3.5 rounded border transition-all flex flex-col justify-between {factor.safety.isSafe
                    ? 'bg-[#12141a] border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-red-950/20 border-red-500/50 hover:border-red-400'}"
                >
                  <!-- Card Header -->
                  <div>
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-bold text-white tracking-wide">{factor.stationName}</span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold {factor.landingPad === 'L' ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' : 'bg-stone-800 text-stone-300'}">
                            PAD {factor.landingPad}
                          </span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] {factor.systemSecurity === 'Anarchy' ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 font-bold' : 'bg-stone-800 text-stone-400'}">
                            {factor.systemSecurity.toUpperCase()}
                          </span>
                        </div>
                        <div class="text-xs text-amber-400 mt-0.5 flex items-center space-x-2">
                          <span>🌌 {factor.systemName}</span>
                          <span class="text-stone-500">({factor.distanceLy ?? 0} LY)</span>
                          <span class="text-stone-500">•</span>
                          <span class="text-stone-400">{factor.distanceLs.toLocaleString()} Ls</span>
                        </div>
                      </div>

                      <!-- Safety Pill -->
                      <div>
                        {#if factor.safety.isSafe}
                          <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 font-bold">
                            ✓ SAFE FACTOR
                          </span>
                        {:else}
                          <span class="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-500 font-bold animate-pulse">
                            ⚠️ ARREST RISK
                          </span>
                        {/if}
                      </div>
                    </div>

                    <!-- Controlling Faction & Allegiance -->
                    <div class="mt-2 text-[11px] text-stone-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Authority: <strong class="text-stone-200">{factor.controllingFaction}</strong></span>
                      <span>Allegiance: <strong class="text-cyan-400">{factor.allegiance}</strong></span>
                      <span>Port: <strong class="text-stone-300">{factor.stationType}</strong></span>
                    </div>

                    <!-- Safety Warnings / Blocked Reasons -->
                    {#if !factor.safety.isSafe}
                      <div class="mt-2.5 p-2 rounded bg-red-950/60 border border-red-500/60 text-[11px] text-red-300 space-y-1">
                        {#each factor.safety.blockedReasons as reason}
                          <div class="flex items-start space-x-1.5">
                            <span class="text-red-400">⛔</span>
                            <span>{reason}</span>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- Local Factions Distribution Chips -->
                    <div class="mt-2.5 pt-2 border-t border-stone-800/80">
                      <div class="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        System Faction Presence:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        {#each factor.factionsPresent as faction}
                          <span class="px-1.5 py-0.5 rounded text-[10px] bg-black/60 border border-stone-800 text-stone-300">
                            {faction.factionName} <span class="text-amber-400 font-bold">({Math.round(faction.influence * 100)}%)</span>
                          </span>
                        {/each}
                      </div>
                    </div>
                  </div>

                  <!-- Card Action Footer -->
                  <div class="mt-3 pt-2.5 border-t border-stone-800/60 flex items-center justify-between text-xs">
                    <div class="text-[11px] text-stone-400">
                      {#if factor.safety.isSafe}
                        <span class="text-emerald-400 font-bold">✓ 25% Factor Surcharge Applies</span>
                      {:else}
                        <span class="text-red-400">Claiming faction present (>0%)</span>
                      {/if}
                    </div>

                    <div class="flex items-center space-x-2">
                      <button
                        type="button"
                        onclick={() => onPlotRoute?.(factor.systemName)}
                        class="px-2.5 py-1 rounded bg-[#FF7100]/20 hover:bg-[#FF7100]/30 border border-[#FF7100]/50 text-[#FF7100] font-bold transition-all text-xs flex items-center space-x-1"
                      >
                        <span>🧭 PLOT ROUTE</span>
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

        <!-- ================= TAB 2: BOUNTIES & FINES ================= -->
        {:else if activeTab === 'crimes'}
          <!-- Financial Surcharge Summary Card -->
          <div class="p-4 rounded bg-[#13151b] border border-[#FF7100]/40 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div class="p-2.5 rounded bg-black/50 border border-stone-800">
              <div class="text-stone-400 text-[10px] font-bold uppercase">OUTSTANDING BASE DEBT:</div>
              <div class="text-base font-bold text-white mt-0.5">{formatCredits(settlementFee.baseAmount)}</div>
              <div class="text-[10px] text-stone-500 mt-0.5">
                {settlementFee.bountyCount} Bounties, {settlementFee.fineCount} Fines
              </div>
            </div>

            <div class="p-2.5 rounded bg-black/50 border border-stone-800">
              <div class="text-amber-400 text-[10px] font-bold uppercase">INTERSTELLAR FACTOR SURCHARGE:</div>
              <div class="text-base font-bold text-[#FF7100] mt-0.5">+{formatCredits(settlementFee.surchargeFee)}</div>
              <div class="text-[10px] text-stone-500 mt-0.5">Strict 25% Frontier Legal Broker Fee</div>
            </div>

            <div class="p-2.5 rounded bg-black/50 border border-stone-800">
              <div class="text-emerald-400 text-[10px] font-bold uppercase">TOTAL PAYABLE AT FACTOR:</div>
              <div class="text-base font-bold text-emerald-300 mt-0.5">
                {formatCredits(settlementFee.totalAmountPayable)}
              </div>
              <div class="text-[10px] text-stone-500 mt-0.5">Zero arrest & detention guarantee</div>
            </div>

            <div class="flex flex-col justify-center space-y-1.5">
              <button
                type="button"
                onclick={handleClearAllCrimes}
                class="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-600 transition-colors"
              >
                CLEAR ALL CRIMES
              </button>
              <button
                type="button"
                onclick={handleResetCrimes}
                class="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs border border-amber-600/50 transition-colors"
              >
                RESET DEMO CRIMES
              </button>
            </div>
          </div>

          <!-- Add Custom Bounty / Fine Section -->
          <div class="p-3.5 rounded bg-[#101217] border border-stone-800 space-y-3">
            <div class="text-xs font-bold text-amber-400 uppercase tracking-wider">
              + Incur / Simulate New Bounty or Fine
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
              <div>
                <label for="crime-type" class="text-[10px] text-stone-400 uppercase font-bold block mb-1">Type:</label>
                <select
                  id="crime-type"
                  bind:value={newCrimeType}
                  class="w-full px-2 py-1 bg-black border border-stone-700 rounded text-stone-200"
                >
                  <option value="Bounty">Bounty (Hostile)</option>
                  <option value="Fine">Fine (Infraction)</option>
                </select>
              </div>

              <div>
                <label for="crime-amount" class="text-[10px] text-stone-400 uppercase font-bold block mb-1">Amount (CR):</label>
                <input
                  id="crime-amount"
                  type="number"
                  bind:value={newCrimeAmount}
                  step="5000"
                  class="w-full px-2 py-1 bg-black border border-stone-700 rounded text-amber-300"
                />
              </div>

              <div>
                <label for="crime-faction" class="text-[10px] text-stone-400 uppercase font-bold block mb-1">Issuing Faction:</label>
                <input
                  id="crime-faction"
                  type="text"
                  bind:value={newCrimeFaction}
                  placeholder="e.g. Deciat Independents"
                  class="w-full px-2 py-1 bg-black border border-stone-700 rounded text-white"
                />
              </div>

              <div>
                <label for="crime-allegiance" class="text-[10px] text-stone-400 uppercase font-bold block mb-1">Superpower:</label>
                <select
                  id="crime-allegiance"
                  bind:value={newCrimeAllegiance}
                  class="w-full px-2 py-1 bg-black border border-stone-700 rounded text-stone-200"
                >
                  <option value="Federation">Federation</option>
                  <option value="Empire">Empire</option>
                  <option value="Alliance">Alliance</option>
                  <option value="Independent">Independent</option>
                </select>
              </div>

              <div class="flex items-end">
                <button
                  type="button"
                  onclick={handleAddCrime}
                  class="w-full px-3 py-1 bg-[#FF7100] hover:bg-[#FF7100]/90 text-black font-bold rounded transition-colors text-xs"
                >
                  ADD CRIME
                </button>
              </div>
            </div>
          </div>

          <!-- Outstanding Records List -->
          <div class="space-y-2">
            {#if bountiesAndFines.length === 0}
              <div class="p-8 text-center text-emerald-400 bg-[#12141a] rounded border border-emerald-500/40">
                <p class="text-sm font-bold">✓ CLEAN STATUS: ZERO BOUNTIES OR FINES OUTSTANDING</p>
                <p class="text-xs text-stone-400 mt-1">You are permitted to dock and access starport facilities across the galaxy.</p>
              </div>
            {:else}
              {#each bountiesAndFines as crime (crime.id)}
                <div class="p-3 rounded bg-[#12141a] border border-stone-800 flex items-center justify-between text-xs">
                  <div class="space-y-1">
                    <div class="flex items-center space-x-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold {crime.type === 'Bounty' ? 'bg-red-950 text-red-400 border border-red-500/50' : 'bg-amber-950 text-amber-300 border border-amber-500/40'}">
                        {crime.type.toUpperCase()}
                      </span>
                      <span class="text-white font-bold">{formatCredits(crime.amount)}</span>
                      <span class="text-stone-400">• Issuing Authority: <strong class="text-amber-400">{crime.issuingFaction}</strong></span>
                      {#if crime.superpowerAllegiance && crime.superpowerAllegiance !== 'Independent'}
                        <span class="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                          {crime.superpowerAllegiance.toUpperCase()}
                        </span>
                      {/if}
                    </div>
                    <div class="text-[11px] text-stone-400">
                      Reason: <span class="text-stone-300">{crime.victimOrReason}</span>
                      {#if crime.timestamp}
                        <span class="text-stone-500 ml-2">({crime.timestamp})</span>
                      {/if}
                    </div>
                  </div>

                  <div class="flex items-center space-x-3">
                    <div class="text-right text-[11px]">
                      <div class="text-stone-400">At Factor (+25%):</div>
                      <div class="text-amber-300 font-bold">{formatCredits(Math.round(crime.amount * 1.25))}</div>
                    </div>
                    <button
                      type="button"
                      onclick={() => handleRemoveCrime(crime.id)}
                      class="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px]"
                      title="Settle or remove this record"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>

        <!-- ================= TAB 3: NOTORIETY DECAY TIMER ================= -->
        {:else if activeTab === 'notoriety'}
          <div class="p-6 rounded bg-[#12141a] border border-stone-800 space-y-6">
            <!-- Header Explainer -->
            <div class="border-b border-stone-800 pb-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-amber-400 tracking-wide">
                    CMDR NOTORIETY DECAY MONITOR
                  </h3>
                  <p class="text-xs text-stone-400 mt-1">
                    Frontier Crime & Punishment Rules: Interstellar Factors refuse service while your Notoriety rating is above 0.
                    Notoriety drops by <strong>1 point for every 2 hours (7,200 seconds)</strong> of active in-game flight time.
                  </p>
                </div>

                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    onclick={handleToggleTimer}
                    class="px-3 py-1.5 rounded font-bold text-xs transition-colors {notorietyState.isFlightTimerActive
                      ? 'bg-emerald-600 text-black'
                      : 'bg-stone-700 text-stone-300'}"
                  >
                    {notorietyState.isFlightTimerActive ? '▶ FLIGHT CLOCK RUNNING' : '⏸ FLIGHT CLOCK PAUSED'}
                  </button>
                </div>
              </div>
            </div>

            <!-- Big Timer & Notoriety Gauge -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Current Notoriety Score -->
              <div class="p-4 rounded bg-black/60 border border-stone-800 flex flex-col items-center justify-center text-center">
                <span class="text-xs text-stone-400 font-bold uppercase">CURRENT NOTORIETY</span>
                <div class="text-5xl font-extrabold my-2 {notorietyState.notoriety > 0 ? 'text-red-500' : 'text-emerald-400'}">
                  {notorietyState.notoriety}
                </div>
                <span class="text-[11px] text-stone-500">Max Frontier Scale: 10</span>

                <div class="flex items-center space-x-2 mt-3">
                  <button
                    type="button"
                    onclick={handleDecrementNotoriety}
                    class="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
                  >
                    -1 POINT
                  </button>
                  <button
                    type="button"
                    onclick={handleIncrementNotoriety}
                    class="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-600/50 text-xs font-bold"
                  >
                    +1 POINT
                  </button>
                </div>
              </div>

              <!-- Countdown Timer -->
              <div class="p-4 rounded bg-black/60 border border-stone-800 flex flex-col items-center justify-center text-center">
                <span class="text-xs text-stone-400 font-bold uppercase">NEXT POINT DECAY IN:</span>
                {#if notorietyState.notoriety === 0}
                  <div class="text-3xl font-bold text-emerald-400 my-3">CLEAN (00:00:00)</div>
                  <span class="text-[11px] text-stone-400">Interstellar Factors immediately accessible</span>
                {:else}
                  <div class="text-3xl font-mono font-bold text-amber-300 my-3 tracking-wider">
                    {String(hoursRemaining).padStart(2, '0')}:{String(minutesRemaining).padStart(2, '0')}:{String(secondsRemaining).padStart(2, '0')}
                  </div>
                  <span class="text-[11px] text-stone-400">
                    Total Flight Time Remaining: ~{(notorietyState.notoriety - 1) * 2 + hoursRemaining}h {minutesRemaining}m
                  </span>
                {/if}
              </div>

              <!-- Progress Bar & Rules -->
              <div class="p-4 rounded bg-black/60 border border-stone-800 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span class="text-stone-400 uppercase">2-Hour Decay Cycle:</span>
                    <span class="text-amber-400">{decayProgressPct}%</span>
                  </div>
                  <div class="w-full h-3 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                    <div
                      class="h-full bg-gradient-to-r from-amber-500 to-[#FF7100] transition-all duration-500"
                      style="width: {decayProgressPct}%"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                    <span>{notorietyState.flightSecondsElapsed}s elapsed</span>
                    <span>7,200s cycle</span>
                  </div>
                </div>

                <div class="text-[11px] text-stone-400 space-y-1 mt-3">
                  <div class="text-amber-300 font-bold">Important Notes:</div>
                  <p>• Notoriety only decays while undocked and flying in Normal Space or Supercruise.</p>
                  <p>• Docking at any station freezes the decay timer until launch.</p>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Help & Info Bar -->
      <div class="px-4 py-2.5 bg-[#101217] border-t border-stone-800 text-[11px] text-stone-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center space-x-2">
          <span class="text-amber-400 font-bold">ANTI-LOCAL FACTION RULE:</span>
          <span>Interstellar Factors cannot broker crimes if the claiming faction holds >0% influence locally.</span>
        </div>
        <div class="flex items-center space-x-3 text-stone-500">
          <span>Fee: 25% Surcharge</span>
          <span>•</span>
          <span>Decay: 1pt / 2h</span>
          <span>•</span>
          <span>Frontier Horizons & Odyssey Compliant</span>
        </div>
      </div>
    </div>
  </div>
{/if}
