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
  2. Validate current `window.location.hostname` against authorized whitelist (`localhost`, `localhost`, `localhost`, `127.0.0.1`).
  3. Evade simple string searching: obfuscate origin strings using XOR byte arrays or multi-character char code arrays.
  4. Trigger silent trap state flags when unauthorized domain execution is confirmed.
- **Verification Criterion:** Running the frontend application on an unauthorized domain (e.g., `clone-atlas.fake`) successfully triggers internal trap state flags without throwing immediate loud JS errors.

---

## Stage 18.2: Passive Asset Validation & Domain Integrity Telemetry Dispatch
- **Objective:** Report domain integrity compliance alerts via standard browser telemetry channels (such as resource prefetching or navigator.sendBeacon).
- **Specific Tasks:**
  1. Construct lightweight diagnostic telemetry payload: active domain, user agent, client timestamp, and referring URL.
  2. Encode payload into URL-safe diagnostic parameters passed to authorized telemetry endpoints.
  3. Execute beacon dispatch via dynamic `<link rel="prefetch">` or low-priority `navigator.sendBeacon()` calls during idle browser ticks.
  4. Ensure telemetry calls operate silently and non-intrusively: network failures or tracking blockers never interrupt normal cartography UI execution.
- **Verification Criterion:** When deployed on an unverified domain, the client issues a structured compliance telemetry request to the configured audit endpoint without throwing console exceptions.

---

## Stage 18.3: Safe Boundary Fallbacks & Visual Projection Safeties
- **Objective:** Protect proprietary cartography assets on unverified domains by applying safe rendering limits and graceful fallback state.
- **Specific Tasks:**
  1. Implement timed graceful fallback: allow the application to complete initial load before transitioning to demo/restricted visual mode.
  2. Apply safe rendering boundary constraints to the WebGPU projection matrix calculations when running outside authorized domains.
  3. Safely transition the WebGPU star and planet rendering pipeline into a simplified, bounded 2D preview mode.
  4. Maintain clean application state without crashing browser graphics contexts or leaking internal security checks.
- **Verification Criterion:** On an unverified domain, the 3D canvas safely transitions into restricted demo mode according to configured policy.

---

## Stage 18.4: Direct Admin Alerting Webhooks (Strictly Direct, Zero Orb)
- **Objective:** Dispatch instant direct alerts to project administrators upon clone detection without relying on any external daemon or forbidden Orb services.
- **Specific Tasks:**
  1. Configure standalone server-side beacon receiver endpoint (`POST /api/telemetry/beacon`).
  2. Implement direct Discord / Telegram / Matrix administrative webhook dispatch with strict rate limiting (max 1 alert per unique rogue domain per hour).
  3. Format rich alert embed: Rogue Domain, Origin IP, Geo-IP location, User Agent, First Detected Timestamp.
  4. **Strict Architectural Invariant Enforcement:** Verify zero references to `unauthorized-daemon.service`, port `8890`, or Orb IPC endpoints anywhere in the codebase.
- **Verification Criterion:** Rogue domain detection triggers a direct Discord webhook alert to the developer channel within 2 seconds, completely bypassing The Orb.
