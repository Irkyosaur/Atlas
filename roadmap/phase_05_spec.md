# Atlas - Phase 05: Exploration, Galactic Heatmaps & DSSA
**Phase:** 05 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/community_tools_replacement_blueprint.md` (EDAstro / Canonn parity), `specs/website_features_specification.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 5.1: 1024x1024 Galactic Star Density & Travel Heatmap Overlays
- **Objective:** Render volumetric galactic density heatmaps representing over 200 million explored systems across the Milky Way.
- **Specific Tasks:**
  1. Generate multi-resolution tiled density raster layers (1024x1024, 2048x2048) projecting system coordinates onto the galactic plane ($X/Z$).
  2. Implement customizable color transfer functions: EDAstro legacy color ramp (purple-orange-yellow), thermal density, and unvisited exploration void mode.
  3. Overlay density textures onto WebGPU galaxy canvas using additive blending with zoom-dependent mipmap level switching.
  4. Display live mouse-hover coordinates $(X, Y, Z)$ showing estimated local star density per cubic kiloparsec.
- **Verification Criterion:** Activating the density heatmap renders continuous high-contrast travel corridors (e.g., Bubble-to-Colonia highway, Sagittarius A* corridor) with zero framerate degradation.

---

## Stage 5.2: DSSA Permanent Carrier Network & Deep Space Havens
- **Objective:** Map and monitor all Deep Space Support Array (DSSA) permanent Fleet Carriers and remote logistics hubs.
- **Specific Tasks:**
  1. Ingest DSSA registry data via Ananke `GET /api/carriers/dssa` including system names, carrier callsigns, operational status, and available station services (Refuel, Repair, Armory, Vista Genomics).
  2. Render persistent amber beacon markers in 3D space with dedicated DSSA insignia.
  3. Provide nearest DSSA search: calculate distance from current player coordinates to the closest operational emergency carrier.
  4. Display carrier status card: CMDR owner, active tax rates, shipyard availability, and Discord contact links.
- **Verification Criterion:** Searching for DSSA carriers in `The Abyss` or `Formidine Rift` displays exact locations, services, and distance calculations from reference coordinates.

---

## Stage 5.3: Historic Expedition Path Replay & Cartographic Waypoints
- **Objective:** Reconstruct famous historical exploration expeditions (e.g., Distant Worlds 1 & 2, Beagle Point Pioneers) in interactive 3D.
- **Specific Tasks:**
  1. Author JSON schemas for historical expeditions containing chronologically ordered basecamps, waypoints, dates, and POI descriptions.
  2. Implement 3D animated expedition path line renderer tracing the fleet journey across the galaxy.
  3. Build expedition waypoint slider: step through basecamp waypoints with associated historical logs, screenshots, and CMDR rosters.
  4. Add custom expedition creator: allow users to define, save, and export their own expedition routes with shareable permalinks.
- **Verification Criterion:** Selecting "Distant Worlds 2" draws the complete 3305 route from Pallaeni to Beagle Point, allowing interactive stepping through all 12 waypoints.

---

## Stage 5.4: Canonn Megaship, Generation Ship & POI Audio Codex
- **Objective:** Map Generation Ships, abandoned settlements, Thargoid structures, Guardian ruins, and integrate an interactive in-browser audio player for logs.
- **Specific Tasks:**
  1. Catalog all canonical Points of Interest (POIs) with 3D spatial coordinates, system bodies, and site classifications.
  2. Implement specialized 3D glyph icons for Guardian Sites, Thargoid Surface Sites, Crashed Ships, and Generation Ships.
  3. Build an in-browser audio player with synthesized cassette-tape filters for playing decoded Generation Ship audio logs and distress transmissions.
  4. Provide full transcript view with keyword search for historical lore and mystery clues.
- **Verification Criterion:** Clicking on Generation Ship *Thetis* opens the audio codex modal, displays lore transcript, and plays the audio log with authentic retro-futuristic audio effects.
