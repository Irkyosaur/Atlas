<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    cmdrProfileEngine,
    CmdrProfileEngine,
    type CommanderProfile,
    type CareerRankProgress,
    type NavalRankProgress,
    type CommanderMilestoneBadge,
    COMBAT_RANKS,
    TRADE_RANKS,
    EXPLORATION_RANKS,
    CQC_RANKS,
    MERCENARY_RANKS,
    EXOBIOLOGIST_RANKS,
    FEDERATION_RANKS,
    EMPIRE_RANKS,
  } from '$engine/cmdr_profile_engine';
  import { capiAuthEngine } from '$engine/capi_auth_engine';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
    onOpenCapiSettings?: () => void;
  }

  let { isOpen = $bindable(false), onClose, onOpenCapiSettings }: Props = $props();

  let profile = $state<CommanderProfile>(cmdrProfileEngine.getProfile());
  let activeTab = $state<'overview' | 'ranks' | 'milestones' | 'finances'>('overview');
  let isRefreshing = $state<boolean>(false);
  let statusMessage = $state<string | null>(null);

  onMount(() => {
    const unsub = cmdrProfileEngine.subscribe((p) => {
      profile = p;
    });
    return unsub;
  });

  async function handleRefreshProfile() {
    isRefreshing = true;
    statusMessage = 'Syncing Commander Profile with Frontier CAPI /profile...';
    try {
      await cmdrProfileEngine.fetchCapiProfile();
      statusMessage = 'Profile synced successfully!';
      setTimeout(() => {
        statusMessage = null;
      }, 3000);
    } catch (e: any) {
      statusMessage = `Sync failed: ${e.message}`;
    } finally {
      isRefreshing = false;
    }
  }

  // Helper to get career rank icon
  function getCareerIcon(career: CareerRankProgress['career']): string {
    switch (career) {
      case 'combat':
        return '⚔️';
      case 'trade':
        return '💰';
      case 'explore':
        return '🔭';
      case 'cqc':
        return '🏟️';
      case 'mercenary':
        return '🎯';
      case 'exobiologist':
        return '🧬';
    }
  }

  // Helper to get career accent color
  function getCareerAccent(career: CareerRankProgress['career']): string {
    switch (career) {
      case 'combat':
        return '#EF4444'; // Red
      case 'trade':
        return '#10B981'; // Emerald
      case 'explore':
        return '#38BDF8'; // Sky Blue
      case 'cqc':
        return '#A855F7'; // Purple
      case 'mercenary':
        return '#F97316'; // Orange-Red
      case 'exobiologist':
        return '#22C55E'; // Green
    }
  }

  const allCareers = $derived<CareerRankProgress[]>([
    profile.combatRank,
    profile.tradeRank,
    profile.exploreRank,
    profile.cqcRank,
    profile.mercenaryRank,
    profile.exobiologistRank,
  ]);

  const netWorth = $derived(profile.credits + profile.shipsValue - profile.loan - profile.debt);
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-mono"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dossier-title"
  >
    <!-- Main Dossier Card Modal -->
    <div
      class="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b0c10]/95 border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_40px_rgba(255,119,0,0.25)] overflow-hidden"
    >
      <!-- Top Tactical Header Strip -->
      <div
        class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/35 select-none"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <div class="flex items-center space-x-2.5">
              <span id="dossier-title" class="hud-title text-base sm:text-lg font-bold tracking-wider text-[var(--hud-orange)]">
                COMMANDER DOSSIER // ATLAS NAV-CORP
              </span>
              {#if profile.isCapiVerified}
                <span
                  class="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold tracking-wide"
                  title="Frontier CAPI Cryptographically Verified Identity"
                >
                  <svg class="w-3 h-3 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>CAPI VERIFIED</span>
                </span>
              {:else}
                <span
                  class="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10px] font-bold tracking-wide"
                  title="Unverified Pilot Identity - Link via CAPI Settings"
                >
                  <span>⚠️ UNVERIFIED</span>
                </span>
              {/if}
            </div>
            <div class="text-[11px] text-[var(--hud-amber)]/75 tracking-widest uppercase">
              FRONTIER FID: {profile.fid} // PILOT FEDERATION LICENSE
            </div>
          </div>
        </div>

        <!-- Controls: Refresh, CAPI Link & Close -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            onclick={handleRefreshProfile}
            disabled={isRefreshing}
            class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            title="Refresh Commander Profile from Frontier CAPI"
          >
            <span class={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span class="hidden sm:inline">SYNC CAPI</span>
          </button>

          {#if onOpenCapiSettings}
            <button
              type="button"
              onclick={() => {
                onClose?.();
                onOpenCapiSettings?.();
              }}
              class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs flex items-center space-x-1.5 transition-colors"
              title="CAPI OAuth2 & API Key Settings"
            >
              <span>🔑</span>
              <span class="hidden sm:inline">SETTINGS</span>
            </button>
          {/if}

          <button
            type="button"
            onclick={() => onClose?.()}
            class="p-1.5 rounded bg-black/60 border border-[var(--hud-orange)]/40 hover:border-red-500 hover:text-red-400 text-[var(--hud-orange)] transition-colors"
            title="Close Dossier"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Status Notification Banner -->
      {#if statusMessage}
        <div class="px-5 py-1.5 bg-[var(--hud-orange)]/15 border-b border-[var(--hud-orange)]/30 text-xs text-[var(--hud-amber)] flex items-center space-x-2">
          <span class="animate-pulse">●</span>
          <span>{statusMessage}</span>
        </div>
      {/if}

      <!-- Commander Identity Hero Card -->
      <div class="px-5 py-4 bg-gradient-to-r from-black/90 via-black/75 to-black/90 border-b border-[var(--hud-orange)]/25 flex flex-wrap items-center justify-between gap-4">
        <!-- CMDR Bio -->
        <div class="flex items-center space-x-4">
          <div class="relative w-14 h-14 rounded border border-[var(--hud-orange)]/50 bg-[var(--hud-orange)]/10 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(255,119,0,0.2)]">
            👨‍🚀
            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center text-[8px] font-bold text-black" title="Live Pilot Online">
              ✓
            </div>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold tracking-wider text-white flex items-center space-x-2">
              <span>CMDR {profile.commanderName}</span>
            </div>
            <div class="text-xs text-[var(--hud-amber)] flex items-center space-x-3 mt-0.5">
              <span>CURRENT VESSEL: <span class="text-white font-bold">{profile.currentShipName}</span> ({profile.currentShipType}) [{profile.currentShipIdent}]</span>
            </div>
            <div class="text-[11px] text-white/50 flex items-center space-x-2 mt-0.5">
              <span>DOCKED AT: <span class="text-[var(--hud-orange)]">{profile.currentStarport}</span>, {profile.currentSystem}</span>
            </div>
          </div>
        </div>

        <!-- Financial Summary Pill -->
        <div class="flex items-center space-x-3 bg-black/60 border border-[var(--hud-orange)]/30 px-4 py-2 rounded-lg">
          <div>
            <div class="text-[10px] text-[var(--hud-amber)]/75 uppercase tracking-wider">AVAILABLE LIQUID CREDITS</div>
            <div class="text-lg font-bold text-emerald-400">
              {CmdrProfileEngine.formatCredits(profile.credits)}
            </div>
          </div>
          <div class="h-8 w-px bg-white/15"></div>
          <div>
            <div class="text-[10px] text-white/50 uppercase tracking-wider">EST. NET WORTH</div>
            <div class="text-sm font-bold text-white">
              {CmdrProfileEngine.formatCompactCredits(netWorth)}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center space-x-1 px-5 pt-3 border-b border-[var(--hud-orange)]/25 bg-black/40">
        <button
          type="button"
          onclick={() => (activeTab = 'overview')}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors {activeTab === 'overview'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10'
            : 'border-transparent text-white/60 hover:text-white'}"
        >
          Overview & Allegiance
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'ranks')}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors {activeTab === 'ranks'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10'
            : 'border-transparent text-white/60 hover:text-white'}"
        >
          All 6 Core Ranks (Elite V)
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'milestones')}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors {activeTab === 'milestones'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10'
            : 'border-transparent text-white/60 hover:text-white'}"
        >
          Milestones & Ribbons ({profile.milestones.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'finances')}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors {activeTab === 'finances'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10'
            : 'border-transparent text-white/60 hover:text-white'}"
        >
          Finances & Ledger
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 p-5 overflow-y-auto space-y-5">
        {#if activeTab === 'overview'}
          <!-- Overview Tab: Superpower Allegiances, Naval Progress & Career Snapshot -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Superpower Allegiances & Naval Rank Card -->
            <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-4">
              <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
                <div class="text-xs font-bold uppercase tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
                  <span>🏛️</span>
                  <span>SUPERPOWER ALLEGIANCES & NAVAL COMMISSIONS</span>
                </div>
              </div>

              <!-- Federation Naval Rank -->
              <div class="space-y-1.5 bg-black/40 p-3 rounded border border-blue-500/25">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2">
                    <span class="text-blue-400 font-bold">FEDERATION NAVY</span>
                    <span class="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      {profile.federationNaval.rankName}
                    </span>
                  </div>
                  <div class="text-[11px] text-white/70">
                    Tier {profile.federationNaval.rankIndex} / 14
                    {#if profile.federationNaval.isMaxRank}
                      <span class="text-emerald-400 font-bold ml-1">(MAX)</span>
                    {:else}
                      <span class="text-[var(--hud-amber)] font-bold ml-1">{profile.federationNaval.progressPercent}%</span>
                    {/if}
                  </div>
                </div>
                <!-- Progress Bar -->
                <div class="w-full h-2 rounded-full bg-black/80 border border-blue-500/30 overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    style="width: {profile.federationNaval.progressPercent}%"
                  ></div>
                </div>
                <div class="flex justify-between text-[10px] text-white/40">
                  <span>Reputation: {profile.federationNaval.reputationPercent}% (Allied)</span>
                  <span>Next: {profile.federationNaval.isMaxRank ? 'Supreme Rank' : FEDERATION_RANKS[profile.federationNaval.rankIndex + 1]?.name}</span>
                </div>
              </div>

              <!-- Empire Naval Rank -->
              <div class="space-y-1.5 bg-black/40 p-3 rounded border border-purple-500/25">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2">
                    <span class="text-purple-400 font-bold">IMPERIAL NAVY</span>
                    <span class="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      {profile.empireNaval.rankName}
                    </span>
                  </div>
                  <div class="text-[11px] text-white/70">
                    Tier {profile.empireNaval.rankIndex} / 14
                    {#if profile.empireNaval.isMaxRank}
                      <span class="text-emerald-400 font-bold ml-1">(MAX)</span>
                    {:else}
                      <span class="text-[var(--hud-amber)] font-bold ml-1">{profile.empireNaval.progressPercent}%</span>
                    {/if}
                  </div>
                </div>
                <!-- Progress Bar -->
                <div class="w-full h-2 rounded-full bg-black/80 border border-purple-500/30 overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                    style="width: {profile.empireNaval.progressPercent}%"
                  ></div>
                </div>
                <div class="flex justify-between text-[10px] text-white/40">
                  <span>Reputation: {profile.empireNaval.reputationPercent}% (Allied)</span>
                  <span>Next: {profile.empireNaval.isMaxRank ? 'Supreme Rank' : EMPIRE_RANKS[profile.empireNaval.rankIndex + 1]?.name}</span>
                </div>
              </div>

              <!-- Alliance Standing -->
              <div class="space-y-1.5 bg-black/40 p-3 rounded border border-emerald-500/25">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-emerald-400 font-bold">ALLIANCE OF INDEPENDENT SYSTEMS</span>
                  <span class="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {profile.allianceStanding.status}
                  </span>
                </div>
                <div class="w-full h-2 rounded-full bg-black/80 border border-emerald-500/30 overflow-hidden">
                  <div
                    class="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    style="width: {profile.allianceStanding.reputationPercent}%"
                  ></div>
                </div>
                <div class="flex justify-between text-[10px] text-white/40">
                  <span>Standing: {profile.allianceStanding.reputationPercent}%</span>
                  <span>No Military Naval Ranks (Council of Admirals)</span>
                </div>
              </div>
            </div>

            <!-- Exploration & Galactic Statistics Card -->
            <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-4">
              <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
                <div class="text-xs font-bold uppercase tracking-wider text-[var(--hud-orange)] flex items-center space-x-2">
                  <span>🌌</span>
                  <span>GALACTIC EXPLORATION & COMBAT RECORD</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="bg-black/40 border border-white/10 p-3 rounded text-center">
                  <div class="text-[10px] text-white/50 uppercase">FIRST DISCOVERIES</div>
                  <div class="text-lg font-bold text-amber-400 mt-1">
                    {new Intl.NumberFormat('en-US').format(profile.firstDiscoveriesCount)}
                  </div>
                  <div class="text-[9px] text-white/40">Bodies Mapped</div>
                </div>

                <div class="bg-black/40 border border-white/10 p-3 rounded text-center">
                  <div class="text-[10px] text-white/50 uppercase">SYSTEMS VISITED</div>
                  <div class="text-lg font-bold text-sky-400 mt-1">
                    {new Intl.NumberFormat('en-US').format(profile.systemsVisitedCount)}
                  </div>
                  <div class="text-[9px] text-white/40">Known Coordinates</div>
                </div>

                <div class="bg-black/40 border border-white/10 p-3 rounded text-center">
                  <div class="text-[10px] text-white/50 uppercase">HYPERSPACE JUMPS</div>
                  <div class="text-lg font-bold text-[var(--hud-orange)] mt-1">
                    {new Intl.NumberFormat('en-US').format(profile.hyperspaceJumpsCount)}
                  </div>
                  <div class="text-[9px] text-white/40">Witchspace Transits</div>
                </div>

                <div class="bg-black/40 border border-white/10 p-3 rounded text-center">
                  <div class="text-[10px] text-white/50 uppercase">CQC VICTORIES</div>
                  <div class="text-lg font-bold text-purple-400 mt-1">
                    {new Intl.NumberFormat('en-US').format(profile.cqcMatchesWon)}
                  </div>
                  <div class="text-[9px] text-white/40">Arena Matches Won</div>
                </div>
              </div>

              <!-- Top Milestone Highlights -->
              <div class="space-y-2 pt-2">
                <div class="text-[11px] font-bold text-white/70 uppercase">Featured Milestone Ribbons</div>
                <div class="flex flex-wrap gap-2">
                  {#each profile.milestones.slice(0, 4) as badge}
                    <div
                      class="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-black/50 border border-white/15 text-xs"
                      title={badge.description}
                    >
                      <span>{badge.icon}</span>
                      <span class="font-bold text-white">{badge.title}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Career Bars Snapshot -->
          <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2">
              <div class="text-xs font-bold uppercase tracking-wider text-[var(--hud-orange)]">
                PILOTS FEDERATION CAREER DISCIPLINES
              </div>
              <button
                type="button"
                onclick={() => (activeTab = 'ranks')}
                class="text-xs text-[var(--hud-amber)] hover:underline"
              >
                View Detailed Ranks & Progress →
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              {#each allCareers as career}
                <div class="bg-black/40 border border-white/10 p-2.5 rounded space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center space-x-1">
                      <span>{getCareerIcon(career.career)}</span>
                      <span>{career.title}</span>
                    </span>
                    <span class="font-bold text-[var(--hud-orange)] text-[11px]">
                      {career.rankName}
                    </span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-black border border-white/15 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      style="width: {career.progressPercent}%; background-color: {getCareerAccent(career.career)}"
                    ></div>
                  </div>
                  <div class="flex justify-between text-[9px] text-white/40">
                    <span>{career.isEliteTier ? 'ELITE TIER' : 'Standard'}</span>
                    <span>{career.isMaxRank ? 'MAXED (100%)' : `${career.progressPercent}% to next`}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'ranks'}
          <!-- Full Ranks Tab: 6 Core Disciplines with exact Frontier progress bars -->
          <div class="space-y-4">
            <div class="text-xs text-[var(--hud-amber)]">
              Real-time Frontier Pilots Federation progression. Rank tier percentages reflect exact telemetry from Frontier CAPI /profile.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each allCareers as career}
                <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-3 relative overflow-hidden">
                  <!-- Elite Glow Badge indicator if >= Elite -->
                  {#if career.isEliteTier}
                    <div class="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
                  {/if}

                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2.5">
                      <span class="text-2xl">{getCareerIcon(career.career)}</span>
                      <div>
                        <div class="text-sm font-bold text-white uppercase tracking-wider">
                          {career.title}
                        </div>
                        <div class="text-xs text-[var(--hud-orange)] font-bold">
                          {career.rankName}
                          {#if career.isEliteTier}
                            <span class="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                              ELITE
                            </span>
                          {/if}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-white">
                        {career.progressPercent}%
                      </div>
                      <div class="text-[10px] text-white/50">
                        {career.isMaxRank ? 'MAX RANK' : 'Progress to next tier'}
                      </div>
                    </div>
                  </div>

                  <!-- Visual Multi-segment Progress Bar -->
                  <div class="space-y-1">
                    <div class="w-full h-3 rounded-full bg-black/90 border border-[var(--hud-orange)]/40 p-0.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500 shadow-sm"
                        style="width: {career.progressPercent}%; background-color: {getCareerAccent(career.career)}"
                      ></div>
                    </div>
                    <div class="flex justify-between text-[10px] text-white/40">
                      <span>Tier: {career.rankIndex} of 13</span>
                      <span>Next: {career.isMaxRank ? 'Highest Pinnacle' : 'Elite Progress'}</span>
                    </div>
                  </div>

                  <!-- Rank Pathway Mini-ticks -->
                  <div class="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] text-white/40">
                    <span>Harmless / Starter</span>
                    <span>Elite (Rank 8)</span>
                    <span>Elite V (Rank 13)</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'milestones'}
          <!-- Milestones & Badges Tab -->
          <div class="space-y-4">
            <div class="flex items-center justify-between text-xs text-[var(--hud-amber)]">
              <span>Cryptographically verified Frontier badges, pilgrimage ribbons, and Thargoid war ribbons.</span>
              <span class="text-white/60">{profile.milestones.filter((m) => m.unlocked).length} / {profile.milestones.length} Unlocked</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {#each profile.milestones as milestone}
                <div
                  class="bg-black/60 border rounded-lg p-3.5 space-y-2 transition-all hover:bg-black/80 {milestone.unlocked
                    ? 'border-[var(--hud-orange)]/40 shadow-sm'
                    : 'border-white/10 opacity-50'}"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-2.5">
                      <div
                        class="w-10 h-10 rounded-lg flex items-center justify-center text-xl border bg-black/80"
                        style="border-color: {milestone.accentColor}66"
                      >
                        {milestone.icon}
                      </div>
                      <div>
                        <div class="text-xs font-bold text-white tracking-wide">
                          {milestone.title}
                        </div>
                        <div class="text-[10px] uppercase font-bold" style="color: {milestone.accentColor}">
                          {milestone.category}
                        </div>
                      </div>
                    </div>

                    {#if milestone.unlocked}
                      <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/40">
                        UNLOCKED
                      </span>
                    {:else}
                      <span class="px-1.5 py-0.5 rounded bg-white/10 text-white/40 text-[9px] font-bold">
                        LOCKED
                      </span>
                    {/if}
                  </div>

                  <p class="text-[11px] text-white/70 leading-relaxed">
                    {milestone.description}
                  </p>

                  <div class="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/40">
                    {#if milestone.progressText}
                      <span class="text-amber-400 font-bold">{milestone.progressText}</span>
                    {:else}
                      <span>Verified Badge</span>
                    {/if}
                    {#if milestone.unlockedAt}
                      <span>{milestone.unlockedAt}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'finances'}
          <!-- Financial Ledger Tab -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Liquid Credits -->
              <div class="bg-black/60 border border-emerald-500/35 rounded-lg p-4 space-y-2">
                <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>💵</span>
                  <span>LIQUID CREDITS BALANCE</span>
                </div>
                <div class="text-xl font-bold text-white">
                  {CmdrProfileEngine.formatCredits(profile.credits)}
                </div>
                <p class="text-[10px] text-white/50">
                  Instantly available for rebuys, outfitting purchases, and commodities trading.
                </p>
              </div>

              <!-- Fleet Ships Asset Value -->
              <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-2">
                <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center space-x-1.5">
                  <span>🚀</span>
                  <span>FLEET SHIP ASSETS VALUE</span>
                </div>
                <div class="text-xl font-bold text-white">
                  {CmdrProfileEngine.formatCredits(profile.shipsValue)}
                </div>
                <p class="text-[10px] text-white/50">
                  Combined hull and module valuation across all stored shipyard vessels.
                </p>
              </div>

              <!-- Total Net Worth -->
              <div class="bg-black/60 border border-amber-500/35 rounded-lg p-4 space-y-2">
                <div class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>💎</span>
                  <span>TOTAL NET ASSETS</span>
                </div>
                <div class="text-xl font-bold text-white">
                  {CmdrProfileEngine.formatCredits(netWorth)}
                </div>
                <p class="text-[10px] text-white/50">
                  Total commander net worth including starships, modules, and liquid balance.
                </p>
              </div>
            </div>

            <!-- Liabilities / Loan & Debt Ledger -->
            <div class="bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg p-4 space-y-3">
              <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider">
                LIABILITIES & OUTSTANDING DEBTS
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-black/40 border border-white/10 p-3 rounded flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-white">PILOTS FEDERATION LOAN</div>
                    <div class="text-[10px] text-white/40">Active rebuy emergency insurance loan</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-bold {profile.loan > 0 ? 'text-red-400' : 'text-emerald-400'}">
                      {CmdrProfileEngine.formatCredits(profile.loan)}
                    </div>
                    <div class="text-[9px] text-white/40">{profile.loan > 0 ? 'Repayment Active (10%)' : 'No Active Loan'}</div>
                  </div>
                </div>

                <div class="bg-black/40 border border-white/10 p-3 rounded flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-white">INTERSTELLAR BOUNTIES / DEBT</div>
                    <div class="text-[10px] text-white/40">Fines and interstellar factor debts</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-bold {profile.debt > 0 ? 'text-red-400' : 'text-emerald-400'}">
                      {CmdrProfileEngine.formatCredits(profile.debt)}
                    </div>
                    <div class="text-[9px] text-white/40">{profile.debt > 0 ? 'Outstanding Fines' : 'Clean Record'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <div class="flex items-center justify-between px-5 py-3 bg-black/85 border-t border-[var(--hud-orange)]/30 text-xs text-white/60 select-none">
        <div class="flex items-center space-x-2">
          <span>ATLAS PROTOCOL v9.2 // STAGE 9.2 VERIFIED DOSSIER</span>
          <span class="text-white/20">|</span>
          <span class="text-[var(--hud-orange)] font-bold">AES-256-GCM SECURE VAULT</span>
        </div>

        <button
          type="button"
          onclick={() => onClose?.()}
          class="px-4 py-1.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)] hover:text-black border border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold uppercase tracking-wider transition-colors"
        >
          CLOSE DOSSIER
        </button>
      </div>
    </div>
  </div>
{/if}
