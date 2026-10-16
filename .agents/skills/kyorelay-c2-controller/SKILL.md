---
name: kyorelay-c2-controller
description: Autonomous Command & Control, Dynamic Telegram Live Decks, and Interactive DM Alert Orchestrator for the Antigravity Multi-Repository Ecosystem.
---

# KyoRelay C2 Controller & Dynamic Telemetry Engine

## 1. Architecture Overview
kyorelay (C:\relay) acts as the dedicated autonomous Command & Control (C2) bridge and live telemetry broadcaster between the Antigravity multi-repository ecosystem and Telegram.

### Core Systems:
1. **Topic 1 Master Stats Deck (Decks 1–5)**:
   - **Deck 1 (Mission Control / C2)**: Live execution status, active node, current command, and prompt.
   - **Deck 2 (AI Compute Pool & Multi-Tier Quota)**: Real-time 5h rolling pool, weekly WTU/token counters for **Gemini**, **Argon**, and **Claude**, and calculated node headroom scores (.40 \cdot \text{Gemini}_{5h} + 0.35 \cdot \text{Argon}_{\text{Wk}} + 0.25 \cdot \text{Claude}_{\text{Wk}}$).
   - **Deck 3 (Ecosystem Repositories)**: Dynamic stage-by-stage progress, active phases, and percentage completion parsed from D:\1\roadmap\STAGES.md.
   - **Deck 4 (Autonomous Orchestrator & Node Pools)**: Level-1 C2 supervision and automated node rotation.
   - **Deck 5 (Quick Action Matrix)**: One-click callback triggers.

2. **Interactive DM Alerts & Accordion Dropdowns**:
   - Dispatches dynamic completion/idle alerts and recompile reload notifications to the owner (@irkyo).
   - Dynamically pulls live STAGES.md data on every render (menu:repos, menu:modes, menu:nodes, menu:root).
   - Dynamically pulls the latest git commits from C:\relay and D:\1\EdEzCheese upon startup/recompile reload to present real summaries of newly deployed changes.

3. **Multi-Repo Workspace Routing**:
   - Resolves target repositories automatically (D:\1\EdEzCheese, D:\1\EDLibary, D:\1\EDill, D:\1\atlas, D:\1\ananke, D:\1\EDresearch, C:\relay).
