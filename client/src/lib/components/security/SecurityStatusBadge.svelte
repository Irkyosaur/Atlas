<script lang="ts">
  import { onMount } from 'svelte';
  import { securityEngine, type SecurityTokenState, type MicroPoWSolution } from '$engine/security_challenge_engine';

  interface Props {
    onOpenSecurityModal?: () => void;
  }

  let { onOpenSecurityModal }: Props = $props();

  let secState = $state<SecurityTokenState>(securityEngine.getState());
  let isSolving = $state<boolean>(false);

  onMount(() => {
    const unsub = securityEngine.subscribe((s) => {
      secState = s;
    });
    return unsub;
  });

  async function handleRunPoWTest() {
    if (isSolving) return;
    isSolving = true;
    try {
      const chal = securityEngine.generateClientChallenge();
      await securityEngine.solveChallenge(chal);
    } catch (e) {
      console.error('PoW test failed:', e);
    } finally {
      isSolving = false;
    }
  }
</script>

<div class="flex items-center space-x-1.5 font-mono text-xs">
  <button
    type="button"
    class="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-black/60 border transition-all shadow-sm cursor-pointer {secState.isTurnstileVerified ? 'border-emerald-500/50 hover:border-emerald-400 text-emerald-400' : 'border-orange-500/50 hover:border-orange-400 text-orange-400'}"
    onclick={() => onOpenSecurityModal?.()}
    title="Security & Micro-PoW Bot Defense HUD [Phase 17, Stage 17.1]"
  >
    <span class="text-xs">🛡️</span>
    <span class="text-[10px] uppercase font-bold tracking-wider">SEC</span>

    {#if secState.isTurnstileVerified}
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
      <span class="text-[10px] text-zinc-300 font-bold hidden sm:inline">VERIFIED</span>
    {:else}
      <span class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
      <span class="text-[10px] text-zinc-400 font-bold hidden sm:inline">POW-ACTIVE</span>
    {/if}

    {#if secState.lastPoWSolution}
      <span class="hidden md:inline text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-orange-300 border border-zinc-700">
        {secState.lastPoWSolution.elapsedMs}ms
      </span>
    {/if}
  </button>
</div>
