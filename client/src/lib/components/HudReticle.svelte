<script lang="ts">
  import Icon from '$components/Icon.svelte';

  interface Props {
    targetName?: string;
    targetDistanceLy?: number;
    locked?: boolean;
    class?: string;
  }

  let {
    targetName = 'SOL',
    targetDistanceLy = 0.0,
    locked = true,
    class: customClass = '',
  }: Props = $props();
</script>

<!-- Central Targeting Reticle Overlay tracking canvas center focus -->
<div
  class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none {customClass}"
  aria-hidden="true"
>
  <!-- Reticle Group Centerpiece -->
  <div class="relative flex items-center justify-center">
    <!-- Horizontal Crosshair Lines -->
    <div class="absolute -left-28 w-16 h-[1px] bg-gradient-to-r from-transparent via-[var(--hud-orange)]/60 to-[var(--hud-orange)]"></div>
    <div class="absolute -right-28 w-16 h-[1px] bg-gradient-to-l from-transparent via-[var(--hud-orange)]/60 to-[var(--hud-orange)]"></div>

    <!-- Vertical Crosshair Lines -->
    <div class="absolute -top-28 h-16 w-[1px] bg-gradient-to-b from-transparent via-[var(--hud-orange)]/60 to-[var(--hud-orange)]"></div>
    <div class="absolute -bottom-28 h-16 w-[1px] bg-gradient-to-t from-transparent via-[var(--hud-orange)]/60 to-[var(--hud-orange)]"></div>

    <!-- Center Reticle Corner Bracket Box -->
    <div class="relative w-24 h-24 flex items-center justify-center">
      <!-- Frontier Corner Brackets -->
      <span class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--hud-orange)]"></span>
      <span class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--hud-orange)]"></span>
      <span class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--hud-orange)]"></span>
      <span class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--hud-orange)]"></span>

      <!-- Secondary Inner Dashed Ring -->
      <div class="w-16 h-16 rounded-full border border-dashed border-[var(--hud-orange)]/40 animate-[spin_60s_linear_infinite]"></div>

      <!-- Icon & Focus Pip -->
      <div class="absolute inset-0 flex items-center justify-center">
        <Icon name="reticle" size={54} glow={true} color="var(--hud-amber)" />
        <div class="absolute w-2 h-2 rounded-full bg-[var(--hud-orange)] shadow-hud-glow animate-ping opacity-75"></div>
      </div>

      <!-- Center Crosshair Tick Pips -->
      <span class="absolute -top-1 w-1 h-1 bg-[var(--hud-orange)]"></span>
      <span class="absolute -bottom-1 w-1 h-1 bg-[var(--hud-orange)]"></span>
      <span class="absolute -left-1 w-1 h-1 bg-[var(--hud-orange)]"></span>
      <span class="absolute -right-1 w-1 h-1 bg-[var(--hud-orange)]"></span>
    </div>

    <!-- Target Readout HUD Tag Below Reticle -->
    <div class="absolute top-16 flex flex-col items-center pointer-events-none font-mono">
      <div class="px-2.5 py-0.5 bg-black/75 border border-[var(--hud-orange)]/40 rounded text-center backdrop-blur-sm">
        <div class="text-[10px] text-[var(--hud-orange)] font-bold tracking-widest flex items-center space-x-1.5">
          <span class="w-1.5 h-1.5 rounded-full {locked ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse"></span>
          <span>{locked ? 'LOCKED' : 'SCANNING'} // {targetName}</span>
        </div>
        <div class="text-[9px] text-white/70 font-mono">
          DISTANCE: <span class="text-[var(--hud-amber)] font-bold">{targetDistanceLy.toFixed(2)} LY</span>
        </div>
      </div>
    </div>
  </div>
</div>
