# Atlas - Phase 19: Hardware WebHID Studio, HUD Matrix & Racing
**Phase:** 19 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/social_hardware_and_competitive_features.md`, `specs/complete_peripheral_tools_replacement.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 19.1: WebHID Device Inspector & Flight Stick Calibration Curves
- **Objective:** Directly interface with high-end flight simulation hardware (VKB, Virpil, Winwing, Thrustmaster) via WebHID API with visual curve tuning.
- **Specific Tasks:**
  1. Implement WebHID device pairing dialog (`navigator.hid.requestDevice()`) supporting standard vendor IDs (VID/PID).
  2. Read high-resolution 16-bit raw analog axis reports directly from hardware controllers.
  3. Build interactive visual response curve editor: customize exponential curves, S-curves, deadzones, and saturation limits.
  4. Export and import joystick profile presets in JSON format.
- **Verification Criterion:** Connecting a VKB or Virpil joystick via WebHID displays real-time 16-bit raw axis deflection graphs and allows real-time response curve deformation.

---

## Stage 19.2: 3D HUD Color Matrix Tuner (EDHM Parity)
- **Objective:** Provide a real-time 3D cockpit preview for customizing Elite Dangerous HUD color matrices, matching EDHM (Elite Dangerous HUD Mod) capabilities.
- **Specific Tasks:**
  1. Render a detailed 3D cockpit model with all HUD elements (reticles, scanner, left/right panels, radar dish).
  2. Implement $3 \times 3$ RGB transformation matrix sliders: MatrixRed, MatrixGreen, MatrixBlue with real-time shader color transformation.
  3. Include authentic HUD presets: Classic Orange, Federal Cyan, Imperial White, Deep Purple, Tactical Amber, Stealth Red.
  4. Generate one-click copyable `GraphicsConfigurationOverride.xml` XML snippets for direct pasting into the game's configuration folder.
- **Verification Criterion:** Adjusting the matrix sliders interactively recolors the 3D cockpit HUD elements in real time and outputs valid XML configuration matching game requirements.

---

## Stage 19.3: Buckyball Racing 3D Path Replayer & Telemetry Compare
- **Objective:** Replay competitive Buckyball speed runs and canyon race trajectories in interactive 3D with synchronized telemetry.
- **Specific Tasks:**
  1. Author racing telemetry format ingest parser (recording Timestamp, Position $(X, Y, Z)$, Velocity, Throttle, Boost state).
  2. Render 3D glowing race trajectory splines with color gradients indicating instant velocity (blue = cruise, orange = boost, red = deceleration).
  3. Implement split-screen or ghost-overlay racer comparison: compare two CMDR trajectories simultaneously to identify apex and braking differences.
  4. Display racing split times (gate-to-gate checkpoints) and leaderboard rankings.
- **Verification Criterion:** Loading two race trajectory logs renders both flights in the 3D canyon view with a ghost ship replaying flight paths and computing split-second time differentials.

---

## Stage 19.4: Squadron War Room & Tactical Wing Coordination Canvas
- **Objective:** Provide a real-time collaborative tactical canvas for squadron fleet movements, system expansion, and BGS (Background Simulation) operations.
- **Specific Tasks:**
  1. Build collaborative map canvas powered by WebSockets allowing squadron leaders to draw tactical arrows, drop rally beacons, and designate priority targets.
  2. Ingest faction influence percentages from Ananke `GET /api/bgs/faction-state` across all squadron home systems.
  3. Display BGS tick tracker: predict next daily server tick time and track daily mission influence shifts.
  4. Implement Squadron asset tracker: display all squadron member Fleet Carriers, locations, and Tritium stocks on a single unified tactical map.
- **Verification Criterion:** Placing a tactical waypoint marker on the canvas by CMDR A renders the marker on CMDR B's screen in real time with active BGS influence overlays.
