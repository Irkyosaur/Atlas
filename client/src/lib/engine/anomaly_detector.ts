// Location: client/src/lib/engine/anomaly_detector.ts
// Stage 16.4: Astronomical Anomaly Detector & System Rarity Scorer Engine
// Evaluates planetary, stellar, orbital, and barycentric configurations to detect astronomical anomalies,
// calculate aggregate system rarity scores (0-100), assign rarity tiers, and generate real-time exploration detour recommendations.

export type RarityTier = 'Common' | 'Uncommon' | 'Rare' | 'Ultra-Rare' | 'Mythic Anomaly';

export type AnomalyCategory =
  | 'STELLAR_EXOTIC'       // Wolf-Rayet, Carbon, White Dwarf, Neutron, Black Hole, Supergiant
  | 'RING_SYSTEM'          // Ringed Stars, Colliding Ring Systems, Shepherd Moons, Giant Outer Rings
  | 'EXTREME_ORBIT'        // Extreme Eccentricity (>0.85), Ultra-Short Period (<0.2d), Extreme Inclination
  | 'EXTREME_SURFACE'      // Landable High-G (>3.0G), Extreme Temp (>2000K or <20K), Super-Dense / Tiny Radius
  | 'GRAVITATIONAL_BINARY' // Close Binary Orbit (<2.0 ls separation), Contact Binaries, Multiple Barycenters
  | 'ATMOSPHERIC_EXOTIC';  // Landable Helium/Neon/Argon, Extreme Atmospheric Pressure

export interface AstronomicalBody {
  id?: number | string;
  name: string;
  bodyType: string; // e.g. "Star", "Planet", "Gas giant", "Neutron Star", "Black Hole"
  subType?: string; // e.g. "Wolf-Rayet Star", "O (Blue-White) Star", "High metal content body"
  spectralClass?: string; // "O", "B", "A", "F", "G", "K", "M", "L", "T", "Y", "W", "C", "WD", "N", "H"
  luminosityClass?: string; // "Ia", "Ib", "II", "III", "IV", "V", "VII"
  massSolar?: number;
  massEarth?: number;
  radiusKm?: number;
  surfaceGravityG?: number;
  surfaceTemperatureK?: number;
  surfacePressureAtm?: number;
  isLandable?: boolean;
  semiMajorAxisAU?: number;
  orbitalPeriodDays?: number;
  eccentricity?: number;
  orbitalInclinationDeg?: number;
  periapsisDeg?: number;
  ascendingNodeDeg?: number;
  meanAnomalyDeg?: number;
  rotationalPeriodDays?: number;
  tidalLock?: boolean;
  parentName?: string;
  distanceLs?: number;
  rings?: PlanetaryRing[];
  atmosphereType?: string;
  volcanism?: string;
}

export interface PlanetaryRing {
  name: string;
  ringClass: string; // e.g. "eRingClass_Icy", "eRingClass_Metals", "eRingClass_Rocky"
  innerRadiusKm: number;
  outerRadiusKm: number;
  massMT?: number;
}

export interface SystemEvaluationInput {
  systemName: string;
  primaryStarClass?: string;
  primaryStarAgeMyr?: number;
  bodies: AstronomicalBody[];
  barycentersCount?: number;
  estimatedAgeMyr?: number;
}

export interface DetectedAnomaly {
  id: string;
  name: string;
  category: AnomalyCategory;
  severity: 'NOTABLE' | 'SIGNIFICANT' | 'EXCEPTIONAL' | 'LEGENDARY';
  points: number; // 5 to 40 points contribution
  targetBodyName: string;
  description: string;
  scientificValue: string;
  detourPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'MANDATORY_DETOUR';
  metrics: Record<string, string | number | boolean>;
}

export interface ExplorationDetourRecommendation {
  bodyName: string;
  priority: 'MANDATORY_DETOUR' | 'HIGH' | 'MEDIUM';
  title: string;
  rationale: string;
  detourDistanceLs: number;
  estimatedPhotoOpRating: number; // 1 to 5 stars
  tags: string[];
}

