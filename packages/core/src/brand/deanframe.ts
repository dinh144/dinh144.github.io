/**
 * dean logo frame: Open Bot Avatar's projected frame + our eye layer, body pose and decor, as SVG.
 *
 * The character is the library's own gallery Cloud (dean.json, unchanged) in the library's default orange.
 * open-bot-avatar (MIT, Dominik Scholz, vendored unmodified) gives the volume, breathing, wander, blinks and eye
 * placement. On top of it: the expression and action catalogue from the surveyed avatar libraries (ideas only,
 * written from scratch, no constants copied). Glasses and an outline exist as options but are off by default.
 */
import { avatarFrame } from './vendor/open-bot-avatar/src/index.ts';
import type { AvatarDefinition, AvatarMotion } from './vendor/open-bot-avatar/src/index.ts';

export const INK = '#1A1A1A';
export const PAPER = '#EDEDED';
export const RED = '#FF4949';
export const WHITE = '#FFFFFF';
/** Open Bot Avatar's own default body colour; the logo uses it unchanged. */
export const ORANGE = '#FF6A1A';

export type DeanTheme = 'light' | 'dark';
type EyeShape = 'pill' | 'round' | 'arcUp' | 'arcDown' | 'slit' | 'chevL' | 'chevR' | 'heart' | 'x' | 'dot' | 'play';
type Decor = 'zz' | 'sparkle' | 'bang' | 'question' | 'heart' | 'sweat' | 'anger' | 'dots' | 'notify' | 'spiral';

interface EyePose {
  shape: EyeShape;
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  rot?: number;
}
interface Expression {
  label: [string, string]; // [vi, en]
  motion: AvatarMotion;
  eyes: [EyePose, EyePose];
  gaze?: { x: number; y: number };
  body?: { roll?: number; lift?: number; sx?: number; sy?: number };
  decor?: Decor[];
  slow?: number; // time scale for the engine (sleepy = slower)
}

const P = (shape: EyeShape, o: Omit<EyePose, 'shape'> = {}): EyePose => ({ shape, ...o });
const both = (e: EyePose): [EyePose, EyePose] => [e, e];

