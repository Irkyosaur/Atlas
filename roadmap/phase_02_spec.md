# Atlas - Phase 2 Specification: WebGPU 3D Galaxy Engine
**Document ID:** `ATLAS-PHASE-02-SPEC`  
**Phase:** 2 of 10  
**Target:** 3D WebGPU frustum streaming, WGSL star shaders, logarithmic camera kinematics, and galactic reference plane stalks.

---

## Stage 2.1: WGSL Star Shader Pipeline & Instanced Geometry
- [ ] **Task 2.1.1**: Author WGSL vertex/fragment shaders with physical stellar limb-darkening and spectral temperature color lookups (`star_shaders.ts`).
- [ ] **Task 2.1.2**: Implement instanced point-cloud rendering pipeline capable of rendering 1,000,000+ stars at 120 FPS.
- [ ] **Task 2.1.3**: Add point-sprite bloom and halo glow pass for giant stars (Class O, Blue Supergiants, Wolf-Rayet).
* **Verification:** WebGPU render loop executes under 2.5ms per frame with 1M stars instanced.

---

## Stage 2.2: 3D Bounding-Box Frustum Streamer
- [ ] **Task 2.2.1**: Implement spatial camera focus listener querying $50\text{ LY}$ boxels via `POST /api/cube-search`.
- [ ] **Task 2.2.2**: Integrate Morton-code (Z-order curve) spatial sorting to stream new stars into GPU vertex buffers without reallocating buffers.
- [ ] **Task 2.2.3**: Implement Origin-Shift camera translation to prevent 32-bit floating-point jitter at the galactic rim ($-40,000\text{ LY}$ from Sol).
* **Verification:** Camera moving through deep space dynamically streams stars with zero stutter or garbage collection pauses.

---

## Stage 2.3: Logarithmic Camera Controller & Reference Stalks
- [ ] **Task 2.3.1**: Build logarithmic camera controller handling distances from $1\text{ LY}$ local clusters to $100,000\text{ LY}$ galaxy views.
- [ ] **Task 2.3.2**: Render perpendicular projection stalks (`StalkBase`) dropping from selected stars to the $Y = 0$ galactic reference plane.
- [ ] **Task 2.3.3**: Render animated orange reference coordinate grid at $Y = 0$ with 1,000 LY square divisions.
* **Verification:** Selecting any star system smoothly drops a glowing projection stalk with coordinates.

---

## Stage 2.4: Volumetric Powerplay Bubbles & Titan Caustic Zones
- [ ] **Task 2.4.1**: Build raymarched volumetric sphere shader for Powerplay 2.0 territory bubbles colored by leader allegiance.
- [ ] **Task 2.4.2**: Render Thargoid Titan Maelstrom caustic gas perimeters with animated noise distortion shaders.
- [ ] **Task 2.4.3**: Add layer visibility toggles allowing users to fade territory volumes in and out.
* **Verification:** Powerplay bubbles blend cleanly with star point-clouds without depth-buffer z-fighting.
