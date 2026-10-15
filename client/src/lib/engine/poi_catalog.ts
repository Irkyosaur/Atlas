// Location: atlas/client/src/lib/engine/poi_catalog.ts
// Stage 5.4: Canonical Elite Dangerous Points of Interest (POIs) Catalog
// Curated by Canonn Interstellar Research Group & Pilots Federation Archives

export type PoiCategory =
  | 'generation_ship'
  | 'guardian_structure'
  | 'guardian_ruins'
  | 'thargoid_surface_site'
  | 'thargoid_titan_remnant'
  | 'crashed_ship'
  | 'abandoned_settlement'
  | 'megaship';

export interface AudioLogEntry {
  logNumber: number;
  title: string;
  speaker: string;
  timestampStardate?: string;
  durationSec: number;
  transcript: string;
  cassetteNoiseProfile: 'heavy_static' | 'sub_bass_rumble' | 'radio_squelch' | 'distorted_carrier';
  synthesisPreset: {
    pitchBase: number;
    carrierFreq: number;
    wobbleHz: number;
    distortionGain: number;
    filterCutoffHz: number;
  };
}

export interface PoiRecord {
  id: string;
  name: string;
  category: PoiCategory;
  categoryLabel: string;
  systemName: string;
  coords: { x: number; y: number; z: number };
  body: string;
  planetaryCoords?: { lat: number; lon: number };
  discoveredDate: string;
  discoveredBy: string;
  loreOverview: string;
  threatLevel: 'None' | 'Low' | 'Moderate' | 'Extreme' | 'Unknown';
  audioLogs?: AudioLogEntry[];
  hasAudioCodex: boolean;
  canonnThreatCode?: string;
}

