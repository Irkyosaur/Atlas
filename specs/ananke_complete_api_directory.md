# Atlas - Complete Ananke REST API Encyclopedia & Integration Specification
**Document ID:** `ATLAS-SPEC-ANANKE-FULL`  
**Target:** Atlas WebGPU Client, Route Solvers & Telemetry HUD  
**Backend Origin:** Ananke Rust Galaxy Engine (`127.0.0.1:8000` / `:8000`)  
**Specification Source:** Atlas Ecosystem Document 31 (`31_CONSOLIDATED_API_ENCYCLOPEDIA.md`) & Document 05 (`05_ANANKE_GALAXY_ENGINE.md`)  
**Scope:** Complete, exhaustive inventory of all 72 Ananke endpoints across 10 functional domains.

---

## 1. Primary Architecture & Client Concurrency Standards

Ananke runs an Axum/Tokio async engine backed by a dual-semaphore admission control queue (`1024` light permits, `32` heavy solver slots). 

### Connection Constants for Atlas:
* **Production Gateway:** `http://127.0.0.1:8000`
* **Local Staging Gateway:** `http://127.0.0.1:8005`
* **Caddy / Cloudflare Timeout Safety:** Heavy requests are budget-capped at $80\text{s}$, guaranteeing a response before upstream timeouts.

---

## 2. Exhaustive Ananke Endpoint Directory (72 Endpoints)

### Domain 1: Health, Diagnostics & System Telemetry
1. **`GET /health` / `GET /api/health`**
   * *Description:* Liveness probe returning `{"status":"ok"}`.
2. **`GET /api/status`**
   * *Description:* Operational diagnostics reporting active threads, available semaphores, and memory pool status.
3. **`GET /api/edmc/stats`**
   * *Description:* Ingestion telemetry reporting total ZeroMQ messages processed, dropped packets, and uptime.
4. **`GET /api/bubble-progress`**
   * *Description:* Human bubble exploration and expansion progress metrics.
5. **`GET /api/atlas-progression`**
   * *Description:* Arcadian Stream colonisation highway transit metrics.

---

### Domain 2: Core Astrometrics, Coordinate Lookups & Spatial Viewports
6. **`GET /api/system`**
   * *Parameters:* `name` (e.g. `?name=Sol`) or `id64`.
   * *Description:* Full astronomical record (coordinates `x,y,z`, population, allegiance, government, economies, security, factions, Powerplay state, Thargoid state).
7. **`GET /api/system/estimate`**
   * *Parameters:* `name` (e.g. `?name=Dryooe+Prou+GL-Y+d57`).
   * *Description:* Procgen sector coordinate estimator derived from mass-code boxel math for unvisited systems.
8. **`GET /api/search`**
   * *Parameters:* `q` (e.g. `?q=Eotchorts`).
   * *Description:* Sub-millisecond fuzzy autocomplete and prefix system search.
9. **`POST /api/systems/batch`**
   * *Payload:* `{"names": ["Sol", "Achenar", "Alioth", ...]}`
   * *Description:* High-throughput batch resolver (up to 1,000 systems per call in $<3\text{ms}$).
10. **`GET /api/distance`**
    * *Parameters:* `s1`, `s2` (e.g. `?s1=Sol&s2=Colonia`).
    * *Description:* Euclidean 3D distance calculation ($\sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}$).
11. **`POST /api/distance/matrix`**
    * *Payload:* `{"sources": [...], "destinations": [...]}`
    * *Description:* Computes $N \times M$ Euclidean pairwise distance matrix for route optimization.
12. **`GET/POST /api/cube-search`**
    * *Parameters:* `x`, `y`, `z`, `size` (default `50`).
    * *Description:* Spatial bounding-box query returning all star systems within a cube (1.07–1.42ms P50 latency). Powers WebGPU camera streaming.

---

