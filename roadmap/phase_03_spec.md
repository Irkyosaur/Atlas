# Atlas - Phase 03: 2D System Hierarchy & 3D Keplerian Orrery
**Phase:** 03 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `client/src/lib/engine/kepler.ts`, `docs/database_architecture.md`, `specs/website_features_specification.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 3.1: 2D System Hierarchy & D3 Tree Visualization
- **Objective:** Render the complete hierarchical tree of stars, planets, moons, barycenters, and stations within any selected star system.
- **Specific Tasks:**
  1. Construct hierarchical data parser mapping Ananke `/api/system/by-name` body hierarchy into D3-compatible node/leaf trees (`TreeLayout.svelte`).
  2. Implement visual iconography for all spectral classes (O, B, A, F, G, K, M, L, T, Y, White Dwarfs, Neutron, Black Holes) and planetary types (Earth-Like, Water World, Ammonia, Gas Giants I-V, High Metal Content, Metal-Rich, Icy, Rocky).
  3. Render barycentric coordinate nodes for binary/tertiary pairs with distinct dotted orbital connection lines.
  4. Add expandable/collapsible branch nodes with badge counters indicating sub-moon counts and orbital station presences.
- **Verification Criterion:** Selecting `Sol` renders the complete planetary hierarchy from Sol through Neptune and Pluto, correctly grouping all 8 planets and moons with zero layout overlap.

---

## Stage 3.2: 3D Keplerian Orbit Solver & Elliptical Splines
- **Objective:** Compute exact real-time 3D planetary positions along true Keplerian orbital ellipses using standard orbital mechanics.
- **Specific Tasks:**
  1. Implement Kepler's Equation numerical solver (`solveKepler(M, e)`) using Newton-Raphson iteration converging within $10^{-6}$ precision (`kepler.ts`).
  2. Compute 3D orbital state vectors from Semi-Major Axis ($a$), Eccentricity ($e$), Orbital Inclination ($i$), Argument of Periapsis ($\omega$), Longitude of Ascending Node ($\Omega$), and Mean Anomaly ($M_0$).
  3. Generate GPU-rendered elliptical orbit paths using instanced curved ribbon splines with variable alpha fading toward the anti-periapsis.
  4. Implement celestial scale normalization: logarithmic scaling option for planetary radii and astronomical unit ($AU$) distances to prevent microscopic planets in massive star systems.
- **Verification Criterion:** Orbits of high-eccentricity bodies (e.g. comets or elliptical moons) accurately trace non-circular paths, with body positions exactly matching mathematical perihelion and aphelion points.

---

## Stage 3.3: Orbital Time-Scrubbing & Ephemeris Timeline
- **Objective:** Provide a scrubbable real-time and accelerated timeline controller to visualize planetary motions, eclipses, and alignments.
- **Specific Tasks:**
  1. Build a bottom HUD timeline bar with play/pause, step-forward, and scrub slider controls supporting speeds from $1\times$ real-time up to $1,000,000\times$.
  2. Bind timeline state to global Julian Date ($JD$) timestamps synchronized with game epoch (Elite Dangerous year 3310+).
  3. Implement celestial alignment detector flagging planetary conjunctions and eclipse windows between primary stars and major planets.
  4. Add camera target locking: smoothly anchor the viewport to an orbiting planet while the rest of the solar system moves relative to its reference frame.
- **Verification Criterion:** Dragging the timeline slider advances all planetary bodies smoothly along their Keplerian paths without jitter or orbital drift.

---

## Stage 3.4: DSS Surface Cartography Projection & Exobiology Overlays
- **Objective:** Render spherical surface detail, Detailed Surface Scanner (DSS) heatmaps, and exobiological scan points for landable bodies.
- **Specific Tasks:**
  1. Implement a WebGL2/WebGPU sphere shader supporting dynamic height displacement and procedural surface albedo based on planetary composition.
  2. Project Detailed Surface Scanner (DSS) biological and geological signal heatmaps onto body spheres using multi-layered radial texture coordinates.
  3. Overlay exobiological specimen markers (e.g., *Stratum Tectonicas*, *Tubus*, *Fonticulua*) with minimum colony distance circles (e.g., 500m / 800m rings) to prevent invalid sampling.
  4. Display planetary telemetry sidecard: Surface Gravity ($G$), Surface Temperature ($K$), Volcanism, Atmosphere Composition, Landable status, and Bio/Geo signal count.
- **Verification Criterion:** Surface inspection modal for a scanned atmospheric world displays interactive rotating globe with DSS bio heatmap filters and landable flight parameters.
