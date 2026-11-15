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
uniform float uMorph;      // 0 sphere, 1 grid, 2 roads, 3 body, 4 field (fractions blend)
uniform float uRot;        // sphere spin, radians
uniform vec4  uSphere;     // xy centre, z radius (world units)
uniform vec4  uKeepOut;    // portrait face + shoulders: xy centre (NDC), zw radii (NDC); w = 0 disables
uniform vec4  uRight;      // placement for roads and body: xy centre, z scale
uniform vec4  uFull;       // placement for grid and field: xy centre, z half-width, w half-height
attribute float aSeed;
attribute vec3  aGrid;
attribute vec3  aRoad;
attribute float aAlong;
attribute vec3  aBody;
attribute vec3  aField;
varying float vAlpha;

${simplex3d}

vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }

void main() {
  float wSphere = 1.0 - clamp(uMorph, 0.0, 1.0);
  float wRoad   = clamp(uMorph - 1.0, 0.0, 1.0) * (1.0 - clamp(uMorph - 2.0, 0.0, 1.0));
  float wField  = clamp(uMorph - 3.0, 0.0, 1.0);

  // Sphere: noise-driven contour bands, spinning, centred on the portrait.
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
  // The field drifts upward and wraps: weight coming off the bar.
  vec3 f = aField;
  f.y = mod(f.y + 1.0 + uTime * 0.03 * (0.5 + aSeed), 2.0) - 1.0;
  vec3 tField = vec3(uFull.xy, 0.0) + vec3(f.x * uFull.z, f.y * uFull.w, f.z);

  vec3 p = tSphere;
  p = mix(p, tGrid,  clamp(uMorph, 0.0, 1.0));
  p = mix(p, tRoad,  clamp(uMorph - 1.0, 0.0, 1.0));
  p = mix(p, tBody,  clamp(uMorph - 2.0, 0.0, 1.0));
  p = mix(p, tField, clamp(uMorph - 3.0, 0.0, 1.0));

  // Pointer repulsion in screen space.
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  float d = distance(clip.xy / clip.w, uMouse);
  float push = smoothstep(0.42, 0.0, d) * uMouseForce;
  vec3 away = mix(normalize(vec3(clip.xy / clip.w - uMouse, 0.0) + 1e-5), sp, wSphere);
  p += away * push * 0.3;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // Sphere shading: front-facing and banded. Flat shapes: even, with road pulses like traffic.
  float facing = clamp(sp.z * 0.5 + 0.5, 0.0, 1.0);
  float band = smoothstep(0.15, 0.6, abs(fract(flow * 2.5) - 0.5) * 2.0);
  float sphereA = (0.08 + 0.75 * facing * facing) * (0.45 + 0.55 * band);
  float pulse = smoothstep(0.92, 1.0, fract(aAlong * 3.0 - uTime * 0.35 + aSeed * 0.15));
  float flatA = 0.55 + wRoad * pulse * 1.6 - wField * 0.15;
  vAlpha = mix(flatA, sphereA, wSphere) * (0.7 + 0.3 * aSeed) + push * 0.6;

  // Keep-out zone: particles never draw over the face and shoulders in the portrait.
  if (uKeepOut.w > 0.0) {
    vec2 ndcP = gl_Position.xy / gl_Position.w;
    vec2 q = (ndcP - uKeepOut.xy) / uKeepOut.zw;
    vAlpha *= smoothstep(1.0, 1.35, length(q));
  }

  gl_PointSize = uSize * uPixelRatio * (0.6 + 0.6 * aSeed) * (1.0 / -mv.z);
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
