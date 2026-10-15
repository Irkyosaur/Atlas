<script lang="ts">
  import type { ShipChassis, ShipLoadoutState, HardpointSlot, UtilitySlot } from '$engine/ship_catalog';

  interface Props {
    ship: ShipChassis;
    loadout: ShipLoadoutState;
    selectedSlotId?: string | null;
    onSelectSlot?: (slotId: string, slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility') => void;
  }

  let {
    ship,
    loadout = $bindable(),
    selectedSlotId = null,
    onSelectSlot,
  }: Props = $props();

  // Color mapping for sizes
  const SIZE_BADGE_COLORS: Record<number, string> = {
    8: 'bg-purple-900/60 text-purple-300 border-purple-500/50',
    7: 'bg-indigo-900/60 text-indigo-300 border-indigo-500/50',
    6: 'bg-blue-900/60 text-blue-300 border-blue-500/50',
    5: 'bg-cyan-900/60 text-cyan-300 border-cyan-500/50',
    4: 'bg-teal-900/60 text-teal-300 border-teal-500/50',
    3: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50',
    2: 'bg-amber-900/60 text-amber-300 border-amber-500/50',
    1: 'bg-orange-900/60 text-orange-300 border-orange-500/50',
  };

  const CORE_NAMES: Record<string, string> = {
    bulkheads: 'Bulkheads',
    powerPlant: 'Power Plant',
    thrusters: 'Thrusters',
    frameShiftDrive: 'Frame Shift Drive',
    lifeSupport: 'Life Support',
    powerDistributor: 'Power Distributor',
    sensors: 'Sensors',
    fuelTank: 'Fuel Tank',
  };
</script>

<div class="w-full h-full flex flex-col space-y-4 font-mono text-xs overflow-y-auto pr-1">
  <!-- Section 1: Core Internals -->
  <div class="space-y-2">
    <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/30 pb-1">
      <div class="flex items-center space-x-2 text-[var(--hud-amber)] font-bold uppercase tracking-wider text-[11px]">
        <span class="w-2 h-2 bg-[var(--hud-orange)] rounded-sm"></span>
        <span>CORE INTERNALS</span>
      </div>
      <span class="text-[10px] text-[var(--ed-orange-dim)]">8 ESSENTIAL SYSTEMS</span>
    </div>

    <div class="grid grid-cols-1 gap-1.5">
      <!-- Bulkheads -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-bulkheads'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-bulkheads', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.bulkheads] || 'border-white/30'}">
            SIZE {ship.coreInternals.bulkheads}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.bulkheads}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Max Rating Hull Protection</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.bulkheads}</div>
          <div class="text-[9px] text-white/40">Default Alloys</div>
        </div>
      </button>

      <!-- Power Plant -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-pp'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-pp', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.powerPlant]}">
            SIZE {ship.coreInternals.powerPlant}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.powerPlant}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Primary Fusion Generator</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.powerPlant}</div>
          <div class="text-[9px] text-white/40">Standard Reactor</div>
        </div>
      </button>

      <!-- Thrusters -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-thrusters'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-thrusters', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.thrusters]}">
            SIZE {ship.coreInternals.thrusters}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.thrusters}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Impulse & Boost Propulsion</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.thrusters}</div>
          <div class="text-[9px] text-white/40">{ship.speed} m/s ({ship.boost} boost)</div>
        </div>
      </button>

      <!-- Frame Shift Drive -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-fsd'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-fsd', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.frameShiftDrive]}">
            SIZE {ship.coreInternals.frameShiftDrive}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.frameShiftDrive}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Hyperspace Propulsion Drive</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.frameShiftDrive}</div>
          <div class="text-[9px] text-white/40">Standard Hyperdrive</div>
        </div>
      </button>

      <!-- Life Support -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-ls'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-ls', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.lifeSupport]}">
            SIZE {ship.coreInternals.lifeSupport}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.lifeSupport}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Atmospheric Recycling & O2</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.lifeSupport}</div>
          <div class="text-[9px] text-white/40">7m 30s Emergency</div>
        </div>
      </button>

      <!-- Power Distributor -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-pd'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-pd', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.powerDistributor]}">
            SIZE {ship.coreInternals.powerDistributor}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.powerDistributor}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">SYS / ENG / WEP Capacitors</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.powerDistributor}</div>
          <div class="text-[9px] text-white/40">Capacitor Bank</div>
        </div>
      </button>

      <!-- Sensors -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-sensors'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-sensors', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.sensors]}">
            SIZE {ship.coreInternals.sensors}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.sensors}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Scanner & Radar Array</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.sensors}</div>
          <div class="text-[9px] text-white/40">Standard Array</div>
        </div>
      </button>

      <!-- Fuel Tank -->
      <button
        type="button"
        class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === 'core-fuel'
          ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
          : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        onclick={() => onSelectSlot?.('core-fuel', 'core')}
      >
        <div class="flex items-center space-x-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[ship.coreInternals.fuelTank]}">
            SIZE {ship.coreInternals.fuelTank}
          </span>
          <div>
            <div class="text-white font-medium">{CORE_NAMES.fuelTank}</div>
            <div class="text-[10px] text-[var(--ed-orange-dim)]">Hydrogen Fuel Storage</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[var(--hud-orange)] font-medium text-[11px]">{loadout.coreModules.fuelTank}</div>
          <div class="text-[9px] text-white/40">{Math.pow(2, ship.coreInternals.fuelTank)}T Capacity</div>
        </div>
      </button>
    </div>
  </div>

  <!-- Section 2: Optional Internals & Military Compartments -->
  <div class="space-y-2 pt-2">
    <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/30 pb-1">
      <div class="flex items-center space-x-2 text-[var(--hud-amber)] font-bold uppercase tracking-wider text-[11px]">
        <span class="w-2 h-2 bg-blue-500 rounded-sm"></span>
        <span>OPTIONAL INTERNALS</span>
      </div>
      <span class="text-[10px] text-[var(--ed-orange-dim)]">
        {ship.optionalSlots.length} SLOTS {ship.militarySlots.length > 0 ? `(+${ship.militarySlots.length} MIL)` : ''}
      </span>
    </div>

    <div class="grid grid-cols-1 gap-1.5">
      <!-- Standard Optional Slots -->
      {#each ship.optionalSlots as size, idx}
        {@const slotId = `optional-${idx}`}
        {@const installed = loadout.optionalModules[idx]}
        <button
          type="button"
          class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 text-left {selectedSlotId === slotId
            ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
            : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
          onclick={() => onSelectSlot?.(slotId, 'optional')}
        >
          <div class="flex items-center space-x-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[size]}">
              SIZE {size}
            </span>
            <div>
              <div class="text-white font-medium">Slot {idx + 1} Compartment</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Up to Class {size} Module</div>
            </div>
          </div>
          <div class="text-right">
            {#if installed}
              <div class="text-[var(--hud-orange)] font-medium text-[11px]">{installed}</div>
              <div class="text-[9px] text-green-400">Fitted</div>
            {:else}
              <div class="text-white/40 italic text-[11px]">&lt; Empty Slot &gt;</div>
              <div class="text-[9px] text-white/30">Available</div>
            {/if}
          </div>
        </button>
      {/each}

      <!-- Military Compartments -->
      {#each ship.militarySlots as size, mIdx}
        {@const slotId = `military-${mIdx}`}
        {@const installed = loadout.militaryModules[mIdx]}
        <button
          type="button"
          class="flex items-center justify-between p-2 rounded bg-red-950/20 border transition-all duration-150 text-left {selectedSlotId === slotId
            ? 'border-red-400 bg-red-900/30 shadow-[0_0_10px_rgba(255,50,50,0.3)]'
            : 'border-red-500/30 hover:border-red-400 hover:bg-red-950/40'}"
          onclick={() => onSelectSlot?.(slotId, 'military')}
        >
          <div class="flex items-center space-x-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/60 bg-red-900/50 text-red-200">
              MIL {size}
            </span>
            <div>
              <div class="text-red-200 font-medium">Military Slot {mIdx + 1}</div>
              <div class="text-[10px] text-red-400/70">HRP / MRP / SCB Only</div>
            </div>
          </div>
          <div class="text-right">
            {#if installed}
              <div class="text-red-300 font-medium text-[11px]">{installed}</div>
              <div class="text-[9px] text-green-400">Fitted</div>
            {:else}
              <div class="text-red-400/40 italic text-[11px]">&lt; Military Empty &gt;</div>
              <div class="text-[9px] text-red-400/30">Restricted</div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
