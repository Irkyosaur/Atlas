# -*- coding: utf-8 -*-
"""
Location: atlas/plugins/atlas-edmc/load.py
Stage 11.3: Lightweight Atlas EDMC Companion Plugin (Standard Data Only)

Strictly constrained scope:
- Configured via a dedicated EDMC API Key (ANANKE_EDMC_KEY / X-Api-Key) distinct from the full Atlas API Key.
- Dispatches standard celestial telemetry (FSDJump, Scan, Commodity, StationServices) to Ananke
  POST /api/edmc/journal for galaxy-master.db, and basic player info (commander name, current ship,
  credit balance) for player-master.db.
- Preserves 64-bit SystemAddress and MarketID as string-safe identifiers (id64).
- Intentionally excludes all advanced in-process features (VFS multibox sandboxing, D3D11 hooks,
  FDR black-box trajectories, and memory writing) to keep the plugin ultra-lightweight and secure.
"""

from __future__ import annotations

import json
import os
import queue
import threading
import tkinter as tk
from tkinter import ttk
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

PLUGIN_NAME = "Atlas-EDMC"
PLUGIN_VERSION = "1.1.3"
DEFAULT_ANANKE_ENDPOINT = "https://api.atlas-ed.space/api/edmc/journal"

# Strictly allowed standard journal events for galaxy-master.db & player-master.db
ALLOWED_STANDARD_EVENTS = {
    "FSDJump",
    "Scan",
    "Commodity",
    "Market",
    "StationServices",
    "Location",
    "Docked",
    "LoadGame",
    "Statistics",
}

# Try importing EDMC host modules; gracefully fallback for standalone verification/testing
try:
    from config import config  # type: ignore
    import myNotebook as nb  # type: ignore
except ImportError:
    config = None
    nb = None


class AtlasEdmcConfigStore:
    """Lightweight wrapper around EDMC config with environment fallback."""

    KEY_API = "atlas_edmc_ananke_api_key"
    KEY_ENDPOINT = "atlas_edmc_ananke_endpoint"
    KEY_ENABLED = "atlas_edmc_relay_enabled"
    KEY_ANON = "atlas_edmc_anonymize_private"

    def __init__(self) -> None:
        self.api_key: str = os.environ.get("ANANKE_EDMC_KEY", "")
        self.endpoint: str = os.environ.get("ANANKE_EDMC_ENDPOINT", DEFAULT_ANANKE_ENDPOINT)
        self.enabled: bool = True
        self.anonymize_private: bool = False
        self.load()

    def load(self) -> None:
        if config is None:
            return
        try:
            saved_key = config.get_str(self.KEY_API)
            if saved_key:
                self.api_key = saved_key.strip()
            saved_endpoint = config.get_str(self.KEY_ENDPOINT)
            if saved_endpoint:
                self.endpoint = saved_endpoint.strip()
            saved_enabled = config.get_int(self.KEY_ENABLED)
            if saved_enabled is not None:
                self.enabled = bool(saved_enabled)
            saved_anon = config.get_int(self.KEY_ANON)
            if saved_anon is not None:
                self.anonymize_private = bool(saved_anon)
        except Exception:
            pass

    def save(self) -> None:
        if config is None:
            return
        try:
            config.set(self.KEY_API, self.api_key.strip())
            config.set(self.KEY_ENDPOINT, self.endpoint.strip() or DEFAULT_ANANKE_ENDPOINT)
            config.set(self.KEY_ENABLED, 1 if self.enabled else 0)
            config.set(self.KEY_ANON, 1 if self.anonymize_private else 0)
        except Exception:
            pass


