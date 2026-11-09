/**
 * Build-time ASCII renderer: raymarches the same signed-distance shapes as the WebGL field
 * (src/scripts/ascii/shaders.ts) and prints one frame as text. It is the still frame every page
 * paints first, and the whole picture in reading mode, reduced motion and without JavaScript.
 */

export const RAMP = ' .·:-=+*≡%#@';

export type ShapeName = 'torus' | 'octa' | 'blob' | 'knot';
export const SHAPES: ShapeName[] = ['torus', 'octa', 'blob', 'knot'];

type V3 = [number, number, number];

const len3 = (x: number, y: number, z: number) => Math.hypot(x, y, z);

function rotate(p: V3, a: number, b: number): V3 {
  // Yaw (a) around Y, then pitch (b) around X.
  const [x, y, z] = p;
  const ca = Math.cos(a),
    sa = Math.sin(a);
  const x1 = ca * x + sa * z;
  const z1 = -sa * x + ca * z;
  const cb = Math.cos(b),
    sb = Math.sin(b);
  return [x1, cb * y - sb * z1, sb * y + cb * z1];
}

function sdf(shape: ShapeName, p: V3): number {
  const [x, y, z] = p;
  switch (shape) {
    case 'torus': {
      const q = Math.hypot(x, z) - 0.95;
      return Math.hypot(q, y) - 0.38;
    }
    case 'octa':
      return (Math.abs(x) + Math.abs(y) + Math.abs(z) - 1.25) * 0.57735;
    case 'blob':
      return len3(x, y, z) - 1.0 + 0.11 * Math.sin(4 * x) * Math.sin(4 * y + 1.3) * Math.sin(4 * z + 0.7);
    case 'knot': {
      // Twisted torus: a ring whose cross-section spins as it travels, a cheap knot-like read.
      const ang = Math.atan2(z, x);
      const q = Math.hypot(x, z) - 0.9;
      const c = Math.cos(ang * 1.5),
        s = Math.sin(ang * 1.5);
      const u = c * q - s * y;
      const v = s * q + c * y;
      return Math.max(Math.abs(u) - 0.42, Math.abs(v) - 0.16) * 0.8;
    }
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export interface AsciiOptions {
  cols: number;
  rows: number;
  shape: ShapeName;
  /** Rotation seed: any integer. */
  seed: number;
  /** Shape centre as a fraction of the width (0.5 = centred). */
  centerX?: number;
  /** Shape size relative to the frame height. */
  scale?: number;
  /** Cell height / cell width; JetBrains Mono at line-height 1 is about 1 / 0.6. */
  cellAspect?: number;
  /** Probability of a faint static glyph in empty cells. */
  static?: number;
}

/** One frame of the field as plain text lines. */
export function asciiFrame(o: AsciiOptions): string {
  const cellAspect = o.cellAspect ?? 1 / 0.6;
  const scale = o.scale ?? 0.78;
  const centerX = o.centerX ?? 0.5;
  const staticRate = o.static ?? 0.025;
  const aspect = o.cols / (o.rows * cellAspect);
  const a = (o.seed % 628) / 100;
  const b = 0.75 + ((o.seed >> 4) % 60) / 200;
  const light = (() => {
    const l: V3 = [-0.5, 0.75, 0.6];
    const n = len3(...l);
    return l.map((v) => v / n) as V3;
  })();
  const lines: string[] = [];
  for (let r = 0; r < o.rows; r++) {
    let line = '';
    for (let col = 0; col < o.cols; col++) {
      const sx = (((col + 0.5) / o.cols - centerX) * 2 * aspect) / scale;
      const sy = (-((r + 0.5) / o.rows) * 2 + 1) / scale;
      // Camera on +z looking at the origin.
      const ro: V3 = [0, 0, 3.4];
      const rd0: V3 = [sx * 0.4, sy * 0.4, -1];
      const rl = len3(...rd0);
      const rd = rd0.map((v) => v / rl) as V3;
      let t = 0;
      let hit = false;
      for (let i = 0; i < 64; i++) {
        const p = rotate([ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t], a, b);
        const d = sdf(o.shape, p);
        if (d < 0.002) {
          hit = true;
          break;
        }
        t += d * 0.9;
        if (t > 7) break;
      }
      if (!hit) {
        const h = hash(r * 997 + col * 13 + o.seed);
        line += h < staticRate ? (h < staticRate * 0.8 ? '.' : ':') : ' ';
        continue;
      }
      const pw: V3 = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const e = 0.002;
      const f = (dx: number, dy: number, dz: number) =>
        sdf(o.shape, rotate([pw[0] + dx, pw[1] + dy, pw[2] + dz], a, b));
      const n0: V3 = [f(e, 0, 0) - f(-e, 0, 0), f(0, e, 0) - f(0, -e, 0), f(0, 0, e) - f(0, 0, -e)];
      const nl = len3(...n0) || 1;
      const n = n0.map((v) => v / nl) as V3;
      const diff = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
      const h: V3 = [light[0] - rd[0], light[1] - rd[1], light[2] - rd[2]];
      const hl = len3(...h);
      const spec = Math.pow(Math.max(0, (n[0] * h[0] + n[1] * h[1] + n[2] * h[2]) / hl), 24);
      const rim = Math.pow(1 - Math.max(0, -(n[0] * rd[0] + n[1] * rd[1] + n[2] * rd[2])), 3);
      const lum = Math.min(1, 0.16 + 0.8 * diff + 0.5 * spec + 0.12 * rim);
      line += RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.floor(lum * (RAMP.length - 1) + 0.5)))];
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}

/** Pick a shape for a page from its seed, so each page has its own transmission. */
export function shapeFor(seed: number): ShapeName {
  return SHAPES[seed % SHAPES.length];
}
