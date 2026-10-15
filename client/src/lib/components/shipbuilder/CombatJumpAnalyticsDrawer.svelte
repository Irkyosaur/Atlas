<script lang="ts">
  import type { ShipChassis, ShipLoadoutState } from '$engine/ship_catalog';
  import type { ModuleEngineeringState } from '$engine/engineering_catalog';
  import {
    calculateJumpRange,
    calculateDefensesSummary,
    calculateCombatTTKMatrix,
    type JumpRangeAnalytics,
    type DefensesSummary,
    type ThreatTTKProjection,
  } from '$engine/combat_jump_engine';

  interface Props {
    ship: ShipChassis;
    loadout: ShipLoadoutState;
    engineeringMap: Record<string, ModuleEngineeringState>;
    isOpen: boolean;
    onClose: () => void;
  }

  let {
    ship,
    loadout,
    engineeringMap,
    isOpen = false,
    onClose,
  }: Props = $props();

  // Active analytics tab
  let activeTab = $state<'jump' | 'defenses' | 'ttk'>('jump');

  // Jump range analytics
  let jumpAnalytics = $derived<JumpRangeAnalytics>(
    calculateJumpRange(ship, loadout, engineeringMap)
  );

  // Defenses & Shield/Armour EHP analytics
  let defensesSummary = $derived<DefensesSummary>(
    calculateDefensesSummary(ship, loadout, engineeringMap)
  );

  // TTK Matrix projections
  let ttkProjections = $derived<ThreatTTKProjection[]>(
    calculateCombatTTKMatrix(defensesSummary)
  );
</script>

