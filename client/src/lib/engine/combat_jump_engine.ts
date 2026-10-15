/**
 * Atlas Shipbuilder Engine - Combat TTK Matrix, Jump Range Engine & Parity Calculator
 * Stage 7.4: Jump range physics, Shield & Armour EHP, Diminishing Returns, MRP absorption, and TTK projections
 * Parity: Elite Dangerous authentic physics, Coriolis, and EDSY
 */

import {
  type ShipChassis,
  type ShipLoadoutState,
} from './ship_catalog';
import {
  type ModuleEngineeringState,
  getDefaultModuleStats,
  calculateEngineeredStats,
  type CalculatedModuleStats,
} from './engineering_catalog';

// ============================================================================
// 1. FRAME SHIFT DRIVE CONSTANTS & JUMP RANGE PHYSICS
// ============================================================================

export interface FSDClassParameters {
  maxFuelPerJump: number; // Tonnes
  constant: number;       // Linear coefficient
  power: number;          // Exponent (often 2.0 to 2.75 depending on class/rating)
  baseOptMass: number;    // Tonnes (for standard A-rated FSD of this class)
}

/**
 * Authentic Elite Dangerous FSD Physics Parameters per Class (A-rated standard baselines)
 * Jump = (FuelPerJump / Constant)^(1 / Power) * (FSD OptMass / Ship Mass)
 */
export const FSD_CLASS_PARAMS: Record<number, FSDClassParameters> = {
  2: { maxFuelPerJump: 0.9, constant: 12.0, power: 2.00, baseOptMass: 90 },
  3: { maxFuelPerJump: 1.8, constant: 12.0, power: 2.15, baseOptMass: 150 },
  4: { maxFuelPerJump: 3.0, constant: 12.0, power: 2.30, baseOptMass: 525 },
  5: { maxFuelPerJump: 5.0, constant: 12.0, power: 2.45, baseOptMass: 1050 },
  6: { maxFuelPerJump: 8.0, constant: 12.0, power: 2.60, baseOptMass: 1800 },
  7: { maxFuelPerJump: 12.8, constant: 12.0, power: 2.75, baseOptMass: 2700 },
  8: { maxFuelPerJump: 17.0, constant: 12.0, power: 2.80, baseOptMass: 3800 },
};

export interface JumpRangeAnalytics {
  unladenJump: number;     // Current ship mass + full fuel tank
  ladenJump: number;       // Ship mass + full fuel tank + full cargo capacity
  maximumJump: number;     // Ship mass + minimal fuel (empty cargo, reserve fuel only)
  totalShipMass: number;   // Hull mass + installed modules mass
  fuelCapacity: number;    // Fuel tank size in tonnes
  cargoCapacity: number;   // Tonnes of cargo storage fitted
  fsdOptMass: number;      // Effective FSD optimal mass with engineering
  maxFuelPerJump: number;  // Tonnes per single max jump
}

// ============================================================================
// 2. RESISTANCE & DEFENSIVE HIT POINTS (EHP)
// ============================================================================

export interface ResistanceBreakdown {
  kinetic: number;   // Percentage e.g. 0.40 = 40%
  thermal: number;   // Percentage e.g. -0.20 = -20%
  explosive: number; // Percentage e.g. 0.50 = 50%
  caustic?: number;  // Percentage e.g. 0.10 = 10%
  absolute: number;  // Percentage 0.0 (unmitigated)
}

export interface EffectiveHitPoints {
  raw: number;        // Raw HP or MJ
  kineticEHP: number; // Raw / (1 - kineticRes)
  thermalEHP: number; // Raw / (1 - thermalRes)
  explosiveEHP: number;
  causticEHP?: number;
  absoluteEHP: number; // Equal to raw HP
  effectiveAverageEHP: number; // Weighted typical combat mix (40% Kinetic, 40% Thermal, 20% Explosive)
}

