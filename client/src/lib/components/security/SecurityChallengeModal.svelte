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

  onMount(() => {
    const unsubSec = securityEngine.subscribe((s) => {
      secState = s;
      currentDifficulty = s.powDifficulty;
      lastSolution = s.lastPoWSolution;
    });

    const unsubHmac = hmacNonceEngine.subscribe((s) => {
      hmacState = s;
    });

    return () => {
      unsubSec();
      unsubHmac();
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

  function toggleDevBypass() {
    securityEngine.setDevBypass(!secState.bypassDevMode);
    addLog(`Dev mock bypass set to: ${!secState.bypassDevMode}`);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none"
    role="dialog"
    aria-modal="true"
    aria-label="Bot Defense & Micro-PoW Challenge Verification"
  >
    <div class="relative w-full max-w-2xl bg-zinc-950 border border-orange-500/60 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.25)] flex flex-col font-mono text-xs text-zinc-300">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-orange-500/40">
        <div class="flex items-center space-x-2.5">
          <span class="text-base">🛡️</span>
          <div>
            <h2 class="text-sm font-bold text-orange-400 tracking-wider">
              SECURITY SHIELD // MICRO-POW & DYNAMIC 30S HMAC NONCE
            </h2>
            <div class="text-[10px] text-zinc-400">
              PHASE 17 // STAGE 17.2 // ROLLING HMAC NONCES, REPLAY DEFENSE & TURNSTILE
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
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">TURNSTILE</div>
            <div class="text-xs font-bold mt-1 {secState.isTurnstileVerified ? 'text-emerald-400' : 'text-amber-400'}">
              {secState.isTurnstileVerified ? 'VERIFIED' : 'PENDING'}
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">POW DIFFICULTY</div>
            <div class="text-xs font-bold text-orange-400 mt-1">
              {currentDifficulty} BITS
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">HMAC 30S WINDOW</div>
            <div class="text-xs font-bold text-cyan-400 mt-1 tabular-nums">
              {hmacState.secondsRemaining}s LEFT
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">REPLAYS BLOCKED</div>
            <div class="text-xs font-bold mt-1 {hmacState.replaysDetected > 0 ? 'text-amber-400' : 'text-emerald-400'}">
              {hmacState.replaysDetected} DETECTED
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 col-span-2 sm:col-span-1">
            <div class="text-[10px] text-zinc-400">DEV BYPASS</div>
            <div class="text-xs font-bold mt-1 {secState.bypassDevMode ? 'text-amber-400' : 'text-zinc-500'}">
              {secState.bypassDevMode ? 'ACTIVE' : 'OFF'}
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
