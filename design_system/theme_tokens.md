# Atlas Design System: The Cobra UI Token Guide
**Target Style:** Frontier Developments Cobra Engine HUD & Cartographic Standard (Odyssey 4.0 Update Baseline)

---

## 1. Color Palette Tokens

The Elite Dangerous visual identity relies on an amber-orange monochromatic base with high-contrast functional highlights for security, allegiance, and hazard indicators.

### 1.1 Core Cartographic Palettes
```css
:root {
  /* Primary Elite Orange HUD */
  --ed-orange-primary: #ff7100;
  --ed-orange-bright:  #ff9800;
  --ed-orange-dim:     #9e4600;
  --ed-orange-glow:    rgba(255, 113, 0, 0.35);

  /* Deep Space Canvas */
  --ed-space-black:    #030508;
  --ed-bg-panel:       rgba(10, 16, 24, 0.88);
  --ed-bg-panel-dark:  rgba(6, 10, 15, 0.96);
  --ed-grid-line:      rgba(40, 68, 96, 0.25);
  --ed-grid-axis:      rgba(79, 195, 247, 0.5);

  /* Functional Accents */
  --ed-blue-cyan:      #4fc3f7; /* Horizons landable arc & nav waypoints */
  --ed-blue-glow:      rgba(79, 195, 247, 0.3);
  --ed-green-ax:       #00e676; /* Friendly / Anti-Xeno Caustic tracker */
  --ed-red-hazard:     #ff1744; /* Wanted / Titan incursion / Hostile */
  --ed-yellow-warn:    #ffd600; /* Permit required / Demolition timer */
  --ed-purple-permit:  #ba68c8; /* Locked galactic sectors */

  /* Superpower Allegiance */
  --ed-allegiance-fed: #e53935;
  --ed-allegiance-emp: #3a8bff;
  --ed-allegiance-all: #43a047;
  --ed-allegiance-ind: #ffa000;
}
```

---

## 2. Typography & Text Hierarchy

Elite Dangerous uses clean, technical grotesque sans-serif fonts with distinct uppercase tracking and tabular numerals.

### 2.1 Font Family & Fallbacks
```css
font-family: "Eurostile", "Orbitron", "Exo 2", "Rajdhani", -apple-system, sans-serif;
```

### 2.2 Hierarchy Tokens
* **Header / Sector Title (`H1`):** `24px` / `Tracking: 0.15em` / Uppercase / `#ffffff` with subtle text shadow `0 0 8px var(--ed-orange-glow)`.
* **System Name (`H2`):** `18px` / `Tracking: 0.1em` / Uppercase / `var(--ed-orange-bright)`.
* **Telemetry Data Labels:** `12px` / `Tracking: 0.08em` / Uppercase / `var(--ed-orange-dim)`.
* **Telemetry Values (Tabular):** `13px` / `font-variant-numeric: tabular-nums` / `#ffffff`.

---

## 3. UI Component Specifications

### 3.1 Reticles & Brackets
Frontier's selection reticles use inverted corner brackets with an active animated pulse:
```css
.ed-reticle-box {
  position: relative;
  border: 1px solid transparent;
}
.ed-reticle-box::before, .ed-reticle-box::after {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--ed-orange-bright);
  border-style: solid;
}
/* Top-Left & Bottom-Right brackets */
.ed-reticle-box::before { top: -2px; left: -2px; border-width: 2px 0 0 2px; }
.ed-reticle-box::after  { bottom: -2px; right: -2px; border-width: 0 2px 2px 0; }
```

### 3.2 Projected Stalks (`StalkBase`)
When inspecting a star or planetary body in 3D:
* Vertical line from body down to galactic plane: `stroke: var(--ed-grid-axis); stroke-dasharray: 2, 2;`.
* Footprint marker at plane intersection: Concentric ring with crosshair ticks.
