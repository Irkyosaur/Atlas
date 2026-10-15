// Location: atlas/client/src/lib/engine/poi_pipeline.ts
// WebGPU Render Pipeline for Points of Interest (POIs) and Generation Ships (Stage 5.4)

import { WGSL_POI_MARKER_SHADER, WGSL_POI_STALK_SHADER } from '$shaders/poi_shaders';
import type { PoiRecord, PoiCategory } from './poi_catalog';

function categoryToFloat(cat: PoiCategory): number {
  switch (cat) {
    case 'generation_ship':
      return 0.0;
    case 'guardian_structure':
    case 'guardian_ruins':
      return 1.0;
    case 'thargoid_surface_site':
    case 'thargoid_titan_remnant':
      return 2.0;
    case 'crashed_ship':
      return 3.0;
    case 'abandoned_settlement':
    case 'megaship':
    default:
      return 4.0;
  }
}

export class WebGPUPoiPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  // Marker Pipeline
  private markerPipeline: GPURenderPipeline | null = null;
  private quadVertexBuffer: GPUBuffer | null = null;
  private quadIndexBuffer: GPUBuffer | null = null;
  private markerInstanceBuffer: GPUBuffer | null = null;
  private markerUniformBuffer: GPUBuffer | null = null;
  private markerBindGroup: GPUBindGroup | null = null;
  private poiCount = 0;

  // Stalk Pipeline
  private stalkPipeline: GPURenderPipeline | null = null;
  private stalkVertexBuffer: GPUBuffer | null = null;
  private stalkUniformBuffer: GPUBuffer | null = null;
  private stalkBindGroup: GPUBindGroup | null = null;
  private stalkVertexCount = 0;

  private selectedPoiIdx: number = -1;
  private isVisible: boolean = true;
  private pois: PoiRecord[] = [];

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;

    this.initMarkerPipeline();
    this.initStalkPipeline();
  }

  private initMarkerPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Atlas-POI-Marker-WGSL',
      code: WGSL_POI_MARKER_SHADER,
    });

    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const quadIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Atlas-POI-QuadVertexBuffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadVertexBuffer, 0, quadVertices.buffer);

    this.quadIndexBuffer = this.device.createBuffer({
      label: 'Atlas-POI-QuadIndexBuffer',
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadIndexBuffer, 0, quadIndices.buffer);

    // Initial instance capacity for up to 512 POIs (quad billboard instances)
    // Layout: worldPos (3), poiCategory (1), poiIdx (1) = 5 floats = 20 bytes
    this.markerInstanceBuffer = this.device.createBuffer({
      label: 'Atlas-POI-InstanceBuffer',
      size: 512 * 5 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffer: mat4 (16) + vec3 (3) + pad (1) + vec3 (3) + pad (1) + time (1) + markerBaseSize (1) + selectedIdx (1) + pad (1) = 28 floats (padded to 32 floats = 128 bytes)
    this.markerUniformBuffer = this.device.createBuffer({
      label: 'Atlas-POI-UniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-POI-BindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.markerBindGroup = this.device.createBindGroup({
      label: 'Atlas-POI-BindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.markerUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-POI-PipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.markerPipeline = this.device.createRenderPipeline({
      label: 'Atlas-POI-MarkerPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          // Quad geometry (buffer 0)
          {
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
          // Instance data (buffer 1)
          {
            arrayStride: 5 * 4,
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 1, // worldPos (x, y, z)
                offset: 0,
                format: 'float32x3',
              },
              {
                shaderLocation: 2, // poiCategory
                offset: 3 * 4,
                format: 'float32',
              },
              {
                shaderLocation: 3, // poiIdx
                offset: 4 * 4,
                format: 'float32',
              },
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
      label: 'Atlas-POI-Stalk-WGSL',
      code: WGSL_POI_STALK_SHADER,
    });

    // 512 POIs * 2 vertices each * 6 floats = 6144 floats = ~24 KB
    this.stalkVertexBuffer = this.device.createBuffer({
      label: 'Atlas-POI-StalkVertexBuffer',
      size: 512 * 2 * 6 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Stalk uniforms: 32 floats (128 bytes)
    this.stalkUniformBuffer = this.device.createBuffer({
      label: 'Atlas-POI-StalkUniformBuffer',
      size: 32 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Atlas-POI-StalkBindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.stalkBindGroup = this.device.createBindGroup({
      label: 'Atlas-POI-StalkBindGroup',
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.stalkUniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Atlas-POI-StalkPipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.stalkPipeline = this.device.createRenderPipeline({
      label: 'Atlas-POI-StalkPipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 6 * 4,
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 0, // position (x, y, z)
                offset: 0,
                format: 'float32x3',
              },
              {
                shaderLocation: 1, // poiCategory
                offset: 3 * 4,
                format: 'float32',
              },
              {
                shaderLocation: 2, // isBase (0.0 = top, 1.0 = base)
                offset: 4 * 4,
                format: 'float32',
              },
              {
                shaderLocation: 3, // poiIdx
                offset: 5 * 4,
                format: 'float32',
              },
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
          },
        ],
      },
      primitive: {
        topology: 'line-list',
      },
    });
  }

  public setPois(pois: PoiRecord[]) {
    this.pois = pois;
    this.poiCount = pois.length;

    if (this.poiCount === 0) {
      this.stalkVertexCount = 0;
      return;
    }

    // 1. Populate Marker Instances (5 floats per POI)
    const instanceData = new Float32Array(this.poiCount * 5);
    for (let i = 0; i < this.poiCount; i++) {
      const p = pois[i];
      const offset = i * 5;
      instanceData[offset + 0] = p.coords.x;
      instanceData[offset + 1] = p.coords.y;
      instanceData[offset + 2] = p.coords.z;
      instanceData[offset + 3] = categoryToFloat(p.category);
      instanceData[offset + 4] = i;
    }

    if (this.markerInstanceBuffer) {
      if (instanceData.byteLength > this.markerInstanceBuffer.size) {
        this.markerInstanceBuffer.destroy();
        this.markerInstanceBuffer = this.device.createBuffer({
          label: 'Atlas-POI-InstanceBuffer',
          size: Math.max(instanceData.byteLength, 1024),
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
      }
      this.device.queue.writeBuffer(this.markerInstanceBuffer, 0, instanceData.buffer);
    }

    // 2. Populate Stalk Vertices (2 vertices per POI: [top, base])
    const stalkData = new Float32Array(this.poiCount * 2 * 6);
    let stalkIdx = 0;
    for (let i = 0; i < this.poiCount; i++) {
      const p = pois[i];
      const catFloat = categoryToFloat(p.category);

      // Vertex 0: At POI coordinate
      stalkData[stalkIdx + 0] = p.coords.x;
      stalkData[stalkIdx + 1] = p.coords.y;
      stalkData[stalkIdx + 2] = p.coords.z;
      stalkData[stalkIdx + 3] = catFloat;
      stalkData[stalkIdx + 4] = 0.0; // Top
      stalkData[stalkIdx + 5] = i;

      // Vertex 1: At Y=0 plane base
      stalkData[stalkIdx + 6] = p.coords.x;
      stalkData[stalkIdx + 7] = 0.0;
      stalkData[stalkIdx + 8] = p.coords.z;
      stalkData[stalkIdx + 9] = catFloat;
      stalkData[stalkIdx + 10] = 1.0; // Base
      stalkData[stalkIdx + 11] = i;

      stalkIdx += 12;
    }

    this.stalkVertexCount = this.poiCount * 2;

    if (this.stalkVertexBuffer) {
      if (stalkData.byteLength > this.stalkVertexBuffer.size) {
        this.stalkVertexBuffer.destroy();
        this.stalkVertexBuffer = this.device.createBuffer({
          label: 'Atlas-POI-StalkVertexBuffer',
          size: Math.max(stalkData.byteLength, 2048),
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
      }
      this.device.queue.writeBuffer(this.stalkVertexBuffer, 0, stalkData.buffer);
    }
  }

  public setSelectedPoi(id: string | null) {
    if (!id) {
      this.selectedPoiIdx = -1;
      return;
    }
    const idx = this.pois.findIndex((p) => p.id === id);
    this.selectedPoiIdx = idx;
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
  }

  public findNearestPoiToRay(
    rayOrigin: { x: number; y: number; z: number },
    rayDir: { x: number; y: number; z: number },
    thresholdDistanceLy = 450
  ): PoiRecord | null {
    if (!this.isVisible || this.pois.length === 0) return null;

    let closestPoi: PoiRecord | null = null;
    let minDistance = thresholdDistanceLy;

    for (const poi of this.pois) {
      const px = poi.coords.x - rayOrigin.x;
      const py = poi.coords.y - rayOrigin.y;
      const pz = poi.coords.z - rayOrigin.z;

      const proj = px * rayDir.x + py * rayDir.y + pz * rayDir.z;
      if (proj < 0) continue;

      const perpSq = px * px + py * py + pz * pz - proj * proj;
      const perpDist = Math.sqrt(Math.max(0, perpSq));

      if (perpDist < minDistance) {
        minDistance = perpDist;
        closestPoi = poi;
      }
    }

    return closestPoi;
  }

  public render(
    passEncoder: GPURenderPassEncoder,
    viewProjMatrix: Float32Array,
    cameraPos: { x: number; y: number; z: number } | [number, number, number],
    origin: { x: number; y: number; z: number } | [number, number, number],
    timeSec: number
  ) {
    if (!this.isVisible || this.poiCount === 0) return;

    const camX = Array.isArray(cameraPos) ? cameraPos[0] : cameraPos.x;
    const camY = Array.isArray(cameraPos) ? cameraPos[1] : cameraPos.y;
    const camZ = Array.isArray(cameraPos) ? cameraPos[2] : cameraPos.z;

    const orgX = Array.isArray(origin) ? origin[0] : origin.x;
    const orgY = Array.isArray(origin) ? origin[1] : origin.y;
    const orgZ = Array.isArray(origin) ? origin[2] : origin.z;

    // 1. Update Marker Uniforms
    const markerUniformData = new Float32Array(32);
    markerUniformData.set(viewProjMatrix, 0); // 16 floats
    markerUniformData[16] = camX;
    markerUniformData[17] = camY;
    markerUniformData[18] = camZ;
    markerUniformData[19] = 0.0; // pad

    markerUniformData[20] = orgX;
    markerUniformData[21] = orgY;
    markerUniformData[22] = orgZ;
    markerUniformData[23] = 0.0; // pad

    markerUniformData[24] = timeSec;
    markerUniformData[25] = 16.0; // base size
    markerUniformData[26] = this.selectedPoiIdx;
    markerUniformData[27] = 0.0; // pad

    if (this.markerUniformBuffer) {
      this.device.queue.writeBuffer(this.markerUniformBuffer, 0, markerUniformData.buffer);
    }

    // 2. Update Stalk Uniforms
    const stalkUniformData = new Float32Array(32);
    stalkUniformData.set(viewProjMatrix, 0);
    stalkUniformData[16] = camX;
    stalkUniformData[17] = camY;
    stalkUniformData[18] = camZ;
    stalkUniformData[19] = 0.0;

    stalkUniformData[20] = orgX;
    stalkUniformData[21] = orgY;
    stalkUniformData[22] = orgZ;
    stalkUniformData[23] = 0.0;

    stalkUniformData[24] = timeSec;
    stalkUniformData[25] = this.selectedPoiIdx;
    stalkUniformData[26] = 0.0;
    stalkUniformData[27] = 0.0;

    if (this.stalkUniformBuffer) {
      this.device.queue.writeBuffer(this.stalkUniformBuffer, 0, stalkUniformData.buffer);
    }

    // Render Stalks First (Behind markers)
    if (this.stalkPipeline && this.stalkBindGroup && this.stalkVertexBuffer && this.stalkVertexCount > 0) {
      passEncoder.setPipeline(this.stalkPipeline);
      passEncoder.setBindGroup(0, this.stalkBindGroup);
      passEncoder.setVertexBuffer(0, this.stalkVertexBuffer);
      passEncoder.draw(this.stalkVertexCount);
    }

    // Render Marker Billboard Quads
    if (
      this.markerPipeline &&
      this.markerBindGroup &&
      this.quadVertexBuffer &&
      this.quadIndexBuffer &&
      this.markerInstanceBuffer
    ) {
      passEncoder.setPipeline(this.markerPipeline);
      passEncoder.setBindGroup(0, this.markerBindGroup);
      passEncoder.setVertexBuffer(0, this.quadVertexBuffer);
      passEncoder.setVertexBuffer(1, this.markerInstanceBuffer);
      passEncoder.setIndexBuffer(this.quadIndexBuffer, 'uint16');
      passEncoder.drawIndexed(6, this.poiCount);
    }
  }

  public destroy() {
    this.quadVertexBuffer?.destroy();
    this.quadIndexBuffer?.destroy();
    this.markerInstanceBuffer?.destroy();
    this.markerUniformBuffer?.destroy();
    this.stalkVertexBuffer?.destroy();
    this.stalkUniformBuffer?.destroy();
  }
}
