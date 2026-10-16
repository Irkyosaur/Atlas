// Location: atlas/client/src/lib/engine/volumetric_pipeline.ts
// WebGPU Render Pipeline for Raymarched Powerplay 2.0 Territory Bubbles & Titan Caustic Zones (Task 2.4.1, 2.4.2, 2.4.3)

import { WGSL_VOLUMETRIC_SHADER } from '$shaders/volumetric_shaders';

export interface PowerplayTerritory {
  id: string;
  leader: string;
  allegiance: 'Federation' | 'Empire' | 'Alliance' | 'Independent';
  center: [number, number, number];
  radiusLy: number;
  colorHex: string;
}

export interface TitanMaelstrom {
  id: string;
  name: string;
  system: string;
  center: [number, number, number];
  radiusLy: number;
}

// Canonical Powerplay 2.0 territory seeds across the core Bubble
export const POWERPLAY_2_SEEDS: PowerplayTerritory[] = [
  // Federation: Zachary Hudson (Sol), Felicia Winters (Rhea)
  {
    id: 'pp_hudson',
    leader: 'Zachary Hudson',
    allegiance: 'Federation',
    center: [0, 0, 0], // Sol
    radiusLy: 110,
    colorHex: '#ff3b30', // Federal Red
  },
  {
    id: 'pp_winters',
    leader: 'Felicia Winters',
    allegiance: 'Federation',
    center: [65, -15, -45], // Rhea
    radiusLy: 95,
    colorHex: '#ff9500', // Liberal Orange
  },
  // Empire: Arissa Lavigny-Duval (Kamadhenu), Aisling Duval (Cubeo), Denton Patreus (Eotienses)
  {
    id: 'pp_ald',
    leader: 'Arissa Lavigny-Duval',
    allegiance: 'Empire',
    center: [-15, -55, -125], // Kamadhenu
    radiusLy: 120,
    colorHex: '#af52de', // Imperial Purple
  },
  {
    id: 'pp_aisling',
    leader: 'Aisling Duval',
    allegiance: 'Empire',
    center: [-45, -85, -180], // Cubeo
    radiusLy: 105,
    colorHex: '#5ac8fa', // Imperial Cyan
  },
  {
    id: 'pp_patreus',
    leader: 'Denton Patreus',
    allegiance: 'Empire',
    center: [12, -40, -110], // Eotienses
    radiusLy: 85,
    colorHex: '#007aff', // Royal Blue
  },
  // Alliance: Edmund Mahon (Gateway)
  {
    id: 'pp_mahon',
    leader: 'Edmund Mahon',
    allegiance: 'Alliance',
    center: [-18, 55, 120], // Gateway
    radiusLy: 130,
    colorHex: '#34c759', // Alliance Green
  },
  // Independent: Li Yong-Rui (Lembava), Pranav Antal (Polevnic), Archon Delaine (Harma)
  {
    id: 'pp_lyr',
    leader: 'Li Yong-Rui',
    allegiance: 'Independent',
    center: [-28, -35, 75], // Lembava
    radiusLy: 115,
    colorHex: '#ffcc00', // Sirius Gold
  },
  {
    id: 'pp_delaine',
    leader: 'Archon Delaine',
    allegiance: 'Independent',
    center: [115, -35, -20], // Harma
    radiusLy: 75,
    colorHex: '#ff2d55', // Kumo Crimson
  },
];

