# Atlas - Phase 04: Visual Navigation Suite & Ananke Routing
**Phase:** 04 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/website_features_specification.md`, `ananke/docs/API_ENCYCLOPEDIA.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 4.1: A* Star-to-Star Waypoint Pathfinding Client
- **Objective:** Interface with Ananke's A* pathfinding engine to plot multi-jump interstellar routes with custom jump range and ship mass.
- **Specific Tasks:**
  1. Build Route Planner HUD panel with Origin and Destination autocomplete search inputs using `GET /api/system/autocomplete`.
  2. Implement route query builder communicating with `POST /api/route/plot` supporting maximum jump range, cargo mass sliders, and FSD boost settings (Standard, Synthesis, Premium).
  3. Render 3D glowing path ribbons through the 3D galaxy engine connecting each sequential jump waypoint with animated directional pulses.
  4. Display route telemetry ledger: Total Distance (LY), Number of Jumps, Fuel Usage curve, and estimated travel time based on average scoop rate.
- **Verification Criterion:** Plotting a route from `Sol` to `Colonia` with 65 LY jump range returns calculated waypoint list and renders a continuous path across the galactic plane.

---

## Stage 4.2: Neutron Star Highway Router & Jet-Cone Overlays
- **Objective:** Calculate rapid transit routes using the Galactic Neutron Star Highway with 4x supercharged FSD jump mechanics.
- **Specific Tasks:**
  1. Connect route planner to Ananke's neutron routing endpoint `POST /api/route/neutron`.
  2. Render procedural cone shaders on all neutron stars and white dwarfs in the 3D viewport representing relativistic emission jets.
  3. Compute fuel scoop refueling stops along the neutron chain to guarantee the ship never runs out of fuel between non-scoopable neutron stars.
  4. Implement FSD integrity degradation tracker: compute 1% damage per supercharge and insert automated repair stop suggestions at starports with Advanced Maintenance before reaching 80% module health.
- **Verification Criterion:** Generating a neutron route demonstrates 400% jump extension hops with dedicated fuel star waypoints interspersed before depletion thresholds.

---

## Stage 4.3: Fleet Carrier 500 LY Multi-Hop Calculator & Tritium Ledger
- **Objective:** Plan and visualize 500 LY Fleet Carrier expeditions with exact Tritium fuel consumption and cooldown timing.
- **Specific Tasks:**
  1. Build Carrier Route planner calling `POST /api/carrier/route` with origin, destination, onboard cargo mass (0 to 25,000 tonnes), and starting Tritium depot balance.
  2. Calculate Tritium fuel burn per jump using formula: $\text{Fuel} = 5 + \lfloor \frac{\text{Distance} \times (\text{Mass} + 25000)}{200000} \rfloor$.
  3. Render 500 LY spherical bubble radius indicators around carrier jump nodes in 3D.
  4. Generate jump schedule timeline including 15-minute spin-up countdown and 5-minute cooldown locks per jump segment.
- **Verification Criterion:** Route calculation for a fully loaded carrier (25k tonnes) accurately computes jump counts, total Tritium required, and highlights midway Tritium depot mining or market restock systems.

---

## Stage 4.4: In-Game Clipboard Sync & Native HUD Overlay Route Injection
- **Objective:** Enable seamless 1-click clipboard syncing and native in-game route waypoint advancement.
- **Specific Tasks:**
  1. Implement HTML5 Clipboard API 1-click copy button for each waypoint with keyboard shortcut bindings (e.g., `Ctrl+C` auto-advancing to next system).
  2. Integrate with Atlas Native Client Bridge (`ws://127.0.0.1:8999`) to automatically inject the next target system into the Windows clipboard or in-game galaxy map upon completing high-wake jumps.
  3. Provide audio cue confirmation ("Waypoint Copied: [System Name]") using WebAudio procedural synthesized chimes.
  4. Add reverse routing toggle and export to CSV / JSON / EDPath formats.
- **Verification Criterion:** Advancing through a plotted 10-jump route sequentially copies each system name to the OS clipboard and fires native bridge events.
