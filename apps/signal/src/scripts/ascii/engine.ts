/**
 * The ASCII signal field. One WebGL renderer for the whole session: its canvas moves into each new
 * page's host after a navigation, so shaders compile once. Loaded lazily (three.js is the heavy part)
 * and only when motionAllowed(); the server-rendered <pre> frame stays as the still image otherwise.
 */
import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { FIELD, GLYPHS, VERT } from './shaders';

const RAMP = ' .·:-=+*≡%#@';
const NOISE = '01<>/\\|_[]{}$&?!~^';
const SHAPES = ['torus', 'octa', 'blob', 'knot'] as const;
type Shape = (typeof SHAPES)[number];

export interface FieldOptions {
  shape: Shape | 'morph' | 'none';
  seed: number;
  centerX: number;
  centerY: number;
  scale: number;
  /** Background static density. */
  static: number;
  /** Multiplies the final alpha; bands under text run quieter. */
  alpha: number;
}

interface Palette {
  dim: Vector3;
  main: Vector3;
  hot: Vector3;
  rim: Vector3;
  glow: number;
  scan: number;
}

function cssColor(name: string, el: Element): Vector3 {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const probe = document.createElement('span');
  probe.style.color = raw;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe)
    .color.match(/[\d.]+/g)
    ?.map(Number) ?? [255, 255, 255];
  probe.remove();
  return new Vector3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

function readPalette(): Palette {
  const root = document.documentElement;
  return {
    dim: cssColor('--field-dim', root),
    main: cssColor('--field-main', root),
    hot: cssColor('--field-hot', root),
    rim: cssColor('--field-rim', root),
    glow: parseFloat(getComputedStyle(root).getPropertyValue('--field-glow')) || 0,
    scan: parseFloat(getComputedStyle(root).getPropertyValue('--field-scan')) || 0,
  };
}

function weightsFor(shape: FieldOptions['shape']): Vector4 {
  const w = new Vector4(0, 0, 0, 0);
  if (shape === 'morph' || shape === 'none') return w.set(1, 0, 0, 0);
  w.setComponent(SHAPES.indexOf(shape), 1);
  return w;
}

async function buildAtlas(): Promise<{ texture: CanvasTexture; glyphs: number }> {
  const family = '"JetBrains Mono Variable", "JetBrains Mono", monospace';
  try {
    await document.fonts.load(`700 48px ${family}`, RAMP + NOISE);
  } catch {
    /* fall back to whatever monospace is there */
  }
  const chars = RAMP + NOISE;
  const h = 64;
  const w = 40;
  const canvas = document.createElement('canvas');
  canvas.width = w * chars.length;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(h * 0.78)}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...chars].forEach((ch, i) => ctx.fillText(ch, i * w + w / 2, h * 0.54));
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.flipY = true;
  return { texture, glyphs: chars.length };
}

export class SignalField {
  private renderer: WebGLRenderer;
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private fieldScene = new Scene();
  private glyphScene = new Scene();
  private target: WebGLRenderTarget;
  private fieldMat: ShaderMaterial;
  private glyphMat: ShaderMaterial;
  private host?: HTMLElement;
  private opts!: FieldOptions;
  private resizeObs?: ResizeObserver;
  private visObs?: IntersectionObserver;
  private visible = false;
  private raf = 0;
  private start = performance.now();
  private last = 0;
  private cell = new Vector2(8.4, 14);
  private pointer = { x: -999, y: -999, amt: 0, target: 0, wx: 0, wy: 0 };
  private morphClock = 0;
  private glitchAt = 3;
  private frames = 0;
  private statsAt = 0;
  /** Called twice a second with what the field is doing, for the on-screen readout. */
  onStats?: (s: { cols: number; rows: number; shape: string; fps: number; t: number }) => void;
  /** Extra scroll-driven inputs, written by the page choreography. */
  readonly scroll = { spin: 0, loss: 0, lift: 0 };
  canvas: HTMLCanvasElement;

