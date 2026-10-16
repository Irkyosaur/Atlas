# Atlas Lightweight EDMC Companion Plugin (`atlas-edmc`)

**Stage 11.3 ? Community Broadcast Relay & Lightweight Atlas EDMC Plugin (Standard Data Only)**

`atlas-edmc` is an optional, ultra-lightweight Python 3 plugin for [EDMarketConnector (EDMC)](https://github.com/EDCD/EDMarketConnector) designed for Commanders who prefer a traditional EDMC plugin workflow alongside or instead of Atlas's in-browser HTML5 File System Access API Journal Watcher.

---

## Security & Scope Architecture

1. **Dedicated `ANANKE_EDMC_KEY` (`X-Api-Key` Header)**
   - Uses a scoped **Ananke EDMC API Key** (`ANANKE_EDMC_KEY`) distinct from your full Atlas account token.
   - Authenticates strictly against `POST /api/edmc/journal` with `X-Atlas-Scope: edmc-standard-only`.
2. **Standard Telemetry Only (`galaxy-master.db` & `player-master.db`)**
   - **Celestial & Market Events (`galaxy-master.db`):** `FSDJump`, `Scan`, `Commodity` / `Market`, `StationServices`, `Location`, `Docked`.
   - **Basic Commander Profile (`player-master.db`):** Commander Name, Current Ship Type/Name/Ident, and Credit Balance.
   - **64-Bit ID Preservation (`id64`):** Preserves `SystemAddress` and `MarketID` as exact strings prior to serialization so JavaScript/JSON consumers never suffer IEEE 754 float truncation.
3. **Zero Invasive Hooks**
   - Intentionally excludes all advanced native client features (no VFS multibox sandboxing, no D3D11 overlay hooks, no FDR black-box trajectory recording, and zero process memory writing).

---

## Installation

1. Copy the `atlas-edmc` folder into your EDMC `plugins/` directory:
   - Windows: `%LOCALAPPDATA%\EDMarketConnector\pluginstlas-edmc\`
2. Launch EDMarketConnector and open **File -> Settings -> Atlas-EDMC**.
3. Paste your dedicated **Ananke EDMC API Key** (`ANANKE_EDMC_KEY`) and click **OK**.
