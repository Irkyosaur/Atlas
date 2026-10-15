<script lang="ts">
  // Location: atlas/client/src/lib/components/CelestialIcon.svelte
  // SVG Iconography for all Spectral Classes & Planetary Subtypes (Task 3.1.2)

  interface Props {
    type: string;
    subType?: string;
    spectralClass?: string;
    size?: number;
    landable?: boolean;
    rings?: boolean;
  }

  let {
    type,
    subType = '',
    spectralClass,
    size = 24,
    landable = false,
    rings = false,
  }: Props = $props();

  // Determine icon category and colors based on stellar spectrum or planet morphology
  let iconData = $derived.by(() => {
    const s = subType.toLowerCase();
    const t = type.toLowerCase();
    const spec = (spectralClass || '').toUpperCase();

    // 1. Stars & Compact Remnants
    if (t.includes('star') || spec) {
      if (s.includes('black hole') || spec === 'H') {
        return { category: 'blackhole', fill: '#0a0d14', stroke: '#ff7100', glow: 'rgba(255, 113, 0, 0.6)' };
      }
      if (s.includes('neutron') || spec === 'N') {
        return { category: 'neutron', fill: '#e0f7fa', stroke: '#00e5ff', glow: 'rgba(0, 229, 255, 0.8)' };
      }
      if (s.includes('white dwarf') || spec === 'D') {
        return { category: 'star', fill: '#e0f7fa', stroke: '#b2ebf2', glow: 'rgba(224, 247, 250, 0.7)' };
      }
      if (spec.startsWith('O') || s.includes('o (blue')) {
        return { category: 'star', fill: '#9bb0ff', stroke: '#c2d1ff', glow: 'rgba(155, 176, 255, 0.75)' };
      }
      if (spec.startsWith('B')) {
        return { category: 'star', fill: '#bbccff', stroke: '#d8e2ff', glow: 'rgba(187, 204, 255, 0.6)' };
      }
      if (spec.startsWith('A')) {
        return { category: 'star', fill: '#f8f9ff', stroke: '#ffffff', glow: 'rgba(248, 249, 255, 0.5)' };
      }
      if (spec.startsWith('F')) {
        return { category: 'star', fill: '#ffffed', stroke: '#ffffff', glow: 'rgba(255, 255, 237, 0.5)' };
      }
      if (spec.startsWith('G')) {
        return { category: 'star', fill: '#fff3a8', stroke: '#ffe066', glow: 'rgba(255, 243, 168, 0.6)' };
      }
      if (spec.startsWith('K')) {
        return { category: 'star', fill: '#ffc067', stroke: '#ffa940', glow: 'rgba(255, 192, 103, 0.6)' };
      }
      if (spec.startsWith('M') || s.includes('red dwarf')) {
        return { category: 'star', fill: '#ff6e41', stroke: '#ff4d4f', glow: 'rgba(255, 110, 65, 0.65)' };
      }
      if (spec.startsWith('L') || spec.startsWith('T') || spec.startsWith('Y') || s.includes('brown dwarf')) {
        return { category: 'star', fill: '#8c253b', stroke: '#b83333', glow: 'rgba(140, 37, 59, 0.4)' };
      }
      return { category: 'star', fill: '#fff3a8', stroke: '#ff7100', glow: 'rgba(255, 113, 0, 0.5)' };
    }

    // 2. Barycentre Nodes (Binary/Tertiary virtual orbital center)
    if (t.includes('barycentre')) {
      return { category: 'barycentre', fill: 'none', stroke: '#7cf5ff', glow: 'rgba(124, 245, 255, 0.7)' };
    }

    // 3. Orbital Stations
    if (t.includes('station')) {
      return { category: 'station', fill: '#14202d', stroke: '#ff9800', glow: 'rgba(255, 152, 0, 0.5)' };
    }

    // 4. Planets & Moons
    if (s.includes('earth-like') || s.includes('earthlike')) {
      return { category: 'earthlike', fill: '#1b6ca8', stroke: '#40c057', glow: 'rgba(64, 192, 87, 0.5)' };
    }
    if (s.includes('water world') || s.includes('water giant')) {
      return { category: 'water', fill: '#1864ab', stroke: '#4dabf7', glow: 'rgba(77, 171, 247, 0.45)' };
    }
    if (s.includes('ammonia')) {
      return { category: 'ammonia', fill: '#a9e34b', stroke: '#d9480f', glow: 'rgba(169, 227, 75, 0.45)' };
    }
    if (s.includes('gas giant') || t.includes('gas giant')) {
      if (s.includes('class i')) return { category: 'gasgiant', fill: '#e8590c', stroke: '#ffa94d', glow: 'rgba(232, 89, 12, 0.4)' };
      if (s.includes('class ii')) return { category: 'gasgiant', fill: '#f59f00', stroke: '#ffd43b', glow: 'rgba(245, 159, 0, 0.4)' };
      if (s.includes('class iii')) return { category: 'gasgiant', fill: '#7048e8', stroke: '#b197fc', glow: 'rgba(112, 72, 232, 0.4)' };
      if (s.includes('class iv')) return { category: 'gasgiant', fill: '#d6336c', stroke: '#f783ac', glow: 'rgba(214, 51, 108, 0.4)' };
      if (s.includes('class v')) return { category: 'gasgiant', fill: '#495057', stroke: '#f03e3e', glow: 'rgba(240, 62, 62, 0.4)' };
      return { category: 'gasgiant', fill: '#fd7e14', stroke: '#ffa94d', glow: 'rgba(253, 126, 20, 0.4)' };
    }
    if (s.includes('metal-rich') || s.includes('metal rich')) {
      return { category: 'terrestrial', fill: '#e03131', stroke: '#ff6b6b', glow: 'rgba(224, 49, 49, 0.35)' };
    }
    if (s.includes('high metal content')) {
      return { category: 'terrestrial', fill: '#d9480f', stroke: '#ff922b', glow: 'rgba(217, 72, 15, 0.35)' };
    }
    if (s.includes('rocky')) {
      return { category: 'rocky', fill: '#868e96', stroke: '#ced4da', glow: 'rgba(134, 142, 150, 0.25)' };
    }
    if (s.includes('icy')) {
      return { category: 'icy', fill: '#a5d8ff', stroke: '#e7f5ff', glow: 'rgba(165, 216, 255, 0.4)' };
    }

    return { category: 'terrestrial', fill: '#adb5bd', stroke: '#dee2e6', glow: 'rgba(173, 181, 189, 0.2)' };
  });
