/**
 * Tone-mark split: the signature of the ink theme.
 *
 * Every Vietnamese vowel that carries a mark above it (sắc, huyền, hỏi, ngã, plus the circumflex
 * and breve) is wrapped in <span class="tm" data-g="ế">ế</span>. The in-flow letter stays real
 * text (selectable, searchable, read by screen readers) but its fill is transparent; two
 * pseudo-elements redraw the same glyph, clipped at a cut line just above the letter body:
 *   ::before  the body (and any dot below), which lands first
 *   ::after   the marks above, which fall onto it
 * At rest the two halves reassemble the exact glyph, so the static page is pixel-identical to
 * plain text. The cut lines are measured from Be Vietnam Pro 700/800 (see global.css .tm).
 *
 * Modes:
 *   marks  only toned letters are wrapped (cards, article headings)
 *   land   words become inline-blocks that land, then marks fall (page titles)
 *   write  every character is wrapped so the line can be written left to right (home hero)
 *
 * Runs on the server (Astro set:html) and in the browser (article headings), so no DOM here.
 */
export type ToneMode = 'marks' | 'land' | 'write';

const ABOVE = /[̀́̂̃̆̉]/;
const HORN = /̛/;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('vi', { granularity: 'grapheme' }) : null;
function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

/** Classes for a toned grapheme, or null when it has no mark above to drop. */
export function toneClass(g: string): string | null {
  const parts = g.normalize('NFD');
  if (!ABOVE.test(parts)) return null;
  const base = parts[0] ?? '';
  const upper = base !== base.toLowerCase();
  return `tm${upper ? ' u' : ''}${HORN.test(parts) ? ' h' : ''}`;
}

function wrapGrapheme(g: string, index: number, mode: ToneMode): string {
  const cls = toneClass(g);
  if (cls)
    return `<span class="${mode === 'write' ? 'c ' : ''}${cls}" data-g="${esc(g)}" style="--c:${index}">${esc(g)}</span>`;
  if (mode === 'write' && g.trim()) return `<span class="c" style="--c:${index}">${esc(g)}</span>`;
  return esc(g);
}

/** HTML for `text` split for the given mode. Returns the escaped text untouched when nothing needs a span. */
export function splitTone(text: string, mode: ToneMode = 'marks'): string {
  const clean = text.normalize('NFC');
  let index = 0;
  if (mode === 'marks') {
    return graphemes(clean)
      .map((g) => {
        const html = wrapGrapheme(g, index, mode);
        if (g.trim()) index++;
        return html;
      })
      .join('');
  }
  // land / write: words become inline-blocks (kept whole), spaces stay real spaces for wrapping.
  return clean
    .split(/(\s+)/)
    .map((word, w) => {
      if (!word) return '';
      if (/^\s+$/.test(word)) return ' ';
      const inner = graphemes(word)
        .map((g) => wrapGrapheme(g, index++, mode))
        .join('');
      return `<span class="w" style="--w:${w >> 1}">${inner}</span>`;
    })
    .join('');
}

/** Count of non-space graphemes: lets CSS time the end of a written line. */
export function toneLength(text: string): number {
  return graphemes(text.normalize('NFC')).filter((g) => g.trim()).length;
}
