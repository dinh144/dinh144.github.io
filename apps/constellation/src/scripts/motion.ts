/**
 * Everything that moves, loaded only when motion is allowed (see app.ts):
 * Lenis smooth scroll, GSAP + ScrollTrigger page choreography, the WebGL sky (lazy) and the
 * fly-to-star transition. `start()` / `stop()` are idempotent; `stop()` leaves a static page.
 */
import { drop, turn } from '@blog/core/client/sound';
import { navigate } from 'astro:transitions/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { SkyScene } from './sky/scene';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
let running = false;
let lenis: Lenis | undefined;
let scene: SkyScene | null = null;
let sceneLoading: Promise<void> | undefined;
let ctx: gsap.Context | undefined;
let landingSlug: string | undefined;
let flying = false;

const raf = (time: number) => lenis?.raf(time * 1000);

function loadScene() {
  if (scene || sceneLoading) return sceneLoading;
  const canvas = document.querySelector<HTMLCanvasElement>('.sky-canvas');
  if (!canvas) return;
  sceneLoading = import('./sky/scene')
    .then(({ createScene }) => {
      if (!running) return;
      scene = createScene(canvas);
      scene?.attach();
      if (landingSlug) scene?.land(landingSlug);
    })
    .catch(() => {
      /* no WebGL: the static chart stays */
    })
    .finally(() => {
      sceneLoading = undefined;
    });
  return sceneLoading;
}

/** Returns true when motion was off and has just been switched on. */
export function start(): boolean {
  if (running) return false;
  running = true;
  lenis = new Lenis({ autoRaf: false, lerp: 0.11, anchors: { offset: -96 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  root.classList.add('lights');
  document.addEventListener('click', onClick, true);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwap);
  document.addEventListener('prefs:change', onPrefs);
  // let text and the static chart paint first, then bring in WebGL
  const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 200));
  idle(() => void loadScene(), { timeout: 600 });
  return true;
}

export function stop() {
  if (!running) return;
  running = false;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('astro:before-swap', onBeforeSwap);
  document.removeEventListener('astro:after-swap', onAfterSwap);
  document.removeEventListener('prefs:change', onPrefs);
  ctx?.revert();
  ctx = undefined;
  ScrollTrigger.getAll().forEach((t) => t.kill());
  gsap.ticker.remove(raf);
  lenis?.destroy();
  lenis = undefined;
  scene?.dispose();
  scene = null;
  root.classList.remove('lights');
  root.style.removeProperty('--sky-opacity');
  resetWarp();
  document.querySelectorAll('.entry.is-lit').forEach((el) => el.classList.remove('is-lit'));
}

function onPrefs() {
  scene?.setTheme();
}

// ClientRouter copies the new document's <html> attributes over ours: put our state classes back.
function onAfterSwap() {
  root.classList.add('lights', 'lenis');
  if (scene) root.classList.add('sky-live');
}

function onBeforeSwap() {
  ctx?.revert();
  ctx = undefined;
  ScrollTrigger.getAll().forEach((t) => t.kill());
  lenis?.stop();
}

/** Called on every astro:page-load while running. */
export function page() {
  if (!running) return;
  lenis?.start();
  lenis?.resize();
  root.style.removeProperty('--sky-opacity');
  scene?.attach();
  ctx?.revert();
  ctx = gsap.context(build);
  if (landingSlug) land(landingSlug);
  else resetWarp();
  ScrollTrigger.refresh();
}

