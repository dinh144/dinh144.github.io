# Agent-avatar libraries: code-level comparison for the animated "dean" logo

Date: 2026-11-10. Companion to `agent-avatars-2026.md` (market and legal survey). This one is about source code: how
each library computes and draws a frame, what we could reuse, and how to build `<DeanLogo>` for the Astro blog.

Method: shallow clones in the scratchpad (`.../scratchpad/ext/<repo>`), source read directly, no install scripts and no
builds run. Sizes come from `bun build --minify --target=browser` of the pure source into the scratchpad, then
`gzip -9` and `brotli`. Stars and push dates from `gh api repos/OWNER/REPO` on 2026-11-10.

Not measured: per-frame CPU time and SVG node counts. I tried to run a small `bun run` benchmark of `avatarFrame()`
against `dean.json`; the permission classifier blocked running third-party code, so I stopped. Anything about runtime
cost below is read from code, not timed. A 10-minute spike (section 5, step 0) should settle it.

Our target: ink `#1A1A1A` helmet-shaped head with a cowlick, two pill eyes, thick square glasses with a heavy red
`#FF4949` top bar, drawn as an SVG outline. Existing prototype: `tools/brand/avatar/dean-live.html` + `dean.json`
(open-bot-avatar, glasses drawn on each eye's surface plane from `avatarFrame()`).

## 1. At a glance

| | open-bot-avatar | bloub | BoopFace | blob-atelier | open-mascot-studio | agent-avatar |
|---|---|---|---|---|---|---|
| Stars / last push | 322 / 2026-11-10 | 1,953 / 2026-08-17 | 81 / 2026-11-08 | 9 / 2026-10-23 | 10 / 2026-08-19 | 0 / 2026-10-11 (last commit 2026-09-27) |
| Code licence | MIT | MIT | MIT | MIT | MIT | MIT |
| Character design status | Generic spec, no character of its own | Imitates xAI Grok Bot; MIT "covers the code, not the design it imitates" | Original robot by CX ArtLab; MIT does not transfer name or character | Own plush/blob look, no reservation found | Self-described "Grok-bot-like"; README says no company-specific characters | Original cast by Manno Beats for Zeeli, no reservation found |
| Draws with | Canvas (default mount) or SVG (`avatarFrame`/`renderAvatarSvg`) or CSS 3D scene | SVG (Vue template) | SVG in a web component shadow root | SVG (+ SVG filters), WebGL for 3D animals | SVG | SVG + CSS keyframes (HTML layers) |
| Time model | Pose is a pure function of (seed, time, mood, gaze); easing in a small stateful animator | `engine.sample(t)` pure given event history; no clock inside | Imperative, stateful (lerped pose, timers, WAAPI) | Imperative springs, substepped | Pure `sampleAnimation(def, key, elapsedMs)`; stateful bridge in `web.js` | No JS time at all; CSS timeline |
| Custom outline | Yes: any single filled path in 0-100 box | Only star-shaped radial profiles (or polygon to profile) | Head is an inline polygon in the source | Edit `SHAPE_FN` curves in source | No: 7 width/height presets | Yes, but by writing a new character file |
| Glasses/accessories | None built in (we draw them) | None (decor: dots, rings, notification dot) | None (antenna, skins) | Glasses/sunglasses/beret on 3D animals only | None | Per-character props, hand-drawn |
| States | 3 moods (idle, thinking, happy) | 14 states + 16 expressions | 17 actions | 8 states | 15 expressions + 11 motions | 4 states |
| Pointer follow | Yes (window-wide, smoothed) | Yes (window, mouse only) | Yes + drag jelly, squeeze, antenna drag | Yes + poke/drag squash | `setLookTarget()` only; you wire events | No |
| Reduced motion | `reducedMotion: system/true/false`, live media listener | None in the component (only intro is skipped) | `motion="auto/reduce/full"`, live listener | None (no `reduce` anywhere) | Read once at creation, no live listener | CSS media query plus lite mode |
| Gzipped size of what we'd ship | 13.2 KB (frame only), 16.7 KB (all pure core), 18.9 KB (with DOM mount) | 9.4 KB engine | 26.1 KB lite (bun-minified entry) | 38.5 KB (unminified file, whole thing) | 8.7 KB | 22.2 KB all; about 5 KB for one character |
| Tests | Vitest, about 1,450 lines in core | Vitest, about 14 files | Playwright + node tests, types tests | One optional Playwright script | node:test, 8 files, API-surface test | node:test + type tests + Playwright, CI, size budget |

Sizes: brotli is about 10% smaller than gzip for every row (for example 11.96 KB for the frame-only open-bot-avatar
bundle). Raw sources are in the scratchpad `sz/` folder.

## 2. Per-repo findings

### 2.1 open-bot-avatar (dominikscholz/open-bot-avatar) v0.2.0

Architecture. A definition is `{ body: { path }, eyes: { x, y, spacing, scale } }` in a 0-100 box (`docs/avatar-contract.md`).
`volume.ts` (669 lines) infers a "volume" from the outline as stacked cross-sections (z-slices facing the viewer,
x-slices facing sideways, up to `MAX_X_SLICES = 40` plus refinement slices for thin parts). Each frame:
`computePose()` (motion.ts) returns yaw, pitch, roll, lift, squash, gaze, blink, squint per eye and eye shape;
`render.ts` projects the slices with that pose and returns an `AvatarFrame` of paths, matrices and two eye marks.
Output modes: `avatarFrame()` (plain data, no DOM), `renderAvatarSvg()` (a string of `<use href transform>` per slice),
`liveFrame()` + canvas painter (`dom/paint.ts`, the default of `mountAvatar`), and a CSS 3D scene (`renderer: "scene"`).
Eyes are painted on the surface plane and culled when the surface turns away.

Time model. `computePose` is explicitly deterministic: no wall clock, no `Math.random`, per-avatar phase from a seed
hash, so any frame can be reproduced (tests, SSR, scrubbing). The only state is in `createAnimator()` (eased look
target, mood blend chain, `settleMood` so rapid changes continue from the pose on screen). The mood blend is a smart
detail: `blendPoses` swaps eye shape halfway through a blink.

Customisation. Outline: fully ours (validated: one path, holes wind opposite, eyes must sit inside with clearance,
`validateAvatar` returns errors). Colours: `color`, `eyeColor`, any CSS colour in the DOM mount. Accessories: none, and
eye shapes are only `pill` and `happy` arc. Eye size is derived from `eyes.scale` and available room (up to 1.45x).
No API to supply an arbitrary pose, extra moods, or per-eye blink; those need a fork or an outer layer.

States and transitions. Moods: `idle` (blink every ~4.2 s with occasional double blink, saccade wander, breathing,
sway), `thinking` (look up-right, squint L 0.22 / R 0.32, roll -5, slow blink), `happy` (0.92 s hop with squash on
landing, `^ ^` arc eyes). Change of mood: 420 ms smoothstep blend of the two poses, running both motions in parallel.
Gaze: -1..1 target, weight fades it in, body turns up to 0.32 rad and eyes take 70% of their tiny range.

Interaction. `followPointer` (window-wide `pointermove`, cleared on leave, blur, hidden tab, lifted finger/pen),
`lookAt`, `holdGaze`, `view` (extra yaw/pitch for drag-to-turn, the app does the drag). No click behaviour.

Reduced motion and accessibility. `reducedMotion: true | false | 'system'`; under reduced motion the pose is frozen
(time 0, no blink, no wander, no body turn) while eyes still follow gaze with their full small range; a shared
`matchMedia` listener wakes the loop on change. Host gets `role="img"` and `aria-label` (definition name), `label: ""`
makes it `aria-hidden`. No keyboard behaviour.

Performance. One shared rAF loop for all avatars; offscreen avatars stop (IntersectionObserver with 100 px margin);
sizes under 128 px redraw at 30 fps; canvas keeps one compositor layer and a bitmap sized to the frame bounds. The
canvas painter only knows body slices and the two eye marks, so it cannot draw our glasses. Our prototype therefore
uses `avatarFrame()` and rebuilds all SVG nodes with `replaceChildren` every rAF, which is the wrong long-term loop.

Size. `avatarFrame` + `validateAvatar` only: 30.9 KB min, 13.2 KB gzip. All of `src/index.ts` (adds animator, follow,
mood, examples, scene): 39.0 KB min, 16.7 KB gzip. Plus `dom/`: 45.2 KB min, 18.9 KB gzip. `sideEffects: false`, so
unused parts tree-shake in a real bundler.

Licence and design. MIT, (c) 2026 Dominik Scholz. The repo ships a gallery of community avatars (each a separate
JSON, contributed by PR); the spec makes no claim over characters. Our outline is ours. Keep the licence text and
copyright line in a vendored copy.

Maintenance. 322 stars, pushed today (commit "Volumes: smooth slice edges"), changesets-based CHANGELOG, v0.2.0,
single main author, API still pre-1.0 and visibly moving (0.1.x to 0.2.0 switched the default renderer from CSS scene to
canvas). Quality: typed, strict TS, about 1,450 lines of Vitest in `packages/core/tests` (frame, cursor, canvas, paint,
mood, gallery), contract document, an agent skill for generating definitions. Best-documented repo of the six.

### 2.2 bloub (jeremy-prt/bloub)

Architecture. Vue 3 app; the engine in `src/bot/` has no framework and no clock. `BotEngine.sample(now)` returns a
`BotFrame` (body path string, eye paths + matrices, dots, arcs, notification pastille, notch). Body is a radial profile
`r(theta)` sampled at the same 64 angles for every silhouette, so morphing is a linear interpolation of radii (no
path-morphing library). Eyes are holes in a `<mask>` (so they clip against the silhouette for free) and are painted on
a sphere: each eye gets the sphere's tangent frame, which gives the compression and tilt. SVG, drawn by the Vue
component (`BloubBot.vue`, 617 lines). Numeric constants were measured frame by frame from xAI's video (CLAUDE.md:
"do not round them").

