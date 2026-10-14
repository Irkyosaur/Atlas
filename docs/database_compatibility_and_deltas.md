# Atlas - Database Compatibility, Schema Delta & Index Recommendations
**Objective:** Documenting all required non-breaking schema additions, missing indexes, and virtual tables needed in the in-service database to ensure optimal compatibility with the Atlas WebGPU client.  
**Guiding Rule:** Zero breaking changes to existing tables (`systems`, `bodies`, `stations`). All optimizations use additive indices, supplementary lookup tables, or dedicated web-cache tables.

---

## 1. Missing Indexes for Web UI Latency Optimization

While the `systems_index` R*Tree handles 3D spatial bounding box queries, several frequent web queries will trigger full-table scans across hundreds of millions of records unless the following B-tree indexes are added:

```sql
-- ============================================================================
-- 1. FAST AUTOCOMPLETE & SEARCH INDEXES
-- Prevents full table scan on text searches: /api/search?q=Sol
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_systems_name_nocase 
ON systems(name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_stations_name_nocase 
ON stations(name COLLATE NOCASE);

-- ============================================================================
-- 2. HIERARCHICAL SYSTEM MAP LOOKUP INDEXES
-- Ensures instant sub-millisecond retrieval of all bodies & stations in a system
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bodies_systemId64 
ON bodies(systemId64, semiMajorAxis ASC);

CREATE INDEX IF NOT EXISTS idx_stations_systemId64 
ON stations(systemId64, distanceToArrival ASC);

-- ============================================================================
-- 3. COMMODITY MARKET & TRADE SEARCH INDEXES
-- Accelerates "Best Buy / Best Sell" loops across all stations
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_market_commodity_prices 
ON market_commodities(commodity, sellPrice DESC, buyPrice ASC);

CREATE INDEX IF NOT EXISTS idx_market_station_lookup 
ON market_commodities(stationId, commodity);

-- ============================================================================
-- 4. OUTFITTING & SHIPYARD SEARCH INDEXES
-- Accelerates finding ships and modules near player coordinates
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_outfitting_symbol 
ON station_outfitting(symbol, stationId);

CREATE INDEX IF NOT EXISTS idx_shipyard_ship 
ON shipyard_catalog(shipType, stationId);
```

---

## 2. Additive Schema Enhancements (New Compatibility Tables)

To support modern features (Colonisation Architect mode, Community Nicknames, Shared Routes, and Exobiology Clones) without touching existing table structures, the following dedicated tables should be created:

### 2.1 Colonisation & System Architect Table (`colonisation_system_claims`)
Stores player and squadron colonisation claims, construction depots, and available orbital/surface slots extracted from Odyssey 4.0 runtime events:

```sql
CREATE TABLE IF NOT EXISTS colonisation_system_claims (
    systemId64 INTEGER PRIMARY KEY,
    claimStatus TEXT NOT NULL,         -- 'Claimed', 'BeaconDeployed', 'InitialStation', 'Completed'
    claimingCommander TEXT,
    claimingSquadron TEXT,
    beaconLatitude REAL,
    beaconLongitude REAL,
    totalPlanetSlots INTEGER DEFAULT 0,
    usedPlanetSlots INTEGER DEFAULT 0,
    freeSystemSlots INTEGER DEFAULT 0,
    activeConstructions INTEGER DEFAULT 0,
    demolitionActive INTEGER DEFAULT 0, -- 0 or 1
    demolitionExpiryTimestamp INTEGER,
    last_update INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_colonisation_status 
ON colonisation_system_claims(claimStatus);
```

---

### 2.2 Community Colloquial Nicknames Table (`system_nicknames`)
Commanders frequently search for colloquial names (e.g. *"Amaranth"*, *"Galtea"*, *"Rackham's Peak"*, *"Explorer's Anchorage"*) rather than catalog procedural names (`Eotchorts EG-X d1-265`):

```sql
CREATE TABLE IF NOT EXISTS system_nicknames (
    nickname TEXT PRIMARY KEY COLLATE NOCASE,
    canonicalName TEXT NOT NULL,
    systemId64 INTEGER NOT NULL,
    category TEXT DEFAULT 'Community',  -- 'Colony', 'Expedition', 'Lore', 'Faction'
    notes TEXT,
    FOREIGN KEY(systemId64) REFERENCES systems(id64)
);

CREATE INDEX IF NOT EXISTS idx_nicknames_canonical 
ON system_nicknames(canonicalName);
```

