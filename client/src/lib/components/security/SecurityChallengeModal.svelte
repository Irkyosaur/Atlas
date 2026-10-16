<script lang="ts">
  import { onMount } from 'svelte';
  import {
    securityEngine,
    type SecurityTokenState,
    type MicroPoWChallenge,
    type MicroPoWSolution,
    countLeadingZeroBits,
  } from '$engine/security_challenge_engine';
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

  onMount(() => {
    const unsub = securityEngine.subscribe((s) => {
      secState = s;
      currentDifficulty = s.powDifficulty;
      lastSolution = s.lastPoWSolution;
    });
    return unsub;
  });

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    solverLog = [`[${time}] ${msg}`, ...solverLog.slice(0, 15)];
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
              SECURITY SHIELD // MICRO-POW BOT DEFENSE
            </h2>
            <div class="text-[10px] text-zinc-400">
              PHASE 17 // STAGE 17.1 // CLOUDFLARE TURNSTILE & NONCE GENERATOR
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
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">TURNSTILE</div>
            <div class="text-xs font-bold mt-1 {secState.isTurnstileVerified ? 'text-emerald-400' : 'text-amber-400'}">
              {secState.isTurnstileVerified ? 'VERIFIED' : 'PENDING'}
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">DIFFICULTY</div>
            <div class="text-xs font-bold text-orange-400 mt-1">
              {currentDifficulty} BITS
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
            <div class="text-[10px] text-zinc-400">POW SOLVED</div>
            <div class="text-xs font-bold text-zinc-200 mt-1">
              {secState.totalChallengesSolved} TOTAL
            </div>
          </div>
          <div class="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
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
        <div>HEADERS: X-Atlas-PoW-Nonce // X-Atlas-PoW-Hash // X-Atlas-Turnstile-Token</div>
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