Time model. `sample(t)` is a pure function of time given the event history (`setState`, `setLook`, `setShape`);
`sample()` must not mutate (there is a dedicated test); a state change inside a fade blends from the frozen composite
pose. That makes `frozenAt` (one exact frame, no loop) and a DOM-less test suite possible. Best-argued time model of
the six, and the one closest to what a logo with a state machine needs.

Customisation. 8 body shapes (circle, pebble, squircle, capsule, triangle, hexagon, cloud, drop), 12 colours, 16 rest
expressions, `paper` colour. A new shape must be star-shaped around the origin (radial profile) or go through
`profileFromPolygon`; `eyefit.ts` adds a precomputed offset table so eyes do not leave narrow shapes (six per-frame
solvers were tried and rejected, listed in docs/architecture.md). Our helmet with a cowlick is star-shaped from the
face centre only if the cowlick does not curl back over itself; a curled cowlick fails. No glasses; decor is dots,
rings, particles.

States (14 + `swirl`, the interface transition): idle, thinking (body becomes a pulsing middle dot, side dots emerge),
wink (closed eye is a horizontal dash wider than the open eye, head tilt), wide, alert (travelling "!"), notify
(notification pastille with notch), exclaim, sleep (small ball bouncing +-0.19 radius, period 0.6 s, no face), egg,
hexagon, play, orbit (rings), burst (particles), comet. Only `idle`, `wink`, `wide`, `notify`, `swirl` keep a custom
body shape (`baseBody`); the others draw their own silhouette because the shape is the animation. Rest expressions:
neutre, attentif, surpris, excite, heureux, hilare, colere, triste, effraye, mefiant, confus, curieux, fier, timide,
blase, somnolent. Transitions: per-state `morph` duration (0.3-0.6 s) with exponential ease-outs; a state can hide its
entry behind a blink (`blinkIn`).

