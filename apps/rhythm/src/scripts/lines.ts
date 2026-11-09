/**
 * Line locking for kinetic type.
 *
 * Animating width/weight axes changes advance widths, so a wrapping title would re-break its lines
 * every frame and push the page around. We break the text once, at the widest state it will ever
 * reach, then freeze each line (nowrap). After that the axes can move freely: lines get narrower or
 * wider, but never re-wrap and never change the block's height.
 *
 * The visible copy is aria-hidden; a visually hidden copy keeps the accessible name and the text
 * intact for selection-free reading by assistive tech. Words are split on spaces only, so Vietnamese
 * syllables and their stacked tone marks are never cut apart.
 */
export interface Locked {
  el: HTMLElement;
  words: HTMLSpanElement[];
  lines: HTMLSpanElement[];
  restore: () => void;
}

export interface AxisState {
  wdth: number;
  wght: number;
}

const originals = new WeakMap<HTMLElement, { html: string; text: string }>();

export function lockLines(el: HTMLElement, max: AxisState): Locked {
  const original = originals.get(el) ?? {
    html: el.innerHTML,
    text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  };
  originals.set(el, original);
  const text = original.text;
  const prev = { stretch: el.style.fontStretch, weight: el.style.fontWeight, transition: el.style.transition };
  // CSS transitions on the axes would make the measurement read a mid-transition state.
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

  // Measure line breaks at the widest state.
  el.style.fontStretch = `${max.wdth}%`;
  el.style.fontWeight = String(max.wght);
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
  el.style.fontStretch = prev.stretch;
  el.style.fontWeight = prev.weight;
  el.style.transition = prev.transition;

  vis.textContent = '';
  const lines = groups.map((group) => {
    const line = document.createElement('span');
    line.className = 'kl';
    group.forEach((w, i) => {
      if (i) line.append(' ');
      line.append(w);
    });
    vis.append(line);
    return line;
  });

  return {
    el,
    words,
    lines,
    restore() {
      el.innerHTML = original.html;
      originals.delete(el);
      el.style.fontStretch = '';
      el.style.fontWeight = '';
    },
  };
}