export interface DefensesSummary {
  shield: EffectiveHitPoints & {
    baseMJ: number;
    resistances: ResistanceBreakdown;
    boosterCount: number;
    brokenRegenRate: number; // MJ/s
    normalRegenRate: number; // MJ/s
    rechargeSeconds: number; // Time from broken to 100%
  };
  armour: EffectiveHitPoints & {
    baseHullHP: number;
    hullHardness: number;
    resistances: ResistanceBreakdown;
    hrpCount: number;
    hrpTotalHP: number;
  };
  mrp: {
    totalIntegrity: number;
    layeringAbsorptionRate: number; // 60% for single, 84% for double (1 - (1-0.6)*(1-0.6)), etc.
    mrpCount: number;
  };
  totalCombatEHP: number; // Combined Shield Average EHP + Armour Average EHP
}

// ============================================================================
// 3. COMBAT TIME-TO-KILL (TTK) PROJECTION MATRIX
// ============================================================================

export interface ThreatProfile {
  id: string;
  name: string;
  description: string;
  dpsKinetic: number;
  dpsThermal: number;
  dpsExplosive: number;
  dpsAbsolute: number;
  penetration: number; // Weapon Armour Piercing vs Ship Hardness
}

export const STANDARD_THREAT_BASELINES: ThreatProfile[] = [
  {
    id: 'corvette_4x_mc',
    name: '4x G5 Overcharged Multi-Cannons (PvP Meta)',
    description: 'Huge and Large Overcharged Incendiary & Corrosive Multi-Cannons sustained fire.',
    dpsKinetic: 85.0,
    dpsThermal: 95.0,
    dpsExplosive: 0.0,
    dpsAbsolute: 0.0,
    penetration: 68.0,
  },
  {
    id: 'pa_alpha_strike',
    name: '3x Plasma Accelerators + Railguns',
    description: 'High alpha absolute/thermal volley with focused phasing and super penetrator.',
    dpsKinetic: 28.0,
    dpsThermal: 45.0,
    dpsExplosive: 0.0,
    dpsAbsolute: 70.0,
    penetration: 100.0,
  },
  {
    id: 'thargoid_interceptor',
    name: 'Thargoid Medusa / Hydra Caustic Barrage',
    description: 'Alien swarm direct caustic and absolute shield-phasing lightning attack.',
    dpsKinetic: 10.0,
    dpsThermal: 15.0,
    dpsExplosive: 0.0,
    dpsAbsolute: 80.0,
    penetration: 100.0,
  },
  {
    id: 'laser_boat',
    name: 'Sustained Beam Laser Boat (PvE Combat Zone)',
    description: 'Heavy thermal shield stripping loadout with Efficient G5 Beam Lasers.',
    dpsKinetic: 12.0,
    dpsThermal: 140.0,
    dpsExplosive: 0.0,
    dpsAbsolute: 0.0,
    penetration: 50.0,
  },
];

export interface ThreatTTKProjection {
  threat: ThreatProfile;
  shieldEffectiveDPS: number;
  armourEffectiveDPS: number;
  shieldTimeToKillSeconds: number;
  hullTimeToKillSeconds: number;
  totalCombatTimeToKillSeconds: number;
}

// ============================================================================
// 4. CALCULATION ENGINES
// ============================================================================

/**
 * Authentic Shield Booster Diminishing Returns Stacking Curve
 * When cumulative booster resistance bonus exceeds 30%, a diminishing curve applies:
 * R_dim = 1 - (1 - R_base) * PRODUCT(1 - R_boost)
 * In Elite Dangerous: If resistance exceeds 30%, effective bonus = 0.30 + (Raw - 0.30) / (1 + (Raw - 0.30) / 0.70)
 * Hard ceiling asymptotically approaching 75% max resistance in-game.
 */
