// Location: atlas/client/src/lib/engine/camera_controller.ts
// Logarithmic Camera Controller with Smooth Inertia & Origin-Shift Support
// Capable of smooth zoom from 1 LY local clusters to 100,000 LY galactic overview (Task 2.3.1)

import { Vector3, Matrix4, MathUtils } from 'three';

export interface CameraState {
  target: Vector3; // World target in galactic LY
  distance: number; // Logarithmic distance in LY (1.0 to 120,000.0)
  azimuth: number; // Polar angle around Y axis in radians
  polar: number; // Elevation angle in radians (-PI/2 to PI/2)
}

export class LogarithmicCameraController {
  // Target coordinates in double-precision galactic coordinates (LY)
  public target = new Vector3(0, 0, 0);
  public smoothTarget = new Vector3(0, 0, 0);

  // Distance range: 1.0 LY to 100,000 LY
  public minDistance = 1.0;
  public maxDistance = 100_000.0;
  public distance = 26_000.0; // Current distance
  public targetDistance = 26_000.0;

  // Orbit angles (azimuth = rotation around Y, polar = vertical angle)
  public azimuth = 0.65;
  public targetAzimuth = 0.65;
  public polar = 0.35; // ~20 degrees elevation
  public targetPolar = 0.35;

  // Smoothing / inertia damping factor
  public damping = 0.08;

  // Camera output matrices & vectors
  public position = new Vector3();
  public viewMatrix = new Matrix4();
  public projMatrix = new Matrix4();
  public viewProjMatrix = new Matrix4();

  // Mouse / Pointer interaction state
  private isDragging = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private domElement: HTMLElement | null = null;

  constructor(initialDistance = 26_000.0) {
    this.distance = initialDistance;
    this.targetDistance = initialDistance;
    this.updateVectors();
  }

  public attach(element: HTMLElement) {
    this.domElement = element;
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', this.onContextMenu);
  }

