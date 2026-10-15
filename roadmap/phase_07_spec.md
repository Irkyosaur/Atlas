# Atlas - Phase 07: In-Browser Shipbuilder & Thermal Simulator
**Phase:** 07 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/community_tools_replacement_blueprint.md` (Coriolis / EDSY parity), `specs/website_features_specification.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 7.1: Comprehensive Ship Chassis Catalog & Hardpoint Schematics
- **Objective:** Catalog all 39 flyable ship hulls in Elite Dangerous with authentic visual schematics, core internals, optional slots, and hardpoint layouts.
- **Specific Tasks:**
  1. Author ship definitions schema with base stats: Hull Mass, Base Shield, Base Armour, Agility/Pitch/Roll/Yaw rates, Base Speed, and Boost Speed.
  2. Implement interactive SVG top-down ship schematic showing exact hardpoint locations (Small, Medium, Large, Huge) and utility mounts.
  3. Render slot layout grid: Core Internals (Bulkheads, Power Plant, Thrusters, FSD, Life Support, Power Distributor, Sensors, Fuel Tank) and Optional Internals (Sizes 1 through 8, Military Compartments).
  4. Allow instant ship switching with state preservation or baseline stock loadout generation.
- **Verification Criterion:** Selecting an Anaconda correctly displays 8 hardpoints (1H, 3L, 2M, 2S), 8 utility slots, standard core slots, and 12 optional internal slots.

---

## Stage 7.2: Module Engineering Customizer & Experimental Effects
- **Objective:** Support full engineering modifications (Grades 1 through 5) and experimental effects on all modules with real-time stat calculation.
- **Specific Tasks:**
  1. Ingest complete engineering modification database (e.g., Overcharged, Long Range, Dirty Drives, Increased Range FSD, Thermal Conduit).
  2. Implement engineering slider / grade selector (G1 to G5) computing compound multipliers on mass, power draw, integrity, heat generation, and performance.
  3. Support all experimental effects (e.g., Drag Drives, Corrosive Shell, Thermal Spread, Mass Manager).
  4. Display raw material requirements ledger: compute counts of Raw, Encoded, and Manufactured materials needed to engineer the build.
- **Verification Criterion:** Applying G5 Dirty Drives with Drag Drives to 7A Thrusters correctly increases optimal multiplier, mass, and thermal load with matching in-game engineering values.

---

## Stage 7.3: Thermal Dissipation Simulator & Power Priority Management
- **Objective:** Accurately simulate power distributor draw, weapons heat buildup, and ship cooling curves under sustained fire and silent running.
- **Specific Tasks:**
  1. Implement power group manager (Priorities 1 through 5) calculating deployed vs retracted MW consumption against Power Plant output.
  2. Calculate capacitor recharge rates (SYS, ENG, WEP) and compute continuous fire duration until WEP capacitor exhaustion.
  3. Model thermal equilibrium and heat dissipation based on hull resting heat and Power Plant efficiency ($\text{Heat} = \text{Power Draw} \times \text{Efficiency}$).
  4. Simulate weapons firing heat spike curve and estimate time to reaching 100% heat (internal module damage threshold).
- **Verification Criterion:** Simulating 4 Overcharged Incendiary Multi-Cannons on an engineered Federal Corvette accurately demonstrates WEP capacitor drain time and equilibrium heat percentage.

---

## Stage 7.4: Combat TTK Matrix & Jump Range Optimization
- **Objective:** Provide deep analytics on jump ranges (unladen, laden, maximum), effective shield hit points (EHP), and time-to-kill (TTK) projections.
- **Specific Tasks:**
  1. Calculate exact jump range formula: $\text{Jump} = \left(\frac{\text{Fuel}}{\text{Constant}}\right)^{\frac{1}{\text{Power}}} \times \left(\frac{\text{FSD OptMass}}{\text{Ship Mass}}\right)$.
  2. Compute Shield EHP against Kinetic, Thermal, Explosive, and Absolute damage types including shield booster stacking and resistance diminishing returns.
  3. Compute Armour and Module Protection Unit (MRP) penetration curves and hull hardness absorption.
  4. Add build import/export via Coriolis JSON, EDSY SLEF, and Atlas shortcode sharing URLs.
- **Verification Criterion:** Importing a Coriolis build via JSON correctly parses all modules and engineering grades, producing matching shield EHP and jump range figures.
