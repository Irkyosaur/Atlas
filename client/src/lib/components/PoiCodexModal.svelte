<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type PoiRecord,
    type PoiCategory,
    type AudioLogEntry,
    CANONICAL_POI_CATALOG,
    filterPoiCatalog,
  } from '$engine/poi_catalog';
  import {
    cassettePlayer,
    type PlayerState,
    type CassetteTapeSettings,
  } from '$engine/cassette_audio_player';
  import { offlineExplorationCache, type CacheMetadata } from '$engine/offline_exploration_cache';

  interface Props {
    isOpen?: boolean;
    selectedPoi?: PoiRecord | null;
    onSelectPoi?: (poi: PoiRecord) => void;
    onPlotRoute?: (systemName: string) => void;
    onFocusCoords?: (coords: { x: number; y: number; z: number }) => void;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    selectedPoi = $bindable(null),
    onSelectPoi,
    onPlotRoute,
    onFocusCoords,
    onClose,
  }: Props = $props();

  // Active POI list & filter
  let pois = $state<PoiRecord[]>(CANONICAL_POI_CATALOG);
  let activeCategory = $state<PoiCategory | 'all'>('all');
  let searchQuery = $state<string>('');
  let threatFilter = $state<string>('ALL');

  // Currently focused POI and active playing audio log
  let focusedPoi = $state<PoiRecord>(CANONICAL_POI_CATALOG[0]); // default to Thetis
  let activeLog = $state<AudioLogEntry | null>(null);

  // Audio player state
  let playerState = $state<PlayerState>('idle');
  let playProgressSec = $state<number>(0);
  let totalDurationSec = $state<number>(0);
  let isMuted = $state<boolean>(false);
  let showTapeSettings = $state<boolean>(false);

  // Tape parameters bound to cassette player
  let tapeStatic = $state<number>(0.35);
  let tapeCutoff = $state<number>(1250);
  let tapeDrive = $state<number>(20);
  let tapeWow = $state<number>(0.25);

  // Offline cache status
  let cacheMeta = $state<CacheMetadata | null>(null);
  let isCacheSyncing = $state<boolean>(false);

  onMount(async () => {
    await offlineExplorationCache.init();
    cacheMeta = await offlineExplorationCache.getCacheMetadata();
    const storedPois = await offlineExplorationCache.getAllPois();
    if (storedPois && storedPois.length > 0) {
      pois = storedPois;
    }

    cassettePlayer.onStateChange((state, prog, tot) => {
      playerState = state;
      playProgressSec = prog;
      totalDurationSec = tot;
    });

    if (selectedPoi) {
      focusedPoi = selectedPoi;
      if (focusedPoi.audioLogs && focusedPoi.audioLogs.length > 0) {
        activeLog = focusedPoi.audioLogs[0];
      }
    } else {
      focusedPoi = CANONICAL_POI_CATALOG[0]; // Thetis
      if (focusedPoi.audioLogs) {
        activeLog = focusedPoi.audioLogs[0];
      }
    }
  });

  onDestroy(() => {
    cassettePlayer.stop();
  });

  $effect(() => {
    if (selectedPoi) {
      focusedPoi = selectedPoi;
      if (focusedPoi.audioLogs && focusedPoi.audioLogs.length > 0) {
        activeLog = focusedPoi.audioLogs[0];
      }
    }
  });

  let filteredPois = $derived.by(() => {
    return filterPoiCatalog(pois, {
      categories: activeCategory === 'all' ? undefined : [activeCategory],
      searchQuery,
      threatLevel: threatFilter,
    });
  });

  function selectPoi(poi: PoiRecord) {
    focusedPoi = poi;
    if (poi.audioLogs && poi.audioLogs.length > 0) {
      activeLog = poi.audioLogs[0];
    } else {
      activeLog = null;
    }
    if (onSelectPoi) onSelectPoi(poi);
  }

  function handlePlayAudioLog(log: AudioLogEntry) {
    activeLog = log;
    cassettePlayer.playAudioLog(log);
  }

  function togglePlayPause() {
    if (playerState === 'playing') {
      cassettePlayer.pause();
    } else if (playerState === 'paused') {
      cassettePlayer.resume();
    } else if (activeLog) {
      cassettePlayer.playAudioLog(activeLog);
    }
  }

  function handleStopAudio() {
    cassettePlayer.stop();
  }

  function toggleMute() {
    isMuted = !isMuted;
    cassettePlayer.setMuted(isMuted);
  }

  function updateStatic(val: number) {
    tapeStatic = val;
    cassettePlayer.setStaticIntensity(val);
  }

  function updateCutoff(val: number) {
    tapeCutoff = val;
    cassettePlayer.setFrequencyCutoff(val);
  }

  function updateDrive(val: number) {
    tapeDrive = val;
    cassettePlayer.setDistortionDrive(val);
  }

  function updateWow(val: number) {
    tapeWow = val;
    cassettePlayer.setWowFlutter(val);
  }

  async function handleRefreshCache() {
    isCacheSyncing = true;
    await offlineExplorationCache.syncCanonicalPois();
    cacheMeta = await offlineExplorationCache.getCacheMetadata();
    isCacheSyncing = false;
  }

  function getCategoryBadgeColor(cat: PoiCategory): string {
    switch (cat) {
      case 'generation_ship':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'guardian_structure':
      case 'guardian_ruins':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'thargoid_surface_site':
      case 'thargoid_titan_remnant':
        return 'text-lime-400 border-lime-500/40 bg-lime-500/10';
      case 'crashed_ship':
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
      case 'megaship':
      default:
        return 'text-amber-300 border-amber-400/40 bg-amber-400/10';
    }
  }

  function getThreatBadgeColor(threat: string): string {
    switch (threat) {
      case 'Extreme':
        return 'text-red-400 border-red-500/60 bg-red-950/40 animate-pulse';
      case 'Moderate':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
      case 'Low':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
      default:
        return 'text-gray-400 border-gray-500/40 bg-black/40';
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-label="Canonn POI and Audio Codex Modal"
  >
    <!-- Modal Container -->
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#070b10] border border-[var(--hud-orange)]/60 rounded shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden font-mono text-xs"
    >
      <!-- Header Bar -->
      <div
        class="flex items-center justify-between px-5 py-3.5 bg-black/70 border-b border-[var(--hud-orange)]/40 text-[var(--hud-orange)]"
      >
        <div class="flex items-center space-x-3">
          <div class="w-2.5 h-2.5 rounded-full bg-[var(--hud-orange)] shadow-hud-glow animate-pulse"></div>
          <span class="font-bold tracking-widest text-sm uppercase">
            CANONN INTERSTELLAR CODEX & GENERATION SHIP AUDIO PLAYER
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30 text-[var(--hud-amber)]">
            STAGE 5.4 ARCHIVES
          </span>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Offline Cache Indicator -->
          {#if cacheMeta}
            <div
              class="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-black/50 border border-emerald-500/30 text-[10px] text-emerald-400"
              title="IndexedDB Offline Exploration Cache Active"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>OFFLINE CACHE: {cacheMeta.totalPois} POIS</span>
            </div>
          {/if}

          <button
            type="button"
            onclick={() => (isOpen = false)}
            class="p-1.5 rounded hover:bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] hover:text-white transition-colors"
            title="Close Codex"
          >
            <Icon name="chevron-left" size={18} />
          </button>
        </div>
      </div>

      <!-- Main Layout: Sidebar POI List & Right Detail / Cassette Deck -->
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[var(--hud-orange)]/30">
        
        <!-- Left Sidebar: POI Catalog & Search Filters -->
        <div class="w-full md:w-80 lg:w-96 flex flex-col bg-black/40 overflow-hidden">
          <!-- Search & Filter Controls -->
          <div class="p-3 border-b border-[var(--hud-orange)]/30 space-y-2.5 bg-black/60">
            <!-- Search Input -->
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search Thetis, Guardian, Thargoid..."
                class="w-full pl-8 pr-3 py-1.5 bg-black/80 border border-[var(--hud-orange)]/40 rounded text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--hud-orange)] font-mono"
              />
              <div class="absolute left-2.5 top-2 text-[var(--hud-orange)]/60">
                <Icon name="search" size={14} />
              </div>
              {#if searchQuery}
                <button
                  type="button"
                  onclick={() => (searchQuery = '')}
                  class="absolute right-2.5 top-1.5 text-white/50 hover:text-white"
                >
                  ✕
                </button>
              {/if}
            </div>

            <!-- Category Filter Badges -->
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                onclick={() => (activeCategory = 'all')}
                class="px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors {activeCategory === 'all'
                  ? 'bg-[var(--hud-orange)] text-black'
                  : 'bg-black/60 border border-[var(--hud-orange)]/30 text-white/70 hover:bg-[var(--hud-orange)]/15'}"
              >
                All ({pois.length})
              </button>
              <button
                type="button"
                onclick={() => (activeCategory = 'generation_ship')}
                class="px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors {activeCategory === 'generation_ship'
                  ? 'bg-amber-500 text-black'
                  : 'bg-black/60 border border-amber-500/30 text-amber-300 hover:bg-amber-500/15'}"
              >
                Gen Ships
              </button>
              <button
                type="button"
                onclick={() => (activeCategory = 'guardian_structure')}
                class="px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors {activeCategory === 'guardian_structure'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-black/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15'}"
              >
                Guardian
              </button>
              <button
                type="button"
                onclick={() => (activeCategory = 'thargoid_surface_site')}
                class="px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors {activeCategory === 'thargoid_surface_site'
                  ? 'bg-lime-500 text-black'
                  : 'bg-black/60 border border-lime-500/30 text-lime-300 hover:bg-lime-500/15'}"
              >
                Thargoid
              </button>
            </div>
          </div>

          <!-- POI List Scrollable -->
          <div class="flex-1 overflow-y-auto divide-y divide-[var(--hud-orange)]/20">
            {#each filteredPois as poi}
              <button
                type="button"
                onclick={() => selectPoi(poi)}
                class="w-full text-left p-3 transition-colors hover:bg-[var(--hud-orange)]/10 {focusedPoi.id === poi.id
                  ? 'bg-[var(--hud-orange)]/20 border-l-4 border-[var(--hud-orange)]'
                  : 'border-l-4 border-transparent'}"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-white text-xs truncate mr-2">{poi.name}</span>
                  <span class="px-1.5 py-0.2 text-[9px] rounded font-bold border {getCategoryBadgeColor(poi.category)}">
                    {poi.categoryLabel}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[10px] text-[var(--ed-orange-dim)]">
                  <span>{poi.systemName} &bull; {poi.body}</span>
                  {#if poi.hasAudioCodex}
                    <span class="flex items-center space-x-1 text-amber-400 font-bold">
                      <span>📻 {poi.audioLogs?.length || 0} LOGS</span>
                    </span>
                  {/if}
                </div>
              </button>
            {/each}

            {#if filteredPois.length === 0}
              <div class="p-6 text-center text-white/40">
                No POIs match query "{searchQuery}"
              </div>
            {/if}
          </div>

          <!-- Offline Cache Sync Bar (Footer) -->
          <div class="p-2.5 border-t border-[var(--hud-orange)]/30 bg-black/70 flex items-center justify-between text-[10px]">
            <span class="text-white/60">LOCAL EXPLORATION DB</span>
            <button
              type="button"
              onclick={handleRefreshCache}
              disabled={isCacheSyncing}
              class="px-2 py-0.5 rounded border border-[var(--hud-orange)]/40 hover:bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] transition-colors"
            >
              {isCacheSyncing ? 'SYNCING...' : 'SYNC OFFLINE'}
            </button>
          </div>
        </div>

        <!-- Right Content Area: Detailed Lore, Cassette Player Deck & Transcripts -->
        <div class="flex-1 flex flex-col overflow-y-auto bg-black/30 p-4 sm:p-6 space-y-5">
          <!-- POI Meta Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--hud-orange)]/30 gap-3">
            <div>
              <div class="flex items-center space-x-2.5">
                <h2 class="text-base sm:text-lg font-bold text-white tracking-wide">{focusedPoi.name}</h2>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border {getCategoryBadgeColor(focusedPoi.category)}">
                  {focusedPoi.categoryLabel}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border {getThreatBadgeColor(focusedPoi.threatLevel)}">
                  THREAT: {focusedPoi.threatLevel}
                </span>
              </div>
              <div class="mt-1 text-xs text-[var(--ed-orange-dim)] flex flex-wrap items-center gap-x-3">
                <span>System: <strong class="text-white">{focusedPoi.systemName}</strong></span>
                <span>Body: <strong class="text-white">{focusedPoi.body}</strong></span>
                <span>Coords: <strong class="text-white font-mono">{focusedPoi.coords.x.toFixed(1)}, {focusedPoi.coords.y.toFixed(1)}, {focusedPoi.coords.z.toFixed(1)}</strong></span>
                {#if focusedPoi.planetaryCoords}
                  <span>Surface: <strong class="text-amber-400 font-mono">{focusedPoi.planetaryCoords.lat.toFixed(2)}°, {focusedPoi.planetaryCoords.lon.toFixed(2)}°</strong></span>
                {/if}
              </div>
            </div>

            <!-- Action Buttons: Focus in 3D & Plot Route -->
            <div class="flex items-center space-x-2">
              {#if onFocusCoords}
                <button
                  type="button"
                  onclick={() => onFocusCoords && onFocusCoords(focusedPoi.coords)}
                  class="px-3 py-1.5 rounded border border-[var(--hud-orange)]/50 hover:bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] font-bold transition-colors flex items-center space-x-1.5"
                >
                  <span>🎯 FOCUS 3D</span>
                </button>
              {/if}
              {#if onPlotRoute}
                <button
                  type="button"
                  onclick={() => onPlotRoute && onPlotRoute(focusedPoi.systemName)}
                  class="px-3 py-1.5 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/90 text-black font-bold transition-colors flex items-center space-x-1.5 shadow-hud-glow"
                >
                  <span>⚡ PLOT ROUTE</span>
                </button>
              {/if}
            </div>
          </div>

          <!-- Lore Overview Text -->
          <div class="p-3.5 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-1.5 text-white/90 leading-relaxed">
            <div class="flex items-center justify-between text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
              <span>CANONN ARCHIVAL HISTORICAL DOSSIER</span>
              <span>DISCOVERED: {focusedPoi.discoveredDate} BY {focusedPoi.discoveredBy}</span>
            </div>
            <p>{focusedPoi.loreOverview}</p>
          </div>

          <!-- AUDIO CODEX & CASSETTE PLAYER DECK -->
          {#if focusedPoi.audioLogs && focusedPoi.audioLogs.length > 0}
            <div class="rounded border border-amber-500/50 bg-[#0a0d14] overflow-hidden shadow-xl">
              <!-- Cassette Deck Top Header -->
              <div class="px-4 py-2.5 bg-[#121620] border-b border-amber-500/40 flex items-center justify-between text-amber-400">
                <div class="flex items-center space-x-2 font-bold tracking-widest text-[11px] uppercase">
                  <span class="w-2 h-2 rounded-full {playerState === 'playing' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}"></span>
                  <span>CANONN CODEX RECORDER &bull; ANALOG MAGNETIC CASSETTE DECK</span>
                </div>
                <button
                  type="button"
                  onclick={() => (showTapeSettings = !showTapeSettings)}
                  class="px-2 py-0.5 rounded border border-amber-500/30 text-[10px] hover:bg-amber-500/20 transition-colors"
                >
                  {showTapeSettings ? 'HIDE FILTERS' : '⚙ TAPE FILTERS'}
                </button>
              </div>

              <!-- Cassette Tape Animation & Audio Controls -->
              <div class="p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-5 bg-gradient-to-b from-[#0f131d] to-[#070a10]">
                <!-- Retro Cassette Visualization -->
                <div class="relative w-64 h-28 bg-[#181d28] border-2 border-amber-600/60 rounded-md p-2 flex flex-col justify-between shadow-inner">
                  <div class="flex items-center justify-between text-[9px] text-amber-500/80 px-1 font-bold">
                    <span>TYPE-IV METAL / DOLBY-B</span>
                    <span>SIDE A</span>
                  </div>

                  <!-- Tape Spools -->
                  <div class="flex items-center justify-around py-1">
                    <!-- Left Spool -->
                    <div class="relative w-12 h-12 rounded-full border-2 border-amber-500/60 bg-black flex items-center justify-center {playerState === 'playing' ? 'animate-spin' : ''}">
                      <div class="w-5 h-5 rounded-full border border-amber-400 bg-amber-950/40"></div>
                      <div class="absolute w-1 h-3 bg-amber-400/80 top-0"></div>
                      <div class="absolute w-1 h-3 bg-amber-400/80 bottom-0"></div>
                    </div>

                    <!-- Center Window with tape ribbon -->
                    <div class="w-16 h-8 bg-black/90 border border-amber-500/30 rounded flex items-center justify-center overflow-hidden">
                      <div class="w-full h-1.5 bg-amber-700/60 shadow-inner"></div>
                    </div>

                    <!-- Right Spool -->
                    <div class="relative w-12 h-12 rounded-full border-2 border-amber-500/60 bg-black flex items-center justify-center {playerState === 'playing' ? 'animate-spin' : ''}">
                      <div class="w-5 h-5 rounded-full border border-amber-400 bg-amber-950/40"></div>
                      <div class="absolute w-1 h-3 bg-amber-400/80 top-0"></div>
                      <div class="absolute w-1 h-3 bg-amber-400/80 bottom-0"></div>
                    </div>
                  </div>

                  <!-- Tape Bottom Label -->
                  <div class="bg-amber-500/10 border-t border-amber-500/30 px-2 py-0.5 text-center text-[9px] text-amber-300 truncate">
                    {activeLog ? activeLog.title : 'NO TAPE LOADED'}
                  </div>
                </div>

                <!-- Cassette Playback Controls -->
                <div class="flex-1 w-full space-y-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-white font-bold">{activeLog?.title || 'Select a log'}</span>
                    <span class="font-mono text-amber-400">
                      {Math.floor(playProgressSec)}s / {Math.floor(totalDurationSec || activeLog?.durationSec || 0)}s
                    </span>
                  </div>

                  <!-- Progress Track -->
                  <div class="w-full h-2 rounded bg-black/80 border border-amber-500/40 overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-150"
                      style="width: {totalDurationSec > 0 ? (playProgressSec / totalDurationSec) * 100 : 0}%"
                    ></div>
                  </div>

                  <!-- Hardware Buttons -->
                  <div class="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onclick={togglePlayPause}
                      class="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition-transform"
                    >
                      {#if playerState === 'playing'}
                        <span>⏸ PAUSE</span>
                      {:else}
                        <span>▶ PLAY TAPE</span>
                      {/if}
                    </button>

                    <button
                      type="button"
                      onclick={handleStopAudio}
                      class="px-3 py-2 rounded bg-black/60 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 font-bold active:scale-95 transition-transform"
                    >
                      ⏹ STOP
                    </button>

                    <button
                      type="button"
                      onclick={toggleMute}
                      class="px-3 py-2 rounded bg-black/60 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 active:scale-95 transition-transform"
                    >
                      {isMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Collapsible Analog Filter Knobs -->
              {#if showTapeSettings}
                <div class="p-4 bg-black/80 border-t border-amber-500/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
                  <div>
                    <label class="block text-amber-400 font-bold mb-1" for="tape-static-input">
                      STATIC NOISE: {Math.round(tapeStatic * 100)}%
                    </label>
                    <input
                      id="tape-static-input"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={tapeStatic}
                      oninput={(e) => updateStatic(parseFloat((e.target as HTMLInputElement).value))}
                      class="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label class="block text-amber-400 font-bold mb-1" for="tape-cutoff-input">
                      BANDPASS CUTOFF: {tapeCutoff}Hz
                    </label>
                    <input
                      id="tape-cutoff-input"
                      type="range"
                      min="400"
                      max="3500"
                      step="50"
                      value={tapeCutoff}
                      oninput={(e) => updateCutoff(parseFloat((e.target as HTMLInputElement).value))}
                      class="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label class="block text-amber-400 font-bold mb-1" for="tape-drive-input">
                      TAPE DRIVE: {tapeDrive}dB
                    </label>
                    <input
                      id="tape-drive-input"
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={tapeDrive}
                      oninput={(e) => updateDrive(parseFloat((e.target as HTMLInputElement).value))}
                      class="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label class="block text-amber-400 font-bold mb-1" for="tape-wow-input">
                      WOW & FLUTTER: {Math.round(tapeWow * 100)}%
                    </label>
                    <input
                      id="tape-wow-input"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={tapeWow}
                      oninput={(e) => updateWow(parseFloat((e.target as HTMLInputElement).value))}
                      class="w-full accent-amber-500"
                    />
                  </div>
                </div>
              {/if}

              <!-- Audio Logs Carousel / Selector Tabs -->
              <div class="px-4 py-2.5 bg-black/60 border-t border-amber-500/30 flex items-center space-x-2 overflow-x-auto">
                <span class="text-[10px] text-white/50 font-bold uppercase mr-1">CASSETTE TRACKS:</span>
                {#each focusedPoi.audioLogs as log}
                  <button
                    type="button"
                    onclick={() => handlePlayAudioLog(log)}
                    class="px-2.5 py-1 rounded text-[10px] whitespace-nowrap font-bold transition-colors {activeLog?.logNumber === log.logNumber
                      ? 'bg-amber-500 text-black shadow-hud-glow'
                      : 'bg-black/80 border border-amber-500/30 text-amber-300 hover:bg-amber-500/15'}"
                  >
                    Track {log.logNumber}: {log.speaker.split(' ')[0]}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Full Lore Transcript View -->
            {#if activeLog}
              <div class="rounded bg-black/70 border border-[var(--hud-orange)]/40 p-4 space-y-2">
                <div class="flex items-center justify-between text-xs text-[var(--hud-orange)] font-bold border-b border-[var(--hud-orange)]/20 pb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-amber-400">📜 DECODED TRANSCRIPT:</span>
                    <span>{activeLog.title}</span>
                  </div>
                  <div class="text-[10px] text-white/50 font-mono">
                    Speaker: <span class="text-white">{activeLog.speaker}</span> &bull; Stardate: <span class="text-white">{activeLog.timestampStardate || 'Unknown'}</span>
                  </div>
                </div>

                <div class="text-white text-xs sm:text-sm font-mono leading-relaxed pt-2 pl-3 border-l-2 border-amber-500/60 bg-amber-950/10 p-3 rounded">
                  "{activeLog.transcript}"
                </div>
              </div>
            {/if}
          {:else}
            <!-- No Audio Codex Notice -->
            <div class="p-6 rounded bg-black/40 border border-white/10 text-center text-white/40 space-y-1">
              <p>NO AUDIO CODEX SIGNALS RECORDED AT THIS SITE.</p>
              <p class="text-[10px]">Telemetry and spatial coordinates cataloged under Canonn Protocol.</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.18s ease-out forwards;
  }
</style>
