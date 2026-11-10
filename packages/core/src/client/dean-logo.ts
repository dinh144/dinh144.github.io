/**
 * Live dean logo. The page ships a still SVG (components/DeanLogo.astro); this module wakes it up.
 *
 * Motion contract: frames are drawn only while motionAllowed() is true. Reading mode shows the still "asleep" frame,
 * reduced motion the still frame of the page's base state; both switch live on `prefs:change`. The renderer
 * (brand/deanframe.ts + the vendored Open Bot Avatar core) is imported lazily: only once a logo is on screen and the
 * browser is idle. The loop pauses while the logo is off screen or the tab is hidden.
 *
 * States: idle with pointer gaze · thinking on every navigation, then done · confused on 404 (data-state on the
 * element) · sleepy, then asleep after 60 s without input; any input wakes it · a happy hop (done) and a blip on click.
 * Other code can set a state:
 *   document.dispatchEvent(new CustomEvent('dean:state', { detail: { state: 'alert', once: true } }))
 * `once` plays an action one time, then returns to the base state.
 */
import type { AvatarDefinition } from '../brand/vendor/open-bot-avatar/src/index.ts';
import type { DeanState } from '../brand/deanframe';
import { motionAllowed } from './preferences';
import { blip } from './sound';

type Engine = typeof import('../brand/deanframe');

const IDLE_MS = 60_000;
const SLEEPY_MS = 4_000;
const FRAME_MS = 1000 / 30;
/** Pointer distance (px) that turns the eyes fully to one side. */
const GAZE_RANGE = 360;

let engine: Engine | undefined;
let definition: AvatarDefinition | undefined;
let loading: Promise<void> | undefined;

let el: HTMLElement | null = null;
let mark: HTMLElement | null = null;
let tip: HTMLElement | null = null;
let observer: IntersectionObserver | undefined;
let visible = false;

let base: DeanState = 'idle';
let current: DeanState = 'idle';
let since = performance.now();
let onceUntil = 0;
let lastInput = performance.now();
let navigating = false;

const gaze = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
let raf = 0;
let lastFrame = 0;

function load(): Promise<void> {
  loading ??= Promise.all([import('../brand/deanframe'), import('../brand/dean.json')]).then(([mod, json]) => {
    engine = mod;
    definition = (json as { default: AvatarDefinition }).default;
  });
  return loading;
}

function whenIdle(fn: () => void) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 200);
}

function theme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function readingMode(): boolean {
  return document.documentElement.dataset.reading === 'on';
}

/** Hover label for a state: one of the data-l-* strings rendered by the component. */
function statusLabel(state: DeanState): string {
  if (!el) return '';
  const d = el.dataset;
  if (state === 'thinking' || state === 'waiting') return d.lLoading ?? '';
  if (state === 'done') return d.lDone ?? '';
  if (state === 'confused' || state === 'error') return d.lLost ?? '';
  if (state === 'asleep' || state === 'sleepy') return d.lAsleep ?? '';
  return d.lWatching ?? '';
}

function updateTip(state: DeanState) {
  if (tip && el) tip.textContent = `${statusLabel(state)} · ${el.dataset.lHome ?? ''}`;
}

function size(): number {
  return Number(el?.dataset.size) || 56;
}

function draw(state: DeanState, time: number, still: boolean) {
  if (!engine || !definition || !mark) return;
  mark.innerHTML = engine.deanSvg({
    definition,
    state,
    time,
    still,
    gaze: still ? null : gaze,
    theme: theme(),
    size: size(),
  });
}

function actionLength(state: DeanState): number {
  const action = engine?.ACTIONS[state as keyof Engine['ACTIONS']];
  return action ? action.loop * 1000 : 1200;
}

function set(state: DeanState, once = false) {
  current = state;
  since = performance.now();
  onceUntil = once ? since + actionLength(state) : 0;
  updateTip(state);
  if (!motionAllowed()) drawStill();
}

/** The frame shown when motion is off: asleep in reading mode, otherwise the base state. */
function drawStill() {
  const state = readingMode() ? 'asleep' : base;
  updateTip(state);
  draw(state, 0, true);
}

function frame(now: number) {
  raf = 0;
  if (!el || !el.isConnected) return;
  if (onceUntil && now >= onceUntil) set(base);
  if (current === base && now - lastInput > IDLE_MS) set('sleepy');
  else if (current === 'sleepy' && now - since > SLEEPY_MS) set('asleep');
  gaze.x += (target.x - gaze.x) * 0.15;
  gaze.y += (target.y - gaze.y) * 0.15;
  if (now - lastFrame >= FRAME_MS) {
    lastFrame = now;
    draw(current, (now - since) / 1000, false);
  }
  schedule();
}

function running(): boolean {
  return Boolean(engine && el && visible && !document.hidden && motionAllowed());
}

function schedule() {
  if (!raf && running()) raf = requestAnimationFrame(frame);
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

/** Re-evaluate after a preference, visibility or page change. */
function refresh() {
  if (!engine || !el) return;
  if (!motionAllowed()) {
    stop();
    drawStill();
    return;
  }
  updateTip(current);
  schedule();
}

function onInput(event: Event) {
  lastInput = performance.now();
  if (event.type === 'pointermove' && el) {
    const p = event as PointerEvent;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    target.x = Math.max(-1, Math.min(1, (p.clientX - cx) / GAZE_RANGE));
    target.y = Math.max(-1, Math.min(1, (p.clientY - cy) / GAZE_RANGE));
  }
  if (current === 'sleepy' || current === 'asleep') set('wake', true);
}

function onClick() {
  blip();
  set('done', true);
}

function bind() {
  observer?.disconnect();
  el?.removeEventListener('click', onClick);
  el = document.querySelector<HTMLElement>('[data-dean]');
  if (!el) return;
  mark = el.querySelector<HTMLElement>('.dean-logo__mark');
  tip = el.querySelector<HTMLElement>('.dean-logo__tip');
  base = (el.dataset.state as DeanState) || 'idle';
  el.addEventListener('click', onClick);
  observer = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible && !engine) whenIdle(() => void load().then(refresh));
    else refresh();
  });
  observer.observe(el);
  if (navigating) {
    navigating = false;
    set(base === 'idle' ? 'done' : base, base === 'idle');
  } else set(base);
  refresh();
}

let started = false;

/** Call once per full page load (the component's script does). Safe to call again. */
export function initDeanLogo() {
  if (started) return;
  started = true;
  const opts = { passive: true } as const;
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'])
    window.addEventListener(type, onInput, opts);
  document.addEventListener('prefs:change', refresh);
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('astro:before-preparation', () => {
    navigating = true;
    if (el) set('thinking');
  });
  document.addEventListener('astro:page-load', bind);
  document.addEventListener('dean:state', (event) => {
    const detail = (event as CustomEvent<{ state: DeanState; once?: boolean }>).detail;
    if (detail?.state) set(detail.state, detail.once);
  });
  // without the ClientRouter there is no astro:page-load
  if (document.readyState !== 'loading') bind();
  else document.addEventListener('DOMContentLoaded', bind, { once: true });
}
