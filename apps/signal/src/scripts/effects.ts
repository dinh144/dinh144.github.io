/**
 * Everything that moves: Lenis smooth scroll, GSAP-driven title decode, scroll choreography and the
 * WebGL signal field. Loaded only while motionAllowed(); stop() returns the page to its static state.
 */
import { motionAllowed } from '@blog/core/client/preferences';
import { tick } from '@blog/core/client/sound';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { SignalField } from './ascii/engine';

gsap.registerPlugin(ScrollTrigger);

// Glyphs JetBrains Mono draws at the same advance as letters.
const NOISE = '░▒▓/\\|_#*+=01:';
// Titles decode through lighter glyphs; the heavy blocks read as holes at display sizes.
const TITLE_NOISE = '░/\\|_#*+=01:<>';
let lenis: Lenis | undefined;
let lenisRaf: ((time: number) => void) | undefined;
let ctx: gsap.Context | undefined;
let field: SignalField | undefined;
let fieldLoading: Promise<SignalField> | undefined;
let generation = 0;
let triggersDisabled = false;
const listeners: (() => void)[] = [];

/**
 * Decode a title from glyph noise. Every character keeps its slot and spaces are never replaced, so
 * in a monospace face the line breaks and box size never change (no layout shift). Each character
 * flickers through noise until its own reveal time, sweeping left to right with a little jitter.
 */
function decodeEl(el: HTMLElement, opts: { duration?: number; delay?: number } = {}) {
  const text = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = text;
  const chars = [...text];
  const reveal = chars.map((_, i) => 0.15 + (i / Math.max(1, chars.length)) * 0.7 + Math.random() * 0.15);
  const state = { p: 0 };
  let lastFrame = -1;
  return gsap.to(state, {
    p: 1,
    duration: opts.duration ?? Math.min(1.1, 0.35 + text.length * 0.012),
    delay: opts.delay ?? 0,
    ease: 'none',
    onUpdate: () => {
      // Noise changes at about 30 Hz, like a refreshing terminal, not every frame.
      const frame = Math.floor(state.p * 40);
      if (frame === lastFrame) return;
      lastFrame = frame;
      el.textContent = chars
        .map((ch, i) =>
          ch === ' ' || ch === '\n' || state.p >= reveal[i] ? ch : TITLE_NOISE[(Math.random() * TITLE_NOISE.length) | 0],
        )
        .join('');
    },
    onComplete: () => {
      el.textContent = text;
    },
  });
}

/** A row's thumbnail loses lock for a moment, then settles back on its picture. */
function glitchThumb(el: HTMLElement | null) {
  if (!el || el.dataset.busy) return;
  const original = el.dataset.frame ?? el.textContent ?? '';
  el.dataset.frame = original;
  el.dataset.busy = '1';
  let frame = 0;
  const step = () => {
    frame++;
    const amount = frame < 4 ? 0.35 : 0.35 * (1 - (frame - 4) / 5);
    el.textContent = [...original]
      .map((ch) =>
        ch !== ' ' && ch !== '\n' && Math.random() < amount ? NOISE[(Math.random() * NOISE.length) | 0] : ch,
      )
      .join('');
    if (frame < 9) setTimeout(step, 40);
    else {
      el.textContent = original;
      delete el.dataset.busy;
    }
  };
  step();
}

function getField(): Promise<SignalField> {
  fieldLoading ??= import('./ascii/engine').then(async ({ SignalField }) => (field = await SignalField.create()));
  return fieldLoading;
}

/** Data saver on: keep the server-rendered still frame and never download the WebGL engine. */
function saveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches;
}

async function mountField(gen: number) {
  const host = document.querySelector<HTMLElement>('[data-field]');
  if (!host || saveData()) return;
  let f: SignalField;
  try {
    f = await getField();
  } catch {
    return; // no WebGL: the still frame stays
  }
  if (gen !== generation || !motionAllowed() || !host.isConnected) return;
  const narrow = matchMedia('(max-width: 639px)').matches;
  const num = (key: string, fallback: number) => Number(host.dataset[key] ?? fallback);
  f.mount(host, {
    shape: (host.dataset.shape as never) ?? 'torus',
    seed: num('seed', 1),
    centerX: narrow ? num('cxSm', 0.5) : num('cx', 0.5),
    centerY: narrow ? num('cySm', 0.5) : num('cy', 0.5),
    scale: narrow ? num('scaleSm', 0.8) : num('scale', 0.8),
    static: num('static', 0.02),
    alpha: num('alpha', 1),
  });
  f.decode(1.5);
  const hud = host.querySelector<HTMLElement>('[data-hud]');
  if (hud) {
    const shape = hud.querySelector<HTMLElement>('[data-hud-shape]')!;
    const grid = hud.querySelector<HTMLElement>('[data-hud-grid]')!;
    const rate = hud.querySelector<HTMLElement>('[data-hud-rate]')!;
    const initial = { shape: shape.innerHTML, grid: grid.innerHTML, rate: rate.innerHTML };
    f.onStats = (s) => {
      if (host.dataset.shape !== 'none') shape.textContent = s.shape;
      grid.textContent = `${s.cols}×${s.rows}`;
      rate.textContent = `t+${s.t.toFixed(1)}s`;
    };
    listeners.push(() => {
      f.onStats = undefined;
      shape.innerHTML = initial.shape;
      grid.innerHTML = initial.grid;
      rate.innerHTML = initial.rate;
    });
  }
  // Scroll choreography for the field: the shape spins and lifts as you leave it, then the signal breaks up.
  const section = host.closest<HTMLElement>('.hero, .opener, .void');
  if (section && !section.classList.contains('void')) {
    ctx?.add(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          f.scroll.spin = p * 2.2;
          f.scroll.lift = p * 0.3;
          f.scroll.loss = Math.max(0, (p - 0.35) / 0.65) ** 1.5;
        },
      });
    });
  }
}

