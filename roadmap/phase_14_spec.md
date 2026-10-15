# Atlas - Phase 14: Anti-Xeno War Room, Titan Tactical & Rescue Logistics
**Phase:** 14 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/website_features_specification.md`, `specs/community_tools_replacement_blueprint.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 14.1: Thargoid War Frontline & Titan Maelstrom Visualizer
- **Objective:** Track the galactic Thargoid War in real time with interactive 3D frontline boundaries, invasion states, and Titan Maelstrom status.
- **Specific Tasks:**
  1. Ingest War API data from Ananke `GET /api/thargoid/war-state` covering Invasion, Infested, Alert, Controlled, and Cleared system states.
  2. Render 3D volumetric caustic cloud bubbles around all Titan Maelstrom hubs (e.g., Taranis, Leigong, Hadad, Oya, Indra, Raijin, Cocijo, Thor).
  3. Display defense progress bars: percentage of defense objectives completed, remaining hours until weekly server reset cycle, and required progress per hour.
  4. Implement system state filtering: show only high-priority defense targets, counter-strike candidate systems, or evacuating starports.
- **Verification Criterion:** 3D galaxy view renders accurate colored threat spheres around all Thargoid Maelstrom locations with live system defense percentages.

---

## Stage 14.2: Titan Tactical Heart Sabotage & Caustic Navigation Guide
- **Objective:** Provide tactical flight plans, thermal vent timing, and caustic resistance guidance for attacking Thargoid Titans.
- **Specific Tasks:**
  1. Author 3D interactive schematic of Thargoid Titan anatomy: Caustic Torus, Asteroid Belt, Thermal Vents (1-8), and Central Vulnerable Heart.
  2. Implement Thermal Vent cycle timer: interactive synchronized metronome tracking heat dissipation windows and heart exposure countdowns.
  3. Provide caustic damage mitigation calculator: estimate caustic sink launcher ammunition requirements and hull melting rates.
  4. Display recommended AX builds and weaponry (Enhanced AX Multi-Cannons, Nanite Torpedo Pylons, Guardian Shard Cannons).
- **Verification Criterion:** Tactical Maelstrom guide displays interactive 3D Titan model with clickable thermal vent sequence guides and weapon convergence recommendations.

---

## Stage 14.3: Spire Site Sabotage Operations & Orthrus Hunter Coordinator
- **Objective:** Coordinate planetary Spire site sabotage operations and Thargoid Orthrus interceptor combat hunting.
- **Specific Tasks:**
  1. Catalog all planetary Spire sites with system, body name, coordinates, and local gravity.
  2. Provide step-by-step sabotage checklist: Contaminated Sabotage, Drive Sabotage, and Biological Extraction tasks.
  3. Map Orthrus Interceptor spawn locations and shutdown field neutralizer timing guides.
  4. Track cumulative Spire sabotage impact on weakening regional Titan defenses.
- **Verification Criterion:** Selecting a Spire system displays exact surface landing coordinates, gravity safety warnings, and live mission objectives.

---

## Stage 14.4: Refugee Evacuation Logistics & Damaged Starport Routing
- **Objective:** Plan and optimize civilian refugee rescue operations from burning, attacked, and invaded starports.
- **Specific Tasks:**
  1. Map all burning/damaged starports with active passenger evacuation missions.
  2. Build Refugee Capacity Planner: calculate passenger cabin configurations (Economy / Business) to maximize passengers evacuated per run.
  3. Identify closest Rescue Megaship destinations with Large landing pads.
  4. Provide heat sink management guide and caustic decontamination flight protocol for high-temperature starport interiors.
- **Verification Criterion:** Evacuation planner generates optimal round-trip flight paths between attacked stations and designated Rescue Megaships.
