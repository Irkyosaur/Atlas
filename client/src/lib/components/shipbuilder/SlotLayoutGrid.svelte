<script lang="ts">
  import type { ShipChassis, ShipLoadoutState, HardpointSlot, UtilitySlot } from '$engine/ship_catalog';
  import {
    type ModuleEngineeringState,
    ENGINEERING_BLUEPRINTS,
    EXPERIMENTAL_EFFECTS,
  } from '$engine/engineering_catalog';

  interface Props {
    ship: ShipChassis;
    loadout: ShipLoadoutState;
    engineeringMap?: Record<string, ModuleEngineeringState>;
    selectedSlotId?: string | null;
    onSelectSlot?: (slotId: string, slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility') => void;
    onOpenEngineering?: (slotId: string, slotTitle: string, slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility', size: number, installedName: string) => void;
  }

  let {
    ship,
    loadout = $bindable(),
    engineeringMap = {},
    selectedSlotId = null,
    onSelectSlot,
    onOpenEngineering,
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

  function getEngineeringSummary(slotId: string) {
    const eng = engineeringMap[slotId];
    if (!eng || !eng.blueprintId || eng.grade === 0) return null;
    const bp = ENGINEERING_BLUEPRINTS[eng.blueprintId];
    const exp = eng.experimentalId ? EXPERIMENTAL_EFFECTS[eng.experimentalId] : null;
    return {
      label: `G${eng.grade} ${bp?.name || 'Engineered'}`,
      grade: eng.grade,
      percent: eng.percent,
      experimental: exp?.name || null,
    };
  }

  // Define core intern keys array to cleanly iterate in template
  const coreSlotKeys = [
    { key: 'bulkheads', id: 'core-bulkheads', name: 'Bulkheads', desc: 'Max Rating Hull Protection', canEng: true },
    { key: 'powerPlant', id: 'core-pp', name: 'Power Plant', desc: 'Primary Fusion Generator', canEng: true },
    { key: 'thrusters', id: 'core-thrusters', name: 'Thrusters', desc: 'Impulse & Boost Propulsion', canEng: true },
    { key: 'frameShiftDrive', id: 'core-fsd', name: 'Frame Shift Drive', desc: 'Hyperspace Propulsion Drive', canEng: true },
    { key: 'lifeSupport', id: 'core-ls', name: 'Life Support', desc: 'Atmospheric Recycling & O2', canEng: false },
    { key: 'powerDistributor', id: 'core-pd', name: 'Power Distributor', desc: 'SYS / ENG / WEP Capacitors', canEng: true },
    { key: 'sensors', id: 'core-sensors', name: 'Sensors', desc: 'Scanner & Radar Array', canEng: false },
    { key: 'fuelTank', id: 'core-fuel', name: 'Fuel Tank', desc: 'Hydrogen Fuel Storage', canEng: false },
  ];
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
      {#each coreSlotKeys as cSlot}
        {@const size = (ship.coreInternals as any)[cSlot.key] || 1}
        {@const installed = (loadout.coreModules as any)[cSlot.key] || 'Standard'}
        {@const eng = getEngineeringSummary(cSlot.id)}
        <div
          class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 {selectedSlotId === cSlot.id
            ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
            : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        >
          <button
            type="button"
            class="flex items-center space-x-3 flex-1 text-left"
            onclick={() => onSelectSlot?.(cSlot.id, 'core')}
          >
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[size] || 'border-white/30'}">
              SIZE {size}
            </span>
            <div>
              <div class="text-white font-medium">{cSlot.name}</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">{cSlot.desc}</div>
              {#if eng}
                <div class="flex items-center space-x-1.5 text-[9px] text-[var(--hud-orange)] mt-0.5">
                  <span class="px-1 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 font-bold">
                    {eng.label}
                  </span>
                  {#if eng.experimental}
                    <span class="text-purple-300">+{eng.experimental}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </button>

          <div class="flex items-center space-x-2">
            <div class="text-right">
              <div class="text-[var(--hud-orange)] font-medium text-[11px]">{installed}</div>
              <div class="text-[9px] text-white/40">
                {#if cSlot.key === 'fuelTank'}
                  {Math.pow(2, size)}T Capacity
                {:else if cSlot.key === 'thrusters'}
                  {ship.speed} m/s
                {:else}
                  Fitted
                {/if}
              </div>
            </div>
            {#if cSlot.canEng}
              <button
                type="button"
                class="px-2 py-1 text-[10px] font-bold rounded border transition-colors {eng
                  ? 'bg-[var(--hud-orange)]/25 border-[var(--hud-amber)] text-[var(--hud-amber)] hover:bg-[var(--hud-orange)]/40'
                  : 'border-white/20 text-white/60 hover:text-[var(--hud-orange)] hover:border-[var(--hud-orange)]/60'}"
                title="Engineer {cSlot.name}"
                onclick={() => onOpenEngineering?.(cSlot.id, cSlot.name, 'core', size, installed)}
              >
                ENG
              </button>
            {/if}
          </div>
        </div>
      {/each}
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
        {@const engOpt = getEngineeringSummary(slotId)}
        <div
          class="flex items-center justify-between p-2 rounded bg-black/40 border transition-all duration-150 {selectedSlotId === slotId
            ? 'border-[var(--hud-amber)] bg-[var(--hud-orange)]/15 shadow-[0_0_10px_rgba(255,153,0,0.3)]'
            : 'border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)]/60 hover:bg-black/60'}"
        >
          <button
            type="button"
            class="flex items-center space-x-3 flex-1 text-left"
            onclick={() => onSelectSlot?.(slotId, 'optional')}
          >
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border {SIZE_BADGE_COLORS[size]}">
              SIZE {size}
            </span>
            <div>
              <div class="text-white font-medium">Slot {idx + 1} Compartment</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)]">Up to Class {size} Module</div>
              {#if engOpt}
                <div class="flex items-center space-x-1.5 text-[9px] text-[var(--hud-orange)] mt-0.5">
                  <span class="px-1 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 font-bold">
                    {engOpt.label}
                  </span>
                  {#if engOpt.experimental}
                    <span class="text-purple-300">+{engOpt.experimental}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </button>

          <div class="flex items-center space-x-2">
            <div class="text-right">
              {#if installed}
                <div class="text-[var(--hud-orange)] font-medium text-[11px]">{installed}</div>
                <div class="text-[9px] text-green-400">Fitted</div>
              {:else}
                <div class="text-white/40 italic text-[11px]">&lt; Empty Slot &gt;</div>
                <div class="text-[9px] text-white/30">Available</div>
              {/if}
            </div>
            {#if installed}
              <button
                type="button"
                class="px-2 py-1 text-[10px] font-bold rounded border transition-colors {engOpt
                  ? 'bg-[var(--hud-orange)]/25 border-[var(--hud-amber)] text-[var(--hud-amber)] hover:bg-[var(--hud-orange)]/40'
                  : 'border-white/20 text-white/60 hover:text-[var(--hud-orange)] hover:border-[var(--hud-orange)]/60'}"
                title="Engineer Slot"
                onclick={() => onOpenEngineering?.(slotId, `Slot ${idx + 1} Module`, 'optional', size, installed)}
              >
                ENG
              </button>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Military Compartments -->
      {#each ship.militarySlots as size, mIdx}
        {@const slotId = `military-${mIdx}`}
        {@const installed = loadout.militaryModules[mIdx]}
        {@const engMil = getEngineeringSummary(slotId)}
        <div
          class="flex items-center justify-between p-2 rounded bg-red-950/20 border transition-all duration-150 {selectedSlotId === slotId
            ? 'border-red-400 bg-red-900/30 shadow-[0_0_10px_rgba(255,50,50,0.3)]'
            : 'border-red-500/30 hover:border-red-400 hover:bg-red-950/40'}"
        >
          <button
            type="button"
            class="flex items-center space-x-3 flex-1 text-left"
            onclick={() => onSelectSlot?.(slotId, 'military')}
          >
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/60 bg-red-900/50 text-red-200">
              MIL {size}
            </span>
            <div>
              <div class="text-red-200 font-medium">Military Slot {mIdx + 1}</div>
              <div class="text-[10px] text-red-400/70">HRP / MRP / SCB Only</div>
              {#if engMil}
                <div class="flex items-center space-x-1.5 text-[9px] text-red-300 mt-0.5">
                  <span class="px-1 rounded bg-red-900/30 border border-red-500/40 font-bold">
                    {engMil.label}
                  </span>
                  {#if engMil.experimental}
                    <span class="text-purple-300">+{engMil.experimental}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </button>

          <div class="flex items-center space-x-2">
            <div class="text-right">
              {#if installed}
                <div class="text-red-300 font-medium text-[11px]">{installed}</div>
                <div class="text-[9px] text-green-400">Fitted</div>
              {:else}
                <div class="text-red-400/40 italic text-[11px]">&lt; Military Empty &gt;</div>
                <div class="text-[9px] text-red-400/30">Restricted</div>
              {/if}
            </div>
            {#if installed}
              <button
                type="button"
                class="px-2 py-1 text-[10px] font-bold rounded border transition-colors {engMil
                  ? 'bg-red-900/40 border-red-400 text-red-200 hover:bg-red-800/50'
                  : 'border-red-500/30 text-red-300/60 hover:text-red-200 hover:border-red-400'}"
                title="Engineer Military Slot"
                onclick={() => onOpenEngineering?.(slotId, `Military Compartment ${mIdx + 1}`, 'military', size, installed)}
              >
                ENG
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
