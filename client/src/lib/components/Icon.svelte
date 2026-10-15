<script lang="ts">
  export type IconName =
    | 'coriolis'
    | 'orbis'
    | 'outpost'
    | 'surface-settlement'
    | 'fleet-carrier'
    | 'landable-arc'
    | 'maelstrom'
    | 'reticle'
    | string;

  interface Props {
    name: IconName;
    size?: number | string;
    glow?: boolean;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }

  let {
    name,
    size = 24,
    glow = true,
    color,
    class: customClass = '',
    ariaLabel,
  }: Props = $props();

  // Normalize icon id to point to symbol in atlas_icon_sprites.svg
  let symbolId = $derived(name.startsWith('atlas-icon-') ? name : `atlas-icon-${name}`);
  let label = $derived(ariaLabel || `${name.replace(/-/g, ' ')} icon`);
  let dimension = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<svg
  class="inline-block transition-transform duration-150 {glow ? 'glow-orange' : ''} {customClass}"
  width={dimension}
  height={dimension}
  viewBox="0 0 48 48"
  style={color ? `color: ${color};` : ''}
  role="img"
  aria-label={label}
>
  <use href={`/atlas_icon_sprites.svg#${symbolId}`} />
</svg>

<style>
  svg {
    vertical-align: middle;
  }
</style>
