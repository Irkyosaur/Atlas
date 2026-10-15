// Location: atlas/client/src/lib/engine/morton.ts
// 3D Morton Code (Z-Order Curve) spatial indexing & bitwise utilities for Atlas Cartography

/**
 * Expands a 10-bit integer by inserting two zeros between consecutive bits.
 * Input: 10-bit integer in range [0, 1023]
 * Output: 30-bit integer with bits placed at positions 0, 3, 6, 9...
 */
export function part1By2(n: number): number {
  n = (n | 0) & 0x000003ff; // Mask 10 bits
  n = (n ^ (n << 16)) & 0xff0000ff;
  n = (n ^ (n << 8)) & 0x0300f00f;
  n = (n ^ (n << 4)) & 0x030c30c3;
  n = (n ^ (n << 2)) & 0x09249249;
  return n >>> 0;
}

/**
 * Compacts every 3rd bit starting from offset back into a contiguous 10-bit integer.
 */
export function compact1By2(n: number, offset: number): number {
  n = (n >>> offset) & 0x09249249;
  n = (n ^ (n >>> 2)) & 0x030c30c3;
  n = (n ^ (n >>> 4)) & 0x0300f00f;
  n = (n ^ (n >>> 8)) & 0xff0000ff;
  n = (n ^ (n >>> 16)) & 0x000003ff;
  return n;
}

/**
 * Encodes 3D integer coordinates [0..1023] into a 30-bit unsigned Morton code.
 */
export function encodeMorton3D(x: number, y: number, z: number): number {
  return (part1By2(x) | (part1By2(y) << 1) | (part1By2(z) << 2)) >>> 0;
}

/**
 * Decodes a 30-bit Morton code back into 3D integer coordinates [x, y, z].
 */
export function decodeMorton3D(code: number): [number, number, number] {
  const x = compact1By2(code, 0);
  const y = compact1By2(code, 1);
  const z = compact1By2(code, 2);
  return [x, y, z];
}

/**
 * Normalizes galactic coordinates (approx -50,000 to +50,000 LY) into [0, 1023] integer coordinates
 * for Morton spatial sorting.
 */
const GALAXY_MIN = -50000.0;
const GALAXY_MAX = 50000.0;
const GALAXY_SPAN = GALAXY_MAX - GALAXY_MIN;
const MORTON_RES = 1023.0;

export function galacticCoordsToMorton(x: number, y: number, z: number): number {
  const normX = Math.max(0, Math.min(1023, Math.floor(((x - GALAXY_MIN) / GALAXY_SPAN) * MORTON_RES)));
  const normY = Math.max(0, Math.min(1023, Math.floor(((y - GALAXY_MIN) / GALAXY_SPAN) * MORTON_RES)));
  const normZ = Math.max(0, Math.min(1023, Math.floor(((z - GALAXY_MIN) / GALAXY_SPAN) * MORTON_RES)));
  return encodeMorton3D(normX, normY, normZ);
}
