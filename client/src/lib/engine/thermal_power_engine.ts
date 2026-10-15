/**
 * Atlas Shipbuilder Engine - Power Priority Management & Thermal Dissipation Heat Simulation Curves
 * Stage 7.3: Distributor recharge, WEP capacitor exhaustion, and heat curve analytics
 * Parity: Elite Dangerous / Coriolis / EDSY thermodynamic formulas
 */

import {
  SHIP_CHASSIS_MAP,
  type ShipChassis,
  type ShipLoadoutState,
} from './ship_catalog';
import {
  type ModuleEngineeringState,
  type CalculatedModuleStats,
  getDefaultModuleStats,
  calculateEngineeredStats,
  ENGINEERING_BLUEPRINTS,
  EXPERIMENTAL_EFFECTS,
} from './engineering_catalog';

export type PowerPriority = 1 | 2 | 3 | 4 | 5;

export interface ModulePowerSlot {
  slotId: string;
  name: string;
  category: 'core' | 'optional' | 'military' | 'hardpoint' | 'utility';
  size: number;
  priority: PowerPriority;
  powerDraw: number; // MW
  isDeployable: boolean; // hardpoints are deployable
  isEnabled: boolean; // whether module is powered on
  thermalLoad: number; // base thermal load
  distDraw?: number; // MW distributor draw when active (weapons)
  engineeredStats?: CalculatedModuleStats;
}

export interface PipDistribution {
  sys: number; // 0 to 4 pips (increments of 0.5 or 1)
  eng: number;
  wep: number;
}

export interface PowerPlantStatus {
  maxPowerMW: number;
  retractedDrawMW: number;
  deployedDrawMW: number;
  retractedUsagePercent: number;
  deployedUsagePercent: number;
  malfunctionThresholdMW: number; // 50%
  destructionThresholdMW: number; // 40%
  priorityDraws: Record<PowerPriority, {
    drawMW: number;
    cumulativeMW: number;
    cumulativePercent: number;
    isActiveRetracted: boolean;
    isActiveDeployed: boolean;
  }>;
}

export interface DistributorSimulation {
  sysCapacity: number; // MJ
  engCapacity: number; // MJ
  wepCapacity: number; // MJ
  sysRechargeRate: number; // MW (adjusted for pips)
  engRechargeRate: number; // MW
  wepRechargeRate: number; // MW
  totalWeaponDrawMW: number; // sum of active weapons distDraw
  wepDrainTimeSeconds: number | null; // null if sustained fire is infinite
  isInfiniteFire: boolean;
  wepDrainCurve: { time: number; energy: number; percent: number }[];
}

export interface ThermalSimulation {
  restingHeatPercent: number; // Equilibrium temperature at idle (%)
  equilibriumHeatFiringPercent: number; // Equilibrium temperature under sustained fire (%)
  hullHeatCapacity: number; // BTUs / Heat units
  coolingConstant: number; // calculated from hull and heat capacity
  timeToOverheatSeconds: number | null; // time to reach 100% heat (internal damage)
  silentRunningTimeToOverheat: number; // seconds from idle to 100% in silent running
  heatCurve: { time: number; heatPercent: number; firing: boolean }[];
  coolingCurve: { time: number; heatPercent: number }[];
}

export interface ShipSimulationResult {
  powerPlant: PowerPlantStatus;
  distributor: DistributorSimulation;
  thermal: ThermalSimulation;
  modules: ModulePowerSlot[];
  powerPlantEfficiency: number;
}

/**
 * Default standard power priorities for modules
 */
export function getDefaultPriority(slotId: string, category: string): PowerPriority {
  if (slotId === 'core-thrusters' || slotId === 'core-fsd' || slotId === 'core-ls') {
    return 1; // Vital survival and escape
  }
  if (slotId === 'core-pd' || slotId === 'core-sensors') {
    return 2; // Critical operational
  }
  if (category === 'hardpoint') {
    return 3; // Combat primary
  }
  if (category === 'utility' || category === 'optional') {
    if (slotId.includes('shield') || slotId.includes('booster')) {
      return 2; // Defense
    }
    return 4; // Non-combat optional systems
  }
  return 5; // Cargo hatch, fuel scoops, etc.
}

/**
 * Build complete list of modules with power ratings and user priorities
 */
