// Atlas Keplerian Orbit Propagator & Coordinate Transformer
// Based on Elite Dangerous Odyssey 4.0 orbital telemetry specification

export interface KeplerianElements {
  semiMajorAxis: number;        // in meters
  eccentricity: number;         // 0.0 (circle) to < 1.0 (ellipse)
  inclination: number;          // degrees
  periapsis: number;            // argument of periapsis, degrees
  ascendingNode: number;        // longitude of ascending node, degrees
  meanAnomaly: number;          // degrees at epoch
  orbitalPeriod: number;        // in seconds
}

export interface OrbitVector3 {
  x: number;
  y: number;
  z: number;
}

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

/**
 * Solves Kepler's transcendental equation: M = E - e * sin(E)
 * using Newton-Raphson iteration with quadratic convergence.
 */
export function solveKepler(meanAnomalyRad: number, eccentricity: number, maxIterations = 10, tolerance = 1e-6): number {
  let E = meanAnomalyRad;
  for (let i = 0; i < maxIterations; i++) {
    const f = E - eccentricity * Math.sin(E) - meanAnomalyRad;
    const fPrime = 1.0 - eccentricity * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < tolerance) break;
  }
  return E;
}

/**
 * Calculates current real-time 3D Cartesian coordinates of an orbiting body.
 * @param elements Keplerian parameters from game Scan event
 * @param elapsedTimeSec Time delta in seconds from epoch
 * @param scaleFactor Distance scaling divisor (e.g. 1e9 for millions of km to web units)
 */
export function computeOrbitalPosition(
  elements: KeplerianElements,
  elapsedTimeSec: number = 0,
  scaleFactor: number = 1e9
): OrbitVector3 {
  const { semiMajorAxis: a, eccentricity: e, orbitalPeriod: T } = elements;

  // 1. Advance Mean Anomaly by elapsed time
  let meanAnomaly = elements.meanAnomaly;
  if (T > 0) {
    const meanMotion = (360.0 / T) * elapsedTimeSec;
    meanAnomaly = (meanAnomaly + meanMotion) % 360.0;
  }
  const M_rad = meanAnomaly * DEG_TO_RAD;

  // 2. Solve for Eccentric Anomaly E
  const E_rad = solveKepler(M_rad, e);

  // 3. True Anomaly coordinates in the orbital plane
  const scaledA = a / scaleFactor;
  const P = scaledA * (Math.cos(E_rad) - e);
  const Q = scaledA * Math.sin(E_rad) * Math.sqrt(Math.max(0, 1.0 - e * e));

  // 4. Orientation Euler angles (Ascending Node, Inclination, Argument of Periapsis)
  const i = elements.inclination * DEG_TO_RAD;
  const w = elements.periapsis * DEG_TO_RAD;
  const omega = elements.ascendingNode * DEG_TO_RAD;

  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosNode = Math.cos(omega);
  const sinNode = Math.sin(omega);
  const cosInc = Math.cos(i);
  const sinInc = Math.sin(i);

  // 5. 3D Space Transformation (Rotate into invariable reference plane)
  const x = P * (cosW * cosNode - sinW * cosInc * sinNode) - Q * (sinW * cosNode + cosW * cosInc * sinNode);
  const y = P * (sinW * sinInc) + Q * (cosW * sinInc);
  const z = P * (cosW * sinNode + sinW * cosInc * cosNode) - Q * (sinW * sinNode - cosW * cosInc * cosNode);

  return { x, y, z };
}

/**
 * Generates an array of 3D points forming the complete closed elliptical orbit spline.
 */
export function generateOrbitPath(elements: KeplerianElements, segments: number = 120, scaleFactor: number = 1e9): OrbitVector3[] {
  const points: OrbitVector3[] = [];
  const step = 360.0 / segments;
  for (let deg = 0; deg <= 360.0; deg += step) {
    const copy = { ...elements, meanAnomaly: deg };
    points.push(computeOrbitalPosition(copy, 0, scaleFactor));
  }
  return points;
}
