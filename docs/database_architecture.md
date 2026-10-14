# Atlas - Database Schema & Data Dictionary (Read-Only Target)
**Document Role:** Core Data Dictionary for the Web Front-End & API Client  
**Database Architecture:** Existing In-Service SQLite 3 WAL Database (`masterdb.db` / `edsm_cube.db`) with 3D R*Tree Spatial Index  
**Access Mode:** Read-Only (`PRAGMA query_only = ON;`)

---

## 1. Overview of the In-Service Galaxy Database

The Atlas web application connects as a high-performance **read-only consumer** to an existing, pre-populated galactic database containing over **201 million star systems**, hundreds of millions of planetary bodies, stations, and specialized navigation graphs.

To ensure non-blocking read performance for web users:
```sql
PRAGMA query_only = ON;          -- Strict read-only mode to prevent write locks
PRAGMA journal_mode = WAL;       -- Reads directly from master file without waiting for active WAL writers
PRAGMA cache_size = -64000;      -- 64 MB local page cache
PRAGMA mmap_size = 34359738368;  -- Direct kernel memory-mapped I/O
```

---

## 2. Spatial Query Engine: 3D Bounding-Cube Search

The database provides a 3D R\*Tree spatial index that Atlas uses to stream stars into the WebGPU camera view:

```sql
-- Virtual R*Tree Table (Already in Service)
-- systems_index (id, minX, maxX, minY, maxY, minZ, maxZ)

SELECT s.id64, s.name, s.x, s.y, s.z, s.primaryStarClass, s.population, s.allegiance, s.security
FROM systems s
JOIN systems_index idx ON s.id64 = idx.id
WHERE idx.minX >= :minX AND idx.maxX <= :maxX
  AND idx.minY >= :minY AND idx.maxY <= :maxY
  AND idx.minZ >= :minZ AND idx.maxZ <= :maxZ
LIMIT :limit;
```

---

## 3. Comprehensive Data Dictionary by Category

### 3.1 Star Systems & Astrometrics

| Table Name | Key Columns & Data Types | Stored Information & Atlas Front-End Usage |
| :--- | :--- | :--- |
| **`systems`** | `id64` (INTEGER PK)<br>`name` (TEXT)<br>`x, y, z` (REAL)<br>`population` (INTEGER)<br>`allegiance` (TEXT)<br>`government` (TEXT)<br>`primaryEconomy` (TEXT)<br>`secondaryEconomy` (TEXT)<br>`security` (TEXT)<br>`bodyCount` (INTEGER)<br>`controllingFaction` (TEXT)<br>`factions` (TEXT JSON)<br>`powerState` (TEXT)<br>`powers` (TEXT)<br>`controllingPower` (TEXT)<br>`thargoidWar` (TEXT)<br>`last_update` (INTEGER) | **Core Galaxy Map Nodes & Dossier:** Exact 3D galactic coordinates, system name, population, superpower allegiance, security status, faction breakdown, Powerplay 2.0 territory control state, and active Thargoid War status. |
| **`systems_index`** | `id` (INTEGER PK)<br>`minX, maxX` (REAL)<br>`minY, maxY` (REAL)<br>`minZ, maxZ` (REAL) | **3D Viewport Spatial Index:** Used by the WebGPU engine to perform sub-millisecond bounding-box frustum queries. |
| **`astrometric_landmarks`**| `name` (TEXT)<br>`x, y, z` (REAL)<br>`description` (TEXT)<br>`type` (TEXT) | **Galactic Navigation Landmarks:** Major points of interest (Sol, Sagittarius A*, Beagle Point, Colonia, Great Annihilator, major nebulae). |
| **`sector_coords`** | `sectorName` (TEXT)<br>`minX, maxX` (REAL)<br>`minY, maxY` (REAL)<br>`minZ, maxZ` (REAL) | **Procedural Sector Boundaries:** 3D bounding cubes defining galactic procedural naming sectors. |

---

### 3.2 Celestial Bodies, Orbits & Exobiology

