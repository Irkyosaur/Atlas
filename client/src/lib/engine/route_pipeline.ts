import { WGSL_ROUTE_RIBBON_SHADER, WGSL_WAYPOINT_NODE_SHADER } from '$shaders/route_shaders';
import { WGSL_NEUTRON_JET_SHADER } from '$shaders/neutron_jet_shaders';

export interface RouteWaypoint {
  systemName: string;
  x: number;
  y: number;
  z: number;
  jumpDistanceLy: number;
  totalDistanceLy: number;
  starClass: string;
  isScoopable: boolean;
  isNeutronBoost?: boolean;
  isRefuelStop?: boolean;
  isRepairStop?: boolean;
  fsdHealthPercent?: number;
  fuelConsumedTonnes: number;
  remainingFuelPercent: number;
}

export interface RoutePlotResult {
  origin: string;
  destination: string;
  totalDistanceLy: number;
  jumpCount: number;
  neutronBoostCount?: number;
  refuelStopCount?: number;
  repairStopCount?: number;
  finalFsdHealthPercent?: number;
  totalFuelTonnes: number;
  estimatedTravelTimeMin: number;
  waypoints: RouteWaypoint[];
}

export class WebGPURoutePipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Ribbon Pipeline
  private ribbonPipeline: GPURenderPipeline | null = null;
  private ribbonVertexBuffer: GPUBuffer | null = null;
  private ribbonIndexBuffer: GPUBuffer | null = null;
  private ribbonUniformBuffer: GPUBuffer | null = null;
  private ribbonBindGroup: GPUBindGroup | null = null;
  private ribbonIndexCount = 0;

  // Waypoint Node Pipeline
  private nodePipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private nodeInstanceBuffer: GPUBuffer | null = null;
  private nodeUniformBuffer: GPUBuffer | null = null;
  private nodeBindGroup: GPUBindGroup | null = null;
  private nodeCount = 0;

  // Task 4.2.2: Relativistic Jet Cone Pipeline for Neutron Stars & White Dwarfs
  private jetPipeline: GPURenderPipeline | null = null;
  private jetVertexBuffer: GPUBuffer | null = null;
  private jetIndexBuffer: GPUBuffer | null = null;
  private jetInstanceBuffer: GPUBuffer | null = null;
  private jetUniformBuffer: GPUBuffer | null = null;
  private jetBindGroup: GPUBindGroup | null = null;
  private jetIndexCount = 0;
  private jetInstanceCount = 0;

  private currentWaypoints: RouteWaypoint[] = [];

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.initRibbonPipeline();
    this.initNodePipeline();
    this.initJetPipeline();
  }

  private initRibbonPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Route-Ribbon-WGSL',
      code: WGSL_ROUTE_RIBBON_SHADER,
    });

    // Allocate vertex buffer for up to 500 waypoints (1000 vertices, 2 per segment)
    // Vertex: 3 pos + 3 tangent + 1 side + 1 progress + 4 color = 12 floats = 48 bytes
    this.ribbonVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Ribbon-VertexBuffer',
      size: 2048 * 12 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.ribbonIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Ribbon-IndexBuffer',
      size: 4096 * 2,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.ribbonUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Ribbon-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Route-Ribbon-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.ribbonBindGroup = this.device.createBindGroup({
      label: 'Atlas-Route-Ribbon-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.ribbonUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Route-Ribbon-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.ribbonPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Route-Ribbon-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 12 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
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
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one', // Additive neon glow
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

  private initNodePipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Route-Node-WGSL',
      code: WGSL_WAYPOINT_NODE_SHADER,
    });

    // Quad geometry (-1 to +1)
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const quadIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Node-QuadVertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadVertexBuffer, 0, quadVertices.buffer);

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Node-QuadIndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadIndexBuffer, 0, quadIndices.buffer);

    // Instance buffer: 3 pos + 4 color + 1 radius + 1 isFuelStop = 9 floats = 36 bytes
    this.nodeInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Node-InstanceBuffer',
      size: 512 * 9 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.nodeUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Route-Node-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Route-Node-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.nodeBindGroup = this.device.createBindGroup({
      label: 'Atlas-Route-Node-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.nodeUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Route-Node-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.nodePipeline = this.device.createRenderPipeline({
      label: 'Atlas-Route-Node-RenderPipeline',
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
              { shaderLocation: 1, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 2, offset: 12, format: 'float32x4' }, // color
              { shaderLocation: 3, offset: 28, format: 'float32' }, // radius
              { shaderLocation: 4, offset: 32, format: 'float32' }, // isFuelStop
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
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  }

  private initJetPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Neutron-Jet-WGSL',
      code: WGSL_NEUTRON_JET_SHADER,
    });

    // Generate unit cone mesh (apex at 0,0,0 extending to z=1.0)
    const { vertices, indices } = this.generateConeMesh(24);
    this.jetIndexCount = indices.length;

    this.jetVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Jet-VertexBuffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.jetVertexBuffer, 0, vertices.buffer);

    this.jetIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Jet-IndexBuffer',
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.jetIndexBuffer, 0, indices.buffer);

    // Instance buffer: centerPos(3) + jetAxis(3) + jetLength(1) + jetColor(4) + spinRate(1) = 12 floats = 48 bytes
    this.jetInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-Jet-InstanceBuffer',
      size: 128 * 12 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.jetUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Jet-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Jet-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.jetBindGroup = this.device.createBindGroup({
      label: 'Atlas-Jet-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.jetUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Jet-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.jetPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Jet-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 5 * 4, // 3 pos + 2 uv = 5 floats = 20 bytes
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12, format: 'float32x2' }, // uv
            ],
          },
          {
            arrayStride: 12 * 4, // instance data (48 bytes)
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 2, offset: 0, format: 'float32x3' },  // centerPos
              { shaderLocation: 3, offset: 12, format: 'float32x3' }, // jetAxis
              { shaderLocation: 4, offset: 24, format: 'float32' },   // jetLength
              { shaderLocation: 5, offset: 28, format: 'float32x4' }, // jetColor
              { shaderLocation: 6, offset: 44, format: 'float32' },   // spinRate
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
                dstFactor: 'one', // Additive plasma jet glow
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

  private generateConeMesh(segments: number) {
    const verts: number[] = [];
    const inds: number[] = [];

    // Apex at (0, 0, 0)
    verts.push(0, 0, 0, 0.5, 0);

    // Base ring vertices at z = 1.0
    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      verts.push(x, y, 1.0, i / segments, 1.0);
    }

    // Connect apex to base ring
    for (let i = 1; i <= segments; i++) {
      inds.push(0, i, i + 1);
    }

    return {
      vertices: new Float32Array(verts),
      indices: new Uint16Array(inds),
    };
  }

  public loadRoute(waypoints: RouteWaypoint[]) {
    this.currentWaypoints = waypoints;
    if (waypoints.length < 2) {
      this.ribbonIndexCount = 0;
      this.nodeCount = 0;
      this.jetInstanceCount = 0;
      return;
    }

    // 1. Build Ribbon Geometry connecting sequential jump waypoints
    const vertices: number[] = [];
    const indices: number[] = [];

    const totalJumps = waypoints.length - 1;

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const progress = i / totalJumps;

      // Compute tangent vector
      let tx = 0, ty = 0, tz = 1;
      if (i < totalJumps) {
        const next = waypoints[i + 1];
        tx = next.x - wp.x;
        ty = next.y - wp.y;
        tz = next.z - wp.z;
      } else {
        const prev = waypoints[i - 1];
        tx = wp.x - prev.x;
        ty = wp.y - prev.y;
        tz = wp.z - prev.z;
      }
      const len = Math.max(1e-5, Math.sqrt(tx * tx + ty * ty + tz * tz));
      tx /= len;
      ty /= len;
      tz /= len;

      // Color gradient: Electric Cyan (#00f3ff) -> Bright Amber (#ffaa00)
      const r = 0.0 + progress * 1.0;
      const g = 0.85 + progress * 0.15;
      const b = 1.0 - progress * 0.95;

      // Left vertex (side = -1)
      vertices.push(wp.x, wp.y, wp.z, tx, ty, tz, -1.0, progress, r, g, b, 0.9);
      // Right vertex (side = +1)
      vertices.push(wp.x, wp.y, wp.z, tx, ty, tz, 1.0, progress, r, g, b, 0.9);

      if (i < totalJumps) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 2, base + 1, base + 3);
      }
    }

    this.ribbonIndexCount = indices.length;
    if (this.ribbonVertexBuffer && this.ribbonIndexBuffer) {
      const vertFloat = new Float32Array(vertices);
      const indUint = new Uint16Array(indices);
      this.device.queue.writeBuffer(this.ribbonVertexBuffer, 0, vertFloat.buffer, 0, vertFloat.byteLength);
      this.device.queue.writeBuffer(this.ribbonIndexBuffer, 0, indUint.buffer, 0, indUint.byteLength);
    }

    // 2. Build Instanced Waypoint Nodes
    const nodeData: number[] = [];
    const jetData: number[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const isStart = i === 0;
      const isEnd = i === waypoints.length - 1;
      const radius = isStart || isEnd ? 35.0 : wp.isNeutronBoost ? 28.0 : 20.0;
      const isFuel = wp.isScoopable ? 1.0 : 0.0;

      // Start/End in vibrant green/amber, hops in bright cyan
      const r = isStart ? 0.2 : isEnd ? 1.0 : wp.isNeutronBoost ? 0.35 : 0.0;
      const g = isStart ? 1.0 : isEnd ? 0.7 : wp.isNeutronBoost ? 0.65 : 0.95;
      const b = isStart ? 0.3 : isEnd ? 0.1 : 1.0;

      nodeData.push(wp.x, wp.y, wp.z, r, g, b, 0.95, radius, isFuel);

      // Check if this waypoint is a Neutron Star or White Dwarf emitting relativistic jets (Task 4.2.2)
      const starUpper = wp.starClass.toUpperCase();
      const isNeutron = starUpper.includes('N') || starUpper.includes('NEUTRON') || wp.isNeutronBoost;
      const isWhiteDwarf = starUpper.startsWith('D') || starUpper.includes('WHITE DWARF');

      if (isNeutron || isWhiteDwarf) {
        // Emit bidirectional jets (+axis and -axis)
        const axisX = 0.2, axisY = 0.9, axisZ = 0.35;
        const norm = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
        const jx = axisX / norm, jy = axisY / norm, jz = axisZ / norm;

        const jetLen = isNeutron ? 55.0 : 30.0; // Neutron jets are longer
        const spin = isNeutron ? 4.5 : 1.2;     // Pulsar ultra-fast spin
        const jr = isNeutron ? 0.3 : 0.6;
        const jg = isNeutron ? 0.75 : 0.9;
        const jb = 1.0;

        // North pole jet
        jetData.push(wp.x, wp.y, wp.z, jx, jy, jz, jetLen, jr, jg, jb, 0.85, spin);
        // South pole jet (opposing direction)
        jetData.push(wp.x, wp.y, wp.z, -jx, -jy, -jz, jetLen, jr, jg, jb, 0.85, spin);
      }
    }

    this.nodeCount = waypoints.length;
    if (this.nodeInstanceBuffer) {
      const floatData = new Float32Array(nodeData);
      this.device.queue.writeBuffer(this.nodeInstanceBuffer, 0, floatData.buffer, 0, floatData.byteLength);
    }

    this.jetInstanceCount = jetData.length / 12;
    if (this.jetInstanceBuffer && jetData.length > 0) {
      const jetFloat = new Float32Array(jetData);
      this.device.queue.writeBuffer(this.jetInstanceBuffer, 0, jetFloat.buffer, 0, jetFloat.byteLength);
    }
  }

  public clearRoute() {
    this.currentWaypoints = [];
    this.ribbonIndexCount = 0;
    this.nodeCount = 0;
    this.jetInstanceCount = 0;
  }

  public updateUniforms(
    viewProjMatrix: Float32Array,
    cameraPosition: [number, number, number],
    origin: [number, number, number],
    time: number
  ) {
    const data = new Float32Array(32);
    data.set(viewProjMatrix, 0); // 0..15
    data[16] = cameraPosition[0];
    data[17] = cameraPosition[1];
    data[18] = cameraPosition[2];
    data[19] = time;
    data[20] = origin[0];
    data[21] = origin[1];
    data[22] = origin[2];
    data[23] = 1.8; // pulseSpeed
    data[24] = 8.0; // ribbonWidth in LY
    data[25] = 1.35; // glowIntensity

    if (this.ribbonUniformBuffer) {
      this.device.queue.writeBuffer(this.ribbonUniformBuffer, 0, data.buffer);
    }

    const nodeUniforms = new Float32Array(32);
    nodeUniforms.set(viewProjMatrix, 0);
    nodeUniforms[16] = cameraPosition[0];
    nodeUniforms[17] = cameraPosition[1];
    nodeUniforms[18] = cameraPosition[2];
    nodeUniforms[19] = time;
    nodeUniforms[20] = origin[0];
    nodeUniforms[21] = origin[1];
    nodeUniforms[22] = origin[2];

    if (this.nodeUniformBuffer) {
      this.device.queue.writeBuffer(this.nodeUniformBuffer, 0, nodeUniforms.buffer);
    }

    if (this.jetUniformBuffer) {
      this.device.queue.writeBuffer(this.jetUniformBuffer, 0, nodeUniforms.buffer);
    }
  }

  public render(passEncoder: GPURenderPassEncoder) {
    // 1. Render 3D glowing path ribbon
    if (
      this.ribbonIndexCount > 0 &&
      this.ribbonPipeline &&
      this.ribbonBindGroup &&
      this.ribbonVertexBuffer &&
      this.ribbonIndexBuffer
    ) {
      passEncoder.setPipeline(this.ribbonPipeline);
      passEncoder.setBindGroup(0, this.ribbonBindGroup);
      passEncoder.setVertexBuffer(0, this.ribbonVertexBuffer);
      passEncoder.setIndexBuffer(this.ribbonIndexBuffer, 'uint16');
      passEncoder.drawIndexed(this.ribbonIndexCount, 1, 0, 0, 0);
    }

    // 2. Render Relativistic Jet Cones for Neutron Stars & White Dwarfs (Task 4.2.2)
    if (
      this.jetInstanceCount > 0 &&
      this.jetPipeline &&
      this.jetBindGroup &&
      this.jetVertexBuffer &&
      this.jetIndexBuffer &&
      this.jetInstanceBuffer
    ) {
      passEncoder.setPipeline(this.jetPipeline);
      passEncoder.setBindGroup(0, this.jetBindGroup);
      passEncoder.setVertexBuffer(0, this.jetVertexBuffer);
      passEncoder.setVertexBuffer(1, this.jetInstanceBuffer);
      passEncoder.setIndexBuffer(this.jetIndexBuffer, 'uint16');
      passEncoder.drawIndexed(this.jetIndexCount, this.jetInstanceCount, 0, 0, 0);
    }

    // 3. Render Waypoint billboard nodes
    if (
      this.nodeCount > 0 &&
      this.nodePipeline &&
      this.nodeBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.nodeInstanceBuffer
    ) {
      passEncoder.setPipeline(this.nodePipeline);
      passEncoder.setBindGroup(0, this.nodeBindGroup);
      passEncoder.setVertexBuffer(0, this.quadVertexBuffer);
      passEncoder.setVertexBuffer(1, this.nodeInstanceBuffer);
      passEncoder.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      passEncoder.drawIndexed(6, this.nodeCount, 0, 0, 0);
    }
  }

  public destroy() {
    this.ribbonVertexBuffer?.destroy();
    this.ribbonIndexBuffer?.destroy();
    this.ribbonUniformBuffer?.destroy();
    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.nodeInstanceBuffer?.destroy();
    this.nodeUniformBuffer?.destroy();
    this.jetVertexBuffer?.destroy();
    this.jetIndexBuffer?.destroy();
    this.jetInstanceBuffer?.destroy();
    this.jetUniformBuffer?.destroy();
  }
}

