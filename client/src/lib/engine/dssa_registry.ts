// Location: atlas/client/src/lib/engine/dssa_registry.ts
// Deep Space Support Array (DSSA) Permanent Carrier Registry & Locator Engine (Stage 5.2)

export type DssaOperationalStatus = 'Operational' | 'Standby' | 'Decommissioned' | 'Relocating';

export interface DssaCarrierServices {
  refuel: boolean;
  repair: boolean;
  armory: boolean;
  vistaGenomics: boolean;
  universalCartographics: boolean;
  pioneerSupplies: boolean;
  shipyard: boolean;
  outfitting: boolean;
}

export interface DssaTariffRates {
  fuelTariffPercent: number;
  armoryTariffPercent: number;
  repairTariffPercent: number;
  generalTariffPercent: number;
}

export interface DssaCarrier {
  callsign: string;           // Carrier callsign, e.g. "DSSA Destiny [J7X-88K]"
  name: string;               // Carrier vessel name
  systemName: string;         // System location in galactic cartography
  bodyName?: string;          // Orbital body anchor (e.g. Planet 1, Body 3 A Ring)
  region: string;             // Official Elite Dangerous galactic region
  coords: { x: number; y: number; z: number };
  ownerCmdr: string;          // Fleet Carrier Commander
  operationalStatus: DssaOperationalStatus;
  services: DssaCarrierServices;
  tariffs: DssaTariffRates;
  discordContact?: string;
  notes?: string;
  distanceLy?: number;        // Dynamically computed distance in Light Years
}

export interface DssaFilterOptions {
  searchQuery?: string;
  region?: string;
  operationalOnly?: boolean;
  requiredServices?: Partial<Record<keyof DssaCarrierServices, boolean>>;
}

/**
 * Standard default exploration haven services configuration
 */
const DEFAULT_EXPLORATION_SERVICES: DssaCarrierServices = {
  refuel: true,
  repair: true,
  armory: true,
  vistaGenomics: true,
  universalCartographics: true,
  pioneerSupplies: true,
  shipyard: true,
  outfitting: true,
};

const DEFAULT_TARIFFS: DssaTariffRates = {
  fuelTariffPercent: 0,
  armoryTariffPercent: 0,
  repairTariffPercent: 0,
  generalTariffPercent: 0,
};

/**
 * Canonical embedded DSSA fleet registry covering all key galactic regions.
 * Used when Ananke is running offline or during initial instant boot.
 */
