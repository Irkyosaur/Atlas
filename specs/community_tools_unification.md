# Atlas - Community Landscape Analysis & Unification Blueprint
**Benchmark Targets:** EDAstro, Inara, Spansh, Raven Colonial, EDDB (Legacy), EDSM  
**Atlas Vision:** The unified, next-generation, all-in-one cartographic suite for Elite Dangerous.

---

## 1. Competitive Analysis Matrix

| Platform | Core Strength | Major Weaknesses & Limitations | Atlas Modernized Solution |
| :--- | :--- | :--- | :--- |
| **EDAstro (Elite Dangerous Astrometrics)** | Galactic exploration heatmaps, travel routes, POI catalogs, historical expedition tracks. | Static 2D raster maps or prerendered tile videos; heavy load times; no real-time 3D interactive manipulation. | **GPU-Accelerated 3D Heatmap Raymarching:** Real-time 3D exploration density volumes rendered directly inside WebGPU; interactive expedition timeline playback. |
| **Inara.cz** | Commander dossier, fleet ledger, engineering blueprints, community goals, market search, BGS tracking. | Cluttered web UI, dense non-spatial tables, lacks integrated 3D spatial context (requires jumping back and forth to other tools). | **Spatial HUD Dossier & Engineering Calculator:** View ship builds, cargo manifests, and engineering materials embedded as slide-out cockpit panels alongside 3D route planning. |
| **Spansh (Galaxy Plotter)** | Complex route plotters: Neutron Highway, Fleet Carrier router, Road to Riches, Galaxy CSV dumps. | Purely form/table-based UI; no visual representation of the plotted route or galactic topography. | **Visual 3D Route Canvas:** Plot Neutron Highways or Carrier routes with instant 3D interactive bezier paths, fuel waypoints, and automated copy-paste clipboard HUD hooks. |
| **Raven Colonial** | Fleet Carrier logistics, colonization infrastructure tracking, construction supply chains. | Niche standalone tool; separated from active flight telemetry. | **Integrated Architect & Carrier Logistics Hub:** Real-time market demand matching, tritium consumption calculator, and colonisation slot visualization directly inside the System Map Architect View. |
| **EDSM (Elite Dangerous Star Map)** | 3D visual celestial bodies, flight log synchronization, celestial trilateration. | Legacy WebGL performance bottlenecks; struggles with massive star counts; dated UI aesthetic. | **Sub-millisecond WebGPU Engine:** Handles millions of stars with smooth 120 FPS camera kinematics, authentic Cobra HUD theme, and instant zero-latency searches. |

---

## 2. The Atlas Unification Architecture

Instead of commanders juggling 4–5 separate browser tabs while flying, Atlas consolidates all operations into an integrated cockpit cartography portal:

```mermaid
flowchart TD
    subgraph Atlas_Unified_Portal ["Atlas All-In-One Cartography & Operations"]
        NavHub[1. 3D Galaxy & System Visualizer (Spansh + EDSM Core)]
        Logistics[2. Fleet Carrier & Colonisation Hub (Raven Colonial Core)]
        Dossier[3. CMDR Dossier, Fleet & Engineering (Inara Core)]
        Exploration[4. Galactic Exploration & Density Heatmaps (EDAstro Core)]
        TradeEngine[5. Spatial Commodity & BGS Market Matrix]
    end

    subgraph Data_Backbone ["Atlas Unified Streaming Backbone"]
        LocalLogs[Local Journal & NavRoute.json Watcher]
        EDDN_Stream[EDDN ZeroMQ Live Market & Scan Bus]
        Spansh_API[Spansh Routing & Systems Dump]
    end

    Data_Backbone --> Atlas_Unified_Portal
```

---

## 3. Dedicated Module Specifications

### Module 1: The Visual Routing Engine (Spansh Integration)
* **Neutron Highway Plotter:** Calculates optimal jumps utilizing white dwarfs / neutron stars ($4\times$ jump range), with visual 3D cones and fuel-star stops.
* **Road to Riches (Exploration Scanner):** High-value terraformable water/earth-like planet pathfinder with visual credits-earned projection overlay.
* **Fleet Carrier Multi-Hop Navigator:** Full tritium logistics, reservation checks, and automated jump schedules.

### Module 2: Galactic Exploration & Astrometrics (EDAstro Integration)
* **Density Heatmaps:** 3D volumetric raymarched point cloud showing historical Commander traffic, unvisited black spots, and deep-space DSSA carrier networks.
* **Expedition Waypoint Tracking:** Live multi-commander fleet tracking with milestone pins and planetary meetup coordinates.

### Module 3: Commander Dossier & Engineering Vault (Inara Integration)
* **Live Fleet Ledger:** Real-time ship list, stored modules, cargo holds, and outfitting configurations synced via Journal `Loadout` and `Shipyard`.
* **Engineering Material Tracker:** Raw, Manufactured, and Encoded inventory levels with one-click "Missing Materials Finder" showing nearest sources.
* **BGS & Minor Faction War Room:** Conflict zone trackers, tick tracking, and influence bars mapped onto star systems.

### Module 4: Colonisation & Carrier Logistics (Raven Colonial Integration)
* **Orbital Construction Depot:** Tracking required commodities (Titanium, Steel, Computer Components) for new stations.
* **Supply Chain Route Optimizer:** Finds the cheapest / highest-supply stations within carrier jump range to fulfill construction quotas.
