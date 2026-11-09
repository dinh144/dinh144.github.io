/**
 * Line locking for kinetic type.
 *
 * Animating width/weight axes changes advance widths, so a wrapping title would re-break its lines
 * every frame and push the page around. We freeze each line (nowrap) once; after that the axes can
 * move freely without re-wrapping or changing the block's height.
 *
 * To avoid any layout shift when the lock happens, the lines keep the breaks the static page already
 * has (measured at the resting axes). Only if one of those lines would not fit at the widest state the
 * element will reach do we fall back to breaking at that widest state. Kinetic titles carry a
 * max-inline-size in CSS that leaves this headroom, so the fallback is rare.
 *
 * The visible copy is aria-hidden; a visually hidden copy keeps the accessible name. Words are split on
 * spaces only, so Vietnamese syllables and their stacked tone marks are never cut apart.
 */
export interface Locked {
  el: HTMLElement;
  /** Inner glyph runs: set the axes on these. */
  words: HTMLSpanElement[];
  lines: HTMLSpanElement[];
  /** After changing axes: re-space the words with transforms (call once per frame). */
  reflow: () => void;
  restore: () => void;
}

/**
 * Shift-free tracking. Each box keeps the width it has at rest (so layout never moves and the page
 * reports no layout shift); the glyphs inside change width freely, and the boxes after them are moved
 * with a transform by the accumulated difference, so the spacing stays tight.
 */
export interface Track {
  inners: HTMLSpanElement[];
  reflow: () => void;
}

export function track(rows: HTMLElement[][]): Track {
  const inners: HTMLSpanElement[] = [];
  const all = rows.map((boxes) =>
    boxes.map((box) => {
      const inner = document.createElement('span');
      inner.className = 'kt';
      inner.append(...box.childNodes);
      box.append(inner);
      inners.push(inner);
      return { box, inner, rest: 0, shift: Number.NaN };
    }),
  );
  // Read every rest width first, then fix them all (one layout, no thrash).
  for (const row of all) for (const b of row) b.rest = b.inner.getBoundingClientRect().width;
  for (const row of all)
    for (const b of row) {
      b.box.classList.add('kbox');
      b.box.style.width = `${b.rest}px`;
    }
  return {
    inners,
    reflow() {
      const widths = all.map((row) => row.map((b) => b.inner.getBoundingClientRect().width));
      all.forEach((row, r) => {
        let offset = 0;
        row.forEach((b, i) => {
          if (Math.abs(offset - b.shift) > 0.25 || Number.isNaN(b.shift)) {
            b.shift = offset;
            b.box.style.transform = offset ? `translateX(${offset.toFixed(2)}px)` : '';
          }
          offset += widths[r][i] - b.rest;
        });
      });
    },
  };
}

export interface AxisState {
  wdth: number;
  wght: number;
}

const originals = new WeakMap<HTMLElement, { html: string; text: string }>();

function group(words: HTMLSpanElement[]): HTMLSpanElement[][] {
  const groups: HTMLSpanElement[][] = [];
  let lastTop = Number.NaN;
  for (const w of words) {
    const top = Math.round(w.getBoundingClientRect().top);
    if (!groups.length || Math.abs(top - lastTop) > 2) {
      groups.push([]);
      lastTop = top;
    }
    groups[groups.length - 1].push(w);
  }
  return groups;
}

function build(vis: HTMLElement, groups: HTMLSpanElement[][]): HTMLSpanElement[] {
  vis.textContent = '';
  return groups.map((g) => {
    const line = document.createElement('span');
    line.className = 'kl';
    g.forEach((w, i) => {
      if (i) line.append(' ');
      line.append(w);
    });
    // A real space between locked lines keeps copy-paste and find-in-page working ("blog này", not "blognày").
    if (vis.childNodes.length) vis.append(' ');
    vis.append(line);
    return line;
  });
}

function contentWidth(node: Node): number {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect().width;
}

export function lockLines(el: HTMLElement, max: AxisState): Locked {
  const original = originals.get(el) ?? {
    html: el.innerHTML,
    text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  };
  originals.set(el, original);
  const text = original.text;
  const prev = { stretch: el.style.fontStretch, weight: el.style.fontWeight, transition: el.style.transition };
  // CSS transitions on the axes would make the measurements read a mid-transition state.
  el.style.transition = 'none';

  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  const vis = document.createElement('span');
  vis.className = 'kin';
  vis.setAttribute('aria-hidden', 'true');
  const words = text.split(' ').map((word) => {
    const w = document.createElement('span');
    w.className = 'kw';
    w.textContent = word;
    return w;
  });
  words.forEach((w, i) => {
    if (i) vis.append(' ');
    vis.append(w);
  });
  el.append(sr, vis);

  // 1. Breaks as the static page has them.
  let lines = build(vis, group(words));

  // 2. Would every line still fit at the widest state, with the full column available?
  el.style.fontStretch = `${max.wdth}%`;
  el.style.fontWeight = String(max.wght);
  const prevMax = el.style.maxInlineSize;
  el.style.maxInlineSize = 'none';
  const avail = vis.getBoundingClientRect().width;
  const fits = lines.every((line) => contentWidth(line) <= avail + 0.5);
  if (!fits) {
    // Fall back: break at the widest state so nothing can overflow.
    vis.textContent = '';
    words.forEach((w, i) => {
      if (i) vis.append(' ');
      vis.append(w);
    });
    lines = build(vis, group(words));
  }
  el.style.maxInlineSize = prevMax;
  el.style.fontStretch = prev.stretch;
  el.style.fontWeight = prev.weight;
  el.style.transition = prev.transition;

  const t = track(lines.map((line) => [...line.querySelectorAll<HTMLSpanElement>('.kw')]));

  return {
    el,
    words: t.inners,
    lines,
    reflow: t.reflow,
    restore() {
      el.innerHTML = original.html;
      originals.delete(el);
      el.style.fontStretch = '';
      el.style.fontWeight = '';
    },
  };
}
