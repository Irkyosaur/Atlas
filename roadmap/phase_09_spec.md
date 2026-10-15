# Atlas - Phase 09: CAPI Linkage, CMDR Dossier & Fleet Ledger
**Phase:** 09 of 20  
**Parent Roadmap:** [master_roadmap.md](file:///D:/1/atlas/roadmap/master_roadmap.md)  
**Document Source References:** `docs/player_account_database_architecture.md`, `specs/deep_security_and_anti_cloning.md`  
**Target Completion Standard:** 4 Atomic Stages (Golden Ratio), Zero Gaps, Verifiable Deliverables.

---

## Stage 9.1: Frontier CAPI OAuth2/PKCE Flow, Token Encryption & Atlas API Key Generator
- **Objective:** Establish secure OAuth2 authentication with Frontier Developments' Companion API (CAPI) using PKCE and isolated token encryption, and provide an Atlas API Key generator for EdEzCheese telemetry ingestion.
- **Specific Tasks:**
  1. Implement OAuth2 authorization code flow with Proof Key for Code Exchange (PKCE) (`code_verifier` / `code_challenge`).
  2. Exchange authorization code for Frontier access and refresh tokens.
  3. Encrypt all refresh and access tokens using AES-256-GCM before writing to the isolated `player-master.db` (`capi_tokens` table) with zero leakage to logs or `galaxy-master.db`.
  4. Implement User Settings API Key Manager (`/settings/api-keys`): generate cryptographically secure Atlas API keys (`atk_live_<hex>`) with BLAKE3 hashing, scoped permissions (`telemetry:write`, `player:read`), and revocation support stored in `player-master.db` (`api_keys` table).
  5. Implement automated token refresh worker with exponential backoff on Frontier API rate limits (HTTP 429).
- **Verification Criterion:** Authenticating with Frontier Developments successfully stores encrypted tokens in `player-master.db`, and generating an Atlas API key produces a valid key hash and prefix in `player-master.db` verifiable by Ananke.

---

## Stage 9.2: CMDR Dossier, Verified Ranks & Exploration Badges
- **Objective:** Present a comprehensive commander profile displaying verified ranks, financial net worth, and milestones.
- **Specific Tasks:**
  1. Fetch player profile from CAPI `/profile` endpoint: Commander Name, Credits, Loan, Debt, and Rank progressions.
  2. Display elite progression bars: Combat, Trade, Exploration, CQC, Mercenary, and Exobiologist ranks (Aimless to Elite V).
  3. Render verified badge icon indicating Frontier CAPI-validated identity (preventing spoofed commander names).
  4. Display Superpower allegiances and naval ranks: Federation (None to Admiral) and Empire (None to King).
- **Verification Criterion:** Commander profile page shows accurate real-time credit balance and exact rank tier percentages matching in-game right-hand cockpit panel.

---

## Stage 9.3: Multi-Station Fleet Inventory & Ship Transfer Cost Estimator
- **Objective:** Catalog the commander's entire ship fleet across all galactic starports with ship status, locations, and transfer calculations.
- **Specific Tasks:**
  1. Ingest `/fleet` CAPI payload into `cmdr_ships` table in `player-master.db`.
  2. Render interactive Fleet Gallery showing hull icons, custom ship names, ship IDs, current system, and parked starport.
  3. Calculate ship transfer times and credit costs to the player's current system based on distance: $\text{Cost} = \text{Ship Value} \times d \times K$.
  4. Display module outfitting breakdown for each remotely stored vessel.
- **Verification Criterion:** Fleet dashboard lists all owned ships, flagging which vessel is currently active and calculating exact transfer duration for remote ships.

---

## Stage 9.4: Fleet Carrier Remote Management & Market Tariffs
- **Objective:** Remotely inspect and configure the commander's personal Fleet Carrier via CAPI integration.
- **Specific Tasks:**
  1. Read `/fleetcarrier` CAPI data: Carrier Name, Callsign, Current System, Docking Access (All, Friends, Squadron, None), and Notorious Docking status.
  2. Display carrier finances: Bank balance, reserved maintenance allocation, and available funds.
  3. Implement remote tariff slider: adjust market trade tariffs (0% to 100%) and view commodity buy/sell orders.
  4. Provide carrier jump status alerts: track pending jump countdowns and destination coordinates.
- **Verification Criterion:** Carrier management screen reflects live carrier system location, docking access permissions, and financial reserve levels.
