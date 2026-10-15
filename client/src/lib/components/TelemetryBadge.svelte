<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import type { SessionTelemetry } from '$engine/session_telemetry';
  import { cmdrProfileEngine, type CommanderProfile } from '$engine/cmdr_profile_engine';
  import { onMount } from 'svelte';

  interface Props {
    telemetry: SessionTelemetry;
    onOpenDossier?: () => void;
  }

  let { telemetry, onOpenDossier }: Props = $props();

  let profile = $state<CommanderProfile>(cmdrProfileEngine.getProfile());

  onMount(() => {
    const unsub = cmdrProfileEngine.subscribe((p) => {
      profile = p;
    });
    return unsub;
  });
</script>

<div class="flex items-center space-x-2 sm:space-x-3 text-xs font-mono">
  <!-- Stage 9.2: CMDR Profile & Verified Dossier Badge -->
  <button
    type="button"
    onclick={() => onOpenDossier?.()}
    class="flex items-center space-x-1.5 px-2.5 py-1 bg-black/60 border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/15 rounded text-[var(--hud-orange)] transition-all shadow-sm cursor-pointer"
    title="Open Verified Commander Dossier, Ranks & Milestones [Stage 9.2]"
  >
    <span class="text-xs">👨‍🚀</span>
    <span class="hud-data-label text-[10px]">CMDR</span>
    <span class="text-white text-[11px] font-bold tracking-wide">{profile.commanderName}</span>
    {#if profile.isCapiVerified}
      <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold" title="Frontier CAPI Verified">
        ✓
      </span>
    {/if}
  </button>

  <!-- Target System / Sol Distance Badge -->
  <div class="flex items-center space-x-2 px-3 py-1 bg-black/60 border border-[var(--hud-orange)]/30 rounded shadow-sm">
    <Icon name="reticle" size={14} glow={true} color="var(--hud-orange)" />
    <span class="hud-data-label text-[11px]">TARGET:</span>
    <span class="hud-system-name text-xs font-bold tracking-wide">{telemetry.currentSystem}</span>
    <span class="text-white/30 font-light">|</span>
    <span class="hud-data-value text-[11px] text-[var(--hud-amber)]">
      {telemetry.distanceSol.toFixed(1)} LY TO SOL
    </span>
  </div>

  <!-- Carrier Telemetry Link -->
  <div class="hidden xl:flex items-center space-x-2 px-3 py-1 bg-black/60 border border-[var(--hud-orange)]/25 rounded text-[var(--hud-amber)]">
    <Icon name="fleet-carrier" size={15} glow={telemetry.carrierLinkActive} />
    <span class="hud-data-label text-[11px]">CARRIER:</span>
    <span class="text-white text-[11px] font-bold">
      {telemetry.carrierLinkActive ? 'SYNCED' : 'OFFLINE'}
    </span>
  </div>

  <!-- Active Ship Hull Status -->
  <div class="hidden lg:flex items-center space-x-2 px-3 py-1 bg-black/60 border border-[var(--hud-orange)]/25 rounded text-[var(--hud-amber)]">
    <span class="hud-data-label text-[11px]">HULL:</span>
    <span class="text-white text-[11px] font-bold">{telemetry.activeShip}</span>
    <span
      class="inline-block w-2 h-2 rounded-full {telemetry.shipHullPercent > 80
        ? 'bg-emerald-400'
        : telemetry.shipHullPercent > 40
          ? 'bg-amber-400'
          : 'bg-red-500'} animate-pulse"
      title={`Integrity: ${telemetry.shipHullPercent}%`}
    ></span>
    <span class="text-[10px] text-white/50">{telemetry.shipHullPercent}%</span>
  </div>
</div>
