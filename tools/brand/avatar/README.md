# dean logo (animated)

Decided with the owner on 2026-11-10: the logo is the **Cloud** avatar from the
[Open Bot Avatar](https://github.com/dominikscholz/open-bot-avatar) gallery (MIT, like the rest of that repo),
with the full state catalogue from the avatar libraries we surveyed.

The logo itself lives in `packages/core`:

- `src/brand/dean.json`: byte-for-byte copy of the gallery's `cloud.json` (also at
  `src/brand/vendor/open-bot-avatar/gallery/cloud.json`).
- `src/brand/vendor/open-bot-avatar/`: unmodified MIT copy of the library core (`VERSION` = upstream commit). It
  gives the volume, breathing, wander, blinks, eye placement and pointer gaze.
- `src/brand/deanframe.ts`: pure renderer, `(definition, state, time, gaze, theme) -> SVG string`, built on the
  library's `avatarFrame()`: our eye layer, body pose and decor, 23 expressions (`EXPRESSIONS`) and 18 actions
  (`ACTIONS`), bilingual labels in `STATE_LABELS`. Ideas come from the libraries surveyed (Open Mascot Studio,
  BoopFace, Blob Atelier, Zeeli agent-avatar, bloub); written from scratch, no constants copied. Colours: the
  library's orange `#FF6A1A` and ink eyes, same on light and dark pages. Glasses and an outline exist as options but
  are off. `deanFavicon()` = the cloud with two thick pill eyes.
- `src/brand/logo.ts` (`@blog/core/brand/logo`): `deanStill()` and `deanFaviconHref()` for server-side use.
- `src/components/DeanLogo.astro` + `src/client/dean-logo.ts`: the header logo (see those files for the states and
  the motion contract).

This folder only holds the preview tools:

- `render-states.ts <outdir>`: one still SVG per state plus favicons.
- `demo-entry.ts` → bundle inlined in `dean-all.html`: standalone demo that plays all 41 states with their names
  (`window.renderAt(t)`, `window.TOTAL`).