export function calculateShieldResistanceWithDiminishingReturns(
  baseResistance: number,
  boosterResistanceDeltas: number[]
): number {
  if (boosterResistanceDeltas.length === 0) return baseResistance;

  // Multiplicative resistance stacking: 1 - product(1 - delta)
  let combinedBoosterBonus = 1.0;
  for (const delta of boosterResistanceDeltas) {
    combinedBoosterBonus *= (1 - delta);
  }
  const rawBoosterRes = 1.0 - combinedBoosterBonus;

  // Apply frontier diminishing returns curve above 30% bonus
  let adjustedBoosterRes = rawBoosterRes;
  if (rawBoosterRes > 0.30) {
    const excess = rawBoosterRes - 0.30;
    // Diminishing factor: asymptotic ceiling at ~0.65-0.75
    adjustedBoosterRes = 0.30 + (excess / (1.0 + excess * 1.4));
  }

  // Combine with base generator resistance
  // Total damage taken multiplier = (1 - baseRes) * (1 - adjustedBoosterRes)
  const totalDamageTaken = (1.0 - baseResistance) * (1.0 - adjustedBoosterRes);
  const finalResistance = 1.0 - totalDamageTaken;

  // Hard safety clamp between -1.0 (-100%) and 0.75 (75% in-game maximum cap)
  return Math.min(0.75, Math.max(-1.0, finalResistance));
}

/**
 * Calculates FSD jump ranges according to authentic Elite Dangerous physics.
 */