// Historical & Active Thargoid Titan Maelstroms (All 8 Titans)
export const TITAN_MAELSTROM_SEEDS: TitanMaelstrom[] = [
  { id: 'titan_taranis', name: 'Titan Taranis', system: 'Hyades Sector FB-N b7-6', center: [-85.25, -60.125, -15.5], radiusLy: 20 },
  { id: 'titan_leigong', name: 'Titan Leigong', system: 'HIP 8887', center: [40.125, -80.25, -30.0], radiusLy: 18 },
  { id: 'titan_hadad', name: 'Titan Hadad', system: 'HIP 30377', center: [130.5, -50.0, 45.125], radiusLy: 20 },
  { id: 'titan_oya', name: 'Titan Oya', system: 'Cephei Sector BV-Y b4', center: [-65.25, 72.5, 12.125], radiusLy: 20 },
  { id: 'titan_indra', name: 'Titan Indra', system: 'HR 1358', center: [-45.125, -110.25, 5.0], radiusLy: 22 },
  { id: 'titan_thor', name: 'Titan Thor', system: 'Col 285 Sector IG-O c6-5', center: [60.0, -35.25, 110.5], radiusLy: 18 },
  { id: 'titan_raijin', name: 'Titan Raijin', system: 'Pegasi Sector JH-V c2-9', center: [110.25, -75.0, -85.125], radiusLy: 22 },
  { id: 'titan_cocijo', name: 'Titan Cocijo', system: 'Col 285 Sector BA-P c6-18', center: [-120.0, -45.125, 65.5], radiusLy: 20 },
];

