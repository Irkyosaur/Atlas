<script lang="ts">
  import { onMount } from 'svelte';
  import {
    type CelestialBodyInfo,
    type PlacedAsset,
    type InfrastructureAssetType,
    type ColonisationBlueprint,
    INFRASTRUCTURE_CATALOG,
    validateAssetPlacement,
  } from '$engine/colonisation_engine';

  interface Props {
    bodies: CelestialBodyInfo[];
    blueprint: ColonisationBlueprint;
    selectedAssetId: string | null;
    selectedBodyId: string | null;
    onSelectAsset: (asset: PlacedAsset | null) => void;
    onSelectBody: (body: CelestialBodyInfo | null) => void;
    onAddAssetToBody: (body: CelestialBodyInfo, assetType: InfrastructureAssetType) => void;
    onUpdateAssetPlacement: (assetId: string, updates: Partial<PlacedAsset>) => void;
    viewMode?: 'system' | 'body_detail';
  }

  let {
    bodies = [],
    blueprint,
    selectedAssetId = null,
    selectedBodyId = null,
    onSelectAsset,
    onSelectBody,
    onAddAssetToBody,
    onUpdateAssetPlacement,
    viewMode = 'system',
  }: Props = $props();

  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = $state(900);
  let height = $state(600);

  // Pan & Zoom
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1.0);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;

  // Asset dragging state
  let draggingAssetId = $state<string | null>(null);
  let dragMode = $state<'pan' | 'asset'>('pan');

  // Animation frame
  let animationId: number;

  const selectedBody = $derived.by(() => {
    return bodies.find((b) => b.id === selectedBodyId) || bodies[0] || null;
  });

  const selectedAsset = $derived.by(() => {
    return blueprint.assets.find((a) => a.id === selectedAssetId) || null;
  });

  onMount(() => {
    const handleResize = () => {
      if (canvasEl) {
        width = canvasEl.parentElement?.clientWidth || 900;
        height = canvasEl.parentElement?.clientHeight || 600;
        canvasEl.width = width * window.devicePixelRatio;
        canvasEl.height = height * window.devicePixelRatio;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    ctx = canvasEl.getContext('2d');
    startRenderLoop();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  });

  function startRenderLoop() {
    function loop() {
      render();
      animationId = requestAnimationFrame(loop);
    }
    animationId = requestAnimationFrame(loop);
  }

  function render() {
    if (!ctx || !canvasEl) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark backdrop with blueprint grid lines
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Draw blueprint tactical grid
    drawGrid(ctx);

    // Transform coordinate system for pan & zoom
    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(zoom, zoom);

    if (viewMode === 'system') {
      renderSystemView(ctx);
    } else {
      renderBodyDetailView(ctx);
    }

    ctx.restore();
    ctx.restore();
  }

  function drawGrid(c: CanvasRenderingContext2D) {
    const gridSize = 40 * zoom;
    const offsetX = (width / 2 + panX) % gridSize;
    const offsetY = (height / 2 + panY) % gridSize;

    c.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    c.lineWidth = 1;

    c.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      c.moveTo(x, 0);
      c.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      c.moveTo(0, y);
      c.lineTo(width, y);
    }
    c.stroke();
  }

  function renderSystemView(c: CanvasRenderingContext2D) {
    // Render stars and planets along an orbital hierarchy line
    const star = bodies.find((b) => b.type === 'star') || bodies[0];
    const planets = bodies.filter((b) => b.type === 'planet');

    // Central primary star
    if (star) {
      c.fillStyle = '#ffcc00';
      c.shadowColor = '#ff9900';
      c.shadowBlur = 24;
      c.beginPath();
      c.arc(-width * 0.4, 0, 32, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;

      c.fillStyle = '#fff';
      c.font = '10px monospace';
      c.textAlign = 'center';
      c.fillText(star.name, -width * 0.4, 48);
    }

    // Planetary tracks
    const startX = -width * 0.28;
    const stepX = (width * 0.65) / Math.max(planets.length, 1);

    planets.forEach((planet, idx) => {
      const px = startX + idx * stepX;
      const py = 0;

      const isSelected = planet.id === selectedBodyId;

      // Orbit stem line
      c.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      c.lineWidth = 1;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(px, -120);
      c.lineTo(px, 120);
      c.stroke();
      c.setLineDash([]);

      // Planet sphere
      c.fillStyle = planet.landable ? '#4caf50' : '#29b6f6';
      if (isSelected) {
        c.strokeStyle = '#ff9100';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(px, py, 20, 0, Math.PI * 2);
        c.stroke();
      }

      c.beginPath();
      c.arc(px, py, 14, 0, Math.PI * 2);
      c.fill();

      // Label
      c.fillStyle = isSelected ? '#ffb300' : '#e0e0e0';
      c.font = '11px monospace';
      c.textAlign = 'center';
      c.fillText(planet.name, px, py + 34);

      c.fillStyle = '#78909c';
      c.font = '9px monospace';
      c.fillText(`${planet.distanceLs.toFixed(1)} Ls • ${planet.gravityG?.toFixed(2) ?? '1.0'}G`, px, py + 48);

      // Render moons of this planet
      const moons = bodies.filter((b) => b.parentId === planet.id && b.type === 'moon');
      moons.forEach((moon, mIdx) => {
        const my = py + 75 + mIdx * 30;
        c.strokeStyle = 'rgba(255,255,255,0.1)';
        c.beginPath();
        c.moveTo(px, py + 14);
        c.lineTo(px, my);
        c.stroke();

        const isMoonSelected = moon.id === selectedBodyId;
        c.fillStyle = '#9e9e9e';
        c.beginPath();
        c.arc(px, my, 7, 0, Math.PI * 2);
        c.fill();

        if (isMoonSelected) {
          c.strokeStyle = '#ff9100';
          c.lineWidth = 1.5;
          c.stroke();
        }

        c.fillStyle = isMoonSelected ? '#ffb300' : '#b0bec5';
        c.font = '9px monospace';
        c.fillText(moon.name, px + 12, my + 3);
      });

      // Render assets attached to this planet
      const planetAssets = blueprint.assets.filter((a) => a.parentBodyId === planet.id);
      planetAssets.forEach((asset, aIdx) => {
        const meta = INFRASTRUCTURE_CATALOG[asset.assetType];
        const isAssetSelected = asset.id === selectedAssetId;

        if (asset.domain === 'orbital') {
          // Render orbital asset above
          const ay = py - 45 - aIdx * 28;
          c.strokeStyle = meta.color;
          c.lineWidth = 1;
          c.setLineDash([2, 2]);
          c.beginPath();
          c.moveTo(px, py - 14);
          c.lineTo(px, ay);
          c.stroke();
          c.setLineDash([]);

          // Asset node
          c.fillStyle = meta.color;
          c.beginPath();
          c.arc(px, ay, 6, 0, Math.PI * 2);
          c.fill();

          if (isAssetSelected) {
            c.strokeStyle = '#ffffff';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(px, ay, 9, 0, Math.PI * 2);
            c.stroke();
          }

          c.fillStyle = isAssetSelected ? '#ffffff' : meta.color;
          c.font = '10px monospace';
          c.textAlign = 'left';
          c.fillText(`${meta.icon} ${asset.customName}`, px + 10, ay + 3);
        } else {
          // Surface asset badge
          const sy = py - 12 + aIdx * 10;
          c.fillStyle = meta.color;
          c.fillRect(px - 14, sy, 4, 4);
        }
      });
    });
  }

  function renderBodyDetailView(c: CanvasRenderingContext2D) {
    if (!selectedBody) return;

    // Body Detail: Large planetary disc with orbital lanes and rings
    const bodyRadius = 90;

    // Rings if any
    if (selectedBody.rings && selectedBody.rings.length > 0) {
      selectedBody.rings.forEach((ring) => {
        c.strokeStyle = 'rgba(200, 220, 255, 0.25)';
        c.lineWidth = 14;
        c.beginPath();
        c.ellipse(0, 0, bodyRadius * 2.5, bodyRadius * 1.2, 0, 0, Math.PI * 2);
        c.stroke();

        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font = '9px monospace';
        c.fillText(ring.name, bodyRadius * 1.8, -bodyRadius * 0.7);
      });
    }

    // Planetary body disc
    const grad = c.createRadialGradient(-30, -30, 10, 0, 0, bodyRadius);
    if (selectedBody.landable) {
      grad.addColorStop(0, '#81c784');
      grad.addColorStop(0.7, '#388e3c');
      grad.addColorStop(1, '#1b5e20');
    } else {
      grad.addColorStop(0, '#64b5f6');
      grad.addColorStop(0.7, '#1976d2');
      grad.addColorStop(1, '#0d47a1');
    }
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, bodyRadius, 0, Math.PI * 2);
    c.fill();

    // Body atmosphere rim glow
    if (selectedBody.atmosphere && selectedBody.atmosphere !== 'No atmosphere') {
      c.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      c.lineWidth = 3;
      c.stroke();
    }

    // Body Title
    c.fillStyle = '#ffffff';
    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillText(selectedBody.name, 0, bodyRadius + 30);
    c.font = '11px monospace';
    c.fillStyle = '#90a4ae';
    c.fillText(
      `${selectedBody.subType} • Radius: ${selectedBody.radiusKm.toLocaleString()} km • Gravity: ${selectedBody.gravityG?.toFixed(2) ?? '1.0'}G`,
      0,
      bodyRadius + 48
    );

    // Orbital shells
    const orbitalRadii = [150, 220, 290, 360];
    orbitalRadii.forEach((r, idx) => {
      c.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      c.lineWidth = 1;
      c.setLineDash([6, 6]);
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = 'rgba(0, 229, 255, 0.35)';
      c.font = '9px monospace';
      c.textAlign = 'left';
      c.fillText(`Orbital Lane ${idx + 1} (${(idx + 1) * 2500} km)`, r + 4, 4);
    });

    // Render Placed Assets for this body
    const assets = blueprint.assets.filter((a) => a.parentBodyId === selectedBody.id);

    assets.forEach((asset) => {
      const meta = INFRASTRUCTURE_CATALOG[asset.assetType];
      const isSelected = asset.id === selectedAssetId;

      if (asset.domain === 'orbital') {
        const alt = asset.orbitalAltitudeKm ?? 2000;
        // Scale altitude to visual pixel radius
        const visualRadius = bodyRadius + Math.min(Math.max((alt / 10000) * 120 + 30, 40), 280);
        const rad = ((asset.orbitalPhaseDeg ?? 0) * Math.PI) / 180;
        const ax = Math.cos(rad) * visualRadius;
        const ay = Math.sin(rad) * visualRadius;

        // Radial mooring line
        c.strokeStyle = meta.color;
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        c.beginPath();
        c.moveTo(Math.cos(rad) * bodyRadius, Math.sin(rad) * bodyRadius);
        c.lineTo(ax, ay);
        c.stroke();
        c.setLineDash([]);

        // Asset icon node
        c.fillStyle = meta.color;
        c.beginPath();
        c.arc(ax, ay, 8, 0, Math.PI * 2);
        c.fill();

        if (isSelected) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2.5;
          c.beginPath();
          c.arc(ax, ay, 13, 0, Math.PI * 2);
          c.stroke();
        }

        // Label
        c.fillStyle = isSelected ? '#ffffff' : meta.color;
        c.font = '10px monospace';
        c.textAlign = 'center';
        c.fillText(`${meta.icon} ${asset.customName}`, ax, ay - 14);
        c.fillStyle = '#b0bec5';
        c.font = '8px monospace';
        c.fillText(`Alt: ${alt.toLocaleString()}km`, ax, ay + 18);
      } else {
        // Surface installation
        const lat = asset.surfaceLatitude ?? 0;
        const lon = asset.surfaceLongitude ?? 0;
        // Map lat/lon to sphere projection
        const rLat = (lat * Math.PI) / 180;
        const rLon = (lon * Math.PI) / 180;
        // Orthographic disk projection
        const sx = Math.cos(rLat) * Math.sin(rLon) * (bodyRadius - 4);
        const sy = -Math.sin(rLat) * (bodyRadius - 4);

        c.fillStyle = meta.color;
        c.beginPath();
        c.arc(sx, sy, 5, 0, Math.PI * 2);
        c.fill();

        if (isSelected) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(sx, sy, 8, 0, Math.PI * 2);
          c.stroke();
        }

        c.fillStyle = isSelected ? '#ffffff' : meta.color;
        c.font = '9px monospace';
        c.textAlign = 'center';
        c.fillText(`${meta.icon} ${asset.customName}`, sx, sy - 8);
      }
    });
  }

  // Pointer event handlers
  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const hit = findHitItem(e.clientX, e.clientY);
    if (hit?.type === 'asset') {
      draggingAssetId = hit.asset.id;
      dragMode = 'asset';
      onSelectAsset(hit.asset);
    } else if (hit?.type === 'body') {
      onSelectBody(hit.body);
      dragMode = 'pan';
      isDragging = true;
    } else {
      dragMode = 'pan';
      isDragging = true;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (dragMode === 'pan' && isDragging) {
      panX += dx;
      panY += dy;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    } else if (dragMode === 'asset' && draggingAssetId && selectedBody) {
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - width / 2 - panX) / zoom;
      const mouseY = (e.clientY - rect.top - height / 2 - panY) / zoom;

      const asset = blueprint.assets.find((a) => a.id === draggingAssetId);
      if (asset) {
        if (asset.domain === 'orbital') {
          // Dragging changes phase angle & altitude
          const angle = (Math.atan2(mouseY, mouseX) * 180) / Math.PI;
          const phaseDeg = (angle + 360) % 360;
          const dist = Math.hypot(mouseX, mouseY);
          const bodyRadius = 90;
          const altKm = Math.max(350, Math.round(((dist - bodyRadius) / 120) * 10000));

          onUpdateAssetPlacement(draggingAssetId, {
            orbitalPhaseDeg: Math.round(phaseDeg),
            orbitalAltitudeKm: altKm,
          });
        } else {
          // Surface asset dragging
          const bodyRadius = 90;
          const clampedX = Math.max(-bodyRadius + 5, Math.min(bodyRadius - 5, mouseX));
          const clampedY = Math.max(-bodyRadius + 5, Math.min(bodyRadius - 5, mouseY));
          const lat = -Math.asin(clampedY / bodyRadius) * (180 / Math.PI);
          const lon = Math.asin(clampedX / (bodyRadius * Math.cos((lat * Math.PI) / 180) || 1)) * (180 / Math.PI);

          onUpdateAssetPlacement(draggingAssetId, {
            surfaceLatitude: Math.round(lat * 10) / 10,
            surfaceLongitude: Math.round(lon * 10) / 10,
          });
        }
      }
    }
  }

  function handleMouseUp() {
    isDragging = false;
    draggingAssetId = null;
    dragMode = 'pan';
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * factor, 0.3), 4.0);
    zoom = newZoom;
  }

  function findHitItem(
    clientX: number,
    clientY: number
  ): { type: 'asset'; asset: PlacedAsset } | { type: 'body'; body: CelestialBodyInfo } | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const cx = (clientX - rect.left - width / 2 - panX) / zoom;
    const cy = (clientY - rect.top - height / 2 - panY) / zoom;

    if (viewMode === 'body_detail' && selectedBody) {
      // Check assets on this body
      const assets = blueprint.assets.filter((a) => a.parentBodyId === selectedBody.id);
      for (const asset of assets) {
        if (asset.domain === 'orbital') {
          const bodyRadius = 90;
          const alt = asset.orbitalAltitudeKm ?? 2000;
          const visualRadius = bodyRadius + Math.min(Math.max((alt / 10000) * 120 + 30, 40), 280);
          const rad = ((asset.orbitalPhaseDeg ?? 0) * Math.PI) / 180;
          const ax = Math.cos(rad) * visualRadius;
          const ay = Math.sin(rad) * visualRadius;
          if (Math.hypot(cx - ax, cy - ay) <= 15) {
            return { type: 'asset', asset };
          }
        } else {
          const bodyRadius = 90;
          const lat = asset.surfaceLatitude ?? 0;
          const lon = asset.surfaceLongitude ?? 0;
          const rLat = (lat * Math.PI) / 180;
          const rLon = (lon * Math.PI) / 180;
          const sx = Math.cos(rLat) * Math.sin(rLon) * (bodyRadius - 4);
          const sy = -Math.sin(rLat) * (bodyRadius - 4);
          if (Math.hypot(cx - sx, cy - sy) <= 12) {
            return { type: 'asset', asset };
          }
        }
      }
    } else {
      // Check planets in system view
      const planets = bodies.filter((b) => b.type === 'planet');
      const startX = -width * 0.28;
      const stepX = (width * 0.65) / Math.max(planets.length, 1);
      for (let idx = 0; idx < planets.length; idx++) {
        const p = planets[idx];
        const px = startX + idx * stepX;
        if (Math.hypot(cx - px, cy) <= 24) {
          return { type: 'body', body: p };
        }
      }
    }

    return null;
  }

  function handleResetView() {
    panX = 0;
    panY = 0;
    zoom = 1.0;
  }
