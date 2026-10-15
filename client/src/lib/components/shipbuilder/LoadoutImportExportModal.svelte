<script lang="ts">
  import type { ShipChassis, ShipLoadoutState } from '$engine/ship_catalog';
  import type { ModuleEngineeringState } from '$engine/engineering_catalog';
  import {
    exportAtlasBuildJson,
    exportAtlasShortcode,
    importAtlasShortcode,
    exportCoriolisJson,
    importCoriolisJson,
    exportEdsySlefJson,
    importEdsySlefJson,
  } from '$engine/loadout_codecs';

  interface Props {
    isOpen: boolean;
    ship: ShipChassis;
    loadout: ShipLoadoutState;
    engineeringMap: Record<string, ModuleEngineeringState>;
    onImportBuild: (ship: ShipChassis, loadout: ShipLoadoutState, engineering: Record<string, ModuleEngineeringState>) => void;
    onClose: () => void;
  }

  let {
    isOpen = false,
    ship,
    loadout,
    engineeringMap,
    onImportBuild,
    onClose,
  }: Props = $props();

  let activeMode = $state<'export' | 'import'>('export');
  let selectedFormat = $state<'coriolis' | 'slef' | 'atlas' | 'shortcode'>('coriolis');
  let textPayload = $state<string>('');
  let copyNotification = $state<string | null>(null);
  let importError = $state<string | null>(null);

  // Update export text whenever format or input changes
  $effect(() => {
    if (activeMode === 'export') {
      importError = null;
      if (selectedFormat === 'coriolis') {
        textPayload = exportCoriolisJson(ship, loadout, engineeringMap, `${ship.name} Atlas Build`);
      } else if (selectedFormat === 'slef') {
        textPayload = exportEdsySlefJson(ship, loadout, engineeringMap, `${ship.name} Atlas Build`);
      } else if (selectedFormat === 'atlas') {
        textPayload = exportAtlasBuildJson(ship, loadout, engineeringMap, `${ship.name} Atlas Build`);
      } else if (selectedFormat === 'shortcode') {
        textPayload = exportAtlasShortcode(ship, loadout, engineeringMap);
      }
    }
  });

  function handleCopy() {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(textPayload);
      copyNotification = 'Copied to clipboard!';
      setTimeout(() => (copyNotification = null), 2500);
    }
  }

  function handleImport() {
    importError = null;
    const input = textPayload.trim();
    if (!input) {
      importError = 'Please paste a build string or JSON format to import.';
      return;
    }

    try {
      if (selectedFormat === 'shortcode' || (!input.startsWith('{') && !input.startsWith('['))) {
        const res = importAtlasShortcode(input);
        if (res) {
          onImportBuild(ship, res.loadout, res.engineering);
          onClose();
          return;
        } else {
          importError = 'Invalid Atlas base64 shortcode.';
          return;
        }
      }

      if (selectedFormat === 'coriolis') {
        const res = importCoriolisJson(input);
        if (res) {
          onImportBuild(res.ship, res.loadout, res.engineering);
          onClose();
          return;
        } else {
          importError = 'Could not parse valid Coriolis JSON format.';
          return;
        }
      }

      if (selectedFormat === 'slef') {
        const res = importEdsySlefJson(input);
        if (res) {
          onImportBuild(res.ship, res.loadout, res.engineering);
          onClose();
          return;
        } else {
          importError = 'Could not parse valid EDSY SLEF JSON format.';
          return;
        }
      }

      // Default fallback: Try Coriolis then SLEF
      const corTry = importCoriolisJson(input);
      if (corTry) {
        onImportBuild(corTry.ship, corTry.loadout, corTry.engineering);
        onClose();
        return;
      }
      const slefTry = importEdsySlefJson(input);
      if (slefTry) {
        onImportBuild(slefTry.ship, slefTry.loadout, slefTry.engineering);
        onClose();
        return;
      }

      importError = 'Unsupported payload format. Expected Coriolis JSON, EDSY SLEF, or Atlas shortcode.';
    } catch (e: any) {
      importError = `Import failed: ${e.message || 'Malformed format'}`;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono text-white select-none animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="import-export-title"
  >
    <div
      class="relative w-full max-w-2xl bg-[#070d18] border-2 border-[var(--hud-orange)] rounded-lg shadow-[0_0_40px_rgba(255,102,0,0.4)] overflow-hidden flex flex-col max-h-[85vh]"
    >
      <!-- Header -->
      <div class="px-5 py-3 bg-black/80 border-b border-[var(--hud-orange)]/40 flex items-center justify-between">
        <div>
          <h2 id="import-export-title" class="text-sm sm:text-base font-bold tracking-wider text-[var(--hud-amber)] flex items-center space-x-2">
            <span>IMPORT / EXPORT BUILD CODEC</span>
          </h2>
          <div class="text-[10px] text-[var(--ed-orange-dim)]">
            Full interoperability with Coriolis, EDSY (SLEF) & Atlas permalink shortcodes
          </div>
        </div>

        <button
          type="button"
          class="p-1 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/20 transition-colors"
          onclick={onClose}
          aria-label="Close Modal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mode & Format Selectors -->
      <div class="p-4 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <!-- Export / Import Toggle -->
        <div class="flex items-center space-x-1 bg-black/60 p-1 rounded border border-white/15">
          <button
            type="button"
            class="px-3 py-1 rounded transition-colors {activeMode === 'export'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow'
              : 'text-white/70 hover:text-white'}"
            onclick={() => {
              activeMode = 'export';
            }}
          >
            EXPORT BUILD
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded transition-colors {activeMode === 'import'
              ? 'bg-[var(--hud-orange)] text-black font-bold shadow'
              : 'text-white/70 hover:text-white'}"
            onclick={() => {
              activeMode = 'import';
              textPayload = '';
              importError = null;
            }}
          >
            IMPORT BUILD
          </button>
        </div>

        <!-- Format Options -->
        <div class="flex items-center space-x-1.5">
          <span class="text-[10px] text-white/50">FORMAT:</span>
          {#each [
            { id: 'coriolis', label: 'Coriolis JSON' },
            { id: 'slef', label: 'EDSY SLEF' },
            { id: 'atlas', label: 'Atlas JSON' },
            { id: 'shortcode', label: 'Shortcode URL' }
          ] as fmt}
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[11px] border transition-colors {selectedFormat === fmt.id
                ? 'bg-orange-500/20 border-[var(--hud-amber)] text-[var(--hud-amber)] font-bold'
                : 'border-white/15 text-white/60 hover:text-white'}"
              onclick={() => (selectedFormat = fmt.id as any)}
            >
              {fmt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Main Text Area -->
      <div class="flex-1 p-4 overflow-hidden flex flex-col space-y-2">
        <div class="flex items-center justify-between text-[11px] text-white/60">
          <span>{activeMode === 'export' ? 'Generated Payload String:' : 'Paste Build Payload String / JSON:'}</span>
          {#if copyNotification}
            <span class="text-emerald-400 font-bold">{copyNotification}</span>
          {/if}
        </div>

        <textarea
          bind:value={textPayload}
          placeholder={activeMode === 'import' ? 'Paste Coriolis JSON, EDSY SLEF JSON, or Atlas base64 shortcode here...' : ''}
          readonly={activeMode === 'export'}
          class="w-full flex-1 min-h-[220px] bg-black/80 border border-white/20 rounded p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-[var(--hud-orange)] resize-none"
        ></textarea>

        {#if importError}
          <div class="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-500/40">
            {importError}
          </div>
        {/if}
      </div>

      <!-- Footer Action Buttons -->
      <div class="px-5 py-3 bg-black/80 border-t border-[var(--hud-orange)]/30 flex items-center justify-between">
        <span class="text-[10px] text-[var(--ed-orange-dim)]">
          CURRENT HULL: {ship.name.toUpperCase()}
        </span>

        <div class="flex items-center space-x-2">
          {#if activeMode === 'export'}
            <button
              type="button"
              class="px-4 py-1.5 rounded bg-[var(--hud-orange)] text-black font-bold hover:bg-[var(--hud-amber)] transition-colors text-xs shadow-[0_0_10px_rgba(255,102,0,0.4)]"
              onclick={handleCopy}
            >
              COPY TO CLIPBOARD
            </button>
          {:else}
            <button
              type="button"
              class="px-4 py-1.5 rounded bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors text-xs shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              onclick={handleImport}
            >
              LOAD BUILD
            </button>
          {/if}

          <button
            type="button"
            class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-colors text-xs"
            onclick={onClose}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
