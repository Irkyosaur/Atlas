# Atlas - Phase 06: Live Trade Router & Commodity Engine
**Phase:** 06 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/community_tools_replacement_blueprint.md` (Inara / Spansh Trade parity), `ananke/docs/API_ENCYCLOPEDIA.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 6.1: Real-Time Commodity Market Table & Supply/Demand Analytics
- **Objective:** Build a responsive market explorer displaying live commodity prices, supply/demand volumes, and historical price trends across all inhabited stations.
- **Specific Tasks:**
  1. Ingest real-time market data from Ananke `/api/market/commodities` and `/api/market/stations`.
  2. Implement a high-performance virtualized data table supporting sorting, filtering by commodity category (Metals, Minerals, Technology, Weapons, Narcotics, Medical).
  3. Render supply and demand health bars with visual indicators for high/med/low status and price variance relative to galactic averages.
  4. Display station attributes: landing pad size (Small, Medium, Large), orbital distance from arrival star (Ls), planetary vs orbital, and last-updated age timestamp.
- **Verification Criterion:** Searching for `Tritium` or `Imperial Slaves` instantly returns all stations with active markets, sortable by buy/sell price and landing pad constraints.

---

## Stage 6.2: Single-Hop Best Trade Finder & Landing Pad Filtering
- **Objective:** Calculate the most profitable single-jump trade routes from a starting station or system.
- **Specific Tasks:**
  1. Build Single-Hop Query UI accepting current location, cargo capacity, available budget (credits), and max jump range.
  2. Query Ananke `POST /api/trade/single-hop` with landing pad size constraints (filtering out Outposts if Large ship selected).
  3. Compute net profit per ton and total run profit including planetary gravity landing penalties and orbital travel time estimations.
  4. Include age filtering (e.g., exclude data older than 6 hours or 24 hours to prevent "ghost" high-demand states).
- **Verification Criterion:** Running a query from a core system with a 728-ton Imperial Cutter returns the highest profit/ton commodity run within specified jump range with valid Large pads.

---

## Stage 6.3: Multi-Stop Circular Loop Router & Profit-per-Hour Maximizer
- **Objective:** Plan multi-leg circular trade loops that return the pilot to their origin system while maximizing continuous profit per hour.
- **Specific Tasks:**
  1. Connect to Ananke `POST /api/trade/loop` supporting 2-hop, 3-hop, and 4-hop circular itineraries.
  2. Factor in Supercruise travel time based on station distance ($Ls$) using non-linear acceleration/deceleration formulas: $t \approx A \cdot d^{0.33}$.
  3. Calculate estimated round-trip completion duration and compute true Cr/hour efficiency metric.
  4. Provide step-by-step navigation instructions: Buy [Commodity A] at [Station 1] -> Jump -> Sell at [Station 2] -> Buy [Commodity B] -> Return to [Station 1].
- **Verification Criterion:** Circular loop planner generates a verified 2-station trade route with positive profit on both inbound and outbound legs.

---

## Stage 6.4: Black Market Smuggling Engine & Illicit Goods Navigator
- **Objective:** Identify profitable smuggling opportunities, illegal commodity spreads, and stations with active Black Market contacts.
- **Specific Tasks:**
  1. Cross-reference system jurisdiction and government types (Anarchy vs Corporate/Federation/Empire/Alliance) to determine commodity legality.
  2. Ingest Black Market presence from station services registry via `GET /api/stations/services?service=blackmarket`.
  3. Calculate smuggling profit margins accounting for stolen goods discounts and high illicit black-market demand markups.
  4. Display security level badges (Low, Medium, High, Anarchy) and patrol ship density risk factors to assist stealth runners.
- **Verification Criterion:** Selecting "Smuggling Route" highlights high-profit illegal goods runs into stations equipped with active Black Markets in non-anarchy jurisdictions.
