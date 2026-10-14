# Atlas - High-Performance Elite Dangerous Web Cartography
**Mission Statement:**  
Atlas is a slim, ultra-fast, GPU-accelerated web viewer for Elite Dangerous cartography. It delivers pixel-accurate recreation of the in-game Galaxy Map, System Map, Planetary Surface Map, and 3D Orrery, matching the Cobra Engine's iconic orange HUD aesthetic, icon styling, and camera kinematics, while offering modern, responsive 120+ FPS performance.

---

## 1. Core Principles & Philosophy
1. **Zero Bloat / Maximum Framerate:**  
   Built on WebGPU + Svelte 5 / TypeScript. No heavy frameworks, no virtual DOM reconciliation bottlenecks. Pure hardware-accelerated compute shaders and instanced geometry.
2. **Faithful Visual Parity:**  
   Exact reproductions of Frontier's UI layouts, font metrics, sound stingers (optional), reticles, projection stalks, and vector icons extracted from game files.
3. **Seamless Multi-Map Continuity:**  
   Instant fluid transitions: **Galaxy View $\leftrightarrow$ System Hierarchy $\leftrightarrow$ 3D Keplerian Orrery $\leftrightarrow$ Planetary Surface**.
4. **Offline & Live Dual-Mode:**  
   * *Offline / Archival Mode:* Browse catalog stars, historical systems, and routes.
   * *Live Telemetry Mode:* Connects directly to local player journal logs (`Saved Games`) or EDDN live data stream for active flight tracking.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph UI_Layer ["Front-End UI & HUD (Svelte 5 / Tailwind CSS)"]
        TopBar[Top Bar: Search, Mode Switcher, Session Stats]
        SideLeft[Left Drawer: Filter Views, Powerplay, War Frontlines]
        SideRight[Right Drawer: System / Body Telemetry Dossier]
        BottomBar[Time Control & Playback Scrubbing]
    end

    subgraph Engine_Layer ["Atlas GPU Engine (WebGPU / Three.js r160+)"]
        GalaxyEngine[Galaxy Map PointCloud & Dust Raymarching]
        SystemEngine[System Map Hierarchical Tree Graph]
        OrreryEngine[3D Orrery Keplerian Physics Simulator]
        SurfaceEngine[Planetary Elevation & DSS Heatmap Viewer]
    end

    subgraph Data_Layer ["Atlas Data Core"]
        IndexedDB[IndexedDB Cache: Octree Star Nodes]
        Worker[Web Worker: A* Jump Route & Kepler Solvers]
        JournalWatcher[Local File System Watcher / EDDN Stream]
    end

    UI_Layer <--> Engine_Layer
    Engine_Layer <--> Data_Layer
```

---

## 3. Project Directory Map
* [`atlas/`](file:///D:/Elite%20dangerous%20research/atlas)
  * [`docs/`](file:///D:/Elite%20dangerous%20research/atlas/docs): Architectural blueprints, shader specs, and data pipelines.
  * [`roadmap/`](file:///D:/Elite%20dangerous%20research/atlas/roadmap): Phase-by-phase implementation schedule and milestones.
  * [`specs/`](file:///D:/Elite%20dangerous%20research/atlas/specs): Mathematical formulas, Ananke API directories, CAPI authentication, and covert security telemetry.
  * [`specs/native_client_and_web_integration.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/native_client_and_web_integration.md): Bidirectional local bridge, reverse waypoint injection, and telemetry logging architecture.
  * [`specs/complete_peripheral_tools_replacement.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/complete_peripheral_tools_replacement.md): Total consolidation replacing ICARUS Terminal, EDCo-Pilot, edtools, Elite BGS, and EDSM.
  * [`specs/community_tools_replacement_blueprint.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/community_tools_replacement_blueprint.md): Complete architecture to replace Inara, Spansh, Coriolis/EDSY, EDMC, Canonn, and Raven Colonial.
  * [`specs/community_features_gap_analysis.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/community_features_gap_analysis.md): Deep feature catalog covering gaps across existing tools.
  * [`specs/deep_security_and_anti_cloning.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/deep_security_and_anti_cloning.md): Frontier CAPI OAuth2 linkage, PoW bot defense, and IP protection.
  * [`specs/covert_phone_home_telemetry.md`](file:///D:/Elite%20dangerous%20research/atlas/specs/covert_phone_home_telemetry.md): Covert anti-clone traps and direct alerting (standalone, without The Orb).
  * [`design_system/`](file:///D:/Elite%20dangerous%20research/atlas/design_system): Theme tokens, typography, colors, and audio/UI styling.
  * [`assets/`](file:///D:/Elite%20dangerous%20research/atlas/assets): Pixel-perfect SVG vector icons, shaders, and materials.
