# Atlas - Specialized Features & Deep Gameplay Integration
**Analysis Sources:** Inara Specialized Engines, Spansh Deep Routers, EDAstro Records, ED-Board, and EDSM  
**Scope:** Identifying niche, high-value, and specialized gameplay tools from community websites that can be unified into Atlas.

---

## 1. Mining Hotspots & Core Cracking Prospector (Spansh / Inara)

* **Overlapping Hotspot Finder:**
  * In Elite Dangerous rings (Icy, Metallic, Metal Rich), overlapping mineral hotspots (e.g. Platinum $\times 2$, Painite $\times 2$, Low Temperature Diamonds $\times 3$, Void Opals) yield massive resource extraction multipliers.
  * **Atlas In-Engine Feature:** 
    * Real-time spatial query: "Find double or triple overlapping Platinum rings within $50\text{ LY}$ of Sol or my Fleet Carrier."
    * Visual ring rendering in the System Map highlighting the exact geometric intersection circles where hotspot influence overlaps.
* **Mining Yield & Session Calculator:**
  * Tracks minerals scooped via Journal `MiningRefined` events.
  * Displays running profit metrics ($M\text{ Cr/hr}$, cargo hold percentage full, and distance to the current highest galactic buyer).

---

## 2. Rare Commodity Circuit & Smuggling Loops (Inara / Elite Wiki)

* **The Rare Goods Distance Multiplier:**
  * Rare commodities (e.g., *Lavian Brandy*, *Diso Ma Corn*, *Centauri Mega Gin*, *Kamitra Cigars*) increase in sale price exponentially with distance from their origin system, peaking at approximately **$140 - 160\text{ LY}$**.
  * Several engineers (e.g. Broo Tarquin, Didi Vatermann, Liz Ryder) require deliveries of rare goods to unlock.
* **Atlas In-Engine Feature:**
  * **Automated Rare Goods Circuit Router:** Calculates the optimal round-trip trade loop maximizing rare commodity allocations while respecting personal allocation caps.
  * Engineer unlock tracker highlighting which rare goods you still need to deliver.

---

## 3. Passenger Touring & Sightseeing Route Optimizer (Spansh)

* **Sightseeing Adventure Missions:**
  * High-paying passenger missions (VIPs, tourists, explorers) require visiting 2 to 4 planetary tourist beacons scattered across systems before returning to the origin station.
* **Atlas In-Engine Feature:**
  * **Multi-Waypoint TSP (Traveling Salesperson) Solver:** Ingests active passenger mission tourist beacons from player logs and automatically computes the shortest hyperjump route that visits all sightseeing targets with minimum jump hops.
  * Direct 3D camera fly-to previews of the destination tourist beacons and planetary landing coords.

---

## 4. Anti-Xeno Combat Operations & Titan Melt State (Inara / AXI)

* **Thargoid Titan Core Meltdown Timer:**
  * When a Thargoid Titan is pushed to $0\%$ thermal resistance, it enters a multi-day **Meltdown Countdown Phase** (`Maps_AntiXeno_Panel_Meltdown_001` through `_Destroyed`) leading up to a massive galactic explosion.
* **Atlas In-Engine Feature:**
  * Live Titan Meltdown Clock: Accurate to the second countdown for Titan demise.
  * Titan Vent Vulnerability Cycle: Graphical representation of Titan thermal core exposure windows and caustic sink dispenser replenishment tracking.
  * AX Conflict Zone (AXCZ) Tracker: Live directory of star systems with high/very high intensity anti-xeno conflict zones and active rescue megaships.

---

## 5. Galactic Records, Anomalies & Sightseeing Catalog (EDAstro / EDSM)

* **The Galactic Hall of Fame (Extreme Records):**
  * *Hottest Star:* Absolute maximum recorded surface temperature.
  * *Largest Body:* Supergiant stars exceeding thousands of solar radii.
  * *Shortest Orbital Period:* Planets orbiting their parent star in under 1 hour.
  * *Widest Rings:* Planetary ring systems spanning millions of kilometers across.
  * *Highest Footfall / Elevation:* The highest climbable mountain peaks and deepest planetary canyons.
* **Atlas In-Engine Feature:**
  * Interactive **"Galactic Wonders"** tour overlay: One-click "Plot Route to Nearest Record Body" from your current coordinates.

---

## 6. Powerplay Merit Decay & Cycle Projection (Inara)

* **Powerplay Merits Decay Engine:**
  * Every Thursday at 07:00 UTC (the weekly server tick), unredeemed merits undergo a $50\%$ decay halving cycle.
* **Atlas In-Engine Feature:**
  * Live merit preservation calculator: Shows exactly how many merits you must earn before Thursday 07:00 UTC to maintain Rank 4 / Rank 5 status ($50\text{M}$ credit weekly bonus, module access to Pack-Hound Missiles, Prismatic Shields, Advanced Plasma Accelerators).

---

## 7. Comprehensive Summary Matrix of All Sites

| Community Site | Specialized Feature Extracted | Atlas Unified Implementation |
| :--- | :--- | :--- |
| **Spansh** | Overlapping Hotspot Finder | Geometric ring intersection circles with distance-to-market finder. |
| **Inara** | Rare Goods Circuits | 160 LY peak-value trade loops + Engineer unlock delivery tracker. |
| **Spansh** | Tourist Beacon TSP Solver | Multi-waypoint traveling salesperson route optimizer for VIP missions. |
| **AXI / Inara** | Titan Meltdown Clock | Real-time countdown clock and Titan thermal core exposure assistant. |
| **EDAstro** | Galactic Records Catalog | Interactive "Galactic Wonders" tour with 3D camera fly-to. |
| **Inara** | Powerplay Merit Decay | Real-time merit halving projection and weekly threshold alerts. |
| **EDSM** | Celestial Trilateration | In-engine coordinate verification for newly discovered uncharted stars. |
