// Location: atlas/client/src/lib/engine/expeditions.ts
// Historical Expedition Datasets, Schemas & Route Utilities (Stage 5.3)

export interface ExpeditionWaypoint {
  id: string;
  index: number;
  name: string;
  systemName: string;
  bodyName?: string;
  coords: { x: number; y: number; z: number };
  distanceFromStartLy: number;
  jumpDistanceLy: number;
  arrivalDate: string; // e.g. "3305-01-13" or "13 JAN 3305"
  departureDate: string;
  displayDate: string;
  description: string;
  historicalLog: string;
  notablePois?: string[];
  gravityG?: number;
  cmdrNotes?: string;
}

export interface FleetRosterStats {
  registeredPilots: number;
  shipsArrivedFinal?: number;
  popularShipClasses: { ship: string; count: number }[];
  scientificBeaconsDeployed: number;
  totalLosses?: number;
}

export interface Expedition {
  id: string;
  name: string;
  subtitle: string;
  year: number;
  startDate: string;
  endDate: string;
  organizers: string[];
  fleetRosterCount: number;
  totalDistanceLy: number;
  bannerDescription: string;
  summary: string;
  rosterStats?: FleetRosterStats;
  basecamps: ExpeditionWaypoint[];
  isCustom?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Distant Worlds 2 (3305) - The Largest Fleet Expedition in Galactic History
// ---------------------------------------------------------------------------
export const DISTANT_WORLDS_2_EXPEDITION: Expedition = {
  id: 'dw2-3305',
  name: 'Distant Worlds 2',
  subtitle: 'The Core & Beyond // Construction of Explorer\'s Anchorage',
  year: 3305,
  startDate: '3305-01-13',
  endDate: '3305-04-14',
  organizers: ['CMDR Erimus Kamzel', 'CMDR Dr. Kaii', 'CMDR Corbin Moran', 'Fleet Logistics Wing'],
  fleetRosterCount: 13615,
  totalDistanceLy: 65279,
  bannerDescription: '13,600+ commanders crossed the galactic disc, constructing Explorer\'s Anchorage beside Sagittarius A* and culminating at Beagle Point.',
  summary: 'Departing from Pallaeni on January 13, 3305, Distant Worlds 2 remains the most celebrated scientific initiative in human history. The fleet gathered 13,615 registered explorers across 12 scheduled basecamps. At Basecamp 7, the fleet completed Community Goals that permanently erected Explorer\'s Anchorage, the galactic core\'s primary scientific starport.',
  rosterStats: {
    registeredPilots: 13615,
    shipsArrivedFinal: 3747,
    popularShipClasses: [
      { ship: 'Anaconda', count: 4230 },
      { ship: 'Asp Explorer', count: 3512 },
      { ship: 'Krait Phantom', count: 2145 },
      { ship: 'Diamondback Explorer', count: 1820 },
      { ship: 'Imperial Cutter', count: 412 },
    ],
    scientificBeaconsDeployed: 840,
    totalLosses: 492,
  },
  basecamps: [
    {
      id: 'dw2-bc0',
      index: 0,
      name: 'Basecamp 0 - The Departure',
      systemName: 'Pallaeni',
      bodyName: 'Pallaeni A 1',
      coords: { x: -57.8, y: -29.2, z: 27.5 },
      distanceFromStartLy: 0,
      jumpDistanceLy: 0,
      arrivalDate: '3305-01-13',
      departureDate: '3305-01-13',
      displayDate: '13 JAN 3305',
      description: 'Fleet staging muster point in the civilized core. Thousands of FSD flashes lit up the local space at 20:00 UTC.',
      historicalLog: 'The launch was a spectacle never before witnessed. Hundreds of Anacondas, Phantoms, and Asp Explorers queued at the beacon, their wake plumes painting Pallaeni orbit with blinding ionized trails.',
      notablePois: ['Fleet Departure Beacon', 'Initial Supercruise Convoy'],
      gravityG: 0.88,
      cmdrNotes: 'All wings checked in with Fleet Command. The journey to the far abyss begins.',
    },
    {
      id: 'dw2-bc1',
      index: 1,
      name: 'Basecamp 1 - The View',
      systemName: 'HR 6164',
      bodyName: 'HR 6164 AB 1 a',
      coords: { x: -111.1, y: 147.4, z: 1205.8 },
      distanceFromStartLy: 1215,
      jumpDistanceLy: 1215,
      arrivalDate: '3305-01-19',
      departureDate: '3305-01-20',
      displayDate: '19 JAN 3305',
      description: 'Perched on a tiny 3.30G high-gravity moon overlooking a close binary pair of class O and B blue-white supergiants.',
      historicalLog: 'The high gravity proved treacherous. Thrusters groaned under the 3.3G pull as commanders touched down near the canyon ridge. Numerous hulls lost shields on descent, but the vista over the glowing binary was breathtaking.',
      notablePois: ['3.30G High-G Touchdown Ridge', 'O-B Supergiant Binary Horizon'],
      gravityG: 3.30,
      cmdrNotes: 'Caution: Toggle Flight Assist with caution on descent. Maintain upward vertical thruster pitch.',
    },
    {
      id: 'dw2-bc2',
      index: 2,
      name: 'Basecamp 2 - The Amethyst Star',
      systemName: 'Lagoon Sector FW-W d1-122',
      bodyName: 'Lagoon Sector FW-W d1-122 1',
      coords: { x: -164.7, y: -72.5, z: 4528.2 },
      distanceFromStartLy: 4535,
      jumpDistanceLy: 3320,
      arrivalDate: '3305-01-26',
      departureDate: '3305-01-27',
      displayDate: '26 JAN 3305',
      description: 'Deep within the vibrant purple glowing clouds of the Lagoon Nebula, surrounding an iridescent Herbig Ae/Be protostar.',
      historicalLog: 'The purple ion haze of Lagoon Nebula engulfed the fleet. Exploration wings documented rare silicate crystalline lifeforms inside the planetary rings.',
      notablePois: ['Lagoon Nebula Deep Core', 'Silicate Crystalline Entity Clustered Belts'],
      gravityG: 0.94,
      cmdrNotes: 'SRV canyon races held along the central crater floor beneath the purple sky.',
    },
    {
      id: 'dw2-bc3',
      index: 3,
      name: 'Basecamp 3 - Omega Mining Hub',
      systemName: 'Omega Sector VE-Q b5-15',
      bodyName: 'Omega Sector VE-Q b5-15 4 b',
      coords: { x: 554.2, y: -45.1, z: 5518.7 },
      distanceFromStartLy: 5550,
      jumpDistanceLy: 1220,
      arrivalDate: '3305-02-03',
      departureDate: '3305-02-04',
      displayDate: '03 FEB 3305',
      description: 'Stage 1 of the Galactic Core Starport initiative. The fleet launched an intensive planetary mining operation to build Explorer\'s Anchorage.',
      historicalLog: 'Over 10,000,000 tonnes of structural metals and bauxite were mined and hauled to the orbital megaship during the massive community initiative.',
      notablePois: ['Omega Mining Camp', 'Explorer\'s Anchorage Construction Megaship'],
      gravityG: 1.12,
      cmdrNotes: 'Mining wings operated round the clock in the pristine metallic ring belts.',
    },
    {
      id: 'dw2-bc4',
      index: 4,
      name: 'Basecamp 4 - Eagle\'s Landing',
      systemName: 'Eagle Sector IR-W d1-117',
      bodyName: 'Eagle Sector IR-W d1-117 2 a',
      coords: { x: -108.6, y: -80.9, z: 7015.3 },
      distanceFromStartLy: 7020,
      jumpDistanceLy: 1650,
      arrivalDate: '3305-02-10',
      departureDate: '3305-02-11',
      displayDate: '10 FEB 3305',
      description: 'Bordering the famous Pillars of Creation within the Eagle Nebula. Deep dust lanes frame intense starbirth nurseries.',
      historicalLog: 'Commanders witnessed stellar nurseries illuminating dense gas pillars. The fleet made extensive stellar cartography passes of the regional Herbig stars.',
      notablePois: ['Pillars of Creation Remnant', 'Eagle Sector Remote Outpost'],
      gravityG: 0.65,
      cmdrNotes: 'Exobiology teams reported complex microbial turf formations along thermal vents.',
    },
    {
      id: 'dw2-bc5',
      index: 5,
      name: 'Basecamp 5 - Gondwana Sanctuary',
      systemName: 'Eol Prou GE-Y f105',
      bodyName: 'Eol Prou GE-Y f105 3',
      coords: { x: -384.2, y: -188.4, z: 12423.8 },
      distanceFromStartLy: 12435,
      jumpDistanceLy: 5415,
      arrivalDate: '3305-02-17',
      departureDate: '3305-02-18',
      displayDate: '17 FEB 3305',
      description: 'Halfway point to Sagittarius A*, situated in the vibrant Rohini waystation system nestled between the Sagittarius-Carina arms.',
      historicalLog: 'Rohini provided well-earned dock repairs and hull integrity checks for pilots who had sustained neutron star supercharge damage.',
      notablePois: ['Rohini Planetary Outpost', 'Neutron Superhighway Entry Waypoint'],
      gravityG: 1.05,
      cmdrNotes: 'AFMU refill materials sourced from local planetary geological sites.',
    },
    {
      id: 'dw2-bc6',
      index: 6,
      name: 'Basecamp 6 - Sacagawea Space Port',
      systemName: 'Skaudai CH-B d14-34',
      bodyName: 'Skaudai CH-B d14-34 1 a',
      coords: { x: -89.7, y: -513.3, z: 15302.1 },
      distanceFromStartLy: 15312,
      jumpDistanceLy: 2885,
      arrivalDate: '3305-02-24',
      departureDate: '3305-02-25',
      displayDate: '24 FEB 3305',
      description: 'Deep space haven outpost established on the rim of the Skaudai planetary nebula, named in honor of the famed early Earth explorer.',
      historicalLog: 'A vital sanctuary before the final push toward the supermassive black hole. Fleet mechanics conducted group hull repairs and canopy crystallizations.',
      notablePois: ['Sacagawea Planetary Station', 'Skaudai Emerald Planetary Nebula'],
      gravityG: 0.76,
      cmdrNotes: 'The sky is turning into a dense tapestry of white and gold as the Galactic Core approaches.',
    },
    {
      id: 'dw2-bc7',
      index: 7,
      name: 'Basecamp 7 - Explorer\'s Anchorage // Sag A*',
      systemName: 'Stuemeae FG-Y d7561',
      bodyName: 'Explorer\'s Anchorage Orbit',
      coords: { x: 25.2, y: -20.9, z: 25899.9 },
      distanceFromStartLy: 25900,
      jumpDistanceLy: 10600,
      arrivalDate: '3305-03-03',
      departureDate: '3305-03-05',
      displayDate: '03 MAR 3305',
      description: 'The monumental pinnacle of the expedition: Sagittarius A* and the successful assembly of Explorer\'s Anchorage starport in Stuemeae FG-Y d7561.',
      historicalLog: 'The core was reached. Over 10,000 ships jumped into Sagittarius A*, marveling at the gravitational lensing of the 4-million-solar-mass supermassive black hole. At Stuemeae, the modules hauled across thousands of light years were assembled into humanity\'s grandest outpost.',
      notablePois: ['Sagittarius A* Gravitational Horizon', 'Explorer\'s Anchorage Starport', 'The Centerfold Tourist Beacon'],
      gravityG: 0.00,
      cmdrNotes: 'Explorer\'s Anchorage officially opened its airlocks to deep space science on March 3, 3305.',
    },
    {
      id: 'dw2-bc8',
      index: 8,
      name: 'Basecamp 8 - Goliath\'s Rest',
      systemName: 'Phroi Bluae PD-B b56-11',
      bodyName: 'Phroi Bluae PD-B b56-11 1',
      coords: { x: -198.5, y: -212.1, z: 34105.4 },
      distanceFromStartLy: 34110,
      jumpDistanceLy: 8210,
      arrivalDate: '3305-03-10',
      departureDate: '3305-03-11',
      displayDate: '10 MAR 3305',
      description: 'Entering the far galactic hemisphere beyond the core. High stellar density begins tapering into desolate northern expanse.',
      historicalLog: 'Leaving the comfort of Explorer\'s Anchorage, the fleet pressed into uncharted northern sectors. Vast field of carbon stars and unusual terraformable worlds cataloged.',
      notablePois: ['Goliath Mountain Range', 'Far-Core Carbon Star Cluster'],
      gravityG: 1.45,
      cmdrNotes: 'The southern sky is dominated by the blazing central core, while ahead lies the eternal dark.',
    },
    {
      id: 'dw2-bc9',
      index: 9,
      name: 'Basecamp 9 - The Cerulean Tranquility',
      systemName: 'Juenae OX-U d2-8851',
      bodyName: 'Juenae OX-U d2-8851 3 c',
      coords: { x: -355.1, y: -41.2, z: 43210.5 },
      distanceFromStartLy: 43215,
      jumpDistanceLy: 9110,
      arrivalDate: '3305-03-17',
      departureDate: '3305-03-18',
      displayDate: '17 MAR 3305',
      description: 'A serenely isolated system possessing striking cerulean ringed worlds and extensive silicate geysers.',
      historicalLog: 'Wings performed coordinated low-altitude orbital flight formations over the azure ice rings. Fleet attrition remained remarkably low thanks to the Hull Seals and Fuel Rats.',
      notablePois: ['Cerulean Ring System', 'Silicate Vapor Field'],
      gravityG: 0.82,
      cmdrNotes: 'Hull Seals conducted over 250 repair ops during this leg alone.',
    },
    {
      id: 'dw2-bc10',
      index: 10,
      name: 'Basecamp 10 - The Sub-Zero',
      systemName: 'Scheau Bli NB-O d6-1409',
      bodyName: 'Scheau Bli NB-O d6-1409 1',
      coords: { x: -612.4, y: 158.9, z: 52109.8 },
      distanceFromStartLy: 52115,
      jumpDistanceLy: 8900,
      arrivalDate: '3305-03-24',
      departureDate: '3305-03-25',
      displayDate: '24 MAR 3305',
      description: 'Edge of the Scutum-Centaurus arm. Star density drops precipitously into 50-80 LY jumps between lone spectral stars.',
      historicalLog: 'The stars grew dangerously sparse. Route plotters were forced to compute FSD injections and neutron jet cones to navigate across the fading arm gaps.',
      notablePois: ['Cryo-Volcanism Basin', 'Scutum-Centaurus Arm Terminal Gap'],
      gravityG: 0.54,
      cmdrNotes: 'Pilots stockpiled Polonium, Yttrium, and Germanium for FSD synthesis.',
    },
    {
      id: 'dw2-bc11',
      index: 11,
      name: 'Basecamp 11 - The Sublustris Beacon',
      systemName: 'Byeia Eurk EA-Q c21-1',
      bodyName: 'Byeia Eurk EA-Q c21-1 4',
      coords: { x: -891.2, y: 312.4, z: 59844.2 },
      distanceFromStartLy: 59850,
      jumpDistanceLy: 7740,
      arrivalDate: '3305-03-31',
      departureDate: '3305-04-01',
      displayDate: '31 MAR 3305',
      description: 'Threshold of The Abyss. The final basecamp before crossing the terrifying 3,000 LY void separating the Outer Arm from Beagle Point.',
      historicalLog: 'Standing on the precipice of The Abyss. Ahead lies almost empty void where a single navigational miscalculation could strand a pilot forever.',
      notablePois: ['The Abyss Gateway', 'Sublustris Navigational Beacon'],
      gravityG: 0.91,
      cmdrNotes: 'Pre-flight route calculation mandatory. The Roncevaux crossing protocols engaged.',
    },
    {
      id: 'dw2-bc12',
      index: 12,
      name: 'Basecamp 12 - Darwin\'s Legacy // Beagle Point',
      systemName: 'Ceeckia ZQ-L c24-0',
      bodyName: 'Ceeckia ZQ-L c24-0 2 (Darwin\'s Legacy)',
      coords: { x: -1111.5, y: -134.2, z: 65279.3 },
      distanceFromStartLy: 65279,
      jumpDistanceLy: 5440,
      arrivalDate: '3305-04-14',
      departureDate: '3305-04-14',
      displayDate: '14 APR 3305',
      description: 'The ultimate destination: Beagle Point (Ceeckia ZQ-L c24-0), 65,340 LY from Sol. The true north of the galaxy reached by thousands of commanders.',
      historicalLog: 'On April 14, 3305, thousands of ships massed above Darwin\'s Legacy on planet 2. Flares, SRV jump ramps, and celebratory lasers illuminated the pitch-black sky of the galactic edge. Distant Worlds 2 concluded in triumph.',
      notablePois: ['Darwin\'s Legacy Touchdown Site', 'Beagle Point Tourist Beacon 0134', 'The End of the Galaxy Horizon'],
      gravityG: 0.16,
      cmdrNotes: 'We came, we saw, we built a starport at the core, and we conquered the abyss.',
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Distant Worlds 1 (3302) - The Original Pioneer Swarm
// ---------------------------------------------------------------------------
export const DISTANT_WORLDS_1_EXPEDITION: Expedition = {
  id: 'dw1-3302',
  name: 'Distant Worlds 1',
  subtitle: 'The Original 65,000 LY Trans-Galactic Fleet Expedition',
  year: 3302,
  startDate: '3302-01-14',
  endDate: '3302-04-02',
  organizers: ['CMDR Erimus Kamzel', 'CMDR Dr. Kaii'],
  fleetRosterCount: 1300,
  totalDistanceLy: 65279,
  bannerDescription: 'The maiden multi-commander armada that first charted the mass crossing to Beagle Point before Engineers and Fleet Carriers existed.',
  summary: 'Departing Pallaeni on January 14, 3302, Distant Worlds 1 proved that mass fleet exploration across 65,000 light years was possible with pre-engineering 30-34 LY jump drives. Over 1,300 pilots signed up, establishing 23 basecamps across 3 months.',
  rosterStats: {
    registeredPilots: 1300,
    shipsArrivedFinal: 512,
    popularShipClasses: [
      { ship: 'Asp Explorer', count: 780 },
      { ship: 'Anaconda', count: 245 },
      { ship: 'Diamondback Explorer', count: 180 },
      { ship: 'Hauler', count: 32 },
    ],
    scientificBeaconsDeployed: 120,
    totalLosses: 184,
  },
  basecamps: [
    {
      id: 'dw1-bc0',
      index: 0,
      name: 'Basecamp 0 - Departure Gate',
      systemName: 'Pallaeni',
      coords: { x: -57.8, y: -29.2, z: 27.5 },
      distanceFromStartLy: 0,
      jumpDistanceLy: 0,
      arrivalDate: '3302-01-14',
      departureDate: '3302-01-14',
      displayDate: '14 JAN 3302',
      description: 'The historic starting muster for the first great expedition.',
      historicalLog: 'Over 1,000 pilots filled local orbital stations. This was the dawn of coordinated community exploration.',
      notablePois: ['Pallaeni Muster Point'],
      gravityG: 1.0,
    },
    {
      id: 'dw1-bc1',
      index: 1,
      name: 'Basecamp 1 - Fine Ring Nebula',
      systemName: 'Shapley 1',
      coords: { x: -215.3, y: 84.1, z: 1045.2 },
      distanceFromStartLy: 1070,
      jumpDistanceLy: 1070,
      arrivalDate: '3302-01-17',
      departureDate: '3302-01-18',
      displayDate: '17 JAN 3302',
      description: 'First fleet waypoint in the delicate cyan donut of Shapley 1 planetary nebula.',
      historicalLog: 'Pilots gathered inside the planetary nebula to photograph the Wolf-Rayet star at its heart.',
      gravityG: 0.9,
    },
    {
      id: 'dw1-bc2',
      index: 2,
      name: 'Basecamp 2 - Lagoon Nebula',
      systemName: 'Lagoon Sector FW-W d1-122',
      coords: { x: -160.0, y: -70.0, z: 4500.0 },
      distanceFromStartLy: 4510,
      jumpDistanceLy: 3450,
      arrivalDate: '3302-01-24',
      departureDate: '3302-01-25',
      displayDate: '24 JAN 3302',
      description: 'Deep canyon reconnaissance in the crimson core of Lagoon.',
      historicalLog: 'First multi-SRV canyon race staged on the airless planet surface.',
      gravityG: 0.95,
    },
    {
      id: 'dw1-bc3',
      index: 3,
      name: 'Basecamp 3 - Omega Nebula',
      systemName: 'Omega Sector VE-Q b5-15',
      coords: { x: 550.0, y: -40.0, z: 5500.0 },
      distanceFromStartLy: 5530,
      jumpDistanceLy: 1210,
      arrivalDate: '3302-01-31',
      departureDate: '3302-02-01',
      displayDate: '31 JAN 3302',
      description: 'Bright red emission nebula perched on the Inner Spur.',
      historicalLog: 'The fleet regrouped, testing Jumponium synthesis recipes to assist low-range ships.',
      gravityG: 1.1,
    },
    {
      id: 'dw1-bc4',
      index: 4,
      name: 'Basecamp 4 - Eagle Nebula',
      systemName: 'Eagle Sector IR-W d1-117',
      coords: { x: -100.0, y: -80.0, z: 7000.0 },
      distanceFromStartLy: 7010,
      jumpDistanceLy: 1620,
      arrivalDate: '3302-02-07',
      departureDate: '3302-02-08',
      displayDate: '07 FEB 3302',
      description: 'Pillars of Creation rendezvous.',
      historicalLog: 'Vast formations of Asp Explorers swept across the gas pillars in synchronous formation.',
      gravityG: 0.7,
    },
    {
      id: 'dw1-bc5',
      index: 5,
      name: 'Basecamp 5 - The Hollow Phallus',
      systemName: 'NGC 6357',
      coords: { x: -12.4, y: 32.1, z: 8120.4 },
      distanceFromStartLy: 8130,
      jumpDistanceLy: 1120,
      arrivalDate: '3302-02-14',
      departureDate: '3302-02-15',
      displayDate: '14 FEB 3302',
      description: 'The War and Peace Nebula, harboring massive Pismis star clusters.',
      historicalLog: 'Stunning binary black hole systems cataloged in the dense open cluster.',
      gravityG: 1.2,
    },
    {
      id: 'dw1-bc6',
      index: 6,
      name: 'Basecamp 6 - The Oasis',
      systemName: 'Bleia Erc FL-P b41-1',
      coords: { x: 120.0, y: -15.0, z: 12500.0 },
      distanceFromStartLy: 12510,
      jumpDistanceLy: 4380,
      arrivalDate: '3302-02-21',
      departureDate: '3302-02-22',
      displayDate: '21 FEB 3302',
      description: 'A verdant green water world orbiting a calm F-class star on the edge of the Core.',
      historicalLog: 'Commanders took orbit above the pristine ocean world to rest thrusters.',
      gravityG: 1.0,
    },
    {
      id: 'dw1-bc7',
      index: 7,
      name: 'Basecamp 7 - Sagittarius A*',
      systemName: 'Sagittarius A*',
      coords: { x: 25.2, y: -20.9, z: 25899.9 },
      distanceFromStartLy: 25900,
      jumpDistanceLy: 13390,
      arrivalDate: '3302-02-28',
      departureDate: '3302-03-01',
      displayDate: '28 FEB 3302',
      description: 'The mid-point milestone at the central supermassive black hole.',
      historicalLog: 'Hundreds of ships danced around the gravitational horizon, setting a record for the largest concentration of CMDRs ever in deep space.',
      notablePois: ['Sagittarius A* Singularity'],
      gravityG: 0.0,
    },
    {
      id: 'dw1-bc8',
      index: 8,
      name: 'Basecamp 8 - Polo Harbour',
      systemName: 'Polo Harbour',
      coords: { x: -180.0, y: 45.0, z: 32000.0 },
      distanceFromStartLy: 32010,
      jumpDistanceLy: 6110,
      arrivalDate: '3302-03-06',
      departureDate: '3302-03-07',
      displayDate: '06 MAR 3302',
      description: 'Deep northern uncharted sectors beyond the core.',
      historicalLog: 'The fleet began feeling the fatigue of thousands of manual hyperspace jumps.',
      gravityG: 0.85,
    },
    {
      id: 'dw1-bc9',
      index: 9,
      name: 'Basecamp 9 - Rendezvous Point',
      systemName: 'Juenae',
      coords: { x: -320.0, y: -80.0, z: 41500.0 },
      distanceFromStartLy: 41520,
      jumpDistanceLy: 9510,
      arrivalDate: '3302-03-13',
      departureDate: '3302-03-14',
      displayDate: '13 MAR 3302',
      description: 'The long stretch across the Scutum-Centaurus arm northern arc.',
      historicalLog: 'Extensive exploration data collected by scouting wings.',
      gravityG: 0.95,
    },
    {
      id: 'dw1-bc10',
      index: 10,
      name: 'Basecamp 10 - The Rose Nebula',
      systemName: 'Juenae Rose',
      coords: { x: -510.0, y: 65.0, z: 50200.0 },
      distanceFromStartLy: 50220,
      jumpDistanceLy: 8710,
      arrivalDate: '3302-03-20',
      departureDate: '3302-03-21',
      displayDate: '20 MAR 3302',
      description: 'Stunning pink-violet gas cloud marking the 50,000 LY mark.',
      historicalLog: 'Fleet regrouped to inventory remaining Jumponium materials before The Abyss.',
      gravityG: 0.65,
    },
    {
      id: 'dw1-bc11',
      index: 11,
      name: 'Basecamp 11 - Roncevaux Crossing',
      systemName: 'Qautheia',
      coords: { x: -850.0, y: 120.0, z: 58500.0 },
      distanceFromStartLy: 58520,
      jumpDistanceLy: 8320,
      arrivalDate: '3302-03-27',
      departureDate: '3302-03-28',
      displayDate: '27 MAR 3302',
      description: 'The treacherous bridge across The Abyss discovered by CMDR Kamzel.',
      historicalLog: 'Pilots carefully charted step-by-step jump plots across the sparse inter-arm desert.',
      gravityG: 0.45,
    },
    {
      id: 'dw1-bc12',
      index: 12,
      name: 'Basecamp 12 - Beagle Point',
      systemName: 'Ceeckia ZQ-L c24-0',
      coords: { x: -1111.5, y: -134.2, z: 65279.3 },
      distanceFromStartLy: 65279,
      jumpDistanceLy: 6780,
      arrivalDate: '3302-04-02',
      departureDate: '3302-04-02',
      displayDate: '02 APR 3302',
      description: 'The triumphant finale at Beagle Point on April 2, 3302.',
      historicalLog: '512 commanders landed together at Darwin\'s Legacy, cementing the greatest community exploration triumph in gaming history.',
      notablePois: ['Darwin\'s Legacy Landing Zone'],
      gravityG: 0.16,
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Beagle Point Pioneers (3301) - CMDR Kamzel's Solitary 65,000 LY Odyssey
// ---------------------------------------------------------------------------
export const BEAGLE_POINT_PIONEERS_EXPEDITION: Expedition = {
  id: 'beagle-point-pioneers-3301',
  name: 'Beagle Point Pioneer (3301)',
  subtitle: 'The Solo Crossing of CMDR Erimus Kamzel in "Beagle 2 Landing"',
  year: 3301,
  startDate: '3301-01-18',
  endDate: '3301-03-02',
  organizers: ['CMDR Erimus Kamzel'],
  fleetRosterCount: 1,
  totalDistanceLy: 65279,
  bannerDescription: 'The legendary solo voyage that discovered Beagle Point, naming it after the CMDR\'s Asp Explorer "Beagle 2 Landing".',
  summary: 'In January 3301, weeks after the launch of the modern pilots federation, CMDR Erimus Kamzel departed Sol in a 34 LY jump-range Asp Explorer. Navigating completely blind without modern cartographic tools or neutron boosting, he found the sole viable stepping-stone corridor across The Abyss and reached Ceeckia ZQ-L c24-0.',
  rosterStats: {
    registeredPilots: 1,
    shipsArrivedFinal: 1,
    popularShipClasses: [{ ship: 'Asp Explorer (Beagle 2 Landing)', count: 1 }],
    scientificBeaconsDeployed: 1,
    totalLosses: 0,
  },
  basecamps: [
    {
      id: 'bpp-wp0',
      index: 0,
      name: 'Milestone 0 - Departure from Sol',
      systemName: 'Sol',
      coords: { x: 0.0, y: 0.0, z: 0.0 },
      distanceFromStartLy: 0,
      jumpDistanceLy: 0,
      arrivalDate: '3301-01-18',
      departureDate: '3301-01-18',
      displayDate: '18 JAN 3301',
      description: 'Departure from humanity\'s cradle aboard the Asp Explorer "Beagle 2 Landing".',
      historicalLog: 'Setting out alone into the vast unknown. No one had ever traveled past the core, let alone to the far rim.',
      gravityG: 1.0,
    },
    {
      id: 'bpp-wp1',
      index: 1,
      name: 'Milestone 1 - Cat\'s Paw Nebula',
      systemName: 'Cat\'s Paw Sector',
      coords: { x: -240.0, y: 15.0, z: 5500.0 },
      distanceFromStartLy: 5510,
      jumpDistanceLy: 5510,
      arrivalDate: '3301-01-23',
      departureDate: '3301-01-23',
      displayDate: '23 JAN 3301',
      description: 'First major astronomical landmark on the inward trajectory.',
      historicalLog: 'Passing the red emissions of Cat\'s Paw. FSD drive operating within optimal thermal tolerances.',
      gravityG: 0.8,
    },
    {
      id: 'bpp-wp2',
      index: 2,
      name: 'Milestone 2 - The Great Annihilator',
      systemName: 'Great Annihilator',
      coords: { x: 92.5, y: -12.3, z: 22800.0 },
      distanceFromStartLy: 22800,
      jumpDistanceLy: 17290,
      arrivalDate: '3301-01-31',
      departureDate: '3301-01-31',
      displayDate: '31 JAN 3301',
      description: 'The menacing intermediate black hole system preceding Sagittarius A*.',
      historicalLog: 'First recorded telemetry readings of the Great Annihilator twin black hole gravitational vortex.',
      gravityG: 0.0,
    },
    {
      id: 'bpp-wp3',
      index: 3,
      name: 'Milestone 3 - Sagittarius A*',
      systemName: 'Sagittarius A*',
      coords: { x: 25.2, y: -20.9, z: 25899.9 },
      distanceFromStartLy: 25900,
      jumpDistanceLy: 3100,
      arrivalDate: '3301-02-06',
      departureDate: '3301-02-07',
      displayDate: '06 FEB 3301',
      description: 'The heart of the Milky Way galaxy reached in solitary reverence.',
      historicalLog: 'Silent contemplation at the supermassive black hole. Ahead lay 40,000 light years of complete cartographic void.',
      gravityG: 0.0,
    },
    {
      id: 'bpp-wp4',
      index: 4,
      name: 'Milestone 4 - Outer Arm Crossing',
      systemName: 'Outer Arm North',
      coords: { x: -520.0, y: 90.0, z: 45000.0 },
      distanceFromStartLy: 45020,
      jumpDistanceLy: 19120,
      arrivalDate: '3301-02-15',
      departureDate: '3301-02-15',
      displayDate: '15 FEB 3301',
      description: 'Navigating past 45,000 LY from Sol. The star field thins dramatically.',
      historicalLog: 'Jump range limits forced laborious manual plotting star by star. Every jump required carefully monitoring fuel margins.',
      gravityG: 0.7,
    },
    {
      id: 'bpp-wp5',
      index: 5,
      name: 'Milestone 5 - Roncevaux Crossing // The Abyss',
      systemName: 'The Abyss Edge',
      coords: { x: -840.0, y: 110.0, z: 58000.0 },
      distanceFromStartLy: 58020,
      jumpDistanceLy: 13010,
      arrivalDate: '3301-02-22',
      departureDate: '3301-02-23',
      displayDate: '22 FEB 3301',
      description: 'Finding the sole crossing through The Abyss with a 34 LY drive.',
      historicalLog: 'After days of searching dead ends, a single chain of M and K class stars bridged the chasm. The corridor was named the Roncevaux Crossing.',
      gravityG: 0.5,
    },
    {
      id: 'bpp-wp6',
      index: 6,
      name: 'Milestone 6 - Beagle Point (Arrival)',
      systemName: 'Ceeckia ZQ-L c24-0',
      coords: { x: -1111.5, y: -134.2, z: 65279.3 },
      distanceFromStartLy: 65279,
      jumpDistanceLy: 7270,
      arrivalDate: '3301-03-02',
      departureDate: '3301-03-02',
      displayDate: '02 MAR 3301',
      description: 'Arrival at the furthest reaches: 65,340 LY from Sol. History was made.',
      historicalLog: 'On March 2, 3301, Beagle 2 Landing touched down on planet 2. Erimus named the system Beagle Point. The galaxy had been crossed.',
      notablePois: ['First Human Landing Site'],
      gravityG: 0.16,
    },
  ],
};

export const HISTORICAL_EXPEDITIONS: Expedition[] = [
  DISTANT_WORLDS_2_EXPEDITION,
  DISTANT_WORLDS_1_EXPEDITION,
  BEAGLE_POINT_PIONEERS_EXPEDITION,
];

// ---------------------------------------------------------------------------
// 4. Progress, Trajectory & 4D Interpolation Math
// ---------------------------------------------------------------------------

export interface InterpolatedExpeditionState {
  currentCoords: { x: number; y: number; z: number };
  forwardVector: { x: number; y: number; z: number };
  activeBasecampIndex: number;
  activeBasecamp: ExpeditionWaypoint;
  nextBasecamp: ExpeditionWaypoint | null;
  segmentProgress: number; // 0.0 to 1.0 within current leg
  totalProgress: number; // 0.0 to 1.0 overall
  currentDateStr: string;
  distanceCoveredLy: number;
}

export function calculateExpeditionProgress(
  expedition: Expedition,
  progress0to1: number
): InterpolatedExpeditionState {
  const waypoints = expedition.basecamps;
  if (!waypoints || waypoints.length === 0) {
    return {
      currentCoords: { x: 0, y: 0, z: 0 },
      forwardVector: { x: 0, y: 0, z: 1 },
      activeBasecampIndex: 0,
      activeBasecamp: {
        id: 'fallback',
        index: 0,
        name: 'Sol',
        systemName: 'Sol',
        coords: { x: 0, y: 0, z: 0 },
        distanceFromStartLy: 0,
        jumpDistanceLy: 0,
        arrivalDate: '3305-01-01',
        departureDate: '3305-01-01',
        displayDate: '01 JAN 3305',
        description: '',
        historicalLog: '',
      },
      nextBasecamp: null,
      segmentProgress: 0,
      totalProgress: 0,
      currentDateStr: '3305-01-01',
      distanceCoveredLy: 0,
    };
  }

  const clampedProgress = Math.max(0.0, Math.min(1.0, progress0to1));
  const totalWaypoints = waypoints.length;

  if (totalWaypoints === 1 || clampedProgress <= 0.0) {
    const first = waypoints[0];
    const second = totalWaypoints > 1 ? waypoints[1] : null;
    let forward = { x: 0, y: 0, z: 1 };
    if (second) {
      const dx = second.coords.x - first.coords.x;
      const dy = second.coords.y - first.coords.y;
      const dz = second.coords.z - first.coords.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      forward = { x: dx / len, y: dy / len, z: dz / len };
    }
    return {
      currentCoords: { ...first.coords },
      forwardVector: forward,
      activeBasecampIndex: 0,
      activeBasecamp: first,
      nextBasecamp: second,
      segmentProgress: 0.0,
      totalProgress: 0.0,
      currentDateStr: first.displayDate,
      distanceCoveredLy: 0,
    };
  }

  if (clampedProgress >= 1.0) {
    const last = waypoints[totalWaypoints - 1];
    const prev = waypoints[totalWaypoints - 2];
    let forward = { x: 0, y: 0, z: 1 };
    if (prev) {
      const dx = last.coords.x - prev.coords.x;
      const dy = last.coords.y - prev.coords.y;
      const dz = last.coords.z - prev.coords.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      forward = { x: dx / len, y: dy / len, z: dz / len };
    }
    return {
      currentCoords: { ...last.coords },
      forwardVector: forward,
      activeBasecampIndex: totalWaypoints - 1,
      activeBasecamp: last,
      nextBasecamp: null,
      segmentProgress: 1.0,
      totalProgress: 1.0,
      currentDateStr: last.displayDate,
      distanceCoveredLy: expedition.totalDistanceLy,
    };
  }

  // Calculate cumulative distances along route to interpolate accurately by distance
  const cumulativeDist: number[] = [0];
  for (let i = 1; i < totalWaypoints; i++) {
    const prev = waypoints[i - 1].coords;
    const curr = waypoints[i].coords;
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z);
    cumulativeDist.push(cumulativeDist[i - 1] + dist);
  }
  const totalLength = cumulativeDist[cumulativeDist.length - 1] || 1;
  const targetDist = clampedProgress * totalLength;

  let segIndex = 0;
  while (segIndex < totalWaypoints - 2 && cumulativeDist[segIndex + 1] < targetDist) {
    segIndex++;
  }

  const p0 = waypoints[segIndex];
  const p1 = waypoints[segIndex + 1];
  const segStart = cumulativeDist[segIndex];
  const segEnd = cumulativeDist[segIndex + 1];
  const segLength = segEnd - segStart;
  const segmentProgress = segLength > 0 ? (targetDist - segStart) / segLength : 0;

  // Catmull-Rom or smooth linear interpolation
  const currentCoords = {
    x: p0.coords.x + (p1.coords.x - p0.coords.x) * segmentProgress,
    y: p0.coords.y + (p1.coords.y - p0.coords.y) * segmentProgress,
    z: p0.coords.z + (p1.coords.z - p0.coords.z) * segmentProgress,
  };

  const dx = p1.coords.x - p0.coords.x;
  const dy = p1.coords.y - p0.coords.y;
  const dz = p1.coords.z - p0.coords.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const forwardVector = { x: dx / len, y: dy / len, z: dz / len };

  // Interpolate date display
  const currentDateStr = segmentProgress < 0.5 ? p0.displayDate : p1.displayDate;

  return {
    currentCoords,
    forwardVector,
    activeBasecampIndex: segIndex,
    activeBasecamp: p0,
    nextBasecamp: p1,
    segmentProgress,
    totalProgress: clampedProgress,
    currentDateStr,
    distanceCoveredLy: Math.round(targetDist),
  };
}

// ---------------------------------------------------------------------------
// 5. Custom Expedition Storage & Shareable Permalinks
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'atlas_custom_expeditions_v1';

export function loadCustomExpeditions(): Expedition[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[Expeditions] Failed to load custom expeditions from localStorage:', err);
    return [];
  }
}

export function saveCustomExpedition(expedition: Expedition): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const list = loadCustomExpeditions().filter((e) => e.id !== expedition.id);
    list.unshift({ ...expedition, isCustom: true });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[Expeditions] Failed to save custom expedition:', err);
  }
}

export function deleteCustomExpedition(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const list = loadCustomExpeditions().filter((e) => e.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[Expeditions] Failed to delete custom expedition:', err);
  }
}

export function serializeExpeditionToPermalink(expedition: Expedition): string {
  try {
    const minimal = {
      n: expedition.name,
      s: expedition.subtitle,
      y: expedition.year,
      d: expedition.totalDistanceLy,
      b: expedition.basecamps.map((bc) => ({
        n: bc.name,
        s: bc.systemName,
        x: Math.round(bc.coords.x * 10) / 10,
        y: Math.round(bc.coords.y * 10) / 10,
        z: Math.round(bc.coords.z * 10) / 10,
        d: bc.displayDate,
        g: bc.gravityG,
        l: bc.historicalLog,
      })),
    };
    const jsonStr = JSON.stringify(minimal);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.searchParams.set('expedition', encoded);
    return url.toString();
  } catch (err) {
    console.warn('[Expeditions] Failed to serialize permalink:', err);
    return window.location.href;
  }
}

export function parseExpeditionFromPermalink(urlOrSearchStr: string): Expedition | null {
  try {
    let paramVal: string | null = null;
    if (urlOrSearchStr.includes('expedition=')) {
      const match = urlOrSearchStr.match(/[?&#]expedition=([^&#]+)/);
      if (match) paramVal = match[1];
    } else {
      paramVal = urlOrSearchStr;
    }

    if (!paramVal) return null;
    const decoded = decodeURIComponent(atob(paramVal));
    const minimal = JSON.parse(decoded);

    let totalDist = minimal.d || 0;
    const basecamps: ExpeditionWaypoint[] = (minimal.b || []).map((bc: any, idx: number) => ({
      id: `custom-wp-${idx}`,
      index: idx,
      name: bc.n || `Waypoint ${idx}`,
      systemName: bc.s || 'Sol',
      coords: { x: Number(bc.x) || 0, y: Number(bc.y) || 0, z: Number(bc.z) || 0 },
      distanceFromStartLy: 0,
      jumpDistanceLy: 0,
      arrivalDate: bc.d || '3305-01-01',
      departureDate: bc.d || '3305-01-01',
      displayDate: bc.d || '01 JAN 3305',
      description: `Custom route waypoint: ${bc.s || 'Uncharted'}`,
      historicalLog: bc.l || 'No flight log recorded.',
      gravityG: bc.g || 1.0,
    }));

    if (totalDist === 0 && basecamps.length > 1) {
      let accum = 0;
      for (let i = 1; i < basecamps.length; i++) {
        const p0 = basecamps[i - 1].coords;
        const p1 = basecamps[i].coords;
        const jump = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
        basecamps[i].jumpDistanceLy = Math.round(jump);
        accum += jump;
        basecamps[i].distanceFromStartLy = Math.round(accum);
      }
      totalDist = Math.round(accum);
    }

    return {
      id: `shared-${Date.now()}`,
      name: minimal.n || 'Shared Community Expedition',
      subtitle: minimal.s || 'Imported via permalink',
      year: minimal.y || 3305,
      startDate: basecamps[0]?.displayDate || '3305',
      endDate: basecamps[basecamps.length - 1]?.displayDate || '3305',
      organizers: ['Independent Commander'],
      fleetRosterCount: 1,
      totalDistanceLy: totalDist,
      bannerDescription: 'Custom shared expedition route imported from Commander permalink.',
      summary: 'Imported expedition trajectory with custom waypoints, coordinates, and navigation markers.',
      basecamps,
      isCustom: true,
    };
  } catch (err) {
    console.warn('[Expeditions] Could not parse permalink:', err);
    return null;
  }
}

export function exportExpeditionJson(expedition: Expedition): string {
  return JSON.stringify(expedition, null, 2);
}

export function importExpeditionJson(jsonStr: string): Expedition {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.name || !Array.isArray(parsed.basecamps)) {
    throw new Error('Invalid Expedition JSON format. Missing required fields "name" and "basecamps".');
  }
  return {
    ...parsed,
    id: parsed.id || `custom-${Date.now()}`,
    isCustom: true,
  };
}
