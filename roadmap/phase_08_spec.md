# Atlas - Phase 08: Fleet Carrier Operations & Colonisation Hub
**Phase:** 08 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/community_features_gap_analysis.md` (Raven Colonial parity), `docs/player_account_database_architecture.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 8.1: System Map Architect View & Infrastructure Blueprinting
- **Objective:** Provide a planetary architect canvas for planning star system colonisation, outpost placements, and orbital asset deployment.
- **Specific Tasks:**
  1. Build a 2D/3D System Architect canvas rendering all orbital bodies, rings, and orbital slots within a selected system.
  2. Implement drag-and-drop placement of planned assets: Coriolis Starports, Orbis Stations, Planetary Outposts, Bio Domes, and Mining Extractors.
  3. Validate placement rules: orbital stability limits, planetary gravity thresholds, and proximity exclusion zones.
  4. Generate shareable colonisation master plans with persistent permalinks.
- **Verification Criterion:** Opening an unpopulated or developing star system allows positioning planned orbital stations with automatic distance and parent body validation.

---

## Stage 8.2: Colonisation Bill of Materials (BOM) & Hauling Calculator
- **Objective:** Calculate exact construction material requirements and hauling trip counts for building planetary and orbital colonies.
- **Specific Tasks:**
  1. Define asset recipe databases (e.g., Titanium, Steel, Superconductors, Computer Components, Food Cartridges required per construction stage).
  2. Build Bill of Materials (BOM) generator breaking down aggregate commodity quantities, total metric tonnage, and estimated market purchase costs.
  3. Implement Hauling Run calculator: divide total tonnage by player ship cargo capacity (e.g., 784t Type-9 / 728t Cutter) to display exact jump/trip counts.
  4. Integrate nearest supplier finder locating stations with sufficient stock of each construction commodity within operational radius.
- **Verification Criterion:** Specifying a new "Planetary Outpost Tier 1" outputs complete material breakdown, estimates credits required, and maps optimal sourcing stations.

---

## Stage 8.3: Fleet Carrier Tritium Depot & Upkeep Ledger
- **Objective:** Track Fleet Carrier finances, weekly upkeep, service activation costs, and Tritium depot management.
- **Specific Tasks:**
  1. Ingest carrier status from player profile or manual entry: active services (Refuel, Repair, Armory, Shipyard, Outfitting, Vista Genomics, Pioneer Supplies).
  2. Calculate weekly maintenance upkeep: baseline 5,000,000 CR + module fees + jump tax (100,000 CR per jump).
  3. Project Carrier financial runway: compute weeks/months remaining until decommissioning based on current carrier bank balance.
  4. Track Tritium tank balance (up to 1,000t) and cargo hold Tritium reserves with visual fuel gauge and low-fuel alerts.
- **Verification Criterion:** Toggling on "Shipyard" and "Outfitting" updates the projected weekly upkeep cost by the exact Frontier maintenance schedule.

---

## Stage 8.4: Wing Logistics Tracker & Shared Construction Progress
- **Objective:** Coordinate multi-commander hauling operations with real-time shared delivery ledgers and progress bars.
- **Specific Tasks:**
  1. Create Wing Session room supporting multi-user collaboration via WebSockets.
  2. Implement shared delivery checklist: CMDRs claim hauling allocations and log completed commodity deliveries.
  3. Render real-time progress bars showing completion percentage of each required material in the colonisation BOM.
  4. Log delivery audit history: timestamp, CMDR name, tonnage delivered, and remaining shortfall.
- **Verification Criterion:** When CMDR A marks 750 tons of Titanium delivered, CMDR B's screen immediately updates the remaining deficit without page refresh.
