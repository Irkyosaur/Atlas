// Location: atlas/client/src/lib/engine/status_flags_decoder.ts
// Stage 11.2: Real-Time Cockpit Telemetry HUD & Status.json Poller
// Decodes 32-bit unsigned integer Flags & Flags2 bitmasks from Elite Dangerous Status.json,
// tracks Fuel (FuelMain, FuelReservoir), Pips allocation (SYS/ENG/WEP half-pips), Active FireGroup (A-H),
// and Planetary Approach Telemetry (Altitude, Heading, Lat/Lon, PlanetRadius, Surface Gravity G).

import type { StatusTelemetrySnapshot } from './journal_watcher_engine';

export const STATUS_FLAGS = {
  DOCKED: 1 << 0,                   // 0x00000001 - Docked on a landing pad
  LANDED: 1 << 1,                   // 0x00000002 - Landed on planet surface
  LANDING_GEAR_DOWN: 1 << 2,        // 0x00000004 - Landing Gear Down
  SHIELDS_UP: 1 << 3,               // 0x00000008 - Shields Up
  SUPERCRUISE: 1 << 4,              // 0x00000010 - Supercruise
  FLIGHT_ASSIST_OFF: 1 << 5,        // 0x00000020 - Flight Assist Off
  HARDPOINTS_DEPLOYED: 1 << 6,      // 0x00000040 - Hardpoints Deployed
  IN_WING: 1 << 7,                  // 0x00000080 - In Wing
  LIGHTS_ON: 1 << 8,                // 0x00000100 - Lights On
  CARGO_SCOOP_DEPLOYED: 1 << 9,     // 0x00000200 - Cargo Scoop Deployed
  SILENT_RUNNING: 1 << 10,          // 0x00000400 - Silent Running
  SCOOPING_FUEL: 1 << 11,           // 0x00000800 - Scooping Fuel
  SRV_HANDBRAKE: 1 << 12,           // 0x00001000 - SRV Handbrake
  SRV_TURRET_VIEW: 1 << 13,         // 0x00002000 - SRV using Turret view
  SRV_TURRET_RETRACTED: 1 << 14,    // 0x00004000 - SRV Turret retracted (close to ship)
  SRV_DRIVE_ASSIST: 1 << 15,        // 0x00008000 - SRV DriveAssist
  FSD_MASS_LOCKED: 1 << 16,         // 0x00010000 - FSD MassLocked
  FSD_CHARGING: 1 << 17,            // 0x00020000 - FSD Charging
  FSD_COOLDOWN: 1 << 18,            // 0x00040000 - FSD Cooldown
  LOW_FUEL: 1 << 19,                // 0x00080000 - Low Fuel (< 25%)
  OVERHEATING: 1 << 20,             // 0x00100000 - Overheating (> 100%)
  HAS_LAT_LONG: 1 << 21,            // 0x00200000 - Has Lat Long (Planetary Approach / Orbital Cruise)
  IS_IN_DANGER: 1 << 22,            // 0x00400000 - IsInDanger (Flight In Danger)
  BEING_INTERDICTED: 1 << 23,       // 0x00800000 - Being Interdicted
  IN_MAIN_SHIP: 1 << 24,            // 0x01000000 - In MainShip
  IN_FIGHTER: 1 << 25,              // 0x02000000 - In Fighter
  IN_SRV: 1 << 26,                  // 0x04000000 - In SRV
  HUD_ANALYSIS_MODE: 1 << 27,       // 0x08000000 - Hud in Analysis mode
  NIGHT_VISION: 1 << 28,            // 0x10000000 - Night Vision
  ALTITUDE_FROM_AVG_RADIUS: 1 << 29,// 0x20000000 - Altitude from Average radius
  FSD_JUMP: 1 << 30,                // 0x40000000 - fsdJump (Witchspace / Hyperspace)
  SRV_HIGH_BEAM: (1 << 31) >>> 0,   // 0x80000000 - srvHighBeam
} as const;

