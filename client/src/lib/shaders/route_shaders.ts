// Location: atlas/client/src/lib/shaders/route_shaders.ts
// WebGPU Shaders for 3D Glowing Neon Route Ribbons and Pulsing Waypoint Nodes (Task 4.1.3)

export const WGSL_ROUTE_RIBBON_SHADER = /* wgsl */ `
struct RouteUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
  pulseSpeed: f32,
  ribbonWidth: f32,
  glowIntensity: f32,
  pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: RouteUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,     // World LY position of route vertex
  @location(1) tangent: vec3<f32>,      // Unit tangent vector along route
  @location(2) side: f32,               // -1.0 or +1.0 for ribbon extrusion
  @location(3) progress: f32,           // Normalized route progress (0.0 to 1.0)
  @location(4) color: vec4<f32>,        // Waypoint RGBA color
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

  // Origin-shifted relative position to prevent 32-bit floating-point precision loss
  let relPos = in.position - uniforms.origin;

  // View vector from camera to vertex
  let viewDir = normalize(uniforms.cameraPosition - in.position);

  // Billboard normal perpendicular to both tangent and view vector
  var sideDir = normalize(cross(in.tangent, viewDir));
  if (length(sideDir) < 0.001) {
    sideDir = vec3<f32>(0.0, 1.0, 0.0);
  }

  // Extrude ribbon in screen-perpendicular direction
  let extrudedPos = relPos + sideDir * (in.side * uniforms.ribbonWidth);

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(extrudedPos, 1.0);
  out.color = in.color;
  out.progress = in.progress;
  out.side = in.side;
  out.worldPos = in.position;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Edge falloff for glowing ribbon core (Gaussian neon ribbon)
  let distFromCenter = abs(in.side);
  let edgeFalloff = exp(-distFromCenter * distFromCenter * 3.5);

  // Directional animated pulse traveling along the route (Origin -> Destination)
  let pulsePhase = fract(in.progress * 8.0 - uniforms.time * uniforms.pulseSpeed);
  let pulse = smoothstep(0.0, 0.25, pulsePhase) * smoothstep(0.5, 0.25, pulsePhase) * 2.0;

  // Combine neon cyan/amber color with travel pulse
  let baseColor = in.color.rgb;
  let pulseColor = vec3<f32>(1.0, 0.95, 0.7); // Bright white-gold pulse highlight
  let litColor = mix(baseColor, pulseColor, clamp(pulse, 0.0, 1.0));

  // Alpha fade at ribbon edges with tactical holographic opacity
  let alpha = in.color.a * edgeFalloff * (0.8 + 0.4 * pulse);

  return vec4<f32>(litColor * uniforms.glowIntensity, alpha);
}
`;

export const WGSL_WAYPOINT_NODE_SHADER = /* wgsl */ `
struct WaypointUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: WaypointUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,    // Billboard quad (-1 to +1)
  @location(1) position: vec3<f32>,   // Instanced waypoint LY position
  @location(2) color: vec4<f32>,      // Instanced waypoint RGBA
  @location(3) radius: f32,           // Node marker radius
  @location(4) isFuelStop: f32,       // 1.0 if scoopable fuel stop
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) isFuelStop: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let relPos = in.position - uniforms.origin;

  // Camera billboard vectors
  let toCam = normalize(uniforms.cameraPosition - in.position);
  var camRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), toCam));
  if (length(camRight) < 0.001) {
    camRight = vec3<f32>(1.0, 0.0, 0.0);
  }
  let camUp = normalize(cross(toCam, camRight));

  let billboardOffset = (camRight * in.quadPos.x + camUp * in.quadPos.y) * in.radius;
  let finalPos = relPos + billboardOffset;

  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(finalPos, 1.0);
  out.uv = in.quadPos;
  out.color = in.color;
  out.isFuelStop = in.isFuelStop;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }

  // Concentric targeting ring & glowing solid center
  let ring = smoothstep(0.7, 0.75, dist) - smoothstep(0.85, 0.9, dist);
  let core = smoothstep(0.4, 0.0, dist);

  var col = in.color.rgb;
  if (in.isFuelStop > 0.5) {
    // Golden amber warning for critical fuel stop
    col = vec3<f32>(1.0, 0.75, 0.1);
  }

  let alpha = (ring * 1.5 + core * 2.0) * in.color.a;
  return vec4<f32>(col, clamp(alpha, 0.0, 1.0));
}
`;
