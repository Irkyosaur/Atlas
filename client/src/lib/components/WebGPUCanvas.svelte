<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { WebGPUStarPipeline } from '$engine/star_pipeline';
  import { FrustumStreamer } from '$engine/frustum_streamer';
  import { LogarithmicCameraController } from '$engine/camera_controller';
  import { WebGPUGridPipeline, type StalkTarget } from '$engine/grid_pipeline';
  import { WebGPUVolumetricPipeline } from '$engine/volumetric_pipeline';
  import { WebGPUOrreryPipeline } from '$engine/orrery_pipeline';

  interface Props {
    showDiagnostics?: boolean;
    selectedStar?: StalkTarget | null;
    showGrid?: boolean;
    powerplayEnabled?: boolean;
    thargoidWarEnabled?: boolean;
    activeMode?: 'galaxy' | 'system' | 'orrery' | 'surface';
    onReady?: (backend: 'webgpu' | 'webgl2', ctx: GPUCanvasContext | WebGL2RenderingContext) => void;
  }

  let {
    showDiagnostics = true,
    selectedStar = null,
    showGrid = true,
    powerplayEnabled = true,
    thargoidWarEnabled = true,
    activeMode = 'galaxy',
    onReady,
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
  let orreryPipeline: WebGPUOrreryPipeline | null = null;
  let frustumStreamer: FrustumStreamer | null = null;
  let cameraController: LogarithmicCameraController | null = null;

  let starCount = $state<number>(0);
  let cachedBoxelsCount = $state<number>(0);
  let cameraDistanceLy = $state<number>(26000);

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
    if (volumetricPipeline) {
      volumetricPipeline.setLayerOpacity(powerplayEnabled, thargoidWarEnabled);
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
        const origin = starPipeline ? starPipeline.getCameraOrigin() : [0, 0, 0];

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
          orreryPipeline.updateBodyPositions(now * 0.0001);
          orreryPipeline.updateUniforms(
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

        if (activeMode === 'orrery') {
          // Orrery 3D View: render Keplerian orbit splines and celestial bodies
          if (orreryPipeline) {
            orreryPipeline.render(renderPass);
          }
        } else {
          // Render Y=0 Galactic Reference Plane Grid & StalkBase Lines
          if (gridPipeline) {
            gridPipeline.render(renderPass, showGrid, true);
          }

          // Render Volumetric Powerplay 2.0 Bubbles & Titan Caustic Zones
          if (volumetricPipeline) {
            volumetricPipeline.render(renderPass);
          }

          // Render Stars
          if (starPipeline) {
            starPipeline.render(renderPass);
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

        // Initialize Volumetric Powerplay 2.0 Bubbles & Titan Caustic Zones
        volumetricPipeline = new WebGPUVolumetricPipeline(device, format);
        volumetricPipeline.setLayerOpacity(powerplayEnabled, thargoidWarEnabled);

        // Initialize 3D Keplerian Orrery Pipeline
        orreryPipeline = new WebGPUOrreryPipeline(device, format);

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

    // Start render loop
    animationFrameId = requestAnimationFrame(renderLoop);
  });

  onDestroy(() => {
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
    if (gridPipeline) {
      gridPipeline.destroy();
      gridPipeline = null;
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
    class="block w-full h-full touch-none"
    style="image-rendering: pixelated;"
  ></canvas>

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