export function extractShipPowerSlots(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineeringMap: Record<string, ModuleEngineeringState> = {},
  priorityOverrides: Record<string, PowerPriority> = {},
  disabledModules: Record<string, boolean> = {}
): ModulePowerSlot[] {
  const slots: ModulePowerSlot[] = [];

  // 1. Core Internals
  const coreKeys: Array<keyof typeof ship.coreInternals> = [
    'powerPlant',
    'thrusters',
    'frameShiftDrive',
    'lifeSupport',
    'powerDistributor',
    'sensors',
    'fuelTank',
  ];

  for (const key of coreKeys) {
    const slotId = `core-${key}`;
    const size = ship.coreInternals[key];
    const installed = loadout.coreModules[key] || `${size}A Standard`;
    const eng = engineeringMap[slotId];
    const baseStats = getDefaultModuleStats(slotId, 'core', size, installed);
    const engineered = calculateEngineeredStats(baseStats, eng);

    slots.push({
      slotId,
      name: baseStats.moduleName,
      category: 'core',
      size,
      priority: priorityOverrides[slotId] ?? getDefaultPriority(slotId, 'core'),
      powerDraw: engineered.modifiedPowerDraw,
      isDeployable: false,
      isEnabled: !disabledModules[slotId],
      thermalLoad: engineered.modifiedThermalLoad,
      engineeredStats: engineered,
    });
  }

  // 2. Hardpoints
  ship.hardpointSlots.forEach((hp, idx) => {
    const slotId = hp.id;
    const installed = loadout.hardpointModules[idx] || (hp.size >= 2 ? `${hp.size}C Multi-Cannon` : `${hp.size}F Pulse Laser`);
    const eng = engineeringMap[slotId];
    const baseStats = getDefaultModuleStats(slotId, 'hardpoint', hp.size, installed);
    const engineered = calculateEngineeredStats(baseStats, eng);

    slots.push({
      slotId,
      name: `${hp.sizeLabel} ${installed}`,
      category: 'hardpoint',
      size: hp.size,
      priority: priorityOverrides[slotId] ?? getDefaultPriority(slotId, 'hardpoint'),
      powerDraw: engineered.modifiedPowerDraw,
      isDeployable: true,
      isEnabled: !disabledModules[slotId],
      thermalLoad: engineered.modifiedThermalLoad,
      distDraw: engineered.distDraw ?? 1.2,
      engineeredStats: engineered,
    });
  });

  // 3. Optional Internals
  ship.optionalSlots.forEach((size, idx) => {
    const slotId = `optional-${idx}`;
    const installed = loadout.optionalModules[idx];
    if (!installed) return; // empty slot consumes 0 MW
    const eng = engineeringMap[slotId];
    const baseStats = getDefaultModuleStats(slotId, 'optional', size, installed);
    const engineered = calculateEngineeredStats(baseStats, eng);

    slots.push({
      slotId,
      name: installed,
      category: 'optional',
      size,
      priority: priorityOverrides[slotId] ?? getDefaultPriority(slotId, 'optional'),
      powerDraw: engineered.modifiedPowerDraw,
      isDeployable: false,
      isEnabled: !disabledModules[slotId],
      thermalLoad: engineered.modifiedThermalLoad,
      engineeredStats: engineered,
    });
  });

  // 4. Utility Mounts
  ship.utilitySlots.forEach((ut, idx) => {
    const slotId = ut.id;
    const installed = loadout.utilityModules[idx] || '0A Shield Booster';
    // 0A Shield Booster typically draws 1.2 MW, Chaff draws 0.2 MW
    const power = installed.includes('Booster') ? 1.2 : 0.2;
    slots.push({
      slotId,
      name: installed,
      category: 'utility',
      size: 0,
      priority: priorityOverrides[slotId] ?? getDefaultPriority(slotId, 'utility'),
      powerDraw: power,
      isDeployable: false,
      isEnabled: !disabledModules[slotId],
      thermalLoad: 0.5,
    });
  });

  return slots;
}

/**
 * Calculates Power Plant Capacity and Power Group Priority Allocations
 */
