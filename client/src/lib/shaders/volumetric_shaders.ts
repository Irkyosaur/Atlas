// Location: atlas/client/src/lib/shaders/volumetric_shaders.ts
// WGSL Shaders for Volumetric Powerplay 2.0 Territory Bubbles & Thargoid Titan Caustic Zones (Task 2.4.1, 2.4.2)

export const WGSL_VOLUMETRIC_SHADER = /* wgsl */ `
struct VolumetricUniforms {
  viewProjection: mat4x4<f32>,
  invViewProj: mat4x4<f32>,
  cameraPosition: vec3<f32>,
  time: f32,
  cameraOrigin: vec3<f32>,
  powerplayOpacity: f32,
  thargoidOpacity: f32,
  originShiftEnabled: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: VolumetricUniforms;

struct SphereVolume {
  center: vec3<f32>,
  radius: f32,
  color: vec3<f32>,
  volumeType: f32, // 0.0 = Powerplay bubble, 1.0 = Titan Caustic Maelstrom
};

struct SphereBuffer {
  spheres: array<SphereVolume, 32>,
};

@group(0) @binding(1)
var<storage, read> sphereData: SphereBuffer;

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
  out.worldPos = in.position;

  var shiftedPos = in.position;
  if (uniforms.originShiftEnabled > 0.5) {
    shiftedPos = in.position - uniforms.cameraOrigin;
  }

  out.position = uniforms.viewProjection * vec4<f32>(shiftedPos, 1.0);
  return out;
}

// 3D Simplex-like procedural noise for Titan caustic smoke and Powerplay coronal pulse
fn hash3(p: vec3<f32>) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise3D(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 0.0)), hash3(i + vec3<f32>(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 0.0)), hash3(i + vec3<f32>(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 1.0)), hash3(i + vec3<f32>(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 1.0)), hash3(i + vec3<f32>(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

// Sphere ray-intersection test
fn intersectSphere(rayOrigin: vec3<f32>, rayDir: vec3<f32>, sphereCenter: vec3<f32>, radius: f32) -> vec2<f32> {
  let oc = rayOrigin - sphereCenter;
  let b = dot(oc, rayDir);
  let c = dot(oc, oc) - radius * radius;
  let h = b * b - c;
  if (h < 0.0) {
    return vec2<f32>(-1.0, -1.0);
  }
  let sqrtH = sqrt(h);
  return vec2<f32>(-b - sqrtH, -b + sqrtH);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let camPos = uniforms.cameraPosition + select(vec3<f32>(0.0), uniforms.cameraOrigin, uniforms.originShiftEnabled > 0.5);
  let rayDir = normalize(in.worldPos - camPos);

  var accumulatedColor = vec3<f32>(0.0);
  var accumulatedAlpha = 0.0;

  // Raymarch each active volume
  for (var i = 0u; i < 32u; i = i + 1u) {
    let sphere = sphereData.spheres[i];
    if (sphere.radius <= 0.0) {
      continue;
    }

    let isTitan = sphere.volumeType > 0.5;
    let layerOpacity = select(uniforms.powerplayOpacity, uniforms.thargoidOpacity, isTitan);
    if (layerOpacity <= 0.01) {
      continue;
    }

    let hits = intersectSphere(camPos, rayDir, sphere.center, sphere.radius);
    if (hits.y < 0.0 || hits.x > 100000.0) {
      continue;
    }

    let tNear = max(hits.x, 0.0);
    let tFar = hits.y;
    let chordLen = tFar - tNear;
    if (chordLen <= 0.0) {
      continue;
    }

    // Step size based on sphere thickness
    let steps = 16.0;
    let stepSize = chordLen / steps;
    var t = tNear + stepSize * 0.5;

    for (var s = 0.0; s < 16.0; s = s + 1.0) {
      let samplePos = camPos + rayDir * t;
      let distFromCenter = length(samplePos - sphere.center);
      let normDist = clamp(distFromCenter / sphere.radius, 0.0, 1.0);

      var sampleDensity = 0.0;
      var sampleColor = sphere.color;

      if (isTitan) {
        // Thargoid Titan Maelstrom caustic gas cloud:
        // Animated turbulent noise with swirling caustic perimeter
        let noiseCoord = (samplePos - sphere.center) * 0.02 + vec3<f32>(uniforms.time * 0.15, uniforms.time * 0.1, -uniforms.time * 0.12);
        let n1 = noise3D(noiseCoord);
        let n2 = noise3D(noiseCoord * 2.0);
        let turbulence = n1 * 0.6 + n2 * 0.4;

        // Dense caustic core with fading caustic gas perimeter
        let coreFalloff = smoothstep(1.0, 0.15, normDist);
        let causticFringe = smoothstep(0.7, 0.95, normDist) * turbulence * 1.8;

        sampleDensity = (coreFalloff * 0.08 + causticFringe * 0.12) * layerOpacity;
        // Deep toxic caustic green / yellow hue (#40c057 -> #a9e34b)
        sampleColor = mix(sphere.color, vec3<f32>(0.85, 0.95, 0.2), turbulence * 0.5);
      } else {
        // Powerplay 2.0 territory sphere:
        // Smooth coronal fresnel bubble with gentle pulsating boundary
        let pulse = sin(normDist * 6.0 - uniforms.time * 1.5) * 0.1 + 0.9;
        let edgeGlow = pow(normDist, 2.5) * 0.04 * pulse;
        let innerVolume = smoothstep(0.9, 0.0, normDist) * 0.015;

        sampleDensity = (edgeGlow + innerVolume) * layerOpacity;
      }

      let stepAlpha = clamp(sampleDensity * stepSize, 0.0, 1.0);
      accumulatedColor += (1.0 - accumulatedAlpha) * sampleColor * stepAlpha;
      accumulatedAlpha += (1.0 - accumulatedAlpha) * stepAlpha;

      if (accumulatedAlpha > 0.95) {
        break;
      }

      t += stepSize;
    }
  }

  if (accumulatedAlpha < 0.005) {
    discard;
  }

  return vec4<f32>(accumulatedColor, accumulatedAlpha);
}
`;
