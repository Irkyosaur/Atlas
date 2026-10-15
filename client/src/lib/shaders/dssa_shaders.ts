// Location: atlas/client/src/lib/shaders/dssa_shaders.ts
// WebGPU WGSL Shaders for DSSA Amber Beacon Markers, Procedural Diamond Glyph & Stalks (Stage 5.2)

export const WGSL_DSSA_BEACON_SHADER = /* wgsl */ `
struct DssaUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
  beaconSize: f32,
  glowStrength: f32,
  selectedIdx: f32,
  pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: DssaUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,    // Billboard quad (-1.0 to +1.0)
  @location(1) worldPos: vec3<f32>,   // Carrier 3D galactic position (LY)
  @location(2) status: f32,           // 1.0 = Operational, 0.5 = Standby
  @location(3) carrierIdx: f32,       // Index of carrier in registry
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) status: f32,
  @location(2) isSelected: f32,
  @location(3) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let relPos = in.worldPos - uniforms.origin;

  // Compute camera distance for adaptive LOD sizing
  let camDist = length(uniforms.cameraPosition - in.worldPos);
  // Scale beacon gracefully: visible from 100 LY up to 80,000 LY
  let scale = clamp(camDist * 0.015, uniforms.beaconSize * 0.8, uniforms.beaconSize * 6.0);

  // Camera billboard vectors
  let toCam = normalize(uniforms.cameraPosition - in.worldPos);
  var camRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), toCam));
  if (length(camRight) < 0.001) {
    camRight = vec3<f32>(1.0, 0.0, 0.0);
  }
  let camUp = normalize(cross(toCam, camRight));

  let offset = (camRight * in.quadPos.x + camUp * in.quadPos.y) * scale;
  let finalPos = relPos + offset;

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(finalPos, 1.0);
  out.uv = in.quadPos;
  out.status = in.status;
  out.isSelected = select(0.0, 1.0, abs(in.carrierIdx - uniforms.selectedIdx) < 0.5);
  out.worldPos = in.worldPos;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let dist = length(uv);

  if (dist > 1.0) {
    discard;
  }

  // 1. DSSA Diamond Insignia Geometry (abs(x) + abs(y))
  let diamondDist = abs(uv.x) + abs(uv.y);
  let diamondBorder = smoothstep(0.72, 0.67, diamondDist) - smoothstep(0.67, 0.62, diamondDist);
  let diamondFill = smoothstep(0.65, 0.0, diamondDist) * 0.25;

  // 2. Central Beacon Star & Chevron Anchor Glyph
  let crossArmY = smoothstep(0.06, 0.0, abs(uv.x)) * smoothstep(0.55, 0.0, abs(uv.y));
  let crossArmX = smoothstep(0.06, 0.0, abs(uv.y)) * smoothstep(0.40, 0.0, abs(uv.x));
  let anchor = clamp(crossArmX + crossArmY, 0.0, 1.0);

  // Central glowing core
  let core = smoothstep(0.20, 0.0, dist);

  // 3. Outward Pulsing Haven Distress / Telemetry Wave
  let wavePhase = fract(uniforms.time * 0.85 - dist * 1.2);
  let pulseWave = smoothstep(0.0, 0.15, wavePhase) * smoothstep(0.35, 0.15, wavePhase) * (1.0 - dist);

  // 4. Outer Concentric Haven Range Ring
  let outerRing = smoothstep(0.92, 0.95, dist) - smoothstep(0.97, 1.0, dist);

  // Status coloring: Operational = Warm Golden Amber, Standby = Dim Ochre
  var baseAmber = vec3<f32>(1.0, 0.70, 0.12);
  if (in.status < 0.8) {
    baseAmber = vec3<f32>(0.85, 0.45, 0.10);
  }

  // Hot core color
  let hotWhite = vec3<f32>(1.0, 0.96, 0.82);

  // Compose beacon graphics
  var glyph = (diamondBorder * 1.8 + diamondFill + anchor * 1.5 + core * 2.5 + pulseWave * 1.2 + outerRing * 1.4);

  // Selected highlight boost
  if (in.isSelected > 0.5) {
    glyph = glyph * 1.6 + smoothstep(0.98, 0.85, dist) * 1.0;
  }

  let finalColor = mix(baseAmber, hotWhite, clamp(core * 1.5 + in.isSelected * 0.5, 0.0, 1.0));
  let finalAlpha = clamp(glyph * (0.8 + 0.2 * in.isSelected) * uniforms.glowStrength, 0.0, 1.0);

  return vec4<f32>(finalColor * uniforms.glowStrength, finalAlpha);
}
`;

export const WGSL_DSSA_STALK_SHADER = /* wgsl */ `
struct StalkUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
  opacity: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> uniforms: StalkUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,   // Local vertex position (either base on Y=0 or carrier top)
  @location(1) alpha: f32,            // 0.0 at galactic base, 1.0 at carrier top
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) alpha: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let relPos = in.position - uniforms.origin;
  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(relPos, 1.0);
  out.alpha = in.alpha;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Deep amber holographic stalk line (#FFB300)
  let amber = vec3<f32>(1.0, 0.70, 0.15);
  let pulse = 0.85 + 0.15 * sin(uniforms.time * 2.5 + in.alpha * 6.28);
  let a = (0.25 + 0.55 * in.alpha) * pulse * uniforms.opacity;
  return vec4<f32>(amber, a);
}
`;
