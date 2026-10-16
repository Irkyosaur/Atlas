<script lang="ts">
  import { onMount } from 'svelte';
  import {
    STREAM_DECK_ACTIONS,
    generateStreamDeckKeySvg,
    createDefaultStreamDeckProfiles,
    executeStreamDeckAction,
    type StreamDeckDeviceModel,
    type StreamDeckProfile,
    type ShipStatusTelemetry,
  } from '$engine/streamdeck_engine';
  import { bridgeClient } from '$engine/bridge_client';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onToggleNightMode?: () => void;
    onCenterCamera?: () => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
    onToggleNightMode,
    onCenterCamera,
  }: Props = $props();

  // Active hardware model selection
  let selectedModel = $state<StreamDeckDeviceModel>('STANDARD');
  let profiles = $state<Record<StreamDeckDeviceModel, StreamDeckProfile>>(
    createDefaultStreamDeckProfiles()
  );
  let activeProfile = $derived(profiles[selectedModel]);

  // Selected key for configuration
  let selectedKeyIndex = $state<number | null>(null);

  // Live status telemetry
  let remainingJumps = $state<number>(3);
  let nextWaypointName = $state<string>('Deciat');
  let nextWaypointClass = $state<string>('G2V');
  let fuelPercent = $state<number>(84.5);
  let isFuelLow = $state<boolean>(false);
  let nearestFuelStarName = $state<string>('LHS 3006');
  let nearestFuelStarDistLy = $state<number>(5.4);
  let nearestFuelStarClass = $state<string>('K5V');
  let isScoopable = $state<boolean>(true);
  let nightModeActive = $state<boolean>(false);

  // Key press feedback state
  let pressedKeyIndex = $state<number | null>(null);
  let lastActionFeedback = $state<string | null>(null);
  let wsBridgeConnected = $state<boolean>(true);

  // Derive consolidated telemetry object
  let telemetry = $derived<ShipStatusTelemetry>({
    currentSystem: bridgeClient.getActiveInstance()?.current_system || 'Sol',
    remainingJumps,
    nextWaypointName,
    nextWaypointClass,
    fuelPercent,
    isFuelLow,
    nearestFuelStarName,
    nearestFuelStarDistLy,
    nearestFuelStarClass,
    isScoopable,
    nightModeActive,
  });

  onMount(() => {
    // Listen to bridge route changes if available
    const unsubRoute = bridgeClient.subscribeReverseWaypoint((state) => {
      if (state.activeTarget) {
        nextWaypointName = state.activeTarget.system_name;
        if (state.activeTarget.star_class) {
          nextWaypointClass = state.activeTarget.star_class;
        }
      }
      if (state.routeQueue && state.routeQueue.length > 0) {
        const remaining = state.routeQueue.filter((h) => h.status !== 'COMPLETED').length;
        remainingJumps = remaining;
      }
    });

    const unsubState = bridgeClient.subscribeState((metrics, fleet) => {
      const active = bridgeClient.getActiveInstance();
      if (active) {
        if (active.fuel_max_t > 0) {
          fuelPercent = (active.fuel_main_t / active.fuel_max_t) * 100;
          isFuelLow = fuelPercent < 25;
        }
      }
    });

    return () => {
      unsubRoute();
      unsubState();
    };
  });

  async function handleKeyPress(index: number, actionUuid: string | null) {
    if (!actionUuid) {
      selectedKeyIndex = index;
      return;
    }

    pressedKeyIndex = index;
    setTimeout(() => {
      if (pressedKeyIndex === index) pressedKeyIndex = null;
    }, 250);

    const result = await executeStreamDeckAction(actionUuid, {
      copyWaypoint: async () => {
        try {
          if (navigator.clipboard && nextWaypointName) {
            await navigator.clipboard.writeText(nextWaypointName);
            lastActionFeedback = `COPIED: ${nextWaypointName}`;
            return nextWaypointName;
          }
        } catch {
          lastActionFeedback = `COPIED: ${nextWaypointName}`;
          return nextWaypointName;
        }
        return null;
      },
      toggleNightMode: () => {
        nightModeActive = !nightModeActive;
        lastActionFeedback = `NIGHT MODE: ${nightModeActive ? 'ON' : 'OFF'}`;
        if (onToggleNightMode) onToggleNightMode();
      },
      centerCamera: () => {
        lastActionFeedback = 'CAMERA: CENTERED ON SHIP';
        if (onCenterCamera) onCenterCamera();
      },
      clearRoute: () => {
        remainingJumps = 0;
        nextWaypointName = 'NONE';
        lastActionFeedback = 'ROUTE: CLEARED';
        bridgeClient.clearRouteQueue();
      },
    });

    if (result.message && !lastActionFeedback?.includes(result.message)) {
      lastActionFeedback = result.message.toUpperCase();
    }
  }

  function assignActionToKey(index: number, actionUuid: string | null) {
    const currentSlots = [...activeProfile.slots];
    const targetSlot = currentSlots.find((s) => s.index === index);
    if (targetSlot) {
      targetSlot.actionUuid = actionUuid;
      profiles[selectedModel].slots = currentSlots;
    }
    selectedKeyIndex = null;
  }

  function downloadProfileJson() {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(activeProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `atlas_streamdeck_${selectedModel.toLowerCase()}_profile.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    lastActionFeedback = `EXPORTED: ${activeProfile.name}`;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    role="dialog"
    aria-label="Elgato Stream Deck Hardware Studio"
  >
    <div
      class="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0c0905] border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_40px_rgba(255,113,0,0.25)] overflow-hidden font-mono"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/40"
      >
        <div class="flex items-center space-x-3">
          <div
            class="w-3 h-3 rounded-full {wsBridgeConnected
              ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
              : 'bg-red-500 shadow-[0_0_8px_#EF4444]'}"
          ></div>
          <span class="text-sm font-bold tracking-widest text-[var(--hud-orange)] uppercase">
            ELGATO STREAM DECK // PHYSICAL SIM-RIG STUDIO [STAGE 15.1]
          </span>
          <span
            class="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30"
          >
            DAEMON: WS://127.0.0.1:8999
          </span>
        </div>

        <div class="flex items-center space-x-3">
          <button
            type="button"
            class="px-3 py-1 bg-black/60 hover:bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] text-[var(--hud-amber)] text-xs rounded uppercase tracking-wider transition-all"
            onclick={downloadProfileJson}
          >
            💾 Export Profile (.json)
          </button>
          <button
            type="button"
            class="text-[var(--hud-amber)]/70 hover:text-white text-lg font-bold px-2"
            onclick={() => onClose?.()}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Controls & Model Switcher Bar -->
      <div
        class="flex flex-wrap items-center justify-between px-5 py-2.5 bg-black/40 border-b border-[var(--hud-orange)]/25 text-xs gap-3"
      >
        <div class="flex items-center space-x-2">
          <span class="text-stone-400">HARDWARE MODEL:</span>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs uppercase font-bold transition-all {selectedModel ===
            'STANDARD'
              ? 'bg-[var(--hud-orange)] text-black'
              : 'bg-black/60 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30'}"
            onclick={() => {
              selectedModel = 'STANDARD';
              selectedKeyIndex = null;
            }}
          >
            STANDARD (15 KEYS)
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs uppercase font-bold transition-all {selectedModel ===
            'XL'
              ? 'bg-[var(--hud-orange)] text-black'
              : 'bg-black/60 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30'}"
            onclick={() => {
              selectedModel = 'XL';
              selectedKeyIndex = null;
            }}
          >
            XL (32 KEYS)
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs uppercase font-bold transition-all {selectedModel ===
            'PLUS'
              ? 'bg-[var(--hud-orange)] text-black'
              : 'bg-black/60 text-[var(--hud-amber)] border border-[var(--hud-orange)]/30'}"
            onclick={() => {
              selectedModel = 'PLUS';
              selectedKeyIndex = null;
            }}
          >
            PLUS (8 KEYS + DIALS)
          </button>
        </div>

        {#if lastActionFeedback}
          <div
            class="px-3 py-1 rounded bg-black/80 border border-emerald-500/50 text-emerald-400 text-xs font-mono tracking-wider animate-pulse"
          >
            ⚡ {lastActionFeedback}
          </div>
        {/if}
      </div>

      <!-- Main Body: Simulator Grid and Key Config Panel -->
      <div class="flex-1 flex flex-col md:flex-row overflow-y-auto p-5 gap-6">
        <!-- Virtual Hardware Deck Simulator -->
        <div class="flex-1 flex flex-col items-center justify-center">
          <div class="text-xs text-stone-400 tracking-wider mb-2 uppercase">
            VIRTUAL HARDWARE SIMULATOR // CLICK KEYS TO DISPATCH REAL-TIME ACTION
          </div>

          <!-- Physical Deck Casing -->
          <div
            class="p-6 bg-gradient-to-b from-[#1c1815] via-[#120f0d] to-[#080604] border-2 border-[var(--hud-orange)]/40 rounded-2xl shadow-[inset_0_2px_10px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.8)]"
          >
            <!-- LCD Key Grid -->
            <div
              class="grid gap-3 select-none"
              style="grid-template-columns: repeat({activeProfile.columns}, minmax(0, 1fr));"
            >
              {#each activeProfile.slots as slot (slot.index)}
                {@const isPressed = pressedKeyIndex === slot.index}
                {@const isSelected = selectedKeyIndex === slot.index}
                {@const svgMarkup = slot.actionUuid
                  ? generateStreamDeckKeySvg(slot.actionUuid, telemetry, { isPressed })
                  : generateStreamDeckKeySvg('UNBOUND', telemetry, {
                      customLabel: `KEY ${slot.index + 1}`,
                    })}

                <div
                  class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center transition-all {isSelected
                    ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_#00E5FF]'
                    : isPressed
                      ? 'scale-95 shadow-[0_0_15px_#FF7100]'
                      : 'hover:border-stone-500 shadow-md'}"
                >
                  <button
                    type="button"
                    class="w-full h-full flex items-center justify-center focus:outline-none"
                    onclick={() => handleKeyPress(slot.index, slot.actionUuid)}
                    title="Stream Deck Key {slot.index + 1}: {slot.actionUuid || 'Empty / Unbound'}"
                  >
                    <!-- Render Raw 72x72 SVG Image -->
                    <div class="w-full h-full pointer-events-none flex items-center justify-center">
                      {@html svgMarkup}
                    </div>
                  </button>
                  <!-- Configure Button Trigger on Top-Right -->
                  <button
                    type="button"
                    class="absolute top-1 right-1 w-4 h-4 bg-black/80 hover:bg-[var(--hud-orange)] text-[9px] text-stone-300 hover:text-black rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity z-10"
                    onclick={(e) => {
                      e.stopPropagation();
                      selectedKeyIndex = slot.index;
                    }}
                    title="Configure Action Binding for Key {slot.index + 1}"
                  >
                    ⚙
                  </button>
                </div>
              {/each}
            </div>

            <!-- Touch Strip & Rotary Dials for Stream Deck Plus -->
            {#if selectedModel === 'PLUS'}
              <div class="mt-4 pt-4 border-t border-[var(--hud-orange)]/30 space-y-3">
                <!-- Touch Strip Screen -->
                <div
                  class="w-full py-1.5 px-3 bg-black/90 border border-cyan-500/50 rounded-lg flex items-center justify-between text-[11px] text-cyan-300 tracking-wider shadow-[inset_0_0_8px_rgba(0,229,255,0.2)]"
                >
                  <span>LCD TOUCH STRIP</span>
                  <span class="font-bold">{activeProfile.touchStripLabel}</span>
                  <span>{telemetry.fuelPercent.toFixed(1)}% FUEL</span>
                </div>

                <!-- 4 Rotary Encoders -->
                <div class="grid grid-cols-4 gap-3 pt-1">
                  {#each ['ROTARY 1: ZOOM', 'ROTARY 2: PITCH', 'ROTARY 3: YAW', 'ROTARY 4: THROTTLE'] as dial, dIdx}
                    <div
                      class="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-[var(--hud-orange)]/25 text-center"
                    >
                      <div
                        class="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-900 flex items-center justify-center text-xs text-[var(--hud-amber)] shadow-inner"
                      >
                        ◉
                      </div>
                      <span class="text-[9px] text-stone-400 mt-1">{dial}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Right Side: Key Action Mapping & Live Telemetry Inspector -->
        <div class="w-full md:w-80 flex flex-col space-y-4">
          <!-- Key Inspector / Assignment Box -->
          <div class="p-4 bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg space-y-3">
            <div class="flex items-center justify-between text-xs border-b border-stone-800 pb-2">
              <span class="text-stone-400">KEY CONFIGURATION:</span>
              <span class="text-[var(--hud-orange)] font-bold">
                {selectedKeyIndex !== null ? `KEY #${selectedKeyIndex + 1}` : 'SELECT A KEY'}
              </span>
            </div>

            {#if selectedKeyIndex !== null}
              <div class="space-y-2">
                <span class="text-[11px] text-stone-400 block">BIND ACTION TO KEY:</span>
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {#each Object.values(STREAM_DECK_ACTIONS) as action}
                    <button
                      type="button"
                      class="w-full text-left px-2.5 py-1.5 rounded bg-black/80 hover:bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] text-xs text-[var(--hud-amber)] flex items-center justify-between transition-all"
                      onclick={() => assignActionToKey(selectedKeyIndex!, action.uuid)}
                    >
                      <div>
                        <div class="font-bold">{action.title}</div>
                        <div class="text-[9px] text-stone-400 truncate max-w-[180px]">
                          {action.description}
                        </div>
                      </div>
                      <span class="text-[10px] text-cyan-400">ASSIGN</span>
                    </button>
                  {/each}
                  <button
                    type="button"
                    class="w-full text-left px-2.5 py-1.5 rounded bg-red-950/40 hover:bg-red-900/30 border border-red-500/30 text-xs text-red-300 flex items-center justify-between"
                    onclick={() => assignActionToKey(selectedKeyIndex!, null)}
                  >
                    <span>Unbind Key</span>
                    <span class="text-[10px]">CLEAR</span>
                  </button>
                </div>
              </div>
            {:else}
              <div class="py-6 text-center text-xs text-stone-500">
                Click the ⚙ gear on any virtual key to map a custom flight status or navigation
                action.
              </div>
            {/if}
          </div>

          <!-- Live Telemetry Simulation Controls -->
          <div class="p-4 bg-black/60 border border-[var(--hud-orange)]/35 rounded-lg space-y-3">
            <span class="text-xs text-stone-400 block border-b border-stone-800 pb-2">
              SIMULATED COCKPIT TELEMETRY (EDILL :8999)
            </span>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <label for="streamdeck-jumps-input" class="text-stone-400">Remaining Jumps:</label>
                <input
                  id="streamdeck-jumps-input"
                  type="number"
                  min="0"
                  max="99"
                  bind:value={remainingJumps}
                  class="w-16 px-1.5 py-0.5 bg-black border border-stone-700 text-[var(--hud-amber)] text-right rounded"
                />
              </div>

              <div class="flex items-center justify-between">
                <label for="streamdeck-waypoint-input" class="text-stone-400">Next Waypoint:</label>
                <input
                  id="streamdeck-waypoint-input"
                  type="text"
                  bind:value={nextWaypointName}
                  class="w-32 px-1.5 py-0.5 bg-black border border-stone-700 text-[var(--hud-amber)] text-right rounded"
                />
              </div>

              <div class="flex items-center justify-between">
                <label for="streamdeck-fuel-input" class="text-stone-400">Fuel Tank %:</label>
                <input
                  id="streamdeck-fuel-input"
                  type="range"
                  min="5"
                  max="100"
                  bind:value={fuelPercent}
                  class="w-24 accent-[var(--hud-orange)]"
                />
              </div>

              <div class="flex items-center justify-between">
                <label for="streamdeck-fuelstar-dist-input" class="text-stone-400">Fuel Star Dist (LY):</label>
                <input
                  id="streamdeck-fuelstar-dist-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="200"
                  bind:value={nearestFuelStarDistLy}
                  class="w-16 px-1.5 py-0.5 bg-black border border-stone-700 text-[var(--hud-amber)] text-right rounded"
                />
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-stone-400">Scoopable Star:</span>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {isScoopable
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                    : 'bg-stone-900 border border-stone-700 text-stone-500'}"
                  onclick={() => (isScoopable = !isScoopable)}
                >
                  {isScoopable ? 'YES (KGBFOAM)' : 'NO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
