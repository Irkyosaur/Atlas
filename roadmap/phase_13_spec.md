# Atlas - Phase 13: Frontier Underworld, Black Markets & Material Traders
**Phase:** 13 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/frontier_services_and_underworld.md`, `ananke/docs/API_ENCYCLOPEDIA.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 13.1: Material Traders Triangulator (Raw, Encoded, Manufactured)
- **Objective:** Locate the closest Material Traders based on material sub-category and calculate multi-tier exchange conversions.
- **Specific Tasks:**
  1. Ingest Material Trader locations from Ananke `GET /api/stations/traders` with categorization: Raw Materials (Geological), Encoded Materials (Data), and Manufactured Materials (Industrial).
  2. Implement Nearest Trader query from current reference system with landing pad size filtering (Medium vs Large).
  3. Build Material Exchange Calculator: calculate exact conversion costs across grades (3:1 intra-grade trade, 6:1 cross-grade trade).
  4. Integrate with player material inventory: automatically highlight which surplus materials can be traded down to acquire missing engineering components.
- **Verification Criterion:** Searching for nearest Manufactured Trader from `Deciat` returns accurate nearby orbital starports with Large landing pads and trade cost breakdowns.

---

## Stage 13.2: Technology Brokers & Experimental Weaponry Unlocks
- **Objective:** Find Human and Guardian Technology Brokers and track requirements for unlocking specialized modules and weapons.
- **Specific Tasks:**
  1. Map Technology Broker stations (Human Tech Brokers vs Guardian Tech Brokers).
  2. Catalog all unlockable tech items: Guardian FSD Booster, Guardian Shield Boosters, Guardian Gauss Cannons, Human Shock Cannons, Corrosion Resistant Cargo Racks, Enzyme Missiles.
  3. Build Technology Unlock Wishlist: compare required materials and commodities against player inventory and highlight deficits.
  4. Display route guidance to Guardian Ruin sites and blueprint fragment obelisk locations needed for tech unlocks.
- **Verification Criterion:** Selecting "Guardian FSD Booster Size 5" displays exact broker locations, lists all required Guardian modules and commodities, and checks player inventory status.

---

## Stage 13.3: Interstellar Factors with Anti-Local Faction Logic
- **Objective:** Locate Interstellar Factors to pay off bounties and fines without getting detained, applying strict faction jurisdiction rules.
- **Specific Tasks:**
  1. Query Ananke `GET /api/stations/services?service=interstellar_factors`.
  2. Implement Anti-Local Faction safety guard: filter out any Interstellar Factor located in a system where the issuing bounty faction has more than 0% local influence (to prevent player arrest and detention ship transport).
  3. Calculate 25% Interstellar Factor service fee surcharge on outstanding bounties and fines.
  4. Display notoriety decay countdown timer (Notoriety drops by 1 point every 2 hours of active in-game flight time).
- **Verification Criterion:** Searching for an Interstellar Factor while carrying a Federation bounty excludes all Federation systems and any independent systems where the claiming faction is present.

---

## Stage 13.4: Bribe Stations & Anarchy Havens Navigator
- **Objective:** Identify Anarchy systems, lawless pirate stations, and safe havens for notorious commanders and smugglers.
- **Specific Tasks:**
  1. Map all Anarchy government systems and stations across the Bubble and Colonia.
  2. Filter by available services: Black Markets, Shipyard, Outfitting, and Re-arm facilities with zero police response.
  3. Display system security ratings, pirate activity reports, and high-value smuggling destinations.
  4. Provide safe route plotting through low-security corridors to avoid Authority interdictions when flying with high notoriety or illicit cargo.
- **Verification Criterion:** Activating "Anarchy Havens" highlights lawless stations with full re-arm and repair capabilities where wanted commanders can dock without risk of scan.
