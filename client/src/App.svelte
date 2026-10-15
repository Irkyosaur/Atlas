<script lang="ts">
  import WebGPUCanvas from '$components/WebGPUCanvas.svelte';

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

  <!-- CRT Scanline & Grain Overlay -->
  <div class="crt-overlay"></div>

  <!-- Ambient Cobra HUD Glow Lines (Top & Bottom) -->
  <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#ff7100]/80 to-transparent z-30"></div>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7100]/50 to-transparent z-30"></div>

  <!-- Minimal HUD Header Shell for Stage 1.1 Foundation -->
  <header class="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-3 bg-[#0a1018]/80 border-b border-[#ff7100]/30 backdrop-blur-md">
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 bg-[#ff7100] rotate-45 border border-[#ff9800]"></div>
        <span class="text-lg font-bold tracking-[0.2em] uppercase text-white font-mono drop-shadow-[0_0_8px_rgba(255,113,0,0.6)]">
          ATLAS <span class="text-xs text-[#ff7100] tracking-widest">// NAV-CORP</span>
        </span>
      </div>

      <div class="hidden md:flex items-center space-x-2 text-xs font-mono px-3 py-1 bg-black/40 border border-[#ff7100]/20 rounded">
        <span class="text-[#ff7100]">TARGET:</span>
        <span class="text-white font-semibold">{currentSystem}</span>
        <span class="text-white/40">|</span>
        <span class="text-white/70">{distanceSol.toFixed(1)} LY TO SOL</span>
      </div>
    </div>

    <!-- Mode Badges -->
    <div class="flex items-center space-x-2 text-xs font-mono">
      <button
        class="px-3 py-1 rounded transition-colors uppercase tracking-wider {activeMode === 'galaxy'
          ? 'bg-[#ff7100] text-black font-bold shadow-[0_0_10px_rgba(255,113,0,0.6)]'
          : 'bg-[#0a1018] text-[#ff7100] border border-[#ff7100]/30 hover:border-[#ff7100]'}"
        onclick={() => (activeMode = 'galaxy')}
      >
        [G] Galaxy
      </button>

      <button
        class="px-3 py-1 rounded transition-colors uppercase tracking-wider {activeMode === 'system'
          ? 'bg-[#ff7100] text-black font-bold shadow-[0_0_10px_rgba(255,113,0,0.6)]'
          : 'bg-[#0a1018] text-[#ff7100] border border-[#ff7100]/30 hover:border-[#ff7100]'}"
        onclick={() => (activeMode = 'system')}
      >
        [S] System
      </button>

      <button
        class="px-3 py-1 rounded transition-colors uppercase tracking-wider {activeMode === 'orrery'
          ? 'bg-[#ff7100] text-black font-bold shadow-[0_0_10px_rgba(255,113,0,0.6)]'
          : 'bg-[#0a1018] text-[#ff7100] border border-[#ff7100]/30 hover:border-[#ff7100]'}"
        onclick={() => (activeMode = 'orrery')}
      >
        [O] Orrery
      </button>

      <button
        class="px-3 py-1 rounded transition-colors uppercase tracking-wider {activeMode === 'surface'
          ? 'bg-[#ff7100] text-black font-bold shadow-[0_0_10px_rgba(255,113,0,0.6)]'
          : 'bg-[#0a1018] text-[#ff7100] border border-[#ff7100]/30 hover:border-[#ff7100]'}"
        onclick={() => (activeMode = 'surface')}
      >
        [P] Surface
      </button>
    </div>

    <!-- Active Ship Telemetry Pill -->
    <div class="hidden lg:flex items-center space-x-2 text-xs font-mono px-3 py-1 bg-black/40 border border-[#ff7100]/20 rounded text-[#ff9800]">
      <span class="text-white/40">HULL:</span>
      <span class="text-white">{shipModel}</span>
      <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
    </div>
  </header>

  <!-- Central Reticle Target Overlay -->
  <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
    <div class="relative w-16 h-16 ed-reticle-box opacity-75">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-[#ff7100]/80"></div>
      </div>
    </div>
  </div>
</main>