Interaction. `follow` prop: window `pointermove` (touch ignored), gaze applied only on states that have a rest face
(`baseFace`); lookTarget with turn animation on entering the view. No click handling in the component.

Reduced motion and accessibility. The component has no `matchMedia`; only `ui/intro.ts` skips the arrival sequence
when `prefers-reduced-motion` is set. `frozenAt` gives a still. SVG has `role="img"` and a translated `aria-label`.
No offscreen or hidden-tab pause found in `BloubBot.vue` (rAF runs while playing).

Performance. Engine reuses an `out` silhouette to avoid allocation at 60 fps; per frame it builds path strings and
Vue patches attributes. The mask-based eyes add a mask per frame. Fine for one hero avatar.

Size. `BotEngine` bundle (engine + profiles + skins + eyefit + states): 23.3 KB min, 9.4 KB gzip, 8.4 KB brotli.
Excludes the Vue component, the editor, the GIF/MP4 exporter (`mediabunny`, fetched on demand).

Licence and design. Code MIT. README: "Not affiliated with... x.ai... The MIT licence covers the code in this
repository, not the design it imitates." The silhouettes, eye sizes (`EYE_W 0.186`, `EYE_H 0.412`), head orientation
and timings are measurements of Grok Bot. Using the engine structure is fine; using its constants or state visuals
would copy the thing xAI owns. This is the library our own repo already flagged as "not for use"
(`deanbot-bloub-test.html`).

Maintenance. 1,953 stars (the popular one), pushed 2026-08-17, v0.1.1, private package (not on npm), French comments
and French identifiers. Strong docs (architecture, measurements, export, i18n) and Vitest for engine, expressions,
shapes, skins (sweeps time as well as combinations), cycles, gaze, export, intro.

### 2.3 BoopFace (CX-ArtLab/BoopFace) v0.8.0

Architecture. A `<boop-face>` custom element (shadow DOM) with an inline SVG: a head polygon (`headShape`, a list of
`L` points so the drag "jelly" can displace the points), two eyes each made of a white ellipse clipped by a dark top
rectangle and a dark bottom rectangle ("lids"), and an antenna. Expressions are lid poses:
`POSES = { idle, happy, sad, angry, sleepy, input, sleep, surprise }`, each `{ w, h, rx, topY, bottomY, topAL, topAR,
bottomAL, bottomAR }`. Lid angles give angry/sad; `sleep` is `topY 7, bottomY 14` (lids meet in a slit); `happy` lifts
the bottom lid to the middle. Actions (`boopface-actions.js`, waiting, inspect, failure, love, random, wrap) compose
poses, eye offsets and WAAPI head animations. Imperative: `_updateMorph`, `_updateBlink`, `_updateLook`,
`_updateHeadFollow`, `_updateDragJelly`, `_draw`, at most every 33 ms (30 fps).

Customisation. `color`, `size`, `skin` (188 SVG skins, lazily loaded), `head roundness`; no custom outline or accessory
API. The head polygon and eye layout are literals inside `_renderShell`; replacing them means patching the shell
template (and the point-based drag deformation works on the polygon points). Eye is a big ellipse (rx 27, ry 29 on a
240 box), not a pill.

States. `idle, bored, waiting (spin, wrap, wave), input, affirm, success, failure, wary, inspect, angry, refuse,
surprise, love, random, sleep, wake`, plus interaction states `squeeze`, `antenna-drag`. API: `play(action)`,
`startWaiting({variant})`/`stopWaiting()`, `reset()`; `action-state` event (phase start/end/cancel, source api,
interaction, automatic) and `face-state` event. Auto-sleep after `auto-sleep` ms with `wake-on activity|interaction|manual`.
The waiting variants are the most interesting motion vocabulary in the set: eyes circle, slide out one side and back in
the other, or bob in turn.