export function calculateJumpRange(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineeringMap: Record<string, ModuleEngineeringState>
): JumpRangeAnalytics {
  const fsdSize = ship.coreInternals.frameShiftDrive || 5;
  const fsdParams = FSD_CLASS_PARAMS[fsdSize] || FSD_CLASS_PARAMS[5];

  // Base optimal mass for A-rated drive of this size
  let fsdOptMass = fsdParams.baseOptMass;
  let maxFuelPerJump = fsdParams.maxFuelPerJump;

  // Check FSD engineering
  const fsdEng = engineeringMap['core-fsd'];
  if (fsdEng && fsdEng.blueprintId && fsdEng.grade > 0) {
    const fsdStats = getDefaultModuleStats('core-fsd', 'core', fsdSize, loadout.coreModules.frameShiftDrive);
    const engineeredFsd = calculateEngineeredStats(fsdStats, fsdEng);
    if (engineeredFsd.modifiedOptMass) {
      fsdOptMass = engineeredFsd.modifiedOptMass;
    }
  }

  // Calculate total ship mass (hull mass + installed modules)
  let totalModuleMass = 0;
  let cargoCapacity = 0;
  const fuelCapacity = Math.pow(2, ship.coreInternals.fuelTank || 3); // standard fuel tank size in tonnes

  // Core module masses
  const coreModuleTypes: Record<string, { size: number; defaultMass: number }> = {
    'core-bulkheads': { size: ship.coreInternals.bulkheads, defaultMass: ship.hullMass * 0.1 },
    'core-pp': { size: ship.coreInternals.powerPlant, defaultMass: Math.pow(1.5, ship.coreInternals.powerPlant) * 1.8 },
    'core-thrusters': { size: ship.coreInternals.thrusters, defaultMass: Math.pow(1.6, ship.coreInternals.thrusters) * 1.5 },
    'core-fsd': { size: ship.coreInternals.frameShiftDrive, defaultMass: Math.pow(1.6, ship.coreInternals.frameShiftDrive) * 1.2 },
    'core-ls': { size: ship.coreInternals.lifeSupport, defaultMass: Math.pow(1.4, ship.coreInternals.lifeSupport) * 0.8 },
    'core-pd': { size: ship.coreInternals.powerDistributor, defaultMass: Math.pow(1.5, ship.coreInternals.powerDistributor) * 1.3 },
    'core-sensors': { size: ship.coreInternals.sensors, defaultMass: Math.pow(1.4, ship.coreInternals.sensors) * 0.9 },
    'core-fuel': { size: ship.coreInternals.fuelTank, defaultMass: 0 }, // tank mass is 0 unladen
  };

  for (const [slotId, info] of Object.entries(coreModuleTypes)) {
    let mass = info.defaultMass;
    const eng = engineeringMap[slotId];
    if (eng && eng.blueprintId && eng.grade > 0) {
      const stats = getDefaultModuleStats(slotId, 'core', info.size, 'Module');
      const calc = calculateEngineeredStats(stats, eng);
      mass = calc.modifiedMass;
    }
    totalModuleMass += mass;
  }

  // Optional modules mass & cargo
  ship.optionalSlots.forEach((slotSize, idx) => {
    const slotId = `optional-${idx}`;
    const installed = loadout.optionalModules[idx];
    if (installed) {
      if (installed.includes('Cargo Rack')) {
        cargoCapacity += Math.pow(2, slotSize);
      } else {
        let modMass = Math.pow(1.4, slotSize) * 2.0;
        const eng = engineeringMap[slotId];
        if (eng && eng.blueprintId && eng.grade > 0) {
          const stats = getDefaultModuleStats(slotId, 'optional', slotSize, installed);
          const calc = calculateEngineeredStats(stats, eng);
          modMass = calc.modifiedMass;
        }
        totalModuleMass += modMass;
      }
    }
  });

  // Military modules mass
  ship.militarySlots.forEach((slotSize, idx) => {
    const slotId = `military-${idx}`;
    const installed = loadout.militaryModules[idx];
    if (installed) {
      let modMass = Math.pow(1.4, slotSize) * 2.5; // HRP/MRP mass
      const eng = engineeringMap[slotId];
      if (eng && eng.blueprintId && eng.grade > 0) {
        const stats = getDefaultModuleStats(slotId, 'military', slotSize, installed);
        const calc = calculateEngineeredStats(stats, eng);
        modMass = calc.modifiedMass;
      }
      totalModuleMass += modMass;
    }
  });

  // Hardpoints mass
  ship.hardpointSlots.forEach((hp, idx) => {
    const slotId = hp.id;
    const installed = loadout.hardpointModules[idx];
    if (installed) {
      let modMass = Math.pow(2, hp.size);
      const eng = engineeringMap[slotId];
      if (eng && eng.blueprintId && eng.grade > 0) {
        const stats = getDefaultModuleStats(slotId, 'hardpoint', hp.size, installed);
        const calc = calculateEngineeredStats(stats, eng);
        modMass = calc.modifiedMass;
      }
      totalModuleMass += modMass;
    }
  });

  // Utility slots mass
  ship.utilitySlots.forEach((ut, idx) => {
    const slotId = ut.id;
    const installed = loadout.utilityModules[idx];
    if (installed) {
      let modMass = 1.3; // standard utility mass (e.g. 0A Shield Booster = 3.5T, Chaff = 1.3T)
      if (installed.includes('Shield Booster')) modMass = 3.5;
      const eng = engineeringMap[slotId];
      if (eng && eng.blueprintId && eng.grade > 0) {
        const stats = getDefaultModuleStats(slotId, 'utility', 0, installed);
        const calc = calculateEngineeredStats(stats, eng);
        modMass = calc.modifiedMass;
      }
      totalModuleMass += modMass;
    }
  });

  const unladenShipMass = +(ship.hullMass + totalModuleMass + fuelCapacity).toFixed(1);
  const ladenShipMass = +(unladenShipMass + cargoCapacity).toFixed(1);
  const maximumShipMass = +(ship.hullMass + totalModuleMass + Math.min(fuelCapacity, maxFuelPerJump)).toFixed(1);

  // Jump = (FuelPerJump / Constant)^(1 / Power) * (FSD OptMass / Ship Mass)
  const jumpFuelFactor = Math.pow(maxFuelPerJump / fsdParams.constant, 1.0 / fsdParams.power);

  const unladenJump = +((jumpFuelFactor * (fsdOptMass / unladenShipMass))).toFixed(2);
  const ladenJump = +((jumpFuelFactor * (fsdOptMass / ladenShipMass))).toFixed(2);
  const maximumJump = +((jumpFuelFactor * (fsdOptMass / maximumShipMass))).toFixed(2);

  return {
    unladenJump: Math.max(0.1, unladenJump),
    ladenJump: Math.max(0.1, ladenJump),
    maximumJump: Math.max(0.1, maximumJump),
    totalShipMass: unladenShipMass,
    fuelCapacity,
    cargoCapacity,
    fsdOptMass: Math.round(fsdOptMass),
    maxFuelPerJump,
  };
}

