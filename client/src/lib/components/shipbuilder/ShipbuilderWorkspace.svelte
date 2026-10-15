<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import ShipSchematicSvg from './ShipSchematicSvg.svelte';
  import SlotLayoutGrid from './SlotLayoutGrid.svelte';
  import EngineeringCustomizerModal from './EngineeringCustomizerModal.svelte';
  import EngineeringMaterialLedgerModal from './EngineeringMaterialLedgerModal.svelte';
  import ThermalPowerSimulator from './ThermalPowerSimulator.svelte';
  import CombatJumpAnalyticsDrawer from './CombatJumpAnalyticsDrawer.svelte';
  import LoadoutImportExportModal from './LoadoutImportExportModal.svelte';
  import {
    SHIP_CHASSIS_CATALOG,
    SHIP_CHASSIS_MAP,
    type ShipChassis,
    type ShipLoadoutState,
    type HardpointSlot,
    type UtilitySlot,
    createStockLoadout,
  } from '$engine/ship_catalog';
  import {
    type ModuleEngineeringState,
    type MaterialRequirementsLedger,
    calculateMaterialLedger,
    ENGINEERING_BLUEPRINTS,
    EXPERIMENTAL_EFFECTS,
    getDefaultModuleStats,
    calculateEngineeredStats,
  } from '$engine/engineering_catalog';
  import { calculateJumpRange } from '$engine/combat_jump_engine';

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

  // Engineering State per Ship and Slot: record of shipId -> (slotId -> ModuleEngineeringState)
  let engineeringStore = $state<Record<string, Record<string, ModuleEngineeringState>>>({});

  let currentShipEngineering = $derived<Record<string, ModuleEngineeringState>>(
    engineeringStore[selectedShip.id] || {}
  );

  // Material Requirements Ledger for current ship build
  let materialLedger = $derived<MaterialRequirementsLedger>(
    calculateMaterialLedger(currentShipEngineering)
  );

  // Engineering Modal state
  let isEngineeringModalOpen = $state<boolean>(false);
  let activeEngineeringSlot = $state<{
    slotId: string;
    slotTitle: string;
    slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility';
    slotSize: number;
    installedName: string;
  } | null>(null);

  // Materials Ledger Modal state
  let isLedgerModalOpen = $state<boolean>(false);

  // Thermal & Power Simulator Drawer state
  let isThermalSimulatorOpen = $state<boolean>(false);

  // Combat Defenses & Jump Analytics Drawer state (Stage 7.4)
  let isCombatAnalyticsOpen = $state<boolean>(false);

  // Loadout Import / Export Modal state (Stage 7.4)
  let isImportExportOpen = $state<boolean>(false);

  // Quick live jump range calculation
  let quickJumpStats = $derived(
    calculateJumpRange(selectedShip, currentLoadout, currentShipEngineering)
  );

  // Currently selected slot in schematic or layout grid
  let selectedSlotId = $state<string | null>(null);
  let inspectorSlotInfo = $state<{
    title: string;
    subtitle: string;
    category: string;
    details: string[];
    canEngineer?: boolean;
    slotData?: {
      slotId: string;
      title: string;
      slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility';
      size: number;
      installedName: string;
    };
  } | null>(null);

  // Live computed ship dynamic stats considering engineering modifications
  let liveShipMetrics = $derived.by(() => {
    let speedMult = 1.0;
    let boostMult = 1.0;
    let totalMassDelta = 0;

    // Check thrusters engineering
    const thrustersEng = currentShipEngineering['core-thrusters'];
    let thrusterOptMul = 100.0;
    if (thrustersEng && thrustersEng.blueprintId && thrustersEng.grade > 0) {
      const base = getDefaultModuleStats('core-thrusters', 'core', selectedShip.coreInternals.thrusters, currentLoadout.coreModules.thrusters);
      const calc = calculateEngineeredStats(base, thrustersEng);
      if (calc.modifiedOptMul) {
        thrusterOptMul = calc.modifiedOptMul;
        const ratio = calc.modifiedOptMul / 100.0;
        speedMult = ratio;
        boostMult = ratio;
      }
    }

    return {
      speed: Math.round(selectedShip.speed * speedMult),
      boost: Math.round(selectedShip.boost * boostMult),
      thrusterOptMul,
    };
  });

  // Count of engineered modules on current ship
  let engineeredModulesCount = $derived(
    Object.values(currentShipEngineering).filter((e) => e && e.blueprintId && e.grade > 0).length
  );

  // Initialize loadouts
  $effect(() => {
    if (!loadoutStore[selectedShip.id]) {
      loadoutStore[selectedShip.id] = createStockLoadout(selectedShip);
    }
    if (!engineeringStore[selectedShip.id]) {
      engineeringStore[selectedShip.id] = {};
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
    if (!engineeringStore[ship.id]) {
      engineeringStore[ship.id] = {};
    }
    selectedSlotId = null;
    inspectorSlotInfo = null;
  }

  function openEngineeringForSlot(
    slotId: string,
    slotTitle: string,
    slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility',
    size: number,
    installedName: string
  ) {
    activeEngineeringSlot = {
      slotId,
      slotTitle,
      slotType,
      slotSize: size,
      installedName,
    };
    isEngineeringModalOpen = true;
  }

  function handleApplyEngineering(slotId: string, state: ModuleEngineeringState) {
    if (!engineeringStore[selectedShip.id]) {
      engineeringStore[selectedShip.id] = {};
    }
    if (state.blueprintId && state.grade > 0) {
      engineeringStore[selectedShip.id] = {
        ...engineeringStore[selectedShip.id],
        [slotId]: state,
      };
    } else {
      const updated = { ...engineeringStore[selectedShip.id] };
      delete updated[slotId];
      engineeringStore[selectedShip.id] = updated;
    }
  }

  function handleSelectHardpoint(hp: HardpointSlot) {
    selectedSlotId = hp.id;
    const hpIndex = parseInt(hp.id.replace('hp-', '')) - 1;
    const installed = currentLoadout.hardpointModules[hpIndex] || (hp.size <= 2 ? `${hp.size}F Pulse Laser (Fixed)` : `${hp.size}C Beam Laser (Gimballed)`);
    const eng = currentShipEngineering[hp.id];
    const engDesc = eng && eng.blueprintId ? ` [G${eng.grade} ${ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered'}${eng.experimentalId ? ` + ${EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name}` : ''}]` : '';

    inspectorSlotInfo = {
      title: `${hp.sizeLabel} Hardpoint // Slot ${hp.id.replace('hp-', '')}`,
      subtitle: `${hp.label} - Convergence Pos [${hp.x}, ${hp.y}]${engDesc}`,
      category: 'WEAPONS HARDPOINT',
      details: [
        `Class Capacity: Size ${hp.size} (${hp.sizeLabel})`,
        `Mount Orientation: ${hp.mount.toUpperCase()}`,
        `Installed: ${installed}`,
        eng ? `Engineering: G${eng.grade} (${eng.percent}%)` : 'Engineering: Stock',
      ],
      canEngineer: true,
      slotData: {
        slotId: hp.id,
        title: `${hp.sizeLabel} Hardpoint (${hp.id})`,
        slotType: 'hardpoint',
        size: hp.size,
        installedName: installed,
      },
    };
  }

  function handleSelectUtility(ut: UtilitySlot) {
    selectedSlotId = ut.id;
    const utIndex = parseInt(ut.id.replace('ut-', '')) - 1;
    const installed = currentLoadout.utilityModules[utIndex] || '0A Shield Booster';

    inspectorSlotInfo = {
      title: `Utility Mount // Slot ${ut.id.replace('ut-', '')}`,
      subtitle: `${ut.label} - External Hull Mount`,
      category: 'UTILITY MOUNT',
      details: [
        `Standard 0-Rating Utility Hardpoint`,
        `Supports: Shield Booster, Chaff, Point Defence, Heat Sink, ECM`,
        `Installed: ${installed}`,
      ],
      canEngineer: false,
    };
  }

  function handleSelectLayoutSlot(slotId: string, slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility') {
    selectedSlotId = slotId;
    if (slotType === 'core') {
      const coreKey = slotId.replace('core-', '');
      const installed = (currentLoadout.coreModules as any)[coreKey] || 'Standard';
      const size = (selectedShip.coreInternals as any)[coreKey] || 7;
      const eng = currentShipEngineering[slotId];
      const engDesc = eng && eng.blueprintId ? ` [G${eng.grade} ${ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered'}${eng.experimentalId ? ` + ${EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name}` : ''}]` : '';

      inspectorSlotInfo = {
        title: `Core Internal // ${coreKey.toUpperCase()}`,
        subtitle: `Standard Factory Frame Mounting${engDesc}`,
        category: 'CORE INTERNALS',
        details: [
          `Component: ${coreKey} (Size ${size})`,
          `Installed: ${installed}`,
          eng ? `Engineering: G${eng.grade} (${eng.percent}%)` : 'Engineering: Stock',
        ],
        canEngineer: true,
        slotData: {
          slotId,
          title: `Core ${coreKey}`,
          slotType: 'core',
          size,
          installedName: installed,
        },
      };
    } else if (slotType === 'optional') {
      const idx = parseInt(slotId.replace('optional-', ''));
      const size = selectedShip.optionalSlots[idx];
      const installed = currentLoadout.optionalModules[idx] || `Class ${size} Multi-Role Bay`;
      const eng = currentShipEngineering[slotId];
      const engDesc = eng && eng.blueprintId ? ` [G${eng.grade} ${ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered'}${eng.experimentalId ? ` + ${EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name}` : ''}]` : '';

      inspectorSlotInfo = {
        title: `Optional Compartment // Slot ${idx + 1}`,
        subtitle: `Class ${size} Multi-Role Bay${engDesc}`,
        category: 'OPTIONAL INTERNALS',
        details: [
          `Max Compartment Size: Class ${size}`,
          `Installed: ${installed}`,
          eng ? `Engineering: G${eng.grade} (${eng.percent}%)` : 'Engineering: Stock',
        ],
        canEngineer: true,
        slotData: {
          slotId,
          title: `Slot ${idx + 1} Module`,
          slotType: 'optional',
          size,
          installedName: installed,
        },
      };
    } else if (slotType === 'military') {
      const idx = parseInt(slotId.replace('military-', ''));
      const size = selectedShip.militarySlots[idx];
      const installed = currentLoadout.militaryModules[idx] || `Class ${size} Hull Reinforcement`;
      const eng = currentShipEngineering[slotId];
      const engDesc = eng && eng.blueprintId ? ` [G${eng.grade} ${ENGINEERING_BLUEPRINTS[eng.blueprintId]?.name || 'Engineered'}${eng.experimentalId ? ` + ${EXPERIMENTAL_EFFECTS[eng.experimentalId]?.name}` : ''}]` : '';

      inspectorSlotInfo = {
        title: `Military Compartment // Mil-Slot ${idx + 1}`,
        subtitle: `Class ${size} Reinforced Combat Bay${engDesc}`,
        category: 'MILITARY RESTRICTED',
        details: [
          `Max Class: Size ${size}`,
          `Installed: ${installed}`,
          eng ? `Engineering: G${eng.grade} (${eng.percent}%)` : 'Engineering: Stock',
        ],
        canEngineer: true,
        slotData: {
          slotId,
          title: `Military Compartment ${idx + 1}`,
          slotType: 'military',
          size,
          installedName: installed,
        },
      };
    }
  }

  function handleResetStockLoadout() {
    loadoutStore[selectedShip.id] = createStockLoadout(selectedShip);
    engineeringStore[selectedShip.id] = {};
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
              ATLAS SHIPYARD // IN-BROWSER SHIPBUILDER & ENGINEERING CUSTOMIZER
            </h2>
            <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-2">
              <span>STAGE 7.4 // TTK MATRIX & JUMP OPTIMIZER</span>
              <span class="text-white/20">|</span>
              <span class="text-white/60">{SHIP_CHASSIS_CATALOG.length} HULL PROFILES</span>
              {#if engineeredModulesCount > 0}
                <span class="text-white/20">|</span>
                <span class="text-[var(--hud-amber)] font-bold">{engineeredModulesCount} MODULES ENGINEERED</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Controls: Combat TTK & Jump, Thermal Simulator, Import/Export, Materials Ledger, Quick Reset & Close Button -->
        <div class="flex items-center space-x-2">
          <!-- Combat Defenses & Jump Range Optimizer Button (Stage 7.4) -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border transition-colors flex items-center space-x-1.5 bg-cyan-950/40 border-cyan-500/60 text-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-bold"
            onclick={() => (isCombatAnalyticsOpen = true)}
            title="Open Combat TTK Matrix & Jump Range Optimizer"
          >
            <Icon name="reticle" size={13} color="#22d3ee" />
            <span>TTK & JUMP OPT</span>
          </button>

          <!-- Power & Thermal Simulator Button (Stage 7.3) -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border transition-colors flex items-center space-x-1.5 bg-orange-950/40 border-orange-500/60 text-orange-300 hover:bg-orange-900/60 shadow-[0_0_10px_rgba(255,102,0,0.3)] font-bold"
            onclick={() => (isThermalSimulatorOpen = true)}
            title="Open Power Priority & Thermal Dissipation Simulator"
          >
            <Icon name="reticle" size={13} color="#f97316" />
            <span>THERMAL SIM</span>
          </button>

          <!-- Import / Export Button (Stage 7.4) -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border transition-colors flex items-center space-x-1.5 bg-black/60 border-white/25 text-white/80 hover:text-white hover:border-[var(--hud-orange)] font-bold"
            onclick={() => (isImportExportOpen = true)}
            title="Import/Export build via Coriolis, EDSY SLEF, or Atlas shortcode"
          >
            <Icon name="cargo" size={13} />
            <span>IMPORT / EXPORT</span>
          </button>

          <!-- Material Requirements Ledger Button -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border transition-colors flex items-center space-x-1.5 {materialLedger.totalMaterialsCount > 0
              ? 'bg-[var(--hud-orange)]/25 border-[var(--hud-amber)] text-[var(--hud-amber)] hover:bg-[var(--hud-orange)]/40 shadow-[0_0_10px_rgba(255,153,0,0.3)] font-bold'
              : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'}"
            onclick={() => (isLedgerModalOpen = true)}
            title="View Bill of Materials for this engineered build"
          >
            <Icon name="cargo" size={13} />
            <span>LEDGER ({materialLedger.totalMaterialsCount})</span>
          </button>

          <button
            type="button"
            class="px-2 py-1 text-xs rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 text-[var(--hud-amber)] transition-colors flex items-center space-x-1"
            onclick={handleResetStockLoadout}
            title="Reset active ship loadout and engineering to factory stock baseline"
          >
            <Icon name="reticle" size={13} />
            <span>RESET</span>
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

            <!-- Stats Ribbon with Dynamic Engineered Output -->
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
                <div class="font-bold {liveShipMetrics.speed > selectedShip.speed ? 'text-emerald-400' : 'text-emerald-300'}">
                  {liveShipMetrics.speed} / {liveShipMetrics.boost} m/s
                </div>
              </div>
              <div class="text-center">
                <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">Thruster OptMul</div>
                <div class="font-bold {liveShipMetrics.thrusterOptMul > 100 ? 'text-[var(--hud-amber)]' : 'text-yellow-400'}">
                  {liveShipMetrics.thrusterOptMul.toFixed(1)}%
                </div>
              </div>
              <button
                type="button"
                class="text-center px-2 py-1 rounded bg-black/60 border border-cyan-500/40 hover:border-cyan-400 transition-colors cursor-pointer"
                onclick={() => (isCombatAnalyticsOpen = true)}
                title="View full Jump Range Optimization & Combat TTK analytics"
              >
                <div class="text-[10px] text-cyan-400 uppercase font-semibold">Jump (Unladen / Max)</div>
                <div class="font-bold text-cyan-300">
                  {quickJumpStats.unladenJump} / {quickJumpStats.maximumJump} <span class="text-[10px] font-normal text-cyan-500">LY</span>
                </div>
              </button>
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
            <div class="px-4 py-2.5 bg-black/95 border-t border-[var(--hud-orange)]/40 flex items-center justify-between text-xs">
              <div>
                <div class="text-[var(--hud-amber)] font-bold">{inspectorSlotInfo.title}</div>
                <div class="text-[10px] text-white/60">{inspectorSlotInfo.subtitle}</div>
              </div>
              <div class="flex items-center space-x-3 text-[10px]">
                {#each inspectorSlotInfo.details as det}
                  <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">{det}</span>
                {/each}

                {#if inspectorSlotInfo.canEngineer && inspectorSlotInfo.slotData}
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded bg-[var(--hud-orange)] text-black font-bold hover:bg-[var(--hud-amber)] transition-colors shadow-[0_0_8px_rgba(255,153,0,0.4)]"
                    onclick={() => openEngineeringForSlot(
                      inspectorSlotInfo!.slotData!.slotId,
                      inspectorSlotInfo!.slotData!.title,
                      inspectorSlotInfo!.slotData!.slotType,
                      inspectorSlotInfo!.slotData!.size,
                      inspectorSlotInfo!.slotData!.installedName
                    )}
                  >
                    CUSTOMIZE ENGINEERING
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- Column 3: Outfitting Grid - Core & Optional Internals (Right, 380px) -->
        <div class="w-80 lg:w-96 flex flex-col bg-black/40 p-3 overflow-hidden">
          <SlotLayoutGrid
            ship={selectedShip}
            loadout={currentLoadout}
            engineeringMap={currentShipEngineering}
            {selectedSlotId}
            onSelectSlot={handleSelectLayoutSlot}
            onOpenEngineering={openEngineeringForSlot}
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Engineering Customizer Modal -->
  {#if activeEngineeringSlot}
    <EngineeringCustomizerModal
      isOpen={isEngineeringModalOpen}
      slotId={activeEngineeringSlot.slotId}
      slotTitle={activeEngineeringSlot.slotTitle}
      slotType={activeEngineeringSlot.slotType}
      slotSize={activeEngineeringSlot.slotSize}
      installedName={activeEngineeringSlot.installedName}
      currentEngineering={currentShipEngineering[activeEngineeringSlot.slotId]}
      onApplyEngineering={handleApplyEngineering}
      onClose={() => {
        isEngineeringModalOpen = false;
        activeEngineeringSlot = null;
      }}
    />
  {/if}

  <!-- Materials Ledger Modal -->
  <EngineeringMaterialLedgerModal
    isOpen={isLedgerModalOpen}
    ledger={materialLedger}
    onClose={() => (isLedgerModalOpen = false)}
  />

  <!-- Power Priority & Thermal Dissipation Simulator Drawer (Stage 7.3) -->
  <ThermalPowerSimulator
    isOpen={isThermalSimulatorOpen}
    ship={selectedShip}
    loadout={currentLoadout}
    engineeringMap={currentShipEngineering}
    onClose={() => (isThermalSimulatorOpen = false)}
  />

  <!-- Combat TTK Matrix & Jump Range Optimizer Drawer (Stage 7.4) -->
  <CombatJumpAnalyticsDrawer
    isOpen={isCombatAnalyticsOpen}
    ship={selectedShip}
    loadout={currentLoadout}
    engineeringMap={currentShipEngineering}
    onClose={() => (isCombatAnalyticsOpen = false)}
  />

  <!-- Loadout Import / Export Modal (Stage 7.4) -->
  <LoadoutImportExportModal
    isOpen={isImportExportOpen}
    ship={selectedShip}
    loadout={currentLoadout}
    engineeringMap={currentShipEngineering}
    onImportBuild={(importedShip, importedLoadout, importedEng) => {
      selectedShipId = importedShip.id;
      loadoutStore[importedShip.id] = importedLoadout;
      engineeringStore[importedShip.id] = importedEng;
      selectedSlotId = null;
      inspectorSlotInfo = null;
    }}
    onClose={() => (isImportExportOpen = false)}
  />
{/if}
