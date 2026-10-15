// Location: atlas/client/src/lib/engine/colonisation_engine.ts
// Colonisation Hub & System Map Architect View Engine (Phase 08, Stage 8.1)

export type InfrastructureAssetType =
  | 'coriolis_starport'
  | 'orbis_starport'
  | 'ocellus_starport'
  | 'planetary_outpost'
  | 'bio_dome'
  | 'mining_extractor'
  | 'carrier_parking_slot';

export type PlacementDomain = 'orbital' | 'surface';

export interface InfrastructureAssetMeta {
  type: InfrastructureAssetType;
  name: string;
  category: 'Orbital Starport' | 'Surface Installation' | 'Logistics Infrastructure';
  domain: PlacementDomain;
  icon: string;
  color: string;
  description: string;
  padSize: 'Small' | 'Medium' | 'Large' | 'Fleet';
  // Validation constraints
  minOrbitAltitudeKm?: number;    // Min safe altitude above surface
  maxOrbitAltitudeKm?: number;    // Max stable orbital altitude
  maxSurfaceGravityG?: number;     // Structural limit for ground installation
  minSurfaceGravityG?: number;     // Minimum gravity required (e.g. for bio fluid dynamics)
  requiresLandableBody?: boolean;  // Must be landable body
  requiresAtmosphere?: boolean;   // Atmosphere presence requirement
  exclusionRadiusKm: number;      // Proximity exclusion radius to other installations
  estimatedCostCr: number;
  constructionDays: number;
}

export const INFRASTRUCTURE_CATALOG: Record<InfrastructureAssetType, InfrastructureAssetMeta> = {
  coriolis_starport: {
    type: 'coriolis_starport',
    name: 'Coriolis Starport',
    category: 'Orbital Starport',
    domain: 'orbital',
    icon: '🔷',
    color: '#00e5ff',
    description: 'Standard cuboctahedral orbital starport with full docking bays, services, and high throughput.',
    padSize: 'Large',
    minOrbitAltitudeKm: 350,
    maxOrbitAltitudeKm: 50000,
    exclusionRadiusKm: 500,
    estimatedCostCr: 12500000000,
    constructionDays: 30,
  },
  orbis_starport: {
    type: 'orbis_starport',
    name: 'Orbis Starport',
    category: 'Orbital Starport',
    domain: 'orbital',
    icon: '⭕',
    color: '#ffb300',
    description: 'Majestic spinning ring habitat starport providing simulated Earth-standard 1.0G centrifugal gravity.',
    padSize: 'Large',
    minOrbitAltitudeKm: 600,
    maxOrbitAltitudeKm: 75000,
    exclusionRadiusKm: 800,
    estimatedCostCr: 28000000000,
    constructionDays: 60,
  },
  ocellus_starport: {
    type: 'ocellus_starport',
    name: 'Ocellus Starport',
    category: 'Orbital Starport',
    domain: 'orbital',
    icon: '🔮',
    color: '#76ff03',
    description: 'Bulbous spherical bow station engineered for deep space deployment and rapid colony nucleation.',
    padSize: 'Large',
    minOrbitAltitudeKm: 450,
    maxOrbitAltitudeKm: 60000,
    exclusionRadiusKm: 600,
    estimatedCostCr: 19500000000,
    constructionDays: 45,
  },
  planetary_outpost: {
    type: 'planetary_outpost',
    name: 'Planetary Surface Outpost',
    category: 'Surface Installation',
    domain: 'surface',
    icon: '🏛️',
    color: '#ff9100',
    description: 'Surface base complex housing administrative nodes, trade terminal, and planetary landing bays.',
    padSize: 'Large',
    maxSurfaceGravityG: 3.5,
    minSurfaceGravityG: 0.01,
    requiresLandableBody: true,
    exclusionRadiusKm: 120,
    estimatedCostCr: 4500000000,
    constructionDays: 21,
  },
  bio_dome: {
    type: 'bio_dome',
    name: 'Hydroponic Bio Dome',
    category: 'Surface Installation',
    domain: 'surface',
    icon: '🌿',
    color: '#00e676',
    description: 'Pressurized agricultural biosphere synthesizing food rations, algae culture, and atmospheric scrubbers.',
    padSize: 'Medium',
    maxSurfaceGravityG: 2.2,
    minSurfaceGravityG: 0.05,
    requiresLandableBody: true,
    exclusionRadiusKm: 60,
    estimatedCostCr: 1800000000,
    constructionDays: 14,
  },
  mining_extractor: {
    type: 'mining_extractor',
    name: 'Planetary Mining Extractor',
    category: 'Surface Installation',
    domain: 'surface',
    icon: '⛏️',
    color: '#ffd600',
    description: 'Subterranean deep-crust extractor and heavy processing plant for raw mineral and metal extraction.',
    padSize: 'Medium',
    maxSurfaceGravityG: 4.0,
    minSurfaceGravityG: 0.02,
    requiresLandableBody: true,
    exclusionRadiusKm: 80,
    estimatedCostCr: 2200000000,
    constructionDays: 18,
  },
  carrier_parking_slot: {
    type: 'carrier_parking_slot',
    name: 'Fleet Carrier Parking Slot',
    category: 'Logistics Infrastructure',
    domain: 'orbital',
    icon: '🚀',
    color: '#e040fb',
    description: 'Designated orbital beacon lane allowing CMDR Drake-Class Fleet Carriers to moor stably without drifting.',
    padSize: 'Fleet',
    minOrbitAltitudeKm: 1200,
    maxOrbitAltitudeKm: 120000,
    exclusionRadiusKm: 300,
    estimatedCostCr: 750000000,
    constructionDays: 7,
  },
};

