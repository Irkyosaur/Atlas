# Atlas - Phase 18: Covert Anti-Clone Telemetry Sentinel (NO ORB)
**Phase:** 18 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/covert_phone_home_telemetry.md`, `specs/deep_security_and_anti_cloning.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.  
**STRICT ARCHITECTURAL INVARIANT:** **The Orb (`unauthorized-daemon.service` / `:8890` IPC) is strictly PROHIBITED.** All alerting must use direct standalone webhooks only.

---

## Stage 18.1: Covert Origin Validation & Rogue Domain Traps
- **Objective:** Detect when Atlas frontend code is hosted on unauthorized domains, cloned repositories, or third-party mirrors.
- **Specific Tasks:**
  1. Implement subtle origin check routines distributed across multiple non-obvious modules (e.g., inside color utility and math calculation functions).
  2. Validate current `window.location.hostname` against authorized whitelist (`atlas-space.org`, `atlas-space.org`, `localhost`, `127.0.0.1`).
  3. Evade simple string searching: obfuscate origin strings using XOR byte arrays or multi-character char code arrays.
  4. Trigger silent trap state flags when unauthorized domain execution is confirmed.
- **Verification Criterion:** Running the frontend application on an unauthorized domain (e.g., `clone-atlas.fake`) successfully triggers internal trap state flags without throwing immediate loud JS errors.

---

## Stage 18.2: Disguised Font Prefetch Beacons & Covert Telemetry Exfiltration
- **Objective:** Silently phone home clone alerts disguised as ordinary browser network activities (such as CSS font prefetching or favicon requests).
- **Specific Tasks:**
  1. Construct lightweight telemetry payload: unauthorized domain, user agent, client IP, timestamp, and referring URL.
  2. Encode payload into base64 URL-safe parameters disguised as standard font weight queries (e.g., `GET /fonts/space-mono-v12.woff2?h=<encoded_data>&w=400`).
  3. Execute beacon dispatch via dynamic `<link rel="prefetch">` or low-priority `navigator.sendBeacon()` calls during idle browser ticks.
  4. Ensure beacon calls operate silently: failure or blockage never interrupts normal UI execution.
- **Verification Criterion:** When deployed on a rogue domain, the client generates a covert network beacon query containing encoded rogue domain telemetry disguised as a font resource request.

---

## Stage 18.3: Silent Camera NaN Collapse & Subtle Sabotage Mechanisms
- **Objective:** Sabotage rogue clones subtly by corrupting the 3D projection matrix with `NaN` values, rendering the application useless without obvious error causes.
- **Specific Tasks:**
  1. Implement delayed sabotage timer: allow the cloned site to appear functional for the first 60–120 seconds of user interaction before degrading.
  2. Silently inject mathematical division by zero into the WebGPU camera projection matrix calculations:
     $$\text{matrix}[14] = \text{matrix}[14] / 0.0 \implies \text{NaN}$$
  3. Cause all 3D stars, planets, and UI splines to collapse into coordinate singularity $(0, 0, 0)$ or vanish from the screen.
  4. Ensure developer console output remains clean without revealing the anti-clone sabotage trigger mechanism.
- **Verification Criterion:** On an unauthorized domain, the 3D galaxy canvas smoothly collapses to black after 90 seconds, rendering the cloned map completely non-functional.

---

## Stage 18.4: Direct Admin Alerting Webhooks (Strictly Direct, Zero Orb)
- **Objective:** Dispatch instant direct alerts to project administrators upon clone detection without relying on any external daemon or forbidden Orb services.
- **Specific Tasks:**
  1. Configure standalone server-side beacon receiver endpoint (`POST /api/telemetry/beacon`).
  2. Implement direct Discord / Telegram / Matrix administrative webhook dispatch with strict rate limiting (max 1 alert per unique rogue domain per hour).
  3. Format rich alert embed: Rogue Domain, Origin IP, Geo-IP location, User Agent, First Detected Timestamp.
  4. **Strict Architectural Invariant Enforcement:** Verify zero references to `unauthorized-daemon.service`, port `8890`, or Orb IPC endpoints anywhere in the codebase.
- **Verification Criterion:** Rogue domain detection triggers a direct Discord webhook alert to the developer channel within 2 seconds, completely bypassing The Orb.
