// Location: client/src/lib/engine/gamepad_navigation_engine.ts
// Stage 15.2: HTML5 Gamepad API & HOTAS / Flight Stick Galaxy Navigation Engine
// Supports VKB, Virpil, Thrustmaster (T.16000M / Warthog), Logitech (X52 / X56), and standard Gamepads (Xbox / PlayStation)

export type GamepadHardwareType =
  | 'vkb_gunfighter'
  | 'vkb_gladiator'
  | 'virpil_constellation'
  | 'thrustmaster_t16000m'
  | 'thrustmaster_warthog'
  | 'thrustmaster_twcs'
  | 'logitech_x52'
  | 'logitech_x56'
  | 'xbox_gamepad'
  | 'playstation_gamepad'
  | 'generic_flightstick'
  | 'generic_gamepad';

export interface AxisMappingConfig {
  axisIndex: number;
  invert: boolean;
  deadzone: number; // 0.0 to 0.5 (standard 0.05 - 0.15)
  sensitivity: number; // multiplier, typically 1.0
  exponent: number; // 1.0 = linear, 2.0 = quadratic, 3.0 = cubic response curve
}

export interface ButtonMappingConfig {
  buttonIndex: number; // Button index on device
  action: GamepadAction;
}

export type GamepadAction =
  | 'SELECT_STAR'
  | 'OPEN_SYSTEM_ORRERY'
  | 'RESET_CAMERA'
  | 'CENTER_SHIP'
  | 'TOGGLE_GRID'
  | 'TOGGLE_NIGHTMODE'
  | 'NONE';

export interface GamepadProfile {
  id: string;
  name: string;
  hardwareType: GamepadHardwareType;
  matchPattern?: string; // Regex pattern to test against navigator.getGamepads()[i].id
  // Analog axes
  yaw: AxisMappingConfig; // Orbit azimuth (horizontal stick or rudder)
  pitch: AxisMappingConfig; // Orbit polar (vertical stick)
  zoom: AxisMappingConfig; // Distance (throttle or rotary dial / analog triggers)
  panX: AxisMappingConfig; // Hat X / secondary stick X
  panY: AxisMappingConfig; // Hat Y / secondary stick Y
  // Button mappings
  buttons: Record<GamepadAction, number>; // Maps Action -> Button Index
}

export interface ControllerDelta {
  yawDelta: number; // Radians to add to targetAzimuth
  pitchDelta: number; // Radians to add to targetPolar
  zoomDelta: number; // Scale factor or multiplier for targetDistance
  panXDelta: number; // World pan X in LY
  panYDelta: number; // World pan Y in LY
  triggeredActions: GamepadAction[];
}

export interface ConnectedGamepadInfo {
  index: number;
  id: string;
  hardwareType: GamepadHardwareType;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
  connected: boolean;
}

