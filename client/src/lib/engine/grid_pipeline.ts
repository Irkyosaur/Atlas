// Location: atlas/client/src/lib/engine/grid_pipeline.ts
// WebGPU Render Pipeline for Galactic Reference Plane Grid (Y=0) & StalkBase (Task 2.3.2, 2.3.3)

import { WGSL_GRID_SHADER, WGSL_STALK_SHADER } from '$shaders/grid_shaders';

export interface StalkTarget {
  x: number;
  y: number;
  z: number;
  name: string;
}

export class WebGPUGridPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Grid Plane Resources
  private gridPipeline: GPURenderPipeline | null = null;
  private gridVertexBuffer: GPUBuffer | null = null;
  private gridIndexBuffer: GPUBuffer | null = null;
  private gridUniformBuffer: GPUBuffer | null = null;
  private gridBindGroup: GPUBindGroup | null = null;

  // Stalk Line Resources
  private stalkPipeline: GPURenderPipeline | null = null;
  private stalkVertexBuffer: GPUBuffer | null = null;
  private stalkUniformBuffer: GPUBuffer | null = null;
  private stalkBindGroup: GPUBindGroup | null = null;
  private stalkVertexCount = 0;

  // Selected Star Target for Stalk Projection
  private selectedStalk: StalkTarget | null = null;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.initGrid();
    this.initStalks();
  }

  private initGrid() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Grid-WGSL-Module',
      code: WGSL_GRID_SHADER,
    });

    // Huge quad covering the galaxy on Y=0 plane [-60000, 60000] LY
    const extent = 60000.0;
    const gridVertices = new Float32Array([
      -extent, 0.0, -extent,
       extent, 0.0, -extent,
       extent, 0.0,  extent,
      -extent, 0.0,  extent,
    ]);
    const gridIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);

    this.gridVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Grid-VertexBuffer',
      size: gridVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.gridVertexBuffer.getMappedRange()).set(gridVertices);
    this.gridVertexBuffer.unmap();

    this.gridIndexBuffer = this.device.createBuffer({
      label: 'Atlas-Grid-IndexBuffer',
      size: gridIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.gridIndexBuffer.getMappedRange()).set(gridIndices);
    this.gridIndexBuffer.unmap();

    // Uniform buffer (viewProj: 16 floats, camPos: 3 floats, time: 1 float, camOrigin: 3 floats, originShiftEnabled: 1 float = 24 floats -> padded to 32 floats = 128 bytes)
    this.gridUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Grid-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Grid-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.gridBindGroup = this.device.createBindGroup({
      label: 'Atlas-Grid-BindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.gridUniformBuffer },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Grid-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.gridPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Grid-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 3 * 4, // vec3<f32>
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

  private initStalks() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-Stalk-WGSL-Module',
      code: WGSL_STALK_SHADER,
    });

    // Stalk vertex buffer (supports vertical drop line + circular stalk base crosshair ring)
    // 3 floats pos + 4 floats color (rgba) = 7 floats per vertex (28 bytes)
    this.stalkVertexBuffer = this.device.createBuffer({
      label: 'Atlas-Stalk-VertexBuffer',
      size: 512 * 7 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.stalkUniformBuffer = this.device.createBuffer({
      label: 'Atlas-Stalk-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-Stalk-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.stalkBindGroup = this.device.createBindGroup({
      label: 'Atlas-Stalk-BindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.stalkUniformBuffer },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-Stalk-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.stalkPipeline = this.device.createRenderPipeline({
      label: 'Atlas-Stalk-RenderPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 7 * 4, // 28 bytes
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

  /**
   * Sets the selected star for perpendicular StalkBase projection
   */
  public setSelectedStar(star: StalkTarget | null) {
    this.selectedStalk = star;
    if (!star) {
      this.stalkVertexCount = 0;
      return;
    }

    this.updateStalkGeometry(star.x, star.y, star.z);
  }

  private updateStalkGeometry(x: number, y: number, z: number) {
    const vertices: number[] = [];

    // Helper to push a vertex with pos (x,y,z) and color (r,g,b,a)
    const pushVertex = (vx: number, vy: number, vz: number, r: number, g: number, b: number, a: number) => {
      vertices.push(vx, vy, vz, r, g, b, a);
    };

    // 1. Vertical Stalk Line: from star (x, y, z) dropping down to (x, 0, z) on reference plane
    // Neon Amber / Cyan vertical stem
    pushVertex(x, y, z, 1.0, 0.443, 0.0, 0.95);
    pushVertex(x, 0, z, 0.49, 0.96, 1.0, 0.85);

    // 2. Base crosshair ring on the Y=0 plane (StalkBase)
    const ringRadius = Math.max(15.0, Math.min(250.0, Math.abs(y) * 0.15 + 20.0));
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;

      const px1 = x + Math.cos(theta1) * ringRadius;
      const pz1 = z + Math.sin(theta1) * ringRadius;
      const px2 = x + Math.cos(theta2) * ringRadius;
      const pz2 = z + Math.sin(theta2) * ringRadius;

      pushVertex(px1, 0, pz1, 1.0, 0.443, 0.0, 0.7);
      pushVertex(px2, 0, pz2, 1.0, 0.443, 0.0, 0.7);
    }

    // 3. Coordinate cross marker at base center on Y=0
    const crossSize = ringRadius * 0.6;
    pushVertex(x - crossSize, 0, z, 0.49, 0.96, 1.0, 0.9);
    pushVertex(x + crossSize, 0, z, 0.49, 0.96, 1.0, 0.9);
    pushVertex(x, 0, z - crossSize, 0.49, 0.96, 1.0, 0.9);
    pushVertex(x, 0, z + crossSize, 0.49, 0.96, 1.0, 0.9);

    const vertexFloatData = new Float32Array(vertices);
    this.stalkVertexCount = vertices.length / 7;

    if (this.stalkVertexBuffer) {
      this.device.queue.writeBuffer(
        this.stalkVertexBuffer,
        0,
        vertexFloatData.buffer,
        0,
        vertexFloatData.byteLength
      );
    }
  }

  /**
   * Updates uniforms for Grid and Stalks
   */
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

    if (this.gridUniformBuffer) {
      this.device.queue.writeBuffer(this.gridUniformBuffer, 0, data.buffer);
    }
    if (this.stalkUniformBuffer) {
      this.device.queue.writeBuffer(this.stalkUniformBuffer, 0, data.buffer);
    }
  }

  /**
   * Renders Y=0 grid and StalkBase lines
   */
  public render(passEncoder: GPURenderPassEncoder, renderGrid = true, renderStalks = true) {
    if (renderGrid && this.gridPipeline && this.gridBindGroup && this.gridVertexBuffer && this.gridIndexBuffer) {
      passEncoder.setPipeline(this.gridPipeline);
      passEncoder.setBindGroup(0, this.gridBindGroup);
      passEncoder.setVertexBuffer(0, this.gridVertexBuffer);
      passEncoder.setIndexBuffer(this.gridIndexBuffer, 'uint16');
      passEncoder.drawIndexed(6, 1, 0, 0, 0);
    }

    if (renderStalks && this.stalkVertexCount > 0 && this.stalkPipeline && this.stalkBindGroup && this.stalkVertexBuffer) {
      passEncoder.setPipeline(this.stalkPipeline);
      passEncoder.setBindGroup(0, this.stalkBindGroup);
      passEncoder.setVertexBuffer(0, this.stalkVertexBuffer);
      passEncoder.draw(this.stalkVertexCount, 1, 0, 0);
    }
  }

  public getSelectedStar(): StalkTarget | null {
    return this.selectedStalk;
  }

  public destroy() {
    this.gridVertexBuffer?.destroy();
    this.gridIndexBuffer?.destroy();
    this.gridUniformBuffer?.destroy();
    this.stalkVertexBuffer?.destroy();
    this.stalkUniformBuffer?.destroy();
  }
}
