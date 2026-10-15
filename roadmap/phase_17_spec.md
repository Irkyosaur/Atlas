# Atlas - Phase 17: Deep Defense, Micro-PoW Bot Defense & DRM
**Phase:** 17 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/deep_security_and_anti_cloning.md`, `specs/frontend_anti_reverse_engineering.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 17.1: Cloudflare Turnstile & Micro-PoW Challenge Generator
- **Objective:** Defend public endpoints and map tile queries from automated scrapers using non-intrusive Turnstile checks and client-side proof-of-work.
- **Specific Tasks:**
  1. Integrate Cloudflare Turnstile token validation on all sensitive API routes.
  2. Implement an in-browser WebAssembly micro-Proof-of-Work (micro-PoW) challenge generator: require clients to solve a fast cryptographic hash puzzle (<15ms compute on client) for high-frequency queries.
  3. Validate PoW nonce on the server before dispatching expensive 3D spatial queries or Ananke pathfinding jobs.
  4. Implement IP-reputation and rate-limiting sliding window (token bucket) on edge reverse proxies.
- **Verification Criterion:** Automated HTTP clients without WASM PoW computation capabilities receive HTTP 429 / 403 challenge responses, while legitimate browsers solve challenges invisibly with zero user friction.

---

## Stage 17.2: Dynamic 30s HMAC Nonce Challenge Architecture
- **Objective:** Prevent API scraping and unauthorized direct proxying by requiring short-lived cryptographic HMAC nonces signed with session-bound keys.
- **Specific Tasks:**
  1. Generate rotating session keypairs during client initial handshake.
  2. Implement rolling 30-second HMAC-SHA256 signature generation attached to every outbound request header (`X-Atlas-Signature`, `X-Atlas-Timestamp`).
  3. Validate signature freshness on server: reject requests with timestamps older than 30 seconds or invalid cryptographic digests.
  4. Implement replay attack defense: cache used nonces in Redis / memory for 60 seconds.
- **Verification Criterion:** Replaying an intercepted API request after 35 seconds returns HTTP 401 Unauthorized due to expired HMAC timestamp.

---

## Stage 17.3: Encrypted In-Memory Asset & Shaders Loader
- **Objective:** Protect proprietary WGSL shaders, Star catalogs, and asset bundles from straightforward offline scraping and direct extraction.
- **Specific Tasks:**
  1. Encrypt core WGSL shader files and binary asset blobs using AES-128-CBC with dynamically delivered key chunks.
  2. Decrypt assets directly in browser memory at runtime using Web Crypto API (`crypto.subtle`).
  3. Feed decrypted WGSL text directly into `device.createShaderModule()` without exposing cleartext blobs to disk or DOM.
  4. Obfuscate WebGL/WebGPU pipeline creation routines to prevent simple debugging inspection.
- **Verification Criterion:** Inspecting network payloads for shader assets shows encrypted binary noise, while the WebGPU renderer successfully compiles and executes the decrypted shaders in memory.

---

## Stage 17.4: Environment Fingerprinting & Headless Scraper Traps
- **Objective:** Detect headless browsers (Puppeteer, Playwright, Selenium) and automated scrapers attempting to mirror the platform.
- **Specific Tasks:**
  1. Implement client-side environment fingerprinting checks: `navigator.webdriver`, missing plugins, CDP (Chrome DevTools Protocol) artifacts, and anomalous canvas render timings.
  2. Deploy invisible honeypot DOM elements and fake API triggers: scrapers interacting with hidden trap fields are instantly blacklisted.
  3. Implement progressive rate degradation: instead of hard-blocking scrapers, silently inject delayed responses and randomized coordinate noise to poison scraped datasets.
  4. Log fingerprint telemetry to security sentinel log.
- **Verification Criterion:** Launching a headless Chromium instance to scrape system data triggers the headless detection trap, returning poisoned coordinates while keeping production server resources intact.
