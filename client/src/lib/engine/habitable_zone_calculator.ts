// Location: client/src/lib/engine/habitable_zone_calculator.ts
// Stage 16.2: Habitable Zone Mathematical Boundaries Calculator
// Computes inner/outer astronomical unit & light-second ranges and Goldilocks temperature envelopes.

export interface StellarParameters {
  spectralClass: string;
  luminositySolar: number;     // In solar luminosities (L☉, Sol = 1.0)
  effectiveTempK?: number;     // Effective surface temperature in Kelvin (Sol = 5778 K)
  massSolar?: number;          // Mass in solar masses (M☉, Sol = 1.0)
  radiusSolar?: number;        // Radius in solar radii (R☉, Sol = 1.0)
}

export interface HabitableZoneBoundary {
  // In Astronomical Units (AU)
  innerConservativeAu: number;  // Runaway Greenhouse limit (Kopparapu et al.)
  outerConservativeAu: number;  // Maximum Greenhouse limit
  innerOptimisticAu: number;    // Recent Venus limit
  outerOptimisticAu: number;    // Early Mars limit

  // In Light Seconds (Ls) - 1 AU = 499.004784 Ls
  innerConservativeLs: number;
  outerConservativeLs: number;
  innerOptimisticLs: number;
  outerOptimisticLs: number;

  // Goldilocks Habitable Equilibrium Temperature Bounds (Kelvin)
  goldilocksTempMinK: number;   // ~260 K
  goldilocksTempOptimumK: number; // ~288 K (15°C Earth average)
  goldilocksTempMaxK: number;   // ~320 K

  // Tidal locking threshold distance in Ls (where planetary rotation locks to orbital period)
  tidalLockingBoundaryLs: number;

  // Recommended narrow DSS scanning band (center ± 20%)
  recommendedCenterLs: number;
  recommendedBandLabel: string;
}

// Canonical conversion factors
export const AU_TO_LS = 499.004783836;
export const LS_TO_AU = 1.0 / AU_TO_LS;
export const SOL_TEMP_K = 5778;
export const SOL_LUMINOSITY = 1.0;

/**
 * Standard effective temperature approximations for main-sequence spectral classes if not explicitly provided
 */
export const DEFAULT_SPECTRAL_TEMPERATURES: Record<string, number> = {
  O: 38000,
  B: 18000,
  A: 8500,
  F: 6500,
  G: 5778,
  K: 4400,
  M: 3200,
  L: 1800,
  T: 1000,
  Y: 600,
  Neutron: 100000,
  WhiteDwarf: 25000,
  BlackHole: 10,
  WolfRayet: 50000,
  Carbon: 3000
};

/**
 * Computes exact habitable zone boundaries based on stellar luminosity and effective temperature
 * using Kopparapu et al. (2013/2014) planetary radiative flux equations calibrated to Elite Dangerous astronomical generation.
 */
