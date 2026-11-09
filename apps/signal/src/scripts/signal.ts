/**
 * Page lifecycle for the Signal theme. Everything that is plain UI (switches, contents, progress,
 * copy buttons) binds on every page; everything that moves lives in effects.ts, which loads lazily
 * and only while motionAllowed().
 */
import { applyPrefs, motionAllowed, readPrefs, togglePref, watchSystemPrefs } from '@blog/core/client/preferences';
import { tick, turn } from '@blog/core/client/sound';
import { c } from '../lib/copy';
import { applyScreen, currentScreen, setScreen, type Screen } from './screen';

type Effects = typeof import('./effects');
let effects: Effects | undefined;
let effectsLoading: Promise<Effects> | undefined;
const pageCleanup: (() => void)[] = [];

function loadEffects(): Promise<Effects> {
  effectsLoading ??= import('./effects').then((m) => (effects = m));
  return effectsLoading;
}

/* ---------- switches in the status line ---------- */
function syncSwitches() {
  const prefs = readPrefs();
  const screen = currentScreen();
  document.querySelectorAll<HTMLButtonElement>('[data-screen-btn]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.screenBtn === screen));
  });
  document
    .querySelectorAll<HTMLButtonElement>('[data-pref="sound"]')
    .forEach((b) => b.setAttribute('aria-pressed', String(prefs.sound)));
  document
    .querySelectorAll<HTMLButtonElement>('[data-pref="reading"]')
    .forEach((b) => b.setAttribute('aria-pressed', String(prefs.reading)));
}

function bindSwitches() {
  document.querySelectorAll<HTMLButtonElement>('[data-screen-btn]').forEach((b) => {
    b.addEventListener('click', () => {
      setScreen(b.dataset.screenBtn as Screen);
      tick(b.dataset.screenBtn === 'light' ? 1.2 : b.dataset.screenBtn === 'phosphor' ? 0.8 : 1);
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-pref="sound"], [data-pref="reading"]').forEach((b) => {
    b.addEventListener('click', () => {
      togglePref(b.dataset.pref as 'sound' | 'reading');
      tick();
    });
  });
  syncSwitches();
}

/* ---------- reading progress as a block bar ---------- */
function bindProgress() {
  const wrap = document.querySelector<HTMLElement>('[data-progress]');
  const prose = document.querySelector<HTMLElement>('[data-prose]');
  if (!wrap || !prose) return;
  const blocks = wrap.querySelector<HTMLElement>('[data-blocks]')!;
  const pct = wrap.querySelector<HTMLElement>('[data-pct]')!;
  const filled = document.createElement('span');
  const rest = document.createElement('span');
  rest.className = 'rest';
  blocks.replaceChildren(filled, rest);
  let cells = 0;
  let last = -1;
  let raf = 0;
  const measure = () => {
    // 11px JetBrains Mono advances 0.6em per glyph.
    cells = Math.max(4, Math.floor(blocks.clientWidth / 6.6));
    last = -1;
    update();
  };
  const update = () => {
    raf = 0;
    const top = prose.getBoundingClientRect().top + window.scrollY;
    const span = Math.max(1, prose.offsetHeight - window.innerHeight * 0.6);
    const p = Math.min(1, Math.max(0, (window.scrollY - top + window.innerHeight * 0.4) / span));
    const n = Math.round(p * cells);
    if (n !== last) {
      filled.textContent = '█'.repeat(n);
      rest.textContent = '░'.repeat(cells - n);
      last = n;
    }
    pct.textContent = `${Math.round(p * 100)}%`;
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  pageCleanup.push(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', measure);
    cancelAnimationFrame(raf);
  });
}

/* ---------- `$ tree` contents: open on wide screens, follow the reader ---------- */
function bindToc() {
  const toc = document.querySelector<HTMLDetailsElement>('[data-toc]');
  if (!toc) return;
  const wide = matchMedia('(min-width: 1100px)');
  const setOpen = () => {
    if (wide.matches) toc.open = true;
  };
  if (!wide.matches) toc.open = false;
  setOpen();
  wide.addEventListener('change', setOpen);
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const targets = links
    .map((a) => document.getElementById(a.dataset.tocLink!))
    .filter((el): el is HTMLElement => Boolean(el));
  let raf = 0;
  let current = '';
  const update = () => {
    raf = 0;
    let id = '';
    for (const el of targets) if (el.getBoundingClientRect().top < window.innerHeight * 0.3) id = el.id;
    if (id === current) return;
    current = id;
    for (const a of links) {
      if (a.dataset.tocLink === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  links.forEach((a) =>
    a.addEventListener('click', () => {
      if (!wide.matches) toc.open = false;
    }),
  );
  pageCleanup.push(() => {
    window.removeEventListener('scroll', onScroll);
    wide.removeEventListener('change', setOpen);
    cancelAnimationFrame(raf);
  });
}

/* ---------- code blocks: copy button ---------- */
function bindCode() {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'vi';
  const label = { copy: c(locale, 'code.copy'), done: c(locale, 'code.copied') };
  document.querySelectorAll<HTMLPreElement>('.prose pre.astro-code').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-frame')) return;
    const frame = document.createElement('div');
    frame.className = 'code-frame';
    pre.replaceWith(frame);
    frame.appendChild(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = label.copy;
    btn.setAttribute('aria-label', `${label.copy} ${pre.dataset.language ?? ''}`.trim());
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
        btn.textContent = label.done;
        btn.dataset.done = '';
        tick(1.3);
        setTimeout(() => {
          btn.textContent = label.copy;
          delete btn.dataset.done;
        }, 1600);
      } catch {
        /* clipboard blocked: leave the text selectable */
      }
    });
    frame.appendChild(btn);
  });
}

