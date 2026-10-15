<!-- Location: atlas/client/src/lib/components/DssaCarrierCard.svelte -->
<!-- Deep Space Support Array (DSSA) Carrier Status Card / Modal (Stage 5.2) -->
<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import type { DssaCarrier } from '$engine/dssa_registry';
  import { audioSynthesizer } from '$engine/audio_synthesizer';

  interface Props {
    carrier: DssaCarrier | null;
    isOpen?: boolean;
    onClose?: () => void;
    onPlotRoute?: (systemName: string) => void;
    onFocusCamera?: (coords: { x: number; y: number; z: number }) => void;
  }

  let {
    carrier,
    isOpen = $bindable(false),
    onClose,
    onPlotRoute,
    onFocusCamera,
  }: Props = $props();

  let copySuccess = $state(false);
  let copyTimer: any = null;

  async function copySystemNameToClipboard() {
    if (!carrier) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(carrier.systemName);
        copySuccess = true;
        audioSynthesizer.playChime('chime');
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          copySuccess = false;
        }, 2200);
      }
    } catch {
      // Fallback
    }
  }

  function handlePlotRoute() {
    if (!carrier) return;
    audioSynthesizer.playChime('affirm');
    if (onPlotRoute) {
      onPlotRoute(carrier.systemName);
    }
  }

  function handleFocus() {
    if (!carrier) return;
    audioSynthesizer.playChime('target_lock');
    if (onFocusCamera) {
      onFocusCamera(carrier.coords);
    }
  }
</script>

