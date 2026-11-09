/**
 * Always-on, lightweight page behaviour (works with motion reduced too):
 * reading playhead, section rail, TOC highlight, mobile TOC, Giscus theme, sounds, the tempo button.
 * The heavy motion layer (Lenis, GSAP, the kinetic type) is imported lazily, only when motion is allowed.
 */
import { motionAllowed, resolvedTheme } from '@blog/core/client/preferences';
import { tick, turn } from '@blog/core/client/sound';
import { isPaused, setPaused } from './tempo-state';

type MotionModule = typeof import('./motion');
let motion: MotionModule | undefined;
let loading: Promise<MotionModule> | undefined;
let cleanups: (() => void)[] = [];

async function ensureMotion() {
  if (!motionAllowed()) return;
  loading ??= import('./motion');
  motion = await loading;
  // Preferences may have changed while the chunk was loading.
  if (!motionAllowed()) return;
  await motion.start();
}

function syncMotion() {
  if (motionAllowed()) void ensureMotion();
  else motion?.stop();
}

/* ---------- reading playhead, section rail, TOC highlight ---------- */
function readingProgress() {
  const prose = document.querySelector<HTMLElement>('[data-prose]');
  const fill = document.querySelector<HTMLElement>('.playhead-fill');
  if (!prose) return;
  const heads = [...prose.querySelectorAll<HTMLElement>('h2[id], h3[id]')];
  const sections = heads.filter((h) => h.tagName === 'H2');
  const railNo = document.querySelector<HTMLElement>('[data-rail-no]');
  const railName = document.querySelector<HTMLElement>('[data-rail-name]');
  const links = new Map(
    [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')].map((a) => [a.dataset.tocLink!, a]),
  );
  let frame = 0;
  let lastActive = '';
  let lastSection = -1;

  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    const rect = prose.getBoundingClientRect();
    const total = Math.max(1, rect.height - vh * 0.6);
    const progress = Math.min(1, Math.max(0, (vh * 0.4 - rect.top) / total));
    if (fill) fill.style.transform = `scaleX(${progress.toFixed(4)})`;

    const line = vh * 0.3;
    let active: HTMLElement | undefined;
    for (const h of heads) if (h.getBoundingClientRect().top <= line) active = h;
    const id = active?.id ?? '';
    if (id !== lastActive) {
      lastActive = id;
      links.forEach((a, key) =>
        key === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'),
      );
    }
    let s = 0;
    sections.forEach((h, i) => {
      if (h.getBoundingClientRect().top <= line) s = i;
    });
    if (s !== lastSection && railNo && railName && sections[s]) {
      lastSection = s;
      railNo.textContent = String(s + 1).padStart(2, '0');
      railName.textContent = headingText(sections[s]);
      railNo.parentElement?.parentElement?.classList.remove('is-ticked');
      void railNo.offsetWidth;
      railNo.parentElement?.parentElement?.classList.add('is-ticked');
    }
  };
  const onScroll = () => {
    frame ||= requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  cleanups.push(() => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
}

/** Heading text without the hidden copy that line locking adds. */
function headingText(h: HTMLElement) {
  return (h.querySelector('.sr-only') ?? h).textContent?.trim() ?? '';
}

/** On narrow screens the contents start folded so the article opens on its first paragraph. */
function foldToc() {
  const toc = document.querySelector<HTMLDetailsElement>('[data-toc]');
  if (toc && matchMedia('(max-width: 1023px)').matches) toc.open = false;
}

/* ---------- Giscus follows the site theme, not only the OS ---------- */
function giscusTheme() {
  const send = () => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: resolvedTheme() === 'dark' ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app',
    );
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin === 'https://giscus.app') send();
  };
  window.addEventListener('message', onMessage);
  document.addEventListener('prefs:change', send);
  cleanups.push(() => {
    window.removeEventListener('message', onMessage);
    document.removeEventListener('prefs:change', send);
  });
}

/* ---------- tempo button ---------- */
function bindMetronome() {
  const button = document.querySelector<HTMLButtonElement>('[data-metro]');
  if (!button) return;
  const sync = () => button.setAttribute('aria-pressed', String(isPaused()));
  sync();
  if (button.dataset.bound) return;
  button.dataset.bound = '1';
  button.addEventListener('click', () => {
    setPaused(!isPaused());
    sync();
    motion?.setPaused(isPaused());
    tick(isPaused() ? 0.7 : 1.3);
  });
}

/* ---------- sound: a pitched tick per score row, a page turn per navigation ---------- */
const SCALE = [1, 1.125, 1.25, 1.5, 1.667, 2];
function scoreSounds() {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-score] > li')];
  const handlers = rows.map((row, i) => {
    const play = () => tick(SCALE[i % SCALE.length] * (i >= SCALE.length ? 0.5 : 1));
    row.addEventListener('pointerenter', play);
    return () => row.removeEventListener('pointerenter', play);
  });
  cleanups.push(...handlers);
}

export function boot() {
  document.documentElement.dataset.tempo = isPaused() ? 'paused' : 'playing';
  document.addEventListener('astro:page-load', () => {
    document.documentElement.dataset.tempo = isPaused() ? 'paused' : 'playing';
    readingProgress();
    foldToc();
    giscusTheme();
    bindMetronome();
    scoreSounds();
    syncMotion();
    motion?.mountPage();
  });
  document.addEventListener('astro:before-preparation', () => turn());
  // Client-side navigation: hand focus to the new page's heading so keyboard and screen-reader users start there.
  document.addEventListener('astro:after-swap', () => {
    if (location.hash) return;
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  });
  document.addEventListener('astro:before-swap', () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    motion?.unmountPage();
  });
  document.addEventListener('prefs:change', syncMotion);
}
