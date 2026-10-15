# Atlas - Phase 16: In-Browser Predictive AI & Exploration Assistant
**Phase:** 16 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `specs/hardware_and_ai_intelligence.md`, `specs/website_features_specification.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 16.1: In-Browser ONNX Web / WASM Neural Model Runtime
- **Objective:** Deploy a lightweight, high-performance ONNX neural inference runtime executing 100% locally in the user's browser via WebAssembly and WebGPU.
- **Specific Tasks:**
  1. Integrate `onnxruntime-web` with WebAssembly (WASM) multithreading and WebGPU execution provider fallbacks.
  2. Implement progressive model asset loader with gzip compression (<15MB total model bundle) and IndexedDB caching.
  3. Validate sub-50ms inference latency on standard desktop and mobile hardware.
  4. Ensure 100% client-side offline operation without sending user telemetry or data to external servers.
- **Verification Criterion:** Initializing the neural engine downloads and compiles the ONNX model locally, performing test inference in under 30ms.

---

## Stage 16.2: Earth-Like & High-Value Body Probability Classifier
- **Objective:** Predict the likelihood of undiscovered Earth-Like Worlds (ELW), Water Worlds, and Ammonia Worlds from partial FSS star telemetry.
- **Specific Tasks:**
  1. Train and quantize decision-forest/neural classifier using astronomical variables: Star Spectral Class, System Age, Luminosity, Metallicity, and Habitable Zone ($AU$) boundaries.
  2. Ingest FSS honk event (total body count and primary star parameters) and compute Bayesian probability of ELW occurrence.
  3. Render estimated credit valuation: compute anticipated exploration payout if system contains predicted high-value bodies.
  4. Highlight recommended orbital distances ($AU$ and $Ls$) where high-value bodies are mathematically most likely to orbit.
- **Verification Criterion:** Entering star spectral class `F` with 28 celestial bodies produces an estimated habitable zone range and probability score for ELW / terraformable candidates.

---

## Stage 16.3: Exobiology Genus Prediction & Payout Optimizer
- **Objective:** Predict exobiological species types and payout multipliers on landable atmospheric planets based on stellar and atmospheric data.
- **Specific Tasks:**
  1. Catalog all known exobiology genera (e.g., *Stratum*, *Tubus*, *Cactoida*, *Fonticulua*, *Concha*, *Tussock*) and their environmental prerequisites (Atmosphere type, Surface Temperature, Volcanism, Gravity).
  2. Build neural classifier matching planetary telemetry against biological occurrence criteria.
  3. Compute estimated Vista Genomics payout including the 5x First Discovery bonus multiplier (e.g., up to 95,000,000 CR for *Stratum Tectonicas*).
  4. Rank system planets by exploration time-efficiency (CR earned per minute of surface travel).
- **Verification Criterion:** Inputting a High Metal Content world with Carbon Dioxide atmosphere and 0.3G surface gravity flags probable *Stratum* presence with exact credit payout estimates.

---

## Stage 16.4: Exploration Anomaly Detector & Rare System Alerter
- **Objective:** Automatically flag astronomically anomalous star systems (e.g., hyper-dense clusters, extreme eccentricities, landable high-G worlds, fast rotators).
- **Specific Tasks:**
  1. Implement rule-based and anomaly scoring algorithms evaluating incoming system data against galactic statistical percentiles (>99.9th percentile).
  2. Flag specific rare conditions: Landable planets with gravity $> 3.0G$, rotational periods $< 0.1$ days (fast rotators), extreme orbital inclinations ($> 85^\circ$), and close-binary contact stars.
  3. Generate distinctive visual alert badges in the system header: "Rare Scientific Phenomenon Detected".
  4. Support bookmarking and submitting verified anomalies to the Canonn science codex.
- **Verification Criterion:** Scanning a planet with 8.9G surface gravity triggers an immediate "Extreme Gravity Anomaly" alert with safety landing protocols.
