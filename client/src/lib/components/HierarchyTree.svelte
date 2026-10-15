<script lang="ts">
  // Location: atlas/client/src/lib/components/HierarchyTree.svelte
  // 2D System Hierarchy & D3 Tree Visualization (Task 3.1.1, 3.1.2, 3.1.3, 3.1.4)

  import { onMount } from 'svelte';
  import * as d3 from 'd3-hierarchy';
  import CelestialIcon from '$components/CelestialIcon.svelte';
  import {
    type HierarchyNodeData,
    buildSolHierarchyFallback,
    parseSystemHierarchy,
  } from '$engine/hierarchy_parser';
  import { ananke, type BodyRecord, type StationRecord } from '$engine/ananke_client';

  interface Props {
    systemName?: string;
    onSelectNode?: (node: HierarchyNodeData) => void;
  }

  let { systemName = 'SOL', onSelectNode }: Props = $props();

  let container = $state<HTMLDivElement | null>(null);
  let svgElement = $state<SVGSVGElement | null>(null);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);

  // Active root data
  let rootData = $state<HierarchyNodeData>(buildSolHierarchyFallback());
  let selectedNodeId = $state<string>('');

  // Tree dimensions and zoom/pan state
  let transform = $state({ x: 60, y: 180, k: 0.95 });
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  interface FlattenedNode {
    data: HierarchyNodeData;
    x: number;
    y: number;
    depth: number;
    parent?: FlattenedNode;
    children?: FlattenedNode[];
    hasChildren: boolean;
    isCollapsed: boolean;
  }

  interface FlattenedLink {
    source: FlattenedNode;
    target: FlattenedNode;
    isBarycentric: boolean;
  }

  let nodes = $state<FlattenedNode[]>([]);
  let links = $state<FlattenedLink[]>([]);

  // Layout calculation using d3.tree()
  function updateLayout() {
    if (!rootData) return;

    const hierarchyRoot = d3.hierarchy<HierarchyNodeData>(rootData, (d) => {
      // If collapsed, hide children from layout
      return d._children ? undefined : d.children;
    });

    // Horizontal tree layout (dx = vertical sibling spacing, dy = horizontal layer depth)
    const treeLayout = d3.tree<HierarchyNodeData>()
      .nodeSize([64, 210]);

    treeLayout(hierarchyRoot);

    const flatNodes: FlattenedNode[] = [];
    const flatLinks: FlattenedLink[] = [];

    hierarchyRoot.each((d) => {
      const nodeItem: FlattenedNode = {
        data: d.data,
        x: d.y, // Swap x & y for left-to-right horizontal layout
        y: d.x,
        depth: d.depth,
        hasChildren: Boolean((d.data.children && d.data.children.length > 0) || d.data._children),
        isCollapsed: Boolean(d.data._children),
      };
      flatNodes.push(nodeItem);
    });

    hierarchyRoot.links().forEach((link) => {
      const source = flatNodes.find((n) => n.data.id === link.source.data.id);
      const target = flatNodes.find((n) => n.data.id === link.target.data.id);

      if (source && target) {
        const isBary = source.data.type === 'barycentre' || target.data.type === 'barycentre';
        flatLinks.push({
          source,
          target,
          isBarycentric: isBary,
        });
      }
    });

    nodes = flatNodes;
    links = flatLinks;
  }

  /**
   * Toggles expand/collapse of branch nodes
   */
  function toggleNode(node: HierarchyNodeData) {
    if (node._children) {
      node.children = node._children;
      node._children = undefined;
    } else if (node.children && node.children.length > 0) {
      node._children = node.children;
      node.children = undefined;
    }
    updateLayout();
  }

  function handleNodeClick(node: HierarchyNodeData) {
    selectedNodeId = node.id;
    if (onSelectNode) {
      onSelectNode(node);
    }
  }

  /**
   * Fetches celestial bodies from Ananke
   */
  async function loadSystem(name: string) {
    isLoading = true;
    errorMsg = null;
    try {
      let bodies: BodyRecord[] = [];
      let stations: StationRecord[] = [];

      try {
        bodies = await ananke.getSystemBodies(name);
      } catch {
        // Offline / fallback mode
      }

      try {
        stations = await ananke.getSystemStations(name);
      } catch {
        // Offline mode
      }

      rootData = parseSystemHierarchy(name, bodies, stations);
      updateLayout();
    } catch (err: any) {
      errorMsg = err.message || 'Failed to load system hierarchy';
      rootData = buildSolHierarchyFallback();
      updateLayout();
    } finally {
      isLoading = false;
    }
  }

  // Pan & Zoom controls
  function onPointerDown(e: PointerEvent) {
    isPanning = true;
    startX = e.clientX - transform.x;
    startY = e.clientY - transform.y;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isPanning) return;
    transform.x = e.clientX - startX;
    transform.y = e.clientY - startY;
  }

  function onPointerUp() {
    isPanning = false;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    transform.k = Math.max(0.2, Math.min(2.5, transform.k * zoomFactor));
  }

  function resetView() {
    transform = { x: 80, y: 220, k: 0.95 };
  }

  $effect(() => {
    if (systemName) {
      loadSystem(systemName);
    }
  });

  onMount(() => {
    updateLayout();
  });