export const EXPRESSIONS = {
  idle: { label: ['bình thường', 'neutral'], motion: 'idle', eyes: both(P('pill')) },
  attentive: {
    label: ['chú ý', 'attentive'],
    motion: 'idle',
    eyes: both(P('pill', { sy: 1.15, sx: 1.1 })),
    body: { lift: -1 },
  },
  curious: {
    label: ['tò mò', 'curious'],
    motion: 'idle',
    eyes: [P('pill', { sy: 1.2, sx: 1.1 }), P('pill', { sy: 0.85 })],
    body: { roll: -7 },
    gaze: { x: 0.5, y: -0.2 },
  },
  skyward: {
    label: ['nhìn lên', 'looking up'],
    motion: 'idle',
    eyes: both(P('pill', { dy: -2 })),
    gaze: { x: 0.1, y: -0.9 },
    body: { roll: 3 },
  },
  sideEye: {
    label: ['liếc', 'side-eye'],
    motion: 'idle',
    eyes: both(P('pill', { sy: 0.55, dx: 2.2 })),
    gaze: { x: 0.9, y: 0 },
  },
  surprised: {
    label: ['ngạc nhiên', 'surprised'],
    motion: 'idle',
    eyes: both(P('round', { sx: 1.5, sy: 1.5 })),
    body: { lift: -2.5, sy: 1.04, sx: 0.97 },
  },
  excited: {
    label: ['phấn khích', 'excited'],
    motion: 'happy',
    eyes: both(P('round', { sx: 1.3, sy: 1.3 })),
    decor: ['sparkle'],
  },
  happy: { label: ['vui', 'happy'], motion: 'happy', eyes: both(P('arcUp')) },
  laughing: { label: ['cười lớn', 'laughing'], motion: 'happy', eyes: [P('chevL'), P('chevR')] },
  wink: { label: ['nháy mắt', 'wink'], motion: 'idle', eyes: [P('pill'), P('arcUp')], body: { roll: 5 } },
  proud: {
    label: ['tự hào', 'proud'],
    motion: 'idle',
    eyes: both(P('arcUp', { sy: 0.8 })),
    body: { roll: -3, lift: -1.5 },
    gaze: { x: 0, y: -0.5 },
    decor: ['sparkle'],
  },
  shy: {
    label: ['ngại', 'shy'],
    motion: 'idle',
    eyes: both(P('pill', { sy: 0.7, sx: 0.9 })),
    gaze: { x: -0.4, y: 0.8 },
    body: { roll: 6, sy: 0.98 },
  },
  sad: {
    label: ['buồn', 'sad'],
    motion: 'idle',
    eyes: [P('pill', { sy: 0.8, rot: 14 }), P('pill', { sy: 0.8, rot: -14 })],
    gaze: { x: 0, y: 0.7 },
    body: { lift: 1.5, sy: 0.97 },
    slow: 0.6,
  },
  scared: {
    label: ['sợ', 'scared'],
    motion: 'idle',
    eyes: both(P('round', { sx: 0.8, sy: 0.8 })),
    body: { sy: 0.95, sx: 1.03 },
    decor: ['sweat'],
  },
  suspicious: {
    label: ['nghi ngờ', 'suspicious'],
    motion: 'idle',
    eyes: both(P('slit', { sx: 1.6 })),
    gaze: { x: -0.8, y: 0 },
    body: { roll: -2 },
  },
  confused: {
    label: ['bối rối', 'confused'],
    motion: 'thinking',
    eyes: [P('pill', { sy: 1.1 }), P('pill', { sy: 0.7 })],
    decor: ['question'],
  },
  unimpressed: { label: ['chán', 'unimpressed'], motion: 'idle', eyes: both(P('slit', { sx: 1.7, dy: 1 })), slow: 0.5 },
  angry: {
    label: ['giận', 'angry'],
    motion: 'idle',
    eyes: [P('slit', { sx: 1.6, rot: 18 }), P('slit', { sx: 1.6, rot: -18 })],
    body: { lift: 1, sx: 1.03, sy: 0.97 },
    decor: ['anger'],
  },
  sleepy: {
    label: ['buồn ngủ', 'sleepy'],
    motion: 'idle',
    eyes: both(P('pill', { sy: 0.38, dy: 1.8 })),
    body: { roll: 4, lift: 1 },
    slow: 0.45,
  },
  asleep: {
    label: ['ngủ', 'asleep'],
    motion: 'idle',
    eyes: both(P('arcDown')),
    body: { roll: 6, lift: 1.5 },
    decor: ['zz'],
    slow: 0.4,
  },
  love: { label: ['thích', 'love'], motion: 'happy', eyes: both(P('heart')), decor: ['heart'] },
  dizzy: { label: ['chóng mặt', 'dizzy'], motion: 'idle', eyes: both(P('x')), decor: ['spiral'] },
  playful: { label: ['chơi', 'playful'], motion: 'happy', eyes: both(P('play')) },
} satisfies Record<string, Expression>;
export type DeanExpression = keyof typeof EXPRESSIONS;

/** Actions are short scripts over time; each returns the expression to show plus extra body motion and decor. */
interface Beat {
  expr: DeanExpression;
  gaze?: { x: number; y: number };
  roll?: number;
  lift?: number;
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  decor?: Decor[];
  fx?: Fx;
}
/** Effects around the body: orbit rings (back half behind the body), burst particles, comet tail, hexagon clip. */
interface Fx {
  orbit?: number;
  burst?: number;
  comet?: number;
  hex?: number;
}
type Action = { label: [string, string]; loop: number; at: (t: number) => Beat };

const wave = (t: number, period: number) => Math.sin((2 * Math.PI * t) / period);
const ease = (k: number) => k * k * (3 - 2 * k);

