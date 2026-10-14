# Atlas - Complete Community Feature Matrix & Advanced Capabilities
**Comprehensive Analysis:** Inara, Spansh, EDAstro, Raven Colonial, Coriolis / EDSY, and EDMarketConnector / EDDI  
**Target:** Identifying every major capability across the community ecosystem that can be integrated directly into Atlas.

---

## 1. Feature Ingestion Breakdown by Site

### 1. Inara.cz (Operations, Community & Progression)
* **Commodity Market & Best Trade Finder:**
  * Find highest sell price / lowest buy price for any commodity (e.g., Gold, Agronomic Treatment, Tritium).
  * Route Trade Finder: Single-hop and multi-hop profitable trade loops ($M\text{ Cr/hr}$).
* **Community Goals (CG) Tracker:**
  * Active CG progress bars, global tier rewards, Commander contribution ranking ($100\%, 75\%, 50\%, 25\%, 10\%$).
* **Minor Faction & BGS War Room:**
  * Faction expansion alerts, daily influence tick monitors, war / civil war win/loss day counters.
* **Badge, Rank & Permit Progression Tracker:**
  * Imperial / Federal naval ranks, Pilot Federation combat/trade/exploration/exobiology/mercenary ranks.
  * System permit checklist (Sol, Sirius, Achenar, Summerland, Alioth, Shinrarta Dezhra, etc.).
* **Equipment & Module Outfitting Finder:**
  * "Where can I buy a 6A Prismatic Shield Generator or 5A FSD near me with a $15\%$ Li Yong-Rui discount?"
* **Shipyard Finder:**
  * Locating specific ship hulls (e.g., Python Mk II, Anaconda, Federal Corvette, Imperial Cutter).

---

### 2. Spansh.co.uk (Algorithmic Routing & Data Mining)
* **Exact Neutron Highway Router:**
  * Multi-hop fast jump calculator with FSD supercharge hops, fuel stops, and neutron star system names.
* **Road to Riches (R2R):**
  * Exploration value route finder between two systems, prioritizing high-value terraformable worlds (ELW, WW, HMC).
* **Fleet Carrier Router:**
  * Calculating tritium consumption, optimal jump sequences, and orbital parking options across 500 LY leaps.
* **Galaxy Dumps / Data Mining Engine:**
  * Ingesting full dumps of systems, bodies, and stations to power instant offline client-side queries.
* **Exact System Plotter (Galaxy Search):**
  * Searching systems by multi-criteria: exact star class combinations, body count, distance from Sol.

---

### 3. EDAstro.com (Exploration Cartography & Astrometrics)
* **Historical Exploration Timeline & Heatmaps:**
  * Tracking how human exploration expanded through the Milky Way year by year since 2014.
* **Deep Space Support Array (DSSA) Network:**
  * Complete interactive directory of permanent deep-space fleet carriers providing repair/refuel/UC across all 42 galactic regions.
* **Galactic POI & Expedition Archive:**
  * 3D pins for Green Gas Giants, planetary collision orbits (Mitterand Hollow), historical expedition tracks (Distant Worlds 1 & 2, Beagle Point runs).
* **Galactic Region Boundaries:**
  * Exact 3D polygonal boundaries for the 42 official Frontier galactic regions (e.g., *Formidine Rift*, *Core Sys*, *The Abyss*, *Tenebrae*).

---

### 4. Raven Colonial (Colonisation & Fleet Carrier Logistics)
* **Colonisation System Claim Management:**
  * Tracking systems claimed for player colonization, initial station deployment stages, and system beacon markers.
* **Infrastructure Bill of Materials (BOM):**
  * Tracking required construction commodities (Steel, Titanium, CMM Composites, Computer Components) per station module tier.
* **Carrier Hauling Logistics:**
  * Scheduling depot deliveries, calculating required carrier cargo space, and coordinating group hauling operations.

---

### 5. Coriolis.io & EDSY.org (Ship Outfitting & Flight Physics)
* **Interactive 3D Ship Outfitting Builder:**
  * Full ship builder for all 38+ ship hulls (Python Mk II, Krait Mk II, Anaconda, Cutter, Corvette, Chieftain, etc.).
  * Real-time calculation of:
    * Jump range (Unladen, Laden, Max Fuel).
    * Shield Effective HP (Kinetic, Thermal, Explosive, Absolute) factoring in Shield Boosters and Engineering.
    * Armor Hardness and Hull HP factoring in Hull Reinforcement Modules (HRP) and Guardian modules.
    * Power Plant heat efficiency and power distributor sustained firing time ($T_{\text{drain}}$).
    * Weapon DPS (Sustained vs. Burst) across all engineering experimentals (Corrosive, Thermal Vent, Oversized).
* **One-Click In-Game Export:**
  * Exporting loadouts to Coriolis / EDSY URL formats or importing directly from player `Loadout.json`.

---

### 6. EDMarketConnector (EDMC) & EDDI (Live Client Integration)
* **Plugin Architecture / Local Bridge:**
  * Automatic zero-setup background log syncing without manually selecting folders.
* **TTS Audio Event Engine:**
  * Real-time dynamic speech responses based on in-game events (undocking, interdiction, hull damage, low fuel, FSD anomaly).
* **Automated Route Clipboard Sync:**
  * Automatically writing the next system on the route to the Windows clipboard upon entering hyperspace so the player only has to press `Ctrl + V` in the galaxy map.

---

## 2. The Complete Atlas Unified Architecture

With these capabilities mapped out, Atlas becomes the **definitive single pane of glass** for Elite Dangerous:

```mermaid
flowchart TD
    subgraph UI_Panels ["Atlas Unified Interface"]
        G[1. 3D WebGPU Galaxy / Astrometrics Canvas (EDAstro)]
        S[2. 2D / 3D System & Orrery Hierarchy]
        R[3. Visual Route Plotter: Neutron & Carrier (Spansh)]
        B[4. Ship Builder & Engineering Calculator (Coriolis/EDSY)]
        T[5. Commodity & Module Trade Finder (Inara)]
        C[6. Colonisation & Carrier Depot Hub (Raven Colonial)]
        A[7. Voice COVAS & Clipboard Navigation (EDMC/EDDI)]
    end

    subgraph Data_Hub ["Atlas Data Engine"]
        Engine[WebGPU / Three.js r160+ Core]
        Store[IndexedDB Offline Cache + Spatial Octree]
        Streams[EDDN ZeroMQ + Local Journal Watcher]
    end

    Data_Hub --> UI_Panels
```