export const CANONICAL_POI_CATALOG: PoiRecord[] = [
  // 1. GENERATION SHIPS
  {
    id: 'gen-thetis',
    name: 'Generation Ship Thetis',
    category: 'generation_ship',
    categoryLabel: 'Generation Ship',
    systemName: 'Nefertem',
    coords: { x: 57.5, y: -29.7, z: -35.2 },
    body: 'Nefertem 6 a',
    planetaryCoords: undefined,
    discoveredDate: '3303-05-02',
    discoveredBy: 'CMDR Josh Hawkins',
    threatLevel: 'Extreme',
    loreOverview:
      'Launched from Earth in the 22nd century. Arriving in the Nefertem system, the crew discovered a mysterious broadcast from an unexplored planetoid. The transmission contained a hypnotic, psychotic acoustic signal that drove the entire population of thousands into murderous frenzy within 15 Earth hours.',
    canonnThreatCode: 'BIO-PSYCHO-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Log 1: Arrival & Unidentified Signal',
        speaker: 'Captain Jennifer Powell',
        timestampStardate: '2283-04-12',
        durationSec: 18,
        transcript:
          'Ship log, Captain Powell recording. We dropped out of sub-light into the Nefertem system 14 hours ago. All telemetry looks nominal, but comms is picking up a strange background frequency. It resembles whispered human speech mixed with synthetic harmonic static. The science deck is attempting to filter the carrier wave.',
        cassetteNoiseProfile: 'distorted_carrier',
        synthesisPreset: {
          pitchBase: 130,
          carrierFreq: 440,
          wobbleHz: 0.8,
          distortionGain: 12,
          filterCutoffHz: 1200,
        },
      },
      {
        logNumber: 2,
        title: 'Log 2: Psychological Breakdown',
        speaker: 'Chief Medical Officer Vance',
        timestampStardate: '2283-04-13',
        durationSec: 21,
        transcript:
          'Medical emergency declared on Decks 4 through 9. Crew members are reporting intense intracranial pressure, tinnitus, and auditory hallucinations. Some claim the walls are vibrating with ancient voices. Sedatives have zero efficacy. They are clawing at their ears... God help us.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 175,
          carrierFreq: 520,
          wobbleHz: 1.5,
          distortionGain: 25,
          filterCutoffHz: 950,
        },
      },
      {
        logNumber: 3,
        title: 'Log 3: The Murders',
        speaker: 'Security Chief Adams',
        timestampStardate: '2283-04-13',
        durationSec: 19,
        transcript:
          'Security lockdown breached! The hydroponics crew went berserk with heavy plasma cutters! They are butchering anyone who tries to turn off the speakers! The signal isn’t coming from comms anymore—it is echoing through the hull plates themselves!',
        cassetteNoiseProfile: 'sub_bass_rumble',
        synthesisPreset: {
          pitchBase: 95,
          carrierFreq: 280,
          wobbleHz: 2.2,
          distortionGain: 35,
          filterCutoffHz: 750,
        },
      },
      {
        logNumber: 4,
        title: 'Log 4: The Final Quarantine',
        speaker: 'Captain Jennifer Powell',
        timestampStardate: '2283-04-14',
        durationSec: 24,
        transcript:
          'I have sealed myself on the bridge. I dumped the atmospheric seals in Habitation Rings A, B, and C. Fifteen thousand people... silence now. But the sound... the voice in the static is talking to me directly. It is telling me to open the airlock. If anyone ever finds this derelict... do NOT listen to the signal.',
        cassetteNoiseProfile: 'radio_squelch',
        synthesisPreset: {
          pitchBase: 110,
          carrierFreq: 330,
          wobbleHz: 3.5,
          distortionGain: 40,
          filterCutoffHz: 600,
        },
      },
    ],
  },
  {
    id: 'gen-hyperion',
    name: 'Generation Ship Hyperion',
    category: 'generation_ship',
    categoryLabel: 'Generation Ship',
    systemName: 'Lalande 4141',
    coords: { x: 31.2, y: 12.8, z: -14.6 },
    body: 'Lalande 4141 3',
    discoveredDate: '3303-05-18',
    discoveredBy: 'CMDR Alexis Ross',
    threatLevel: 'Moderate',
    loreOverview:
      'The Hyperion suffered catastrophic societal breakdown when eugenics protocols and genetic caste rationing ignited a violent rebellion among the low-tier engineering ranks.',
    canonnThreatCode: 'CIV-REBEL-04',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Log 1: Council Mandate 44',
        speaker: 'Director Sterling',
        timestampStardate: '2321-08-04',
        durationSec: 16,
        transcript:
          'All Tier-3 service personnel are instructed to report to decontamination block 7 for mandatory genetic culling. Resource recalculations indicate insufficient caloric reserves to support non-essential lineages until planetary touchdown.',
        cassetteNoiseProfile: 'distorted_carrier',
        synthesisPreset: {
          pitchBase: 140,
          carrierFreq: 380,
          wobbleHz: 0.6,
          distortionGain: 15,
          filterCutoffHz: 1400,
        },
      },
      {
        logNumber: 2,
        title: 'Log 2: Reactor Core Sabotage',
        speaker: 'Lead Technician O’Connor',
        timestampStardate: '2321-08-09',
        durationSec: 20,
        transcript:
          'We warned the Directorate! We will not queue up for their extermination chambers like cattle. We have overridden the coolant flow bypass on Reactor 2. If we cannot have a future in the stars, neither will their chosen aristocracy.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 160,
          carrierFreq: 490,
          wobbleHz: 1.8,
          distortionGain: 28,
          filterCutoffHz: 1050,
        },
      },
    ],
  },
  {
    id: 'gen-odysseus',
    name: 'Generation Ship Odysseus',
    category: 'generation_ship',
    categoryLabel: 'Generation Ship',
    systemName: 'Ross 859',
    coords: { x: 18.4, y: -45.1, z: 22.8 },
    body: 'Ross 859 B 1',
    discoveredDate: '3303-06-11',
    discoveredBy: 'CMDR Clara Oswald',
    threatLevel: 'Extreme',
    loreOverview:
      'The Odysseus encountered a hyper-virulent unknown mutagenic pathogen. The chief medical officer instituted automated neurotoxin venting, euthanizing all 12,000 colonists within minutes.',
    canonnThreatCode: 'BIO-VIRAL-09',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Log 1: Biosafety Level 5 Breach',
        speaker: 'Dr. Noah Vance',
        timestampStardate: '2309-11-20',
        durationSec: 18,
        transcript:
          'The cellular mutation rate exceeds 400% per hour. Tissue liquefaction begins before subjects exhibit elevated body temperature. We have lost containment in quarantine ward B. The automated locks have failed.',
        cassetteNoiseProfile: 'radio_squelch',
        synthesisPreset: {
          pitchBase: 150,
          carrierFreq: 420,
          wobbleHz: 1.2,
          distortionGain: 20,
          filterCutoffHz: 1100,
        },
      },
      {
        logNumber: 2,
        title: 'Log 2: Scramble Order Omega',
        speaker: 'Dr. Noah Vance',
        timestampStardate: '2309-11-21',
        durationSec: 17,
        transcript:
          'It is airborne. It survives industrial radiation scrubbing. There is only one way to ensure this contagion does not seed a living world. Activating neuro-paralytic purge system wide. Forgive me.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 120,
          carrierFreq: 310,
          wobbleHz: 2.0,
          distortionGain: 32,
          filterCutoffHz: 800,
        },
      },
    ],
  },
  {
    id: 'gen-golconda',
    name: 'Generation Ship Golconda',
    category: 'generation_ship',
    categoryLabel: 'Generation Ship',
    systemName: 'Upaniklis',
    coords: { x: -62.8, y: -19.4, z: 5.6 },
    body: 'Upaniklis B 3',
    discoveredDate: '3305-11-04',
    discoveredBy: 'Interstellar Press Agency',
    threatLevel: 'Low',
    loreOverview:
      'One of the only Generation Ships discovered with a thriving, active living civilization intact. Isolated for over a millennium, the Golconda residents chose to maintain their communal traditions before eventual relocation assistance.',
    canonnThreatCode: 'CIV-SURVIVOR-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Log 1: First Contact Protocol',
        speaker: 'Custodian Jonathon Croft',
        timestampStardate: '3305-11-06',
        durationSec: 19,
        transcript:
          'To the vessels holding station off our starboard bow: We are the people of the Golconda. We left Earth ten centuries ago. We require medicines for the outbreak, but we ask that you respect our sovereignty and isolation.',
        cassetteNoiseProfile: 'distorted_carrier',
        synthesisPreset: {
          pitchBase: 135,
          carrierFreq: 460,
          wobbleHz: 0.5,
          distortionGain: 10,
          filterCutoffHz: 1600,
        },
      },
    ],
  },

  // 2. GUARDIAN RUINS & STRUCTURES
  {
    id: 'guard-synuefe-nl-n',
    name: 'Guardian Structure - Synuefe NL-N c23-4',
    category: 'guardian_structure',
    categoryLabel: 'Guardian Structure',
    systemName: 'Synuefe NL-N c23-4',
    coords: { x: 748.2, y: -198.4, z: -890.1 },
    body: 'Synuefe NL-N c23-4 B 3',
    planetaryCoords: { lat: 48.18, lon: -27.76 },
    discoveredDate: '3304-03-01',
    discoveredBy: 'Ram Tah / Canonn Research',
    threatLevel: 'Moderate',
    loreOverview:
      'Active Guardian planetary complex featuring an operational terminal pylons network. Deploying an Ancient Relic at the central altar releases an Ancient Data Core blueprint module for Guardian FSD Booster technology.',
    canonnThreatCode: 'XENO-GRD-STR-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Data Decryption: Weapon/FSD Blueprints',
        speaker: 'Ram Tah Research Memo',
        timestampStardate: '3304-03-05',
        durationSec: 22,
        transcript:
          'The mathematical codex embedded in these crystalline pillars corresponds to a hyper-advanced electromagnetic slipstream matrix. The Guardians achieved sub-space manipulation without relying on Witchspace transit.',
        cassetteNoiseProfile: 'sub_bass_rumble',
        synthesisPreset: {
          pitchBase: 190,
          carrierFreq: 640,
          wobbleHz: 1.0,
          distortionGain: 18,
          filterCutoffHz: 1500,
        },
      },
    ],
  },
  {
    id: 'guard-synuefe-eu-u',
    name: 'Guardian Ruins Alpha - Synuefe EU-U b45-4',
    category: 'guardian_ruins',
    categoryLabel: 'Guardian Ruins',
    systemName: 'Synuefe EU-U b45-4',
    coords: { x: 802.1, y: -241.6, z: -940.3 },
    body: 'Synuefe EU-U b45-4 B 3',
    planetaryCoords: { lat: -31.73, lon: -128.92 },
    discoveredDate: '3302-10-27',
    discoveredBy: 'CMDR XDeath',
    threatLevel: 'Low',
    loreOverview:
      'The historic site of the very first Guardian ruins ever discovered by humanity. Ancient obelisks with bioluminescent glyphs yielded the first cultural and biological records of the long-extinct avian/reptilian Guardian civilization.',
    canonnThreatCode: 'XENO-GRD-RUIN-00',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Ram Tah Decryption: The Extinction Event',
        speaker: 'Ram Tah Archaeological Translation',
        timestampStardate: '3303-02-14',
        durationSec: 25,
        transcript:
          'Record 28: The Guardian civil war raged between religious traditionalists and the artificial intelligence construct network. The constructs determined that both factions posed an existential threat to galactic stability, orchestrating an automated extinction pulse.',
        cassetteNoiseProfile: 'distorted_carrier',
        synthesisPreset: {
          pitchBase: 145,
          carrierFreq: 400,
          wobbleHz: 0.9,
          distortionGain: 14,
          filterCutoffHz: 1300,
        },
      },
    ],
  },
  {
    id: 'guard-traikeu-ve-k',
    name: 'Guardian Structure - Traikeu VE-K c11-0',
    category: 'guardian_structure',
    categoryLabel: 'Guardian Structure',
    systemName: 'Traikeu VE-K c11-0',
    coords: { x: -1640.4, y: 124.8, z: -3820.7 },
    body: 'Traikeu VE-K c11-0 2 a',
    planetaryCoords: { lat: 12.35, lon: -89.44 },
    discoveredDate: '3304-09-15',
    discoveredBy: 'Canonn Deep Space Division',
    threatLevel: 'Moderate',
    loreOverview:
      'Isolated Guardian structure located in the distant nebula corridor. Emits high-energy resonant pulses tuned to the Guardian vessel blueprint matrix.',
    canonnThreatCode: 'XENO-GRD-STR-07',
    hasAudioCodex: false,
  },

  // 3. THARGOID SURFACE SITES & TITAN REMNANTS
  {
    id: 'tharg-hip-14909',
    name: 'Thargoid Surface Site - HIP 14909',
    category: 'thargoid_surface_site',
    categoryLabel: 'Thargoid Surface Site',
    systemName: 'HIP 14909',
    coords: { x: -84.2, y: -145.6, z: -340.8 },
    body: 'HIP 14909 2 A',
    planetaryCoords: { lat: -26.44, lon: 27.22 },
    discoveredDate: '3303-06-26',
    discoveredBy: 'CMDR Matthew Minehan',
    threatLevel: 'Extreme',
    loreOverview:
      'Massive organic bio-mechanical mothership remnant spanning kilometers across the surface. Entering the central chamber with a Thargoid Sensor and Probe activates an interactive 3D celestial holographic star map depicting the Pleiades and Witch\'s Reach.',
    canonnThreatCode: 'XENO-THRG-STR-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Central Star-Map Acoustic Harmonic',
        speaker: 'Canonn Spectral Acoustics Log',
        timestampStardate: '3303-07-02',
        durationSec: 20,
        transcript:
          'Spectrographic analysis of the Central Device audio resonance reveals low-frequency whale-like acoustic modulations at 32Hz, layered beneath high-frequency bio-chitin clicking. The celestial projections pinpoint Merope and Barnard’s Loop.',
        cassetteNoiseProfile: 'sub_bass_rumble',
        synthesisPreset: {
          pitchBase: 65,
          carrierFreq: 195,
          wobbleHz: 0.4,
          distortionGain: 45,
          filterCutoffHz: 500,
        },
      },
    ],
  },
  {
    id: 'tharg-titan-taranis',
    name: 'Thargoid Titan Taranis (Crash Remnant)',
    category: 'thargoid_titan_remnant',
    categoryLabel: 'Titan Remnant',
    systemName: 'Hyades Sector FB-N b7-6',
    coords: { x: -44.5, y: -62.3, z: -178.9 },
    body: 'Hyades Sector FB-N b7-6 4',
    discoveredDate: '3310-03-02',
    discoveredBy: 'Aegis / Allied Vanguard Wing',
    threatLevel: 'Extreme',
    loreOverview:
      'The first Thargoid Titan mothership destroyed by the human fleet using Nanite Torpedoes. Its massive shattered carapace now rests dormant in a cloud of caustic bile and bio-metallic debris.',
    canonnThreatCode: 'TITAN-DEBRIS-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Titan Taranis Death Roar (Seismic Wave)',
        speaker: 'Aegis Deep Infrasound Array',
        timestampStardate: '3310-03-02',
        durationSec: 24,
        transcript:
          'Sub-space acoustic telemetry captured as Taranis\'s thermal core collapsed. The acoustic shockwave rippled through Witchspace across eight adjacent star systems. Organic cellular death screams verified.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 48,
          carrierFreq: 144,
          wobbleHz: 1.1,
          distortionGain: 50,
          filterCutoffHz: 420,
        },
      },
    ],
  },
  {
    id: 'tharg-titan-leigong',
    name: 'Thargoid Titan Leigong (Crash Remnant)',
    category: 'thargoid_titan_remnant',
    categoryLabel: 'Titan Remnant',
    systemName: 'HIP 8887',
    coords: { x: -12.1, y: -89.4, z: -115.3 },
    body: 'HIP 8887 A 2',
    discoveredDate: '3310-03-30',
    discoveredBy: 'Aegis Battle Fleet',
    threatLevel: 'Extreme',
    loreOverview:
      'The second Titan neutralized in Operation Vanguard. Caustic clouds remain hazardous; deep research drones have retrieved encrypted Thargoid drive components from the core.',
    canonnThreatCode: 'TITAN-DEBRIS-02',
    hasAudioCodex: false,
  },

  // 4. ABANDONED SETTLEMENTS & CRASHED SHIPS
  {
    id: 'crash-orres-anaconda',
    name: 'Bug Killer Crashed Anaconda',
    category: 'crashed_ship',
    categoryLabel: 'Crashed Ship',
    systemName: 'HIP 16613',
    coords: { x: -112.4, y: -190.2, z: -355.6 },
    body: 'HIP 16613 1 a',
    planetaryCoords: { lat: -11.00, lon: -95.67 },
    discoveredDate: '3303-12-22',
    discoveredBy: 'CMDR Jackie Silver',
    threatLevel: 'Moderate',
    loreOverview:
      'An abandoned Anaconda belonging to CMDR John Jameson\'s descendant or cargo hauler. Cargo holds spilled rare raw materials and encoded data transmitters surrounded by Thargoid Sensor fragments.',
    canonnThreatCode: 'CRASH-ANA-BUG',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Black Box Voice Recorder: Final Descent',
        speaker: 'Pilot Harrison Vance',
        timestampStardate: '3303-12-20',
        durationSec: 15,
        transcript:
          'Mayday, mayday! Our drives cut out the instant that flower ship dropped out of supercruise! It didn\'t even shoot us—it just scanned us and our entire electrical bus fried! We are coming in too hot!',
        cassetteNoiseProfile: 'radio_squelch',
        synthesisPreset: {
          pitchBase: 165,
          carrierFreq: 510,
          wobbleHz: 2.8,
          distortionGain: 22,
          filterCutoffHz: 1250,
        },
      },
    ],
  },
  {
    id: 'settle-davs-hope',
    name: 'Dav\'s Hope Abandoned Settlement',
    category: 'abandoned_settlement',
    categoryLabel: 'Abandoned Settlement',
    systemName: 'Hyades Sector DR-V c2-23',
    coords: { x: -84.1, y: -41.3, z: -140.2 },
    body: 'Hyades Sector DR-V c2-23 A 5',
    planetaryCoords: { lat: 44.83, lon: -31.39 },
    discoveredDate: '3303-04-10',
    discoveredBy: 'CMDR Dav Stott / Canonn',
    threatLevel: 'Low',
    loreOverview:
      'A forgotten Core Dynamics pit mining settlement. The miners were abandoned when corporate managers determined the mineral yield was uneconomic, cutting off life support resupply lines.',
    canonnThreatCode: 'ABANDON-SETTLE-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Dav\'s Hope Comms Log 1: The Evacuation Lies',
        speaker: 'Supervisor David Stott',
        timestampStardate: '3111-05-18',
        durationSec: 17,
        transcript:
          'Core Dynamics promised the shuttle was on its way. That was four weeks ago. The atmospheric cyclers are choked with silicate dust. We are down to 10% water rations. They lied to us.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 130,
          carrierFreq: 370,
          wobbleHz: 1.4,
          distortionGain: 19,
          filterCutoffHz: 1000,
        },
      },
    ],
  },
  {
    id: 'crash-jameson-cobra',
    name: 'Commander Jameson\'s Crashed Cobra Mk III',
    category: 'crashed_ship',
    categoryLabel: 'Crashed Ship',
    systemName: 'HIP 12099',
    coords: { x: -75.8, y: -188.3, z: -320.1 },
    body: 'HIP 12099 1 b',
    planetaryCoords: { lat: -54.38, lon: -50.35 },
    discoveredDate: '3303-12-08',
    discoveredBy: 'CMDR Radient_C0re',
    threatLevel: 'Moderate',
    loreOverview:
      'The tragic historical crash site of CMDR John Jameson, hero of the First Thargoid War. After deploying the INRA mycoid virus into the Thargoid mothership, his vessel was sabotaged by INRA to prevent the truth from ever being revealed.',
    canonnThreatCode: 'HIST-JAMESON-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Jameson Flight Recorder Log 1: Mission Complete',
        speaker: 'CMDR John Jameson',
        timestampStardate: '3151-04-02',
        durationSec: 21,
        transcript:
          'Mission accomplished. Delivered the payload directly into the hive vessel superstructure. But something is wrong with my drive computer. All hyperspace telemetry is locked out. INRA... did you rig my thrusters?',
        cassetteNoiseProfile: 'radio_squelch',
        synthesisPreset: {
          pitchBase: 125,
          carrierFreq: 350,
          wobbleHz: 0.9,
          distortionGain: 24,
          filterCutoffHz: 950,
        },
      },
      {
        logNumber: 2,
        title: 'Jameson Flight Recorder Log 2: The Betrayal',
        speaker: 'CMDR John Jameson',
        timestampStardate: '3151-04-02',
        durationSec: 23,
        transcript:
          'They wanted to ensure I never spoke. The mycoid didn’t just disable their drives—it burned through their biological tissue like acid. I killed them all. And now INRA is killing me. If my son ever hears this... I am so sorry.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 115,
          carrierFreq: 310,
          wobbleHz: 1.6,
          distortionGain: 30,
          filterCutoffHz: 820,
        },
      },
    ],
  },
  {
    id: 'mega-zurara',
    name: 'Megaship Zurara (Formidine Rift)',
    category: 'megaship',
    categoryLabel: 'Megaship',
    systemName: 'Syreadiae JX-F c0',
    coords: { x: -6798.2, y: -12.4, z: 9845.6 },
    body: 'Syreadiae JX-F c0 1',
    discoveredDate: '3303-04-18',
    discoveredBy: 'CMDR Rebecca Crane / Children of Raxxla',
    threatLevel: 'Extreme',
    loreOverview:
      'The ghost megaship of the Formidine Rift conspiracy. Commissioned by the shadowy "Club" to survey exodus routes beyond the galaxy, the entire crew was poisoned with neurotoxin once their mission was complete.',
    canonnThreatCode: 'EXP-ZURARA-01',
    hasAudioCodex: true,
    audioLogs: [
      {
        logNumber: 1,
        title: 'Zurara Comms Log: Rebecca\'s Warning',
        speaker: 'Dr. Rebecca Crane',
        timestampStardate: '3270-08-14',
        durationSec: 20,
        transcript:
          'They poisoned the water reservoirs. Everyone is bleeding from their mucous membranes. It’s the Dynasty Project... they used us to pave an escape corridor for the galactic elite. If you find this ship... fear the Formidine Rift.',
        cassetteNoiseProfile: 'heavy_static',
        synthesisPreset: {
          pitchBase: 140,
          carrierFreq: 410,
          wobbleHz: 2.1,
          distortionGain: 34,
          filterCutoffHz: 890,
        },
      },
    ],
  },
];

export interface PoiFilterOptions {
  categories?: PoiCategory[];
  searchQuery?: string;
  threatLevel?: string;
}

export function filterPoiCatalog(pois: PoiRecord[], filter: PoiFilterOptions): PoiRecord[] {
  return pois.filter((poi) => {
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(poi.category)) {
        return false;
      }
    }
    if (filter.threatLevel && filter.threatLevel !== 'ALL') {
      if (poi.threatLevel !== filter.threatLevel) {
        return false;
      }
    }
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase();
      const matchName = poi.name.toLowerCase().includes(q);
      const matchSys = poi.systemName.toLowerCase().includes(q);
      const matchLore = poi.loreOverview.toLowerCase().includes(q);
      const matchTranscript = poi.audioLogs?.some((l) =>
        l.transcript.toLowerCase().includes(q) || l.title.toLowerCase().includes(q)
      );
      if (!matchName && !matchSys && !matchLore && !matchTranscript) {
        return false;
      }
    }
    return true;
  });
}
