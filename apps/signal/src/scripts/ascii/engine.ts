/**
 * The ASCII signal field. One WebGL context for the whole session: its canvas moves into each new
 * page's host after a navigation, so shaders compile once. The field is two fullscreen passes, so it
 * talks to WebGL directly (a few KB) instead of shipping a scene-graph library. Loaded lazily and only
 * when motionAllowed(); the server-rendered <pre> frame stays as the still image otherwise.
 */
import { FIELD, GLYPHS, VERT } from './shaders';

const RAMP = ' .·:-=+*≡%#@';
const NOISE = '01<>/\\|_[]{}$&?!~^';
const SHAPES = ['torus', 'octa', 'blob', 'knot'] as const;
type Shape = (typeof SHAPES)[number];
type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

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
  dim: Vec3;
  main: Vec3;
  hot: Vec3;
  rim: Vec3;
  glow: number;
  scan: number;
}

function cssColor(name: string, el: Element): Vec3 {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const probe = document.createElement('span');
  probe.style.color = raw;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe)
    .color.match(/[\d.]+/g)
    ?.map(Number) ?? [255, 255, 255];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

function readPalette(): Palette {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  return {
    dim: cssColor('--field-dim', root),
    main: cssColor('--field-main', root),
    hot: cssColor('--field-hot', root),
    rim: cssColor('--field-rim', root),
    glow: parseFloat(cs.getPropertyValue('--field-glow')) || 0,
    scan: parseFloat(cs.getPropertyValue('--field-scan')) || 0,
  };
}

function weightsFor(shape: FieldOptions['shape']): Vec4 {
  const w: Vec4 = [0, 0, 0, 0];
  if (shape === 'morph' || shape === 'none') return [1, 0, 0, 0];
  w[SHAPES.indexOf(shape)] = 1;
  return w;
}

async function buildAtlas(): Promise<{ canvas: HTMLCanvasElement; glyphs: number }> {
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
  return { canvas, glyphs: chars.length };
}

/** A linked program plus its uniform locations, looked up once. */
class Program {
  readonly program: WebGLProgram;
  private locs = new Map<string, WebGLUniformLocation | null>();
  constructor(
    private gl: WebGLRenderingContext,
    vert: string,
    frag: string,
  ) {
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost())
        throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
      return sh;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'position');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost())
      throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    this.program = p;
  }
  private loc(name: string) {
    if (!this.locs.has(name)) this.locs.set(name, this.gl.getUniformLocation(this.program, name));
    return this.locs.get(name)!;
  }
  f(name: string, ...v: number[]) {
    const l = this.loc(name);
    if (!l) return;
    const gl = this.gl;
    if (v.length === 1) gl.uniform1f(l, v[0]);
    else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
    else gl.uniform4f(l, v[0], v[1], v[2], v[3]);
  }
  i(name: string, v: number) {
    const l = this.loc(name);
    if (l) this.gl.uniform1i(l, v);
  }
}

