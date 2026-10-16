// Location: client/src/test/streamdeck_engine.test.ts
// Stage 15.1: Unit tests for Elgato Stream Deck Engine, SVG Generator & Action Handler

import { describe, it, expect } from 'vitest';
import {
  STREAM_DECK_ACTIONS,
  generateStreamDeckKeySvg,
  svgToDataUrl,
  createDefaultStreamDeckProfiles,
  executeStreamDeckAction,
  type ShipStatusTelemetry,
} from '../lib/engine/streamdeck_engine';

describe('Elgato Stream Deck Engine & Dynamic LCD Key Generator (Stage 15.1)', () => {
  const sampleTelemetry: ShipStatusTelemetry = {
    currentSystem: 'Sol',
    remainingJumps: 4,
    nextWaypointName: 'Alpha Centauri',
    nextWaypointClass: 'G2V',
    fuelPercent: 82.5,
    isFuelLow: false,
    nearestFuelStarName: 'Proxima Centauri',
    nearestFuelStarDistLy: 4.2,
    nearestFuelStarClass: 'M5.5V',
    isScoopable: true,
    nightModeActive: false,
  };

  it('exposes all required canonical actions in manifest and action registry', () => {
    expect(STREAM_DECK_ACTIONS.JUMP_COUNTER.uuid).toBe('com.atlas.cockpit.jump_counter');
    expect(STREAM_DECK_ACTIONS.FUEL_STATUS.uuid).toBe('com.atlas.cockpit.fuel_status');
    expect(STREAM_DECK_ACTIONS.FUEL_STAR.uuid).toBe('com.atlas.cockpit.fuel_star');
    expect(STREAM_DECK_ACTIONS.NEXT_WAYPOINT.uuid).toBe('com.atlas.cockpit.next_waypoint');
    expect(STREAM_DECK_ACTIONS.COPY_WAYPOINT.uuid).toBe('com.atlas.cockpit.copy_waypoint');
    expect(STREAM_DECK_ACTIONS.TOGGLE_NIGHTMODE.uuid).toBe('com.atlas.cockpit.toggle_nightmode');
    expect(STREAM_DECK_ACTIONS.CENTER_CAMERA.uuid).toBe('com.atlas.cockpit.center_camera');
    expect(STREAM_DECK_ACTIONS.CLEAR_ROUTE.uuid).toBe('com.atlas.cockpit.clear_route');
  });

  it('generates dynamic 72x72 SVG icon for Jump Counter', () => {
    const svg = generateStreamDeckKeySvg('com.atlas.cockpit.jump_counter', sampleTelemetry);
    expect(svg).toContain('viewBox="0 0 72 72"');
    expect(svg).toContain('JUMPS LEFT');
    expect(svg).toContain('>4<');
  });

  it('generates dynamic 72x72 SVG icon for Fuel Status with level bar and scoop indicator', () => {
    const svg = generateStreamDeckKeySvg('com.atlas.cockpit.fuel_status', sampleTelemetry);
    expect(svg).toContain('FUEL TANK');
    expect(svg).toContain('83%');
    expect(svg).toContain('SCOOP READY');

    // Test low fuel condition
    const lowFuelSvg = generateStreamDeckKeySvg('com.atlas.cockpit.fuel_status', {
      ...sampleTelemetry,
      fuelPercent: 14.0,
      isFuelLow: true,
      isScoopable: false,
    });
    expect(lowFuelSvg).toContain('14%');
    expect(lowFuelSvg).toContain('NO SCOOP');
    expect(lowFuelSvg).toContain('#EF4444');
  });

  it('generates dynamic 72x72 SVG icon for Nearest Fuel Star', () => {
    const svg = generateStreamDeckKeySvg('com.atlas.cockpit.fuel_star', sampleTelemetry);
    expect(svg).toContain('FUEL STAR');
    expect(svg).toContain('4.2 LY');
    expect(svg).toContain('KGBFOAM');
  });

  it('generates dynamic 72x72 SVG icon for Next Waypoint with truncation and title', () => {
    const svg = generateStreamDeckKeySvg('com.atlas.cockpit.next_waypoint', sampleTelemetry);
    expect(svg).toContain('NEXT HOP');
    expect(svg).toContain('Alpha Ce..');
  });

  it('generates crisp SVG icons for 1-key action triggers: Copy, Center, Nightmode, Clear', () => {
    const copySvg = generateStreamDeckKeySvg('com.atlas.cockpit.copy_waypoint', sampleTelemetry);
    expect(copySvg).toContain('1-KEY COPY');
    expect(copySvg).toContain('CLIPBOARD');

    const centerSvg = generateStreamDeckKeySvg('com.atlas.cockpit.center_camera', sampleTelemetry);
    expect(centerSvg).toContain('CENTER CAM');
    expect(centerSvg).toContain('SHIP LOCK');

    const nightSvg = generateStreamDeckKeySvg('com.atlas.cockpit.toggle_nightmode', {
      ...sampleTelemetry,
      nightModeActive: true,
    });
    expect(nightSvg).toContain('NIGHT MODE');
    expect(nightSvg).toContain('ACTIVE');

    const clearSvg = generateStreamDeckKeySvg('com.atlas.cockpit.clear_route', sampleTelemetry);
    expect(clearSvg).toContain('CLEAR ROUTE');
    expect(clearSvg).toContain('RESET NAV');
  });

  it('converts SVG markup to Data URL cleanly', () => {
    const svg = '<svg width="72" height="72"></svg>';
    const dataUrl = svgToDataUrl(svg);
    expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('constructs pre-built profiles for Standard, XL, and Plus devices', () => {
    const profiles = createDefaultStreamDeckProfiles();
    expect(profiles.STANDARD.keyCount).toBe(15);
    expect(profiles.STANDARD.columns).toBe(5);
    expect(profiles.STANDARD.rows).toBe(3);
    expect(profiles.STANDARD.slots.length).toBe(15);

    expect(profiles.XL.keyCount).toBe(32);
    expect(profiles.XL.columns).toBe(8);
    expect(profiles.XL.rows).toBe(4);
    expect(profiles.XL.slots.length).toBe(32);

    expect(profiles.PLUS.keyCount).toBe(8);
    expect(profiles.PLUS.columns).toBe(4);
    expect(profiles.PLUS.rows).toBe(2);
    expect(profiles.PLUS.touchStripLabel).toBeDefined();
  });

  it('executes 1-key actions and correctly invokes dispatch handlers', async () => {
    let nightModeToggled = false;
    let cameraCentered = false;
    let routeCleared = false;
    let waypointCopied = false;

    const resCopy = await executeStreamDeckAction('com.atlas.cockpit.copy_waypoint', {
      copyWaypoint: async () => {
        waypointCopied = true;
        return 'Colonia';
      },
    });
    expect(resCopy.success).toBe(true);
    expect(waypointCopied).toBe(true);
    expect(resCopy.message).toContain('Colonia');

    const resNight = await executeStreamDeckAction('com.atlas.cockpit.toggle_nightmode', {
      toggleNightMode: () => {
        nightModeToggled = true;
      },
    });
    expect(resNight.success).toBe(true);
    expect(nightModeToggled).toBe(true);

    const resCam = await executeStreamDeckAction('com.atlas.cockpit.center_camera', {
      centerCamera: () => {
        cameraCentered = true;
      },
    });
    expect(resCam.success).toBe(true);
    expect(cameraCentered).toBe(true);

    const resClear = await executeStreamDeckAction('com.atlas.cockpit.clear_route', {
      clearRoute: () => {
        routeCleared = true;
      },
    });
    expect(resClear.success).toBe(true);
    expect(routeCleared).toBe(true);
  });
});
