<script lang="ts">
  // Location: atlas/client/src/lib/components/sync/CockpitTelemetryHud.svelte
  // Stage 11.2: Real-Time Cockpit Telemetry HUD & Status.json Poller
  // Replicates Elite Dangerous cockpit instrument panel status in real time using Status.json telemetry:
  // - Task 1: Bitwise Flags & Flags2 decoder (Landing Gear, Cargo Scoop, Lights, FA Off, Hardpoints,
  //           Shields Up, Supercruise, Flight In Danger, Overheating, Low Fuel, In SRV, On Foot, etc.)
  // - Task 2: Animated SVG cockpit status indicators matching authentic orange Cobra HUD styling (#FF7100)
  // - Task 3: Fuel reservoir (Fuel.FuelMain, Fuel.FuelReservoir), Pips allocation (SYS / ENG / WEP),
  //           and active FireGroup (A-H)
  // - Task 4: Planetary approach telemetry: Altitude (m), Heading (deg), Latitude, Longitude,
  //           PlanetRadius, and Surface Gravity (G) with <500ms interactive verification controls.

  import {
    journalWatcherEngine,
    type CommanderVfsSlot,
  } from '$engine/journal_watcher_engine';
  import {
    buildCockpitIndicators,
    decodeStatusFlags,
    extractPlanetaryApproachTelemetry,
    FIRE_GROUP_LETTERS,
    formatFireGroupLetter,
    formatPipValue,
    GUI_FOCUS_LABELS,
    type CockpitIndicatorDescriptor,
  } from '$engine/status_flags_decoder';

  interface Props {
    slots: CommanderVfsSlot[];
    activeSlotId?: string;
    onSelectSlot?: (slotId: string) => void;
  }

  let {
    slots,
    activeSlotId = 'vfs_slot_1',
    onSelectSlot,
  }: Props = $props();

  let selectedHudSlotId = $state<string>('vfs_slot_1');
  let lastToggleLatencyMs = $state<number>(12);
  let lastToggledFlagLabel = $state<string>('READY (250ms STATUS.JSON POLLER)');

  $effect(() => {
    if (activeSlotId && activeSlotId !== 'ALL') {
      selectedHudSlotId = activeSlotId;
    }
  });

  let activeSlot = $derived<CommanderVfsSlot>(
    slots.find((s) => s.slotId === selectedHudSlotId) ?? slots[0]
  );

  let statusSnap = $derived(activeSlot?.statusSnapshot ?? null);
  let rawFlags = $derived(statusSnap?.flags ?? 0);
  let rawFlags2 = $derived(statusSnap?.flags2 ?? 0);

  let decodedFlags = $derived(decodeStatusFlags(rawFlags, rawFlags2));
  let indicators = $derived<CockpitIndicatorDescriptor[]>(
    buildCockpitIndicators(rawFlags, rawFlags2)
  );
  let planetary = $derived(extractPlanetaryApproachTelemetry(statusSnap));

  let pips = $derived<[number, number, number]>(statusSnap?.pips ?? [4, 4, 4]);
  let fireGroupIndex = $derived<number>(statusSnap?.fireGroup ?? 0);
  let fireGroupLetter = $derived<string>(formatFireGroupLetter(fireGroupIndex));
  let guiFocusLabel = $derived<string>(
    GUI_FOCUS_LABELS[statusSnap?.guiFocus ?? 0] ?? 'NO FOCUS'
  );

  let fuelMain = $derived<number>(statusSnap?.fuelMain ?? activeSlot?.fuelMain ?? 32.0);
  let fuelCapacity = $derived<number>(Math.max(1, activeSlot?.fuelCapacity ?? 32.0));
  let fuelMainPercent = $derived<number>(
    Math.max(0, Math.min(100, (fuelMain / fuelCapacity) * 100))
  );
  let fuelReservoir = $derived<number>(statusSnap?.fuelReservoir ?? 0.61);
  let fuelReservoirPercent = $derived<number>(
    Math.max(0, Math.min(100, (fuelReservoir / 1.0) * 100))
  );

  function formatHex32(val: number): string {
    return '0x' + (val >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function formatBin32Grouped(val: number): string {
    const bin = (val >>> 0).toString(2).padStart(32, '0');
    return `${bin.slice(0, 8)} ${bin.slice(8, 16)} ${bin.slice(16, 24)} ${bin.slice(24, 32)}`;
  }

  function handleToggleIndicator(ind: CockpitIndicatorDescriptor) {
    if (!activeSlot) return;
    const t0 = performance.now();
    journalWatcherEngine.toggleSlotStatusFlag(
      activeSlot.slotId,
      ind.sourceMask,
      ind.flagBit
    );
    const dt = Math.max(1, Math.round(performance.now() - t0));
    lastToggleLatencyMs = dt;
    lastToggledFlagLabel = `${ind.label} (${ind.hexBit}) -> ${!ind.active ? 'ENGAGED' : 'RETRACTED'}`;
  }

  function handlePresetClick(
    preset:
      | 'ORBITAL_GLIDE'
      | 'LANDING_TOUCHDOWN'
      | 'COMBAT_DANGER'
      | 'SILENT_SMUGGLING'
      | 'HIGH_G_APPROACH'
      | 'SRV_SURFACE_OPS'
  ) {
    if (!activeSlot) return;
    const t0 = performance.now();
    journalWatcherEngine.applySlotStatusPreset(activeSlot.slotId, preset);
    lastToggleLatencyMs = Math.max(1, Math.round(performance.now() - t0));
    lastToggledFlagLabel = `PRESET APPLIED: ${preset.replace(/_/g, ' ')}`;
  }

  function handlePipsPreset(nextPips: [number, number, number]) {
    if (!activeSlot) return;
    journalWatcherEngine.updateSlotPipsAndFireGroup(activeSlot.slotId, nextPips, undefined);
    lastToggledFlagLabel = `DISTRIBUTOR PIPS -> SYS:${formatPipValue(nextPips[0])} ENG:${formatPipValue(nextPips[1])} WEP:${formatPipValue(nextPips[2])}`;
  }

  function handleSelectFireGroup(idx: number) {
    if (!activeSlot) return;
    journalWatcherEngine.updateSlotPipsAndFireGroup(activeSlot.slotId, undefined, idx);
    lastToggledFlagLabel = `ACTIVE FIREGROUP -> GROUP ${formatFireGroupLetter(idx)} (${idx})`;
  }
</script>

<div class="rounded bg-[#0a0806]/95 border border-[var(--hud-orange)]/45 shadow-[0_0_25px_rgba(255,113,0,0.12)] overflow-hidden font-mono text-xs">
  <!-- Top Subheader Bar: Stage 11.2 Telemetry Controls & Commander Switcher -->
  <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1f1104] via-[#120b05] to-black border-b border-[var(--hud-orange)]/35">
    <div class="flex flex-wrap items-center gap-2.5">
      <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] tracking-widest uppercase">
        STAGE 11.2 // COCKPIT TELEMETRY HUD
      </span>
      <span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-amber)]">
        REAL-TIME STATUS.JSON INSTRUMENT PANEL &amp; BITWISE DECODER
      </span>
      <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
        ?t {lastToggleLatencyMs}ms (&lt;500ms SLA)
      </span>
    </div>

    <!-- Active VFS Commander Selector for Cockpit HUD -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-[10px] text-white/50 uppercase mr-1">ACTIVE COCKPIT:</span>
      {#each slots as slot}
        <button
          type="button"
          onclick={() => {
            selectedHudSlotId = slot.slotId;
            onSelectSlot?.(slot.slotId);
          }}
          class="px-2 py-1 rounded text-[10px] font-bold uppercase transition-all {selectedHudSlotId === slot.slotId
            ? 'bg-[var(--hud-orange)] text-black shadow-[0_0_10px_rgba(255,113,0,0.5)]'
            : 'bg-black/70 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
        >
          #{slot.slotIndex} {slot.commanderName.replace('CMDR ', '')} ({slot.shipType})
        </button>
      {/each}
    </div>
  </div>

  <!-- Quick Simulation & Verification Bar -->
  <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-black/80 border-b border-white/10 text-[10px]">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-white/50 uppercase font-bold mr-1">SIMULATE STATUS.JSON PROFILE:</span>
      <button
        type="button"
        onclick={() => handlePresetClick('ORBITAL_GLIDE')}
        class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] font-bold uppercase"
      >
        ?? ORBITAL GLIDE
      </button>
      <button
        type="button"
        onclick={() => handlePresetClick('LANDING_TOUCHDOWN')}
        class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/15 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] font-bold uppercase"
      >
        ?? GEAR &amp; APPROACH
      </button>
      <button
        type="button"
        onclick={() => handlePresetClick('COMBAT_DANGER')}
        class="px-2 py-0.5 rounded bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold uppercase"
      >
        ?? HARDPOINTS &amp; DANGER
      </button>
      <button
        type="button"
        onclick={() => handlePresetClick('SILENT_SMUGGLING')}
        class="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold uppercase"
      >
        ?? SILENT + SCOOP + HEAT
      </button>
      <button
        type="button"
        onclick={() => handlePresetClick('HIGH_G_APPROACH')}
        class="px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/35 border border-red-500/50 text-red-200 font-bold uppercase"
      >
        ?? HIGH-G WORLD (6.73G)
      </button>
      <button
        type="button"
        onclick={() => handlePresetClick('SRV_SURFACE_OPS')}
        class="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold uppercase"
      >
        ?? SRV SCARAB OPS
      </button>
    </div>

    <div class="flex items-center space-x-3 text-[10px]">
      <span class="text-white/40">LAST TELEMETRY EVENT:</span>
      <span class="text-emerald-300 font-bold">{lastToggledFlagLabel}</span>
    </div>
  </div>

  <!-- Main 3-Column Instrument Deck -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 p-4">
    <!-- LEFT COLUMN (5 cols): Task 1 & Task 2 - Bitwise Flags Decoder & Animated SVG Cobra HUD Indicators -->
    <div class="lg:col-span-5 flex flex-col justify-between rounded bg-black/75 border border-[var(--hud-orange)]/30 p-3 space-y-3">
      <div>
        <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2 mb-2.5">
          <div>
            <div class="text-[11px] font-bold text-[var(--hud-orange)] uppercase tracking-wider">
              COCKPIT ANNUNCIATOR MATRIX (CLICK TO TOGGLE)
            </div>
            <div class="text-[9px] text-white/45">
              Authentic Cobra Mk III SVG Instrument Indicators ? Instant &lt;500ms Status.json Sync
            </div>
          </div>
          <span class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/40 text-[var(--hud-amber)] text-[9px] font-bold">
            {decodedFlags.hudAnalysisMode ? 'ANALYSIS HUD' : 'COMBAT HUD'}
          </span>
        </div>

        <!-- 4x4 Grid of Animated SVG Cockpit Status Indicators -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {#each indicators as ind (ind.id)}
            {@const isDanger = ind.variant === 'danger'}
            {@const isCyan = ind.variant === 'cyan'}
            <button
              type="button"
              onclick={() => handleToggleIndicator(ind)}
              class="group relative flex flex-col items-center justify-between p-2 rounded border text-left transition-all {ind.active
                ? isDanger
                  ? 'bg-red-950/60 border-[#FF2A2A] text-[#FF5555] shadow-[0_0_14px_rgba(255,42,42,0.35)]'
                  : isCyan
                    ? 'bg-cyan-950/50 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.28)]'
                    : 'bg-[#261202]/90 border-[var(--hud-orange)] text-[var(--hud-amber)] shadow-[0_0_12px_rgba(255,113,0,0.3)]'
                : 'bg-black/60 border-white/10 text-white/35 hover:border-[var(--hud-orange)]/40 hover:text-white/60'}"
              title="Toggle {ind.label} ({ind.sourceMask} {ind.hexBit})"
            >
              <!-- Top row: bitmask hex & active LED -->
              <div class="w-full flex items-center justify-between text-[8px] mb-1">
                <span class="opacity-70">{ind.hexBit}</span>
                <span
                  class="w-2 h-2 rounded-full {ind.active
                    ? isDanger
                      ? 'bg-[#FF2A2A] animate-ping'
                      : isCyan
                        ? 'bg-[#00E5FF]'
                        : 'bg-[var(--hud-orange)]'
                    : 'bg-white/15'}"
                ></span>
              </div>

              <!-- Center: Authentic Animated Vector SVG Cockpit Icon -->
              <div class="my-1 flex items-center justify-center">
                <svg
                  class="w-7 h-7 transition-transform duration-200 {ind.active ? 'scale-110' : 'scale-95 opacity-40'}"
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon
                    points="6,2 30,2 34,8 34,28 30,34 6,34 2,28 2,8"
                    stroke-opacity={ind.active ? '0.85' : '0.25'}
                    stroke-width="1.2"
                  />
                  {#if ind.iconType === 'gear'}
                    <path d="M18 7V23M11 16L18 23L25 16" stroke-linecap="round" />
                    <circle cx="11" cy="26" r="2.5" fill={ind.active ? 'currentColor' : 'none'} />
                    <circle cx="25" cy="26" r="2.5" fill={ind.active ? 'currentColor' : 'none'} />
                    <line x1="8" y1="29" x2="28" y2="29" stroke-width="1.5" />
                  {:else if ind.iconType === 'scoop'}
                    <path d="M8 10L13 26H23L28 10" />
                    <rect x="15" y="13" width="6" height="6" fill={ind.active ? 'currentColor' : 'none'} />
                    <path d="M18 7V11" />
                  {:else if ind.iconType === 'lights'}
                    <path d="M14 12C10 12 8 15 8 18C8 21 10 24 14 24Z" fill={ind.active ? 'currentColor' : 'none'} />
                    <line x1="17" y1="13" x2="28" y2="10" />
                    <line x1="17" y1="18" x2="29" y2="18" />
                    <line x1="17" y1="23" x2="28" y2="26" />
                  {:else if ind.iconType === 'fa'}
                    <circle cx="18" cy="18" r="8" stroke-dasharray={ind.active ? '3 2' : 'none'} />
                    <path d="M18 6V12M18 24V30M6 18H12M24 18H30" />
                  {:else if ind.iconType === 'hardpoints'}
                    <circle cx="18" cy="18" r="7" />
                    <path d="M18 6V13M18 23V30M6 18H13M23 18H30" />
                    <circle cx="18" cy="18" r="2" fill={ind.active ? 'currentColor' : 'none'} />
                  {:else if ind.iconType === 'shields'}
                    <ellipse cx="18" cy="18" rx="11" ry="7" />
                    <ellipse cx="18" cy="18" rx="8" ry="4.5" stroke-dasharray="2 2" />
                    <polygon points="18,12 22,22 18,20 14,22" fill={ind.active ? 'currentColor' : 'none'} />
                  {:else if ind.iconType === 'supercruise'}
                    <polyline points="10,24 18,14 26,24" />
                    <polyline points="10,18 18,8 26,18" />
                  {:else if ind.iconType === 'danger' || ind.iconType === 'heat'}
                    <polygon points="18,7 29,27 7,27" />
                    <line x1="18" y1="14" x2="18" y2="21" />
                    <circle cx="18" cy="24" r="1.2" fill="currentColor" />
                  {:else if ind.iconType === 'fuel'}
                    <path d="M18 8C18 8 11 16 11 21C11 25 14 28 18 28C22 28 25 25 25 21C25 16 18 8 18 8Z" />
                  {:else if ind.iconType === 'srv'}
                    <path d="M9 20L13 13H23L27 20H9Z" />
                    <circle cx="11" cy="24" r="2.2" />
                    <circle cx="18" cy="24" r="2.2" />
                    <circle cx="25" cy="24" r="2.2" />
                  {:else if ind.iconType === 'onfoot'}
                    <circle cx="18" cy="14" r="5" />
                    <path d="M10 28C10 23 13.5 20 18 20C22.5 20 26 23 26 28" />
                  {:else}
                    <polygon points="18,7 29,18 18,29 7,18" />
                    <circle cx="18" cy="18" r="3" fill={ind.active ? 'currentColor' : 'none'} />
                  {/if}
                </svg>
              </div>

              <div class="w-full text-center">
                <div class="text-[10px] font-bold tracking-wider truncate">{ind.shortCode}</div>
                <div class="text-[8px] uppercase tracking-widest opacity-80">
                  {ind.active ? 'ACTIVE' : 'OFF'}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Raw 32-Bit Flags & Flags2 Bitmask Register Readout -->
      <div class="p-2.5 rounded bg-black/90 border border-white/10 space-y-1 text-[10px]">
        <div class="flex flex-wrap items-center justify-between gap-1">
          <span class="text-white/50 font-bold">FLAGS (32-BIT):</span>
          <span class="text-[var(--hud-orange)] font-bold">{formatHex32(rawFlags)}</span>
          <span class="text-[9px] text-white/60 font-mono">{formatBin32Grouped(rawFlags)}</span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-1">
          <span class="text-white/50 font-bold">FLAGS2 (ODYSSEY):</span>
          <span class="text-cyan-300 font-bold">{formatHex32(rawFlags2)}</span>
          <span class="text-[9px] text-white/60 font-mono">{formatBin32Grouped(rawFlags2)}</span>
        </div>
      </div>
    </div>

    <!-- CENTER COLUMN (3 cols): Task 3 - Power Distributor Pips, Fuel Reservoir & Active Firegroup -->
    <div class="lg:col-span-3 flex flex-col justify-between rounded bg-black/75 border border-[var(--hud-orange)]/30 p-3 space-y-3">
      <div>
        <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2 mb-2.5">
          <div>
            <div class="text-[11px] font-bold text-[var(--hud-orange)] uppercase tracking-wider">
              CAPACITOR PIPS (SYS / ENG / WEP)
            </div>
            <div class="text-[9px] text-white/45">
              Half-Pip Precision [0..8] ? Total 6.0 Pips
            </div>
          </div>
          <span class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)]/20 text-[var(--hud-amber)] text-[10px] font-bold">
            {formatPipValue(pips[0])} / {formatPipValue(pips[1])} / {formatPipValue(pips[2])}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2.5 bg-black/80 p-3 rounded border border-white/10">
          {#each [
            { label: 'SYS', idx: 0, color: '#00E5FF', textClass: 'text-cyan-300' },
            { label: 'ENG', idx: 1, color: '#FF9900', textClass: 'text-[var(--hud-amber)]' },
            { label: 'WEP', idx: 2, color: '#FF5500', textClass: 'text-[var(--hud-orange)]' }
          ] as col}
            {@const halfPips = pips[col.idx]}
            <div class="flex flex-col items-center">
              <span class="text-[10px] font-bold {col.textClass} mb-1.5">{col.label}</span>
              <div class="w-full space-y-1">
                {#each [4, 3, 2, 1] as pipSlot}
                  {@const fullThreshold = pipSlot * 2}
                  {@const halfThreshold = fullThreshold - 1}
                  {@const isFull = halfPips >= fullThreshold}
                  {@const isHalf = !isFull && halfPips === halfThreshold}
                  <div class="w-full h-3.5 rounded-sm bg-white/10 border border-white/15 overflow-hidden flex">
                    {#if isFull}
                      <div
                        class="w-full h-full transition-all"
                        style="background-color: {col.color}; box-shadow: 0 0 8px {col.color};"
                      ></div>
                    {:else if isHalf}
                      <div
                        class="w-1/2 h-full transition-all"
                        style="background-color: {col.color};"
                      ></div>
                    {/if}
                  </div>
                {/each}
              </div>
              <span class="mt-1.5 text-[11px] font-bold text-white">
                {formatPipValue(halfPips)} <span class="text-[9px] text-white/40">({halfPips}/8)</span>
              </span>
            </div>
          {/each}
        </div>

        <div class="grid grid-cols-4 gap-1 mt-2">
          <button
            type="button"
            onclick={() => handlePipsPreset([4, 4, 4])}
            class="px-1.5 py-1 rounded bg-white/5 hover:bg-[var(--hud-orange)]/20 border border-white/10 text-[9px] text-white/80 font-bold"
          >
            2-2-2 BAL
          </button>
          <button
            type="button"
            onclick={() => handlePipsPreset([8, 4, 0])}
            class="px-1.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[9px] text-cyan-300 font-bold"
          >
            4-2-0 TANK
          </button>
          <button
            type="button"
            onclick={() => handlePipsPreset([4, 8, 0])}
            class="px-1.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[9px] text-amber-300 font-bold"
          >
            2-4-0 SPEED
          </button>
          <button
            type="button"
            onclick={() => handlePipsPreset([2, 2, 8])}
            class="px-1.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[9px] text-red-300 font-bold"
          >
            1-1-4 ATK
          </button>
        </div>
      </div>

      <!-- Active Firegroup Selector (A - H) -->
      <div class="p-2.5 rounded bg-black/85 border border-white/10">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] text-white/50 uppercase font-bold">ACTIVE FIREGROUP:</span>
          <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px]">
            GROUP {fireGroupLetter} (INDEX {fireGroupIndex})
          </span>
        </div>
        <div class="grid grid-cols-8 gap-1">
          {#each FIRE_GROUP_LETTERS as letter, idx}
            <button
              type="button"
              onclick={() => handleSelectFireGroup(idx)}
              class="py-1 rounded text-[10px] font-bold transition-colors {fireGroupIndex === idx
                ? 'bg-[var(--hud-orange)] text-black shadow-[0_0_8px_rgba(255,113,0,0.5)]'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/15'}"
            >
              {letter}
            </button>
          {/each}
        </div>
      </div>

      <!-- Task 3: Dual-Stage Fuel System (FuelReservoir + Segmented FuelMain) -->
      <div class="p-2.5 rounded bg-black/90 border border-[var(--hud-orange)]/30 space-y-2">
        <div>
          <div class="flex items-center justify-between text-[10px] mb-0.5">
            <span class="text-white/60 uppercase">RESERVOIR (ACTIVE SYS):</span>
            <span class="text-cyan-300 font-bold">{fuelReservoir.toFixed(2)} / 1.00 t</span>
          </div>
          <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-cyan-400 transition-all duration-300"
              style="width: {fuelReservoirPercent}%"
            ></div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-[10px] mb-0.5">
            <span class="text-white/60 uppercase">FUEL MAIN TANK:</span>
            <span class="{decodedFlags.lowFuel ? 'text-red-400 animate-pulse' : 'text-[var(--hud-amber)]'} font-bold">
              {fuelMain.toFixed(1)} / {fuelCapacity.toFixed(1)} t ({fuelMainPercent.toFixed(0)}%)
            </span>
          </div>
          <div class="w-full h-3 bg-white/10 rounded overflow-hidden p-0.5 flex gap-0.5">
            {#each Array(16) as _, segIdx}
              {@const segThreshold = ((segIdx + 1) / 16) * 100}
              {@const segActive = fuelMainPercent >= segThreshold - 3}
              <div
                class="flex-1 h-full rounded-[1px] transition-all {segActive
                  ? decodedFlags.lowFuel
                    ? 'bg-red-500'
                    : 'bg-[var(--hud-orange)]'
                  : 'bg-white/5'}"
              ></div>
            {/each}
          </div>
        </div>

        <div class="flex items-center justify-between text-[9px] text-white/50 pt-1 border-t border-white/10">
          <span>GUI FOCUS: <strong class="text-white/80">{guiFocusLabel}</strong></span>
          <span>LEGAL: <strong class="{statusSnap?.legalState === 'Clean' ? 'text-emerald-300' : 'text-red-400'}">{statusSnap?.legalState ?? 'Clean'}</strong></span>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN (4 cols): Task 4 - Planetary Approach Altimeter, Heading Compass, Lat/Lon & Surface Gravity (G) -->
    <div class="lg:col-span-4 flex flex-col justify-between rounded bg-black/75 border border-[var(--hud-orange)]/30 p-3 space-y-3">
      <div>
        <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/25 pb-2 mb-2.5">
          <div>
            <div class="text-[11px] font-bold text-[var(--hud-orange)] uppercase tracking-wider">
              PLANETARY APPROACH &amp; ORBITAL AVIONICS
            </div>
            <div class="text-[9px] text-white/45">
              Body: <span class="text-[var(--hud-amber)] font-bold">{planetary.bodyName}</span>
            </div>
          </div>

          <span
            class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {planetary.gravityWarningLevel === 'DANGER_HIGH_G'
              ? 'bg-red-600/30 border border-red-500 text-red-200 animate-pulse'
              : planetary.gravityWarningLevel === 'CAUTION_MODERATE_G'
                ? 'bg-amber-500/25 border border-amber-400 text-amber-200'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'}"
          >
            {planetary.surfaceGravityG.toFixed(2)} G
          </span>
        </div>

        <div class="relative rounded bg-[#0c0804] border border-[var(--hud-orange)]/35 p-3 overflow-hidden">
          <div class="flex items-center justify-between text-[10px] mb-2 pb-1.5 border-b border-[var(--hud-orange)]/20">
            <span class="text-white/50">HDG TAPE:</span>
            <div class="flex items-center space-x-3 font-bold text-[var(--hud-amber)]">
              <span class="text-white/35">{((planetary.headingDeg - 15 + 360) % 360).toFixed(0).padStart(3, '0')}?</span>
              <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/25 border border-[var(--hud-orange)] text-[var(--hud-orange)]">
                ? {planetary.headingDeg.toFixed(0).padStart(3, '0')}?
              </span>
              <span class="text-white/35">{((planetary.headingDeg + 15) % 360).toFixed(0).padStart(3, '0')}?</span>
            </div>
            <span class="text-[9px] text-cyan-300 font-bold">
              {planetary.glideModeActive
                ? 'GLIDE 2,500 m/s'
                : planetary.orbitalCruiseActive
                  ? 'ORBITAL CRUISE'
                  : planetary.isApproachingOrOnBody
                    ? 'SURFACE FLIGHT'
                    : 'DEEP SPACE'}
            </span>
          </div>

          <div class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-8 flex flex-col items-center justify-center">
              <svg class="w-full h-28" viewBox="0 0 200 100" fill="none">
                <line x1="15" y1="50" x2="75" y2="50" stroke="#FF7100" stroke-width="1.5" stroke-dasharray="4 2" />
                <line x1="125" y1="50" x2="185" y2="50" stroke="#FF7100" stroke-width="1.5" stroke-dasharray="4 2" />
                <line x1="45" y1="26" x2="75" y2="26" stroke="#FF9900" stroke-width="1.2" stroke-opacity="0.6" />
                <line x1="125" y1="26" x2="155" y2="26" stroke="#FF9900" stroke-width="1.2" stroke-opacity="0.6" />
                <line x1="45" y1="74" x2="75" y2="74" stroke="#FF9900" stroke-width="1.2" stroke-opacity="0.6" />
                <line x1="125" y1="74" x2="155" y2="74" stroke="#FF9900" stroke-width="1.2" stroke-opacity="0.6" />
                <circle cx="100" cy="50" r="10" stroke={planetary.glideModeActive ? '#00E5FF' : '#FF7100'} stroke-width="1.8" />
                <line x1="84" y1="50" x2="90" y2="50" stroke="#FF7100" stroke-width="1.8" />
                <line x1="110" y1="50" x2="116" y2="50" stroke="#FF7100" stroke-width="1.8" />
                <line x1="100" y1="34" x2="100" y2="40" stroke="#FF7100" stroke-width="1.8" />
                <circle cx="100" cy="50" r="2" fill="#FF9900" />
              </svg>
            </div>

            <div class="col-span-4 flex flex-col justify-between h-28 p-2 rounded bg-black/80 border border-[var(--hud-orange)]/30">
              <div class="text-[9px] text-white/50 uppercase flex justify-between">
                <span>ALT</span>
                <span class="text-[8px] text-[var(--hud-amber)]">
                  {planetary.altitudeFromAvgRadius ? 'AVG-R' : 'RADAR'}
                </span>
              </div>
              <div class="my-auto">
                <div class="text-sm font-bold text-[var(--hud-orange)]">
                  {planetary.altitudeMeters >= 10000
                    ? `${planetary.altitudeKm.toFixed(2)} km`
                    : `${planetary.altitudeMeters.toLocaleString()} m`}
                </div>
                <div class="text-[9px] text-white/45">
                  ({planetary.altitudeMeters.toLocaleString()} m)
                </div>
              </div>
              <div class="w-full h-1.5 bg-white/10 rounded overflow-hidden">
                <div
                  class="h-full bg-[var(--hud-orange)] transition-all"
                  style="width: {Math.min(100, Math.max(5, (planetary.altitudeMeters / 50000) * 100))}%"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-[10px]">
        <div class="p-2 rounded bg-black/85 border border-white/10">
          <div class="text-white/45 text-[9px] uppercase">LATITUDE / LONGITUDE</div>
          <div class="text-[var(--hud-amber)] font-bold mt-0.5">
            {planetary.latitudeDeg.toFixed(4)}? / {planetary.longitudeDeg.toFixed(4)}?
          </div>
        </div>

        <div class="p-2 rounded bg-black/85 border border-white/10">
          <div class="text-white/45 text-[9px] uppercase">SURFACE GRAVITY / RADIUS</div>
          <div class="font-bold mt-0.5 {planetary.gravityWarningLevel === 'DANGER_HIGH_G' ? 'text-red-400' : 'text-emerald-300'}">
            {planetary.surfaceGravityG.toFixed(2)} G
            <span class="text-white/50 font-normal">
              ({planetary.planetRadiusKm > 0 ? `${planetary.planetRadiusKm.toLocaleString()} km` : 'N/A'})
            </span>
          </div>
        </div>
      </div>

      <div class="p-2 rounded bg-black/90 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div>
          <span class="text-white/45">NAV LOCK:</span>
          <span class="text-white font-bold ml-1">
            {statusSnap?.destinationName ?? activeSlot?.stationName ?? 'Unassigned'}
          </span>
          {#if statusSnap?.destinationSystemId64}
            <span class="text-[9px] text-cyan-300/80 ml-1">
              [id64: {statusSnap.destinationSystemId64}]
            </span>
          {/if}
        </div>
        {#if decodedFlags.onFoot}
          <div class="flex items-center space-x-2 text-cyan-300 font-bold">
            <span>O2: {((statusSnap?.oxygen ?? 1) * 100).toFixed(0)}%</span>
            <span>TEMP: {(statusSnap?.temperature ?? 290).toFixed(1)}K</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
