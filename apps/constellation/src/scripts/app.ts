/**
 * Always-on client code (small): preference toggles, chart hover state, the table-of-contents
 * tracker, and the motion gate. Heavy code (GSAP, Lenis, Three.js) lives in motion.ts and is only
 * imported when `motionAllowed()`; it is torn down again when motion becomes `reduce`.
 */
import {
  applyPrefs,
  motionAllowed,
  readPrefs,
  toggleTheme,
  togglePref,
  watchSystemPrefs,
} from '@blog/core/client/preferences';
import { tick } from '@blog/core/client/sound';

type Motion = typeof import('./motion');
let motion: Motion | undefined;
let motionLoading: Promise<Motion> | undefined;

/* ---------- preference buttons ---------- */
function syncPrefButtons() {
  const prefs = readPrefs();
  document
    .querySelectorAll<HTMLButtonElement>('[data-pref="sound"]')
    .forEach((b) => b.setAttribute('aria-pressed', String(prefs.sound)));
  document
    .querySelectorAll<HTMLButtonElement>('[data-pref="reading"]')
    .forEach((b) => b.setAttribute('aria-pressed', String(prefs.reading)));
}

function bindPrefs() {
  document.querySelectorAll<HTMLButtonElement>('[data-pref]').forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      const kind = button.dataset.pref;
      // switch themes without every colour transition firing at once
      if (kind === 'theme') {
        const root = document.documentElement;
        root.classList.add('no-transitions');
        toggleTheme();
        void root.offsetWidth;
        requestAnimationFrame(() => root.classList.remove('no-transitions'));
      }
      if (kind === 'sound' || kind === 'reading') togglePref(kind);
      syncPrefButtons();
      tick();
    });
  });
  syncPrefButtons();
}

/* ---------- chart hover: light a star, its lines and its neighbours ---------- */
function bindStages() {
  document.querySelectorAll<HTMLElement>('[data-stage]').forEach((stage) => {
    if (stage.dataset.bound) return;
    stage.dataset.bound = '1';
    const stars = [...stage.querySelectorAll<HTMLElement>('.star')];
    const edges = [...stage.querySelectorAll<SVGElement>('.edge')];
    const anchors = [...stage.querySelectorAll<HTMLElement>('.anchor')];

    const light = (slugs: string[] | null, anchorId?: string) => {
      const set = new Set(slugs ?? []);
      const near = new Set<string>();
      if (slugs && !anchorId) {
        for (const e of edges) {
          const { a = '', b = '' } = e.dataset;
          if (set.has(a)) near.add(b);
          if (set.has(b)) near.add(a);
        }
      }
      stage.classList.toggle('has-hot', Boolean(slugs));
      for (const s of stars) {
        const slug = s.dataset.slug ?? '';
        s.classList.toggle('is-hot', set.has(slug));
        s.classList.toggle('is-near', near.has(slug) && !set.has(slug));
      }
      for (const e of edges) {
        const { a = '', b = '' } = e.dataset;
        const on = anchorId ? set.has(a) && set.has(b) : set.has(a) || set.has(b);
        e.classList.toggle('is-hot', Boolean(slugs) && on);
      }
      for (const a of anchors) {
        const members = (a.dataset.members ?? '').split(' ');
        a.classList.toggle('is-hot', a.dataset.anchor === anchorId || members.some((m) => set.has(m)));
      }
    };

    for (const s of stars) {
      const on = () => {
        light([s.dataset.slug ?? '']);
        tick(0.7 + Number(s.dataset.mag ?? 0.3) * 0.8);
      };
      s.addEventListener('pointerenter', on);
      s.addEventListener('focus', on);
      s.addEventListener('pointerleave', () => light(null));
      s.addEventListener('blur', () => light(null));
    }
    for (const a of anchors) {
      a.addEventListener('pointerenter', () => light((a.dataset.members ?? '').split(' '), a.dataset.anchor));
      a.addEventListener('pointerleave', () => light(null));
    }
  });

  // Hovering a catalogue entry lights its star on the chart above (when it is on screen).
  document.querySelectorAll<HTMLElement>('.entry[data-slug]').forEach((entry) => {
    if (entry.dataset.bound) return;
    entry.dataset.bound = '1';
    const slug = entry.dataset.slug ?? '';
    const stars = () => document.querySelectorAll<HTMLElement>(`.star[data-slug="${CSS.escape(slug)}"]`);
    entry.addEventListener('pointerenter', () =>
      stars().forEach((s) => {
        s.classList.add('is-hot');
        s.closest('[data-stage]')?.classList.add('has-hot');
      }),
    );
    entry.addEventListener('pointerleave', () =>
      stars().forEach((s) => {
        s.classList.remove('is-hot');
        s.closest('[data-stage]')?.classList.remove('has-hot');
      }),
    );
  });
}

/* ---------- table of contents: mark the section being read ---------- */
let tocObserver: IntersectionObserver | undefined;
function bindToc() {
  tocObserver?.disconnect();
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const visible = new Set<string>();
  const mark = () => {
    const first = headings.find((h) => visible.has(h.id)) ?? null;
    let current = first;
    if (!current) {
      // nothing in the band: the last heading above the viewport is the current section
      current = [...headings].reverse().find((h) => h.getBoundingClientRect().top < 120) ?? null;
    }
    for (const [id, a] of byId) {
      const on = current?.id === id;
      a.parentElement?.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  tocObserver = new IntersectionObserver(
    (items) => {
      for (const item of items) {
        if (item.isIntersecting) visible.add(item.target.id);
        else visible.delete(item.target.id);
      }
      mark();
    },
    { rootMargin: '-80px 0px -55% 0px' },
  );
  headings.forEach((h) => tocObserver?.observe(h));
}

/* ---------- motion gate ---------- */
async function syncMotion(isPageLoad: boolean) {
  if (motionAllowed()) {
    motionLoading ??= import('./motion');
    motion = await motionLoading;
    if (!motionAllowed()) return motion.stop();
    const fresh = motion.start();
    if (isPageLoad || fresh) motion.page();
  } else {
    motion?.stop();
  }
}

document.addEventListener('astro:page-load', () => {
  bindPrefs();
  bindStages();
  bindToc();
  void syncMotion(true);
});
// ClientRouter swaps <html> attributes on navigation; re-apply the stored preferences.
document.addEventListener('astro:after-swap', () => applyPrefs());
document.addEventListener('prefs:change', () => {
  syncPrefButtons();
  void syncMotion(false);
});
watchSystemPrefs();
