// Location: atlas/client/src/lib/engine/star_pipeline.ts
// WebGPU Instanced Point Cloud Star Rendering Engine & WGSL Pipeline

import { WGSL_STAR_SHADER } from '$shaders/star_shaders';
import { STAR_SPECTRAL_CATALOG, getStarProfile } from '$engine/star_catalog';
import type { SystemRecord } from '$engine/ananke_client';

export interface StarInstanceData {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  size: number;
  luminosity: number;
  starType: number; // 0 = standard, 1 = giant / blue supergiant / wolf-rayet / neutron
}

// 4 floats pos + 4 floats (rgb + size) + 4 floats (lum + type + pad + pad) -> Or tightly packed
// In WGSL:
// @location(0) quadPos: vec2<f32>
// @location(1) instancePos: vec3<f32> (Float32Array 3)
// @location(2) instanceColor: vec3<f32> (Float32Array 3)
// @location(3) instanceSize: f32 (Float32Array 1)
// @location(4) instanceLuminosity: f32 (Float32Array 1)
// @location(5) instanceType: f32 (Float32Array 1)
// Total per instance: 3 + 3 + 1 + 1 + 1 = 9 floats. Let's pad to 12 floats (48 bytes) for clean 16-byte alignment.
export const FLOATS_PER_INSTANCE = 12;
export const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

