// Location: atlas/client/src/lib/engine/odyssey_locker_catalog.ts
// Odyssey Locker Items Catalog: Assets (Chemicals, Circuits, Tech), Goods, and Data (Operational, Financial, Technical)
// Provides item metadata, display names, rarity tiers, base values, and descriptions for all Frontier Odyssey on-foot micro-resources.

export type OdysseyCategory = 'assets' | 'goods' | 'data';
export type OdysseySubCategory =
  | 'Chemicals'
  | 'Circuits'
  | 'Tech'
  | 'Goods'
  | 'Operational'
  | 'Financial'
  | 'Technical';

export type OdysseyRarity = 'Very Common' | 'Common' | 'Standard' | 'Rare' | 'Very Rare';

export interface OdysseyItemDefinition {
  id: string; // Internal id (lowercase/snake, e.g. "aerogel")
  name: string; // Display name (e.g. "Aerogel")
  category: OdysseyCategory;
  subCategory: OdysseySubCategory;
  rarity: OdysseyRarity;
  baseValue: number; // Credit value when sold to concourse bartender
  isIllegal?: boolean;
  description: string;
}

export const ODYSSEY_LOCKER_CATALOG: OdysseyItemDefinition[] = [
  // ==========================================
  // ASSETS - CHEMICALS (Bartender tradeable)
  // ==========================================
  {
    id: 'aerogel',
    name: 'Aerogel',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Common',
    baseValue: 1000,
    description: 'Ultra-light porous synthetic material derived from gel, providing extreme thermal insulation.'
  },
  {
    id: 'chemicalcatalyst',
    name: 'Chemical Catalyst',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Standard',
    baseValue: 2500,
    description: 'Specialized chemical compound accelerating reaction kinetics in high-energy weapon batteries.'
  },
  {
    id: 'chemicalsample',
    name: 'Chemical Sample',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Very Common',
    baseValue: 500,
    description: 'Standard chemical reagent vial retrieved from industrial processing labs.'
  },
  {
    id: 'epinephrine',
    name: 'Epinephrine',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Common',
    baseValue: 1200,
    description: 'Hormonal stimulant used for emergency medical response and adrenaline regulators.'
  },
  {
    id: 'epinephrineauto',
    name: 'Epipen Auto-Injector',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Standard',
    baseValue: 2800,
    description: 'Stabilized autonomic injector used in trauma response suit medkits.'
  },
  {
    id: 'graphene',
    name: 'Graphene',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Rare',
    baseValue: 10000,
    description: 'Single layer of carbon atoms arranged in a 2D hexagonal lattice, with phenomenal tensile strength.'
  },
  {
    id: 'oxygenicbacteria',
    name: 'Oxygenic Bacteria',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Common',
    baseValue: 1500,
    description: 'Bio-engineered algae cultures synthesized for atmospheric rebreather units.'
  },
  {
    id: 'phagenucleicacid',
    name: 'PH-Neutral Chemical Base',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Standard',
    baseValue: 3500,
    description: 'Buffer solution regulating suit thermal loops under extreme environmental hazard.'
  },
  {
    id: 'purifiedwater',
    name: 'Purified Water',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Very Common',
    baseValue: 250,
    description: 'Triple-distilled water suitable for life-support circulation and chemical synthesis.'
  },
  {
    id: 'syntheticpathogen',
    name: 'Synthetic Pathogen',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Very Rare',
    baseValue: 25000,
    description: 'Artificially synthesized viral strand subject to strict inter-system bio-containment.'
  },
  {
    id: 'viscoelasticpolymer',
    name: 'Viscoelastic Polymer',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Standard',
    baseValue: 4000,
    description: 'Shock-absorbing polymer layer engineered into ballistic armor weave.'
  },
  {
    id: 'carbonfibre',
    name: 'Carbon Fibre',
    category: 'assets',
    subCategory: 'Chemicals',
    rarity: 'Common',
    baseValue: 1800,
    description: 'High modulus carbon filament weave reinforced for suit frame skeletal reinforcement.'
  },

  // ==========================================
  // ASSETS - CIRCUITS (Bartender tradeable)
  // ==========================================
  {
    id: 'circuitboard',
    name: 'Circuit Board',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Common',
    baseValue: 1200,
    description: 'Multi-layered printed circuit board populated with standard micro-relays.'
  },
  {
    id: 'circuitswitch',
    name: 'Circuit Switch',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Very Common',
    baseValue: 600,
    description: 'High-speed solid-state relay governing sub-nanosecond signal routing.'
  },
  {
    id: 'electricalfuse',
    name: 'Electrical Fuse',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Very Common',
    baseValue: 450,
    description: 'Surge protector component shielding delicate avionics and shield generators.'
  },
  {
    id: 'electricalwiring',
    name: 'Electrical Wiring',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Very Common',
    baseValue: 400,
    description: 'Superconducting copper-silver alloy wiring harness for suit power distribution.'
  },
  {
    id: 'electromagneticelectrode',
    name: 'Electromagnetic Electrode',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Standard',
    baseValue: 3200,
    description: 'Precision electrode creating localized magnetic pinches in plasma-based weapon systems.'
  },
  {
    id: 'ionisingradiationfilter',
    name: 'Ionising Radiation Filter',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Rare',
    baseValue: 8500,
    description: 'Multi-stage electrostatic filter protecting sensor arrays from hard cosmic radiation.'
  },
  {
    id: 'microrotationarray',
    name: 'Micro Rotation Array',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Rare',
    baseValue: 9000,
    description: 'Miniaturized MEMS gyroscope array utilized for fine-target stabilization.'
  },
  {
    id: 'opticalfibre',
    name: 'Optical Fibre',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Standard',
    baseValue: 2800,
    description: 'High-transmittance silica waveguide providing instantaneous data throughput.'
  },
  {
    id: 'scrambler',
    name: 'Frequency Scrambler',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Very Rare',
    baseValue: 18000,
    description: 'Compact microwave jamming element capable of disrupting localized sensor telemetry.'
  },
  {
    id: 'surfacetestcircuit',
    name: 'Micro-Transformer',
    category: 'assets',
    subCategory: 'Circuits',
    rarity: 'Standard',
    baseValue: 3800,
    description: 'Ultra-compact inductive voltage converter for high-drain kinetic energy shields.'
  },

  // ==========================================
  // ASSETS - TECH (Bartender tradeable)
  // ==========================================
  {
    id: 'aerogelgelpack',
    name: 'Micro Hydraulics',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Standard',
    baseValue: 4200,
    description: 'Pressurized micro-actuators empowering powered exoskeleton movement and sprint agility.'
  },
  {
    id: 'memorychip',
    name: 'Memory Chip',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Common',
    baseValue: 1500,
    description: 'High-density holographic memory crystal for storing mission telemetry and target acquisition keys.'
  },
  {
    id: 'microelectrode',
    name: 'Microelectrode',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Very Common',
    baseValue: 700,
    description: 'Micro-scale sensory probe used in biological suits and heads-up neural links.'
  },
  {
    id: 'microthrusters',
    name: 'Micro Thruster Unit',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Rare',
    baseValue: 12500,
    description: 'Precision cold-gas thruster assembly mounted on flight and combat EVA suits.'
  },
  {
    id: 'optilens',
    name: 'Optic Lens',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Standard',
    baseValue: 3100,
    description: 'Diamond-coated anti-reflective glass lens for helmet optics and precision sniper scopes.'
  },
  {
    id: 'scramblerelectronics',
    name: 'Scrambler Board',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Rare',
    baseValue: 11000,
    description: 'Miniature logic harness configured to bypass security gate authorization checkpoints.'
  },
  {
    id: 'titaniumplating',
    name: 'Titanium Plating',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Standard',
    baseValue: 3600,
    description: 'High-tensile Grade 5 titanium plate alloy engineered for lightweight blast mitigation.'
  },
  {
    id: 'tungstencarbide',
    name: 'Tungsten Carbide',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Rare',
    baseValue: 14000,
    description: 'Dense refractory compound offering peerless resistance to hyper-velocity projectile penetrations.'
  },
  {
    id: 'weaponcomponent',
    name: 'Weapon Component',
    category: 'assets',
    subCategory: 'Tech',
    rarity: 'Standard',
    baseValue: 4500,
    description: 'Milled tactical receiver piece compatible with military handheld armaments.'
  },

  // ==========================================
  // GOODS (Cannot be bartered; Concourse Bartender sell-only)
  // ==========================================
  {
    id: 'aerospacegold',
    name: 'Aerospace Grade Titanium',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Standard',
    baseValue: 5000,
    description: 'High-purity titanium billets manufactured in zero-gravity orbital foundries.'
  },
  {
    id: 'buildingschematic',
    name: 'Building Schematic',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Rare',
    baseValue: 15000,
    description: 'Architectural blueprints detailing habitation, laboratory, and reactor layout blueprints.'
  },
  {
    id: 'catmedia',
    name: 'Cat Media',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Very Common',
    baseValue: 100,
    description: 'Feline entertainment video holocubes popular among isolated outpost station workers.'
  },
  {
    id: 'compactlibrary',
    name: 'Compact Library',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Common',
    baseValue: 800,
    description: 'Digitized collection of 21st-33rd century literature and entertainment disks.'
  },
  {
    id: 'compressionliquefier',
    name: 'Compression Liquefier',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Rare',
    baseValue: 12000,
    description: 'Industrial cryo-condenser unit converting gas emissions into liquid propellants.'
  },
  {
    id: 'deepmantlesample',
    name: 'Deep Mantle Sample',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Standard',
    baseValue: 7500,
    description: 'Core rock drill core extracted from planetary mantle depths under extreme pressures.'
  },
  {
    id: 'gmultitool',
    name: 'Genetic Repair Media',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Rare',
    baseValue: 18000,
    description: 'CRISPR cellular reparation cocktails used in life extension and cloning labs.'
  },
  {
    id: 'healthmonitor',
    name: 'Health Monitor',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Common',
    baseValue: 1500,
    description: 'Wearable biometric telemetry sensor monitoring commander cardiovascular parameters.'
  },
  {
    id: 'inertialcanister',
    name: 'Inertial Canister',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Standard',
    baseValue: 6000,
    description: 'Hermetically sealed containment bottle rated for supercritical chemical transport.'
  },
  {
    id: 'ionbattery',
    name: 'Micro-Power Cell',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Common',
    baseValue: 2000,
    description: 'Rechargeable energy pack powering powered ground equipment and battery rechargers.'
  },
  {
    id: 'shipschematic',
    name: 'Ship Schematic',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Very Rare',
    baseValue: 22000,
    description: 'Detailed structural stress plans and avionic routing for tactical combat craft.'
  },
  {
    id: 'suitschematic',
    name: 'Suit Schematic',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Very Rare',
    baseValue: 25000,
    description: 'High-security fabrication schematics for military, mercenary, and explorer spacesuits.'
  },
  {
    id: 'surveillanceequipment',
    name: 'Surveillance Equipment',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Standard',
    baseValue: 4500,
    description: 'Covert optical listening and visual monitoring arrays used in corporate espionage.'
  },
  {
    id: 'weaponschematic',
    name: 'Weapon Schematic',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Very Rare',
    baseValue: 30000,
    description: 'Classified CAD fabrication models for military grade plasma and kinetic firearms.'
  },
  {
    id: 'lockerkeys',
    name: 'Locker Keys',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Common',
    baseValue: 1500,
    description: 'Single-use digital bypass keys extracted from storage facilities. Obsolete once unlocked.'
  },
  {
    id: 'nutritionalconcentrate',
    name: 'Nutritional Concentrate',
    category: 'goods',
    subCategory: 'Goods',
    rarity: 'Very Common',
    baseValue: 600,
    description: 'Synthetic caloric nutrient paste rations used on remote installations.'
  },

  // ==========================================
  // DATA - OPERATIONAL
  // ==========================================
  {
    id: 'airqualityreports',
    name: 'Air Quality Reports',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Very Common',
    baseValue: 600,
    description: 'Environmental telemetry tracking atmospheric nitrogen, argon, and pollutant parts per million.'
  },
  {
    id: 'ballisticsdata',
    name: 'Ballistics Data',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Standard',
    baseValue: 4000,
    description: 'Terminal velocity and kinetic impact telemetry from live combat fire exercises.'
  },
  {
    id: 'combattrainingmaterial',
    name: 'Combat Training Material',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Common',
    baseValue: 2200,
    description: 'Standard military field manuals covering CQB room clearing and defensive posture.'
  },
  {
    id: 'dutyrota',
    name: 'Duty Rota',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Very Common',
    baseValue: 400,
    description: 'Work shift assignments and patrol schedules for installation security staff.'
  },
  {
    id: 'evacuationroutes',
    name: 'Evacuation Routes',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Common',
    baseValue: 1500,
    description: 'Emergency containment and egress procedures in the event of depressurization.'
  },
  {
    id: 'maintenanceeval',
    name: 'Maintenance Logs',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Common',
    baseValue: 1100,
    description: 'Diagnostics logbooks detailing reactor maintenance intervals and component wear.'
  },
  {
    id: 'patrolroutes',
    name: 'Patrol Routes',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Standard',
    baseValue: 3500,
    description: 'Tactical security patrol schedules and checkpoint handover protocols.'
  },
  {
    id: 'settlementdefenceplans',
    name: 'Settlement Defence Plans',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Rare',
    baseValue: 12000,
    description: 'Classified outpost security grid layout showing automated turret sightlines.'
  },
  {
    id: 'surveillancelogs',
    name: 'Surveillance Logs',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Standard',
    baseValue: 3200,
    description: 'Timestamped records of facility camera sensors and automated access loggers.'
  },
  {
    id: 'personallogs',
    name: 'Personal Logs',
    category: 'data',
    subCategory: 'Operational',
    rarity: 'Very Common',
    baseValue: 500,
    description: 'Informal daily journals kept by settlement miners and scientists.'
  },

  // ==========================================
  // DATA - FINANCIAL
  // ==========================================
  {
    id: 'balanceledger',
    name: 'Balance Sheets',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Common',
    baseValue: 1200,
    description: 'Corporate quarterly revenue records and expenditure declarations.'
  },
  {
    id: 'bankaccountdata',
    name: 'Bank Account Data',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Standard',
    baseValue: 4500,
    description: 'Encrypted account routing codes and corporate escrow transaction records.'
  },
  {
    id: 'blackmailmaterial',
    name: 'Blackmail Material',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Rare',
    baseValue: 16000,
    isIllegal: true,
    description: 'Incriminating personal recordings used for corporate extortion and coercion.'
  },
  {
    id: 'combatschedules',
    name: 'Conflict Records',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Standard',
    baseValue: 3800,
    description: 'Bounty hunter pay stubs and mercenary combat deployment contract manifests.'
  },
  {
    id: 'financialprojections',
    name: 'Financial Projections',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Standard',
    baseValue: 5000,
    description: 'Speculative commodity forecast data prepared for executive board members.'
  },
  {
    id: 'insuranceclaims',
    name: 'Insurance Claims',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Common',
    baseValue: 1800,
    description: 'Disaster payout requests documenting cargo destruction and hull rebuys.'
  },
  {
    id: 'marketreports',
    name: 'Market Reports',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Common',
    baseValue: 1400,
    description: 'Regional pricing indexes across nearby extraction and industrial systems.'
  },
  {
    id: 'opinionpolls',
    name: 'Opinion Polls',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Rare',
    baseValue: 9500,
    description: 'Demographic voter sentiment metrics used by local faction leaders to sway elections.'
  },
  {
    id: 'smearcampaignplans',
    name: 'Smear Campaign Plans',
    category: 'data',
    subCategory: 'Financial',
    rarity: 'Very Rare',
    baseValue: 24000,
    isIllegal: true,
    description: 'Fabricated scandalous dossiers designed to destroy rival faction political reputations.'
  },

  // ==========================================
  // DATA - TECHNICAL
  // ==========================================
  {
    id: 'biometricdata',
    name: 'Biometric Data',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Standard',
    baseValue: 4200,
    description: 'Retinal scans, DNA markers, and voice signatures of facility personnel.'
  },
  {
    id: 'catastrophicdatabanks',
    name: 'Catastrophic Failure Reports',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Rare',
    baseValue: 11500,
    description: 'Telemetry captured during reactor melt and structural containment breaches.'
  },
  {
    id: 'chemicalformulae',
    name: 'Chemical Formulae',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Standard',
    baseValue: 3600,
    description: 'Reaction synthesis recipes for military plastics and explosive reagents.'
  },
  {
    id: 'combatmetricdata',
    name: 'Combat Performance Data',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Standard',
    baseValue: 4800,
    description: 'Telemetry recording weapon heat buildup, rate of fire, and shield dispersion.'
  },
  {
    id: 'extractiondata',
    name: 'Extraction Data',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Common',
    baseValue: 1600,
    description: 'Subsurface resource drill core geological yields and mineral percentages.'
  },
  {
    id: 'manufacturinginstructions',
    name: 'Manufacturing Instructions',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Very Rare',
    baseValue: 28000,
    description: 'Automated 3D nano-assembler machine toolpaths for precision engineering upgrades.'
  },
  {
    id: 'medicalrecords',
    name: 'Medical Records',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Common',
    baseValue: 2000,
    description: 'Personnel vaccination logs, traumatic treatment reports, and gene scans.'
  },
  {
    id: 'reactoroutputreview',
    name: 'Reactor Output Review',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Standard',
    baseValue: 5500,
    description: 'Thermal generation and megawatt delivery charts from fusion containment cores.'
  },
  {
    id: 'spectralanalysisdata',
    name: 'Spectral Analysis Data',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Standard',
    baseValue: 3900,
    description: 'Electromagnetic spectroscopy sweeps mapping mineral density on celestial bodies.'
  },
  {
    id: 'weaponinventory',
    name: 'Weapon Test Data',
    category: 'data',
    subCategory: 'Technical',
    rarity: 'Rare',
    baseValue: 13000,
    description: 'Firing range velocity dispersion and thermal degradation metrics.'
  }
];

// Quick indexed lookup map
export const ODYSSEY_CATALOG_MAP: Map<string, OdysseyItemDefinition> = new Map(
  ODYSSEY_LOCKER_CATALOG.map((item) => [item.id.toLowerCase(), item])
);
