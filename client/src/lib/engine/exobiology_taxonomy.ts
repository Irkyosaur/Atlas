// Location: client/src/lib/engine/exobiology_taxonomy.ts
// Stage 16.3: Exobiology Value Predictor & Vista Genomics Payout Calculator
// Canonical taxonomy catalog, official Vista Genomics payouts, minimum clonal distances,
// and environmental habitat rules (atmosphere, gravity, temperature, volcanism).

export type AtmosphereComponent =
  | 'CarbonDioxide'
  | 'Argon'
  | 'Nitrogen'
  | 'Methane'
  | 'Oxygen'
  | 'SulfurDioxide'
  | 'Water'
  | 'Ammonia'
  | 'Neon'
  | 'Helium';

export type VolcanismType =
  | 'None'
  | 'WaterGeysers'
  | 'CarbonDioxideGeysers'
  | 'NitrogenMagma'
  | 'SilicateVapour'
  | 'MetallicMagma'
  | 'MethaneMagma'
  | 'RockyMagma'
  | 'SulfurDioxideGeysers'
  | 'Any';

export interface ExobiologySpecies {
  id: string;
  genus: string;
  species: string;
  fullName: string;
  canonicalDistanceM: number;     // Clonal sampling distance required (100m - 1000m)
  basePayoutCr: number;           // Official Vista Genomics baseline reward (credits)
  firstDiscoveryPayoutCr: number; // 5x multiplier total (base + 4x bonus = 5x base payout)
  sampleType: 'Plant Specimen' | 'Bacterial Colony' | 'Fungal Growth' | 'Organic Crystal';
  typicalColor: string;
  notes: string;

  // Environmental criteria requirements:
  habitatRules: {
    minGravityG: number;
    maxGravityG: number;
    minTempK: number;
    maxTempK: number;
    minPressureAtm?: number;
    maxPressureAtm?: number;
    requiredAtmospheres?: string[]; // Substrings matching atmosphere (e.g. 'Carbon dioxide', 'Sulfur dioxide', 'Nitrogen', 'Methane', 'Water', 'Argon', 'Oxygen', 'Ammonia')
    volcanismRequirement?: 'Required' | 'Forbidden' | 'Optional';
    starTypes?: string[];
  };
}

/**
 * Vista Genomics First Discovery Multiplier:
 * Since Update 14 (Nov 2022), first discovery of biological data grants a 5x total payout (4x bonus + 1x base).
 */
export const VISTA_FIRST_DISCOVERY_MULTIPLIER = 5;

/**
 * Comprehensive Canonical Elite Dangerous Odyssey Exobiology Taxonomy Catalog
 * Contains official Vista Genomics base values and exact clonal separation distances.
 */
