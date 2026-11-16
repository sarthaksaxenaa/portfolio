// 3D simplex noise: Ian McEwan & Stefan Gustavson (Ashima Arts), MIT licence.
const simplex3d = /* glsl */ `
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec2  uMouse;      // pointer in NDC (-1..1), far away when unknown
uniform float uMouseForce; // 0..1, eased in and out
uniform float uMorph;      // 0 portrait, 1 grid, 2 roads, 3 body, 4 sphere (fractions blend)
uniform float uRot;        // sphere spin, radians
uniform vec4  uSphere;     // xy centre, z radius (world units)
uniform vec4  uRight;      // placement for roads and body: xy centre, z scale
uniform vec4  uFull;       // placement for the grid: xy centre, z half-width, w half-height
uniform vec4  uPortrait;   // hero portrait: xy centre, z height (world units)
uniform float uIntro;      // 0 → 1: the burst out of the opening dot
attribute float aSeed;
attribute vec3  aGrid;
attribute vec3  aRoad;
attribute float aAlong;
attribute vec3  aBody;
attribute vec3  aPortrait; // x, y (image-centred), brightness
varying float vAlpha;

${simplex3d}

vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }

void main() {
  float wPortrait = 1.0 - clamp(uMorph, 0.0, 1.0);
  float wRoad   = clamp(uMorph - 1.0, 0.0, 1.0) * (1.0 - clamp(uMorph - 2.0, 0.0, 1.0));
  float wSphere = clamp(uMorph - 3.0, 0.0, 1.0);

  // Sphere: noise-driven contour bands, spinning; it closes the page beside the contact section.
  vec3 n = normalize(position);
  float flow = snoise(n * 1.6 + vec3(0.0, uTime * 0.12, uTime * 0.05));
  float ripple = snoise(n * 4.0 + uTime * 0.25) * 0.25;
  vec3 sp = rotY(n * (1.0 + 0.12 * flow + 0.03 * ripple), uRot);
  vec3 tSphere = vec3(uSphere.xy, 0.0) + sp * uSphere.z;

  // Flat shapes breathe a little so they never look frozen.
  float breathe = snoise(vec3(aSeed * 10.0, uTime * 0.2, 0.0)) * 0.012;
  vec3 tGrid  = vec3(uFull.xy, 0.0) + vec3(aGrid.x * uFull.z, aGrid.y * uFull.w, aGrid.z) + breathe;
  vec3 tRoad  = vec3(uRight.xy, 0.0) + aRoad * uRight.z;
  vec3 tBody  = vec3(uRight.xy, 0.0) + aBody * uRight.z + breathe;
  // The hero portrait: brighter points sit a little closer, and every point shimmers like dust.
  vec3 shimmer = vec3(
    snoise(vec3(aSeed * 31.0, uTime * 0.35, 1.0)),
    snoise(vec3(aSeed * 17.0, uTime * 0.35, 2.0)),
    0.0) * 0.006;
  vec3 tPortrait = vec3(uPortrait.xy, 0.0)
    + vec3(aPortrait.xy * uPortrait.z, (aPortrait.z - 0.5) * 0.18)
    + shimmer;

  vec3 p = tPortrait;
  p = mix(p, tGrid,   clamp(uMorph, 0.0, 1.0));
  p = mix(p, tRoad,   clamp(uMorph - 1.0, 0.0, 1.0));
  p = mix(p, tBody,   clamp(uMorph - 2.0, 0.0, 1.0));
  p = mix(p, tSphere, clamp(uMorph - 3.0, 0.0, 1.0));

  // First load: the particles start as noise scattered over the whole screen and gather into
  // their places, the first ones first.
  float burstT = clamp(uIntro * 1.6 - aSeed * 0.6, 0.0, 1.0);
  float burst = 1.0 - pow(1.0 - burstT, 3.0);
  vec3 origin = vec3(
    (fract(aSeed * 91.7) * 2.0 - 1.0) * uFull.z,
    (fract(aSeed * 53.3) * 2.0 - 1.0) * uFull.w,
    (fract(aSeed * 17.1) - 0.5) * 0.6);
  p = mix(origin, p, burst);

  // Pointer repulsion in screen space.
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  float d = distance(clip.xy / clip.w, uMouse);
  // On the portrait the touch is small and gentle, so the face ripples instead of scattering.
  float reach = mix(0.42, 0.16, wPortrait);
  float push = smoothstep(reach, 0.0, d) * uMouseForce;
  vec3 away = mix(normalize(vec3(clip.xy / clip.w - uMouse, 0.0) + 1e-5), sp, wSphere);
  p += away * push * mix(0.3, 0.07, wPortrait);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // Sphere shading: front-facing and banded. Flat shapes: even, with road pulses like traffic.
  float facing = clamp(sp.z * 0.5 + 0.5, 0.0, 1.0);
  float band = smoothstep(0.15, 0.6, abs(fract(flow * 2.5) - 0.5) * 2.0);
  float sphereA = (0.08 + 0.75 * facing * facing) * (0.45 + 0.55 * band);
  float pulse = smoothstep(0.92, 1.0, fract(aAlong * 3.0 - uTime * 0.35 + aSeed * 0.15));
  float flatA = 0.55 + wRoad * pulse * 1.6;
  // Fine, brightness-scaled dust: density carries the tones, so the face never clips to white.
  float portraitA = 0.2 + 1.15 * aPortrait.z;
  vAlpha = mix(mix(flatA, portraitA, wPortrait), sphereA, wSphere) * (0.7 + 0.3 * aSeed)
    + push * 0.6 + (1.0 - burst) * 0.5;

  float shapeSize = uSize * uPixelRatio * (0.6 + 0.6 * aSeed) * (1.0 / -mv.z);
  float dustSize = 1.7 * uPixelRatio * (0.7 + 0.6 * aSeed); // ~1.2–2.2 CSS px on every screen
  gl_PointSize = mix(shapeSize, dustSize, wPortrait);
}
`;

export const fragmentShader = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.15, r);
  gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
}
`;