export const PRESET_PROFILES: Record<GamepadHardwareType, GamepadProfile> = {
  vkb_gladiator: {
    id: 'vkb_gladiator',
    name: 'VKB Gladiator NXT EVO',
    hardwareType: 'vkb_gladiator',
    matchPattern: 'vkb|gladiator|231d',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.04, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0, // Trigger
      OPEN_SYSTEM_ORRERY: 1, // Weapon release
      RESET_CAMERA: 2, // Pinky button
      CENTER_SHIP: 3, // Hat center / red button
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  vkb_gunfighter: {
    id: 'vkb_gunfighter',
    name: 'VKB Gunfighter IV (Modern Combat Grip)',
    hardwareType: 'vkb_gunfighter',
    matchPattern: 'gunfighter|vkbsim',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.03, sensitivity: 1.1, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.03, sensitivity: 1.1, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.03, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  virpil_constellation: {
    id: 'virpil_constellation',
    name: 'Virpil VPC MongoosT-50 / Constellation Alpha',
    hardwareType: 'virpil_constellation',
    matchPattern: 'virpil|vpc|3344',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.04, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.04, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.03, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 3, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  thrustmaster_t16000m: {
    id: 'thrustmaster_t16000m',
    name: 'Thrustmaster T.16000M FCS Stick',
    hardwareType: 'thrustmaster_t16000m',
    matchPattern: 't.16000m|t16000|044f:b10a',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.06, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.06, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0, // Trigger
      OPEN_SYSTEM_ORRERY: 1, // Center thumb
      RESET_CAMERA: 2, // Left thumb
      CENTER_SHIP: 3, // Right thumb
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  thrustmaster_twcs: {
    id: 'thrustmaster_twcs',
    name: 'Thrustmaster TWCS Throttle',
    hardwareType: 'thrustmaster_twcs',
    matchPattern: 'twcs|044f:b687',
    yaw: { axisIndex: 2, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.8 }, // Rudder paddle
    pitch: { axisIndex: 1, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.8 },
    zoom: { axisIndex: 0, invert: true, deadzone: 0.05, sensitivity: 1.2, exponent: 1.5 }, // Main throttle slide
    panX: { axisIndex: 3, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 }, // Mini stick
    panY: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  thrustmaster_warthog: {
    id: 'thrustmaster_warthog',
    name: 'Thrustmaster HOTAS Warthog (A-10C)',
    hardwareType: 'thrustmaster_warthog',
    matchPattern: 'warthog|044f:0402|044f:0404',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.04, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.04, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.04, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  logitech_x52: {
    id: 'logitech_x52',
    name: 'Logitech / Saitek X52 / X52 Pro HOTAS',
    hardwareType: 'logitech_x52',
    matchPattern: 'x52|saitek x52|06a3:075c|06a3:0255',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.06, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.06, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0, // Primary trigger
      OPEN_SYSTEM_ORRERY: 1, // Launch button
      RESET_CAMERA: 2, // Fire A
      CENTER_SHIP: 3, // Fire B
      TOGGLE_GRID: 4, // Fire C
      TOGGLE_NIGHTMODE: 5, // Pinkie
      NONE: -1,
    },
  },
  logitech_x56: {
    id: 'logitech_x56',
    name: 'Logitech / Saitek X56 Rhino HOTAS / HOSAS',
    hardwareType: 'logitech_x56',
    matchPattern: 'x56|rhino|0738:2215|0738:a215',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 5, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  xbox_gamepad: {
    id: 'xbox_gamepad',
    name: 'Xbox Wireless Controller / Standard Gamepad',
    hardwareType: 'xbox_gamepad',
    matchPattern: 'xbox|x-box|standard gamepad|microsoft',
    yaw: { axisIndex: 2, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 }, // Right Stick X
    pitch: { axisIndex: 3, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 }, // Right Stick Y
    zoom: { axisIndex: 1, invert: true, deadzone: 0.1, sensitivity: 1.2, exponent: 1.5 }, // Left Stick Y
    panX: { axisIndex: 0, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 }, // Left Stick X
    panY: { axisIndex: 3, invert: false, deadzone: 0.1, sensitivity: 0.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0, // A button
      OPEN_SYSTEM_ORRERY: 1, // B button
      RESET_CAMERA: 2, // X button
      CENTER_SHIP: 3, // Y button
      TOGGLE_GRID: 4, // Left Bumper
      TOGGLE_NIGHTMODE: 5, // Right Bumper
      NONE: -1,
    },
  },
  playstation_gamepad: {
    id: 'playstation_gamepad',
    name: 'Sony DualSense / DualShock 4 Controller',
    hardwareType: 'playstation_gamepad',
    matchPattern: 'playstation|dualshock|dualsense|054c',
    yaw: { axisIndex: 2, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 3, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 1, invert: true, deadzone: 0.1, sensitivity: 1.2, exponent: 1.5 },
    panX: { axisIndex: 0, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 3, invert: false, deadzone: 0.1, sensitivity: 0.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0, // Cross
      OPEN_SYSTEM_ORRERY: 1, // Circle
      RESET_CAMERA: 2, // Square
      CENTER_SHIP: 3, // Triangle
      TOGGLE_GRID: 4, // L1
      TOGGLE_NIGHTMODE: 5, // R1
      NONE: -1,
    },
  },
  generic_flightstick: {
    id: 'generic_flightstick',
    name: 'Generic HOTAS / Flight Stick',
    hardwareType: 'generic_flightstick',
    yaw: { axisIndex: 0, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 1, invert: true, deadzone: 0.05, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 2, invert: false, deadzone: 0.05, sensitivity: 1.0, exponent: 1.5 },
    panX: { axisIndex: 3, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 4, invert: false, deadzone: 0.08, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
  generic_gamepad: {
    id: 'generic_gamepad',
    name: 'Generic DirectInput Gamepad',
    hardwareType: 'generic_gamepad',
    yaw: { axisIndex: 2, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 },
    pitch: { axisIndex: 3, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 2.0 },
    zoom: { axisIndex: 1, invert: true, deadzone: 0.1, sensitivity: 1.2, exponent: 1.5 },
    panX: { axisIndex: 0, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    panY: { axisIndex: 4, invert: false, deadzone: 0.1, sensitivity: 1.0, exponent: 1.0 },
    buttons: {
      SELECT_STAR: 0,
      OPEN_SYSTEM_ORRERY: 1,
      RESET_CAMERA: 2,
      CENTER_SHIP: 3,
      TOGGLE_GRID: 4,
      TOGGLE_NIGHTMODE: 5,
      NONE: -1,
    },
  },
};

/**
 * Apply deadzone, axis inversion, and exponential sensitivity curve to raw -1.0..+1.0 axis input
 */
export function processAxisInput(rawVal: number, config: AxisMappingConfig): number {
  if (isNaN(rawVal)) return 0;

  // Clamp raw value to standard [-1, 1] range
  const clamped = Math.max(-1.0, Math.min(1.0, rawVal));
  const absVal = Math.abs(clamped);

  // Apply deadzone
  if (absVal <= config.deadzone) {
    return 0;
  }

  // Rescale range beyond deadzone to [0.0, 1.0] to prevent sudden jumps
  const normalized = (absVal - config.deadzone) / (1.0 - config.deadzone);

  // Apply exponential curve (exponent >= 1.0)
  const curved = Math.pow(normalized, Math.max(1.0, config.exponent));

  // Re-apply original sign and inversion toggle
  const sign = clamped < 0 ? -1.0 : 1.0;
  const invertedSign = config.invert ? -1.0 : 1.0;

  return sign * invertedSign * curved * config.sensitivity;
}

/**
 * Identifies hardware model type from navigator Gamepad id string
 */
export function identifyGamepadHardware(idString: string): GamepadHardwareType {
  const lower = idString.toLowerCase();

  if (lower.includes('vkb') || lower.includes('231d')) {
    if (lower.includes('gunfighter')) return 'vkb_gunfighter';
    return 'vkb_gladiator';
  }
  if (lower.includes('virpil') || lower.includes('vpc') || lower.includes('3344')) {
    return 'virpil_constellation';
  }
  if (lower.includes('warthog') || lower.includes('044f:0402') || lower.includes('044f:0404')) {
    return 'thrustmaster_warthog';
  }
  if (lower.includes('twcs') || lower.includes('044f:b687')) {
    return 'thrustmaster_twcs';
  }
  if (lower.includes('t.16000m') || lower.includes('t16000') || lower.includes('044f:b10a')) {
    return 'thrustmaster_t16000m';
  }
  if (lower.includes('x52') || lower.includes('06a3:075c') || lower.includes('06a3:0255')) {
    return 'logitech_x52';
  }
  if (lower.includes('x56') || lower.includes('rhino') || lower.includes('0738:2215') || lower.includes('0738:a215')) {
    return 'logitech_x56';
  }
  if (lower.includes('xbox') || lower.includes('x-box') || lower.includes('microsoft')) {
    return 'xbox_gamepad';
  }
  if (lower.includes('playstation') || lower.includes('dualshock') || lower.includes('dualsense') || lower.includes('054c')) {
    return 'playstation_gamepad';
  }
  if (lower.includes('stick') || lower.includes('flight') || lower.includes('hotas') || lower.includes('throttle')) {
    return 'generic_flightstick';
  }
  return 'generic_gamepad';
}

export class GamepadNavigationEngine {
  private activeGamepadIndex: number | null = null;
  private currentProfile: GamepadProfile = PRESET_PROFILES.vkb_gladiator;
  private previousButtonStates: Map<number, boolean> = new Map();
  private isListening = false;

  // Real-time listener callback
  private onStateChangeListeners: Set<(connected: ConnectedGamepadInfo[]) => void> = new Set();
  private onActionTriggeredListeners: Set<(action: GamepadAction) => void> = new Set();

  constructor() {
    this.loadProfileFromStorage();
  }

  public start() {
    if (typeof window === 'undefined') return;
    this.isListening = true;

    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

    // Initial check for already connected gamepads
    this.refreshConnectedGamepads();
  }

  public stop() {
    if (typeof window === 'undefined') return;
    this.isListening = false;
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  private handleGamepadConnected = (e: GamepadEvent) => {
    console.log(`[Atlas Gamepad] Controller connected: ${e.gamepad.id} at index ${e.gamepad.index}`);
    if (this.activeGamepadIndex === null) {
      this.setActiveGamepad(e.gamepad.index);
    }
    this.notifyStateChange();
  };

  private handleGamepadDisconnected = (e: GamepadEvent) => {
    console.log(`[Atlas Gamepad] Controller disconnected at index ${e.gamepad.index}`);
    if (this.activeGamepadIndex === e.gamepad.index) {
      this.activeGamepadIndex = null;
      // Auto-fallback to next available gamepad if any
      const gamepads = this.getConnectedGamepads();
      if (gamepads.length > 0) {
        this.setActiveGamepad(gamepads[0].index);
      }
    }
    this.notifyStateChange();
  };

  public getConnectedGamepads(): ConnectedGamepadInfo[] {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return [];
    }

    const rawGamepads = navigator.getGamepads();
    const result: ConnectedGamepadInfo[] = [];

    for (let i = 0; i < rawGamepads.length; i++) {
      const gp = rawGamepads[i];
      if (gp && gp.connected) {
        result.push({
          index: gp.index,
          id: gp.id,
          hardwareType: identifyGamepadHardware(gp.id),
          axes: Array.from(gp.axes),
          buttons: gp.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
          connected: gp.connected,
        });
      }
    }

    return result;
  }

  public setActiveGamepad(index: number | null) {
    this.activeGamepadIndex = index;
    if (index !== null) {
      const pads = this.getConnectedGamepads();
      const current = pads.find((p) => p.index === index);
      if (current) {
        const detectedType = current.hardwareType;
        this.currentProfile = { ...PRESET_PROFILES[detectedType] };
      }
    }
    this.notifyStateChange();
  }

  public getActiveGamepadIndex(): number | null {
    return this.activeGamepadIndex;
  }

  public getProfile(): GamepadProfile {
    return this.currentProfile;
  }

  public setProfile(profile: GamepadProfile) {
    this.currentProfile = { ...profile };
    this.saveProfileToStorage();
  }

  public updateAxisConfig(axis: 'yaw' | 'pitch' | 'zoom' | 'panX' | 'panY', config: Partial<AxisMappingConfig>) {
    this.currentProfile[axis] = {
      ...this.currentProfile[axis],
      ...config,
    };
    this.saveProfileToStorage();
  }

  public updateButtonMapping(action: GamepadAction, buttonIndex: number) {
    this.currentProfile.buttons[action] = buttonIndex;
    this.saveProfileToStorage();
  }

  /**
   * Samples active gamepad state and calculates orbit/pan/zoom delta values for this frame.
   * Can be passed a mock gamepad object for unit testing.
   */
  public poll(deltaTimeSec = 0.016, mockGamepad?: Gamepad | { axes: readonly number[]; buttons: readonly { pressed: boolean; value: number }[] }): ControllerDelta {
    let gp: Gamepad | { axes: readonly number[]; buttons: readonly { pressed: boolean; value: number }[] } | null = null;

    if (mockGamepad) {
      gp = mockGamepad;
    } else if (typeof navigator !== 'undefined' && navigator.getGamepads && this.activeGamepadIndex !== null) {
      const gamepads = navigator.getGamepads();
      gp = gamepads[this.activeGamepadIndex] || null;
    }

    if (!gp) {
      return {
        yawDelta: 0,
        pitchDelta: 0,
        zoomDelta: 1.0,
        panXDelta: 0,
        panYDelta: 0,
        triggeredActions: [],
      };
    }

    const axes = gp.axes;
    const buttons = gp.buttons;

    // 1. Process Orbit Azimuth (Yaw) & Elevation (Pitch)
    const rawYaw = axes[this.currentProfile.yaw.axisIndex] ?? 0;
    const rawPitch = axes[this.currentProfile.pitch.axisIndex] ?? 0;

    const processedYaw = processAxisInput(rawYaw, this.currentProfile.yaw);
    const processedPitch = processAxisInput(rawPitch, this.currentProfile.pitch);

    // Radians per second: e.g. 1.2 rad/s at full stick deflection
    const rotationSpeedRadPerSec = 1.4;
    const yawDelta = processedYaw * rotationSpeedRadPerSec * deltaTimeSec;
    const pitchDelta = processedPitch * rotationSpeedRadPerSec * deltaTimeSec;

    // 2. Process Camera Zoom (Throttle / Z-axis)
    // Multiplicative zoom delta: zooming in is < 1.0, zooming out is > 1.0
    const rawZoom = axes[this.currentProfile.zoom.axisIndex] ?? 0;
    const processedZoom = processAxisInput(rawZoom, this.currentProfile.zoom);
    // Exponential scale factor: e.g., 2.0x per second at full deflection
    const zoomFactorPerSec = 1.6;
    const zoomDelta = Math.pow(zoomFactorPerSec, processedZoom * deltaTimeSec * 2.0);

    // 3. Process Pan (Hat Switch / Secondary Analog Stick)
    const rawPanX = axes[this.currentProfile.panX.axisIndex] ?? 0;
    const rawPanY = axes[this.currentProfile.panY.axisIndex] ?? 0;
    const processedPanX = processAxisInput(rawPanX, this.currentProfile.panX);
    const processedPanY = processAxisInput(rawPanY, this.currentProfile.panY);

    const panSpeedFactor = 1.2;
    const panXDelta = processedPanX * panSpeedFactor * deltaTimeSec;
    const panYDelta = processedPanY * panSpeedFactor * deltaTimeSec;

    // 4. Process Buttons with Rising-Edge Trigger Detection
    const triggeredActions: GamepadAction[] = [];

    for (const [actionName, btnIndex] of Object.entries(this.currentProfile.buttons)) {
      const action = actionName as GamepadAction;
      if (btnIndex < 0 || btnIndex >= buttons.length) continue;

      const isPressed = buttons[btnIndex]?.pressed ?? false;
      const wasPressed = this.previousButtonStates.get(btnIndex) ?? false;

      // Detect rising edge (transition from unpressed to pressed)
      if (isPressed && !wasPressed) {
        triggeredActions.push(action);
        this.notifyActionTriggered(action);
      }

      this.previousButtonStates.set(btnIndex, isPressed);
    }

    return {
      yawDelta,
      pitchDelta,
      zoomDelta,
      panXDelta,
      panYDelta,
      triggeredActions,
    };
  }

  public subscribeState(listener: (connected: ConnectedGamepadInfo[]) => void): () => void {
    this.onStateChangeListeners.add(listener);
    listener(this.getConnectedGamepads());
    return () => this.onStateChangeListeners.delete(listener);
  }

  public subscribeAction(listener: (action: GamepadAction) => void): () => void {
    this.onActionTriggeredListeners.add(listener);
    return () => this.onActionTriggeredListeners.delete(listener);
  }

  private notifyStateChange() {
    const pads = this.getConnectedGamepads();
    for (const listener of this.onStateChangeListeners) {
      listener(pads);
    }
  }

  private notifyActionTriggered(action: GamepadAction) {
    for (const listener of this.onActionTriggeredListeners) {
      listener(action);
    }
  }

  private refreshConnectedGamepads() {
    const pads = this.getConnectedGamepads();
    if (pads.length > 0 && this.activeGamepadIndex === null) {
      this.setActiveGamepad(pads[0].index);
    } else {
      this.notifyStateChange();
    }
  }

  private saveProfileToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`atlas_gamepad_profile_${this.currentProfile.hardwareType}`, JSON.stringify(this.currentProfile));
    } catch {
      // Storage unavailable
    }
  }

  private loadProfileFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(`atlas_gamepad_profile_${this.currentProfile.hardwareType}`);
      if (saved) {
        this.currentProfile = JSON.parse(saved);
      }
    } catch {
      // Fallback to default preset
    }
  }
}

// Global singleton instance
export const gamepadNavigationEngine = new GamepadNavigationEngine();