Interaction. Window-level pointer follow with inertial head movement, jelly deformation on drag with elastic return,
press-and-hold squeeze, draggable spring antenna, any key or pointer down counts as activity (wakes it).

Reduced motion and accessibility. `motion="auto|reduce|full"`; `reducedMotion(instance)` is consulted by morph,
blink, look, head follow, drag; durations become 0, continuous motion is cancelled; live `matchMedia` listener;
IntersectionObserver pauses off-screen; sleeping avatar stops its rAF loop. SVG is `role="img"` with a fixed
`aria-label="Robot avatar"` (not derived from the state). `action-state` is meant for hosts to build status text
(`examples/accessibility.html`). Host has `cursor: pointer` and `touch-action: pinch-zoom`. Honours the pieces of our
contract; it does not know our `data-motion` or reading mode, so we would set `motion="reduce"` from `prefs:change`.

Performance. 30 fps rAF, `will-change: transform` on three groups, `contain: layout style`. Whole-window listeners
installed once for all instances. Skins use SVG patterns and are the heavy part (skin code about 70 KB over the
network, loaded on first use).

Size. Lite bundle (no skins) via bun: 93.4 KB min, 26.1 KB gzip, 22.6 KB brotli. README states "about 45 KB" for lite
over the network (their number is larger than my minified measurement; they likely measure the unminified modules).

Licence and design. MIT for code; README: "The BoopFace character... is an original design by CX ArtLab... does not
transfer ownership of the BoopFace name, character, or visual identity." So the head, face and antenna are off limits;
the pose-table idea and any numbers we copy are code (MIT, keep attribution).

Maintenance. 81 stars, pushed 2026-11-08, rapid release cadence (0.5 to 0.8 within weeks, a rename in 0.8 with
deprecated aliases until 1.0), CONTRIBUTING and RELEASING docs, TypeScript declarations, Playwright suites for
lifecycle, reduced states, runtime contracts and package contents on Chromium/Firefox/WebKit, plus a C++11 embedded
port with its own tests. Most engineering process of the six; also a lot of surface area for a logo.

### 2.4 blob-atelier (victoriawu-77/blob-atelier)

Architecture. One `agent-mascot.js` (a build of `src/engine.js` + `src/animals3d.js`), an `<agent-mascot>` web
component with inline SVG. Blobs: closed parametric curves sampled at N = 72 matching parameters so any two morph
(`SHAPE_FN`: mochi, bean, pebble, squircle, pill, drop, kitty, cloud, plus six animal bodies with separate ear/snout parts); materials
are SVG filters (`feTurbulence`, `feDisplacementMap`, `feDiffuseLighting`). Eyes are rounded rects placed on a pseudo-3D
sphere (yaw/pitch projection, size scales with depth), with a highlight dot. Animals: signed-distance-field meshes with
fur shells in three.js, lazy-loaded with `import()` from jsDelivr (`three@0.170.0`); SVG fabric filters are the fallback.
Time model: imperative spring integrators (`k.morph`, `k.s`, `k.gx`...) substepped each tick, seeded RNG for blinks and drift.

Customisation. 11 colours or any hex, 6 blob finishes, 3 fabrics, dot or capsule eyes, cheeks, and
`accessory = beret | glasses | sunglasses` with `acc-color`, but accessories exist only on the 3D (WebGL) animals. New
outline: add a curve to `SHAPE_FN` and `FACE` anchors in the source.

States (8): idle (breathe, blink, look around), listening (rings pull in, eyes grow, nod), thinking (look up and to
the side, squint, thought dots), talking (syllable pulse), working (scanning eyes, bob, orbiting dot), happy (hop,
sparkles), done (green check badge + sparkle burst), error (red "!" badge, `< >` chevron eyes, shake, droop). Per-state
targets are springs, so transitions are continuous.

Interaction. Eyes follow the cursor, click or poke gives a squish, drag squashes, `lookAt(x, y)`, `poke()`, events
`poke` and `change`.

Reduced motion and accessibility. None: `reduce` appears 0 times in 111 KB; `matchMedia` is only used to pick the
`lite` 3D profile on coarse pointers or low memory. The host has no `role`/`aria-label` (only the 3D canvas has
`aria-hidden`). `still` attribute gives a static render, `toSVGString()`/`renderFrame()` give exports. IntersectionObserver
pauses only the 3D render.

Performance. Filters make blobs expensive at large sizes; WebGL path has adaptive resolution and frame caps. A heavy
dependency story (CDN three.js) that our CSP and "content before effects" rules would not like.

Size. Whole file 110.9 KB raw, 38.5 KB gzip (unminified), 34.3 KB brotli; blobs-only parts would be smaller, three.js
excluded.

Licence and design. MIT (c) 2026 Victoria Wu; credits Happycapy and Cursor Agent (vibe-coded). No statement about
reserving the characters; its pink-glasses bunny and the rest are the author's designs, so do not copy the looks.

Maintenance. 9 stars, pushed 2026-10-23, one published HTML + one JS built with `node src/build.js`; one optional
Playwright script (`test/face-rebuild.test.js`); no types, no CHANGELOG, README is the only doc.

