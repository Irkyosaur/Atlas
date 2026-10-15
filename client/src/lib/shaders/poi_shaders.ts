// Location: atlas/client/src/lib/shaders/poi_shaders.ts
// WebGPU WGSL Shaders for Canonn POI Markers: Generation Ships, Guardian Ruins, Thargoid Sites, Crashed Ships (Stage 5.4)

export const WGSL_POI_MARKER_SHADER = /* wgsl */ `
struct PoiUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
  markerBaseSize: f32,
  selectedPoiIdx: f32,
  pad: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: PoiUniforms;

struct VertexInput {
  @location(0) quadPos: vec2<f32>,    // Billboard quad (-1.0 to +1.0)
  @location(1) worldPos: vec3<f32>,   // POI 3D galactic position (LY)
  @location(2) poiCategory: f32,      // 0 = Gen Ship, 1 = Guardian, 2 = Thargoid, 3 = Crash/Derelict, 4 = Megaship
  @location(3) poiIdx: f32,           // Index in active catalog
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) category: f32,
  @location(2) isSelected: f32,
  @location(3) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let relPos = in.worldPos - uniforms.origin;
  let camDist = length(uniforms.cameraPosition - in.worldPos);
  
  // Adaptive scaling so glyphs remain legible across galaxy zoom levels
  let scale = clamp(camDist * 0.016, uniforms.markerBaseSize * 0.8, uniforms.markerBaseSize * 7.5);

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
  out.category = in.poiCategory;
  out.isSelected = select(0.0, 1.0, abs(in.poiIdx - uniforms.selectedPoiIdx) < 0.5);
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

  var color = vec3<f32>(1.0, 1.0, 1.0);
  var alpha = 0.0;
  let cat = i32(round(in.category));

  if (cat == 0) {
    // 0: GENERATION SHIP (Retro Double Ring Habitat + Central Hub Cross)
    // Amber / Vintage Brass Hue
    let ringOuter = smoothstep(0.85, 0.80, dist) - smoothstep(0.72, 0.67, dist);
    let ringInner = smoothstep(0.55, 0.50, dist) - smoothstep(0.42, 0.37, dist);
    let crossV = smoothstep(0.06, 0.0, abs(uv.x)) * smoothstep(0.75, 0.0, abs(uv.y));
    let crossH = smoothstep(0.06, 0.0, abs(uv.y)) * smoothstep(0.75, 0.0, abs(uv.x));
    let hub = smoothstep(0.20, 0.0, dist);

    let shape = clamp(ringOuter + ringInner + crossV + crossH + hub, 0.0, 1.0);
    color = vec3<f32>(1.0, 0.65, 0.15); // Generation Orange / Amber
    alpha = shape;

    // Slow vintage beacon pulse
    let pulse = 0.85 + 0.15 * sin(uniforms.time * 2.0);
    alpha *= pulse;

  } else if (cat == 1) {
    // 1: GUARDIAN SITES (Cyan / Azure Crystalline Tri-Chevron)
    // 3-way rotational symmetry
    let angle = atan2(uv.y, uv.x);
    let triAngle = fract((angle + 3.14159) / (2.094395)) * 2.094395 - 1.047197;
    let triDist = dist * cos(triAngle);
    let triBorder = smoothstep(0.68, 0.62, triDist) - smoothstep(0.58, 0.52, triDist);
    let pylonCore = smoothstep(0.22, 0.0, dist);
    let pylonRays = smoothstep(0.05, 0.0, abs(sin(angle * 3.0))) * smoothstep(0.70, 0.20, dist);

    let shape = clamp(triBorder + pylonCore + pylonRays, 0.0, 1.0);
    color = vec3<f32>(0.15, 0.85, 1.0); // Guardian Cyan / Azure
    alpha = shape;

    // Ancient crystalline shimmer
    let shimmer = 0.8 + 0.2 * sin(uniforms.time * 3.5 + dist * 5.0);
    alpha *= shimmer;

  } else if (cat == 2) {
    // 2: THARGOID / TITAN SITES (Caustic Lime / Bio-Organic Octagonal Flower)
    let angle = atan2(uv.y, uv.x);
    // 8-fold bio petal modulation
    let petals = 0.55 + 0.18 * cos(angle * 8.0 + uniforms.time * 1.5);
    let bioBorder = smoothstep(petals + 0.08, petals, dist) - smoothstep(petals, petals - 0.08, dist);
    let bioCore = smoothstep(0.25, 0.0, dist);

    let shape = clamp(bioBorder + bioCore, 0.0, 1.0);
    color = vec3<f32>(0.45, 0.95, 0.20); // Caustic Thargoid Bio-Green
    alpha = shape;

    // Pulsing organic heartbeat
    let heartbeat = 0.82 + 0.18 * sin(uniforms.time * 4.0);
    alpha *= heartbeat;

  } else if (cat == 3) {
    // 3: CRASHED SHIP / DERELICT (Red-Orange Warning Diamond with Strobe)
    let diamond = abs(uv.x) + abs(uv.y);
    let diamondBorder = smoothstep(0.75, 0.70, diamond) - smoothstep(0.65, 0.60, diamond);
    let diagonalCross1 = smoothstep(0.06, 0.0, abs(uv.x - uv.y)) * smoothstep(0.6, 0.0, dist);
    let diagonalCross2 = smoothstep(0.06, 0.0, abs(uv.x + uv.y)) * smoothstep(0.6, 0.0, dist);

    let shape = clamp(diamondBorder + diagonalCross1 + diagonalCross2, 0.0, 1.0);
    color = vec3<f32>(1.0, 0.28, 0.12); // Derelict Distress Red
    alpha = shape;

    // Emergency distress strobe (sharp blink)
    let strobe = select(0.5, 1.0, fract(uniforms.time * 1.5) > 0.6);
    alpha *= strobe;

  } else {
    // 4: ABANDONED SETTLEMENT / MEGASHIP (Hexagonal Industrial Gold)
    let angle = atan2(uv.y, uv.x);
    let hexAngle = fract((angle + 3.14159) / (1.047197)) * 1.047197 - 0.523598;
    let hexDist = dist * cos(hexAngle);
    let hexBorder = smoothstep(0.70, 0.65, hexDist) - smoothstep(0.60, 0.55, hexDist);
    let centerBox = smoothstep(0.08, 0.0, max(abs(uv.x), abs(uv.y)));

    let shape = clamp(hexBorder + centerBox, 0.0, 1.0);
    color = vec3<f32>(1.0, 0.82, 0.25); // Megaship Gold
    alpha = shape;
  }

  // Selection halo bracket
  if (in.isSelected > 0.5) {
    let selectRing = smoothstep(0.96, 0.90, dist) - smoothstep(0.88, 0.82, dist);
    let cornerTicks = select(0.0, 1.0, (abs(uv.x) > 0.65 || abs(uv.y) > 0.65));
    color = mix(color, vec3<f32>(1.0, 1.0, 1.0), 0.6);
    alpha = max(alpha, selectRing * cornerTicks * 0.9);
  }

  // Subtle core glow
  let glow = smoothstep(0.9, 0.0, dist) * 0.2;
  alpha = clamp(alpha + glow, 0.0, 1.0);

  if (alpha < 0.05) {
    discard;
  }

  return vec4<f32>(color * alpha, alpha);
}
`;

