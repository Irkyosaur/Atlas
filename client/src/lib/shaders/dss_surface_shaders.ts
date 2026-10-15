// Location: atlas/client/src/lib/shaders/dss_surface_shaders.ts
// WebGPU Shaders for DSS Planetary Surface Cartography, Heatmaps, and Exobiology Overlays (Task 3.4.1, 3.4.2, 3.4.3)

export const WGSL_DSS_SURFACE_SHADER = /* wgsl */ `
// Uniforms: viewProj matrix, camera pos, time, planet radius, composition params, bio signal count
struct SurfaceUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  planetCenter: vec3<f32>,
  planetRadius: f32,
  compositionType: f32, // 0: Earth-Like/Water, 1: High Metal/Rocky, 2: Icy, 3: Ammonia
  dssHeatmapActive: f32, // 1.0 = display DSS biological/geological heatmap
  atmosphereDensity: f32,
  rotationAngle: f32,
};

@group(0) @binding(0) var<uniform> uniforms: SurfaceUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) heightDisplacement: f32,
};

// Procedural 3D Simplex-like Noise function for dynamic terrain displacement
fn hash(p: vec3<f32>) -> f32 {
  let q = fract(p * 0.3183099 + vec3<f32>(0.1, 0.1, 0.1));
  let r = q * 17.0;
  return fract(r.x * r.y * r.z * (r.x + r.y + r.z));
}

fn noise(x: vec3<f32>) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash(i + vec3<f32>(0.0,0.0,0.0)), hash(i + vec3<f32>(1.0,0.0,0.0)), u.x),
      mix(hash(i + vec3<f32>(0.0,1.0,0.0)), hash(i + vec3<f32>(1.0,1.0,0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash(i + vec3<f32>(0.0,0.0,1.0)), hash(i + vec3<f32>(1.0,0.0,1.0)), u.x),
      mix(hash(i + vec3<f32>(0.0,1.0,1.0)), hash(i + vec3<f32>(1.0,1.0,1.0)), u.x),
      u.y
    ),
    u.z
  );
}

fn fbm(p: vec3<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var freq = 1.0;
  for (var i = 0; i < 4; i = i + 1) {
    value = value + amplitude * noise(p * freq);
    freq = freq * 2.0;
    amplitude = amplitude * 0.5;
  }
  return value;
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  // Axial Rotation
  let cosR = cos(uniforms.rotationAngle);
  let sinR = sin(uniforms.rotationAngle);
  let rotatedNormal = vec3<f32>(
    in.normal.x * cosR - in.normal.z * sinR,
    in.normal.y,
    in.normal.x * sinR + in.normal.z * cosR
  );

  // Dynamic procedural height displacement based on planetary terrain FBM
  let terrainHeight = fbm(rotatedNormal * 3.5);
  // Displacement amplitude proportional to planet radius (~2% for mountains/canyons)
  let displacement = (terrainHeight - 0.45) * 0.08 * uniforms.planetRadius;

  let displacedPos = uniforms.planetCenter + rotatedNormal * (uniforms.planetRadius + displacement);

  out.worldPos = displacedPos;
  out.worldNormal = rotatedNormal;
  out.uv = in.uv;
  out.heightDisplacement = terrainHeight;
  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(displacedPos, 1.0);

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let N = normalize(in.worldNormal);
  let V = normalize(uniforms.cameraPosition - in.worldPos);
  
  // Star direction (simulated sun from origin)
  var L = -normalize(in.worldPos - vec3<f32>(0.0, 0.0, 0.0));
  if (length(in.worldPos) < 1.0) {
    L = normalize(vec3<f32>(0.5, 0.3, 0.8));
  }

  // Diffuse illumination with terminator softening
  let NdotL = max(0.0, dot(N, L));
  let diffuse = pow(NdotL, 0.85);

  // Surface Albedo based on composition type and procedural height
  var surfaceColor: vec3<f32>;
  let h = in.heightDisplacement;

  if (uniforms.compositionType < 0.5) {
    // Earth-like / Water World: Oceans, coastlines, lowlands, alpine peaks
    if (h < 0.42) {
      // Ocean abyss to shallows
      surfaceColor = mix(vec3<f32>(0.02, 0.08, 0.25), vec3<f32>(0.08, 0.35, 0.48), h / 0.42);
    } else if (h < 0.50) {
      // Coastlines / beaches
      surfaceColor = vec3<f32>(0.68, 0.62, 0.42);
    } else if (h < 0.72) {
      // Forest & grassy plains
      surfaceColor = mix(vec3<f32>(0.12, 0.38, 0.14), vec3<f32>(0.28, 0.35, 0.15), (h - 0.50) / 0.22);
    } else {
      // Mountain snow caps
      surfaceColor = mix(vec3<f32>(0.45, 0.40, 0.35), vec3<f32>(0.92, 0.95, 0.98), (h - 0.72) / 0.28);
    }
  } else if (uniforms.compositionType < 1.5) {
    // High Metal Content / Rocky: Basalt, ochre rust, silicate crags
    let baseRust = vec3<f32>(0.55, 0.24, 0.12);
    let basalt = vec3<f32>(0.22, 0.20, 0.21);
    let silica = vec3<f32>(0.62, 0.48, 0.32);
    surfaceColor = mix(basalt, mix(baseRust, silica, h), smoothstep(0.3, 0.8, h));
  } else if (uniforms.compositionType < 2.5) {
    // Icy Body: Cryo ice crust, methane slush, nitrogen frost
    let deepIce = vec3<f32>(0.35, 0.52, 0.68);
    let brightFrost = vec3<f32>(0.88, 0.94, 1.00);
    surfaceColor = mix(deepIce, brightFrost, smoothstep(0.35, 0.75, h));
  } else {
    // Ammonia World: Hydrocarbon seas, golden amber continents
    let ammoniaSea = vec3<f32>(0.15, 0.28, 0.18);
    let amberLand = vec3<f32>(0.72, 0.55, 0.22);
    surfaceColor = mix(ammoniaSea, amberLand, smoothstep(0.44, 0.52, h));
  }

  // Detailed Surface Scanner (DSS) Multi-layered Radial Heatmap Projection (Task 3.4.2)
  if (uniforms.dssHeatmapActive > 0.5) {
    // Generate DSS multi-band latitude/longitude gradient
    let lat = asin(N.y);
    let lon = atan2(N.z, N.x);
    let heatNoise = noise(N * 5.0 + vec3<f32>(uniforms.time * 0.05, 0.0, 0.0));
    
    // Bio & Geo density concentration contours (Cobra HUD cyan-to-emerald gradient)
    if (heatNoise > 0.55) {
      let heatIntensity = (heatNoise - 0.55) / 0.45;
      // High DSS concentration: Electric Turquoise to Bio Emerald
      let dssColor = mix(vec3<f32>(0.0, 0.95, 0.85), vec3<f32>(0.2, 1.0, 0.35), heatIntensity);
      // Blend onto surface with HUD tactical glow
      surfaceColor = mix(surfaceColor, dssColor, 0.72 * heatIntensity);
    }
  }

  // Atmospheric Fresnel Limb Glow (Rayleigh scattering rim)
  let fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.5);
  let atmoColor = vec3<f32>(0.25, 0.55, 1.0) * uniforms.atmosphereDensity;

  // Composite final fragment color
  let ambient = 0.08;
  let litSurface = surfaceColor * (diffuse + ambient) + atmoColor * fresnel * 1.5;

  return vec4<f32>(litSurface, 1.0);
}
`;

/**
 * WGSL Shader for Exobiology Specimen Markers and Minimum Colony Distance Rings (Task 3.4.3)
 * Renders 500m / 800m rings on the surface mesh preventing invalid clone sampling.
 */
export const WGSL_EXOBIO_OVERLAY_SHADER = /* wgsl */ `
struct ExobioUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: ExobioUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>, // World ring vertex
  @location(1) color: vec4<f32>,    // Ring color + alpha
  @location(2) ringRadiusMeters: f32,
  @location(3) pulsePhase: f32,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) pulse: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(in.position, 1.0);
  out.color = in.color;
  out.pulse = sin(uniforms.time * 3.0 + in.pulsePhase) * 0.5 + 0.5;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Pulsing holographic ring alpha
  let alpha = in.color.a * (0.7 + 0.3 * in.pulse);
  return vec4<f32>(in.color.rgb, alpha);
}
`;
