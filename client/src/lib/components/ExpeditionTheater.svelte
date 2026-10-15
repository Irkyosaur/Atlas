<!-- Location: atlas/client/src/lib/components/ExpeditionTheater.svelte -->
<!-- 4D Historical Expedition Playback Theater & Custom Route Creator (Stage 5.3) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    type Expedition,
    type ExpeditionWaypoint,
    HISTORICAL_EXPEDITIONS,
    DISTANT_WORLDS_2_EXPEDITION,
    calculateExpeditionProgress,
    loadCustomExpeditions,
    saveCustomExpedition,
    deleteCustomExpedition,
    serializeExpeditionToPermalink,
    exportExpeditionJson,
    importExpeditionJson,
  } from '$engine/expeditions';
  import { audioSynthesizer } from '$engine/audio_synthesizer';

  interface Props {
    isOpen?: boolean;
    activeExpedition?: Expedition;
    playbackProgress?: number;
    isPlaying?: boolean;
    onSelectWaypoint?: (wp: ExpeditionWaypoint) => void;
    onFocusCoords?: (coords: { x: number; y: number; z: number }) => void;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    activeExpedition = $bindable(DISTANT_WORLDS_2_EXPEDITION),
    playbackProgress = $bindable(0.0),
    isPlaying = $bindable(false),
    onSelectWaypoint,
    onFocusCoords,
    onClose,
  }: Props = $props();

  let activeTab = $state<'theater' | 'roster' | 'creator'>('theater');
  let playbackSpeed = $state<number>(1.0);
  let isLooping = $state<boolean>(true);
  let followFleet = $state<boolean>(false);
  let toastMessage = $state<string | null>(null);
  let toastTimeout: any = null;

  // Custom route creator state
  let customExpeditionsList = $state<Expedition[]>([]);
  let creatorName = $state<string>('');
  let creatorSubtitle = $state<string>('');
  let creatorYear = $state<number>(3305);
  let creatorWaypoints = $state<ExpeditionWaypoint[]>([]);
  let newWpSystem = $state<string>('');
  let newWpName = $state<string>('');
  let newWpX = $state<number>(0);
  let newWpY = $state<number>(0);
  let newWpZ = $state<number>(0);
  let newWpDate = $state<string>('3305-01-01');
  let newWpLog = $state<string>('');
  let newWpGravity = $state<number>(1.0);

  // Playback timer animation
  let animationId: number | null = null;
  let lastTimestamp = performance.now();

  onMount(() => {
    customExpeditionsList = loadCustomExpeditions();
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
  });

  // Derived state for current interpolated flight point & active basecamp
  let interpolatedState = $derived.by(() => {
    return calculateExpeditionProgress(activeExpedition, playbackProgress);
  });

  // Watch followFleet camera sync
  $effect(() => {
    if (followFleet && isOpen && onFocusCoords && interpolatedState) {
      onFocusCoords(interpolatedState.currentCoords);
    }
  });

  // Playback animation tick
  $effect(() => {
    if (isPlaying && isOpen) {
      lastTimestamp = performance.now();
      const loop = (now: number) => {
        const deltaSec = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        // Base flight: complete full expedition in ~90 seconds at 1x speed
        const progressIncrement = (deltaSec / 90.0) * playbackSpeed;
        let nextProgress = playbackProgress + progressIncrement;

        if (nextProgress >= 1.0) {
          if (isLooping) {
            nextProgress = 0.0;
            audioSynthesizer.playChime('advance');
          } else {
            nextProgress = 1.0;
            isPlaying = false;
            audioSynthesizer.playChime('complete');
          }
        }

        playbackProgress = nextProgress;
        if (isPlaying) {
          animationId = requestAnimationFrame(loop);
        }
      };
      animationId = requestAnimationFrame(loop);
    } else {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };
  });

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage = null;
    }, 3500);
  }

  function handleTogglePlay() {
    isPlaying = !isPlaying;
    audioSynthesizer.playChime('copy');
  }

  function handleSelectExpedition(exp: Expedition) {
    activeExpedition = exp;
    playbackProgress = 0.0;
    isPlaying = false;
    audioSynthesizer.playChime('advance');
    if (onFocusCoords && exp.basecamps.length > 0) {
      onFocusCoords(exp.basecamps[0].coords);
    }
  }

  function handleStepBasecamp(direction: 'prev' | 'next') {
    const currentIdx = interpolatedState.activeBasecampIndex;
    const total = activeExpedition.basecamps.length;
    let targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;

    if (direction === 'prev' && interpolatedState.segmentProgress > 0.05) {
      targetIdx = currentIdx; // rewind to start of current segment
    }

    targetIdx = Math.max(0, Math.min(total - 1, targetIdx));
    const targetWp = activeExpedition.basecamps[targetIdx];
    if (targetWp) {
      playbackProgress = targetIdx / (total - 1 || 1);
      audioSynthesizer.playChime('copy');
      if (onSelectWaypoint) onSelectWaypoint(targetWp);
      if (onFocusCoords) onFocusCoords(targetWp.coords);
    }
  }

  function handleScrub(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    playbackProgress = val;
  }

  function handleFocusBasecamp(wp: ExpeditionWaypoint) {
    audioSynthesizer.playChime('target_lock');
    if (onSelectWaypoint) onSelectWaypoint(wp);
    if (onFocusCoords) onFocusCoords(wp.coords);
  }

  // Custom Creator Actions
  function handleStartNewCustom() {
    creatorName = 'Core to Rim Survey';
    creatorSubtitle = 'Custom Deep Space Cartography Route';
    creatorYear = 3305;
    creatorWaypoints = [
      {
        id: 'c-wp-0',
        index: 0,
        name: 'Departure Basecamp',
        systemName: 'Sol',
        coords: { x: 0, y: 0, z: 0 },
        distanceFromStartLy: 0,
        jumpDistanceLy: 0,
        arrivalDate: '3305-01-01',
        departureDate: '3305-01-02',
        displayDate: '01 JAN 3305',
        description: 'Expedition launch point in Sol.',
        historicalLog: 'Wings departing Galileo station for the uncharted outer halo.',
        gravityG: 1.0,
      },
    ];
    activeTab = 'creator';
  }

  function handleAddWaypoint() {
    if (!newWpSystem.trim()) return;
    const idx = creatorWaypoints.length;
    const prevCoords = idx > 0 ? creatorWaypoints[idx - 1].coords : { x: 0, y: 0, z: 0 };
    const jump = Math.hypot(newWpX - prevCoords.x, newWpY - prevCoords.y, newWpZ - prevCoords.z);
    const accum = (creatorWaypoints[idx - 1]?.distanceFromStartLy || 0) + jump;

    const wp: ExpeditionWaypoint = {
      id: `c-wp-${idx}`,
      index: idx,
      name: newWpName.trim() || `Waypoint ${idx}`,
      systemName: newWpSystem.trim(),
      coords: { x: Number(newWpX) || 0, y: Number(newWpY) || 0, z: Number(newWpZ) || 0 },
      distanceFromStartLy: Math.round(accum),
      jumpDistanceLy: Math.round(jump),
      arrivalDate: newWpDate || '3305-01-01',
      departureDate: newWpDate || '3305-01-01',
      displayDate: newWpDate || '3305',
      description: `Custom waypoint in ${newWpSystem}`,
      historicalLog: newWpLog.trim() || 'Survey logs filed by expedition wing.',
      gravityG: Number(newWpGravity) || 1.0,
    };

    creatorWaypoints = [...creatorWaypoints, wp];
    newWpSystem = '';
    newWpName = '';
    newWpLog = '';
    audioSynthesizer.playChime('copy');
  }

  function handleRemoveWaypoint(index: number) {
    creatorWaypoints = creatorWaypoints.filter((_, i) => i !== index);
  }

  function handleSaveCustomExpedition() {
    if (!creatorName.trim() || creatorWaypoints.length < 2) {
      showToast('⚠️ Please specify a route name and at least 2 waypoints.');
      return;
    }

    const totalDist = creatorWaypoints[creatorWaypoints.length - 1]?.distanceFromStartLy || 0;
    const customExp: Expedition = {
      id: `custom-${Date.now()}`,
      name: creatorName.trim(),
      subtitle: creatorSubtitle.trim() || 'Custom Commander Route',
      year: creatorYear,
      startDate: creatorWaypoints[0]?.displayDate || '3305',
      endDate: creatorWaypoints[creatorWaypoints.length - 1]?.displayDate || '3305',
      organizers: ['Commander Custom Flight'],
      fleetRosterCount: 1,
      totalDistanceLy: totalDist,
      bannerDescription: `Custom user-defined expedition containing ${creatorWaypoints.length} waypoints.`,
      summary: `Custom exploration trajectory covering ${totalDist} LY.`,
      basecamps: creatorWaypoints,
      isCustom: true,
    };

    saveCustomExpedition(customExp);
    customExpeditionsList = loadCustomExpeditions();
    activeExpedition = customExp;
    activeTab = 'theater';
    playbackProgress = 0.0;
    showToast(`✅ Saved expedition "${customExp.name}"!`);
    audioSynthesizer.playChime('complete');
  }

  function handleSharePermalink() {
    const url = serializeExpeditionToPermalink(activeExpedition);
    navigator.clipboard.writeText(url).then(() => {
      showToast('🔗 Shareable expedition permalink copied to clipboard!');
      audioSynthesizer.playChime('copy');
    }).catch(() => {
      showToast('⚠️ Could not copy permalink to clipboard.');
    });
  }

  function handleExportJson() {
    const jsonStr = exportExpeditionJson(activeExpedition);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeExpedition.id}-expedition.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`💾 Exported ${activeExpedition.name} to JSON!`);
    audioSynthesizer.playChime('copy');
  }

  function handleImportJsonFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importExpeditionJson(text);
        saveCustomExpedition(imported);
        customExpeditionsList = loadCustomExpeditions();
        activeExpedition = imported;
        activeTab = 'theater';
        playbackProgress = 0.0;
        showToast(`✅ Successfully imported "${imported.name}"!`);
        audioSynthesizer.playChime('complete');
      } catch (err: any) {
        showToast(`❌ Import failed: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
  }

  function handleDeleteCustom(id: string) {
    deleteCustomExpedition(id);
    customExpeditionsList = loadCustomExpeditions();
    if (activeExpedition.id === id) {
      activeExpedition = DISTANT_WORLDS_2_EXPEDITION;
      playbackProgress = 0.0;
    }
    showToast('🗑️ Deleted custom expedition.');
  }
</script>

{#if isOpen}
  <!-- Main Overlay Modal Container -->
  <div
    class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="theater-title"
  >
    <!-- Modal Window with Cobra Amber Glowing Frame -->
    <div
      class="w-full max-w-5xl h-[88vh] max-h-[820px] bg-[var(--hud-bg)]/95 border-2 border-[var(--hud-orange)]/60 rounded flex flex-col shadow-[0_0_40px_rgba(255,113,0,0.25)] overflow-hidden font-mono"
    >
      <!-- Toast Alert Notification Banner -->
      {#if toastMessage}
        <div
          class="absolute top-4 inset-x-0 mx-auto w-max max-w-md px-4 py-2 bg-black/90 border border-[var(--hud-amber)] rounded text-xs text-[var(--hud-amber)] shadow-hud-glow z-50 text-center animate-bounce"
        >
          {toastMessage}
        </div>
      {/if}

      <!-- Header Bar -->
      <div
        class="px-5 py-3 border-b border-[var(--hud-orange)]/40 bg-black/70 flex items-center justify-between gap-4"
      >
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <div id="theater-title" class="hud-title text-sm sm:text-base font-bold tracking-wider text-[var(--hud-orange)]">
              4D HISTORICAL EXPEDITION THEATER
            </div>
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase tracking-widest">
              Stage 5.3 // Trans-Galactic Swarm Replay & Waypoint Archive
            </div>
          </div>
        </div>

        <!-- Expedition Selector Dropdown & Close Button -->
        <div class="flex items-center space-x-3">
          <select
            class="bg-black/80 border border-[var(--hud-orange)]/50 rounded px-2.5 py-1 text-xs text-[var(--hud-amber)] font-mono outline-none cursor-pointer hover:border-[var(--hud-orange)] focus:border-[var(--hud-orange)]"
            value={activeExpedition.id}
            onchange={(e) => {
              const all = [...HISTORICAL_EXPEDITIONS, ...customExpeditionsList];
              const found = all.find((x) => x.id === e.currentTarget.value);
              if (found) handleSelectExpedition(found);
            }}
          >
            <optgroup label="Canonical Historical Expeditions">
              {#each HISTORICAL_EXPEDITIONS as exp}
                <option value={exp.id}>{exp.name} ({exp.year}) - {exp.fleetRosterCount} CMDRs</option>
              {/each}
            </optgroup>
            {#if customExpeditionsList.length > 0}
              <optgroup label="Custom Saved Expeditions">
                {#each customExpeditionsList as exp}
                  <option value={exp.id}>⭐ {exp.name} ({exp.basecamps.length} WPs)</option>
                {/each}
              </optgroup>
            {/if}
          </select>

          <button
            type="button"
            class="p-1 rounded text-white/50 hover:text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 transition-colors cursor-pointer"
            onclick={() => {
              if (onClose) onClose();
              isOpen = false;
            }}
            title="Close Expedition Theater"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Navigation Tabs & Toolbar -->
      <div class="px-5 py-2 bg-black/50 border-b border-[var(--hud-orange)]/25 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-3 py-1 rounded transition-all flex items-center space-x-1.5 {activeTab === 'theater'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
              : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30'}"
            onclick={() => (activeTab = 'theater')}
          >
            <span>🚀 THEATER FLIGHT</span>
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded transition-all flex items-center space-x-1.5 {activeTab === 'roster'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
              : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30'}"
            onclick={() => (activeTab = 'roster')}
          >
            <span>👥 FLEET ROSTER & LORE</span>
          </button>

          <button
            type="button"
            class="px-3 py-1 rounded transition-all flex items-center space-x-1.5 {activeTab === 'creator'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
              : 'text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30'}"
            onclick={() => {
              handleStartNewCustom();
              activeTab = 'creator';
            }}
          >
            <span>✨ ROUTE CREATOR</span>
          </button>
        </div>

        <!-- Quick Utility Actions -->
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="px-2.5 py-1 rounded bg-black/60 border border-[var(--hud-amber)]/40 text-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/20 transition-colors text-[11px] flex items-center space-x-1"
            onclick={handleSharePermalink}
            title="Share route via permalink URL"
          >
            <span>🔗</span>
            <span>SHARE PERMALINK</span>
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded bg-black/60 border border-white/20 text-white/70 hover:border-white/50 transition-colors text-[11px] flex items-center space-x-1"
            onclick={handleExportJson}
            title="Export expedition JSON file"
          >
            <span>💾</span>
            <span>JSON</span>
          </button>

          <label
            class="px-2.5 py-1 rounded bg-black/60 border border-white/20 text-white/70 hover:border-white/50 transition-colors text-[11px] flex items-center space-x-1 cursor-pointer"
            title="Import custom expedition JSON file"
          >
            <span>📂</span>
            <span>IMPORT</span>
            <input type="file" accept=".json" class="hidden" onchange={handleImportJsonFile} />
          </label>
        </div>
      </div>

      <!-- Main Body Container -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        {#if activeTab === 'theater'}
          <!-- ----------------------------------------------------------- -->
          <!-- 1. THEATER PLAYBACK TAB -->
          <!-- ----------------------------------------------------------- -->

          <!-- Expedition Overview Banner -->
          <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="text-[var(--hud-amber)] font-bold text-sm tracking-wide flex items-center space-x-2">
                <span>{activeExpedition.name}</span>
                <span class="px-1.5 py-0.2 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 text-[10px] text-[var(--hud-orange)] font-bold">
                  {activeExpedition.year}
                </span>
                {#if activeExpedition.isCustom}
                  <span class="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/50 text-[10px] text-purple-300">
                    USER ROUTE
                  </span>
                {/if}
              </div>
              <div class="text-[11px] text-white/70 mt-0.5">{activeExpedition.subtitle}</div>
              <div class="text-[10px] text-white/50 mt-1 line-clamp-2">{activeExpedition.bannerDescription}</div>
            </div>

            <div class="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4 text-xs whitespace-nowrap">
              <div>
                <div class="hud-data-label text-[9px]">TOTAL DISTANCE</div>
                <div class="text-white font-bold">{activeExpedition.totalDistanceLy.toLocaleString()} LY</div>
              </div>
              <div>
                <div class="hud-data-label text-[9px]">BASECAMPS</div>
                <div class="text-white font-bold">{activeExpedition.basecamps.length} WPs</div>
              </div>
              <div>
                <div class="hud-data-label text-[9px]">REGISTERED CMDRS</div>
                <div class="text-[var(--hud-amber)] font-bold">{activeExpedition.fleetRosterCount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <!-- Interactive Playback & Scrubber Controls Card -->
          <div class="p-4 rounded bg-black/80 border border-[var(--hud-orange)]/50 space-y-4 shadow-inner">
            <!-- Timeline Top Readout -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full {isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-[var(--hud-orange)]'}"></span>
                <span class="text-[var(--hud-amber)] font-bold text-sm">
                  {interpolatedState.currentDateStr}
                </span>
                <span class="text-white/40">//</span>
                <span class="text-white/80">
                  {interpolatedState.activeBasecamp.name}
                </span>
              </div>

              <div class="flex items-center space-x-3 text-xs">
                <div>
                  <span class="text-white/50">TRAVELED:</span>
                  <span class="text-[var(--hud-orange)] font-bold">{interpolatedState.distanceCoveredLy.toLocaleString()} LY</span>
                  <span class="text-white/30">/ {activeExpedition.totalDistanceLy.toLocaleString()} LY</span>
                </div>
                <div class="px-2 py-0.5 rounded bg-white/10 text-white/80 font-bold">
                  {Math.round(playbackProgress * 100)}%
                </div>
              </div>
            </div>

            <!-- Scrubber Slider with Basecamp Marker Ticks -->
            <div class="relative pt-2 pb-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={playbackProgress}
                oninput={handleScrub}
                class="w-full accent-[var(--hud-orange)] cursor-pointer h-2 bg-black/80 rounded border border-[var(--hud-orange)]/40"
              />

              <!-- Waypoint Tick Markers along slider -->
              <div class="relative w-full h-3 mt-1 pointer-events-none">
                {#each activeExpedition.basecamps as wp, idx}
                  {@const tickPercent = (idx / (activeExpedition.basecamps.length - 1 || 1)) * 100}
                  <div
                    class="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                    style="left: {tickPercent}%;"
                  >
                    <div
                      class="w-1 h-2 rounded-full {idx <= interpolatedState.activeBasecampIndex
                        ? 'bg-[var(--hud-amber)] shadow-[0_0_4px_#ffb300]'
                        : 'bg-white/30'}"
                    ></div>
                    <span class="text-[8px] text-white/40 mt-0.5 hidden md:block">
                      {idx}
                    </span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Playback Control Buttons & Speed Chips -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
              <!-- Play / Step Buttons -->
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded bg-black/70 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 active:scale-95 transition-all text-xs"
                  onclick={() => handleStepBasecamp('prev')}
                  title="Previous Basecamp"
                >
                  ⏮ PREV WP
                </button>

                <button
                  type="button"
                  class="px-5 py-1.5 rounded font-bold transition-all flex items-center space-x-2 text-xs {isPlaying
                    ? 'bg-amber-500 text-black shadow-hud-glow'
                    : 'bg-[var(--hud-orange)] text-black hover:bg-[var(--hud-amber)] shadow-hud-glow'}"
                  onclick={handleTogglePlay}
                >
                  {#if isPlaying}
                    <span>⏸ PAUSE</span>
                  {:else}
                    <span>▶ PLAY SWARM</span>
                  {/if}
                </button>

                <button
                  type="button"
                  class="px-3 py-1.5 rounded bg-black/70 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 active:scale-95 transition-all text-xs"
                  onclick={() => handleStepBasecamp('next')}
                  title="Next Basecamp"
                >
                  NEXT WP ⏭
                </button>

                <!-- Loop Toggle -->
                <button
                  type="button"
                  class="px-2 py-1.5 rounded border text-xs transition-colors {isLooping
                    ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold'
                    : 'bg-black/50 border-white/20 text-white/40'}"
                  onclick={() => (isLooping = !isLooping)}
                  title="Toggle Repeat Loop"
                >
                  🔁 LOOP
                </button>
              </div>

              <!-- Speed Multiplier Chips -->
              <div class="flex items-center space-x-1">
                <span class="text-[10px] text-white/50 mr-1">SPEED:</span>
                {#each [0.5, 1.0, 2.0, 5.0, 10.0, 25.0] as spd}
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded text-[10px] border transition-all {playbackSpeed === spd
                      ? 'bg-[var(--hud-orange)] text-black font-bold'
                      : 'bg-black/40 border-white/10 text-white/60 hover:border-white/30'}"
                    onclick={() => {
                      playbackSpeed = spd;
                      audioSynthesizer.playChime('copy');
                    }}
                  >
                    {spd}x
                  </button>
                {/each}
              </div>

              <!-- Camera Follow Toggle -->
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded border text-xs transition-all flex items-center space-x-1.5 {followFleet
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-black/60 border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40'}"
                  onclick={() => {
                    followFleet = !followFleet;
                    if (followFleet && onFocusCoords) {
                      onFocusCoords(interpolatedState.currentCoords);
                    }
                    audioSynthesizer.playChime('target_lock');
                  }}
                >
                  <span>🎥</span>
                  <span>{followFleet ? 'FOLLOWING FLEET' : 'FOLLOW FLEET'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Active Basecamp Detailed Dossier Card -->
          <div class="p-4 rounded bg-black/70 border border-[var(--hud-orange)]/35 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2 gap-2">
              <div class="flex items-center space-x-2">
                <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/60 text-[var(--hud-orange)] font-bold text-xs">
                  BASECAMP {interpolatedState.activeBasecamp.index}
                </span>
                <span class="text-white font-bold text-sm tracking-wide">
                  {interpolatedState.activeBasecamp.name}
                </span>
                {#if interpolatedState.activeBasecamp.bodyName}
                  <span class="text-[10px] text-white/50">
                    ({interpolatedState.activeBasecamp.bodyName})
                  </span>
                {/if}
              </div>

              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)] hover:text-black font-bold text-[11px] transition-all cursor-pointer"
                  onclick={() => handleFocusBasecamp(interpolatedState.activeBasecamp)}
                >
                  🎯 FOCUS SYSTEM
                </button>
              </div>
            </div>

            <!-- Coordinates & Telemetry Row -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div class="p-2 rounded bg-black/40 border border-white/10">
                <div class="hud-data-label text-[9px]">STAR SYSTEM</div>
                <div class="text-[var(--hud-amber)] font-bold">{interpolatedState.activeBasecamp.systemName}</div>
              </div>
              <div class="p-2 rounded bg-black/40 border border-white/10">
                <div class="hud-data-label text-[9px]">COORDINATES (X, Y, Z)</div>
                <div class="text-white font-bold">
                  {interpolatedState.activeBasecamp.coords.x.toFixed(1)}, {interpolatedState.activeBasecamp.coords.y.toFixed(1)}, {interpolatedState.activeBasecamp.coords.z.toFixed(1)}
                </div>
              </div>
              <div class="p-2 rounded bg-black/40 border border-white/10">
                <div class="hud-data-label text-[9px]">DISTANCE FROM START</div>
                <div class="text-white font-bold">{interpolatedState.activeBasecamp.distanceFromStartLy.toLocaleString()} LY</div>
              </div>
              <div class="p-2 rounded bg-black/40 border border-white/10">
                <div class="hud-data-label text-[9px]">SURFACE GRAVITY</div>
                <div class="font-bold flex items-center space-x-1.5 {interpolatedState.activeBasecamp.gravityG && interpolatedState.activeBasecamp.gravityG > 1.5 ? 'text-red-400' : 'text-emerald-400'}">
                  <span>{interpolatedState.activeBasecamp.gravityG !== undefined ? `${interpolatedState.activeBasecamp.gravityG} G` : 'N/A'}</span>
                  {#if interpolatedState.activeBasecamp.gravityG && interpolatedState.activeBasecamp.gravityG > 1.5}
                    <span class="text-[9px] px-1 bg-red-950/80 border border-red-500/40 rounded text-red-300">HIGH-G DANGER</span>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Historical Log Panel -->
            <div class="p-3 rounded bg-black/90 border border-amber-900/30 space-y-1">
              <div class="flex items-center space-x-2 text-[10px] text-[var(--hud-amber)] font-bold uppercase tracking-wider">
                <span>📜 HISTORICAL EXPEDITION LOG</span>
                <span class="text-white/30">//</span>
                <span class="text-white/60">{interpolatedState.activeBasecamp.displayDate}</span>
              </div>
              <p class="text-xs text-white/90 leading-relaxed font-sans italic border-l-2 border-[var(--hud-orange)]/60 pl-2.5 py-1">
                "{interpolatedState.activeBasecamp.historicalLog}"
              </p>
              {#if interpolatedState.activeBasecamp.cmdrNotes}
                <div class="text-[11px] text-[var(--ed-orange-dim)] pt-1 flex items-start space-x-1.5">
                  <span class="text-[var(--hud-orange)] font-bold">CMDR DISPATCH:</span>
                  <span>{interpolatedState.activeBasecamp.cmdrNotes}</span>
                </div>
              {/if}
            </div>

            <!-- Notable POIs -->
            {#if interpolatedState.activeBasecamp.notablePois && interpolatedState.activeBasecamp.notablePois.length > 0}
              <div class="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span class="text-white/50 text-[10px] uppercase">EXPEDITION LANDMARKS:</span>
                {#each interpolatedState.activeBasecamp.notablePois as poi}
                  <span class="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                    ✦ {poi}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- All Waypoints List Accordion / Quick Selector -->
          <div class="space-y-2">
            <div class="text-xs text-[var(--hud-amber)] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>EXPEDITION WAYPOINT ITINERARY ({activeExpedition.basecamps.length} WAYPOINTS)</span>
              <span class="text-[10px] text-white/40">CLICK TO JUMP PLAYHEAD</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {#each activeExpedition.basecamps as wp, idx}
                {@const isReached = idx <= interpolatedState.activeBasecampIndex}
                {@const isCurrent = idx === interpolatedState.activeBasecampIndex}
                <button
                  type="button"
                  class="p-2.5 rounded text-left border transition-all flex flex-col justify-between {isCurrent
                    ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-orange)] shadow-[0_0_10px_rgba(255,113,0,0.2)]'
                    : isReached
                    ? 'bg-black/40 border-emerald-500/30 text-white/80'
                    : 'bg-black/20 border-white/10 text-white/40 hover:border-white/30'}"
                  onclick={() => {
                    playbackProgress = idx / (activeExpedition.basecamps.length - 1 || 1);
                    handleFocusBasecamp(wp);
                  }}
                >
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-bold {isCurrent ? 'text-[var(--hud-orange)]' : isReached ? 'text-emerald-400' : 'text-white/60'}">
                      {idx}. {wp.name.split(' - ')[1] || wp.name}
                    </span>
                    <span class="text-[9px] font-mono text-white/40">{wp.displayDate}</span>
                  </div>
                  <div class="flex items-center justify-between text-[10px] mt-1 text-white/60">
                    <span>{wp.systemName}</span>
                    <span>+{wp.jumpDistanceLy} LY</span>
                  </div>
                </button>
              {/each}
            </div>
          </div>

        {:else if activeTab === 'roster'}
          <!-- ----------------------------------------------------------- -->
          <!-- 2. FLEET ROSTER & LORE ARCHIVE TAB -->
          <!-- ----------------------------------------------------------- -->
          <div class="space-y-5">
            <!-- Lore & Expedition Summary Card -->
            <div class="p-4 rounded bg-black/70 border border-[var(--hud-orange)]/40 space-y-3">
              <div class="text-sm font-bold text-[var(--hud-amber)] uppercase tracking-wide flex items-center space-x-2">
                <span>EXPEDITION ARCHIVE DISPATCH</span>
                <span class="text-white/30">//</span>
                <span class="text-white/70">{activeExpedition.name}</span>
              </div>
              <p class="text-xs text-white/90 leading-relaxed font-sans">
                {activeExpedition.summary}
              </p>
              <div class="text-[11px] text-white/70 flex flex-wrap gap-4 pt-2 border-t border-white/10">
                <div>
                  <span class="text-white/40">ORGANIZERS:</span>
                  <span class="text-[var(--hud-orange)] font-bold">{activeExpedition.organizers.join(', ')}</span>
                </div>
                <div>
                  <span class="text-white/40">DEPARTURE:</span>
                  <span class="text-white font-bold">{activeExpedition.startDate}</span>
                </div>
                <div>
                  <span class="text-white/40">CULMINATION:</span>
                  <span class="text-white font-bold">{activeExpedition.endDate}</span>
                </div>
              </div>
            </div>

            <!-- CMDR Roster Stats Grid -->
            {#if activeExpedition.rosterStats}
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30">
                  <div class="hud-data-label text-[9px]">REGISTERED PILOTS</div>
                  <div class="text-lg font-bold text-[var(--hud-amber)]">
                    {activeExpedition.rosterStats.registeredPilots.toLocaleString()}
                  </div>
                  <div class="text-[10px] text-white/40 mt-0.5">Pilots Federation Manifest</div>
                </div>

                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30">
                  <div class="hud-data-label text-[9px]">SHIPS REACHED BEAGLE POINT</div>
                  <div class="text-lg font-bold text-emerald-400">
                    {activeExpedition.rosterStats.shipsArrivedFinal?.toLocaleString() || 'N/A'}
                  </div>
                  <div class="text-[10px] text-white/40 mt-0.5">Darwin's Legacy Touchdowns</div>
                </div>

                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30">
                  <div class="hud-data-label text-[9px]">SCIENTIFIC BEACONS ERECTED</div>
                  <div class="text-lg font-bold text-cyan-400">
                    {activeExpedition.rosterStats.scientificBeaconsDeployed}
                  </div>
                  <div class="text-[10px] text-white/40 mt-0.5">Navigational Beacons</div>
                </div>

                <div class="p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30">
                  <div class="hud-data-label text-[9px]">HULL LOSSES (HIGH-G / VOID)</div>
                  <div class="text-lg font-bold text-red-400">
                    {activeExpedition.rosterStats.totalLosses || '0'}
                  </div>
                  <div class="text-[10px] text-white/40 mt-0.5">Rescued by Fuel Rats & Seals</div>
                </div>
              </div>

              <!-- Ship Distribution Bar Breakdown -->
              <div class="p-4 rounded bg-black/60 border border-white/10 space-y-3">
                <div class="text-xs text-[var(--hud-amber)] font-bold uppercase tracking-wider">
                  POPULAR FLEET SHIP CHASSIS BREAKDOWN
                </div>

                <div class="space-y-2">
                  {#each activeExpedition.rosterStats.popularShipClasses as item}
                    {@const pct = Math.round((item.count / activeExpedition.rosterStats.registeredPilots) * 100)}
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-white font-medium">{item.ship}</span>
                        <span class="text-white/60 font-mono">{item.count.toLocaleString()} hulls ({pct}%)</span>
                      </div>
                      <div class="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-white/10">
                        <div
                          class="h-full bg-gradient-to-r from-[var(--hud-orange)] to-[var(--hud-amber)] rounded-full"
                          style="width: {pct}%"
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

        {:else if activeTab === 'creator'}
          <!-- ----------------------------------------------------------- -->
          <!-- 3. CUSTOM EXPEDITION CREATOR TAB -->
          <!-- ----------------------------------------------------------- -->
          <div class="space-y-5">
            <!-- Header & Instructions -->
            <div class="p-3 rounded bg-black/60 border border-purple-500/40 flex items-center justify-between gap-3 text-xs">
              <div>
                <div class="text-purple-300 font-bold uppercase tracking-wider">
                  CUSTOM EXPEDITION ROUTE CREATOR
                </div>
                <div class="text-white/60 text-[11px] mt-0.5">
                  Define custom exploration corridors, save to browser storage, and generate instant shareable permalinks.
                </div>
              </div>

              <button
                type="button"
                class="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md text-xs cursor-pointer"
                onclick={handleSaveCustomExpedition}
              >
                💾 SAVE EXPEDITION
              </button>
            </div>

            <!-- Expedition Basic Metadata Form -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="space-y-1">
                <label class="hud-data-label text-[10px]" for="exp-name">EXPEDITION NAME</label>
                <input
                  id="exp-name"
                  type="text"
                  bind:value={creatorName}
                  placeholder="e.g. Perseus Arm Survey"
                  class="w-full bg-black/80 border border-white/20 rounded px-3 py-1.5 text-white outline-none focus:border-[var(--hud-orange)]"
                />
              </div>

              <div class="space-y-1">
                <label class="hud-data-label text-[10px]" for="exp-subtitle">SUBTITLE / SLOGAN</label>
                <input
                  id="exp-subtitle"
                  type="text"
                  bind:value={creatorSubtitle}
                  placeholder="e.g. Uncharted Galactic Void Mapping"
                  class="w-full bg-black/80 border border-white/20 rounded px-3 py-1.5 text-white outline-none focus:border-[var(--hud-orange)]"
                />
              </div>

              <div class="space-y-1">
                <label class="hud-data-label text-[10px]" for="exp-year">YEAR (IN-LORE)</label>
                <input
                  id="exp-year"
                  type="number"
                  bind:value={creatorYear}
                  class="w-full bg-black/80 border border-white/20 rounded px-3 py-1.5 text-white outline-none focus:border-[var(--hud-orange)]"
                />
              </div>
            </div>

            <!-- Add Waypoint Card -->
            <div class="p-4 rounded bg-black/70 border border-white/15 space-y-3">
              <div class="text-xs text-[var(--hud-amber)] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>ADD EXPEDITION WAYPOINT</span>
                <span class="text-[10px] text-white/40">CURRENT WAYPOINTS: {creatorWaypoints.length}</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div class="col-span-2 space-y-1">
                  <span class="text-[10px] text-white/50">SYSTEM NAME</span>
                  <input
                    type="text"
                    bind:value={newWpSystem}
                    placeholder="e.g. Colonia"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="col-span-2 space-y-1">
                  <span class="text-[10px] text-white/50">BASECAMP / POI NAME</span>
                  <input
                    type="text"
                    bind:value={newWpName}
                    placeholder="e.g. Jaques Station"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] text-white/50">X COORD</span>
                  <input
                    type="number"
                    bind:value={newWpX}
                    step="any"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] text-white/50">Y COORD</span>
                  <input
                    type="number"
                    bind:value={newWpY}
                    step="any"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] text-white/50">Z COORD</span>
                  <input
                    type="number"
                    bind:value={newWpZ}
                    step="any"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] text-white/50">DATE</span>
                  <input
                    type="text"
                    bind:value={newWpDate}
                    placeholder="3305-02-15"
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] text-white/50">GRAVITY (G)</span>
                  <input
                    type="number"
                    step="0.01"
                    bind:value={newWpGravity}
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div class="col-span-2 sm:col-span-3 space-y-1">
                  <span class="text-[10px] text-white/50">HISTORICAL / EXPEDITION LOG</span>
                  <input
                    type="text"
                    bind:value={newWpLog}
                    placeholder="e.g. Rendezvous at the scenic ring canyon..."
                    class="w-full bg-black border border-white/20 rounded px-2 py-1 text-white text-xs outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  class="px-4 py-1.5 rounded bg-[var(--hud-orange)] text-black font-bold text-xs hover:bg-[var(--hud-amber)] transition-colors cursor-pointer"
                  onclick={handleAddWaypoint}
                >
                  ➕ APPEND WAYPOINT
                </button>
              </div>
            </div>

            <!-- Current Waypoints Table -->
            <div class="space-y-2">
              <div class="text-xs text-white/70 font-bold uppercase tracking-wider">
                WAYPOINT SEQUENCE ({creatorWaypoints.length} TOTAL)
              </div>

              <div class="space-y-1.5 max-h-60 overflow-y-auto">
                {#each creatorWaypoints as wp, idx}
                  <div class="p-2.5 rounded bg-black/50 border border-white/10 flex items-center justify-between text-xs gap-3">
                    <div class="flex items-center space-x-3">
                      <span class="w-6 h-6 rounded bg-white/10 flex items-center justify-center font-bold text-[11px] text-[var(--hud-orange)]">
                        {idx}
                      </span>
                      <div>
                        <div class="text-white font-bold">{wp.name} <span class="text-white/50 font-normal">({wp.systemName})</span></div>
                        <div class="text-[10px] text-white/40">
                          Coords: [{wp.coords.x}, {wp.coords.y}, {wp.coords.z}] | Jump: {wp.jumpDistanceLy} LY | Total: {wp.distanceFromStartLy} LY
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="text-red-400 hover:text-red-300 p-1 text-xs cursor-pointer"
                      onclick={() => handleRemoveWaypoint(idx)}
                      title="Remove waypoint"
                    >
                      ✕
                    </button>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Saved Custom Expeditions Manager -->
            {#if customExpeditionsList.length > 0}
              <div class="pt-4 border-t border-white/15 space-y-2">
                <div class="text-xs text-[var(--hud-amber)] font-bold uppercase tracking-wider">
                  SAVED CUSTOM EXPEDITIONS IN BROWSER
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {#each customExpeditionsList as cExp}
                    <div class="p-2.5 rounded bg-black/60 border border-purple-500/30 flex items-center justify-between text-xs">
                      <div>
                        <div class="text-purple-300 font-bold">{cExp.name}</div>
                        <div class="text-[10px] text-white/50">
                          {cExp.basecamps.length} WPs | {cExp.totalDistanceLy.toLocaleString()} LY
                        </div>
                      </div>

                      <div class="flex items-center space-x-2">
                        <button
                          type="button"
                          class="px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] cursor-pointer"
                          onclick={() => {
                            activeExpedition = cExp;
                            activeTab = 'theater';
                            playbackProgress = 0.0;
                          }}
                        >
                          LOAD
                        </button>
                        <button
                          type="button"
                          class="text-red-400 hover:text-red-300 text-xs cursor-pointer"
                          onclick={() => handleDeleteCustom(cExp.id)}
                          title="Delete from localStorage"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <div class="px-5 py-2.5 bg-black/80 border-t border-[var(--hud-orange)]/30 flex items-center justify-between text-xs text-white/60">
        <div class="flex items-center space-x-2">
          <span class="text-[var(--hud-orange)]">SWARM STATUS:</span>
          <span>
            {activeExpedition.name} // {interpolatedState.activeBasecamp.systemName}
          </span>
        </div>

        <button
          type="button"
          class="px-3 py-1 rounded bg-black/60 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 transition-colors cursor-pointer"
          onclick={() => {
            if (onClose) onClose();
            isOpen = false;
          }}
        >
          CLOSE THEATER
        </button>
      </div>
    </div>
  </div>
{/if}