export const ACTIONS = {
  idle: { label: ['nghỉ', 'idle'], loop: 6, at: () => ({ expr: 'idle' }) },
  listening: {
    label: ['đang nghe', 'listening'],
    loop: 1.6,
    at: (t) => ({ expr: 'attentive', lift: -1.2 * Math.max(0, wave(t, 1.6)) }),
  },
  thinking: {
    label: ['đang nghĩ', 'thinking'],
    loop: 3,
    at: (t) => ({ expr: 'skyward', gaze: { x: 0.25 * wave(t, 3), y: -0.85 }, decor: ['dots'] }),
  },
  waiting: {
    label: ['đang chờ', 'waiting'],
    loop: 2.4,
    at: (t) => {
      const a = (t / 2.4) * 2 * Math.PI;
      return { expr: 'idle', gaze: { x: 0.85 * Math.cos(a), y: 0.6 * Math.sin(a) } };
    },
  },
  done: {
    label: ['xong', 'done'],
    loop: 1.4,
    at: (t) => {
      const k = Math.min(t / 0.5, 1);
      const hop = Math.sin(Math.PI * k);
      return { expr: 'happy', lift: -6 * hop, sy: 1 + 0.06 * hop - (k >= 1 ? 0 : 0), decor: ['sparkle'] };
    },
  },
  error: {
    label: ['lỗi', 'error'],
    loop: 1.6,
    at: (t) => ({ expr: 'laughing', dx: t < 0.6 ? 2.2 * wave(t, 0.15) : 0, lift: t < 0.6 ? 0 : 1.5, decor: ['bang'] }),
  },
  alert: {
    label: ['chú ý!', 'alert'],
    loop: 1.4,
    at: (t) => ({ expr: 'surprised', lift: -2.5 * Math.max(0, wave(t * 2, 1.4)), decor: ['bang'] }),
  },
  notify: {
    label: ['có thông báo', 'notify'],
    loop: 2,
    at: (t) => ({
      expr: 'attentive',
      gaze: { x: 0.7, y: -0.7 },
      decor: ['notify'],
      lift: t < 0.3 ? -2 * Math.sin((Math.PI * t) / 0.3) : 0,
    }),
  },
  affirm: {
    label: ['đồng ý', 'affirm'],
    loop: 1.2,
    at: (t) => ({
      expr: 'happy',
      lift: t < 0.9 ? 2.2 * Math.abs(wave(t, 0.45)) : 0,
      gaze: { x: 0, y: t < 0.9 ? 0.3 * wave(t, 0.45) : 0 },
    }),
  },
  refuse: {
    label: ['không', 'refuse'],
    loop: 1.2,
    at: (t) => ({
      expr: 'unimpressed',
      gaze: { x: t < 0.9 ? 0.9 * wave(t, 0.45) : 0, y: 0 },
      roll: t < 0.9 ? 4 * wave(t, 0.45) : 0,
    }),
  },
  poke: {
    label: ['bị chọc', 'poke'],
    loop: 0.9,
    at: (t) => {
      const k = Math.min(t / 0.25, 1),
        r = t < 0.25 ? 0 : Math.exp(-(t - 0.25) * 7) * Math.cos((t - 0.25) * 22);
      return {
        expr: t < 0.5 ? 'laughing' : 'happy',
        sx: t < 0.25 ? 1 + 0.12 * ease(k) : 1 + 0.12 * r,
        sy: t < 0.25 ? 1 - 0.12 * ease(k) : 1 - 0.12 * r,
      };
    },
  },
  orbit: {
    label: ['quỹ đạo', 'orbit'],
    loop: 2.4,
    at: (t) => ({
      expr: 'curious',
      fx: { orbit: t / 2.4 },
      gaze: { x: Math.cos((t / 2.4) * 2 * Math.PI) * 0.8, y: 0.2 },
    }),
  },
  burst: {
    label: ['bùng nổ', 'burst'],
    loop: 1.6,
    at: (t) => {
      const k = Math.min(t / 1.2, 1);
      const pre = k < 0.12;
      return {
        expr: k < 0.15 ? 'surprised' : 'excited',
        fx: { burst: k },
        sx: pre ? 1 - 0.1 * (k / 0.12) : 1 + 0.06 * Math.exp(-(k - 0.12) * 10),
        sy: pre ? 1 + 0.08 * (k / 0.12) : 1 - 0.05 * Math.exp(-(k - 0.12) * 10),
      };
    },
  },
  comet: {
    label: ['sao chổi', 'comet'],
    loop: 2.2,
    at: (t) => {
      const k = Math.min(t / 1.8, 1);
      const shrink = k < 0.25 ? 1 - 0.8 * ease(k / 0.25) : k > 0.75 ? 0.2 + 0.8 * ease((k - 0.75) / 0.25) : 0.2;
      const m = Math.max(0, Math.min(1, (k - 0.25) / 0.5));
      const fly = k < 0.25 || k > 0.75 ? 0 : Math.sin(Math.PI * m);
      return {
        expr: 'excited',
        sx: shrink,
        sy: shrink,
        dx: 32 * Math.sin(2 * Math.PI * m),
        dy: -22 * fly,
        fx: { comet: fly },
      };
    },
  },
  egg: {
    label: ['quả trứng', 'egg'],
    loop: 2,
    at: (t) => {
      const w = Math.sin((2 * Math.PI * t) / 2);
      return { expr: t < 1 ? 'curious' : 'idle', sx: 0.88 + 0.04 * w, sy: 1.12 - 0.04 * w, roll: 5 * w };
    },
  },
  hexagon: {
    label: ['lục giác', 'hexagon'],
    loop: 2.4,
    at: (t) => {
      const k = t < 0.5 ? ease(t / 0.5) : t > 1.9 ? 1 - ease((t - 1.9) / 0.5) : 1;
      return { expr: 'attentive', fx: { hex: k }, roll: 9 * k * Math.sin(t * 1.2) };
    },
  },
  play: {
    label: ['chơi', 'play'],
    loop: 2,
    at: (t) => ({
      expr: 'playful',
      roll: 6 * Math.sin(2 * Math.PI * t),
      lift: -2 * Math.abs(Math.sin(2 * Math.PI * t)),
    }),
  },
  wake: {
    label: ['thức dậy', 'wake'],
    loop: 1.6,
    at: (t) => ({
      expr: t < 0.5 ? 'asleep' : t < 0.8 ? 'sleepy' : t < 1.0 ? 'surprised' : 'idle',
      lift: t > 0.8 && t < 1.1 ? -2 : 0,
    }),
  },
} satisfies Record<string, Action>;
export type DeanAction = keyof typeof ACTIONS;
export type DeanState = DeanAction | DeanExpression;