export interface CelestialBodyInfo {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'barycentre';
  subType: string;
  distanceLs: number;
  radiusKm: number;
  gravityG?: number;
  temperatureK?: number;
  landable?: boolean;
  atmosphere?: string;
  rings?: { name: string; innerRadiusKm: number; outerRadiusKm: number }[];
  parentId?: string;
  spectralClass?: string;
}

export interface PlacedAsset {
  id: string;
  assetType: InfrastructureAssetType;
  customName: string;
  parentBodyId: string;
  parentBodyName: string;
  domain: PlacementDomain;
  // Orbital parameters
  orbitalAltitudeKm?: number;      // Distance above surface
  orbitalPhaseDeg?: number;        // Angle 0-360 deg
  // Surface parameters
  surfaceLatitude?: number;        // -90 to +90 deg
  surfaceLongitude?: number;       // -180 to +180 deg
  // Metadata
  sponsorCmdr?: string;
  createdAt: number;
  notes?: string;
}

export interface PlacementValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface ColonisationBlueprint {
  version: string;
  systemName: string;
  systemStarClass: string;
  securityStatus: 'Anarchy' | 'Low' | 'Medium' | 'High';
  economyTarget: 'High Tech' | 'Industrial' | 'Extraction' | 'Refinery' | 'Agriculture' | 'Colony';
  planName: string;
  authorCmdr: string;
  createdIso: string;
  description: string;
  assets: PlacedAsset[];
}

export interface SystemArchitectModel {
  systemName: string;
  bodies: CelestialBodyInfo[];
  blueprint: ColonisationBlueprint;
}

/**
 * Validates placement of an asset against system bodies and existing installations.
 */
