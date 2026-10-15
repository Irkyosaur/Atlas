<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import {
    ENGINEERING_BLUEPRINTS,
    EXPERIMENTAL_EFFECTS,
    getDefaultModuleStats,
    calculateEngineeredStats,
    type ModuleEngineeringState,
    type ModuleBaseStats,
    type CalculatedModuleStats,
  } from '$engine/engineering_catalog';

  interface Props {
    isOpen: boolean;
    slotId: string;
    slotTitle: string;
    slotType: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility';
    slotSize: number;
    installedName: string;
    currentEngineering?: ModuleEngineeringState;
    onApplyEngineering: (slotId: string, state: ModuleEngineeringState) => void;
    onClose: () => void;
  }

  let {
    isOpen = $bindable(false),
    slotId,
    slotTitle,
    slotType,
    slotSize,
    installedName,
    currentEngineering,
    onApplyEngineering,
    onClose,
  }: Props = $props();

  // Local editing state
  let selectedBlueprintId = $state<string | null>(null);
  let selectedGrade = $state<number>(5);
  let rollPercent = $state<number>(100);
  let selectedExperimentalId = $state<string | null>(null);

  // Sync state when opened or currentEngineering changes
  $effect(() => {
    if (isOpen) {
      if (currentEngineering && currentEngineering.blueprintId) {
        selectedBlueprintId = currentEngineering.blueprintId;
        selectedGrade = currentEngineering.grade || 5;
        rollPercent = currentEngineering.percent !== undefined ? currentEngineering.percent : 100;
        selectedExperimentalId = currentEngineering.experimentalId || null;
      } else {
        // Find default blueprint applicable to this slot
        const applicable = getApplicableBlueprints();
        selectedBlueprintId = applicable.length > 0 ? applicable[0].id : null;
        selectedGrade = 5;
        rollPercent = 100;
        selectedExperimentalId = null;
      }
    }
  });

  // Base stats for the slot
  let baseStats = $derived<ModuleBaseStats>(
    getDefaultModuleStats(slotId, slotType, slotSize, installedName)
  );

  // Filter applicable blueprints
  function getApplicableBlueprints() {
    const list = Object.values(ENGINEERING_BLUEPRINTS);
    return list.filter((bp) => {
      if (slotId === 'core-thrusters' || slotId.includes('thrusters')) return bp.appliesTo.includes('thrusters');
      if (slotId === 'core-fsd' || slotId.includes('fsd')) return bp.appliesTo.includes('frameShiftDrive');
      if (slotId === 'core-pp' || slotId.includes('powerPlant')) return bp.appliesTo.includes('powerPlant');
      if (slotId === 'core-pd' || slotId.includes('powerDistributor')) return bp.appliesTo.includes('powerDistributor');
      if (slotId === 'core-bulkheads' || slotType === 'military') return bp.appliesTo.includes('bulkheads') || bp.appliesTo.includes('military');
      if (slotType === 'hardpoint' || slotId.startsWith('hp-')) return bp.appliesTo.includes('hardpoint');
      if (slotType === 'optional') return bp.appliesTo.includes('optional') || bp.appliesTo.includes('shieldGenerator');
      return false;
    });
  }

  // Filter applicable experimental effects
  let applicableExperimentals = $derived.by(() => {
    const list = Object.values(EXPERIMENTAL_EFFECTS);
    return list.filter((exp) => {
      if (slotId === 'core-thrusters' || slotId.includes('thrusters')) return exp.appliesTo.includes('thrusters');
      if (slotId === 'core-fsd' || slotId.includes('fsd')) return exp.appliesTo.includes('frameShiftDrive');
      if (slotId === 'core-pp' || slotId.includes('powerPlant')) return exp.appliesTo.includes('powerPlant');
      if (slotId === 'core-pd' || slotId.includes('powerDistributor')) return exp.appliesTo.includes('powerDistributor');
      if (slotId === 'core-bulkheads' || slotType === 'military') return exp.appliesTo.includes('bulkheads') || exp.appliesTo.includes('military');
      if (slotType === 'hardpoint' || slotId.startsWith('hp-')) return exp.appliesTo.includes('hardpoint');
      if (slotType === 'optional') return exp.appliesTo.includes('optional') || exp.appliesTo.includes('shieldGenerator');
      return false;
    });
  });

  // Calculate live modified stats
  let calculatedStats = $derived<CalculatedModuleStats>(
    calculateEngineeredStats(baseStats, {
      blueprintId: selectedBlueprintId,
      grade: selectedGrade,
      percent: rollPercent,
      experimentalId: selectedExperimentalId,
    })
  );

  function handleSave() {
    onApplyEngineering(slotId, {
      blueprintId: selectedBlueprintId,
      grade: selectedGrade,
      percent: rollPercent,
      experimentalId: selectedExperimentalId,
    });
    isOpen = false;
    onClose();
  }

  function handleClear() {
    selectedBlueprintId = null;
    selectedGrade = 0;
    rollPercent = 100;
    selectedExperimentalId = null;
    onApplyEngineering(slotId, {
      blueprintId: null,
      grade: 0,
      percent: 100,
      experimentalId: null,
    });
    isOpen = false;
    onClose();
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none font-mono text-white animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="eng-modal-title"
  >
    <div
      class="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#050a14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.4)] overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 id="eng-modal-title" class="text-sm font-bold tracking-wider text-[var(--hud-amber)]">
              MODULE ENGINEERING CUSTOMIZER // {slotTitle.toUpperCase()}
            </h2>
            <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-2">
              <span>{baseStats.moduleName}</span>
              <span class="text-white/20">|</span>
              <span class="text-white/60">CLASS {slotSize} {slotType.toUpperCase()}</span>
              {#if selectedBlueprintId}
                <span class="text-white/20">|</span>
                <span class="text-[var(--hud-orange)] font-bold">G{selectedGrade} ({rollPercent}%)</span>
              {/if}
            </div>
          </div>
        </div>

        <button
          type="button"
          class="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 hover:border-red-500/50 transition-colors"
          onclick={() => {
            isOpen = false;
            onClose();
          }}
          aria-label="Close Customizer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Main 2-Column Split: Controls & Live Stats -->
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        <!-- Column 1: Engineering Selectors & Sliders (Left, 60%) -->
        <div class="flex-1 p-4 overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r border-[var(--hud-orange)]/30 bg-black/40">
          <!-- Blueprint Selector -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-[var(--hud-amber)] uppercase tracking-wider flex items-center justify-between">
              <span>1. SELECT MODIFICATION BLUEPRINT</span>
              {#if selectedBlueprintId}
                <button
                  type="button"
                  class="text-[10px] text-red-400 hover:text-red-300 underline"
                  onclick={() => (selectedBlueprintId = null)}
                >
                  Remove Blueprint
                </button>
              {/if}
            </div>

            <div class="grid grid-cols-1 gap-1.5">
              {#each getApplicableBlueprints() as bp}
                {@const isSelected = selectedBlueprintId === bp.id}
                <button
                  type="button"
                  class="p-2.5 rounded text-left border transition-all {isSelected
                    ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-amber)] shadow-[0_0_10px_rgba(255,153,0,0.3)] text-white'
                    : 'bg-black/50 border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] hover:bg-black/80 text-white/80'}"
                  onclick={() => (selectedBlueprintId = bp.id)}
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs {isSelected ? 'text-[var(--hud-amber)]' : 'text-white'}">
                      {bp.name}
                    </span>
                    <span class="text-[10px] text-[var(--ed-orange-dim)]">G1 - G5 Available</span>
                  </div>
                  <div class="text-[10px] text-white/60 mt-0.5 line-clamp-2">
                    {bp.description}
                  </div>
                </button>
              {/each}

              {#if getApplicableBlueprints().length === 0}
                <div class="p-3 text-center text-xs text-white/40 border border-dashed border-white/20 rounded">
                  No engineering blueprints available for this module type.
                </div>
              {/if}
            </div>
          </div>

          <!-- Grade Selector (G1 to G5) -->
          {#if selectedBlueprintId}
            <div class="space-y-2 pt-2 border-t border-[var(--hud-orange)]/20">
              <div class="flex items-center justify-between text-[11px] font-bold text-[var(--hud-amber)] uppercase tracking-wider">
                <span>2. MODIFICATION GRADE (G1 - G5)</span>
                <span class="text-[var(--hud-orange)]">ACTIVE GRADE {selectedGrade}</span>
              </div>

              <div class="grid grid-cols-5 gap-1.5">
                {#each [1, 2, 3, 4, 5] as g}
                  <button
                    type="button"
                    class="py-2 text-center rounded border transition-colors {selectedGrade === g
                      ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)] shadow-[0_0_8px_rgba(255,153,0,0.4)]'
                      : 'bg-black/60 text-[var(--hud-orange)] border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] hover:bg-black'}"
                    onclick={() => (selectedGrade = g)}
                  >
                    <div class="text-xs">G{g}</div>
                    <div class="text-[9px] {selectedGrade === g ? 'text-black/80' : 'text-white/50'}">Grade {g}</div>
                  </button>
                {/each}
              </div>

              <!-- Grade Roll Percentage Slider -->
              <div class="mt-3 p-3 rounded bg-black/60 border border-[var(--hud-orange)]/30 space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-white/80">Grade {selectedGrade} Roll Progress</span>
                  <span class="text-[var(--hud-amber)] font-bold">{rollPercent}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  bind:value={rollPercent}
                  class="w-full accent-[var(--hud-orange)] cursor-pointer"
                />
                <div class="flex justify-between text-[9px] text-white/40">
                  <span>Fresh Roll (1%)</span>
                  <span>Average (50%)</span>
                  <span>Max Engineered (100%)</span>
                </div>
              </div>
            </div>
          {/if}

          <!-- Experimental Effects Selector -->
          {#if selectedBlueprintId && applicableExperimentals.length > 0}
            <div class="space-y-2 pt-2 border-t border-[var(--hud-orange)]/20">
              <div class="text-[11px] font-bold text-[var(--hud-amber)] uppercase tracking-wider flex items-center justify-between">
                <span>3. EXPERIMENTAL EFFECT</span>
                {#if selectedExperimentalId}
                  <button
                    type="button"
                    class="text-[10px] text-red-400 hover:text-red-300 underline"
                    onclick={() => (selectedExperimentalId = null)}
                  >
                    Clear Effect
                  </button>
                {/if}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {#each applicableExperimentals as exp}
                  {@const isSelected = selectedExperimentalId === exp.id}
                  <button
                    type="button"
                    class="p-2 text-left rounded border transition-colors {isSelected
                      ? 'bg-purple-950/40 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                      : 'bg-black/50 border-[var(--hud-orange)]/25 hover:border-[var(--hud-orange)] hover:bg-black/70 text-white/70'}"
                    onclick={() => (selectedExperimentalId = isSelected ? null : exp.id)}
                  >
                    <div class="font-bold text-[11px] {isSelected ? 'text-purple-300' : 'text-white'}">
                      {exp.name}
                    </div>
                    <div class="text-[9px] text-white/60 line-clamp-2 mt-0.5">
                      {exp.description}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Column 2: Real-Time Live Recalculated Stats (Right, 40%) -->
        <div class="w-full md:w-80 lg:w-96 p-4 flex flex-col justify-between bg-[#03060c] overflow-y-auto space-y-4">
          <div>
            <div class="flex items-center justify-between border-b border-[var(--hud-orange)]/30 pb-2">
              <div class="text-xs font-bold text-[var(--hud-amber)] tracking-wider">
                LIVE STATS RECALCULATION
              </div>
              <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] border border-[var(--hud-orange)]/40">
                REAL-TIME
              </span>
            </div>

            <div class="divide-y divide-white/10 mt-2 text-xs">
              <!-- Mass -->
              <div class="py-2 flex items-center justify-between">
                <div>
                  <div class="text-white/70">Mass</div>
                  <div class="text-[9px] text-white/40">Base: {baseStats.mass} T</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-white {calculatedStats.modifiedMass > baseStats.mass ? 'text-red-400' : calculatedStats.modifiedMass < baseStats.mass ? 'text-emerald-400' : ''}">
                    {calculatedStats.modifiedMass} T
                  </div>
                  {#if calculatedStats.modifiedMass !== baseStats.mass}
                    <div class="text-[10px] {calculatedStats.modifiedMass > baseStats.mass ? 'text-red-400' : 'text-emerald-400'}">
                      {calculatedStats.modifiedMass > baseStats.mass ? '+' : ''}
                      {(calculatedStats.modifiedMass - baseStats.mass).toFixed(2)} T
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Power Draw -->
              {#if baseStats.powerDraw > 0}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">Power Draw</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.powerDraw} MW</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-white {calculatedStats.modifiedPowerDraw > baseStats.powerDraw ? 'text-red-400' : calculatedStats.modifiedPowerDraw < baseStats.powerDraw ? 'text-emerald-400' : ''}">
                      {calculatedStats.modifiedPowerDraw} MW
                    </div>
                    {#if calculatedStats.modifiedPowerDraw !== baseStats.powerDraw}
                      <div class="text-[10px] {calculatedStats.modifiedPowerDraw > baseStats.powerDraw ? 'text-red-400' : 'text-emerald-400'}">
                        {calculatedStats.modifiedPowerDraw > baseStats.powerDraw ? '+' : ''}
                        {(calculatedStats.modifiedPowerDraw - baseStats.powerDraw).toFixed(2)} MW
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Power Generation (PP) -->
              {#if baseStats.powerGen !== undefined}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">Power Generation</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.powerGen} MW</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-emerald-400">
                      {calculatedStats.modifiedPowerGen} MW
                    </div>
                    {#if calculatedStats.modifiedPowerGen !== baseStats.powerGen}
                      <div class="text-[10px] text-emerald-400">
                        +{(calculatedStats.modifiedPowerGen! - baseStats.powerGen).toFixed(2)} MW
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Integrity -->
              <div class="py-2 flex items-center justify-between">
                <div>
                  <div class="text-white/70">Integrity</div>
                  <div class="text-[9px] text-white/40">Base: {baseStats.integrity} HP</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-white {calculatedStats.modifiedIntegrity < baseStats.integrity ? 'text-red-400' : 'text-emerald-400'}">
                    {calculatedStats.modifiedIntegrity} HP
                  </div>
                  {#if calculatedStats.modifiedIntegrity !== baseStats.integrity}
                    <div class="text-[10px] {calculatedStats.modifiedIntegrity < baseStats.integrity ? 'text-red-400' : 'text-emerald-400'}">
                      {calculatedStats.modifiedIntegrity > baseStats.integrity ? '+' : ''}
                      {(calculatedStats.modifiedIntegrity - baseStats.integrity).toFixed(1)} HP
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Thermal Load -->
              {#if baseStats.thermalLoad > 0}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">Thermal Load</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.thermalLoad}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-white {calculatedStats.modifiedThermalLoad > baseStats.thermalLoad ? 'text-red-400' : 'text-emerald-400'}">
                      {calculatedStats.modifiedThermalLoad}
                    </div>
                    {#if calculatedStats.modifiedThermalLoad !== baseStats.thermalLoad}
                      <div class="text-[10px] {calculatedStats.modifiedThermalLoad > baseStats.thermalLoad ? 'text-red-400' : 'text-emerald-400'}">
                        {calculatedStats.modifiedThermalLoad > baseStats.thermalLoad ? '+' : ''}
                        {(calculatedStats.modifiedThermalLoad - baseStats.thermalLoad).toFixed(2)}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Optimal Multiplier (Thrusters) -->
              {#if baseStats.optMul !== undefined}
                <div class="py-2 flex items-center justify-between bg-[var(--hud-orange)]/10 px-2 rounded">
                  <div>
                    <div class="text-[var(--hud-amber)] font-bold">Optimal Multiplier</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.optMul}%</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-base text-[var(--hud-amber)]">
                      {calculatedStats.modifiedOptMul}%
                    </div>
                    {#if calculatedStats.modifiedOptMul !== baseStats.optMul}
                      <div class="text-[10px] text-emerald-400 font-bold">
                        +{((calculatedStats.modifiedOptMul! - baseStats.optMul)).toFixed(2)}%
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Optimal Mass (Thrusters / FSD / Shields) -->
              {#if baseStats.optMass !== undefined}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">Optimal Mass</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.optMass} T</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-white {calculatedStats.modifiedOptMass! > baseStats.optMass ? 'text-emerald-400' : calculatedStats.modifiedOptMass! < baseStats.optMass ? 'text-amber-400' : ''}">
                      {calculatedStats.modifiedOptMass} T
                    </div>
                    {#if calculatedStats.modifiedOptMass !== baseStats.optMass}
                      <div class="text-[10px] {calculatedStats.modifiedOptMass! > baseStats.optMass ? 'text-emerald-400' : 'text-amber-400'}">
                        {calculatedStats.modifiedOptMass! > baseStats.optMass ? '+' : ''}
                        {(calculatedStats.modifiedOptMass! - baseStats.optMass).toFixed(1)} T
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Weapons Damage (DPS) -->
              {#if baseStats.damage !== undefined}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">Damage (DPS)</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.damage}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-emerald-400">
                      {calculatedStats.modifiedDamage}
                    </div>
                    {#if calculatedStats.modifiedDamage !== baseStats.damage}
                      <div class="text-[10px] text-emerald-400">
                        +{(calculatedStats.modifiedDamage! - baseStats.damage).toFixed(2)}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Distributor Rates (SYS/ENG/WEP) -->
              {#if baseStats.wepRate !== undefined}
                <div class="py-2 flex items-center justify-between">
                  <div>
                    <div class="text-white/70">WEP Recharge Rate</div>
                    <div class="text-[9px] text-white/40">Base: {baseStats.wepRate} MW/s</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-emerald-400">
                      {calculatedStats.modifiedWepRate} MW/s
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-2 pt-2 border-t border-[var(--hud-orange)]/30">
            <button
              type="button"
              class="w-full py-2 rounded bg-[var(--hud-orange)] hover:bg-[var(--hud-amber)] text-black font-bold text-xs tracking-wider transition-colors shadow-[0_0_12px_rgba(255,153,0,0.4)]"
              onclick={handleSave}
            >
              APPLY ENGINEERING TO MODULE
            </button>
            <div class="flex space-x-2">
              <button
                type="button"
                class="flex-1 py-1.5 rounded border border-red-500/50 hover:bg-red-500/20 text-red-300 text-[11px] transition-colors"
                onclick={handleClear}
              >
                REMOVE / CLEAR
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 rounded border border-white/20 hover:bg-white/10 text-white/80 text-[11px] transition-colors"
                onclick={() => {
                  isOpen = false;
                  onClose();
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
