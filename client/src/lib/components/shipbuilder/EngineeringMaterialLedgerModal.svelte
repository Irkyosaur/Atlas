<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import {
    type MaterialRequirementsLedger,
    type MaterialLedgerItem,
  } from '$engine/engineering_catalog';

  interface Props {
    isOpen: boolean;
    ledger: MaterialRequirementsLedger;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), ledger, onClose }: Props = $props();

  let activeTab = $state<'ALL' | 'Raw' | 'Encoded' | 'Manufactured'>('ALL');

  const GRADE_COLORS: Record<number, string> = {
    5: 'text-purple-400 border-purple-500/50 bg-purple-950/40',
    4: 'text-indigo-400 border-indigo-500/50 bg-indigo-950/40',
    3: 'text-blue-400 border-blue-500/50 bg-blue-950/40',
    2: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
    1: 'text-zinc-300 border-zinc-500/50 bg-zinc-900/40',
  };

  const CATEGORY_COLORS: Record<string, string> = {
    Raw: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
    Encoded: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20',
    Manufactured: 'text-orange-400 border-orange-500/40 bg-orange-950/20',
  };
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-mono text-white animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ledger-title"
  >
    <div
      class="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#050a14] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_35px_rgba(255,102,0,0.4)] overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-[var(--hud-orange)]/40">
        <div class="flex items-center space-x-3">
          <Icon name="cargo" size={20} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 id="ledger-title" class="text-sm font-bold tracking-wider text-[var(--hud-amber)]">
              ENGINEERING MATERIALS LEDGER // BILL OF MATERIALS
            </h2>
            <div class="text-[10px] text-[var(--ed-orange-dim)] flex items-center space-x-2">
              <span>{ledger.totalMaterialsCount} TOTAL UNITS</span>
              <span class="text-white/20">|</span>
              <span>{ledger.totalRolls} CRAFTING ROLLS</span>
              <span class="text-white/20">|</span>
              <span class="text-amber-400">{ledger.raw.length} RAW</span>
              <span class="text-white/20">|</span>
              <span class="text-cyan-400">{ledger.encoded.length} ENCODED</span>
              <span class="text-white/20">|</span>
              <span class="text-orange-400">{ledger.manufactured.length} MANUFACTURED</span>
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
          aria-label="Close Ledger"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center space-x-2 px-4 py-2 border-b border-[var(--hud-orange)]/20 bg-black/50 text-xs">
        <button
          type="button"
          class="px-3 py-1 rounded border transition-colors {activeTab === 'ALL'
            ? 'bg-[var(--hud-orange)] text-black font-bold border-[var(--hud-amber)]'
            : 'bg-black/40 text-[var(--hud-orange)] border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
          onclick={() => (activeTab = 'ALL')}
        >
          ALL MATERIALS ({ledger.totalMaterialsCount})
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded border transition-colors {activeTab === 'Raw'
            ? 'bg-amber-500 text-black font-bold border-amber-300'
            : 'bg-black/40 text-amber-400 border-amber-500/30 hover:border-amber-400'}"
          onclick={() => (activeTab = 'Raw')}
        >
          RAW ({ledger.raw.reduce((s, m) => s + m.count, 0)})
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded border transition-colors {activeTab === 'Encoded'
            ? 'bg-cyan-500 text-black font-bold border-cyan-300'
            : 'bg-black/40 text-cyan-400 border-cyan-500/30 hover:border-cyan-400'}"
          onclick={() => (activeTab = 'Encoded')}
        >
          ENCODED ({ledger.encoded.reduce((s, m) => s + m.count, 0)})
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded border transition-colors {activeTab === 'Manufactured'
            ? 'bg-orange-500 text-black font-bold border-orange-300'
            : 'bg-black/40 text-orange-400 border-orange-500/30 hover:border-orange-400'}"
          onclick={() => (activeTab = 'Manufactured')}
        >
          MANUFACTURED ({ledger.manufactured.reduce((s, m) => s + m.count, 0)})
        </button>
      </div>

      <!-- Ledger Content List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#if ledger.totalMaterialsCount === 0}
          <div class="text-center py-12 text-white/40 text-xs">
            <Icon name="reticle" size={32} />
            <div class="mt-2 text-[var(--hud-amber)]">No Engineered Modules Detected</div>
            <div class="text-[10px] text-white/50">Apply blueprints or experimental effects to any module slot to calculate required materials.</div>
          </div>
        {:else}
          <!-- Raw Section -->
          {#if (activeTab === 'ALL' || activeTab === 'Raw') && ledger.raw.length > 0}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-amber-500/30 pb-1">
                <span>RAW MATERIALS (ELEMENTS)</span>
                <span class="text-[10px] text-amber-300/60">{ledger.raw.reduce((s, m) => s + m.count, 0)} units</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each ledger.raw as item}
                  <div class="flex items-center justify-between p-2 rounded bg-black/60 border border-amber-500/25">
                    <div class="flex items-center space-x-2">
                      <span class="px-1.5 py-0.5 text-[9px] font-bold rounded border {GRADE_COLORS[item.grade]}">
                        G{item.grade}
                      </span>
                      <span class="text-xs text-white">{item.name}</span>
                    </div>
                    <div class="text-amber-400 font-bold text-xs">{item.count}x</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Encoded Section -->
          {#if (activeTab === 'ALL' || activeTab === 'Encoded') && ledger.encoded.length > 0}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-bold text-cyan-400 border-b border-cyan-500/30 pb-1">
                <span>ENCODED DATA MATERIALS (FIRMWARE / WAKES)</span>
                <span class="text-[10px] text-cyan-300/60">{ledger.encoded.reduce((s, m) => s + m.count, 0)} units</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each ledger.encoded as item}
                  <div class="flex items-center justify-between p-2 rounded bg-black/60 border border-cyan-500/25">
                    <div class="flex items-center space-x-2">
                      <span class="px-1.5 py-0.5 text-[9px] font-bold rounded border {GRADE_COLORS[item.grade]}">
                        G{item.grade}
                      </span>
                      <span class="text-xs text-white">{item.name}</span>
                    </div>
                    <div class="text-cyan-400 font-bold text-xs">{item.count}x</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Manufactured Section -->
          {#if (activeTab === 'ALL' || activeTab === 'Manufactured') && ledger.manufactured.length > 0}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-bold text-orange-400 border-b border-orange-500/30 pb-1">
                <span>MANUFACTURED MATERIALS (HARDWARE / COMPONENTS)</span>
                <span class="text-[10px] text-orange-300/60">{ledger.manufactured.reduce((s, m) => s + m.count, 0)} units</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each ledger.manufactured as item}
                  <div class="flex items-center justify-between p-2 rounded bg-black/60 border border-orange-500/25">
                    <div class="flex items-center space-x-2">
                      <span class="px-1.5 py-0.5 text-[9px] font-bold rounded border {GRADE_COLORS[item.grade]}">
                        G{item.grade}
                      </span>
                      <span class="text-xs text-white">{item.name}</span>
                    </div>
                    <div class="text-orange-400 font-bold text-xs">{item.count}x</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer Info -->
      <div class="p-3 bg-black/90 border-t border-[var(--hud-orange)]/30 flex items-center justify-between text-[11px] text-[var(--ed-orange-dim)]">
        <div>
          Calculated based on standard fixed engineering rolls progression (G1: 1 roll, G2: 2 rolls, G3: 3 rolls, G4: 4 rolls, G5: 5 rolls).
        </div>
        <button
          type="button"
          class="px-3 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/40 text-[var(--hud-amber)] border border-[var(--hud-orange)]/50 transition-colors"
          onclick={() => {
            isOpen = false;
            onClose();
          }}
        >
          CLOSE LEDGER
        </button>
      </div>
    </div>
  </div>
{/if}
