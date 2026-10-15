<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import { AnankeClient, type SystemRecord } from '$engine/ananke_client';
  import { onMount } from 'svelte';

  interface Props {
    onSelectSystem?: (system: SystemRecord) => void;
  }

  let { onSelectSystem }: Props = $props();

  let query = $state('');
  let isFocused = $state(false);
  let isSearching = $state(false);
  let results = $state<SystemRecord[]>([]);
  let selectedIndex = $state(-1);
  let searchInput = $state<HTMLInputElement | null>(null);

  const ananke = new AnankeClient();
  let debounceTimeout: any = null;

  // Fallback / mock systems when Ananke API backend is offline or during initial startup
  const FALLBACK_SYSTEMS: SystemRecord[] = [
    {
      id64: '10477373803',
      name: 'SOL',
      x: 0,
      y: 0,
      z: 0,
      primaryStarClass: 'G',
      population: 22780871769,
      allegiance: 'Federation',
      security: 'High',
      government: 'Democracy',
      controllingFaction: 'Sol Workers\' Party'
    },
    {
      id64: '28696700487',
      name: 'ACHENAR',
      x: 67.5,
      y: -119.4,
      z: 24.8,
      primaryStarClass: 'B',
      population: 13000000000,
      allegiance: 'Empire',
      security: 'High',
      government: 'Patronage',
      controllingFaction: 'Achenar Empire League'
    },
    {
      id64: '3819876293',
      name: 'ALIOTH',
      x: -33.6,
      y: -35.2,
      z: 104.9,
      primaryStarClass: 'A',
      population: 11453200000,
      allegiance: 'Alliance',
      security: 'High',
      government: 'Democracy',
      controllingFaction: 'Alioth Independents'
    },
    {
      id64: '5846205721',
      name: 'COLONIA',
      x: -9530.5,
      y: -910.3,
      z: 19808.1,
      primaryStarClass: 'F',
      population: 12500000,
      allegiance: 'Independent',
      security: 'Medium',
      government: 'Cooperative',
      controllingFaction: 'Colonia Council'
    },
    {
      id64: '1284958172',
      name: 'SHINRARTA DEZHRA',
      x: 55.7,
      y: 17.5,
      z: 27.1,
      primaryStarClass: 'K',
      population: 85200000,
      allegiance: 'Independent',
      security: 'High',
      government: 'Democracy',
      controllingFaction: 'The Pilots Federation'
    },
    {
      id64: '9921471012',
      name: 'MAIA',
      x: -81.8,
      y: -149.3,
      z: -343.4,
      primaryStarClass: 'B',
      population: 340000,
      allegiance: 'Independent',
      security: 'Anarchy',
      government: 'Anarchy',
      thargoidWar: 'Incursion'
    },
    {
      id64: '7119283746',
      name: 'SAGITTARIUS A*',
      x: 25.2,
      y: -20.9,
      z: 25899.9,
      primaryStarClass: 'Supermassive Black Hole',
      population: 0,
      allegiance: 'Independent',
      security: 'Anarchy'
    },
    {
      id64: '8839201948',
      name: 'BEAGLE POINT',
      x: -1111.6,
      y: -134.6,
      z: 65269.8,
      primaryStarClass: 'K',
      population: 0,
      allegiance: 'Independent',
      security: 'Anarchy'
    }
  ];

  function calculateDistanceToSol(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
  }

  async function handleSearch(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      results = [];
      selectedIndex = -1;
      return;
    }

    const clean = searchTerm.trim().toUpperCase();
    isSearching = true;

    try {
      const liveResults = await ananke.searchAutocomplete(clean);
      if (liveResults && liveResults.length > 0) {
        results = liveResults.slice(0, 8);
      } else {
        // Fallback search match
        results = FALLBACK_SYSTEMS.filter((s) => s.name.toUpperCase().includes(clean)).slice(0, 8);
      }
    } catch {
      // Offline fallback
      results = FALLBACK_SYSTEMS.filter((s) => s.name.toUpperCase().includes(clean)).slice(0, 8);
    } finally {
      isSearching = false;
      selectedIndex = results.length > 0 ? 0 : -1;
    }
  }

  function onInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    query = val;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      handleSearch(val);
    }, 120);
  }

  function selectSystem(system: SystemRecord) {
    query = system.name;
    results = [];
    isFocused = false;
    selectedIndex = -1;
    if (onSelectSystem) {
      onSelectSystem(system);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      results = [];
      selectedIndex = -1;
      searchInput?.blur();
      return;
    }

    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        selectSystem(results[selectedIndex]);
      }
    }
  }

  onMount(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if (!isInput && (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k'))) {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  });
</script>

<div class="relative w-64 md:w-80 lg:w-96 text-xs font-mono">
  <!-- Input Container -->
  <div
    class="flex items-center px-3 py-1.5 bg-black/60 border rounded transition-all duration-150 {isFocused
      ? 'border-[var(--hud-orange)] shadow-hud-glow bg-black/80'
      : 'border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)]/60'}"
  >
    <Icon name="reticle" size={14} glow={isFocused} color={isFocused ? 'var(--hud-orange)' : 'var(--ed-orange-dim)'} />

    <input
      bind:this={searchInput}
      type="text"
      value={query}
      oninput={onInput}
      onfocus={() => {
        isFocused = true;
        if (query.trim()) handleSearch(query);
      }}
      onblur={() => {
        // Slight delay to allow clicks on dropdown items to trigger
        setTimeout(() => {
          isFocused = false;
        }, 200);
      }}
      onkeydown={handleKeydown}
      placeholder="SEARCH STAR SYSTEMS [/ or CTRL+K]..."
      class="w-full ml-2 bg-transparent text-[var(--hud-amber)] placeholder-[var(--ed-orange-dim)] focus:outline-none tracking-wider uppercase font-mono text-xs"
      spellcheck="false"
      autocomplete="off"
    />

    {#if isSearching}
      <div class="w-3 h-3 border-2 border-[var(--hud-orange)] border-t-transparent rounded-full animate-spin"></div>
    {:else if query}
      <button
        type="button"
        class="text-[var(--ed-orange-dim)] hover:text-[var(--hud-orange)] text-xs px-1"
        onclick={() => {
          query = '';
          results = [];
          searchInput?.focus();
        }}
      >
        ✕
      </button>
    {:else}
      <span class="text-[10px] text-white/30 border border-white/20 px-1 py-0.5 rounded font-mono">/</span>
    {/if}
  </div>

  <!-- Autocomplete Dropdown List -->
  {#if isFocused && results.length > 0}
    <div
      class="absolute left-0 right-0 top-full mt-1 bg-[var(--hud-bg)]/95 border border-[var(--hud-orange)]/40 rounded shadow-2xl backdrop-blur-md overflow-hidden z-50 divide-y divide-[var(--hud-orange)]/15 max-h-80 overflow-y-auto"
    >
      <div class="px-3 py-1 bg-black/40 text-[10px] text-[var(--ed-orange-dim)] tracking-widest uppercase flex justify-between">
        <span>STAR SYSTEM MATCHES</span>
        <span>{results.length} RESULTS</span>
      </div>

      {#each results as system, index}
        <button
          type="button"
          class="w-full text-left px-3 py-2 flex items-center justify-between transition-colors {selectedIndex === index
            ? 'bg-[var(--hud-orange)]/25 text-white border-l-2 border-[var(--hud-orange)]'
            : 'hover:bg-[var(--hud-orange)]/10 text-[var(--hud-amber)]'}"
          onclick={() => selectSystem(system)}
          onmouseenter={() => (selectedIndex = index)}
        >
          <div class="flex items-center space-x-2 truncate">
            <span class="w-5 h-5 flex items-center justify-center font-bold rounded bg-black/50 text-[10px] text-[var(--hud-orange)] border border-[var(--hud-orange)]/20">
              {system.primaryStarClass?.charAt(0) || '★'}
            </span>
            <div class="truncate">
              <div class="font-bold tracking-wide uppercase truncate text-white">{system.name}</div>
              <div class="text-[10px] text-[var(--ed-orange-dim)] truncate">
                {system.allegiance || 'INDEPENDENT'} &bull; {system.population > 0 ? `${(system.population / 1e6).toFixed(1)}M POP` : 'UNINHABITED'}
              </div>
            </div>
          </div>

          <div class="text-right pl-2 whitespace-nowrap">
            <div class="text-[11px] text-[var(--hud-orange)] font-mono">
              {calculateDistanceToSol(system.x, system.y, system.z).toFixed(1)} LY
            </div>
            {#if system.thargoidWar}
              <div class="text-[9px] text-red-400 font-bold tracking-wider">AX WAR</div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