export interface SystemRarityReport {
  systemName: string;
  rarityScore: number; // 0 to 100
  rarityTier: RarityTier;
  tierColor: string; // Hex color for HUD styling
  detectedAnomalies: DetectedAnomaly[];
  anomaliesByCategory: Record<AnomalyCategory, DetectedAnomaly[]>;
  recommendations: ExplorationDetourRecommendation[];
  summaryMessage: string;
  totalNotableBodies: number;
  highestValuedBodyName: string | null;
  codexDetourRecommended: boolean;
}

export class AstronomicalAnomalyDetector {
  /**
   * Evaluates an entire star system and all catalogued bodies to detect rare astronomical phenomena,
   * calculate rarity index (0-100), and derive exploration detour recommendations.
   */
  public evaluateSystem(input: SystemEvaluationInput): SystemRarityReport {
    const bodies = input.bodies || [];
    const detectedAnomalies: DetectedAnomaly[] = [];

    // 1. Detect Exotic Stars & Remnants
    this.detectStellarExotics(bodies, detectedAnomalies);

    // 2. Detect Ring System Anomalies (Ringed Stars, Colliding Rings, Shepherd Moons, Super-Rings)
    this.detectRingAnomalies(bodies, detectedAnomalies);

    // 3. Detect Extreme Orbital Anomalies (High Eccentricity, Ultra-Short Period, Retrograde / Polar Orbits)
    this.detectOrbitalAnomalies(bodies, detectedAnomalies);

    // 4. Detect Extreme Surface & Landable Anomalies (High-G >3G, Extreme Cold/Heat, Hyper-dense tiny bodies)
    this.detectSurfaceAnomalies(bodies, detectedAnomalies);

    // 5. Detect Close Gravitational Binaries & Barycentric Configurations
    this.detectBinaryAnomalies(bodies, detectedAnomalies);

    // Calculate aggregate rarity score (bounded 0 - 100)
    let totalPoints = 0;
    for (const anom of detectedAnomalies) {
      totalPoints += anom.points;
    }
    // Base bonus for system richness
    if (bodies.length >= 45) {
      totalPoints += 5;
    }

    const rarityScore = Math.min(100, Math.max(0, Math.round(totalPoints)));
    const rarityTier = this.calculateTier(rarityScore);
    const tierColor = this.getTierColor(rarityTier);

    // Group anomalies by category
    const anomaliesByCategory: Record<AnomalyCategory, DetectedAnomaly[]> = {
      STELLAR_EXOTIC: [],
      RING_SYSTEM: [],
      EXTREME_ORBIT: [],
      EXTREME_SURFACE: [],
      GRAVITATIONAL_BINARY: [],
      ATMOSPHERIC_EXOTIC: []
    };

    for (const anom of detectedAnomalies) {
      if (anomaliesByCategory[anom.category]) {
        anomaliesByCategory[anom.category].push(anom);
      }
    }

    // Generate detour recommendations
    const recommendations = this.generateRecommendations(detectedAnomalies, bodies);

    // Count bodies involved
    const notableBodySet = new Set<string>();
    for (const anom of detectedAnomalies) {
      notableBodySet.add(anom.targetBodyName);
    }

    // Determine highest valued / most eccentric body
    let highestValuedBodyName: string | null = null;
    let highestBodyPoints = -1;
    const bodyPointsMap = new Map<string, number>();

    for (const anom of detectedAnomalies) {
      const current = (bodyPointsMap.get(anom.targetBodyName) || 0) + anom.points;
      bodyPointsMap.set(anom.targetBodyName, current);
      if (current > highestBodyPoints) {
        highestBodyPoints = current;
        highestValuedBodyName = anom.targetBodyName;
      }
    }

    const codexDetourRecommended = rarityScore >= 60 || detectedAnomalies.some((a) => a.severity === 'EXCEPTIONAL' || a.severity === 'LEGENDARY');

    let summaryMessage = '';
    if (rarityTier === 'Mythic Anomaly') {
      summaryMessage = 'MYTHIC ASTRONOMICAL ANOMALY: Highly unprecedented celestial configuration detected! Immediate detours and DSS planetary mapping strongly advised.';
    } else if (rarityTier === 'Ultra-Rare') {
      summaryMessage = 'ULTRA-RARE SYSTEM: Outstanding astronomical phenomena present. Exceptional exploration scan and photographic value.';
    } else if (rarityTier === 'Rare') {
      summaryMessage = 'RARE PHENOMENA DETECTED: System features distinctive gravitational, stellar, or planetary traits worthy of full DSS telemetry.';
    } else if (rarityTier === 'Uncommon') {
      summaryMessage = 'UNCOMMON SYSTEM: Minor celestial curiosities identified. Optional scan detour recommended.';
    } else {
      summaryMessage = 'STANDARD SYSTEM: Standard stellar and planetary formation signatures without prominent orbital or geological anomalies.';
    }

    return {
      systemName: input.systemName,
      rarityScore,
      rarityTier,
      tierColor,
      detectedAnomalies,
      anomaliesByCategory,
      recommendations,
      summaryMessage,
      totalNotableBodies: notableBodySet.size,
      highestValuedBodyName,
      codexDetourRecommended
    };
  }

