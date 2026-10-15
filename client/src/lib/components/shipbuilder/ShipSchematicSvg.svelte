<script lang="ts">
  import type { ShipChassis, HardpointSlot, UtilitySlot } from '$engine/ship_catalog';

  interface Props {
    ship: ShipChassis;
    selectedSlotId?: string | null;
    onSelectHardpoint?: (slot: HardpointSlot) => void;
    onSelectUtility?: (slot: UtilitySlot) => void;
  }

  let {
    ship,
    selectedSlotId = null,
    onSelectHardpoint,
    onSelectUtility,
  }: Props = $props();

  // Color mapping for weapon hardpoint sizes
  const SIZE_COLORS: Record<number, { border: string; fill: string; text: string; glow: string }> = {
    4: { border: '#ff3344', fill: 'rgba(255, 51, 68, 0.25)', text: '#ff5566', glow: 'rgba(255, 51, 68, 0.6)' }, // Huge: Red
    3: { border: '#9933ff', fill: 'rgba(153, 51, 255, 0.25)', text: '#bb66ff', glow: 'rgba(153, 51, 255, 0.6)' }, // Large: Purple
    2: { border: '#00ccff', fill: 'rgba(0, 204, 255, 0.25)', text: '#33ddff', glow: 'rgba(0, 204, 255, 0.6)' }, // Medium: Cyan
    1: { border: '#00ff88', fill: 'rgba(0, 255, 136, 0.25)', text: '#33ffaa', glow: 'rgba(0, 255, 136, 0.6)' }, // Small: Emerald Green
  };

  const UTILITY_COLOR = {
    border: '#ffaa00',
    fill: 'rgba(255, 170, 0, 0.2)',
    text: '#ffbb22',
    glow: 'rgba(255, 170, 0, 0.6)',
  };

  let hoveredItem = $state<{ type: 'hp' | 'ut'; item: HardpointSlot | UtilitySlot } | null>(null);

  function getSlotRadius(size: number): number {
    switch (size) {
      case 4: return 14;
      case 3: return 11;
      case 2: return 9;
      case 1: return 7;
      default: return 7;
    }
  }
</script>