</script>

<div
  bind:this={container}
  class="relative w-full h-full overflow-hidden bg-[#030508] select-none cursor-grab active:cursor-grabbing font-mono text-xs"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onwheel={onWheel}
  role="region"
  aria-label="2D System Hierarchy Tree Layout"
>
  <!-- Tree Navigation Control Overlay -->
  <div class="absolute top-4 left-4 z-30 flex items-center space-x-2 bg-[#0a1018]/90 border border-[var(--hud-orange)]/40 px-3 py-1.5 rounded backdrop-blur-md shadow-hud-glow">
    <span class="text-[var(--hud-orange)] font-bold tracking-wider uppercase">SYSTEM MAP:</span>
    <span class="text-white font-bold">{systemName.toUpperCase()}</span>
    <span class="text-white/30">|</span>
    <span class="text-white/60">{nodes.length} BODIES</span>
    <button
      type="button"
      onclick={resetView}
      class="ml-2 px-2 py-0.5 bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/40 border border-[var(--hud-orange)]/50 text-[var(--hud-orange)] rounded text-[10px] uppercase transition-colors"
      title="Reset viewport center"
    >
      Reset View
    </button>
  </div>

  {#if isLoading}
    <div class="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="flex items-center space-x-3 px-4 py-2 bg-[#0a1018] border border-[var(--hud-orange)] rounded shadow-hud-glow">
        <span class="w-2.5 h-2.5 rounded-full bg-[var(--hud-orange)] animate-ping"></span>
        <span class="text-white tracking-widest uppercase">Resolving Stellar Hierarchy...</span>
      </div>
    </div>
  {/if}

  <!-- SVG Tree Canvas -->
  <svg
    bind:this={svgElement}
    class="w-full h-full block"
  >
    <defs>
      <!-- Gradient for orbital link lines -->
      <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ff7100" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#7cf5ff" stop-opacity="0.6" />
      </linearGradient>
    </defs>

    <g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
      <!-- 1. Connection Lines / Splines -->
      {#each links as link}
        {@const sx = link.source.x}
        {@const sy = link.source.y}
        {@const tx = link.target.x}
        {@const ty = link.target.y}
        {@const midX = (sx + tx) / 2}

        <!-- Smooth cubic bezier horizontal connector -->
        <path
          d="M {sx} {sy} C {midX} {sy}, {midX} {ty}, {tx} {ty}"
          fill="none"
          stroke={link.isBarycentric ? '#7cf5ff' : 'var(--hud-orange)'}
          stroke-width={link.isBarycentric ? '1.5' : '1.2'}
          stroke-dasharray={link.isBarycentric ? '4 3' : 'none'}
          opacity={link.isBarycentric ? '0.75' : '0.45'}
          class="transition-all duration-300"
        />
      {/each}

      <!-- 2. Celestial Nodes -->
      {#each nodes as node}
        <g
          transform="translate({node.x}, {node.y})"
          class="cursor-pointer group"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.stopPropagation();
            handleNodeClick(node.data);
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter') handleNodeClick(node.data);
          }}
        >
          <!-- Selection highlight halo -->
          {#if selectedNodeId === node.data.id}
            <circle
              cx="0"
              cy="0"
              r="22"
              fill="none"
              stroke="var(--hud-amber)"
              stroke-width="2"
              stroke-dasharray="3 2"
              class="animate-spin"
              style="animation-duration: 8s;"
            />
          {/if}

          <!-- Outer border ring -->
          <circle
            cx="0"
            cy="0"
            r="16"
            fill="#0a1018"
            stroke={selectedNodeId === node.data.id ? 'var(--hud-amber)' : 'rgba(255, 113, 0, 0.4)'}
            stroke-width="1.5"
            class="transition-colors group-hover:stroke-[var(--hud-orange)]"
          />

          <!-- Celestial Icon (Stars, Planets, Barycenters, Stations) -->
          <foreignObject x="-14" y="-14" width="28" height="28" class="pointer-events-none">
            <CelestialIcon
              type={node.data.type}
              subType={node.data.subType}
              spectralClass={node.data.spectralClass}
              landable={node.data.landable}
              size={28}
            />
          </foreignObject>

          <!-- Expand / Collapse Branch Badge (+ / -) -->
          {#if node.hasChildren}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <g
              transform="translate(18, 0)"
              role="button"
              onclick={(e) => {
                e.stopPropagation();
                toggleNode(node.data);
              }}
              class="cursor-pointer"
            >
              <circle
                cx="0"
                cy="0"
                r="7"
                fill="#0a1018"
                stroke="var(--hud-orange)"
                stroke-width="1.2"
                class="hover:fill-[var(--hud-orange)] hover:stroke-white transition-colors"
              />
              <text
                x="0"
                y="3"
                text-anchor="middle"
                fill="white"
                font-size="9"
                font-weight="bold"
              >
                {node.isCollapsed ? '+' : '−'}
              </text>
            </g>
          {/if}

          <!-- Body Title & Details Label -->
          <g transform="translate(0, 24)" class="pointer-events-none">
            <text
              x="0"
              y="0"
              text-anchor="middle"
              fill={selectedNodeId === node.data.id ? 'var(--hud-amber)' : 'white'}
              font-weight="bold"
              font-size="11"
              class="tracking-wider drop-shadow-md"
            >
              {node.data.name}
            </text>

            <text
              x="0"
              y="11"
              text-anchor="middle"
              fill="rgba(255, 255, 255, 0.5)"
              font-size="9"
            >
              {#if node.data.distanceLs !== undefined && node.data.distanceLs > 0}
                {node.data.distanceLs < 1000
                  ? `${node.data.distanceLs.toFixed(1)} Ls`
                  : `${(node.data.distanceLs / 499.0).toFixed(2)} AU`}
              {:else}
                PRIMARY
              {/if}
            </text>
          </g>

          <!-- Badges for Sub-Moons & Orbital Stations -->
          {#if (node.data.subMoonCount && node.data.subMoonCount > 0) || (node.data.orbitalStationCount && node.data.orbitalStationCount > 0)}
            <g transform="translate(0, -20)" class="pointer-events-none flex items-center justify-center">
              {#if node.data.subMoonCount && node.data.subMoonCount > 0}
                <rect
                  x="-16"
                  y="-8"
                  width="14"
                  height="12"
                  rx="3"
                  fill="#0c1724"
                  stroke="#7cf5ff"
                  stroke-width="1"
                />
                <text
                  x="-9"
                  y="1"
                  text-anchor="middle"
                  fill="#7cf5ff"
                  font-size="8"
                  font-weight="bold"
                >
                  {node.data.subMoonCount}M
                </text>
              {/if}

              {#if node.data.orbitalStationCount && node.data.orbitalStationCount > 0}
                <rect
                  x="2"
                  y="-8"
                  width="14"
                  height="12"
                  rx="3"
                  fill="#1f1406"
                  stroke="#ff9800"
                  stroke-width="1"
                />
                <text
                  x="9"
                  y="1"
                  text-anchor="middle"
                  fill="#ff9800"
                  font-size="8"
                  font-weight="bold"
                >
                  {node.data.orbitalStationCount}S
                </text>
              {/if}
            </g>
          {/if}
        </g>
      {/each}
    </g>
  </svg>
</div>
