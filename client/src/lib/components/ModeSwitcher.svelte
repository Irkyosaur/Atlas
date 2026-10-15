<script lang="ts">
  import Icon from '$components/Icon.svelte';
  import { onMount } from 'svelte';

  export type NavigationMode = 'galaxy' | 'system' | 'orrery' | 'surface';

  interface Props {
    activeMode: NavigationMode;
    onModeChange?: (mode: NavigationMode) => void;
  }

  let { activeMode = $bindable('galaxy'), onModeChange }: Props = $props();

  interface ModeItem {
    id: NavigationMode;
    label: string;
    key: string;
    icon: string;
  }

  const MODES: ModeItem[] = [
    { id: 'galaxy', label: 'Galaxy', key: 'G', icon: 'reticle' },
    { id: 'system', label: 'System', key: 'S', icon: 'coriolis' },
    { id: 'orrery', label: 'Orrery', key: 'O', icon: 'orbis' },
    { id: 'surface', label: 'Surface', key: 'P', icon: 'landable-arc' },
  ];

  function setMode(mode: NavigationMode) {
    activeMode = mode;
    if (onModeChange) {
      onModeChange(mode);
    }
  }

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'G') {
        e.preventDefault();
        setMode('galaxy');
      } else if (key === 'S') {
        e.preventDefault();
        setMode('system');
      } else if (key === 'O') {
        e.preventDefault();
        setMode('orrery');
      } else if (key === 'P') {
        e.preventDefault();
        setMode('surface');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<nav class="flex items-center space-x-1 sm:space-x-2 text-xs font-mono" aria-label="Atlas Cartography Mode Switcher">
  {#each MODES as item}
    <button
      type="button"
      class="px-2.5 py-1.5 rounded transition-all duration-150 uppercase tracking-wider flex items-center space-x-1.5 {activeMode === item.id
        ? 'bg-[var(--hud-orange)] text-black font-bold shadow-hud-glow border border-[var(--hud-amber)]'
        : 'bg-[#0a1018] text-[var(--hud-orange)] border border-[var(--hud-orange)]/30 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/10'}"
      onclick={() => setMode(item.id)}
      title={`Switch to ${item.label} Map [${item.key}]`}
    >
      <Icon
        name={item.icon}
        size={14}
        glow={activeMode === item.id}
        color={activeMode === item.id ? '#000000' : 'var(--hud-orange)'}
      />
      <span><strong class="opacity-80">[{item.key}]</strong> {item.label}</span>
    </button>
  {/each}
</nav>