### Domain 3: Celestial Bodies, Hierarchy & Orbital Physics
13. **`GET /api/system/bodies`**
    * *Parameters:* `systemName` or `id64`.
    * *Description:* Returns complete array of stellar and planetary bodies with mass, radius, surface gravity, surface temperature, atmospheric pressure, volcanism, terraforming state, landable flag, and full Keplerian orbital elements (`semiMajorAxis`, `eccentricity`, `orbitalInclination`, `periapsis`, `ascendingNode`, `meanAnomaly`, `orbitalPeriod`).
14. **`POST /api/bodies/batch`**
    * *Payload:* `{"names": ["Sol", "Colonia"]}`
    * *Description:* Batch planetary and stellar body hierarchy lookup across multiple star systems.
15. **`GET /api/bodies/nearest`**
    * *Parameters:* `x`, `y`, `z`, `sub_type` (e.g. `Earth-like world`), `has_signals=true`.
    * *Description:* Spatial $k$-NN nearest body search for high-value targets.
16. **`GET /api/system/rings`**
    * *Parameters:* `system` (e.g. `?system=Sol`).
    * *Description:* Complete planetary ring and asteroid belt inventory with ring class (Icy, Metallic, Metal-Rich) and resource reserve levels.
17. **`GET /api/astrometry/orbital-alignment`**
    * *Parameters:* `system` (e.g. `?system=Sol`).
    * *Description:* Keplerian binary barycentre and orbital parameter resonance data.
18. **`GET /api/procgen/boxel-survey`**
    * *Parameters:* `sector`, `massCode` (e.g. `?sector=Eotchorts&massCode=H`).
    * *Description:* Stellar Forge mass-code boxel surveyor and procgen star cluster scout.

---

### Domain 4: High-Performance Routing Engines
19. **`POST /api/route`**
    * *Payload:* `{"source": "Sol", "target": "Colonia", "jump_range": 65.5}`
    * *Description:* Standard ship A* star route calculation with single-jump range constraints.
20. **`POST /api/carrier-route`**
    * *Payload:* `{"source": "Sol", "target": "Eotchorts EG-X d1-265", "cargo_mass": 10000}`
    * *Description:* 500 LY Fleet Carrier jump sequence with Tritium fuel burn optimization and 2-hop lookahead.
21. **`POST /api/neutron-route`**
    * *Payload:* `{"source": "Sol", "target": "Sagittarius A*", "range": 72.0}`
    * *Description:* Vulkan GPU A* route solver utilizing $400\%$ FSD supercharging via the neutron star highway.
22. **`GET /api/navigation/multi-modal`**
    * *Parameters:* `source`, `destination` (e.g. `?source=Sol&destination=Colonia`).
    * *Description:* Unified multi-modal routing engine combining standard FSD hops, neutron supercharging, and carrier ferry legs.
23. **`GET /api/carriers/fuel-highway`**
    * *Parameters:* `origin`, `destination`.
    * *Description:* Vector corridor projection for DSSA & carrier fuel depot waypoints.
24. **`GET /api/navigation/fuel-starvation-audit`**
    * *Parameters:* `fuel`, `jump_range` (e.g. `?fuel=16&jump_range=50`).
    * *Description:* Fuel Rats pre-rescue audit detecting non-scoopable star chains and points of no return.
25. **`GET /api/navigation/hazard-warning`**
    * *Parameters:* `system` (e.g. `?system=Sol`).
    * *Description:* White dwarf, neutron star, and close-binary stellar exclusion zone danger assessment.
26. **`GET /api/navigation/supercruise-eta`**
    * *Parameters:* `distanceLs` (e.g. `?distanceLs=500000`).
    * *Description:* Newtonian supercruise travel time, acceleration curve, and deceleration profile calculation.
27. **`GET /api/navigation/slingshot-vectors`**
    * *Parameters:* `targetDistanceLs` (e.g. `?targetDistanceLs=15000`).
    * *Description:* Off-ecliptic gravity well evasion and supercruise slingshot trajectory calculator.