  public detach() {
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      this.domElement.removeEventListener('wheel', this.onWheel);
      this.domElement.removeEventListener('contextmenu', this.onContextMenu);
      this.domElement = null;
    }
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (e.button === 0) {
      // Left click = rotate orbit
      this.isDragging = true;
    } else if (e.button === 2 || e.button === 1) {
      // Right or Middle click = pan target
      this.isPanning = true;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging && !this.isPanning) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (this.isDragging) {
      // Orbit rotation sensitivity
      const rotSpeed = 0.005;
      this.targetAzimuth -= dx * rotSpeed;
      this.targetPolar += dy * rotSpeed;

      // Clamp polar angle to avoid gimbal flip
      const maxPolar = Math.PI * 0.48;
      const minPolar = -Math.PI * 0.48;
      this.targetPolar = MathUtils.clamp(this.targetPolar, minPolar, maxPolar);
    } else if (this.isPanning) {
      // Pan translation scaled proportionally to logarithmic distance
      const panSpeed = (this.distance * 0.0018);
      const sinA = Math.sin(this.azimuth);
      const cosA = Math.cos(this.azimuth);

      // Camera right vector: [cosA, 0, -sinA]
      // Camera up vector in screen space
      this.target.x -= (cosA * dx) * panSpeed;
      this.target.z -= (-sinA * dx) * panSpeed;
      this.target.y += dy * panSpeed;
    }
  };

  private onPointerUp = () => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Logarithmic zoom scaling: zooming in/out scales multiplicatively
    const zoomFactor = Math.exp(e.deltaY * 0.0015);
    this.targetDistance = MathUtils.clamp(
      this.targetDistance * zoomFactor,
      this.minDistance,
      this.maxDistance
    );
  };

  // Target Locking for Orrery Planetary Bodies (Task 3.3.4)
  public lockedBodyName: string | null = null;
  public lockedBodyProvider: (() => [number, number, number] | null) | null = null;

  /**
   * Set target to a star or coordinate (e.g. from search selection)
   */
  public focusOn(x: number, y: number, z: number, dist?: number) {
    this.target.set(x, y, z);
    if (dist !== undefined) {
      this.targetDistance = MathUtils.clamp(dist, this.minDistance, this.maxDistance);
    }
  }

  /**
   * Task 3.3.4: Locks the camera viewport to track an orbiting celestial body dynamically.
   */
  public lockToBody(
    name: string,
    positionProvider: () => [number, number, number] | null,
    desiredDistance?: number
  ) {
    this.lockedBodyName = name;
    this.lockedBodyProvider = positionProvider;
    if (desiredDistance !== undefined) {
      this.targetDistance = MathUtils.clamp(desiredDistance, this.minDistance, this.maxDistance);
    }
    const initialPos = positionProvider();
    if (initialPos) {
      this.target.set(initialPos[0], initialPos[1], initialPos[2]);
    }
  }

  public unlockBody() {
    this.lockedBodyName = null;
    this.lockedBodyProvider = null;
  }

  /**
   * Stage 15.2: Smoothly applies analog flight stick / gamepad deltas (orbit, zoom, pan).
   */
  public applyGamepadDelta(delta: {
    yawDelta: number;
    pitchDelta: number;
    zoomDelta: number;
    panXDelta: number;
    panYDelta: number;
  }) {
    // 1. Azimuth & Polar Orbit Rotation
    if (delta.yawDelta !== 0) {
      this.targetAzimuth += delta.yawDelta;
    }
    if (delta.pitchDelta !== 0) {
      const maxPolar = Math.PI * 0.48;
      const minPolar = -Math.PI * 0.48;
      this.targetPolar = MathUtils.clamp(this.targetPolar + delta.pitchDelta, minPolar, maxPolar);
    }

    // 2. Logarithmic Camera Zoom (Throttle / Z-axis)
    if (delta.zoomDelta !== 1.0 && delta.zoomDelta > 0) {
      this.targetDistance = MathUtils.clamp(
        this.targetDistance * delta.zoomDelta,
        this.minDistance,
        this.maxDistance
      );
    }

    // 3. Hat-switch / Stick Pan in Camera Screen-Space
    if (delta.panXDelta !== 0 || delta.panYDelta !== 0) {
      const panSpeed = (this.distance * 0.4);
      const sinA = Math.sin(this.azimuth);
      const cosA = Math.cos(this.azimuth);

      // Camera right vector: [cosA, 0, -sinA]
      this.target.x -= (cosA * delta.panXDelta) * panSpeed;
      this.target.z -= (-sinA * delta.panXDelta) * panSpeed;
      this.target.y += delta.panYDelta * panSpeed;
    }
  }

  /**
   * Stage 15.2: Resets camera orbit azimuth, polar elevation, and zoom distance.
   */
  public resetCamera(targetDist = 26000.0) {
    this.targetAzimuth = 0.65;
    this.targetPolar = 0.35;
    this.targetDistance = MathUtils.clamp(targetDist, this.minDistance, this.maxDistance);
  }

  /**
   * Updates camera kinematics and recalculates view and projection matrices.
   * originShift: [x, y, z] to subtract from world position to eliminate 32-bit float jitter.
   */
  public update(aspect: number, originShift: [number, number, number] = [0, 0, 0]) {
    // If locked to an orbiting body, smoothly follow its current coordinates
    if (this.lockedBodyProvider) {
      const pos = this.lockedBodyProvider();
      if (pos) {
        this.target.set(pos[0], pos[1], pos[2]);
      }
    }

    // Smooth interpolation with inertia
    this.distance = MathUtils.damp(this.distance, this.targetDistance, 10, this.damping);
    this.azimuth = MathUtils.damp(this.azimuth, this.targetAzimuth, 12, this.damping);
    this.polar = MathUtils.damp(this.polar, this.targetPolar, 12, this.damping);

    this.smoothTarget.x = MathUtils.damp(this.smoothTarget.x, this.target.x, 10, this.damping);
    this.smoothTarget.y = MathUtils.damp(this.smoothTarget.y, this.target.y, 10, this.damping);
    this.smoothTarget.z = MathUtils.damp(this.smoothTarget.z, this.target.z, 10, this.damping);

    this.updateVectors();

    // Logarithmic depth buffer projection:
    // Near plane dynamically adapts to zoom distance (down to 0.05 LY when zoomed in to 1 LY)
    const near = Math.max(0.01, this.distance * 0.001);
    const far = Math.max(200_000.0, this.distance * 20.0);
    const top = near * Math.tan(MathUtils.degToRad(45) * 0.5);
    const bottom = -top;
    const right = top * aspect;
    const left = -right;
    this.projMatrix.makePerspective(left, right, top, bottom, near, far);

    // Compute relative camera and target in shifted frame
    const relCam = new Vector3(
      this.position.x - originShift[0],
      this.position.y - originShift[1],
      this.position.z - originShift[2]
    );
    const relTarget = new Vector3(
      this.smoothTarget.x - originShift[0],
      this.smoothTarget.y - originShift[1],
      this.smoothTarget.z - originShift[2]
    );

    this.viewMatrix.lookAt(relCam, relTarget, new Vector3(0, 1, 0));
    this.viewProjMatrix.multiplyMatrices(this.projMatrix, this.viewMatrix);
  }

  private updateVectors() {
    const cosPolar = Math.cos(this.polar);
    const sinPolar = Math.sin(this.polar);
    const cosAzimuth = Math.cos(this.azimuth);
    const sinAzimuth = Math.sin(this.azimuth);

    const offsetX = this.distance * cosPolar * sinAzimuth;
    const offsetY = this.distance * sinPolar;
    const offsetZ = this.distance * cosPolar * cosAzimuth;

    this.position.set(
      this.smoothTarget.x + offsetX,
      this.smoothTarget.y + offsetY,
      this.smoothTarget.z + offsetZ
    );
  }

  public getTargetPosition(): [number, number, number] {
    return [this.smoothTarget.x, this.smoothTarget.y, this.smoothTarget.z];
  }

  public getCameraPosition(): [number, number, number] {
    return [this.position.x, this.position.y, this.position.z];
  }

  public getDistance(): number {
    return this.distance;
  }
}
