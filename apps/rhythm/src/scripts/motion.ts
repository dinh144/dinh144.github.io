/**
 * The motion layer. Loaded lazily, only while motionAllowed() is true.
 *
 * One clock drives everything: a 96 bpm metronome whose tempo rises with scroll speed.
 * Type reacts to it through the Mona Sans width (wdth 75–125) and weight (wght 200–900) axes:
 *   - hero words pulse in canon, a sixteenth note apart
 *   - score titles open up as they cross the playhead line (scroll scrubs the piece),
 *     hovered titles stretch and their neighbours condense to make room
 *   - bar numbers tick on the beat, a step apart down the score
 *   - titles and headings "set" on the next beat when they enter
 *   - the footer wordmark runs a wave across its letters
 * Every write goes to font-weight / font-stretch on elements whose lines are locked (see lines.ts),
 * so the page never reflows while it moves.
 */
import { motionAllowed } from '@blog/core/client/preferences';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { isPaused } from './tempo-state';
import { lockLines, type AxisState, type Locked } from './lines';


const BASE_BPM = 96;
const MAX_BOOST = 72;
const MAX_STATE: AxisState = { wdth: 125, wght: 900 };

/* ---------- clock ---------- */
const clock = { beats: 0, bpm: BASE_BPM, paused: false, lastY: 0, lastBeat: -1, shownBpm: -1 };
type Frame = { beats: number; bpm: number; dt: number; vh: number };
type Part = { update: (f: Frame) => void; destroy: () => void; relock?: () => void };

/** Sharp attack, exponential decay: the shape of one beat. */
const hit = (beats: number, decay = 6) => {
  const f = beats - Math.floor(beats);
  return Math.exp(-f * decay);
};
/** Downbeat accents: beat one of the bar hits harder. */
const accent = (beats: number) => (((Math.floor(beats) % 4) + 4) % 4 === 0 ? 1 : 0.55);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

let lenis: Lenis | undefined;
let parts: Part[] = [];
let running = false;
let mounted = false;
let blend = 0;
let resizeTimer = 0;
let lastWidth = 0;

function setAxes(el: HTMLElement, wdth: number, wght: number) {
  el.style.fontStretch = `${wdth.toFixed(1)}%`;
  el.style.fontWeight = String(Math.round(wght));
}

/* ---------- metronome display ---------- */
function metronomePart(): Part {
  const bpmEl = document.querySelector<HTMLElement>('[data-bpm]');
  const cells = [...document.querySelectorAll<HTMLElement>('[data-metro] [data-beat]')];
  return {
    update(f) {
      const shown = Math.round(f.bpm);
      if (bpmEl && shown !== clock.shownBpm) {
        clock.shownBpm = shown;
        bpmEl.textContent = String(shown).padStart(3, '0');
      }
      const beat = Math.floor(f.beats);
      if (beat !== clock.lastBeat) {
        clock.lastBeat = beat;
        const idx = ((beat % 4) + 4) % 4;
        cells.forEach((cell, i) => cell.toggleAttribute('data-on', i === idx && !clock.paused));
      }
    },
    destroy() {
      cells.forEach((cell) => cell.removeAttribute('data-on'));
      if (bpmEl) bpmEl.textContent = String(BASE_BPM).padStart(3, '0');
      clock.lastBeat = -1;
      clock.shownBpm = -1;
    },
  };
}

/* ---------- hero: words pulse in canon ---------- */
function heroPart(el: HTMLElement): Part {
  let locked = lockLines(el, { wdth: 118, wght: 880 });
  return {
    update(f) {
      const n = locked.words.length;
      locked.words.forEach((w, i) => {
        const phase = f.beats - i / 4;
        const e = hit(phase, 5) * accent(phase) * blend;
        // A slow swell across the line underneath the beat keeps the phrase breathing.
        const swell = (Math.sin((f.beats / 4) * Math.PI * 2 - (i / Math.max(1, n)) * Math.PI * 2) + 1) / 2;
        setAxes(w, lerp(100, 96 + swell * 14 + e * 8, blend), lerp(640, 600 + swell * 120 + e * 160, blend));
      });
    },
    relock() {
      locked.restore();
      locked = lockLines(el, { wdth: 118, wght: 880 });
    },
    destroy() {
      locked.restore();
    },
  };
}

/* ---------- score: lens at the playhead, hover makes room, numbers tick ---------- */
type Row = {
  li: HTMLElement;
  title: HTMLElement;
  no?: HTMLElement;
  locked: Locked;
  loud: boolean;
  p: number;
  boost: number;
  target: number;
  visible: boolean;
};
const REST = {
  article: { wdth: 100, wght: 740 },
  note: { wdth: 88, wght: 420 },
  link: { wdth: 112, wght: 520 },
} as const;