export const STATUS_FLAGS2 = {
  ON_FOOT: 1 << 0,                  // 0x00000001 - OnFoot
  IN_TAXI: 1 << 1,                  // 0x00000002 - InTaxi
  IN_MULTICREW: 1 << 2,             // 0x00000004 - InMulticrew
  ON_FOOT_IN_STATION: 1 << 3,       // 0x00000008 - OnFootInStation
  ON_FOOT_ON_PLANET: 1 << 4,        // 0x00000010 - OnFootOnPlanet
  AIM_DOWN_SIGHT: 1 << 5,           // 0x00000020 - AimDownSight
  LOW_OXYGEN: 1 << 6,               // 0x00000040 - LowOxygen
  LOW_HEALTH: 1 << 7,               // 0x00000080 - LowHealth
  COLD: 1 << 8,                     // 0x00000100 - Cold
  HOT: 1 << 9,                      // 0x00000200 - Hot
  VERY_COLD: 1 << 10,               // 0x00000400 - VeryCold
  VERY_HOT: 1 << 11,                // 0x00000800 - VeryHot
  GLIDE_MODE: 1 << 12,              // 0x00001000 - GlideMode
  ON_FOOT_IN_HANGAR: 1 << 13,       // 0x00002000 - OnFootInHangar
  ON_FOOT_SOCIAL_SPACE: 1 << 14,    // 0x00004000 - OnFootSocialSpace
  ON_FOOT_EXTERIOR: 1 << 15,        // 0x00008000 - OnFootExterior
  BREATHABLE_ATMOSPHERE: 1 << 16,   // 0x00010000 - BreathableAtmosphere
  TELEPRESENCE_MULTICREW: 1 << 17,  // 0x00020000 - TelepresenceMulticrew
  PHYSICAL_MULTICREW: 1 << 18,      // 0x00040000 - PhysicalMulticrew
  FSD_HYPERDRIVE_CHARGING: 1 << 19, // 0x00080000 - FsdHyperdriveCharging
} as const;

export interface DecodedCockpitFlags {
  // Primary Stage 11.2 Task 1 Required Flags
  landingGearDown: boolean;
  cargoScoopDeployed: boolean;
  lightsOn: boolean;
  flightAssistOff: boolean;
  flightAssistOn: boolean;
  hardpointsDeployed: boolean;
  shieldsUp: boolean;
  supercruise: boolean;
  flightInDanger: boolean;
  overheating: boolean;
  lowFuel: boolean;
  inSrv: boolean;
  onFoot: boolean;

  // Extended Horizons / Odyssey Avionics Flags
  docked: boolean;
  landed: boolean;
  silentRunning: boolean;
  scoopingFuel: boolean;
  fsdMassLocked: boolean;
  fsdCharging: boolean;
  fsdCooldown: boolean;
  fsdJump: boolean;
  hasLatLong: boolean;
  beingInterdicted: boolean;
  inMainShip: boolean;
  inFighter: boolean;
  hudAnalysisMode: boolean;
  nightVision: boolean;
  altitudeFromAvgRadius: boolean;
  glideMode: boolean;
  breathableAtmosphere: boolean;
  lowOxygen: boolean;
  lowHealth: boolean;
  fsdHyperdriveCharging: boolean;
}

export interface CockpitIndicatorDescriptor {
  id: string;
  label: string;
  shortCode: string;
  active: boolean;
  variant: 'orange' | 'amber' | 'cyan' | 'danger';
  sourceMask: 'Flags' | 'Flags2';
  hexBit: string;
  flagBit: number;
  iconType:
    | 'gear'
    | 'scoop'
    | 'lights'
    | 'fa'
    | 'hardpoints'
    | 'shields'
    | 'supercruise'
    | 'danger'
    | 'heat'
    | 'fuel'
    | 'srv'
    | 'onfoot'
    | 'silent'
    | 'masslock'
    | 'nightvision'
    | 'glide';
}

export interface PlanetaryApproachTelemetry {
  isApproachingOrOnBody: boolean;
  bodyName: string;
  altitudeMeters: number;
  altitudeKm: number;
  headingDeg: number;
  latitudeDeg: number;
  longitudeDeg: number;
  planetRadiusMeters: number;
  planetRadiusKm: number;
  surfaceGravityG: number;
  orbitalCruiseActive: boolean;
  glideModeActive: boolean;
  altitudeFromAvgRadius: boolean;
  gravityWarningLevel: 'NOMINAL' | 'CAUTION_MODERATE_G' | 'DANGER_HIGH_G';
}

export const FIRE_GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const GUI_FOCUS_LABELS: Record<number, string> = {
  0: 'NO FOCUS (COCKPIT VIEW)',
  1: 'INTERNAL PANEL (RIGHT)',
  2: 'EXTERNAL PANEL (LEFT)',
  3: 'COMMS PANEL (TOP)',
  4: 'ROLE PANEL (BOTTOM)',
  5: 'STATION SERVICES',
  6: 'GALAXY MAP',
  7: 'SYSTEM MAP',
  8: 'ORRERY VIEW',
  9: 'FSS MODE',
  10: 'SAA / DSS MODE',
  11: 'CODEX',
};

/**
 * Task 1: Decode 32-bit unsigned integer Flags & Flags2 bitmasks from Status.json.
 */