/** Every texture is sampled linearly with no mipmaps: mip selection at cell edges drew vertical seams. */
function makeTexture(gl: WebGLRenderingContext) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export class SignalField {
  private gl: WebGLRenderingContext;
  private fieldProg: Program;
  private glyphProg: Program;
  private quad: WebGLBuffer;
  private atlasTex: WebGLTexture;
  private fieldTex: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private glyphCount: number;
  private host?: HTMLElement;
  private opts!: FieldOptions;
  private palette!: Palette;
  private resizeObs?: ResizeObserver;
  private visObs?: IntersectionObserver;
  private visible = false;
  private lost = false;
  private raf = 0;
  private start = performance.now();
  private last = 0;
  private cell = { x: 8.4, y: 14 };
  private grid = { cols: 16, rows: 16 };
  private size = { w: 16, h: 16 };
  private pointer = { x: -999, y: -999, amt: 0, target: 0, wx: 0, wy: 0 };
  private morph: Vec4 = [1, 0, 0, 0];
  private decodeAmt = 0;
  private glitch = 0;
  private glitchY = 0;
  private glitchAt = 3;
  private frames = 0;
  private statsAt = 0;
  /** Called twice a second with what the field is doing, for the on-screen readout. */
  onStats?: (s: { cols: number; rows: number; shape: string; fps: number; t: number }) => void;
  /** Extra scroll-driven inputs, written by the page choreography. */
  readonly scroll = { spin: 0, loss: 0, lift: 0 };
  canvas: HTMLCanvasElement;

  private constructor(atlas: { canvas: HTMLCanvasElement; glyphs: number }) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) throw new Error('no webgl');
    this.gl = gl;
    this.canvas = canvas;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'field-canvas';
    canvas.addEventListener('webglcontextlost', (e) => {
      // Give up quietly: the still frame underneath takes over.
      e.preventDefault();
      this.lost = true;
      this.host?.classList.remove('is-live');
      cancelAnimationFrame(this.raf);
    });

    this.fieldProg = new Program(gl, VERT, FIELD);
    this.glyphProg = new Program(gl, VERT, GLYPHS);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.glyphCount = atlas.glyphs;
    this.atlasTex = makeTexture(gl);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // One texel per character cell: R light, G hit, B rim, A specular.
    this.fieldTex = makeTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fieldTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    this.applyPalette();
  }

  static async create(): Promise<SignalField> {
    const atlas = await buildAtlas();
    return new SignalField(atlas);
  }

  applyPalette() {
    this.palette = readPalette();
  }

  mount(host: HTMLElement, opts: FieldOptions) {
    this.unmount();
    if (this.lost) return;
    this.host = host;
    this.opts = opts;
    this.scroll.spin = 0;
    this.scroll.loss = 0;
    this.scroll.lift = 0;
    this.morph = weightsFor(opts.shape);
    this.decodeAmt = 0;
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
    this.glitchY = Math.floor(Math.random() * 40);
    this.glitch = 0;
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
    const gl = this.gl;
    gl.deleteTexture(this.atlasTex);
    gl.deleteTexture(this.fieldTex);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteBuffer(this.quad);
    gl.deleteProgram(this.fieldProg.program);
    gl.deleteProgram(this.glyphProg.program);
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
    const aspect = this.grid.cols / (this.grid.rows * (this.cell.y / this.cell.x));
    const scale = this.opts.shape === 'none' ? 0.0001 : this.opts.scale;
    this.pointer.wx = ((x / r.width - this.opts.centerX) * 2 * aspect) / scale;
    this.pointer.wy = ((1 - y / r.height - this.opts.centerY) * 2) / scale;
    this.pointer.target = 1;
  }

  private resize() {
    if (!this.host || this.lost) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    const ch = w < 640 ? 12 : 14;
    this.cell = { x: ch * 0.6, y: ch };
    const cols = Math.ceil(w / this.cell.x);
    const rows = Math.ceil(h / this.cell.y);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Canvas covers whole cells; CSS crops the remainder so glyphs never stretch.
    const cssW = cols * this.cell.x;
    const cssH = rows * this.cell.y;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.size = { w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) };
    this.canvas.width = this.size.w;
    this.canvas.height = this.size.h;
    if (cols !== this.grid.cols || rows !== this.grid.rows) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.grid = { cols, rows };
    }
    this.render(performance.now());
  }

  /** Play the decode dissolve from noise to picture. */
  decode(duration = 1.4) {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (duration * 1000));
      this.decodeAmt = 1 - Math.pow(1 - k, 3);
      if (k < 1 && this.host) requestAnimationFrame(step);
    };
    this.decodeAmt = 0;
    requestAnimationFrame(step);
  }

  private loop = () => {
    cancelAnimationFrame(this.raf);
    const frame = (now: number) => {
      if (!this.visible || !this.host || document.hidden || this.lost) {
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

  private draw(prog: Program) {
    const gl = this.gl;
    gl.useProgram(prog.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private render(now: number) {
    if (!this.host || this.lost) return;
    const gl = this.gl;
    const o = this.opts;
    const t = Math.max(0, (now - this.start) / 1000);
    const p = this.pointer;
    p.amt += (p.target - p.amt) * 0.08;
    if (p.target === 0 && p.amt < 0.01) p.amt = 0;
    const { cols, rows } = this.grid;
    const cellAspect = this.cell.y / this.cell.x;

    let shapeName: string = o.shape;
    if (o.shape === 'morph') {
      // Slow cycle torus -> knot -> blob -> octa, with long holds and smooth crossfades.
      const order = [0, 3, 2, 1];
      const clock = t * 0.085;
      const step = Math.floor(clock);
      const a = order[step % 4];
      const b = order[(step + 1) % 4];
      const k = clock % 1;
      const blend = k < 0.72 ? 0 : (k - 0.72) / 0.28;
      const e = blend * blend * (3 - 2 * blend);
      this.morph = [0, 0, 0, 0];
      this.morph[a] = 1 - e;
      this.morph[b] += e;
      shapeName = e > 0.02 ? `${SHAPES[a]} → ${SHAPES[b]}` : SHAPES[a];
    }
    // Tracking errors: a brief sideways slip of a few rows every few seconds.
    if (t > this.glitchAt) {
      const age = t - this.glitchAt;
      this.glitch = age < 0.22 ? 1 - age / 0.22 : 0;
      if (age >= 0.22) {
        this.glitchAt = t + 4 + Math.random() * 6;
        this.glitchY = Math.floor(Math.random() * rows);
      }
    }
    this.frames++;
    if (now - this.statsAt > 500) {
      const fps = (this.frames * 1000) / (now - this.statsAt);
      this.frames = 0;
      this.statsAt = now;
      this.onStats?.({ cols, rows, shape: shapeName, fps, t });
    }

    // Pass 1: the shape, one texel per cell.
    const fp = this.fieldProg;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, cols, rows);
    gl.useProgram(fp.program);
    fp.f('uGrid', cols, rows);
    fp.f('uCellAspect', cellAspect);
    fp.f('uTime', t);
    fp.f('uMorph', ...this.morph);
    // Keep the shape tilted towards the viewer so rings never read edge-on.
    fp.f(
      'uRot',
      (o.seed % 628) / 100 + t * 0.18 + this.scroll.spin,
      0.75 + Math.sin(t * 0.21) * 0.2 + ((o.seed >> 4) % 60) / 200,
    );
    fp.f('uCenterX', o.centerX);
    fp.f('uCenterY', o.centerY + this.scroll.lift);
    fp.f('uScale', o.shape === 'none' ? 0.0001 : o.scale);
    fp.f('uPointer', p.wx, p.wy, p.amt * 0.9);
    fp.f('uWobble', p.amt);
    this.draw(fp);

    // Pass 2: glyphs on the visible canvas.
    const gp = this.glyphProg;
    const pal = this.palette;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.size.w, this.size.h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(gp.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gp.i('uField', 0);
    gp.i('uAtlas', 1);
    gp.f('uGrid', cols, rows);
    gp.f('uRamp', RAMP.length);
    gp.f('uNoiseGlyphs', this.glyphCount - RAMP.length);
    gp.f('uTime', t);
    gp.f('uDecode', this.decodeAmt);
    gp.f('uStatic', o.static);
    gp.f('uLoss', o.shape === 'none' ? 1 : Math.min(1, this.scroll.loss));
    gp.f('uPointer', p.x, p.y, p.amt);
    gp.f('uCellAspect', cellAspect);
    gp.f('uDim', ...pal.dim);
    gp.f('uMain', ...pal.main);
    gp.f('uHot', ...pal.hot);
    gp.f('uRim', ...pal.rim);
    gp.f('uGlitch', this.glitch);
    gp.f('uGlitchY', this.glitchY);
    gp.f('uGlow', pal.glow);
    gp.f('uScan', pal.scan);
    gp.f('uAlpha', o.alpha);
    this.draw(gp);
    gl.activeTexture(gl.TEXTURE0);
  }
}
