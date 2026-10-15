<script lang="ts">
  import WebGPUCanvas from '$components/WebGPUCanvas.svelte';
  import Icon from '$components/Icon.svelte';

  let activeMode = $state<'galaxy' | 'system' | 'orrery' | 'surface'>('galaxy');
  let currentSystem = $state<string>('SOL');
  let distanceSol = $state<number>(0.0);
  let shipModel = $state<string>('ANACONDA MK I');
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

  <!-- HUD Navigation Header Shell -->
  <header class="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-3 bg-[var(--hud-bg)]/85 border-b border-[var(--hud-orange)]/30 backdrop-blur-md">
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <Icon name="reticle" size={20} glow={true} color="var(--hud-orange)" />
        <span class="hud-title text-base sm:text-lg">
          ATLAS <span class="text-xs text-[var(--hud-orange)] tracking-widest">// NAV-CORP</span>
        </span>
      </div>

      <div class="hidden md:flex items-center space-x-2 text-xs font-mono px-3 py-1 bg-black/50 border border-[var(--hud-orange)]/25 rounded">
        <span class="hud-data-label">TARGET:</span>
        <span class="hud-system-name text-xs">{currentSystem}</span>
        <span class="text-white/30">|</span>
        <span class="hud-data-value">{distanceSol.toFixed(1)} LY TO SOL</span>
      </div>
    </div>

    <!-- Mode Switcher Tab Group -->
    <div class="flex items-center space-x-2 text-xs font-mono">
      <button
        class="px-3 py-1 rounded transition-all uppercase tracking-wider flex items-center space-x-1.5 {activeMode === 'galaxy'
          ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
          : 'bg-[#0a1018] text-[var(--hud-orange)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
        onclick={() => (activeMode = 'galaxy')}
      >
        <span>[G] Galaxy</span>
      </button>

      <button
        class="px-3 py-1 rounded transition-all uppercase tracking-wider flex items-center space-x-1.5 {activeMode === 'system'
          ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
          : 'bg-[#0a1018] text-[var(--hud-orange)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
        onclick={() => (activeMode = 'system')}
      >
        <Icon name="coriolis" size={14} glow={false} />
        <span>[S] System</span>
      </button>

      <button
        class="px-3 py-1 rounded transition-all uppercase tracking-wider flex items-center space-x-1.5 {activeMode === 'orrery'
          ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
          : 'bg-[#0a1018] text-[var(--hud-orange)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
        onclick={() => (activeMode = 'orrery')}
      >
        <Icon name="orbis" size={14} glow={false} />
        <span>[O] Orrery</span>
      </button>

      <button
        class="px-3 py-1 rounded transition-all uppercase tracking-wider flex items-center space-x-1.5 {activeMode === 'surface'
          ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow'
          : 'bg-[#0a1018] text-[var(--hud-orange)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]'}"
        onclick={() => (activeMode = 'surface')}
      >
        <Icon name="landable-arc" size={14} glow={false} />
        <span>[P] Surface</span>
      </button>
    </div>

    <!-- Active Ship & Station Telemetry Badges -->
    <div class="hidden lg:flex items-center space-x-3 text-xs font-mono">
      <div class="flex items-center space-x-2 px-3 py-1 bg-black/50 border border-[var(--hud-orange)]/25 rounded text-[var(--hud-amber)]">
        <Icon name="fleet-carrier" size={16} glow={true} />
        <span class="hud-data-label">CARRIER LINK:</span>
        <span class="text-white">ACTIVE</span>
      </div>

      <div class="flex items-center space-x-2 px-3 py-1 bg-black/50 border border-[var(--hud-orange)]/25 rounded text-[var(--hud-amber)]">
        <span class="hud-data-label">HULL:</span>
        <span class="text-white">{shipModel}</span>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      </div>
    </div>
  </header>

  <!-- Central Reticle Target Overlay with Vector Sprite -->
  <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
    <div class="relative w-20 h-20 flex items-center justify-center">
      <Icon name="reticle" size={64} glow={true} color="var(--hud-amber)" />
      <div class="absolute w-1.5 h-1.5 rounded-full bg-[var(--hud-orange)] animate-ping opacity-60"></div>
    </div>
  </div>
</main>
