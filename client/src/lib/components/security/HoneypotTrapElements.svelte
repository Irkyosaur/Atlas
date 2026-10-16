<script lang="ts">
  import { honeypotEngine } from '$engine/honeypot_engine';

  interface Props {
    trapName?: string;
  }

  let { trapName = 'cartography_bulk_export_v1' }: Props = $props();

  function handleTrapClick(e: MouseEvent, reason: string) {
    // Prevent navigating
    e.preventDefault();
    e.stopPropagation();
    honeypotEngine.tripHoneypot(`${trapName}_${reason}`, 'link_trap');
  }

  function handleHiddenInputChange(e: Event) {
    honeypotEngine.tripHoneypot(`${trapName}_hidden_field`, 'hidden_input');
  }
</script>

<!--
  Stage 17.4: Inconspicuous DOM / CSS Honeypot Traps
  Hidden from genuine human sight via clip-path, absolute off-screen positioning, and opacity: 0,
  but completely present in the DOM tree and hyperlinks for greedy bots, scrapers, and headless crawlers.
-->
<div
  class="atlas-honeypot-envelope"
  aria-hidden="true"
  tabindex="-1"
  style="position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; overflow: hidden; opacity: 0.001; pointer-events: auto; z-index: -100;"
>
  <!-- Trap link 1: Bulk API endpoints tempting to naive scrapers -->
  <a
    href="/api/v1/dump/systems_all_records.json"
    rel="nofollow"
    tabindex="-1"
    onclick={(e) => handleTrapClick(e, 'bulk_json_link')}
    style="clip-path: inset(50%); white-space: nowrap;"
  >
    Download Full Galaxy Database Raw JSON (Unrestricted)
  </a>

  <!-- Trap link 2: Administrative API key crawl target -->
  <a
    href="/api/internal/admin/secrets.env"
    rel="nofollow"
    tabindex="-1"
    onclick={(e) => handleTrapClick(e, 'secrets_env_link')}
    style="display: inline-block; width: 0; height: 0; overflow: hidden;"
  >
    Frontier CAPI Master Keys Backup
  </a>

  <!-- Trap Form & Input Honeypot (Spambots and auto-form-fillers) -->
  <form action="/api/v1/telemetry/report" method="POST" tabindex="-1">
    <input
      type="text"
      name="atlas_bot_honeypot_email"
      value=""
      autocomplete="off"
      tabindex="-1"
      oninput={handleHiddenInputChange}
    />
    <input
      type="checkbox"
      name="atlas_accept_auto_scrape"
      tabindex="-1"
      onchange={handleHiddenInputChange}
    />
  </form>
</div>
