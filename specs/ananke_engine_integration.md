# Atlas - Ananke Galaxy Engine Integration Specification
**Document ID:** `ATLAS-SPEC-ANANKE-01`  
**Target:** Atlas WebGPU Client & Engine Integration  
**Backend Core:** Ananke High-Performance Rust Engine (Axum / Tokio / Rusqlite / Vulkan Compute)  
**Host & Ports:** Production: `https://ananke.projectgaltea.org` (`:8000`) | Staging: `http://127.0.0.1:8005`  
**Reference Source:** Project Galtea File 05 (`05_ANANKE_GALAXY_ENGINE.md`) & File 31 (`31_CONSOLIDATED_API_ENCYCLOPEDIA.md`)

---

## 1. Executive Summary & Capabilities

**Ananke** is the bare-metal Rust spatial engine powering all galactic search, routing, and telemetry for Project Galtea. In Atlas, rather than building custom database access layers, the web front-end integrates directly with Ananke's hardened, high-throughput REST API.

```mermaid
flowchart TD
    subgraph Atlas_Frontend ["Atlas WebGPU Client (Browser)"]
        SearchUI[Search & Autocomplete Bar]
        View3D[3D WebGPU Galaxy Map Canvas]
        RouterUI[Neutron & Carrier Route Planner]
        MarketUI[Commodity & Module Finder]
        ExoUI[Exobiology & DSS Heatmap Viewer]
    end

    subgraph Ananke_Core ["Ananke Engine (:8000 / ananke.projectgaltea.org)"]
        Admission[Dual-Semaphore Concurrency Guard\n1024 Light / 32 Heavy Slots]
        Router[A* Solver: 500 LY Carrier & 4x Neutron Vulkan Engine]
        RTree[SQLite 3D R*Tree Spatial Search\n1-2ms Bounding Box Culling]
        Cache[In-Memory Grid Cells & Matrix Aggregator]
    end

    SearchUI -->|GET /api/search?q=...| Ananke_Core
    View3D -->|POST /api/cube-search {x,y,z,size}| Ananke_Core
    RouterUI -->|POST /api/carrier-route & /api/neutron-route| Ananke_Core
    MarketUI -->|GET /api/trade/nearest-commodity & /api/outfitting/nearest-module| Ananke_Core
    ExoUI -->|GET /api/exobiology/nearest-species & /api/bodies/nearest| Ananke_Core
```

---

## 2. Primary Ananke API Endpoint Integration Matrix

The following endpoints from Ananke map directly into Atlas UI components:

### 2.1 Core Search, Autocomplete & Spatial Frustum Culling
* **Fuzzy Autocomplete (`GET /api/search?q=:query`):**
  * Sub-millisecond prefix search powering the Atlas top navigation search bar.
  * *Response:* `[ { "id64": 10477373803, "name": "Sol", "x": 0.0, "y": 0.0, "z": 0.0, "primaryStarClass": "G" }, ... ]`
* **3D Viewport Bounding-Box Cube (`GET/POST /api/cube-search`):**
  * Parameters: `x`, `y`, `z`, `size` (e.g. `size=50` for the $50\text{ LY}$ Golden Sweet Spot).
  * Evaluated across the in-memory R\*Tree index in **$1.07 - 1.42\text{ms}$ (P50)**.
  * Powers real-time streaming of star clusters as the camera moves through the Galaxy Map.
* **System Full Telemetry Record (`GET /api/system?name=:name` or `?id64=:id64`):**
  * Returns complete system dossier: population, allegiance, government, primary/secondary economy, security level, minor factions, Powerplay 2.0 territory status, and Thargoid War state.
* **Batch System Resolver (`POST /api/systems/batch`):**
  * Ingests `{"names": ["Sol", "Achenar", "Alioth", ...]}` and resolves up to **1,000 systems per call in $<3\text{ms}$**.

---

### 2.2 Planetary Bodies & Hierarchical System Map
* **System Celestial Bodies Hierarchy (`GET /api/system/bodies?systemName=:name`):**
  * Returns array of all stellar and planetary bodies with mass, radius, surface gravity, surface temperature, atmospheric composition, volcanism, terraforming state, landable flag, and full Keplerian orbital elements (`semiMajorAxis`, `eccentricity`, `orbitalInclination`, `periapsis`, `ascendingNode`, `meanAnomaly`, `orbitalPeriod`).
  * Drives the 2D System Map tree layout and 3D Keplerian Orrery.
* **Spatial $k$-NN Nearest Body Scout (`GET /api/bodies/nearest`):**
  * Parameters: `x`, `y`, `z`, `sub_type` (e.g. `Earth-like world`, `Ammonia world`), `has_signals=true`.
  * Powers Atlas exploration filters and the "Road to Riches" locator.
* **System Rings & Asteroids (`GET /api/system/rings?system=:name`):**
  * Returns complete inventory of planetary rings and asteroid belts with ring class (Icy, Metallic, Metal-Rich) and resource reserve levels.

---

