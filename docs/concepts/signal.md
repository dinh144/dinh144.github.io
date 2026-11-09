# Concept: Signal / terminal (`signal`)

## Idea
A CRT and ASCII world. Text arrives as a signal: glyph noise resolves into titles, the screen has phosphor glow
and scanlines, and the whole blog feels like a well-made terminal, not a gimmick.

## Type (from canvas direction C)
- Headings / UI: JetBrains Mono (700), `#` / `##` prefixes visible.
- Body: Be Vietnam Pro, 17–18 px (all-mono body hurts reading).

## Palette
- Dark first: #0C0C0C, ink #E4DFD2, muted #9C978B, amber accent #F2B13C, green #8FD18B, blue #8DB8F2.
- Light variant: paper #F4F1EA, ink #1A1A1A, accent #8F5300.

## Signature moments
- Home hero: a full-bleed ASCII shader (Three.js render target → glyph atlas) of a slowly morphing shape;
  the cursor/touch disturbs it; titles decode from random glyphs (scramble text with GSAP).
- Feed: date-grouped `── 09.11.2026 ──` dividers and `[tag]` labels; a prompt-style filter (`$ ls --type=`).
- Transitions: CRT power-off / power-on between pages, scanline sweep.
- Article: `$ tree` TOC, line-numbered code, reading progress as a block-character bar.
- Optional third theme state: "terminal" (green phosphor) next to light/dark, as RuntimeWire does.

## References
RuntimeWire (light/dark/ASCII themes), FWA Wire (dated feed, bracket labels), gilhuybrecht.com (OGL, infinite scroll).
