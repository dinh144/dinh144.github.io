/**
 * Always-on client code (small): preference toggles, chart hover state, the table-of-contents
 * tracker, and the motion gate. Heavy code (GSAP, Lenis, Three.js) lives in motion.ts and is only
 * imported when `motionAllowed()`; it is torn down again when motion becomes `reduce`.
 */
import {
  applyPrefs,
  motionAllowed,
  readPrefs,
  setPref,
  togglePref,
  watchSystemPrefs,
} from '@blog/core/client/preferences';
import { tick } from '@blog/core/client/sound';

type Motion = typeof import('./motion');
let motion: Motion | undefined;
let motionLoading: Promise<Motion> | undefined;

/* ---------- preferences: the night sky is the default; dawn only when chosen ---------- */
function applyLocalPrefs() {
  applyPrefs();
  if (readPrefs().theme === 'system') document.documentElement.dataset.theme = 'dark';
}

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
        setPref('theme', root.dataset.theme === 'dark' ? 'light' : 'dark');
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

/* ---------- chart: hover / tap to light a star, its lines and its neighbours ---------- */
type Light = (slugs: string[] | null, anchorId?: string) => void;
const lights = new WeakMap<HTMLElement, Light>();
/** The star a touch user previewed with a first tap; a second tap on it follows the link. */
let armed: HTMLElement | null = null;
let lastPointer = 'mouse';