function build() {
  const pageKind = document.body.dataset.page;

  // Catalogue entries: each star lights as it rises into view (text is never hidden).
  const entries = [...document.querySelectorAll<HTMLElement>('.entry')];
  let io: IntersectionObserver | undefined;
  if (entries.length) {
    io = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (item.isIntersecting) {
            item.target.classList.add('is-lit');
            io?.unobserve(item.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    entries.forEach((el) => io?.observe(el));
  }

  // A telescope on a mount: the framed sky leans a few pixels toward the pointer.
  let onMove: ((e: PointerEvent) => void) | undefined;
  const lean = [...document.querySelectorAll<HTMLElement>('.hero > .sky-stage, .plate-sky, .lost > .sky-stage')];
  if (lean.length && matchMedia('(hover: hover)').matches) {
    const movers = lean.map((el) => ({
      x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3' }),
    }));
    onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      for (const m of movers) {
        m.x(nx * -16);
        m.y(ny * -10);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  if (pageKind === 'home') {
    const stage = document.querySelector('.hero > .sky-stage');
    if (stage) {
      // the chart sinks slower than the page (depth) and its ink fades before the copy can cross it
      gsap.to(stage, {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.fromTo(
        stage,
        { '--fade': 1 },
        {
          '--fade': 0,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: '22% top', scrub: true },
        },
      );
    }
  }

  // Article: the sky recedes while you read, so the column stays calm.
  if (pageKind === 'article' || pageKind === 'about') {
    const body = document.querySelector('.article-grid');
    const foot = document.querySelector('.nearby, .article-foot');
    if (body) {
      // dim while reading the column, brighten again at the neighbouring-stars map
      let dim = 0;
      let wake = 0;
      const apply = () => root.style.setProperty('--sky-opacity', String(1 - 0.8 * dim * (1 - wake)));
      ScrollTrigger.create({
        trigger: body,
        start: 'top 75%',
        end: 'top 5%',
        scrub: true,
        onUpdate: (self) => {
          dim = self.progress;
          apply();
        },
      });
      if (foot) {
        ScrollTrigger.create({
          trigger: foot,
          start: 'top 95%',
          end: 'top 45%',
          scrub: true,
          onUpdate: (self) => {
            wake = self.progress;
            apply();
          },
        });
      }
    }
  }

  // Plates: the framed sky eases up slower than the page (a little depth).
  document.querySelectorAll('.plate-sky, .article-sky').forEach((el) => {
    gsap.to(el, {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top top+=80', end: 'bottom top', scrub: true },
    });
  });

  return () => {
    io?.disconnect();
    if (onMove) window.removeEventListener('pointermove', onMove);
  };
}

/* ---------- fly to a star ---------- */
const warpEl = () => document.querySelector<HTMLElement>('.warp');

function resetWarp() {
  const el = warpEl();
  if (!el) return;
  gsap.killTweensOf(el);
  el.style.visibility = 'hidden';
  el.style.setProperty('--wr', '0px');
}

function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function findDot(slug: string): Element | null {
  for (const dot of document.querySelectorAll(`.star[data-slug="${CSS.escape(slug)}"] .star-dot`)) {
    const r = dot.getBoundingClientRect();
    if (r.width && r.bottom > 0 && r.top < window.innerHeight) return dot;
  }
  return null;
}

function onClick(e: MouseEvent) {
  if (flying || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a.star, a[data-star]');
  if (!link || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  const slug = link.dataset.slug ?? link.dataset.star;
  if (!slug) return;
  e.preventDefault();
  e.stopPropagation();
  flyTo(url.href, slug, link, e);
}

function flyTo(href: string, slug: string, link: Element, e: MouseEvent) {
  flying = true;
  const dot = link.matches('.star') ? link.querySelector('.star-dot') : findDot(slug);
  const origin = dot ? centerOf(dot) : e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : centerOf(link);
  const stage = dot?.closest<HTMLElement>('[data-stage]');
  stage?.classList.add('is-flying');
  if (stage) {
    // the telescope dives: the whole chart scales out from the chosen star
    const r = stage.getBoundingClientRect();
    gsap.to(stage, {
      scale: 3.2,
      transformOrigin: `${origin.x - r.left}px ${origin.y - r.top}px`,
      duration: 1,
      ease: 'expo.in',
    });
  }
  scene?.fly(slug);
  turn();
  const el = warpEl();
  const max = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
  const go = () => {
    landingSlug = slug;
    flying = false;
    void navigate(href);
  };
  if (!el) return go();
  gsap.killTweensOf(el);
  el.style.setProperty('--wx', `${origin.x}px`);
  el.style.setProperty('--wy', `${origin.y}px`);
  el.style.visibility = 'visible';
  const state = { r: 0 };
  gsap.to(state, {
    r: max,
    duration: 0.95,
    ease: 'expo.in',
    onUpdate: () => el.style.setProperty('--wr', `${state.r}px`),
    onComplete: go,
  });
}

function land(slug: string) {
  landingSlug = undefined;
  const el = warpEl();
  scene?.land(slug);
  drop();
  if (!el || el.style.visibility !== 'visible') return;
  const dot = findDot(slug);
  const target = dot ? centerOf(dot) : { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
  const state = {
    r: Math.hypot(window.innerWidth, window.innerHeight) * 1.15,
    x: parseFloat(el.style.getPropertyValue('--wx')) || target.x,
    y: parseFloat(el.style.getPropertyValue('--wy')) || target.y,
  };
  gsap.to(state, {
    r: 0,
    x: target.x,
    y: target.y,
    duration: 1.15,
    ease: 'expo.out',
    onUpdate: () => {
      el.style.setProperty('--wr', `${state.r}px`);
      el.style.setProperty('--wx', `${state.x}px`);
      el.style.setProperty('--wy', `${state.y}px`);
    },
    onComplete: resetWarp,
  });
  // the title settles in as the star contracts
  const head = document.querySelector('.article-head-copy');
  if (head) {
    gsap.from(head.children, {
      y: 14,
      filter: 'blur(4px)',
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.08,
      delay: 0.15,
      clearProps: 'filter,transform',
    });
  }
}
