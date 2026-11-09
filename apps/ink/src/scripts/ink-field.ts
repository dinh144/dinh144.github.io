/**
 * The ink field: ink blooming and diffusing on warm paper.
 *
 * A small stable-fluids solver (advection, vorticity, pressure projection) moves two pigments,
 * sumi black (R) and cinnabar (G), through the paper. A display pass turns density into ink:
 * Beer-Lambert absorption, darker wet edges where a wash dries, granulation in the paper's
 * tooth, and "resist" zones (text blocks) where ink barely takes, so reading text never sits
 * under a heavy wash. The ink is anchored to the paper: page scroll advects it with the page.
 *
 * Three.js is only the GL plumbing (render targets, materials, one full-screen triangle).
 * Loaded lazily by motion.ts once text has painted; never started when motion is reduced.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
  type IUniform,
} from 'three';

export interface InkTheme {
  ink: string;
  accent: string;
  /** Overall opacity of the wash (lighter on dark paper). */
  strength: number;
}

export interface InkField {
  /** Pointer movement in CSS px; leaves a faint trail and stirs the water. */
  stir(x: number, y: number, dx: number, dy: number): void;
  /** How much ink the pointer trail leaves (1 = home, lower on reading pages). */
  setTrail(scale: number): void;
  /** A drop of ink that blooms outward. `size` ~ 1 for a click, larger for compositions. */
  bloom(x: number, y: number, opts?: { size?: number; accent?: number; amount?: number }): void;
  /** Page scrolled by dy CSS px: the paper (and its ink) moves with it. */
  scroll(dy: number): void;
  /** Text blocks (CSS px, viewport space) where ink should barely take. Max 12. */
  setResist(rects: DOMRect[]): void;
  setTheme(theme: InkTheme): void;
  /** Fade out what is on the paper (between pages). */
  wash(amount?: number): void;
  destroy(): void;
}

/* ---------------- shaders ---------------- */
const VERT = /* glsl */ `
  uniform vec2 texel;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    vL = vUv - vec2(texel.x, 0.0);
    vR = vUv + vec2(texel.x, 0.0);
    vT = vUv + vec2(0.0, texel.y);
    vB = vUv - vec2(0.0, texel.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const NOISE = /* glsl */ `
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

const SPLAT = /* glsl */ `
  uniform sampler2D uTarget;
  uniform float aspect;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  uniform float ragged;
  uniform float seed;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    vec2 p = vUv - point;
    p.x *= aspect;
    // Ragged rim: the drop's radius wobbles with angle and fine noise, like ink meeting paper fibre.
    // The angle is sampled as a point on a circle, so the noise wraps without a seam at +-pi
    // (atan() would cut a hairline through every drop). The tiny epsilon keeps the centre texel finite.
    vec2 dir = p / (length(p) + 1e-5);
    float wob = 1.0 + ragged * (0.6 * (fbm(dir * 1.7 + seed) - 0.5) + 0.22 * (fbm(p * 38.0 + seed) - 0.5));
    float r = radius * wob * wob;
    vec3 base = texture2D(uTarget, vUv).xyz;
    vec3 add = exp(-dot(p, p) / max(r, 1e-6)) * color;
    gl_FragColor = vec4(max(base + add, vec3(-1e4)), 1.0);
  }
`;

const ADVECT = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 simTexel;
  uniform float dt;
  uniform float dissipation;
  uniform vec2 shift;
  varying vec2 vUv;
  void main() {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * simTexel - shift;
    vec4 result = texture2D(uSource, coord);
    // Paper that scrolled in from off-screen is clean; inside the sheet the edges simply clamp.
    float sy = vUv.y - shift.y;
    float inside = step(0.0, sy) * step(sy, 1.0);
    gl_FragColor = inside * result / (1.0 + dissipation * dt);
  }
`;

const DIFFUSE = /* glsl */ `
  uniform sampler2D uSource;
  uniform float amount;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    vec4 c = texture2D(uSource, vUv);
    vec4 n = (texture2D(uSource, vL) + texture2D(uSource, vR) + texture2D(uSource, vT) + texture2D(uSource, vB)) * 0.25;
    // Capillary bleed: thin ink creeps into the paper faster than a heavy pool.
    gl_FragColor = mix(c, n, amount);
  }
