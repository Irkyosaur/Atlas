// Location: atlas/client/src/lib/engine/odyssey_wishlist_catalog.ts
// Odyssey Suit & Weapon Engineering Blueprints, Upgrade Costs, and Engineer Tracker (Phase 10, Stage 10.4)
// Catalogs:
// 1. All Suit & Weapon Engineering Modifications (14 Suit mods, 11 Weapon mods)
// 2. Grade 1 -> Grade 5 Upgrade Cost Matrix for suits (Maverick, Dominator, Artemis) and weapons (Karma, Takada, Manticore)
// 3. Odyssey Engineer Directory & Unlock Trackers (Domino Green, Hero Ferrari, Wellington Beck, Kit Fowler, Baltanos, etc.)

export type EquipmentCategory = 'suit' | 'weapon';
export type SuitType = 'maverick' | 'dominator' | 'artemis';
export type WeaponFamily = 'karma' | 'takada' | 'manticore';
export type WeaponType =
  | 'karma_l6'
  | 'karma_ar50'
  | 'karma_c44'
  | 'karma_p15'
  | 'tk_aphelion'
  | 'tk_eclipse'
  | 'tk_zenith'
  | 'manticore_executioner'
  | 'manticore_tormentor'
  | 'manticore_oppressor'
  | 'manticore_intimidator';

export type ItemGrade = 1 | 2 | 3 | 4 | 5;

export interface MaterialCostItem {
  itemId: string;
  name: string;
  count: number;
}

export interface ModificationDefinition {
  id: string;
  name: string;
  targetCategory: EquipmentCategory;
  description: string;
  applicableTo: string; // "All Suits", "Maverick, Dominator", "All Weapons", "Primaries Only", etc.
  engineers: string[]; // Engineers who provide this modification
  requiredMaterials: MaterialCostItem[];
}

export interface UpgradeCostTier {
  fromGrade: ItemGrade;
  toGrade: ItemGrade;
  credits: number;
  materials: MaterialCostItem[];
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  category: EquipmentCategory;
  family?: string;
  description: string;
  maxModificationSlots: number; // Grade 2 = 1 slot, G3 = 2, G4 = 3, G5 = 4
  upgradeCosts: UpgradeCostTier[];
}

export interface EngineerDefinition {
  id: string;
  name: string;
  location: string;
  system: string;
  region: 'Bubble' | 'Colonia';
  specialties: string[];
  referralChain: string;
  discoveryRequirement: string;
  inviteRequirement: string;
  unlockRequirement: string;
  unlockItems?: { itemId: string; name: string; count: number }[];
}

// =========================================================================
// 1. ODYSSEY SUIT & WEAPON MODIFICATIONS CATALOG
// =========================================================================