class AtlasEdmcRelayState:
    """Thread-safe state and worker queue for standard Ananke EDMC journal ingestion."""

    def __init__(self) -> None:
        self.cfg = AtlasEdmcConfigStore()
        self.tx_queue: "queue.Queue[Optional[Dict[str, Any]]]" = queue.Queue(maxsize=250)
        self.worker_thread: Optional[threading.Thread] = None
        self.running: bool = False

        # Session statistics
        self.events_forwarded: int = 0
        self.systems_discovered: int = 0
        self.markets_updated: int = 0
        self.last_status_text: str = "Idle (Ready)"

        # UI widget bindings
        self.status_label_var: Optional[tk.StringVar] = None
        self.api_key_var: Optional[tk.StringVar] = None
        self.endpoint_var: Optional[tk.StringVar] = None
        self.enabled_var: Optional[tk.BooleanVar] = None
        self.anon_var: Optional[tk.BooleanVar] = None

    def start_worker(self) -> None:
        if self.running:
            return
        self.running = True
        self.worker_thread = threading.Thread(
            target=self._worker_loop,
            name="AtlasEdmcAnankeRelayWorker",
            daemon=True,
        )
        self.worker_thread.start()

    def stop_worker(self) -> None:
        self.running = False
        try:
            self.tx_queue.put_nowait(None)
        except queue.Full:
            pass

    def update_status(self, message: str) -> None:
        self.last_status_text = message
        if self.status_label_var is not None:
            try:
                self.status_label_var.set(message)
            except Exception:
                pass

    def enqueue_payload(self, payload: Dict[str, Any]) -> bool:
        if not self.cfg.enabled:
            self.update_status("Relay Paused (Opt-Out)")
            return False
        if not self.cfg.api_key:
            self.update_status("Missing ANANKE_EDMC_KEY")
            return False
        try:
            self.tx_queue.put_nowait(payload)
            return True
        except queue.Full:
            self.update_status("Queue Full - Dropped Event")
            return False

    def _worker_loop(self) -> None:
        while self.running:
            try:
                item = self.tx_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if item is None:
                break

            self._dispatch_http_post(item)
            self.tx_queue.task_done()

    def _dispatch_http_post(self, payload: Dict[str, Any]) -> bool:
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url=self.cfg.endpoint or DEFAULT_ANANKE_ENDPOINT,
            data=body_bytes,
            method="POST",
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": f"{PLUGIN_NAME}/{PLUGIN_VERSION} (Standard-Telemetry-Only)",
                "X-Api-Key": self.cfg.api_key,
                "X-Atlas-Scope": "edmc-standard-only",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                status_code = resp.getcode()
                if 200 <= status_code < 300:
                    self.events_forwarded += 1
                    evt_name = payload.get("event", "Journal")
                    if evt_name in ("FSDJump", "Scan"):
                        self.systems_discovered += 1
                    elif evt_name in ("Commodity", "Market", "StationServices"):
                        self.markets_updated += 1
                    self.update_status(
                        f"OK ({status_code}): {evt_name} [{self.events_forwarded} sent]"
                    )
                    return True
                self.update_status(f"HTTP {status_code} from Ananke")
                return False
        except urllib.error.HTTPError as e:
            self.update_status(f"Auth/API Error HTTP {e.code}")
            return False
        except Exception as e:
            self.update_status(f"Relay Offline: {type(e).__name__}")
            return False


STATE = AtlasEdmcRelayState()


def sanitize_id64_str(value: Any) -> Optional[str]:
    """Preserve 64-bit SystemAddress and MarketID as exact strings to prevent IEEE 754 precision loss."""
    if value is None:
        return None
    return str(value)