{#if isOpen}
  <!-- Analytics Drawer Modal -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-mono text-white select-none animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="combat-drawer-title"
  >
    <div
      class="relative w-full max-w-5xl h-[88vh] flex flex-col bg-[#050a14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_45px_rgba(255,102,0,0.4)] overflow-hidden"
    >
      <!-- Header Bar -->
      <div class="px-5 py-3 bg-black/90 border-b border-[var(--hud-orange)]/40 flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-3">
            <span class="w-3 h-3 bg-[var(--hud-orange)] rounded-full animate-pulse shadow-[0_0_8px_#f97316]"></span>
            <h2 id="combat-drawer-title" class="text-sm sm:text-base font-bold tracking-wider text-[var(--hud-amber)]">
              COMBAT TTK MATRIX & FSD JUMP OPTIMIZER // {ship.name.toUpperCase()}
            </h2>
          </div>
          <div class="text-[10px] text-[var(--ed-orange-dim)] mt-0.5">
            Stage 7.4parities: Elite Dangerous FSD physics, Shield EHP diminishing returns & threat TTK projection
          </div>
        </div>

        <!-- Tab Toggle Buttons -->
        <div class="flex items-center space-x-1.5 bg-black/60 p-1 rounded border border-white/10">
          <button
            type="button"
            class="px-3 py-1 text-xs rounded transition-colors {activeTab === 'jump'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-[0_0_10px_rgba(255,102,0,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'}"
            onclick={() => (activeTab = 'jump')}
          >
            FSD JUMP RANGE
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs rounded transition-colors {activeTab === 'defenses'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-[0_0_10px_rgba(255,102,0,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'}"
            onclick={() => (activeTab = 'defenses')}
          >
            SHIELD & ARMOUR EHP
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs rounded transition-colors {activeTab === 'ttk'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow-[0_0_10px_rgba(255,102,0,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'}"
            onclick={() => (activeTab = 'ttk')}
          >
            COMBAT TTK MATRIX
          </button>
        </div>

        <!-- Close Button -->
        <button
          type="button"
          class="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 transition-colors"
          onclick={onClose}
          aria-label="Close Drawer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Drawer Content Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-6">
        {#if activeTab === 'jump'}
          <!-- TAB 1: JUMP RANGE OPTIMIZATION -->
          <div class="space-y-6">
            <!-- 3 Main Big Metrics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Unladen Jump Range -->
              <div class="p-4 rounded-lg bg-black/60 border border-cyan-500/40 relative overflow-hidden">
                <div class="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Unladen Jump Range</div>
                <div class="text-3xl font-extrabold text-cyan-300 mt-2 font-mono">
                  {jumpAnalytics.unladenJump} <span class="text-sm font-normal text-cyan-500">LY</span>
                </div>
                <div class="text-[10px] text-white/50 mt-1">
                  Full fuel tank ({jumpAnalytics.fuelCapacity}T), zero cargo
                </div>
                <div class="w-full bg-cyan-950/60 h-1.5 rounded mt-3 overflow-hidden">
                  <div
                    class="bg-cyan-400 h-full rounded"
                    style="width: {Math.min(100, (jumpAnalytics.unladenJump / 80) * 100)}%"
                  ></div>
                </div>
              </div>

              <!-- Laden Jump Range -->
              <div class="p-4 rounded-lg bg-black/60 border border-amber-500/40 relative overflow-hidden">
                <div class="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Laden Jump Range</div>
                <div class="text-3xl font-extrabold text-amber-300 mt-2 font-mono">
                  {jumpAnalytics.ladenJump} <span class="text-sm font-normal text-amber-500">LY</span>
                </div>
                <div class="text-[10px] text-white/50 mt-1">
                  Full fuel tank + maximum cargo load ({jumpAnalytics.cargoCapacity}T)
                </div>
                <div class="w-full bg-amber-950/60 h-1.5 rounded mt-3 overflow-hidden">
                  <div
                    class="bg-amber-400 h-full rounded"
                    style="width: {Math.min(100, (jumpAnalytics.ladenJump / 80) * 100)}%"
                  ></div>
                </div>
              </div>

              <!-- Maximum Jump Range -->
              <div class="p-4 rounded-lg bg-black/60 border border-emerald-500/40 relative overflow-hidden">
                <div class="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Maximum (Fume) Jump</div>
                <div class="text-3xl font-extrabold text-emerald-300 mt-2 font-mono">
                  {jumpAnalytics.maximumJump} <span class="text-sm font-normal text-emerald-500">LY</span>
                </div>
                <div class="text-[10px] text-white/50 mt-1">
                  Empty cargo racks and minimal single-jump reserve fuel
                </div>
                <div class="w-full bg-emerald-950/60 h-1.5 rounded mt-3 overflow-hidden">
                  <div
                    class="bg-emerald-400 h-full rounded"
                    style="width: {Math.min(100, (jumpAnalytics.maximumJump / 80) * 100)}%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Authentic FSD Physics Calculation Breakdown -->
            <div class="p-4 rounded bg-black/50 border border-[var(--hud-orange)]/30 space-y-3">
              <div class="text-xs font-bold text-[var(--hud-amber)] uppercase tracking-wider flex items-center space-x-2">
                <span class="w-2 h-2 bg-[var(--hud-orange)] rounded-sm"></span>
                <span>AUTHENTIC ELITE DANGEROUS HYPERSPACE PROPULSION EQUATION</span>
              </div>
              <div class="p-3 bg-black/70 rounded border border-white/10 text-xs font-mono text-cyan-200">
                JumpRange = (FuelPerJump / Constant)^(1 / Power) &times; (FSD_OptMass / TotalShipMass)
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Total Ship Mass (Unladen)</div>
                  <div class="text-sm font-bold text-white mt-0.5">{jumpAnalytics.totalShipMass} Tonnes</div>
                </div>
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">FSD Optimal Mass</div>
                  <div class="text-sm font-bold text-[var(--hud-amber)] mt-0.5">{jumpAnalytics.fsdOptMass} Tonnes</div>
                </div>
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Max Fuel Per Single Jump</div>
                  <div class="text-sm font-bold text-cyan-400 mt-0.5">{jumpAnalytics.maxFuelPerJump} T</div>
                </div>
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Fuel Tank Capacity</div>
                  <div class="text-sm font-bold text-white mt-0.5">{jumpAnalytics.fuelCapacity} T (Class {ship.coreInternals.fuelTank})</div>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'defenses'}
          <!-- TAB 2: SHIELD & ARMOUR EHP + DIMINISHING RETURNS -->
          <div class="space-y-6">
            <!-- Shield Overview -->
            <div class="p-4 rounded-lg bg-black/60 border border-cyan-500/40 space-y-4">
              <div class="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="w-2 h-2 bg-cyan-400 rounded-full"></span>
                  <span class="text-sm font-bold text-cyan-300">SHIELD EFFECTIVE HIT POINTS (EHP)</span>
                </div>
                <div class="text-xs text-cyan-400/80">
                  Raw Shield: <strong class="text-cyan-200">{defensesSummary.shield.raw} MJ</strong> ({defensesSummary.shield.boosterCount} Boosters Active)
                </div>
              </div>

              <!-- Resistance Percentages & Diminishing Returns Tag -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Kinetic Resistance</div>
                  <div class="text-base font-bold text-cyan-300">
                    {(defensesSummary.shield.resistances.kinetic * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.shield.kineticEHP} MJ</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Thermal Resistance</div>
                  <div class="text-base font-bold text-amber-300">
                    {(defensesSummary.shield.resistances.thermal * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.shield.thermalEHP} MJ</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Explosive Resistance</div>
                  <div class="text-base font-bold text-emerald-300">
                    {(defensesSummary.shield.resistances.explosive * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.shield.explosiveEHP} MJ</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Combat Average EHP</div>
                  <div class="text-base font-bold text-[var(--hud-amber)]">
                    {defensesSummary.shield.effectiveAverageEHP} MJ
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">Broken Reboot: {defensesSummary.shield.brokenRegenRate} MJ/s</div>
                </div>
              </div>
            </div>

            <!-- Armour & Hull Reinforcement Overview -->
            <div class="p-4 rounded-lg bg-black/60 border border-orange-500/40 space-y-4">
              <div class="flex items-center justify-between border-b border-orange-500/30 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="w-2 h-2 bg-orange-400 rounded-full"></span>
                  <span class="text-sm font-bold text-orange-300">ARMOUR & BULKHEAD EFFECTIVE HIT POINTS</span>
                </div>
                <div class="text-xs text-orange-400/80">
                  Raw Hull: <strong class="text-orange-200">{defensesSummary.armour.raw} HP</strong> ({defensesSummary.armour.hrpCount} HRPs Fitted)
                </div>
              </div>

              <!-- Armour Resistances -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Kinetic Armour Res</div>
                  <div class="text-base font-bold text-cyan-300">
                    {(defensesSummary.armour.resistances.kinetic * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.armour.kineticEHP} HP</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Thermal Armour Res</div>
                  <div class="text-base font-bold text-amber-300">
                    {(defensesSummary.armour.resistances.thermal * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.armour.thermalEHP} HP</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Caustic Res (Alien)</div>
                  <div class="text-base font-bold text-lime-300">
                    {((defensesSummary.armour.resistances.caustic || 0) * 100).toFixed(1)}%
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">EHP: {defensesSummary.armour.causticEHP} HP</div>
                </div>

                <div class="p-2.5 rounded bg-white/5 border border-white/10">
                  <div class="text-[10px] text-white/50">Hull Hardness Rating</div>
                  <div class="text-base font-bold text-orange-300">
                    {defensesSummary.armour.hullHardness}
                  </div>
                  <div class="text-[10px] text-white/40 mt-1">Armor Piercing Threshold</div>
                </div>
              </div>
            </div>

            <!-- Module Protection Unit (MRP) Layering -->
            <div class="p-3.5 rounded bg-red-950/20 border border-red-500/30 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-3">
                <span class="w-2.5 h-2.5 bg-red-500 rounded-sm"></span>
                <div>
                  <div class="font-bold text-red-300">MODULE PROTECTION PACKAGES (MRP)</div>
                  <div class="text-[10px] text-white/50">
                    {defensesSummary.mrp.mrpCount > 0
                      ? `${defensesSummary.mrp.mrpCount} Units Fitted // ${(defensesSummary.mrp.layeringAbsorptionRate * 100).toFixed(1)}% Multi-layer Internal Damage Interception`
                      : 'No MRPs installed. Internal modules receive 100% direct piercing impact.'}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-base font-bold text-red-200">{defensesSummary.mrp.totalIntegrity} HP</div>
                <div class="text-[10px] text-white/40">Total Buffer Pool</div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'ttk'}
          <!-- TAB 3: COMBAT TIME-TO-KILL (TTK) PROJECTION MATRIX -->
          <div class="space-y-4">
            <div class="text-xs text-[var(--ed-orange-dim)] flex items-center justify-between">
              <span>PROJECTION: INCOMING DPS VS SHIP DEFENSES (SHIELD + HULL HARDNESS MITIGATION)</span>
              <span class="text-[var(--hud-amber)] font-bold">TOTAL COMBAT EHP: {defensesSummary.totalCombatEHP.toLocaleString()} HP</span>
            </div>

            <div class="grid grid-cols-1 gap-3">
              {#each ttkProjections as proj}
                <div class="p-4 rounded-lg bg-black/60 border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] transition-colors space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <div class="font-bold text-sm text-[var(--hud-amber)]">{proj.threat.name}</div>
                      <div class="text-[10px] text-white/60">{proj.threat.description}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-white/50 uppercase">Total Time To Kill</div>
                      <div class="text-xl font-extrabold text-orange-400">
                        {proj.totalCombatTimeToKillSeconds}s
                      </div>
                    </div>
                  </div>

                  <!-- DPS and TTK Split -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                      <div class="text-[10px] text-white/50">Effective Shield DPS</div>
                      <div class="text-sm font-bold text-cyan-300">{proj.shieldEffectiveDPS} DPS</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                      <div class="text-[10px] text-white/50">Shield TTK</div>
                      <div class="text-sm font-bold text-cyan-400">{proj.shieldTimeToKillSeconds}s</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                      <div class="text-[10px] text-white/50">Effective Armour DPS</div>
                      <div class="text-sm font-bold text-orange-300">{proj.armourEffectiveDPS} DPS</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                      <div class="text-[10px] text-white/50">Hull TTK</div>
                      <div class="text-sm font-bold text-orange-400">{proj.hullTimeToKillSeconds}s</div>
                    </div>
                  </div>

                  <!-- Visual Progress Bar comparing Shield TTK vs Hull TTK -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[10px] text-white/40">
                      <span>Shield Duration: {proj.shieldTimeToKillSeconds}s</span>
                      <span>Hull Breach Duration: {proj.hullTimeToKillSeconds}s</span>
                    </div>
                    <div class="w-full bg-white/10 h-2 rounded flex overflow-hidden">
                      <div
                        class="bg-cyan-500 h-full"
                        style="width: {proj.totalCombatTimeToKillSeconds > 0 ? (proj.shieldTimeToKillSeconds / proj.totalCombatTimeToKillSeconds) * 100 : 0}%"
                        title="Shield: {proj.shieldTimeToKillSeconds}s"
                      ></div>
                      <div
                        class="bg-orange-500 h-full"
                        style="width: {proj.totalCombatTimeToKillSeconds > 0 ? (proj.hullTimeToKillSeconds / proj.totalCombatTimeToKillSeconds) * 100 : 0}%"
                        title="Hull: {proj.hullTimeToKillSeconds}s"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Bar -->
      <div class="px-5 py-2.5 bg-black/80 border-t border-[var(--hud-orange)]/30 flex items-center justify-between text-[11px] text-[var(--ed-orange-dim)]">
        <div>
          HULL: <strong class="text-white">{ship.name}</strong> ({ship.shipClassLabel}) | MASS: <strong class="text-white">{jumpAnalytics.totalShipMass}T</strong>
        </div>
        <button
          type="button"
          class="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-colors"
          onclick={onClose}
        >
          DISMISS ANALYTICS
        </button>
      </div>
    </div>
  </div>
{/if}