export const ODYSSEY_MODIFICATIONS: ModificationDefinition[] = [
  // --- SUIT MODIFICATIONS (14 total) ---
  {
    id: 'suit_night_vision',
    name: 'Night Vision',
    targetCategory: 'suit',
    description: 'Enables amplified ambient light optics across helmet visor for pitch-black night operations.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Oden Geiger', 'Baltanos', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'aerogel', name: 'Aerogel', count: 10 },
      { itemId: 'optilens', name: 'Optic Lens', count: 10 },
      { itemId: 'surveillanceequipment', name: 'Surveillance Equipment', count: 10 },
      { itemId: 'spectralanalysisdata', name: 'Spectral Analysis Data', count: 10 },
    ],
  },
  {
    id: 'suit_extra_backpack',
    name: 'Extra Backpack Capacity',
    targetCategory: 'suit',
    description: 'Doubles on-foot carrying capacity for all Assets, Goods, and Data items in inventory.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Kit Fowler', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'electricalwiring', name: 'Electrical Wiring', count: 10 },
      { itemId: 'compressionliquefier', name: 'Compression Liquefier', count: 10 },
    ],
  },
  {
    id: 'suit_damage_resistance',
    name: 'Damage Resistance',
    targetCategory: 'suit',
    description: 'Enhances kinetic, thermal, and explosive shielding & plating resistances by +10%.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Yi Shen', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'graphene', name: 'Graphene', count: 10 },
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'deepmantlesample', name: 'Deep Mantle Sample', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },
  {
    id: 'suit_faster_shield_regen',
    name: 'Faster Shield Regen',
    targetCategory: 'suit',
    description: 'Reduces shield regeneration delay and increases kinetic barrier recharge rate by +50%.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Kit Fowler', 'Terra Velasquez', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'chemicalcatalyst', name: 'Chemical Catalyst', count: 10 },
      { itemId: 'surfacetestcircuit', name: 'Micro-Transformer', count: 10 },
      { itemId: 'reactoroutputreview', name: 'Reactor Output Review', count: 10 },
    ],
  },
  {
    id: 'suit_combat_movement_speed',
    name: 'Combat Movement Speed',
    targetCategory: 'suit',
    description: 'Increases aiming-down-sights (ADS) and strafing velocity by +35%.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Terra Velasquez', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'circuitboard', name: 'Circuit Board', count: 10 },
      { itemId: 'ballisticsdata', name: 'Ballistics Data', count: 10 },
    ],
  },
  {
    id: 'suit_extra_ammo',
    name: 'Extra Ammo Capacity',
    targetCategory: 'suit',
    description: 'Increases handheld weapon reserve ammunition magazines by +50%.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Hero Ferrari', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'weaponcomponent', name: 'Weapon Component', count: 10 },
      { itemId: 'ballisticsdata', name: 'Ballistics Data', count: 10 },
    ],
  },
  {
    id: 'suit_jump_assist',
    name: 'Improved Jump Assist',
    targetCategory: 'suit',
    description: 'Overcharges thruster jetpack vertical clearance, duration, and high-G launch capability.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Terra Velasquez', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'microthrusters', name: 'Micro Thruster Unit', count: 10 },
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'catastrophicdatabanks', name: 'Catastrophic Failure Reports', count: 10 },
    ],
  },
  {
    id: 'suit_increased_air_capacity',
    name: 'Increased Air Capacity',
    targetCategory: 'suit',
    description: 'Expands internal suit oxygen reservoir duration for extended planetary EVA exploration.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Jude Navarro', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'oxygenicbacteria', name: 'Oxygenic Bacteria', count: 10 },
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'purifiedwater', name: 'Purified Water', count: 10 },
    ],
  },
  {
    id: 'suit_increased_battery',
    name: 'Increased Battery Capacity',
    targetCategory: 'suit',
    description: 'Expands suit main energy storage cell reserve capacity by +50%.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Kit Fowler', 'Jude Navarro', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'chemicalcatalyst', name: 'Chemical Catalyst', count: 10 },
      { itemId: 'electricalfuse', name: 'Electrical Fuse', count: 10 },
      { itemId: 'reactoroutputreview', name: 'Reactor Output Review', count: 10 },
    ],
  },
  {
    id: 'suit_increased_sprint',
    name: 'Increased Sprint Duration',
    targetCategory: 'suit',
    description: 'Doubles maximum sprint stamina duration and accelerates respiratory recovery.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Terra Velasquez', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'epinephrineauto', name: 'Epipen Auto-Injector', count: 10 },
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'biometricdata', name: 'Biometric Data', count: 10 },
    ],
  },
  {
    id: 'suit_quieter_footsteps',
    name: 'Quieter Footsteps',
    targetCategory: 'suit',
    description: 'Acoustic dampers drastically muffle sprint and movement audio signatures past settlement guards.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Terra Velasquez', 'Kit Fowler', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'patrolroutes', name: 'Patrol Routes', count: 10 },
    ],
  },
  {
    id: 'suit_reduced_tool_battery',
    name: 'Reduced Tool Battery Consumption',
    targetCategory: 'suit',
    description: 'Halves energy draw for Arc Cutter, Energylink, and Profile Analyser handheld tools.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Jude Navarro', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'electricalfuse', name: 'Electrical Fuse', count: 10 },
      { itemId: 'ionbattery', name: 'Ion Battery', count: 10 },
      { itemId: 'reactoroutputreview', name: 'Reactor Output Review', count: 10 },
    ],
  },
  {
    id: 'suit_enhanced_tracking',
    name: 'Enhanced Tracking',
    targetCategory: 'suit',
    description: 'Highlights enemy footprints and thermal silhouettes through bulkheads up to 50 meters.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Hero Ferrari', 'Kit Fowler', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'circuitswitch', name: 'Circuit Switch', count: 10 },
      { itemId: 'microelectrode', name: 'Microelectrode', count: 10 },
      { itemId: 'surveillanceequipment', name: 'Surveillance Equipment', count: 10 },
    ],
  },
  {
    id: 'suit_added_melee_damage',
    name: 'Added Melee Damage',
    targetCategory: 'suit',
    description: 'Pneumatic servo augmentation doubles unshielded blunt-force melee takedown damage.',
    applicableTo: 'All Suits (Maverick, Dominator, Artemis)',
    engineers: ['Domino Green', 'Hero Ferrari', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'ionbattery', name: 'Ion Battery', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },

  // --- WEAPON MODIFICATIONS (11 total) ---
  {
    id: 'weapon_greater_range',
    name: 'Greater Range',
    targetCategory: 'weapon',
    description: 'Extends maximum and effective engagement falloff ranges by +33%.',
    applicableTo: 'All Weapons',
    engineers: ['Wellington Beck', 'Jude Navarro', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'optilens', name: 'Optic Lens', count: 10 },
      { itemId: 'microrotationarray', name: 'Micro Rotation Array', count: 10 },
      { itemId: 'ballisticsdata', name: 'Ballistics Data', count: 10 },
    ],
  },
  {
    id: 'weapon_audio_masking',
    name: 'Audio Masking',
    targetCategory: 'weapon',
    description: 'Silences outdoor gunshots in planetary atmosphere so guards cannot hear projectile discharges.',
    applicableTo: 'All Weapons (Outdoor Suppressor)',
    engineers: ['Yarden Bond', 'Wellington Beck', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'opticalfibre', name: 'Optical Fibre', count: 10 },
      { itemId: 'scramblerelectronics', name: 'Scrambler Board', count: 10 },
      { itemId: 'patrolroutes', name: 'Patrol Routes', count: 10 },
    ],
  },
  {
    id: 'weapon_noise_suppressor',
    name: 'Noise Suppressor',
    targetCategory: 'weapon',
    description: 'Muffles indoor weapon reports inside pressurized settlement buildings.',
    applicableTo: 'All Weapons (Indoor Suppressor)',
    engineers: ['Yarden Bond', 'Wellington Beck', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'patrolroutes', name: 'Patrol Routes', count: 10 },
    ],
  },
  {
    id: 'weapon_faster_handling',
    name: 'Faster Handling',
    targetCategory: 'weapon',
    description: 'Reduces ready time, draw speed, and aim-down-sights (ADS) transition latency.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Jude Navarro', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'circuitswitch', name: 'Circuit Switch', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },
  {
    id: 'weapon_scope',
    name: 'Tactical Scope',
    targetCategory: 'weapon',
    description: 'Installs variable optical zoom optics for precision long-range engagements.',
    applicableTo: 'All Rifles & Carbines',
    engineers: ['Oden Geiger', 'Wellington Beck', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'optilens', name: 'Optic Lens', count: 10 },
      { itemId: 'microrotationarray', name: 'Micro Rotation Array', count: 10 },
      { itemId: 'spectralanalysisdata', name: 'Spectral Analysis Data', count: 10 },
    ],
  },
  {
    id: 'weapon_stability',
    name: 'Stability',
    targetCategory: 'weapon',
    description: 'Mitigates barrel climb, muzzle drift, and horizontal recoil impulse during sustained fire.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Wellington Beck', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'microrotationarray', name: 'Micro Rotation Array', count: 10 },
      { itemId: 'weaponinventory', name: 'Weapon Test Data', count: 10 },
    ],
  },
  {
    id: 'weapon_magazine_size',
    name: 'Magazine Size',
    targetCategory: 'weapon',
    description: 'Expands weapon magazine bullet capacity by +50%.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Jude Navarro', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'weaponcomponent', name: 'Weapon Component', count: 10 },
      { itemId: 'viscoelasticpolymer', name: 'Viscoelastic Polymer', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },
  {
    id: 'weapon_reload_speed',
    name: 'Reload Speed',
    targetCategory: 'weapon',
    description: 'Speeds up magazine swap and reload cycle times by +30%.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Jude Navarro', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'circuitswitch', name: 'Circuit Switch', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },
  {
    id: 'weapon_headshot_damage',
    name: 'Headshot Damage',
    targetCategory: 'weapon',
    description: 'Amplifies critical precision damage multiplier on unshielded helmet and cockpit hits by +50%.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Wellington Beck', 'Rosa Dayette'],
    requiredMaterials: [
      { itemId: 'microelectrode', name: 'Microelectrode', count: 10 },
      { itemId: 'weaponcomponent', name: 'Weapon Component', count: 10 },
      { itemId: 'biometricdata', name: 'Biometric Data', count: 10 },
    ],
  },
  {
    id: 'weapon_high_velocity',
    name: 'High Velocity',
    targetCategory: 'weapon',
    description: 'Increases kinetic projectile & plasma bolt flight velocity by +35%.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Jude Navarro', 'Eleanor Bresa'],
    requiredMaterials: [
      { itemId: 'tungstencarbide', name: 'Tungsten Carbide', count: 10 },
      { itemId: 'electromagneticelectrode', name: 'Electromagnetic Electrode', count: 10 },
      { itemId: 'ballisticsdata', name: 'Ballistics Data', count: 10 },
    ],
  },
  {
    id: 'weapon_stowed_reloading',
    name: 'Stowed Reloading',
    targetCategory: 'weapon',
    description: 'Automatically reloads holstered primary or secondary weapon after 3 seconds of holster.',
    applicableTo: 'All Weapons',
    engineers: ['Hero Ferrari', 'Kit Fowler', 'Baltanos'],
    requiredMaterials: [
      { itemId: 'circuitboard', name: 'Circuit Board', count: 10 },
      { itemId: 'aerogelgelpack', name: 'Micro Hydraulics', count: 10 },
      { itemId: 'combatmetricdata', name: 'Combat Performance Data', count: 10 },
    ],
  },
];