### 2.5 open-mascot-studio (0oooh/open-mascot-studio) v0.1.0

Architecture. Two packages: `open-mascot` (definitions, validation, motion sampling, scene generation, browser SVG
runtime) and `open-mascot-react-native`. A definition is JSON (`schema open-mascot/definition` v2): `blob` (shape
preset, width/height, colour, `renderMode: projected-3d | rigged-2d`), `face` (eye shape capsule/oval, size, gap, y),
`expressions` (each a `pose`: blob pitch/yaw/roll/squash/lift, gaze x/y, and per-eye `scaleX scaleY x y rotation`, plus a
continuous `motion` such as body `slow-drift | tremble | boing` and eyes `micro-saccades | tremble`), and `animations`
(a list of steps `{ expression, holdMs, transitionMs, easing: gentle | quick | spring }`, playback loop or once).
`buildScene(definition, pose)` is pure: it projects an ellipsoid-like body with perspective (CAMERA_DISTANCE 650) into a
92-sample outline path and projects each eye outline onto the body surface. `sampleAnimation(definition, key, elapsedMs)`
is a pure function of time. `web.js` adds the rAF loop, the 420-540 ms bridge between poses, and the DOM.

Customisation. The body is analytic (ellipsoid from width/height, 7 presets), not an arbitrary path, so no custom outline
without rewriting `projectedBodyPath`. Eyes are fully parameterised per eye, which is the useful part: a wink is
`rightEye.scaleY = 0.1`, wide is scale up, sad/angry are per-eye rotations. Colours: blob, eye, stage.

States. 15 expressions: neutral, focused, curious, skyward, soft-gaze, side-eye, beaming, cheeky, surprised, shy, sad,
sleepy, confident, angry, uneasy. 11 motions: idle, listening, thinking, happy, curious, surprised, shy, sad,
stand-tall, victory-bounce, sleeping. Transition: eased interpolation of every numeric pose field; non-numeric values
switch at the end.

Interaction. No pointer code in the runtime. `setLookTarget({x,y})` and `clearLookTarget()`; the host wires events.

Reduced motion and accessibility. `reducedMotion` option or `matchMedia` read once at creation (no change listener, so
a live toggle or our reading mode would not reach it); under reduced motion the bridge is skipped and expression motion
does not loop. `role="img"` with `aria-label = definition.name`. No offscreen pause.

Performance. Whole scene regenerated and SVG attributes rewritten per frame; loop runs only while playing, bridging,
looking or an expression has continuous motion.

Size. `web.js` entry: 24.5 KB min, 8.7 KB gzip, 7.8 KB brotli (definition + motion + scene + DOM runtime).

Licence and design. MIT (c) 2026 0oooh; a test asserts the published packages stay MIT-only. The GitHub description says
"Grok-bot-like animated vector mascots", the README says it ships no company characters. The code is original; the
look is intentionally near Grok Bot, so take the data model, not the visuals.

Maintenance. 10 stars, pushed 2026-08-19 (silent since), v0.1.0, workspaces not yet published as far as the manifests say,
hand-written `.d.ts`, node:test (about 30 tests), a studio web app (Firebase hosting).

### 2.6 agent-avatar (zeeli-dev/agent-avatar) v0.6.0

Architecture. `<agent-avatar variant state size label>`; each of 24 characters is a JS module exporting `{ svg, css,
html }` strings. The template is `div.root[role=img] > .shadow + .bob > .squash > svg.art + badges + sparkles`.
Animation is 100% CSS keyframes scoped to `[data-s=idle|working|attention|done]`, animating only `transform` and
`opacity` on HTML layers (compositor only); colours cross-fade through registered `@property` custom colours (`--a`,
`--b`, `--glow`). No JS runs per frame; `state` just flips a `data-s` attribute. Drawing rules (CONTRIBUTING): 120x120
viewBox, no SVG filters, every animated part in its own `<g>` without a `transform` attribute, static fallback props for lite mode.

Customisation. Variant list is closed; but a new character is one file of SVG + CSS, so our own helmet/cowlick/glasses
would be a 25th character. Colours come from the state palette (not freely themable); face parts (blink, look) are shared.

States (4): idle (blink every 4.6 s, breathing), working (typing dots, eyes sweep side to side), attention (orange "!"
badge, wiggle), done (green check badge, jump, sparkles). Transition: 0.5 s colour cross-fade, badge `pop`, each state
has its own animations; nothing is interpolated between poses.

Interaction. None beyond hover on the host. No pointer follow.

Reduced motion and accessibility. `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }`
plus badge fallbacks; `data-lite` (size <= 32 or reduced motion at render time) keeps idle still and shows static props;
`[data-off]` pauses animations offscreen (one shared IntersectionObserver). `role="img"` + `aria-label` defaulting to
`Agent <state>`. Live OS toggle: the CSS part reacts immediately, the lite attribute on the next update (their own comment).

Performance. Best of the six per avatar: no per-frame JS, no filters, shared constructable stylesheets per variant, cached
`<template>`; README claims 300 avatars at 28 px at 60 fps (not verified by me).

