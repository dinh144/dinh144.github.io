/**
 * Motion layer, imported only when motionAllowed(): Lenis smooth scroll, the GSAP scroll
 * choreography (ink-wash reveals, inked rules, tone-mark drops), and the WebGL ink field.
 * start() is idempotent per page; pageOut() runs before each navigation swap; stop()
 * tears everything down when motion becomes `reduce` (reading mode or the OS setting).
 */
import { drop } from '@blog/core/client/sound';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { InkField, InkTheme } from './ink-field';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | undefined;
let ctx: gsap.Context | undefined;
let pageBody: HTMLElement | undefined;
let field: InkField | undefined;
let fieldPromise: Promise<void> | undefined;
let fieldFailed = false;
let canvas: HTMLCanvasElement | undefined;
let listening = false;
let timers: number[] = [];
let resistEls: HTMLElement[] = [];
let lastScroll = window.scrollY;
let lastInput = performance.now();

const page = () => (document.documentElement.dataset.page ?? 'page') as 'home' | 'post' | 'list' | 'page';
const coarse = () => matchMedia('(pointer: coarse)').matches;

function theme(): InkTheme {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark
    ? { ink: '#efe6da', accent: '#ec7a84', strength: 0.5 }
    : { ink: '#221d1b', accent: '#a50e1a', strength: 0.9 };
}

/* ---------------- ink field ---------------- */
function ensureField() {
  if (field || fieldPromise || fieldFailed) return;
  const stage = document.getElementById('ink-stage');
  if (!stage) return;
  // Text first: wait for an idle moment before pulling in Three.js.
  fieldPromise = new Promise<void>((resolve) => {
    const go = () => resolve();
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 900 });
    else setTimeout(go, 300);
  })
    .then(() => import('./ink-field'))
    .then(({ createInkField }) => {
      if (!document.documentElement.dataset.motion || document.documentElement.dataset.motion === 'reduce') return;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      stage.append(canvas);
      field = createInkField(canvas, theme()) ?? undefined;
      if (!field) {
        // No usable WebGL: show the baked still instead.
        fieldFailed = true;
        document.documentElement.dataset.ink = 'off';
        canvas.remove();
        canvas = undefined;
        return;
      }
      requestAnimationFrame(() => canvas?.classList.add('on'));
      arrive();
    })
    .catch(() => undefined)
    .finally(() => {
      fieldPromise = undefined;
    });
}

function collectResist() {
  resistEls = [...document.querySelectorAll<HTMLElement>('[data-resist], .stream .entry-body, .stream .entry-side')];
  updateResist();
}
function updateResist() {
  if (!field) return;
  const vh = window.innerHeight;
  // Tight text bounds (a Range over the contents), not the full-width grid cell.
  const range = document.createRange();
  const rects = resistEls
    .map((el) => {
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    })
    .filter((r) => r.bottom > -40 && r.top < vh + 40 && r.width > 0)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 12);
  field.setResist(rects);
}

/** Composition drops as a page arrives: the still frame each page settles into. */
function arrive() {
  if (!field) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const phone = w < 700;
  const kind = page();
  field.setTrail(kind === 'home' ? 1 : kind === 'post' ? 0.4 : 0.75);
  collectResist();
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  if (kind === 'home') {
    if (phone) {
      at(250, () => field?.bloom(w * 0.86, h * 0.16, { size: 1.9 }));
      at(900, () => field?.bloom(w * 0.12, h * 0.9, { size: 1.6, accent: 1, amount: 0.8 }));
      at(1600, () => field?.bloom(w * 0.74, h * 0.97, { size: 1.5, amount: 0.7 }));
    } else {
      at(250, () => field?.bloom(w * 0.8, h * 0.3, { size: 2.8 }));
      at(900, () => field?.bloom(w * 0.93, h * 0.64, { size: 1.7, accent: 1, amount: 0.9 }));
      at(1600, () => field?.bloom(w * 0.66, h * 0.9, { size: 2.2, amount: 0.8 }));
    }
  } else if (kind === 'post') {
    at(350, () =>
      field?.bloom(phone ? w * 0.94 : w * 0.9, phone ? h * 0.08 : h * 0.24, { size: phone ? 1.2 : 2.1, amount: 0.8 }),
    );
    if (!phone) at(1100, () => field?.bloom(w * 0.96, h * 0.42, { size: 1, accent: 1, amount: 0.7 }));
  } else {
    at(300, () => field?.bloom(phone ? w * 0.9 : w * 0.84, phone ? h * 0.1 : h * 0.26, { size: phone ? 1.4 : 2.4 }));
    at(1000, () =>
      field?.bloom(phone ? w * 0.98 : w * 0.95, phone ? h * 0.3 : h * 0.52, { size: 1.1, accent: 1, amount: 0.8 }),
    );
  }
  // Ambient drops while the reader rests (not on articles: the reading column stays calm).
  if (kind !== 'post') {
    timers.push(
      window.setInterval(() => {
        if (!field || document.hidden || performance.now() - lastInput < 5000) return;
        const x = w * (0.55 + Math.random() * 0.43);
        const y = h * (0.1 + Math.random() * 0.8);
        field.bloom(x, y, { size: 0.9 + Math.random() * 1.1, amount: 0.55, accent: Math.random() < 0.18 ? 1 : 0 });
      }, 8500),
    );
  }
}

