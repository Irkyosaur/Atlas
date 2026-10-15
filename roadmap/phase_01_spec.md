# Atlas - Phase 1 Specification: Core Foundations & Cobra HUD Shell
**Document ID:** `ATLAS-PHASE-01-SPEC`  
**Phase:** 1 of 10  
**Target:** Svelte 5 application scaffold, Cobra Engine amber HUD tokens, top bar navigation, and collapsible telemetry drawers.

---

## Stage 1.1: Svelte 5 Client Scaffolding & WebGPU Canvas Setup
- [x] **Task 1.1.1**: Initialize Vite + Svelte 5 + TypeScript + Tailwind CSS configuration in `client/` with strict type checking.
- [x] **Task 1.1.2**: Create `WebGPUCanvas.svelte` mounting a hardware-accelerated WebGPU rendering context with WebGL2 fallback detection.
- [x] **Task 1.1.3**: Implement window resize observer maintaining high-DPI resolution rendering ($1.0 - 2.0\text{ DPR}$) without blurriness.
* **Verification:** `npm run build` exits 0 cleanly in `client/`.

---

## Stage 1.2: Orange HUD Design System & CSS Token Binding
- [ ] **Task 1.2.1**: Encode CSS custom properties in `client/src/app.css` matching `design_system/theme_tokens.md` (`--hud-orange: #FF7100`, `--hud-amber: #FF9900`, `--hud-bg: #0B0E14`).
- [ ] **Task 1.2.2**: Mount Eurostile / Orbitron typography imports and CRT scanline / chromatic aberration overlay shaders.
- [ ] **Task 1.2.3**: Integrate the scalable vector spritesheet (`assets/atlas_icon_sprites.svg`) into an accessible `<Icon name="..." />` Svelte component.
* **Verification:** Icon component renders stations, carriers, and reticles with exact orange glow filters.

---

## Stage 1.3: Top Navigation Header, Search Autocomplete & Mode Switcher
- [ ] **Task 1.3.1**: Build `TopSearchBar.svelte` with keyboard shortcut listener (`/` or `Ctrl+K`) and instant autocomplete dropdown.
- [ ] **Task 1.3.2**: Implement Mode Switcher tab group: Galaxy Map (`G`), System Map (`S`), 3D Orrery (`O`), Planetary Surface (`P`).
- [ ] **Task 1.3.3**: Display live session telemetry badge (current system name, distance to Sol, active ship hull).
* **Verification:** Mode switcher toggles active view state smoothly with keyboard navigation.

---

## Stage 1.4: Collapsible Telemetry Drawers & Reticle Overlays
- [ ] **Task 1.4.1**: Build `LeftDrawer.svelte` housing layer toggles (Powerplay 2.0, Thargoid War frontlines, Heatmap density).
- [ ] **Task 1.4.2**: Build `RightDrawer.svelte` housing system and body dossiers (gravity, temperature, atmosphere, faction breakdown).
- [ ] **Task 1.4.3**: Implement HUD targeting reticle with corner brackets and crosshair lines tracking the canvas center focus.
* **Verification:** Drawers collapse and expand with hardware-accelerated 60 FPS transitions.
