// Location: atlas/client/src/lib/shaders/neutron_jet_shaders.ts
// WebGPU Procedural Relativistic Jet Cone Shaders for Neutron Stars & White Dwarfs (Task 4.2.2)

export const WGSL_NEUTRON_JET_SHADER = /* wgsl */ `
struct JetUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: JetUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,    // Unit cone mesh vertex
  @location(1) uv: vec2<f32>,
  // Instanced Jet Data
  @location(2) centerPos: vec3<f32>,  // Neutron star galactic coordinates (LY)
  @location(3) jetAxis: vec3<f32>,    // Spin orientation axis
  @location(4) jetLength: f32,        // Length of emission cone in LY (e.g. 15-40 LY)
  @location(5) jetColor: vec4<f32>,   // Base color (electric blue/violet for neutron, pale cyan for WD)
  @location(6) spinRate: f32,         // Relativistic precession/spin speed
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) worldPos: vec3<f32>,
  @location(3) distAlongJet: f32,
};

// Procedural 3D Rotation along arbitrary axis
fn rotateVector(v: vec3<f32>, axis: vec3<f32>, angle: f32) -> vec3<f32> {
  let cosA = cos(angle);
  let sinA = sin(angle);
  return v * cosA + cross(axis, v) * sinA + axis * dot(axis, v) * (1.0 - cosA);
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  // Compute basis vectors around the jet axis
  let normAxis = normalize(in.jetAxis);
  var up = vec3<f32>(0.0, 1.0, 0.0);
  if (abs(normAxis.y) > 0.9) {
    up = vec3<f32>(1.0, 0.0, 0.0);
  }
  let right = normalize(cross(normAxis, up));
  let forward = normalize(cross(right, normAxis));

  // High-speed pulsar spin and precession angle
  let spinAngle = uniforms.time * in.spinRate * 6.28318;
  let precessingRight = rotateVector(right, normAxis, spinAngle);
  let precessingFwd = rotateVector(forward, normAxis, spinAngle);

  // Cone geometry along jet length: position.z is 0.0 (apex at star) to 1.0 (cone base)
  let zDist = in.position.z * in.jetLength;
  // Flaring radius with helical wave perturbation
  let radius = in.position.z * (in.jetLength * 0.22);
  let helixWave = sin(uniforms.time * 8.0 + in.position.z * 12.0) * (0.05 * in.jetLength);

  let localOffset = precessingRight * (in.position.x * radius + helixWave) +
                    precessingFwd * (in.position.y * radius) +
                    normAxis * zDist;

  let worldPos = in.centerPos + localOffset;
  let relPos = worldPos - uniforms.origin;

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(relPos, 1.0);
  out.uv = in.uv;
  out.color = in.jetColor;
  out.worldPos = worldPos;
  out.distAlongJet = in.position.z;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = in.distAlongJet;

  // Helical energy waves moving rapidly outward from star along the jet
  let wave = sin(dist * 25.0 - uniforms.time * 12.0) * 0.5 + 0.5;

  // Core brightness concentration (bright magnetic flux axis)
  let coreFactor = exp(-abs(in.uv.x - 0.5) * 8.0);

  // Fade out toward cone tip
  let tipFade = smoothstep(1.0, 0.6, dist) * smoothstep(0.0, 0.05, dist);

  let intensity = (0.7 + 0.6 * wave + 1.2 * coreFactor) * tipFade;
  let jetRgb = in.color.rgb * intensity * 1.8;
  let alpha = in.color.a * tipFade * (0.6 + 0.4 * wave);

  return vec4<f32>(jetRgb, alpha);
}
`;
