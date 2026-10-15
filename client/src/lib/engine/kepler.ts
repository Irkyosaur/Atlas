// Location: atlas/client/src/lib/engine/kepler.ts
// Atlas Keplerian Orbit Propagator, Coordinate Transformer, and Scale Normalization
// Compliant with Elite Dangerous telemetry & Task 3.2.1, 3.2.2, 3.2.4

export interface KeplerianElements {
  semiMajorAxis: number;        // in meters or km
  eccentricity: number;         // 0.0 (circle) to < 1.0 (ellipse)
  inclination: number;          // degrees
  periapsis: number;            // argument of periapsis (w), degrees
  ascendingNode: number;        // longitude of ascending node (Omega), degrees
  meanAnomaly: number;          // degrees at epoch (M_0)
  orbitalPeriod: number;        // in seconds
}

export interface OrbitVector3 {
  x: number;
  y: number;
  z: number;
}

export interface OrbitSplinePoint extends OrbitVector3 {
  trueAnomalyRad: number;
  alpha: number; // 0.0 to 1.0 fading toward anti-periapsis
}

const DEG_TO_RAD = Math.PI / 180.0;
const METERS_PER_AU = 1.495978707e11;

/**
 * Task 3.2.1: Solves Kepler's transcendental equation: M = E - e * sin(E)
 * using Newton-Raphson iteration converging within 10^-6 precision.
 */
export function solveKepler(
  meanAnomalyRad: number,
  eccentricity: number,
  maxIterations = 15,
  tolerance = 1e-6
): number {
  // Normalize mean anomaly to [0, 2*PI]
  let M = meanAnomalyRad % (2.0 * Math.PI);
  if (M < 0) M += 2.0 * Math.PI;

  // Initial guess
  let E = eccentricity > 0.8 ? Math.PI : M;

  for (let i = 0; i < maxIterations; i++) {
    const f = E - eccentricity * Math.sin(E) - M;
    const fPrime = 1.0 - eccentricity * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < tolerance) break;
  }
  return E;
}

/**
 * Task 3.2.4: Scale Normalization utilities
 * Implements logarithmic scaling for distances (AU) and planetary radii to prevent microscopic planets in massive systems.
 */
export function normalizeDistanceAU(distMeters: number, logarithmic = true): number {
  const distAu = distMeters / METERS_PER_AU;
  if (!logarithmic) return distAu * 50.0; // Linear scale
  // Logarithmic normalization: smooth mapping preserving relative ordering
  return Math.log10(Math.max(0.01, distAu) * 10.0 + 1.0) * 45.0;
}

export function normalizeRadiusKm(radiusKm: number, logarithmic = true): number {
  if (!logarithmic) return Math.max(0.5, radiusKm / 1000.0);
  // Log scale for planetary radius: Earth (~6371 km) maps to ~2.2 units, Jupiter (70k km) maps to ~4.5 units
  return Math.log10(Math.max(10.0, radiusKm)) * 0.95;
}

/**
 * Task 3.2.2: Compute 3D orbital state vectors from Semi-Major Axis (a),
 * Eccentricity (e), Orbital Inclination (i), Argument of Periapsis (w),
 * Longitude of Ascending Node (Omega), and Mean Anomaly (M_0).
 */
export function computeOrbitalPosition(
  elements: KeplerianElements,
  elapsedTimeSec = 0,
  useLogScale = true
): OrbitVector3 {
  const { semiMajorAxis: aMeters, eccentricity: e, orbitalPeriod: T } = elements;

  // 1. Advance Mean Anomaly by elapsed time
  let meanAnomalyDeg = elements.meanAnomaly;
  if (T > 0) {
    const meanMotionDegPerSec = (360.0 / T) * elapsedTimeSec;
    meanAnomalyDeg = (meanAnomalyDeg + meanMotionDegPerSec) % 360.0;
  }
  const M_rad = meanAnomalyDeg * DEG_TO_RAD;

  // 2. Solve for Eccentric Anomaly E
  const E_rad = solveKepler(M_rad, e);

  // 3. True Anomaly coordinates in the orbital plane
  const scaledA = normalizeDistanceAU(aMeters, useLogScale);
  const P = scaledA * (Math.cos(E_rad) - e);
  const Q = scaledA * Math.sin(E_rad) * Math.sqrt(Math.max(0, 1.0 - e * e));

  // 4. Orientation Euler angles
  const i = elements.inclination * DEG_TO_RAD;
  const w = elements.periapsis * DEG_TO_RAD;
  const omega = elements.ascendingNode * DEG_TO_RAD;

  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosNode = Math.cos(omega);
  const sinNode = Math.sin(omega);
  const cosInc = Math.cos(i);
  const sinInc = Math.sin(i);

  // 5. 3D Coordinate Transformation (Rotate into orbital reference plane)
  const x = P * (cosW * cosNode - sinW * cosInc * sinNode) - Q * (sinW * cosNode + cosW * cosInc * sinNode);
  const y = P * (sinW * sinInc) + Q * (cosW * sinInc);
  const z = P * (cosW * sinNode + sinW * cosInc * cosNode) - Q * (sinW * sinNode - cosW * cosInc * cosNode);

  return { x, y, z };
}

/**
 * Task 3.2.3: Generates an array of 3D points forming the closed elliptical orbit spline
 * with variable alpha fading toward the anti-periapsis (aphelion).
 */
export function generateOrbitPath(
  elements: KeplerianElements,
  segments = 128,
  useLogScale = true
): OrbitSplinePoint[] {
  const points: OrbitSplinePoint[] = [];
  const step = 360.0 / segments;

  for (let deg = 0; deg <= 360.0; deg += step) {
    const copy = { ...elements, meanAnomaly: deg };
    const pos = computeOrbitalPosition(copy, 0, useLogScale);

    // Calculate normalized angle from periapsis (0 to PI)
    const angleFromPeriapsisRad = Math.abs(((deg + 180) % 360 - 180) * DEG_TO_RAD);
    // Variable alpha fading toward anti-periapsis (periapsis = 0.95, anti-periapsis = 0.25)
    const alpha = 0.95 - (angleFromPeriapsisRad / Math.PI) * 0.70;

    points.push({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      trueAnomalyRad: deg * DEG_TO_RAD,
      alpha,
    });
  }
  return points;
}