def build_standard_ananke_payload(
    cmdr: str,
    is_beta: bool,
    system: Optional[str],
    station: Optional[str],
    entry: Dict[str, Any],
    state: Dict[str, Any],
    anonymize_private: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Build a strictly scoped JSON payload for Ananke `POST /api/edmc/journal`.
    Routes celestial/market data to `galaxy-master.db` and basic commander info to `player-master.db`.
    Strictly excludes VFS multibox sandboxing, D3D11 hooks, FDR black-box trajectories, and memory writing.
    """
    event_name = str(entry.get("event", ""))
    if event_name not in ALLOWED_STANDARD_EVENTS:
        return None

    system_address_id64 = sanitize_id64_str(entry.get("SystemAddress") or state.get("SystemAddress"))
    market_id64 = sanitize_id64_str(entry.get("MarketID"))

    # Basic player info for player-master.db
    credits_val = entry.get("Credits", state.get("Credits"))
    ship_type = entry.get("Ship", state.get("ShipType"))
    ship_name = entry.get("ShipName", state.get("ShipName"))
    ship_ident = entry.get("ShipIdent", state.get("ShipIdent"))

    player_master_slice: Dict[str, Any] = {
        "commanderName": "REDACTED_CMDR" if anonymize_private else cmdr,
        "shipType": ship_type,
        "shipName": None if anonymize_private else ship_name,
        "shipIdent": None if anonymize_private else ship_ident,
        "credits": credits_val if isinstance(credits_val, (int, float)) else None,
    }

    # Standard celestial / market telemetry for galaxy-master.db
    galaxy_master_slice: Dict[str, Any] = {
        "event": event_name,
        "timestamp": entry.get("timestamp"),
        "starSystem": system or entry.get("StarSystem"),
        "systemAddressId64": system_address_id64,
        "stationName": station or entry.get("StationName"),
        "marketId64": market_id64,
        "starPos": entry.get("StarPos"),
        "bodyName": entry.get("BodyName") or entry.get("Body"),
        "bodyId": entry.get("BodyID"),
        "planetClass": entry.get("PlanetClass"),
        "starType": entry.get("StarType"),
        "terraformState": entry.get("TerraformState"),
        "stationServices": entry.get("StationServices"),
        "commodities": entry.get("commodities"),
        "economies": entry.get("economies"),
        "prohibited": entry.get("prohibited"),
    }

    return {
        "schemaVersion": "atlas-edmc-v1",
        "plugin": PLUGIN_NAME,
        "pluginVersion": PLUGIN_VERSION,
        "scope": "standard-data-only",
        "isBeta": bool(is_beta),
        "event": event_name,
        "id64": {
            "systemAddress": system_address_id64,
            "marketId": market_id64,
        },
        "galaxyMaster": galaxy_master_slice,
        "playerMaster": player_master_slice,
    }


def plugin_start3(plugin_dir: str) -> str:
    """EDMC Python 3 plugin entry point."""
    STATE.cfg.load()
    STATE.start_worker()
    return PLUGIN_NAME


def plugin_stop() -> None:
    """EDMC shutdown hook."""
    STATE.stop_worker()


def plugin_app(parent: tk.Widget) -> tk.Frame:
    """Render compact status line inside the main EDMC window."""
    frame = tk.Frame(parent)
    STATE.status_label_var = tk.StringVar(value=f"Atlas EDMC: {STATE.last_status_text}")
    lbl = tk.Label(frame, textvariable=STATE.status_label_var, anchor=tk.W)
    lbl.grid(row=0, column=0, sticky=tk.EW)
    return frame


def plugin_prefs(parent: Any, cmdr: str, is_beta: bool) -> Any:
    """Render EDMC settings notebook tab for ANANKE_EDMC_KEY and privacy controls."""
    container = nb.Frame(parent) if nb is not None else ttk.Frame(parent)

    STATE.api_key_var = tk.StringVar(value=STATE.cfg.api_key)
    STATE.endpoint_var = tk.StringVar(value=STATE.cfg.endpoint)
    STATE.enabled_var = tk.BooleanVar(value=STATE.cfg.enabled)
    STATE.anon_var = tk.BooleanVar(value=STATE.cfg.anonymize_private)

    ttk.Label(
        container,
        text="Atlas Lightweight EDMC Companion (Standard Data Only)",
        font=("TkDefaultFont", 10, "bold"),
    ).grid(row=0, column=0, columnspan=2, sticky=tk.W, padx=10, pady=(10, 4))

    ttk.Label(
        container,
        text=(
            "Configured via dedicated ANANKE_EDMC_KEY (X-Api-Key). Dispatches standard FSDJump, Scan, "
            "Commodity, and StationServices telemetry to Ananke POST /api/edmc/journal."
        ),
        wraplength=460,
    ).grid(row=1, column=0, columnspan=2, sticky=tk.W, padx=10, pady=(0, 8))

    ttk.Checkbutton(
        container,
        text="Enable Ananke Standard Telemetry Relay (galaxy-master.db & player-master.db)",
        variable=STATE.enabled_var,
    ).grid(row=2, column=0, columnspan=2, sticky=tk.W, padx=10, pady=4)

    ttk.Checkbutton(
        container,
        text="Anonymize Commander Identity & Ship Name on Public Relay",
        variable=STATE.anon_var,
    ).grid(row=3, column=0, columnspan=2, sticky=tk.W, padx=10, pady=4)

    ttk.Label(container, text="Ananke EDMC API Key (X-Api-Key):").grid(
        row=4, column=0, sticky=tk.W, padx=10, pady=4
    )
    ttk.Entry(container, textvariable=STATE.api_key_var, width=48, show="*").grid(
        row=4, column=1, sticky=tk.W, padx=10, pady=4
    )

    ttk.Label(container, text="Ananke Journal Endpoint:").grid(
        row=5, column=0, sticky=tk.W, padx=10, pady=4
    )
    ttk.Entry(container, textvariable=STATE.endpoint_var, width=48).grid(
        row=5, column=1, sticky=tk.W, padx=10, pady=4
    )

    return container


def prefs_changed(cmdr: str, is_beta: bool) -> None:
    """Persist updated preferences from EDMC settings dialog."""
    if STATE.api_key_var is not None:
        STATE.cfg.api_key = STATE.api_key_var.get().strip()
    if STATE.endpoint_var is not None:
        STATE.cfg.endpoint = STATE.endpoint_var.get().strip() or DEFAULT_ANANKE_ENDPOINT
    if STATE.enabled_var is not None:
        STATE.cfg.enabled = bool(STATE.enabled_var.get())
    if STATE.anon_var is not None:
        STATE.cfg.anonymize_private = bool(STATE.anon_var.get())
    STATE.cfg.save()


def journal_entry(
    cmdr: str,
    is_beta: bool,
    system: Optional[str],
    station: Optional[str],
    entry: Dict[str, Any],
    state: Dict[str, Any],
) -> None:
    """EDMC journal hook: filter and forward standard celestial/market/player telemetry."""
    payload = build_standard_ananke_payload(
        cmdr=cmdr,
        is_beta=is_beta,
        system=system,
        station=station,
        entry=entry,
        state=state,
        anonymize_private=STATE.cfg.anonymize_private,
    )
    if payload is not None:
        STATE.enqueue_payload(payload)
