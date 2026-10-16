<script lang="ts">
  // Location: atlas/client/src/lib/components/cockpit/GlassCockpitTouchDeck.svelte
  // Stage 12.3: Tablet/iPad Glass Cockpit Touch Layout
  // Dedicated touch-optimized secondary screen Multi-Function Display (MFD) layout for tablets, iPads,
  // and secondary sim-rig touch monitors. Strictly Frontier EULA/ToS compliant: passive telemetry,
  // flight-reference checklists, target/waypoint selection (SET_TARGET_DESTINATION), COVAS audio triggers,
  // and HUD mode switching — zero simulated keystroke or macro injection into the game.

  import { onMount, onDestroy } from 'svelte';
  import {
    bridgeClient,
    type FleetInstanceTelemetry,
    type ReverseWaypointState,
    type ReverseWaypointTarget,
  } from '$engine/bridge_client';

  interface Props {
    fleetInstances: FleetInstanceTelemetry[];
    activeInstance: FleetInstanceTelemetry;
    onSelectInstance?: (uuid: string) => void;
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
    onNotifyBanner?: (msg: string) => void;
  }

  let {
    fleetInstances,
    activeInstance,
    onSelectInstance,
    onFocusSystem,
    onNotifyBanner,
  }: Props = $props();

  type MfdMode = 'NAV_MAP' | 'SYSTEM_MAP' | 'COMMS' | 'BIO_SCANNER' | 'CARGO' | 'SUBSYSTEMS';
  type ChecklistCategory = 'PRE_FLIGHT' | 'DOCKING' | 'DEEP_SPACE';

  interface SubsystemModule {
    id: string;
    name: string;
    classRating: string;
    integrityPercent: number;
    powerDrawMw: number;
    priority: number;
    online: boolean;
  }

  interface ChecklistItem {
    id: string;
    category: ChecklistCategory;
    label: string;
    detail: string;
    checked: boolean;
  }

  interface CovasCue {
    id: string;
    code: string;
    label: string;
    phrase: string;
    freqHz: number;
    durationMs: number;
  }

  const MFD_MODES: { id: MfdMode; label: string; shortCode: string; badge: string }[] = [
    { id: 'NAV_MAP', label: 'NAV MAP', shortCode: 'MFD-01', badge: 'ROUTE' },
    { id: 'SYSTEM_MAP', label: 'SYSTEM MAP', shortCode: 'MFD-02', badge: 'BODIES' },
    { id: 'COMMS', label: 'COMMS LOG', shortCode: 'MFD-03', badge: 'SQUAD' },
    { id: 'BIO_SCANNER', label: 'BIO SCANNER', shortCode: 'MFD-04', badge: 'EXOBIO' },
    { id: 'CARGO', label: 'CARGO BAY', shortCode: 'MFD-05', badge: 'MANIFEST' },
    { id: 'SUBSYSTEMS', label: 'SUBSYSTEMS', shortCode: 'MFD-06', badge: 'MODULES' },
  ];

  const SUBSYSTEM_MODULES: SubsystemModule[] = [
    { id: 'fsd-sco', name: 'FRAME SHIFT DRIVE (SCO)', classRating: '5A', integrityPercent: 99, powerDrawMw: 0.69, priority: 1, online: true },
    { id: 'thrusters', name: 'CLEAN DRIVE THRUSTERS', classRating: '5A', integrityPercent: 100, powerDrawMw: 1.88, priority: 1, online: true },
    { id: 'power-plant', name: 'OVERCHARGED POWER PLANT', classRating: '4A', integrityPercent: 100, powerDrawMw: 0.0, priority: 1, online: true },
    { id: 'shield-gen', name: 'PRISMATIC SHIELD GENERATOR', classRating: '4A', integrityPercent: 96, powerDrawMw: 2.64, priority: 2, online: true },
    { id: 'fuel-scoop', name: 'FUEL SCOOP', classRating: '6A', integrityPercent: 100, powerDrawMw: 0.87, priority: 2, online: true },
    { id: 'guardian-booster', name: 'GUARDIAN FSD BOOSTER', classRating: '5H', integrityPercent: 98, powerDrawMw: 2.15, priority: 3, online: true },
  ];

  const COVAS_CUES: CovasCue[] = [
    { id: 'fsd-charge', code: 'CV-01', label: 'FSD CHARGE REF', phrase: 'Frame Shift Drive charging — verify star class and scoop corridor.', freqHz: 660, durationMs: 140 },
    { id: 'high-g-check', code: 'CV-02', label: 'HIGH-G DESCENT', phrase: 'Caution: Planetary gravity vector active. Monitor vertical descent rate.', freqHz: 520, durationMs: 180 },
    { id: 'fuel-scoop-ref', code: 'CV-03', label: 'KGBFOAM CHECK', phrase: 'Main fuel reservoir check complete. Scoopable OBAFGKM corridor verified.', freqHz: 780, durationMs: 120 },
    { id: 'docking-clear', code: 'CV-04', label: 'DOCKING PROTOCOL', phrase: 'Landing gear reference check. Verify 7.5 kilometer ATC request window.', freqHz: 880, durationMs: 130 },
    { id: 'bio-sample', code: 'CV-05', label: 'GENETIC DIVERGENCE', phrase: 'Exobiology genetic sample reference logged. Maintain minimum colony radius.', freqHz: 940, durationMs: 150 },
    { id: 'silent-rig', code: 'CV-06', label: 'THERMAL ADVISORY', phrase: 'Thermal signature nominal. Heatsink reference standing by.', freqHz: 440, durationMs: 160 },
  ];

  let activeMfdMode = $state<MfdMode>('NAV_MAP');
  let activeChecklistTab = $state<ChecklistCategory>('PRE_FLIGHT');
  let isFullscreen = $state<boolean>(false);
  let wakeLockActive = $state<boolean>(false);
  let wakeLockStatusText = $state<string>('STANDBY');
  let hapticsEnabled = $state<boolean>(true);
  let lastHapticPulseMs = $state<number>(0);
  let lastCovasPhrase = $state<string>('COVAS AUDIO REFERENCE READY — SELECT CUE OR MFD FUNCTION');
  let reverseState = $state<ReverseWaypointState>(bridgeClient.getReverseWaypointState());
  let deckContainerEl: HTMLDivElement | null = null;
  let wakeLockSentinel: any = null;
  let unsubReverse: (() => void) | null = null;

  let checklistItems = $state<ChecklistItem[]>([
    { id: 'pf-1', category: 'PRE_FLIGHT', label: 'VERIFY AFMU & LIMPETS', detail: 'Confirm Synthesis / Repair Capacity', checked: true },
    { id: 'pf-2', category: 'PRE_FLIGHT', label: 'CHECK ROUTE FUEL RESERVOIR', detail: 'Main Tank + Scoopable Star Filter', checked: true },
    { id: 'pf-3', category: 'PRE_FLIGHT', label: 'LOCK INITIAL WAYPOINT ID64', detail: 'Verify Nav Computer Target Lock', checked: false },
    { id: 'pf-4', category: 'PRE_FLIGHT', label: 'CALIBRATE SYS/ENG/WEP PIPS', detail: 'Verify Distributor Reference Allocation', checked: false },
    { id: 'dk-1', category: 'DOCKING', label: 'ENTER 7.50 KM ATC ZONE', detail: 'Request Starport Landing Pad Assignment', checked: true },
    { id: 'dk-2', category: 'DOCKING', label: 'SET 4 SYS / 2 ENG SHIELD PIPS', detail: 'Collision Buffer Reference Check', checked: false },
    { id: 'dk-3', category: 'DOCKING', label: 'VERIFY LANDING GEAR & SPEED < 100', detail: 'Approach Vector Alignment', checked: false },
    { id: 'ds-1', category: 'DEEP_SPACE', label: 'HONK D-SCANNER ON ENTRY', detail: 'Orbital Plane Body Discovery', checked: true },
    { id: 'ds-2', category: 'DEEP_SPACE', label: 'DSS PROBE HIGH-VALUE TERRAFORMABLES', detail: 'ELW / WW / AW / High-Metal Content', checked: false },
    { id: 'ds-3', category: 'DEEP_SPACE', label: 'VERIFY EXOBIO COLONY RADIUS', detail: '150m - 1000m Clonal Distance Check', checked: false },
  ]);

  let filteredChecklists = $derived<ChecklistItem[]>(
    checklistItems.filter((item) => item.category === activeChecklistTab)
  );

  // Derive pitch and roll attitude angles passively from live 3D velocity vector
  let pitchDeg = $derived<number>(
    Math.max(
      -45,
      Math.min(
        45,
        Math.atan2(
          activeInstance.velocity_vector.y,
          Math.max(1, Math.hypot(activeInstance.velocity_vector.x, activeInstance.velocity_vector.z))
        ) *
          (180 / Math.PI)
      )
    )
  );

  let rollDeg = $derived<number>(
    Math.max(
      -45,
      Math.min(
        45,
        Math.atan2(
          activeInstance.velocity_vector.x,
          Math.max(1, Math.abs(activeInstance.velocity_vector.z))
        ) *
          (180 / Math.PI)
      )
    )
  );

  let fuelPercent = $derived<number>(
    activeInstance.fuel_max_t > 0
      ? Math.min(100, Math.round((activeInstance.fuel_main_t / activeInstance.fuel_max_t) * 100))
      : 100
  );

  function triggerHaptic(pattern: number | number[] = 18) {
    lastHapticPulseMs = Date.now();
    if (!hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on desktop browsers without vibration hardware
    }
  }

  function playSynthesizedTone(freqHz: number, durationMs: number) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Fallback silent if audio context blocked
    }
  }

  async function requestScreenWakeLock() {
    triggerHaptic(25);
    try {
      const navAny = navigator as any;
      if (navAny && navAny.wakeLock && typeof navAny.wakeLock.request === 'function') {
        wakeLockSentinel = await navAny.wakeLock.request('screen');
        wakeLockActive = true;
        wakeLockStatusText = 'LOCKED (SCREEN AWAKE)';
        wakeLockSentinel.addEventListener?.('release', () => {
          wakeLockActive = false;
          wakeLockStatusText = 'RELEASED';
        });
      } else {
        wakeLockActive = !wakeLockActive;
        wakeLockStatusText = wakeLockActive ? 'SIMULATED KEEP-AWAKE' : 'STANDBY';
      }
    } catch {
      wakeLockActive = !wakeLockActive;
      wakeLockStatusText = wakeLockActive ? 'PWA WAKE-LOCK ACTIVE' : 'STANDBY';
    }
  }

  async function releaseScreenWakeLock() {
    triggerHaptic(15);
    try {
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        await wakeLockSentinel.release();
      }
    } catch {
      // Ignore release errors
    }
    wakeLockSentinel = null;
    wakeLockActive = false;
    wakeLockStatusText = 'STANDBY';
  }

  async function toggleWakeLock() {
    if (wakeLockActive) {
      await releaseScreenWakeLock();
    } else {
      await requestScreenWakeLock();
    }
  }

  async function toggleFullscreenDeck() {
    triggerHaptic([20, 40, 20]);
    try {
      if (!document.fullscreenElement && deckContainerEl?.requestFullscreen) {
        await deckContainerEl.requestFullscreen();
        isFullscreen = true;
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        isFullscreen = false;
      } else {
        isFullscreen = !isFullscreen;
      }
    } catch {
      isFullscreen = !isFullscreen;
    }
  }

  function handleSelectMfdMode(mode: MfdMode) {
    triggerHaptic(22);
    activeMfdMode = mode;
    playSynthesizedTone(720, 75);
  }

  function handleLockWaypointTouch(hop: ReverseWaypointTarget) {
    triggerHaptic([25, 35, 25]);
    playSynthesizedTone(880, 110);
    bridgeClient.injectNavTarget(hop.system_name, String(hop.system_id64), {
      bodyName: hop.body_name,
      bodyId64: hop.body_id64 ? String(hop.body_id64) : undefined,
      starPos: hop.star_pos,
    });
    if (hop.star_pos && onFocusSystem) {
      onFocusSystem(
        { x: hop.star_pos[0], y: hop.star_pos[1], z: hop.star_pos[2] },
        hop.system_name
      );
    }
    onNotifyBanner?.(
      `Touch MFD Target Locked in Nav Computer: ${hop.system_name} [id64: ${String(hop.system_id64)}]`
    );
  }

  function handleTriggerCovas(cue: CovasCue) {
    triggerHaptic([18, 25, 18]);
    playSynthesizedTone(cue.freqHz, cue.durationMs);
    lastCovasPhrase = `[${cue.code}] "${cue.phrase}"`;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cue.phrase);
        utter.rate = 1.05;
        utter.pitch = 0.95;
        utter.volume = 0.75;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Speech synthesis optional
    }
  }

  function handleToggleChecklist(id: string) {
    triggerHaptic(16);
    playSynthesizedTone(640, 60);
    checklistItems = checklistItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
  }

  function handleSwitchCommanderTouch(uuid: string) {
    triggerHaptic([20, 30]);
    playSynthesizedTone(760, 90);
    bridgeClient.setActiveInstanceUuid(uuid);
    onSelectInstance?.(uuid);
  }

  onMount(() => {
    unsubReverse = bridgeClient.subscribeReverseWaypoint((nextState) => {
      reverseState = nextState;
    });
    requestScreenWakeLock();
  });

  onDestroy(() => {
    if (unsubReverse) unsubReverse();
    if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
      wakeLockSentinel.release().catch(() => {});
    }
  });
