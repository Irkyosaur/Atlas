// Location: atlas/client/src/lib/engine/dss_surface_pipeline.ts
// WebGPU Surface Cartography & Exobiology Pipeline (Task 3.4.1, 3.4.2, 3.4.3)

import { WGSL_DSS_SURFACE_SHADER, WGSL_EXOBIO_OVERLAY_SHADER } from '$shaders/dss_surface_shaders';

export interface ExobioSpecimen {
  genus: string; // e.g., 'Stratum Tectonicas', 'Tubus Compagibus', 'Fonticulua Campestris'
  species: string;
  minColonyDistanceMeters: number; // e.g. 500m or 800m
  colorHex: string;
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface PlanetarySurfaceParams {
  name: string;
  subType: string;
  radiusKm: number;
  gravityG: number;
  temperatureK: number;
  volcanism: string;
  atmosphere: string;
  landable: boolean;
  dssHeatmapActive: boolean;
  specimens: ExobioSpecimen[];
}

export const CANONICAL_EARTH_SURFACE: PlanetarySurfaceParams = {
  name: 'Earth',
  subType: 'Earth-like world',
  radiusKm: 6371.0,
  gravityG: 1.0,
  temperatureK: 288,
  volcanism: 'None',
  atmosphere: '100% Nitrogen/Oxygen mix',
  landable: false,
  dssHeatmapActive: true,
  specimens: [],
};

export const CANONICAL_LANDABLE_BIO_BODY: PlanetarySurfaceParams = {
  name: 'Achelous 3 a',
  subType: 'High metal content body',
  radiusKm: 2840.0,
  gravityG: 0.44,
  temperatureK: 242,
  volcanism: 'Minor water geysers',
  atmosphere: 'Thin Carbon Dioxide (0.02 atm)',
  landable: true,
  dssHeatmapActive: true,
  specimens: [
    {
      genus: 'Stratum',
      species: 'Stratum Tectonicas',
      minColonyDistanceMeters: 500,
      colorHex: '#00ffd5',
      latitudeDeg: 12.4,
      longitudeDeg: 45.2,
    },
    {
      genus: 'Tubus',
      species: 'Tubus Compagibus',
      minColonyDistanceMeters: 800,
      colorHex: '#ffaa00',
      latitudeDeg: -24.8,
      longitudeDeg: 112.5,
    },
    {
      genus: 'Fonticulua',
      species: 'Fonticulua Campestris',
      minColonyDistanceMeters: 500,
      colorHex: '#ff00aa',
      latitudeDeg: 38.6,
      longitudeDeg: -70.4,
    },
  ],
};

export class WebGPUDssSurfacePipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Planetary Sphere Resources
  private surfacePipeline: GPURenderPipeline | null = null;
  private sphereVertexBuffer: GPUBuffer | null = null;
  private sphereIndexBuffer: GPUBuffer | null = null;
  private surfaceUniformBuffer: GPUBuffer | null = null;
  private surfaceBindGroup: GPUBindGroup | null = null;
  private sphereIndexCount = 0;

  // Exobiology Overlay Ring Resources
  private exobioPipeline: GPURenderPipeline | null = null;
  private exobioVertexBuffer: GPUBuffer | null = null;
  private exobioUniformBuffer: GPUBuffer | null = null;
  private exobioBindGroup: GPUBindGroup | null = null;
  private exobioVertexCount = 0;

