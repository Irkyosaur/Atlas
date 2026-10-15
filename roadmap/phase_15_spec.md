# Atlas - Phase 15: Stream Deck, Gamepad API & Physical Sim-Rig Hardware
**Phase:** 15 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/hardware_and_ai_intelligence.md`, `specs/complete_peripheral_tools_replacement.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 15.1: Elgato Stream Deck Plugin & Dynamic LCD Key Icons
- **Objective:** Build an official Elgato Stream Deck plugin displaying dynamic real-time cockpit status and 1-key navigation actions directly on LCD keys.
- **Specific Tasks:**
  1. Author Stream Deck plugin manifest and Node.js / TypeScript daemon communicating with Atlas WebSocket API (`ws://127.0.0.1:8999`).
  2. Implement dynamic 72x72 SVG icon generator rendering real-time ship status: Jump Counter, Current Fuel %, Nearest Fuel Star distance, Next Waypoint name.
  3. Support LCD key actions: 1-press copy next waypoint to clipboard, toggle night mode, center camera on current system, clear navigation route.
  4. Provide pre-built Stream Deck profile files for Stream Deck Standard (15 keys), XL (32 keys), and Plus (dials & touch strip).
- **Verification Criterion:** Pressing a physical Stream Deck key copies the next system name and updates the LCD display with remaining jump count and fuel status.

---

## Stage 15.2: HTML5 Gamepad API & HOTAS Galaxy Navigation
- **Objective:** Control the 3D galaxy and system map using physical flight sticks (HOTAS / HOSAS), throttles, and gamepads directly inside the browser.
- **Specific Tasks:**
  1. Implement HTML5 Gamepad API listener detecting connected controllers (VKB, Virpil, Thrustmaster, Logitech, Xbox/PlayStation controllers).
  2. Map analog axis inputs to 3D camera controls: Pitch/Yaw for camera rotation, Throttle/Z-axis for smooth logarithmic camera zoom, Hat switch for panning.
  3. Support deadzone adjustments, axis inversion toggles, and exponential sensitivity response curves.
  4. Implement button mapping for map functions: Select Star, Open System Orrery, Reset Camera, and Center Ship.
- **Verification Criterion:** Moving a physical flight stick smoothly orbits the 3D galaxy view with zero mouse input, respecting configured deadzones and sensitivity.

---

## Stage 15.3: Sim-Rig Secondary Screen Dashboards & PWA Wake-Lock
- **Objective:** Provide dedicated multi-screen telemetry layouts for multi-monitor simulator setups with persistent display sleep prevention.
- **Specific Tasks:**
  1. Implement Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent display sleep during hands-off flight sessions.
  2. Build specialized dashboard modes: "Combat MFD" (shields, hull, hostile target lock), "Mining MFD" (cargo hold, refinery bins, prospector limpets), and "Explorer MFD" (FSS progress, DSS values).
  3. Support multi-window popout: allow popping out individual HUD panels into separate borderless browser windows for positioning on auxiliary screens.
  4. Ensure persistent window layout state restoration via LocalStorage.
- **Verification Criterion:** Launching the Explorer MFD in an auxiliary window prevents monitor standby and updates telemetry continuously during gameplay.

---

## Stage 15.4: Procedural Cockpit Sound Effects & WebAudio Synthesizer
- **Objective:** Deliver immersive audio feedback using procedural WebAudio synthesis, matching authentic Elite Dangerous cockpit soundscapes.
- **Specific Tasks:**
  1. Implement WebAudio synthesis engine generating custom procedural sound waveforms without requiring external MP3/WAV assets.
  2. Synthesize distinct UI interactions: holographic button clicks, rotary dial ticks, drawer slides, and error buzzers.
  3. Synthesize environmental tones: subtle cockpit ambient drone, frame shift drive charge hum, and planetary proximity alarms.
  4. Include master volume controls, dynamic range compression, and mute toggles.
- **Verification Criterion:** Interacting with UI sliders and buttons generates rich procedural audio tones directly rendered by the browser audio context.