---

### Domain 5: Starports, Facilities & Specialized Contacts
28. **`GET /api/station`**
    * *Parameters:* `name` or `systemName`.
    * *Description:* Detailed starport/outpost facility metadata, landing pad sizes (S/M/L), arrival distance, and services.
29. **`POST /api/stations/batch`**
    * *Payload:* `{"names": ["Sol", "Achenar"]}`
    * *Description:* Batch station and service aggregator across multiple star systems.
30. **`GET /api/nearest-station`**
    * *Parameters:* `x`, `y`, `z`, `hasShipyard`, `hasMarket`.
    * *Description:* Spatial scan locating closest facility matching specified service filters.
31. **`GET /api/stations/interstellar-factors`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest stations with Interstellar Factors contacts to clear bounties/fines.
32. **`GET /api/stations/material-traders`**
    * *Parameters:* `refSystem`, `type` (`raw`, `manufactured`, `encoded`).
    * *Description:* Locates nearest Material Traders filtered by commodity subtype.
33. **`GET /api/stations/tech-brokers`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest Technology Broker stations (Human & Guardian).
34. **`GET /api/stations/black-markets`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest stations with active Black Markets for stolen/salvaged cargo.
35. **`GET /api/discount/shopping`**
    * *Parameters:* `shipType`, `refSystem` (e.g. `?shipType=anaconda&refSystem=Sol`).
    * *Description:* Li Yong-Rui 15% ship purchase and outfitting discount finder.
36. **`GET /api/stations/traffic-hubs`**
    * *Parameters:* `limit` (e.g. `?limit=20`).
    * *Description:* Returns the busiest starports and traffic hubs across the galaxy.
37. **`GET /api/dssa/nearest`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest Deep Space Support Array (DSSA) haven fleet carriers.
38. **`GET /api/carriers/decommission-radar`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=150`).
    * *Description:* Fleet Carriers entering debt liquidation or pending decommission countdown.
39. **`GET /api/security/prisons`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest penal colony and detention center ships.
40. **`GET /api/smuggling/stealth-ports`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50`).
    * *Description:* Low-security outposts and asteroid bases with zero authority patrols for illicit drops.
41. **`GET /api/rescue/station-evacuations`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=150`).
    * *Description:* Starports in Damaged/UnderAttack state requiring emergency passenger evacuations.
42. **`GET /api/logistics/transfer-optimizer`**
    * *Parameters:* `source`, `destination`, `ship_value`.
    * *Description:* Computes exact Frontier ship and module transfer costs and delivery times.

---

### Domain 6: Trade, Markets & Outfitting Finder
43. **`GET /api/trade/nearest-commodity`**
    * *Parameters:* `commodity`, `refSystem`, `mode` (`buy` or `sell`).
    * *Description:* Spatial $k$-NN commodity market trade search for highest sell / lowest buy prices.
44. **`GET /api/outfitting/nearest-module`**
    * *Parameters:* `module`, `refSystem` (e.g. `?module=int_hyperdrive_size6_class5&refSystem=Sol`).
    * *Description:* Spatial $k$-NN station module outfitting search.
45. **`GET /api/shipyard/nearest-ship`**
    * *Parameters:* `ship`, `refSystem` (e.g. `?ship=anaconda&refSystem=Sol`).
    * *Description:* Spatial $k$-NN shipyard hull purchasing search.
46. **`GET /api/trade/rare-commodities`**
    * *Parameters:* `commodity`, `refSystem` (e.g. `?commodity=tea&refSystem=Sol`).
    * *Description:* Rare commodities and 160 LY maximum profit router.
47. **`GET /api/outfitting/bundle-search`**
    * *Parameters:* `modules`, `refSystem`.
    * *Description:* Locates starports simultaneously stocking all requested engineering modules in a single trip.

---

### Domain 7: Exploration, Astrometrics & Exobiology
48. **`GET /api/exobiology/nearest-species`**
    * *Parameters:* `genus`, `refSystem` (e.g. `?genus=$Codex_Ent_Bacterial_Genus_Name;&refSystem=Sol`).
    * *Description:* Spatial $k$-NN exobiology species/genus search for Vista Genomics collection.
49. **`GET /api/codex/discoveries`**
    * *Parameters:* `category`, `refSystem` (e.g. `?category=Biology&refSystem=Sol`).
    * *Description:* Biological, geological, and stellar codex discoveries with first attribution.
50. **`GET /api/exploration/green-systems`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* "Green System" detector for single-system Jumponium FSD Injection restocks.
51. **`GET /api/exploration/unmapped`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* High-value unmapped Earth-like, Water World, and terraformable scout.
52. **`GET /api/materials/raw/nearest`**
    * *Parameters:* `material`, `refSystem` (e.g. `?material=Selenium&refSystem=Sol`).
    * *Description:* Locates nearest landable bodies with high concentrations of raw engineering materials.
53. **`GET /api/materials/hge-predictor`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=40`).
    * *Description:* High Grade Emission (HGE) signal predictor based on faction state, allegiance, and population.
