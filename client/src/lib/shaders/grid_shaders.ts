// Location: atlas/client/src/lib/shaders/grid_shaders.ts
// WGSL Shaders for Galactic Reference Plane Grid (Y=0, 1000 LY square divisions) & Projection Stalks (Task 2.3.2, 2.3.3)

export const WGSL_GRID_SHADER = /* wgsl */ `
struct GridUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  cameraOrigin: vec3<f32>,
  originShiftEnabled: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: GridUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  // in.position is the unshifted world position on Y=0 plane
  out.worldPos = in.position;

  var shiftedPos = in.position;
  if (uniforms.originShiftEnabled > 0.5) {
    shiftedPos = in.position - uniforms.cameraOrigin;
  }

  out.position = uniforms.viewProjection * vec4<f32>(shiftedPos, 1.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 1,000 LY major square divisions, 200 LY minor divisions
  let coord = in.worldPos.xz;
  let distFromCenter = length(coord);

  // Fade grid at outer galaxy bounds (e.g. 50,000 LY)
  let maxRadius = 55000.0;
  if (distFromCenter > maxRadius) {
    discard;
  }
  let radialFade = smoothstep(maxRadius, maxRadius * 0.4, distFromCenter);

  // Camera distance fade to prevent excessive aliasing at grazing angles
  let camDist = length(in.worldPos - (uniforms.cameraPosition + uniforms.cameraOrigin));
  let distFade = clamp(1.0 - (camDist / 120000.0), 0.05, 1.0);

  // 1,000 LY grid lines calculation using screen-space derivatives (fwidth)
  let grid1000 = abs(fract(coord / 1000.0 - 0.5) - 0.5) / fwidth(coord / 1000.0);
  let line1000 = 1.0 - min(min(grid1000.x, grid1000.y), 1.0);

  // 200 LY minor grid lines
  let grid200 = abs(fract(coord / 200.0 - 0.5) - 0.5) / fwidth(coord / 200.0);
  let line200 = 1.0 - min(min(grid200.x, grid200.y), 1.0);

  // Subtle pulsing animation wave radiating from Sol (0, 0)
  let pulseWave = sin(distFromCenter * 0.002 - uniforms.time * 1.5) * 0.15 + 0.85;

  // Elite Dangerous HUD Orange colors:
  // Major lines: #FF7100 (r:1.0, g:0.443, b:0.0)
  // Minor lines: #9E4600 (r:0.62, g:0.27, b:0.0)
  let majorColor = vec3<f32>(1.0, 0.443, 0.0);
  let minorColor = vec3<f32>(0.55, 0.22, 0.0);

  var color = minorColor * (line200 * 0.25) + majorColor * (line1000 * 0.65);
  color *= pulseWave;

  let alpha = (line1000 * 0.6 + line200 * 0.18) * radialFade * distFade;
  if (alpha < 0.01) {
    discard;
  }

  return vec4<f32>(color, alpha);
}
`;

export const WGSL_STALK_SHADER = /* wgsl */ `
struct StalkUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  cameraOrigin: vec3<f32>,
  originShiftEnabled: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: StalkUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) worldY: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.color = in.color;
  out.worldY = in.position.y;

  var shiftedPos = in.position;
  if (uniforms.originShiftEnabled > 0.5) {
    shiftedPos = in.position - uniforms.cameraOrigin;
  }

  out.position = uniforms.viewProjection * vec4<f32>(shiftedPos, 1.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Stalk shimmer wave traveling along vertical projection line
  let shimmer = 1.0 + sin(in.worldY * 0.08 + uniforms.time * 4.0) * 0.2;
  return vec4<f32>(in.color.rgb * shimmer, in.color.a);
}
`;