// =========================================================================
// 2. GRADE 1 THROUGH GRADE 5 UPGRADE COST MATRIX
// =========================================================================

/**
 * Standard progression multipliers for suits & weapons across G1 -> G5:
 * G1 -> G2: 1 Goods, 1 Data, 2 AssetA, 2 AssetB, 600,000 CR
 * G2 -> G3: 2 Goods, 2 Data, 5 AssetA, 5 AssetB, 2,250,000 CR
 * G3 -> G4: 4 Goods, 4 Data, 9 AssetA, 9 AssetB, 4,500,000 CR
 * G4 -> G5: 5 Goods, 5 Data, 12 AssetA, 12 AssetB, 7,500,000 CR
 * Total: 12 Goods, 12 Data, 28 AssetA, 28 AssetB, 14,850,000 CR
 */

function buildUpgradeTiers(
  schematicId: string,
  schematicName: string,
  specialGoodId: string,
  specialGoodName: string,
  assetAId: string,
  assetAName: string,
  assetBId: string,
  assetBName: string
): UpgradeCostTier[] {
  return [
    {
      fromGrade: 1,
      toGrade: 2,
      credits: 600000,
      materials: [
        { itemId: schematicId, name: schematicName, count: 1 },
        { itemId: specialGoodId, name: specialGoodName, count: 1 },
        { itemId: 'manufacturinginstructions', name: 'Manufacturing Instructions', count: 1 },
        { itemId: assetAId, name: assetAName, count: 2 },
        { itemId: assetBId, name: assetBName, count: 2 },
      ],
    },
    {
      fromGrade: 2,
      toGrade: 3,
      credits: 2250000,
      materials: [
        { itemId: schematicId, name: schematicName, count: 2 },
        { itemId: specialGoodId, name: specialGoodName, count: 2 },
        { itemId: 'manufacturinginstructions', name: 'Manufacturing Instructions', count: 2 },
        { itemId: assetAId, name: assetAName, count: 5 },
        { itemId: assetBId, name: assetBName, count: 5 },
      ],
    },
    {
      fromGrade: 3,
      toGrade: 4,
      credits: 4500000,
      materials: [
        { itemId: schematicId, name: schematicName, count: 4 },
        { itemId: specialGoodId, name: specialGoodName, count: 4 },
        { itemId: 'manufacturinginstructions', name: 'Manufacturing Instructions', count: 4 },
        { itemId: assetAId, name: assetAName, count: 9 },
        { itemId: assetBId, name: assetBName, count: 9 },
      ],
    },
    {
      fromGrade: 4,
      toGrade: 5,
      credits: 7500000,
      materials: [
        { itemId: schematicId, name: schematicName, count: 5 },
        { itemId: specialGoodId, name: specialGoodName, count: 5 },
        { itemId: 'manufacturinginstructions', name: 'Manufacturing Instructions', count: 5 },
        { itemId: assetAId, name: assetAName, count: 12 },
        { itemId: assetBId, name: assetBName, count: 12 },
      ],
    },
  ];
}

