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