export class WebGPUStarPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private pipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private instanceBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  private maxInstances: number;
  private currentInstanceCount = 0;
  private instanceCpuData: Float32Array;

  constructor(device: GPUDevice, format: GPUTextureFormat, maxInstances = 1_000_000) {
    this.device = device;
    this.format = format;
    this.maxInstances = maxInstances;
    this.instanceCpuData = new Float32Array(maxInstances * FLOATS_PER_INSTANCE);
    this.initPipeline();
  }

  private initPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Star-WGSL-Module',
      code: WGSL_STAR_SHADER,
    });

    // Quad geometry: 4 vertices [-0.5, 0.5]
    // 2 triangles forming a square billboard
    const quadVertices = new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
       0.5,  0.5,
      -0.5,  0.5,
    ]);
    const quadIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);

    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Star-Quad-VertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadVertexBuffer.getMappedRange()).set(quadVertices);
    this.quadVertexBuffer.unmap();

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Star-Quad-IndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.quadIndexBuffer.getMappedRange()).set(quadIndices);
    this.quadIndexBuffer.unmap();

    // Uniform buffer (Camera matrix: 16 floats, position: 3 floats, pixelRatio: 1 float, time: 1 float, haloEnabled: 1 float, pad: 2 floats = 24 floats = 96 bytes)
    this.uniformBuffer = this.device.createBuffer({
      label: 'Atlas-Star-Uniform-Buffer',
      size: 32 * 4, // 128 bytes (multiple of 16)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Instance buffer for 1M stars
    this.instanceBuffer = this.device.createBuffer({
      label: 'Atlas-Star-Instance-Buffer',
      size: this.maxInstances * BYTES_PER_INSTANCE,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Pipeline Layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Star-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform',
          },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      label: 'Atlas-Star-BindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Star-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    // Vertex Buffer Layouts:
    // Slot 0: Quad mesh (vec2f) -> stepMode: vertex
    // Slot 1: Per-instance data -> stepMode: instance
    const vertexBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: 2 * 4, // 2 floats (8 bytes)
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x2', // quadPos
          },
        ],
      },
      {
        arrayStride: BYTES_PER_INSTANCE, // 48 bytes
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 1,
            offset: 0,
            format: 'float32x3', // instancePos (x, y, z)
          },
          {
            shaderLocation: 2,
            offset: 12,
            format: 'float32x3', // instanceColor (r, g, b)
          },
          {
            shaderLocation: 3,
            offset: 24,
            format: 'float32', // instanceSize
          },
          {
            shaderLocation: 4,
            offset: 28,
            format: 'float32', // instanceLuminosity
          },
          {
            shaderLocation: 5,
            offset: 32,
            format: 'float32', // instanceType
          },
        ],
      },
    ];

    this.pipeline = this.device.createRenderPipeline({
      label: 'Atlas-Star-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: vertexBuffers,
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: this.format,
            blend: {
              // Additive alpha blending for stellar luminescence & coronal overlap
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
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
      depthStencil: undefined, // Additive celestial rendering without depth sorting z-buffer occlusion
    });
  }

  /**
   * Uploads star systems into GPU instance buffer
   */
  public loadStarCatalog(systems: SystemRecord[]) {
    const count = Math.min(systems.length, this.maxInstances);
    let offset = 0;

    for (let i = 0; i < count; i++) {
      const s = systems[i];
      const starProfile = getStarProfile(s.primaryStarClass || 'G');
      const hex = starProfile.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const starClass = (s.primaryStarClass || 'G').toUpperCase();
      const isGiant = starClass.startsWith('O') || starClass.startsWith('B') || starClass.startsWith('N') || starClass.startsWith('H') ? 1.0 : 0.0;
      const lum = starProfile.coronaIntensity;
      const size = starProfile.baseRadius;

      // Fill Float32Array:
      // [x, y, z]
      this.instanceCpuData[offset + 0] = s.x;
      this.instanceCpuData[offset + 1] = s.y;
      this.instanceCpuData[offset + 2] = s.z;

      // [r, g, b]
      this.instanceCpuData[offset + 3] = r;
      this.instanceCpuData[offset + 4] = g;
      this.instanceCpuData[offset + 5] = b;

      // size, lum, isGiant
      this.instanceCpuData[offset + 6] = size;
      this.instanceCpuData[offset + 7] = lum;
      this.instanceCpuData[offset + 8] = isGiant;

      // Padding
      this.instanceCpuData[offset + 9] = 0;
      this.instanceCpuData[offset + 10] = 0;
      this.instanceCpuData[offset + 11] = 0;

      offset += FLOATS_PER_INSTANCE;
    }

    this.currentInstanceCount = count;

    if (this.instanceBuffer && count > 0) {
      this.device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        this.instanceCpuData.buffer,
        0,
        count * BYTES_PER_INSTANCE
      );
    }
  }

  /**
   * Populate procedural galaxy stars for testing 1,000,000 instances at 120 FPS
   */
  public generateProceduralMilkyWay(count = 500_000) {
    const total = Math.min(count, this.maxInstances);
    let offset = 0;

    // Galactic distribution parameters
    // Disc radius: 25,000 LY, Core bulge: 4,000 LY, Thickness: 1,000 LY, Spiral arms: 4
    const classes = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'N'];
    const weights = [0.005, 0.02, 0.05, 0.12, 0.18, 0.25, 0.35, 0.025];

    for (let i = 0; i < total; i++) {
      // Pick spectral class based on IMF weights
      const rand = Math.random();
      let accum = 0;
      let chosenClass = 'M';
      for (let c = 0; c < classes.length; c++) {
        accum += weights[c];
        if (rand <= accum) {
          chosenClass = classes[c];
          break;
        }
      }

      const profile = getStarProfile(chosenClass);
      const hex = profile.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      // Position: Bulge or Spiral Arms
      const isBulge = Math.random() < 0.2;
      let x = 0, y = 0, z = 0;

      if (isBulge) {
        const rad = Math.pow(Math.random(), 2.0) * 4500;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        x = rad * Math.cos(phi) * Math.cos(theta);
        y = rad * Math.sin(phi) * 0.6;
        z = rad * Math.cos(phi) * Math.sin(theta);
      } else {
        // Spiral arm log-spiral: r = a * exp(b * theta)
        const armIndex = Math.floor(Math.random() * 4);
        const armAngle = (armIndex * Math.PI) / 2;
        const distFromCenter = 1500 + Math.random() * 26000;
        const spiralAngle = distFromCenter * 0.00035 + armAngle;
        const spread = (Math.random() - 0.5) * (distFromCenter * 0.18);
        const spreadAngle = (Math.random() - 0.5) * 0.3;

        x = (distFromCenter + spread) * Math.cos(spiralAngle + spreadAngle);
        z = (distFromCenter + spread) * Math.sin(spiralAngle + spreadAngle);
        y = (Math.random() - 0.5) * (800 * Math.exp(-distFromCenter / 20000));
      }

      const isGiant = chosenClass === 'O' || chosenClass === 'B' || chosenClass === 'N' ? 1.0 : 0.0;

      this.instanceCpuData[offset + 0] = x;
      this.instanceCpuData[offset + 1] = y;
      this.instanceCpuData[offset + 2] = z;

      this.instanceCpuData[offset + 3] = r;
      this.instanceCpuData[offset + 4] = g;
      this.instanceCpuData[offset + 5] = b;

      this.instanceCpuData[offset + 6] = profile.baseRadius;
      this.instanceCpuData[offset + 7] = profile.coronaIntensity;
      this.instanceCpuData[offset + 8] = isGiant;

      this.instanceCpuData[offset + 9] = 0;
      this.instanceCpuData[offset + 10] = 0;
      this.instanceCpuData[offset + 11] = 0;

      offset += FLOATS_PER_INSTANCE;
    }

    this.currentInstanceCount = total;

    if (this.instanceBuffer && total > 0) {
      this.device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        this.instanceCpuData.buffer,
        0,
        total * BYTES_PER_INSTANCE
      );
    }
  }

  /**
   * Update uniform buffer (viewProjection, cameraPosition, pixelRatio, time, haloEnabled)
   */
  public updateUniforms(
    viewProjectionMatrix: Float32Array,
    cameraPosition: [number, number, number],
    pixelRatio: number,
    time: number,
    haloEnabled = true
  ) {
    if (!this.uniformBuffer) return;

    const data = new Float32Array(32);
    // 0..15: viewProjection Matrix (4x4)
    data.set(viewProjectionMatrix, 0);

    // 16..18: cameraPosition (x, y, z)
    data[16] = cameraPosition[0];
    data[17] = cameraPosition[1];
    data[18] = cameraPosition[2];

    // 19: pixelRatio
    data[19] = pixelRatio;

    // 20: time
    data[20] = time;

    // 21: haloEnabled
    data[21] = haloEnabled ? 1.0 : 0.0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data.buffer);
  }

  /**
   * Encodes render pass draw calls
   */
  public render(passEncoder: GPURenderPassEncoder) {
    if (!this.pipeline || !this.bindGroup || !this.quadVertexBuffer || !this.quadIndexBuffer || !this.instanceBuffer) {
      return;
    }

    if (this.currentInstanceCount <= 0) return;

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.quadVertexBuffer);
    passEncoder.setVertexBuffer(1, this.instanceBuffer);
    passEncoder.setIndexBuffer(this.quadIndexBuffer, 'uint16');

    // Draw 6 indices (2 triangles) per instance, currentInstanceCount instances
    passEncoder.drawIndexed(6, this.currentInstanceCount, 0, 0, 0);
  }

  public getInstanceCount(): number {
    return this.currentInstanceCount;
  }

  public destroy() {
    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.uniformBuffer?.destroy();
  }
}
