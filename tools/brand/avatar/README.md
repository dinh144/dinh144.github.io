# dean logo (animated)

Decided with the owner on 2026-11-10: the logo is the **Cloud** avatar from the
[Open Bot Avatar](https://github.com/dominikscholz/open-bot-avatar) gallery (MIT, like the rest of that repo),
with the full state catalogue from the avatar libraries we surveyed.

- `dean.json`: byte-for-byte copy of the gallery's `cloud.json` (also kept at
  `vendor/open-bot-avatar/gallery/cloud.json`).
- Colour: the library's default orange `#FF6A1A` and ink eyes `#1A1A1A`, same on light and dark pages. The
  gallery's own suggested colour for Cloud is teal `#14b3a5`, not used.
- `vendor/open-bot-avatar/`: unmodified MIT copy of the library core (`VERSION` = upstream commit). It gives the
  volume, breathing, wander, blinks, eye placement and pointer gaze.
- `deanframe.ts`: pure renderer, `(definition, state, time, gaze, theme) -> SVG string`, built on the library's
  `avatarFrame()`. Adds our eye layer, body pose and decor, and the catalogue: 23 expressions (`EXPRESSIONS`) and
  18 actions (`ACTIONS`), bilingual labels in `STATE_LABELS`. Ideas come from the libraries surveyed (Open Mascot
  Studio, BoopFace, Blob Atelier, Zeeli agent-avatar, bloub); everything is written from scratch, no constants
  copied. Glasses and an outline exist as options (`glassesColor`, `outline`) but are off. `deanFavicon()` = the
  cloud with two thick pill eyes.
- `render-states.ts <outdir>`: one still SVG per state plus favicons.
- `demo-entry.ts` → bundle inlined in `dean-all.html`: standalone demo that plays all 41 states with their names
  (`window.renderAt(t)`, `window.TOTAL`).

Browser bundle of `deanframe.ts` + outline: 18.2 KB gzip (`bun build --minify`).
Next: `<DeanLogo>` in `packages/core` (SSR still SVG, engine loaded lazily, `motionAllowed()` / `prefs:change`).