function scorePart(list: HTMLElement): Part {
  const rows: Row[] = [...list.querySelectorAll<HTMLElement>(':scope > li')]
    .map((li) => {
      const title = li.querySelector<HTMLElement>('[data-kin]');
      if (!title) return undefined;
      return {
        li,
        title,
        no: li.querySelector<HTMLElement>('.row-no') ?? undefined,
        locked: lockLines(title, MAX_STATE),
        loud: (li.dataset.type ?? 'article') === 'article',
        p: 0,
        boost: 0,
        target: 0,
        visible: true,
      };
    })
    .filter((r): r is Row => Boolean(r));

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const row = rows.find((r) => r.li === entry.target);
        if (row) row.visible = entry.isIntersecting;
      }
    },
    { rootMargin: '25% 0px' },
  );
  rows.forEach((r) => io.observe(r.li));

  // Hover / tap: the row stretches, its neighbours condense.
  const listeners: [HTMLElement, string, EventListener][] = [];
  const focusRow = (index: number | undefined) =>
    rows.forEach((r, i) => {
      r.target = index === undefined ? 0 : i === index ? 1 : Math.abs(i - index) === 1 ? -0.7 : -0.25;
    });
  rows.forEach((row, i) => {
    const on = () => focusRow(i);
    const off = () => focusRow(undefined);
    for (const [type, fn] of [
      ['pointerenter', on],
      ['pointerleave', off],
      ['focusin', on],
      ['focusout', off],
      ['pointerdown', on],
    ] as const) {
      row.li.addEventListener(type, fn);
      listeners.push([row.li, type, fn]);
    }
  });

  return {
    update(f) {
      const line = f.vh * 0.46;
      const spread = f.vh * 0.3;
      rows.forEach((row, i) => {
        if (!row.visible) return;
        const rect = row.title.getBoundingClientRect();
        const d = (rect.top + rect.height / 2 - line) / spread;
        const lens = Math.exp(-d * d);
        row.p = lerp(row.p, lens, smooth(f.dt, 9));
        row.boost = lerp(row.boost, row.target, smooth(f.dt, 12));
        const p = clamp(row.p + row.boost, 0, 1);
        const phase = f.beats - i / 2;
        const e = hit(phase, 7) * accent(phase);
        const rest = REST[(row.li.dataset.type as keyof typeof REST) ?? 'article'] ?? REST.article;
        const wdth = row.loud ? 76 + 49 * p + 3 * e : 76 + 36 * p + 2 * e;
        const wght = row.loud ? 300 + 560 * p + 40 * e : 260 + 360 * p + 30 * e;
        setAxes(row.title, lerp(rest.wdth, clamp(wdth, 75, 125), blend), lerp(rest.wght, clamp(wght, 200, 900), blend));
        row.li.toggleAttribute('data-live', p > 0.72);
        if (row.no) {
          // The metronome: each bar number snaps heavy on its beat, then relaxes.
          const tickE = hit(f.beats - i / 4, 9) * blend;
          setAxes(row.no, lerp(75, 75 + 10 * tickE, blend), lerp(250, 250 + 650 * Math.max(tickE, p * 0.5), blend));
        }
      });
    },
    relock() {
      rows.forEach((row) => {
        row.locked.restore();
        row.locked = lockLines(row.title, MAX_STATE);
      });
    },
    destroy() {
      io.disconnect();
      listeners.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
      rows.forEach((row) => {
        row.locked.restore();
        row.li.removeAttribute('data-live');
        if (row.no) setAxesClear(row.no);
      });
    },
  };
}

function setAxesClear(el: HTMLElement) {
  el.style.fontStretch = '';
  el.style.fontWeight = '';
}

/* ---------- a title sets word by word, on the next beat ---------- */
function restOf(el: HTMLElement): AxisState {
  const cs = getComputedStyle(el);
  return { wdth: parseFloat(cs.fontStretch) || 100, wght: parseFloat(cs.fontWeight) || 700 };
}

function setOnBeat(el: HTMLElement, step = 0.25): Part {
  const rest = restOf(el);
  const locked = lockLines(el, rest);
  const beat = 60 / clock.bpm;
  const wait = (Math.ceil(clock.beats) - clock.beats) * beat;
  // Words land on a sixteenth-note grid; long titles compress the grid so the whole entrance stays short.
  const gap = Math.min(beat * step, 0.9 / Math.max(1, locked.words.length));
  const tl = gsap.timeline({ delay: wait });
  locked.words.forEach((w, i) => {
    tl.fromTo(
      w,
      { fontStretch: '75%', fontWeight: 260 },
      { fontStretch: `${rest.wdth}%`, fontWeight: rest.wght, duration: beat * 1.2, ease: 'expo.out' },
      i * gap,
    );
  });
  tl.eventCallback('onComplete', () => locked.restore());
  return {
    update() {},
    destroy() {
      tl.kill();
      locked.restore();
    },
  };
}

