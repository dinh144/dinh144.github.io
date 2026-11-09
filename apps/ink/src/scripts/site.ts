/**
 * Always-on page glue (small, no animation libraries): preferences across navigations,
 * the ink-wipe origin, reading progress, TOC spy, tone-mark split for article headings,
 * interaction sounds, and the lazy hand-off to motion.ts when motion is allowed.
 */
import { applyPrefs, motionAllowed, watchSystemPrefs } from '@blog/core/client/preferences';
import { tick, turn } from '@blog/core/client/sound';
import { splitTone } from '../lib/tone';

watchSystemPrefs();

/* ---------- page-turn origin: the new page spreads from where you clicked ---------- */
let vx = window.innerWidth / 2;
let vy = window.innerHeight * 0.4;
addEventListener(
  'pointerdown',
  (e) => {
    vx = e.clientX;
    vy = e.clientY;
  },
  { capture: true, passive: true },
);
addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Enter') return;
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return;
    const r = el.getBoundingClientRect();
    vx = r.left + r.width / 2;
    vy = r.top + r.height / 2;
  },
  true,
);
function setOrigin() {
  const s = document.documentElement.style;
  s.setProperty('--vt-x', `${Math.round(vx)}px`);
  s.setProperty('--vt-y', `${Math.round(vy)}px`);
}
document.addEventListener('astro:before-preparation', () => {
  setOrigin();
  turn();
});
// ClientRouter swaps <html> attributes on navigation; re-apply the stored preferences.
document.addEventListener('astro:after-swap', () => {
  applyPrefs();
  setOrigin();
});

/* ---------- article headings get the tone-mark split (static until motion plays it) ---------- */
/* ---------- phone TOC folds closed so the prose starts on the first screen ---------- */
function foldToc() {
  const fold = document.querySelector<HTMLDetailsElement>('.toc-fold');
  if (fold && matchMedia('(max-width: 860px)').matches) fold.open = false;
}

function splitHeadings() {
  document.querySelectorAll<HTMLElement>('.prose h2, .prose h3').forEach((h) => {
    if (h.dataset.mode) return;
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.parentElement?.closest('code, .katex')) nodes.push(node);
    }
    for (const node of nodes) {
      const html = splitTone(node.data, 'marks');
      if (html === node.data) continue;
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      node.replaceWith(tpl.content);
    }
    h.classList.add('tone');
    h.dataset.mode = 'marks';
  });
}

/* ---------- reading progress + TOC spy (information, so it runs in every mode) ---------- */
let cleanup: (() => void)[] = [];
function reading() {
  const bar = document.querySelector<HTMLElement>('.progress');
  const body = document.querySelector<HTMLElement>('.post-grid .prose');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
  const heads = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((h): h is HTMLElement => Boolean(h));
  if (!bar && !links.length) return;
  let queued = false;
  let current = -1;
  const update = () => {
    queued = false;
    if (bar && body) {
      const r = body.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.55 - r.top) / Math.max(1, r.height)));
      bar.style.setProperty('--p', p.toFixed(4));
    }
    if (heads.length) {
      let idx = -1;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top < window.innerHeight * 0.3) idx = i;
      });
      if (idx !== current) {
        links[current]?.classList.remove('on');
        links[idx]?.classList.add('on');
        current = idx;
      }
    }
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
  cleanup.push(() => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
  });
}

/* ---------- sounds: soft ticks on list rows (no-ops unless the reader turned sound on) ---------- */
function sounds() {
  document.querySelectorAll<HTMLElement>('.entry, .nav a, .filters a').forEach((el, i) => {
    el.addEventListener('pointerenter', () => tick(0.9 + (i % 5) * 0.06));
  });
}

/* ---------- phone nav: the fade hint disappears once the row is scrolled to its end ---------- */
function navHint() {
  const nav = document.querySelector<HTMLElement>('.nav');
  if (!nav) return;
  const sync = () => nav.classList.toggle('at-end', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4);
  // Keep the current section visible on phones, where the row scrolls.
  const current = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (current && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = Math.max(0, current.offsetLeft + current.offsetWidth - nav.clientWidth + 24);
  }
  nav.addEventListener('scroll', sync, { passive: true });
  sync();
}

/* ---------- motion: loaded only when allowed, torn down when it no longer is ---------- */
type Motion = typeof import('./motion');
let motion: Motion | undefined;
let loading: Promise<Motion> | undefined;
async function syncMotion() {
  if (!motionAllowed()) {
    motion?.stop();
    return;
  }
  loading ??= import('./motion');
  motion = await loading;
  if (motionAllowed()) motion.start();
}

document.addEventListener('astro:page-load', () => {
  splitHeadings();
  foldToc();
  navHint();
  reading();
  sounds();
  void syncMotion();
});
document.addEventListener('prefs:change', () => void syncMotion());
document.addEventListener('astro:before-swap', () => {
  cleanup.forEach((fn) => fn());
  cleanup = [];
  motion?.pageOut();
});