export const ODYSSEY_EQUIPMENT_CATALOG: EquipmentDefinition[] = [
  // --- SUITS ---
  {
    id: 'maverick',
    name: 'Maverick Suit',
    category: 'suit',
    family: 'Suits',
    description: 'Salvage and engineering suit with heavy Arc Cutter and expanded tool pouch.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'suitschematic',
      'Suit Schematic',
      'healthmonitor',
      'Health Monitor',
      'carbonfibre',
      'Carbon Fibre',
      'graphene',
      'Graphene'
    ),
  },
  {
    id: 'dominator',
    name: 'Dominator Suit',
    category: 'suit',
    family: 'Suits',
    description: 'Heavy assault combat suit featuring dual primary weapon mounts and reinforced shielding.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'suitschematic',
      'Suit Schematic',
      'healthmonitor',
      'Health Monitor',
      'titaniumplating',
      'Titanium Plating',
      'graphene',
      'Graphene'
    ),
  },
  {
    id: 'artemis',
    name: 'Artemis Suit',
    category: 'suit',
    family: 'Suits',
    description: 'Exploration and exobiology suit equipped with Genetic Sampler and lightweight EVA thrusters.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'suitschematic',
      'Suit Schematic',
      'healthmonitor',
      'Health Monitor',
      'aerogel',
      'Aerogel',
      'graphene',
      'Graphene'
    ),
  },

  // --- KARMA KINETIC WEAPONS ---
  {
    id: 'karma_ar50',
    name: 'Karma AR-50',
    category: 'weapon',
    family: 'Karma (Kinetic)',
    description: 'Assault rifle firing high-velocity 5.56mm kinetic rounds. Excellent burst accuracy.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'compressionliquefier',
      'Compression Liquefier',
      'tungstencarbide',
      'Tungsten Carbide',
      'weaponcomponent',
      'Weapon Component'
    ),
  },
  {
    id: 'karma_c44',
    name: 'Karma C-44',
    category: 'weapon',
    family: 'Karma (Kinetic)',
    description: 'Compact submachine gun engineered for point-blank settlement room clearing.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'compressionliquefier',
      'Compression Liquefier',
      'tungstencarbide',
      'Tungsten Carbide',
      'weaponcomponent',
      'Weapon Component'
    ),
  },
  {
    id: 'karma_p15',
    name: 'Karma P-15',
    category: 'weapon',
    family: 'Karma (Kinetic)',
    description: 'Semi-automatic tactical sidearm delivering rapid emergency kinetic stopping power.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'compressionliquefier',
      'Compression Liquefier',
      'tungstencarbide',
      'Tungsten Carbide',
      'weaponcomponent',
      'Weapon Component'
    ),
  },
  {
    id: 'karma_l6',
    name: 'Karma L-6',
    category: 'weapon',
    family: 'Karma (Kinetic)',
    description: 'Heavy shoulder-fired rocket launcher capable of devastating armored ground vehicles.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'compressionliquefier',
      'Compression Liquefier',
      'tungstencarbide',
      'Tungsten Carbide',
      'weaponcomponent',
      'Weapon Component'
    ),
  },

  // --- TAKADA LASER WEAPONS ---
  {
    id: 'tk_aphelion',
    name: 'TK Aphelion',
    category: 'weapon',
    family: 'Takada (Laser)',
    description: 'High-energy beam combat rifle. Decimates personal shields in seconds.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'microelectrode',
      'Microelectrode',
      'opticalfibre',
      'Optical Fibre'
    ),
  },
  {
    id: 'tk_eclipse',
    name: 'TK Eclipse',
    category: 'weapon',
    family: 'Takada (Laser)',
    description: 'Burst-fire laser carbine balancing sustained battery draw and shield stripping.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'microelectrode',
      'Microelectrode',
      'opticalfibre',
      'Optical Fibre'
    ),
  },
  {
    id: 'tk_zenith',
    name: 'TK Zenith',
    category: 'weapon',
    family: 'Takada (Laser)',
    description: 'Lightweight laser pistol serving as instantaneous shield breaker secondary.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'microelectrode',
      'Microelectrode',
      'opticalfibre',
      'Optical Fibre'
    ),
  },

  // --- MANTICORE PLASMA WEAPONS ---
  {
    id: 'manticore_executioner',
    name: 'Manticore Executioner',
    category: 'weapon',
    family: 'Manticore (Plasma)',
    description: 'High-caliber plasma marksman rifle delivering catastrophic unshielded headshot lethalities.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'chemicalcatalyst',
      'Chemical Catalyst',
      'microelectrode',
      'Microelectrode'
    ),
  },
  {
    id: 'manticore_tormentor',
    name: 'Manticore Tormentor',
    category: 'weapon',
    family: 'Manticore (Plasma)',
    description: 'Heavy plasma hand-cannon matching primary weapon damage in pistol form factor.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'chemicalcatalyst',
      'Chemical Catalyst',
      'microelectrode',
      'Microelectrode'
    ),
  },
  {
    id: 'manticore_oppressor',
    name: 'Manticore Oppressor',
    category: 'weapon',
    family: 'Manticore (Plasma)',
    description: 'Fully automatic sustained-fire plasma rifle designed to pin enemy squads behind cover.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'chemicalcatalyst',
      'Chemical Catalyst',
      'microelectrode',
      'Microelectrode'
    ),
  },
  {
    id: 'manticore_intimidator',
    name: 'Manticore Intimidator',
    category: 'weapon',
    family: 'Manticore (Plasma)',
    description: 'Close-quarters dual-barrel plasma shotgun. One-shots unshielded combatants at point blank.',
    maxModificationSlots: 4,
    upgradeCosts: buildUpgradeTiers(
      'weaponschematic',
      'Weapon Schematic',
      'ionbattery',
      'Ion Battery',
      'chemicalcatalyst',
      'Chemical Catalyst',
      'microelectrode',
      'Microelectrode'
    ),
  },
];