/* ---------------- global input → ink ---------------- */
let px = -1;
let py = -1;
function onPointerMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  lastInput = performance.now();
  if (px >= 0) field?.stir(e.clientX, e.clientY, e.clientX - px, e.clientY - py);
  px = e.clientX;
  py = e.clientY;
}
let tx = -1;
let ty = -1;
function onTouchMove(e: TouchEvent) {
  const t = e.touches[0];
  if (!t) return;
  lastInput = performance.now();
  if (tx >= 0) field?.stir(t.clientX, t.clientY, (t.clientX - tx) * 0.6, (t.clientY - ty) * 0.6);
  tx = t.clientX;
  ty = t.clientY;
}
function onTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  if (!t) return;
  tx = t.clientX;
  ty = t.clientY;
}
function onPointerDown(e: PointerEvent) {
  lastInput = performance.now();
  if (!field) return;
  const target = e.target instanceof Element ? e.target : null;
  const accent = target?.closest('.seal, .no, [data-accent]') ? 1 : Math.random() < 0.16 ? 1 : 0;
  field.bloom(e.clientX, e.clientY, { size: coarse() ? 0.9 : 1.05, accent, amount: page() === 'post' ? 0.7 : 1 });
  drop();
}
function onScroll() {
  const y = window.scrollY;
  const dy = y - lastScroll;
  lastScroll = y;
  if (dy) field?.scroll(dy);
  updateResist();
}
function onResize() {
  updateResist();
}
function onPrefs() {
  field?.setTheme(theme());
}
function listen(on: boolean) {
  if (on === listening) return;
  listening = on;
  const m = on ? 'addEventListener' : 'removeEventListener';
  window[m]('pointermove', onPointerMove as EventListener, { passive: true } as AddEventListenerOptions);
  window[m]('pointerdown', onPointerDown as EventListener, { passive: true } as AddEventListenerOptions);
  window[m]('touchstart', onTouchStart as EventListener, { passive: true } as AddEventListenerOptions);
  window[m]('touchmove', onTouchMove as EventListener, { passive: true } as AddEventListenerOptions);
  window[m]('scroll', onScroll, { passive: true } as AddEventListenerOptions);
  window[m]('resize', onResize, { passive: true } as AddEventListenerOptions);
  document[m]('prefs:change', onPrefs);
}

/* ---------------- per-page choreography ---------------- */
function lenisRaf(time: number) {
  lenis?.raf(time * 1000);
}
function setupPage() {
  lastScroll = window.scrollY;
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -24 }, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);

  ctx = gsap.context(() => {
    const vh = window.innerHeight;

    // List rows below the fold: an ink wash sweeps them in, the rule is inked, marks fall.
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.94) return;
      const tone = el.querySelector<HTMLElement>('.tone');
      const rule = el.querySelector<HTMLElement>('.ink-rule');
      const no = el.querySelector<HTMLElement>('.entry-no');
      tone?.setAttribute('data-tone', 'wait');
      el.classList.add('washing');
      el.style.setProperty('--wash', '100%');
      if (rule) gsap.set(rule, { clipPath: 'inset(0 100% 0 0)' });
      if (no) gsap.set(no, { opacity: 0, y: -14 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            '--wash': '0%',
            duration: 1.35,
            ease: 'power2.out',
            onComplete: () => {
              el.classList.remove('washing');
              el.style.removeProperty('--wash');
            },
          });
          tone?.setAttribute('data-tone', 'play');
          if (rule) gsap.to(rule, { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'power3.inOut', delay: 0.1 });
          if (no) gsap.to(no, { opacity: 1, y: 0, duration: 0.9, ease: 'back.out(2.2)', delay: 0.25 });
        },
      });
    });

    // Article headings settle with the tone-mark drop as they arrive.
    gsap.utils.toArray<HTMLElement>('.prose .tone').forEach((h) => {
      if (h.getBoundingClientRect().top < vh * 0.9) return;
      h.setAttribute('data-tone', 'wait');
      ScrollTrigger.create({
        trigger: h,
        start: 'top 97%',
        once: true,
        onEnter: () => h.setAttribute('data-tone', 'play'),
      });
    });

    // Hero: the title lifts off the paper a little slower than the page.
    const hero = document.querySelector('.hero');
    if (hero) {
      gsap.to('.hero-title', {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-tagline, .hero-scroll', {
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '60% top', scrub: true },
      });
    }

  });
  ScrollTrigger.refresh();
}

/** Called before each navigation swap: drop page-level choreography, keep the ink field. */
export function pageOut() {
  timers.forEach((t) => {
    clearTimeout(t);
    clearInterval(t);
  });
  timers = [];
  ctx?.revert();
  ctx = undefined;
  gsap.ticker.remove(lenisRaf);
  lenis?.destroy();
  lenis = undefined;
  pageBody = undefined;
  field?.wash(0.5);
}

export function start() {
  listen(true);
  if (fieldFailed) document.documentElement.dataset.ink = 'off';
  if (pageBody !== document.body) {
    if (pageBody) pageOut();
    pageBody = document.body;
    setupPage();
    if (field) {
      field.setTheme(theme());
      arrive();
    }
  }
  ensureField();
}

export function stop() {
  pageOut();
  listen(false);
  document.querySelectorAll('.washing').forEach((el) => el.classList.remove('washing'));
  document.querySelectorAll('[data-tone="wait"]').forEach((el) => el.removeAttribute('data-tone'));
  field?.destroy();
  field = undefined;
  canvas?.remove();
  canvas = undefined;
}
