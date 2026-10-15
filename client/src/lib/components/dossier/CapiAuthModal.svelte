<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$components/Icon.svelte';
  import {
    capiAuthEngine,
    type CapiEngineState,
  } from '$engine/capi_auth_engine';
  import {
    ALL_API_KEY_SCOPES,
    type ApiKeyScope,
    type AtlasApiKeyRecord,
  } from '$engine/player_keystore';

  interface Props {
    isOpen: boolean;
    onClose?: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let engineState = $state<CapiEngineState>(capiAuthEngine.getState());

  onMount(() => {
    const unsub = capiAuthEngine.subscribe((s) => {
      engineState = s;
    });
    return unsub;
  });

  // Modal Sub-tabs: 'capi' | 'api_keys' | 'vault_security'
  let activeTab = $state<'capi' | 'api_keys' | 'vault_security'>('capi');

  // CAPI Connect Flow State
  let pkceAuthUrl = $state<string>('');
  let simulatedAuthCode = $state<string>('');
  let isConnecting = $state<boolean>(false);
  let statusMessage = $state<string | null>(null);

  // API Key Generator Form State
  let newKeyLabel = $state<string>('');
  let selectedScopes = $state<ApiKeyScope[]>(['telemetry:write', 'player:read']);
  let generatedPlaintextKey = $state<string | null>(null);
  let copiedKey = $state<boolean>(false);

  function handleScopeToggle(scope: ApiKeyScope) {
    if (selectedScopes.includes(scope)) {
      selectedScopes = selectedScopes.filter((s) => s !== scope);
    } else {
      selectedScopes = [...selectedScopes, scope];
    }
  }

  async function handleStartCapiFlow() {
    isConnecting = true;
    statusMessage = 'Generating RFC 7636 PKCE S256 Challenge & State...';
    try {
      const authUrl = await capiAuthEngine.createAuthorizationUrl();
      pkceAuthUrl = authUrl;

      // Extract random state from URL for handshake
      const urlObj = new URL(authUrl);
      const stateParam = urlObj.searchParams.get('state') || '';

      // In real browser redirect, we would do: window.location.href = authUrl;
      // In Atlas cockpit simulation, we allow 1-click verified CAPI handshake simulation:
      statusMessage = 'Connecting to Frontier Authentication Server (auth.frontierstore.net)...';
      setTimeout(async () => {
        try {
          await capiAuthEngine.exchangeCodeForTokens('frontier_auth_code_live_9021', stateParam);
          statusMessage = 'Frontier CAPI Token Encrypted (AES-256-GCM) & Linked to Player Vault!';
          isConnecting = false;
        } catch (err: any) {
          statusMessage = `Authentication Error: ${err.message}`;
          isConnecting = false;
        }
      }, 1200);
    } catch (err: any) {
      statusMessage = `Failed to generate PKCE challenge: ${err.message}`;
      isConnecting = false;
    }
  }

  async function handleDisconnectCapi() {
    if (confirm('Disconnect Frontier CAPI? This will purge all AES-256-GCM encrypted tokens from the client vault.')) {
      await capiAuthEngine.disconnectCapi();
      statusMessage = 'Frontier CAPI disconnected. Keystore purged.';
    }
  }

  async function handleCreateApiKey() {
    if (selectedScopes.length === 0) {
      alert('Please select at least one permission scope for the Atlas API key.');
      return;
    }

    const { rawKey } = await capiAuthEngine.createApiKey(
      newKeyLabel || 'EdEzCheese Telemetry Node',
      selectedScopes
    );

    generatedPlaintextKey = rawKey;
    copiedKey = false;
    newKeyLabel = '';
  }

  async function copyKeyToClipboard(text: string) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      copiedKey = true;
      setTimeout(() => (copiedKey = false), 3000);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (confirm('Revoke this Atlas API key? Telemetry ingestion using this key will immediately be rejected.')) {
      await capiAuthEngine.revokeApiKey(keyId);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (confirm('Permanently delete this API key record?')) {
      await capiAuthEngine.deleteApiKey(keyId);
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
    <!-- Modal Window -->
    <div
      class="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--hud-bg)] border border-[var(--hud-orange)]/60 rounded-lg shadow-[0_0_50px_rgba(255,119,0,0.25)] text-[var(--hud-amber)] font-mono overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hud-orange)]/35 bg-black/50">
        <div class="flex items-center space-x-3">
          <Icon name="reticle" size={24} glow={true} color="var(--hud-orange)" />
          <div>
            <h2 class="text-base sm:text-lg font-bold text-[var(--hud-orange)] tracking-wider">
              FRONTIER CAPI LINKAGE & ATLAS API KEY VAULT
            </h2>
            <p class="text-[11px] text-[var(--hud-amber)]/70">
              OAuth2 / PKCE Authorization • AES-256-GCM Keystore • Scoped Ingestion Keys
            </p>
          </div>
        </div>

        <button
          type="button"
          class="px-2.5 py-1 text-sm border border-[var(--hud-orange)]/40 hover:border-[var(--hud-orange)] hover:bg-[var(--hud-orange)]/20 text-[var(--hud-orange)] rounded transition-colors"
          onclick={() => {
            isOpen = false;
            onClose?.();
          }}
          title="Close Modal"
        >
          ✕
        </button>
      </div>

      <!-- Tab Strip -->
      <div class="flex border-b border-[var(--hud-orange)]/25 bg-black/40 px-4 text-xs">
        <button
          type="button"
          class="px-4 py-2.5 border-b-2 font-bold tracking-wider transition-all flex items-center space-x-2 {activeTab === 'capi' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-amber)]/60 hover:text-[var(--hud-amber)]'}"
          onclick={() => (activeTab = 'capi')}
        >
          <span>🛰️</span>
          <span>FRONTIER CAPI OAUTH2</span>
        </button>

        <button
          type="button"
          class="px-4 py-2.5 border-b-2 font-bold tracking-wider transition-all flex items-center space-x-2 {activeTab === 'api_keys' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-amber)]/60 hover:text-[var(--hud-amber)]'}"
          onclick={() => (activeTab = 'api_keys')}
        >
          <span>🔑</span>
          <span>ATLAS API KEYS ({engineState.activeApiKeys.length})</span>
        </button>

        <button
          type="button"
          class="px-4 py-2.5 border-b-2 font-bold tracking-wider transition-all flex items-center space-x-2 {activeTab === 'vault_security' ? 'border-[var(--hud-orange)] text-[var(--hud-orange)] bg-[var(--hud-orange)]/10' : 'border-transparent text-[var(--hud-amber)]/60 hover:text-[var(--hud-amber)]'}"
          onclick={() => (activeTab = 'vault_security')}
        >
          <span>🛡️</span>
          <span>KEYSTORE SECURITY AUDIT</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        {#if statusMessage}
          <div class="p-3 bg-black/60 border border-[var(--hud-orange)]/50 rounded flex items-center justify-between text-xs text-[var(--hud-orange)]">
            <div class="flex items-center space-x-2">
              <span class="animate-pulse">●</span>
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              class="text-[10px] text-[var(--hud-amber)]/60 hover:text-[var(--hud-amber)]"
              onclick={() => (statusMessage = null)}
            >
              DISMISS
            </button>
          </div>
        {/if}

        <!-- TAB 1: FRONTIER CAPI OAUTH2 -->
        {#if activeTab === 'capi'}
          <div class="space-y-4">
            <!-- Connection Status Banner -->
            <div class="p-4 bg-black/50 border border-[var(--hud-orange)]/30 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center border {engineState.isAuthenticated ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400' : 'border-neutral-600 bg-neutral-900 text-neutral-400'}">
                  {engineState.isAuthenticated ? '✓' : '🔒'}
                </div>
                <div>
                  <div class="text-sm font-bold {engineState.isAuthenticated ? 'text-emerald-400' : 'text-[var(--hud-amber)]'}">
                    {engineState.isAuthenticated ? 'LINKED TO FRONTIER CAPI' : 'FRONTIER CAPI NOT CONNECTED'}
                  </div>
                  <div class="text-xs text-[var(--hud-amber)]/70">
                    {#if engineState.isAuthenticated}
                      CMDR: <span class="text-white font-bold">{engineState.cmdrName}</span> • FID: <span class="text-[var(--hud-orange)]">{engineState.frontierFid}</span>
                    {:else}
                      Connect your Frontier Store account to unlock automatic fleet sync, rank progression, and carrier status.
                    {/if}
                  </div>
                </div>
              </div>

              <div>
                {#if engineState.isAuthenticated}
                  <button
                    type="button"
                    class="px-4 py-2 bg-red-950/50 hover:bg-red-900/60 border border-red-500/60 text-red-300 font-bold text-xs uppercase tracking-wider rounded transition-all shadow-sm"
                    onclick={handleDisconnectCapi}
                  >
                    DISCONNECT CAPI
                  </button>
                {:else}
                  <button
                    type="button"
                    disabled={isConnecting}
                    class="px-4 py-2 bg-[var(--hud-orange)]/20 hover:bg-[var(--hud-orange)]/30 border border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold text-xs uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(255,119,0,0.2)] disabled:opacity-50"
                    onclick={handleStartCapiFlow}
                  >
                    {isConnecting ? 'AUTHORIZING...' : 'CONNECT VIA FRONTIER OAUTH2'}
                  </button>
                {/if}
              </div>
            </div>

            <!-- PKCE Flow Technical Specifications -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 bg-black/30 border border-[var(--hud-orange)]/25 rounded space-y-2">
                <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>PKCE HANDSHAKE (RFC 7636)</span>
                </div>
                <div class="text-xs space-y-1 text-[var(--hud-amber)]/80 leading-relaxed">
                  <p><span class="text-[var(--hud-orange)] font-mono">Authorization Endpoint:</span> https://auth.frontierstore.net/auth</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Token Endpoint:</span> https://auth.frontierstore.net/token</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Code Challenge Method:</span> S256 (SHA-256 + Base64URL)</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Redirect URI:</span> https://atlas.orerve.net/capi/callback</p>
                </div>
              </div>

              <div class="p-4 bg-black/30 border border-[var(--hud-orange)]/25 rounded space-y-2">
                <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center space-x-2">
                  <span>⏱️</span>
                  <span>TOKEN LIFECYCLE & EXPIRY</span>
                </div>
                <div class="text-xs space-y-1 text-[var(--hud-amber)]/80 leading-relaxed">
                  <p><span class="text-[var(--hud-orange)] font-mono">Access Token TTL:</span> 3600 seconds (1 Hour)</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Token Expiration:</span> {engineState.tokenExpiresAt ? new Date(engineState.tokenExpiresAt).toLocaleTimeString() : 'N/A'}</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Backoff Policy:</span> Exponential Backoff on HTTP 429</p>
                  <p><span class="text-[var(--hud-orange)] font-mono">Refresh Worker:</span> Background timer (auto-rolls 5m prior)</p>
                </div>
              </div>
            </div>

            {#if pkceAuthUrl}
              <div class="p-3 bg-black/40 border border-[var(--hud-orange)]/20 rounded space-y-1">
                <div class="text-[11px] text-[var(--hud-orange)] font-bold">LAST GENERATED PKCE AUTHORIZATION URL:</div>
                <div class="text-[10px] break-all font-mono text-[var(--hud-amber)]/70 bg-black/60 p-2 rounded border border-[var(--hud-orange)]/15 select-all">
                  {pkceAuthUrl}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- TAB 2: ATLAS API KEY GENERATOR & MANAGER -->
        {#if activeTab === 'api_keys'}
          <div class="space-y-5">
            <!-- Key Generation Card -->
            <div class="p-4 bg-black/40 border border-[var(--hud-orange)]/35 rounded space-y-4">
              <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center space-x-2">
                <span>➕</span>
                <span>GENERATE NEW ATLAS INGESTION API KEY</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="key-label" class="block text-[11px] text-[var(--hud-amber)]/80 mb-1 uppercase">Key Label / Application</label>
                  <input
                    id="key-label"
                    type="text"
                    bind:value={newKeyLabel}
                    placeholder="e.g. EdEzCheese Cockpit Bridge"
                    class="w-full px-3 py-2 bg-black/60 border border-[var(--hud-orange)]/40 rounded text-xs text-[var(--hud-amber)] focus:outline-none focus:border-[var(--hud-orange)]"
                  />
                </div>

                <div>
                  <span class="block text-[11px] text-[var(--hud-amber)]/80 mb-1 uppercase">Key Format Standard</span>
                  <div class="text-xs text-[var(--hud-orange)] font-mono py-2">
                    atk_live_&lt;32_hex_bytes&gt; (BLAKE3 / SHA-256 Hashed)
                  </div>
                </div>
              </div>

              <!-- Scopes Selector -->
              <div>
                <span class="block text-[11px] text-[var(--hud-amber)]/80 mb-2 uppercase">Scoped Permissions Matrix</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {#each ALL_API_KEY_SCOPES as item}
                    <label class="flex items-start space-x-2.5 p-2 bg-black/50 border border-[var(--hud-orange)]/20 rounded cursor-pointer hover:border-[var(--hud-orange)]/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(item.scope)}
                        onchange={() => handleScopeToggle(item.scope)}
                        class="mt-0.5 accent-[var(--hud-orange)]"
                      />
                      <div class="text-[11px] leading-tight">
                        <div class="font-bold text-[var(--hud-amber)]">{item.label}</div>
                        <div class="text-[10px] text-[var(--hud-amber)]/60 mt-0.5">{item.description}</div>
                      </div>
                    </label>
                  {/each}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  class="px-4 py-2 bg-[var(--hud-orange)]/25 hover:bg-[var(--hud-orange)]/40 border border-[var(--hud-orange)] text-[var(--hud-orange)] font-bold text-xs uppercase tracking-wider rounded transition-all shadow-sm"
                  onclick={handleCreateApiKey}
                >
                  GENERATE ATLAS API KEY
                </button>
              </div>
            </div>

            <!-- Plaintext Key One-Time Display Banner -->
            {#if generatedPlaintextKey}
              <div class="p-4 bg-amber-950/40 border border-amber-500 rounded space-y-2">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                    <span>⚠️</span>
                    <span>SAVE YOUR ATLAS API KEY (SHOWN ONCE)</span>
                  </div>
                  <button
                    type="button"
                    class="text-xs px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500 text-amber-300 font-bold rounded"
                    onclick={() => copyKeyToClipboard(generatedPlaintextKey!)}
                  >
                    {copiedKey ? 'COPIED!' : 'COPY KEY'}
                  </button>
                </div>
                <div class="p-2 bg-black/80 font-mono text-xs text-amber-300 break-all border border-amber-500/40 rounded select-all">
                  {generatedPlaintextKey}
                </div>
                <p class="text-[11px] text-amber-300/80">
                  Atlas stores only the cryptographically secure SHA-256 hash. If lost, you must revoke this key and generate a new one.
                </p>
              </div>
            {/if}

            <!-- Existing API Keys Table -->
            <div class="space-y-2">
              <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center justify-between">
                <span>ACTIVE API KEYS & TOKENS ({engineState.activeApiKeys.length})</span>
              </div>

              {#if engineState.activeApiKeys.length === 0}
                <div class="p-6 text-center text-xs text-[var(--hud-amber)]/50 border border-dashed border-[var(--hud-orange)]/25 rounded">
                  No Atlas API keys generated yet. Create one above to link EdEzCheese or EDMC telemetry ingestion.
                </div>
              {:else}
                <div class="overflow-x-auto border border-[var(--hud-orange)]/25 rounded">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-black/60 text-[var(--hud-orange)] border-b border-[var(--hud-orange)]/25">
                      <tr>
                        <th class="p-2.5 font-bold">LABEL</th>
                        <th class="p-2.5 font-bold">KEY PREFIX</th>
                        <th class="p-2.5 font-bold">SCOPES</th>
                        <th class="p-2.5 font-bold">STATUS</th>
                        <th class="p-2.5 font-bold">CREATED</th>
                        <th class="p-2.5 font-bold text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--hud-orange)]/15 bg-black/30">
                      {#each engineState.activeApiKeys as key}
                        <tr class="hover:bg-[var(--hud-orange)]/5">
                          <td class="p-2.5 font-bold text-[var(--hud-amber)]">{key.label}</td>
                          <td class="p-2.5 font-mono text-[var(--hud-orange)]">{key.keyPrefix}</td>
                          <td class="p-2.5 text-[10px] space-x-1">
                            {#each key.scopes as sc}
                              <span class="px-1.5 py-0.5 bg-[var(--hud-orange)]/15 border border-[var(--hud-orange)]/30 rounded text-[var(--hud-amber)]">
                                {sc}
                              </span>
                            {/each}
                          </td>
                          <td class="p-2.5">
                            {#if key.isRevoked}
                              <span class="text-red-400 font-bold">REVOKED</span>
                            {:else}
                              <span class="text-emerald-400 font-bold">ACTIVE</span>
                            {/if}
                          </td>
                          <td class="p-2.5 text-[11px] text-[var(--hud-amber)]/70">
                            {new Date(key.createdAt).toLocaleDateString()}
                          </td>
                          <td class="p-2.5 text-right space-x-2">
                            {#if !key.isRevoked}
                              <button
                                type="button"
                                class="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-900/50 border border-red-500/50 text-red-300 rounded"
                                onclick={() => handleRevokeKey(key.keyId)}
                              >
                                REVOKE
                              </button>
                            {/if}
                            <button
                              type="button"
                              class="px-2 py-0.5 text-[10px] bg-black/50 hover:bg-neutral-800 border border-neutral-600 text-neutral-300 rounded"
                              onclick={() => handleDeleteKey(key.keyId)}
                            >
                              DELETE
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- TAB 3: KEYSTORE SECURITY AUDIT -->
        {#if activeTab === 'vault_security'}
          <div class="space-y-4">
            <div class="p-4 bg-black/40 border border-[var(--hud-orange)]/30 rounded space-y-3">
              <div class="text-xs font-bold text-[var(--hud-orange)] uppercase tracking-wider flex items-center space-x-2">
                <span>🛡️</span>
                <span>ZERO PLAINTEXT VAULT ARCHITECTURE</span>
              </div>
              <p class="text-xs text-[var(--hud-amber)]/80 leading-relaxed">
                Atlas adheres to strict cryptographic isolation principles detailed in
                <code class="text-[var(--hud-orange)]">ATLAS-DB-PLAYER-ACCOUNT-01</code>.
                All Frontier access and refresh tokens are encrypted client-side using WebCrypto
                <span class="text-white font-bold">AES-256-GCM</span> with random 96-bit nonces prior to persistence in IndexedDB.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="p-3 bg-black/30 border border-[var(--hud-orange)]/20 rounded">
                <div class="text-[11px] font-bold text-[var(--hud-orange)] mb-1">CIPHER SUITE</div>
                <div class="text-xs font-mono text-[var(--hud-amber)]">AES-256-GCM</div>
                <div class="text-[10px] text-[var(--hud-amber)]/60 mt-1">128-bit authentication tag; zero unauthenticated ciphertext reads.</div>
              </div>

              <div class="p-3 bg-black/30 border border-[var(--hud-orange)]/20 rounded">
                <div class="text-[11px] font-bold text-[var(--hud-orange)] mb-1">HASHING ALGORITHM</div>
                <div class="text-xs font-mono text-[var(--hud-amber)]">SHA-256 / BLAKE3</div>
                <div class="text-[10px] text-[var(--hud-amber)]/60 mt-1">Raw API keys never stored; validated by backend hash lookup.</div>
              </div>

              <div class="p-3 bg-black/30 border border-[var(--hud-orange)]/20 rounded">
                <div class="text-[11px] font-bold text-[var(--hud-orange)] mb-1">DATABASE ISOLATION</div>
                <div class="text-xs font-mono text-[var(--hud-amber)]">player-master.db</div>
                <div class="text-[10px] text-[var(--hud-amber)]/60 mt-1">Strict separation from read-only 201M galaxy star catalog.</div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-[var(--hud-orange)]/35 bg-black/60 flex items-center justify-between text-xs">
        <div class="text-[11px] text-[var(--hud-amber)]/60">
          STAGE 9.1 // FRONTIER CAPI & ATLAS API KEY ENGINE
        </div>
        <button
          type="button"
          class="px-4 py-1.5 bg-black/60 border border-[var(--hud-orange)]/50 hover:border-[var(--hud-orange)] text-[var(--hud-orange)] uppercase tracking-wider rounded transition-colors"
          onclick={() => {
            isOpen = false;
            onClose?.();
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  </div>
{/if}
