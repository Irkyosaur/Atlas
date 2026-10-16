<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { securityEngine, type SecurityTokenState } from '$engine/security_challenge_engine';

  interface Props {
    siteKey?: string;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact' | 'flexible';
    onSuccess?: (token: string) => void;
    onError?: (errorCode: string) => void;
    onExpire?: () => void;
  }

  let {
    siteKey = '1x00000000000000000000AA', // Cloudflare dummy test sitekey for passing
    theme = 'dark',
    size = 'normal',
    onSuccess,
    onError,
    onExpire,
  }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let widgetId = $state<string | null>(null);
  let isScriptLoaded = $state<boolean>(false);
  let secState = $state<SecurityTokenState>(securityEngine.getState());
  let mockActive = $state<boolean>(false);

  // Global window augmentation for Turnstile
  declare global {
    interface Window {
      turnstile?: {
        render: (
          container: HTMLElement | string,
          options: {
            sitekey: string;
            theme?: string;
            size?: string;
            callback?: (token: string) => void;
            'error-callback'?: (error: any) => void;
            'expired-callback'?: () => void;
          }
        ) => string;
        reset: (widgetId: string) => void;
        remove: (widgetId: string) => void;
      };
      onloadTurnstileCallback?: () => void;
    }
  }

  onMount(() => {
    const unsub = securityEngine.subscribe((s) => {
      secState = s;
    });

    // Check if running in offline or mock mode
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost || secState.bypassDevMode) {
        mockActive = true;
      }
    }

    if (!mockActive) {
      loadTurnstileScript();
    }

    return () => {
      unsub();
      cleanupWidget();
    };
  });

  function loadTurnstileScript() {
    if (window.turnstile) {
      isScriptLoaded = true;
      mountWidget();
      return;
    }

    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      window.onloadTurnstileCallback = () => {
        isScriptLoaded = true;
        mountWidget();
      };

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        // Fallback to dev mock on offline / network barrier
        mockActive = true;
      };
      document.head.appendChild(script);
    }
  }

  function mountWidget() {
    if (!window.turnstile || !containerEl || widgetId !== null) return;

    try {
      widgetId = window.turnstile.render(containerEl, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          securityEngine.setTurnstileToken(token);
          onSuccess?.(token);
        },
        'error-callback': (err: any) => {
          onError?.(String(err));
        },
        'expired-callback': () => {
          securityEngine.setTurnstileToken(null);
          onExpire?.();
        },
      });
    } catch (e) {
      console.warn('Turnstile render warning, falling back to mock mode:', e);
      mockActive = true;
    }
  }

  function cleanupWidget() {
    if (widgetId !== null && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
      } catch (e) {
        // ignore
      }
      widgetId = null;
    }
  }

  function triggerMockBypass() {
    const mockToken = `cf_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    securityEngine.setTurnstileToken(mockToken);
    onSuccess?.(mockToken);
  }

  function resetChallenge() {
    securityEngine.setTurnstileToken(null);
    if (widgetId !== null && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }
</script>

<div class="turnstile-wrapper flex flex-col items-center justify-center p-3 rounded bg-zinc-950/80 border border-orange-500/30">
  <div class="flex items-center space-x-2 mb-2 w-full justify-between text-xs font-mono">
    <div class="flex items-center space-x-1.5">
      <span class="text-orange-400 font-bold">CLOUDFLARE TURNSTILE</span>
      <span class="px-1.5 py-0.5 text-[9px] rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
        BOT-DEFENSE
      </span>
    </div>
    <div class="text-[10px]">
      {#if secState.isTurnstileVerified}
        <span class="text-emerald-400 font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> VERIFIED
        </span>
      {:else}
        <span class="text-amber-400 font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> PENDING
        </span>
      {/if}
    </div>
  </div>

  {#if mockActive}
    <!-- Mock / Local Offline Dev Bypass Mode -->
    <div class="w-full p-2.5 rounded bg-zinc-900 border border-dashed border-orange-500/40 text-center space-y-2">
      <div class="text-[11px] text-zinc-400 font-mono">
        Offline / Dev Mode: Cloudflare Turnstile Mock Active
      </div>
      {#if secState.isTurnstileVerified}
        <div class="text-xs text-emerald-400 font-mono break-all font-semibold bg-emerald-950/30 p-1.5 rounded border border-emerald-500/30">
          TOKEN: {secState.turnstileToken?.slice(0, 24)}...
        </div>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
          onclick={resetChallenge}
        >
          Reset Token
        </button>
      {:else}
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-mono font-bold rounded bg-orange-600 hover:bg-orange-500 text-black shadow-md transition-colors"
          onclick={triggerMockBypass}
        >
          Simulate Human Verification (Dev Mock)
        </button>
      {/if}
    </div>
  {:else}
    <!-- Production Cloudflare Turnstile Target Element -->
    <div bind:this={containerEl} class="min-h-[65px] flex items-center justify-center"></div>
  {/if}
</div>
