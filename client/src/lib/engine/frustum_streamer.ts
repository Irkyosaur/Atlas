// Location: atlas/client/src/lib/engine/frustum_streamer.ts
// 3D Bounding-Box Frustum Streamer with Octree / Boxel Caching & Spatial Camera Focus Listener
// Connects to Ananke via POST /api/cube-search (Task 2.2.1, 2.2.2, 2.2.3)

import { ananke, type SystemRecord } from '$engine/ananke_client';
import type { WebGPUStarPipeline } from '$engine/star_pipeline';

export interface BoxelCoord {
  bx: number;
  by: number;
  bz: number;
}

export interface FrustumStreamerConfig {
  boxelSize?: number; // Size in Light Years (default 50 LY)
  frustumRadius?: number; // Boxel search radius around camera focus (default 1)
  maxCachedChunks?: number; // Max boxel chunks retained in memory
  queryIntervalMs?: number; // Minimum interval between camera focus queries
}

export class FrustumStreamer {
  private starPipeline: WebGPUStarPipeline | null = null;
  private boxelSize: number;
  private frustumRadius: number;
  private maxCachedChunks: number;
  private queryIntervalMs: number;

  // Cache of fetched chunks: boxelKey -> SystemRecord[]
  private chunkCache = new Map<string, SystemRecord[]>();
  private activePendingQueries = new Set<string>();

  // Camera listener state
  private lastQueryPos: [number, number, number] = [Infinity, Infinity, Infinity];
  private lastQueryTime = 0;
  private abortController: AbortController | null = null;

  // Origin shift state
  private currentCameraOrigin: [number, number, number] = [0, 0, 0];
  private originShiftThreshold = 10000.0; // Origin shift when camera moves > 10,000 LY from origin

  constructor(config: FrustumStreamerConfig = {}) {
    this.boxelSize = config.boxelSize ?? 50.0;
    this.frustumRadius = config.frustumRadius ?? 1;
    this.maxCachedChunks = config.maxCachedChunks ?? 256;
    this.queryIntervalMs = config.queryIntervalMs ?? 150;
  }

  public setPipeline(pipeline: WebGPUStarPipeline | null) {
    this.starPipeline = pipeline;
  }

  /**
   * Spatial camera focus listener:
   * Called during renderLoop or camera update with the current camera focus/target position in galactic space.
   */
  public updateCameraFocus(camX: number, camY: number, camZ: number) {
    const now = performance.now();
    if (now - this.lastQueryTime < this.queryIntervalMs) {
      return;
    }

    // Origin-Shift calculation:
    // If camera moves beyond threshold from current origin, shift coordinate frame anchor
    const dxOrigin = camX - this.currentCameraOrigin[0];
    const dyOrigin = camY - this.currentCameraOrigin[1];
    const dzOrigin = camZ - this.currentCameraOrigin[2];
    const distToOriginSq = dxOrigin * dxOrigin + dyOrigin * dyOrigin + dzOrigin * dzOrigin;

    if (distToOriginSq > this.originShiftThreshold * this.originShiftThreshold) {
      this.currentCameraOrigin = [camX, camY, camZ];
      if (this.starPipeline) {
        this.starPipeline.setCameraOrigin(camX, camY, camZ, true);
      }
    }

    // Check if camera moved enough boxel units to warrant frustum boxel queries
    const dx = camX - this.lastQueryPos[0];
    const dy = camY - this.lastQueryPos[1];
    const dz = camZ - this.lastQueryPos[2];
    const distMovedSq = dx * dx + dy * dy + dz * dz;

    // If moved more than half a boxel (e.g. 25 LY)
    const moveThreshold = this.boxelSize * 0.5;
    if (distMovedSq < moveThreshold * moveThreshold) {
      return;
    }

    this.lastQueryPos = [camX, camY, camZ];
    this.lastQueryTime = now;

    this.streamFrustumBoxels(camX, camY, camZ);
  }

  /**
   * Streams 50 LY boxels around focus position via POST /api/cube-search
   */
  private async streamFrustumBoxels(centerX: number, centerY: number, centerZ: number) {
    const centerBx = Math.floor(centerX / this.boxelSize);
    const centerBy = Math.floor(centerY / this.boxelSize);
    const centerBz = Math.floor(centerZ / this.boxelSize);

    const radius = this.frustumRadius;
    const boxelsToFetch: Array<{ key: string; x: number; y: number; z: number }> = [];

    for (let rx = -radius; rx <= radius; rx++) {
      for (let ry = -radius; ry <= radius; ry++) {
        for (let rz = -radius; rz <= radius; rz++) {
          const bx = centerBx + rx;
          const by = centerBy + ry;
          const bz = centerBz + rz;
          const key = `boxel_${bx}_${by}_${bz}_${this.boxelSize}`;

          // Check if already in cache
          if (this.chunkCache.has(key)) {
            // Already cached; push into GPU buffer if needed
            const cached = this.chunkCache.get(key)!;
            if (this.starPipeline && cached.length > 0) {
              this.starPipeline.streamStarsChunk(key, cached);
            }
            continue;
          }

          if (this.activePendingQueries.has(key)) {
            continue;
          }

          const wx = bx * this.boxelSize + this.boxelSize * 0.5;
          const wy = by * this.boxelSize + this.boxelSize * 0.5;
          const wz = bz * this.boxelSize + this.boxelSize * 0.5;
          boxelsToFetch.push({ key, x: wx, y: wy, z: wz });
        }
      }
    }

    if (boxelsToFetch.length === 0) return;

    // Fetch up to 4 boxels concurrently to prevent overloading the network connection
    const concurrentBatches = boxelsToFetch.slice(0, 4);

    for (const b of concurrentBatches) {
      this.activePendingQueries.add(b.key);
      this.fetchBoxel(b.key, b.x, b.y, b.z);
    }
  }

  private async fetchBoxel(key: string, x: number, y: number, z: number) {
    try {
      const systems = await ananke.getCubeSystems(x, y, z, this.boxelSize);
      this.chunkCache.set(key, systems);

      // Stream into GPU vertex buffer with Morton ordering
      if (this.starPipeline && systems.length > 0) {
        this.starPipeline.streamStarsChunk(key, systems);
      }

      // Evict oldest entries if cache exceeds max
      if (this.chunkCache.size > this.maxCachedChunks) {
        const oldestKey = this.chunkCache.keys().next().value;
        if (oldestKey) {
          this.chunkCache.delete(oldestKey);
        }
      }
    } catch {
      // In offline / dev / headless environments or when Ananke isn't running, ignore or retry gracefully
    } finally {
      this.activePendingQueries.delete(key);
    }
  }

  public getOriginShift(): [number, number, number] {
    return [...this.currentCameraOrigin];
  }

  public getCachedBoxelsCount(): number {
    return this.chunkCache.size;
  }

  public destroy() {
    this.abortController?.abort();
    this.chunkCache.clear();
    this.activePendingQueries.clear();
    this.starPipeline = null;
  }
}