export const EMBEDDED_DSSA_REGISTRY: DssaCarrier[] = [
  // 1. The Abyss & Far Rim
  {
    callsign: 'DSSA Destiny [J7X-88K]',
    name: 'DSSA Destiny',
    systemName: 'Beagle Point',
    bodyName: 'Body 2',
    region: 'The Abyss',
    coords: { x: -1111.56, y: -134.22, z: 65269.75 },
    ownerCmdr: 'CMDR Qohen Leth',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'The flagship haven of Beagle Point. Guaranteed tritium reserves, zero tariffs, cartographics & genomics open 24/7.',
  },
  {
    callsign: 'DSSA Eleanor [Q2Z-38V]',
    name: 'DSSA Eleanor',
    systemName: 'Chroabs VJ-R c18-0',
    bodyName: 'Body 3 A',
    region: 'The Abyss',
    coords: { x: 1420.0, y: -82.0, z: 58430.0 },
    ownerCmdr: 'CMDR Corvus',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES, shipyard: true },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Abyss Mare Somnia crossing lifeline. Full hull repair and SRV restocking bay.',
  },
  {
    callsign: 'DSSA Far Oasis [F0O-00Z]',
    name: 'DSSA Far Oasis',
    systemName: 'Oevasy SG-Y d0',
    bodyName: 'Body B 1',
    region: 'The Abyss',
    coords: { x: -1111.56, y: -134.22, z: 65630.16 },
    ownerCmdr: 'CMDR Semotus',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Extreme northern boundary depot at Semotus Beacon. Maximum range FSD injection recommended.',
  },

  // 2. Formidine Rift
  {
    callsign: 'DSSA Sentry Peace [H4M-39M]',
    name: 'DSSA Sentry Peace',
    systemName: 'Eafots EU-R c4-1',
    bodyName: 'Body 1',
    region: 'Formidine Rift',
    coords: { x: -6848.5, y: -133.8, z: 14201.2 },
    ownerCmdr: 'CMDR Delmonte',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { fuelTariffPercent: 0, armoryTariffPercent: 0, repairTariffPercent: 0, generalTariffPercent: 0 },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Formidine Rift permanent haven near Zurara ghost megaship coordinates.',
  },
  {
    callsign: 'DSSA Heart of Gold [V8K-90L]',
    name: 'DSSA Heart of Gold',
    systemName: 'Syreadiae JX-F c0',
    bodyName: 'Body 4',
    region: 'Formidine Rift',
    coords: { x: -7840.0, y: -95.0, z: 21540.0 },
    ownerCmdr: 'CMDR Arthur Dent',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES, pioneerSupplies: true },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Deep Formidine void station. Vista Genomics bio-ledger and outfitting available.',
  },

  // 3. Galactic Centre & Core
  {
    callsign: 'DSSA Sagittarius Haven [K1T-01A]',
    name: 'DSSA Sagittarius Haven',
    systemName: 'Sagittarius A*',
    bodyName: 'Body 1 A',
    region: 'Galactic Centre',
    coords: { x: 25.2, y: -20.9, z: 25899.9 },
    ownerCmdr: 'CMDR Alithea',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Supermassive Black Hole core waypoint. High-traffic meeting hub for galactic circumnavigators.',
  },
  {
    callsign: 'DSSA Explorer\'s Rest [V3Q-57H]',
    name: 'DSSA Explorer\'s Rest',
    systemName: 'Stuemeae KM-W c1-342',
    bodyName: 'Body 1 B',
    region: 'Galactic Centre',
    coords: { x: 28.5, y: -18.2, z: 25700.0 },
    ownerCmdr: 'CMDR Heavy Johnson',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Core hub adjacent to Explorer\'s Anchorage starport with dedicated repair gantry.',
  },

  // 4. Colonia & Highway Corridor
  {
    callsign: 'DSSA Jaques Horizon [J2H-77X]',
    name: 'DSSA Jaques Horizon',
    systemName: 'Colonia',
    bodyName: 'Body 4',
    region: 'Colonia',
    coords: { x: -9530.5, y: -910.3, z: 19808.1 },
    ownerCmdr: 'CMDR Jaques',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Colonia nebula perimeter support relay. High tritium restock facility.',
  },
  {
    callsign: 'DSSA Dryao Chraei Haven [D4C-99K]',
    name: 'DSSA Dryao Chraei Haven',
    systemName: 'Dryao Chraei GQ-Y c14-4',
    bodyName: 'Body 2',
    region: 'Colonia',
    coords: { x: -6120.0, y: -320.0, z: 15400.0 },
    ownerCmdr: 'CMDR Eisen',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Colonia connection transfer waypoint in neutron-dense star sector.',
  },

  // 5. Kepler\'s Crest & Eastern Rim
  {
    callsign: 'DSSA Kepler\'s Beacon [K9P-12B]',
    name: 'DSSA Kepler\'s Beacon',
    systemName: 'Boeph ZE-A f12',
    bodyName: 'Body 3',
    region: 'Kepler\'s Crest',
    coords: { x: 18450.0, y: 240.0, z: 52100.0 },
    ownerCmdr: 'CMDR Johannes',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Kepler\'s Crest high ceiling observation beacon overlooking the eastern galactic arm.',
  },

  // 6. Hawking\'s Gap
  {
    callsign: 'DSSA Amundsen [A1M-44U]',
    name: 'DSSA Amundsen',
    systemName: 'Lysoosae SO-Z d13-0',
    bodyName: 'Body 1',
    region: 'Hawking\'s Gap',
    coords: { x: 4520.0, y: -180.0, z: 12400.0 },
    ownerCmdr: 'CMDR Roald',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Hawking\'s Gap mystery site staging post with emergency fuel reserves.',
  },

  // 7. Tenebrae
  {
    callsign: 'DSSA Tenebrae Light [T7N-88L]',
    name: 'DSSA Tenebrae Light',
    systemName: 'Byeia Eurk ZP-E c25-0',
    bodyName: 'Body 2',
    region: 'Tenebrae',
    coords: { x: -24500.0, y: 420.0, z: 31000.0 },
    ownerCmdr: 'CMDR Nyx',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Remote outpost in the dense dust lanes of Tenebrae.',
  },

  // 8. The Void
  {
    callsign: 'DSSA Void Walker [V9W-02D]',
    name: 'DSSA Void Walker',
    systemName: 'Phroi Bluae QI-B c13-3',
    bodyName: 'Body 5 A Ring',
    region: 'The Void',
    coords: { x: 16200.0, y: -410.0, z: 61200.0 },
    ownerCmdr: 'CMDR Oberon',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Stationed on the precipice between The Void and the intergalactic darkness.',
  },

  // 9. Perseus Arm
  {
    callsign: 'DSSA Perseus Sentinel [P3S-19A]',
    name: 'DSSA Perseus Sentinel',
    systemName: 'Greeroi PI-B d13-1',
    bodyName: 'Body 2',
    region: 'Perseus Arm',
    coords: { x: -19800.0, y: 150.0, z: 18500.0 },
    ownerCmdr: 'CMDR Perseus',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Perseus spiral arm patrol base. Full biological specimen processing available.',
  },

  // 10. Scutum-Centaurus Arm
  {
    callsign: 'DSSA Scutum Haven [S5H-66C]',
    name: 'DSSA Scutum Haven',
    systemName: 'Blaa Phoe NC-D d12-4',
    bodyName: 'Body 1',
    region: 'Scutum-Centaurus Arm',
    coords: { x: 22400.0, y: -120.0, z: 14200.0 },
    ownerCmdr: 'CMDR Centauri',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Major fuel depot serving explorers traversing toward the southern outer spiral.',
  },

  // 11. Outer Arm
  {
    callsign: 'DSSA Outer Rim Sanctuary [O8R-33S]',
    name: 'DSSA Outer Rim Sanctuary',
    systemName: 'Cho Thuae SF-V d2-1',
    bodyName: 'Body 3',
    region: 'Outer Arm',
    coords: { x: -38200.0, y: 310.0, z: 29400.0 },
    ownerCmdr: 'CMDR Rimrunner',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Extreme western rim sanctuary with emergency hull patch bays.',
  },

  // 12. Empyrean Straits
  {
    callsign: 'DSSA Empyrean Outpost [E2O-91P]',
    name: 'DSSA Empyrean Outpost',
    systemName: 'Byeia Thaa WU-O d6-1',
    bodyName: 'Body 2 A',
    region: 'Empyrean Straits',
    coords: { x: 32100.0, y: -220.0, z: 38400.0 },
    ownerCmdr: 'CMDR Astraea',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Empyrean Straits deep void support carrier.',
  },

  // 13. Achilles\'s Altar
  {
    callsign: 'DSSA Achilles Vigil [A4V-73X]',
    name: 'DSSA Achilles Vigil',
    systemName: 'Praei Hypue YE-R d4-1',
    bodyName: 'Body 1',
    region: 'Achilles\'s Altar',
    coords: { x: 29500.0, y: 80.0, z: 24100.0 },
    ownerCmdr: 'CMDR Patroclus',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Far eastern arm watch station.',
  },

  // 14. Elysian Shore
  {
    callsign: 'DSSA Elysian Gate [E6G-55L]',
    name: 'DSSA Elysian Gate',
    systemName: 'Outotz ST-I d9-6',
    bodyName: 'Body 4',
    region: 'Elysian Shore',
    coords: { x: -12300.0, y: -450.0, z: 6800.0 },
    ownerCmdr: 'CMDR Elysium',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Elysian Shore gateway for explorers leaving the Bubble toward the western rim.',
  },

  // 15. Ryker\'s Hope
  {
    callsign: 'DSSA Ryker\'s Solitude [R1S-82K]',
    name: 'DSSA Ryker\'s Solitude',
    systemName: 'Eol Prou KW-E c12-8',
    bodyName: 'Body 2',
    region: 'Ryker\'s Hope',
    coords: { x: -14200.0, y: 180.0, z: 24600.0 },
    ownerCmdr: 'CMDR Will Riker',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Permanently stationed at the edge of Ryker\'s Hope stellar cloud.',
  },

  // 16. Vulcan Islands
  {
    callsign: 'DSSA Vulcan Anvil [V4A-39M]',
    name: 'DSSA Vulcan Anvil',
    systemName: 'Myriesly ST-Q d5-1',
    bodyName: 'Body 1',
    region: 'Vulcan Islands',
    coords: { x: -1200.0, y: -85.0, z: 32400.0 },
    ownerCmdr: 'CMDR Spock',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'High-gravity volcanic system research hub.',
  },

  // 17. Norma Arm
  {
    callsign: 'DSSA Norma Refuge [N8R-14F]',
    name: 'DSSA Norma Refuge',
    systemName: 'Eoch Flyuae YZ-O d6-2',
    bodyName: 'Body 3',
    region: 'Norma Arm',
    coords: { x: -7800.0, y: -240.0, z: 39100.0 },
    ownerCmdr: 'CMDR Norma',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Norma Arm navigation nexus between Colonia and the Great Annihilator.',
  },

  // 18. Trojan Belt
  {
    callsign: 'DSSA Trojan Reach [T2R-67B]',
    name: 'DSSA Trojan Reach',
    systemName: 'Phrio Hypue GA-C d14-0',
    bodyName: 'Body 2',
    region: 'Trojan Belt',
    coords: { x: 11200.0, y: 340.0, z: 44200.0 },
    ownerCmdr: 'CMDR Hector',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Trojan Belt deep space emergency rest stop.',
  },

  // 19. Newton\'s Vault
  {
    callsign: 'DSSA Newton\'s Cradle [N3C-89V]',
    name: 'DSSA Newton\'s Cradle',
    systemName: 'Badyue AA-A h1',
    bodyName: 'Body 1',
    region: 'Newton\'s Vault',
    coords: { x: 38400.0, y: -140.0, z: 49200.0 },
    ownerCmdr: 'CMDR Isaac',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Extreme eastern periphery station.',
  },

  // 20. Odin\'s Hold
  {
    callsign: 'DSSA Valhalla [V7H-11N]',
    name: 'DSSA Valhalla',
    systemName: 'Phroi Phoe IY-R d4-2',
    bodyName: 'Body 3',
    region: 'Odin\'s Hold',
    coords: { x: 9400.0, y: 210.0, z: 28700.0 },
    ownerCmdr: 'CMDR Valkyrie',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Odin\'s Hold core corridor sanctuary.',
  },

  // 21. Erebus
  {
    callsign: 'DSSA Tartarus [T9T-45R]',
    name: 'DSSA Tartarus',
    systemName: 'Juenae OX-U d2-0',
    bodyName: 'Body 2',
    region: 'Erebus',
    coords: { x: 41200.0, y: -310.0, z: 18300.0 },
    ownerCmdr: 'CMDR Hades',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Distant eastern void crossing beacon.',
  },

  // 22. Xibalba
  {
    callsign: 'DSSA Underworld Gate [U1G-29X]',
    name: 'DSSA Underworld Gate',
    systemName: 'Dryao Aoscs KC-B d1-3',
    bodyName: 'Body 1',
    region: 'Xibalba',
    coords: { x: -28900.0, y: 120.0, z: 48200.0 },
    ownerCmdr: 'CMDR Mayan',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Xibalba dark rift haven with full outfitting services.',
  },

  // 23. Sanguineous Rim
  {
    callsign: 'DSSA Crimson Oasis [C5O-64S]',
    name: 'DSSA Crimson Oasis',
    systemName: 'Outopps VJ-R c4-2',
    bodyName: 'Body 3',
    region: 'Sanguineous Rim',
    coords: { x: -15600.0, y: -320.0, z: -4200.0 },
    ownerCmdr: 'CMDR Sanguine',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Southern rim sanctuary near the Formidine Rift boundary.',
  },

  // 24. Izanami
  {
    callsign: 'DSSA Celestial Mirror [C2M-33I]',
    name: 'DSSA Celestial Mirror',
    systemName: 'Hypoae Phtur YF-M c21-0',
    bodyName: 'Body 4',
    region: 'Izanami',
    coords: { x: 28900.0, y: -110.0, z: 56300.0 },
    ownerCmdr: 'CMDR Amaterasu',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Northeastern boundary haven in Izanami.',
  },

  // 25. Inner Orion Spur / Bubble Perimeter
  {
    callsign: 'DSSA Explorer\'s Haven [E1H-50S]',
    name: 'DSSA Explorer\'s Haven',
    systemName: 'Synuefe BV-P c8-1',
    bodyName: 'Body 2',
    region: 'Inner Orion Spur',
    coords: { x: 850.0, y: -180.0, z: -1450.0 },
    ownerCmdr: 'CMDR Pioneer',
    operationalStatus: 'Operational',
    services: { ...DEFAULT_EXPLORATION_SERVICES },
    tariffs: { ...DEFAULT_TARIFFS },
    discordContact: 'https://discord.gg/ed-dssa',
    notes: 'Guardian space gateway and deep space outfitting testbed.',
  },
];