/* ---------- `/` opens search ---------- */
function onKey(e: KeyboardEvent) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable]')) return;
  const input = document.querySelector<HTMLInputElement>('.pagefind-ui__search-input');
  e.preventDefault();
  if (input) return input.focus();
  document.querySelector<HTMLAnchorElement>('[data-search-link]')?.click();
}

/* ---------- Giscus follows the screen ---------- */
function syncGiscus() {
  const frame = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  if (!frame?.contentWindow) return;
  const theme = currentScreen() === 'light' ? 'light' : 'transparent_dark';
  frame.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
}
function watchGiscus() {
  const host = document.querySelector('.giscus-wrap');
  if (!host) return;
  const obs = new MutationObserver(() => {
    const frame = host.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (frame) {
      frame.addEventListener('load', syncGiscus, { once: true });
      obs.disconnect();
    }
  });
  obs.observe(host, { childList: true, subtree: true });
  pageCleanup.push(() => obs.disconnect());
}

/* ---------- effects gate ---------- */
async function startEffects() {
  if (!motionAllowed()) return;
  const fx = await loadEffects();
  if (motionAllowed()) fx.start();
}
function stopEffects() {
  effects?.stop();
}

/* ---------- narrow screens: keep the current section visible in the scrolling nav ---------- */
function revealCurrentNav() {
  const nav = document.querySelector<HTMLElement>('.site-header .nav');
  const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
  nav.scrollLeft = Math.max(0, current.offsetLeft - nav.clientWidth / 2 + current.offsetWidth / 2);
}

function onPageLoad() {
  applyScreen();
  revealCurrentNav();
  bindSwitches();
  bindProgress();
  bindToc();
  bindCode();
  watchGiscus();
  void startEffects();
}

function onBeforeSwap() {
  stopEffects();
  while (pageCleanup.length) pageCleanup.pop()!();
}

let lastMotion = document.documentElement.dataset.motion;
document.addEventListener('prefs:change', () => {
  applyScreen();
  syncSwitches();
  syncGiscus();
  effects?.repaint();
  const motion = document.documentElement.dataset.motion;
  if (motion !== lastMotion) {
    lastMotion = motion;
    if (motionAllowed()) void startEffects();
    else stopEffects();
  }
});

document.addEventListener('astro:before-preparation', () => {
  if (motionAllowed()) turn();
});
document.addEventListener('astro:after-swap', () => {
  // ClientRouter replaces <html> attributes with the new page's; restore the reader's preferences.
  applyPrefs();
  applyScreen();
  lastMotion = document.documentElement.dataset.motion;
  if (motionAllowed()) {
    const sweep = document.querySelector('.sweep');
    sweep?.classList.remove('run');
    requestAnimationFrame(() => sweep?.classList.add('run'));
  }
});
document.addEventListener('astro:page-load', onPageLoad);
document.addEventListener('astro:before-swap', onBeforeSwap);
document.addEventListener('keydown', onKey);
watchSystemPrefs();
