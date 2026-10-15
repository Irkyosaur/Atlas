// Location: atlas/client/src/lib/engine/heatmap_pipeline.ts
// WebGPU Render Pipeline for Dynamic 1024x1024 Galactic Density Heatmap Overlay (Stage 5.1)

import { WGSL_HEATMAP_SHADER } from '$shaders/heatmap_shaders';
import {
  CANONICAL_GALAXY_BOUNDS,
  generateProceduralHeatmapRaster,
  type GalacticHeatmapBounds,
} from '$engine/heatmap_raster';

export type HeatmapColorRamp = 'inferno' | 'thermal' | 'void';

export interface HeatmapOptions {
  colorRamp: HeatmapColorRamp;
  opacity: number;
  intensity: number;
  additiveBlend: boolean;
  bounds?: GalacticHeatmapBounds;
}

export const DEFAULT_HEATMAP_OPTIONS: HeatmapOptions = {
  colorRamp: 'inferno',
  opacity: 0.85,
  intensity: 1.15,
  additiveBlend: true,
  bounds: CANONICAL_GALAXY_BOUNDS,
};

export class WebGPUHeatmapPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  private renderPipeline: GPURenderPipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private indexBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;

  private texture: GPUTexture | null = null;
  private textureView: GPUTextureView | null = null;
  private sampler: GPUSampler | null = null;

  private options: HeatmapOptions;
  private bounds: GalacticHeatmapBounds;
  private isLoaded = false;
  private remoteImageFailed = false;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    options: Partial<HeatmapOptions> = {}
  ) {
    this.device = device;
    this.format = format;
    this.options = { ...DEFAULT_HEATMAP_OPTIONS, ...options };
    this.bounds = this.options.bounds ?? CANONICAL_GALAXY_BOUNDS;

    this.initSampler();
    this.initGeometry();
    this.initUniforms();
    this.initPipeline();
    this.loadDefaultDensityTexture();
  }

  private initSampler() {
    this.sampler = this.device.createSampler({
      label: 'Atlas-Heatmap-Sampler',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }

  private initGeometry() {
    // Quad covering the galactic X/Z plane from bounds [xMin, zMin] to [xMax, zMax] at Y = 0
    const { xMin, zMin, xMax, zMax } = this.bounds;

    // Vertex layout: position (x, y, z) + uv (u, v) = 5 floats per vertex (20 bytes)
    // Note: zMin corresponds to v = 1.0 (bottom/Sol side), zMax corresponds to v = 0.0 (top/Beagle Point)
    const vertices = new Float32Array([
      // pos: x, y, z       uv: u, v
      xMin, 0.0, zMin,      0.0, 1.0, // Bottom-left
      xMax, 0.0, zMin,      1.0, 1.0, // Bottom-right
      xMax, 0.0, zMax,      1.0, 0.0, // Top-right
      xMin, 0.0, zMax,      0.0, 0.0, // Top-left
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);

    this.vertexBuffer = this.device.createBuffer({
      label: 'Atlas-Heatmap-VertexBuffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
    this.vertexBuffer.unmap();

    this.indexBuffer = this.device.createBuffer({
      label: 'Atlas-Heatmap-IndexBuffer',
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.indexBuffer.getMappedRange()).set(indices);
    this.indexBuffer.unmap();
  }

  private initUniforms() {
    // 32 floats = 128 bytes
    // 0..15: viewProjection (mat4)
    // 16..18: cameraPosition (vec3)
    // 19: time (f32)
    // 20..22: cameraOrigin (vec3)
    // 23: originShiftEnabled (f32)
    // 24..27: params (opacity, rampIndex, blendMode, intensity) (vec4)
    // 28..31: bounds (xMin, zMin, xMax, zMax) (vec4)
    this.uniformBuffer = this.device.createBuffer({
      label: 'Atlas-Heatmap-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private initPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Heatmap-WGSL-Module',
      code: WGSL_HEATMAP_SHADER,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Heatmap-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d', multisampled: false },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Heatmap-PipelineLayout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Heatmap-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 5 * 4, // 20 bytes
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12, format: 'float32x2' }, // uv
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
            writeMask: GPUColorWrite.ALL,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  }

  /**
   * Initializes texture from 1024x1024 procedural raster, and asynchronously attempts
   * to fetch live /api/heatmap.png if available from Ananke server.
   */
  private loadDefaultDensityTexture() {
    const width = 1024;
    const height = 1024;
    const rasterData = generateProceduralHeatmapRaster(width, height, this.bounds);

    this.updateTextureFromRGBA(rasterData, width, height);

    // Asynchronously attempt to overlay or replace with live Ananke server raster
    this.tryFetchAnankeHeatmap('/api/heatmap.png');
  }

  public updateTextureFromRGBA(rgbaData: Uint8Array, width: number, height: number) {
    if (this.texture) {
      this.texture.destroy();
    }

    this.texture = this.device.createTexture({
      label: 'Atlas-Heatmap-DensityTexture',
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.writeTexture(
      { texture: this.texture },
      rgbaData,
      { bytesPerRow: width * 4, rowsPerImage: height },
      [width, height, 1]
    );

    this.textureView = this.texture.createView({
      label: 'Atlas-Heatmap-TextureView',
    });

    this.rebuildBindGroup();
    this.isLoaded = true;
  }

  /**
   * Attempts to load live heatmap image from URL (e.g. Ananke engine endpoint)
   */
  public async tryFetchAnankeHeatmap(url: string) {
    if (this.remoteImageFailed) return;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.remoteImageFailed = true;
        return;
      }
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      if (this.texture) {
        this.texture.destroy();
      }

      this.texture = this.device.createTexture({
        label: 'Atlas-Heatmap-AnankeTexture',
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      this.device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: this.texture },
        [imageBitmap.width, imageBitmap.height]
      );

      this.textureView = this.texture.createView();
      this.rebuildBindGroup();
      this.isLoaded = true;
    } catch {
      // In standalone client or offline mode, graceful fallback to procedural raster
      this.remoteImageFailed = true;
    }
  }

  private rebuildBindGroup() {
    if (!this.bindGroupLayout || !this.uniformBuffer || !this.textureView || !this.sampler) {
      return;
    }

    this.bindGroup = this.device.createBindGroup({
      label: 'Atlas-Heatmap-BindGroup',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.textureView },
        { binding: 2, resource: this.sampler },
      ],
    });
  }

  public setOptions(options: Partial<HeatmapOptions>) {
    this.options = { ...this.options, ...options };
  }

  public setColorRamp(ramp: HeatmapColorRamp) {
    this.options.colorRamp = ramp;
  }

  public setOpacity(opacity: number) {
    this.options.opacity = Math.max(0, Math.min(1.0, opacity));
  }

  public updateUniforms(
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    time: number,
    cameraOrigin: [number, number, number] = [0, 0, 0],
    originShiftEnabled = true
  ) {
    const data = new Float32Array(32);
    // 0..15: viewProjection
    data.set(viewProjMatrix, 0);

    // 16..18: cameraPosition
    data[16] = cameraPosition[0];
    data[17] = cameraPosition[1];
    data[18] = cameraPosition[2];

    // 19: time
    data[19] = time;

    // 20..22: cameraOrigin
    data[20] = cameraOrigin[0];
    data[21] = cameraOrigin[1];
    data[22] = cameraOrigin[2];

    // 23: originShiftEnabled
    data[23] = originShiftEnabled ? 1.0 : 0.0;

    // 24..27: params
    const rampCode =
      this.options.colorRamp === 'inferno'
        ? 0.0
        : this.options.colorRamp === 'thermal'
          ? 1.0
          : 2.0;

    data[24] = this.options.opacity;
    data[25] = rampCode;
    data[26] = this.options.additiveBlend ? 0.0 : 1.0;
    data[27] = this.options.intensity;

    // 28..31: bounds
    data[28] = this.bounds.xMin;
    data[29] = this.bounds.zMin;
    data[30] = this.bounds.xMax;
    data[31] = this.bounds.zMax;

    if (this.uniformBuffer) {
      this.device.queue.writeBuffer(this.uniformBuffer, 0, data.buffer);
    }
  }

  public render(passEncoder: GPURenderPassEncoder) {
    if (
      !this.isLoaded ||
      this.options.opacity <= 0.001 ||
      !this.renderPipeline ||
      !this.bindGroup ||
      !this.vertexBuffer ||
      !this.indexBuffer
    ) {
      return;
    }

    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
    passEncoder.drawIndexed(6, 1, 0, 0, 0);
  }

  public destroy() {
    this.vertexBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.texture?.destroy();
  }
}
