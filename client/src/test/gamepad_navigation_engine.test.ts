// Location: client/src/test/gamepad_navigation_engine.test.ts
// Stage 15.2: Unit tests for HTML5 Gamepad API & HOTAS Galaxy Navigation Engine

import { describe, it, expect } from 'vitest';
import {
  processAxisInput,
  identifyGamepadHardware,
  PRESET_PROFILES,
  GamepadNavigationEngine,
  type AxisMappingConfig,
} from '../lib/engine/gamepad_navigation_engine';

describe('HTML5 Gamepad API & HOTAS Galaxy Navigation Engine (Stage 15.2)', () => {
  describe('Axis Input Processing (Deadzone, Inversion, Exponent)', () => {
    it('returns 0 when raw input is within deadzone threshold', () => {
      const config: AxisMappingConfig = {
        axisIndex: 0,
        invert: false,
        deadzone: 0.1,
        sensitivity: 1.0,
        exponent: 1.0,
      };

      expect(processAxisInput(0.0, config)).toBe(0);
      expect(processAxisInput(0.05, config)).toBe(0);
      expect(processAxisInput(-0.08, config)).toBe(0);
      expect(processAxisInput(0.1, config)).toBe(0);
    });

    it('smoothly scales input beyond deadzone linearly when exponent is 1.0', () => {
      const config: AxisMappingConfig = {
        axisIndex: 0,
        invert: false,
        deadzone: 0.1,
        sensitivity: 1.0,
        exponent: 1.0,
      };

      // At raw 1.0 -> (1.0 - 0.1) / (1.0 - 0.1) = 1.0
      expect(processAxisInput(1.0, config)).toBeCloseTo(1.0, 5);
      // At raw 0.55 -> (0.55 - 0.1) / 0.9 = 0.5
      expect(processAxisInput(0.55, config)).toBeCloseTo(0.5, 5);
      // Negative input
      expect(processAxisInput(-1.0, config)).toBeCloseTo(-1.0, 5);
    });

    it('inverts axis values when invert toggle is enabled', () => {
      const config: AxisMappingConfig = {
        axisIndex: 1,
        invert: true,
        deadzone: 0.05,
        sensitivity: 1.0,
        exponent: 1.0,
      };

      const outPositive = processAxisInput(0.525, config);
      expect(outPositive).toBeLessThan(0); // Inverted to negative
      const outNegative = processAxisInput(-0.525, config);
      expect(outNegative).toBeGreaterThan(0); // Inverted to positive
    });

    it('applies exponential sensitivity curves (quadratic / cubic)', () => {
      const linearConfig: AxisMappingConfig = {
        axisIndex: 0,
        invert: false,
        deadzone: 0.0,
        sensitivity: 1.0,
        exponent: 1.0,
      };

      const quadraticConfig: AxisMappingConfig = {
        axisIndex: 0,
        invert: false,
        deadzone: 0.0,
        sensitivity: 1.0,
        exponent: 2.0,
      };

      // At half deflection 0.5: linear = 0.5, quadratic = 0.25 (finer precision near center)
      expect(processAxisInput(0.5, linearConfig)).toBeCloseTo(0.5, 5);
      expect(processAxisInput(0.5, quadraticConfig)).toBeCloseTo(0.25, 5);

      // At full deflection 1.0: both reach 1.0
      expect(processAxisInput(1.0, quadraticConfig)).toBeCloseTo(1.0, 5);
    });
  });

  describe('Hardware Controller Identification', () => {
    it('accurately identifies VKB Gladiator and Gunfighter flight sticks', () => {
      expect(identifyGamepadHardware('VKBsim Gladiator EVO (Vendor: 231d Product: 0200)')).toBe('vkb_gladiator');
      expect(identifyGamepadHardware('VKB Gunfighter Modern Combat Grip IV')).toBe('vkb_gunfighter');
    });

    it('accurately identifies Virpil flight gear', () => {
      expect(identifyGamepadHardware('VPC Constellation Alpha-R (Vendor: 3344 Product: 0101)')).toBe('virpil_constellation');
    });

    it('accurately identifies Thrustmaster T.16000M, Warthog, and TWCS', () => {
      expect(identifyGamepadHardware('T.16000M Joystick (Vendor: 044f Product: b10a)')).toBe('thrustmaster_t16000m');
      expect(identifyGamepadHardware('Thrustmaster HOTAS Warthog Joystick (044f:0402)')).toBe('thrustmaster_warthog');
      expect(identifyGamepadHardware('TWCS Throttle (044f:b687)')).toBe('thrustmaster_twcs');
    });

    it('accurately identifies Logitech Saitek X52 and X56 HOTAS', () => {
      expect(identifyGamepadHardware('Saitek X52 Pro Flight Control System (06a3:075c)')).toBe('logitech_x52');
      expect(identifyGamepadHardware('Logitech G X56 Rhino HOTAS (0738:2215)')).toBe('logitech_x56');
    });

    it('accurately identifies standard Xbox and PlayStation controllers', () => {
      expect(identifyGamepadHardware('Xbox Wireless Controller (STANDARD GAMEPAD)')).toBe('xbox_gamepad');
      expect(identifyGamepadHardware('Sony Interactive Entertainment Wireless Controller DualSense (054c)')).toBe('playstation_gamepad');
    });
  });

  describe('Preset Profiles & Canonical Mappings', () => {
    it('provides configured profiles for all required flight stick hardware', () => {
      expect(PRESET_PROFILES.vkb_gladiator).toBeDefined();
      expect(PRESET_PROFILES.vkb_gunfighter).toBeDefined();
      expect(PRESET_PROFILES.virpil_constellation).toBeDefined();
      expect(PRESET_PROFILES.thrustmaster_t16000m).toBeDefined();
      expect(PRESET_PROFILES.thrustmaster_warthog).toBeDefined();
      expect(PRESET_PROFILES.thrustmaster_twcs).toBeDefined();
      expect(PRESET_PROFILES.logitech_x52).toBeDefined();
      expect(PRESET_PROFILES.logitech_x56).toBeDefined();
      expect(PRESET_PROFILES.xbox_gamepad).toBeDefined();
      expect(PRESET_PROFILES.playstation_gamepad).toBeDefined();
    });

    it('has valid button actions configured for map functions', () => {
      const vkb = PRESET_PROFILES.vkb_gladiator;
      expect(vkb.buttons.SELECT_STAR).toBe(0);
      expect(vkb.buttons.OPEN_SYSTEM_ORRERY).toBe(1);
      expect(vkb.buttons.RESET_CAMERA).toBe(2);
      expect(vkb.buttons.CENTER_SHIP).toBe(3);
    });
  });

  describe('GamepadNavigationEngine Kinematics & Polling', () => {
    it('returns zero orbit deltas when controller sticks are centered in deadzone', () => {
      const engine = new GamepadNavigationEngine();
      engine.setProfile(PRESET_PROFILES.vkb_gladiator);

      const mockGamepad = {
        axes: [0.01, -0.01, 0.0, 0.0, 0.0, 0.0],
        buttons: Array(12).fill({ pressed: false, value: 0 }),
      };

      const delta = engine.poll(0.016, mockGamepad);
      expect(delta.yawDelta).toBe(0);
      expect(delta.pitchDelta).toBe(0);
      expect(delta.zoomDelta).toBeCloseTo(1.0, 4);
      expect(delta.panXDelta).toBe(0);
      expect(delta.panYDelta).toBe(0);
      expect(delta.triggeredActions).toEqual([]);
    });

    it('computes smooth rotation deltas when flight stick is deflected', () => {
      const engine = new GamepadNavigationEngine();
      engine.setProfile(PRESET_PROFILES.vkb_gladiator);

      // Pitch is inverted on VKB gladiator preset
      const mockGamepad = {
        axes: [0.8, 0.8, 0.0, 0.0, 0.0, 0.0],
        buttons: Array(12).fill({ pressed: false, value: 0 }),
      };

      const delta = engine.poll(0.016, mockGamepad);
      expect(delta.yawDelta).toBeGreaterThan(0);
      expect(delta.pitchDelta).toBeLessThan(0); // Inverted pitch
    });

    it('computes logarithmic zoom delta when throttle is deflected', () => {
      const engine = new GamepadNavigationEngine();
      engine.setProfile(PRESET_PROFILES.vkb_gladiator);

      // Throttle forward (+0.9)
      const mockForward = {
        axes: [0.0, 0.0, 0.9, 0.0, 0.0, 0.0],
        buttons: Array(12).fill({ pressed: false, value: 0 }),
      };
      const forwardDelta = engine.poll(0.016, mockForward);
      expect(forwardDelta.zoomDelta).toBeGreaterThan(1.0);

      // Throttle reverse (-0.9)
      const mockReverse = {
        axes: [0.0, 0.0, -0.9, 0.0, 0.0, 0.0],
        buttons: Array(12).fill({ pressed: false, value: 0 }),
      };
      const reverseDelta = engine.poll(0.016, mockReverse);
      expect(reverseDelta.zoomDelta).toBeLessThan(1.0);
    });

    it('detects rising-edge button presses for SELECT_STAR and RESET_CAMERA', () => {
      const engine = new GamepadNavigationEngine();
      engine.setProfile(PRESET_PROFILES.vkb_gladiator);

      const buttonsUnpressed = Array(12).fill(null).map(() => ({ pressed: false, value: 0 }));
      const buttonsPressed = Array(12).fill(null).map((_, i) => ({
        pressed: i === 0 || i === 2, // Button 0: SELECT_STAR, Button 2: RESET_CAMERA
        value: i === 0 || i === 2 ? 1 : 0,
      }));

      // Initial frame unpressed
      engine.poll(0.016, { axes: [0, 0, 0, 0, 0, 0], buttons: buttonsUnpressed });

      // Frame with trigger press
      const delta1 = engine.poll(0.016, { axes: [0, 0, 0, 0, 0, 0], buttons: buttonsPressed });
      expect(delta1.triggeredActions).toContain('SELECT_STAR');
      expect(delta1.triggeredActions).toContain('RESET_CAMERA');

      // Subsequent frame while held down: should NOT trigger again (rising edge)
      const delta2 = engine.poll(0.016, { axes: [0, 0, 0, 0, 0, 0], buttons: buttonsPressed });
      expect(delta2.triggeredActions).toEqual([]);
    });
  });
});
