// Location: atlas/client/src/lib/engine/expedition_pipeline.ts
// WebGPU 4D Historical Expedition Path & Fleet Swarm Particle Tracer Engine (Stage 5.3)

import {
  WGSL_EXPEDITION_RIBBON_SHADER,
  WGSL_SWARM_PARTICLE_SHADER,
  WGSL_EXPEDITION_BEACON_SHADER,
  WGSL_EXPEDITION_STALK_SHADER,
} from '$shaders/expedition_shaders';
import {
  type Expedition,
  type ExpeditionWaypoint,
  calculateExpeditionProgress,
  type InterpolatedExpeditionState,
} from '$engine/expeditions';

export class WebGPUExpeditionPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // 1. Ribbon Route Pipeline
  private ribbonPipeline: GPURenderPipeline | null = null;
  private ribbonVertexBuffer: GPUBuffer | null = null;
  private ribbonIndexBuffer: GPUBuffer | null = null;
  private ribbonUniformBuffer: GPUBuffer | null = null;
  private ribbonBindGroup: GPUBindGroup | null = null;
  private ribbonIndexCount = 0;

  // 2. Swarm Particle Tracer Pipeline
  private swarmPipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private swarmInstanceBuffer: GPUBuffer | null = null;
  private swarmUniformBuffer: GPUBuffer | null = null;
  private swarmBindGroup: GPUBindGroup | null = null;
  private readonly swarmParticleCount = 1024;

  // 3. Basecamp Beacon Marker Pipeline
  private beaconPipeline: GPURenderPipeline | null = null;
  private beaconInstanceBuffer: GPUBuffer | null = null;
  private beaconUniformBuffer: GPUBuffer | null = null;
  private beaconBindGroup: GPUBindGroup | null = null;
  private beaconCount = 0;

  // 4. Basecamp Stalk Line Pipeline
  private stalkPipeline: GPURenderPipeline | null = null;
  private stalkVertexBuffer: GPUBuffer | null = null;
  private stalkUniformBuffer: GPUBuffer | null = null;
  private stalkBindGroup: GPUBindGroup | null = null;
  private stalkVertexCount = 0;

  // Playback & State
  private currentExpedition: Expedition | null = null;
  private playbackProgress = 0.0;
  private isVisible = true;
  private swarmSpreadLy = 28.0;
  private currentInterpolatedState: InterpolatedExpeditionState | null = null;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;

    this.initRibbonPipeline();
    this.initSwarmPipeline();
    this.initBeaconPipeline();
    this.initStalkPipeline();
  }

  // -------------------------------------------------------------------------
  // Pipeline Initialization
  // -------------------------------------------------------------------------

  private initRibbonPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Expedition-Ribbon-Shader',
      code: WGSL_EXPEDITION_RIBBON_SHADER,
    });

    // Vertex: 3 pos + 3 tan + 1 side + 1 progress + 4 color = 12 floats = 48 bytes
    this.ribbonVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Ribbon-VertexBuffer',
      size: 1024 * 12 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.ribbonIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Ribbon-IndexBuffer',
      size: 2048 * 2,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform: 16 mat + 3 cam + 1 time + 3 origin + 1 prog + 1 width + 1 glow + 2 pad = 28 floats (padded to 32 floats = 128 bytes)
    this.ribbonUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Ribbon-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Expedition-Ribbon-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.ribbonBindGroup = this.device.createBindGroup({
      label: 'Atlas-Expedition-Ribbon-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.ribbonUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Expedition-Ribbon-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.ribbonPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Expedition-Ribbon-Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 12 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // pos
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // tangent
              { shaderLocation: 2, offset: 24, format: 'float32' }, // side
              { shaderLocation: 3, offset: 28, format: 'float32' }, // progress
              { shaderLocation: 4, offset: 32, format: 'float32x4' }, // color
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
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
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

  private initSwarmPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Expedition-Swarm-Shader',
      code: WGSL_SWARM_PARTICLE_SHADER,
    });

    // Shared quad billboard (-1 to +1)
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Quad-VertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadVertexBuffer, 0, quadVertices.buffer);

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Quad-IndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadIndexBuffer, 0, quadIndices.buffer);

    // Uniform buffer: 16 mat + 3 cam + 1 time + 3 origin + 3 centroid + 3 fwd + 1 spread + 1 prog + 1 pad = 32 floats = 128 bytes
    this.swarmUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Swarm-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Instanced particle buffer: 1024 particles
    // Instance attributes: 3 offset + 1 phase + 4 color + 1 scale = 9 floats = 36 bytes per ship
    const swarmInstances = new Float32Array(this.swarmParticleCount * 9);
    for (let i = 0; i < this.swarmParticleCount; i++) {
      const idx = i * 9;
      // Exponential distribution around center: tight core with long slipstream tail
      const r = Math.pow(Math.random(), 2.0);
      const theta = Math.random() * Math.PI * 2.0;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      const ox = r * Math.cos(theta) * Math.cos(phi);
      const oy = r * Math.sin(phi) * 0.5;
      const oz = r * Math.sin(theta) * Math.cos(phi);

      swarmInstances[idx + 0] = ox;
      swarmInstances[idx + 1] = oy;
      swarmInstances[idx + 2] = oz;
      swarmInstances[idx + 3] = Math.random(); // phase

      // Warm amber / cyan / golden engine colors
      const colorType = Math.random();
      if (colorType < 0.65) {
        // Cobra amber-gold engine plume
        swarmInstances[idx + 4] = 1.0;
        swarmInstances[idx + 5] = 0.65 + Math.random() * 0.25;
        swarmInstances[idx + 6] = 0.15;
        swarmInstances[idx + 7] = 0.9;
      } else if (colorType < 0.85) {
        // Ion cyan drive
        swarmInstances[idx + 4] = 0.3;
        swarmInstances[idx + 5] = 0.85;
        swarmInstances[idx + 6] = 1.0;
        swarmInstances[idx + 7] = 0.85;
      } else {
        // High-energy white-gold leader drive
        swarmInstances[idx + 4] = 1.0;
        swarmInstances[idx + 5] = 0.95;
        swarmInstances[idx + 6] = 0.8;
        swarmInstances[idx + 7] = 1.0;
      }

      swarmInstances[idx + 8] = 0.6 + Math.random() * 0.8; // scale
    }

    this.swarmInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Swarm-InstanceBuffer',
      size: swarmInstances.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.swarmInstanceBuffer, 0, swarmInstances.buffer);

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Expedition-Swarm-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.swarmBindGroup = this.device.createBindGroup({
      label: 'Atlas-Expedition-Swarm-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.swarmUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Expedition-Swarm-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.swarmPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Expedition-Swarm-Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }], // quadPos
          },
          {
            arrayStride: 9 * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 1, offset: 0, format: 'float32x3' }, // particleOffset
              { shaderLocation: 2, offset: 12, format: 'float32' }, // particlePhase
              { shaderLocation: 3, offset: 16, format: 'float32x4' }, // particleColor
              { shaderLocation: 4, offset: 32, format: 'float32' }, // particleScale
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
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
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

  private initBeaconPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Expedition-Beacon-Shader',
      code: WGSL_EXPEDITION_BEACON_SHADER,
    });

    // Uniform buffer: 16 mat + 3 cam + 1 time + 3 origin + 1 activeIdx + 4 pad = 28 floats (padded to 32 floats = 128 bytes)
    this.beaconUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Beacon-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Instanced beacon buffer (up to 64 waypoints)
    // Attributes: 3 pos + 1 index + 1 status + 4 color = 9 floats = 36 bytes
    this.beaconInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Beacon-InstanceBuffer',
      size: 64 * 9 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Expedition-Beacon-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.beaconBindGroup = this.device.createBindGroup({
      label: 'Atlas-Expedition-Beacon-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.beaconUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Expedition-Beacon-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.beaconPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Expedition-Beacon-Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
          },
          {
            arrayStride: 9 * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 1, offset: 0, format: 'float32x3' }, // beaconPos
              { shaderLocation: 2, offset: 12, format: 'float32' }, // beaconIndex
              { shaderLocation: 3, offset: 16, format: 'float32' }, // beaconStatus
              { shaderLocation: 4, offset: 20, format: 'float32x4' }, // beaconColor
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
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
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
      label: 'Atlas-Expedition-Stalk-Shader',
      code: WGSL_EXPEDITION_STALK_SHADER,
    });

    this.stalkUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Stalk-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.stalkVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Expedition-Stalk-VertexBuffer',
      size: 128 * 7 * 4, // 64 stalks * 2 vertices * 7 floats
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Expedition-Stalk-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.stalkBindGroup = this.device.createBindGroup({
      label: 'Atlas-Expedition-Stalk-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.stalkUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Expedition-Stalk-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.stalkPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Expedition-Stalk-Pipeline',
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
              { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color
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
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
            writeMask: GPUColorWrite.ALL,
          },
        ],
      },
      primitive: {
        topology: 'line-list',
      },
    });
  }

  // -------------------------------------------------------------------------
  // Public Load & Update Methods
  // -------------------------------------------------------------------------

  public loadExpedition(expedition: Expedition) {
    this.currentExpedition = expedition;
    const waypoints = expedition.basecamps;
    if (!waypoints || waypoints.length < 2) {
      this.ribbonIndexCount = 0;
      this.beaconCount = 0;
      this.stalkVertexCount = 0;
      return;
    }

    // 1. Build Ribbon Geometry
    const n = waypoints.length;
    // Subdivide path for silky smooth curve across galactic distances
    const subdividedCoords: { x: number; y: number; z: number; progress: number }[] = [];
    
    // Calculate cumulative distances
    const cumulativeDist: number[] = [0];
    for (let i = 1; i < n; i++) {
      const p0 = waypoints[i - 1].coords;
      const p1 = waypoints[i].coords;
      cumulativeDist.push(cumulativeDist[i - 1] + Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z));
    }
    const totalDist = cumulativeDist[cumulativeDist.length - 1] || 1;

    for (let i = 0; i < n - 1; i++) {
      const p0 = waypoints[i].coords;
      const p1 = waypoints[i + 1].coords;
      const steps = Math.max(8, Math.min(32, Math.floor(Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z) / 400)));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const currentSegDist = cumulativeDist[i] + t * (cumulativeDist[i + 1] - cumulativeDist[i]);
        subdividedCoords.push({
          x: p0.x + (p1.x - p0.x) * t,
          y: p0.y + (p1.y - p0.y) * t,
          z: p0.z + (p1.z - p0.z) * t,
          progress: currentSegDist / totalDist,
        });
      }
    }
    // Add final waypoint
    const last = waypoints[n - 1].coords;
    subdividedCoords.push({ x: last.x, y: last.y, z: last.z, progress: 1.0 });

    const totalVerts = subdividedCoords.length * 2;
    const ribbonVerts = new Float32Array(totalVerts * 12);
    const ribbonIndices = new Uint16Array((subdividedCoords.length - 1) * 6);

    for (let i = 0; i < subdividedCoords.length; i++) {
      const curr = subdividedCoords[i];
      let tangent = { x: 0, y: 0, z: 1 };
      if (i < subdividedCoords.length - 1) {
        const next = subdividedCoords[i + 1];
        const dx = next.x - curr.x;
        const dy = next.y - curr.y;
        const dz = next.z - curr.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        tangent = { x: dx / len, y: dy / len, z: dz / len };
      } else if (i > 0) {
        const prev = subdividedCoords[i - 1];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dz = curr.z - prev.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        tangent = { x: dx / len, y: dy / len, z: dz / len };
      }

      // Left vertex (side = -1.0)
      const v0Idx = i * 2 * 12;
      ribbonVerts[v0Idx + 0] = curr.x;
      ribbonVerts[v0Idx + 1] = curr.y;
      ribbonVerts[v0Idx + 2] = curr.z;
      ribbonVerts[v0Idx + 3] = tangent.x;
      ribbonVerts[v0Idx + 4] = tangent.y;
      ribbonVerts[v0Idx + 5] = tangent.z;
      ribbonVerts[v0Idx + 6] = -1.0;
      ribbonVerts[v0Idx + 7] = curr.progress;
      ribbonVerts[v0Idx + 8] = 1.0; // R
      ribbonVerts[v0Idx + 9] = 0.72; // G (Amber)
      ribbonVerts[v0Idx + 10] = 0.15; // B
      ribbonVerts[v0Idx + 11] = 0.95; // A

      // Right vertex (side = +1.0)
      const v1Idx = (i * 2 + 1) * 12;
      ribbonVerts[v1Idx + 0] = curr.x;
      ribbonVerts[v1Idx + 1] = curr.y;
      ribbonVerts[v1Idx + 2] = curr.z;
      ribbonVerts[v1Idx + 3] = tangent.x;
      ribbonVerts[v1Idx + 4] = tangent.y;
      ribbonVerts[v1Idx + 5] = tangent.z;
      ribbonVerts[v1Idx + 6] = 1.0;
      ribbonVerts[v1Idx + 7] = curr.progress;
      ribbonVerts[v1Idx + 8] = 1.0;
      ribbonVerts[v1Idx + 9] = 0.72;
      ribbonVerts[v1Idx + 10] = 0.15;
      ribbonVerts[v1Idx + 11] = 0.95;

      if (i < subdividedCoords.length - 1) {
        const iIdx = i * 6;
        const i0 = i * 2;
        const i1 = i * 2 + 1;
        const i2 = (i + 1) * 2;
        const i3 = (i + 1) * 2 + 1;

        ribbonIndices[iIdx + 0] = i0;
        ribbonIndices[iIdx + 1] = i1;
        ribbonIndices[iIdx + 2] = i2;
        ribbonIndices[iIdx + 3] = i2;
        ribbonIndices[iIdx + 4] = i1;
        ribbonIndices[iIdx + 5] = i3;
      }
    }

    if (this.ribbonVertexBuffer) {
      this.device.queue.writeBuffer(this.ribbonVertexBuffer, 0, ribbonVerts.buffer);
    }
    if (this.ribbonIndexBuffer) {
      this.device.queue.writeBuffer(this.ribbonIndexBuffer, 0, ribbonIndices.buffer);
    }
    this.ribbonIndexCount = ribbonIndices.length;

    // 2. Build Basecamp Beacons & Stalks
    this.beaconCount = waypoints.length;
    const beaconData = new Float32Array(this.beaconCount * 9);
    const stalkVerts = new Float32Array(this.beaconCount * 2 * 7);

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const bIdx = i * 9;
      beaconData[bIdx + 0] = wp.coords.x;
      beaconData[bIdx + 1] = wp.coords.y;
      beaconData[bIdx + 2] = wp.coords.z;
      beaconData[bIdx + 3] = i; // index
      beaconData[bIdx + 4] = 2.0; // initial future status
      beaconData[bIdx + 5] = 1.0;
      beaconData[bIdx + 6] = 0.65;
      beaconData[bIdx + 7] = 0.1;
      beaconData[bIdx + 8] = 0.9;

      // Stalk line: (x, 0, z) -> (x, y, z)
      const sIdx = i * 2 * 7;
      // Bottom at Y=0
      stalkVerts[sIdx + 0] = wp.coords.x;
      stalkVerts[sIdx + 1] = 0;
      stalkVerts[sIdx + 2] = wp.coords.z;
      stalkVerts[sIdx + 3] = 1.0;
      stalkVerts[sIdx + 4] = 0.55;
      stalkVerts[sIdx + 5] = 0.1;
      stalkVerts[sIdx + 6] = 0.4;
      // Top at system coords
      stalkVerts[sIdx + 7] = wp.coords.x;
      stalkVerts[sIdx + 8] = wp.coords.y;
      stalkVerts[sIdx + 9] = wp.coords.z;
      stalkVerts[sIdx + 10] = 1.0;
      stalkVerts[sIdx + 11] = 0.8;
      stalkVerts[sIdx + 12] = 0.2;
      stalkVerts[sIdx + 13] = 0.85;
    }

    if (this.beaconInstanceBuffer) {
      this.device.queue.writeBuffer(this.beaconInstanceBuffer, 0, beaconData.buffer);
    }
    if (this.stalkVertexBuffer) {
      this.device.queue.writeBuffer(this.stalkVertexBuffer, 0, stalkVerts.buffer);
    }
    this.stalkVertexCount = this.beaconCount * 2;

    this.setPlaybackProgress(this.playbackProgress);
  }

  public setPlaybackProgress(progress: number) {
    this.playbackProgress = Math.max(0.0, Math.min(1.0, progress));
    if (this.currentExpedition) {
      this.currentInterpolatedState = calculateExpeditionProgress(
        this.currentExpedition,
        this.playbackProgress
      );
    }
  }

  public getInterpolatedState(): InterpolatedExpeditionState | null {
    return this.currentInterpolatedState;
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
  }

  public setSwarmSpread(spreadLy: number) {
    this.swarmSpreadLy = Math.max(5.0, Math.min(150.0, spreadLy));
  }

  // -------------------------------------------------------------------------
  // Render Loop
  // -------------------------------------------------------------------------

  public render(
    pass: GPURenderPassEncoder,
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    origin: [number, number, number],
    time: number
  ) {
    if (!this.isVisible || !this.currentExpedition || this.ribbonIndexCount === 0) {
      return;
    }

    const state =
      this.currentInterpolatedState ||
      calculateExpeditionProgress(this.currentExpedition, this.playbackProgress);

    // 1. Update and Render Stalk Lines
    if (this.stalkPipeline && this.stalkUniformBuffer && this.stalkBindGroup && this.stalkVertexBuffer) {
      const stalkUniforms = new Float32Array(32);
      stalkUniforms.set(viewProjMatrix, 0); // 0-15
      stalkUniforms[16] = cameraPosition[0];
      stalkUniforms[17] = cameraPosition[1];
      stalkUniforms[18] = cameraPosition[2];
      stalkUniforms[19] = time;
      stalkUniforms[20] = origin[0];
      stalkUniforms[21] = origin[1];
      stalkUniforms[22] = origin[2];
      this.device.queue.writeBuffer(this.stalkUniformBuffer, 0, stalkUniforms.buffer);

      pass.setPipeline(this.stalkPipeline);
      pass.setBindGroup(0, this.stalkBindGroup);
      pass.setVertexBuffer(0, this.stalkVertexBuffer);
      pass.draw(this.stalkVertexCount);
    }

    // 2. Update and Render Ribbon Path
    if (
      this.ribbonPipeline &&
      this.ribbonUniformBuffer &&
      this.ribbonBindGroup &&
      this.ribbonVertexBuffer &&
      this.ribbonIndexBuffer
    ) {
      const ribbonUniforms = new Float32Array(32);
      ribbonUniforms.set(viewProjMatrix, 0); // 0-15
      ribbonUniforms[16] = cameraPosition[0];
      ribbonUniforms[17] = cameraPosition[1];
      ribbonUniforms[18] = cameraPosition[2];
      ribbonUniforms[19] = time;
      ribbonUniforms[20] = origin[0];
      ribbonUniforms[21] = origin[1];
      ribbonUniforms[22] = origin[2];
      ribbonUniforms[23] = this.playbackProgress;
      ribbonUniforms[24] = 8.0; // ribbon width in LY
      ribbonUniforms[25] = 1.35; // glow intensity
      this.device.queue.writeBuffer(this.ribbonUniformBuffer, 0, ribbonUniforms.buffer);

      pass.setPipeline(this.ribbonPipeline);
      pass.setBindGroup(0, this.ribbonBindGroup);
      pass.setVertexBuffer(0, this.ribbonVertexBuffer);
      pass.setIndexBuffer(this.ribbonIndexBuffer, 'uint16');
      pass.drawIndexed(this.ribbonIndexCount);
    }

    // 3. Update and Render Basecamp Beacons
    if (
      this.beaconPipeline &&
      this.beaconUniformBuffer &&
      this.beaconBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.beaconInstanceBuffer
    ) {
      const beaconUniforms = new Float32Array(32);
      beaconUniforms.set(viewProjMatrix, 0); // 0-15
      beaconUniforms[16] = cameraPosition[0];
      beaconUniforms[17] = cameraPosition[1];
      beaconUniforms[18] = cameraPosition[2];
      beaconUniforms[19] = time;
      beaconUniforms[20] = origin[0];
      beaconUniforms[21] = origin[1];
      beaconUniforms[22] = origin[2];
      beaconUniforms[23] = state.activeBasecampIndex;
      this.device.queue.writeBuffer(this.beaconUniformBuffer, 0, beaconUniforms.buffer);

      pass.setPipeline(this.beaconPipeline);
      pass.setBindGroup(0, this.beaconBindGroup);
      pass.setVertexBuffer(0, this.quadVertexBuffer);
      pass.setVertexBuffer(1, this.beaconInstanceBuffer);
      pass.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      pass.drawIndexed(6, this.beaconCount);
    }

    // 4. Update and Render Fleet Swarm Particles
    if (
      this.swarmPipeline &&
      this.swarmUniformBuffer &&
      this.swarmBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.swarmInstanceBuffer
    ) {
      const swarmUniforms = new Float32Array(32);
      swarmUniforms.set(viewProjMatrix, 0); // 0-15
      swarmUniforms[16] = cameraPosition[0];
      swarmUniforms[17] = cameraPosition[1];
      swarmUniforms[18] = cameraPosition[2];
      swarmUniforms[19] = time;
      swarmUniforms[20] = origin[0];
      swarmUniforms[21] = origin[1];
      swarmUniforms[22] = origin[2];
      swarmUniforms[23] = state.currentCoords.x;
      swarmUniforms[24] = state.currentCoords.y;
      swarmUniforms[25] = state.currentCoords.z;
      swarmUniforms[26] = state.forwardVector.x;
      swarmUniforms[27] = state.forwardVector.y;
      swarmUniforms[28] = state.forwardVector.z;
      swarmUniforms[29] = this.swarmSpreadLy;
      swarmUniforms[30] = this.playbackProgress;
      this.device.queue.writeBuffer(this.swarmUniformBuffer, 0, swarmUniforms.buffer);

      pass.setPipeline(this.swarmPipeline);
      pass.setBindGroup(0, this.swarmBindGroup);
      pass.setVertexBuffer(0, this.quadVertexBuffer);
      pass.setVertexBuffer(1, this.swarmInstanceBuffer);
      pass.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      pass.drawIndexed(6, this.swarmParticleCount);
    }
  }

  public destroy() {
    this.ribbonVertexBuffer?.destroy();
    this.ribbonIndexBuffer?.destroy();
    this.ribbonUniformBuffer?.destroy();

    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.swarmInstanceBuffer?.destroy();
    this.swarmUniformBuffer?.destroy();

    this.beaconInstanceBuffer?.destroy();
    this.beaconUniformBuffer?.destroy();

    this.stalkVertexBuffer?.destroy();
    this.stalkUniformBuffer?.destroy();
  }
}
