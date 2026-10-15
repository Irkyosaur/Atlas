# Atlas - Phase 12: In-Cockpit Native Bridge & Touch HUD
**Phase:** 12 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/native_client_and_web_integration.md`, `specs/complete_peripheral_tools_replacement.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 12.1: Local Native IPC WebSocket Bridge (`ws://127.0.0.1:8999`)
- **Objective:** Establish low-latency bidirectional IPC between Atlas web client and the local EDill/EdEzCheese companion service.
- **Specific Tasks:**
  1. Implement client WebSocket manager connecting to local bridge endpoint `ws://127.0.0.1:8999`.
  2. Implement protocol handshake with mutual authentication token to prevent unauthorized local processes from intercepting bridge commands.
  3. Support bi-directional heartbeat (ping/pong) every 2 seconds with automatic reconnection logic.
  4. Stream real-time in-process memory state: exact ship 3D velocity vector, pip states, and target lock coordinates.
- **Verification Criterion:** Opening Atlas web dashboard with native bridge running establishes authenticated WebSocket connection and receives real-time flight telemetry.

---

## Stage 12.2: Reverse Waypoint Injection & In-Game Target Lock
- **Objective:** Allow clicking any system, station, or body in Atlas web map to automatically set the active target destination in-game.
- **Specific Tasks:**
  1. Author IPC protocol command `SET_TARGET_DESTINATION` payload containing system name and 64-bit system address (`id64`).
  2. Implement native bridge handler interfacing with game memory / Windows input pipeline to paste target name and press lock hotkey.
  3. Add confirmation feedback in Atlas web UI: "Target Locked in Nav Computer: [System Name]".
  4. Support multi-hop route auto-advancing: upon detecting high-wake jump completion, native bridge automatically locks the next route waypoint without user intervention.
- **Verification Criterion:** Clicking "Plot to Sol" in Atlas web browser instantly focuses the navigation target in the Elite Dangerous cockpit view.

---

## Stage 12.3: Tablet/iPad Glass Cockpit Touch Layout
- **Objective:** Provide a dedicated touch-optimized secondary screen layout for tablets, iPads, and secondary touch monitors mounted on sim rigs.
- **Specific Tasks:**
  1. Author responsive touch-first CSS layout with large touch targets, high contrast amber UI, and zero scroll requirement.
  2. Implement touch interactive MFD (Multi-Function Display) buttons: Nav Map, System Map, Comms, Bio Scanner, Cargo, and Subsystems.
  3. Include full-screen PWA mode (Progressive Web App) with screen wake-lock to prevent tablet screen timeout during long exploration sessions.
  4. Add haptic feedback vibration triggers for compatible mobile touch devices on button presses.
- **Verification Criterion:** Opening Atlas on an iPad Pro displays an authentic glass cockpit MFD that responds to finger touches with instant tab switching and wake lock active.

---

## Stage 12.4: High-G Touchdown Assistant & Exobiology Distance Ring
- **Objective:** Provide critical landing safety telemetry and exobiology distance verification to prevent crashes and wasted on-foot exploration time.
- **Specific Tasks:**
  1. Compute descent rate vs surface gravity ($G$): trigger visual and audible warning alarms when downward vertical velocity exceeds safe thruster counter-thrust threshold.
  2. Display visual descent attitude ladder indicating glide angle, pitch, and altitude above surface.
  3. Implement exobiology colony radius ring: upon sampling a biological genus (e.g., *Aleoida*, *Frutexa*), display an expanding real-time distance ring showing meters traveled from the previous sample point.
  4. Display status indicator turning green only when minimum genetic divergence distance (e.g., 500m / 800m / 1,000m) is achieved.
- **Verification Criterion:** Approaching a 4.5G planet displays prominent High-G warnings, and on-foot bio sampling visually tracks distance until the next valid sample threshold is reached.