### 2.3 Route Planning Solvers (Neutron Highway & Fleet Carrier)
* **Neutron Superhighway Route (`POST /api/neutron-route`):**
  * Payload: `{"source": "Sol", "target": "Colonia", "range": 65.5}`
  * Backed by Ananke's **Vulkan GPU Compute A\* Pipeline** traversing the pre-indexed `primary_neutron_systems` graph with $400\%$ FSD supercharge multipliers.
  * Returns sequence of neutron star waypoints, intermediate fuel stops, and jump distances.
* **Fleet Carrier 500 LY Router (`POST /api/carrier-route`):**
  * Payload: `{"source": "Sol", "target": "Eotchorts EG-X d1-265", "cargo_mass": 10000}`
  * Uses **Directional Vector Alignment** ($\hat{v}_{\text{heading}}$) and **In-Memory 2-Hop Lookahead** across RAM spatial grid cells.
  * Calculates 22,000 LY transits in **under $700\text{ms}$**, returning optimal jump waypoints, required Tritium fuel burn, and depot restock stops.
* **Multi-Modal Route Engine (`GET /api/navigation/multi-modal`):**
  * Combines standard ship FSD jumps, neutron supercharging, and carrier ferry legs into a unified travel itinerary.

---

### 2.4 Station Services, Markets & Odyssey Ground Base Scouts
* **Station Facilities & Landing Pads (`GET /api/station?name=:systemName`):**
  * Returns starports, outposts, and fleet carriers with Small/Medium/Large landing pad availability and active services (Shipyard, Outfitting, Refuel, Repair, Cartographics).
* **Spatial Commodity Market Search (`GET /api/trade/nearest-commodity`):**
  * Parameters: `commodity=tritium`, `refSystem=Sol`, `mode=buy` (or `sell`).
  * Locates starports with highest buy / lowest sell prices and available stock.
* **Specialized Contact Locators:**
  * **Material Traders:** `GET /api/stations/material-traders?refSystem=Sol&type=raw` (or `manufactured`, `encoded`).
  * **Technology Brokers:** `GET /api/stations/tech-brokers?refSystem=Sol`.
  * **Interstellar Factors:** `GET /api/stations/interstellar-factors?refSystem=Sol`.
  * **Black Markets:** `GET /api/stations/black-markets?refSystem=Sol`.
  * **Li Yong-Rui 15% Discounts:** `GET /api/discount/shopping?shipType=anaconda&refSystem=Sol`.
* **Odyssey Settlements & Anarchy Infiltration (`GET /api/settlements/search`):**
  * Filters ground settlements by government (e.g. `government=Anarchy` for unpenalized Power Regulator theft) and security levels (0–3).

---

### 2.5 Live Galaxy Heatmap & Exobiology
* **Galactic Player Density Heatmap (`GET /api/heatmap.png`):**
  * Directly returns an in-memory $1024 \times 1024$ RGBA PNG generated from Ananke’s real-time commander jump grid (rendered in the Inferno colormap with an 8-hour half-life decay).
  * Atlas overlays this texture directly onto the 3D galactic plane.
* **Nearest Exobiology Species (`GET /api/exobiology/nearest-species`):**
  * Parameters: `genus=$Codex_Ent_Bacterial_Genus_Name;`, `refSystem=Sol`.
  * Feeds the Atlas Exobiology GPS Assistant.

---

## 3. High-Throughput TypeScript Client (`AnankeClient.ts`)

Atlas includes a dedicated API client wrapper featuring automatic error retry, timeout protection, and batch chunking:

```typescript
// Location: atlas/client/src/lib/engine/ananke_client.ts

export interface SystemRecord {
  id64: string; // Serialized as String to prevent 64-bit integer truncation
  name: string;
  x: number;
  y: number;
  z: number;
  primaryStarClass: string;
  population: number;
  allegiance: string;
  security: string;
  powerState?: string;
  thargoidWar?: string;
}

export class AnankeClient {
  private baseUrl: string;

  constructor(baseUrl = "https://ananke.projectgaltea.org") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Sub-millisecond autocomplete for the Atlas search bar
   */
  async searchAutocomplete(query: string): Promise<SystemRecord[]> {
    if (!query || query.length < 2) return [];
    const res = await fetch(`${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Ananke search failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Streams 3D bounding-box star clusters for the WebGPU camera view
   */
  async getCubeSystems(x: number, y: number, z: number, size = 50): Promise<SystemRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/cube-search?x=${x}&y=${y}&z=${z}&size=${size}`);
    if (!res.ok) throw new Error(`Ananke cube search failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Computes a 500 LY Fleet Carrier jump sequence
   */
  async calculateCarrierRoute(source: string, target: string, cargoMass = 0) {
    const res = await fetch(`${this.baseUrl}/api/carrier-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, cargo_mass: cargoMass }),
    });
    if (!res.ok) throw new Error(`Carrier routing failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Computes a 400% supercharged Neutron Highway route
   */
  async calculateNeutronRoute(source: string, target: string, jumpRange: number) {
    const res = await fetch(`${this.baseUrl}/api/neutron-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, range: jumpRange }),
    });
    if (!res.ok) throw new Error(`Neutron routing failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches the live 1024x1024 galactic traffic density heatmap URL
   */
  getHeatmapUrl(): string {
    return `${this.baseUrl}/api/heatmap.png?t=${Date.now()}`;
  }
}

export const ananke = new AnankeClient();
```