`;

const CURL = /* glsl */ `
  uniform sampler2D uVelocity;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const VORTICITY = /* glsl */ `
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  uniform float time;
  uniform float drift;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  ${NOISE}
  void main() {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    // A slow, breathing current so resting ink keeps its life.
    vec2 q = vUv * 3.0 + time * 0.03;
    float e = 0.01;
    float n1 = fbm(q + vec2(0.0, e)); float n2 = fbm(q - vec2(0.0, e));
    float n3 = fbm(q + vec2(e, 0.0)); float n4 = fbm(q - vec2(e, 0.0));
    vec2 current = vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vel += force * dt + current * drift * dt;
    gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
  }
`;

const DIVERGENCE = /* glsl */ `
  uniform sampler2D uVelocity;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) L = -C.x;
    if (vR.x > 1.0) R = -C.x;
    if (vT.y > 1.0) T = -C.y;
    if (vB.y < 0.0) B = -C.y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

const CLEAR = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float value;
  varying vec2 vUv;
  void main() { gl_FragColor = value * texture2D(uTexture, vUv); }
`;

const PRESSURE = /* glsl */ `
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT = /* glsl */ `
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

const DISPLAY = /* glsl */ `
  uniform sampler2D uDye;
  uniform vec2 dyeTexel;
  uniform vec3 inkColor;
  uniform vec3 accentColor;
  uniform float strength;
  uniform vec2 resolution;
  uniform float paperY;
  uniform float dpr;
  uniform vec4 resist[12];
  uniform int resistCount;
  varying vec2 vUv;
  ${NOISE}
  float boxDist(vec2 p, vec4 r) {
    vec2 c = (r.xy + r.zw) * 0.5;
    vec2 h = (r.zw - r.xy) * 0.5;
    vec2 d = abs(p - c) - h;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  void main() {
    vec4 s = texture2D(uDye, vUv);
    vec2 o = dyeTexel * 1.5;
    float l = dot(texture2D(uDye, vUv - vec2(o.x, 0.0)).rg, vec2(1.0));
    float r = dot(texture2D(uDye, vUv + vec2(o.x, 0.0)).rg, vec2(1.0));
    float t = dot(texture2D(uDye, vUv + vec2(0.0, o.y)).rg, vec2(1.0));
    float b = dot(texture2D(uDye, vUv - vec2(0.0, o.y)).rg, vec2(1.0));
    float total = s.r + s.g;
    float grad = length(vec2(r - l, t - b));

    // Paper tooth, anchored to the page (scrolls with it): pigment settles in the valleys.
    vec2 px = vec2(gl_FragCoord.x, gl_FragCoord.y - paperY * dpr) / dpr;
    float tooth = fbm(px * 0.11) * 0.65 + vnoise(px * 0.9) * 0.35;

    float density = 1.0 - exp(-total * 2.3);
    // Wet edge: where a wash thins out at its rim the pigment pools into a darker line.
    float rim = smoothstep(0.03, 0.14, density) * (1.0 - smoothstep(0.16, 0.5, density));
    float edge = smoothstep(0.04, 0.3, grad) * 0.12;
    float alpha = density * (0.68 + 0.32 * tooth) + rim * 0.2 + edge * density;

    // Resist: ink barely takes on text blocks, with a soft bleed at their edge.
    vec2 css = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / dpr;
    float keep = 1.0;
    for (int i = 0; i < 12; i++) {
      if (i >= resistCount) break;
      float d = boxDist(css, resist[i]);
      keep = min(keep, mix(0.14, 1.0, smoothstep(-6.0, 64.0, d)));
    }
    alpha = clamp(alpha, 0.0, 1.0) * keep * strength;

    float share = total > 0.0001 ? s.g / total : 0.0;
    vec3 col = mix(inkColor, accentColor, smoothstep(0.15, 0.85, share));
    // Thin washes read a touch warmer, like diluted sumi.
    col = mix(col, col * vec3(1.08, 1.0, 0.92), (1.0 - density) * 0.5);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* ---------------- plumbing ---------------- */
type Uniforms = Record<string, IUniform>;

function target(w: number, h: number) {
  return new WebGLRenderTarget(w, h, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}
class Double {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;
  constructor(w: number, h: number) {
    this.read = target(w, h);
    this.write = target(w, h);
  }
  swap() {
    [this.read, this.write] = [this.write, this.read];
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

function hex(c: string) {
  const col = new Color(c);
  return col;
}

export function createInkField(canvas: HTMLCanvasElement, theme: InkTheme): InkField | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
  } catch {
    return null;
  }
  const gl = renderer.getContext();
  if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) {
    renderer.dispose();
    return null;
  }
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const coarse = matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  const SIM = coarse ? 112 : 160;
  const DYE = coarse ? 360 : 560;
  const ITER = coarse ? 14 : 20;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new Mesh(geo);
  quad.frustumCulled = false;
  scene.add(quad);

  const mats: ShaderMaterial[] = [];
  const mat = (fragmentShader: string, uniforms: Uniforms, blend = false) => {
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader,
      uniforms: { texel: { value: new Vector2() }, ...uniforms },
      depthTest: false,
      depthWrite: false,
      transparent: blend,
      premultipliedAlpha: true,
    });
    mats.push(m);
    return m;
  };

  const splatM = mat(SPLAT, {
    uTarget: { value: null },
    aspect: { value: 1 },
    color: { value: new Vector3() },
    point: { value: new Vector2() },
    radius: { value: 0.001 },
    ragged: { value: 0 },
    seed: { value: 0 },
  });
  const advectM = mat(ADVECT, {
    uVelocity: { value: null },
    uSource: { value: null },
    simTexel: { value: new Vector2() },
    dt: { value: 0.016 },
    dissipation: { value: 0 },
    shift: { value: new Vector2() },
  });
  const diffuseM = mat(DIFFUSE, { uSource: { value: null }, amount: { value: 0.08 } });
  const curlM = mat(CURL, { uVelocity: { value: null } });
  const vortM = mat(VORTICITY, {
    uVelocity: { value: null },
    uCurl: { value: null },
    curl: { value: 5 },
    dt: { value: 0.016 },
    time: { value: 0 },
    drift: { value: 3 },
  });
  const divM = mat(DIVERGENCE, { uVelocity: { value: null } });
  const clearM = mat(CLEAR, { uTexture: { value: null }, value: { value: 0.8 } });
  const pressM = mat(PRESSURE, { uPressure: { value: null }, uDivergence: { value: null } });
  const gradM = mat(GRADIENT, { uPressure: { value: null }, uVelocity: { value: null } });
  const resistRects = Array.from({ length: 12 }, () => new Vector4(-9999, -9999, -9999, -9999));
  const displayM = mat(
    DISPLAY,
    {
      uDye: { value: null },
      dyeTexel: { value: new Vector2() },
      inkColor: { value: hex(theme.ink) },
      accentColor: { value: hex(theme.accent) },
      strength: { value: theme.strength },
      resolution: { value: new Vector2() },
      paperY: { value: 0 },
      dpr: { value: dpr },
      resist: { value: resistRects },
      resistCount: { value: 0 },
    },
    true,
  );

  let width = 0;
  let height = 0;
  let simW = 0;
  let simH = 0;
  let dyeW = 0;
  let dyeH = 0;
  let velocity: Double | undefined;
  let dye: Double | undefined;
  let pressure: Double | undefined;
  let divergence: WebGLRenderTarget | undefined;
  let curlT: WebGLRenderTarget | undefined;

  function dims(base: number) {
    const aspect = width / Math.max(1, height);
    return aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / Math.max(aspect, 0.01))];
  }
  function allocate() {
    [velocity, dye, pressure].forEach((d) => d?.dispose());
    divergence?.dispose();
    curlT?.dispose();
    [simW, simH] = dims(SIM);
    [dyeW, dyeH] = dims(DYE);
    velocity = new Double(simW, simH);
    pressure = new Double(simW, simH);
    dye = new Double(dyeW, dyeH);
    divergence = target(simW, simH);
    curlT = target(simW, simH);
    for (const t of [
      velocity.read,
      velocity.write,
      pressure.read,
      pressure.write,
      dye.read,
      dye.write,
      divergence,
      curlT,
    ]) {
      renderer.setRenderTarget(t);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
  }
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    // Phones resize the viewport while the URL bar slides; only rebuild on real changes.
    const big = Math.abs(w - width) > 2 || Math.abs(h - height) > height * 0.25;
    width = w;
    height = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    displayM.uniforms.resolution.value.set(w * dpr, h * dpr);
    if (big || !velocity) allocate();
  }

  function pass(m: ShaderMaterial, out: WebGLRenderTarget | null, texelW: number, texelH: number) {
    m.uniforms.texel.value.set(1 / texelW, 1 / texelH);
    quad.material = m;
    renderer.setRenderTarget(out);
    renderer.render(scene, camera);
  }

  /* ---------- splats ---------- */
  function splat(
    field: Double,
    w: number,
    h: number,
    x: number,
    y: number,
    c: [number, number, number],
    radius: number,
    ragged = 0,
  ) {
    const u = splatM.uniforms;
    u.uTarget.value = field.read.texture;
    u.aspect.value = width / height;
    u.point.value.set(x / width, 1 - y / height);
    u.color.value.set(c[0], c[1], c[2]);
    u.radius.value = radius;
    u.ragged.value = ragged;
    u.seed.value = Math.random() * 100;
    pass(splatM, field.write, w, h);
    field.swap();
  }

  let trail = 1;
  let lastInput = performance.now();
  let pendingShift = 0;
  let running = false;
  let raf = 0;
  let last = performance.now();
  let time = Math.random() * 100;
  let paperY = 0;

  function step(dt: number) {
    if (!velocity || !dye || !pressure || !divergence || !curlT) return;
    // Page scrolled down by dy: the paper moved up, so each texel takes the ink from dy below it.
    const shiftY = pendingShift / height;
    pendingShift = 0;

    curlM.uniforms.uVelocity.value = velocity.read.texture;
    pass(curlM, curlT, simW, simH);

    const vu = vortM.uniforms;
    vu.uVelocity.value = velocity.read.texture;
    vu.uCurl.value = curlT.texture;
    vu.dt.value = dt;
    vu.time.value = time;
    pass(vortM, velocity.write, simW, simH);
    velocity.swap();

    divM.uniforms.uVelocity.value = velocity.read.texture;
    pass(divM, divergence, simW, simH);

    clearM.uniforms.uTexture.value = pressure.read.texture;
    pass(clearM, pressure.write, simW, simH);
    pressure.swap();
    pressM.uniforms.uDivergence.value = divergence.texture;
    for (let i = 0; i < ITER; i++) {
      pressM.uniforms.uPressure.value = pressure.read.texture;
      pass(pressM, pressure.write, simW, simH);
      pressure.swap();
    }
    gradM.uniforms.uPressure.value = pressure.read.texture;
    gradM.uniforms.uVelocity.value = velocity.read.texture;
    pass(gradM, velocity.write, simW, simH);
    velocity.swap();

    const au = advectM.uniforms;
    au.simTexel.value.set(1 / simW, 1 / simH);
    au.dt.value = dt;
    au.shift.value.set(0, shiftY);
    au.uVelocity.value = velocity.read.texture;
    au.uSource.value = velocity.read.texture;
    au.dissipation.value = 1.2;
    pass(advectM, velocity.write, simW, simH);
    velocity.swap();

    au.uVelocity.value = velocity.read.texture;
    au.uSource.value = dye.read.texture;
    au.dissipation.value = 0.075;
    pass(advectM, dye.write, dyeW, dyeH);
    dye.swap();

    diffuseM.uniforms.uSource.value = dye.read.texture;
    diffuseM.uniforms.amount.value = 0.1;
    pass(diffuseM, dye.write, dyeW, dyeH);
    dye.swap();
  }

  function render() {
    if (!dye) return;
    const u = displayM.uniforms;
    u.uDye.value = dye.read.texture;
    u.dyeTexel.value.set(1 / dyeW, 1 / dyeH);
    u.paperY.value = paperY;
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, width, height);
    renderer.clear();
    quad.material = displayM;
    displayM.uniforms.texel.value.set(1 / width, 1 / height);
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    time += dt;
    step(dt);
    render();
    // Ink has dried and faded: stop drawing until the next touch of the brush.
    if (now - lastInput > 32000) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    lastInput = performance.now();
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    } else if (performance.now() - lastInput < 32000) {
      wake();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();
  void gl;

  const field: InkField = {
    stir(x, y, dx, dy) {
      if (!velocity || !dye) return;
      const speed = Math.min(Math.hypot(dx, dy), 80);
      if (speed < 0.4) return;
      const f = 9;
      splat(velocity, simW, simH, x, y, [dx * f, -dy * f, 0], 0.0011);
      const ink = 0.014 * Math.min(speed, 40) * trail;
      if (ink < 0.002) {
        wake();
        return;
      }
      splat(dye, dyeW, dyeH, x, y, [ink, 0, 0], 0.00022, 0.4);
      wake();
    },
    bloom(x, y, opts = {}) {
      if (!velocity || !dye) return;
      const size = opts.size ?? 1;
      const accent = opts.accent ?? 0;
      const amount = opts.amount ?? 1;
      const r = 0.0016 * size * size;
      splat(dye, dyeW, dyeH, x, y, [1.7 * amount * (1 - accent), 1.9 * amount * accent, 0], r, 1);
      // A ring of outward pushes: the drop opens like a flower on wet paper.
      const n = 9;
      const reach = 18 * size;
      const push = 110 * size;
      const spin = (Math.random() - 0.5) * 0.9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const ca = Math.cos(a + spin);
        const sa = Math.sin(a + spin);
        splat(
          velocity,
          simW,
          simH,
          x + Math.cos(a) * reach,
          y + Math.sin(a) * reach,
          [ca * push, -sa * push, 0],
          0.0018 * size,
        );
      }
      // The pushes hollow the centre out; a smaller, denser core keeps the drop's heart dark, as on paper.
      splat(dye, dyeW, dyeH, x, y, [0.55 * amount * (1 - accent), 0.6 * amount * accent, 0], r * 0.16, 0.6);
      wake();
    },
    scroll(dy) {
      pendingShift += dy;
      paperY += dy;
      if (running) return;
      // Even at rest the ink has to follow the paper.
      if (performance.now() - lastInput < 32000) wake();
    },
    setResist(rects) {
      const list = rects.slice(0, 12);
      for (let i = 0; i < 12; i++) {
        const r = list[i];
        if (r) resistRects[i]!.set(r.left, r.top, r.right, r.bottom);
        else resistRects[i]!.set(-9999, -9999, -9999, -9999);
      }
      displayM.uniforms.resistCount.value = list.length;
      if (!running) render();
    },
    setTrail(scale) {
      trail = scale;
    },
    setTheme(next) {
      displayM.uniforms.inkColor.value = hex(next.ink);
      displayM.uniforms.accentColor.value = hex(next.accent);
      displayM.uniforms.strength.value = next.strength;
      if (!running) render();
    },
    wash(amount = 0.45) {
      if (!dye) return;
      clearM.uniforms.uTexture.value = dye.read.texture;
      clearM.uniforms.value.value = amount;
      pass(clearM, dye.write, dyeW, dyeH);
      dye.swap();
      clearM.uniforms.value.value = 0.8;
      if (!running) render();
    },
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      [velocity, dye, pressure].forEach((d) => d?.dispose());
      divergence?.dispose();
      curlT?.dispose();
      mats.forEach((m) => m.dispose());
      geo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return field;
}