/* ---------- prose headings set on the beat as they enter ---------- */
function headingsPart(prose: HTMLElement): Part {
  const subs: Part[] = [];
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        subs.push(setOnBeat(entry.target as HTMLElement, 0.125));
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  prose.querySelectorAll<HTMLElement>('h2, h3').forEach((h) => io.observe(h));
  return {
    update() {},
    destroy() {
      io.disconnect();
      subs.forEach((s) => s.destroy());
    },
  };
}

/* ---------- wordmark wave (footer, 404) ---------- */
function wavePart(root: HTMLElement, fit: boolean): Part {
  const letters = [...root.querySelectorAll<HTMLElement>('.wm-ch')];
  const doFit = () => {
    if (!fit) return;
    root.style.fontSize = '';
    letters.forEach((l) => setAxes(l, MAX_STATE.wdth, MAX_STATE.wght));
    const parent = root.parentElement ?? root;
    const pcs = getComputedStyle(parent);
    const avail = parent.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight);
    const used = root.getBoundingClientRect().width;
    const size = parseFloat(getComputedStyle(root).fontSize);
    if (used > 0) root.style.fontSize = `${Math.floor((size * avail * 0.995) / used)}px`;
  };
  doFit();
  return {
    update(f) {
      letters.forEach((l, i) => {
        const phase = f.beats - i / 8;
        const e = hit(phase, 3.5) * accent(phase);
        setAxes(l, lerp(100, 80 + 45 * e, blend), lerp(700, 300 + 600 * e, blend));
      });
    },
    relock: doFit,
    destroy() {
      root.style.fontSize = '';
      letters.forEach(setAxesClear);
    },
  };
}

/* ---------- page lifecycle ---------- */
export function mountPage() {
  if (!running || mounted) return;
  mounted = true;
  blend = 0;
  const ramp = { v: 0 };
  gsap.to(ramp, { v: 1, duration: 0.9, ease: 'power2.out', onUpdate: () => void (blend = ramp.v) });
  lastWidth = window.innerWidth;
  clock.lastY = window.scrollY;

  parts.push(metronomePart());
  const hero = document.querySelector<HTMLElement>('[data-kin="hero"]');
  if (hero) parts.push(heroPart(hero));
  document.querySelectorAll<HTMLElement>('[data-score]').forEach((list) => {
    if (list.tagName === 'OL') parts.push(scorePart(list));
  });
  const title = document.querySelector<HTMLElement>('[data-kin="title"]');
  if (title) parts.push(setOnBeat(title));
  const prose = document.querySelector<HTMLElement>('[data-prose]');
  if (prose) parts.push(headingsPart(prose));
  const wordmark = document.querySelector<HTMLElement>('.wordmark');
  if (wordmark) parts.push(wavePart(wordmark, true));
  const lost = document.querySelector<HTMLElement>('.lost-digits');
  if (lost) parts.push(wavePart(lost, false));
}

export function unmountPage() {
  parts.forEach((p) => p.destroy());
  parts = [];
  mounted = false;
}

function frame(_time: number, deltaMs: number) {
  const dt = Math.min(0.1, deltaMs / 1000);
  const y = window.scrollY;
  const velocity = Math.abs(y - clock.lastY) / Math.max(dt, 1 / 240);
  clock.lastY = y;
  const target = BASE_BPM + clamp(velocity / 36, 0, MAX_BOOST);
  clock.bpm = lerp(clock.bpm, target, smooth(dt, target > clock.bpm ? 4 : 1.2));
  if (!clock.paused) clock.beats += (dt * clock.bpm) / 60;
  const f: Frame = { beats: clock.beats, bpm: clock.bpm, dt, vh: window.innerHeight };
  for (const p of parts) p.update(f);
}

function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    parts.forEach((p) => p.relock?.());
  }, 160);
}

export function setPaused(value: boolean) {
  clock.paused = value;
}

export async function start() {
  if (running || !motionAllowed()) return;
  running = true;
  clock.paused = isPaused();
  await document.fonts.ready;
  if (!running) return;
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -24 }, autoRaf: false });
  gsap.ticker.add(lenisRaf);
  gsap.ticker.add(frame);
  gsap.ticker.lagSmoothing(0);
  window.addEventListener('resize', onResize, { passive: true });
  document.documentElement.classList.add('is-kinetic');
  mountPage();
}

function lenisRaf(time: number) {
  lenis?.raf(time * 1000);
}

export function stop() {
  if (!running) return;
  running = false;
  unmountPage();
  gsap.ticker.remove(frame);
  gsap.ticker.remove(lenisRaf);
  lenis?.destroy();
  lenis = undefined;
  window.removeEventListener('resize', onResize);
  document.documentElement.classList.remove('is-kinetic');
}

// Lenis must restart for each page: ClientRouter replaces <html> attributes and scroll position.
document.addEventListener('astro:before-swap', () => {
  if (!running) return;
  lenis?.destroy();
  lenis = undefined;
});
document.addEventListener('astro:page-load', () => {
  if (!running || lenis) return;
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -24 }, autoRaf: false });
  document.documentElement.classList.add('is-kinetic');
});
