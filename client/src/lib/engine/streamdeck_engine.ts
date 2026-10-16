// Location: client/src/lib/engine/streamdeck_engine.ts
// Stage 15.1: Elgato Stream Deck Plugin Engine & Dynamic 72x72 SVG LCD Key Icon Generator
// Generates dynamic SVG key icons and executes 1-key navigation actions across Standard (15-key), XL (32-key), and Plus hardware.

export type StreamDeckDeviceModel = 'STANDARD' | 'XL' | 'PLUS';

export interface StreamDeckKeyAction {
  id: string;
  uuid: string;
  title: string;
  description: string;
  category: 'TELEMETRY' | 'NAVIGATION' | 'VIEW' | 'UTILITY';
  defaultTitle: string;
  isDynamicIcon: boolean;
}

export interface StreamDeckKeySlot {
  index: number;
  actionUuid: string | null;
  customLabel?: string;
  dialStep?: number;
}

export interface StreamDeckProfile {
  id: string;
  name: string;
  model: StreamDeckDeviceModel;
  keyCount: number;
  columns: number;
  rows: number;
  slots: StreamDeckKeySlot[];
  touchStripLabel?: string;
}

export interface ShipStatusTelemetry {
  currentSystem: string;
  remainingJumps: number;
  nextWaypointName: string;
  nextWaypointClass?: string;
  fuelPercent: number;
  isFuelLow: boolean;
  nearestFuelStarName: string;
  nearestFuelStarDistLy: number;
  nearestFuelStarClass: string;
  isScoopable: boolean;
  nightModeActive: boolean;
}

export const STREAM_DECK_ACTIONS: Record<string, StreamDeckKeyAction> = {
  JUMP_COUNTER: {
    id: 'jump_counter',
    uuid: 'com.atlas.cockpit.jump_counter',
    title: 'Jump Counter',
    description: 'Displays remaining hyperspace jumps and active route counter',
    category: 'TELEMETRY',
    defaultTitle: 'JUMPS',
    isDynamicIcon: true,
  },
  FUEL_STATUS: {
    id: 'fuel_status',
    uuid: 'com.atlas.cockpit.fuel_status',
    title: 'Fuel % & Scoop',
    description: 'Live fuel tank level and scoopable star warning indicator',
    category: 'TELEMETRY',
    defaultTitle: 'FUEL',
    isDynamicIcon: true,
  },
  FUEL_STAR: {
    id: 'fuel_star',
    uuid: 'com.atlas.cockpit.fuel_star',
    title: 'Nearest Fuel Star',
    description: 'Distance and spectral type of closest KGBFOAM fuel star',
    category: 'TELEMETRY',
    defaultTitle: 'SCOOP',
    isDynamicIcon: true,
  },
  NEXT_WAYPOINT: {
    id: 'next_waypoint',
    uuid: 'com.atlas.cockpit.next_waypoint',
    title: 'Next Waypoint',
    description: 'Name of the immediate jump destination in route',
    category: 'NAVIGATION',
    defaultTitle: 'NAV HOP',
    isDynamicIcon: true,
  },
  COPY_WAYPOINT: {
    id: 'copy_waypoint',
    uuid: 'com.atlas.cockpit.copy_waypoint',
    title: 'Copy Next Waypoint',
    description: '1-Press copy next waypoint to system clipboard for instant game map pasting',
    category: 'NAVIGATION',
    defaultTitle: 'COPY NAV',
    isDynamicIcon: false,
  },
  TOGGLE_NIGHTMODE: {
    id: 'toggle_nightmode',
    uuid: 'com.atlas.cockpit.toggle_nightmode',
    title: 'Toggle Night Mode',
    description: 'Switches Atlas UI between standard orange HUD and red/amber night vision',
    category: 'VIEW',
    defaultTitle: 'NIGHT MD',
    isDynamicIcon: false,
  },
  CENTER_CAMERA: {
    id: 'center_camera',
    uuid: 'com.atlas.cockpit.center_camera',
    title: 'Center Camera',
    description: 'Snaps Atlas 3D galaxy view directly onto current ship coordinates',
    category: 'VIEW',
    defaultTitle: 'CENTER',
    isDynamicIcon: false,
  },
  CLEAR_ROUTE: {
    id: 'clear_route',
    uuid: 'com.atlas.cockpit.clear_route',
    title: 'Clear Nav Route',
    description: 'Flushes the current active plotted route and resets target lock',
    category: 'NAVIGATION',
    defaultTitle: 'CLEAR NAV',
    isDynamicIcon: false,
  },
};