function bindStages() {
  document.querySelectorAll<HTMLElement>('[data-stage]').forEach((stage) => {
    if (stage.dataset.bound) return;
    stage.dataset.bound = '1';
    const stars = [...stage.querySelectorAll<HTMLElement>('.star')];
    const edges = [...stage.querySelectorAll<SVGElement>('.edge')];
    const anchors = [...stage.querySelectorAll<HTMLElement>('.anchor')];

    const light: Light = (slugs, anchorId) => {
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

    lights.set(stage, light);

    // Touch has no hover: a tap previews (see onTapCapture), so ignore its synthetic enter / leave.
    const mouse = (e: PointerEvent) => e.pointerType !== 'touch';
    for (const s of stars) {
      const on = () => {
        light([s.dataset.slug ?? '']);
        tick(0.7 + Number(s.dataset.mag ?? 0.3) * 0.8);
      };
      s.addEventListener('pointerenter', (e) => mouse(e) && on());
      s.addEventListener('focus', on);
      s.addEventListener('pointerleave', (e) => mouse(e) && !armed && light(null));
      s.addEventListener('blur', () => !armed && light(null));
    }
    for (const a of anchors) {
      a.addEventListener(
        'pointerenter',
        (e) => mouse(e) && light((a.dataset.members ?? '').split(' '), a.dataset.anchor),
      );
      a.addEventListener('pointerleave', (e) => mouse(e) && light(null));
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

function disarm() {
  if (!armed) return;
  const stage = armed.closest<HTMLElement>('[data-stage]');
  armed = null;
  if (stage) lights.get(stage)?.(null);
}

/**
 * Touch: the first tap on a star previews it (title, lines and neighbours light up), the second tap
 * on the same star follows the link (and flies, when motion is on). Registered before motion.ts's
 * click handler, so a preview tap never starts a flight. A tap anywhere else clears the preview.
 */
function onTapCapture(e: MouseEvent) {
  const star = (e.target as Element | null)?.closest<HTMLElement>('[data-stage] a.star');
  if (lastPointer !== 'touch' || !star) {
    if (lastPointer === 'touch') disarm();
    return;
  }
  if (armed === star) {
    armed = null;
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  disarm();
  const stage = star.closest<HTMLElement>('[data-stage]');
  if (!stage) return;
  armed = star;
  lights.get(stage)?.([star.dataset.slug ?? '']);
  tick(0.7 + Number(star.dataset.mag ?? 0.3) * 0.8);
}
document.addEventListener('pointerdown', (e) => (lastPointer = e.pointerType || 'mouse'), {
  capture: true,
  passive: true,
});
document.addEventListener('click', onTapCapture, true);

/* ---------- chart labels: keep every standing label clear of text, other labels and stars ---------- */
/*
 * The layout is solved at build time (lib/sky.ts) for three reference stages. Real stages differ
 * (window size, font metrics), so after layout each label is checked against the page text that shares
 * its pixels, the labels already placed, the other stars, the stage edge and (for region names) the
 * series lines. A star label that collides tries the other side of its star, a region name tries small
 * vertical nudges; anything still colliding waits for hover / tap (`.is-crowded`).
 * Order = importance: you-are-here, series names, long reads, topics, the rest.
 */
type Box = { l: number; t: number; r: number; b: number };
const overlaps = (a: Box, b: Box, pad = 2) => a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;

function textBoxes(el: Element, dx: number, dy: number): Box[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  return [...range.getClientRects()]
    .filter((r) => r.width > 1 && r.height > 1)
    .map((r) => ({ l: r.left - dx, t: r.top - dy, r: r.right - dx, b: r.bottom - dy }));
}

const shows = (el: Element) => {
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
};

function declutter(stage: HTMLElement) {
  const sr = stage.getBoundingClientRect();
  if (!sr.width || !sr.height || getComputedStyle(stage).display === 'none') return;
  // GSAP may have moved the stage (lean / parallax) or be zooming it (flight)
  const transform = getComputedStyle(stage).transform;
  const m = new DOMMatrix(transform === 'none' ? undefined : transform);
  if (Math.abs(m.a - 1) > 0.01) return;
  const ox = sr.left;
  const oy = sr.top;
  const frame: Box = {
    l: Math.max(2, -ox + 4),
    t: 2,
    r: Math.min(sr.width - 2, window.innerWidth - ox - 4),
    b: sr.height - 2,
  };

  // page text that shares pixels with the stage, in stage-local px (page text is not transformed)
  const placed: Box[] = [];
  for (const el of document.querySelectorAll('main h1, main h2, main p, main .btn, main .legend, .site-header')) {
    if (el.closest('[data-stage]') || !shows(el)) continue;
    for (const b of textBoxes(el, ox - m.e, oy - m.f)) if (overlaps(b, frame, 0)) placed.push(b);
  }
  const stars = [...stage.querySelectorAll<HTMLElement>('.star')];
  const anchors = [...stage.querySelectorAll<HTMLElement>('.anchor')];
  for (const s of stars) {
    s.classList.remove('is-crowded');
    delete s.dataset.side;
  }
  for (const a of anchors) {
    a.classList.remove('is-crowded');
    a.style.removeProperty('--nudge');
  }

  const dots = stars.map((s) => {
    const d = s.querySelector('.star-dot')!.getBoundingClientRect();
    const cx = d.left + d.width / 2 - ox;
    const cy = d.top + d.height / 2 - oy;
    return { s, box: { l: cx - 7, t: cy - 7, r: cx + 7, b: cy + 7 } };
  });
  const segs: number[][] = [];
  stage.querySelectorAll<SVGLineElement>('svg.lines .edge--series').forEach((line) => {
    const box = line.ownerSVGElement!.getBoundingClientRect();
    if (!box.width) return;
    const at = (a: string, b: string) => [
      box.left - ox + (Number(line.getAttribute(a)) / 1000) * box.width,
      box.top - oy + (Number(line.getAttribute(b)) / 1000) * box.height,
    ];
    segs.push([...at('x1', 'y1'), ...at('x2', 'y2')]);
  });
  const crossed = (b: Box) =>
    segs.some(([x1, y1, x2, y2]) => {
      for (let i = 1; i < 24; i++) {
        const x = x1 + ((x2 - x1) * i) / 24;
        const y = y1 + ((y2 - y1) * i) / 24;
        if (x > b.l + 1 && x < b.r - 1 && y > b.t + 1 && y < b.b - 1) return true;
      }
      return false;
    });
  const free = (boxes: Box[], self: Element, lines = false) =>
    boxes.length > 0 &&
    boxes.every(
      (b) =>
        b.l >= frame.l &&
        b.r <= frame.r &&
        b.t >= frame.t &&
        b.b <= frame.b &&
        !placed.some((p) => overlaps(b, p)) &&
        !dots.some((d) => d.s !== self && overlaps(b, d.box, 0)) &&
        !(lines && crossed(b)),
    );

  const rank = (s: HTMLElement) =>
    (s.dataset.state === 'current' ? 0 : s.dataset.state === 'focus' ? 10 : 30) - Number(s.dataset.mag ?? 0);
  const items = [
    ...stars.map((el) => ({ el, order: rank(el) })),
    ...anchors.map((el) => ({ el, order: el.classList.contains('anchor--series') ? 5 : 20 })),
  ].sort((a, b) => a.order - b.order);

  for (const { el } of items) {
    if (el.classList.contains('anchor')) {
      if (!shows(el)) continue;
      let ok = false;
      for (const nudge of [0, -14, 14, -26, 26]) {
        el.style.setProperty('--nudge', `${nudge}px`);
        const boxes = textBoxes(el, ox, oy);
        if (free(boxes, el, true)) {
          placed.push(...boxes);
          ok = true;
          break;
        }
      }
      if (!ok) {
        el.style.removeProperty('--nudge');
        el.classList.add('is-crowded');
      }
      continue;
    }
    const label = el.querySelector('.star-label');
    if (!label || el.classList.contains('no-label') || !shows(label)) continue;
    const parts = () => [...label.children].filter(shows).flatMap((c) => textBoxes(c, ox, oy));
    let boxes = parts();
    if (free(boxes, el)) {
      placed.push(...boxes);
      continue;
    }
    el.dataset.side = getComputedStyle(el).flexDirection === 'row-reverse' ? 'r' : 'l';
    boxes = parts();
    if (free(boxes, el)) {
      placed.push(...boxes);
      continue;
    }
    delete el.dataset.side;
    el.classList.add('is-crowded');
  }
}

let declutterTimer = 0;
function declutterAll() {
  window.clearTimeout(declutterTimer);
  document.querySelectorAll<HTMLElement>('[data-stage]').forEach(declutter);
}
function scheduleDeclutter(ms = 150) {
  window.clearTimeout(declutterTimer);
  declutterTimer = window.setTimeout(() => requestAnimationFrame(declutterAll), ms);
}
window.addEventListener('resize', () => scheduleDeclutter());

function bindLabels() {
  // once the fonts (metrics) are in, and again when the arrival animation has settled
  void document.fonts.ready.then(() => requestAnimationFrame(declutterAll));
  window.setTimeout(() => requestAnimationFrame(declutterAll), 2200);
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
  armed = null;
  bindPrefs();
  bindStages();
  bindLabels();
  bindToc();
  void syncMotion(true);
});
// ClientRouter swaps <html> attributes on navigation; re-apply the stored preferences.
document.addEventListener('astro:after-swap', applyLocalPrefs);
document.addEventListener('prefs:change', () => {
  applyLocalPrefs();
  syncPrefButtons();
  scheduleDeclutter(60); // reading mode / reduced motion change the layout
  void syncMotion(false);
});
watchSystemPrefs();
