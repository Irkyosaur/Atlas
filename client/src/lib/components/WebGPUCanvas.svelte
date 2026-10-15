<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Vector3 } from 'three';
  import { WebGPUStarPipeline } from '$engine/star_pipeline';
  import { FrustumStreamer } from '$engine/frustum_streamer';
  import { LogarithmicCameraController } from '$engine/camera_controller';
  import { WebGPUGridPipeline, type StalkTarget } from '$engine/grid_pipeline';
  import { WebGPUVolumetricPipeline } from '$engine/volumetric_pipeline';
  import { WebGPUOrreryPipeline } from '$engine/orrery_pipeline';
  import { WebGPUDssSurfacePipeline, type PlanetarySurfaceParams, CANONICAL_LANDABLE_BIO_BODY } from '$engine/dss_surface_pipeline';
  import { WebGPURoutePipeline, type RouteWaypoint } from '$engine/route_pipeline';
  import { WebGPUHeatmapPipeline, type HeatmapColorRamp } from '$engine/heatmap_pipeline';
  import { estimateStarsPerCubicKiloparsec } from '$engine/heatmap_raster';
  import { WebGPUDssaPipeline } from '$engine/dssa_pipeline';
  import { type DssaCarrier, EMBEDDED_DSSA_REGISTRY } from '$engine/dssa_registry';
  import { detectAlignments } from '$engine/ephemeris';

  interface Props {
    showDiagnostics?: boolean;
    selectedStar?: StalkTarget | null;
    showGrid?: boolean;
    powerplayEnabled?: boolean;
    thargoidWarEnabled?: boolean;
    dssaEnabled?: boolean;
    dssaCarriers?: DssaCarrier[];
    selectedDssaCarrier?: DssaCarrier | null;
    heatmapDensity?: 'off' | 'low' | 'medium' | 'high';
    heatmapColorRamp?: HeatmapColorRamp;
    heatmapBlending?: 'additive' | 'standard';
    activeMode?: 'galaxy' | 'system' | 'orrery' | 'surface';
    orrerySimTimeSec?: number;
    lockedBodyName?: string | null;
    surfaceParams?: PlanetarySurfaceParams;
    routeWaypoints?: RouteWaypoint[];
    onAlignmentsDetected?: (alignments: import('$engine/ephemeris').CelestialAlignment[]) => void;
    onReady?: (backend: 'webgpu' | 'webgl2', ctx: GPUCanvasContext | WebGL2RenderingContext) => void;
    onHoverCoordsChange?: (info: { x: number; y: number; z: number; densityStarsKpc3: number } | null) => void;
    onSelectDssaCarrier?: (carrier: DssaCarrier) => void;
  }

  let {
    showDiagnostics = true,
    selectedStar = null,
    showGrid = true,
    powerplayEnabled = true,
    thargoidWarEnabled = true,
    dssaEnabled = true,
    dssaCarriers = EMBEDDED_DSSA_REGISTRY,
    selectedDssaCarrier = null,
    heatmapDensity = 'medium',
    heatmapColorRamp = 'inferno',
    heatmapBlending = 'additive',
    activeMode = 'galaxy',
    orrerySimTimeSec = 0,
    lockedBodyName = null,
    surfaceParams = CANONICAL_LANDABLE_BIO_BODY,
    routeWaypoints = [],
    onAlignmentsDetected,
    onReady,
    onHoverCoordsChange,
    onSelectDssaCarrier,
  }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let container = $state<HTMLDivElement | null>(null);

  type BackendState = 'initializing' | 'webgpu' | 'webgl2' | 'unsupported';
  let backend = $state<BackendState>('initializing');
  let rendererName = $state<string>('Detecting GPU...');
  let resolution = $state({ width: 0, height: 0, dpr: 1 });
  let fps = $state<number>(0);

  let animationFrameId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let pointerMoveHandler: ((e: PointerEvent) => void) | null = null;

  // WebGPU Handles
  let gpuDevice: GPUDevice | null = null;
  let gpuContext: GPUCanvasContext | null = null;
  let gpuFormat: GPUTextureFormat = 'bgra8unorm';

  // WebGL2 Handles
  let glContext: WebGL2RenderingContext | null = null;

  // Frame timing
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  function updateResolution(width: number, height: number) {
    if (!canvas) return;

    // Clamp DPR between 1.0 and 2.0 as required by Cobra high-DPI spec
    const dpr = Math.max(1.0, Math.min(window.devicePixelRatio || 1.0, 2.0));
    const physicalWidth = Math.max(1, Math.floor(width * dpr));
    const physicalHeight = Math.max(1, Math.floor(height * dpr));

    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;

      resolution = {
        width: physicalWidth,
        height: physicalHeight,
        dpr,
      };

      if (backend === 'webgl2' && glContext) {
        glContext.viewport(0, 0, physicalWidth, physicalHeight);
      }
    }
  }

  // Engine Pipelines & Controllers
  let starPipeline: WebGPUStarPipeline | null = null;
  let gridPipeline: WebGPUGridPipeline | null = null;
  let volumetricPipeline: WebGPUVolumetricPipeline | null = null;
  let heatmapPipeline: WebGPUHeatmapPipeline | null = null;
  let orreryPipeline: WebGPUOrreryPipeline | null = null;
  let dssSurfacePipeline: WebGPUDssSurfacePipeline | null = null;
  let routePipeline: WebGPURoutePipeline | null = null;
  let dssaPipeline: WebGPUDssaPipeline | null = null;
  let frustumStreamer: FrustumStreamer | null = null;
  let cameraController: LogarithmicCameraController | null = null;

  let starCount = $state<number>(0);
  let cachedBoxelsCount = $state<number>(0);
  let cameraDistanceLy = $state<number>(26000);
  let hoverCoords = $state<{ x: number; y: number; z: number; densityStarsKpc3: number } | null>(null);
  let hoveredDssaCarrier = $state<DssaCarrier | null>(null);
  let hoveredDssaScreenPos = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    if (gridPipeline) {
      gridPipeline.setSelectedStar(selectedStar ?? null);
    }
    if (cameraController && selectedStar) {
      // Smoothly look at the selected star
      cameraController.focusOn(selectedStar.x, selectedStar.y, selectedStar.z);
    }
  });

  $effect(() => {
    if (dssaPipeline) {
      dssaPipeline.setVisible(dssaEnabled);
      dssaPipeline.loadCarriers(dssaCarriers);
      dssaPipeline.setSelectedCarrier(selectedDssaCarrier ?? null);
    }
    if (cameraController && selectedDssaCarrier) {
      cameraController.focusOn(
        selectedDssaCarrier.coords.x,
        selectedDssaCarrier.coords.y,
        selectedDssaCarrier.coords.z
      );
    }
  });

  $effect(() => {
    if (volumetricPipeline) {
      volumetricPipeline.setLayerOpacity(powerplayEnabled, thargoidWarEnabled);
    }
  });

  $effect(() => {
    if (heatmapPipeline) {
      const opacityMap = {
        off: 0.0,
        low: 0.45,
        medium: 0.85,
        high: 1.0,
      };
      heatmapPipeline.setOptions({
        opacity: opacityMap[heatmapDensity] ?? 0.85,
        colorRamp: heatmapColorRamp,
        additiveBlend: heatmapBlending === 'additive',
      });
    }
  });

  $effect(() => {
    if (cameraController && orreryPipeline) {
      if (lockedBodyName) {
        cameraController.lockToBody(
          lockedBodyName,
          () => (orreryPipeline ? orreryPipeline.getBodyPosition(lockedBodyName) : null),
          25.0
        );
      } else if (activeMode === 'orrery') {
        cameraController.unlockBody();
      }
    }
  });

  $effect(() => {
    if (dssSurfacePipeline && surfaceParams) {
      dssSurfacePipeline.loadSurfaceParams(surfaceParams);
    }
  });

  $effect(() => {
    if (routePipeline) {
      if (routeWaypoints && routeWaypoints.length > 0) {
        routePipeline.loadRoute(routeWaypoints);
      } else {
        routePipeline.clearRoute();
      }
    }
  });

  function renderLoop() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 500) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      if (starPipeline) {
        starCount = starPipeline.getInstanceCount();
      }
      if (frustumStreamer) {
        cachedBoxelsCount = frustumStreamer.getCachedBoxelsCount();
      }
      if (cameraController) {
        cameraDistanceLy = Math.round(cameraController.getDistance());
      }
      frameCount = 0;
      lastFpsUpdate = now;
    }

    if (backend === 'webgpu' && gpuDevice && gpuContext) {
      try {
        const aspect = Math.max(0.1, resolution.width / (resolution.height || 1));

        // Origin-shift coordinate translation
        const starOrigin = starPipeline ? starPipeline.getCameraOrigin() : [0, 0, 0];
        const origin: [number, number, number] = [starOrigin[0] ?? 0, starOrigin[1] ?? 0, starOrigin[2] ?? 0];

        // Update Logarithmic Camera Controller
        if (cameraController) {
          cameraController.update(aspect, origin);
        }

        const camPos = cameraController ? cameraController.getCameraPosition() : [0, 8000, 24000];
        const relCamPos: [number, number, number] = [
          camPos[0] - origin[0],
          camPos[1] - origin[1],
          camPos[2] - origin[2],
        ];

        // Update spatial camera focus listener for frustum streaming & origin shifting
        if (frustumStreamer) {
          frustumStreamer.updateCameraFocus(camPos[0], camPos[1], camPos[2]);
        }

        const viewProjElements = cameraController
          ? new Float32Array(cameraController.viewProjMatrix.elements)
          : new Float32Array(16);

        // Update star pipeline uniforms
        if (starPipeline) {
          starPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            resolution.dpr,
            now * 0.001,
            true,
            origin,
            true
          );
        }

        // Update grid & stalk uniforms
        if (gridPipeline) {
          gridPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            now * 0.001,
            origin,
            true
          );
        }

        // Update Dynamic Heatmap Overlay uniforms (Stage 5.1)
        if (heatmapPipeline) {
          heatmapPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            now * 0.001,
            origin,
            true
          );
        }

        // Update volumetric pipeline uniforms (Powerplay 2.0 & Titan caustic zones)
        if (volumetricPipeline) {
          volumetricPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            now * 0.001,
            origin,
            true
          );
        }

        // Update Orrery Pipeline (3D Keplerian orbits & bodies)
        if (orreryPipeline) {
          // Advance bodies to exact simulation time
          orreryPipeline.updateBodyPositions(orrerySimTimeSec);
          orreryPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            now * 0.001
          );

          // Periodically detect alignments (every 30 frames) when callback registered
          if (frameCount % 30 === 0 && onAlignmentsDetected) {
            const alignments = detectAlignments(orreryPipeline.getBodies(), orrerySimTimeSec);
            onAlignmentsDetected(alignments);
          }
        }

        // Update DSS Surface Cartography & Exobiology Pipeline (Task 3.4.1, 3.4.2, 3.4.3)
        if (dssSurfacePipeline) {
          dssSurfacePipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            now * 0.001
          );
        }

        // Update 3D Glowing Route Ribbon Pipeline (Task 4.1.3)
        if (routePipeline) {
          routePipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            origin,
            now * 0.001
          );
        }

        // Update DSSA Permanent Carrier Amber Beacon Pipeline (Stage 5.2)
        if (dssaPipeline) {
          dssaPipeline.updateUniforms(
            viewProjElements,
            relCamPos,
            origin,
            now * 0.001
          );
        }

        const currentTexture = gpuContext.getCurrentTexture();
        const commandEncoder = gpuDevice.createCommandEncoder({
          label: 'Atlas-Frame-Encoder',
        });

        // Deep Space Black clear color (#030508 -> r:0.012, g:0.020, b:0.031)
        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: currentTexture.createView(),
              clearValue: { r: 0.012, g: 0.02, b: 0.031, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });

        if (activeMode === 'surface') {
          // Surface Inspection Mode: Render detailed 3D sphere, procedural terrain, DSS heatmap & exobio rings
          if (dssSurfacePipeline) {
            dssSurfacePipeline.render(renderPass);
          }
        } else if (activeMode === 'orrery') {
          // Orrery 3D View: render Keplerian orbit splines and celestial bodies
          if (orreryPipeline) {
            orreryPipeline.render(renderPass);
          }
        } else {
          // Render Y=0 Galactic Reference Plane Grid & StalkBase Lines
          if (gridPipeline) {
            gridPipeline.render(renderPass, showGrid, true);
          }

          // Render Dynamic Galactic Density Heatmap Overlay (Stage 5.1)
          if (heatmapPipeline && heatmapDensity !== 'off') {
            heatmapPipeline.render(renderPass);
          }

          // Render Volumetric Powerplay 2.0 Bubbles & Titan Caustic Zones
          if (volumetricPipeline) {
            volumetricPipeline.render(renderPass);
          }

          // Render Stars
          if (starPipeline) {
            starPipeline.render(renderPass);
          }

          // Render DSSA Permanent Carrier Amber Beacons & Stalks (Stage 5.2)
          if (dssaPipeline && dssaEnabled) {
            dssaPipeline.render(renderPass);
          }

          // Render 3D Glowing Route Waypoint Ribbons & Jump Nodes (Task 4.1.3)
          if (routePipeline) {
            routePipeline.render(renderPass);
          }
        }

        renderPass.end();
        gpuDevice.queue.submit([commandEncoder.finish()]);
      } catch {
        // Recover from context loss or transient resize frame drops
      }
    } else if (backend === 'webgl2' && glContext) {
      glContext.clearColor(0.012, 0.02, 0.031, 1.0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  async function initWebGPU(): Promise<boolean> {
    if (!('gpu' in navigator) || !navigator.gpu) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        return false;
      }

      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {},
      });

      if (!canvas) return false;

      const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!context) return false;

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
      });

      gpuDevice = device;
      gpuContext = context;
      gpuFormat = format;

      // Initialize WGSL Star Shader & Instanced Point Cloud Pipeline
      try {
        starPipeline = new WebGPUStarPipeline(device, format, 1_000_000);
        // Seed 500,000 instanced stars across the galactic disc and core
        starPipeline.generateProceduralMilkyWay(500_000);
        starCount = starPipeline.getInstanceCount();

        // Initialize 3D Bounding-Box Frustum Streamer with Ananke Octree Caching (50 LY boxels)
        frustumStreamer = new FrustumStreamer({
          boxelSize: 50.0,
          frustumRadius: 1,
          maxCachedChunks: 256,
          queryIntervalMs: 150,
        });
        frustumStreamer.setPipeline(starPipeline);

        // Initialize WebGPU Galactic Reference Plane Grid (Y=0, 1000 LY square divisions) & StalkBase
        gridPipeline = new WebGPUGridPipeline(device, format);
        if (selectedStar) {
          gridPipeline.setSelectedStar(selectedStar);
        }

        // Initialize Dynamic 1024x1024 Density Heatmap Overlay (Stage 5.1)
        heatmapPipeline = new WebGPUHeatmapPipeline(device, format, {
          colorRamp: heatmapColorRamp,
          opacity: heatmapDensity === 'off' ? 0.0 : heatmapDensity === 'low' ? 0.45 : heatmapDensity === 'medium' ? 0.85 : 1.0,
          additiveBlend: heatmapBlending === 'additive',
        });

        // Initialize Volumetric Powerplay 2.0 Bubbles & Titan Caustic Zones
        volumetricPipeline = new WebGPUVolumetricPipeline(device, format);
        volumetricPipeline.setLayerOpacity(powerplayEnabled, thargoidWarEnabled);

        // Initialize 3D Keplerian Orrery Pipeline
        orreryPipeline = new WebGPUOrreryPipeline(device, format);

        // Initialize Planetary Surface Cartography & Exobiology Pipeline (Task 3.4.1, 3.4.2, 3.4.3)
        dssSurfacePipeline = new WebGPUDssSurfacePipeline(device, format);
        if (surfaceParams) {
          dssSurfacePipeline.loadSurfaceParams(surfaceParams);
        }

        // Initialize 3D Glowing Route Ribbon Pipeline (Task 4.1.3)
        routePipeline = new WebGPURoutePipeline(device, format);
        if (routeWaypoints && routeWaypoints.length > 0) {
          routePipeline.loadRoute(routeWaypoints);
        }

        // Initialize DSSA Permanent Carrier Amber Beacon Pipeline (Stage 5.2)
        dssaPipeline = new WebGPUDssaPipeline(device, format);
        dssaPipeline.loadCarriers(dssaCarriers);
        dssaPipeline.setVisible(dssaEnabled);
        if (selectedDssaCarrier) {
          dssaPipeline.setSelectedCarrier(selectedDssaCarrier);
        }

        // Initialize Logarithmic Camera Controller (1 LY to 100,000 LY view)
        cameraController = new LogarithmicCameraController(26000.0);
        if (canvas) {
          cameraController.attach(canvas);
        }
        if (selectedStar) {
          cameraController.focusOn(selectedStar.x, selectedStar.y, selectedStar.z);
        }
      } catch (err) {
        console.error('[Atlas WebGPU] Failed to initialize Star/Grid/Volumetric Pipeline:', err);
      }

      // Safely read adapter info across browser WebGPU implementations
      const adapterAny = adapter as any;
      const adapterInfo = adapterAny.info || (await adapterAny.requestAdapterInfo?.().catch(() => null));
      rendererName = adapterInfo?.description || adapterInfo?.vendor || adapterInfo?.architecture || 'WebGPU Hardware Device';
      backend = 'webgpu';

      if (onReady) {
        onReady('webgpu', context);
      }

      return true;
    } catch (err) {
      console.warn('[Atlas WebGPU] Failed to initialize WebGPU, falling back to WebGL2:', err);
      return false;
    }
  }

  function initWebGL2(): boolean {
    if (!canvas) return false;

    try {
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      });

      if (!gl) return false;

      glContext = gl;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL2 Hardware Renderer';
      } else {
        rendererName = gl.getParameter(gl.RENDERER) || 'WebGL2 Generic';
      }

      backend = 'webgl2';

      if (onReady) {
        onReady('webgl2', gl);
      }

      return true;
    } catch (err) {
      console.error('[Atlas WebGL2] Failed to initialize WebGL2 context:', err);
      return false;
    }
  }

  onMount(async () => {
    if (!container || !canvas) return;

    // Initialize ResizeObserver
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          updateResolution(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Initial sizing based on container client dimensions
    const rect = container.getBoundingClientRect();
    updateResolution(rect.width || window.innerWidth, rect.height || window.innerHeight);

    // Attempt WebGPU first, then fallback to WebGL2
    const webgpuSuccess = await initWebGPU();
    if (!webgpuSuccess) {
      const webgl2Success = initWebGL2();
      if (!webgl2Success) {
        backend = 'unsupported';
        rendererName = 'No WebGPU or WebGL2 context available';
      }
    }

    // Pointer move listener for live mouse-hover galactic coords (X, Y, Z) and density per cubic kiloparsec
    function handlePointerMove(e: PointerEvent) {
      if (!canvas || !cameraController) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (clientX < 0 || clientX > rect.width || clientY < 0 || clientY > rect.height) {
        hoverCoords = null;
        if (onHoverCoordsChange) onHoverCoordsChange(null);
        return;
      }

      // Convert to Normalized Device Coordinates [-1, 1]
      const ndcX = (clientX / rect.width) * 2 - 1;
      const ndcY = -(clientY / rect.height) * 2 + 1;

      // Unproject mouse ray through inverse viewProjMatrix
      try {
        const camPos = cameraController.getCameraPosition();
        const invViewProj = cameraController.viewProjMatrix.clone().invert();
        
        // Ray origin on near plane (z = -1) and target on far plane (z = 1) in shifted coordinates
        const originShift = starPipeline ? starPipeline.getCameraOrigin() : [0, 0, 0];
        const nearVec = new Vector3(ndcX, ndcY, -1).applyMatrix4(invViewProj);
        const farVec = new Vector3(ndcX, ndcY, 1).applyMatrix4(invViewProj);

        const worldNearX = nearVec.x + originShift[0];
        const worldNearY = nearVec.y + originShift[1];
        const worldNearZ = nearVec.z + originShift[2];

        const worldFarX = farVec.x + originShift[0];
        const worldFarY = farVec.y + originShift[1];
        const worldFarZ = farVec.z + originShift[2];

        const dirX = worldFarX - worldNearX;
        const dirY = worldFarY - worldNearY;
        const dirZ = worldFarZ - worldNearZ;

        // Intersect ray with Y = 0 galactic reference plane:
        // worldNearY + t * dirY = 0 => t = -worldNearY / dirY
        if (Math.abs(dirY) > 1e-6) {
          const t = -worldNearY / dirY;
          if (t >= 0) {
            const hitX = worldNearX + t * dirX;
            const hitZ = worldNearZ + t * dirZ;
            const densityKpc3 = estimateStarsPerCubicKiloparsec(hitX, 0, hitZ);

            hoverCoords = {
              x: hitX,
              y: 0,
              z: hitZ,
              densityStarsKpc3: densityKpc3,
            };
            if (onHoverCoordsChange) {
              onHoverCoordsChange(hoverCoords);
            }
          }
        }

        // Check for DSSA carrier hover in screen space (Stage 5.2)
        if (dssaEnabled && dssaCarriers && dssaCarriers.length > 0) {
          let foundCarrier: DssaCarrier | null = null;
          let foundScreenPos: { x: number; y: number } | null = null;
          let minHitDist = 24.0;

          for (const carrier of dssaCarriers) {
            const rx = carrier.coords.x - originShift[0];
            const ry = carrier.coords.y - originShift[1];
            const rz = carrier.coords.z - originShift[2];

            const clip = new Vector3(rx, ry, rz).applyMatrix4(cameraController.viewProjMatrix);
            if (clip.z > 0.0 && clip.z < 1.0) {
              const sx = (clip.x + 1) * 0.5 * rect.width;
              const sy = (-clip.y + 1) * 0.5 * rect.height;
              const dist = Math.hypot(clientX - sx, clientY - sy);
              if (dist < minHitDist) {
                minHitDist = dist;
                foundCarrier = carrier;
                foundScreenPos = { x: sx, y: sy };
              }
            }
          }
          hoveredDssaCarrier = foundCarrier;
          hoveredDssaScreenPos = foundScreenPos;
        } else {
          hoveredDssaCarrier = null;
          hoveredDssaScreenPos = null;
        }
      } catch {
        // Safe fallback if matrix math during initial mount is singular
      }
    }

    pointerMoveHandler = handlePointerMove;
    window.addEventListener('pointermove', handlePointerMove);

    // Start render loop
    animationFrameId = requestAnimationFrame(renderLoop);
  });

  function handleCanvasClick(e: MouseEvent) {
    if (e.button !== 0) return;
    if (hoveredDssaCarrier && onSelectDssaCarrier) {
      onSelectDssaCarrier(hoveredDssaCarrier);
    }
  }

  onDestroy(() => {
    if (pointerMoveHandler) {
      window.removeEventListener('pointermove', pointerMoveHandler);
      pointerMoveHandler = null;
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (cameraController) {
      cameraController.detach();
      cameraController = null;
    }
    if (volumetricPipeline) {
      volumetricPipeline.destroy();
      volumetricPipeline = null;
    }
    if (orreryPipeline) {
      orreryPipeline.destroy();
      orreryPipeline = null;
    }
    if (dssSurfacePipeline) {
      dssSurfacePipeline.destroy();
      dssSurfacePipeline = null;
    }
    if (routePipeline) {
      routePipeline.destroy();
      routePipeline = null;
    }
    if (dssaPipeline) {
      dssaPipeline.destroy();
      dssaPipeline = null;
    }
    if (gridPipeline) {
      gridPipeline.destroy();
      gridPipeline = null;
    }
    if (heatmapPipeline) {
      heatmapPipeline.destroy();
      heatmapPipeline = null;
    }
    if (frustumStreamer) {
      frustumStreamer.destroy();
      frustumStreamer = null;
    }
    if (starPipeline) {
      starPipeline.destroy();
      starPipeline = null;
    }
    if (gpuDevice) {
      gpuDevice.destroy();
      gpuDevice = null;
    }
  });
</script>

<div bind:this={container} class="relative w-full h-full overflow-hidden bg-[#030508]">
  <canvas
    bind:this={canvas}
    class="block w-full h-full touch-none {hoveredDssaCarrier ? 'cursor-pointer' : ''}"
    style="image-rendering: pixelated;"
    onclick={handleCanvasClick}
  ></canvas>

  {#if hoveredDssaCarrier && hoveredDssaScreenPos}
    <div
      class="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded bg-black/90 border border-[var(--hud-amber)] text-white font-mono text-[11px] shadow-[0_0_15px_rgba(255,179,0,0.4)] flex items-center space-x-2 whitespace-nowrap"
      style="left: {hoveredDssaScreenPos.x}px; top: {hoveredDssaScreenPos.y}px;"
    >
      <span class="w-2 h-2 rounded-full bg-[var(--hud-amber)] animate-ping"></span>
      <span class="text-[var(--hud-amber)] font-bold">{hoveredDssaCarrier.callsign}</span>
      <span class="text-white/60">·</span>
      <span>{hoveredDssaCarrier.systemName}</span>
      <span class="text-[var(--ed-orange-dim)] text-[10px]">({hoveredDssaCarrier.region})</span>
    </div>
  {/if}

  {#if showDiagnostics}
    <div
      class="absolute bottom-3 left-4 z-40 flex items-center space-x-3 px-3 py-1.5 rounded bg-[#0a1018]/85 border border-[#ff7100]/40 backdrop-blur text-[11px] font-mono tracking-wider text-hud-bright shadow-hud-glow"
    >
      <div class="flex items-center space-x-1.5">
        <span
          class="inline-block w-2 h-2 rounded-full {backend === 'webgpu'
            ? 'bg-emerald-400 animate-pulse'
            : backend === 'webgl2'
              ? 'bg-amber-400'
              : 'bg-red-500'}"
        ></span>
        <span class="font-bold uppercase">
          {backend === 'webgpu'
            ? 'WebGPU 120Hz'
            : backend === 'webgl2'
              ? 'WebGL2 Fallback'
              : backend === 'initializing'
                ? 'GPU Handshake...'
                : 'GPU Offline'}
        </span>
      </div>

      <span class="text-white/30">|</span>

      <span class="text-white/80 truncate max-w-[220px]" title={rendererName}>
        {rendererName}
      </span>

      <span class="text-white/30">|</span>

      <span class="text-white/70">
        {resolution.width}x{resolution.height} ({resolution.dpr.toFixed(1)}x DPR)
      </span>

      <span class="text-white/30">|</span>

      <span class="font-bold text-white">
        {fps} FPS
      </span>

      {#if starCount > 0}
        <span class="text-white/30">|</span>
        <span class="text-[var(--hud-amber)] font-bold">
          {starCount.toLocaleString()} STARS
        </span>
      {/if}

      {#if cachedBoxelsCount > 0}
        <span class="text-white/30">|</span>
        <span class="text-[#7cf5ff] font-bold">
          {cachedBoxelsCount} BOXELS
        </span>
      {/if}

      <span class="text-white/30">|</span>
      <span class="text-[#ff9800] font-bold">
        ZOOM: {cameraDistanceLy.toLocaleString()} LY
      </span>

      {#if hoverCoords && heatmapDensity !== 'off'}
        <span class="text-white/30">|</span>
        <span class="text-[#38ef7d] font-bold tracking-tight">
          DENSITY: {hoverCoords.densityStarsKpc3.toLocaleString()} STARS/kpc³
        </span>
        <span class="text-white/40 text-[10px]">
          ({hoverCoords.x.toFixed(0)}, {hoverCoords.z.toFixed(0)} LY)
        </span>
      {/if}
    </div>
  {/if}

  {#if backend === 'unsupported'}
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div class="max-w-md p-6 bg-[#0a1018] border-2 border-red-500 rounded text-center shadow-lg">
        <h2 class="text-xl font-bold uppercase tracking-wider text-red-400 mb-2">Hardware Acceleration Required</h2>
        <p class="text-sm text-gray-300 mb-4">
          Atlas requires WebGPU or WebGL2 to render 200M+ star systems with high-performance frustum streaming.
        </p>
        <div class="text-xs text-white/60 font-mono">
          Please update your browser to Chrome 113+, Edge 113+, or enable WebGPU support.
        </div>
      </div>
    </div>
  {/if}
</div>
