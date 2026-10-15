// Location: atlas/client/src/lib/engine/orrery_pipeline.ts
// WebGPU Render Pipeline for 3D Keplerian Orrery with Elliptical Splines (Task 3.2.1, 3.2.2, 3.2.3, 3.2.4)

import { WGSL_ORRERY_SPLINE_SHADER, WGSL_ORRERY_BODY_SHADER } from '$shaders/orrery_shaders';
import {
  type KeplerianElements,
  computeOrbitalPosition,
  generateOrbitPath,
  normalizeRadiusKm,
  normalizeDistanceAU,
} from '$engine/kepler';
import type { BodyRecord } from '$engine/ananke_client';

export interface OrreryBody {
  id: string;
  name: string;
  isStar: boolean;
  radiusKm: number;
  colorHex: string;
  keplerian?: KeplerianElements;
  currentPos: [number, number, number];
}

// Canonical Sol Planetary Orbit Parameters for Keplerian Orrery
export const SOL_ORRERY_BODIES: OrreryBody[] = [
  {
    id: 'sol_sun',
    name: 'Sol',
    isStar: true,
    radiusKm: 696340,
    colorHex: '#fff3a8',
    currentPos: [0, 0, 0],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    isStar: false,
    radiusKm: 2439.7,
    colorHex: '#ced4da',
    keplerian: {
      semiMajorAxis: 57.91e9,
      eccentricity: 0.2056,
      inclination: 7.0,
      periapsis: 29.12,
      ascendingNode: 48.33,
      meanAnomaly: 174.79,
      orbitalPeriod: 87.97 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'venus',
    name: 'Venus',
    isStar: false,
    radiusKm: 6051.8,
    colorHex: '#ffc067',
    keplerian: {
      semiMajorAxis: 108.2e9,
      eccentricity: 0.0067,
      inclination: 3.39,
      periapsis: 54.88,
      ascendingNode: 76.68,
      meanAnomaly: 50.11,
      orbitalPeriod: 224.7 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'earth',
    name: 'Earth',
    isStar: false,
    radiusKm: 6371.0,
    colorHex: '#4dabf7',
    keplerian: {
      semiMajorAxis: 149.6e9,
      eccentricity: 0.0167,
      inclination: 0.00,
      periapsis: 114.2,
      ascendingNode: -11.26,
      meanAnomaly: 358.62,
      orbitalPeriod: 365.256 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'mars',
    name: 'Mars',
    isStar: false,
    radiusKm: 3389.5,
    colorHex: '#ff6e41',
    keplerian: {
      semiMajorAxis: 227.9e9,
      eccentricity: 0.0934,
      inclination: 1.85,
      periapsis: 286.5,
      ascendingNode: 49.56,
      meanAnomaly: 19.37,
      orbitalPeriod: 686.98 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    isStar: false,
    radiusKm: 69911.0,
    colorHex: '#ffa94d',
    keplerian: {
      semiMajorAxis: 778.5e9,
      eccentricity: 0.0489,
      inclination: 1.30,
      periapsis: 273.87,
      ascendingNode: 100.46,
      meanAnomaly: 20.02,
      orbitalPeriod: 4332.59 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    isStar: false,
    radiusKm: 58232.0,
    colorHex: '#ffe066',
    keplerian: {
      semiMajorAxis: 1433.5e9,
      eccentricity: 0.0565,
      inclination: 2.49,
      periapsis: 339.39,
      ascendingNode: 113.67,
      meanAnomaly: 317.02,
      orbitalPeriod: 10759.22 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    isStar: false,
    radiusKm: 25362.0,
    colorHex: '#7cf5ff',
    keplerian: {
      semiMajorAxis: 2872.5e9,
      eccentricity: 0.0463,
      inclination: 0.77,
      periapsis: 96.99,
      ascendingNode: 74.01,
      meanAnomaly: 142.24,
      orbitalPeriod: 30685.4 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    isStar: false,
    radiusKm: 24622.0,
    colorHex: '#339af0',
    keplerian: {
      semiMajorAxis: 4495.1e9,
      eccentricity: 0.0095,
      inclination: 1.77,
      periapsis: 273.19,
      ascendingNode: 131.78,
      meanAnomaly: 256.23,
      orbitalPeriod: 60189.0 * 86400,
    },
    currentPos: [0, 0, 0],
  },
  // High-eccentricity dwarf planet (Pluto) to verify non-circular aphelion and anti-periapsis alpha fading
  {
    id: 'pluto',
    name: 'Pluto',
    isStar: false,
    radiusKm: 1188.3,
    colorHex: '#dee2e6',
    keplerian: {
      semiMajorAxis: 5906.4e9,
      eccentricity: 0.2488,
      inclination: 17.16,
      periapsis: 113.76,
      ascendingNode: 110.30,
      meanAnomaly: 14.88,
      orbitalPeriod: 90560.0 * 86400,
    },
    currentPos: [0, 0, 0],
  },
];

export class WebGPUOrreryPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Spline Pipeline Resources
  private splinePipeline: GPURenderPipeline | null = null;
  private splineVertexBuffer: GPUBuffer | null = null;
  private splineUniformBuffer: GPUBuffer | null = null;
  private splineBindGroup: GPUBindGroup | null = null;
  private splineVertexCount = 0;

  // Celestial Body Pipeline Resources
  private bodyPipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private bodyInstanceBuffer: GPUBuffer | null = null;
  private bodyUniformBuffer: GPUBuffer | null = null;
  private bodyBindGroup: GPUBindGroup | null = null;
  private bodyCount = 0;

  private bodies: OrreryBody[] = [];
  private useLogScale = true;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.initSplinePipeline();
    this.initBodyPipeline();
    this.loadBodies(SOL_ORRERY_BODIES);
  }

  private initSplinePipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Orrery-Spline-WGSL',
      code: WGSL_ORRERY_SPLINE_SHADER,
    });

    // Spline line-list vertex buffer (3 pos + 4 color = 7 floats = 28 bytes per vertex)
    this.splineVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Orrery-Spline-VertexBuffer',
      size: 4096 * 7 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.splineUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Orrery-Spline-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Orrery-Spline-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.splineBindGroup = this.device.createBindGroup({
      label: 'Atlas-Orrery-Spline-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.splineUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Orrery-Spline-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.splinePipeline = this.device.createRenderPipeline({
      label: 'Atlas-Orrery-Spline-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 7 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color (rgba)
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
        topology: 'line-list',
        cullMode: 'none',
      },
    });
  }

  private initBodyPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Orrery-Body-WGSL',
      code: WGSL_ORRERY_BODY_SHADER,
    });

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
      label: 'Atlas-Orrery-Quad-VertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadVertexBuffer.getMappedRange()).set(quadVertices);
    this.quadVertexBuffer.unmap();

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Orrery-Quad-IndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.quadIndexBuffer.getMappedRange()).set(quadIndices);
    this.quadIndexBuffer.unmap();

    // Per-instance body buffer: instancePos(3), instanceColor(3), instanceRadius(1), isStar(1) = 8 floats = 32 bytes
    this.bodyInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-Orrery-Body-InstanceBuffer',
      size: 64 * 8 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.bodyUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Orrery-Body-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Orrery-Body-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.bodyBindGroup = this.device.createBindGroup({
      label: 'Atlas-Orrery-Body-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.bodyUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Orrery-Body-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.bodyPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Orrery-Body-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 2 * 4, // quadPos (vec2)
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
          },
          {
            arrayStride: 8 * 4, // instance data (32 bytes)
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 1, offset: 0, format: 'float32x3' }, // instancePos
              { shaderLocation: 2, offset: 12, format: 'float32x3' }, // instanceColor
              { shaderLocation: 3, offset: 24, format: 'float32' }, // instanceRadius
              { shaderLocation: 4, offset: 28, format: 'float32' }, // isStar
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
                srcFactor: 'src-alpha',
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

  public loadBodies(bodies: OrreryBody[], useLogScale = true) {
    this.bodies = bodies;
    this.useLogScale = useLogScale;
    this.bodyCount = bodies.length;

    // Generate closed elliptical orbit splines for each orbiting body
    const splineVertices: number[] = [];

    for (const b of bodies) {
      if (!b.keplerian) continue;

      const hex = b.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const bColor = parseInt(hex.slice(5, 7), 16) / 255;

      const path = generateOrbitPath(b.keplerian, 96, useLogScale);

      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        // Line segment (p1 -> p2) with variable alpha fading toward anti-periapsis
        splineVertices.push(p1.x, p1.y, p1.z, r, g, bColor, p1.alpha * 0.7);
        splineVertices.push(p2.x, p2.y, p2.z, r, g, bColor, p2.alpha * 0.7);
      }
    }

    this.splineVertexCount = splineVertices.length / 7;

    if (this.splineVertexBuffer && splineVertices.length > 0) {
      const floatData = new Float32Array(splineVertices);
      this.device.queue.writeBuffer(
        this.splineVertexBuffer,
        0,
        floatData.buffer,
        0,
        floatData.byteLength
      );
    }

    this.updateBodyPositions(0);
  }

  /**
   * Propagates planetary positions along Keplerian orbits for elapsed simulation time
   */
  public updateBodyPositions(elapsedTimeSec: number) {
    if (!this.bodyInstanceBuffer || this.bodies.length === 0) return;

    const data = new Float32Array(this.bodies.length * 8);

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      let pos: [number, number, number] = [0, 0, 0];

      if (b.keplerian) {
        const p = computeOrbitalPosition(b.keplerian, elapsedTimeSec, this.useLogScale);
        pos = [p.x, p.y, p.z];
        b.currentPos = pos;
      }

      const hex = b.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const bColor = parseInt(hex.slice(5, 7), 16) / 255;

      const radiusScale = b.isStar ? 6.5 : normalizeRadiusKm(b.radiusKm, this.useLogScale);

      const offset = i * 8;
      data[offset + 0] = pos[0];
      data[offset + 1] = pos[1];
      data[offset + 2] = pos[2];
      data[offset + 3] = r;
      data[offset + 4] = g;
      data[offset + 5] = bColor;
      data[offset + 6] = radiusScale;
      data[offset + 7] = b.isStar ? 1.0 : 0.0;
    }

    this.device.queue.writeBuffer(
      this.bodyInstanceBuffer,
      0,
      data.buffer,
      0,
      data.byteLength
    );
  }

  public updateUniforms(
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    time: number
  ) {
    const data = new Float32Array(32);
    data.set(viewProjMatrix, 0);
    data[16] = cameraPosition[0];
    data[17] = cameraPosition[1];
    data[18] = cameraPosition[2];
    data[19] = time;

    if (this.splineUniformBuffer) {
      this.device.queue.writeBuffer(this.splineUniformBuffer, 0, data.buffer);
    }
    if (this.bodyUniformBuffer) {
      this.device.queue.writeBuffer(this.bodyUniformBuffer, 0, data.buffer);
    }
  }

  public render(passEncoder: GPURenderPassEncoder) {
    // 1. Render Elliptical Orbit Splines
    if (this.splineVertexCount > 0 && this.splinePipeline && this.splineBindGroup && this.splineVertexBuffer) {
      passEncoder.setPipeline(this.splinePipeline);
      passEncoder.setBindGroup(0, this.splineBindGroup);
      passEncoder.setVertexBuffer(0, this.splineVertexBuffer);
      passEncoder.draw(this.splineVertexCount, 1, 0, 0);
    }

    // 2. Render Instanced 3D Celestial Bodies
    if (
      this.bodyCount > 0 &&
      this.bodyPipeline &&
      this.bodyBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.bodyInstanceBuffer
    ) {
      passEncoder.setPipeline(this.bodyPipeline);
      passEncoder.setBindGroup(0, this.bodyBindGroup);
      passEncoder.setVertexBuffer(0, this.quadVertexBuffer);
      passEncoder.setVertexBuffer(1, this.bodyInstanceBuffer);
      passEncoder.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      passEncoder.drawIndexed(6, this.bodyCount, 0, 0, 0);
    }
  }

  public destroy() {
    this.splineVertexBuffer?.destroy();
    this.splineUniformBuffer?.destroy();
    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.bodyInstanceBuffer?.destroy();
    this.bodyUniformBuffer?.destroy();
  }
}
