# Concept: Ink & paper (`ink`)

## Idea
Vietnamese ink on warm paper. The page is a sheet; reading is watching ink settle. The signature only a
Vietnamese blog can have: **tone marks drop into place** as a title appears (the base letters land first,
then the diacritics fall onto them).

## Type (from canvas direction D)
- Headings / UI: Be Vietnam Pro (700–800), tight tracking on display sizes.
- Body: Literata (opsz), 19–20 px, ~66ch.
- Code / meta: Source Code Pro.

## Palette
- Light: paper #F4F1EA, ink #383331, muted #6A625C, rule #D6CEC0, cinnabar accent #A50E1A.
- Dark: #120E0F, ink #EDE6DD, accent #E8707A.

## Signature moments
- Home hero: a WebGL ink field (fluid/noise shader) on paper texture; ink blooms from the cursor/touch and
  slowly diffuses; the latest post's title writes itself with falling tone marks.
- Scroll: ink wash reveals for list items (mask/clip driven by ScrollTrigger); hand-weight dashed rules draw in.
- Transitions: a page "turn" or ink-wipe between pages (Astro view transitions + GSAP), with `turn()` sound.
- Article: a thin ink line in the margin that fills with reading progress; headings settle with the tone-mark drop.
- Numbers: "№" chapter numbers for posts.

## References
tej.as (paper, crimson accent, grain, sticky TOC), theboringblog.ai (calm reading column),
leoparpeix.com (microinteractions, transitions).