<div class="relative w-full h-full flex flex-col items-center justify-center p-3 select-none">
  <!-- Schematic Header / HUD Crosshairs Overlay -->
  <div class="absolute top-2 left-3 z-10 flex items-center space-x-2 font-mono text-[10px] text-[var(--hud-amber)]">
    <span class="w-1.5 h-1.5 rounded-full bg-[var(--hud-orange)] animate-pulse"></span>
    <span class="tracking-widest uppercase">SCHEMATIC: {ship.name} // TOP-DOWN PROJECTION</span>
  </div>

  <div class="absolute top-2 right-3 z-10 flex items-center space-x-3 font-mono text-[9px]">
    <div class="flex items-center space-x-1">
      <span class="w-2 h-2 rounded-full border border-[#ff3344] bg-[#ff3344]/30"></span>
      <span class="text-white/70">Huge [4]</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="w-2 h-2 rounded-full border border-[#9933ff] bg-[#9933ff]/30"></span>
      <span class="text-white/70">Large [3]</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="w-2 h-2 rounded-full border border-[#00ccff] bg-[#00ccff]/30"></span>
      <span class="text-white/70">Med [2]</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="w-2 h-2 rounded-full border border-[#00ff88] bg-[#00ff88]/30"></span>
      <span class="text-white/70">Small [1]</span>
    </div>
    <div class="flex items-center space-x-1">
      <span class="w-2 h-2 rounded-sm border border-[#ffaa00] bg-[#ffaa00]/30"></span>
      <span class="text-white/70">Util [0]</span>
    </div>
  </div>

  <!-- Interactive SVG Canvas -->
  <svg
    viewBox="0 0 400 500"
    class="w-full h-full max-h-[520px] drop-shadow-[0_0_15px_rgba(255,128,0,0.15)] transition-all duration-300"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <!-- Technical Grid Pattern -->
      <pattern id="schematicGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 153, 0, 0.08)" stroke-width="0.75" />
      </pattern>
      <!-- Radial Hull Glow -->
      <radialGradient id="hullCenterGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(255, 153, 0, 0.12)" />
        <stop offset="60%" stop-color="rgba(255, 102, 0, 0.04)" />
        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
      </radialGradient>
      <!-- Hull Edge Linear Gradient -->
      <linearGradient id="hullEdgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffaa00" />
        <stop offset="50%" stop-color="#ff7700" />
        <stop offset="100%" stop-color="#cc5500" />
      </linearGradient>
    </defs>

    <!-- Blueprint Grid Background -->
    <rect x="0" y="0" width="400" height="500" fill="url(#schematicGrid)" />

    <!-- Center Symmetry Axis & Scale Rings -->
    <line x1="200" y1="20" x2="200" y2="480" stroke="rgba(255, 153, 0, 0.2)" stroke-width="1" stroke-dasharray="4 4" />
    <circle cx="200" cy="250" r="160" fill="none" stroke="rgba(255, 153, 0, 0.1)" stroke-width="1" stroke-dasharray="2 6" />
    <circle cx="200" cy="250" r="80" fill="none" stroke="rgba(255, 153, 0, 0.12)" stroke-width="1" stroke-dasharray="2 4" />

    <!-- Ship Top-Down Hull Silhouette Base -->
    <path
      d={ship.svgHullPath}
      fill="url(#hullCenterGlow)"
      stroke="url(#hullEdgeGrad)"
      stroke-width="2"
      stroke-linejoin="round"
      class="transition-all duration-300"
    />

    <!-- Internal Bulkhead & Armor Frame Overlay Lines -->
    <path
      d={ship.svgHullPath}
      fill="none"
      stroke="rgba(255, 170, 0, 0.35)"
      stroke-width="1"
      stroke-dasharray="6 3"
      transform="scale(0.85) translate(35, 45)"
    />

    <!-- Cockpit Canopy Indicator -->
    <path
      d="M192,90 Q200,75 208,90 L205,120 L195,120 Z"
      fill="rgba(0, 204, 255, 0.25)"
      stroke="rgba(0, 220, 255, 0.7)"
      stroke-width="1"
    />

    <!-- Thruster Exhaust Emitting Points (Bottom) -->
    <line x1="170" y1="425" x2="190" y2="425" stroke="#ff5500" stroke-width="3" stroke-linecap="round" />
    <line x1="210" y1="425" x2="230" y2="425" stroke="#ff5500" stroke-width="3" stroke-linecap="round" />

    <!-- Utility Mount Slots -->
    {#each ship.utilitySlots as ut}
      {@const isSelected = selectedSlotId === ut.id}
      {@const isHovered = hoveredItem?.item.id === ut.id}
      <g
        class="cursor-pointer transition-transform duration-200"
        onclick={() => onSelectUtility?.(ut)}
        onmouseenter={() => (hoveredItem = { type: 'ut', item: ut })}
        onmouseleave={() => (hoveredItem = null)}
        role="button"
        tabindex="0"
        aria-label={ut.label}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectUtility?.(ut)}
      >
        <!-- Reticle Brackets on Select/Hover -->
        {#if isSelected || isHovered}
          <rect
            x={ut.x - 10}
            y={ut.y - 10}
            width="20"
            height="20"
            fill="none"
            stroke={UTILITY_COLOR.border}
            stroke-width="1.5"
            stroke-dasharray="3 3"
            class="animate-pulse"
          />
        {/if}

        <rect
          x={ut.x - 6}
          y={ut.y - 6}
          width="12"
          height="12"
          fill={isSelected ? '#ffaa00' : UTILITY_COLOR.fill}
          stroke={UTILITY_COLOR.border}
          stroke-width="1.5"
          rx="1"
          class="transition-all duration-150 hover:brightness-125"
        />
        <text
          x={ut.x}
          y={ut.y + 3}
          text-anchor="middle"
          fill={isSelected ? '#000000' : UTILITY_COLOR.text}
          font-family="monospace"
          font-size="7"
          font-weight="bold"
        >
          U
        </text>
      </g>
    {/each}

    <!-- Weapon Hardpoint Slots -->
    {#each ship.hardpointSlots as hp}
      {@const color = SIZE_COLORS[hp.size] || SIZE_COLORS[1]}
      {@const radius = getSlotRadius(hp.size)}
      {@const isSelected = selectedSlotId === hp.id}
      {@const isHovered = hoveredItem?.item.id === hp.id}
      <g
        class="cursor-pointer transition-transform duration-200"
        onclick={() => onSelectHardpoint?.(hp)}
        onmouseenter={() => (hoveredItem = { type: 'hp', item: hp })}
        onmouseleave={() => (hoveredItem = null)}
        role="button"
        tabindex="0"
        aria-label={hp.label}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectHardpoint?.(hp)}
      >
        <!-- Targeting Reticle Crosshairs -->
        {#if isSelected || isHovered}
          <circle
            cx={hp.x}
            cy={hp.y}
            r={radius + 6}
            fill="none"
            stroke={color.border}
            stroke-width="1.5"
            stroke-dasharray="4 4"
            class="animate-spin"
            style="transform-origin: {hp.x}px {hp.y}px;"
          />
        {/if}

        <!-- Main Hardpoint Node Outer Disc -->
        <circle
          cx={hp.x}
          cy={hp.y}
          r={radius}
          fill={isSelected ? color.border : color.fill}
          stroke={color.border}
          stroke-width={isSelected ? '2.5' : '1.75'}
          class="transition-all duration-150 hover:brightness-125"
        />

        <!-- Mount Indicator Pip -->
        <circle
          cx={hp.x}
          cy={hp.y}
          r={radius * 0.4}
          fill={isSelected ? '#000000' : color.border}
        />

        <!-- Class Number Badge -->
        <text
          x={hp.x}
          y={hp.y + (hp.size >= 3 ? 3 : 2.5)}
          text-anchor="middle"
          fill={isSelected ? '#000000' : '#ffffff'}
          font-family="monospace"
          font-size={hp.size >= 3 ? 9 : 7.5}
          font-weight="bold"
        >
          {hp.size}
        </text>
      </g>
    {/each}
  </svg>

  <!-- Interactive Hover Inspector Tooltip (Bottom Floating Bar) -->
  <div class="mt-2 w-full px-3 py-1.5 rounded bg-black/75 border border-[var(--hud-orange)]/40 flex items-center justify-between font-mono text-[11px] backdrop-blur-sm min-h-[34px]">
    {#if hoveredItem}
      {#if hoveredItem.type === 'hp'}
        {@const hp = hoveredItem.item as HardpointSlot}
        <div class="flex items-center space-x-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" style="background: {SIZE_COLORS[hp.size].border}; color: #000;">
            SIZE {hp.size} // {hp.sizeLabel.toUpperCase()}
          </span>
          <span class="text-white font-bold">{hp.label}</span>
          <span class="text-[var(--ed-orange-dim)] text-[10px]">({hp.mount.toUpperCase()} MOUNT)</span>
        </div>
        <div class="text-[10px] text-[var(--hud-amber)]">
          Coordinates: [{hp.x}, {hp.y}]
        </div>
      {:else}
        {@const ut = hoveredItem.item as UtilitySlot}
        <div class="flex items-center space-x-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffaa00] text-black">
            UTILITY MOUNT
          </span>
          <span class="text-white font-bold">{ut.label}</span>
        </div>
        <div class="text-[10px] text-[var(--hud-amber)]">
          Coordinates: [{ut.x}, {ut.y}]
        </div>
      {/if}
    {:else}
      <div class="text-[var(--ed-orange-dim)] text-[10px] flex items-center space-x-2">
        <span class="text-[var(--hud-orange)] font-bold">INFO:</span>
        <span>Hover or click hardpoints/utilities to inspect convergence coords & firing arcs</span>
      </div>
      <div class="text-[10px] text-white/50">
        Total Hardpoints: {ship.hardpointSlots.length} | Utilities: {ship.utilitySlots.length}
      </div>
    {/if}
  </div>
</div>