export function decodeStatusFlags(flags: number = 0, flags2: number = 0): DecodedCockpitFlags {
  const f1 = flags >>> 0;
  const f2 = flags2 >>> 0;

  const hasBit1 = (mask: number): boolean => ((f1 & mask) >>> 0) !== 0;
  const hasBit2 = (mask: number): boolean => ((f2 & mask) >>> 0) !== 0;

  const flightAssistOff = hasBit1(STATUS_FLAGS.FLIGHT_ASSIST_OFF);
  const onFoot =
    hasBit2(STATUS_FLAGS2.ON_FOOT) ||
    hasBit2(STATUS_FLAGS2.ON_FOOT_ON_PLANET) ||
    hasBit2(STATUS_FLAGS2.ON_FOOT_IN_STATION);

  return {
    landingGearDown: hasBit1(STATUS_FLAGS.LANDING_GEAR_DOWN),
    cargoScoopDeployed: hasBit1(STATUS_FLAGS.CARGO_SCOOP_DEPLOYED),
    lightsOn: hasBit1(STATUS_FLAGS.LIGHTS_ON),
    flightAssistOff,
    flightAssistOn: !flightAssistOff,
    hardpointsDeployed: hasBit1(STATUS_FLAGS.HARDPOINTS_DEPLOYED),
    shieldsUp: hasBit1(STATUS_FLAGS.SHIELDS_UP),
    supercruise: hasBit1(STATUS_FLAGS.SUPERCRUISE),
    flightInDanger: hasBit1(STATUS_FLAGS.IS_IN_DANGER),
    overheating: hasBit1(STATUS_FLAGS.OVERHEATING),
    lowFuel: hasBit1(STATUS_FLAGS.LOW_FUEL),
    inSrv: hasBit1(STATUS_FLAGS.IN_SRV),
    onFoot,

    docked: hasBit1(STATUS_FLAGS.DOCKED),
    landed: hasBit1(STATUS_FLAGS.LANDED),
    silentRunning: hasBit1(STATUS_FLAGS.SILENT_RUNNING),
    scoopingFuel: hasBit1(STATUS_FLAGS.SCOOPING_FUEL),
    fsdMassLocked: hasBit1(STATUS_FLAGS.FSD_MASS_LOCKED),
    fsdCharging: hasBit1(STATUS_FLAGS.FSD_CHARGING),
    fsdCooldown: hasBit1(STATUS_FLAGS.FSD_COOLDOWN),
    fsdJump: hasBit1(STATUS_FLAGS.FSD_JUMP),
    hasLatLong: hasBit1(STATUS_FLAGS.HAS_LAT_LONG),
    beingInterdicted: hasBit1(STATUS_FLAGS.BEING_INTERDICTED),
    inMainShip: hasBit1(STATUS_FLAGS.IN_MAIN_SHIP),
    inFighter: hasBit1(STATUS_FLAGS.IN_FIGHTER),
    hudAnalysisMode: hasBit1(STATUS_FLAGS.HUD_ANALYSIS_MODE),
    nightVision: hasBit1(STATUS_FLAGS.NIGHT_VISION),
    altitudeFromAvgRadius: hasBit1(STATUS_FLAGS.ALTITUDE_FROM_AVG_RADIUS),
    glideMode: hasBit2(STATUS_FLAGS2.GLIDE_MODE),
    breathableAtmosphere: hasBit2(STATUS_FLAGS2.BREATHABLE_ATMOSPHERE),
    lowOxygen: hasBit2(STATUS_FLAGS2.LOW_OXYGEN),
    lowHealth: hasBit2(STATUS_FLAGS2.LOW_HEALTH),
    fsdHyperdriveCharging: hasBit2(STATUS_FLAGS2.FSD_HYPERDRIVE_CHARGING),
  };
}

/**
 * Builds the ordered list of 16 cockpit status indicators (12 core Task 1 indicators + 4 tactical avionics indicators).
 */