export const STATE_LABELS: Record<string, [string, string]> = Object.fromEntries([
  ...Object.entries(EXPRESSIONS).map(([k, v]) => [k, v.label]),
  ...Object.entries(ACTIONS).map(([k, v]) => [k, v.label]),
]);

export interface DeanFrameInput {
  definition: AvatarDefinition;
  state?: DeanState;
  /** seconds since the state started (actions) or since mount (expressions) */
  time?: number;
  gaze?: { x: number; y: number } | null;
  theme?: DeanTheme;
  still?: boolean;
  size?: number;
  title?: string;
  /** Glasses frame colour; no glasses unless set. */
  glassesColor?: string;
  /** Body fill; default the library's orange ORANGE. */
  bodyColor?: string;
  /** Pupils and eye marks; default INK. */
  eyeColor?: string;
  /** Silhouette outline colour; no outline unless set. */
  outline?: string;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const mat = (m: readonly number[]) => `matrix(${m.map(n).join(' ')})`;

function lensBox(def: AvatarDefinition, idx: 0 | 1) {
  const { x, y, spacing } = def.eyes;
  const cx = x + ((idx === 0 ? -1 : 1) * spacing) / 2;
  // hoangthoughts-style lenses: big, wider than tall, soft rounded corners
  const w = Math.min(24, spacing - 4),
    h = w * 0.79;
  return { cx, cy: y - 0.4, w, h, left: cx - w / 2, top: y - h / 2 - 0.4 };
}

/** One lens: an even, thick frame with soft corners, and an arm out to the side (no heavy top bar). */
function glasses(def: AvatarDefinition, idx: 0 | 1, red: string): string {
  const { left, top, w, h } = lensBox(def, idx);
  const lens = `<rect x="${n(left)}" y="${n(top)}" width="${w}" height="${h}" rx="6.5" fill="none" stroke="${red}" stroke-width="3.6"/>`;
  const ax = idx === 0 ? left : left + w,
    ax2 = idx === 0 ? left - 7 : left + w + 7;
  return (
    lens +
    `<path d="M${n(ax)} ${n(top + 5)}L${n(ax2)} ${n(top + 3.4)}" stroke="${red}" stroke-width="3.6" stroke-linecap="round"/>`
  );
}

/** The bridge: a short curve between the lenses, sitting a little above their middle. */
function bridge(def: AvatarDefinition, red: string): string {
  const { x, spacing } = def.eyes;
  const { top, w } = lensBox(def, 0);
  const x1 = x - spacing / 2 + w / 2,
    x2 = x + spacing / 2 - w / 2,
    y = top + 6.5;
  return `<path d="M${n(x1)} ${n(y)}Q${n(x)} ${n(y - 3.2)} ${n(x2)} ${n(y)}" fill="none" stroke="${red}" stroke-width="3.6" stroke-linecap="round"/>`;
}

type Mark =
  | { shape: 'pill'; x: number; y: number; width: number; height: number; radius: number }
  | { shape: 'arc'; d: string; strokeWidth: number };

/** Our eye layer: the engine says where the eye is (centre, size, blink); the pose says what it looks like. */
function eye(mark: Mark, pose: EyePose, ink: string, def: AvatarDefinition, idx: 0 | 1): string {
  let cx: number,
    cy: number,
    w: number,
    h: number,
    blink = 1;
  if (mark.shape === 'pill') {
    cx = mark.x + mark.width / 2;
    w = mark.width;
    // the engine shortens the pill to blink; keep its centre at the open position, read the closure from its height
    const open = 11 * def.eyes.scale * 1.2;
    h = mark.height;
    blink = Math.min(1, h / open);
    cy = mark.y + mark.height / 2;
  } else {
    const b = lensBox(def, idx);
    cx = b.cx;
    cy = b.cy;
    w = 4 * def.eyes.scale * 1.2;
    h = 11 * def.eyes.scale * 1.2;
  }
  const sx = pose.sx ?? 1,
    sy = pose.sy ?? 1;
  const X = cx + (pose.dx ?? 0),
    Y = cy + (pose.dy ?? 0);
  const rot = pose.rot ? ` transform="rotate(${n(pose.rot)} ${n(X)} ${n(Y)})"` : '';
  const sw = n(Math.max(w * 0.62, 1.8));
  const line = (d: string) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${rot}/>`;
  const r = Math.max(w * 0.9, 3) * Math.max(sx, 0.6);
  switch (pose.shape) {
    case 'pill': {
      const ww = w * sx,
        hh = Math.max(h * sy, ww) * (pose.shape === 'pill' ? Math.max(blink, 0.12) / Math.max(blink, 0.12) : 1);
      const hb = Math.max(hh * Math.max(blink, 0.14), ww * 0.9);
      return `<rect x="${n(X - ww / 2)}" y="${n(Y - hb / 2)}" width="${n(ww)}" height="${n(hb)}" rx="${n(Math.min(ww, hb) / 2)}" fill="${ink}"${rot}/>`;
    }
    case 'round': {
      const rr = w * 0.9 * sx;
      const ry = Math.max(rr * Math.max(blink, 0.15), w * 0.4);
      return `<ellipse cx="${n(X)}" cy="${n(Y)}" rx="${n(rr)}" ry="${n(ry)}" fill="${ink}"${rot}/>`;
    }
    case 'dot':
      return `<circle cx="${n(X)}" cy="${n(Y)}" r="${n(w * 0.55)}" fill="${ink}"/>`;
    case 'slit':
      return line(`M${n(X - r * sx * 0.8)} ${n(Y)}H${n(X + r * sx * 0.8)}`);
    case 'arcUp':
      return line(
        `M${n(X - r)} ${n(Y + r * 0.45 * sy)}Q${n(X)} ${n(Y - r * 1.05 * sy)} ${n(X + r)} ${n(Y + r * 0.45 * sy)}`,
      );
    case 'arcDown':
      return line(`M${n(X - r)} ${n(Y - r * 0.2)}Q${n(X)} ${n(Y + r * 1.0)} ${n(X + r)} ${n(Y - r * 0.2)}`);
    case 'chevL':
      return line(`M${n(X - r * 0.7)} ${n(Y - r * 0.8)}L${n(X + r * 0.7)} ${n(Y)}L${n(X - r * 0.7)} ${n(Y + r * 0.8)}`);
    case 'chevR':
      return line(`M${n(X + r * 0.7)} ${n(Y - r * 0.8)}L${n(X - r * 0.7)} ${n(Y)}L${n(X + r * 0.7)} ${n(Y + r * 0.8)}`);
    case 'x':
      return line(
        `M${n(X - r * 0.7)} ${n(Y - r * 0.7)}L${n(X + r * 0.7)} ${n(Y + r * 0.7)}M${n(X + r * 0.7)} ${n(Y - r * 0.7)}L${n(X - r * 0.7)} ${n(Y + r * 0.7)}`,
      );
    case 'play': {
      const s = r * 0.9;
      return `<path d="M${n(X - s * 0.6)} ${n(Y - s)}L${n(X + s * 0.9)} ${n(Y)}L${n(X - s * 0.6)} ${n(Y + s)}Z" fill="${ink}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    case 'heart': {
      const s = r * 0.95;
      return `<path d="M${n(X)} ${n(Y + s * 0.9)}C${n(X - s * 1.6)} ${n(Y - s * 0.1)} ${n(X - s * 0.7)} ${n(Y - s * 1.2)} ${n(X)} ${n(Y - s * 0.35)}C${n(X + s * 0.7)} ${n(Y - s * 1.2)} ${n(X + s * 1.6)} ${n(Y - s * 0.1)} ${n(X)} ${n(Y + s * 0.9)}Z" fill="${ink}"/>`;
    }
  }
}

