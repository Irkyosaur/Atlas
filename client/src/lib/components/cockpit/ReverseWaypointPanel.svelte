<script lang="ts">
  // Location: atlas/client/src/lib/components/cockpit/ReverseWaypointPanel.svelte
  // Stage 12.2: Reverse Waypoint Injection & In-Game Target Lock
  // Dispatches JSON-RPC 2.0 / IPC frames (`SET_TARGET_DESTINATION`, `nav_set_target`, `nav_queue_route`,
  // `atlas_toast_alert`, and clipboard fallback) to `EDill` (`ws://127.0.0.1:8999`) and `EdEzCheese`
  // (`nav_target_injector.rs`). Supports single or multi-box commander slots (`cmdr_id64`),
  // multi-hop route auto-advancing on `FSDJump`, and D3D11 overlay toast preview with strict Frontier EULA/ToS compliance.

  import { onMount, onDestroy } from 'svelte';
  import {
    bridgeClient,
    type FleetInstanceTelemetry,
    type ReverseWaypointState,
    type TargetEntityKind,
  } from '$engine/bridge_client';

  interface Props {
    fleetInstances?: FleetInstanceTelemetry[];
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
    onNotifyBanner?: (message: string) => void;
  }

  let {
    fleetInstances = [],
    onFocusSystem,
    onNotifyBanner,
  }: Props = $props();

  let rwState = $state<ReverseWaypointState>(bridgeClient.getReverseWaypointState());
  let systemNameInput = $state<string>('Sol');
  let systemId64Input = $state<string>('10477373803');
  let bodyNameInput = $state<string>('Abraham Lincoln (Earth Orbit)');
  let bodyId64Input = $state<string>('10477373803003');
  let entityKindInput = $state<TargetEntityKind>('STATION');
  let customToastTitle = $state<string>('ATLAS WAYPOINT LOCK');
  let customToastSubtitle = $state<string>('Sol ? Abraham Lincoln [id64: 10477373803]');

  const QUICK_TARGETS: Array<{
    label: string;
    system_name: string;
    system_id64: string;
    body_name?: string;
    body_id64?: string;
    entity_kind: TargetEntityKind;
    star_pos: [number, number, number];
    star_class: string;
  }> = [
    {
      label: 'Plot to Sol',
      system_name: 'Sol',
      system_id64: '10477373803',
      body_name: 'Abraham Lincoln (Earth Orbit)',
      body_id64: '10477373803003',
      entity_kind: 'STATION',
      star_pos: [0.0, 0.0, 0.0],
      star_class: 'G2V',
    },
    {
      label: 'Shinrarta Dezhra (Jameson)',
      system_name: 'Shinrarta Dezhra',
      system_id64: '3932277478106',
      body_name: 'Jameson Memorial',
      body_id64: '393227747810601',
      entity_kind: 'STATION',
      star_pos: [55.72, 17.59, 27.16],
      star_class: 'K1V',
    },
    {
      label: 'Deciat (Farseer Inc)',
      system_name: 'Deciat',
      system_id64: '660534372891',
      body_name: 'Farseer Inc (Deciat 6 A)',
      body_id64: '66053437289106',
      entity_kind: 'BODY',
      star_pos: [122.69, -0.81, -47.28],
      star_class: 'K5V',
    },
    {
      label: 'Colonia (Jaques Station)',
      system_name: 'Colonia',
      system_id64: '3238296097059',
      body_name: 'Jaques Station',
      body_id64: '323829609705904',
      entity_kind: 'STATION',
      star_pos: [-9530.5, -910.28, 19808.13],
      star_class: 'M1V',
    },
    {
      label: 'Sagittarius A* (Supermassive BH)',
      system_name: 'Sagittarius A*',
      system_id64: '21277363802',
      body_name: 'Sagittarius A* Primary Singularity',
      body_id64: '2127736380201',
      entity_kind: 'SYSTEM',
      star_pos: [25.22, -20.91, 25899.97],
      star_class: 'SupermassiveBlackHole',
    },
  ];

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = bridgeClient.subscribeReverseWaypoint((next) => {
      rwState = next;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function handleInjectCustomTarget() {
    if (!systemNameInput.trim()) return;
    bridgeClient.injectNavTarget(systemNameInput.trim(), systemId64Input.trim(), {
      bodyName: bodyNameInput.trim() || undefined,
      bodyId64: bodyId64Input.trim() || undefined,
      entityKind: entityKindInput,
    });
    const msg = `Target Locked in Nav Computer: ${systemNameInput.trim()}`;
    onNotifyBanner?.(msg);
  }

  function handleQuickTarget(qt: (typeof QUICK_TARGETS)[0]) {
    systemNameInput = qt.system_name;
    systemId64Input = qt.system_id64;
    bodyNameInput = qt.body_name || '';
    bodyId64Input = qt.body_id64 || '';
    entityKindInput = qt.entity_kind;

    bridgeClient.injectNavTarget(qt.system_name, qt.system_id64, {
      bodyName: qt.body_name,
      bodyId64: qt.body_id64,
      entityKind: qt.entity_kind,
      starPos: qt.star_pos,
      starClass: qt.star_class,
    });
    onFocusSystem?.({ x: qt.star_pos[0], y: qt.star_pos[1], z: qt.star_pos[2] }, qt.system_name);
    onNotifyBanner?.(`Target Locked in Nav Computer: ${qt.system_name}`);
  }

  function handleScopeChange(scope: 'ACTIVE_INSTANCE' | 'ALL_FLEET' | 'CUSTOM_SLOTS') {
    bridgeClient.setReverseWaypointOptions({ targetBroadcastScope: scope });
  }

  function handleToggleCmdrSlot(cmdrId64: string) {
    const current = new Set(rwState.selectedCmdrId64s);
    if (current.has(cmdrId64)) {
      if (current.size > 1) current.delete(cmdrId64);
    } else {
      current.add(cmdrId64);
    }
    bridgeClient.setReverseWaypointOptions({
      targetBroadcastScope: 'CUSTOM_SLOTS',
      selectedCmdrId64s: Array.from(current),
    });
  }

  function handleSimulateNextFsdJump() {
    const ok = bridgeClient.simulateNextRouteHopJump();
    if (ok) {
      const nextState = bridgeClient.getReverseWaypointState();
      onNotifyBanner?.(
        nextState.confirmationBanner || 'High-Wake FSDJump simulated ? Route auto-advanced.'
      );
    }
  }

  function handleDispatchCustomToast() {
    bridgeClient.dispatchOverlayToastAlert(
      customToastTitle.trim() || 'ATLAS WAYPOINT LOCK',
      customToastSubtitle.trim() || `${systemNameInput} [id64: ${systemId64Input}]`,
      systemNameInput.trim() || 'Sol',
      systemId64Input.trim() || '10477373803',
      'TARGET_LOCK',
      bodyId64Input.trim() || undefined
    );
    onNotifyBanner?.(`Dispatched D3D11 Overlay Toast (` + '`atlas_toast_alert`' + `) to :8999.`);
  }
</script>

<div class="space-y-4 font-mono text-xs text-white select-none">
  <!-- Confirmation Banner (Task 12.2.3: "Target Locked in Nav Computer: [System Name]") -->
  <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded bg-emerald-500/15 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.18)]">
    <div class="flex items-center space-x-2.5">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
      <div>
        <div class="text-xs sm:text-sm font-bold text-emerald-300 tracking-wide">
          {rwState.confirmationBanner || 'Target Locked in Nav Computer: Sol'}
        </div>
        <div class="text-[10px] text-white/60">
          Handler: <span class="text-[#FF7100]">EdEzCheese::nav_target_injector.rs</span> ? IPC Frames: <span class="text-cyan-300">SET_TARGET_DESTINATION</span> / <span class="text-cyan-300">nav_set_target</span> ? String-Preserved 64-bit <span class="text-amber-300">id64</span>
        </div>
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <span class="px-2 py-0.5 rounded bg-black/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
        ? FRONTIER EULA/TOS PASSIVE HUD & CLIPBOARD COMPLIANT
      </span>
    </div>
  </div>

  <!-- Top Grid: One-Click Target Injector + Multi-Box Commander Slot Selector + D3D11 Overlay Toast Preview -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Column 1: One-Click "Set In-Game Target" & Quick Presets -->
    <div class="p-4 rounded bg-black/75 border border-[#FF7100]/40 space-y-3">
      <div class="flex items-center justify-between border-b border-white/10 pb-2">
        <span class="text-[#FF7100] font-bold uppercase tracking-wider">
          ?? One-Click In-Game Target Injector
        </span>
        <span class="px-1.5 py-0.5 text-[9px] rounded bg-[#FF7100]/20 text-[#FF7100] border border-[#FF7100]/40 font-bold">
          nav_set_target
        </span>
      </div>

      <!-- Verification Criterion Quick Preset Buttons ("Plot to Sol" etc.) -->
      <div class="space-y-1.5">
        <div class="text-[10px] text-white/60 uppercase">Instant Galaxy / Station Target Presets:</div>
        <div class="flex flex-wrap gap-1.5">
          {#each QUICK_TARGETS as qt}
            <button
              type="button"
              onclick={() => handleQuickTarget(qt)}
              class="px-2.5 py-1 rounded text-[10px] font-bold transition-all {rwState.activeTarget?.system_name === qt.system_name
                ? 'bg-[#FF7100] text-black shadow-[0_0_12px_rgba(255,113,0,0.5)]'
                : 'bg-[#FF7100]/15 text-[#FF7100] border border-[#FF7100]/40 hover:bg-[#FF7100] hover:text-black'}"
            >
              ? {qt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Custom System / Body / Station Target Inputs -->
      <div class="space-y-2 pt-2 border-t border-white/10">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[9px] text-white/50 uppercase mb-0.5" for="rw-sys-name">System Name</label>
            <input
              id="rw-sys-name"
              type="text"
              bind:value={systemNameInput}
              class="w-full px-2 py-1 rounded bg-black border border-white/20 text-white text-xs focus:border-[#FF7100] focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-[9px] text-white/50 uppercase mb-0.5" for="rw-sys-id64">system_id64 (String)</label>
            <input
              id="rw-sys-id64"
              type="text"
              bind:value={systemId64Input}
              class="w-full px-2 py-1 rounded bg-black border border-white/20 text-cyan-300 font-mono text-xs focus:border-[#FF7100] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[9px] text-white/50 uppercase mb-0.5" for="rw-body-name">Station / Body Name</label>
            <input
              id="rw-body-name"
              type="text"
              bind:value={bodyNameInput}
              placeholder="Optional station/body"
              class="w-full px-2 py-1 rounded bg-black border border-white/20 text-white text-xs focus:border-[#FF7100] focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-[9px] text-white/50 uppercase mb-0.5" for="rw-body-id64">body_id64 (String)</label>
            <input
              id="rw-body-id64"
              type="text"
              bind:value={bodyId64Input}
              placeholder="Optional 64-bit ID"
              class="w-full px-2 py-1 rounded bg-black border border-white/20 text-amber-300 font-mono text-xs focus:border-[#FF7100] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] text-white/60 uppercase">Entity Class:</span>
          <div class="flex gap-1">
            {#each ['SYSTEM', 'STATION', 'BODY', 'CARRIER'] as kind}
              <button
                type="button"
                onclick={() => (entityKindInput = kind as TargetEntityKind)}
                class="px-2 py-0.5 rounded text-[9px] font-bold {entityKindInput === kind
                  ? 'bg-[#FF7100] text-black'
                  : 'bg-white/10 text-white/70 hover:text-white'}"
              >
                {kind}
              </button>
            {/each}
          </div>
        </div>

        <button
          type="button"
          onclick={handleInjectCustomTarget}
          class="w-full py-2 rounded bg-[#FF7100] text-black hover:bg-[#ff8524] font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(255,113,0,0.4)] transition-all"
        >
          ?? SET IN-GAME TARGET (`SET_TARGET_DESTINATION`)
        </button>
      </div>
    </div>

    <!-- Column 2: Multi-Box Commander Slot Routing (`cmdr_id64`) & EULA Compliance Controls -->
    <div class="p-4 rounded bg-black/75 border border-[#FF7100]/40 space-y-3">
      <div class="flex items-center justify-between border-b border-white/10 pb-2">
        <span class="text-[#FF7100] font-bold uppercase tracking-wider">
          ?? Multi-Box Commander Slot Targeter
        </span>
        <span class="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
          cmdr_id64 MUX
        </span>
      </div>

      <!-- Broadcast Scope Selector -->
      <div class="grid grid-cols-3 gap-1.5">
        {#each [
          { id: 'ACTIVE_INSTANCE', label: 'ACTIVE SHIP' },
          { id: 'ALL_FLEET', label: 'ALL FLEET BOXES' },
          { id: 'CUSTOM_SLOTS', label: 'CUSTOM SLOTS' },
        ] as mode}
          <button
            type="button"
            onclick={() => handleScopeChange(mode.id as any)}
            class="py-1.5 px-2 rounded text-[10px] font-bold border transition-all {rwState.targetBroadcastScope === mode.id
              ? 'bg-[#FF7100] text-black border-[#FF7100]'
              : 'bg-black/60 text-white/70 border-white/15 hover:border-[#FF7100]/50'}"
          >
            {mode.label}
          </button>
        {/each}
      </div>

      <!-- Commander Slots Checklist -->
      <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {#each fleetInstances as inst (inst.instance_uuid)}
          {@const isSlotActive =
            rwState.targetBroadcastScope === 'ALL_FLEET' ||
            (rwState.targetBroadcastScope === 'ACTIVE_INSTANCE' &&
              inst.instance_uuid === bridgeClient.getActiveInstanceUuid()) ||
            (rwState.targetBroadcastScope === 'CUSTOM_SLOTS' &&
              rwState.selectedCmdrId64s.includes(inst.cmdr_id64))}
          <button
            type="button"
            onclick={() => handleToggleCmdrSlot(inst.cmdr_id64)}
            class="w-full p-2 rounded border text-left flex items-center justify-between transition-all {isSlotActive
              ? 'bg-[#FF7100]/15 border-[#FF7100] text-white'
              : 'bg-black/60 border-white/10 text-white/50 hover:border-white/30'}"
          >
            <div>
              <div class="text-[11px] font-bold text-[#FF7100]">{inst.cmdr_name} ({inst.ship_ident})</div>
              <div class="text-[9px] text-white/60 font-mono">
                cmdr_id64: <span class="text-amber-300">{inst.cmdr_id64}</span> ? Lock: <span class="text-emerald-300">{inst.target_lock.targetName}</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold {isSlotActive ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'}">
              {isSlotActive ? 'TARGETED' : 'BYPASS'}
            </span>
          </button>
        {/each}
      </div>

      <!-- EULA / ToS Compliance & Clipboard Fallback Toggles -->
      <div class="pt-2 border-t border-white/10 space-y-1.5 text-[10px]">
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-white/70">Passive System Clipboard Auto-Sync:</span>
          <input
            type="checkbox"
            checked={rwState.clipboardAutoSync}
            onchange={(e) =>
              bridgeClient.setReverseWaypointOptions({
                clipboardAutoSync: (e.currentTarget as HTMLInputElement).checked,
              })}
            class="accent-[#FF7100]"
          />
        </label>
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-white/70">Auto-Advance Next Hop on High-Wake (`FSDJump`):</span>
          <input
            type="checkbox"
            checked={rwState.autoAdvanceOnHighWake}
            onchange={(e) =>
              bridgeClient.setReverseWaypointOptions({
                autoAdvanceOnHighWake: (e.currentTarget as HTMLInputElement).checked,
              })}
            class="accent-[#FF7100]"
          />
        </label>
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-white/70">In-Cockpit D3D11 Overlay Toast (`atlas_toast_alert`):</span>
          <input
            type="checkbox"
            checked={rwState.d3d11OverlayToastEnabled}
            onchange={(e) =>
              bridgeClient.setReverseWaypointOptions({
                d3d11OverlayToastEnabled: (e.currentTarget as HTMLInputElement).checked,
              })}
            class="accent-[#FF7100]"
          />
        </label>
      </div>
    </div>

    <!-- Column 3: In-Cockpit D3D11 Overlay Toast Preview & Dispatcher -->
    <div class="p-4 rounded bg-black/75 border border-[#FF7100]/40 space-y-3 flex flex-col justify-between">
      <div class="space-y-3">
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <span class="text-[#FF7100] font-bold uppercase tracking-wider">
            ??? D3D11 Cockpit Overlay Toast Preview
          </span>
          <span class="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
            atlas_toast_alert
          </span>
        </div>

        <!-- Simulated In-Cockpit D3D11 HUD Overlay Frame -->
        {#if rwState.activeOverlayToast}
          <div class="relative p-3 rounded bg-gradient-to-r from-[#FF7100]/25 via-black/95 to-black border-l-4 border-[#FF7100] shadow-[0_0_24px_rgba(255,113,0,0.28)] space-y-1">
            <div class="flex items-center justify-between text-[9px] text-[#FF7100] font-bold uppercase tracking-widest">
              <span>EDEZCHEESE D3D11 HUD OVERLAY // {rwState.activeOverlayToast.severity}</span>
              <span>CLIPBOARD READY</span>
            </div>
            <div class="text-xs font-bold text-white tracking-wide">
              {rwState.activeOverlayToast.title}
            </div>
            <div class="text-[11px] text-amber-300 font-mono">
              {rwState.activeOverlayToast.subtitle}
            </div>
            <div class="flex items-center justify-between pt-1 text-[9px] text-white/50 font-mono">
              <span>sys_id64: {rwState.activeOverlayToast.system_id64}</span>
              <span>CMDRs: {rwState.activeOverlayToast.target_cmdr_id64s.length}</span>
            </div>
          </div>
        {/if}

        <div class="space-y-1.5 pt-1">
          <input
            type="text"
            bind:value={customToastTitle}
            placeholder="D3D11 Toast Title"
            class="w-full px-2 py-1 rounded bg-black border border-white/20 text-white text-xs"
          />
          <input
            type="text"
            bind:value={customToastSubtitle}
            placeholder="D3D11 Toast Subtitle"
            class="w-full px-2 py-1 rounded bg-black border border-white/20 text-amber-300 text-xs font-mono"
          />
        </div>
      </div>

      <button
        type="button"
        onclick={handleDispatchCustomToast}
        class="w-full py-1.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 font-bold uppercase tracking-wider"
      >
        ?? TEST D3D11 OVERLAY TOAST (`atlas_toast_alert`)
      </button>
    </div>
  </div>

  <!-- Bottom Section: Multi-Hop Route Queue Synchronization & High-Wake Auto-Advance (`nav_queue_route`) -->
  <div class="p-4 rounded bg-black/75 border border-[#FF7100]/40 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
      <div>
        <div class="text-sm font-bold text-[#FF7100] uppercase tracking-wider">
          ??? Multi-Hop Route Queue Synchronization & High-Wake Auto-Advance (`nav_queue_route`)
        </div>
        <div class="text-[10px] text-white/60">
          Upon detecting a High-Wake `FSDJump` event matching a queued waypoint's `system_id64`, the bridge automatically locks the next hop in-game without user intervention.
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          onclick={handleSimulateNextFsdJump}
          class="px-3 py-1.5 rounded bg-emerald-500 text-black hover:bg-emerald-400 font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
        >
          ?? SIMULATE HIGH-WAKE ARRIVAL (AUTO-ADVANCE NEXT HOP)
        </button>
        <button
          type="button"
          onclick={() => bridgeClient.resetSampleRouteQueue()}
          class="px-2.5 py-1.5 rounded bg-white/10 border border-white/20 text-white/80 hover:border-[#FF7100] hover:text-[#FF7100] font-bold uppercase"
        >
          ? RESET 5-HOP EXPEDITION QUEUE
        </button>
      </div>
    </div>

    <!-- Route Hops Stepper Grid -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2.5">
      {#each rwState.routeQueue as hop (hop.hop_index)}
        <div
          class="p-2.5 rounded border transition-all flex flex-col justify-between space-y-2 {hop.status === 'ACTIVE_LOCK'
            ? 'bg-[#FF7100]/20 border-[#FF7100] shadow-[0_0_16px_rgba(255,113,0,0.25)]'
            : hop.status === 'COMPLETED'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-white/80'
              : 'bg-black/60 border-white/15 text-white/60'}"
        >
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[9px] font-bold">
              <span class="text-white/50">HOP #{hop.hop_index + 1}</span>
              <span
                class="px-1.5 py-0.2 rounded {hop.status === 'ACTIVE_LOCK'
                  ? 'bg-[#FF7100] text-black'
                  : hop.status === 'COMPLETED'
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-white/10 text-white/50'}"
              >
                {hop.status}
              </span>
            </div>
            <div class="text-xs font-bold text-white truncate">{hop.system_name}</div>
            {#if hop.body_name}
              <div class="text-[10px] text-[#FF7100] truncate">{hop.body_name}</div>
            {/if}
            <div class="text-[9px] text-cyan-300 font-mono truncate">id64: {hop.system_id64}</div>
          </div>

          <button
            type="button"
            onclick={() => bridgeClient.lockRouteHopByIndex(hop.hop_index)}
            class="w-full py-1 rounded text-[10px] font-bold uppercase transition-colors {hop.status === 'ACTIVE_LOCK'
              ? 'bg-[#FF7100] text-black'
              : 'bg-white/10 text-white hover:bg-[#FF7100] hover:text-black'}"
          >
            {hop.status === 'ACTIVE_LOCK' ? '? LOCKED IN NAV' : 'LOCK WAYPOINT'}
          </button>
        </div>
      {/each}
    </div>

    <!-- Recent IPC Dispatch Audit Log -->
    <div class="pt-2 border-t border-white/10">
      <div class="text-[10px] text-white/50 uppercase mb-1.5">
        Recent JSON-RPC 2.0 Reverse Waypoint Frames (`ws://127.0.0.1:8999`):
      </div>
      <div class="space-y-1 max-h-28 overflow-y-auto">
        {#each rwState.dispatchHistory.slice(0, 5) as rec (rec.dispatch_id)}
          <div class="flex flex-wrap items-center justify-between px-2.5 py-1 rounded bg-black/80 border border-white/10 text-[10px]">
            <div class="flex items-center space-x-2">
              <span class="px-1.5 py-0.2 rounded bg-[#FF7100]/20 text-[#FF7100] font-bold">
                {rec.method}
              </span>
              <span class="text-emerald-300 font-bold">{rec.confirmation_message}</span>
            </div>
            <div class="text-white/50 font-mono">
              sys_id64={rec.system_id64} ? cmdrs={rec.target_cmdr_id64s.length} ? clip={rec.clipboard_synced ? 'OK' : 'OFF'}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