export function buildCockpitIndicators(
  flags: number = 0,
  flags2: number = 0
): CockpitIndicatorDescriptor[] {
  const d = decodeStatusFlags(flags, flags2);

  return [
    {
      id: 'landing_gear',
      label: 'LANDING GEAR',
      shortCode: 'GEAR',
      active: d.landingGearDown,
      variant: 'orange',
      sourceMask: 'Flags',
      hexBit: '0x00000004',
      flagBit: STATUS_FLAGS.LANDING_GEAR_DOWN,
      iconType: 'gear',
    },
    {
      id: 'cargo_scoop',
      label: 'CARGO SCOOP',
      shortCode: 'SCOOP',
      active: d.cargoScoopDeployed,
      variant: 'orange',
      sourceMask: 'Flags',
      hexBit: '0x00000200',
      flagBit: STATUS_FLAGS.CARGO_SCOOP_DEPLOYED,
      iconType: 'scoop',
    },
    {
      id: 'lights',
      label: 'SHIP LIGHTS',
      shortCode: 'LIGHTS',
      active: d.lightsOn,
      variant: 'amber',
      sourceMask: 'Flags',
      hexBit: '0x00000100',
      flagBit: STATUS_FLAGS.LIGHTS_ON,
      iconType: 'lights',
    },
    {
      id: 'flight_assist',
      label: d.flightAssistOff ? 'FLIGHT ASSIST OFF' : 'FLIGHT ASSIST ON',
      shortCode: d.flightAssistOff ? 'FA OFF' : 'FA ON',
      active: d.flightAssistOff,
      variant: d.flightAssistOff ? 'amber' : 'orange',
      sourceMask: 'Flags',
      hexBit: '0x00000020',
      flagBit: STATUS_FLAGS.FLIGHT_ASSIST_OFF,
      iconType: 'fa',
    },
    {
      id: 'hardpoints',
      label: 'HARDPOINTS',
      shortCode: 'HDPTS',
      active: d.hardpointsDeployed,
      variant: 'orange',
      sourceMask: 'Flags',
      hexBit: '0x00000040',
      flagBit: STATUS_FLAGS.HARDPOINTS_DEPLOYED,
      iconType: 'hardpoints',
    },
    {
      id: 'shields_up',
      label: 'SHIELDS ONLINE',
      shortCode: 'SHIELDS',
      active: d.shieldsUp,
      variant: 'cyan',
      sourceMask: 'Flags',
      hexBit: '0x00000008',
      flagBit: STATUS_FLAGS.SHIELDS_UP,
      iconType: 'shields',
    },
    {
      id: 'supercruise',
      label: 'SUPERCRUISE',
      shortCode: 'FSD SC',
      active: d.supercruise,
      variant: 'amber',
      sourceMask: 'Flags',
      hexBit: '0x00000010',
      flagBit: STATUS_FLAGS.SUPERCRUISE,
      iconType: 'supercruise',
    },
    {
      id: 'flight_danger',
      label: 'FLIGHT IN DANGER',
      shortCode: 'DANGER',
      active: d.flightInDanger,
      variant: 'danger',
      sourceMask: 'Flags',
      hexBit: '0x00400000',
      flagBit: STATUS_FLAGS.IS_IN_DANGER,
      iconType: 'danger',
    },
    {
      id: 'overheating',
      label: 'OVERHEATING (>100%)',
      shortCode: 'HEAT!',
      active: d.overheating,
      variant: 'danger',
      sourceMask: 'Flags',
      hexBit: '0x00100000',
      flagBit: STATUS_FLAGS.OVERHEATING,
      iconType: 'heat',
    },
    {
      id: 'low_fuel',
      label: 'LOW FUEL (<25%)',
      shortCode: 'FUEL!',
      active: d.lowFuel,
      variant: 'danger',
      sourceMask: 'Flags',
      hexBit: '0x00080000',
      flagBit: STATUS_FLAGS.LOW_FUEL,
      iconType: 'fuel',
    },
    {
      id: 'in_srv',
      label: 'IN SRV SCARAB',
      shortCode: 'SRV',
      active: d.inSrv,
      variant: 'amber',
      sourceMask: 'Flags',
      hexBit: '0x04000000',
      flagBit: STATUS_FLAGS.IN_SRV,
      iconType: 'srv',
    },
    {
      id: 'on_foot',
      label: 'ODYSSEY ON FOOT',
      shortCode: 'ON FOOT',
      active: d.onFoot,
      variant: 'cyan',
      sourceMask: 'Flags2',
      hexBit: '0x00000001',
      flagBit: STATUS_FLAGS2.ON_FOOT,
      iconType: 'onfoot',
    },
    {
      id: 'silent_running',
      label: 'SILENT RUNNING',
      shortCode: 'SILENT',
      active: d.silentRunning,
      variant: 'danger',
      sourceMask: 'Flags',
      hexBit: '0x00000400',
      flagBit: STATUS_FLAGS.SILENT_RUNNING,
      iconType: 'silent',
    },
    {
      id: 'fsd_mass_lock',
      label: 'FSD MASS LOCKED',
      shortCode: 'MASS LK',
      active: d.fsdMassLocked,
      variant: 'amber',
      sourceMask: 'Flags',
      hexBit: '0x00010000',
      flagBit: STATUS_FLAGS.FSD_MASS_LOCKED,
      iconType: 'masslock',
    },
    {
      id: 'night_vision',
      label: 'NIGHT VISION',
      shortCode: 'NVG',
      active: d.nightVision,
      variant: 'cyan',
      sourceMask: 'Flags',
      hexBit: '0x10000000',
      flagBit: STATUS_FLAGS.NIGHT_VISION,
      iconType: 'nightvision',
    },
    {
      id: 'glide_mode',
      label: 'ATMOSPHERIC GLIDE',
      shortCode: 'GLIDE',
      active: d.glideMode,
      variant: 'cyan',
      sourceMask: 'Flags2',
      hexBit: '0x00001000',
      flagBit: STATUS_FLAGS2.GLIDE_MODE,
      iconType: 'glide',
    },
  ];
}