/**
 * Escapes text for XML/SVG safety
 */
function escapeSvg(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Stage 15.1: Dynamic 72x72 SVG icon generator rendering real-time ship status
 * Returns raw SVG string with 72x72 viewBox, optimized for LCD hardware display.
 */
export function generateStreamDeckKeySvg(
  actionUuid: string,
  telemetry: ShipStatusTelemetry,
  options?: { customLabel?: string; isPressed?: boolean }
): string {
  const isPressed = options?.isPressed ?? false;
  const borderCol = isPressed ? '#00E5FF' : '#FF7100';
  const bgCol = isPressed ? '#1a1005' : '#080502';
  const labelCol = '#FFA600';
  const valCol = '#FFFFFF';

  switch (actionUuid) {
    case 'com.atlas.cockpit.jump_counter': {
      const jumps = telemetry.remainingJumps;
      const jumpCol = jumps === 0 ? '#10B981' : jumps <= 3 ? '#FFB000' : '#FF7100';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <path d="M 6 18 L 66 18" stroke="${borderCol}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">JUMPS LEFT</text>
  <text x="36" y="44" fill="${jumpCol}" font-size="24" font-family="monospace" font-weight="900" text-anchor="middle">${jumps}</text>
  <circle cx="24" cy="58" r="2.5" fill="${jumps > 0 ? '#FF7100' : '#444'}"/>
  <circle cx="36" cy="58" r="2.5" fill="${jumps > 1 ? '#FF7100' : '#444'}"/>
  <circle cx="48" cy="58" r="2.5" fill="${jumps > 2 ? '#FF7100' : '#444'}"/>
</svg>`;
    }

    case 'com.atlas.cockpit.fuel_status': {
      const pct = Math.max(0, Math.min(100, Math.round(telemetry.fuelPercent)));
      const isLow = telemetry.isFuelLow || pct < 25;
      const barCol = isLow ? '#EF4444' : pct < 50 ? '#F59E0B' : '#10B981';
      const barWidth = Math.round((pct / 100) * 56);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${isLow ? '#EF4444' : borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">FUEL TANK</text>
  <text x="36" y="38" fill="${barCol}" font-size="20" font-family="monospace" font-weight="900" text-anchor="middle">${pct}%</text>
  <!-- Fuel Level Bar -->
  <rect x="8" y="46" width="56" height="8" rx="2" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <rect x="8" y="46" width="${barWidth}" height="8" rx="2" fill="${barCol}"/>
  <text x="36" y="64" fill="${telemetry.isScoopable ? '#10B981' : '#71717a'}" font-size="7.5" font-family="monospace" text-anchor="middle">${telemetry.isScoopable ? 'SCOOP READY' : 'NO SCOOP'}</text>
</svg>`;
    }

    case 'com.atlas.cockpit.fuel_star': {
      const dist = telemetry.nearestFuelStarDistLy.toFixed(1);
      const starClass = escapeSvg(telemetry.nearestFuelStarClass || 'K');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">FUEL STAR</text>
  <!-- Star Graphic -->
  <circle cx="36" cy="30" r="10" fill="#FFB000" fill-opacity="0.3" stroke="#FFB000" stroke-width="1.5"/>
  <text x="36" y="34" fill="#FFFFFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">${starClass}</text>
  <text x="36" y="52" fill="${valCol}" font-size="12" font-family="monospace" font-weight="bold" text-anchor="middle">${dist} LY</text>
  <text x="36" y="64" fill="#00E5FF" font-size="7" font-family="monospace" text-anchor="middle">KGBFOAM</text>
</svg>`;
    }

    case 'com.atlas.cockpit.next_waypoint': {
      const name = telemetry.nextWaypointName || 'NO TARGET';
      const truncated = name.length > 9 ? name.substring(0, 8) + '..' : name;
      const safeName = escapeSvg(truncated);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">NEXT HOP</text>
  <polygon points="36,22 44,34 28,34" fill="${borderCol}"/>
  <text x="36" y="48" fill="${valCol}" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${safeName}</text>
  <text x="36" y="62" fill="#00E5FF" font-size="7.5" font-family="monospace" text-anchor="middle">WAYPOINT</text>
</svg>`;
    }

    case 'com.atlas.cockpit.copy_waypoint': {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">1-KEY COPY</text>
  <rect x="24" y="22" width="20" height="24" rx="2" fill="none" stroke="#00E5FF" stroke-width="2"/>
  <rect x="28" y="26" width="20" height="24" rx="2" fill="#00E5FF" fill-opacity="0.2" stroke="#00E5FF" stroke-width="1.5"/>
  <text x="36" y="62" fill="${valCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">CLIPBOARD</text>
</svg>`;
    }

    case 'com.atlas.cockpit.toggle_nightmode': {
      const isNight = telemetry.nightModeActive;
      const eyeCol = isNight ? '#EF4444' : '#00E5FF';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${isNight ? '#EF4444' : borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">NIGHT MODE</text>
  <circle cx="36" cy="34" r="10" fill="none" stroke="${eyeCol}" stroke-width="2"/>
  <circle cx="36" cy="34" r="4" fill="${eyeCol}"/>
  <text x="36" y="60" fill="${isNight ? '#EF4444' : '#10B981'}" font-size="9" font-family="monospace" font-weight="bold" text-anchor="middle">${isNight ? 'ACTIVE' : 'OFF'}</text>
</svg>`;
    }

    case 'com.atlas.cockpit.center_camera': {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">CENTER CAM</text>
  <circle cx="36" cy="34" r="11" fill="none" stroke="#FF7100" stroke-width="1.5"/>
  <line x1="36" y1="20" x2="36" y2="48" stroke="#FF7100" stroke-width="1.5"/>
  <line x1="22" y1="34" x2="50" y2="34" stroke="#FF7100" stroke-width="1.5"/>
  <circle cx="36" cy="34" r="3" fill="#00E5FF"/>
  <text x="36" y="62" fill="${valCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">SHIP LOCK</text>
</svg>`;
    }

    case 'com.atlas.cockpit.clear_route': {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="2"/>
  <text x="36" y="14" fill="${labelCol}" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">CLEAR ROUTE</text>
  <line x1="24" y1="22" x2="48" y2="46" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
  <line x1="48" y1="22" x2="24" y2="46" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
  <text x="36" y="62" fill="#EF4444" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">RESET NAV</text>
</svg>`;
    }

    default: {
      const customTitle = escapeSvg(options?.customLabel || 'UNBOUND');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="8" fill="${bgCol}" stroke="#52525b" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="36" y="40" fill="#71717a" font-size="8.5" font-family="monospace" text-anchor="middle">${customTitle}</text>
</svg>`;
    }
  }
}

/**
 * Converts raw SVG markup to a Base64 data URL for direct Stream Deck LCD key injection.
 */
export function svgToDataUrl(svgString: string): string {
  // Safe in both Node.js (globalThis.Buffer) and browser (btoa)
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
  } else if (typeof (globalThis as any).Buffer !== 'undefined') {
    return `data:image/svg+xml;base64,${(globalThis as any).Buffer.from(svgString, 'utf-8').toString('base64')}`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

/**
 * Factory creating canonical Stream Deck Profiles for Standard, XL, and Plus.
 */
export function createDefaultStreamDeckProfiles(): Record<StreamDeckDeviceModel, StreamDeckProfile> {
  // Standard (15 keys: 3 rows x 5 columns)
  const standardSlots: StreamDeckKeySlot[] = [
    { index: 0, actionUuid: 'com.atlas.cockpit.jump_counter' },
    { index: 1, actionUuid: 'com.atlas.cockpit.next_waypoint' },
    { index: 2, actionUuid: 'com.atlas.cockpit.copy_waypoint' },
    { index: 3, actionUuid: 'com.atlas.cockpit.fuel_status' },
    { index: 4, actionUuid: 'com.atlas.cockpit.fuel_star' },
    { index: 5, actionUuid: 'com.atlas.cockpit.center_camera' },
    { index: 6, actionUuid: 'com.atlas.cockpit.toggle_nightmode' },
    { index: 7, actionUuid: 'com.atlas.cockpit.clear_route' },
    { index: 8, actionUuid: null },
    { index: 9, actionUuid: null },
    { index: 10, actionUuid: null },
    { index: 11, actionUuid: null },
    { index: 12, actionUuid: null },
    { index: 13, actionUuid: null },
    { index: 14, actionUuid: null },
  ];

  // XL (32 keys: 4 rows x 8 columns)
  const xlSlots: StreamDeckKeySlot[] = [];
  for (let i = 0; i < 32; i++) {
    let actionUuid: string | null = null;
    if (i === 0) actionUuid = 'com.atlas.cockpit.jump_counter';
    else if (i === 1) actionUuid = 'com.atlas.cockpit.next_waypoint';
    else if (i === 2) actionUuid = 'com.atlas.cockpit.copy_waypoint';
    else if (i === 3) actionUuid = 'com.atlas.cockpit.clear_route';
    else if (i === 4) actionUuid = 'com.atlas.cockpit.fuel_status';
    else if (i === 5) actionUuid = 'com.atlas.cockpit.fuel_star';
    else if (i === 6) actionUuid = 'com.atlas.cockpit.center_camera';
    else if (i === 7) actionUuid = 'com.atlas.cockpit.toggle_nightmode';
    xlSlots.push({ index: i, actionUuid });
  }

  // Plus (8 keys + 4 dials + touch strip)
  const plusSlots: StreamDeckKeySlot[] = [
    { index: 0, actionUuid: 'com.atlas.cockpit.jump_counter' },
    { index: 1, actionUuid: 'com.atlas.cockpit.next_waypoint' },
    { index: 2, actionUuid: 'com.atlas.cockpit.copy_waypoint' },
    { index: 3, actionUuid: 'com.atlas.cockpit.fuel_status' },
    { index: 4, actionUuid: 'com.atlas.cockpit.fuel_star' },
    { index: 5, actionUuid: 'com.atlas.cockpit.center_camera' },
    { index: 6, actionUuid: 'com.atlas.cockpit.toggle_nightmode' },
    { index: 7, actionUuid: 'com.atlas.cockpit.clear_route' },
  ];

  return {
    STANDARD: {
      id: 'atlas-standard-profile',
      name: 'Atlas Standard (15 Keys)',
      model: 'STANDARD',
      keyCount: 15,
      columns: 5,
      rows: 3,
      slots: standardSlots,
    },
    XL: {
      id: 'atlas-xl-profile',
      name: 'Atlas Cockpit XL (32 Keys)',
      model: 'XL',
      keyCount: 32,
      columns: 8,
      rows: 4,
      slots: xlSlots,
    },
    PLUS: {
      id: 'atlas-plus-profile',
      name: 'Atlas Cockpit Plus (8 Keys + Dials)',
      model: 'PLUS',
      keyCount: 8,
      columns: 4,
      rows: 2,
      slots: plusSlots,
      touchStripLabel: 'ATLAS FLIGHT INTELLIGENCE // READY',
    },
  };
}

/**
 * Executes a 1-key action and returns status result
 */
export async function executeStreamDeckAction(
  actionUuid: string,
  handlers: {
    copyWaypoint?: () => Promise<string | null>;
    toggleNightMode?: () => void;
    centerCamera?: () => void;
    clearRoute?: () => void;
  }
): Promise<{ success: boolean; action: string; message: string }> {
  switch (actionUuid) {
    case 'com.atlas.cockpit.copy_waypoint': {
      if (handlers.copyWaypoint) {
        const copied = await handlers.copyWaypoint();
        return {
          success: true,
          action: 'copy_waypoint',
          message: copied ? `Copied ${copied} to clipboard` : 'No waypoint to copy',
        };
      }
      return { success: false, action: 'copy_waypoint', message: 'No handler bound' };
    }

    case 'com.atlas.cockpit.toggle_nightmode': {
      if (handlers.toggleNightMode) {
        handlers.toggleNightMode();
        return { success: true, action: 'toggle_nightmode', message: 'Toggled night mode' };
      }
      return { success: false, action: 'toggle_nightmode', message: 'No handler bound' };
    }

    case 'com.atlas.cockpit.center_camera': {
      if (handlers.centerCamera) {
        handlers.centerCamera();
        return { success: true, action: 'center_camera', message: 'Camera centered on ship' };
      }
      return { success: false, action: 'center_camera', message: 'No handler bound' };
    }

    case 'com.atlas.cockpit.clear_route': {
      if (handlers.clearRoute) {
        handlers.clearRoute();
        return { success: true, action: 'clear_route', message: 'Navigation route cleared' };
      }
      return { success: false, action: 'clear_route', message: 'No handler bound' };
    }

    default:
      return {
        success: true,
        action: actionUuid,
        message: 'Telemetry key refreshed',
      };
  }
}
