<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import ShipSchematicSvg from './ShipSchematicSvg.svelte';
  import SlotLayoutGrid from './SlotLayoutGrid.svelte';
  import {
    SHIP_CHASSIS_CATALOG,
    SHIP_CHASSIS_MAP,
    type ShipChassis,
    type ShipLoadoutState,
    type HardpointSlot,
    type UtilitySlot,
    createStockLoadout,
  } from '$engine/ship_catalog';

  interface Props {
    isOpen: boolean;
    selectedShipId?: string;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    selectedShipId = $bindable('anaconda'),
    onClose,
  }: Props = $props();

  // Search & filter state
  let searchQuery = $state<string>('');
  let selectedClassFilter = $state<'ALL' | 'Small' | 'Medium' | 'Large'>('ALL');
  let selectedManufacturerFilter = $state<string>('ALL');

  // Active Ship Selection
  let selectedShip = $derived<ShipChassis>(
    SHIP_CHASSIS_MAP[selectedShipId] || SHIP_CHASSIS_CATALOG[0]
  );

  // Active Loadout State per Ship (preserves changes between ship switches)
  let loadoutStore = $state<Record<string, ShipLoadoutState>>({});

  // Active loadout for current ship
  let currentLoadout = $derived<ShipLoadoutState>(
    loadoutStore[selectedShip.id] || createStockLoadout(selectedShip)
  );

  // Currently selected slot in schematic or layout grid
  let selectedSlotId = $state<string | null>(null);
  let inspectorSlotInfo = $state<{
    title: string;
    subtitle: string;
    category: string;
    details: string[];
  } | null>(null);

  // Initialize loadouts
  $effect(() => {
    if (!loadoutStore[selectedShip.id]) {
      loadoutStore[selectedShip.id] = createStockLoadout(selectedShip);
    }
  });

  // Filtered ship catalog list
  let filteredShips = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return SHIP_CHASSIS_CATALOG.filter((s) => {
      if (selectedClassFilter !== 'ALL' && s.shipClassLabel !== selectedClassFilter) {
        return false;
      }
      if (selectedManufacturerFilter !== 'ALL' && s.manufacturer !== selectedManufacturerFilter) {
        return false;
      }
      if (q && !s.name.toLowerCase().includes(q) && !s.manufacturer.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  // Distinct manufacturers
  const manufacturers = ['ALL', ...Array.from(new Set(SHIP_CHASSIS_CATALOG.map((s) => s.manufacturer))).sort()];

  function selectShip(ship: ShipChassis) {
    selectedShipId = ship.id;
    if (!loadoutStore[ship.id]) {
      loadoutStore[ship.id] = createStockLoadout(ship);
    }
    selectedSlotId = null;
    inspectorSlotInfo = null;
  }

  function handleSelectHardpoint(hp: HardpointSlot) {
    selectedSlotId = hp.id;
    inspectorSlotInfo = {
      title: `${hp.sizeLabel} Hardpoint // Slot ${hp.id.replace('hp-', '')}`,
      subtitle: `${hp.label} - Convergence Pos [${hp.x}, ${hp.y}]`,
      category: 'WEAPONS HARDPOINT',
      details: [
        `Class Capacity: Size ${hp.size} (${hp.sizeLabel})`,
        `Mount Orientation: ${hp.mount.toUpperCase()}`,
        `Default Weapon: ${hp.size <= 2 ? `${hp.size}F Pulse Laser (Fixed)` : `${hp.size}C Beam Laser (Gimballed)`}`,
        `Installed: ${currentLoadout.hardpointModules[parseInt(hp.id.replace('hp-', '')) - 1] || 'Empty'}`,
      ],
    };
  }

  function handleSelectUtility(ut: UtilitySlot) {
    selectedSlotId = ut.id;
    inspectorSlotInfo = {
      title: `Utility Mount // Slot ${ut.id.replace('ut-', '')}`,
      subtitle: `${ut.label} - External Hull Mount`,
      category: 'UTILITY MOUNT',
      details: [
        `Standard 0-Rating Utility Hardpoint`,
        `Supports: Shield Booster, Chaff, Point Defence, Heat Sink, ECM`,
        `Installed: ${currentLoadout.utilityModules[parseInt(ut.id.replace('ut-', '')) - 1] || 'Empty'}`,
      ],
    };
  }

  function handleSelectLayoutSlot(slotId: string, slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility') {
    selectedSlotId = slotId;
    if (slotType === 'core') {
      const coreKey = slotId.replace('core-', '');
      inspectorSlotInfo = {
        title: `Core Internal // ${coreKey.toUpperCase()}`,
        subtitle: `Standard Factory Frame Mounting`,
        category: 'CORE INTERNALS',
        details: [
          `Component: ${coreKey}`,
          `Default Rating: Standard E-grade stock`,
          `Installed: ${(currentLoadout.coreModules as any)[coreKey] || 'Standard'}`,
        ],
      };
    } else if (slotType === 'optional') {
      const idx = parseInt(slotId.replace('optional-', ''));
      const size = selectedShip.optionalSlots[idx];
      inspectorSlotInfo = {
        title: `Optional Compartment // Slot ${idx + 1}`,
        subtitle: `Class ${size} Multi-Role Bay`,
        category: 'OPTIONAL INTERNALS',
        details: [
          `Max Compartment Size: Class ${size}`,
          `Eligible: Cargo, Shields, Hull Reinforcements, Fuel Scoops, Hangars, Passenger Cabins`,
          `Installed: ${currentLoadout.optionalModules[idx] || '< Empty Slot >'}`,
        ],
      };
    } else if (slotType === 'military') {
      const idx = parseInt(slotId.replace('military-', ''));
      const size = selectedShip.militarySlots[idx];
      inspectorSlotInfo = {
        title: `Military Compartment // Mil-Slot ${idx + 1}`,
        subtitle: `Class ${size} Reinforced Combat Bay`,
        category: 'MILITARY RESTRICTED',
        details: [
          `Max Class: Size ${size}`,
          `Allowed Modules Only: HRP (Hull Reinforcement), MRP (Module Reinforcement), SCB (Shield Cell Bank)`,
          `Installed: ${currentLoadout.militaryModules[idx] || '< Empty Military Bay >'}`,
        ],
      };
    }
  }

  function handleResetStockLoadout() {
    loadoutStore[selectedShip.id] = createStockLoadout(selectedShip);
    inspectorSlotInfo = null;
    selectedSlotId = null;
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none font-mono text-white animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shipbuilder-title"
  >
    <!-- Modal Container -->
    <div
      class="relative w-full max-w-[1440px] h-[92vh] flex flex-col bg-[#050a12] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.35)] overflow-hidden"
    >
      <!-- Top Chrome Bar -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 id="shipbuilder-title" class="text-sm sm:text-base font-bold tracking-wider text-[var(--hud-orange)]">
              ATLAS SHIPYARD // IN-BROWSER SHIPBUILDER & OUTFITTING
            </h2>
            <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-2">
              <span>STAGE 7.1 // 39 FLYABLE HULL CATALOG & HARDPOINT SCHEMATICS</span>
              <span class="text-white/20">|</span>
              <span class="text-white/60">{SHIP_CHASSIS_CATALOG.length} HULL PROFILES LOADED</span>
            </div>
          </div>
        </div>

        <!-- Controls: Quick Reset & Close Button -->
        <div class="flex items-center space-x-3">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] transition-colors flex items-center space-x-1.5"
            onclick={handleResetStockLoadout}
            title="Reset active ship loadout to factory stock baseline"
          >
            <Icon name="reticle" size={13} />
            <span>RESET STOCK</span>
          </button>

          <button
            type="button"
            class="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 hover:border-red-500/50 transition-colors"
            onclick={() => {
              isOpen = false;
              onClose?.();
            }}
            aria-label="Close Shipbuilder"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Layout 3-Column Split -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Column 1: Ship Hull Selector & Quick Filters (Left, 300px) -->
        <div class="w-72 lg:w-80 flex flex-col border-r border-[var(--hud-orange)]/30 bg-black/40">
          <!-- Search & Filter Controls -->
          <div class="p-3 border-b border-[var(--hud-orange)]/20 space-y-2.5">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search 39 flyable hulls..."
                class="w-full bg-black/60 border border-[var(--hud-orange)]/35 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-[var(--hud-orange)] focus:outline-none"
              />
              {#if searchQuery}
                <button
                  type="button"
                  class="absolute right-2 top-2 text-white/50 hover:text-white"
                  onclick={() => (searchQuery = '')}
                >
                  ✕
                </button>
              {/if}
            </div>

            <!-- Size Filter Buttons -->
            <div class="flex items-center space-x-1 text-[10px]">
              {#each ['ALL', 'Small', 'Medium', 'Large'] as sizeKey}
                <button
                  type="button"
                  class="flex-1 py-1 rounded border text-center transition-colors {selectedClassFilter === sizeKey
                    ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
                    : 'bg-black/50 text-[var(--hud-orange)] border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
                  onclick={() => (selectedClassFilter = sizeKey as any)}
                >
                  {sizeKey}
                </button>
              {/each}
            </div>

            <!-- Manufacturer Filter Dropdown -->
            <div class="flex items-center space-x-2 text-[10px]">
              <span class="text-[var(--ed-orange-dim)]">MFG:</span>
              <select
                bind:value={selectedManufacturerFilter}
                class="flex-1 bg-black/80 border border-[var(--hud-orange)]/30 rounded px-1.5 py-1 text-white focus:outline-none text-[11px]"
              >
                {#each manufacturers as mfg}
                  <option value={mfg}>{mfg}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Ship Roster List -->
          <div class="flex-1 overflow-y-auto divide-y divide-[var(--hud-orange)]/15">
            {#each filteredShips as ship}
              {@const isSelected = selectedShip.id === ship.id}
              <button
                type="button"
                class="w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors {isSelected
                  ? 'bg-[var(--hud-orange)]/20 border-l-4 border-l-[var(--hud-orange)] text-white'
                  : 'hover:bg-white/5 text-white/80'}"
                onclick={() => selectShip(ship)}
              >
                <div>
                  <div class="font-bold text-xs flex items-center space-x-2">
                    <span class={isSelected ? 'text-[var(--hud-amber)]' : 'text-white'}>{ship.name}</span>
                    <span class="px-1 text-[9px] rounded bg-white/10 text-white/70 border border-white/20">
                      {ship.shipClassLabel[0]}
                    </span>
                  </div>
                  <div class="text-[10px] text-[var(--ed-orange-dim)]">{ship.manufacturer}</div>
                </div>

                <div class="text-right text-[10px]">
                  <div class="text-white/60">{ship.hullMass} T</div>
                  <div class="text-[var(--hud-orange)]">{ship.hardpointSlots.length} HP // {ship.utilitySlots.length} UT</div>
                </div>
              </button>
            {/each}
            {#if filteredShips.length === 0}
              <div class="p-4 text-center text-white/40 text-xs">
                No ship hulls match active filter.
              </div>
            {/if}
          </div>

          <!-- Total Count Footer -->
          <div class="p-2 border-t border-[var(--hud-orange)]/30 text-center text-[10px] text-[var(--ed-orange-dim)] bg-black/60">
            SHOWING {filteredShips.length} OF {SHIP_CHASSIS_CATALOG.length} SHIPS
          </div>
        </div>

        <!-- Column 2: Interactive Top-Down Schematic SVG & Flight Specs (Center, Flex-1) -->
        <div class="flex-1 flex flex-col border-r border-[var(--hud-orange)]/30 bg-[#02050a]/60 overflow-hidden">
          <!-- Ship Title & Quick Flight Analytics Banner -->
          <div class="px-4 py-3 border-b border-[var(--hud-orange)]/30 bg-black/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center space-x-3">
                <span class="text-lg font-bold tracking-wider text-[var(--hud-amber)]">{selectedShip.name}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--hud-orange)]/60 bg-[var(--hud-orange)]/15 text-[var(--hud-orange)]">
                  CLASS {selectedShip.shipClass} ({selectedShip.shipClassLabel.toUpperCase()} HULL)
                </span>
                <span class="text-xs text-[var(--ed-orange-dim)]">{selectedShip.manufacturer}</span>
              </div>
              <div class="text-[11px] text-white/60 mt-0.5">
                Purchase Cost: {selectedShip.retailCost.toLocaleString()} Cr | Hull Base: {selectedShip.hullCost.toLocaleString()} Cr
              </div>
            </div>

            <!-- Stats Ribbon -->
            <div class="flex items-center space-x-4 text-xs font-mono">
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Mass</div>
                <div class="text-white font-bold">{selectedShip.hullMass} T</div>
              </div>
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Base Shield</div>
                <div class="text-cyan-400 font-bold">{selectedShip.baseShield} MJ</div>
              </div>
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Base Armour</div>
                <div class="text-orange-400 font-bold">{selectedShip.baseArmour} HP</div>
              </div>
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Speed / Boost</div>
                <div class="text-emerald-400 font-bold">{selectedShip.speed} / {selectedShip.boost} m/s</div>
              </div>
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Agility (P/R/Y)</div>
                <div class="text-yellow-400 font-bold">{selectedShip.pitch}° / {selectedShip.roll}° / {selectedShip.yaw}°</div>
              </div>
            </div>
          </div>

          <!-- Schematic Canvas View -->
          <div class="flex-1 relative flex items-center justify-center p-2 overflow-hidden">
            <ShipSchematicSvg
              ship={selectedShip}
              {selectedSlotId}
              onSelectHardpoint={handleSelectHardpoint}
              onSelectUtility={handleSelectUtility}
            />
          </div>

          <!-- Slot Inspector Floating Banner (when a slot is clicked) -->
          {#if inspectorSlotInfo}
            <div class="px-4 py-2 bg-black/90 border-t border-[var(--hud-orange)]/40 flex items-center justify-between text-xs">
              <div>
                <div class="text-[var(--hud-amber)] font-bold">{inspectorSlotInfo.title}</div>
                <div class="text-[10px] text-white/60">{inspectorSlotInfo.subtitle}</div>
              </div>
              <div class="flex items-center space-x-3 text-[10px]">
                {#each inspectorSlotInfo.details as det}
                  <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">{det}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Column 3: Outfitting Grid - Core & Optional Internals (Right, 380px) -->
        <div class="w-80 lg:w-96 flex flex-col bg-black/40 p-3 overflow-hidden">
          <SlotLayoutGrid
            ship={selectedShip}
            loadout={currentLoadout}
            {selectedSlotId}
            onSelectSlot={handleSelectLayoutSlot}
          />
        </div>
      </div>
    </div>
  </div>
{/if}