54. **`GET /heatmap` / `GET /api/heatmap.png`**
    * *Description:* Returns live $1024 \times 1024$ RGBA galaxy jump heatmap rendered in the Inferno colormap.

---

### Domain 8: Mining & Resource Prospecting
55. **`GET /api/mining/hotspots`**
    * *Parameters:* `commodity`, `refSystem` (e.g. `?commodity=Platinum&refSystem=Sol`).
    * *Description:* Spatial $k$-NN mining hotspots query (Platinum, Tritium, LTD, Painite) with ring class & reserve level.
56. **`GET /api/mining/core-hotspots`**
    * *Parameters:* `mineral`, `refSystem` (e.g. `?mineral=LowTemperatureDiamond&refSystem=Sol`).
    * *Description:* Pristine rings with verified DSS crackable core signatures (Void Opals, LTDs, Painite).

---

### Domain 9: Military, Anti-Xeno (AX) & BGS Politics
57. **`GET /api/war/thargoid/frontlines`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Maps active Thargoid War conflict zones, Titan sites, and research facilities.
58. **`GET /api/war/titan-graveyards`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=500`).
    * *Description:* Post-war salvage mapping defeated Thargoid Titan wreckage in safe normal space.
59. **`GET /api/war/spire-sabotage`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=500`).
    * *Description:* Planetary Thargoid Spire complexes for on-foot bio-matter contamination and SRV sabotage.
60. **`GET /api/bgs/nearest-state`**
    * *Parameters:* `state`, `refSystem` (e.g. `?state=War&refSystem=Sol`).
    * *Description:* Spatial $k$-NN BGS faction conflict state search (War, Civil War, Boom, Famine).
61. **`GET /api/bgs/faction-radar`**
    * *Parameters:* `faction` (e.g. `?faction=Hutton+Orbital`).
    * *Description:* Squadron minor faction influence monitor and conflict alert tracker.
62. **`GET /api/powerplay/systems`**
    * *Parameters:* `power`, `refSystem` (e.g. `?power=Aisling+Duval&refSystem=Sol`).
    * *Description:* Powerplay 2.0 territory & state monitor (control, exploited, and contested spheres).
63. **`GET /api/combat/carrier-support-cz`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=100`).
    * *Description:* Active Conflict Zones with orbital player Fleet Carriers providing rearm/repair.
64. **`GET /api/combat/massacre-stacking`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Pirate massacre mission stacking optimizer for PvE credit grinding.

---

### Domain 10: Odyssey Ground Bases, Colonisation & Lore
65. **`GET /api/settlements/search`**
    * *Parameters:* `government`, `refSystem` (e.g. `?government=Anarchy&refSystem=Sol`).
    * *Description:* Planetary settlements search filtered by government and facility layout type.
66. **`GET /api/odyssey/power-regulator-heists`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=80`).
    * *Description:* Anarchy planetary settlements with isolated reactor rooms for unpenalized Power Regulator theft.