  private surfaceParams: PlanetarySurfaceParams = CANONICAL_LANDABLE_BIO_BODY;
  private rotationAngle = 0;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.initSurfacePipeline();
    this.initExobioPipeline();
    this.loadSurfaceParams(CANONICAL_LANDABLE_BIO_BODY);
  }

  private initSurfacePipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-DSS-Surface-WGSL',
      code: WGSL_DSS_SURFACE_SHADER,
    });

    // Create UV Sphere Geometry (64 latitude rings x 64 longitude slices)
    const { vertices, indices } = this.generateUvSphere(64, 64);
    this.sphereIndexCount = indices.length;

    this.sphereVertexBuffer = this.device.createBuffer({
      label: 'Atlas-DSS-Sphere-VertexBuffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.sphereVertexBuffer, 0, vertices.buffer);

    this.sphereIndexBuffer = this.device.createBuffer({
      label: 'Atlas-DSS-Sphere-IndexBuffer',
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.sphereIndexBuffer, 0, indices.buffer);

    // Uniform buffer (viewProj(64), camPos+time(16), center+radius(16), comp+dss+atmo+rot(16) = 112 bytes -> 128 bytes)
    this.surfaceUniformBuffer = this.device.createBuffer({
      label: 'Atlas-DSS-Surface-UniformBuffer',
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-DSS-Surface-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.surfaceBindGroup = this.device.createBindGroup({
      label: 'Atlas-DSS-Surface-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.surfaceUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-DSS-Surface-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.surfacePipeline = this.device.createRenderPipeline({
      label: 'Atlas-DSS-Surface-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 8 * 4, // 3 pos + 3 normal + 2 uv = 8 floats = 32 bytes
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
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
        cullMode: 'back',
      },
    });
  }

  private initExobioPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Exobio-Overlay-WGSL',
      code: WGSL_EXOBIO_OVERLAY_SHADER,
    });

    // Exobiology ring vertices (3 pos + 4 color + 1 radius + 1 pulse = 9 floats = 36 bytes)
    this.exobioVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Exobio-VertexBuffer',
      size: 1024 * 9 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.exobioUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Exobio-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Exobio-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.exobioBindGroup = this.device.createBindGroup({
      label: 'Atlas-Exobio-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.exobioUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Exobio-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.exobioPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Exobio-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 9 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color (rgba)
              { shaderLocation: 2, offset: 28, format: 'float32' }, // ringRadiusMeters
              { shaderLocation: 3, offset: 32, format: 'float32' }, // pulsePhase
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
                dstFactor: 'one-minus-src-alpha',
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

  private generateUvSphere(latSegments: number, lonSegments: number) {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= latSegments; lat++) {
      const theta = (lat * Math.PI) / latSegments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonSegments; lon++) {
        const phi = (lon * 2 * Math.PI) / lonSegments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        const u = 1 - lon / lonSegments;
        const v = lat / latSegments;

        // Position (unit sphere), Normal (same as position on unit sphere), UV
        vertices.push(x, y, z, x, y, z, u, v);
      }
    }

    for (let lat = 0; lat < latSegments; lat++) {
      for (let lon = 0; lon < lonSegments; lon++) {
        const first = lat * (lonSegments + 1) + lon;
        const second = first + lonSegments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  public loadSurfaceParams(params: PlanetarySurfaceParams) {
    this.surfaceParams = params;
    this.updateExobioGeometry(params.specimens, 18.0);
  }

  /**
   * Generates line-list circles on the surface mesh representing minimum colony distance
   * (e.g. 500m / 800m rings) to prevent invalid exobiological sampling (Task 3.4.3).
   */
  private updateExobioGeometry(specimens: ExobioSpecimen[], sphereRadius: number) {
    if (!this.exobioVertexBuffer || specimens.length === 0) {
      this.exobioVertexCount = 0;
      return;
    }

    const verts: number[] = [];
    const ringSegments = 32;

    for (let sIdx = 0; sIdx < specimens.length; sIdx++) {
      const spec = specimens[sIdx];
      const latRad = (spec.latitudeDeg * Math.PI) / 180.0;
      const lonRad = (spec.longitudeDeg * Math.PI) / 180.0;

      // Center of specimen colony on the sphere
      const cx = sphereRadius * Math.cos(latRad) * Math.cos(lonRad);
      const cy = sphereRadius * Math.sin(latRad);
      const cz = sphereRadius * Math.cos(latRad) * Math.sin(lonRad);

      const hex = spec.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      // Angular radius of the minimum colony distance circle
      // Scale 500m / 800m visually on the model
      const angRadius = (spec.minColonyDistanceMeters / 1000.0) * 0.08;

      // Perpendicular local basis vectors
      const up = [cx / sphereRadius, cy / sphereRadius, cz / sphereRadius];
      const tangent = Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const right = [
        up[1] * tangent[2] - up[2] * tangent[1],
        up[2] * tangent[0] - up[0] * tangent[2],
        up[0] * tangent[1] - up[1] * tangent[0],
      ];
      const fwd = [
        up[1] * right[2] - up[2] * right[1],
        up[2] * right[0] - up[0] * right[2],
        up[0] * right[1] - up[1] * right[0],
      ];

      for (let i = 0; i < ringSegments; i++) {
        const a1 = (i * 2 * Math.PI) / ringSegments;
        const a2 = ((i + 1) * 2 * Math.PI) / ringSegments;

        const p1x = cx + (Math.cos(a1) * right[0] + Math.sin(a1) * fwd[0]) * angRadius * sphereRadius;
        const p1y = cy + (Math.cos(a1) * right[1] + Math.sin(a1) * fwd[1]) * angRadius * sphereRadius;
        const p1z = cz + (Math.cos(a1) * right[2] + Math.sin(a1) * fwd[2]) * angRadius * sphereRadius;

        const p2x = cx + (Math.cos(a2) * right[0] + Math.sin(a2) * fwd[0]) * angRadius * sphereRadius;
        const p2y = cy + (Math.cos(a2) * right[1] + Math.sin(a2) * fwd[1]) * angRadius * sphereRadius;
        const p2z = cz + (Math.cos(a2) * right[2] + Math.sin(a2) * fwd[2]) * angRadius * sphereRadius;

        verts.push(p1x, p1y, p1z, r, g, b, 0.85, spec.minColonyDistanceMeters, sIdx);
        verts.push(p2x, p2y, p2z, r, g, b, 0.85, spec.minColonyDistanceMeters, sIdx);
      }
    }

    this.exobioVertexCount = verts.length / 9;
    const floatData = new Float32Array(verts);
    this.device.queue.writeBuffer(this.exobioVertexBuffer, 0, floatData.buffer, 0, floatData.byteLength);
  }

  public updateUniforms(
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    time: number
  ) {
    this.rotationAngle = time * 0.05;

    // Determine composition enum
    let compType = 1.0; // High Metal / Rocky default
    const sub = this.surfaceParams.subType.toLowerCase();
    if (sub.includes('earth') || sub.includes('water')) {
      compType = 0.0;
    } else if (sub.includes('icy')) {
      compType = 2.0;
    } else if (sub.includes('ammonia')) {
      compType = 3.0;
    }

    const atmoDensity = this.surfaceParams.atmosphere.toLowerCase().includes('thin') ? 0.35 : 0.85;

    const surfData = new Float32Array(32);
    surfData.set(viewProjMatrix, 0); // 0..15
    surfData[16] = cameraPosition[0];
    surfData[17] = cameraPosition[1];
    surfData[18] = cameraPosition[2];
    surfData[19] = time;
    surfData[20] = 0; // planetCenter.x
    surfData[21] = 0; // planetCenter.y
    surfData[22] = 0; // planetCenter.z
    surfData[23] = 18.0; // planetRadius
    surfData[24] = compType;
    surfData[25] = this.surfaceParams.dssHeatmapActive ? 1.0 : 0.0;
    surfData[26] = atmoDensity;
    surfData[27] = this.rotationAngle;

    if (this.surfaceUniformBuffer) {
      this.device.queue.writeBuffer(this.surfaceUniformBuffer, 0, surfData.buffer);
    }

    const exobioData = new Float32Array(32);
    exobioData.set(viewProjMatrix, 0);
    exobioData[16] = cameraPosition[0];
    exobioData[17] = cameraPosition[1];
    exobioData[18] = cameraPosition[2];
    exobioData[19] = time;

    if (this.exobioUniformBuffer) {
      this.device.queue.writeBuffer(this.exobioUniformBuffer, 0, exobioData.buffer);
    }
  }

  public render(passEncoder: GPURenderPassEncoder) {
    // 1. Render Planetary Surface Sphere with FBM Height Displacement & DSS Heatmap
    if (
      this.sphereIndexCount > 0 &&
      this.surfacePipeline &&
      this.surfaceBindGroup &&
      this.sphereVertexBuffer &&
      this.sphereIndexBuffer
    ) {
      passEncoder.setPipeline(this.surfacePipeline);
      passEncoder.setBindGroup(0, this.surfaceBindGroup);
      passEncoder.setVertexBuffer(0, this.sphereVertexBuffer);
      passEncoder.setIndexBuffer(this.sphereIndexBuffer, 'uint16');
      passEncoder.drawIndexed(this.sphereIndexCount, 1, 0, 0, 0);
    }

    // 2. Render Exobiology Overlay Rings (500m / 800m colony radius)
    if (
      this.exobioVertexCount > 0 &&
      this.exobioPipeline &&
      this.exobioBindGroup &&
      this.exobioVertexBuffer
    ) {
      passEncoder.setPipeline(this.exobioPipeline);
      passEncoder.setBindGroup(0, this.exobioBindGroup);
      passEncoder.setVertexBuffer(0, this.exobioVertexBuffer);
      passEncoder.draw(this.exobioVertexCount, 1, 0, 0);
    }
  }

  public destroy() {
    this.sphereVertexBuffer?.destroy();
    this.sphereIndexBuffer?.destroy();
    this.surfaceUniformBuffer?.destroy();
    this.exobioVertexBuffer?.destroy();
    this.exobioUniformBuffer?.destroy();
  }
}
