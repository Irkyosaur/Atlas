<script lang="ts">
  // Location: atlas/client/src/lib/components/fleet/OutfittingInspectorModal.svelte
  // Deep Ship Outfitting & Engineering Inspector Modal (Phase 09, Stage 9.3)
  // Provides core internals, optional compartments, hardpoints, and utilities breakdown with engineering modifications.

  import type { PlayerFleetShip, ShipOutfittingModule } from '$engine/fleet_ledger_engine';
  import { FleetLedgerEngine } from '$engine/fleet_ledger_engine';

  interface Props {
    isOpen: boolean;
    ship: PlayerFleetShip | null;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), ship = null, onClose }: Props = $props();

  let activeSection = $state<'all' | 'core' | 'optional' | 'hardpoints' | 'utilities'>('all');

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  function getRatingBadgeColor(rating: string): string {
    switch (rating) {
      case 'A':
        return 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300';
      case 'B':
        return 'border-blue-500/60 bg-blue-500/20 text-blue-300';
      case 'C':
        return 'border-amber-500/60 bg-amber-500/20 text-amber-300';
      case 'D':
        return 'border-cyan-500/60 bg-cyan-500/20 text-cyan-300';
      default:
        return 'border-white/30 bg-white/10 text-white/70';
    }
  }

  function getGradeStars(grade: number): string {
    return '★'.repeat(Math.max(1, Math.min(5, grade)));
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && ship}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal Window -->
    <div
      class="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b0c10] border border-[var(--hud-orange)]/60 rounded-xl shadow-[0_0_35px_rgba(255,119,0,0.25)] overflow-hidden font-mono text-[var(--hud-amber)]"
      role="dialog"
      aria-modal="true"
    >
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-black/80 border-b border-[var(--hud-orange)]/35">
        <div class="flex items-center space-x-3">
          <span class="text-xl">🛠️</span>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-bold uppercase tracking-wider text-white">
                OUTFITTING & ENGINEERING INSPECTOR
              </span>
              <span class="px-2 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 text-[10px] font-bold text-[var(--hud-orange)]">
                {ship.shipType}
              </span>
              {#if ship.status === 'active'}
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-400">
                  ACTIVE COCKPIT
                </span>
              {/if}
            </div>
            <div class="text-xs text-white/50">
              Vessel: <span class="text-white font-bold">{ship.shipName}</span> [{ship.shipIdent}] &bull; Docked at: <span class="text-[var(--hud-orange)]">{ship.currentStarport}</span> ({ship.currentSystem})
            </div>
          </div>
        </div>

        <button
          type="button"
          onclick={onClose}
          class="w-7 h-7 rounded border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] bg-black/40 hover:bg-[var(--hud-orange)]/20 text-white flex items-center justify-center text-xs transition-colors"
          title="Close Outfitting Inspector"
        >
          ✕
        </button>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-black/60 border-b border-[var(--hud-orange)]/20 text-xs">
        <div>
          <div class="text-[10px] text-white/50 uppercase">TOTAL VALUATION</div>
          <div class="text-sm font-bold text-white">{FleetLedgerEngine.formatCredits(ship.totalValue)}</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">5% REBUY INSURANCE</div>
          <div class="text-sm font-bold text-amber-400">{FleetLedgerEngine.formatCredits(ship.rebuyCost)}</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">JUMP RANGE (UNLADEN)</div>
          <div class="text-sm font-bold text-cyan-400">{ship.unladenJumpLy} LY</div>
        </div>
        <div>
          <div class="text-[10px] text-white/50 uppercase">CARGO CAPACITY</div>
          <div class="text-sm font-bold text-emerald-400">{ship.maxCargoCapacity} T</div>
        </div>
      </div>

      <!-- Category Navigation Tabs -->
      <div class="flex items-center space-x-1 px-5 pt-2.5 border-b border-[var(--hud-orange)]/20 bg-black/40 text-xs overflow-x-auto">
        <button
          type="button"
          onclick={() => (activeSection = 'all')}
          class="px-3.5 py-1.5 font-bold uppercase tracking-wider border-b-2 transition-colors {activeSection === 'all'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)]'
            : 'border-transparent text-white/50 hover:text-white'}"
        >
          All Modules
        </button>
        <button
          type="button"
          onclick={() => (activeSection = 'core')}
          class="px-3.5 py-1.5 font-bold uppercase tracking-wider border-b-2 transition-colors {activeSection === 'core'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)]'
            : 'border-transparent text-white/50 hover:text-white'}"
        >
          Core Internals ({ship.coreModules.length})
        </button>
        <button
          type="button"
          onclick={() => (activeSection = 'optional')}
          class="px-3.5 py-1.5 font-bold uppercase tracking-wider border-b-2 transition-colors {activeSection === 'optional'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)]'
            : 'border-transparent text-white/50 hover:text-white'}"
        >
          Optional Compartments ({ship.optionalModules.length})
        </button>
        <button
          type="button"
          onclick={() => (activeSection = 'hardpoints')}
          class="px-3.5 py-1.5 font-bold uppercase tracking-wider border-b-2 transition-colors {activeSection === 'hardpoints'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)]'
            : 'border-transparent text-white/50 hover:text-white'}"
        >
          Hardpoints ({ship.hardpointModules.length})
        </button>
        <button
          type="button"
          onclick={() => (activeSection = 'utilities')}
          class="px-3.5 py-1.5 font-bold uppercase tracking-wider border-b-2 transition-colors {activeSection === 'utilities'
            ? 'border-[var(--hud-orange)] text-[var(--hud-orange)]'
            : 'border-transparent text-white/50 hover:text-white'}"
        >
          Utility Mounts ({ship.utilityModules.length})
        </button>
      </div>

      <!-- Outfitting Modules List Container -->
      <div class="flex-1 p-5 overflow-y-auto space-y-5">
        <!-- Core Internals -->
        {#if activeSection === 'all' || activeSection === 'core'}
          <div class="space-y-2">
            <div class="flex items-center space-x-2 text-xs font-bold uppercase text-[var(--hud-orange)] border-b border-[var(--hud-orange)]/25 pb-1">
              <span>⚡</span>
              <span>CORE INTERNALS</span>
            </div>
            {#if ship.coreModules.length === 0}
              <div class="text-xs text-white/40 italic p-3 bg-black/40 rounded border border-white/5">
                Standard baseline core systems installed.
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {#each ship.coreModules as mod}
                  <div class="bg-black/60 border border-[var(--hud-orange)]/25 rounded-lg p-3 space-y-2 hover:border-[var(--hud-orange)]/50 transition-all">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold border {getRatingBadgeColor(mod.moduleRating)}">
                          {mod.moduleClass}{mod.moduleRating}
                        </span>
                        <div>
                          <div class="text-xs font-bold text-white tracking-wide">{mod.moduleName}</div>
                          <div class="text-[10px] text-[var(--hud-amber)]/75">{mod.slotName} &bull; {mod.category}</div>
                        </div>
                      </div>
                      <div class="text-right text-[11px] text-white/80 font-bold">
                        {FleetLedgerEngine.formatCompactCredits(mod.valueCredits)}
                      </div>
                    </div>

                    <!-- Engineering Badge (if engineered) -->
                    {#if mod.engineering}
                      <div class="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] bg-purple-950/25 px-2 py-1 rounded border border-purple-500/30">
                        <div class="flex items-center space-x-1.5 text-purple-300">
                          <span class="text-amber-400 font-bold">{getGradeStars(mod.engineering.grade)}</span>
                          <span class="font-bold">{mod.engineering.blueprintName}</span>
                          {#if mod.engineering.experimentalEffect}
                            <span class="text-[var(--hud-amber)]">[{mod.engineering.experimentalEffect}]</span>
                          {/if}
                        </div>
                        <span class="text-purple-400 font-bold">G{mod.engineering.grade}</span>
                      </div>
                    {/if}

                    <div class="flex items-center justify-between text-[10px] text-white/50 pt-1">
                      <span>Mass: {mod.massTonnes} T</span>
                      {#if mod.powerDrawMW}
                        <span>Power Draw: {mod.powerDrawMW} MW</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Optional Compartments -->
        {#if activeSection === 'all' || activeSection === 'optional'}
          <div class="space-y-2">
            <div class="flex items-center space-x-2 text-xs font-bold uppercase text-[var(--hud-orange)] border-b border-[var(--hud-orange)]/25 pb-1">
              <span>📦</span>
              <span>OPTIONAL COMPARTMENTS</span>
            </div>
            {#if ship.optionalModules.length === 0}
              <div class="text-xs text-white/40 italic p-3 bg-black/40 rounded border border-white/5">
                No optional modules recorded.
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {#each ship.optionalModules as mod}
                  <div class="bg-black/60 border border-[var(--hud-orange)]/25 rounded-lg p-3 space-y-2 hover:border-[var(--hud-orange)]/50 transition-all">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold border {getRatingBadgeColor(mod.moduleRating)}">
                          {mod.moduleClass}{mod.moduleRating}
                        </span>
                        <div>
                          <div class="text-xs font-bold text-white tracking-wide">{mod.moduleName}</div>
                          <div class="text-[10px] text-[var(--hud-amber)]/75">{mod.slotName} &bull; {mod.category}</div>
                        </div>
                      </div>
                      <div class="text-right text-[11px] text-white/80 font-bold">
                        {FleetLedgerEngine.formatCompactCredits(mod.valueCredits)}
                      </div>
                    </div>

                    {#if mod.engineering}
                      <div class="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] bg-purple-950/25 px-2 py-1 rounded border border-purple-500/30">
                        <div class="flex items-center space-x-1.5 text-purple-300">
                          <span class="text-amber-400 font-bold">{getGradeStars(mod.engineering.grade)}</span>
                          <span class="font-bold">{mod.engineering.blueprintName}</span>
                          {#if mod.engineering.experimentalEffect}
                            <span class="text-[var(--hud-amber)]">[{mod.engineering.experimentalEffect}]</span>
                          {/if}
                        </div>
                        <span class="text-purple-400 font-bold">G{mod.engineering.grade}</span>
                      </div>
                    {/if}

                    <div class="flex items-center justify-between text-[10px] text-white/50 pt-1">
                      <span>Mass: {mod.massTonnes} T</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Hardpoints -->
        {#if activeSection === 'all' || activeSection === 'hardpoints'}
          <div class="space-y-2">
            <div class="flex items-center space-x-2 text-xs font-bold uppercase text-[var(--hud-orange)] border-b border-[var(--hud-orange)]/25 pb-1">
              <span>🎯</span>
              <span>HARDPOINTS & ORDNANCE</span>
            </div>
            {#if ship.hardpointModules.length === 0}
              <div class="text-xs text-white/40 italic p-3 bg-black/40 rounded border border-white/5">
                No weapons or hardpoints fitted.
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {#each ship.hardpointModules as mod}
                  <div class="bg-black/60 border border-[var(--hud-orange)]/25 rounded-lg p-3 space-y-2 hover:border-[var(--hud-orange)]/50 transition-all">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold border {getRatingBadgeColor(mod.moduleRating)}">
                          C{mod.moduleClass}
                        </span>
                        <div>
                          <div class="text-xs font-bold text-white tracking-wide">{mod.moduleName}</div>
                          <div class="text-[10px] text-[var(--hud-amber)]/75">{mod.slotName} &bull; {mod.category}</div>
                        </div>
                      </div>
                      <div class="text-right text-[11px] text-white/80 font-bold">
                        {FleetLedgerEngine.formatCompactCredits(mod.valueCredits)}
                      </div>
                    </div>

                    {#if mod.engineering}
                      <div class="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] bg-purple-950/25 px-2 py-1 rounded border border-purple-500/30">
                        <div class="flex items-center space-x-1.5 text-purple-300">
                          <span class="text-amber-400 font-bold">{getGradeStars(mod.engineering.grade)}</span>
                          <span class="font-bold">{mod.engineering.blueprintName}</span>
                          {#if mod.engineering.experimentalEffect}
                            <span class="text-red-400">[{mod.engineering.experimentalEffect}]</span>
                          {/if}
                        </div>
                        <span class="text-purple-400 font-bold">G{mod.engineering.grade}</span>
                      </div>
                    {/if}

                    <div class="flex items-center justify-between text-[10px] text-white/50 pt-1">
                      <span>Mass: {mod.massTonnes} T</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Utility Mounts -->
        {#if activeSection === 'all' || activeSection === 'utilities'}
          <div class="space-y-2">
            <div class="flex items-center space-x-2 text-xs font-bold uppercase text-[var(--hud-orange)] border-b border-[var(--hud-orange)]/25 pb-1">
              <span>🛡️</span>
              <span>UTILITY MOUNTS</span>
            </div>
            {#if ship.utilityModules.length === 0}
              <div class="text-xs text-white/40 italic p-3 bg-black/40 rounded border border-white/5">
                No utility mounts fitted.
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {#each ship.utilityModules as mod}
                  <div class="bg-black/60 border border-[var(--hud-orange)]/25 rounded-lg p-3 space-y-2 hover:border-[var(--hud-orange)]/50 transition-all">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold border {getRatingBadgeColor(mod.moduleRating)}">
                          {mod.moduleClass}{mod.moduleRating}
                        </span>
                        <div>
                          <div class="text-xs font-bold text-white tracking-wide">{mod.moduleName}</div>
                          <div class="text-[10px] text-[var(--hud-amber)]/75">{mod.slotName} &bull; {mod.category}</div>
                        </div>
                      </div>
                      <div class="text-right text-[11px] text-white/80 font-bold">
                        {FleetLedgerEngine.formatCompactCredits(mod.valueCredits)}
                      </div>
                    </div>

                    {#if mod.engineering}
                      <div class="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] bg-purple-950/25 px-2 py-1 rounded border border-purple-500/30">
                        <div class="flex items-center space-x-1.5 text-purple-300">
                          <span class="text-amber-400 font-bold">{getGradeStars(mod.engineering.grade)}</span>
                          <span class="font-bold">{mod.engineering.blueprintName}</span>
                          {#if mod.engineering.experimentalEffect}
                            <span class="text-cyan-400">[{mod.engineering.experimentalEffect}]</span>
                          {/if}
                        </div>
                        <span class="text-purple-400 font-bold">G{mod.engineering.grade}</span>
                      </div>
                    {/if}

                    <div class="flex items-center justify-between text-[10px] text-white/50 pt-1">
                      <span>Mass: {mod.massTonnes} T</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Bottom Status Bar -->
      <div class="flex items-center justify-between px-5 py-3 bg-black/80 border-t border-[var(--hud-orange)]/35 text-xs">
        <span class="text-white/60">
          Showing modules for <strong class="text-white">{ship.shipName}</strong>
        </span>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-1.5 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)]/60 text-[var(--hud-amber)] font-bold text-xs uppercase transition-colors"
        >
          Close Inspector
        </button>
      </div>
    </div>
  </div>
{/if}