export function calculateHabitableZone(star: StellarParameters): HabitableZoneBoundary {
  const spectralKey = star.spectralClass.trim().toUpperCase().charAt(0) || 'G';
  const effectiveTemp = star.effectiveTempK ?? DEFAULT_SPECTRAL_TEMPERATURES[spectralKey] ?? 5778;
  const luminosity = Math.max(star.luminositySolar, 0.00001);
  const mass = Math.max(star.massSolar ?? Math.pow(luminosity, 0.28), 0.05);

  // Temperature offset relative to solar
  const tStar = effectiveTemp - SOL_TEMP_K;

  // Kopparapu et al. coefficients for effective solar flux (Seff)
  // Seff = Seff_sun + a*tStar + b*tStar^2 + c*tStar^3 + d*tStar^4
  // 1. Recent Venus (Optimistic Inner)
  const sRecentVenus = 1.776 + 2.136e-4 * tStar + 2.533e-8 * Math.pow(tStar, 2) - 1.332e-11 * Math.pow(tStar, 3);
  // 2. Runaway Greenhouse (Conservative Inner)
  const sRunaway = 1.038 + 1.245e-4 * tStar + 1.465e-8 * Math.pow(tStar, 2) - 9.231e-12 * Math.pow(tStar, 3);
  // 3. Maximum Greenhouse (Conservative Outer)
  const sMaxGreenhouse = 0.3507 + 5.957e-5 * tStar + 1.670e-9 * Math.pow(tStar, 2) - 3.063e-12 * Math.pow(tStar, 3);
  // 4. Early Mars (Optimistic Outer)
  const sEarlyMars = 0.3207 + 5.447e-5 * tStar + 1.527e-9 * Math.pow(tStar, 2) - 2.802e-12 * Math.pow(tStar, 3);

  // d = sqrt(L / Seff) in AU
  const innerOptimisticAu = Math.sqrt(luminosity / Math.max(sRecentVenus, 0.01));
  const innerConservativeAu = Math.sqrt(luminosity / Math.max(sRunaway, 0.01));
  const outerConservativeAu = Math.sqrt(luminosity / Math.max(sMaxGreenhouse, 0.005));
  const outerOptimisticAu = Math.sqrt(luminosity / Math.max(sEarlyMars, 0.005));

  // Convert to Light Seconds
  const innerOptLs = innerOptimisticAu * AU_TO_LS;
  const innerConsLs = innerConservativeAu * AU_TO_LS;
  const outerConsLs = outerConservativeAu * AU_TO_LS;
  const outerOptLs = outerOptimisticAu * AU_TO_LS;

  // Tidal locking distance: r_lock ≈ 0.027 * (t_age_Gyr / Q)^(1/6) * (M_star / M_sun)^(1/3) in AU
  // Approximated for a 4.5 Gyr old system with tidal dissipation factor Q:
  const tidalLockAu = 0.19 * Math.pow(mass, 1.0 / 3.0);
  const tidalLockLs = tidalLockAu * AU_TO_LS;

  const centerLs = (innerConsLs + outerConsLs) / 2.0;
  const bandLabel = `${Math.round(innerConsLs).toLocaleString()} - ${Math.round(outerConsLs).toLocaleString()} Ls`;

  return {
    innerConservativeAu: Number(innerConservativeAu.toFixed(4)),
    outerConservativeAu: Number(outerConservativeAu.toFixed(4)),
    innerOptimisticAu: Number(innerOptimisticAu.toFixed(4)),
    outerOptimisticAu: Number(outerOptimisticAu.toFixed(4)),

    innerConservativeLs: Number(innerConsLs.toFixed(1)),
    outerConservativeLs: Number(outerConsLs.toFixed(1)),
    innerOptimisticLs: Number(innerOptLs.toFixed(1)),
    outerOptimisticLs: Number(outerOptLs.toFixed(1)),

    goldilocksTempMinK: 260,
    goldilocksTempOptimumK: 288,
    goldilocksTempMaxK: 320,

    tidalLockingBoundaryLs: Number(tidalLockLs.toFixed(1)),
    recommendedCenterLs: Number(centerLs.toFixed(1)),
    recommendedBandLabel: bandLabel
  };
}

/**
 * Predicts the blackbody equilibrium temperature for a planet at given orbital distance (in Ls or AU)
 * T_eq = T_star * (R_star / (2 * distance))^(1/2) * (1 - albedo)^(1/4)
 */
export function calculateEquilibriumTemperature(
  star: StellarParameters,
  distanceLs: number,
  bondAlbedo = 0.3
): number {
  const spectralKey = star.spectralClass.trim().toUpperCase().charAt(0) || 'G';
  const effectiveTemp = star.effectiveTempK ?? DEFAULT_SPECTRAL_TEMPERATURES[spectralKey] ?? 5778;
  const distAu = Math.max(distanceLs * LS_TO_AU, 0.001);
  const luminosity = Math.max(star.luminositySolar, 0.00001);

  // T_eq ≈ 278.5 * (L / dist_AU^2)^(1/4) * ((1 - A) / 0.7)^(1/4)
  const fluxFactor = Math.pow(luminosity / (distAu * distAu), 0.25);
  const albedoFactor = Math.pow((1.0 - bondAlbedo) / 0.7, 0.25);
  const tempK = 278.5 * fluxFactor * albedoFactor;

  return Math.round(tempK);
}