// =========================================================================
// 3. ODYSSEY ENGINEERS DIRECTORY & UNLOCK PROGRESSION TRACKER
// =========================================================================

export const ODYSSEY_ENGINEERS: EngineerDefinition[] = [
  // --- BUBBLE ENGINEERS ---
  {
    id: 'domino_green',
    name: 'Domino Green',
    location: 'The Jackrabbit',
    system: 'Orishis',
    region: 'Bubble',
    specialties: ['Suit Upgrades', 'Extra Backpack Capacity', 'Sprint Duration', 'Jump Assist'],
    referralChain: 'Public Knowledge -> Unlocks Kit Fowler',
    discoveryRequirement: 'Travel at least 100 Ly in Apex Interstellar Transport shuttles',
    inviteRequirement: 'Visit The Jackrabbit in Orishis',
    unlockRequirement: 'Deliver 5 units of Push',
    unlockItems: [{ itemId: 'push', name: 'Push', count: 5 }],
  },
  {
    id: 'hero_ferrari',
    name: 'Hero Ferrari',
    location: 'Nevermore Terrace',
    system: 'Siris',
    region: 'Bubble',
    specialties: ['Weapon Upgrades', 'Stability', 'High Velocity', 'Reload Speed', 'Magazine Size'],
    referralChain: 'Public Knowledge -> Unlocks Wellington Beck',
    discoveryRequirement: 'Complete 10 Ground Conflict Zones (Surface CZs)',
    inviteRequirement: 'Visit Nevermore Terrace in Siris',
    unlockRequirement: 'Provide 15 Settlement Defence Plans',
    unlockItems: [{ itemId: 'settlementdefenceplans', name: 'Settlement Defence Plans', count: 15 }],
  },
  {
    id: 'wellington_beck',
    name: 'Wellington Beck',
    location: 'Beck Facility',
    system: 'Jolapa',
    region: 'Bubble',
    specialties: ['Laser Weapons (Takada)', 'Audio Masking', 'Tactical Scope', 'Greater Range'],
    referralChain: 'Referred by Hero Ferrari -> Unlocks Uma Laszlo',
    discoveryRequirement: 'Unlock Grade 3 access with Hero Ferrari',
    inviteRequirement: 'Provide 5 Insight Entertainment Suites to Hero Ferrari',
    unlockRequirement: 'Sell 15 units of Cat Media, Classic Entertainment, or Multimedia to Bartenders',
    unlockItems: [{ itemId: 'catmedia', name: 'Cat Media / Entertainment Goods', count: 15 }],
  },
  {
    id: 'kit_fowler',
    name: 'Kit Fowler',
    location: 'The Last Call',
    system: 'Capoya',
    region: 'Bubble',
    specialties: ['Stealth Modifications', 'Quieter Footsteps', 'Faster Shield Regen', 'Battery Capacity'],
    referralChain: 'Referred by Domino Green -> Unlocks Yarden Bond',
    discoveryRequirement: 'Unlock Grade 3 access with Domino Green',
    inviteRequirement: 'Provide 5 Surveillance Equipment to Domino Green',
    unlockRequirement: 'Sell 5 Opinion Polls to Bartenders',
    unlockItems: [{ itemId: 'opinionpolls', name: 'Opinion Polls', count: 5 }],
  },
  {
    id: 'jude_navarro',
    name: 'Jude Navarro',
    location: "Marshall's Drift",
    system: 'Aurai',
    region: 'Bubble',
    specialties: ['Kinetic Weapons (Karma)', 'Greater Range', 'Magazine Size', 'Reload Speed'],
    referralChain: 'Referred by Domino Green / Wellington Beck -> Unlocks Terra Velasquez',
    discoveryRequirement: 'Complete 10 Restore or Reactivate on-foot settlement missions',
    inviteRequirement: "Visit Marshall's Drift in Aurai",
    unlockRequirement: 'Provide 5 Genetic Repair Meds to Jude Navarro',
    unlockItems: [{ itemId: 'gmultitool', name: 'Genetic Repair Meds', count: 5 }],
  },
  {
    id: 'terra_velasquez',
    name: 'Terra Velasquez',
    location: "Rascal's Choice",
    system: 'Shou Xing',
    region: 'Bubble',
    specialties: ['Suit Combat Movement Speed', 'Quieter Footsteps', 'Jump Assist', 'Sprint Duration'],
    referralChain: 'Referred by Jude Navarro -> Unlocks Oden Geiger',
    discoveryRequirement: 'Provide 5 Genetic Repair Meds to Jude Navarro',
    inviteRequirement: 'Complete 6 Covert Theft or Covert Heist settlement missions',
    unlockRequirement: 'Provide 15 Financial Projections to Terra Velasquez',
    unlockItems: [{ itemId: 'financialprojections', name: 'Financial Projections', count: 15 }],
  },
  {
    id: 'oden_geiger',
    name: 'Oden Geiger',
    location: "Ankh's Promise",
    system: 'Candiaei',
    region: 'Bubble',
    specialties: ['Suit Night Vision', 'Tactical Scope', 'Greater Range'],
    referralChain: 'Referred by Terra Velasquez',
    discoveryRequirement: 'Provide 15 Financial Projections to Terra Velasquez',
    inviteRequirement: "Visit Ankh's Promise in Candiaei",
    unlockRequirement: 'Sell 20 Biological Samples, Employee Genetic Data, or Genetic Research to Bartenders',
    unlockItems: [{ itemId: 'biometricdata', name: 'Biological / Genetic Research Data', count: 20 }],
  },
  {
    id: 'yarden_bond',
    name: 'Yarden Bond',
    location: 'Sencenbaugh Port',
    system: 'LFT 509',
    region: 'Bubble',
    specialties: ['Plasma Weapons (Manticore)', 'Audio Masking', 'Noise Suppressor'],
    referralChain: 'Referred by Kit Fowler',
    discoveryRequirement: 'Provide 5 Surveillance Equipment to Kit Fowler',
    inviteRequirement: 'Visit Sencenbaugh Port in LFT 509',
    unlockRequirement: 'Sell 8 Smear Campaign Plans to Bartenders',
    unlockItems: [{ itemId: 'smearcampaignplans', name: 'Smear Campaign Plans', count: 8 }],
  },

  // --- COLONIA ENGINEERS ---
  {
    id: 'baltanos',
    name: 'Baltanos',
    location: "Philosopher's Stone",
    system: 'Luchtaine',
    region: 'Colonia',
    specialties: ['Night Vision', 'Extra Backpack', 'Combat Movement Speed', 'Stability'],
    referralChain: 'Colonia Master Engineer -> Refers Yi Shen',
    discoveryRequirement: 'Public Knowledge in the Colonia Region',
    inviteRequirement: 'Gain Friendly reputation with Colonia Council faction',
    unlockRequirement: 'Provide 10 Faction Associates data to Baltanos',
    unlockItems: [{ itemId: 'settlementdefenceplans', name: 'Faction Associates / Security Data', count: 10 }],
  },
  {
    id: 'eleanor_bresa',
    name: 'Eleanor Bresa',
    location: 'The Sanctuary',
    system: 'Carcosa',
    region: 'Colonia',
    specialties: ['Damage Resistance', 'Night Vision', 'Tactical Scope', 'High Velocity'],
    referralChain: 'Colonia Master Engineer -> Refers Yi Shen',
    discoveryRequirement: 'Public Knowledge in the Colonia Region',
    inviteRequirement: 'Dock and disembark at 5 planetary settlements in Colonia',
    unlockRequirement: 'Provide 10 Digital Designs to Eleanor Bresa',
    unlockItems: [{ itemId: 'combattrainingmaterial', name: 'Digital Designs / Schematics', count: 10 }],
  },
  {
    id: 'rosa_dayette',
    name: 'Rosa Dayette',
    location: 'The Watchtower',
    system: 'LTT 1935',
    region: 'Colonia',
    specialties: ['Laser & Plasma Modifications', 'Audio Masking', 'Noise Suppressor', 'Headshot Damage'],
    referralChain: 'Colonia Master Engineer -> Refers Yi Shen',
    discoveryRequirement: 'Public Knowledge in the Colonia Region',
    inviteRequirement: 'Sell 10 Culinary Recipes or Cocktail Recipes to Bartenders in Colonia',
    unlockRequirement: 'Provide 10 Manufacturing Instructions to Rosa Dayette',
    unlockItems: [{ itemId: 'manufacturinginstructions', name: 'Manufacturing Instructions', count: 10 }],
  },
  {
    id: 'yi_shen',
    name: 'Yi Shen',
    location: 'Cantwell Port',
    system: 'Trailing',
    region: 'Colonia',
    specialties: ['Master Tier Suit & Weapon Engineering (All Categories)'],
    referralChain: 'Final Colonia Master Engineer (Requires Baltanos, Eleanor Bresa, and Rosa Dayette referrals)',
    discoveryRequirement: 'Progress referral tasks from Baltanos, Eleanor Bresa, and Rosa Dayette',
    inviteRequirement: 'Visit Cantwell Port in Trailing',
    unlockRequirement: 'Provide 10 Faction Associates, 10 Digital Designs, and 10 Manufacturing Instructions',
    unlockItems: [{ itemId: 'manufacturinginstructions', name: 'Master Engineering Protocol Materials', count: 10 }],
  },
];
