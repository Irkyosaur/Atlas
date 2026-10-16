<script lang="ts">
  // Location: atlas/client/src/lib/components/sync/EddnRelayPanel.svelte
  // Stage 11.3: Community Broadcast Relay & Lightweight Atlas EDMC Plugin (Standard Data Only)
  // Renders opt-in EDDN privacy & test-mode controls, Ananke EDMC API Key (ANANKE_EDMC_KEY / X-Api-Key)
  // configuration, upload statistics tracker, and one-click EDDN V2/V3 + Ananke relay verification.

  import { onMount, onDestroy } from 'svelte';
  import {
    eddnRelayEngine,
    type EddnPrivacySettings,
    type EddnTransmissionLogEntry,
    type EddnUploadStats,
    type EddnSupportedEventType,
  } from '$engine/eddn_relay_engine';

  let stats = $state<EddnUploadStats>(eddnRelayEngine.getStats());
  let logs = $state<EddnTransmissionLogEntry[]>(eddnRelayEngine.getLogs());
  let settings = $state<EddnPrivacySettings>(eddnRelayEngine.getSettings());
  let showApiKeyPlain = $state<boolean>(false);
  let expandedLogId = $state<string | null>(null);
  let relayStatusBanner = $state<string>(
    'EDDN HTTPS Gateway (https://eddn.edcd.io:4430/upload/) & Ananke POST /api/edmc/journal Ready'
  );

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = eddnRelayEngine.subscribe((nextStats, nextLogs, nextSettings) => {
      stats = nextStats;
      logs = nextLogs;
      settings = nextSettings;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  function toggleSetting(key: keyof EddnPrivacySettings) {
    const current = settings[key];
    if (typeof current === 'boolean') {
      eddnRelayEngine.updateSettings({ [key]: !current });
    }
  }

  function handleApiKeyInput(e: Event) {
    const target = e.target as HTMLInputElement;
    eddnRelayEngine.updateSettings({ anankeEdmcApiKey: target.value });
  }

  function handleRotateEdmcKey() {
    const hex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const newKey = `edmc_live_${hex}`;
    eddnRelayEngine.updateSettings({ anankeEdmcApiKey: newKey });
    relayStatusBanner = 'Generated new scoped ANANKE_EDMC_KEY (X-Api-Key) for standard telemetry';
  }

  async function handleTestBroadcast(eventType: EddnSupportedEventType) {
    const entries = await eddnRelayEngine.triggerSyntheticBroadcastTest(eventType);
    if (entries.length > 0) {
      const first = entries[0];
      relayStatusBanner = `Relayed ${eventType} [${first.systemName} / id64:${first.systemAddressId64}] -> ${first.statusText}`;
    } else {
      relayStatusBanner = 'Both EDDN Public Relay and Ananke EDMC Relay are currently disabled (Opt-Out)';
    }
  }
</script>

<div class="rounded bg-black/85 border border-[var(--hud-orange)]/45 overflow-hidden">
  <!-- Section Header -->
  <div
    class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--hud-orange)]/20 via-[#140d06] to-black border-b border-[var(--hud-orange)]/35"
  >
    <div class="flex items-center space-x-2.5">
      <span
        class="px-2 py-0.5 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] tracking-widest uppercase"
      >
        STAGE 11.3
      </span>
      <span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-amber)]">
        COMMUNITY BROADCAST RELAY (EDDN ZMQ/HTTPS) &amp; LIGHTWEIGHT ATLAS-EDMC PLUGIN
      </span>
    </div>

    <div class="flex items-center space-x-2 text-[10px]">
      <span
        class="px-2 py-0.5 rounded border font-bold uppercase {settings.enablePublicEddnBroadcast
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-white/5 border-white/20 text-white/40'}"
      >
        EDDN: {settings.enablePublicEddnBroadcast ? 'OPT-IN ACTIVE' : 'OPT-OUT'}
      </span>
      <span
        class="px-2 py-0.5 rounded border font-bold uppercase {settings.useEddnTestSchema
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'}"
      >
        SCHEMA: {settings.useEddnTestSchema ? 'TEST (/test)' : 'LIVE V2/V3'}
      </span>
      <span
        class="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold uppercase"
      >
        X-API-KEY SCOPED
      </span>
    </div>
  </div>

  <!-- Main Body Grid -->
  <div class="p-4 space-y-4">
    <!-- Task 5: Upload Statistics Tracker -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      <div class="px-3 py-2 rounded bg-black/80 border border-[var(--hud-orange)]/30">
        <div class="text-[9px] text-white/50 uppercase">EVENTS FORWARDED</div>
        <div class="text-base font-bold text-[var(--hud-amber)]">
          {stats.totalEventsForwarded.toLocaleString()}
        </div>
        <div class="text-[9px] text-white/40">
          EDDN: {stats.eddnPayloadsSent} | EDMC: {stats.anankeEdmcPayloadsSent}
        </div>
      </div>

      <div class="px-3 py-2 rounded bg-black/80 border border-emerald-500/30">
        <div class="text-[9px] text-white/50 uppercase">SYSTEMS DISCOVERED</div>
        <div class="text-base font-bold text-emerald-400">
          {stats.systemsDiscovered.toLocaleString()}
        </div>
        <div class="text-[9px] text-emerald-300/60">FSDJump &amp; Scan (id64)</div>
      </div>

      <div class="px-3 py-2 rounded bg-black/80 border border-cyan-500/30">
        <div class="text-[9px] text-white/50 uppercase">MARKET STATIONS UPDATED</div>
        <div class="text-base font-bold text-cyan-300">
          {stats.marketStationsUpdated.toLocaleString()}
        </div>
        <div class="text-[9px] text-cyan-300/60">Commodity v3 + Services</div>
      </div>

      <div class="px-3 py-2 rounded bg-black/80 border border-[var(--hud-orange)]/30">
        <div class="text-[9px] text-white/50 uppercase">NAV BEACONS SCANNED</div>
        <div class="text-base font-bold text-[var(--hud-orange)]">
          {stats.navBeaconsScanned.toLocaleString()}
        </div>
        <div class="text-[9px] text-white/40">navbeaconscan/1</div>
      </div>

      <div class="px-3 py-2 rounded bg-black/80 border border-emerald-500/30">
        <div class="text-[9px] text-white/50 uppercase">SCHEMA VALIDATED</div>
        <div class="text-base font-bold text-emerald-300">
          {stats.schemaValidationsPassed.toLocaleString()}
        </div>
        <div class="text-[9px] text-white/40">Zero IEEE-754 Truncation</div>
      </div>

      <div class="px-3 py-2 rounded bg-black/80 border border-white/15">
        <div class="text-[9px] text-white/50 uppercase">FAILED / REJECTED</div>
        <div class="text-base font-bold {stats.failedSubmissions > 0 ? 'text-red-400' : 'text-white/60'}">
          {stats.failedSubmissions}
        </div>
        <div class="text-[9px] text-white/40">Gateway HTTP 200 OK</div>
      </div>
    </div>

    <!-- Task 3 & Task 1: Opt-In Privacy Toggles + Dedicated ANANKE_EDMC_KEY Config -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <!-- Left: Opt-In Privacy & Schema Controls -->
      <div class="lg:col-span-6 p-3 rounded bg-[#0c0a08] border border-[var(--hud-orange)]/30 space-y-2.5">
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span class="text-[11px] font-bold uppercase text-[var(--hud-amber)]">
            ?? OPT-IN PRIVACY &amp; EDDN GATEWAY CONTROLS
          </span>
          <span class="text-[9px] text-white/40 font-mono">
            {settings.eddnGatewayUrl}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onclick={() => toggleSetting('enablePublicEddnBroadcast')}
            class="flex items-center justify-between px-3 py-2 rounded border text-left transition-all {settings.enablePublicEddnBroadcast
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-black/60 border-white/15 text-white/50'}"
          >
            <div>
              <div class="text-[10px] font-bold uppercase">PUBLIC EDDN BROADCAST</div>
              <div class="text-[9px] opacity-75">Forward FSDJump, Scan, Market</div>
            </div>
            <span class="text-xs font-bold">{settings.enablePublicEddnBroadcast ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onclick={() => toggleSetting('anonymizePrivateSystems')}
            class="flex items-center justify-between px-3 py-2 rounded border text-left transition-all {settings.anonymizePrivateSystems
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
              : 'bg-black/60 border-white/15 text-white/50'}"
          >
            <div>
              <div class="text-[10px] font-bold uppercase">ANONYMIZE IDENTITY</div>
              <div class="text-[9px] opacity-75">Hash uploaderID &amp; private sectors</div>
            </div>
            <span class="text-xs font-bold">{settings.anonymizePrivateSystems ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onclick={() => toggleSetting('useEddnTestSchema')}
            class="flex items-center justify-between px-3 py-2 rounded border text-left transition-all {settings.useEddnTestSchema
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
              : 'bg-black/60 border-white/15 text-white/50'}"
          >
            <div>
              <div class="text-[10px] font-bold uppercase">EDDN TEST SCHEMA MODE</div>
              <div class="text-[9px] opacity-75">Use /schemas/.../test endpoint</div>
            </div>
            <span class="text-xs font-bold">{settings.useEddnTestSchema ? 'TEST' : 'LIVE'}</span>
          </button>

          <button
            type="button"
            onclick={() => toggleSetting('enableAnankeEdmcRelay')}
            class="flex items-center justify-between px-3 py-2 rounded border text-left transition-all {settings.enableAnankeEdmcRelay
              ? 'bg-[var(--hud-orange)]/20 border-[var(--hud-orange)]/60 text-[var(--hud-amber)]'
              : 'bg-black/60 border-white/15 text-white/50'}"
          >
            <div>
              <div class="text-[10px] font-bold uppercase">ANANKE EDMC INGEST</div>
              <div class="text-[9px] opacity-75">POST /api/edmc/journal (X-Api-Key)</div>
            </div>
            <span class="text-xs font-bold">{settings.enableAnankeEdmcRelay ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <!-- Right: Lightweight Atlas EDMC Companion Plugin & Dedicated ANANKE_EDMC_KEY -->
      <div class="lg:col-span-6 p-3 rounded bg-[#0c0a08] border border-[var(--hud-orange)]/30 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-1 border-b border-white/10 pb-1.5">
          <span class="text-[11px] font-bold uppercase text-[var(--hud-amber)]">
            ?? LIGHTWEIGHT ATLAS-EDMC PLUGIN (`plugins/atlas-edmc/load.py`)
          </span>
          <span
            class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold"
          >
            STANDARD DATA ONLY (NO D3D11 / NO VFS / NO FDR)
          </span>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-white/70">
            <span>Dedicated Ananke EDMC Key (`ANANKE_EDMC_KEY` / `X-Api-Key` Header):</span>
            <span class="text-cyan-300 font-mono">galaxy-master.db + player-master.db</span>
          </div>

          <div class="flex items-center gap-1.5">
            <input
              type={showApiKeyPlain ? 'text' : 'password'}
              value={settings.anankeEdmcApiKey}
              oninput={handleApiKeyInput}
              placeholder="Enter dedicated ANANKE_EDMC_KEY..."
              class="flex-1 px-2.5 py-1 rounded bg-black border border-[var(--hud-orange)]/40 text-emerald-300 font-mono text-[11px]"
            />
            <button
              type="button"
              onclick={() => (showApiKeyPlain = !showApiKeyPlain)}
              class="px-2 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/20 text-white/70 text-[10px] uppercase font-bold"
            >
              {showApiKeyPlain ? 'HIDE' : 'SHOW'}
            </button>
            <button
              type="button"
              onclick={handleRotateEdmcKey}
              class="px-2.5 py-1 rounded bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/35 border border-[var(--hud-orange)]/50 text-[var(--hud-amber)] text-[10px] uppercase font-bold"
              title="Generate a fresh scoped ANANKE_EDMC_KEY distinct from your full Atlas API key"
            >
              ROTATE KEY
            </button>
          </div>
        </div>

        <!-- One-Click Verification Triggers (Task 2, 4, 5) -->
        <div class="pt-1 flex flex-wrap items-center justify-between gap-1.5">
          <span class="text-[10px] text-white/50 uppercase font-bold">
            VALIDATE &amp; RELAY PAYLOAD:
          </span>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onclick={() => handleTestBroadcast('FSDJump')}
              class="px-2 py-1 rounded bg-[var(--hud-orange)] text-black font-bold text-[10px] uppercase hover:bg-[var(--hud-amber)] transition-colors"
            >
              ? FSDJump
            </button>
            <button
              type="button"
              onclick={() => handleTestBroadcast('Scan')}
              class="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] uppercase hover:bg-emerald-500/35 transition-colors"
            >
              ?? Scan (ELW)
            </button>
            <button
              type="button"
              onclick={() => handleTestBroadcast('Commodity')}
              class="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] uppercase hover:bg-cyan-500/35 transition-colors"
            >
              ?? Commodity v3
            </button>
            <button
              type="button"
              onclick={() => handleTestBroadcast('NavBeaconScan')}
              class="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/50 text-purple-300 font-bold text-[10px] uppercase hover:bg-purple-500/35 transition-colors"
            >
              ?? NavBeaconScan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Relay Status Bar -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded bg-[#140d06] border border-[var(--hud-orange)]/30 text-[10px]"
    >
      <div class="flex items-center space-x-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-[var(--hud-amber)] font-bold">RELAY STATUS:</span>
        <span class="text-white/85">{relayStatusBanner}</span>
      </div>
      <span class="text-white/40 font-mono">
        POST {settings.anankeEndpointUrl} | {settings.eddnGatewayUrl}
      </span>
    </div>

    <!-- Recent EDDN & Ananke EDMC Transmission Log -->
    <div class="rounded bg-black/90 border border-white/10 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[10px]">
        <span class="font-bold text-[var(--hud-amber)] uppercase">
          RECENT EDDN V2/V3 &amp; ANANKE EDMC (`X-Api-Key`) TRANSMISSIONS
        </span>
        <span class="text-white/40">{logs.length} Verified Payloads</span>
      </div>

      <div class="max-h-44 overflow-y-auto divide-y divide-white/5">
        {#each logs as item (item.id)}
          <div class="px-3 py-1.5 hover:bg-[var(--hud-orange)]/10 transition-colors text-[10px]">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-white/40 font-mono">{item.timestamp.slice(11, 19)} UTC</span>
                <span
                  class="px-1.5 py-0.5 rounded font-bold text-[9px] {item.target === 'EDDN_ZMQ_GATEWAY'
                    ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                    : 'bg-purple-950 border border-purple-500/40 text-purple-300'}"
                >
                  {item.target === 'EDDN_ZMQ_GATEWAY' ? 'EDDN ZMQ/HTTP' : 'ANANKE X-API-KEY'}
                </span>
                <span
                  class="px-1.5 py-0.5 rounded bg-[var(--hud-orange)]/20 border border-[var(--hud-orange)]/40 text-[var(--hud-orange)] font-bold"
                >
                  {item.eventType}
                </span>
                <span class="text-white font-bold">{item.systemName}</span>
                <span class="text-cyan-300/80 font-mono">id64:{item.systemAddressId64}</span>
                {#if item.stationName}
                  <span class="text-white/60">@ {item.stationName}</span>
                {/if}
              </div>

              <div class="flex items-center space-x-2">
                <span
                  class="font-bold {item.statusCode === 200 ? 'text-emerald-400' : 'text-red-400'}"
                >
                  {item.statusText}
                </span>
                <span class="text-white/40">{item.latencyMs}ms</span>
                <button
                  type="button"
                  onclick={() => (expandedLogId = expandedLogId === item.id ? null : item.id)}
                  class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 text-[9px] uppercase"
                >
                  {expandedLogId === item.id ? 'HIDE PAYLOAD' : 'INSPECT ENVELOPE'}
                </button>
              </div>
            </div>

            {#if expandedLogId === item.id}
              <pre
                class="mt-1.5 p-2 rounded bg-black border border-[var(--hud-orange)]/30 text-[9px] text-emerald-300 overflow-x-auto">{JSON.stringify(
                  item.payloadPreview,
                  null,
                  2
                )}</pre>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
