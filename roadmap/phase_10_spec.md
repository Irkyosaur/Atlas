# Atlas - Phase 10: Odyssey Ground Engineering & Locker Barter
**Phase:** 10 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/complete_peripheral_tools_replacement.md`, `docs/player_account_database_architecture.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 10.1: Odyssey Locker Manager & 1,000-Cap Inventory Audit
- **Objective:** Provide full visibility and auditing for on-foot Odyssey asset lockers (Assets, Goods, and Data) within the 1,000-item inventory cap.
- **Specific Tasks:**
  1. Ingest Odyssey locker inventory from journal events (`ShipLockerMaterials`) or CAPI into `cmdr_materials_odyssey` table in `playerdb.db`.
  2. Implement category tabs: Assets (Chemicals, Circuits, Tech), Goods, and Data (Operational, Financial, Technical).
  3. Render capacity gauge highlighting proximity to the 1,000-item maximum limit.
  4. Provide instant search and quantity sorting across all stored items.
- **Verification Criterion:** Locker dashboard renders full breakdown of all stored micro-resources with exact item counts and total locker capacity percentage.

---

## Stage 10.2: "Safe-to-Sell" Clean List & Junk Asset Triage
- **Objective:** Identify useless Odyssey goods and data that can be safely sold to Bartenders for quick credits without blocking future engineering.
- **Specific Tasks:**
  1. Author cross-reference table mapping all Odyssey items to required engineering blueprints and suit/weapon upgrades.
  2. Implement "Safe-to-Sell" filter flagging items that are never used in any blueprint or unlock requirement (e.g., *Cat Media*, *Locker Keys*, non-critical junk).
  3. Include user wishlist protection: items needed for the player's active engineering wishlist are permanently locked and cannot be flagged as safe to sell.
  4. Calculate total credit windfall if all safe-to-sell assets are liquidated at the nearest Concourse Bartender.
- **Verification Criterion:** Activating the "Safe-to-Sell" toggle isolates only non-essential items, preventing accidental sale of rare engineering materials (e.g., *Manufacturing Instructions* or *Smear Campaign Plans*).

---

## Stage 10.3: Concourse Bartender Barter Calculator
- **Objective:** Calculate asset trade-up and trade-down exchange rates at station concourse Bartenders to acquire missing on-foot materials.
- **Specific Tasks:**
  1. Implement Bartender trading rules: Assets within the same category (Chemicals, Circuits, Tech) can be exchanged at predefined fixed ratios.
  2. Build Barter Optimizer: select a desired target asset (e.g., *Micro Hydraulics*) and compute optimal liquidation of surplus inventory to acquire it.
  3. Display nearest starports with active concourse Bartender contacts.
  4. Highlight non-tradeable assets (Goods and Data cannot be bartered at Bartenders).
- **Verification Criterion:** Selecting 10 missing *Carbon Fibre* items calculates exact surrender counts of surplus *Chemical Inventory* assets according to official bartender trade tables.

---

## Stage 10.4: On-Foot Suit & Weapon Engineering Blueprint Tracker
- **Objective:** Track progress toward engineering on-foot suits (Maverick, Dominator, Artemis) and personal weapons (Karma, Takada, Manticore).
- **Specific Tasks:**
  1. Catalog all Odyssey suit/weapon modifications (e.g., *Night Vision*, *Extra Backpack Capacity*, *Quieter Footsteps*, *Faster Shield Regen*, *Scope*, *Audio Maskinging*).
  2. Implement Grade 1 through Grade 5 upgrade cost matrix for all suits and weapons.
  3. Build interactive Wishlist builder: add desired modifications and display aggregate missing items vs locker inventory.
  4. Display Odyssey Engineer unlock statuses and progress trackers (e.g., Domino Green, Hero Ferrari, Wellington Beck, Kit Fowler).
- **Verification Criterion:** Adding "Artemis G5 Night Vision + Extra Backpack" to wishlist generates visual checklist showing items collected, items in locker, and items still needed.