67. **`GET /api/colonization/prime-candidates`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Virgin/unpopulated star systems evaluated for player squadron colonization claims.
68. **`GET /api/colonization/system-slots`**
    * *Parameters:* `system` (e.g. `?system=Sol`).
    * *Description:* Derives surface and orbital construction slots (mirroring RavenColonial mechanics).
69. **`GET /api/poi/nearest`**
    * *Parameters:* `x`, `y`, `z`, `category` (e.g. `category=guardian_structure`).
    * *Description:* Spatial POI and landmark search (megaships, installations, ancient ruins).
70. **`GET /api/poi/landmarks`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Locates nearest astrometric landmarks, megaships, installations, and POIs.
71. **`GET /api/poi/megaship-heists`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50`).
    * *Description:* Recurring hackable megaships equipped with limpet-siphon cargo bays and data transmitters.
72. **`GET /api/lore/guardian-clusters`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=2000`).
    * *Description:* Guardian ruins, structures, and blueprint farm clusters for tech broker unlocks.
73. **`GET /api/lore/generation-ships`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=2000`).
    * *Description:* Sub-light Generation Ships and audio log pilgrimage locator.
74. **`GET /api/lore/distress-memorials`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50000`).
    * *Description:* In-game memorial beacons, tribute sites, and historic deep space distress beacons.
75. **`GET /api/exploration/graveyard-expeditions`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50000`).
    * *Description:* Deep-space archaeology mapping historic explorer disaster sites and abandoned hulls.

---

### Domain 11: Astrometry Anomalies & Astronomical Wonders
76. **`GET /api/astrometry/extreme-gravity`**
    * *Parameters:* `minGravity`, `refSystem` (e.g. `?minGravity=3.0&refSystem=Sol`).
    * *Description:* High-gravity (>3.0g) or ultra-low-gravity landing challenge search.
77. **`GET /api/astrometry/black-hole-tours`**
    * *Parameters:* `refSystem` (e.g. `?refSystem=Sol`).
    * *Description:* Massive black holes and gravitational lensing tour locator.
78. **`GET /api/astrometry/millisecond-pulsars`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=1000`).
    * *Description:* Relativistic ultra-fast spinning millisecond pulsars (<30s period).
79. **`GET /api/astrometry/canyon-circuits`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50`).
    * *Description:* Ultra-low gravity moons (<0.25G) with deep trenches for canyon stunt racing.
80. **`GET /api/astrometry/stellar-skybox`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=50`).
    * *Description:* Multi-star systems (tri-star, quad-star) with tight orbits creating spectacular sunrises.
81. **`GET /api/astrometry/polar-rings`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=30`).
    * *Description:* Extreme axial tilt (>75°) worlds with vertical polar ring planes cutting across poles.
82. **`GET /api/astrometry/skybox-atmospheres`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=30`).
    * *Description:* Landable worlds with thin exotic gas atmospheres (Neon, Sulphur, Methane) for alien sunsets.
83. **`GET /api/astrometry/shepherd-moons`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=30`).
    * *Description:* Landable moons orbiting tightly around parent gas giants within ring divisions.
84. **`GET /api/astrometry/comet-planets`**
    * *Parameters:* `refSystem`, `radius` (e.g. `?refSystem=Sol&radius=100`).
    * *Description:* Worlds with extreme orbital eccentricity (>0.85) diving between corona and deep space.

---

### Domain 12: Ingestion & Telemetry Inflow
85. **`POST /api/edmc/journal`**
    * *Headers:* `X-EDMC-API-Key`
    * *Description:* Submits a single real-time player journal event directly from the player client.
86. **`POST /api/edmc/batch`**
    * *Headers:* `X-EDMC-API-Key`
    * *Description:* Submits batch journal jumps from EDMC plugin.