---

### 2.3 Shared Web Routes & Waypoints Table (`shared_routes`)
Allows commanders to share multi-hop Neutron Highway or Fleet Carrier flight plans via shortcodes (e.g. `https://atlas.site/r/bubble-to-colonia`):

```sql
CREATE TABLE IF NOT EXISTS shared_routes (
    routeHash TEXT PRIMARY KEY,        -- 8-character unique alphanumeric shortcode
    title TEXT,
    creatorCommander TEXT,
    sourceSystem TEXT NOT NULL,
    targetSystem TEXT NOT NULL,
    totalDistanceLy REAL NOT NULL,
    totalJumps INTEGER NOT NULL,
    waypointsJson TEXT NOT NULL,       -- JSON array of systems: [{ name, x, y, z, jumpType }]
    createdTimestamp INTEGER NOT NULL,
    viewsCount INTEGER DEFAULT 0
);
```

---

### 2.4 High-Value Discovery Quick-Filter Caches (`high_value_bodies`)
To allow instant filtering on the Galaxy Map for **Earth-Like Worlds (ELW)**, **Terraformable Water Worlds (WW)**, **Ammonia Worlds (AW)**, and **Black Holes** without scanning the multi-gigabyte `bodies` table on every request:

```sql
CREATE TABLE IF NOT EXISTS high_value_bodies (
    systemId64 INTEGER NOT NULL,
    bodyId INTEGER NOT NULL,
    bodyName TEXT NOT NULL,
    category TEXT NOT NULL,             -- 'ELW', 'WW', 'AW', 'BH', 'NS'
    isTerraformable INTEGER DEFAULT 0,  -- 0 or 1
    estimatedScanValue INTEGER,
    distanceToArrival REAL,
    PRIMARY KEY(systemId64, bodyId)
);

CREATE INDEX IF NOT EXISTS idx_high_value_category 
ON high_value_bodies(category, isTerraformable);
```

---

## 3. Data Type & Formatting Conventions for Web Compatibility

To ensure zero parsing overhead on the Web front-end, data returned by API queries from these tables must adhere to these conventions:

1. **64-bit Integers (`id64`):**
   * *Issue:* JavaScript numbers lose precision above $2^{53} - 1$ ($9,007,199,254,740,991$). Elite Dangerous 64-bit `SystemAddress` values (e.g. `10477373803` or large procedural IDs) can exceed this threshold.
   * *Requirement:* System addresses and IDs must be serialized as **Strings** (`"10477373803"`) or `BigInt` when emitted over JSON APIs.
2. **Keplerian Orbital Distances:**
   * In-game `bodies.semiMajorAxis` is stored in meters. The Web client displays distances in Astronomical Units (AU) or Light-Seconds (LS).
   * Conversion Constants:
     * $1\text{ AU} = 149,597,870,700\text{ meters}$
     * $1\text{ LS} = 299,792,458\text{ meters}$
3. **Boolean Columns:**
   * SQLite stores booleans as integer flags (`0` or `1`). API responses should cleanly normalize `landable`, `wasDiscovered`, and `wasMapped` to native JSON booleans (`true` / `false`).

---

## 4. Summary of Proposed Database Additions

| Component | Target In-Service Table | Purpose & Front-End Benefit |
| :--- | :--- | :--- |
| **B-Tree Index** | `systems(name COLLATE NOCASE)` | Instant autocomplete on search bar. |
| **B-Tree Index** | `bodies(systemId64, semiMajorAxis)` | Instant left-to-right orbital hierarchy sorting for System Map. |
| **B-Tree Index** | `stations(systemId64, distanceToArrival)` | Sub-millisecond station loading in System Map. |
| **B-Tree Index** | `market_commodities(commodity, sellPrice)`| Accelerates best trade loop and profit searches. |
| **New Table** | `colonisation_system_claims` | Powers the Odyssey 4.0 System Architect view. |
| **New Table** | `system_nicknames` | Enables searching systems by community lore and colloquial names. |
| **New Table** | `shared_routes` | Powers shareable flight plan URLs and multi-commander routes. |
| **New Table** | `high_value_bodies` | Enables one-click Road to Riches / Exploration map filters. |