/**
 * Formats half-pip integer [0..8] into human-readable whole/half pips (0.0 .. 4.0).
 */
export function formatPipValue(halfPips: number): string {
  const clamped = Math.max(0, Math.min(8, Number(halfPips) || 0));
  return (clamped / 2).toFixed(1);
}

/**
 * Converts 0-indexed FireGroup integer (0..7) to Cockpit Firegroup letter (A..H).
 */
export function formatFireGroupLetter(fireGroupIndex: number): string {
  const idx = Math.max(0, Math.min(7, Math.floor(Number(fireGroupIndex) || 0)));
  return FIRE_GROUP_LETTERS[idx] ?? 'A';
}

/**
 * Task 4: Extracts or computes Planetary Approach Telemetry (Altitude, Heading, Lat/Lon, PlanetRadius, and Surface Gravity G).
 */
export function extractPlanetaryApproachTelemetry(
  snapshot: StatusTelemetrySnapshot | null | undefined
): PlanetaryApproachTelemetry {
  if (!snapshot) {
    return {
      isApproachingOrOnBody: false,
      bodyName: 'Deep Space',
      altitudeMeters: 0,
      altitudeKm: 0,
      headingDeg: 0,
      latitudeDeg: 0,
      longitudeDeg: 0,
      planetRadiusMeters: 0,
      planetRadiusKm: 0,
      surfaceGravityG: 0,
      orbitalCruiseActive: false,
      glideModeActive: false,
      altitudeFromAvgRadius: false,
      gravityWarningLevel: 'NOMINAL',
    };
  }

  const decoded = decodeStatusFlags(snapshot.flags, snapshot.flags2);
  const hasCoords =
    decoded.hasLatLong ||
    snapshot.latitude !== undefined ||
    snapshot.longitude !== undefined ||
    snapshot.altitude !== undefined;

  const altitudeMeters = Number(snapshot.altitude ?? 0);
  const headingDeg = ((Number(snapshot.heading ?? 0) % 360) + 360) % 360;
  const latitudeDeg = Number(snapshot.latitude ?? 0);
  const longitudeDeg = Number(snapshot.longitude ?? 0);
  const planetRadiusMeters = Number(snapshot.planetRadius ?? 0);

  // Use reported Gravity from Status.json if present, or derive realistic rocky/HMC surface gravity from PlanetRadius
  let surfaceGravityG = Number(snapshot.gravity ?? 0);
  if (surfaceGravityG <= 0 && planetRadiusMeters > 0) {
    // Approximate rocky planet surface gravity relative to Earth radius (6,371,000 m -> 1.00 G)
    surfaceGravityG = Number((planetRadiusMeters / 6371000).toFixed(2));
  } else if (surfaceGravityG <= 0 && hasCoords) {
    surfaceGravityG = 0.42;
  }

  const gravityWarningLevel: PlanetaryApproachTelemetry['gravityWarningLevel'] =
    surfaceGravityG >= 2.0
      ? 'DANGER_HIGH_G'
      : surfaceGravityG >= 1.1
        ? 'CAUTION_MODERATE_G'
        : 'NOMINAL';

  return {
    isApproachingOrOnBody: hasCoords,
    bodyName: snapshot.bodyName || 'Unmapped Planetary Body',
    altitudeMeters,
    altitudeKm: Number((altitudeMeters / 1000).toFixed(2)),
    headingDeg,
    latitudeDeg,
    longitudeDeg,
    planetRadiusMeters,
    planetRadiusKm: Number((planetRadiusMeters / 1000).toFixed(1)),
    surfaceGravityG: Number(surfaceGravityG.toFixed(2)),
    orbitalCruiseActive: hasCoords && decoded.supercruise,
    glideModeActive: decoded.glideMode,
    altitudeFromAvgRadius: decoded.altitudeFromAvgRadius,
    gravityWarningLevel,
  };
}
