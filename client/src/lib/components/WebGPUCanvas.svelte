<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    showDiagnostics?: boolean;
    onReady?: (backend: 'webgpu' | 'webgl2', ctx: GPUCanvasContext | WebGL2RenderingContext) => void;
  }

  let { showDiagnostics = true, onReady }: Props = $props();

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

  import { WebGPUStarPipeline } from '$engine/star_pipeline';
  import { Matrix4, Vector3 } from 'three';

  // Star Pipeline handle
  let starPipeline: WebGPUStarPipeline | null = null;
  let starCount = $state<number>(0);

  // Camera matrices
  const projMatrix = new Matrix4();
  const viewMatrix = new Matrix4();
  const viewProjMatrix = new Matrix4();
  const cameraPos = new Vector3(0, 8000, 24000);
  const cameraTarget = new Vector3(0, 0, 0);
  const upVector = new Vector3(0, 1, 0);

  function renderLoop() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 500) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = now;
    }

    if (backend === 'webgpu' && gpuDevice && gpuContext) {
      try {
        const aspect = Math.max(0.1, resolution.width / (resolution.height || 1));
        projMatrix.makePerspective(45, aspect, 1.0, 500000.0);

        // Slow cinematic orbit around galactic center
        const orbitSpeed = 0.00008;
        const orbitRadius = 26000;
        const orbitAngle = now * orbitSpeed;
        const camX = Math.sin(orbitAngle) * orbitRadius;
        const camZ = Math.cos(orbitAngle) * orbitRadius;
        const camY = 7500 + Math.sin(now * 0.0002) * 1500;
        cameraPos.set(camX, camY, camZ);

        viewMatrix.lookAt(cameraPos, cameraTarget, upVector);
        viewProjMatrix.multiplyMatrices(projMatrix, viewMatrix);

        if (starPipeline) {
          starPipeline.updateUniforms(
            new Float32Array(viewProjMatrix.elements),
            [cameraPos.x, cameraPos.y, cameraPos.z],
            resolution.dpr,
            now * 0.001,
            true
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

        if (starPipeline) {
          starPipeline.render(renderPass);
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
      } catch (err) {
        console.error('[Atlas WebGPU] Failed to initialize Star Pipeline:', err);
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