</script>

<div class="relative w-full h-full flex flex-col bg-[#05080f] overflow-hidden select-none">
  <!-- Top View Controls Bar -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--hud-orange)]/25 bg-black/60 backdrop-blur z-10">
    <div class="flex items-center space-x-3">
      <span class="text-xs font-mono text-[var(--hud-amber)] font-bold tracking-wider">
        VIEW: {viewMode === 'system' ? 'SYSTEM ORBITAL SCHEMATIC' : `BODY DETAIL [${selectedBody?.name || 'NONE'}]`}
      </span>
      <span class="text-[10px] font-mono text-[var(--hud-orange)]/60">
        Bodies: {bodies.length} | Planned Assets: {blueprint.assets.length}
      </span>
    </div>

    <div class="flex items-center space-x-2">
      <button
        type="button"
        class="px-2 py-0.5 text-[11px] font-mono rounded border border-[var(--hud-orange)]/40 hover:bg-[var(--hud-orange)]/15 text-[var(--hud-orange)] transition-colors"
        onclick={handleResetView}
        title="Reset Pan & Zoom"
      >
        RESET CAM
      </button>

      <div class="flex items-center space-x-1 text-xs text-[var(--hud-orange)]/70 font-mono">
        <span>Zoom:</span>
        <span class="text-[var(--hud-amber)]">{(zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  </div>

  <!-- Interactive Canvas -->
  <div class="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
    <canvas
      bind:this={canvasEl}
      class="w-full h-full block"
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      onwheel={handleWheel}
    ></canvas>

    <!-- Canvas HUD Overlay Hints -->
    <div class="absolute bottom-3 left-4 pointer-events-none text-[10px] font-mono text-[var(--hud-orange)]/60 bg-black/60 px-2.5 py-1.5 rounded border border-[var(--hud-orange)]/20">
      <p>Left Click + Drag: Pan viewport / Reposition asset</p>
      <p>Scroll: Zoom in/out | Click body to inspect</p>
    </div>
  </div>
</div>