  /**
   * Maps numerical 0-100 score to canonical Tier designation
   */
  public calculateTier(score: number): RarityTier {
    if (score >= 85) return 'Mythic Anomaly';
    if (score >= 60) return 'Ultra-Rare';
    if (score >= 35) return 'Rare';
    if (score >= 15) return 'Uncommon';
    return 'Common';
  }

  /**
   * HUD color tokens matching Elite Dangerous orange / cyan / mythic purple telemetry styling
   */
  public getTierColor(tier: RarityTier): string {
    switch (tier) {
      case 'Mythic Anomaly':
        return '#d946ef'; // Fuchsia / Violet Neon
      case 'Ultra-Rare':
        return '#06b6d4'; // Cyan Laser Glow
      case 'Rare':
        return '#f59e0b'; // Amber Gold
      case 'Uncommon':
        return '#10b981'; // Emerald Green
      case 'Common':
      default:
        return '#94a3b8'; // Slate Gray
    }
  }

  /**
   * 1. Detect Stellar Exotics (Wolf-Rayet, Carbon, White Dwarfs, Neutron Stars, Black Holes, Supergiants)
   */
  private detectStellarExotics(bodies: AstronomicalBody[], anomalies: DetectedAnomaly[]): void {
    for (const b of bodies) {
      const type = (b.bodyType || '').toLowerCase();
      const sub = (b.subType || '').toLowerCase();
      const spec = (b.spectralClass || '').toUpperCase();
      const lum = (b.luminosityClass || '').toUpperCase();

      // Black Hole
      if (type.includes('black hole') || sub.includes('black hole') || spec === 'H') {
        anomalies.push({
          id: `stellar-bh-${b.name}`,
          name: 'Singularity Event Horizon (Black Hole)',
          category: 'STELLAR_EXOTIC',
          severity: 'EXCEPTIONAL',
          points: 30,
          targetBodyName: b.name,
          description: `Supercompact gravitational singularity with relativistic gravitational lensing (${b.massSolar?.toFixed(1) || 'Unknown'} M☉).`,
          scientificValue: 'Gravitational distortion mapping and Hawking radiation telemetry.',
          detourPriority: 'HIGH',
          metrics: { massSolar: b.massSolar || 0, distanceLs: b.distanceLs || 0 }
        });
      }

      // Wolf-Rayet Star
      if (type.includes('wolf-rayet') || sub.includes('wolf-rayet') || spec.startsWith('W')) {
        anomalies.push({
          id: `stellar-wr-${b.name}`,
          name: 'Wolf-Rayet High-Mass Stellar Relic',
          category: 'STELLAR_EXOTIC',
          severity: 'LEGENDARY',
          points: 38,
          targetBodyName: b.name,
          description: `Extremely rare, evolved massive star with depleted hydrogen outer shell and hyper-energetic stellar winds.`,
          scientificValue: 'Pre-supernova emission line spectroscopy and ionizing solar wind dynamics.',
          detourPriority: 'MANDATORY_DETOUR',
          metrics: { spectral: spec, temperatureK: b.surfaceTemperatureK || 0 }
        });
      }

      // Neutron Star
      if (type.includes('neutron') || sub.includes('neutron') || spec === 'N') {
        anomalies.push({
          id: `stellar-ns-${b.name}`,
          name: 'Pulsing Neutron Star Core',
          category: 'STELLAR_EXOTIC',
          severity: 'SIGNIFICANT',
          points: 20,
          targetBodyName: b.name,
          description: `Ultra-dense degenerate stellar remnant generating twin relativistic magnetic jet cones.`,
          scientificValue: 'FSD supercharge jet cone injection and magnetic pulsar timing.',
          detourPriority: 'HIGH',
          metrics: { massSolar: b.massSolar || 0, radiusKm: b.radiusKm || 10 }
        });
      }

      // Carbon Star
      if (type.includes('carbon') || sub.includes('carbon') || spec.startsWith('C')) {
        anomalies.push({
          id: `stellar-carbon-${b.name}`,
          name: 'Carbon-Enriched Asymptotic Giant',
          category: 'STELLAR_EXOTIC',
          severity: 'SIGNIFICANT',
          points: 22,
          targetBodyName: b.name,
          description: `Deep ruby-red giant exhibiting atmospheric carbon dominance over oxygen with intense soot formation.`,
          scientificValue: 'Heavy element nucleosynthesis dredge-up and organic molecule precursor tracing.',
          detourPriority: 'HIGH',
          metrics: { spectral: spec, tempK: b.surfaceTemperatureK || 0 }
        });
      }

      // White Dwarf (DA, DB, DC, DO, DQ, DZ, DAV)
      if (type.includes('white dwarf') || sub.includes('white dwarf') || spec.startsWith('D')) {
        anomalies.push({
          id: `stellar-wd-${b.name}`,
          name: 'Degenerate White Dwarf Remnant',
          category: 'STELLAR_EXOTIC',
          severity: 'NOTABLE',
          points: 15,
          targetBodyName: b.name,
          description: `Electron-degenerate stellar core remnant with extreme gravitational exclusion exclusion zone.`,
          scientificValue: 'Degenerate equation-of-state observation and exclusion boundary navigation.',
          detourPriority: 'MEDIUM',
          metrics: { spectral: spec, massSolar: b.massSolar || 0 }
        });
      }

      // Supergiant (Ia / Ib / 0 Hypergiant)
      if (lum === 'IA' || lum === '0' || lum === 'IB' || lum.includes('SUPERGIANT') || sub.includes('supergiant')) {
        anomalies.push({
          id: `stellar-sg-${b.name}`,
          name: 'Stellar Supergiant Colossus',
          category: 'STELLAR_EXOTIC',
          severity: 'SIGNIFICANT',
          points: 20,
          targetBodyName: b.name,
          description: `Enormous stellar radius spanning astronomical units with intense mass-loss luminosity.`,
          scientificValue: 'Coronal expansion envelope inspection and high-mass evolutionary profiling.',
          detourPriority: 'HIGH',
          metrics: { radiusKm: b.radiusKm || 0, luminosity: lum }
        });
      }
    }
  }

