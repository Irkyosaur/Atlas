# Atlas Cockatoo / Stream Deck Plugin Integration (Stage 15.1)

Official Elgato Stream Deck hardware integration package for Project Atlas.

## Features
- **Real-Time Cockpit Telemetry**: 72x72 SVG LCD key badges rendered dynamically at 60Hz.
  - Jump Counter: Remaining jumps in plotted route & next hop.
  - Fuel Gauge: Tank percentage with scoopable indicator (KGBFOAM).
  - Nearest Fuel Star: Distance in light-years and spectral class.
  - Next Waypoint: Name and system destination.
- **1-Key Tactical Actions**:
  - `Copy Next Waypoint`: Copies target to OS clipboard for instant Ctrl+V into Elite Dangerous galaxy map.
  - `Center Camera`: Snaps Atlas 3D web map directly onto your current ship coordinates.
  - `Toggle Night Mode`: Flips Atlas HUD into high-contrast red/amber tactical night vision.
  - `Clear Nav Route`: Flushes current waypoint queue and target lock.
- **Hardware Profile Presets**:
  - Stream Deck Standard (15 Keys: 3x5 grid)
  - Stream Deck XL (32 Keys: 4x8 grid)
  - Stream Deck Plus (8 LCD Keys + 4 Rotary Dials + Touch Strip)

## WebSocket Bridge
Connects to Atlas native bridge daemon on `ws://127.0.0.1:8999`.
