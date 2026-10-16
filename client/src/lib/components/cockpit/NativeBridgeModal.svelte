<script lang="ts">
  // Location: atlas/client/src/lib/components/cockpit/NativeBridgeModal.svelte
  // Stage 12.1: Local Native IPC WebSocket Bridge (`ws://127.0.0.1:8999`) & Multi-Ship Fleet Coordinator
  // Provides direct localhost companion telemetry (`EDill` / `EdEzCheese`), mutual authentication token handshake,
  // 2s ping/pong heartbeat diagnostics, exponential-backoff reconnect, 10Hz-60Hz binary/JSON telemetry ingestion,
  // and `/cockpit/fleet` multi-ship fleet session multiplexing.

  import { onMount, onDestroy } from 'svelte';
  import ReverseWaypointPanel from '$components/cockpit/ReverseWaypointPanel.svelte';
  import {
    bridgeClient,
    type BridgeConnectionMetrics,
    type FleetInstanceTelemetry,
    type ShipPipState,
  } from '$engine/bridge_client';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
    onFocusSystem?: (coords: { x: number; y: number; z: number }, systemName: string) => void;
    onSyncPrimaryTelemetry?: (instance: FleetInstanceTelemetry) => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
    onFocusSystem,
    onSyncPrimaryTelemetry,
  }: Props = $props();

  let activeTab = $state<'cockpit_bridge' | 'reverse_waypoint' | 'fleet_multiplex' | 'protocol_inspector'>('cockpit_bridge');
  let metrics = $state<BridgeConnectionMetrics>(bridgeClient.getMetrics());
  let fleetInstances = $state<FleetInstanceTelemetry[]>(bridgeClient.getFleetInstances());
  let activeInstanceUuid = $state<string>(bridgeClient.getActiveInstanceUuid());
  let mutualTokenInput = $state<string>(bridgeClient.getAuthToken());
  let simRateHz = $state<number>(bridgeClient.getSimulationRateHz());
  let navTargetInput = $state<string>('Shinrarta Dezhra');
  let navTargetId64Input = $state<string>('3932277478106');
  let statusBanner = $state<string | null>(null);

  let activeInstance = $derived<FleetInstanceTelemetry>(
    fleetInstances.find((i) => i.instance_uuid === activeInstanceUuid) ||
      fleetInstances[0]
  );

  let isOnline = $derived<boolean>(
    metrics.state === 'AUTHENTICATED' || metrics.state === 'SIMULATION_LOOPBACK'
  );

  let unsubscribeState: (() => void) | null = null;

  onMount(() => {
    unsubscribeState = bridgeClient.subscribeState((nextMetrics, nextFleet, nextActiveUuid) => {
      metrics = nextMetrics;
      fleetInstances = nextFleet;
      activeInstanceUuid = nextActiveUuid;
    });
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
  });

  function handleConnectLive() {
    bridgeClient.stopLoopbackSimulation();
    bridgeClient.connect('ws://127.0.0.1:8999');
    statusBanner = 'Attempting live WebSocket handshake on ws://127.0.0.1:8999...';
  }

  function handleToggleLoopback() {
    if (bridgeClient.isSimulationRunning()) {
      bridgeClient.stopLoopbackSimulation();
      statusBanner = 'Loopback telemetry stream stopped.';
    } else {
      bridgeClient.startLoopbackSimulation(simRateHz);
      statusBanner = `Loopback 3-Ship Multiplex Stream active at ${simRateHz} Hz (Binary + JSON-RPC).`;
    }
  }

  function handleRateChange(nextHz: number) {
    simRateHz = nextHz;
    bridgeClient.setSimulationRateHz(nextHz);
  }

  function handleRotateToken() {
    const nextToken = bridgeClient.rotateMutualToken();
    mutualTokenInput = nextToken;
    statusBanner = `Rotated Mutual HMAC Handshake Token: ${nextToken}`;
  }

  function handleApplyToken() {
    bridgeClient.setAuthToken(mutualTokenInput);
    statusBanner = 'Updated mutual authentication token for ws://127.0.0.1:8999 handshake.';
  }

  function handleSelectInstance(uuid: string) {
    bridgeClient.setActiveInstance(uuid);
    const chosen = fleetInstances.find((i) => i.instance_uuid === uuid);
    if (chosen) {
      onSyncPrimaryTelemetry?.(chosen);
      statusBanner = `Switched active cockpit telemetry feed to ${chosen.cmdr_name} (${chosen.ship_name}).`;
    }
  }

  function handlePresetPips(uuid: string, pips: ShipPipState) {
    bridgeClient.updateInstancePips(uuid, pips);
  }

  function handleInjectWaypoint() {
    if (!navTargetInput.trim()) return;
    const ok = bridgeClient.injectNavTarget(navTargetInput.trim(), navTargetId64Input.trim());
    statusBanner = ok
      ? `Target Locked in Nav Computer: ${navTargetInput.trim()} [id64: ${navTargetId64Input.trim()}]`
      : `Queued Nav Target (${navTargetInput.trim()}) — start Loopback or connect EDill :8999 to dispatch.`;
  }

  function handleSimulateHighWake(inst: FleetInstanceTelemetry) {
    const sampleTargets: Array<{ name: string; id64: string; pos: [number, number, number] }> = [
      { name: 'Sol', id64: '10477373803', pos: [0, 0, 0] },
      { name: 'Shinrarta Dezhra', id64: '3932277478106', pos: [55.72, 17.59, 27.16] },
      { name: 'Colonia', id64: '3238296097059', pos: [-9530.5, -910.28, 19808.13] },
      { name: 'Sagittarius A*', id64: '21277363802', pos: [25.22, -20.91, 25899.97] },
    ];
    const next =
      sampleTargets.find((t) => t.name !== inst.current_system) || sampleTargets[0];
    bridgeClient.simulateHighWakeJump(inst.instance_uuid, next.name, next.id64, next.pos);
    if (inst.instance_uuid === activeInstanceUuid) {
      onSyncPrimaryTelemetry?.({
        ...inst,
        current_system: next.name,
        system_id64: next.id64,
        star_pos: next.pos,
      });
    }
    statusBanner = `High-Wake Jump detected for ${inst.cmdr_name} -> ${next.name} (id64: ${next.id64})`;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
    role="dialog"
    aria-modal="true"
    aria-label="In-Cockpit Native IPC Bridge & Multi-Ship Fleet Coordinator"
  >
    <div
      class="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#06090e] border border-[#FF7100]/60 rounded-lg shadow-[0_0_40px_rgba(255,113,0,0.22)] overflow-hidden font-mono text-xs text-white"
    >
      <!-- Top Header Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-[#FF7100]/20 via-black/90 to-black border-b border-[#FF7100]/40">
        <div class="flex items-center space-x-3">
          <span class="w-3 h-3 rounded-full {isOnline ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-pulse'}"></span>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-sm sm:text-base font-bold tracking-widest text-[#FF7100] uppercase">
                STAGE 12.1 & 12.2 // NATIVE IPC BRIDGE (`ws://127.0.0.1:8999`) & REVERSE WAYPOINT LOCK
              </h2>
              <span class="px-2 py-0.5 text-[10px] rounded bg-[#FF7100]/20 text-[#FF7100] border border-[#FF7100]/50 font-bold">
                ZERO-ORB DIRECT IPC
              </span>
            </div>
            <p class="text-[11px] text-white/60">
              EDill / EdEzCheese Local Companion Multiplexer • Mutual Auth Token Handshake • 2.0s Ping/Pong Heartbeat • 10Hz–60Hz 3D Velocity & Pip Stream
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            type="button"
            onclick={handleToggleLoopback}
            class="px-3 py-1.5 rounded font-bold uppercase tracking-wider transition-all {metrics.state === 'SIMULATION_LOOPBACK'
              ? 'bg-emerald-500 text-black shadow-[0_0_14px_rgba(16,185,129,0.5)]'
              : 'bg-[#FF7100]/20 text-[#FF7100] border border-[#FF7100]/60 hover:bg-[#FF7100] hover:text-black'}"
          >
            {metrics.state === 'SIMULATION_LOOPBACK' ? `⚡ LOOPBACK ACTIVE (${simRateHz}Hz)` : '▶ START 10-60Hz LOOPBACK SIM'}
          </button>

          <button
            type="button"
            onclick={handleConnectLive}
            class="px-3 py-1.5 rounded bg-black/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 font-bold uppercase tracking-wider"
          >
            🔌 CONNECT :8999
          </button>

          <button
            type="button"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
            class="px-2.5 py-1.5 rounded bg-black/80 border border-white/20 text-white/70 hover:text-white hover:border-[#FF7100]"
            title="Close Native IPC Bridge Modal"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Sub-Navigation Tabs & Connection Telemetry Strip -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-black/80 border-b border-white/10">
        <div class="flex items-center space-x-2">
          <button
            type="button"
            onclick={() => (activeTab = 'cockpit_bridge')}
            class="px-3 py-1 rounded uppercase font-bold tracking-wider transition-colors {activeTab === 'cockpit_bridge'
              ? 'bg-[#FF7100] text-black'
              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'}"
          >
            1. In-Cockpit Memory Telemetry & Handshake
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'reverse_waypoint')}
            class="px-3 py-1 rounded uppercase font-bold tracking-wider transition-colors {activeTab === 'reverse_waypoint'
              ? 'bg-[#FF7100] text-black'
              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'}"
          >
            2. Reverse Waypoint & Target Lock (Stage 12.2)
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'fleet_multiplex')}
            class="px-3 py-1 rounded uppercase font-bold tracking-wider transition-colors {activeTab === 'fleet_multiplex'
              ? 'bg-[#FF7100] text-black'
              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'}"
          >
            3. `/cockpit/fleet` Multi-Ship Multiplexer ({fleetInstances.length} Ships)
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'protocol_inspector')}
            class="px-3 py-1 rounded uppercase font-bold tracking-wider transition-colors {activeTab === 'protocol_inspector'
              ? 'bg-[#FF7100] text-black'
              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'}"
          >
            4. Heartbeat, Reconnect & Frame Inspector
          </button>
        </div>

        <div class="flex items-center space-x-4 text-[11px]">
          <div>
            <span class="text-white/50">STATE:</span>
            <span class="ml-1 font-bold {isOnline ? 'text-emerald-400' : 'text-amber-400'}">
              {metrics.state}
            </span>
          </div>
          <div>
            <span class="text-white/50">PING RTT:</span>
            <span class="ml-1 font-bold text-cyan-300">{metrics.latencyMs.toFixed(2)} ms</span>
            <span class="text-white/40">(±{metrics.jitterMs.toFixed(2)}ms)</span>
          </div>
          <div>
            <span class="text-white/50">STREAM RATE:</span>
            <span class="ml-1 font-bold text-[#FF7100]">{metrics.estimatedRateHz} Hz</span>
          </div>
          <div>
            <span class="text-white/50">FRAMES:</span>
            <span class="ml-1 font-bold text-white">{metrics.framesReceived}</span>
          </div>
        </div>
      </div>

      {#if statusBanner}
        <div class="px-5 py-1.5 bg-[#FF7100]/15 border-b border-[#FF7100]/40 text-[#FF7100] flex items-center justify-between text-[11px]">
          <span>⚡ {statusBanner}</span>
          <button type="button" class="text-white/60 hover:text-white" onclick={() => (statusBanner = null)}>✕</button>
        </div>
      {/if}

      <!-- Main Body Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        {#if activeTab === 'cockpit_bridge'}
          <!-- Top Grid: Mutual Auth Handshake + Active Ship Selector -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Protocol Handshake & Mutual Auth Card -->
            <div class="p-4 rounded bg-black/70 border border-[#FF7100]/35 space-y-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <span class="text-[#FF7100] font-bold uppercase tracking-wider">🔐 Mutual IPC Handshake</span>
                <span class="px-2 py-0.5 text-[10px] rounded {metrics.handshake.authenticated ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                  {metrics.handshake.authenticated ? 'VERIFIED HMAC' : 'AWAITING PEER'}
                </span>
              </div>

              <div class="space-y-1.5 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-white/50">IPC Endpoint:</span>
                  <span class="text-cyan-300 font-bold">{metrics.endpoint}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Companion Agent:</span>
                  <span class="text-white font-bold">{metrics.handshake.companion_agent} ({metrics.handshake.server_version})</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Heartbeat Cadence:</span>
                  <span class="text-emerald-300 font-bold">{metrics.heartbeatIntervalMs / 1000}s Ping/Pong</span>
                </div>
              </div>

              <div class="space-y-1.5 pt-1">
                <label class="block text-[10px] text-white/60 uppercase" for="atlas-ipc-token-input">
                  Mutual Authentication Token (Local Process Guard):
                </label>
                <div class="flex space-x-1.5">
                  <input
                    id="atlas-ipc-token-input"
                    type="text"
                    bind:value={mutualTokenInput}
                    class="flex-1 px-2.5 py-1 rounded bg-black border border-[#FF7100]/40 text-[#FF7100] font-mono text-xs focus:outline-none focus:border-[#FF7100]"
                  />
                  <button
                    type="button"
                    onclick={handleApplyToken}
                    class="px-2.5 py-1 rounded bg-[#FF7100]/20 border border-[#FF7100]/50 text-[#FF7100] hover:bg-[#FF7100] hover:text-black font-bold"
                  >
                    SET
                  </button>
                  <button
                    type="button"
                    onclick={handleRotateToken}
                    class="px-2.5 py-1 rounded bg-white/5 border border-white/20 text-white/80 hover:border-[#FF7100] hover:text-[#FF7100]"
                    title="Rotate Mutual Auth Token"
                  >
                    ↻
                  </button>
                </div>
              </div>

              <!-- Telemetry Rate Selector (10Hz - 60Hz) -->
              <div class="pt-2 border-t border-white/10">
                <div class="flex items-center justify-between text-[10px] text-white/60 uppercase mb-1.5">
                  <span>In-Process Memory Stream Rate:</span>
                  <span class="text-[#FF7100] font-bold">{simRateHz} Hz</span>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  {#each [10, 20, 30, 60] as hz}
                    <button
                      type="button"
                      onclick={() => handleRateChange(hz)}
                      class="py-1 rounded font-bold text-center border transition-all {simRateHz === hz
                        ? 'bg-[#FF7100] text-black border-[#FF7100]'
                        : 'bg-black/60 text-white/70 border-white/15 hover:border-[#FF7100]/50'}"
                    >
                      {hz} Hz
                    </button>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Real-Time 3D Velocity Vector & Flight Dynamics Card -->
            <div class="p-4 rounded bg-black/70 border border-[#FF7100]/35 space-y-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <span class="text-[#FF7100] font-bold uppercase tracking-wider">🚀 3D Velocity Vector & Pip State</span>
                  <div class="text-[10px] text-white/50">
                    Active Instance: <span class="text-white font-bold">{activeInstance.cmdr_name}</span> ({activeInstance.ship_ident})
                  </div>
                </div>
                <span class="px-2 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {activeInstance.supercruise ? 'SUPERCRUISE' : 'NORMAL SPACE'}
                </span>
              </div>

              <!-- 3D Velocity Vector Readout -->
              <div class="grid grid-cols-4 gap-2 text-center bg-black/90 p-2.5 rounded border border-white/10">
                <div>
                  <div class="text-[10px] text-white/50">Vx (LAT)</div>
                  <div class="text-sm font-bold text-cyan-300">{activeInstance.velocity_vector.x.toFixed(1)}</div>
                  <div class="text-[9px] text-white/40">m/s</div>
                </div>
                <div>
                  <div class="text-[10px] text-white/50">Vy (VERT)</div>
                  <div class="text-sm font-bold text-cyan-300">{activeInstance.velocity_vector.y.toFixed(1)}</div>
                  <div class="text-[9px] text-white/40">m/s</div>
                </div>
                <div>
                  <div class="text-[10px] text-white/50">Vz (FWD)</div>
                  <div class="text-sm font-bold text-cyan-300">{activeInstance.velocity_vector.z.toFixed(1)}</div>
                  <div class="text-[9px] text-white/40">m/s</div>
                </div>
                <div class="border-l border-white/15 pl-2">
                  <div class="text-[10px] text-[#FF7100]">I-SPEED</div>
                  <div class="text-sm font-bold text-[#FF7100]">{activeInstance.speed_ms.toFixed(1)}</div>
                  <div class="text-[9px] text-white/40">m/s</div>
                </div>
              </div>

              <!-- Distributor Pip States (SYS / ENG / WEP) -->
              <div class="space-y-2 pt-1">
                <div class="flex items-center justify-between text-[10px] text-white/60 uppercase">
                  <span>Power Distributor Pips (Half-Pips 0..8)</span>
                  <div class="space-x-1">
                    <button
                      type="button"
                      onclick={() => handlePresetPips(activeInstance.instance_uuid, { sys: 4, eng: 6, wep: 2 })}
                      class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#FF7100] hover:text-black text-[9px]"
                    >
                      SPEED
                    </button>
                    <button
                      type="button"
                      onclick={() => handlePresetPips(activeInstance.instance_uuid, { sys: 8, eng: 4, wep: 0 })}
                      class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#FF7100] hover:text-black text-[9px]"
                    >
                      TANK
                    </button>
                    <button
                      type="button"
                      onclick={() => handlePresetPips(activeInstance.instance_uuid, { sys: 2, eng: 2, wep: 8 })}
                      class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#FF7100] hover:text-black text-[9px]"
                    >
                      ATTACK
                    </button>
                  </div>
                </div>

                {#each [
                  { label: 'SYS', val: activeInstance.pips.sys, color: 'bg-cyan-400' },
                  { label: 'ENG', val: activeInstance.pips.eng, color: 'bg-[#FF7100]' },
                  { label: 'WEP', val: activeInstance.pips.wep, color: 'bg-red-500' },
                ] as pipRow}
                  <div class="flex items-center space-x-2">
                    <span class="w-8 font-bold text-white/80">{pipRow.label}</span>
                    <div class="flex-1 grid grid-cols-8 gap-1 bg-black p-1 rounded border border-white/10">
                      {#each Array(8) as _, idx}
                        <div
                          class="h-2.5 rounded-sm transition-all {idx < pipRow.val ? pipRow.color : 'bg-white/10'}"
                        ></div>
                      {/each}
                    </div>
                    <span class="w-10 text-right font-bold text-[#FF7100]">{(pipRow.val / 2).toFixed(1)}</span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- In-Process Target Lock Coordinates & Nav Injection Card -->
            <div class="p-4 rounded bg-black/70 border border-[#FF7100]/35 space-y-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <span class="text-[#FF7100] font-bold uppercase tracking-wider">🎯 Target Lock Coordinates</span>
                <span class="px-2 py-0.5 text-[10px] rounded {activeInstance.target_lock.locked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/50'} font-bold">
                  {activeInstance.target_lock.locked ? 'LOCKED' : 'NO LOCK'}
                </span>
              </div>

              <div class="p-2.5 rounded bg-black/90 border border-white/10 space-y-1.5 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-white/50">Locked Entity:</span>
                  <span class="text-[#FF7100] font-bold">{activeInstance.target_lock.targetName}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Class / Type:</span>
                  <span class="text-white">{activeInstance.target_lock.targetShipType}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">System id64 (String):</span>
                  <span class="text-cyan-300 font-mono">{activeInstance.target_lock.targetSystemId64}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Target Vector (m):</span>
                  <span class="text-white font-mono">
                    [{activeInstance.target_lock.targetCoords.x.toFixed(0)}, {activeInstance.target_lock.targetCoords.y.toFixed(0)}, {activeInstance.target_lock.targetCoords.z.toFixed(0)}]
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Range / Shield / Hull:</span>
                  <span class="text-emerald-300 font-bold">
                    {(activeInstance.target_lock.targetDistanceM / 1000).toFixed(2)} km • {activeInstance.target_lock.targetShieldPercent}% / {activeInstance.target_lock.targetHullPercent}%
                  </span>
                </div>
              </div>

              <!-- Quick Nav Target Lock Dispatcher -->
              <div class="pt-1 space-y-1.5">
                <div class="text-[10px] text-white/60 uppercase">IPC Nav Lock Command (`SET_TARGET_DESTINATION`):</div>
                <div class="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    bind:value={navTargetInput}
                    placeholder="System Name"
                    class="px-2 py-1 rounded bg-black border border-white/20 text-white text-xs"
                  />
                  <input
                    type="text"
                    bind:value={navTargetId64Input}
                    placeholder="id64 (string)"
                    class="px-2 py-1 rounded bg-black border border-white/20 text-cyan-300 text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onclick={handleInjectWaypoint}
                  class="w-full py-1.5 rounded bg-[#FF7100]/20 border border-[#FF7100] text-[#FF7100] hover:bg-[#FF7100] hover:text-black font-bold uppercase tracking-wider transition-all"
                >
                  ⚡ INJECT TARGET LOCK INTO ACTIVE COCKPIT
                </button>
              </div>
            </div>
          </div>
        {:else if activeTab === 'reverse_waypoint'}
          <ReverseWaypointPanel
            {fleetInstances}
            {onFocusSystem}
            onNotifyBanner={(msg) => (statusBanner = msg)}
          />
        {:else if activeTab === 'fleet_multiplex'}
          <!-- Task 12.1.5: `/cockpit/fleet` Multi-Ship Fleet Multiplexing View -->
          <div class="flex items-center justify-between bg-black/70 px-4 py-2.5 rounded border border-[#FF7100]/30">
            <div>
              <div class="text-sm font-bold text-[#FF7100] uppercase tracking-wider">
                `/cockpit/fleet` — Concurrent Multi-Instance Telemetry Multiplexer
              </div>
              <div class="text-[11px] text-white/60">
                All concurrent game instances tagged by `instance_uuid` and string-preserved `cmdr_id64`. Click any ship to switch primary HUD focus.
              </div>
            </div>
            <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {fleetInstances.length} CONCURRENT INSTANCES
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#each fleetInstances as inst (inst.instance_uuid)}
              {@const isSelected = inst.instance_uuid === activeInstanceUuid}
              <div
                class="p-4 rounded-lg border transition-all flex flex-col justify-between space-y-3 {isSelected
                  ? 'bg-[#FF7100]/10 border-[#FF7100] shadow-[0_0_20px_rgba(255,113,0,0.2)]'
                  : 'bg-black/75 border-white/15 hover:border-[#FF7100]/50'}"
              >
                <div class="space-y-2">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="text-xs font-bold text-[#FF7100]">{inst.cmdr_name}</div>
                      <div class="text-sm font-bold text-white">{inst.ship_name} <span class="text-white/50">({inst.ship_type})</span></div>
                    </div>
                    <span class="px-2 py-0.5 text-[10px] rounded font-bold {isSelected ? 'bg-[#FF7100] text-black' : 'bg-white/10 text-white/70'}">
                      {inst.ship_ident}
                    </span>
                  </div>

                  <div class="p-2 rounded bg-black/80 border border-white/10 space-y-1 text-[10px]">
                    <div class="flex justify-between">
                      <span class="text-white/50">instance_uuid:</span>
                      <span class="text-cyan-300 font-mono">{inst.instance_uuid}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-white/50">cmdr_id64:</span>
                      <span class="text-amber-300 font-mono">{inst.cmdr_id64}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-white/50">System (`id64`):</span>
                      <span class="text-white font-bold">{inst.current_system} <span class="text-white/40">({inst.system_id64})</span></span>
                    </div>
                  </div>

                  <!-- Live 3D Velocity & Vitals -->
                  <div class="grid grid-cols-3 gap-1.5 text-center bg-black/60 p-2 rounded border border-white/10">
                    <div>
                      <div class="text-[9px] text-white/40">SPEED</div>
                      <div class="text-xs font-bold text-cyan-300">{inst.speed_ms.toFixed(0)} m/s</div>
                    </div>
                    <div>
                      <div class="text-[9px] text-white/40">SHIELD / HULL</div>
                      <div class="text-xs font-bold text-emerald-300">{inst.shield_percent.toFixed(0)}% / {inst.hull_percent.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div class="text-[9px] text-white/40">PIPS (S/E/W)</div>
                      <div class="text-xs font-bold text-[#FF7100]">{inst.pips.sys / 2}/{inst.pips.eng / 2}/{inst.pips.wep / 2}</div>
                    </div>
                  </div>

                  <div class="text-[10px] text-white/60 flex justify-between">
                    <span>Target Lock: <strong class="text-white">{inst.target_lock.targetName}</strong></span>
                    <span>{(inst.target_lock.targetDistanceM / 1000).toFixed(1)} km</span>
                  </div>
                </div>

                <div class="pt-2 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onclick={() => handleSelectInstance(inst.instance_uuid)}
                    class="flex-1 py-1.5 rounded font-bold uppercase text-[11px] transition-colors {isSelected
                      ? 'bg-[#FF7100] text-black'
                      : 'bg-[#FF7100]/20 text-[#FF7100] border border-[#FF7100]/50 hover:bg-[#FF7100] hover:text-black'}"
                  >
                    {isSelected ? '✓ ACTIVE HUD FEED' : 'SWITCH TO COCKPIT'}
                  </button>
                  <button
                    type="button"
                    onclick={() => handleSimulateHighWake(inst)}
                    class="px-2.5 py-1.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-[10px] font-bold"
                    title="Simulate High-Wake FSDJump for this instance"
                  >
                    🚀 JUMP
                  </button>
                  <button
                    type="button"
                    onclick={() =>
                      onFocusSystem?.(
                        { x: inst.star_pos[0], y: inst.star_pos[1], z: inst.star_pos[2] },
                        inst.current_system
                      )}
                    class="px-2.5 py-1.5 rounded bg-white/10 border border-white/20 text-white hover:border-[#FF7100] text-[10px]"
                    title="Center 3D Galaxy Camera on Ship"
                  >
                    🎯
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Tab 3: Heartbeat, Exponential Backoff Reconnect & Frame Inspector -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded bg-black/70 border border-[#FF7100]/35 space-y-3">
              <div class="text-[#FF7100] font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                ⏱️ Bi-Directional Heartbeat & Reconnect Policy
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-white/50">Ping/Pong Interval:</span>
                  <span class="text-emerald-300 font-bold">{metrics.heartbeatIntervalMs} ms (2.0s Spec)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Measured Loopback RTT:</span>
                  <span class="text-cyan-300 font-bold">{metrics.latencyMs.toFixed(2)} ms</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Reconnect Attempt Counter:</span>
                  <span class="text-amber-300 font-bold">{metrics.reconnectAttempt}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Next Exponential Backoff Delay:</span>
                  <span class="text-white font-mono">{metrics.nextReconnectDelayMs} ms (Cap 30,000 ms)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Binary Float32 Frames Ingested:</span>
                  <span class="text-[#FF7100] font-bold">{metrics.binaryFramesReceived}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">JSON-RPC Multiplex Frames Ingested:</span>
                  <span class="text-cyan-300 font-bold">{metrics.jsonFramesReceived}</span>
                </div>
              </div>
              <button
                type="button"
                onclick={() => bridgeClient.sendHeartbeatPing()}
                class="w-full py-1.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 font-bold uppercase"
              >
                📡 DISPATCH MANUAL PING FRAME NOW
              </button>
            </div>

            <div class="p-4 rounded bg-black/70 border border-[#FF7100]/35 space-y-2">
              <div class="text-[#FF7100] font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                📦 Live Multiplexed Frame Payload (`instance_uuid` + `cmdr_id64`)
              </div>
              <pre class="p-3 rounded bg-black border border-white/10 text-[10px] text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">{JSON.stringify(
                {
                  jsonrpc: '2.0',
                  topic: 'FleetMultiplex',
                  instance_uuid: activeInstance.instance_uuid,
                  cmdr_id64: activeInstance.cmdr_id64,
                  system_id64: activeInstance.system_id64,
                  velocity_vector: activeInstance.velocity_vector,
                  pips: activeInstance.pips,
                  target_lock: activeInstance.target_lock,
                },
                null,
                2
              )}</pre>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
