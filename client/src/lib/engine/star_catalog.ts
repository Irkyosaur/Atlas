// Atlas Spectral Star Color Look-Up Table & Physical Shading Parameters
// Exact Frontier developments Cobra Engine color baselines

export interface StarVisualProfile {
  colorHex: string;
  threeColor: number;
  glowColor: string;
  baseRadius: number;
  temperatureKelvin: number;
  coronaIntensity: number;
}

export const STAR_SPECTRAL_CATALOG: Record<string, StarVisualProfile> = {
  O: {
    colorHex: "#9bb0ff",
    threeColor: 0x9bb0ff,
    glowColor: "rgba(155, 176, 255, 0.45)",
    baseRadius: 6.6,
    temperatureKelvin: 38000,
    coronaIntensity: 1.4,
  },
  B: {
    colorHex: "#bbccff",
    threeColor: 0xbbccff,
    glowColor: "rgba(187, 204, 255, 0.4)",
    baseRadius: 3.8,
    temperatureKelvin: 20000,
    coronaIntensity: 1.2,
  },
  A: {
    colorHex: "#f8f9ff",
    threeColor: 0xf8f9ff,
    glowColor: "rgba(248, 249, 255, 0.35)",
    baseRadius: 1.8,
    temperatureKelvin: 8500,
    coronaIntensity: 1.0,
  },
  F: {
    colorHex: "#ffffed",
    threeColor: 0xffffed,
    glowColor: "rgba(255, 255, 237, 0.3)",
    baseRadius: 1.3,
    temperatureKelvin: 6500,
    coronaIntensity: 0.9,
  },
  G: {
    // Sol-like Yellow Dwarf
    colorHex: "#fff3a8",
    threeColor: 0xfff3a8,
    glowColor: "rgba(255, 243, 168, 0.35)",
    baseRadius: 1.0,
    temperatureKelvin: 5700,
    coronaIntensity: 0.85,
  },
  K: {
    colorHex: "#ffc067",
    threeColor: 0xffc067,
    glowColor: "rgba(255, 192, 103, 0.35)",
    baseRadius: 0.8,
    temperatureKelvin: 4500,
    coronaIntensity: 0.8,
  },
  M: {
    // Red Dwarf
    colorHex: "#ff6e41",
    threeColor: 0xff6e41,
    glowColor: "rgba(255, 110, 65, 0.4)",
    baseRadius: 0.5,
    temperatureKelvin: 3200,
    coronaIntensity: 0.75,
  },
  L: {
    colorHex: "#b83333",
    threeColor: 0xb83333,
    glowColor: "rgba(184, 51, 51, 0.25)",
    baseRadius: 0.35,
    temperatureKelvin: 1800,
    coronaIntensity: 0.4,
  },
  T: {
    colorHex: "#8c253b",
    threeColor: 0x8c253b,
    glowColor: "rgba(140, 37, 59, 0.2)",
    baseRadius: 0.28,
    temperatureKelvin: 1100,
    coronaIntensity: 0.3,
  },
  Y: {
    colorHex: "#5c1b33",
    threeColor: 0x5c1b33,
    glowColor: "rgba(92, 27, 51, 0.15)",
    baseRadius: 0.22,
    temperatureKelvin: 600,
    coronaIntensity: 0.2,
  },
  N: {
    // Neutron Star / Pulsar
    colorHex: "#7cf5ff",
    threeColor: 0x7cf5ff,
    glowColor: "rgba(124, 245, 255, 0.8)",
    baseRadius: 0.15,
    temperatureKelvin: 1000000,
    coronaIntensity: 2.2,
  },
  D: {
    // White Dwarf
    colorHex: "#e0f7fa",
    threeColor: 0xe0f7fa,
    glowColor: "rgba(224, 247, 250, 0.6)",
    baseRadius: 0.2,
    temperatureKelvin: 25000,
    coronaIntensity: 1.5,
  },
  H: {
    // Black Hole (Singularity)
    colorHex: "#0a0c10",
    threeColor: 0x0a0c10,
    glowColor: "rgba(255, 113, 0, 0.5)", // Orange accretion lensing
    baseRadius: 0.1,
    temperatureKelvin: 0,
    coronaIntensity: 0.0,
  },
};

/**
 * Returns the visual styling profile for a star class string.
 */
export function getStarProfile(starClass: string): StarVisualProfile {
  const primary = starClass.trim().toUpperCase().charAt(0);
  return STAR_SPECTRAL_CATALOG[primary] || STAR_SPECTRAL_CATALOG.G;
}