Size. All 24 characters: 22.2 KB gzip (sum of unminified sources, matches their 22 kB badge; budget 30 KB enforced by
`pnpm size`). Element + core + one character: about 5 KB gzip (4.5 KB + 0.85 KB, my estimate from separate gzips).

Licence and design. MIT; "Created by Manno Beats for Zeeli". The 24 characters are their art; nothing in the repo
reserves them explicitly, but we would not use any of them.

Maintenance. 0 stars, v0.6.0, last commit 2026-09-27 (API shows a push on 2026-10-11), CI, Biome, SECURITY and
CODE_OF_CONDUCT, type tests that must fail on invalid usage, SSR import test (imports cleanly in Node), size budget.
Young but the tidiest code hygiene; tiny community.

## 3. Direct answers

### 3.1 Can we keep our own outline and glasses and get richer states (sleep, wink, wide eyes, waiting, done, error)?

Yes, but no repo delivers all of it. Only open-bot-avatar takes an arbitrary single-path outline as data and already
runs our design in the prototype; none of the six has square glasses on a flat 2D head (blob-atelier's are WebGL-only,
for animals). So the answer is a combination: open-bot-avatar for body, volume and gaze; our own state layer for eyes,
glasses and extra poses, borrowing the best vocabulary from the others.

Why open-bot-avatar can carry it. `avatarFrame()` returns each eye as `{ kind: 'eye', matrix, mark }` where `matrix` is the
eye's plane transform and `mark` is its position and size (including gaze offset). The prototype already ignores
open-bot-avatar's own drawing of the eye and draws our glasses in that plane. The same trick works for the eyes: keep the
matrix and the mark's centre, draw our own shape from a per-state spec. What the engine cannot do: more than three
body moods, per-eye blink (wink), thin-slit closed eyes (the lowest it closes is `max(h*0.09, w*0.55)`, a stubby pill),
non-pill eye shapes other than the `^` arc.

