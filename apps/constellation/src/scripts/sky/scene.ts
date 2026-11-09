/**
 * The night sky in WebGL. Two layers on one persistent, fixed canvas:
 *  1. dust: a deep field of faint stars (and a tilted milky-way band) the camera drifts through;
 *     scrolling the page moves the camera forward, the pointer tilts it.
 *  2. stars: the real posts, drawn in screen pixels exactly on top of the `.star-dot` elements
 *     of every visible `[data-stage]`, so the HTML labels, SVG lines and the glow always agree.
 * Loaded lazily and only when motion is allowed; `dispose()` tears everything down.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

export interface SkyScene {
  attach(): void;
  fly(slug: string): void;
  land(slug: string): void;
  setTheme(): void;
  dispose(): void;
}

const MAX_STARS = 160;
const KIND: Record<string, number> = { article: 0, note: 1, link: 2 };

const dustVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aTint;
  uniform float uTime;
  uniform float uTravel;
  uniform float uDepth;
  uniform float uDpr;
  uniform float uWarp;
  varying float vA;
  varying float vTint;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTravel, uDepth) - uDepth;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = clamp(aSize * uDpr * (760.0 / dist) * (1.0 + uWarp * 2.5), 1.25 * uDpr, 56.0);
    float fadeNear = smoothstep(20.0, 220.0, dist);
    float fadeFar = 1.0 - smoothstep(uDepth * 0.62, uDepth, dist);
    float tw = 0.62 + 0.38 * sin(uTime * (0.5 + aPhase * 1.9) + aPhase * 37.0);
    vA = fadeNear * fadeFar * tw;
    vTint = aTint;
  }
`;
const dustFragment = /* glsl */ `
  uniform float uLight;
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform vec3 uInk;
  varying float vA;
  varying float vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 1.8) * vA * 1.15;
    vec3 col = mix(uCool, uWarm, vTint);
    if (uLight > 0.5) { col = uInk; a *= 0.42; }
    gl_FragColor = vec4(col, a);
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aKind;
  attribute float aAlpha;
  attribute float aPhase;
  uniform float uTime;
  uniform float uDpr;
  varying vec3 vColor;
  varying float vKind;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vKind = aKind;
    float tw = 0.9 + 0.1 * sin(uTime * (1.1 + aPhase) + aPhase * 19.0);
    vAlpha = aAlpha * tw;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uDpr;
  }
`;
const starFragment = /* glsl */ `
  uniform float uLight;
  varying vec3 vColor;
  varying float vKind;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = smoothstep(0.17, 0.07, d);
    float halo = exp(-d * d * 16.0) * 0.62 + exp(-d * 4.6) * 0.26;
    float spikes = 0.0;
    float ring = 0.0;
    if (vKind < 0.5) {
      spikes = (exp(-abs(p.x) * 70.0) * exp(-abs(p.y) * 3.4) + exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 3.4)) * 0.85;
      spikes *= smoothstep(1.0, 0.2, d);
    } else if (vKind > 1.5) {
      ring = exp(-pow((d - 0.17) * 30.0, 2.0));
      core *= 0.0;
      halo *= 0.55;
    }
    float a;
    vec3 col;
    if (uLight > 0.5) {
      // printed atlas: crisp ink, no glow
      float inkCore = smoothstep(0.075, 0.055, d);
      float inkRing = vKind > 1.5 ? smoothstep(0.035, 0.0, abs(d - 0.15)) : 0.0;
      float inkSpikes = vKind < 0.5 ? (smoothstep(0.012, 0.0, abs(p.x)) * smoothstep(0.62, 0.1, abs(p.y)) + smoothstep(0.012, 0.0, abs(p.y)) * smoothstep(0.62, 0.1, abs(p.x))) : 0.0;
      if (vKind > 1.5) inkCore = 0.0;
      a = clamp(inkCore + inkRing + inkSpikes * 0.8 + halo * 0.06, 0.0, 1.0) * vAlpha;
      col = vColor;
    } else {
      a = clamp(core + halo + spikes + ring, 0.0, 1.0) * vAlpha;
      col = mix(vColor, vec3(1.0, 0.98, 0.94), core * 0.7);
    }
    gl_FragColor = vec4(col, a);
  }
`;

function cssColor(name: string, fallback: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  try {
    return new Color(value || fallback);
  } catch {
    return new Color(fallback);
  }
}

interface Tracked {
  alpha: number;
  boost: number;
  born: number;
  /** Dot centre relative to its stage's top-left, cached between layout changes. */
  ox: number;
  oy: number;
  stamp: number;
}

