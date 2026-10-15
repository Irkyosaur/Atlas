// Location: atlas/client/src/lib/engine/ephemeris.ts
// Atlas Julian Date & Astronomical Ephemeris Engine (Task 3.3.2, 3.3.3)
// Synchronized with Elite Dangerous game epoch (1286-year offset, currently 3310+)

import { type KeplerianElements, computeOrbitalPosition } from '$engine/kepler';
import type { OrreryBody } from '$engine/orrery_pipeline';

/**
 * Standard Elite Dangerous year offset: Current Real Year + 1286.
 * (e.g. 2026 CE -> 3312 In-Game Year)
 */
export const ED_YEAR_OFFSET = 1286;

/**
 * Converts a standard JavaScript Date (or in-game timestamp) to Julian Date (JD).
 */
export function dateToJulianDate(date: Date): number {
  const time = date.getTime();
  // JD 2440587.5 is 1970-01-01T00:00:00Z
  return time / 86400000.0 + 2440587.5;
}

/**
 * Converts a Julian Date (JD) back to a JavaScript Date object.
 */
export function julianDateToDate(jd: number): Date {
  const millis = (jd - 2440587.5) * 86400000.0;
  return new Date(millis);
}

/**
 * Formats a Julian Date into an Elite Dangerous in-game timestamp string:
 * "3312-10-15 04:52:00"
 */
export function formatInGameDate(jd: number): {
  gameDateString: string;
  gameYear: number;
  month: string;
  day: number;
  timeString: string;
  jdString: string;
} {
  const realDate = julianDateToDate(jd);
  const gameYear = realDate.getUTCFullYear() + ED_YEAR_OFFSET;
  const month = String(realDate.getUTCMonth() + 1).padStart(2, '0');
  const day = realDate.getUTCDate();
  const dayStr = String(day).padStart(2, '0');
  const hours = String(realDate.getUTCHours()).padStart(2, '0');
  const minutes = String(realDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(realDate.getUTCSeconds()).padStart(2, '0');

  return {
    gameDateString: `${gameYear}.${month}.${dayStr}`,
    gameYear,
    month,
    day,
    timeString: `${hours}:${minutes}:${seconds} UTC`,
    jdString: `JD ${jd.toFixed(4)}`,
  };
}

export interface CelestialAlignment {
  bodyA: string;
  bodyB: string;
  type: 'conjunction' | 'opposition' | 'eclipse';
  angularSeparationDeg: number;
  description: string;
  intensity: number; // 0.0 to 1.0 (closeness of alignment)
}

/**
 * Task 3.3.3: Celestial Alignment & Eclipse Detector
 * Analyzes relative positions of planetary bodies relative to the primary star (at 0,0,0)
 * and detects conjunctions, syzygies, and eclipse occlusion windows.
 */
export function detectAlignments(
  bodies: OrreryBody[],
  elapsedSimTimeSec: number,
  maxAngularToleranceDeg = 4.5
): CelestialAlignment[] {
  const alignments: CelestialAlignment[] = [];
  const planets = bodies.filter((b) => !b.isStar && b.keplerian);

  if (planets.length < 2) return alignments;

  // Compute 3D position vector for each planet at this simulation epoch
  const planetPositions = planets.map((p) => {
    const pos = computeOrbitalPosition(p.keplerian!, elapsedSimTimeSec, true);
    const mag = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    return {
      body: p,
      pos,
      mag: Math.max(1e-5, mag),
      // Unit direction from star
      dir: {
        x: pos.x / Math.max(1e-5, mag),
        y: pos.y / Math.max(1e-5, mag),
        z: pos.z / Math.max(1e-5, mag),
      },
    };
  });

  // Pairwise angular separation check from the perspective of the primary star (conjunction)
  for (let i = 0; i < planetPositions.length; i++) {
    for (let j = i + 1; j < planetPositions.length; j++) {
      const p1 = planetPositions[i];
      const p2 = planetPositions[j];

      // Dot product of direction vectors
      const dot = p1.dir.x * p2.dir.x + p1.dir.y * p2.dir.y + p1.dir.z * p2.dir.z;
      const clampedDot = Math.max(-1.0, Math.min(1.0, dot));
      const angleRad = Math.acos(clampedDot);
      const angleDeg = (angleRad * 180.0) / Math.PI;

      // Conjunction: both bodies along the same radial vector from the star
      if (angleDeg < maxAngularToleranceDeg) {
        const closer = p1.mag < p2.mag ? p1.body.name : p2.body.name;
        const further = p1.mag < p2.mag ? p2.body.name : p1.body.name;
        const isCloseTransit = angleDeg < 1.0;

        alignments.push({
          bodyA: closer,
          bodyB: further,
          type: isCloseTransit ? 'eclipse' : 'conjunction',
          angularSeparationDeg: angleDeg,
          description: isCloseTransit
            ? `${closer} in solar transit / eclipse alignment with ${further}`
            : `Radial planetary conjunction between ${closer} & ${further} (${angleDeg.toFixed(1)}°)`,
          intensity: 1.0 - angleDeg / maxAngularToleranceDeg,
        });
      }

      // Opposition / Syzygy: bodies on exact opposite sides of the star (angle close to 180 deg)
      const oppositionAngle = Math.abs(180.0 - angleDeg);
      if (oppositionAngle < maxAngularToleranceDeg * 0.75) {
        alignments.push({
          bodyA: p1.body.name,
          bodyB: p2.body.name,
          type: 'opposition',
          angularSeparationDeg: oppositionAngle,
          description: `Bipolar Syzygy: ${p1.body.name} - Sol - ${p2.body.name} collinear opposition`,
          intensity: 1.0 - oppositionAngle / (maxAngularToleranceDeg * 0.75),
        });
      }
    }
  }

  // Sort by highest alignment intensity
  return alignments.sort((a, b) => b.intensity - a.intensity);
}