export function calculatePowerPlantStatus(
  ship: ShipChassis,
  slots: ModulePowerSlot[],
  engineeringMap: Record<string, ModuleEngineeringState> = {}
): { powerPlant: PowerPlantStatus; powerPlantEfficiency: number } {
  // Get Power Plant capacity
  const ppSlotId = 'core-powerPlant';
  const ppEng = engineeringMap[ppSlotId];
  const ppBase = getDefaultModuleStats(ppSlotId, 'core', ship.coreInternals.powerPlant, 'A-Rated');
  const ppCalc = calculateEngineeredStats(ppBase, ppEng);

  const maxPowerMW = ppCalc.modifiedPowerGen ?? (ship.coreInternals.powerPlant >= 8 ? 36.0 : 30.0);
  const powerPlantEfficiency = ppCalc.modifiedHeatEfficiency ?? 0.40;

  let retractedDrawMW = 0;
  let deployedDrawMW = 0;

  // Track draws per priority group 1-5
  const priorityDraws: Record<PowerPriority, {
    drawMW: number;
    cumulativeMW: number;
    cumulativePercent: number;
    isActiveRetracted: boolean;
    isActiveDeployed: boolean;
  }> = {
    1: { drawMW: 0, cumulativeMW: 0, cumulativePercent: 0, isActiveRetracted: true, isActiveDeployed: true },
    2: { drawMW: 0, cumulativeMW: 0, cumulativePercent: 0, isActiveRetracted: true, isActiveDeployed: true },
    3: { drawMW: 0, cumulativeMW: 0, cumulativePercent: 0, isActiveRetracted: true, isActiveDeployed: true },
    4: { drawMW: 0, cumulativeMW: 0, cumulativePercent: 0, isActiveRetracted: true, isActiveDeployed: true },
    5: { drawMW: 0, cumulativeMW: 0, cumulativePercent: 0, isActiveRetracted: true, isActiveDeployed: true },
  };

  // Group by priority
  for (const slot of slots) {
    if (!slot.isEnabled) continue;
    const p = slot.priority;
    priorityDraws[p].drawMW += slot.powerDraw;

    if (!slot.isDeployable) {
      retractedDrawMW += slot.powerDraw;
    }
    deployedDrawMW += slot.powerDraw;
  }

  // Calculate cumulative draws and power thresholds
  let cumMW = 0;
  for (let p = 1; p <= 5; p++) {
    const pri = p as PowerPriority;
    cumMW += priorityDraws[pri].drawMW;
    priorityDraws[pri].cumulativeMW = +cumMW.toFixed(2);
    priorityDraws[pri].cumulativePercent = +( (cumMW / maxPowerMW) * 100 ).toFixed(1);
    priorityDraws[pri].isActiveRetracted = cumMW <= maxPowerMW;
    priorityDraws[pri].isActiveDeployed = cumMW <= maxPowerMW;
  }

  return {
    powerPlant: {
      maxPowerMW: +maxPowerMW.toFixed(2),
      retractedDrawMW: +retractedDrawMW.toFixed(2),
      deployedDrawMW: +deployedDrawMW.toFixed(2),
      retractedUsagePercent: +((retractedDrawMW / maxPowerMW) * 100).toFixed(1),
      deployedUsagePercent: +((deployedDrawMW / maxPowerMW) * 100).toFixed(1),
      malfunctionThresholdMW: +(maxPowerMW * 0.5).toFixed(2),
      destructionThresholdMW: +(maxPowerMW * 0.4).toFixed(2),
      priorityDraws,
    },
    powerPlantEfficiency,
  };
}

/**
 * Calculates Distributor Recharge Rates and WEP Capacitor Exhaustion
 * Pips scale recharge rates: 0 pips = 0%, 1 pip = 25%, 2 pips = 50%, 3 pips = 75%, 4 pips = 100% of nominal MW/s
 */