export class WebGPUVolumetricPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private pipeline: GPURenderPipeline | null = null;
  private boundingBoxVertexBuffer: GPUBuffer | null = null;
  private boundingBoxIndexBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private sphereStorageBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  // Layer opacity state
  private powerplayOpacity = 1.0;
  private thargoidOpacity = 1.0;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.initPipeline();
    this.uploadSphereData();
  }

  private initPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Volumetric-WGSL-Module',
      code: WGSL_VOLUMETRIC_SHADER,
    });

    // Outer bounding volume cube covering the bubble region [-1000, 1000] LY
    const s = 1500.0;
    const boxVertices = new Float32Array([
      // Front face
      -s, -s,  s,
       s, -s,  s,
       s,  s,  s,
      -s,  s,  s,
      // Back face
      -s, -s, -s,
      -s,  s, -s,
       s,  s, -s,
       s, -s, -s,
      // Top face
      -s,  s, -s,
      -s,  s,  s,
       s,  s,  s,
       s,  s, -s,
      // Bottom face
      -s, -s, -s,
       s, -s, -s,
       s, -s,  s,
      -s, -s,  s,
      // Right face
       s, -s, -s,
       s,  s, -s,
       s,  s,  s,
       s, -s,  s,
      // Left face
      -s, -s, -s,
      -s, -s,  s,
      -s,  s,  s,
      -s,  s, -s,
    ]);

    const boxIndices = new Uint16Array([
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ]);

    this.boundingBoxVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Volumetric-Box-VertexBuffer',
      size: boxVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.boundingBoxVertexBuffer.getMappedRange()).set(boxVertices);
    this.boundingBoxVertexBuffer.unmap();

    this.boundingBoxIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Volumetric-Box-IndexBuffer',
      size: boxIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.boundingBoxIndexBuffer.getMappedRange()).set(boxIndices);
    this.boundingBoxIndexBuffer.unmap();

    // Uniform buffer: viewProj(16), invViewProj(16), camPos(3), time(1), camOrigin(3), ppOpacity(1), thargoidOpacity(1), originShiftEnabled(1), pad(2) = 44 floats (176 bytes) -> pad to 48 floats = 192 bytes
    this.uniformBuffer = this.device.createBuffer({
      label: 'Atlas-Volumetric-UniformBuffer',
      size: 48 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Sphere storage buffer: 32 spheres * (center:3, radius:1, color:3, volumeType:1 = 8 floats = 32 bytes) = 1024 bytes
    this.sphereStorageBuffer = this.device.createBuffer({
      label: 'Atlas-Volumetric-Spheres-StorageBuffer',
      size: 32 * 8 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Volumetric-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      label: 'Atlas-Volumetric-BindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.sphereStorageBuffer },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Volumetric-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      label: 'Atlas-Volumetric-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 3 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
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
              // Additive alpha blending for volumetric nebulae and powerplay bubbles
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
        cullMode: 'front', // Render back faces so camera inside the box still renders the volumes
      },
    });
  }

  private uploadSphereData() {
    if (!this.sphereStorageBuffer) return;

    // 32 spheres max, each is 8 floats: center(3), radius(1), color(3), volumeType(1)
    const data = new Float32Array(32 * 8);
    let index = 0;

    // 1. Powerplay 2.0 Territory Bubbles (volumeType = 0.0)
    for (const pp of POWERPLAY_2_SEEDS) {
      if (index >= 32) break;
      const offset = index * 8;
      const hex = pp.colorHex;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      data[offset + 0] = pp.center[0];
      data[offset + 1] = pp.center[1];
      data[offset + 2] = pp.center[2];
      data[offset + 3] = pp.radiusLy;
      data[offset + 4] = r;
      data[offset + 5] = g;
      data[offset + 6] = b;
      data[offset + 7] = 0.0; // Powerplay bubble

      index++;
    }

    // 2. Thargoid Titan Maelstrom Caustic Zones (volumeType = 1.0)
    for (const titan of TITAN_MAELSTROM_SEEDS) {
      if (index >= 32) break;
      const offset = index * 8;
      // Caustic bio-luminescent acid green (#51cf66)
      data[offset + 0] = titan.center[0];
      data[offset + 1] = titan.center[1];
      data[offset + 2] = titan.center[2];
      data[offset + 3] = titan.radiusLy;
      data[offset + 4] = 0.32;
      data[offset + 5] = 0.81;
      data[offset + 6] = 0.40;
      data[offset + 7] = 1.0; // Titan Caustic Zone

      index++;
    }

    this.device.queue.writeBuffer(this.sphereStorageBuffer, 0, data.buffer);
  }

  /**
   * Set layer opacity toggles (fades volumes smoothly in and out)
   */
  public setLayerOpacity(powerplay: boolean | number, thargoid: boolean | number) {
    this.powerplayOpacity = typeof powerplay === 'boolean' ? (powerplay ? 1.0 : 0.0) : powerplay;
    this.thargoidOpacity = typeof thargoid === 'boolean' ? (thargoid ? 1.0 : 0.0) : thargoid;
  }

  /**
   * Update uniforms
   */
  public updateUniforms(
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    time: number,
    cameraOrigin: [number, number, number] = [0, 0, 0],
    originShiftEnabled = true
  ) {
    if (!this.uniformBuffer) return;

    const data = new Float32Array(48);
    // 0..15: viewProjection
    data.set(viewProjMatrix, 0);

    // 16..31: invViewProj (reserved / identity)
    data[16] = 1; data[21] = 1; data[26] = 1; data[31] = 1;

    // 32..34: cameraPosition
    data[32] = cameraPosition[0];
    data[33] = cameraPosition[1];
    data[34] = cameraPosition[2];

    // 35: time
    data[35] = time;

    // 36..38: cameraOrigin
    data[36] = cameraOrigin[0];
    data[37] = cameraOrigin[1];
    data[38] = cameraOrigin[2];

    // 39: powerplayOpacity
    data[39] = this.powerplayOpacity;

    // 40: thargoidOpacity
    data[40] = this.thargoidOpacity;

    // 41: originShiftEnabled
    data[41] = originShiftEnabled ? 1.0 : 0.0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data.buffer);
  }

  public render(passEncoder: GPURenderPassEncoder) {
    if (this.powerplayOpacity <= 0.001 && this.thargoidOpacity <= 0.001) {
      return;
    }

    if (!this.pipeline || !this.bindGroup || !this.boundingBoxVertexBuffer || !this.boundingBoxIndexBuffer) {
      return;
    }

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.boundingBoxVertexBuffer);
    passEncoder.setIndexBuffer(this.boundingBoxIndexBuffer, 'uint16');

    // 36 indices = 12 triangles for the bounding cube
    passEncoder.drawIndexed(36, 1, 0, 0, 0);
  }

  public destroy() {
    this.boundingBoxVertexBuffer?.destroy();
    this.boundingBoxIndexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.sphereStorageBuffer?.destroy();
  }
}