/**
 * Calculates complete defensive figures including Shield EHP, Armour EHP, MRP layering, and Diminishing Returns.
 */
export function calculateDefensesSummary(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineeringMap: Record<string, ModuleEngineeringState>
): DefensesSummary {
  // 1. BASE SHIELD GENERATOR & BOOSTERS
  // Standard base shield resistances in Elite: Kinetic 40% (0.40), Thermal -20% (-0.20), Explosive 50% (0.50), Absolute 0%
  const baseShieldKinetic = 0.40;
  const baseShieldThermal = -0.20;
  const baseShieldExplosive = 0.50;

  let totalBoosterShieldMJBonus = 0; // Each 0A booster gives +20% base shield multiplier
  const kinBoosterDeltas: number[] = [];
  const thermBoosterDeltas: number[] = [];
  const expBoosterDeltas: number[] = [];
  let boosterCount = 0;

  ship.utilitySlots.forEach((ut, idx) => {
    const slotId = ut.id;
    const installed = loadout.utilityModules[idx];
    if (installed && installed.includes('Shield Booster')) {
      boosterCount++;
      let boosterBonus = 0.20; // 20% shield multiplier
      let kinDelta = 0;
      let thermDelta = 0;
      let expDelta = 0;

      const eng = engineeringMap[slotId];
      if (eng && eng.blueprintId && eng.grade > 0) {
        if (eng.blueprintId.includes('resistance')) {
          // Resistance augmented booster: gives ~12-15% all res deltas
          kinDelta = 0.12 * (eng.percent / 100);
          thermDelta = 0.12 * (eng.percent / 100);
          expDelta = 0.12 * (eng.percent / 100);
        } else if (eng.blueprintId.includes('heavy')) {
          // Heavy duty booster: increases capacity bonus up to +35%
          boosterBonus = 0.20 + 0.15 * (eng.percent / 100);
        }
      }

      totalBoosterShieldMJBonus += boosterBonus;
      if (kinDelta > 0) kinBoosterDeltas.push(kinDelta);
      if (thermDelta > 0) thermBoosterDeltas.push(thermDelta);
      if (expDelta > 0) expBoosterDeltas.push(expDelta);
    }
  });

  // Calculate Final Shield MJ
  const shieldMultiplier = 1.0 + totalBoosterShieldMJBonus;
  const finalShieldMJ = +(ship.baseShield * shieldMultiplier).toFixed(1);

  // Apply Diminishing Returns Stacking Curve to Shield Boosters
  const shieldKinRes = +calculateShieldResistanceWithDiminishingReturns(baseShieldKinetic, kinBoosterDeltas).toFixed(3);
  const shieldThermRes = +calculateShieldResistanceWithDiminishingReturns(baseShieldThermal, thermBoosterDeltas).toFixed(3);
  const shieldExpRes = +calculateShieldResistanceWithDiminishingReturns(baseShieldExplosive, expBoosterDeltas).toFixed(3);

  const shieldKinEHP = +(finalShieldMJ / (1.0 - shieldKinRes)).toFixed(1);
  const shieldThermEHP = +(finalShieldMJ / (1.0 - shieldThermRes)).toFixed(1);
  const shieldExpEHP = +(finalShieldMJ / (1.0 - shieldExpRes)).toFixed(1);
  const shieldAvgEHP = +(finalShieldMJ / (0.4 * (1 - shieldKinRes) + 0.4 * (1 - shieldThermRes) + 0.2 * (1 - shieldExpRes))).toFixed(1);

  // Regen rates
  const normalRegenRate = 1.0; // MJ/s standard
  const brokenRegenRate = 2.8; // MJ/s broken reboot
  const rechargeSeconds = +(finalShieldMJ / normalRegenRate).toFixed(0);

  // 2. ARMOUR, HRP & BULKHEADS
  // Standard bulkheads: Lightweight (0% kin, -40% therm, -20% exp), Military (+20% kin, 0% therm, 10% exp), Reactive, etc.
  let armourBase = ship.baseArmour;
  let totalHrpHP = 0;
  let hrpCount = 0;
  let totalMrpHP = 0;
  let mrpCount = 0;

  // Check optional and military internals for HRP and MRP
  const processDefensiveInternal = (slotId: string, size: number, installed: string | null) => {
    if (!installed) return;
    if (installed.includes('Hull Reinforcement') || installed.includes('HRP')) {
      hrpCount++;
      let hpBonus = size * 110;
      const eng = engineeringMap[slotId];
      if (eng && eng.blueprintId && eng.grade > 0) {
        hpBonus *= (1 + 0.4 * (eng.percent / 100)); // Heavy duty HRP
      }
      totalHrpHP += hpBonus;
    } else if (installed.includes('Module Protection') || installed.includes('MRP')) {
      mrpCount++;
      totalMrpHP += size * 140;
    }
  };

  ship.optionalSlots.forEach((size, idx) => {
    processDefensiveInternal(`optional-${idx}`, size, loadout.optionalModules[idx]);
  });
  ship.militarySlots.forEach((size, idx) => {
    processDefensiveInternal(`military-${idx}`, size, loadout.militaryModules[idx]);
  });

  const finalHullHP = Math.round(armourBase + totalHrpHP);

  // Armour base resistances (Military composite standard baseline)
  let armourKinRes = 0.20;
  let armourThermRes = 0.00;
  let armourExpRes = 0.10;
  let armourCausticRes = 0.05;

  // Check bulkhead engineering
  const bulkheadEng = engineeringMap['core-bulkheads'];
  if (bulkheadEng && bulkheadEng.blueprintId && bulkheadEng.grade > 0) {
    armourKinRes = Math.min(0.65, armourKinRes + 0.15 * (bulkheadEng.percent / 100));
    armourThermRes = Math.min(0.65, armourThermRes + 0.18 * (bulkheadEng.percent / 100));
    armourExpRes = Math.min(0.65, armourExpRes + 0.15 * (bulkheadEng.percent / 100));
  }

  const hullKinEHP = +(finalHullHP / (1.0 - armourKinRes)).toFixed(1);
  const hullThermEHP = +(finalHullHP / (1.0 - armourThermRes)).toFixed(1);
  const hullExpEHP = +(finalHullHP / (1.0 - armourExpRes)).toFixed(1);
  const hullCausticEHP = +(finalHullHP / (1.0 - armourCausticRes)).toFixed(1);
  const hullAvgEHP = +(finalHullHP / (0.4 * (1 - armourKinRes) + 0.4 * (1 - armourThermRes) + 0.2 * (1 - armourExpRes))).toFixed(1);

  // 3. MRP DAMAGE ABSORPTION LAYERING
  // First MRP absorbs 60% of internal module damage, second absorbs 60% of remaining (1 - 0.4*0.4 = 84%), third 93.6%
  let mrpAbsorptionRate = 0.0;
  if (mrpCount > 0) {
    mrpAbsorptionRate = 1.0 - Math.pow(0.40, mrpCount);
  }

  return {
    shield: {
      raw: finalShieldMJ,
      baseMJ: ship.baseShield,
      kineticEHP: shieldKinEHP,
      thermalEHP: shieldThermEHP,
      explosiveEHP: shieldExpEHP,
      absoluteEHP: finalShieldMJ,
      effectiveAverageEHP: shieldAvgEHP,
      resistances: {
        kinetic: shieldKinRes,
        thermal: shieldThermRes,
        explosive: shieldExpRes,
        absolute: 0.0,
      },
      boosterCount,
      normalRegenRate,
      brokenRegenRate,
      rechargeSeconds: Number(rechargeSeconds),
    },
    armour: {
      raw: finalHullHP,
      baseHullHP: ship.baseArmour,
      hullHardness: ship.hardness,
      kineticEHP: hullKinEHP,
      thermalEHP: hullThermEHP,
      explosiveEHP: hullExpEHP,
      causticEHP: hullCausticEHP,
      absoluteEHP: finalHullHP,
      effectiveAverageEHP: hullAvgEHP,
      resistances: {
        kinetic: armourKinRes,
        thermal: armourThermRes,
        explosive: armourExpRes,
        caustic: armourCausticRes,
        absolute: 0.0,
      },
      hrpCount,
      hrpTotalHP: Math.round(totalHrpHP),
    },
    mrp: {
      totalIntegrity: Math.round(totalMrpHP),
      layeringAbsorptionRate: +mrpAbsorptionRate.toFixed(3),
      mrpCount,
    },
    totalCombatEHP: Math.round(shieldAvgEHP + hullAvgEHP),
  };
}

