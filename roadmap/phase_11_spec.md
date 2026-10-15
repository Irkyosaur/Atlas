# Atlas - Phase 11: Web-Native Journal Sync (Zero-Install EDMC)
**Phase:** 11 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/community_tools_replacement_blueprint.md` (EDMC replacement), `specs/website_features_specification.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 11.1: HTML5 File System Access API & Journal Directory Watcher
- **Objective:** Enable direct in-browser live streaming of Elite Dangerous journal logs without installing Python, third-party executables, or EDMC plugins, with full support for multi-account VFS directories.
- **Specific Tasks:**
  1. Implement HTML5 `showDirectoryPicker()` to request user authorization to the local Elite Dangerous journal folder (`Saved Games/Frontier Developments/Elite Dangerous`).
  2. Store directory handle in IndexedDB for seamless persistent re-connection across browser restarts.
  3. Implement active directory polling worker checking for updated `Journal.*.log` files and `Status.json` modifications every 250ms.
  4. Build file pointer delta reader: stream only new JSON lines appended to the current active journal file to minimize memory and CPU overhead.
  5. Add Multi-Account / Multi-Box VFS Directory Ingestion: support scanning and simultaneous multi-directory tailing across EdEzCheese's virtualized commander subfolders (`Saved Games/.../commander_<id>/`), streaming live telemetry from up to 4 concurrent running clients into a unified multi-ship fleet matrix.
- **Verification Criterion:** Selecting the Journal root directory immediately detects all virtualized commander folders, tailing multiple active log files simultaneously and streaming multi-commander in-game events directly into the browser console.

---

## Stage 11.2: Real-Time Cockpit Telemetry HUD & Status.json Poller
- **Objective:** Replicate cockpit instrument panel status in real time using the game's `Status.json` telemetry stream.
- **Specific Tasks:**
  1. Decode bitwise flags from `Status.json` (Flags & Flags2): Landing Gear, Cargo Scoop, Lights, Flight Assist, Hardpoints, Shields Up, Supercruise, Flight In Danger, Overheating, Low Fuel, In SRV, On Foot.
  2. Render animated SVG cockpit status indicators matching authentic orange Cobra HUD styling.
  3. Track fuel reservoir (`Fuel.FuelMain`, `Fuel.FuelReservoir`), current pips allocation (SYS / ENG / WEP), and active firegroup.
  4. Display planetary approach telemetry: Altitude ($m$), Heading ($\text{deg}$), Latitude, Longitude, and surface gravity ($G$).
- **Verification Criterion:** Deploying cargo scoop or landing gear in-game toggles the corresponding HUD indicator on the Atlas web dashboard within 500ms.

---

## Stage 11.3: Community Broadcast Relay & Lightweight Atlas EDMC Plugin (Standard Data Only)
- **Objective:** Provide opt-in community network broadcasting to EDDN, and author the lightweight Atlas EDMC companion plugin utilizing a dedicated Ananke EDMC API key.
- **Specific Tasks:**
  1. Author the lightweight Atlas EDMC companion plugin (`atlas-edmc` Python plugin):
     - Configured via a dedicated **EDMC API Key** (`ANANKE_EDMC_KEY` / `X-Api-Key`) distinct from the full Atlas API Key.
     - Strictly constrained scope: Dispatches standard celestial telemetry (`FSDJump`, `Scan`, `Commodity`, `StationServices`) to Ananke `POST /api/edmc/journal` for `galaxy-master.db`, and basic player info (commander name, current ship, credit balance) for `player-master.db`.
     - Intentionally excludes all advanced in-process features (VFS multibox sandboxing, D3D11 hooks, FDR black-box trajectories, and memory writing) to keep the plugin ultra-lightweight and secure.
  2. Implement EDDN schema compliant JSON payload builder for `FSDJump`, `Scan`, `Commodity`, and `NavBeaconScan` events.
  3. Implement opt-in privacy toggles: allow users to enable or disable public EDDN forwarding, private system anonymization, and test mode.
  4. Connect to EDDN ZeroMQ gateway endpoint using direct secure HTTP POST relay.
  5. Include upload statistics tracker: count total events forwarded, systems discovered, and market stations updated during session.
- **Verification Criterion:** Performing an FSD jump with EDDN broadcast enabled validates payload against EDDN V2 schema and logs successful submission, and testing the Atlas EDMC plugin authenticates with `X-Api-Key` to successfully ingest standard events without exposing advanced avionics endpoints.

---

## Stage 11.4: Real-Time Audio Cue Synthesizer & Speech Announcements
- **Objective:** Synthesize authentic cockpit computer voice alerts (COVAS) and procedural audio cues upon triggering game events.
- **Specific Tasks:**
  1. Integrate Web Speech API (`speechSynthesis`) with customized robotic pitch and rate filters mimicking cockpit computer announcements.
  2. Implement audio voice triggers for key events: "High-Value Body Detected" (Terraformable / ELW), "FSD Supercharged", "High-G Planet Approach", "Low Fuel Warning".
  3. Synthesize procedural sound effects using WebAudio API (chimes, warning klaxons, frequency pulses).
  4. Add audio control settings: volume sliders, individual alert enable/disable toggles, and voice gender selection.
- **Verification Criterion:** Triggering a `Scan` event for an Earth-Like World produces an audible voice notification and confirmation tone through the browser.
