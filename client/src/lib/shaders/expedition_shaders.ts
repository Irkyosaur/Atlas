// Location: atlas/client/src/lib/shaders/expedition_shaders.ts
// WebGPU WGSL Shaders for 4D Historical Expedition Playback & Fleet Swarm Tracer (Stage 5.3)

export const WGSL_EXPEDITION_RIBBON_SHADER = /* wgsl */ `
struct ExpeditionUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  origin: vec3<f32>,
  progress: f32,
  ribbonWidth: f32,
  glowIntensity: f32,
  pad0: f32,
  pad1: f32,
};

@group(0) @binding(0) var<uniform> uniforms: ExpeditionUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) tangent: vec3<f32>,
  @location(2) side: f32,
  @location(3) progress: f32,
  @location(4) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) progress: f32,
  @location(2) side: f32,
  @location(3) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let relPos = in.position - uniforms.origin;
  let viewDir = normalize(uniforms.cameraPosition - in.position);

  var sideDir = normalize(cross(in.tangent, viewDir));
  if (length(sideDir) < 0.001) {
    sideDir = vec3<f32>(0.0, 1.0, 0.0);
  }

  // Width is wider along traversed path, slightly narrower for projected future path
  let isTraversed = select(0.7, 1.0, in.progress <= uniforms.progress);
  let extrudedPos = relPos + sideDir * (in.side * uniforms.ribbonWidth * isTraversed);

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(extrudedPos, 1.0);
  out.color = in.color;
  out.progress = in.progress;
  out.side = in.side;
  out.worldPos = in.position;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let distFromCenter = abs(in.side);
  let edgeFalloff = exp(-distFromCenter * distFromCenter * 4.0);

  let isTraversed = in.progress <= uniforms.progress;

  if (isTraversed) {
    // Traversed path: high intensity neon ribbon with traveling fleet pulse waves
    let pulsePhase = fract(in.progress * 15.0 - uniforms.time * 1.8);
    let pulse = smoothstep(0.0, 0.2, pulsePhase) * smoothstep(0.4, 0.2, pulsePhase) * 2.5;

    // Golden amber with white-hot pulse core
    let baseColor = in.color.rgb;
    let waveColor = vec3<f32>(1.0, 0.92, 0.75);
    let litColor = mix(baseColor, waveColor, clamp(pulse, 0.0, 1.0));

    // Extra beacon flash at current head of the route
    let headDistance = abs(in.progress - uniforms.progress);
    let headGlow = smoothstep(0.02, 0.0, headDistance) * 3.0;

    let finalColor = litColor * (1.0 + headGlow) * uniforms.glowIntensity;
    let alpha = in.color.a * edgeFalloff * (0.85 + 0.3 * pulse + headGlow);

    return vec4<f32>(finalColor, clamp(alpha, 0.0, 1.0));
  } else {
    // Untraversed future leg: tactical dashed holographic preview line
    let dash = step(0.4, fract(in.progress * 80.0));
    let futureColor = vec3<f32>(0.2, 0.7, 0.9) * 0.5;
    let alpha = in.color.a * edgeFalloff * 0.22 * dash;

    return vec4<f32>(futureColor, alpha);
  }
}
`;

export const WGSL_SWARM_PARTICLE_SHADER = /* wgsl */ `
struct SwarmUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  origin: vec3<f32>,
  fleetCentroid: vec3<f32>,
  forwardVector: vec3<f32>,
  swarmSpread: f32,
  activeProgress: f32,
};

@group(0) @binding(0) var<uniform> uniforms: SwarmUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,        // Quad coords (-1 to +1)
  @location(1) particleOffset: vec3<f32>, // Pseudo-random 3D cluster offset
  @location(2) particlePhase: f32,        // Phase / oscillation frequency
  @location(3) particleColor: vec4<f32>,  // RGBA engine glow
  @location(4) particleScale: f32,        // Ship scale
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) trailPhase: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let t = uniforms.time;
  let phase = in.particlePhase;

  // Swarm dynamics: coherent fleet motion with micro-clustering & hyperspace trail drift
  let rightVector = normalize(cross(uniforms.forwardVector, vec3<f32>(0.0, 1.0, 0.0)));
  let upVector = normalize(cross(rightVector, uniforms.forwardVector));

  // Dynamic oscillation around the centroid
  let driftAlong = sin(t * 1.5 + phase * 6.28) * (uniforms.swarmSpread * 0.65);
  let driftRight = cos(t * 1.2 + phase * 4.15) * (uniforms.swarmSpread * 0.45);
  let driftUp = sin(t * 0.9 + phase * 3.71) * (uniforms.swarmSpread * 0.35);

  let worldShipPos = uniforms.fleetCentroid
    + in.particleOffset * uniforms.swarmSpread
    + uniforms.forwardVector * driftAlong
    + rightVector * driftRight
    + upVector * driftUp;

  let relPos = worldShipPos - uniforms.origin;

  // Camera billboard vectors
  let camToPos = uniforms.cameraPosition - worldShipPos;
  let camDist = length(camToPos);
  let viewFwd = normalize(camToPos);
  let camRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), viewFwd));
  let camUp = normalize(cross(viewFwd, camRight));

  // Elongate particle quad along fleet trajectory for warp trail effect
  let scale = in.particleScale * clamp(camDist * 0.003, 1.5, 45.0);
  let vertexWorld = relPos 
    + camRight * (in.quadPos.x * scale) 
    + camUp * (in.quadPos.y * scale * 0.8)
    - uniforms.forwardVector * (in.quadPos.y * scale * 1.4);

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(vertexWorld, 1.0);
  out.color = in.particleColor;
  out.uv = in.quadPos;
  out.trailPhase = phase;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let r = length(in.uv);
  if (r > 1.0) {
    discard;
  }

  // Gaussian core with elongated engine trail wake
  let coreGlow = exp(-r * r * 5.0);
  let haloGlow = exp(-r * 2.0) * 0.4;
  let totalGlow = coreGlow + haloGlow;

  // Blended engine color (amber/gold/cyan drive plume)
  let litColor = in.color.rgb * (1.2 + coreGlow * 1.5);
  let alpha = in.color.a * totalGlow;

  return vec4<f32>(litColor, clamp(alpha, 0.0, 1.0));
}
`;

