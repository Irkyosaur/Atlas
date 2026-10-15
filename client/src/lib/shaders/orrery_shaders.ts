// Location: atlas/client/src/lib/shaders/orrery_shaders.ts
// WGSL Shaders for Instanced Curved Ribbon Splines & 3D Celestial Bodies in Keplerian Orrery (Task 3.2.3)

export const WGSL_ORRERY_SPLINE_SHADER = /* wgsl */ `
struct OrreryUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  pad: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms: OrreryUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.color = in.color;
  out.position = uniforms.viewProjection * vec4<f32>(in.position, 1.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
`;

export const WGSL_ORRERY_BODY_SHADER = /* wgsl */ `
struct OrreryUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  pad: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms: OrreryUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,
  @location(1) instancePos: vec3<f32>,
  @location(2) instanceColor: vec3<f32>,
  @location(3) instanceRadius: f32,
  @location(4) isStar: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec3<f32>,
  @location(2) isStar: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.uv = in.quadPos;
  out.color = in.instanceColor;
  out.isStar = in.isStar;

  let camToBody = in.instancePos - uniforms.cameraPosition;
  let dist = max(length(camToBody), 0.001);

  let forward = normalize(camToBody);
  var upHint = vec3<f32>(0.0, 1.0, 0.0);
  if (abs(forward.y) > 0.99) {
    upHint = vec3<f32>(0.0, 0.0, 1.0);
  }
  let right = normalize(cross(forward, upHint));
  let up = cross(right, forward);

  let scale = in.instanceRadius;
  let worldVertexPos = in.instancePos + (right * in.quadPos.x + up * in.quadPos.y) * scale;

  out.position = uniforms.viewProjection * vec4<f32>(worldVertexPos, 1.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv) * 2.0;
  if (dist > 1.0) {
    discard;
  }

  let edge = max(0.0, 1.0 - dist);

  if (in.isStar > 0.5) {
    // Stellar corona glow
    let core = pow(edge, 2.5);
    let corona = pow(edge, 1.0) * 0.5;
    let whiteCore = vec3<f32>(1.0, 1.0, 1.0) * pow(edge, 4.0);
    let rgb = in.color * (core + corona) + whiteCore;
    return vec4<f32>(rgb, clamp(core + corona, 0.0, 1.0));
  } else {
    // Planetary sphere with spherical shading
    let normalZ = sqrt(max(0.0, 1.0 - dist * dist));
    let lightDir = normalize(vec3<f32>(-1.0, 0.5, 1.0));
    let normal = vec3<f32>(in.uv * 2.0, normalZ);
    let diff = max(dot(normal, lightDir), 0.15);

    let atmosphereRim = pow(1.0 - normalZ, 3.0) * 0.4;
    let finalColor = in.color * diff + vec3<f32>(0.4, 0.7, 1.0) * atmosphereRim;

    return vec4<f32>(finalColor, 1.0);
  }
}
`;