function decor(kind: Decor, t: number, red: string): string {
  const s = `fill="none" stroke="${red}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'zz': {
      const b = Math.sin(t * 1.3) * 1.2;
      return `<g ${s} transform="translate(0 ${n(b)})"><path d="M76 18h6l-6 7h6"/><path d="M85 8h4.5l-4.5 5.2h4.5"/></g>`;
    }
    case 'sparkle': {
      const k = 0.8 + 0.25 * Math.sin(t * 6);
      const st = (x: number, y: number, r: number) =>
        `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${red}"/>`;
      return `<g transform="translate(84 16) scale(${n(k)}) translate(-84 -16)">${st(84, 16, 6)}${st(94, 30, 3.4)}</g>`;
    }
    case 'bang':
      return `<g fill="${red}"><rect x="84" y="4" width="5" height="16" rx="2.5"/><circle cx="86.5" cy="25.5" r="2.8"/></g>`;
    case 'question':
      return `<g ${s}><path d="M80 12c0-4 3-6 6-6s6 2 6 5.5c0 4-5 4.5-5 8.5"/></g><circle cx="87" cy="25.5" r="1.8" fill="${red}"/>`;
    case 'heart': {
      const y = 14 - ((t * 8) % 10);
      return `<path d="M88 ${n(y + 5)}c-6-4-6-9-3-10 2-1 3 0 3 1 0-1 1-2 3-1 3 1 3 6-3 10z" fill="${red}" opacity="${n(Math.max(0, 1 - ((t * 8) % 10) / 10))}"/>`;
    }
    case 'sweat':
      return `<path d="M82 22c0 0-4 5-4 7.5a4 4 0 0 0 8 0C86 27 82 22 82 22z" fill="${red}"/>`;
    case 'anger':
      return `<g ${s}><path d="M80 10q3 3 0 6M86 8q-3 3 0 6M84 18q3-3 6 0"/></g>`;
    case 'dots': {
      const k = Math.floor((t * 3) % 4);
      return `<g fill="${red}">${[0, 1, 2].map((i) => `<circle cx="${78 + i * 6}" cy="14" r="2.2" opacity="${i < k ? 1 : 0.25}"/>`).join('')}</g>`;
    }
    case 'notify':
      return `<circle cx="84" cy="20" r="6" fill="${RED}"/>`;
    case 'spiral':
      return `<g ${s} transform="rotate(${n((t * 200) % 360)} 86 16)"><path d="M86 16m-1 0a1 1 0 1 1 2 0a3 3 0 1 1 -6 0a5 5 0 1 1 10 0"/></g>`;
  }
}