  private constructor(atlas: { texture: CanvasTexture; glyphs: number }) {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'field-canvas';
    this.target = new WebGLRenderTarget(16, 16, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    });
    const quad = new PlaneGeometry(2, 2);
    this.fieldMat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FIELD,
      uniforms: {
        uGrid: { value: new Vector2(16, 16) },
        uCellAspect: { value: 14 / 8.4 },
        uTime: { value: 0 },
        uMorph: { value: new Vector4(1, 0, 0, 0) },
        uRot: { value: new Vector2(0, 0.6) },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 0.5 },
        uScale: { value: 0.8 },
        uPointer: { value: new Vector3(0, 0, 0) },
        uWobble: { value: 0 },
      },
    });
    this.glyphMat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: GLYPHS,
      transparent: true,
      uniforms: {
        uField: { value: this.target.texture },
        uAtlas: { value: atlas.texture },
        uGrid: { value: new Vector2(16, 16) },
        uRamp: { value: RAMP.length },
        uNoiseGlyphs: { value: atlas.glyphs - RAMP.length },
        uTime: { value: 0 },
        uDecode: { value: 0 },
        uStatic: { value: 0.02 },
        uLoss: { value: 0 },
        uPointer: { value: new Vector3(-99, -99, 0) },
        uCellAspect: { value: 14 / 8.4 },
        uDim: { value: new Vector3() },
        uMain: { value: new Vector3() },
        uHot: { value: new Vector3() },
        uRim: { value: new Vector3() },
        uGlitch: { value: 0 },
        uGlitchY: { value: 0 },
        uGlow: { value: 0.1 },
        uScan: { value: 0.1 },
        uAlpha: { value: 1 },
      },
    });
    this.fieldScene.add(new Mesh(quad, this.fieldMat));
    this.glyphScene.add(new Mesh(quad, this.glyphMat));
    this.target.texture.magFilter = LinearFilter;
    atlas.texture.magFilter = LinearFilter;
    this.applyPalette();
  }

  static async create(): Promise<SignalField> {
    const atlas = await buildAtlas();
    return new SignalField(atlas);
  }

  applyPalette() {
    const p = readPalette();
    const u = this.glyphMat.uniforms;
    u.uDim.value.copy(p.dim);
    u.uMain.value.copy(p.main);
    u.uHot.value.copy(p.hot);
    u.uRim.value.copy(p.rim);
    u.uGlow.value = p.glow;
    u.uScan.value = p.scan;
  }

  mount(host: HTMLElement, opts: FieldOptions) {
    this.unmount();
    this.host = host;
    this.opts = opts;
    this.scroll.spin = 0;
    this.scroll.loss = 0;
    this.scroll.lift = 0;
    const fu = this.fieldMat.uniforms;
    fu.uMorph.value.copy(weightsFor(opts.shape));
    fu.uCenterX.value = opts.centerX;
    fu.uCenterY.value = opts.centerY;
    fu.uScale.value = opts.scale;
    fu.uRot.value.set((opts.seed % 628) / 100, 0.55 + ((opts.seed >> 4) % 60) / 100);
    const gu = this.glyphMat.uniforms;
    gu.uDecode.value = 0;
    gu.uStatic.value = opts.static;
    gu.uAlpha.value = opts.alpha;
    gu.uLoss.value = opts.shape === 'none' ? 1 : 0;
    if (opts.shape === 'none') fu.uScale.value = 0.0001;
    this.applyPalette();
    host.appendChild(this.canvas);
    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.visObs = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.loop();
    });
    this.visObs.observe(host);
    host.addEventListener('pointermove', this.onPointer, { passive: true });
    host.addEventListener('pointerdown', this.onPointer, { passive: true });
    host.addEventListener('pointerleave', this.onLeave, { passive: true });
    host.addEventListener('touchmove', this.onTouch, { passive: true });
    host.addEventListener('touchend', this.onLeave, { passive: true });
    this.start = performance.now();
    this.statsAt = this.start;
    this.frames = 0;
    this.glitchAt = 2.5 + Math.random() * 3;
    gu.uGlitchY.value = Math.floor(Math.random() * 40);
    gu.uGlitch.value = 0;
    requestAnimationFrame(() => host.classList.add('is-live'));
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObs?.disconnect();
    this.visObs?.disconnect();
    const host = this.host;
    if (host) {
      host.classList.remove('is-live');
      host.removeEventListener('pointermove', this.onPointer);
      host.removeEventListener('pointerdown', this.onPointer);
      host.removeEventListener('pointerleave', this.onLeave);
      host.removeEventListener('touchmove', this.onTouch);
      host.removeEventListener('touchend', this.onLeave);
    }
    this.canvas.remove();
    this.host = undefined;
    this.visible = false;
  }

  dispose() {
    this.unmount();
    this.renderer.dispose();
    this.target.dispose();
    this.fieldMat.dispose();
    this.glyphMat.dispose();
  }

  private onPointer = (e: PointerEvent) => this.setPointer(e.clientX, e.clientY);
  private onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) this.setPointer(t.clientX, t.clientY);
  };
  private onLeave = () => {
    this.pointer.target = 0;
  };

  private setPointer(cx: number, cy: number) {
    if (!this.host) return;
    const r = this.host.getBoundingClientRect();
    const x = cx - r.left;
    const y = cy - r.top;
    this.pointer.x = x / this.cell.x;
    this.pointer.y = (r.height - y) / this.cell.y;
    const grid = this.glyphMat.uniforms.uGrid.value as Vector2;
    const aspect = grid.x / (grid.y * (this.cell.y / this.cell.x));
    const fu = this.fieldMat.uniforms;
    this.pointer.wx = ((x / r.width - fu.uCenterX.value) * 2 * aspect) / fu.uScale.value;
    this.pointer.wy = ((1 - y / r.height - fu.uCenterY.value) * 2) / fu.uScale.value;
    this.pointer.target = 1;
  }

  private resize() {
    if (!this.host) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    const small = w < 640;
    const ch = small ? 12 : 14;
    this.cell.set(ch * 0.6, ch);
    const cols = Math.ceil(w / this.cell.x);
    const rows = Math.ceil(h / this.cell.y);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    // Canvas covers whole cells; CSS crops the remainder so glyphs never stretch.
    this.renderer.setSize(cols * this.cell.x, rows * this.cell.y, true);
    this.target.setSize(cols, rows);
    for (const m of [this.fieldMat, this.glyphMat]) {
      m.uniforms.uGrid.value.set(cols, rows);
      m.uniforms.uCellAspect.value = this.cell.y / this.cell.x;
    }
    this.render(performance.now());
  }

  /** Play the decode dissolve from noise to picture. */
  decode(duration = 1.4) {
    const u = this.glyphMat.uniforms.uDecode;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (duration * 1000));
      u.value = 1 - Math.pow(1 - k, 3);
      if (k < 1 && this.host) requestAnimationFrame(step);
    };
    u.value = 0;
    requestAnimationFrame(step);
  }

  private loop = () => {
    cancelAnimationFrame(this.raf);
    const frame = (now: number) => {
      if (!this.visible || !this.host || document.hidden) {
        this.raf = 0;
        return;
      }
      // 40 fps is plenty for glyphs and halves the work on phones.
      if (now - this.last >= 24) {
        this.render(now);
        this.last = now;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  };

  private render(now: number) {
    if (!this.host) return;
    const t = Math.max(0, (now - this.start) / 1000);
    const p = this.pointer;
    p.amt += (p.target - p.amt) * 0.08;
    if (p.target === 0 && p.amt < 0.01) p.amt = 0;
    const fu = this.fieldMat.uniforms;
    const gu = this.glyphMat.uniforms;
    fu.uTime.value = t;
    gu.uTime.value = t;
    const seedRot = (this.opts.seed % 628) / 100;
    fu.uRot.value.x = seedRot + t * 0.18 + this.scroll.spin;
    fu.uRot.value.y = 0.55 + Math.sin(t * 0.21) * 0.25 + ((this.opts.seed >> 4) % 60) / 100 - 0.3;
    fu.uWobble.value = p.amt;
    fu.uCenterY.value = this.opts.centerY + this.scroll.lift;
    fu.uPointer.value.set(p.wx, p.wy, p.amt * 0.9);
    gu.uPointer.value.set(p.x, p.y, p.amt);
    gu.uLoss.value = this.opts.shape === 'none' ? 1 : Math.min(1, this.scroll.loss);
    let shapeName: string = this.opts.shape;
    if (this.opts.shape === 'morph') {
      // Slow cycle torus -> knot -> blob -> octa, with long holds and smooth crossfades.
      const order = [0, 3, 2, 1];
      this.morphClock = t * 0.085;
      const step = Math.floor(this.morphClock);
      const a = order[step % 4];
      const b = order[(step + 1) % 4];
      const k = this.morphClock % 1;
      const blend = k < 0.72 ? 0 : (k - 0.72) / 0.28;
      const e = blend * blend * (3 - 2 * blend);
      const w = fu.uMorph.value as Vector4;
      w.set(0, 0, 0, 0);
      w.setComponent(a, 1 - e);
      w.setComponent(b, w.getComponent(b) + e);
      shapeName = e > 0.02 ? `${SHAPES[a]} → ${SHAPES[b]}` : SHAPES[a];
    }
    // Tracking errors: a brief sideways slip of a few rows every few seconds.
    if (t > this.glitchAt) {
      const age = t - this.glitchAt;
      gu.uGlitch.value = age < 0.22 ? 1 - age / 0.22 : 0;
      if (age >= 0.22) {
        this.glitchAt = t + 4 + Math.random() * 6;
        gu.uGlitchY.value = Math.floor(Math.random() * this.target.height);
      }
    }
    this.frames++;
    if (now - this.statsAt > 500) {
      const fps = (this.frames * 1000) / (now - this.statsAt);
      this.frames = 0;
      this.statsAt = now;
      this.onStats?.({ cols: this.target.width, rows: this.target.height, shape: shapeName, fps, t });
    }
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.fieldScene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.glyphScene, this.camera);
  }
}