What to write or port, per state (each is a small function of state, time and the engine's mark):

| State | What it needs | Where to borrow from | Where it lives |
|---|---|---|---|
| sleep | Lids close to a thin slit (top 7, bottom 14 in BoopFace's lid space), slow breathing, head pitched down, optional "z" after 60 s idle, wake on pointer/key | BoopFace `POSES.sleep` and its auto-sleep/wake policy (`auto-sleep`, `wake-on`); open-mascot-studio `sleeping` motion (4.7 s sleepy, 2.1 s sad, loop) for timing | Eye spec (`slit`) + new body pose `sleep` + a small idle timer |
| wink | One eye closes, other stays open, small head tilt, hold ~0.4 s, then reopen | bloub `wink`: closed eye is a horizontal dash wider than the open eye (width 0.447 vs 0.236 for the open eye, in ball-radius units) plus a roll; open-mascot-studio: per-eye `scaleY` | Eye spec per eye, a `{ blinkL, blinkR }` override (engine only has one `blink`) |
| wide | Both eyes taller and a bit apart, brows (glasses bar) lift slightly | BoopFace `surprise` (68x68 eyes, 3.4 spread), open-mascot-studio `surprised` | Eye scale multiplier + glasses lift of 1 to 2 units |
| waiting | Looping, non-alarming, readable at 40 px: eyes travel in a loop, or the engine's `thinking` mood | BoopFace `waiting-spin/wrap/wave` (eye path as a function of phase); engine `thinking` already exists | Gaze path function fed into the engine's `gaze`, or `motion: 'thinking'` as the cheap version |
| done | Hop, `^ ^` eyes, brief sparkle or check badge, then settle | Engine `happy` (hop plus arc eyes) exists; blob-atelier and agent-avatar draw a green check badge and sparkles (about 15 lines of SVG each) | Mood `happy` + one overlay group with CSS keyframes (opacity/transform) |
| error | Chevron `< >` or droop, shake, red accent; our red `#FF4949` top bar can flash/tilt once | blob-atelier `error` (chevron eyes, shake), BoopFace `failure` (head and eyes droop), `refuse` (head shake) | Eye spec (`chevron`), outer root transform shake (a few cycles), sad pose |

Body motion beyond the three moods can be done without forking: wrap the engine's `root` matrix in an outer
transform for shake, tilt, droop and hop. If we later want sleep/error as true poses (pitch, squash), `computePose` and
`blendPoses` are exported and small; add an optional `pose` override to `RenderOptions` (about 3 lines in `poseOf`) in the
vendored copy.

The eye layer is the only real new code: about 120 to 200 lines (an `EyeSpec { shape: pill | arc | slit | chevron, w, h,
tilt, lidTop, lidBottom }`, a table per state, interpolation between specs, and drawing as SVG `rect`/`path`). BoopFace's
lid model is the best idea to port: draw a pill and clip it with two rotated rectangles; slit, droop, angry and sad all
fall out of four numbers. Open-mascot-studio's JSON pose table is the best data format.

Alternative if volume is dropped: see the fallback in section 4.

### 3.2 Integration plan for `<DeanLogo>` (Astro)

Where it lives. `@blog/core` already holds shared components and client code; themes import from it. Add:

- `packages/core/src/vendor/open-bot-avatar/` : copy of `packages/core/src/*.ts` from upstream (index, render, volume,
  path, contour, seams, validate, motion, mood, follow, animator, color, types), plus `LICENSE` and a `VENDOR.md` with the
  upstream commit hash and the list of local patches. Do not copy `dom/`, `examples.ts`, scene rendering, or the site app.
  Vendoring (not npm) because the package is 0.2.0 and still changing its renderer, we need a possible 3-line patch, and the
  bundle should contain only what we call.
- `packages/core/src/dean/` : our code. `definition.ts` (dean.json as a typed const), `frame.ts` (pure
  `deanFrame(state, t, gaze, motionAllowed)` returning body slices, eyes, glasses; plus `toSvg(frame)`), `states.ts`
  (eye specs and state table), `controller.ts` (the client loop).
- `packages/core/src/components/DeanLogo.astro` : the component.

SSR first. In the Astro frontmatter, call `deanFrame('idle', 0, null, false)` and `toSvg()` to emit the full static SVG:
body slices as `<use>` (that is what `renderAvatarSvg` already produces), eyes, glasses with the red top bar, `role="img"`
and `aria-label="dean"` (or `aria-hidden` when it sits inside a link whose text already names the site). It is complete
content with zero JS and identical to the reduced-motion frame, so there is no flash on hydrate. Add `data-dean` and
`data-state="idle"` attributes. The same pure `deanFrame` runs at build and in the browser, so SSR and client cannot
drift.

Hydration. A tiny inline-or-module script (a few hundred bytes) finds `[data-dean]` and decides:

```ts
import { motionAllowed } from '@blog/core/client/preferences';
// per element:
if (motionAllowed()) start();           // dynamic import('./controller') after idle + visible
document.addEventListener('prefs:change', () => (motionAllowed() ? start() : stop()));
```

`start()` does `import('../dean/controller')` via `requestIdleCallback` (timeout fallback) and an
IntersectionObserver, so the engine chunk is fetched after load and only when the logo is on screen. Nothing blocks content.
`stop()` cancels the rAF, removes `pointermove`, renders one calm frame with `reducedMotion: true` (so the engine itself
freezes the pose; the open-bot-avatar flag is a render option, not only a media query), and leaves the SSR DOM in place.
Do not use open-bot-avatar's own `dom/` mount or its `reducedMotion: 'system'`: it listens to the media query only and
knows nothing about reading mode or `data-motion`. Read `motionAllowed()` each frame batch and on `prefs:change`; pass
`!motionAllowed()` as `reducedMotion`.

Draw loop. Do not `replaceChildren` each frame as the prototype does. Keep the SSR `<use>` nodes in a pool, update only
`transform`, `display`, and the eye/glasses `transform`/`d`/`height` attributes, and add or remove `<use>` for slices when
the visible set changes (it changes rarely). Cap at 30 fps under 128 px (upstream does the same), pause on
`document.hidden` and when the IntersectionObserver says offscreen, one shared loop for header and footer logos. Canvas
is not an option for our glasses (the upstream painter only draws slices and two marks) unless we port `paint.ts` and add
glasses to it; I would avoid that.

States API. A DOM attribute and an event, so any page can drive the logo without importing it:
`document.dispatchEvent(new CustomEvent('dean:state', { detail: 'waiting' }))` and `<dean-logo data-state>`; the controller
transitions with the engine's `createAnimator` for mood/gaze and our own 250 to 400 ms interpolation of eye specs. Suggested bindings:
`waiting` while search or the comments iframe loads, `done` on copy-code and on successful subscribe, `error` on the 404 page
and failed fetches, `wink` on logo hover or click, `wide` on first scroll into the footer, `sleep` after 60 s without input
(wakes on `pointermove`, `keydown`, `scroll`). All timers and listeners belong to the controller and are removed by `stop()`.
The `done` and `error` states fire only on user-initiated events, not on a timer.

Accessibility. The logo is in a link: the link supplies the name, the SVG is `aria-hidden="true"`; state changes are not
announced (decorative). Real status (copy succeeded, error) stays in the existing live regions. Link target 44 px minimum
and visible focus ring, regardless of the SVG size. No sound. Contrast: ink on the page background in both themes, paper
eyes on ink: both far above 4.5:1; check the red `#FF4949` bar against ink (about 5.2:1 by a relative-luminance
calculation; verify with the theme tokens).

Size budget (gzip). SSR markup: under 3 KB inline per instance (one definition string, slices as `<use>`). Lazy JS chunk:
13.2 KB (engine `avatarFrame` + validate) plus about 1.5 KB animator/follow/mood plus about 3 KB our state layer, so a
target of at most 20 KB gzip, loaded after load/idle and only when visible; hard gate in CI with
`node scripts/verify-theme.mjs` extended or a `size-limit` check. Zero fonts, zero images. If the real bundle exceeds
20 KB, use the fallback tier for sizes under 64 px.

Verification (per CLAUDE.md): screenshots at 390 px and 1440 px in light, dark, reduced-motion and reading mode; the
verify-theme contract that reading mode and `prefers-reduced-motion` give a static page; a test that toggling reading
mode while running stops the rAF (listen for `prefs:change`).

Step 0 spike (before committing to the plan): bundle `deanFrame` with `bun build`, call it 300 times in a browser
performance trace, record per-frame ms and the node counts for `idle`, `thinking`, `happy` at 600 px and 48 px. If per-frame
cost or node count is bad at header size, switch the header instance to the fallback and keep the engine for the hero.

### 3.3 Recommendation

Primary: vendor open-bot-avatar's pure core (validate, volume, render, motion, animator) and write a thin `dean` state
layer on top. Reasons:

1. It is the only library that takes our outline as data and keeps its silhouette alive when the head turns, and the
   prototype already proves the look with our cowlick; others would force a redraw (agent-avatar), a star-shaped
   profile (bloub), or hard-code the head (BoopFace, open-mascot-studio).
2. The core is pure and deterministic by design (`computePose` takes seed and time), which matches our "SSR shows the
   same SVG, then hydrate" and reduced-motion model, and lets us render the exact still for reduced motion.
3. `avatarFrame()` gives the eye plane matrices we need for glasses and for custom eye shapes; the extra states are
   data (eye specs) plus an outer transform, about 200 lines of our code, with BoopFace's lid model and
   open-mascot-studio's pose table as design references.
4. MIT, no design claims, active maintenance (pushed today, tests, contract), and 13 KB gzip for the part we call is
   acceptable as a lazy chunk.

Risks to accept: pre-1.0 API churn (mitigated by vendoring a pinned commit and our own tests that render all states),
single maintainer, unmeasured per-frame cost of SVG slices (spike first), and we own the eye layer and the SVG
patching code.

Fallback: a flat 2D, CSS-driven logo in the style of agent-avatar. Draw the outline, eyes and glasses as layered SVG
groups (body, eyes, lids, glasses, badges) and drive states by a `data-state` attribute with CSS keyframes on
`transform` and `opacity` only, gaze as two CSS variables set from a single throttled `pointermove`. No volume
inference, no per-frame JS beyond gaze. It needs about 1 to 2 KB of CSS plus a small controller (about 1 KB gzip), is
compositor-only, and degrades by construction: reduced motion and reading mode are a `[data-motion=reduce]` selector
that sets `animation: none`, so `prefs:change` is one attribute flip. Lose: the body turn from volume inference,
smooth mood blending, and sleep/wink eye shapes that need real geometry change (use two or three pre-drawn eye
variants swapped by state). Use it where the primary is too heavy: header logo under 64 px, low-end devices, or if the
spike fails. Reasons not to make it primary: states that change eye geometry (slit, chevron, wink) and head turning
need either JS or many hand-drawn variants, and the result would look flatter than what we have in the prototype.

Not recommended: bloub (code is fine, but it recreates xAI's design and its constants are measurements of it; French
code base; our cowlick does not map to a radial profile), BoopFace (original character we may not reuse, 26 KB gzip
lite, whole-window listeners and gestures we do not want; mine it for the lid-pose table and waiting motions only),
blob-atelier (no reduced-motion or accessibility handling, three.js from a CDN, accessories 3D only),
open-mascot-studio (analytic body, no custom outline, no live reduced-motion listener; mine the pose JSON and
per-eye parameters).

## 4. Port and reuse checklist

- From open-bot-avatar: `validate.ts`, `volume.ts`, `path.ts`, `contour.ts`, `seams.ts`, `render.ts`, `motion.ts`,
  `mood.ts`, `follow.ts`, `animator.ts`, `color.ts`, `types.ts`; keep MIT licence and a commit hash. Skip `dom/`.
- From BoopFace (idea, rewrite): lid pose table, `auto-sleep`/`wake-on` policy, waiting-wave/wrap eye paths, `action-state`
  style event with phase start/end/cancel, hosts reading state through events not attributes.
- From open-mascot-studio (idea, rewrite): per-eye pose fields (`scaleX, scaleY, x, y, rotation`), animations as step lists
  with `holdMs`, `transitionMs`, `easing`, and pure `sampleAnimation(elapsedMs)` for reproducible frames.
- From bloub (structure only, not constants): `sample(t)` must not mutate, state change inside a fade blends from the frozen
  composite pose, `frozenAt` for screenshots; blink hides a state's entry (`blinkIn`).
- From blob-atelier / agent-avatar (visual ideas, rewrite): done badge and sparkles, error chevron eyes and `!` badge, lite
  mode at small sizes, `data-off` pause, shared IntersectionObserver.
- Do not use: any xAI-derived constants or silhouettes (bloub, open-mascot-studio visuals), BoopFace head/face/antenna, any
  agent-avatar or blob-atelier character art.

## 5. Caveats

- All sizes are bundler output of the pure sources, not what a Vite build with tree-shaking will produce for our final
  entry; the real number needs a bundle of our own entry file.
- The unofficial claims in each README (300 avatars at 60 fps, 70 KB for all skins) were not tested.
- The prototype's current glasses are drawn in the paper colour; the red `#FF4949` heavy top bar is not in it yet.
- agent-avatar `pushed_at` (2026-10-11) is later than its last commit date on the default branch (2026-09-27); likely tags or
  another branch. Stars of 0 and 9 to 10 mean little community review for agent-avatar, blob-atelier and open-mascot-studio.
