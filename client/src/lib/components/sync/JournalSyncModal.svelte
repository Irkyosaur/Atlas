<script lang="ts">
  // Location: atlas/client/src/lib/components/sync/JournalSyncModal.svelte
  // Stage 11.1: HTML5 File System Access API & Journal Directory Watcher
  // Zero-install EDMC replacement with IndexedDB handle persistence, 250ms active polling,
  // byte-offset delta reader, and Multi-Account / Multi-Box VFS directory ingestion (up to 4 concurrent clients).

  import { onMount, onDestroy } from 'svelte';
  import {
    journalWatcherEngine,
    type CommanderVfsSlot,
    type JournalEventRecord,
    type StoredHandleMetadata,
  } from '$engine/journal_watcher_engine';
  import CockpitTelemetryHud from '$components/sync/CockpitTelemetryHud.svelte';
  import EddnRelayPanel from '$components/sync/EddnRelayPanel.svelte';
  import { eddnRelayEngine } from '$engine/eddn_relay_engine';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
    onFocusSystem?: (systemName: string, coords: [number, number, number]) => void;
    onSyncPrimaryTelemetry?: (slot: CommanderVfsSlot) => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
    onFocusSystem,
    onSyncPrimaryTelemetry,
  }: Props = $props();

  let slots = $state<CommanderVfsSlot[]>(journalWatcherEngine.getSlotsSnapshot());
  let selectedSlotId = $state<string>('ALL');
  let activeCockpitSlotId = $state<string>('vfs_slot_1');
  let eventTypeFilter = $state<string>('ALL');
  let searchQuery = $state<string>('');
  let isDirectoryAuthorized = $state<boolean>(false);
  let authorizedFolderName = $state<string>('Saved Games/Frontier Developments/Elite Dangerous');
  let detectedVfsFolders = $state<string[]>([
    'commander_alpha/',
    'commander_bravo/',
    'commander_charlie/',
    'commander_delta/',
  ]);
  let savedIdbHandleMeta = $state<StoredHandleMetadata | null>(null);
  let isPollingActive = $state<boolean>(true);
  let isSimulatedMultiBoxStream = $state<boolean>(true);
  let statusBanner = $state<string>(
    '250ms VFS Multi-Box Poller Active — Tailing 4 virtualized commander directories (byte-offset delta stream)'
  );
  let isFsApiSupported = $state<boolean>(true);
  let expandedEventId = $state<string | null>(null);

  let unsubscribeWatcher: (() => void) | null = null;

  // Derived metrics across all 4 concurrent clients
  let totalOnlineClients = $derived(slots.filter((s) => s.isClientOnline).length);
  let totalLinesStreamed = $derived(slots.reduce((acc, s) => acc + s.linesStreamed, 0));
  let totalBytesStreamed = $derived(slots.reduce((acc, s) => acc + s.bytesStreamed, 0));
  let combinedFleetCredits = $derived(slots.reduce((acc, s) => acc + s.credits, 0));

  // Unified chronological multi-commander event stream
  let unifiedEvents = $derived.by(() => {
    const merged: JournalEventRecord[] = [];
    for (const slot of slots) {
      if (selectedSlotId !== 'ALL' && slot.slotId !== selectedSlotId) continue;
      for (const evt of slot.recentEvents) {
        if (eventTypeFilter !== 'ALL' && evt.event !== eventTypeFilter) continue;
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const match =
            evt.event.toLowerCase().includes(q) ||
            evt.commanderName.toLowerCase().includes(q) ||
            evt.summary.toLowerCase().includes(q) ||
            (evt.systemName ?? '').toLowerCase().includes(q) ||
            (evt.systemAddressId64 ?? '').toLowerCase().includes(q);
          if (!match) continue;
        }
        merged.push(evt);
      }
    }
    return merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 120);
  });

  onMount(async () => {
    isFsApiSupported = journalWatcherEngine.isFileSystemAccessSupported();
    savedIdbHandleMeta = await journalWatcherEngine.loadSavedDirectoryHandle();
    if (savedIdbHandleMeta) {
      authorizedFolderName = savedIdbHandleMeta.folderName;
      if (savedIdbHandleMeta.detectedVfsFolders?.length) {
        detectedVfsFolders = savedIdbHandleMeta.detectedVfsFolders;
      }
    }

    unsubscribeWatcher = journalWatcherEngine.subscribe((updatedSlots, latestEvent) => {
      if (latestEvent) {
        void eddnRelayEngine.processJournalWatcherEvent(latestEvent);
      }
      // Trigger Svelte 5 reactive state update with cloned references (including Status.json snapshot)
      slots = updatedSlots.map((s) => ({
        ...s,
        statusSnapshot: s.statusSnapshot
          ? {
              ...s.statusSnapshot,
              pips: [...s.statusSnapshot.pips] as [number, number, number],
            }
          : null,
        recentEvents: [...s.recentEvents],
      }));
      if (slots.length > 0 && onSyncPrimaryTelemetry) {
        onSyncPrimaryTelemetry(slots[0]);
      }
    });

    journalWatcherEngine.setSimulatedMultiBoxStream(true);
    journalWatcherEngine.startPollingLoop();
  });

  onDestroy(() => {
    if (unsubscribeWatcher) unsubscribeWatcher();
  });

  async function handleAuthorizeFolder() {
    const result = await journalWatcherEngine.authorizeJournalDirectory();
    if (result.authorized) {
      isDirectoryAuthorized = true;
      isSimulatedMultiBoxStream = false;
      journalWatcherEngine.setSimulatedMultiBoxStream(false);
      authorizedFolderName = result.folderName;
      detectedVfsFolders =
        result.detectedVfsSubfolders.length > 0
          ? result.detectedVfsSubfolders
          : ['./'];
      savedIdbHandleMeta = await journalWatcherEngine.loadSavedDirectoryHandle();
      slots = journalWatcherEngine.getSlotsSnapshot().map((s) => ({ ...s }));
      statusBanner = `Authorized '${result.folderName}' via HTML5 File System Access API — Persisted to IndexedDB (${detectedVfsFolders.length} VFS dirs)`;
    } else if (result.error) {
      statusBanner = `Directory Picker Notice: ${result.error} — Running Multi-Box VFS Telemetry Stream`;
    }
  }

  async function handleReconnectIndexedDb() {
    const res = await journalWatcherEngine.reconnectSavedHandle();
    if (res.authorized) {
      isDirectoryAuthorized = true;
      isSimulatedMultiBoxStream = false;
      journalWatcherEngine.setSimulatedMultiBoxStream(false);
      authorizedFolderName = res.folderName;
      if (res.detectedVfsSubfolders.length > 0) {
        detectedVfsFolders = res.detectedVfsSubfolders;
      }
      slots = journalWatcherEngine.getSlotsSnapshot().map((s) => ({ ...s }));
      statusBanner = `Reconnected IndexedDB handle '${res.folderName}' across browser session (${detectedVfsFolders.length} VFS subfolders active)`;
    } else {
      statusBanner =
        'No prior IndexedDB handle granted or permission prompt dismissed — Click AUTHORIZE JOURNAL FOLDER to bind local Saved Games';
    }
  }

  function handleTogglePolling() {
    isPollingActive = !isPollingActive;
    if (isPollingActive) {
      journalWatcherEngine.startPollingLoop();
      statusBanner = '250ms Active Journal & Status.json Polling Worker Resumed';
    } else {
      journalWatcherEngine.stopPollingLoop();
      statusBanner = '250ms Directory Polling Worker Paused';
    }
  }

  function handleToggleSimulatedMultiBox() {
    isSimulatedMultiBoxStream = !isSimulatedMultiBoxStream;
    journalWatcherEngine.setSimulatedMultiBoxStream(isSimulatedMultiBoxStream);
    statusBanner = isSimulatedMultiBoxStream
      ? 'Multi-Box VFS Live Stream Enabled (4 concurrent commander_*/ folders tailing every 250ms)'
      : 'Multi-Box VFS Synthetic Stream Paused';
  }

  function handleInjectBurstDelta(slotIdx?: number) {
    const evt = journalWatcherEngine.emitSyntheticMultiBoxDelta(slotIdx);
    statusBanner = `Byte-Offset Delta Read [${evt.vfsSubfolder}] -> ${evt.event} (${evt.summary})`;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatCredits(cr: number): string {
    return `${cr.toLocaleString('en-US')} CR`;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 font-mono text-xs select-none"
    role="dialog"
    aria-modal="true"
    aria-label="Web-Native Journal Sync & Multi-Box VFS Fleet Matrix"
  >
    <div
      class="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-[#08080a]/95 border border-[var(--hud-orange)]/60 rounded shadow-[0_0_40px_rgba(255,113,0,0.22)] overflow-hidden"
    >
      <!-- Top Header Bar -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-[var(--hud-orange)]/20 via-black/90 to-black/90 border-b border-[var(--hud-orange)]/40"
      >
        <div class="flex items-center space-x-3">
          <span
            class="px-2 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] tracking-widest uppercase"
          >
            STAGES 11.1?11.3 // ZERO-INSTALL EDMC, COCKPIT HUD &amp; EDDN RELAY
          </span>
          <h2 class="text-sm sm:text-base font-bold tracking-wider text-[var(--hud-amber)] uppercase">
            HTML5 JOURNAL DIRECTORY WATCHER, STATUS.JSON POLLER &amp; COCKPIT TELEMETRY HUD
          </h2>
        </div>

        <div class="flex items-center space-x-3">
          <div class="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-black/70 border border-emerald-500/40">
            <span
              class="w-2 h-2 rounded-full {isPollingActive
                ? 'bg-emerald-400 animate-ping'
                : 'bg-amber-500'}"
            ></span>
            <span class="text-[10px] text-emerald-300 font-bold tracking-wider">
              {isPollingActive ? '250ms POLLER ACTIVE' : 'POLLER PAUSED'}
            </span>
          </div>

          <button
            type="button"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
            class="px-3 py-1 rounded bg-black/70 border border-[var(--hud-orange)]/50 hover:bg-[var(--hud-orange)] hover:text-black text-[var(--hud-orange)] font-bold transition-colors"
          >
            ✕ ESC
          </button>
        </div>
      </div>

      <!-- Control & Directory Authorization Bar -->
      <div
        class="grid grid-cols-1 lg:grid-cols-12 gap-3 px-5 py-3 bg-black/70 border-b border-[var(--hud-orange)]/25 items-center"
      >
        <!-- Left: HTML5 showDirectoryPicker() & IndexedDB Reconnection -->
        <div class="lg:col-span-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onclick={handleAuthorizeFolder}
            class="px-3 py-1.5 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-[0_0_15px_rgba(255,113,0,0.4)] transition-all"
            title="Invoke HTML5 window.showDirectoryPicker() for Saved Games/Frontier Developments/Elite Dangerous"
          >
            <span>📂</span>
            <span>AUTHORIZE JOURNAL FOLDER</span>
          </button>

          <button
            type="button"
            onclick={handleReconnectIndexedDb}
            class="px-3 py-1.5 rounded bg-black/80 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-300 font-bold tracking-wider uppercase flex items-center space-x-1.5 transition-all"
            title="Restore persisted FileSystemDirectoryHandle from IndexedDB across browser restarts"
          >
            <span>🔄</span>
            <span>RECONNECT INDEXEDDB HANDLE</span>
          </button>

          <button
            type="button"
            onclick={handleTogglePolling}
            class="px-2.5 py-1.5 rounded border font-bold uppercase transition-all {isPollingActive
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/50 text-amber-300'}"
          >
            {isPollingActive ? '⏸ PAUSE 250ms WORKER' : '▶ RESUME 250ms WORKER'}
          </button>

          <button
            type="button"
            onclick={() => handleInjectBurstDelta()}
            class="px-2.5 py-1.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/50 hover:bg-[var(--hud-orange)]/30 text-[var(--hud-amber)] font-bold uppercase transition-all"
            title="Simulate an immediate byte-offset journal append across active VFS commander slots"
          >
            ⚡ STREAM DELTA LINE
          </button>
        </div>

        <!-- Right: Global Multi-Box Telemetry Counters -->
        <div class="lg:col-span-5 grid grid-cols-4 gap-2 text-right">
          <div class="px-2.5 py-1 rounded bg-black/80 border border-[var(--hud-orange)]/30">
            <div class="text-[9px] text-white/50 uppercase">VFS CLIENTS</div>
            <div class="text-sm font-bold text-emerald-400">{totalOnlineClients} / 4</div>
          </div>
          <div class="px-2.5 py-1 rounded bg-black/80 border border-[var(--hud-orange)]/30">
            <div class="text-[9px] text-white/50 uppercase">DELTA LINES</div>
            <div class="text-sm font-bold text-[var(--hud-amber)]">{totalLinesStreamed.toLocaleString()}</div>
          </div>
          <div class="px-2.5 py-1 rounded bg-black/80 border border-[var(--hud-orange)]/30">
            <div class="text-[9px] text-white/50 uppercase">BYTES STREAMED</div>
            <div class="text-sm font-bold text-cyan-300">{formatBytes(totalBytesStreamed)}</div>
          </div>
          <div class="px-2.5 py-1 rounded bg-black/80 border border-[var(--hud-orange)]/30">
            <div class="text-[9px] text-white/50 uppercase">FLEET CREDITS</div>
            <div class="text-xs font-bold text-[var(--hud-orange)] truncate">
              {(combinedFleetCredits / 1_000_000_000).toFixed(2)}B CR
            </div>
          </div>
        </div>
      </div>

      <!-- Status & IndexedDB Persistence Banner -->
      <div
        class="flex flex-wrap items-center justify-between gap-2 px-5 py-2 bg-[#120c06] border-b border-[var(--hud-orange)]/25 text-[11px]"
      >
        <div class="flex items-center space-x-2 text-[var(--hud-amber)]">
          <span class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 text-[9px] font-bold">
            VFS ROOT
          </span>
          <span class="font-bold text-white">{authorizedFolderName}</span>
          <span class="text-white/30">|</span>
          <span class="text-white/70">{statusBanner}</span>
        </div>

        <div class="flex items-center space-x-2">
          <span class="text-[10px] text-white/50">DETECTED VFS DIRS:</span>
          {#each detectedVfsFolders as dir}
            <span
              class="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold"
            >
              {dir}
            </span>
          {/each}
          <span
            class="px-1.5 py-0.5 rounded text-[9px] font-bold {isDirectoryAuthorized
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}"
          >
            {isDirectoryAuthorized ? 'IDB HANDLE LOCKED' : 'FS ACCESS API READY'}
          </span>
        </div>
      </div>

      <!-- Main Content Scroll Area -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- Task 5: 4-Client Concurrent Multi-Box VFS Fleet Matrix -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-orange)]">
                ▣ MULTI-ACCOUNT / MULTI-BOX VFS FLEET MATRIX (EDEZCHEESE CONCURRENT CLIENTS)
              </span>
              <span class="text-[10px] text-white/50">
                Simultaneous byte-offset tailing across virtualized commander_&lt;id&gt;/ directories
              </span>
            </div>

            <label class="flex items-center space-x-2 cursor-pointer text-[11px] text-white/70">
              <input
                type="checkbox"
                checked={isSimulatedMultiBoxStream}
                onchange={handleToggleSimulatedMultiBox}
                class="accent-[var(--hud-orange)]"
              />
              <span>Auto-Stream Multi-Box Telemetry (250ms Tick)</span>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {#each slots as slot, idx (slot.slotId)}
              <div
                class="flex flex-col justify-between p-3.5 rounded bg-black/80 border transition-all {selectedSlotId ===
                slot.slotId
                  ? 'border-[var(--hud-orange)] shadow-[0_0_20px_rgba(255,113,0,0.25)]'
                  : 'border-[var(--hud-orange)]/35 hover:border-[var(--hud-orange)]/70'}"
              >
                <!-- Top Row: Slot Index, VFS Subfolder & Online Badge -->
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center space-x-1.5">
                      <span
                        class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[9px]"
                      >
                        SLOT #{slot.slotIndex}
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold"
                      >
                        {slot.vfsSubfolder}
                      </span>
                    </div>
                    <span
                      class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase {slot.isClientOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'}"
                    >
                      ● {slot.gameMode}
                    </span>
                  </div>

                  <!-- Commander Name & Ship Info -->
                  <div class="mb-2">
                    <div class="text-sm font-bold text-[var(--hud-amber)] tracking-wide flex items-center justify-between">
                      <span>{slot.commanderName}</span>
                      <span class="text-[10px] text-white/40">{slot.fid}</span>
                    </div>
                    <div class="text-[11px] text-white/80 flex items-center justify-between mt-0.5">
                      <span class="font-bold text-[var(--hud-orange)]">{slot.shipType}</span>
                      <span class="text-white/60">{slot.shipName} [{slot.shipIdent}]</span>
                    </div>
                  </div>

                  <!-- System Location & 64-bit SystemAddress (preserved as string) -->
                  <div class="p-2 rounded bg-[#0e0b08] border border-[var(--hud-orange)]/25 mb-2.5 space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] text-white/50 uppercase">STAR SYSTEM</span>
                      <button
                        type="button"
                        onclick={() => onFocusSystem?.(slot.currentSystem, slot.starPos)}
                        class="text-[11px] font-bold text-emerald-400 hover:underline flex items-center space-x-1"
                        title="Focus 3D Galaxy Camera on this Commander's Star System"
                      >
                        <span>🎯 {slot.currentSystem}</span>
                      </button>
                    </div>
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-white/40">ID64 (STR):</span>
                      <span class="font-mono text-cyan-300">{slot.systemAddressId64}</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-white/40">STATE:</span>
                      <span class="text-[var(--hud-amber)] font-bold">
                        {#if slot.onFoot}
                          👣 ON FOOT ({slot.statusSnapshot?.bodyName ?? 'Surface'})
                        {:else if slot.Docked}
                          ⚓ DOCKED @ {slot.stationName || 'Starport'}
                        {:else if slot.supercruise}
                          ⚡ SUPERCRUISE
                        {:else}
                          🚀 NORMAL SPACE
                        {/if}
                      </span>
                    </div>
                  </div>

                  <!-- Hull, Fuel & Pips Bars -->
                  <div class="space-y-1.5 mb-2.5 text-[10px]">
                    <div>
                      <div class="flex justify-between mb-0.5">
                        <span class="text-white/50">HULL INTEGRITY</span>
                        <span class="text-[var(--hud-orange)] font-bold">{slot.hullPercent}%</span>
                      </div>
                      <div class="w-full h-1.5 bg-white/10 rounded overflow-hidden">
                        <div
                          class="h-full bg-[var(--hud-orange)] transition-all"
                          style="width: {slot.hullPercent}%"
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between mb-0.5">
                        <span class="text-white/50">FUEL MAIN ({slot.fuelMain.toFixed(1)}/{slot.fuelCapacity}t)</span>
                        <span class="text-amber-300 font-bold">
                          CARGO: {slot.cargoTons}t
                        </span>
                      </div>
                      <div class="w-full h-1.5 bg-white/10 rounded overflow-hidden">
                        <div
                          class="h-full bg-amber-400 transition-all"
                          style="width: {Math.min(100, (slot.fuelMain / Math.max(1, slot.fuelCapacity)) * 100)}%"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <!-- Byte-Offset File Pointer Telemetry -->
                  <div class="p-2 rounded bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                    <div class="flex justify-between text-white/60">
                      <span>FILE:</span>
                      <span class="text-white font-bold truncate max-w-[165px]" title={slot.activeJournalFileName}>
                        {slot.activeJournalFileName}
                      </span>
                    </div>
                    <div class="flex justify-between text-white/60">
                      <span>BYTE OFFSET:</span>
                      <span class="text-emerald-300 font-bold">
                        {slot.lastByteOffset.toLocaleString()} B ({slot.linesStreamed} lines)
                      </span>
                    </div>
                    <div class="flex justify-between text-white/60">
                      <span>STATUS.JSON PIPS:</span>
                      <span class="text-[var(--hud-amber)] font-bold">
                        SYS:{slot.statusSnapshot?.pips[0] ?? 4} ENG:{slot.statusSnapshot?.pips[1] ?? 4} WEP:{slot.statusSnapshot?.pips[2] ?? 4}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Card Footer Actions -->
                <div class="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onclick={() =>
                      (selectedSlotId = selectedSlotId === slot.slotId ? 'ALL' : slot.slotId)}
                    class="flex-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors {selectedSlotId ===
                    slot.slotId
                      ? 'bg-[var(--hud-orange)] text-black'
                      : 'bg-white/5 hover:bg-[var(--hud-orange)]/20 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30'}"
                  >
                    {selectedSlotId === slot.slotId ? '✓ FILTERING LOG' : 'FILTER LOG'}
                  </button>

                  <button
                    type="button"
                    onclick={() => handleInjectBurstDelta(idx)}
                    class="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase"
                    title="Simulate new journal line appended to this VFS client"
                  >
                    + DELTA
                  </button>

                  <button
                    type="button"
                    onclick={() => {
                      activeCockpitSlotId = slot.slotId;
                      onSyncPrimaryTelemetry?.(slot);
                    }}
                    class="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase"
                    title="Promote this VFS Commander to Primary Atlas HUD Telemetry & Cockpit Instrument Panel"
                  >
                    SET HUD
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Stage 11.2: Real-Time Cockpit Telemetry HUD & Status.json Poller -->
        <CockpitTelemetryHud
          {slots}
          activeSlotId={activeCockpitSlotId}
          onSelectSlot={(id) => (activeCockpitSlotId = id)}
        />

        <!-- Stage 11.3: Community Broadcast Relay (EDDN) & Lightweight Atlas EDMC Plugin -->
        <EddnRelayPanel />

        <!-- Task 4: Live Byte-Offset Delta Journal Stream Console -->
        <div class="rounded bg-black/85 border border-[var(--hud-orange)]/40 overflow-hidden">
          <div
            class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#140d06] border-b border-[var(--hud-orange)]/30"
          >
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-amber)]">
                ⚡ REAL-TIME MULTI-COMMANDER JOURNAL DELTA STREAM (FILE.SLICE BYTE-OFFSET)
              </span>
              <span
                class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold"
              >
                ID64 STRING-SAFE
              </span>
            </div>

            <!-- Stream Filters -->
            <div class="flex flex-wrap items-center gap-2">
              <select
                bind:value={selectedSlotId}
                class="px-2 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] text-[11px]"
              >
                <option value="ALL">All 4 VFS Commanders</option>
                {#each slots as s}
                  <option value={s.slotId}>
                    Slot #{s.slotIndex}: {s.commanderName} ({s.vfsSubfolder})
                  </option>
                {/each}
              </select>

              <select
                bind:value={eventTypeFilter}
                class="px-2 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] text-[11px]"
              >
                <option value="ALL">All Event Types</option>
                <option value="FSDJump">FSDJump</option>
                <option value="FSSDiscoveryScan">FSSDiscoveryScan</option>
                <option value="SAAScanComplete">SAAScanComplete</option>
                <option value="ScanOrganic">ScanOrganic</option>
                <option value="Docked">Docked</option>
                <option value="SupercruiseExit">SupercruiseExit</option>
              </select>

              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Filter system, id64, event..."
                class="px-2.5 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-white placeholder-white/30 text-[11px] w-48"
              />
            </div>
          </div>

          <!-- Log Rows -->
          <div class="max-h-72 overflow-y-auto divide-y divide-white/5">
            {#if unifiedEvents.length === 0}
              <div class="p-6 text-center text-white/40">
                No journal events match the current filter. Click ⚡ STREAM DELTA LINE or authorize a local Elite Dangerous Journal directory.
              </div>
            {:else}
              {#each unifiedEvents as evt (evt.id)}
                <div class="px-4 py-2 hover:bg-[var(--hud-orange)]/10 transition-colors">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center space-x-2">
                      <span class="text-[10px] text-white/40 font-mono">
                        {evt.timestamp.slice(11, 19)} UTC
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold"
                      >
                        {evt.vfsSubfolder}
                      </span>
                      <span class="text-[11px] font-bold text-[var(--hud-amber)]">
                        {evt.commanderName}
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)] text-[10px] font-bold"
                      >
                        {evt.event}
                      </span>
                      <span class="text-white/90 text-[11px]">{evt.summary}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                      {#if evt.systemAddressId64}
                        <span class="text-[10px] text-cyan-300/80 font-mono">
                          id64: {evt.systemAddressId64}
                        </span>
                      {/if}
                      <button
                        type="button"
                        onclick={() =>
                          (expandedEventId = expandedEventId === evt.id ? null : evt.id)}
                        class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/60 text-[9px] uppercase"
                      >
                        {expandedEventId === evt.id ? 'HIDE JSON' : 'RAW JSON'}
                      </button>
                    </div>
                  </div>

                  {#if expandedEventId === evt.id}
                    <pre
                      class="mt-2 p-2.5 rounded bg-black/95 border border-[var(--hud-orange)]/30 text-[10px] text-emerald-300 overflow-x-auto">{JSON.stringify(
                        evt.rawJson,
                        null,
                        2
                      )}</pre>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