export const EXOBIOLOGY_SPECIES_CATALOG: ExobiologySpecies[] = [
  // --- Stratum ---
  {
    id: 'stratum_tectonicas',
    genus: 'Stratum',
    species: 'Tectonicas',
    fullName: 'Stratum Tectonicas',
    canonicalDistanceM: 500,
    basePayoutCr: 19010800,
    firstDiscoveryPayoutCr: 19010800 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 95,054,000 CR
    sampleType: 'Plant Specimen',
    typicalColor: '#10b981',
    notes: 'The legendary "jackpot" species. Found on high-metal content / rocky bodies with CO2 atmospheres and moderate gravity.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.65,
      minTempK: 165,
      maxTempK: 280,
      requiredAtmospheres: ['Carbon dioxide', 'Thin Carbon dioxide', 'CO2']
    }
  },
  {
    id: 'stratum_laminata',
    genus: 'Stratum',
    species: 'Laminata',
    fullName: 'Stratum Laminata',
    canonicalDistanceM: 500,
    basePayoutCr: 2795400,
    firstDiscoveryPayoutCr: 2795400 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#059669',
    notes: 'Tiered horizontal stratifications in plains and smooth terrain.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.8,
      minTempK: 150,
      maxTempK: 295,
      requiredAtmospheres: ['Carbon dioxide', 'Argon', 'Thin Carbon dioxide']
    }
  },
  {
    id: 'stratum_paleas',
    genus: 'Stratum',
    species: 'Paleas',
    fullName: 'Stratum Paleas',
    canonicalDistanceM: 500,
    basePayoutCr: 1221100,
    firstDiscoveryPayoutCr: 1221100 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#34d399',
    notes: 'Common stratum variety found on icy and rocky worlds.',
    habitatRules: {
      minGravityG: 0.02,
      maxGravityG: 0.6,
      minTempK: 140,
      maxTempK: 250,
      requiredAtmospheres: ['Nitrogen', 'Methane', 'Water', 'Carbon dioxide']
    }
  },

  // --- Bacterium ---
  {
    id: 'bacterium_cerbrus',
    genus: 'Bacterium',
    species: 'Cerbrus',
    fullName: 'Bacterium Cerbrus',
    canonicalDistanceM: 500,
    basePayoutCr: 1689700,
    firstDiscoveryPayoutCr: 1689700 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Bacterial Colony',
    typicalColor: '#eab308',
    notes: 'Broad flat biofilm sheets sprawling across low-relief basins.',
    habitatRules: {
      minGravityG: 0.01,
      maxGravityG: 1.4,
      minTempK: 100,
      maxTempK: 350,
      requiredAtmospheres: ['Nitrogen', 'Methane', 'Carbon dioxide', 'Ammonia', 'Water']
    }
  },
  {
    id: 'bacterium_aurasus',
    genus: 'Bacterium',
    species: 'Aurasus',
    fullName: 'Bacterium Aurasus',
    canonicalDistanceM: 500,
    basePayoutCr: 1000000,
    firstDiscoveryPayoutCr: 1000000 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 5,000,000 CR
    sampleType: 'Bacterial Colony',
    typicalColor: '#ca8a04',
    notes: 'Golden-tinged microbial mat commonly found on low-temperature bodies.',
    habitatRules: {
      minGravityG: 0.01,
      maxGravityG: 1.5,
      minTempK: 90,
      maxTempK: 300,
      requiredAtmospheres: ['Carbon dioxide', 'Methane', 'Argon', 'Oxygen', 'Neon']
    }
  },
  {
    id: 'bacterium_volucre',
    genus: 'Bacterium',
    species: 'Volucre',
    fullName: 'Bacterium Volucre',
    canonicalDistanceM: 500,
    basePayoutCr: 7299600,
    firstDiscoveryPayoutCr: 7299600 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Bacterial Colony',
    typicalColor: '#facc15',
    notes: 'High-value microbial colony flourishing on sulfur-rich or volatile environments.',
    habitatRules: {
      minGravityG: 0.02,
      maxGravityG: 1.2,
      minTempK: 160,
      maxTempK: 380,
      requiredAtmospheres: ['Sulfur dioxide', 'Thin Sulfur dioxide', 'Ammonia']
    }
  },

  // --- Tubus ---
  {
    id: 'tubus_rosarium',
    genus: 'Tubus',
    species: 'Rosarium',
    fullName: 'Tubus Rosarium',
    canonicalDistanceM: 800,
    basePayoutCr: 11849100,
    firstDiscoveryPayoutCr: 11849100 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 59,245,500 CR
    sampleType: 'Plant Specimen',
    typicalColor: '#38bdf8',
    notes: 'Tall hollow chimney towers in rugged upland or canyon terrains. Requires 800m traverse.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.7,
      minTempK: 170,
      maxTempK: 280,
      requiredAtmospheres: ['Carbon dioxide', 'Thin Carbon dioxide', 'Argon']
    }
  },
  {
    id: 'tubus_conifer',
    genus: 'Tubus',
    species: 'Conifer',
    fullName: 'Tubus Conifer',
    canonicalDistanceM: 800,
    basePayoutCr: 2419400,
    firstDiscoveryPayoutCr: 2419400 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#0284c7',
    notes: 'Conical tubular structures resembling hollow geothermal spires.',
    habitatRules: {
      minGravityG: 0.04,
      maxGravityG: 0.65,
      minTempK: 150,
      maxTempK: 260,
      requiredAtmospheres: ['Nitrogen', 'Methane', 'Water']
    }
  },

  // --- Concha ---
  {
    id: 'concha_biconcavis',
    genus: 'Concha',
    species: 'Biconcavis',
    fullName: 'Concha Biconcavis',
    canonicalDistanceM: 150,
    basePayoutCr: 4774300,
    firstDiscoveryPayoutCr: 4774300 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#14b8a6',
    notes: 'Spiral, shell-like organo-mineral formations. Compact 150m clonal sampling distance.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.75,
      minTempK: 180,
      maxTempK: 290,
      requiredAtmospheres: ['Carbon dioxide', 'Argon', 'Water']
    }
  },
  {
    id: 'concha_renibus',
    genus: 'Concha',
    species: 'Renibus',
    fullName: 'Concha Renibus',
    canonicalDistanceM: 150,
    basePayoutCr: 8418000,
    firstDiscoveryPayoutCr: 8418000 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#0d9488',
    notes: 'Kidney-patterned shell organisms thriving in active volcanic fissure soils.',
    habitatRules: {
      minGravityG: 0.08,
      maxGravityG: 0.85,
      minTempK: 200,
      maxTempK: 320,
      requiredAtmospheres: ['Carbon dioxide', 'Sulfur dioxide'],
      volcanismRequirement: 'Optional'
    }
  },

  // --- Fonticulua ---
  {
    id: 'fonticulua_campestris',
    genus: 'Fonticulua',
    species: 'Campestris',
    fullName: 'Fonticulua Campestris',
    canonicalDistanceM: 500,
    basePayoutCr: 20000000,
    firstDiscoveryPayoutCr: 20000000 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 100,000,000 CR
    sampleType: 'Plant Specimen',
    typicalColor: '#ec4899',
    notes: 'Top-tier payout species! Geothermal fountain vent flora found on icy moons with active volcanism.',
    habitatRules: {
      minGravityG: 0.02,
      maxGravityG: 0.35,
      minTempK: 90,
      maxTempK: 180,
      requiredAtmospheres: ['Argon', 'Methane', 'Water', 'Nitrogen'],
      volcanismRequirement: 'Required'
    }
  },
  {
    id: 'fonticulua_lapida',
    genus: 'Fonticulua',
    species: 'Lapida',
    fullName: 'Fonticulua Lapida',
    canonicalDistanceM: 500,
    basePayoutCr: 3117700,
    firstDiscoveryPayoutCr: 3117700 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#db2777',
    notes: 'Hardened vent-fountain clusters found on rocky bodies.',
    habitatRules: {
      minGravityG: 0.03,
      maxGravityG: 0.5,
      minTempK: 110,
      maxTempK: 210,
      requiredAtmospheres: ['Carbon dioxide', 'Sulfur dioxide']
    }
  },

  // --- Osseus ---
  {
    id: 'osseus_spiralis',
    genus: 'Osseus',
    species: 'Spiralis',
    fullName: 'Osseus Spiralis',
    canonicalDistanceM: 800,
    basePayoutCr: 2855300,
    firstDiscoveryPayoutCr: 2855300 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Organic Crystal',
    typicalColor: '#f97316',
    notes: 'Calcified bone-like skeletal pillars needing 800m clonal distance between samples.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.6,
      minTempK: 130,
      maxTempK: 240,
      requiredAtmospheres: ['Carbon dioxide', 'Methane', 'Argon']
    }
  },
  {
    id: 'osseus_discus',
    genus: 'Osseus',
    species: 'Discus',
    fullName: 'Osseus Discus',
    canonicalDistanceM: 800,
    basePayoutCr: 12934900,
    firstDiscoveryPayoutCr: 12934900 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 64,674,500 CR
    sampleType: 'Organic Crystal',
    typicalColor: '#ea580c',
    notes: 'Rare disc-plate bone-like formations; high reward exobiology target.',
    habitatRules: {
      minGravityG: 0.04,
      maxGravityG: 0.55,
      minTempK: 140,
      maxTempK: 230,
      requiredAtmospheres: ['Nitrogen', 'Argon', 'Oxygen']
    }
  },

  // --- Aleoida ---
  {
    id: 'aleoida_araneata',
    genus: 'Aleoida',
    species: 'Araneata',
    fullName: 'Aleoida Araneata',
    canonicalDistanceM: 150,
    basePayoutCr: 12934900,
    firstDiscoveryPayoutCr: 12934900 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#06b6d4',
    notes: 'Web-like branching flora clustered in rocky plains and foothills.',
    habitatRules: {
      minGravityG: 0.04,
      maxGravityG: 0.7,
      minTempK: 160,
      maxTempK: 280,
      requiredAtmospheres: ['Carbon dioxide', 'Argon', 'Water']
    }
  },
  {
    id: 'aleoida_gravis',
    genus: 'Aleoida',
    species: 'Gravis',
    fullName: 'Aleoida Gravis',
    canonicalDistanceM: 150,
    basePayoutCr: 12934900,
    firstDiscoveryPayoutCr: 12934900 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#0891b2',
    notes: 'Heavy-stemmed succulent stalks with tight 150m clonal radius.',
    habitatRules: {
      minGravityG: 0.1,
      maxGravityG: 1.1,
      minTempK: 175,
      maxTempK: 295,
      requiredAtmospheres: ['Carbon dioxide', 'Oxygen', 'Thin Carbon dioxide']
    }
  },

  // --- Clypeus ---
  {
    id: 'clypeus_lacrimam',
    genus: 'Clypeus',
    species: 'Lacrimam',
    fullName: 'Clypeus Lacrimam',
    canonicalDistanceM: 150,
    basePayoutCr: 8418000,
    firstDiscoveryPayoutCr: 8418000 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#a855f7',
    notes: 'Shielded domed vegetation found nestled inside craters and tectonic valleys.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.8,
      minTempK: 180,
      maxTempK: 290,
      requiredAtmospheres: ['Carbon dioxide', 'Argon']
    }
  },

  // --- Frutexa ---
  {
    id: 'frutexa_flabellum',
    genus: 'Frutexa',
    species: 'Flabellum',
    fullName: 'Frutexa Flabellum',
    canonicalDistanceM: 150,
    basePayoutCr: 1632500,
    firstDiscoveryPayoutCr: 1632500 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#f59e0b',
    notes: 'Fan-shaped shrub scrubland vegetation. 150m sampling distance.',
    habitatRules: {
      minGravityG: 0.03,
      maxGravityG: 0.7,
      minTempK: 140,
      maxTempK: 270,
      requiredAtmospheres: ['Carbon dioxide', 'Water', 'Argon']
    }
  },
  {
    id: 'frutexa_metallicum',
    genus: 'Frutexa',
    species: 'Metallicum',
    fullName: 'Frutexa Metallicum',
    canonicalDistanceM: 150,
    basePayoutCr: 1632500,
    firstDiscoveryPayoutCr: 1632500 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#d97706',
    notes: 'Mineralized shrub branches growing on metal-rich and HMC bodies.',
    habitatRules: {
      minGravityG: 0.08,
      maxGravityG: 0.9,
      minTempK: 160,
      maxTempK: 310,
      requiredAtmospheres: ['Carbon dioxide', 'Sulfur dioxide']
    }
  },

  // --- Tussock ---
  {
    id: 'tussock_capillum',
    genus: 'Tussock',
    species: 'Capillum',
    fullName: 'Tussock Capillum',
    canonicalDistanceM: 200,
    basePayoutCr: 7721500,
    firstDiscoveryPayoutCr: 7721500 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#84cc16',
    notes: 'Hair-like tufts of grass colonies scattered across rolling dunes.',
    habitatRules: {
      minGravityG: 0.04,
      maxGravityG: 0.75,
      minTempK: 160,
      maxTempK: 275,
      requiredAtmospheres: ['Carbon dioxide', 'Argon', 'Methane']
    }
  },
  {
    id: 'tussock_virultu',
    genus: 'Tussock',
    species: 'Virultu',
    fullName: 'Tussock Virultu',
    canonicalDistanceM: 200,
    basePayoutCr: 3376200,
    firstDiscoveryPayoutCr: 3376200 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#65a30d',
    notes: 'Poisonous emerald grassland stalks found on sulfur and methane worlds.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.8,
      minTempK: 150,
      maxTempK: 280,
      requiredAtmospheres: ['Sulfur dioxide', 'Methane', 'Ammonia']
    }
  },

  // --- Electricae ---
  {
    id: 'electricae_pluma',
    genus: 'Electricae',
    species: 'Pluma',
    fullName: 'Electricae Pluma',
    canonicalDistanceM: 1000,
    basePayoutCr: 6786000,
    firstDiscoveryPayoutCr: 6786000 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Plant Specimen',
    typicalColor: '#818cf8',
    notes: 'Bio-electric discharge organisms. Maximum canonical distance (1,000m) required between samples.',
    habitatRules: {
      minGravityG: 0.01,
      maxGravityG: 0.45,
      minTempK: 60,
      maxTempK: 150,
      requiredAtmospheres: ['Neon', 'Argon', 'Helium', 'Nitrogen']
    }
  },

  // --- Recepta ---
  {
    id: 'recepta_deltahedron',
    genus: 'Recepta',
    species: 'Deltahedron',
    fullName: 'Recepta Deltahedron',
    canonicalDistanceM: 150,
    basePayoutCr: 14209500,
    firstDiscoveryPayoutCr: 14209500 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 71,047,500 CR
    sampleType: 'Plant Specimen',
    typicalColor: '#f43f5e',
    notes: 'Geometric hexagonal bio-chalices with bioluminescent internal sensors.',
    habitatRules: {
      minGravityG: 0.06,
      maxGravityG: 0.7,
      minTempK: 175,
      maxTempK: 285,
      requiredAtmospheres: ['Carbon dioxide', 'Water', 'Sulfur dioxide']
    }
  },

  // --- Cactoida ---
  {
    id: 'cactoida_vermeis',
    genus: 'Cactoida',
    species: 'Vermeis',
    fullName: 'Cactoida Vermeis',
    canonicalDistanceM: 300,
    basePayoutCr: 16897000,
    firstDiscoveryPayoutCr: 16897000 * VISTA_FIRST_DISCOVERY_MULTIPLIER, // 84,485,000 CR
    sampleType: 'Plant Specimen',
    typicalColor: '#10b981',
    notes: 'Segmented worm-like cactus stalks in arid canyons. Very lucrative discovery.',
    habitatRules: {
      minGravityG: 0.05,
      maxGravityG: 0.65,
      minTempK: 180,
      maxTempK: 290,
      requiredAtmospheres: ['Carbon dioxide', 'Thin Carbon dioxide']
    }
  },

  // --- Fungoida ---
  {
    id: 'fungoida_setisis',
    genus: 'Fungoida',
    species: 'Setisis',
    fullName: 'Fungoida Setisis',
    canonicalDistanceM: 300,
    basePayoutCr: 3376200,
    firstDiscoveryPayoutCr: 3376200 * VISTA_FIRST_DISCOVERY_MULTIPLIER,
    sampleType: 'Fungal Growth',
    typicalColor: '#a78bfa',
    notes: 'Spore-bearing fungal blooms clinging to mountainous inclines.',
    habitatRules: {
      minGravityG: 0.03,
      maxGravityG: 0.6,
      minTempK: 120,
      maxTempK: 240,
      requiredAtmospheres: ['Carbon dioxide', 'Methane', 'Water', 'Ammonia']
    }
  }
];
