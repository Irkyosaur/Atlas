<script lang="ts">
  import { onMount } from 'svelte';
  import {
    securityEngine,
    type SecurityTokenState,
    type MicroPoWChallenge,
    type MicroPoWSolution,
    countLeadingZeroBits,
  } from '$engine/security_challenge_engine';
  import {
    hmacNonceEngine,
    type HmacNonceState,
    type VerificationResult,
    HMAC_WINDOW_SECONDS,
  } from '$engine/hmac_nonce_engine';
  import {
    ephemeralDecryptor,
    type DecryptorTelemetryState,
    type EncryptedAssetEnvelope,
    type DecryptedBufferResult,
  } from '$engine/ephemeral_decryptor';
  import {
    honeypotEngine,
    type ScraperTelemetryState,
  } from '$engine/honeypot_engine';
  import {
    covertSentinelEngine,
    type CovertSentinelState,
  } from '$engine/covert_sentinel_engine';
  import TurnstileWidget from './TurnstileWidget.svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let { isOpen = $bindable(false), onClose }: Props = $props();

  let secState = $state<SecurityTokenState>(securityEngine.getState());
  let currentDifficulty = $state<number>(securityEngine.getState().powDifficulty);
  let activeChallenge = $state<MicroPoWChallenge | null>(null);
  let lastSolution = $state<MicroPoWSolution | null>(securityEngine.getState().lastPoWSolution);
  let isSolving = $state<boolean>(false);
  let validationResult = $state<boolean | null>(null);
  let solverLog = $state<string[]>([]);

  // Stage 17.2: HMAC Nonce State
  let hmacState = $state<HmacNonceState>(hmacNonceEngine.getState());
  let lastSignedHeaders = $state<any>(null);
  let hmacVerificationResult = $state<VerificationResult | null>(null);
  let isSigning = $state<boolean>(false);

  // Stage 17.3: Ephemeral WASM Decryptor State
  let decryptorState = $state<DecryptorTelemetryState>(ephemeralDecryptor.getState());
  let isDecrypting = $state<boolean>(false);
  let lastDecryptedAsset = $state<DecryptedBufferResult | null>(null);
  let activeAssetKeyId = $state<string>('carto_ephemeral_key_v1');
  let selectedAlgorithm = $state<'AES-GCM' | 'ChaCha20-Poly1305'>('ChaCha20-Poly1305');

  // Stage 17.4: Honeypot & Automated Scraper Defense State
  let honeypotState = $state<ScraperTelemetryState>(honeypotEngine.getState());

  // Stage 18.1: Covert Sentinel & Rogue Domain Trap State
  let sentinelState = $state<CovertSentinelState>(covertSentinelEngine.getState());
  let simulatedCloneHost = $state<string>('rogue-atlas-mirror.xyz');
  let isSimulatedFramed = $state<boolean>(true);

  onMount(() => {
    const unsubSec = securityEngine.subscribe((s) => {
      secState = s;
      currentDifficulty = s.powDifficulty;
      lastSolution = s.lastPoWSolution;
    });

    const unsubHmac = hmacNonceEngine.subscribe((s) => {
      hmacState = s;
    });

    const unsubDecryptor = ephemeralDecryptor.subscribe((s) => {
      decryptorState = s;
    });

    const unsubHoneypot = honeypotEngine.subscribe((s) => {
      honeypotState = s;
    });

    const unsubSentinel = covertSentinelEngine.subscribe((s) => {
      sentinelState = s;
    });

    return () => {
      unsubSec();
      unsubHmac();
      unsubDecryptor();
      unsubHoneypot();
      unsubSentinel();
    };
  });

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    solverLog = [`[${time}] ${msg}`, ...solverLog.slice(0, 20)];
  }

  function handleDifficultyChange(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    currentDifficulty = val;
    securityEngine.setDifficulty(val);
    addLog(`PoW difficulty updated to ${val} leading zero bits`);
  }

  async function handleSolveChallenge() {
    if (isSolving) return;
    isSolving = true;
    validationResult = null;
    try {
      addLog(`Generating client challenge with difficulty = ${currentDifficulty} bits...`);
      const challenge = securityEngine.generateClientChallenge(currentDifficulty);
      activeChallenge = challenge;
      addLog(`Challenge Seed: ${challenge.seed}`);

      const solution = await securityEngine.solveChallenge(challenge);
      addLog(`Solution found! Nonce: ${solution.nonce}, Elapsed: ${solution.elapsedMs}ms, Hash: ${solution.hash.slice(0, 16)}...`);

      const valid = await securityEngine.validateSolution(challenge, solution);
      validationResult = valid;
      addLog(`Verification result: ${valid ? 'VALID (PASSED)' : 'INVALID (FAILED)'}`);
    } catch (err: any) {
      addLog(`Error solving challenge: ${err.message}`);
    } finally {
      isSolving = false;
    }
  }

  async function handleGenerateHmacSignature() {
    if (isSigning) return;
    isSigning = true;
    hmacVerificationResult = null;
    try {
      addLog(`Signing outbound request POST /api/cube-search with rolling 30s HMAC...`);
      const headers = await hmacNonceEngine.signRequest('POST', '/api/cube-search');
      lastSignedHeaders = headers;
      addLog(`HMAC generated! Nonce: ${headers['X-Atlas-Nonce-Id']}, Sig: ${headers['X-Atlas-Signature'].slice(0, 16)}...`);

      // Verify immediately
      const ts = Number(headers['X-Atlas-Timestamp']);
      const verifyRes = await hmacNonceEngine.verifyRequest(
        'POST',
        '/api/cube-search',
        headers['X-Atlas-Signature'],
        ts,
        headers['X-Atlas-Nonce-Id']
      );
      hmacVerificationResult = verifyRes;
      addLog(`Initial Verification: ${verifyRes.valid ? 'VALID (ACCEPTED)' : 'REJECTED: ' + verifyRes.reason}`);
    } catch (err: any) {
      addLog(`Error generating HMAC signature: ${err.message}`);
    } finally {
      isSigning = false;
    }
  }

  async function handleTestReplayAttack() {
    if (!lastSignedHeaders) {
      addLog(`Generate a signature first before testing replay attack!`);
      return;
    }
    addLog(`Simulating replay attack with already-redeemed Nonce: ${lastSignedHeaders['X-Atlas-Nonce-Id']}...`);
    const ts = Number(lastSignedHeaders['X-Atlas-Timestamp']);
    const replayRes = await hmacNonceEngine.verifyRequest(
      'POST',
      '/api/cube-search',
      lastSignedHeaders['X-Atlas-Signature'],
      ts,
      lastSignedHeaders['X-Atlas-Nonce-Id']
    );
    hmacVerificationResult = replayRes;
    addLog(`Replay test result: ${replayRes.valid ? 'UNEXPECTED PASS' : 'CORRECTLY BLOCKED (REPLAY DETECTED)'}`);
  }

  function handleResetReplayCache() {
    hmacNonceEngine.resetReplayCache();
    hmacVerificationResult = null;
    addLog(`HMAC replay cache cleared.`);
  }

  // Stage 17.3: Ephemeral Asset Decryption Test Handlers
  async function handleTestAssetDecryption() {
    if (isDecrypting) return;
    isDecrypting = true;
    try {
      addLog(`Generating ephemeral 256-bit key for ${selectedAlgorithm}...`);
      const keyBytes = new Uint8Array(32);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(keyBytes);
      } else {
        for (let i = 0; i < 32; i++) keyBytes[i] = (Math.random() * 256) | 0;
      }

      await ephemeralDecryptor.registerEphemeralKey(activeAssetKeyId, keyBytes, selectedAlgorithm, 180_000);
      addLog(`Ephemeral key registered [KeyID: ${activeAssetKeyId}, TTL: 180s, Zero-Retention: Active]`);

      const mockPayload = JSON.stringify({
        layer: 'Protected Vector Cartography',
        sector: 'Sagittarius A* Galactic Core',
        vectorCount: 2560,
        features: ['Gravity Well', 'Supermassive Black Hole Horizon', 'Accretion Disk Boundary'],
        timestamp: Date.now(),
      });
      const dataBytes = new TextEncoder().encode(mockPayload);

      addLog(`Encrypting simulated cartographic asset (${dataBytes.length} bytes)...`);
      const envelope: EncryptedAssetEnvelope = await ephemeralDecryptor.encryptAssetEnvelope(
        'carto_layer_sag_a',
        'cartographic_vector',
        dataBytes,
        keyBytes,
        selectedAlgorithm,
        { layerName: 'Core Vector Mesh', featureCount: 2560 }
      );

      addLog(`Decrypting encrypted asset envelope via in-memory WebAssembly/WebCrypto (${selectedAlgorithm})...`);
      const res = await ephemeralDecryptor.decryptAssetEnvelope(envelope, activeAssetKeyId);
      lastDecryptedAsset = res;
      addLog(`✓ Asset successfully decrypted! Size: ${res.byteLength}B, Duration: ${decryptorState.lastDecryptionDurationMs}ms (In-Memory Only, Zero Disk Persist)`);
    } catch (err: any) {
      addLog(`✕ Decryption failed: ${err.message}`);
    } finally {
      isDecrypting = false;
    }
  }

  function handleWipeAssetBuffer() {
    if (lastDecryptedAsset) {
      lastDecryptedAsset.wipe();
      lastDecryptedAsset = null;
      addLog(`Active decrypted buffer securely zeroed and wiped from memory.`);
    }
  }

  function handleWipeAllKeys() {
    ephemeralDecryptor.wipeAll();
    lastDecryptedAsset = null;
    addLog(`All ephemeral cryptographic keys & decrypted buffers wiped immediately (Zero-Retention Enforced).`);
  }

  function toggleDevBypass() {
    securityEngine.setDevBypass(!secState.bypassDevMode);
    addLog(`Dev mock bypass set to: ${!secState.bypassDevMode}`);
  }

  // Stage 17.4 Honeypot Actions
  function handleSimulateBot(type: 'puppeteer' | 'honeypot_click' | 'canvas_noise' | 'mouse_teleport') {
    honeypotEngine.simulateBotDetection(type);
    addLog(`Simulated bot signature triggered: ${type}`);
  }

  function handleResetHoneypot() {
    honeypotEngine.resetDefenseState();
    addLog(`Honeypot defense state and threat score reset.`);
  }

  function handleTogglePoisonMode() {
    honeypotEngine.setPoisonMode(!honeypotState.poisonModeEnabled);
    addLog(`Decoy cartography response poisoning toggled: ${!honeypotState.poisonModeEnabled}`);
  }

  // Stage 18.1 Covert Sentinel Actions
  function handleSimulateRogueDomain() {
    covertSentinelEngine.simulateRogueContext(simulatedCloneHost, isSimulatedFramed);
    addLog(`Simulated rogue domain trap activated! Host: ${simulatedCloneHost}, Framed: ${isSimulatedFramed}`);
  }

  function handleResetSentinel() {
    covertSentinelEngine.resetToNominal();
    addLog(`Covert sentinel defense state reset to nominal.`);
  }

  function handleToggleDevOverride() {
    covertSentinelEngine.setDevOverride(!sentinelState.devOverrideActive);
    addLog(`Sentinel dev override set to: ${!sentinelState.devOverrideActive}`);
  }

  async function handleTriggerCovertBeacon() {
    addLog(`Manually firing covert security telemetry beacon to direct alerting webhook...`);
    const sent = await covertSentinelEngine.dispatchCovertSecurityBeacon();
    addLog(`Covert security telemetry beacon dispatched: ${sent ? 'SUCCESS (DISPATCHED)' : 'THROTTLED / SKIPPED'}`);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none"
    role="dialog"
    aria-modal="true"
    aria-label="Bot Defense, DRM & Anti-Clone Sentinel Verification"
  >
    <div class="relative w-full max-w-2xl bg-zinc-950 border border-orange-500/60 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.25)] flex flex-col font-mono text-xs text-zinc-300">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-orange-500/40">
        <div class="flex items-center space-x-2.5">
          <span class="text-base">🛡️</span>
          <div>
            <h2 class="text-sm font-bold text-orange-400 tracking-wider">
              SECURITY SHIELD // SENTINEL ANTI-CLONE & BOT DEFENSE
            </h2>
            <div class="text-[10px] text-zinc-400">
              PHASE 18 // STAGE 18.1 // COVERT ORIGIN VALIDATION, ROGUE DOMAIN TRAPS & STANDALONE WEBHOOKS
            </div>
          </div>
        </div>
        <button
          type="button"
          onclick={() => {
            isOpen = false;
            onClose?.();
          }}
          class="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold border border-zinc-700 hover:border-orange-500/50 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Modal Content Body -->
      <div class="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <!-- Status Summary Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-7 gap-2">
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">TURNSTILE</div>
            <div class="text-xs font-bold mt-1 {secState.isTurnstileVerified ? 'text-emerald-400' : 'text-amber-400'}">
              {secState.isTurnstileVerified ? 'VERIFIED' : 'PENDING'}
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">POW BITS</div>
            <div class="text-xs font-bold text-orange-400 mt-1">
              {currentDifficulty} BITS
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">HMAC 30S</div>
            <div class="text-xs font-bold text-cyan-400 mt-1 tabular-nums">
              {hmacState.secondsRemaining}s LEFT
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">REPLAYS</div>
            <div class="text-xs font-bold mt-1 {hmacState.replaysDetected > 0 ? 'text-amber-400' : 'text-emerald-400'}">
              {hmacState.replaysDetected} BLOCKED
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">SCRAPER RISK</div>
            <div class="text-xs font-bold mt-1 {honeypotState.isScraperDetected ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}">
              {honeypotState.threatScore}% {honeypotState.isScraperDetected ? 'TRIPPED' : 'NOMINAL'}
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">TARPIT WAIT</div>
            <div class="text-xs font-bold mt-1 {honeypotState.tarpitDelaysEnforced > 0 ? 'text-amber-400' : 'text-zinc-500'}">
              {honeypotState.tarpitDelayMs}ms ({honeypotState.tarpitDelaysEnforced}x)
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">ORIGIN / CLONE</div>
            <div class="text-xs font-bold mt-1 {sentinelState.isRogueDomain ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}">
              {sentinelState.isRogueDomain ? 'ROGUE TRAP' : 'AUTHORIZED'}
            </div>
          </div>
        </div>

        <!-- Cloudflare Turnstile Section -->
        <div class="space-y-1.5">
          <div class="block text-xs font-bold text-orange-400">
            1. HUMAN INTERACTIVE CHALLENGE (CLOUDFLARE TURNSTILE)
          </div>
          <TurnstileWidget
            onSuccess={(tok) => addLog(`Turnstile token received: ${tok.slice(0, 16)}...`)}
            onError={(err) => addLog(`Turnstile error: ${err}`)}
          />
        </div>

        <!-- Micro-PoW Solver Section -->
        <div class="space-y-2 p-3 rounded bg-zinc-900/70 border border-orange-500/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-orange-400">
              2. MICRO-PROOF-OF-WORK SOLVER (SHA-256)
            </div>
            <span class="text-[10px] text-zinc-400">
              Target: leading zero bits >= {currentDifficulty}
            </span>
          </div>

          <!-- Difficulty Slider -->
          <div class="flex items-center space-x-3 pt-1">
            <span class="text-[11px] text-zinc-400 whitespace-nowrap">Difficulty:</span>
            <input
              type="range"
              min="4"
              max="20"
              step="1"
              value={currentDifficulty}
              oninput={handleDifficultyChange}
              class="w-full accent-orange-500 cursor-pointer"
            />
            <span class="text-xs font-bold text-orange-400 w-12 text-right">
              {currentDifficulty}b
            </span>
          </div>

          <!-- Solver Trigger -->
          <div class="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onclick={handleSolveChallenge}
              disabled={isSolving}
              class="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md transition-colors"
            >
              {#if isSolving}
                <span class="animate-spin">⚙️</span>
                <span>CALCULATING NONCE...</span>
              {:else}
                <span>🚀</span>
                <span>RUN MICRO-POW CHALLENGE</span>
              {/if}
            </button>

            <button
              type="button"
              onclick={toggleDevBypass}
              class="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold border border-zinc-700 transition-colors"
            >
              {secState.bypassDevMode ? 'Disable Dev Bypass' : 'Enable Dev Bypass'}
            </button>
          </div>

          <!-- Last Solution Telemetry Card -->
          {#if lastSolution}
            <div class="mt-3 p-2.5 rounded bg-black/60 border border-zinc-800 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">NONCE:</span>
                <span class="text-emerald-400 font-bold">{lastSolution.nonce.toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">COMPUTE TIME:</span>
                <span class="text-amber-400 font-bold">{lastSolution.elapsedMs} ms</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">ZERO BITS:</span>
                <span class="text-cyan-400 font-bold">{lastSolution.leadingZeroBits} bits</span>
              </div>
              <div class="text-[10px] text-zinc-500 truncate pt-1 border-t border-zinc-800">
                HASH: {lastSolution.hash}
              </div>
              {#if validationResult !== null}
                <div class="text-[11px] font-bold pt-1 {validationResult ? 'text-emerald-400' : 'text-red-400'}">
                  CRYPTO-VERIFICATION: {validationResult ? '✓ VALID PROOF ACCEPTED' : '✕ INVALID PROOF REJECTED'}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Section 3: Dynamic 30s HMAC Nonce Architecture & Replay Protection -->
        <div class="space-y-2 p-3 rounded bg-zinc-900/70 border border-cyan-500/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-cyan-400">
              3. DYNAMIC 30S HMAC NONCE & REPLAY SENTINEL
            </div>
            <span class="text-[10px] text-cyan-200">
              Dual-Window Tolerance (±1 Step / ±30s)
            </span>
          </div>

          <!-- Rolling Window Progress Bar -->
          <div class="space-y-1 pt-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-zinc-400">Active Window Remaining:</span>
              <span class="text-cyan-300 font-bold tabular-nums">
                {hmacState.secondsRemaining}s / {HMAC_WINDOW_SECONDS}s
              </span>
            </div>
            <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                class="h-full transition-all duration-300 rounded-full {hmacState.secondsRemaining <= 5 ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}"
                style="width: {Math.round(((HMAC_WINDOW_SECONDS - hmacState.secondsRemaining) / HMAC_WINDOW_SECONDS) * 100)}%"
              ></div>
            </div>
          </div>

          <!-- Active Window Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div class="p-2 rounded bg-black/60 border border-zinc-800">
              <div class="text-[10px] text-zinc-400">CURRENT ROLLING NONCE ID:</div>
              <div class="font-mono text-cyan-300 truncate font-bold mt-0.5">
                {hmacState.activeNonceId || 'DERIVING...'}
              </div>
            </div>
            <div class="p-2 rounded bg-black/60 border border-zinc-800">
              <div class="text-[10px] text-zinc-400">WINDOW DERIVED SECRET:</div>
              <div class="font-mono text-zinc-400 truncate mt-0.5">
                {hmacState.currentWindowSecret ? `${hmacState.currentWindowSecret.slice(0, 16)}...` : 'DERIVING...'}
              </div>
            </div>
          </div>

          <!-- HMAC Action Controls -->
          <div class="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onclick={handleGenerateHmacSignature}
              disabled={isSigning}
              class="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-md transition-colors"
            >
              <span>🔑</span>
              <span>GENERATE & SIGN REQUEST</span>
            </button>

            <button
              type="button"
              onclick={handleTestReplayAttack}
              class="px-3.5 py-1.5 rounded bg-amber-600/80 hover:bg-amber-500 text-black font-bold flex items-center space-x-1.5 shadow-md transition-colors"
            >
              <span>⚠️</span>
              <span>SIMULATE REPLAY ATTACK</span>
            </button>

            <button
              type="button"
              onclick={handleResetReplayCache}
              class="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold border border-zinc-700 transition-colors"
            >
              Reset Cache
            </button>
          </div>

          <!-- Last Signed Header Telemetry & Verification Card -->
          {#if lastSignedHeaders}
            <div class="mt-2.5 p-2.5 rounded bg-black/60 border border-cyan-500/20 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">X-Atlas-Nonce-Id:</span>
                <span class="text-cyan-300 font-bold">{lastSignedHeaders['X-Atlas-Nonce-Id']}</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">X-Atlas-Timestamp:</span>
                <span class="text-zinc-300 font-mono">{lastSignedHeaders['X-Atlas-Timestamp']}</span>
              </div>
              <div class="text-[10px] text-zinc-400 truncate pt-1 border-t border-zinc-800">
                X-Atlas-Signature: {lastSignedHeaders['X-Atlas-Signature']}
              </div>
              {#if hmacVerificationResult !== null}
                <div class="text-[11px] font-bold pt-1 {hmacVerificationResult.valid ? 'text-emerald-400' : 'text-amber-400'}">
                  REPLAY SENTINEL RESULT: {hmacVerificationResult.valid ? '✓ SIGNATURE VERIFIED & ACCEPTED' : '✕ BLOCKED: ' + hmacVerificationResult.reason}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Section 3: Ephemeral Client-Side Asset Decryption via WebAssembly (Stage 17.3) -->
        <div class="p-3 rounded-lg bg-zinc-900/90 border border-indigo-500/40 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-sm">🔐</span>
              <div>
                <div class="text-xs font-bold text-indigo-400">
                  EPHEMERAL ASSET DECRYPTION // WASM ACCELERATION
                </div>
                <div class="text-[10px] text-zinc-400">
                  Zero-retention in-memory stream decoding for proprietary cartographic layers & stellar assets.
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2 text-[10px]">
              <span class="px-2 py-0.5 rounded {decryptorState.wasmAccelerated ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400'}">
                {decryptorState.wasmAccelerated ? 'WASM ACCEL: ON' : 'WASM: INACTIVE'}
              </span>
              <span class="px-2 py-0.5 rounded {decryptorState.zeroRetentionEnforced ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300'}">
                ZERO-RETENTION: ENFORCED
              </span>
            </div>
          </div>

          <!-- Telemetry Counters Matrix -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <div class="text-zinc-400 text-[10px]">ACTIVE KEYS:</div>
              <div class="font-bold text-indigo-300 text-sm">{decryptorState.activeKeyHandles}</div>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <div class="text-zinc-400 text-[10px]">ASSETS DECRYPTED:</div>
              <div class="font-bold text-emerald-400 text-sm">{decryptorState.totalAssetsDecrypted}</div>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <div class="text-zinc-400 text-[10px]">IN-MEMORY BUFFERS:</div>
              <div class="font-bold text-cyan-300 text-sm">{(decryptorState.activeAllocatedBytes / 1024).toFixed(1)} KB</div>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <div class="text-zinc-400 text-[10px]">WIPED BUFFERS:</div>
              <div class="font-bold text-amber-300 text-sm">{decryptorState.totalWipedBuffers}</div>
            </div>
          </div>

          <!-- Algorithm Selector & Execution Controls -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800">
            <div class="flex items-center space-x-2">
              <span class="text-[10px] text-zinc-400 font-bold">ALGORITHM:</span>
              <button
                type="button"
                onclick={() => (selectedAlgorithm = 'ChaCha20-Poly1305')}
                class="px-2 py-1 rounded text-[10px] font-bold border transition-colors {selectedAlgorithm === 'ChaCha20-Poly1305' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}"
              >
                ChaCha20-Poly1305
              </button>
              <button
                type="button"
                onclick={() => (selectedAlgorithm = 'AES-GCM')}
                class="px-2 py-1 rounded text-[10px] font-bold border transition-colors {selectedAlgorithm === 'AES-GCM' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}"
              >
                AES-GCM (256-bit)
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                onclick={handleTestAssetDecryption}
                disabled={isDecrypting}
                class="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-md transition-colors"
              >
                <span>⚡</span>
                <span>DECRYPT IN-MEMORY ASSET</span>
              </button>

              {#if lastDecryptedAsset}
                <button
                  type="button"
                  onclick={handleWipeAssetBuffer}
                  class="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold flex items-center space-x-1 transition-colors"
                >
                  <span>🧹</span>
                  <span>WIPE BUFFER</span>
                </button>
              {/if}

              <button
                type="button"
                onclick={handleWipeAllKeys}
                class="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold border border-zinc-700 transition-colors"
                title="Immediately overwrite all cryptographic keys and decrypted buffers with zero bytes"
              >
                Wipe All
              </button>
            </div>
          </div>

          <!-- Active Decrypted Asset Telemetry Card -->
          {#if lastDecryptedAsset}
            <div class="mt-2 p-2.5 rounded bg-black/60 border border-indigo-500/30 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">Decrypted Asset ID:</span>
                <span class="text-indigo-300 font-bold">{lastDecryptedAsset.assetId} ({lastDecryptedAsset.assetType})</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">Allocated Buffer Size:</span>
                <span class="text-emerald-400 font-mono">{lastDecryptedAsset.byteLength} bytes (In-Memory TypedArray)</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">Disk Persistence Status:</span>
                <span class="text-emerald-400 font-bold">STRICT ZERO DISK PERSISTENCE (Ephemeral Wipe Ready)</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Stage 17.4: Headless Scraper & Honeypot Defense Control -->
        <div class="space-y-2 p-3 rounded-lg bg-zinc-900/60 border border-rose-500/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
              <span>🍯</span>
              <span>4. HEADLESS BROWSER & AUTOMATED SCRAPER HONEYPOT DEFENSE</span>
            </div>
            <div class="flex items-center space-x-2 text-[10px]">
              <span class="text-zinc-400">Decoy Poisoning:</span>
              <button
                type="button"
                onclick={handleTogglePoisonMode}
                class="px-2 py-0.5 rounded font-bold transition-colors {honeypotState.poisonModeEnabled ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}"
              >
                {honeypotState.poisonModeEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          <div class="text-[11px] text-zinc-400 leading-relaxed">
            Traps automated scraping scripts (Puppeteer, Playwright, Selenium, CDP bots) with invisible DOM honeypots, kinematic velocity checks, and CDP artifact detection. Offending agents receive synthetic poisoned coordinate vectors and tarpit latency delays.
          </div>

          <!-- Honeypot Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">HONEYPOT TRIPS</span>
              <span class="font-bold font-mono {honeypotState.honeypotTrips > 0 ? 'text-rose-400' : 'text-zinc-300'}">
                {honeypotState.honeypotTrips} TRIPS
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">DECOYS POISONED</span>
              <span class="font-bold font-mono text-amber-300">
                {honeypotState.decoyResponsesPoisoned} SYSTEMS
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">TARPIT DELAY</span>
              <span class="font-bold font-mono text-cyan-300">
                {honeypotState.tarpitDelayMs}ms / req
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">TOTAL TARPIT WAIT</span>
              <span class="font-bold font-mono text-purple-300">
                {(honeypotState.totalTarpitLatencyMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <!-- Detected Signals List -->
          {#if honeypotState.signals.length > 0}
            <div class="space-y-1">
              <div class="text-[10px] font-bold text-zinc-400">DETECTED SIGNALS ({honeypotState.signals.length}):</div>
              <div class="max-h-20 overflow-y-auto space-y-1 text-[10px]">
                {#each honeypotState.signals as sig}
                  <div class="flex items-center justify-between p-1.5 rounded bg-black/80 border border-rose-900/40">
                    <div class="flex items-center space-x-1.5 truncate">
                      <span class="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] uppercase border border-rose-800 font-bold">
                        {sig.category}
                      </span>
                      <span class="text-zinc-300 truncate">{sig.description}</span>
                    </div>
                    <span class="text-rose-400 font-bold whitespace-nowrap ml-2">+{sig.weight} pts</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Simulated Bot Trigger Buttons for Testing -->
          <div class="pt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onclick={() => handleSimulateBot('puppeteer')}
              class="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-200 font-bold text-[10px] transition-colors"
            >
              Simulate Puppeteer/CDP
            </button>
            <button
              type="button"
              onclick={() => handleSimulateBot('honeypot_click')}
              class="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-200 font-bold text-[10px] transition-colors"
            >
              Trip Invisible Honeypot
            </button>
            <button
              type="button"
              onclick={() => handleSimulateBot('canvas_noise')}
              class="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-200 font-bold text-[10px] transition-colors"
            >
              Simulate Canvas Tamper
            </button>
            <button
              type="button"
              onclick={() => handleSimulateBot('mouse_teleport')}
              class="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800 text-cyan-200 font-bold text-[10px] transition-colors"
            >
              Simulate Bot Teleport
            </button>
            <button
              type="button"
              onclick={handleResetHoneypot}
              class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] border border-zinc-700 ml-auto transition-colors"
            >
              Reset State
            </button>
          </div>
        </div>

        <!-- Stage 18.1: Covert Origin Validation & Rogue Domain Traps -->
        <div class="space-y-2 p-3 rounded bg-zinc-900/70 border border-purple-500/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-purple-400">
              5. COVERT ANTI-CLONE SENTINEL // ROGUE DOMAIN TRAPS & WEBHOOKS
            </div>
            <span class="text-[10px] text-zinc-400">
              NO ORB / Direct Alerting Webhook
            </span>
          </div>

          <!-- Origin & Domain State Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">ORIGIN STATUS</span>
              <span class="font-bold {sentinelState.isValidOrigin ? 'text-emerald-400' : 'text-rose-400'}">
                {sentinelState.isValidOrigin ? 'VALID AUTHORIZED' : 'UNAUTHORIZED'}
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">THREAT SEVERITY</span>
              <span class="font-bold uppercase {sentinelState.threatLevel === 'nominal' ? 'text-emerald-400' : 'text-rose-400'}">
                {sentinelState.threatLevel}
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">FRAME NESTING</span>
              <span class="font-bold {sentinelState.isFramed ? 'text-rose-400' : 'text-emerald-400'}">
                {sentinelState.isFramed ? 'NESTED (IFRAME)' : 'TOP-LEVEL (CLEAN)'}
              </span>
            </div>
            <div class="p-2 rounded bg-black/50 border border-zinc-800">
              <span class="text-[10px] text-zinc-500 block">BEACONS DISPATCHED</span>
              <span class="font-bold font-mono text-purple-300">
                {sentinelState.beaconsDispatched} BEACONS
              </span>
            </div>
          </div>

          <!-- Covert Decoys Status Sub-grid -->
          <div class="grid grid-cols-3 gap-2 pt-0.5 text-xs">
            <div class="p-1.5 rounded bg-black/40 border border-zinc-800">
              <span class="text-[9px] text-zinc-500 block">CPU TARPIT CYCLES</span>
              <span class="font-bold font-mono text-amber-300">
                {sentinelState.performanceStallCycles} STALLS ({sentinelState.decoys.tarpitFrameDelayMs}ms)
              </span>
            </div>
            <div class="p-1.5 rounded bg-black/40 border border-zinc-800">
              <span class="text-[9px] text-zinc-500 block">WEBGPU SUPPRESSED</span>
              <span class="font-bold font-mono text-cyan-300">
                {sentinelState.webGpuSuppressedFrames} FRAMES
              </span>
            </div>
            <div class="p-1.5 rounded bg-black/40 border border-zinc-800">
              <span class="text-[9px] text-zinc-500 block">NAV DRIFT INJECTED</span>
              <span class="font-bold font-mono text-rose-300">
                {sentinelState.navigationErrorsInjected} OFFSETS
              </span>
            </div>
          </div>

          <!-- Detected Domain Violations -->
          {#if sentinelState.violations.length > 0}
            <div class="space-y-1">
              <div class="text-[10px] font-bold text-rose-400">DETECTED CLONE / DOMAIN VIOLATIONS ({sentinelState.violations.length}):</div>
              <div class="space-y-1 text-[10px]">
                {#each sentinelState.violations as v}
                  <div class="p-1.5 rounded bg-rose-950/40 border border-rose-900 text-rose-200">
                    {v}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Rogue Domain Simulation Controls -->
          <div class="pt-1.5 flex flex-wrap items-center gap-2">
            <div class="flex items-center space-x-1.5 flex-1 min-w-[200px]">
              <span class="text-[10px] text-zinc-400">Host:</span>
              <input
                type="text"
                bind:value={simulatedCloneHost}
                class="px-2 py-1 bg-black border border-zinc-700 rounded text-xs text-zinc-200 flex-1"
                placeholder="clone-domain.org"
              />
            </div>
            <label class="flex items-center space-x-1 text-[10px] text-zinc-300 cursor-pointer">
              <input type="checkbox" bind:checked={isSimulatedFramed} class="accent-purple-500" />
              <span>Framed?</span>
            </label>
            <button
              type="button"
              onclick={handleSimulateRogueDomain}
              class="px-2.5 py-1 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-200 font-bold text-[10px] transition-colors"
            >
              Simulate Rogue Clone
            </button>
            <button
              type="button"
              onclick={handleTriggerCovertBeacon}
              class="px-2.5 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-200 font-bold text-[10px] transition-colors"
            >
              Fire Covert Beacon
            </button>
            <button
              type="button"
              onclick={handleToggleDevOverride}
              class="px-2.5 py-1 rounded {sentinelState.devOverrideActive ? 'bg-amber-900 text-amber-200 border-amber-700' : 'bg-zinc-800 text-zinc-300 border-zinc-700'} border font-bold text-[10px] transition-colors"
            >
              Dev Override: {sentinelState.devOverrideActive ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onclick={handleResetSentinel}
              class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] border border-zinc-700 ml-auto transition-colors"
            >
              Reset Sentinel
            </button>
          </div>
        </div>

        <!-- Live Activity Log -->
        <div class="space-y-1">
          <div class="text-[10px] text-zinc-400 uppercase font-bold">SECURITY ENGINE TELEMETRY LOG:</div>
          <div class="p-2 rounded bg-black/90 border border-zinc-800 text-[10px] text-zinc-400 font-mono h-28 overflow-y-auto space-y-0.5">
            {#if solverLog.length === 0}
              <div class="text-zinc-600 italic">No events logged yet. Execute a challenge test above.</div>
            {:else}
              {#each solverLog as line}
                <div>{line}</div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-t border-orange-500/30 text-[10px] text-zinc-400">
        <div>HEADERS: X-Atlas-Nonce-Id // X-Atlas-Signature // X-Atlas-Timestamp // X-Atlas-PoW-Nonce // Turnstile</div>
        <button
          type="button"
          onclick={() => {
            isOpen = false;
            onClose?.();
          }}
          class="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold"
        >
          CLOSE
        </button>
      </div>
    </div>
  </div>
{/if}