export function validateAssetPlacement(
  assetType: InfrastructureAssetType,
  body: CelestialBodyInfo,
  placement: {
    altitudeKm?: number;
    phaseDeg?: number;
    latitude?: number;
    longitude?: number;
  },
  existingAssets: PlacedAsset[],
  editingAssetId?: string
): { isValid: boolean; issues: PlacementValidationIssue[] } {
  const meta = INFRASTRUCTURE_CATALOG[assetType];
  const issues: PlacementValidationIssue[] = [];

  if (!meta) {
    return {
      isValid: false,
      issues: [{ severity: 'error', code: 'UNKNOWN_ASSET', message: 'Unknown infrastructure asset type.' }],
    };
  }

  // Domain rule 1: Stars & Barycentres cannot host surface installations
  if (meta.domain === 'surface') {
    if (body.type === 'star' || body.type === 'barycentre') {
      issues.push({
        severity: 'error',
        code: 'INVALID_PARENT_TYPE',
        message: `${meta.name} cannot be constructed on a star or barycentric point.`,
      });
    }

    // Landable requirement
    if (meta.requiresLandableBody && !body.landable) {
      issues.push({
        severity: 'error',
        code: 'BODY_NOT_LANDABLE',
        message: `${body.name} is not designated landable (hazardous atmosphere or high-G envelope).`,
      });
    }

    // Gravity constraints
    const g = body.gravityG ?? 1.0;
    if (meta.maxSurfaceGravityG !== undefined && g > meta.maxSurfaceGravityG) {
      issues.push({
        severity: 'error',
        code: 'GRAVITY_EXCEEDED',
        message: `Surface gravity (${g.toFixed(2)}G) exceeds maximum rating for ${meta.name} (${meta.maxSurfaceGravityG}G). Structural collapse risk!`,
      });
    }

    if (meta.minSurfaceGravityG !== undefined && g < meta.minSurfaceGravityG) {
      issues.push({
        severity: 'warning',
        code: 'LOW_GRAVITY',
        message: `Low gravity (${g.toFixed(2)}G) requires microgravity anchoring and fluid stabilization.`,
      });
    }

    // Coordinates check
    const lat = placement.latitude ?? 0;
    const lon = placement.longitude ?? 0;
    if (lat < -90 || lat > 90) {
      issues.push({
        severity: 'error',
        code: 'INVALID_COORDINATES',
        message: `Latitude (${lat}°) must be within [-90°, +90°].`,
      });
    }
    if (lon < -180 || lon > 180) {
      issues.push({
        severity: 'error',
        code: 'INVALID_COORDINATES',
        message: `Longitude (${lon}°) must be within [-180°, +180°].`,
      });
    }

    // Proximity check on surface with other surface assets
    for (const other of existingAssets) {
      if (other.id === editingAssetId) continue;
      if (other.parentBodyId !== body.id || other.domain !== 'surface') continue;

      if (other.surfaceLatitude !== undefined && other.surfaceLongitude !== undefined) {
        const distKm = calculateSurfaceDistanceKm(
          lat,
          lon,
          other.surfaceLatitude,
          other.surfaceLongitude,
          body.radiusKm
        );
        const requiredExclusion = Math.max(meta.exclusionRadiusKm, INFRASTRUCTURE_CATALOG[other.assetType].exclusionRadiusKm);
        if (distKm < requiredExclusion) {
          issues.push({
            severity: 'error',
            code: 'PROXIMITY_VIOLATION',
            message: `Too close to "${other.customName}" (${distKm.toFixed(0)} km < minimum exclusion ${requiredExclusion} km).`,
          });
        }
      }
    }
  }

  // Domain rule 2: Orbital installations
  if (meta.domain === 'orbital') {
    const alt = placement.altitudeKm ?? 1000;
    if (meta.minOrbitAltitudeKm !== undefined && alt < meta.minOrbitAltitudeKm) {
      issues.push({
        severity: 'error',
        code: 'ORBIT_TOO_LOW',
        message: `Orbital altitude (${alt.toLocaleString()} km) is below Roche / atmospheric drag safety floor (${meta.minOrbitAltitudeKm.toLocaleString()} km).`,
      });
    }

    if (meta.maxOrbitAltitudeKm !== undefined && alt > meta.maxOrbitAltitudeKm) {
      issues.push({
        severity: 'warning',
        code: 'ORBIT_HIGH',
        message: `Orbital altitude (${alt.toLocaleString()} km) approaches the Hill sphere boundary of ${body.name}. Stationkeeping fuel costs will increase.`,
      });
    }

    // Ring collision check
    if (body.rings && body.rings.length > 0) {
      for (const ring of body.rings) {
        const orbitalRadius = body.radiusKm + alt;
        if (orbitalRadius >= ring.innerRadiusKm && orbitalRadius <= ring.outerRadiusKm) {
          issues.push({
            severity: 'error',
            code: 'RING_COLLISION',
            message: `Orbital radius (${orbitalRadius.toLocaleString()} km) sits directly inside ${ring.name} dense asteroid ring (${ring.innerRadiusKm.toLocaleString()} - ${ring.outerRadiusKm.toLocaleString()} km). Catastrophic debris collision hazard!`,
          });
        }
      }
    }

    // Proximity check on orbital assets
    for (const other of existingAssets) {
      if (other.id === editingAssetId) continue;
      if (other.parentBodyId !== body.id || other.domain !== 'orbital') continue;

      if (other.orbitalAltitudeKm !== undefined) {
        const altDiff = Math.abs(alt - other.orbitalAltitudeKm);
        const phaseDiff = Math.abs((placement.phaseDeg ?? 0) - (other.orbitalPhaseDeg ?? 0));
        const effectivePhaseDiff = Math.min(phaseDiff, 360 - phaseDiff);

        // If altitudes are within 500 km and phase angle within 15 degrees
        if (altDiff < 300 && effectivePhaseDiff < 15) {
          issues.push({
            severity: 'error',
            code: 'ORBITAL_SLOT_COLLISION',
            message: `Orbital slot overlaps with "${other.customName}" (Altitude delta ${altDiff.toFixed(0)} km, Angular separation ${effectivePhaseDiff.toFixed(1)}°).`,
          });
        }
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return {
    isValid: !hasErrors,
    issues,
  };
}

/**
 * Calculates great-circle surface distance in kilometers using the Haversine formula.
 */
export function calculateSurfaceDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

/**
 * Generates canonical star system bodies for default / colonisation scenarios (Sol, Colonia, or custom developing system).
 */
export function getDevelopingColonySystem(): { systemName: string; bodies: CelestialBodyInfo[] } {
  return {
    systemName: 'Eol Prou RS-T d3-94',
    bodies: [
      {
        id: 'star_a',
        name: 'Eol Prou RS-T d3-94 A',
        type: 'star',
        subType: 'F (White) Star',
        distanceLs: 0,
        radiusKm: 875000,
        spectralClass: 'F',
        temperatureK: 6850,
      },
      {
        id: 'body_1',
        name: 'New Haven Prime',
        type: 'planet',
        subType: 'Earth-like world',
        distanceLs: 420.5,
        radiusKm: 6420,
        gravityG: 1.05,
        temperatureK: 288,
        landable: true,
        atmosphere: 'Suitable for water-based life',
        parentId: 'star_a',
      },
      {
        id: 'body_1_a',
        name: 'New Haven Prime Moon a',
        type: 'moon',
        subType: 'Rocky body',
        distanceLs: 421.2,
        radiusKm: 1840,
        gravityG: 0.18,
        temperatureK: 220,
        landable: true,
        atmosphere: 'No atmosphere',
        parentId: 'body_1',
      },
      {
        id: 'body_2',
        name: 'Sanctuary Foundry',
        type: 'planet',
        subType: 'High metal content world',
        distanceLs: 780.0,
        radiusKm: 5120,
        gravityG: 0.88,
        temperatureK: 340,
        landable: true,
        atmosphere: 'Thin Sulphur Dioxide',
        parentId: 'star_a',
      },
      {
        id: 'body_3',
        name: 'Aegis Giant',
        type: 'planet',
        subType: 'Class II gas giant',
        distanceLs: 1850.0,
        radiusKm: 58200,
        gravityG: 2.1,
        temperatureK: 165,
        landable: false,
        atmosphere: 'Hydrogen and Helium',
        parentId: 'star_a',
        rings: [
          {
            name: 'Aegis Inner Metallic Ring',
            innerRadiusKm: 75000,
            outerRadiusKm: 140000,
          },
        ],
      },
      {
        id: 'body_3_a',
        name: 'Aegis Custos',
        type: 'moon',
        subType: 'Icy body',
        distanceLs: 1854.5,
        radiusKm: 2600,
        gravityG: 0.32,
        temperatureK: 110,
        landable: true,
        atmosphere: 'Thin Argon',
        parentId: 'body_3',
      },
      {
        id: 'body_4',
        name: 'Persephone Deep',
        type: 'planet',
        subType: 'Icy body',
        distanceLs: 4100.0,
        radiusKm: 3400,
        gravityG: 0.45,
        temperatureK: 75,
        landable: true,
        atmosphere: 'Thin Neon',
        parentId: 'star_a',
      },
    ],
  };
}

/**
 * Encodes a ColonisationBlueprint into a compressed URL-safe hash/query string.
 */
export function encodeBlueprintToPermalink(blueprint: ColonisationBlueprint): string {
  try {
    const jsonStr = JSON.stringify(blueprint);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `colony_plan=${base64}`;
  } catch (err) {
    console.error('Failed to encode colonisation blueprint permalink:', err);
    return '';
  }
}

/**
 * Decodes a ColonisationBlueprint from a permalink query or hash string.
 */
export function decodeBlueprintFromPermalink(queryOrHash: string): ColonisationBlueprint | null {
  try {
    const raw = queryOrHash.startsWith('?') || queryOrHash.startsWith('#')
      ? queryOrHash.substring(1)
      : queryOrHash;
    const params = new URLSearchParams(raw);
    const base64 = params.get('colony_plan');
    if (!base64) return null;

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr) as ColonisationBlueprint;
    if (parsed && parsed.systemName && Array.isArray(parsed.assets)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to decode colonisation blueprint permalink:', err);
  }
  return null;
}

/**
 * Creates an empty default blueprint for a star system.
 */
export function createDefaultBlueprint(systemName: string): ColonisationBlueprint {
  return {
    version: '1.0.0',
    systemName,
    systemStarClass: 'F',
    securityStatus: 'Medium',
    economyTarget: 'High Tech',
    planName: `${systemName} Sovereign Colonisation Initiative`,
    authorCmdr: 'CMDR Jameson',
    createdIso: new Date().toISOString(),
    description: 'Master architecture blueprint for orbital logistics, planetary outposts, and fleet carrier moorings.',
    assets: [
      {
        id: 'coriolis_alpha',
        assetType: 'coriolis_starport',
        customName: 'Haven Station Hub',
        parentBodyId: 'body_1',
        parentBodyName: 'New Haven Prime',
        domain: 'orbital',
        orbitalAltitudeKm: 1200,
        orbitalPhaseDeg: 45,
        sponsorCmdr: 'CMDR Jameson',
        createdAt: Date.now() - 86400000,
        notes: 'Primary orbital trade gateway with large pad capability.',
      },
      {
        id: 'outpost_prime',
        assetType: 'planetary_outpost',
        customName: 'Haven City Alpha',
        parentBodyId: 'body_1',
        parentBodyName: 'New Haven Prime',
        domain: 'surface',
        surfaceLatitude: 14.25,
        surfaceLongitude: -42.8,
        sponsorCmdr: 'Colonial Council',
        createdAt: Date.now() - 43200000,
        notes: 'Central planetary administrative complex and commerce outpost.',
      },
      {
        id: 'extractor_foundry',
        assetType: 'mining_extractor',
        customName: 'Vulcan Deep Drill 01',
        parentBodyId: 'body_2',
        parentBodyName: 'Sanctuary Foundry',
        domain: 'surface',
        surfaceLatitude: -33.5,
        surfaceLongitude: 108.2,
        sponsorCmdr: 'Mining Syndicate',
        createdAt: Date.now() - 21600000,
        notes: 'Automated deep mantle excavator extracting Titanium and Superconductors.',
      },
      {
        id: 'carrier_anchor_01',
        assetType: 'carrier_parking_slot',
        customName: 'Carrier Moor Alpha',
        parentBodyId: 'body_1',
        parentBodyName: 'New Haven Prime',
        domain: 'orbital',
        orbitalAltitudeKm: 5000,
        orbitalPhaseDeg: 190,
        sponsorCmdr: 'Logistics Fleet',
        createdAt: Date.now(),
        notes: 'Stationary mooring zone reserved for supply freighters and fleet carriers.',
      },
    ],
  };
}
