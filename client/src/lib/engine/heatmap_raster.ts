// Location: atlas/client/src/lib/engine/heatmap_raster.ts
// Multi-resolution 1024x1024 density raster generator with galactic projection & density sampling

export interface GalacticHeatmapBounds {
  xMin: number;
  zMin: number;
  xMax: number;
  zMax: number;
}

// Canonical Elite Dangerous galactic coordinate bounding box in Light Years
// Sol is at (0, 0, 0), Sagittarius A* is at (25.2, -20.9, 25899.99), Beagle Point at (-1111.56, -134.22, 65279.34)
export const CANONICAL_GALAXY_BOUNDS: GalacticHeatmapBounds = {
  xMin: -45000.0,
  zMin: -15000.0,
  xMax: 45000.0,
  zMax: 70000.0,
};

/**
 * Procedural model of galactic stellar distribution:
 * - Galactic Bar / Bulge around Sgr A* (0, 25900)
 * - Exponential thin & thick disk profile
 * - 4 Logarithmic Spiral arms (Scutum-Centaurus, Perseus, Norma, Sagittarius)
 * - Bubble high-density traffic hub around Sol (0, 0)
 * - Colonia Highway waypoints & Colonia mini-hub (-9530, 19800)
 */
export function estimateGalacticDensity(xLY: number, zLY: number): number {
  // Sgr A* coordinates
  const sgrX = 25.2;
  const sgrZ = 25899.99;

  // 1. Core Bulge & Supermassive black hole density
  const dxCore = xLY - sgrX;
  const dzCore = zLY - sgrZ;
  const distToCore = Math.sqrt(dxCore * dxCore + dzCore * dzCore);
  
  // Core profile (extremely dense within 3,500 LY, tapering to 12,000 LY)
  const coreDensity = Math.exp(-distToCore / 2800.0) * 1.0 + Math.exp(-distToCore / 8000.0) * 0.45;

  // 2. Exponential Galactic Disk profile
  const diskDensity = Math.exp(-distToCore / 16000.0) * 0.35;

  // 3. Logarithmic Spiral Arms
  const angle = Math.atan2(dzCore, dxCore);
  const logDist = Math.log(Math.max(100.0, distToCore) / 3000.0);
  const arm1 = Math.cos(2.0 * angle - 2.8 * logDist);
  const arm2 = Math.cos(2.0 * angle - 2.8 * logDist + Math.PI);
  const armVal = Math.max(0, arm1, arm2);
  const spiralArmBoost = Math.pow(armVal, 3.0) * 0.28 * Math.exp(-distToCore / 28000.0);

  // 4. Human Inhabited Bubble Hub (Sol 0, 0)
  const distToSol = Math.sqrt(xLY * xLY + zLY * zLY);
  const bubbleBoost = Math.exp(-distToSol / 450.0) * 0.85 + Math.exp(-distToSol / 1500.0) * 0.35;

  // 5. Colonia Mini-Hub (-9530, 19800)
  const dxColonia = xLY - (-9530.0);
  const dzColonia = zLY - 19800.0;
  const distToColonia = Math.sqrt(dxColonia * dxColonia + dzColonia * dzColonia);
  const coloniaBoost = Math.exp(-distToColonia / 400.0) * 0.75 + Math.exp(-distToColonia / 1200.0) * 0.25;

  // 6. Deep Space Exploration Corridors (Colonia Highway & Beagle Point route)
  // Distance to line from Sol (0,0) to Colonia (-9530, 19800)
  const px = -9530.0;
  const pz = 19800.0;
  const lineLenSq = px * px + pz * pz;
  const tCol = Math.max(0, Math.min(1, (xLY * px + zLY * pz) / lineLenSq));
  const projX = tCol * px;
  const projZ = tCol * pz;
  const distToHighway = Math.sqrt((xLY - projX) * (xLY - projX) + (zLY - projZ) * (zLY - projZ));
  const highwayBoost = Math.exp(-distToHighway / 300.0) * 0.15;

  // Combined normalized density [0.0 .. 1.0]
  const totalDensity = coreDensity + diskDensity + spiralArmBoost + bubbleBoost + coloniaBoost + highwayBoost;
  return Math.min(1.0, Math.max(0.0, totalDensity));
}

/**
 * Calculates estimated star count per cubic kiloparsec (kpc^3)
 * Real Milky Way: ~0.004 to 0.14 stars / pc^3 in solar neighborhood (~4M - 140M stars / kpc^3)
 * Core reaches > 1,000,000 stars / pc^3
 */
export function estimateStarsPerCubicKiloparsec(xLY: number, yLY: number, zLY: number): number {
  const normDensity = estimateGalacticDensity(xLY, zLY);
  // Scale exponentially with vertical disk scale height (~1,000 LY / 300 pc)
  const verticalScale = Math.exp(-Math.abs(yLY) / 950.0);
  
  // Baseline density: 10,000 to 500,000,000 stars / kpc^3
  const minStars = 5_000;
  const maxStars = 850_000_000;
  const stars = (minStars + Math.pow(normDensity, 2.2) * (maxStars - minStars)) * verticalScale;
  return Math.round(stars);
}

/**
 * Generates a high-precision 1024x1024 Uint8Array RGBA raster buffer
 * Each pixel stores normalized density in R channel (and G/B for diagnostics/inferno preview)
 */
export function generateProceduralHeatmapRaster(
  width = 1024,
  height = 1024,
  bounds = CANONICAL_GALAXY_BOUNDS
): Uint8Array {
  const buffer = new Uint8Array(width * height * 4);
  const xSpan = bounds.xMax - bounds.xMin;
  const zSpan = bounds.zMax - bounds.zMin;

  for (let py = 0; py < height; py++) {
    // Invert Y coordinate so top of texture maps to +Z (Beagle Point)
    const normV = 1.0 - py / (height - 1);
    const zLY = bounds.zMin + normV * zSpan;

    for (let px = 0; px < width; px++) {
      const normU = px / (width - 1);
      const xLY = bounds.xMin + normU * xSpan;

      const density = estimateGalacticDensity(xLY, zLY);
      const val = Math.min(255, Math.floor(density * 255));

      const idx = (py * width + px) * 4;
      buffer[idx + 0] = val; // R: Raw density
      buffer[idx + 1] = Math.floor(Math.pow(density, 1.5) * 220); // G: Mid tones
      buffer[idx + 2] = Math.floor(Math.pow(density, 3.0) * 180); // B: High peaks
      buffer[idx + 3] = 255; // A: Opaque
    }
  }

  return buffer;
}
