/**
 * Two passes. FIELD raymarches a morphing signed-distance shape into a tiny render target, one texel
 * per character cell (R = light, G = hit, B = rim, A = depth). GLYPHS draws the full canvas: each
 * cell looks up its texel, picks a glyph from the atlas by brightness and adds signal noise, the
 * decode dissolve, the pointer disturbance and a soft phosphor bloom. Shapes match src/lib/ascii.ts.
 */

export const VERT = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FIELD = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uGrid;        // cols, rows
uniform float uCellAspect; // cell height / cell width
uniform float uTime;
uniform vec4 uMorph;       // weights: torus, octa, blob, knot
uniform vec2 uRot;         // yaw, pitch
uniform float uCenterX;    // 0..1 across the width
uniform float uCenterY;
uniform float uScale;
uniform vec3 uPointer;     // world-ish x, y and strength
uniform float uWobble;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float sdTorus(vec3 p) { vec2 q = vec2(length(p.xz) - 0.95, p.y); return length(q) - 0.38; }
float sdOcta(vec3 p) { p = abs(p); return (p.x + p.y + p.z - 1.25) * 0.57735; }
float sdBlob(vec3 p) {
  float w = 0.11 + uWobble * 0.06;
  return length(p) - 1.0 + w * sin(4.0 * p.x + uTime * 0.7) * sin(4.0 * p.y + 1.3) * sin(4.0 * p.z + 0.7 - uTime * 0.5);
}
float sdKnot(vec3 p) {
  float ang = atan(p.z, p.x);
  float q = length(p.xz) - 0.9;
  vec2 uv = rot(ang * 1.5 + uTime * 0.25) * vec2(q, p.y);
  return max(abs(uv.x) - 0.42, abs(uv.y) - 0.16) * 0.7;
}

float map(vec3 p) {
  p.xz *= rot(uRot.x);
  p.yz *= rot(uRot.y);
  float d = 0.0;
  float total = uMorph.x + uMorph.y + uMorph.z + uMorph.w;
  d += uMorph.x * sdTorus(p);
  d += uMorph.y * sdOcta(p);
  d += uMorph.z * sdBlob(p);
  d += uMorph.w * sdKnot(p);
  return d / max(total, 0.0001);
}

vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0025;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

void main() {
  float aspect = uGrid.x / (uGrid.y * uCellAspect);
  vec2 s = vec2((vUv.x - uCenterX) * 2.0 * aspect, (vUv.y - uCenterY) * 2.0) / uScale;
  vec3 ro = vec3(0.0, 0.0, 3.4);
  vec3 rd = normalize(vec3(s * 0.4, -1.0));

  // Pointer pushes the surface away like a magnet on a tube screen.
  vec2 toP = s - uPointer.xy;
  float push = uPointer.z * exp(-dot(toP, toP) * 3.0);

  float t = 0.0;
  float hit = 0.0;
  float steps = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float d = map(p) + push * 0.35;
    if (d < 0.002) { hit = 1.0; break; }
    t += d * 0.85;
    steps += 1.0;
    if (t > 7.0) break;
  }
  if (hit < 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); return; }
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  vec3 l = normalize(vec3(-0.5, 0.75, 0.6));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(n, normalize(l - rd)), 0.0), 24.0);
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float ao = 1.0 - clamp(steps / 64.0, 0.0, 1.0) * 0.55;
  float lum = clamp((0.16 + 0.8 * diff) * ao + 0.5 * spec + 0.12 * rim, 0.0, 1.0);
  gl_FragColor = vec4(lum, 1.0, rim, spec);
}
`;

export const GLYPHS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uField;
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform float uRamp;       // glyphs in the brightness ramp
uniform float uNoiseGlyphs; // glyphs in the noise set (after the ramp in the atlas)
uniform float uTime;
uniform float uDecode;     // 0 = pure noise, 1 = fully resolved
uniform float uStatic;     // density of background static
uniform float uLoss;       // signal loss: random cells drop to noise
uniform vec3 uPointer;     // grid x, grid y, strength
uniform float uCellAspect;
uniform vec3 uDim;
uniform vec3 uMain;
uniform vec3 uHot;
uniform vec3 uRim;
uniform float uGlitch;     // 0..1 strength of a tracking-error band
uniform float uGlitchY;    // band centre, in rows
uniform float uGlow;
uniform float uScan;
uniform float uAlpha;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
  vec2 g = vUv * uGrid;
  // Tracking error: a few rows slide sideways for a moment.
  float band = uGlitch * step(abs(floor(g.y) - uGlitchY), 1.5 + uGlitch * 2.0);
  g.x += band * (3.0 + 5.0 * hash(vec2(floor(g.y), floor(uTime * 30.0))));
  vec2 cell = floor(g);
  vec2 local = fract(g);
  vec4 f = texture2D(uField, (cell + 0.5) / uGrid);
  float h = hash(cell);
  // Ordered noise breaks up flat faces into texture instead of one repeated glyph.
  float lum = clamp(f.r + (h - 0.5) * 0.08, 0.0, 1.0);
  float hitMask = f.g;
  float rimAmt = f.b;
  float tick = floor(uTime * 14.0);
  float hf = hash(cell + tick * 0.618);

  // Decode: every cell resolves at its own moment.
  bool resolved = h < uDecode;
  // Pointer disturbance, in cell units (corrected for the tall cell).
  vec2 dp = (cell - uPointer.xy) * vec2(1.0, uCellAspect);
  float near = uPointer.z * smoothstep(9.0, 0.0, length(dp));
  bool scramble = hf < near * 0.85 || hf < uLoss * hitMask || hf < band * 0.6;

  float idx = -1.0;
  float bright = lum;
  if (hitMask > 0.5) {
    idx = floor(clamp(lum, 0.0, 0.999) * uRamp);
    idx = max(idx, 1.0);
    if (!resolved || scramble) {
      idx = uRamp + floor(hf * uNoiseGlyphs);
      bright = 0.55 + 0.45 * hf;
    }
  } else {
    // Background static: sparse, flickering, faint.
    if (hf < uStatic || (!resolved && hf < 0.2) || hf < near * 0.25) {
      idx = hf < uStatic * 0.7 ? 1.0 : uRamp + floor(hash(cell + tick) * uNoiseGlyphs);
      bright = 0.18 + near * 0.5;
    }
  }

  float glyph = 0.0;
  if (idx >= 0.0) {
    vec2 auv = vec2((idx + local.x) / (uRamp + uNoiseGlyphs), local.y);
    glyph = texture2D(uAtlas, auv).r;
  }

  vec3 col = mix(uDim, uMain, smoothstep(0.12, 0.7, bright));
  col = mix(col, uRim, smoothstep(0.35, 0.9, rimAmt) * hitMask * 0.85);
  col = mix(col, uHot, clamp(smoothstep(0.8, 1.0, bright) + f.a * 0.6 + near * 0.4, 0.0, 1.0));

  // Bloom: a soft, bilinear read of the field behind the glyphs.
  vec4 soft = texture2D(uField, vUv);
  float halo = soft.g * soft.r * uGlow;

  float scan = 1.0 - uScan * (0.5 + 0.5 * cos(gl_FragCoord.y * 3.14159));
  float a = clamp(glyph * scan + halo, 0.0, 1.0) * uAlpha;
  vec3 rgb = (col * glyph * scan + uMain * halo);
  // Written premultiplied, the same result as SRC_ALPHA blending over a cleared canvas.
  gl_FragColor = vec4(rgb * uAlpha * a, a);
}
`;