{#if isOpen && carrier}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dssa-card-title"
  >
    <!-- Modal Card Container -->
    <div
      class="relative w-full max-w-lg bg-[var(--hud-bg)]/95 border-2 border-[var(--hud-amber)] rounded shadow-[0_0_35px_rgba(255,179,0,0.25)] overflow-hidden font-mono text-xs select-none"
    >
      <!-- Header Banner with DSSA Emblem & Callsign -->
      <div class="px-5 py-3.5 bg-black/60 border-b border-[var(--hud-amber)]/40 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded bg-[var(--hud-amber)]/10 border border-[var(--hud-amber)]/60 flex items-center justify-center shadow-hud-glow">
            <Icon name="dssa" size={24} color="var(--hud-amber)" />
          </div>
          <div>
            <div class="text-[10px] text-[var(--hud-amber)] font-bold tracking-widest uppercase flex items-center space-x-2">
              <span>DEEP SPACE SUPPORT ARRAY</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] {carrier.operationalStatus === 'Operational' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'}">
                {carrier.operationalStatus.toUpperCase()}
              </span>
            </div>
            <h2 id="dssa-card-title" class="text-base font-bold text-white tracking-wide">
              {carrier.name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          class="w-7 h-7 rounded border border-white/20 text-white/60 hover:text-white hover:border-[var(--hud-amber)] hover:bg-[var(--hud-amber)]/20 transition-colors flex items-center justify-center cursor-pointer"
          onclick={() => {
            isOpen = false;
            if (onClose) onClose();
          }}
          aria-label="Close Carrier Card"
        >
          ✕
        </button>
      </div>

      <!-- Card Body -->
      <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <!-- Callsign & Location Information -->
        <div class="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded border border-white/10">
          <div>
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">CALLSIGN</div>
            <div class="text-sm text-[var(--hud-amber)] font-bold tracking-wider">{carrier.callsign}</div>
          </div>
          <div>
            <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">GALACTIC REGION</div>
            <div class="text-xs text-white font-medium">{carrier.region}</div>
          </div>

          <div class="col-span-2 flex items-center justify-between pt-1 border-t border-white/5">
            <div>
              <div class="text-[10px] text-[var(--ed-orange-dim)] uppercase">ANCHOR SYSTEM</div>
              <div class="text-sm text-white font-bold flex items-center space-x-2">
                <span>{carrier.systemName}</span>
                {#if carrier.bodyName}
                  <span class="text-xs text-[var(--hud-orange)] font-normal">({carrier.bodyName})</span>
                {/if}
              </div>
            </div>

            <button
              type="button"
              class="px-2.5 py-1 rounded bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)] hover:bg-[var(--hud-orange)] hover:text-black font-bold transition-all text-[10px] flex items-center space-x-1"
              onclick={copySystemNameToClipboard}
              title="Copy system to clipboard"
            >
              <span>{copySuccess ? '✓ COPIED' : '📋 COPY'}</span>
            </button>
          </div>

          <!-- 3D Spatial Coordinates -->
          <div class="col-span-2 text-[10px] text-white/60 font-mono bg-black/60 p-1.5 rounded flex items-center justify-between">
            <span class="text-[var(--ed-orange-dim)]">GALACTIC COORDS:</span>
            <span class="text-white">
              X: {carrier.coords.x.toFixed(1)} &nbsp;|&nbsp;
              Y: {carrier.coords.y.toFixed(1)} &nbsp;|&nbsp;
              Z: {carrier.coords.z.toFixed(1)} LY
            </span>
          </div>

          {#if carrier.distanceLy !== undefined}
            <div class="col-span-2 flex items-center justify-between text-[11px] bg-[var(--hud-amber)]/10 px-2 py-1 rounded border border-[var(--hud-amber)]/30">
              <span class="text-[var(--hud-amber)] font-bold">DISTANCE FROM TARGET:</span>
              <span class="text-white font-bold">{carrier.distanceLy.toLocaleString(undefined, { maximumFractionDigits: 1 })} LY</span>
            </div>
          {/if}
        </div>

        <!-- Carrier Ownership & Tariff Rates -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] text-[var(--hud-amber)] font-bold uppercase">
            <span>OPERATIONS & TARIFFS</span>
            <span class="text-white/70 font-normal">OWNER: <strong class="text-white">{carrier.ownerCmdr}</strong></span>
          </div>

          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="p-2 rounded bg-black/30 border border-white/10">
              <div class="text-[9px] text-[var(--ed-orange-dim)] uppercase">FUEL TARIFF</div>
              <div class="text-xs font-bold {carrier.tariffs.fuelTariffPercent === 0 ? 'text-emerald-400' : 'text-amber-400'}">
                {carrier.tariffs.fuelTariffPercent}%
              </div>
            </div>
            <div class="p-2 rounded bg-black/30 border border-white/10">
              <div class="text-[9px] text-[var(--ed-orange-dim)] uppercase">REPAIR TARIFF</div>
              <div class="text-xs font-bold {carrier.tariffs.repairTariffPercent === 0 ? 'text-emerald-400' : 'text-amber-400'}">
                {carrier.tariffs.repairTariffPercent}%
              </div>
            </div>
            <div class="p-2 rounded bg-black/30 border border-white/10">
              <div class="text-[9px] text-[var(--ed-orange-dim)] uppercase">ARMORY TARIFF</div>
              <div class="text-xs font-bold {carrier.tariffs.armoryTariffPercent === 0 ? 'text-emerald-400' : 'text-amber-400'}">
                {carrier.tariffs.armoryTariffPercent}%
              </div>
            </div>
            <div class="p-2 rounded bg-black/30 border border-white/10">
              <div class="text-[9px] text-[var(--ed-orange-dim)] uppercase">GENERAL</div>
              <div class="text-xs font-bold {carrier.tariffs.generalTariffPercent === 0 ? 'text-emerald-400' : 'text-amber-400'}">
                {carrier.tariffs.generalTariffPercent}%
              </div>
            </div>
          </div>
        </div>

        <!-- Available Station Services Matrix -->
        <div class="space-y-2">
          <div class="text-[11px] text-[var(--hud-amber)] font-bold uppercase">
            SUPPORT LOGISTICS & SERVICES
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.refuel ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.refuel ? '✓' : '✗'}</span>
              <span>Refuel Depot</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.repair ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.repair ? '✓' : '✗'}</span>
              <span>Repair Dock</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.armory ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.armory ? '✓' : '✗'}</span>
              <span>Armory (Restock)</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.vistaGenomics ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.vistaGenomics ? '✓' : '✗'}</span>
              <span>Vista Genomics</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.universalCartographics ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.universalCartographics ? '✓' : '✗'}</span>
              <span>Cartographics</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.pioneerSupplies ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.pioneerSupplies ? '✓' : '✗'}</span>
              <span>Pioneer Supplies</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.shipyard ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.shipyard ? '✓' : '✗'}</span>
              <span>Shipyard Bay</span>
            </div>

            <div class="flex items-center space-x-1.5 p-1.5 rounded {carrier.services.outfitting ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border border-red-500/20 text-white/30'}">
              <span>{carrier.services.outfitting ? '✓' : '✗'}</span>
              <span>Outfitting</span>
            </div>
          </div>
        </div>

        <!-- Notes & Contact Info -->
        {#if carrier.notes || carrier.discordContact}
          <div class="p-2.5 rounded bg-black/50 border border-white/10 space-y-1.5 text-[11px]">
            {#if carrier.notes}
              <div class="text-white/80 leading-relaxed italic">
                "{carrier.notes}"
              </div>
            {/if}

            {#if carrier.discordContact}
              <div class="pt-1 flex items-center justify-between text-[10px] border-t border-white/10">
                <span class="text-[var(--ed-orange-dim)]">COMMS & DISPATCH:</span>
                <a
                  href={carrier.discordContact}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[var(--hud-amber)] hover:underline flex items-center space-x-1 font-bold"
                >
                  <span>DSSA DISCORD FREQUENCY</span>
                  <span>↗</span>
                </a>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Action Footer -->
      <div class="p-4 bg-black/70 border-t border-[var(--hud-amber)]/40 flex items-center justify-between gap-3">
        <button
          type="button"
          class="px-3 py-2 rounded bg-black/60 border border-white/20 text-white/80 hover:text-white hover:border-[var(--hud-amber)] text-xs flex items-center space-x-1.5 transition-colors"
          onclick={handleFocus}
        >
          <span>🎯</span>
          <span>CENTER CAMERA</span>
        </button>

        <button
          type="button"
          class="flex-1 py-2 px-4 rounded bg-[var(--hud-amber)] hover:bg-[var(--hud-orange)] text-black font-bold tracking-wider uppercase text-xs shadow-hud-glow transition-all flex items-center justify-center space-x-2 cursor-pointer"
          onclick={handlePlotRoute}
        >
          <span>⚡</span>
          <span>PLOT ROUTE TO DSSA HAVEN</span>
        </button>
      </div>
    </div>
  </div>
{/if}