</script>

<div
  class="relative inline-flex items-center justify-center select-none"
  style="width: {size}px; height: {size}px;"
>
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    class="overflow-visible"
  >
    {#if iconData.category === 'star'}
      <!-- Glowing Star Corona -->
      <circle
        cx="16"
        cy="16"
        r="14"
        fill={iconData.glow}
        filter="blur(2px)"
      />
      <!-- Star Core -->
      <circle
        cx="16"
        cy="16"
        r="10"
        fill={iconData.fill}
        stroke={iconData.stroke}
        stroke-width="1.5"
      />
      <!-- White-hot center -->
      <circle
        cx="16"
        cy="16"
        r="4"
        fill="#ffffff"
        opacity="0.8"
      />

    {:else if iconData.category === 'blackhole'}
      <!-- Orange Accretion Disk / Gravitational Lensing -->
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="none"
        stroke={iconData.stroke}
        stroke-width="2.5"
        stroke-dasharray="2 1.5"
      />
      <!-- Black Event Horizon -->
      <circle
        cx="16"
        cy="16"
        r="8"
        fill={iconData.fill}
        stroke={iconData.stroke}
        stroke-width="1"
      />

    {:else if iconData.category === 'neutron'}
      <!-- Pulsar Jet Cones -->
      <line x1="16" y1="2" x2="16" y2="30" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="2 1" />
      <circle cx="16" cy="16" r="12" fill={iconData.glow} />
      <circle cx="16" cy="16" r="5" fill="#ffffff" stroke={iconData.stroke} stroke-width="1.5" />

    {:else if iconData.category === 'barycentre'}
      <!-- Dotted Barycentre Marker (Virtual Center of Mass) -->
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke={iconData.stroke}
        stroke-width="1.5"
        stroke-dasharray="3 2"
      />
      <circle cx="16" cy="16" r="2.5" fill={iconData.stroke} />
      <line x1="8" y1="16" x2="24" y2="16" stroke={iconData.stroke} stroke-width="1" />
      <line x1="16" y1="8" x2="16" y2="24" stroke={iconData.stroke} stroke-width="1" />

    {:else if iconData.category === 'station'}
      <!-- Coriolis / Orbis Hexagonal Outpost Shape -->
      <polygon
        points="16,6 25,11 25,21 16,26 7,21 7,11"
        fill={iconData.fill}
        stroke={iconData.stroke}
        stroke-width="1.5"
      />
      <circle cx="16" cy="16" r="3" fill="#ff9800" />

    {:else}
      <!-- Planetary Sphere (Earth-Like, Water, Gas Giant, etc.) -->
      {#if rings}
        <ellipse
          cx="16"
          cy="16"
          rx="15"
          ry="5"
          fill="none"
          stroke={iconData.stroke}
          stroke-width="1"
          opacity="0.6"
        />
      {/if}

      <circle
        cx="16"
        cy="16"
        r="9"
        fill={iconData.fill}
        stroke={iconData.stroke}
        stroke-width="1.5"
      />

      <!-- Landable Blue Sub-arc indicator (Elite Dangerous UI standard) -->
      {#if landable}
        <path
          d="M 9 10 A 9 9 0 0 1 23 10"
          fill="none"
          stroke="#00e5ff"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      {/if}
    {/if}
  </svg>
</div>