export function calculateDistributorSimulation(
  ship: ShipChassis,
  slots: ModulePowerSlot[],
  pips: PipDistribution = { sys: 2, eng: 2, wep: 2 },
  engineeringMap: Record<string, ModuleEngineeringState> = {}
): DistributorSimulation {
  const pdSlotId = 'core-powerDistributor';
  const pdEng = engineeringMap[pdSlotId];
  const pdBase = getDefaultModuleStats(pdSlotId, 'core', ship.coreInternals.powerDistributor, 'A-Rated');
  const pdCalc = calculateEngineeredStats(pdBase, pdEng);

  const sysCap = pdCalc.sysCap ?? 60.0;
  const engCap = pdCalc.engCap ?? 45.0;
  const wepCap = pdCalc.wepCap ?? 65.0;

  // Authentic ED pip scaling formula: Rate * (pips / 4)^1.1 or linear pips / 4
  const sysRateNominal = pdCalc.modifiedSysRate ?? 4.8;
  const engRateNominal = pdCalc.modifiedEngRate ?? 4.2;
  const wepRateNominal = pdCalc.modifiedWepRate ?? 6.8;

  const sysRechargeRate = +(sysRateNominal * Math.pow(Math.max(0, pips.sys) / 4, 1.05)).toFixed(2);
  const engRechargeRate = +(engRateNominal * Math.pow(Math.max(0, pips.eng) / 4, 1.05)).toFixed(2);
  const wepRechargeRate = +(wepRateNominal * Math.pow(Math.max(0, pips.wep) / 4, 1.05)).toFixed(2);

  // Sum active deployed weapons distributor draw
  let totalWeaponDrawMW = 0;
  for (const slot of slots) {
    if (slot.category === 'hardpoint' && slot.isEnabled && slot.distDraw) {
      totalWeaponDrawMW += slot.distDraw;
    }
  }
  totalWeaponDrawMW = +totalWeaponDrawMW.toFixed(2);

  const netWepDrainRate = totalWeaponDrawMW - wepRechargeRate; // MW net loss per second
  const isInfiniteFire = netWepDrainRate <= 0;
  const wepDrainTimeSeconds = isInfiniteFire ? null : +(wepCap / netWepDrainRate).toFixed(1);

  // Build drain curve sample (up to 60s or until empty)
  const maxSimTime = wepDrainTimeSeconds ? Math.min(60, Math.ceil(wepDrainTimeSeconds * 1.2)) : 60;
  const step = 1; // 1 second intervals
  const wepDrainCurve: { time: number; energy: number; percent: number }[] = [];

  for (let t = 0; t <= maxSimTime; t += step) {
    let currentEnergy = Math.max(0, Math.min(wepCap, wepCap - (netWepDrainRate * t)));
    wepDrainCurve.push({
      time: t,
      energy: +currentEnergy.toFixed(2),
      percent: +((currentEnergy / wepCap) * 100).toFixed(1),
    });
    if (currentEnergy <= 0) break;
  }

  return {
    sysCapacity: +sysCap.toFixed(1),
    engCapacity: +engCap.toFixed(1),
    wepCapacity: +wepCap.toFixed(1),
    sysRechargeRate,
    engRechargeRate,
    wepRechargeRate,
    totalWeaponDrawMW,
    wepDrainTimeSeconds,
    isInfiniteFire,
    wepDrainCurve,
  };
}

/**
 * Model Thermal Equilibrium, Weapons Firing Heat Spike Curve, and Dissipation
 * Elite Dangerous Thermal Model Parity:
 * Heat Production (MW) = Sum of (Power Draw * PP Efficiency) + Hardpoints Active Heat
 * Cooling follows Newton's Law of Cooling / Stefan-Boltzmann dissipation:
 * Dissipation Rate = coolingConstant * (Heat% / 100)^2
 * Resting Heat Equilibrium: when Heat Production = Cooling Rate
 * Module damage threshold: Heat >= 100%
 */