/**
 * Projects Time-To-Kill (TTK) across multiple combat threat scenarios.
 */
export function calculateCombatTTKMatrix(
  defenses: DefensesSummary
): ThreatTTKProjection[] {
  return STANDARD_THREAT_BASELINES.map((threat) => {
    // 1. Calculate Incoming Shield DPS
    // Shield takes full damage regardless of armour piercing:
    // Damage Taken = KinDPS * (1 - KinRes) + ThermDPS * (1 - ThermRes) + ExpDPS * (1 - ExpRes) + AbsDPS
    const shieldKinDPS = threat.dpsKinetic * Math.max(0, 1.0 - defenses.shield.resistances.kinetic);
    const shieldThermDPS = threat.dpsThermal * Math.max(0, 1.0 - defenses.shield.resistances.thermal);
    const shieldExpDPS = threat.dpsExplosive * Math.max(0, 1.0 - defenses.shield.resistances.explosive);
    const shieldAbsDPS = threat.dpsAbsolute;
    const totalShieldDPS = Math.max(0.1, shieldKinDPS + shieldThermDPS + shieldExpDPS + shieldAbsDPS);

    // Shield TTK in seconds
    const shieldTTK = defenses.shield.raw > 0 ? +(defenses.shield.raw / totalShieldDPS).toFixed(1) : 0.0;

    // 2. Calculate Incoming Armour DPS with Hull Hardness mitigation
    // Hardness factor: min(1.0, penetration / hullHardness)
    const hardnessFactor = Math.min(1.0, threat.penetration / defenses.armour.hullHardness);

    const armourKinDPS = threat.dpsKinetic * hardnessFactor * Math.max(0, 1.0 - defenses.armour.resistances.kinetic);
    const armourThermDPS = threat.dpsThermal * hardnessFactor * Math.max(0, 1.0 - defenses.armour.resistances.thermal);
    const armourExpDPS = threat.dpsExplosive * hardnessFactor * Math.max(0, 1.0 - defenses.armour.resistances.explosive);
    const armourAbsDPS = threat.dpsAbsolute; // Absolute ignores hardness and resistances
    const totalArmourDPS = Math.max(0.1, armourKinDPS + armourThermDPS + armourExpDPS + armourAbsDPS);

    // Hull TTK in seconds
    const hullTTK = +(defenses.armour.raw / totalArmourDPS).toFixed(1);

    return {
      threat,
      shieldEffectiveDPS: +totalShieldDPS.toFixed(1),
      armourEffectiveDPS: +totalArmourDPS.toFixed(1),
      shieldTimeToKillSeconds: shieldTTK,
      hullTimeToKillSeconds: hullTTK,
      totalCombatTimeToKillSeconds: +(shieldTTK + hullTTK).toFixed(1),
    };
  });
}