export const WGSL_POI_STALK_SHADER = /* wgsl */ `
struct PoiStalkUniforms {
  viewProjMatrix: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  origin: vec3<f32>,
  time: f32,
  selectedPoiIdx: f32,
  pad: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: PoiStalkUniforms;

struct StalkVertexInput {
  @location(0) position: vec3<f32>, // World coords (LY)
  @location(1) poiCategory: f32,    // 0..4
  @location(2) isBase: f32,         // 0.0 = POI system, 1.0 = Plane base
  @location(3) poiIdx: f32,
};

struct StalkVertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) category: f32,
  @location(1) isBase: f32,
  @location(2) isSelected: f32,
};

@vertex
fn vs_main(in: StalkVertexInput) -> StalkVertexOutput {
  var out: StalkVertexOutput;
  let relPos = in.position - uniforms.origin;
  out.clipPos = uniforms.viewProjMatrix * vec4<f32>(relPos, 1.0);
  out.category = in.poiCategory;
  out.isBase = in.isBase;
  out.isSelected = select(0.0, 1.0, abs(in.poiIdx - uniforms.selectedPoiIdx) < 0.5);
  return out;
}

@fragment
fn fs_main(in: StalkVertexOutput) -> @location(0) vec4<f32> {
  var stalkColor = vec3<f32>(1.0, 0.65, 0.15); // Default Amber (Gen ship)
  let cat = i32(round(in.category));

  if (cat == 1) {
    stalkColor = vec3<f32>(0.15, 0.85, 1.0); // Guardian Cyan
  } else if (cat == 2) {
    stalkColor = vec3<f32>(0.45, 0.95, 0.20); // Thargoid Lime
  } else if (cat == 3) {
    stalkColor = vec3<f32>(1.0, 0.28, 0.12); // Crashed Ship Red
  } else if (cat == 4) {
    stalkColor = vec3<f32>(1.0, 0.82, 0.25); // Megaship Gold
  }

  // Fades out gently towards galactic plane base
  var alpha = mix(0.70, 0.18, in.isBase);

  if (in.isSelected > 0.5) {
    stalkColor = mix(stalkColor, vec3<f32>(1.0, 1.0, 1.0), 0.5);
    alpha = mix(0.95, 0.45, in.isBase);
  }

  return vec4<f32>(stalkColor * alpha, alpha);
}
`;