</script>

<div
  bind:this={deckContainerEl}
  class="touch-cockpit-root select-none bg-[#050507] border-2 border-[#FF7100]/70 rounded-lg p-3 text-xs font-mono text-white flex flex-col justify-between gap-2.5 overflow-hidden"
>
  <!-- Top Glass Cockpit Hardware Status & PWA / Wake-Lock / Haptic Touch Bar -->
  <div class="flex flex-wrap items-center justify-between gap-2 bg-black/90 border border-[#FF7100]/40 rounded px-3 py-2">
    <div class="flex items-center space-x-3">
      <span class="px-2.5 py-1 rounded bg-[#FF7100] text-black font-bold uppercase tracking-widest text-[11px]">
        STAGE 12.3 GLASS COCKPIT MFD
      </span>
      <div>
        <div class="text-[#FF7100] font-bold uppercase tracking-wider text-xs">
          {activeInstance.ship_name} ({activeInstance.ship_type}) • {activeInstance.cmdr_name}
        </div>
        <div class="text-[10px] text-white/60">
          CMDR id64: <span class="text-cyan-300">{activeInstance.cmdr_id64}</span> • SYS:
          <span class="text-amber-300 font-bold">{activeInstance.current_system}</span>
          (<span class="text-cyan-300">{activeInstance.system_id64}</span>)
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- Screen Wake-Lock Toggle (>= 64px x 64px touch target compliance) -->
      <button
        type="button"
        onclick={toggleWakeLock}
        class="touch-mfd-btn min-w-[136px] min-h-[64px] px-3 py-1.5 rounded border-2 flex flex-col items-center justify-center transition-all {wakeLockActive
          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          : 'bg-black/80 border-white/25 text-white/70 hover:border-[#FF7100]'}"
      >
        <span class="text-[10px] uppercase tracking-widest opacity-75">PWA WAKE-LOCK</span>
        <span class="text-xs font-bold mt-0.5">{wakeLockActive ? 'SCREEN LOCKED ON' : 'WAKE STANDBY'}</span>
        <span class="text-[9px] text-cyan-300">{wakeLockStatusText}</span>
      </button>

      <!-- Haptic Vibration Toggle (>= 64px x 64px touch target) -->
      <button
        type="button"
        onclick={() => {
          hapticsEnabled = !hapticsEnabled;
          triggerHaptic(30);
        }}
        class="touch-mfd-btn min-w-[128px] min-h-[64px] px-3 py-1.5 rounded border-2 flex flex-col items-center justify-center transition-all {hapticsEnabled
          ? 'bg-[#FF7100]/20 border-[#FF7100] text-[#FF7100]'
          : 'bg-black/80 border-white/25 text-white/50'}"
      >
        <span class="text-[10px] uppercase tracking-widest opacity-75">TOUCH HAPTICS</span>
        <span class="text-xs font-bold mt-0.5">{hapticsEnabled ? 'VIBRATE ACTIVE' : 'MUTED'}</span>
        <span class="text-[9px] text-white/60">navigator.vibrate</span>
      </button>

      <!-- Full-Screen Sim-Rig Mode (>= 64px x 64px touch target) -->
      <button
        type="button"
        onclick={toggleFullscreenDeck}
        class="touch-mfd-btn min-w-[136px] min-h-[64px] px-3 py-1.5 rounded border-2 flex flex-col items-center justify-center transition-all {isFullscreen
          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
          : 'bg-black/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/15'}"
      >
        <span class="text-[10px] uppercase tracking-widest opacity-75">DISPLAY MODE</span>
        <span class="text-xs font-bold mt-0.5">{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN RIG'}</span>
        <span class="text-[9px] text-white/60">Zero-Scroll MFD</span>
      </button>
    </div>
  </div>

  <!-- Task 12.3.2: 6-Button Touch Interactive MFD Mode Selector Bar (All >= 64px x 64px) -->
  <div class="grid grid-cols-6 gap-2">
    {#each MFD_MODES as mode}
      <button
        type="button"
        onclick={() => handleSelectMfdMode(mode.id)}
        class="touch-mfd-btn min-h-[68px] px-2 py-2 rounded border-2 flex flex-col items-center justify-center transition-all {activeMfdMode === mode.id
          ? 'bg-[#FF7100] border-amber-200 text-black shadow-[0_0_18px_rgba(255,113,0,0.45)]'
          : 'bg-black/85 border-[#FF7100]/40 text-[#FF7100] hover:bg-[#FF7100]/15'}"
      >
        <div class="flex items-center justify-between w-full px-1 text-[9px] font-bold opacity-80">
          <span>{mode.shortCode}</span>
          <span class="px-1 rounded {activeMfdMode === mode.id ? 'bg-black/20 text-black' : 'bg-[#FF7100]/20 text-amber-300'}">
            {mode.badge}
          </span>
        </div>
        <div class="text-xs font-extrabold uppercase tracking-wider mt-1">{mode.label}</div>
      </button>
    {/each}
  </div>

  <!-- 3-Column Glass Cockpit MFD Grid (Left MFD / Center PFD / Right MFD) -->
  <div class="grid grid-cols-12 gap-3 flex-1 min-h-[410px]">
    <!-- LEFT MFD (4 Cols): Tactical Radar, Target Subsystem Health & Waypoint Quick-Select -->
    <div class="col-span-4 bg-black/90 border-2 border-[#FF7100]/45 rounded-lg p-3 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between border-b border-[#FF7100]/30 pb-1.5 mb-2">
          <span class="text-[#FF7100] font-bold uppercase tracking-wider text-xs">
            LEFT MFD • {activeMfdMode} VIEW
          </span>
          <span class="px-2 py-0.5 rounded bg-[#FF7100]/20 text-[#FF7100] text-[10px] font-bold">
            PASSIVE TELEMETRY
          </span>
        </div>

        <!-- Target Lock & Concentric Shield Ring SVG Readout -->
        <div class="p-2.5 rounded bg-[#0a0a0f] border border-white/15 mb-2.5">
          <div class="flex items-center gap-3">
            <!-- Concentric Shield & Hull Ring SVG -->
            <svg viewBox="0 0 88 88" class="w-20 h-20 shrink-0">
              <!-- Outer Radar Grid -->
              <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,113,0,0.22)" stroke-width="1.5" stroke-dasharray="3 2" />
              <!-- Target Shield Ring -->
              <circle
                cx="44"
                cy="44"
                r="33"
                fill="none"
                stroke="#22d3ee"
                stroke-width="5"
                stroke-dasharray="{Math.round((activeInstance.target_lock.targetShieldPercent / 100) * 207)} 207"
                transform="rotate(-90 44 44)"
              />
              <!-- Target Hull Ring -->
              <circle
                cx="44"
                cy="44"
                r="24"
                fill="none"
                stroke="#FF7100"
                stroke-width="5"
                stroke-dasharray="{Math.round((activeInstance.target_lock.targetHullPercent / 100) * 150)} 150"
                transform="rotate(-90 44 44)"
              />
              <line x1="44" y1="8" x2="44" y2="80" stroke="rgba(255,113,0,0.25)" stroke-width="1" />
              <line x1="8" y1="44" x2="80" y2="44" stroke="rgba(255,113,0,0.25)" stroke-width="1" />
              <text x="44" y="42" text-anchor="middle" fill="#22d3ee" font-size="10" font-weight="bold">
                {activeInstance.target_lock.targetShieldPercent}%
              </text>
              <text x="44" y="54" text-anchor="middle" fill="#FF7100" font-size="9" font-weight="bold">
                H:{activeInstance.target_lock.targetHullPercent}%
              </text>
            </svg>

            <div class="flex-1 min-w-0 space-y-1 text-[11px]">
              <div class="flex items-center justify-between">
                <span class="text-white/50">LOCK:</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold {activeInstance.target_lock.locked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/50'}">
                  {activeInstance.target_lock.locked ? 'TARGET LOCKED' : 'NO LOCK'}
                </span>
              </div>
              <div class="text-[#FF7100] font-bold truncate">{activeInstance.target_lock.targetName}</div>
              <div class="text-white/70 truncate text-[10px]">{activeInstance.target_lock.targetShipType}</div>
              <div class="text-cyan-300 font-mono text-[10px] truncate">
                id64: {activeInstance.target_lock.targetSystemId64}
              </div>
              <div class="text-emerald-300 font-bold text-[10px]">
                RNG: {(activeInstance.target_lock.targetDistanceM / 1000).toFixed(2)} km
              </div>
            </div>
          </div>
        </div>

        <!-- Contextual MFD Sub-Panel based on activeMfdMode -->
        {#if activeMfdMode === 'SUBSYSTEMS'}
          <div class="space-y-1.5">
            <div class="text-[10px] text-amber-300 uppercase font-bold tracking-wider">
              SHIP SUBSYSTEM INTEGRITY & POWER DRAW
            </div>
            {#each SUBSYSTEM_MODULES as mod}
              <div class="px-2.5 py-1.5 rounded bg-black border border-white/10 flex items-center justify-between text-[10px]">
                <div>
                  <span class="text-[#FF7100] font-bold">[{mod.classRating}]</span>
                  <span class="text-white ml-1 font-bold">{mod.name}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-cyan-300">{mod.powerDrawMw.toFixed(2)} MW</span>
                  <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {mod.integrityPercent}%
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else if activeMfdMode === 'BIO_SCANNER'}
          <div class="space-y-2 p-2.5 rounded bg-black border border-emerald-500/40">
            <div class="flex items-center justify-between">
              <span class="text-emerald-300 font-bold uppercase text-[11px]">EXOBIOLOGY GENUS REFERENCE</span>
              <span class="text-[10px] text-cyan-300">VISTA GENOMICS</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5 text-[10px]">
              <div class="p-2 rounded bg-emerald-950/30 border border-emerald-500/30">
                <div class="text-emerald-300 font-bold">STRATUM TECTONICAS</div>
                <div class="text-white/70">Colony Radius: 500m</div>
                <div class="text-[#FF7100] font-bold">19,010,800 CR</div>
              </div>
              <div class="p-2 rounded bg-emerald-950/30 border border-emerald-500/30">
                <div class="text-emerald-300 font-bold">CLYPEUS LACRIMAM</div>
                <div class="text-white/70">Colony Radius: 150m</div>
                <div class="text-[#FF7100] font-bold">8,418,000 CR</div>
              </div>
              <div class="p-2 rounded bg-emerald-950/30 border border-emerald-500/30">
                <div class="text-emerald-300 font-bold">ALEOIDA GRAVIS</div>
                <div class="text-white/70">Colony Radius: 150m</div>
                <div class="text-[#FF7100] font-bold">12,934,900 CR</div>
              </div>
              <div class="p-2 rounded bg-emerald-950/30 border border-emerald-500/30">
                <div class="text-emerald-300 font-bold">FRUTEXA METALLICUM</div>
                <div class="text-white/70">Colony Radius: 150m</div>
                <div class="text-[#FF7100] font-bold">1,632,500 CR</div>
              </div>
            </div>
          </div>
        {:else}
          <!-- Waypoint Queue Quick-Select Touch Buttons (SET_TARGET_DESTINATION) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-amber-300 font-bold uppercase tracking-wider">
                WAYPOINT QUEUE QUICK-LOCK (`SET_TARGET_DESTINATION`)
              </span>
              <span class="text-cyan-300">{reverseState.routeQueue.length} HOPS</span>
            </div>
            <div class="grid grid-cols-1 gap-1.5">
              {#each reverseState.routeQueue.slice(0, 3) as hop, idx}
                <button
                  type="button"
                  onclick={() => handleLockWaypointTouch(hop)}
                  class="touch-mfd-btn min-h-[64px] w-full px-3 py-2 rounded border-2 flex items-center justify-between text-left transition-all {idx === reverseState.activeRouteIndex
                    ? 'bg-[#FF7100]/20 border-[#FF7100] text-white'
                    : 'bg-black/80 border-white/20 text-white/80 hover:border-[#FF7100]/60'}"
                >
                  <div class="min-w-0 pr-2">
                    <div class="flex items-center space-x-1.5">
                      <span class="px-1.5 py-0.5 rounded bg-[#FF7100] text-black font-extrabold text-[9px]">
                        HOP #{idx + 1}
                      </span>
                      <span class="font-bold text-xs text-[#FF7100] truncate">{hop.system_name}</span>
                    </div>
                    <div class="text-[10px] text-cyan-300 font-mono truncate mt-0.5">
                      id64: {hop.system_id64} {hop.body_name ? `• ${hop.body_name}` : ''}
                    </div>
                  </div>
                  <span class="px-2.5 py-1.5 rounded bg-[#FF7100] text-black font-extrabold text-[10px] uppercase shrink-0">
                    LOCK NAV
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
        <span>MODE: {activeMfdMode}</span>
        <span class="text-emerald-300">PASSIVE EULA/TOS SAFE</span>
      </div>
    </div>

    <!-- CENTER MFD (4 Cols): Primary Flight Display (PFD) Attitude Director, Pips & Gauges -->
    <div class="col-span-4 bg-black/90 border-2 border-[#FF7100]/60 rounded-lg p-3 flex flex-col justify-between">
      <div class="flex items-center justify-between border-b border-[#FF7100]/30 pb-1.5">
        <span class="text-[#FF7100] font-bold uppercase tracking-wider text-xs">
          CENTER PFD • ATTITUDE & CAPACITORS
        </span>
        <span class="text-cyan-300 font-bold text-[11px]">
          {activeInstance.supercruise ? 'SUPERCRUISE' : 'NORMAL SPACE'}
        </span>
      </div>

      <!-- Pitch/Roll Artificial Horizon Attitude Director SVG -->
      <div class="my-1.5 p-2 rounded bg-[#07070c] border border-[#FF7100]/35 flex flex-col items-center">
        <svg viewBox="0 0 220 128" class="w-full h-32">
          <defs>
            <clipPath id="pfd-horizon-clip">
              <rect x="10" y="6" width="200" height="116" rx="8" />
            </clipPath>
          </defs>
          <g clip-path="url(#pfd-horizon-clip)">
            <rect x="10" y="6" width="200" height="116" fill="#05060a" />
            <!-- Pitch & Roll Dynamic Horizon Group -->
            <g transform="translate(110, 64) rotate({rollDeg.toFixed(1)}) translate(0, {(pitchDeg * 1.1).toFixed(1)})">
              <!-- Ground / Planetary Hemisphere -->
              <rect x="-140" y="0" width="280" height="140" fill="rgba(255, 113, 0, 0.12)" />
              <!-- Artificial Horizon Line -->
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#FF7100" stroke-width="2" />
              <!-- Pitch Ladder Rungs -->
              <line x1="-35" y1="-22" x2="35" y2="-22" stroke="#22d3ee" stroke-width="1.5" />
              <line x1="-22" y1="-44" x2="22" y2="-44" stroke="#22d3ee" stroke-width="1.5" />
              <line x1="-35" y1="22" x2="35" y2="22" stroke="#FF7100" stroke-width="1.5" stroke-dasharray="4 2" />
              <line x1="-22" y1="44" x2="22" y2="44" stroke="#FF7100" stroke-width="1.5" stroke-dasharray="4 2" />
            </g>
            <!-- Fixed Ship Bore-Sight Reticle -->
            <path d="M 78 64 L 98 64 L 103 70 M 142 64 L 122 64 L 117 70" fill="none" stroke="#ffffff" stroke-width="2.2" />
            <circle cx="110" cy="64" r="3" fill="#FF7100" />
          </g>
          <!-- Outer PFD Bezel -->
          <rect x="10" y="6" width="200" height="116" rx="8" fill="none" stroke="rgba(255,113,0,0.5)" stroke-width="1.5" />
          <text x="18" y="20" fill="#FF7100" font-size="9" font-weight="bold">PITCH: {pitchDeg.toFixed(1)}°</text>
          <text x="150" y="20" fill="#22d3ee" font-size="9" font-weight="bold">ROLL: {rollDeg.toFixed(1)}°</text>
          <text x="18" y="115" fill="#10b981" font-size="9" font-weight="bold">SPD: {activeInstance.speed_ms.toFixed(0)} m/s</text>
          <text x="136" y="115" fill="#fbbf24" font-size="9" font-weight="bold">ALT: {(activeInstance.altitude_m / 1000).toFixed(1)} km</text>
        </svg>
      </div>

      <!-- SYS / ENG / WEP Capacitor Telemetry Bars (Passive Memory Mirror) -->
      <div class="grid grid-cols-3 gap-2 my-1">
        {#each [
          { label: 'SYS', halfPips: activeInstance.pips.sys, color: 'bg-cyan-400', text: 'text-cyan-300' },
          { label: 'ENG', halfPips: activeInstance.pips.eng, color: 'bg-emerald-400', text: 'text-emerald-300' },
          { label: 'WEP', halfPips: activeInstance.pips.wep, color: 'bg-[#FF7100]', text: 'text-[#FF7100]' }
        ] as cap}
          <div class="p-2 rounded bg-black border border-white/15 flex flex-col items-center">
            <div class="flex items-center justify-between w-full text-[10px] mb-1">
              <span class="font-bold text-white/70">{cap.label}</span>
              <span class="font-extrabold {cap.text}">{(cap.halfPips / 2).toFixed(1)}</span>
            </div>
            <div class="grid grid-cols-4 gap-1 w-full h-3">
              {#each [0, 1, 2, 3] as seg}
                <div
                  class="rounded-sm border border-white/20 {cap.halfPips >= (seg + 1) * 2
                    ? cap.color
                    : cap.halfPips === seg * 2 + 1
                      ? `${cap.color} opacity-50`
                      : 'bg-white/5'}"
                ></div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Fuel, Heat, and Surface Gravity Gauges -->
      <div class="grid grid-cols-3 gap-2 my-1 text-[10px]">
        <div class="p-2 rounded bg-black border border-white/15">
          <div class="text-white/50">FUEL TANK</div>
          <div class="text-sm font-extrabold text-[#FF7100]">
            {activeInstance.fuel_main_t.toFixed(1)}t <span class="text-[10px] text-white/60">({fuelPercent}%)</span>
          </div>
        </div>
        <div class="p-2 rounded bg-black border border-white/15">
          <div class="text-white/50">THERMAL</div>
          <div class="text-sm font-extrabold {activeInstance.heat_percent > 80 ? 'text-red-400' : 'text-amber-300'}">
            {activeInstance.heat_percent}% HEAT
          </div>
        </div>
        <div class="p-2 rounded bg-black border border-white/15">
          <div class="text-white/50">GRAVITY</div>
          <div class="text-sm font-extrabold {activeInstance.gravity_g >= 1.5 ? 'text-red-400' : 'text-cyan-300'}">
            {activeInstance.gravity_g.toFixed(2)} G
          </div>
        </div>
      </div>

      <!-- Status Flag Touch Indicators (>= 64px height interactive reference tiles) -->
      <div class="grid grid-cols-4 gap-1.5 pt-1">
        {#each [
          { label: 'SUPERCRUISE', active: activeInstance.supercruise, activeClass: 'bg-cyan-500/25 border-cyan-400 text-cyan-200' },
          { label: 'LANDED', active: activeInstance.landed, activeClass: 'bg-amber-500/25 border-amber-400 text-amber-200' },
          { label: 'DOCKED', active: activeInstance.docked, activeClass: 'bg-emerald-500/25 border-emerald-400 text-emerald-200' },
          { label: 'WING / SQUAD', active: activeInstance.in_wing, activeClass: 'bg-[#FF7100]/25 border-[#FF7100] text-[#FF7100]' }
        ] as flag}
          <button
            type="button"
            onclick={() => triggerHaptic(15)}
            class="touch-mfd-btn min-h-[64px] px-1.5 py-1.5 rounded border flex flex-col items-center justify-center text-center transition-all {flag.active
              ? flag.activeClass
              : 'bg-black/70 border-white/15 text-white/40'}"
          >
            <span class="text-[9px] font-bold uppercase tracking-wider">{flag.label}</span>
            <span class="text-[11px] font-extrabold mt-1">{flag.active ? 'ONLINE' : 'OFF'}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- RIGHT MFD (4 Cols): Checklists, COVAS Soundboard & Multi-Box Commander Switcher -->
    <div class="col-span-4 bg-black/90 border-2 border-[#FF7100]/45 rounded-lg p-3 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between border-b border-[#FF7100]/30 pb-1.5 mb-2">
          <span class="text-[#FF7100] font-bold uppercase tracking-wider text-xs">
            RIGHT MFD • CHECKLIST & COVAS CUES
          </span>
          <span class="text-[10px] text-emerald-300 font-bold">AUDIO + HAPTIC</span>
        </div>

        <!-- Flight Reference Checklist Category Selector -->
        <div class="grid grid-cols-3 gap-1.5 mb-2">
          {#each [
            { id: 'PRE_FLIGHT', label: 'PRE-FLIGHT' },
            { id: 'DOCKING', label: 'DOCKING' },
            { id: 'DEEP_SPACE', label: 'DEEP SPACE' }
          ] as tab}
            <button
              type="button"
              onclick={() => {
                triggerHaptic(16);
                activeChecklistTab = tab.id as ChecklistCategory;
              }}
              class="py-1.5 px-2 rounded border font-bold text-[10px] uppercase tracking-wider transition-all {activeChecklistTab === tab.id
                ? 'bg-[#FF7100] border-amber-200 text-black'
                : 'bg-black border-white/20 text-white/70 hover:text-white'}"
            >
              {tab.label}
            </button>
          {/each}
        </div>

        <!-- Touch Interactive Checklist Rows -->
        <div class="space-y-1.5 mb-2.5">
          {#each filteredChecklists.slice(0, 3) as item}
            <button
              type="button"
              onclick={() => handleToggleChecklist(item.id)}
              class="touch-mfd-btn min-h-[64px] w-full px-3 py-1.5 rounded border-2 flex items-center justify-between text-left transition-all {item.checked
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                : 'bg-black/80 border-white/20 text-white hover:border-[#FF7100]'}"
            >
              <div class="pr-2">
                <div class="text-xs font-bold uppercase">{item.label}</div>
                <div class="text-[10px] text-white/60">{item.detail}</div>
              </div>
              <span class="px-2.5 py-1 rounded font-extrabold text-[10px] {item.checked ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/60'}">
                {item.checked ? 'VERIFIED' : 'CHECK'}
              </span>
            </button>
          {/each}
        </div>

        <!-- COVAS Audio Cue Soundboard (>= 64px x 64px Touch Pads) -->
        <div class="mb-2">
          <div class="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">
            COVAS VOICE & TONE REFERENCE SOUNDBOARD
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            {#each COVAS_CUES as cue}
              <button
                type="button"
                onclick={() => handleTriggerCovas(cue)}
                class="touch-mfd-btn min-h-[64px] p-1.5 rounded border-2 border-[#FF7100]/50 bg-[#FF7100]/10 hover:bg-[#FF7100] hover:text-black text-[#FF7100] flex flex-col items-center justify-center text-center transition-all"
              >
                <span class="text-[9px] font-mono opacity-80">{cue.code}</span>
                <span class="text-[10px] font-extrabold uppercase leading-tight mt-0.5">{cue.label}</span>
              </button>
            {/each}
          </div>
          <div class="mt-1.5 px-2.5 py-1 rounded bg-black border border-cyan-500/30 text-[10px] text-cyan-300 truncate">
            🔊 {lastCovasPhrase}
          </div>
        </div>
      </div>

      <!-- Multi-Box Commander Switcher (`cmdr_id64` string preserved) -->
      <div class="pt-1.5 border-t border-white/15">
        <div class="text-[10px] text-white/60 uppercase font-bold mb-1">
          MULTI-BOX COMMANDER FOCUS (`cmdr_id64` STRING PRESERVED)
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          {#each fleetInstances as inst}
            <button
              type="button"
              onclick={() => handleSwitchCommanderTouch(inst.instance_uuid)}
              class="touch-mfd-btn min-h-[64px] px-2 py-1.5 rounded border-2 flex flex-col items-start justify-center text-left transition-all {inst.instance_uuid === activeInstance.instance_uuid
                ? 'bg-[#FF7100] border-amber-200 text-black'
                : 'bg-black/80 border-white/20 text-white/80 hover:border-[#FF7100]'}"
            >
              <span class="text-[10px] font-extrabold truncate w-full">{inst.ship_name}</span>
              <span class="text-[9px] opacity-80 truncate w-full">{inst.cmdr_name}</span>
              <span class="text-[8px] font-mono truncate w-full {inst.instance_uuid === activeInstance.instance_uuid ? 'text-black font-bold' : 'text-cyan-300'}">
                id64:{inst.cmdr_id64}
              </span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .touch-cockpit-root {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .touch-mfd-btn {
    touch-action: manipulation;
  }

  .touch-mfd-btn:active {
    transform: scale(0.97);
  }
</style>