| Table Name | Key Columns & Data Types | Stored Information & Atlas Front-End Usage |
| :--- | :--- | :--- |
| **`bodies`** | `systemId64` (INTEGER FK)<br>`bodyId` (INTEGER)<br>`name` (TEXT)<br>`type` (TEXT)<br>`subType` (TEXT)<br>`mass` (REAL)<br>`radius` (REAL)<br>`gravity` (REAL)<br>`surfaceTemperature` (REAL)<br>`surfacePressure` (REAL)<br>`semiMajorAxis` (REAL)<br>`eccentricity` (REAL)<br>`orbitalInclination` (REAL)<br>`periapsis` (REAL)<br>`ascendingNode` (REAL)<br>`meanAnomaly` (REAL)<br>`orbitalPeriod` (REAL)<br>`rotationPeriod` (REAL)<br>`axialTilt` (REAL)<br>`atmosphereType` (TEXT)<br>`atmosphereComposition` (TEXT JSON)<br>`volcanism` (TEXT)<br>`terraformState` (TEXT)<br>`landable` (INTEGER 0/1)<br>`wasDiscovered` (INTEGER 0/1)<br>`wasMapped` (INTEGER 0/1)<br>`wasFootfalled` (INTEGER 0/1) | **System Map & 3D Orrery Physics:** Contains complete physical and Keplerian orbital parameters needed to render the 2D hierarchical system tree and calculate real-time 3D planetary positions. |
| **`barycentres`** | `systemId64` (INTEGER FK)<br>`barycentreId` (INTEGER)<br>`name` (TEXT)<br>`semiMajorAxis, eccentricity, orbitalPeriod` (REAL) | **Binary & N-Body Systems:** Center-of-mass orbital coordinates for multi-star systems and binary planetary pairs. |
| **`body_signals`** | `systemId64` (INTEGER FK)<br>`bodyId` (INTEGER)<br>`type` (TEXT)<br>`count` (INTEGER) | **Surface Signals:** Surface signal counts (Biological, Geological, Human, Guardian, Thargoid). |
| **`exobiology_scans`** | `species` (TEXT)<br>`genus` (TEXT)<br>`variant` (TEXT)<br>`value` (INTEGER)<br>`atmosphereRequirements` (TEXT) | **Exobiology Assistant & Value Calculator:** Odyssey flora catalog used by the Exobiology GPS assistant to display species values and clone separation requirements. |
| **`codex_discoveries`** | `systemId64` (INTEGER FK)<br>`bodyId` (INTEGER)<br>`entryName` (TEXT)<br>`category` (TEXT)<br>`commanderName` (TEXT)<br>`timestamp` (INTEGER) | **Codex & First Discoveries:** Historical discovery records and player attribution badges. |

---

### 3.3 Starports, Outposts, Settlements & Markets

| Table Name | Key Columns & Data Types | Stored Information & Atlas Front-End Usage |
| :--- | :--- | :--- |
| **`stations`** | `id` (INTEGER PK)<br>`systemId64` (INTEGER FK)<br>`name` (TEXT)<br>`type` (TEXT)<br>`distanceToArrival` (REAL)<br>`allegiance` (TEXT)<br>`government` (TEXT)<br>`economy` (TEXT)<br>`hasLargePads` (INTEGER 0/1)<br>`hasMediumPads` (INTEGER 0/1)<br>`hasSmallPads` (INTEGER 0/1)<br>`services` (TEXT JSON) | **Station Miniatures & Facilities:** Used to render Coriolis, Orbis, and Outpost icons in the System Map with landing pad sizes and available facilities (Shipyard, Outfitting, Refuel, Repair, Cartographics). |
| **`planetary_settlements`**| `systemId64` (INTEGER FK)<br>`bodyId` (INTEGER)<br>`name` (TEXT)<br>`latitude, longitude` (REAL)<br>`securityLevel` (INTEGER 0-3)<br>`economy` (TEXT)<br>`layout` (TEXT) | **Odyssey Ground Bases:** Surface coordinates, security clearance levels, and base archetype layouts. |
| **`market_commodities`** | `stationId` (INTEGER FK)<br>`commodity` (TEXT)<br>`buyPrice` (INTEGER)<br>`sellPrice` (INTEGER)<br>`supply` (INTEGER)<br>`demand` (INTEGER)<br>`last_update` (INTEGER) | **Trade & Market Search:** Powers the trade loop finder, best commodity sell/buy locators, and colonisation material sourcing. |
| **`station_outfitting`** | `stationId` (INTEGER FK)<br>`symbol` (TEXT)<br>`category` (TEXT)<br>`class` (INTEGER)<br>`rating` (TEXT) | **Outfitting Finder:** Locates starports selling specific modules (e.g. 6A Prismatic Shields, 5A FSD). |
| **`shipyard_catalog`** | `stationId` (INTEGER FK)<br>`shipType` (TEXT) | **Shipyard Finder:** Locates starports selling specific ship hulls (e.g. Python Mk II, Anaconda, Cutter). |
| **`deep_space_carriers`** | `carrierId` (TEXT)<br>`name` (TEXT)<br>`systemId64` (INTEGER FK)<br>`ownerName` (TEXT)<br>`services` (TEXT JSON) | **DSSA Network & Remote Carriers:** Permanent deep-space fleet carriers across all 42 galactic regions. |
| **`carrier_materials`** | `carrierId` (TEXT)<br>`item` (TEXT)<br>`price` (INTEGER)<br>`quantity` (INTEGER)<br>`type` (TEXT) | **Carrier Markets:** Live Fleet Carrier Tritium, commodity, and Odyssey microresource listings. |
| **`station_traffic`** | `stationId` (INTEGER FK)<br>`totalTraffic` (INTEGER)<br>`shipBreakdown` (TEXT JSON) | **Traffic Telemetry:** Hourly ship movement volume per starport. |