function choreograph() {
  // Above the fold: titles decode right away.
  document
    .querySelectorAll<HTMLElement>('.hero [data-decode], .opener [data-decode], .void [data-decode]')
    .forEach((el, i) => {
      decodeEl(el, { delay: 0.05 + i * 0.08, duration: 0.9 });
    });

  // Hero copy drifts up and dims as the field takes over.
  const hero = document.querySelector<HTMLElement>('.hero');
  if (hero) {
    gsap.to('.hero-copy', {
      yPercent: -18,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // Feed: day dividers draw their rule, entries arrive with a short decode. Only rows below the fold
  // start hidden, so nothing the reader already sees ever disappears.
  const fold = window.innerHeight;
  const rows = [...document.querySelectorAll<HTMLElement>('.row, .series-row')];
  const below = rows.filter((r) => r.getBoundingClientRect().top > fold);
  gsap.set(below, { opacity: 0, y: 14 });
  ScrollTrigger.batch(rows, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      const hidden = batch.filter((el) => below.includes(el as HTMLElement));
      gsap.to(hidden, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.07 });
      batch.forEach((el, i) => {
        const title = el.querySelector<HTMLElement>('[data-decode]');
        if (title) decodeEl(title, { delay: i * 0.07, duration: 0.6 });
      });
    },
  });
  document.querySelectorAll<HTMLElement>('[data-divider]').forEach((d) => {
    const line = d.querySelector<HTMLElement>('.line');
    if (!line) return;
    gsap.fromTo(
      line,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: d, start: 'top 92%', once: true },
      },
    );
  });

  // The filter prompt types itself out when it comes into view.
  document.querySelectorAll<HTMLElement>('.ls .cmd').forEach((cmd) => {
    const node = [...cmd.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (!node) return;
    const full = node.textContent ?? '';
    const state = { n: 0 };
    const caret = document.createElement('span');
    caret.className = 'cursor';
    caret.setAttribute('aria-hidden', 'true');
    gsap.to(state, {
      n: full.length,
      duration: full.length * 0.035,
      ease: 'none',
      scrollTrigger: { trigger: cmd, start: 'top 92%', once: true },
      onStart: () => {
        node.textContent = '';
        cmd.appendChild(caret);
      },
      onUpdate: () => {
        node.textContent = full.slice(0, Math.round(state.n));
      },
      onComplete: () => {
        node.textContent = full;
        gsap.delayedCall(1.2, () => caret.remove());
      },
    });
    listeners.push(() => {
      node.textContent = full;
      caret.remove();
    });
  });

  // Opener band quiets as it scrolls away (field handled in mountField).
  // Hover: a soft tick as a row is selected, like moving a terminal cursor.
  let lastTick = 0;
  const onOver = (e: Event) => {
    const now = performance.now();
    if (now - lastTick < 70) return;
    lastTick = now;
    const row = e.currentTarget as HTMLElement;
    tick(0.9 + (rows.indexOf(row) % 5) * 0.05);
    glitchThumb(row.querySelector<HTMLElement>('.row-thumb'));
  };
  rows.forEach((r) => r.addEventListener('pointerenter', onOver));
  listeners.push(() => rows.forEach((r) => r.removeEventListener('pointerenter', onOver)));
}

export function start() {
  if (!motionAllowed()) return;
  stop();
  const gen = ++generation;
  gsap.ticker.wake();
  if (triggersDisabled) {
    ScrollTrigger.enable();
    triggersDisabled = false;
  }
  lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  lenisRaf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
  ctx = gsap.context(() => choreograph());
  void mountField(gen);
}

export function stop() {
  generation++;
  if (lenisRaf) gsap.ticker.remove(lenisRaf);
  lenisRaf = undefined;
  lenis?.destroy();
  lenis = undefined;
  ctx?.revert();
  ctx = undefined;
  // ScrollTrigger keeps its own rAF loop while enabled; switch it off entirely while the page is still.
  if (!triggersDisabled) {
    ScrollTrigger.disable(false, true);
    triggersDisabled = true;
  }
  gsap.globalTimeline.clear();
  // Nothing should run while the page is still: let the ticker stop requesting frames.
  gsap.ticker.sleep();
  while (listeners.length) listeners.pop()!();
  // Any title caught mid-decode gets its real text back.
  document.querySelectorAll<HTMLElement>('[data-decode][data-text]').forEach((el) => {
    el.textContent = el.dataset.text!;
  });
  field?.unmount();
}

/** Screen changed: re-read the palette from CSS. */
export function repaint() {
  requestAnimationFrame(() => field?.applyPalette());
}