export const WGSL_EXPEDITION_BEACON_SHADER = /* wgsl */ `
struct BeaconUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  origin: vec3<f32>,
  activeWaypointIndex: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> uniforms: BeaconUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,        // Billboard quad (-1 to +1)
  @location(1) beaconPos: vec3<f32>,      // World position of basecamp
  @location(2) beaconIndex: f32,          // Index of waypoint (0, 1, 2, ...)
  @location(3) beaconStatus: f32,         // 0: reached, 1: active, 2: future
  @location(4) beaconColor: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) status: f32,
  @location(3) index: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let relPos = in.beaconPos - uniforms.origin;
  let camToPos = uniforms.cameraPosition - in.beaconPos;
  let camDist = length(camToPos);
  let viewFwd = normalize(camToPos);
  let camRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), viewFwd));
  let camUp = normalize(cross(viewFwd, camRight));

  let isActive = in.beaconIndex == uniforms.activeWaypointIndex;
  let baseScale = select(clamp(camDist * 0.015, 8.0, 90.0), clamp(camDist * 0.024, 14.0, 140.0), isActive);

  let vertexWorld = relPos + camRight * (in.quadPos.x * baseScale) + camUp * (in.quadPos.y * baseScale);

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(vertexWorld, 1.0);
  out.uv = in.quadPos;
  out.color = in.beaconColor;
  out.status = select(in.beaconStatus, 1.0, isActive);
  out.index = in.beaconIndex;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }

  let angle = atan2(in.uv.y, in.uv.x);
  let t = uniforms.time;

  var ring = 0.0;
  var color = in.color.rgb;
  var alpha = 0.0;

  if (in.status == 1.0) {
    // ACTIVE TARGET BASECAMP: Rotating radar reticle, pulsing expand wave & solid core
    let rotAngle = angle + t * 2.0;
    let crosshair = step(0.96, abs(sin(rotAngle * 2.0)));
    let centerDot = exp(-dist * dist * 35.0);
    
    // Outer dashed ring
    let outerRing = smoothstep(0.04, 0.0, abs(dist - 0.88));
    let innerRing = smoothstep(0.03, 0.0, abs(dist - 0.55));
    
    // Expanding echo radar wave
    let waveRadius = fract(t * 0.8);
    let echoWave = smoothstep(0.05, 0.0, abs(dist - waveRadius)) * (1.0 - waveRadius);

    ring = (outerRing + innerRing * 0.8 + echoWave * 1.5 + centerDot * 2.0) * (0.8 + 0.3 * sin(t * 4.0));
    color = vec3<f32>(1.0, 0.75, 0.15); // Cobra HUD golden amber
    alpha = clamp(ring + crosshair * 0.4, 0.0, 1.0);
  } else if (in.status == 0.0) {
    // VISITED BASECAMP: Solid completed waypoint node with diamond halo
    let outerRing = smoothstep(0.04, 0.0, abs(dist - 0.75));
    let centerDot = exp(-dist * dist * 25.0);
    ring = outerRing * 0.7 + centerDot * 1.5;
    color = vec3<f32>(0.2, 0.95, 0.6); // Emerald cartographic confirmation
    alpha = clamp(ring * 0.9, 0.0, 1.0);
  } else {
    // FUTURE BASECAMP: Calm cyan holographic ring
    let outerRing = smoothstep(0.03, 0.0, abs(dist - 0.7));
    ring = outerRing * 0.5;
    color = vec3<f32>(0.25, 0.7, 1.0); // Nav cyan
    alpha = clamp(ring * 0.6, 0.0, 0.8);
  }

  return vec4<f32>(color * 1.3, alpha);
}
`;

export const WGSL_EXPEDITION_STALK_SHADER = /* wgsl */ `
struct StalkUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: StalkUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>, // Stalk line vertex (world LY)
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) worldY: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let relPos = in.position - uniforms.origin;
  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(relPos, 1.0);
  out.color = in.color;
  out.worldY = in.position.y;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Stalk alpha fade towards galactic plane
  let fade = clamp(abs(in.worldY) / 1000.0, 0.25, 0.9);
  return vec4<f32>(in.color.rgb, in.color.a * fade);
}
`;