export function calculateThermalSimulation(
  ship: ShipChassis,
  slots: ModulePowerSlot[],
  powerPlant: PowerPlantStatus,
  powerPlantEfficiency: number,
  isFiring: boolean = true,
  isSilentRunning: boolean = false
): ThermalSimulation {
  const hullHeatCapacity = ship.heatCapacity || 300;
  
  // Cooling constant calibrated so typical unengineered ships idle between 20% and 35%
  // A Corvette with 333 heat capacity at 25 MW deployed with 0.40 efficiency generates 10 MW base heat
  const coolingConstant = (hullHeatCapacity / 10) * 1.15;

  // 1. Idle Resting Heat Generation
  // Base power heat = retracted draw * efficiency
  const idleBasePowerDraw = powerPlant.retractedDrawMW;
  const idleHeatProduction = idleBasePowerDraw * powerPlantEfficiency;

  // Equilibrium resting heat % where coolingConstant * (H / 100)^2 = idleHeatProduction
  // (H / 100)^2 = idleHeatProduction / coolingConstant
  const restingHeatRatio = Math.sqrt(idleHeatProduction / coolingConstant);
  const restingHeatPercent = +Math.min(99, Math.max(10, restingHeatRatio * 100)).toFixed(1);

  // 2. Firing Heat Generation
  // Sum of weapon thermal loads + deployed power draw * efficiency
  let weaponFiringHeatMW = 0;
  for (const slot of slots) {
    if (slot.category === 'hardpoint' && slot.isEnabled) {
      weaponFiringHeatMW += slot.thermalLoad;
    }
  }

  const deployedPowerHeat = powerPlant.deployedDrawMW * powerPlantEfficiency;
  const firingHeatProduction = deployedPowerHeat + weaponFiringHeatMW;

  // Equilibrium heat under sustained fire
  const firingHeatRatio = Math.sqrt(firingHeatProduction / coolingConstant);
  const equilibriumHeatFiringPercent = +(firingHeatRatio * 100).toFixed(1);

  // 3. Dynamic Heat Curve over 60 seconds of continuous firing
  const heatCurve: { time: number; heatPercent: number; firing: boolean }[] = [];
  let currentHeat = restingHeatPercent;
  let timeToOverheatSeconds: number | null = null;
  const dt = 0.5; // half second time steps

  for (let t = 0; t <= 60; t += dt) {
    heatCurve.push({
      time: +t.toFixed(1),
      heatPercent: +currentHeat.toFixed(1),
      firing: isFiring,
    });

    if (currentHeat >= 100 && timeToOverheatSeconds === null) {
      timeToOverheatSeconds = +t.toFixed(1);
    }

    if (isSilentRunning) {
      // In silent running, radiators are closed -> zero dissipation! Heat accumulates unconditionally
      const netGain = (firingHeatProduction / hullHeatCapacity) * 100 * dt;
      currentHeat += netGain;
    } else {
      // Active radiator cooling:
      const dissipation = coolingConstant * Math.pow(currentHeat / 100, 2);
      const production = isFiring ? firingHeatProduction : deployedPowerHeat;
      const netHeatMW = production - dissipation;
      const dHeatPercent = (netHeatMW / hullHeatCapacity) * 100 * dt;
      currentHeat = Math.max(0, currentHeat + dHeatPercent);
    }
  }

  // 4. Silent Running time to 100% from resting idle
  const idleNetGainRate = (idleHeatProduction / hullHeatCapacity) * 100; // % per second
  const silentRunningTimeToOverheat = idleNetGainRate > 0
    ? +((100 - restingHeatPercent) / idleNetGainRate).toFixed(1)
    : 999;

  // 5. Post-firing Cooling Curve (returning from current heat back down to resting heat)
  const coolingCurve: { time: number; heatPercent: number }[] = [];
  let coolTemp = Math.max(currentHeat, 85);
  for (let t = 0; t <= 30; t += 0.5) {
    coolingCurve.push({
      time: +t.toFixed(1),
      heatPercent: +coolTemp.toFixed(1),
    });
    const dissipation = coolingConstant * Math.pow(coolTemp / 100, 2);
    const netHeatMW = idleHeatProduction - dissipation;
    coolTemp = Math.max(restingHeatPercent, coolTemp + (netHeatMW / hullHeatCapacity) * 100 * 0.5);
  }

  return {
    restingHeatPercent,
    equilibriumHeatFiringPercent,
    hullHeatCapacity,
    coolingConstant: +coolingConstant.toFixed(2),
    timeToOverheatSeconds,
    silentRunningTimeToOverheat,
    heatCurve,
    coolingCurve,
  };
}

/**
 * Master simulation executor combining power, distributor, and thermal calculations
 */
export function simulateShipPowerAndThermal(
  ship: ShipChassis,
  loadout: ShipLoadoutState,
  engineeringMap: Record<string, ModuleEngineeringState> = {},
  priorityOverrides: Record<string, PowerPriority> = {},
  disabledModules: Record<string, boolean> = {},
  pips: PipDistribution = { sys: 2, eng: 2, wep: 2 },
  isFiring: boolean = true,
  isSilentRunning: boolean = false
): ShipSimulationResult {
  const modules = extractShipPowerSlots(ship, loadout, engineeringMap, priorityOverrides, disabledModules);
  const { powerPlant, powerPlantEfficiency } = calculatePowerPlantStatus(ship, modules, engineeringMap);
  const distributor = calculateDistributorSimulation(ship, modules, pips, engineeringMap);
  const thermal = calculateThermalSimulation(
    ship,
    modules,
    powerPlant,
    powerPlantEfficiency,
    isFiring,
    isSilentRunning
  );

  return {
    powerPlant,
    distributor,
    thermal,
    modules,
    powerPlantEfficiency,
  };
}