  /**
   * 2. Detect Ring System Anomalies (Ringed Stars, Colliding Rings, Shepherd Moons, Super-Massive Rings)
   */
  private detectRingAnomalies(bodies: AstronomicalBody[], anomalies: DetectedAnomaly[]): void {
    for (const b of bodies) {
      const isStar = (b.bodyType || '').toLowerCase().includes('star');
      const rings = b.rings || [];

      // Ringed Star
      if (isStar && rings.length > 0) {
        anomalies.push({
          id: `ring-star-${b.name}`,
          name: 'Circumstellar Proto-Planetary Ring System',
          category: 'RING_SYSTEM',
          severity: 'EXCEPTIONAL',
          points: 32,
          targetBodyName: b.name,
          description: `Rare circumstellar debris ring orbiting an active fusion star directly inside the primary radiation belt.`,
          scientificValue: 'Circumstellar sublimation threshold analysis and high-flux mineral crystallisation.',
          detourPriority: 'MANDATORY_DETOUR',
          metrics: { ringsCount: rings.length, outerRadiusKm: rings[rings.length - 1]?.outerRadiusKm || 0 }
        });
      }

      // Giant Super-Ring (>3,000,000 km outer radius)
      for (const r of rings) {
        if (r.outerRadiusKm > 3000000) {
          anomalies.push({
            id: `ring-super-${b.name}-${r.name}`,
            name: `Super-Massive Mega Ring (${(r.outerRadiusKm / 1000000).toFixed(2)}M km)`,
            category: 'RING_SYSTEM',
            severity: 'SIGNIFICANT',
            points: 22,
            targetBodyName: b.name,
            description: `Colossal planetary ring span reaching ${(r.outerRadiusKm / 1000000).toFixed(2)} million kilometers from parent core.`,
            scientificValue: 'Long-range gravitational wave propagation across wide ring shear boundaries.',
            detourPriority: 'HIGH',
            metrics: { outerKm: r.outerRadiusKm, ringClass: r.ringClass }
          });
          break;
        }
      }

      // Shepherd Moons: Check child moons orbiting directly inside or within 1.1x of the outer ring radius
      if (rings.length > 0) {
        const maxRingRadiusKm = Math.max(...rings.map((r) => r.outerRadiusKm));
        const minRingRadiusKm = Math.min(...rings.map((r) => r.innerRadiusKm));

        // Find child bodies having semi-major axis close to or embedded in the rings
        const childMoons = bodies.filter((child) => child.parentName === b.name && child.semiMajorAxisAU !== undefined);
        for (const moon of childMoons) {
          // 1 AU ≈ 149,597,870.7 km
          const moonSemiMajorKm = (moon.semiMajorAxisAU || 0) * 149597870.7;
          if (moonSemiMajorKm >= minRingRadiusKm * 0.95 && moonSemiMajorKm <= maxRingRadiusKm * 1.08) {
            anomalies.push({
              id: `ring-shepherd-${moon.name}`,
              name: 'Embedded Ring Shepherd Moon',
              category: 'RING_SYSTEM',
              severity: 'EXCEPTIONAL',
              points: 28,
              targetBodyName: moon.name,
              description: `Moon actively cleaving and gravitationally carving orbital gaps inside parent ${b.name}'s ring disc!`,
              scientificValue: 'Resonance torque orbital clearance and accretion disc dynamics.',
              detourPriority: 'MANDATORY_DETOUR',
              metrics: { parent: b.name, moonDistanceKm: Math.round(moonSemiMajorKm), ringOuterKm: maxRingRadiusKm }
            });
          }
        }
      }
    }

    // Colliding Ring Systems: Check close binary planetary pairs where ring radii overlap or touch
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];
        if (b1.parentName && b1.parentName === b2.parentName && b1.rings && b1.rings.length > 0 && b2.rings && b2.rings.length > 0) {
          if (b1.semiMajorAxisAU !== undefined && b2.semiMajorAxisAU !== undefined) {
            const sepKm = Math.abs(b1.semiMajorAxisAU - b2.semiMajorAxisAU) * 149597870.7;
            const maxR1 = Math.max(...b1.rings.map((r) => r.outerRadiusKm));
            const maxR2 = Math.max(...b2.rings.map((r) => r.outerRadiusKm));
            if (sepKm > 0 && sepKm <= (maxR1 + maxR2) * 1.25) {
              anomalies.push({
                id: `ring-collision-${b1.name}-${b2.name}`,
                name: 'Colliding Intersecting Ring Systems',
                category: 'RING_SYSTEM',
                severity: 'LEGENDARY',
                points: 40,
                targetBodyName: `${b1.name} / ${b2.name}`,
                description: `Ultra-rare mutual orbital proximity where planetary rings gravitationally scrape and collide!`,
                scientificValue: 'High-energy kinetic dust cloud interaction and tidal ring disruption.',
                detourPriority: 'MANDATORY_DETOUR',
                metrics: { separationKm: Math.round(sepKm), ring1Outer: maxR1, ring2Outer: maxR2 }
              });
            }
          }
        }
      }
    }
  }

  /**
   * 3. Detect Extreme Orbital Anomalies (Eccentricity >0.85, Ultra-Short Period <0.2d, Highly Inclined Orbits)
   */
  private detectOrbitalAnomalies(bodies: AstronomicalBody[], anomalies: DetectedAnomaly[]): void {
    for (const b of bodies) {
      // Extreme Eccentricity (e >= 0.85)
      if (b.eccentricity !== undefined && b.eccentricity >= 0.85) {
        anomalies.push({
          id: `orbit-ecc-${b.name}`,
          name: `Extreme Cometary Eccentricity (e=${b.eccentricity.toFixed(3)})`,
          category: 'EXTREME_ORBIT',
          severity: b.eccentricity >= 0.95 ? 'EXCEPTIONAL' : 'SIGNIFICANT',
          points: b.eccentricity >= 0.95 ? 28 : 18,
          targetBodyName: b.name,
          description: `Severe hyper-elliptical orbit traversing dramatic thermal temperature extremes between perihelion and aphelion.`,
          scientificValue: 'Periapsis thermal shock kinetics and orbital resonance deflection.',
          detourPriority: 'HIGH',
          metrics: { eccentricity: b.eccentricity, periodDays: b.orbitalPeriodDays || 0 }
        });
      }

      // Ultra-Short Orbital Period (< 0.25 days / < 6 hours)
      if (b.orbitalPeriodDays !== undefined && b.orbitalPeriodDays > 0 && b.orbitalPeriodDays <= 0.25) {
        const hours = (b.orbitalPeriodDays * 24).toFixed(1);
        anomalies.push({
          id: `orbit-period-${b.name}`,
          name: `Ultra-Fast Orbital Period (${hours} hours)`,
          category: 'EXTREME_ORBIT',
          severity: 'SIGNIFICANT',
          points: 20,
          targetBodyName: b.name,
          description: `Blistering orbital velocity whipping around its host in only ${hours} hours. Visible motion against background stars!`,
          scientificValue: 'Relativistic frame dragging and extreme tidal strain telemetry.',
          detourPriority: 'HIGH',
          metrics: { periodHours: Number(hours), semiMajorAU: b.semiMajorAxisAU || 0 }
        });
      }

      // Extreme Orbital Inclination (> 85 degrees or retrograde > 95 degrees)
      if (b.orbitalInclinationDeg !== undefined) {
        const inc = Math.abs(b.orbitalInclinationDeg);
        if (inc >= 85) {
          anomalies.push({
            id: `orbit-inc-${b.name}`,
            name: inc > 90 ? `Retrograde Polar Orbit (${inc.toFixed(1)}°)` : `Polar Perpendicular Orbit (${inc.toFixed(1)}°)`,
            category: 'EXTREME_ORBIT',
            severity: 'NOTABLE',
            points: 12,
            targetBodyName: b.name,
            description: `Orbital plane perpendicular or counter-rotating to the galactic and system ecliptic plane.`,
            scientificValue: 'Capture dynamics modeling and early solar system chaotic scattering.',
            detourPriority: 'MEDIUM',
            metrics: { inclinationDeg: b.orbitalInclinationDeg }
          });
        }
      }
    }
  }

  /**
   * 4. Detect Extreme Surface & Landable Anomalies (High-G >3.0G, Extreme Temp, Tiny Hyper-dense worlds)
   */
  private detectSurfaceAnomalies(bodies: AstronomicalBody[], anomalies: DetectedAnomaly[]): void {
    for (const b of bodies) {
      // Landable High-G Worlds (> 3.0 G)
      if (b.isLandable && b.surfaceGravityG !== undefined && b.surfaceGravityG >= 3.0) {
        const isExtreme = b.surfaceGravityG >= 6.0;
        anomalies.push({
          id: `surface-highg-${b.name}`,
          name: `Crushing High-G Landable World (${b.surfaceGravityG.toFixed(2)}G)`,
          category: 'EXTREME_SURFACE',
          severity: isExtreme ? 'LEGENDARY' : 'EXCEPTIONAL',
          points: isExtreme ? 35 : 25,
          targetBodyName: b.name,
          description: `Super-dense landable surface with lethal ${b.surfaceGravityG.toFixed(2)}G gravitational pull. Thruster management critical for touchdown!`,
          scientificValue: 'Extreme crystalline geology and high-gravity surface biome physics.',
          detourPriority: 'MANDATORY_DETOUR',
          metrics: { gravityG: b.surfaceGravityG, radiusKm: b.radiusKm || 0 }
        });
      }

      // Landable with Extreme Temperature (> 1200 K or < 25 K)
      if (b.isLandable && b.surfaceTemperatureK !== undefined) {
        if (b.surfaceTemperatureK >= 1200) {
          anomalies.push({
            id: `surface-inferno-${b.name}`,
            name: `Infernal Scorched Crust (${Math.round(b.surfaceTemperatureK)} K)`,
            category: 'EXTREME_SURFACE',
            severity: 'SIGNIFICANT',
            points: 16,
            targetBodyName: b.name,
            description: `Incandescent glowing crust undergoing surface rock vaporization under relentless stellar radiative heating.`,
            scientificValue: 'Superheated silicate crust chemistry and thermal dissipation profiles.',
            detourPriority: 'MEDIUM',
            metrics: { temperatureK: b.surfaceTemperatureK }
          });
        } else if (b.surfaceTemperatureK <= 25) {
          anomalies.push({
            id: `surface-cryo-${b.name}`,
            name: `Absolute Cryogenic Superconductor (${Math.round(b.surfaceTemperatureK)} K)`,
            category: 'EXTREME_SURFACE',
            severity: 'SIGNIFICANT',
            points: 16,
            targetBodyName: b.name,
            description: `Supercooled crust lingering near absolute zero with exotic superconductive ice lattices.`,
            scientificValue: 'Bose-Einstein atmospheric condensate and cryogenic mineral lattices.',
            detourPriority: 'MEDIUM',
            metrics: { temperatureK: b.surfaceTemperatureK }
          });
        }
      }

      // Tiny Planet with high mass (Hyper-dense Metal Core, radius < 400km but mass > 0.1 Earth)
      if (b.radiusKm !== undefined && b.radiusKm < 450 && b.massEarth !== undefined && b.massEarth >= 0.05) {
        anomalies.push({
          id: `surface-dense-${b.name}`,
          name: `Hyper-Dense Core Remnant (${b.radiusKm} km radius)`,
          category: 'EXTREME_SURFACE',
          severity: 'NOTABLE',
          points: 14,
          targetBodyName: b.name,
          description: `Stripped metallic planetary core with extraordinary mass density and micro-radius.`,
          scientificValue: 'Chondrite stripping mantle analysis and pure heavy metal cores.',
          detourPriority: 'MEDIUM',
          metrics: { radiusKm: b.radiusKm, massEarth: b.massEarth }
        });
      }

      // Landable Exotic Atmosphere (Argon, Neon, Methane with landable flags)
      if (b.isLandable && b.atmosphereType) {
        const atmo = b.atmosphereType.toLowerCase();
        if (atmo.includes('neon') || atmo.includes('argon') || atmo.includes('helium') || atmo.includes('ammonia')) {
          anomalies.push({
            id: `atmo-exotic-${b.name}`,
            name: `Landable Exotic Atmosphere (${b.atmosphereType})`,
            category: 'ATMOSPHERIC_EXOTIC',
            severity: 'NOTABLE',
            points: 12,
            targetBodyName: b.name,
            description: `Touchdown-eligible body shrouded in rare ${b.atmosphereType} envelope.`,
            scientificValue: 'In-situ exobiological gas-boundary chemical synthesis.',
            detourPriority: 'MEDIUM',
            metrics: { atmosphere: b.atmosphereType, pressureAtm: b.surfacePressureAtm || 0 }
          });
        }
      }
    }
  }

  /**
   * 5. Detect Close Gravitational Binaries & Contact Binaries (< 2.5 Ls separation)
   */
  private detectBinaryAnomalies(bodies: AstronomicalBody[], anomalies: DetectedAnomaly[]): void {
    // Check pairs sharing identical parent or barycenter
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];

        // Stars or planets with close distanceLs
        if (b1.distanceLs !== undefined && b2.distanceLs !== undefined) {
          const sepLs = Math.abs(b1.distanceLs - b2.distanceLs);

          // Star - Star close binary or Star - Black Hole close binary
          const isStar1 = (b1.bodyType || '').toLowerCase().includes('star') || (b1.bodyType || '').toLowerCase().includes('black hole');
          const isStar2 = (b2.bodyType || '').toLowerCase().includes('star') || (b2.bodyType || '').toLowerCase().includes('black hole');

          if (isStar1 && isStar2 && sepLs > 0 && sepLs <= 3.5) {
            const hasExotic =
              (b1.subType || '').toLowerCase().includes('neutron') ||
              (b1.subType || '').toLowerCase().includes('black hole') ||
              (b1.subType || '').toLowerCase().includes('wolf-rayet') ||
              (b2.subType || '').toLowerCase().includes('neutron') ||
              (b2.subType || '').toLowerCase().includes('black hole') ||
              (b2.subType || '').toLowerCase().includes('wolf-rayet');

            anomalies.push({
              id: `binary-close-${b1.name}-${b2.name}`,
              name: hasExotic ? `Exotic Relativistic Binary (${sepLs.toFixed(1)} Ls)` : `Close Contact Binary Star Pair (${sepLs.toFixed(1)} Ls)`,
              category: 'GRAVITATIONAL_BINARY',
              severity: hasExotic ? 'LEGENDARY' : 'EXCEPTIONAL',
              points: hasExotic ? 36 : 26,
              targetBodyName: `${b1.name} & ${b2.name}`,
              description: `Hair-raising orbital dance with only ${sepLs.toFixed(1)} light-seconds separation! Roche lobe atmospheric siphoning likely.`,
              scientificValue: 'Mass transfer accretion stream and gravitational quadrupole emission.',
              detourPriority: 'MANDATORY_DETOUR',
              metrics: { separationLs: Number(sepLs.toFixed(2)), body1: b1.name, body2: b2.name }
            });
          }
        }
      }
    }
  }

  /**
   * Generates exploration detour recommendations prioritized by CMDR visual and codex impact
   */
  private generateRecommendations(anomalies: DetectedAnomaly[], bodies: AstronomicalBody[]): ExplorationDetourRecommendation[] {
    const list: ExplorationDetourRecommendation[] = [];
    const seenBodies = new Set<string>();

    // Sort anomalies by points descending
    const sorted = [...anomalies].sort((a, b) => b.points - a.points);

    for (const anom of sorted) {
      if (seenBodies.has(anom.targetBodyName)) continue;
      seenBodies.add(anom.targetBodyName);

      // Find matching body for distance calculation
      const body = bodies.find((b) => b.name === anom.targetBodyName);
      const distanceLs = body?.distanceLs ?? (typeof anom.metrics.distanceLs === 'number' ? anom.metrics.distanceLs : 450);

      let stars = 3;
      if (anom.severity === 'LEGENDARY') stars = 5;
      else if (anom.severity === 'EXCEPTIONAL') stars = 4;

      let priority: 'MANDATORY_DETOUR' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      if (anom.detourPriority === 'MANDATORY_DETOUR') priority = 'MANDATORY_DETOUR';
      else if (anom.detourPriority === 'HIGH') priority = 'HIGH';

      list.push({
        bodyName: anom.targetBodyName,
        priority,
        title: anom.name,
        rationale: anom.description,
        detourDistanceLs: Math.round(distanceLs),
        estimatedPhotoOpRating: stars,
        tags: [anom.category, anom.severity, `${anom.points} PTS`]
      });
    }

    return list;
  }
}

export const astronomicalAnomalyDetector = new AstronomicalAnomalyDetector();
