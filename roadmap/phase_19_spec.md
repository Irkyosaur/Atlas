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

## Stage 19.2: 3D HUD Color Matrix Tuner (EDHM Parity & Live EdEzCheese D3D11 In-Game Binding)
- **Objective:** Provide a real-time 3D cockpit preview for customizing Elite Dangerous HUD color matrices, matching EDHM (Elite Dangerous HUD Mod) capabilities, with live in-game shader recoloring via the EdEzCheese runtime hook.
- **Specific Tasks:**
  1. Render a detailed 3D cockpit model with all HUD elements (reticles, scanner, left/right panels, radar dish).
  2. Implement $3 \times 3$ RGB transformation matrix sliders: MatrixRed, MatrixGreen, MatrixBlue with real-time shader color transformation.
  3. Include authentic HUD presets: Classic Orange, Federal Cyan, Imperial White, Deep Purple, Tactical Amber, Stealth Red.
  4. Generate one-click copyable `GraphicsConfigurationOverride.xml` XML snippets for direct pasting into the game's configuration folder.
  5. Add Live In-Game Dynamic Recoloring: transmit RGB matrix adjustments in real time over `ws://127.0.0.1:8999` to `EDill`, which dispatches the matrix to `EdEzCheese` to update D3D11 pixel shader constant buffers in-game instantaneously without game restart.
- **Verification Criterion:** Adjusting matrix sliders interactively recolors the 3D cockpit HUD elements in real time on the web, generates valid XML config, and dynamically shifts colors inside the running game viewport via the EdEzCheese hook.

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

## Stage 19.4: Squadron War Room, Tactical Wing Coordination & User-Side AtlasBot Integration
- **Objective:** Provide a real-time collaborative tactical canvas for squadron fleet movements, system expansion, and BGS operations, alongside a dedicated user-side Discord Bot ("AtlasBot") integration with step-by-step documentation for commander and squadron servers.
- **Specific Tasks:**
  1. Build collaborative map canvas powered by WebSockets allowing squadron leaders to draw tactical arrows, drop rally beacons, and designate priority targets.
  2. Ingest faction influence percentages from Ananke `GET /api/bgs/faction-state` across all squadron home systems.
  3. Display BGS tick tracker: predict next daily server tick time and track daily mission influence shifts.
  4. Implement Squadron asset tracker: display all squadron member Fleet Carriers, locations, and Tritium stocks on a single unified tactical map.
   5. Architect User-Side AtlasBot & Webhook Gateway:
     - Provide a self-service AtlasBot configuration dashboard in Atlas (`/settings/integrations/discord`).
     - Support user-supplied Discord Bot Tokens or standard channel Webhook URLs with zero backend server hosting overhead.
     - Author comprehensive end-user setup documentation (`docs/integrations/ATLASBOT_SETUP.md`) detailing: (a) Creating a Discord Application named "AtlasBot" on the Discord Developer Portal, (b) Enabling Bot Privileged Gateway Intents, (c) Granting channel permissions, and (d) Pasting the token/webhook into Atlas.
     - Support automated Discord rich embed alerts: Fleet Carrier Jump Countdown, Low Tritium Warnings, BGS Tick Shifts, Thargoid War Invasions, and Undiscovered Earth-Like World discoveries.
     - Implement In-Browser Slash Command Emulator & Tester: allow commanders to test `/system`, `/station`, `/commodity`, `/route`, and `/status` queries directly inside the Atlas web dashboard before sending commands to Discord.
     - Implement Interactive Tactical Time-Scrubber: UI timeline slider connecting to Ananke's `/stream/tactical` allowing commanders to scrub backward over hours or days of squadron movements, carrier hops, and wing patrols on the WebGPU map.
     - Implement Ananke Interactive Discord Slash Commands for AtlasBot:
       * `/system <name>`: Instantly query and render Ananke stellar data, coordinates, economy, and allegiance in a Discord embed.
       * `/station <name>`: Query station facilities, landing pad sizes (S/M/L), and market freshness.
       * `/commodity <name> [near]`: Search lowest sell and highest buy market prices within range via Ananke `/api/market/commodities`.
       * `/route <origin> <dest> [range]`: Rapid A* or Neutron route summary directly in Discord chat.
       * `/status <cmdr>`: Pull verified player status, current star system, ship hull/shield state, and active carrier balances.
- **Verification Criterion:** A user following `ATLASBOT_SETUP.md` configures their Discord webhook/bot in Atlas, triggering rich alerts, testing slash commands in the web tester, and scrubbing historical squadron fleet trajectories on the WebGPU canvas.
