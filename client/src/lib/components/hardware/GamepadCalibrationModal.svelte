<!-- Location: client/src/lib/components/hardware/GamepadCalibrationModal.svelte -->
<!-- Stage 15.2: Visual Calibration & Mapping HUD Modal for HOTAS, Flight Sticks & Gamepads -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    gamepadNavigationEngine,
    PRESET_PROFILES,
    type GamepadProfile,
    type GamepadHardwareType,
    type GamepadAction,
    type ConnectedGamepadInfo,
    type AxisMappingConfig,
  } from '$engine/gamepad_navigation_engine';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    onClose,
  }: Props = $props();

  let connectedGamepads = $state<ConnectedGamepadInfo[]>([]);
  let activeIndex = $state<number | null>(null);
  let profile = $state<GamepadProfile>(gamepadNavigationEngine.getProfile());

  // Real-time animation frame polling for live visual gauges
  let animId: number | null = null;
  let liveAxes = $state<number[]>([]);
  let liveButtons = $state<{ pressed: boolean; value: number }[]>([]);

  // Selected axis or action for manual tweaking
  let activeAxisTab = $state<'yaw' | 'pitch' | 'zoom' | 'panX' | 'panY'>('yaw');

  const ACTION_LABELS: { action: GamepadAction; label: string; desc: string }[] = [
    { action: 'SELECT_STAR', label: 'SELECT STAR / TARGET', desc: 'Selects the star currently under the central reticle' },
    { action: 'OPEN_SYSTEM_ORRERY', label: 'OPEN SYSTEM ORRERY', desc: 'Opens 3D Keplerian planetary system orrery view' },
    { action: 'RESET_CAMERA', label: 'RESET CAMERA', desc: 'Resets camera orbit elevation and default zoom distance' },
    { action: 'CENTER_SHIP', label: 'CENTER ON SHIP', desc: 'Snaps camera target to current CMDR ship coordinates' },
    { action: 'TOGGLE_GRID', label: 'TOGGLE GALACTIC PLANE', desc: 'Toggles Y=0 reference plane grid & coordinate stalks' },
    { action: 'TOGGLE_NIGHTMODE', label: 'TOGGLE NIGHT MODE', desc: 'Toggles high-contrast night exploration shader' },
  ];

  const PRESET_OPTIONS: { type: GamepadHardwareType; label: string }[] = [
    { type: 'vkb_gladiator', label: 'VKB Gladiator NXT EVO' },
    { type: 'vkb_gunfighter', label: 'VKB Gunfighter IV' },
    { type: 'virpil_constellation', label: 'Virpil Constellation Alpha' },
    { type: 'thrustmaster_t16000m', label: 'Thrustmaster T.16000M FCS' },
    { type: 'thrustmaster_twcs', label: 'Thrustmaster TWCS Throttle' },
    { type: 'thrustmaster_warthog', label: 'Thrustmaster HOTAS Warthog' },
    { type: 'logitech_x52', label: 'Logitech X52 / X52 Pro' },
    { type: 'logitech_x56', label: 'Logitech X56 Rhino' },
    { type: 'xbox_gamepad', label: 'Xbox Wireless Controller' },
    { type: 'playstation_gamepad', label: 'PlayStation DualSense / DualShock' },
    { type: 'generic_flightstick', label: 'Generic Flight Stick' },
    { type: 'generic_gamepad', label: 'Generic Gamepad' },
  ];

  onMount(() => {
    const unsub = gamepadNavigationEngine.subscribeState((pads) => {
      connectedGamepads = pads;
      activeIndex = gamepadNavigationEngine.getActiveGamepadIndex();
      profile = gamepadNavigationEngine.getProfile();
    });

    const pollLiveInputs = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const activePad = activeIndex !== null ? pads[activeIndex] : (pads[0] || null);
        if (activePad && activePad.connected) {
          liveAxes = Array.from(activePad.axes);
          liveButtons = activePad.buttons.map((b) => ({ pressed: b.pressed, value: b.value }));
        }
      }
      animId = requestAnimationFrame(pollLiveInputs);
    };

    animId = requestAnimationFrame(pollLiveInputs);

    return () => {
      unsub();
      if (animId !== null) cancelAnimationFrame(animId);
    };
  });

  function selectGamepad(index: number) {
    gamepadNavigationEngine.setActiveGamepad(index);
    activeIndex = index;
    profile = gamepadNavigationEngine.getProfile();
  }

  function applyPreset(presetType: GamepadHardwareType) {
    const newProfile = { ...PRESET_PROFILES[presetType] };
    gamepadNavigationEngine.setProfile(newProfile);
    profile = newProfile;
  }

  function handleAxisChange(axis: 'yaw' | 'pitch' | 'zoom' | 'panX' | 'panY', field: keyof AxisMappingConfig, value: any) {
    const updated = {
      ...profile[axis],
      [field]: value,
    };
    gamepadNavigationEngine.updateAxisConfig(axis, updated);
    profile = gamepadNavigationEngine.getProfile();
  }

  function handleButtonChange(action: GamepadAction, buttonIndex: number) {
    gamepadNavigationEngine.updateButtonMapping(action, buttonIndex);
    profile = gamepadNavigationEngine.getProfile();
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono text-sm"
    role="dialog"
    aria-modal="true"
  >
    <div class="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-orange-500/50 rounded-lg shadow-[0_0_35px_rgba(249,115,22,0.25)] overflow-hidden">
      <!-- Modal Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-orange-500/30 bg-zinc-900/60">
        <div class="flex items-center space-x-3">
          <span class="text-2xl">🕹️</span>
          <div>
            <h2 class="text-lg font-black tracking-widest text-orange-400">
              PHYSICAL FLIGHT STICK & GAMEPAD CALIBRATION
            </h2>
            <p class="text-xs text-orange-500/70">
              HTML5 Gamepad API • VKB • Virpil • Thrustmaster • Logitech • DualSense • Xbox
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => {
            isOpen = false;
            if (onClose) onClose();
          }}
          class="px-3 py-1 bg-red-950/60 hover:bg-red-800/80 text-red-300 border border-red-500/50 rounded transition-colors text-xs font-bold"
        >
          ✕ CLOSE
        </button>
      </header>

      <!-- Main Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Controller Selector & Preset Bar -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-900/40 border border-orange-500/20 rounded-md">
          <!-- Detected Hardware Selector -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-orange-400/90 tracking-wide">
              ACTIVE CONTROLLER ({connectedGamepads.length} DETECTED):
            </label>
            <select
              class="w-full bg-zinc-950 border border-orange-500/40 text-orange-200 px-3 py-2 rounded focus:outline-none focus:border-orange-400 text-xs"
              value={activeIndex ?? ''}
              onchange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                selectGamepad(val === '' ? 0 : parseInt(val, 10));
              }}
            >
              {#if connectedGamepads.length === 0}
                <option value="">No physical controllers detected (Press any stick/button)</option>
              {:else}
                {#each connectedGamepads as pad}
                  <option value={pad.index}>
                    [Index {pad.index}] {pad.id} ({pad.axes.length} axes, {pad.buttons.length} buttons)
                  </option>
                {/each}
              {/if}
            </select>
          </div>

          <!-- Hardware Profile Presets -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-orange-400/90 tracking-wide">
              APPLY HARDWARE PRESET PROFILE:
            </label>
            <div class="flex space-x-2">
              <select
                class="flex-1 bg-zinc-950 border border-orange-500/40 text-orange-200 px-3 py-2 rounded focus:outline-none focus:border-orange-400 text-xs"
                value={profile.hardwareType}
                onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value as GamepadHardwareType;
                  applyPreset(val);
                }}
              >
                {#each PRESET_OPTIONS as opt}
                  <option value={opt.type}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <!-- Real-Time Hardware Axes Gauges (Visual Calibration HUD) -->
        <div class="p-4 bg-zinc-900/50 border border-orange-500/30 rounded-md space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center space-x-2">
              <span>📊 LIVE ANALOG AXES ({liveAxes.length} CHANNELS)</span>
            </h3>
            <span class="text-[10px] text-zinc-400">Values: -1.000 to +1.000</span>
          </div>

          {#if liveAxes.length === 0}
            <div class="text-center py-6 text-zinc-500 text-xs">
              Waiting for controller event... Connect a HOTAS stick, throttle, or gamepad and move any axis.
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {#each liveAxes as rawVal, idx}
                <div class="p-2.5 bg-black/60 border border-orange-500/20 rounded flex flex-col space-y-1.5">
                  <div class="flex justify-between text-[11px] font-bold">
                    <span class="text-orange-400">AXIS {idx}</span>
                    <span class={Math.abs(rawVal) > 0.1 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                      {rawVal.toFixed(3)}
                    </span>
                  </div>
                  <!-- Bi-directional progress bar [-1, 1] -->
                  <div class="w-full h-3 bg-zinc-800 rounded relative overflow-hidden flex items-center">
                    <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-600 z-10"></div>
                    {#if rawVal >= 0}
                      <div
                        class="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-r"
                        style="position: absolute; left: 50%; width: {Math.min(50, rawVal * 50)}%;"
                      ></div>
                    {:else}
                      <div
                        class="h-full bg-gradient-to-l from-orange-600 to-amber-400 rounded-l"
                        style="position: absolute; right: 50%; width: {Math.min(50, Math.abs(rawVal) * 50)}%;"
                      ></div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Axis Mapping & Response Curve Calibration -->
        <div class="p-4 bg-zinc-900/50 border border-orange-500/30 rounded-md space-y-4">
          <div class="flex items-center justify-between border-b border-orange-500/20 pb-2">
            <h3 class="text-xs font-bold text-orange-400 uppercase tracking-widest">
              ⚙️ CAMERA AXIS MAPPING & KINEMATICS
            </h3>
            <!-- Axis Selection Tabs -->
            <div class="flex space-x-1">
              {#each ['yaw', 'pitch', 'zoom', 'panX', 'panY'] as const as axisKey}
                <button
                  type="button"
                  onclick={() => (activeAxisTab = axisKey)}
                  class="px-2.5 py-1 text-xs rounded transition-colors {activeAxisTab === axisKey
                    ? 'bg-orange-500 text-black font-black shadow-[0_0_10px_rgba(249,115,22,0.6)]'
                    : 'bg-zinc-800 text-orange-300 hover:bg-zinc-700'}"
                >
                  {axisKey.toUpperCase()}
                </button>
              {/each}
            </div>
          </div>

          {#if profile[activeAxisTab]}
            {@const cfg = profile[activeAxisTab]}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <!-- Physical Axis Index & Inversion -->
              <div class="space-y-3 bg-black/40 p-3 rounded border border-orange-500/20">
                <div class="space-y-1">
                  <label class="block text-zinc-400 font-bold">PHYSICAL HARDWARE AXIS:</label>
                  <select
                    class="w-full bg-zinc-950 border border-orange-500/40 text-orange-300 px-2 py-1.5 rounded text-xs"
                    value={cfg.axisIndex}
                    onchange={(e) => handleAxisChange(activeAxisTab, 'axisIndex', parseInt((e.target as HTMLSelectElement).value, 10))}
                  >
                    {#each Array(Math.max(8, liveAxes.length)) as _, i}
                      <option value={i}>Axis {i} {liveAxes[i] !== undefined ? `(Current: ${liveAxes[i].toFixed(2)})` : ''}</option>
                    {/each}
                  </select>
                </div>

                <div class="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="invertToggle"
                    checked={cfg.invert}
                    onchange={(e) => handleAxisChange(activeAxisTab, 'invert', (e.target as HTMLInputElement).checked)}
                    class="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <label for="invertToggle" class="text-zinc-300 font-bold cursor-pointer">
                    INVERT AXIS DIRECTION
                  </label>
                </div>
              </div>

              <!-- Deadzone Adjustment -->
              <div class="space-y-2 bg-black/40 p-3 rounded border border-orange-500/20">
                <div class="flex justify-between font-bold">
                  <span class="text-zinc-400">DEADZONE:</span>
                  <span class="text-amber-400 font-mono">{(cfg.deadzone * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.01"
                  value={cfg.deadzone}
                  oninput={(e) => handleAxisChange(activeAxisTab, 'deadzone', parseFloat((e.target as HTMLInputElement).value))}
                  class="w-full accent-orange-500"
                />
                <p class="text-[10px] text-zinc-500">
                  Prevents stick drift when the flight stick is at mechanical center.
                </p>
              </div>

              <!-- Exponential Sensitivity Curve -->
              <div class="space-y-2 bg-black/40 p-3 rounded border border-orange-500/20">
                <div class="flex justify-between font-bold">
                  <span class="text-zinc-400">RESPONSE EXPONENT:</span>
                  <span class="text-amber-400 font-mono">{cfg.exponent.toFixed(1)}x ({cfg.exponent === 1.0 ? 'Linear' : cfg.exponent === 2.0 ? 'Quadratic' : 'Cubic'})</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={cfg.exponent}
                  oninput={(e) => handleAxisChange(activeAxisTab, 'exponent', parseFloat((e.target as HTMLInputElement).value))}
                  class="w-full accent-orange-500"
                />
                <p class="text-[10px] text-zinc-500">
                  Higher exponents allow ultra-fine micro-adjustments near center while preserving full speed at full deflection.
                </p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Button Mapping for Galaxy Map Navigation Functions -->
        <div class="p-4 bg-zinc-900/50 border border-orange-500/30 rounded-md space-y-4">
          <div class="flex items-center justify-between border-b border-orange-500/20 pb-2">
            <h3 class="text-xs font-bold text-orange-400 uppercase tracking-widest">
              🔴 MAP BUTTON MAPPINGS & LIVE BUTTON MATRIX
            </h3>
            <span class="text-[10px] text-zinc-400">Press physical buttons on your HOTAS to test</span>
          </div>

          <!-- Live Physical Buttons Grid -->
          {#if liveButtons.length > 0}
            <div class="flex flex-wrap gap-1.5 p-2 bg-black/50 rounded border border-orange-500/20">
              {#each liveButtons as btn, bIdx}
                <div
                  class="w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded transition-colors {btn.pressed
                    ? 'bg-amber-400 text-black font-black shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}"
                  title="Button {bIdx}"
                >
                  {bIdx}
                </div>
              {/each}
            </div>
          {/if}

          <!-- Canonical Action Binds -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {#each ACTION_LABELS as item}
              <div class="p-3 bg-black/40 border border-orange-500/20 rounded flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-orange-300">{item.label}</div>
                  <div class="text-[10px] text-zinc-500">{item.desc}</div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-zinc-400">BTN:</span>
                  <select
                    class="bg-zinc-950 border border-orange-500/40 text-orange-300 px-2 py-1 rounded text-xs w-20 text-center"
                    value={profile.buttons[item.action] ?? -1}
                    onchange={(e) => handleButtonChange(item.action, parseInt((e.target as HTMLSelectElement).value, 10))}
                  >
                    <option value="-1">NONE</option>
                    {#each Array(Math.max(16, liveButtons.length)) as _, bIdx}
                      <option value={bIdx}>
                        {bIdx} {liveButtons[bIdx]?.pressed ? '★' : ''}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <footer class="flex items-center justify-between px-6 py-3 border-t border-orange-500/30 bg-zinc-900/60 text-xs">
        <div class="flex items-center space-x-2 text-zinc-400">
          <span class="w-2 h-2 rounded-full {connectedGamepads.length > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'}"></span>
          <span>{connectedGamepads.length > 0 ? 'HOTAS / Gamepad Input Polling Active (60 Hz)' : 'No Hardware Controller Connected'}</span>
        </div>
        <button
          type="button"
          onclick={() => {
            isOpen = false;
            if (onClose) onClose();
          }}
          class="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-colors"
        >
          CONFIRM & RETURN TO FLIGHT
        </button>
      </footer>
    </div>
  </div>
{/if}