/**
 * Filter DSSA carriers by query, region, operational status, or services
 */
export function filterDssaCarriers(
  carriers: DssaCarrier[],
  options: DssaFilterOptions
): DssaCarrier[] {
  return carriers.filter((carrier) => {
    // 1. Operational status
    if (options.operationalOnly && carrier.operationalStatus !== 'Operational') {
      return false;
    }

    // 2. Region filter
    if (options.region && options.region !== 'all') {
      if (carrier.region.toLowerCase() !== options.region.toLowerCase()) {
        return false;
      }
    }

    // 3. Search query (matches callsign, name, system, region, or owner)
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toLowerCase();
      const match =
        carrier.name.toLowerCase().includes(q) ||
        carrier.callsign.toLowerCase().includes(q) ||
        carrier.systemName.toLowerCase().includes(q) ||
        carrier.region.toLowerCase().includes(q) ||
        carrier.ownerCmdr.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 4. Required services check
    if (options.requiredServices) {
      for (const [key, required] of Object.entries(options.requiredServices)) {
        if (required) {
          const serviceKey = key as keyof DssaCarrierServices;
          if (!carrier.services[serviceKey]) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

/**
 * Find nearest DSSA carriers sorted by Euclidean 3D distance from reference coordinates.
 */
export function findNearestDssa(
  carriers: DssaCarrier[],
  refCoords: { x: number; y: number; z: number },
  options: DssaFilterOptions = {},
  limit = 20
): DssaCarrier[] {
  const filtered = filterDssaCarriers(carriers, options);

  const mapped = filtered.map((c) => {
    const dx = c.coords.x - refCoords.x;
    const dy = c.coords.y - refCoords.y;
    const dz = c.coords.z - refCoords.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
      ...c,
      distanceLy: dist,
    };
  });

  mapped.sort((a, b) => (a.distanceLy ?? 0) - (b.distanceLy ?? 0));
  return mapped.slice(0, limit);
}
