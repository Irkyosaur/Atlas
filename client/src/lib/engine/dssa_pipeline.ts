// Location: atlas/client/src/lib/engine/dssa_pipeline.ts
// WebGPU Render Pipeline for Deep Space Support Array (DSSA) Amber Beacons & Stalks (Stage 5.2)

import { WGSL_DSSA_BEACON_SHADER, WGSL_DSSA_STALK_SHADER } from '$shaders/dssa_shaders';
import type { DssaCarrier } from './dssa_registry';

export class WebGPUDssaPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Beacon Pipeline
  private beaconPipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private beaconInstanceBuffer: GPUBuffer | null = null;
  private beaconUniformBuffer: GPUBuffer | null = null;
  private beaconBindGroup: GPUBindGroup | null = null;
  private carrierCount = 0;

  // Stalk Pipeline
  private stalkPipeline: GPURenderPipeline | null = null;
  private stalkVertexBuffer: GPUBuffer | null = null;
  private stalkUniformBuffer: GPUBuffer | null = null;
  private stalkBindGroup: GPUBindGroup | null = null;
  private stalkVertexCount = 0;

  private selectedCarrierIdx: number = -1;
  private isVisible: boolean = true;
  private carriers: DssaCarrier[] = [];

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;

    this.initBeaconPipeline();
    this.initStalkPipeline();
  }

  private initBeaconPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-DSSA-Beacon-WGSL',
      code: WGSL_DSSA_BEACON_SHADER,
    });

    // Unit quad (-1 to +1)
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const quadIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-QuadVertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadVertexBuffer, 0, quadVertices.buffer);

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-QuadIndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadIndexBuffer, 0, quadIndices.buffer);

    // Initial instance buffer capacity: up to 256 carriers * 5 floats (20 bytes each)
    this.beaconInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-InstanceBuffer',
      size: 256 * 5 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffer: mat4 (16) + vec3 (3) + pad (1) + vec3 (3) + pad (1) + time (1) + beaconSize (1) + glowStrength (1) + selectedIdx (1) = 28 floats (padded to 32 floats = 128 bytes)
    this.beaconUniformBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-DSSA-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.beaconBindGroup = this.device.createBindGroup({
      label: 'Atlas-DSSA-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.beaconUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-DSSA-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.beaconPipeline = this.device.createRenderPipeline({
      label: 'Atlas-DSSA-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          // Buffer 0: Quad mesh (vec2)
          {
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
          },
          // Buffer 1: Instance data (pos: vec3, status: f32, carrierIdx: f32)
          {
            arrayStride: 5 * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 1, offset: 0, format: 'float32x3' },
              { shaderLocation: 2, offset: 3 * 4, format: 'float32' },
              { shaderLocation: 3, offset: 4 * 4, format: 'float32' },
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
                dstFactor: 'one', // High-contrast additive beacon glow
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

  private initStalkPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-DSSA-Stalk-WGSL',
      code: WGSL_DSSA_STALK_SHADER,
    });

    this.stalkVertexBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-StalkVertexBuffer',
      size: 512 * 4 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.stalkUniformBuffer = this.device.createBuffer({
      label: 'Atlas-DSSA-StalkUniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-DSSA-Stalk-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.stalkBindGroup = this.device.createBindGroup({
      label: 'Atlas-DSSA-Stalk-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.stalkUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-DSSA-Stalk-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.stalkPipeline = this.device.createRenderPipeline({
      label: 'Atlas-DSSA-StalkPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 4 * 4, // vec3 position + float alpha
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 3 * 4, format: 'float32' },
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

  public loadCarriers(carriers: DssaCarrier[]) {
    this.carriers = carriers;
    this.carrierCount = carriers.length;

    if (carriers.length === 0) {
      this.stalkVertexCount = 0;
      return;
    }

    // 1. Pack instance buffer: [x, y, z, status, carrierIdx]
    const instanceData = new Float32Array(carriers.length * 5);
    for (let i = 0; i < carriers.length; i++) {
      const c = carriers[i];
      const offset = i * 5;
      instanceData[offset + 0] = c.coords.x;
      instanceData[offset + 1] = c.coords.y;
      instanceData[offset + 2] = c.coords.z;
      instanceData[offset + 3] = c.operationalStatus === 'Operational' ? 1.0 : 0.5;
      instanceData[offset + 4] = i;
    }

    if (!this.beaconInstanceBuffer || this.beaconInstanceBuffer.size < instanceData.byteLength) {
      this.beaconInstanceBuffer?.destroy();
      this.beaconInstanceBuffer = this.device.createBuffer({
        label: 'Atlas-DSSA-InstanceBuffer',
        size: Math.max(instanceData.byteLength, 256 * 5 * 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    }
    this.device.queue.writeBuffer(this.beaconInstanceBuffer, 0, instanceData.buffer);

    // 2. Pack stalk lines (base at Y=0 -> carrier position)
    // 2 vertices per carrier * 4 floats (x, y, z, alpha)
    const stalkData = new Float32Array(carriers.length * 2 * 4);
    for (let i = 0; i < carriers.length; i++) {
      const c = carriers[i];
      const baseOffset = i * 8;
      // Vertex 0: Plane base (x, 0, z, alpha=0)
      stalkData[baseOffset + 0] = c.coords.x;
      stalkData[baseOffset + 1] = 0;
      stalkData[baseOffset + 2] = c.coords.z;
      stalkData[baseOffset + 3] = 0.0;

      // Vertex 1: Carrier world position (x, y, z, alpha=1)
      stalkData[baseOffset + 4] = c.coords.x;
      stalkData[baseOffset + 5] = c.coords.y;
      stalkData[baseOffset + 6] = c.coords.z;
      stalkData[baseOffset + 7] = 1.0;
    }

    this.stalkVertexCount = carriers.length * 2;
    if (!this.stalkVertexBuffer || this.stalkVertexBuffer.size < stalkData.byteLength) {
      this.stalkVertexBuffer?.destroy();
      this.stalkVertexBuffer = this.device.createBuffer({
        label: 'Atlas-DSSA-StalkVertexBuffer',
        size: Math.max(stalkData.byteLength, 512 * 4 * 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    }
    this.device.queue.writeBuffer(this.stalkVertexBuffer, 0, stalkData.buffer);
  }

  public setSelectedCarrier(carrier: DssaCarrier | null) {
    if (!carrier) {
      this.selectedCarrierIdx = -1;
      return;
    }
    this.selectedCarrierIdx = this.carriers.findIndex(
      (c) => c.callsign === carrier.callsign || c.name === carrier.name
    );
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
  }

  public updateUniforms(
    viewProjElements: Float32Array | number[],
    cameraPos: [number, number, number],
    origin: [number, number, number],
    timeSec: number,
    beaconScale = 120.0
  ) {
    if (!this.beaconUniformBuffer || !this.stalkUniformBuffer) return;

    // Beacon uniforms
    const uData = new Float32Array(32);
    for (let i = 0; i < 16; i++) uData[i] = viewProjElements[i];

    uData[16] = cameraPos[0];
    uData[17] = cameraPos[1];
    uData[18] = cameraPos[2];
    uData[19] = 0.0;

    uData[20] = origin[0];
    uData[21] = origin[1];
    uData[22] = origin[2];
    uData[23] = 0.0;

    uData[24] = timeSec;
    uData[25] = beaconScale;
    uData[26] = 1.25; // glowStrength
    uData[27] = this.selectedCarrierIdx;

    this.device.queue.writeBuffer(this.beaconUniformBuffer, 0, uData.buffer);

    // Stalk uniforms
    const sData = new Float32Array(32);
    for (let i = 0; i < 16; i++) sData[i] = viewProjElements[i];
    sData[16] = cameraPos[0];
    sData[17] = cameraPos[1];
    sData[18] = cameraPos[2];
    sData[19] = 0.0;
    sData[20] = origin[0];
    sData[21] = origin[1];
    sData[22] = origin[2];
    sData[23] = 0.0;
    sData[24] = timeSec;
    sData[25] = 0.85; // opacity

    this.device.queue.writeBuffer(this.stalkUniformBuffer, 0, sData.buffer);
  }

  public render(pass: GPURenderPassEncoder) {
    if (!this.isVisible || this.carrierCount === 0) return;

    // 1. Render Stalk Lines
    if (this.stalkPipeline && this.stalkBindGroup && this.stalkVertexBuffer && this.stalkVertexCount > 0) {
      pass.setPipeline(this.stalkPipeline);
      pass.setBindGroup(0, this.stalkBindGroup);
      pass.setVertexBuffer(0, this.stalkVertexBuffer);
      pass.draw(this.stalkVertexCount);
    }

    // 2. Render Instanced Amber Beacons
    if (
      this.beaconPipeline &&
      this.beaconBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.beaconInstanceBuffer
    ) {
      pass.setPipeline(this.beaconPipeline);
      pass.setBindGroup(0, this.beaconBindGroup);
      pass.setVertexBuffer(0, this.quadVertexBuffer);
      pass.setVertexBuffer(1, this.beaconInstanceBuffer);
      pass.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      pass.drawIndexed(6, this.carrierCount);
    }
  }

  public destroy() {
    this.beaconInstanceBuffer?.destroy();
    this.beaconUniformBuffer?.destroy();
    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.stalkVertexBuffer?.destroy();
    this.stalkUniformBuffer?.destroy();

    this.beaconInstanceBuffer = null;
    this.beaconUniformBuffer = null;
    this.stalkVertexBuffer = null;
    this.stalkUniformBuffer = null;
  }
}