export function deanSvg(input: DeanFrameInput): string {
  const { definition: def, state = 'idle', time = 0, theme = 'light', still = false, size, title } = input;
  // the logo is the same on light and dark pages: the library's orange body and ink eyes; no glasses, no outline
  const body = input.bodyColor ?? ORANGE;
  const ink = input.eyeColor ?? INK;
  const glassC = input.glassesColor;
  const outlineC = input.outline;
  // decor sits on the page, so it follows the page theme
  const decoC = theme === 'dark' ? PAPER : INK;
  const action = (ACTIONS as Record<string, Action>)[state];
  const beat: Beat = action ? action.at(action.loop ? time % action.loop : time) : { expr: state as DeanExpression };
  const ex: Expression = EXPRESSIONS[beat.expr];
  const gaze = beat.gaze ?? ex.gaze ?? input.gaze ?? null;
  const f = avatarFrame(def, {
    color: body,
    eyeColor: ink,
    time: time * 1000 * (ex.slow ?? 1),
    motion: ex.motion,
    gaze: gaze ?? undefined,
    reducedMotion: still,
  });
  const byId = new Map(f.paths.map((p) => [p.id, p]));
  const defs = f.paths
    .map((p) => `<path id="dp${p.id}" d="${p.d}"${p.evenOdd ? ' fill-rule="evenodd"' : ''}/>`)
    .join('');
  let out = '',
    eyes = 0;
  // optional ink outline: every slice once, filled and stroked, behind the body; the union is the silhouette edge
  if (outlineC) {
    for (const s of f.shapes) {
      if (s.kind === 'slice' && byId.has(s.path))
        out += `<use href="#dp${s.path}" fill="${outlineC}" stroke="${outlineC}" stroke-width="5" stroke-linejoin="round" transform="${mat(s.matrix)}"/>`;
    }
  }
  for (const s of f.shapes) {
    if (s.kind === 'slice') {
      if (byId.has(s.path)) out += `<use href="#dp${s.path}" fill="${body}" transform="${mat(s.matrix)}"/>`;
    } else {
      const idx = s.key === 'eye-0' ? 0 : 1;
      out += `<g transform="${mat(s.matrix)}">${eye(s.mark as Mark, ex.eyes[idx], ink, def, idx)}${glassC ? glasses(def, idx, glassC) : ''}</g>`;
      if (++eyes === 2 && glassC) out += `<g transform="${mat(s.matrix)}">${bridge(def, glassC)}</g>`;
    }
  }
  // extra body pose about the base of the body: roll, lift, squash, sideways shake
  const b = ex.body ?? {};
  const roll = (b.roll ?? 0) + (beat.roll ?? 0),
    lift = (b.lift ?? 0) + (beat.lift ?? 0);
  const sx = (b.sx ?? 1) * (beat.sx ?? 1),
    sy = (b.sy ?? 1) * (beat.sy ?? 1),
    dx = beat.dx ?? 0;
  const dy = beat.dy ?? 0;
  const pose =
    still && !action
      ? `rotate(${n(roll)} 50 90)`
      : `translate(${n(50 + dx)} ${n(90 + lift + dy)}) rotate(${n(roll)}) scale(${n(sx)} ${n(sy)}) translate(-50 -90)`;
  const deco = [...(ex.decor ?? []), ...(beat.decor ?? [])].map((d) => decor(d, still ? 0 : time, decoC)).join('');
  const fx = beat.fx ?? {};
  const ring = (k: number, isFront: boolean) =>
    [0, 1]
      .map((i) => {
        const tilt = i ? -18 : 16;
        const a = ((k + i * 0.5) % 1) * 2 * Math.PI;
        const arc = isFront ? 'M2 55A48 13 0 0 0 98 55' : 'M2 55A48 13 0 0 1 98 55';
        const inFront = Math.sin(a) > 0;
        const dot =
          inFront === isFront
            ? `<circle cx="${n(50 + 48 * Math.cos(a))}" cy="${n(55 + 13 * Math.sin(a))}" r="3" fill="${decoC}"/>`
            : '';
        return `<g transform="rotate(${tilt} 50 55)"><path d="${arc}" fill="none" stroke="${decoC}" stroke-width="2" opacity="${isFront ? 0.95 : 0.45}"/>${dot}</g>`;
      })
      .join('');
  const back = fx.orbit !== undefined ? ring(fx.orbit, false) : '';
  let front = fx.orbit !== undefined ? ring(fx.orbit, true) : '';
  if (fx.burst !== undefined) {
    const k = fx.burst;
    const d = 10 + 46 * ease(Math.min(k / 0.7, 1));
    const o = Math.max(0, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
    front += Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * 2 * Math.PI + 0.3;
      return `<circle cx="${n(50 + d * Math.cos(a))}" cy="${n(55 + d * Math.sin(a))}" r="${i % 2 ? 2 : 3}" fill="${decoC}" opacity="${n(o)}"/>`;
    }).join('');
  }
  if (fx.comet) {
    const k = fx.comet;
    front =
      `<path d="M${n(50 + dx - 4)} ${n(72 + dy)}Q${n(34 + dx * 0.6)} ${n(82 + dy * 0.5)} ${n(10 + dx * 0.2)} ${n(90)}" fill="none" stroke="${decoC}" stroke-width="${n(6 * k)}" stroke-linecap="round" opacity="${n(0.7 * k)}"/>` +
      front;
  }
  let hexClip = '';
  if (fx.hex) {
    const R = 64 - 20 * fx.hex;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${n(50 + R * Math.cos(a))},${n(54 + R * Math.sin(a))}`;
    }).join(' ');
    hexClip = `<clipPath id="dhex"><polygon points="${pts}"/></clipPath>`;
  }
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const label = title ? `<title>${title}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124"${dims} role="img">${label}<defs>${defs}${hexClip}</defs>${back}` +
    `<g transform="${pose}"${hexClip ? ' clip-path="url(#dhex)"' : ''}><g transform="${mat(f.root)}">${out}</g></g>${front}${deco}</svg>`
  );
}

/** Small favicon: the cloud silhouette in the logo orange with two thick pill eyes. */
export function deanFavicon(def: AvatarDefinition, _theme: DeanTheme = 'light'): string {
  const { x, y, spacing } = def.eyes;
  const w = 7,
    h = 17;
  const pill = (cx: number) => `<rect x="${n(cx - w / 2)}" y="${n(y - h / 2)}" width="${w}" height="${h}" rx="${w / 2}" fill="${INK}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 20 88 60"><path d="${def.body.path}" fill="${ORANGE}"/>` +
    pill(x - spacing / 2) +
    pill(x + spacing / 2) +
    `</svg>`
  );
}
