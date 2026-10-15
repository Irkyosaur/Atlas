// Atlas Star Point Shading & Limb-Darkening Shaders
// Compiles to high-performance WebGL2 / WebGPU fragment shaders

export const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aLuminosity;

  uniform float uPixelRatio;
  uniform float uZoom;

  varying vec3 vColor;
  varying float vLuminosity;

  void main() {
    vColor = aColor;
    vLuminosity = aLuminosity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Logarithmic distance point size scaling
    float dist = -mvPosition.z;
    float pointSize = (aSize * 250.0 / dist) * uPixelRatio;
    gl_PointSize = clamp(pointSize, 2.0, 64.0);
  }
`;

export const STAR_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vLuminosity;

  void main() {
    // 2D distance from gl_PointCoord center (0.0 to 1.0)
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;

    if (dist > 1.0) {
      discard;
    }

    // Quadratic Limb Darkening + High-Intensity Stellar Core
    float core = pow(max(0.0, 1.0 - dist), 3.0);
    float corona = pow(max(0.0, 1.0 - dist), 1.2) * 0.4;
    
    // Core burns white at highest intensity
    vec3 coreWhite = vec3(1.0, 1.0, 1.0) * pow(core, 2.0);
    vec3 finalColor = vColor * (core + corona) + coreWhite;

    gl_FragColor = vec4(finalColor, core + corona);
  }
`;

/**
 * WGSL Shader for Star Point Cloud Instanced Geometry (WebGPU Native)
 * Incorporates:
 * - Camera ViewProjection matrix & resolution / pixelRatio uniforms
 * - Instanced billboard quad generation with physical stellar limb-darkening
 * - Spectral temperature color grading & bloom/halo for giant / high-luminosity stars
 * - High-speed logarithmic attenuation preventing star popping
 */
export const WGSL_STAR_SHADER = /* wgsl */ `
struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  pixelRatio: f32,
  time: f32,
  haloEnabled: f32,
  pad: f32,
  pad2: f32,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniforms;

struct VertexInput {
  // Quad billboard vertex coordinates [-0.5, 0.5]
  @location(0) quadPos: vec2<f32>,

  // Per-instance star data
  @location(1) instancePos: vec3<f32>,
  @location(2) instanceColor: vec3<f32>,
  @location(3) instanceSize: f32,
  @location(4) instanceLuminosity: f32,
  @location(5) instanceType: f32, // 0=normal, 1=giant (O, WR, Neutron)
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec3<f32>,
  @location(2) luminosity: f32,
  @location(3) starType: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.uv = in.quadPos; // range [-0.5, 0.5]
  out.color = in.instanceColor;
  out.luminosity = in.instanceLuminosity;
  out.starType = in.instanceType;

  // Vector from camera to star
  let camToStar = in.instancePos - camera.cameraPosition;
  let dist = max(length(camToStar), 0.001);

  // Billboarding orientation vectors
  // Extract right and up basis vectors directly or calculate camera-facing billboard
  let forward = normalize(camToStar);
  var upHint = vec3<f32>(0.0, 1.0, 0.0);
  if (abs(forward.y) > 0.99) {
    upHint = vec3<f32>(0.0, 0.0, 1.0);
  }
  let right = normalize(cross(forward, upHint));
  let up = cross(right, forward);

  // Scaled billboard size based on luminosity, baseRadius and logarithmic view factor
  let baseScale = in.instanceSize;
  let giantMultiplier = select(1.0, 2.8, in.instanceType > 0.5);
  // Logarithmic screen size scaling: bright stars stay visible at galactic scales
  let worldScale = clamp(baseScale * 0.12 * giantMultiplier * (1.0 + log(dist * 0.05 + 1.0) * 0.35), 0.08, 120.0);

  let worldVertexPos = in.instancePos + (right * in.quadPos.x + up * in.quadPos.y) * worldScale;

  out.position = camera.viewProjection * vec4<f32>(worldVertexPos, 1.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Distance from quad center: range [0.0, 1.0]
  let dist = length(in.uv) * 2.0;

  if (dist > 1.0) {
    discard;
  }

  // Stellar Core + Limb Darkening (Eddington-Barbier approximation)
  let coreFactor = max(0.0, 1.0 - dist);
  let quadraticLimb = pow(coreFactor, 2.5);
  let corona = pow(coreFactor, 1.1) * 0.45;

  // Giant star outer halo glow pass (Class O, Wolf-Rayet, Blue Supergiants)
  var halo = 0.0;
  if (in.starType > 0.5 && camera.haloEnabled > 0.5) {
    // Pulsing subtle corona shimmer
    let shimmer = 1.0 + sin(camera.time * 2.5 + in.luminosity * 10.0) * 0.08;
    halo = pow(coreFactor, 0.8) * 0.6 * in.luminosity * shimmer;
  }

  // Core burns pure white at highest density
  let whiteHotCore = vec3<f32>(1.0, 1.0, 1.0) * pow(coreFactor, 4.0) * 1.5;
  let finalRgb = (in.color * (quadraticLimb + corona + halo)) + whiteHotCore;
  let alpha = clamp(quadraticLimb + corona + (halo * 0.7), 0.0, 1.0);

  return vec4<f32>(finalRgb, alpha);
}
`;
