<script lang="ts">
  import WebGPUCanvas from '$components/WebGPUCanvas.svelte';
  import Icon from '$components/Icon.svelte';
  import TopNavHeader from '$components/TopNavHeader.svelte';
  import type { NavigationMode } from '$components/ModeSwitcher.svelte';
  import { DEFAULT_TELEMETRY, type SessionTelemetry } from '$engine/session_telemetry';
  import type { SystemRecord } from '$engine/ananke_client';

  let activeMode = $state<NavigationMode>('galaxy');
  let telemetry = $state<SessionTelemetry>({ ...DEFAULT_TELEMETRY });

  function handleSelectSystem(system: SystemRecord) {
    const dist = Math.sqrt(system.x * system.x + system.y * system.y + system.z * system.z);
    telemetry.currentSystem = system.name;
    telemetry.distanceSol = dist;
  }
</script>

<main class="relative w-screen h-screen overflow-hidden bg-[#030508] text-white font-sans select-none">
  <!-- WebGPU / WebGL2 Fullscreen Canvas -->
  <div class="absolute inset-0 z-0">
    <WebGPUCanvas />
  </div>

  <!-- CRT Scanline & Chromatic Vignette Overlays -->
  <div class="crt-overlay"></div>
  <div class="crt-vignette"></div>

  <!-- Ambient Cobra HUD Glow Lines (Top & Bottom) -->
  <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--hud-orange)]/80 to-transparent z-30"></div>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[var(--hud-orange)]/50 to-transparent z-30"></div>

  <!-- Stage 1.3: Top Navigation Header with Search, Mode Switcher & Telemetry -->
  <TopNavHeader
    bind:activeMode
    bind:telemetry
    onSelectSystem={handleSelectSystem}
  />

  <!-- Active View Indicator / Mode Banner (Bottom-Left) -->
  <div class="absolute bottom-4 left-6 z-30 flex items-center space-x-3 px-3 py-1.5 bg-black/60 border border-[var(--hud-orange)]/30 rounded backdrop-blur-sm font-mono text-xs">
    <span class="hud-data-label">MODE:</span>
    <span class="text-[var(--hud-amber)] font-bold uppercase tracking-wider">{activeMode} MAP</span>
    <span class="text-white/30">|</span>
    <span class="hud-data-label">KEYBOARD:</span>
    <span class="text-white/70">[G] [S] [O] [P]</span>
  </div>

  <!-- Central Reticle Target Overlay with Vector Sprite -->
  <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
    <div class="relative w-20 h-20 flex items-center justify-center">
      <Icon name="reticle" size={64} glow={true} color="var(--hud-amber)" />
      <div class="absolute w-1.5 h-1.5 rounded-full bg-[var(--hud-orange)] animate-ping opacity-60"></div>
    </div>
  </div>
</main>