export function createScene(canvas: HTMLCanvasElement): SkyScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|software/i.test(gpu);
  const dpr = software ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  /* ---------- dust ---------- */
  const DEPTH = 1900;
  const dustCount = software ? 1400 : window.innerWidth < 760 ? 1800 : 2800;
  const dustScene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 1, DEPTH + 200);
  const dustGeo = new BufferGeometry();
  {
    const pos = new Float32Array(dustCount * 3);
    const size = new Float32Array(dustCount);
    const phase = new Float32Array(dustCount);
    const tint = new Float32Array(dustCount);
    const tilt = Math.tan((-17 * Math.PI) / 180);
    let seed = 20261109;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
    for (let i = 0; i < dustCount; i++) {
      const band = i % 5 < 2;
      const x = (rnd() - 0.5) * 3600;
      const y = band ? x * tilt + 120 + gauss() * 260 : (rnd() - 0.5) * 2300;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = -rnd() * DEPTH;
      const bright = rnd();
      size[i] = bright > 0.985 ? 3.4 : bright > 0.92 ? 2.2 : 1.1 + rnd() * 0.8;
      phase[i] = rnd();
      tint[i] = rnd() > 0.82 ? 1 : rnd() * 0.25;
    }
    dustGeo.setAttribute('position', new BufferAttribute(pos, 3));
    dustGeo.setAttribute('aSize', new BufferAttribute(size, 1));
    dustGeo.setAttribute('aPhase', new BufferAttribute(phase, 1));
    dustGeo.setAttribute('aTint', new BufferAttribute(tint, 1));
  }
  const dustMat = new ShaderMaterial({
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uDepth: { value: DEPTH },
      uDpr: { value: dpr },
      uWarp: { value: 0 },
      uLight: { value: 0 },
      uCool: { value: new Color('#c9d2ea') },
      uWarm: { value: new Color('#f3d29a') },
      uInk: { value: new Color('#22251e') },
    },
  });
  dustScene.add(new Points(dustGeo, dustMat));

  /* ---------- post stars (screen pixels) ---------- */
  const starScene = new Scene();
  const ortho = new OrthographicCamera(0, 1, 0, -1, -10, 10);
  const starGeo = new BufferGeometry();
  const sPos = new Float32Array(MAX_STARS * 3);
  const sSize = new Float32Array(MAX_STARS);
  const sColor = new Float32Array(MAX_STARS * 3);
  const sKind = new Float32Array(MAX_STARS);
  const sAlpha = new Float32Array(MAX_STARS);
  const sPhase = new Float32Array(MAX_STARS);
  starGeo.setAttribute('position', new BufferAttribute(sPos, 3));
  starGeo.setAttribute('aSize', new BufferAttribute(sSize, 1));
  starGeo.setAttribute('aColor', new BufferAttribute(sColor, 3));
  starGeo.setAttribute('aKind', new BufferAttribute(sKind, 1));
  starGeo.setAttribute('aAlpha', new BufferAttribute(sAlpha, 1));
  starGeo.setAttribute('aPhase', new BufferAttribute(sPhase, 1));
  const starMat = new ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { uTime: { value: 0 }, uDpr: { value: dpr }, uLight: { value: 0 } },
  });
  const starPoints = new Points(starGeo, starMat);
  starPoints.frustumCulled = false;
  starScene.add(starPoints);

  /* ---------- a rare meteor (delight, never on a calm reading view) ---------- */
  const meteorMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { uColor: { value: new Color('#fff3d6') }, uFade: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        float tail = pow(vUv.x, 3.0);
        float core = 1.0 - abs(vUv.y - 0.5) * 2.0;
        gl_FragColor = vec4(uColor, tail * core * uFade);
      }
    `,
  });
  const meteor = new Mesh(new PlaneGeometry(1, 1), meteorMat);
  meteor.visible = false;
  meteor.frustumCulled = false;
  starScene.add(meteor);
  let meteorAt = performance.now() + 4000 + Math.random() * 5000;
  let meteorRun: { t0: number; x: number; y: number; dx: number; dy: number; len: number } | null = null;

  let palette: Record<string, Color> = {};
  function setTheme() {
    const light = document.documentElement.dataset.theme !== 'dark';
    palette = {
      article: cssColor('--c-article', light ? '#8a2b2b' : '#e9b86a'),
      note: cssColor('--c-note', light ? '#22251e' : '#e8e4da'),
      link: cssColor('--c-link', light ? '#2f4a7a' : '#e59a8b'),
    };
    dustMat.uniforms.uLight.value = light ? 1 : 0;
    starMat.uniforms.uLight.value = light ? 1 : 0;
    dustMat.uniforms.uInk.value = cssColor('--ink', '#22251e');
    const blending = light ? NormalBlending : AdditiveBlending;
    dustMat.blending = blending;
    starMat.blending = blending;
    meteorMat.blending = blending;
    meteorMat.uniforms.uColor.value = light ? cssColor('--ink', '#22251e') : new Color('#fff3d6');
    dustMat.needsUpdate = true;
    starMat.needsUpdate = true;
    meteorMat.needsUpdate = true;
  }
  setTheme();

  /* ---------- page wiring ---------- */
  let stages: HTMLElement[] = [];
  const tracked = new WeakMap<Element, Tracked>();
  let attachedAt = performance.now();
  let flight: { slug: string; t0: number } | null = null;
  let landing: { slug: string; t0: number } | null = null;

  // bumps when anything that can move dots inside a stage changes (fonts, resize, new page)
  let epoch = 0;
  const bump = () => (epoch = (epoch + 1) % 1000);
  document.fonts?.addEventListener('loadingdone', bump);
  const epochTimer = window.setInterval(bump, 1500);

  function attach() {
    bump();
    stages = [...document.querySelectorAll<HTMLElement>('[data-stage]')];
    for (const s of stages) s.classList.add('is-live');
    attachedAt = performance.now();
    flight = null;
  }
  attach();

  /* ---------- input ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let width = 0;
  let height = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    ortho.left = 0;
    ortho.right = width;
    ortho.top = 0;
    ortho.bottom = -height;
    ortho.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- loop ---------- */
  let raf = 0;
  let last = performance.now();
  let travel = 0;
  let warp = 0;
  let lastScroll = window.scrollY;
  let scrollVel = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    // camera: forward drift, scroll pushes it through the field, pointer tilts it
    const sy = window.scrollY;
    const dy = sy - lastScroll;
    lastScroll = sy;
    scrollVel += (dy - scrollVel) * 0.12;
    const warpTarget = flight ? Math.min(1, (now - flight.t0) / 700) : 0;
    warp += (warpTarget - warp) * (flight ? 0.08 : 0.04);
    travel += dt * 9 + scrollVel * 0.9 + warp * dt * 2600;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.set(pointer.x * 36, -pointer.y * 24, 0);
    camera.rotation.set(pointer.y * 0.02, pointer.x * 0.03, 0);
    dustMat.uniforms.uTime.value = t;
    dustMat.uniforms.uTravel.value = travel;
    dustMat.uniforms.uWarp.value = warp;
    starMat.uniforms.uTime.value = t;

    // stars follow their DOM dots
    let n = 0;
    for (const stage of stages) {
      if (!stage.isConnected) continue;
      const r = stage.getBoundingClientRect();
      if (r.width === 0 || r.bottom < -80 || r.top > height + 80) continue;
      const hotStage = stage.classList.contains('has-hot');
      const flying = stage.classList.contains('is-flying');
      const fade = parseFloat(stage.style.getPropertyValue('--fade') || '1');
      // Offsets inside a stage only change when its size changes (or while it zooms in a flight),
      // so dot rects are read once per layout instead of once per frame.
      const sizeKey = epoch * 1e8 + Math.round(r.width) * 10000 + Math.round(r.height);
      for (const el of stage.querySelectorAll<HTMLElement>('.star')) {
        if (n >= MAX_STARS) break;
        const dot = el.firstElementChild as HTMLElement | null;
        if (!dot) continue;
        let track = tracked.get(el);
        if (!track || flying || track.stamp !== sizeKey) {
          const d = dot.getBoundingClientRect();
          if (d.width === 0) continue;
          const ox = d.left + d.width / 2 - r.left;
          const oy = d.top + d.height / 2 - r.top;
          if (!track) {
            track = {
              alpha: 0,
              boost: 1,
              born: attachedAt + Number(el.style.getPropertyValue('--i') || 0) * 90,
              ox,
              oy,
              stamp: sizeKey,
            };
            tracked.set(el, track);
          }
          track.ox = ox;
          track.oy = oy;
          track.stamp = flying ? -1 : sizeKey;
        }
        const cx = r.left + track.ox;
        const cy = r.top + track.oy;
        // the stage clips its chart: stars outside its frame are not drawn
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        const edge = Math.min(cx - r.left, r.right - cx, cy - r.top, r.bottom - cy);
        const edgeFade = Math.min(1, edge / 36);
        const slug = el.dataset.slug ?? '';
        const kind = el.dataset.type ?? 'note';
        const mag = Number(el.dataset.mag ?? 0.3);
        const state = el.dataset.state;
        const hot = el.classList.contains('is-hot');
        const near = el.classList.contains('is-near');
        let alpha = (state === 'context' ? 0.5 : 1) * (0.22 + 0.78 * fade);
        if (hotStage && !hot && !near && state !== 'current') alpha = 0.3;
        let boost = hot ? 1.45 : state === 'current' ? 1.5 + Math.sin(t * 2.2) * 0.08 : 1;
        if (flying && flight) {
          const p = Math.min(1, (now - flight.t0) / 850);
          if (slug === flight.slug) boost = 1 + p * p * 16;
          else alpha *= 1 - p;
        }
        if (landing && slug === landing.slug) {
          const p = Math.min(1, (now - landing.t0) / 1300);
          const e = 1 - Math.pow(1 - p, 4);
          boost = 9 - (9 - boost) * e;
          if (p >= 1) landing = null;
        }
        const appear = Math.min(1, Math.max(0, (now - track.born) / 700));
        track.alpha += (alpha * appear - track.alpha) * 0.12;
        track.boost += (boost - track.boost) * (flying ? 0.35 : 0.14);
        const base = (kind === 'article' ? 40 : kind === 'link' ? 36 : 26) + mag * (kind === 'article' ? 92 : 34);
        sPos[n * 3] = cx;
        sPos[n * 3 + 1] = -cy;
        sPos[n * 3 + 2] = 0;
        sSize[n] = base * track.boost;
        const c = palette[kind] ?? palette.note;
        sColor[n * 3] = c.r;
        sColor[n * 3 + 1] = c.g;
        sColor[n * 3 + 2] = c.b;
        sKind[n] = KIND[kind] ?? 1;
        sAlpha[n] = track.alpha * (flying && slug === flight?.slug ? 1 : edgeFade);
        sPhase[n] = (slug.length * 0.137) % 1;
        n++;
      }
    }
    starGeo.setDrawRange(0, n);
    for (const name of ['position', 'aSize', 'aColor', 'aKind', 'aAlpha', 'aPhase']) {
      (starGeo.getAttribute(name) as BufferAttribute).needsUpdate = true;
    }

    // meteor
    const calm = parseFloat(document.documentElement.style.getPropertyValue('--sky-opacity') || '1') < 0.6;
    if (!meteorRun && now > meteorAt && !flight && !calm) {
      const angle = ((18 + Math.random() * 16) * Math.PI) / 180;
      meteorRun = {
        t0: now,
        x: width * (0.35 + Math.random() * 0.6),
        y: height * (0.06 + Math.random() * 0.3),
        dx: -Math.cos(angle),
        dy: Math.sin(angle),
        len: 120 + Math.random() * 120,
      };
    }
    if (meteorRun) {
      const p = (now - meteorRun.t0) / 1100;
      if (p >= 1) {
        meteorRun = null;
        meteor.visible = false;
        meteorAt = now + 9000 + Math.random() * 12000;
      } else {
        const travelPx = 520 * (1 - Math.pow(1 - p, 2));
        const fade = Math.sin(Math.PI * Math.min(1, p * 1.15));
        meteor.visible = true;
        meteor.position.set(meteorRun.x + meteorRun.dx * travelPx, -(meteorRun.y + meteorRun.dy * travelPx), 0);
        meteor.rotation.z = Math.atan2(-meteorRun.dy, meteorRun.dx);
        meteor.scale.set(meteorRun.len * (0.35 + 0.65 * fade), 1.6, 1);
        meteorMat.uniforms.uFade.value = fade * 0.9;
      }
    }

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(dustScene, camera);
    if (n || meteor.visible) renderer.render(starScene, ortho);
  }
  raf = requestAnimationFrame(frame);
  document.documentElement.classList.add('sky-live');

  return {
    attach,
    setTheme,
    fly(slug: string) {
      flight = { slug, t0: performance.now() };
    },
    land(slug: string) {
      landing = { slug, t0: performance.now() };
      warp = 0.6;
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      document.fonts?.removeEventListener('loadingdone', bump);
      window.clearInterval(epochTimer);
      for (const s of stages) s.classList.remove('is-live');
      document.documentElement.classList.remove('sky-live');
      dustGeo.dispose();
      dustMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      meteor.geometry.dispose();
      meteorMat.dispose();
      renderer.clear();
      renderer.dispose();
    },
  };
}