---

### 3.4 Navigation Graphs & Specialized Overlays

| Table Name | Key Columns & Data Types | Stored Information & Atlas Front-End Usage |
| :--- | :--- | :--- |
| **`neutron_systems`** | `systemId64` (INTEGER PK)<br>`name` (TEXT)<br>`x, y, z` (REAL)<br>`boostFactor` (REAL) | **Visual Neutron Highway Router:** Pre-indexed graph of neutron stars and white dwarfs powering sub-millisecond A* supercharged route planning. |
| **`primary_neutron_systems`**| `systemId64` (INTEGER PK)<br>`name` (TEXT)<br>`x, y, z` (REAL) | **Galactic Core Highway:** Backbone inter-arm highway systems for ultra-fast multi-thousand LY transits. |
| **`powerplay_systems`** | `systemId64` (INTEGER FK)<br>`powerName` (TEXT)<br>`state` (TEXT)<br>`fortification` (INTEGER)<br>`undermining` (INTEGER) | **Powerplay 2.0 War Room:** Active territory control boundaries, stronghold spheres, and fortification progress. |
| **`bgs_faction_states`** | `systemId64` (INTEGER FK)<br>`factionName` (TEXT)<br>`influence` (REAL)<br>`state` (TEXT)<br>`pendingStates` (TEXT JSON)<br>`recoveringStates` (TEXT JSON) | **Minor Faction & BGS Tracker:** Faction influence percentages, active war/civil war states, and economic health. |
| **`prison_systems`** | `systemId64` (INTEGER PK)<br>`name` (TEXT)<br>`x, y, z` (REAL) | **Detention Facilities:** Penal colony ship locations across the Bubble. |
| **`canonn_points_of_interest`**| `systemId64` (INTEGER FK)<br>`poiName` (TEXT)<br>`type` (TEXT)<br>`latitude, longitude` (REAL) | **Canonn Research POIs:** Thargoid structures, Guardian ruins, generation ships, and biological surface sites. |
| **`meta`** | `schema_version` (TEXT)<br>`total_systems` (INTEGER)<br>`total_bodies` (INTEGER)<br>`last_sync_timestamp` (INTEGER) | **Database Health & Telemetry:** Global system/body counters and database versioning metadata. |

---

## 4. Atlas Web API Query Patterns

Because the database is already fully populated and indexed, Atlas front-end features map directly to straightforward SQL queries:

1. **Camera Frustum Viewport (Galaxy Map):**
   * Queries `systems` joined with `systems_index` using camera bounding-cube coordinates.
2. **System Hierarchical View (System Map):**
   * `SELECT * FROM bodies WHERE systemId64 = :id ORDER BY semiMajorAxis ASC;`
   * `SELECT * FROM stations WHERE systemId64 = :id;`
3. **Neutron Highway Planner:**
   * Runs A* traversal directly across the indexed `neutron_systems` table.
4. **Commodity Trade Loops & Sourcing:**
   * `SELECT * FROM market_commodities mc JOIN stations st ON mc.stationId = st.id JOIN systems sy ON st.systemId64 = sy.id WHERE mc.commodity = :commodity AND mc.demand > 0 ORDER BY mc.sellPrice DESC LIMIT 10;`
5. **Nearest Specialized Contacts (Traders / Brokers / Factors):**
   * Uses spatial R\*Tree cube radius filtering joined with `stations.services` JSON checks.
