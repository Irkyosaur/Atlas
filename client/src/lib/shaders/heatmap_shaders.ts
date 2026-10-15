// Location: atlas/client/src/lib/shaders/heatmap_shaders.ts
// WGSL Shader for Dynamic 1024x1024 Galactic Density Heatmap Overlay (Stage 5.1)

export const WGSL_HEATMAP_SHADER = /* wgsl */ `
struct HeatmapUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  cameraOrigin: vec3<f32>,
  originShiftEnabled: f32,
  // Heatmap controls:
  // x: opacity (0.0 to 1.0)
  // y: colorRamp (0.0 = Inferno/EDAstro legacy purple-orange-yellow, 1.0 = Thermal/Jet, 2.0 = Void Exploration)
  // z: blendMode (0.0 = Additive, 1.0 = Alpha/Standard)
  // w: intensityBoost
  params: vec4<f32>,
  // Galactic plane bounds in LY: xMin, zMin, xMax, zMax
  bounds: vec4<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms: HeatmapUniforms;

@group(0) @binding(1)
var heatmapTexture: texture_2d<f32>;

@group(0) @binding(2)
var heatmapSampler: sampler;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.uv = in.uv;
  out.worldPos = in.position;

  var shiftedPos = in.position;
  if (uniforms.originShiftEnabled > 0.5) {
    shiftedPos = in.position - uniforms.cameraOrigin;
  }

  out.clipPos = uniforms.viewProjection * vec4<f32>(shiftedPos, 1.0);
  return out;
}

// 1. EDAstro Legacy / Inferno Ramp (purple - magenta - orange - yellow - white)
fn rampInferno(t: f32) -> vec3<f32> {
  let c0 = vec3<f32>(0.001, 0.001, 0.015);  // Deep space void
  let c1 = vec3<f32>(0.28, 0.05, 0.45);    // Deep purple
  let c2 = vec3<f32>(0.73, 0.21, 0.33);    // Magenta / crimson
  let c3 = vec3<f32>(0.98, 0.51, 0.08);    // Bright EDAstro orange
  let c4 = vec3<f32>(0.98, 0.90, 0.22);    // Solar yellow
  let c5 = vec3<f32>(1.0, 1.0, 1.0);       // White core hotspot

  if (t < 0.2) {
    return mix(c0, c1, smoothstep(0.0, 0.2, t));
  } else if (t < 0.4) {
    return mix(c1, c2, smoothstep(0.2, 0.4, t));
  } else if (t < 0.7) {
    return mix(c2, c3, smoothstep(0.4, 0.7, t));
  } else if (t < 0.9) {
    return mix(c3, c4, smoothstep(0.7, 0.9, t));
  } else {
    return mix(c4, c5, smoothstep(0.9, 1.0, t));
  }
}

// 2. Thermal Density Ramp (cold cyan/blue -> emerald -> yellow -> red/plasma)
fn rampThermal(t: f32) -> vec3<f32> {
  let c0 = vec3<f32>(0.02, 0.05, 0.15); // Cold blue
  let c1 = vec3<f32>(0.05, 0.45, 0.85); // Bright cyan
  let c2 = vec3<f32>(0.15, 0.85, 0.45); // Emerald green
  let c3 = vec3<f32>(0.98, 0.85, 0.10); // Heat amber
  let c4 = vec3<f32>(1.0, 0.18, 0.05);  // Plasma red
  let c5 = vec3<f32>(1.0, 0.95, 0.90);  // Incandescent white

  if (t < 0.2) {
    return mix(c0, c1, smoothstep(0.0, 0.2, t));
  } else if (t < 0.45) {
    return mix(c1, c2, smoothstep(0.2, 0.45, t));
  } else if (t < 0.7) {
    return mix(c2, c3, smoothstep(0.45, 0.7, t));
  } else if (t < 0.9) {
    return mix(c3, c4, smoothstep(0.7, 0.9, t));
  } else {
    return mix(c4, c5, smoothstep(0.9, 1.0, t));
  }
}

// 3. Unvisited Exploration Void Mode (highlights virgin / unexplored sectors in eerie dark neon cyan/violet)
fn rampExplorationVoid(t: f32) -> vec3<f32> {
  // Invert/accentuate the unvisited void regions: 0 density = high exploration opportunity
  let voidIntensity = 1.0 - clamp(t * 1.5, 0.0, 1.0);
  let visitedAccent = clamp((t - 0.1) * 2.0, 0.0, 1.0);

  // Void: Dark neon bioluminescent cyan/indigo grid
  let voidColor = vec3<f32>(0.1, 0.6, 0.9) * voidIntensity;
  // Explored: Faint warm amber trace
  let exploredColor = vec3<f32>(0.8, 0.35, 0.05) * visitedAccent * 0.4;

  return voidColor + exploredColor;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let opacity = uniforms.params.x;
  let rampMode = uniforms.params.y;
  let blendMode = uniforms.params.z;
  let intensityBoost = uniforms.params.w;

  if (opacity <= 0.001) {
    discard;
  }

  // Sample raw density texture (RGBA)
  let rawSample = textureSample(heatmapTexture, heatmapSampler, in.uv);
  
  // Extract normalized scalar density value [0.0 .. 1.0]
  // If the texture was already colormapped, calculate luminance, otherwise read red channel
  let rawDensity = max(rawSample.r, max(rawSample.g * 0.8, rawSample.b * 0.5));
  let density = clamp(rawDensity * intensityBoost, 0.0, 1.0);

  // Radial galactic edge vignette fade
  let centerLY = vec2<f32>(0.0, 0.0);
  let distFromCenter = length(in.worldPos.xz);
  let maxGalaxyRadius = 55000.0;
  if (distFromCenter > maxGalaxyRadius) {
    discard;
  }
  let edgeFade = smoothstep(maxGalaxyRadius, maxGalaxyRadius * 0.7, distFromCenter);

  // Dynamic Camera altitude fade: when camera dips very close to disk, soften plane to avoid clipping
  let camAltitude = abs(uniforms.cameraPosition.y + uniforms.cameraOrigin.y);
  let altitudeFade = smoothstep(50.0, 400.0, camAltitude);

  var finalColor = vec3<f32>(0.0);
  var alpha = 0.0;

  if (rampMode < 0.5) {
    // 0: EDAstro Legacy / Inferno Ramp
    finalColor = rampInferno(density);
    alpha = smoothstep(0.02, 0.25, density) * opacity * edgeFade * altitudeFade;
  } else if (rampMode < 1.5) {
    // 1: Thermal Density Ramp
    finalColor = rampThermal(density);
    alpha = smoothstep(0.015, 0.2, density) * opacity * edgeFade * altitudeFade;
  } else {
    // 2: Unvisited Exploration Void Mode
    finalColor = rampExplorationVoid(density);
    let voidScore = 1.0 - density;
    alpha = (voidScore * 0.75 + density * 0.25) * opacity * edgeFade * altitudeFade;
  }

  // Add subtle tactical radar pulse wave radiating outward from Sol (0, 0)
  let pulse = sin(distFromCenter * 0.0008 - uniforms.time * 1.2) * 0.06 + 0.94;
  finalColor *= pulse;

  if (alpha < 0.005) {
    discard;
  }

  // Additive or alpha-premultiplied output
  if (blendMode > 0.5) {
    // Standard alpha blending
    return vec4<f32>(finalColor, alpha);
  } else {
    // Additive blending: premultiply color by alpha for vivid neon glow
    return vec4<f32>(finalColor * alpha, alpha);
  }
}
`;
