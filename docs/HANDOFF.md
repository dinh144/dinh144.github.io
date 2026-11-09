# Handoff — design lab (stopped 2026-11-09, ~17:15)

Goal from the owner: **"as premium as possible, no budget"** (Awwwards Site-of-the-Day bar), immersive on
every page and on phones, with reading mode / reduced motion as the escape hatch. Read `CLAUDE.md` first.

## Live
- Hub: https://dinh144.github.io/ · CMS: https://dinh144.github.io/admin/ (Sveltia, GitHub token sign-in; not tested end to end)
- Lab themes on `main` (deployed by `.github/workflows/deploy.yml` on every push to main):
  `/lab/base/`, `/lab/rhythm/`, `/lab/constellation/`, `/lab/signal/`. `ink` is NOT on main yet.
- Claude Design canvases: concept stills https://claude.ai/artifact/Uyrw7nss1NK1nwctmXbJiW ·
  earlier typographic directions A–D https://claude.ai/artifact/VMDt45dLGrTf9Sa9B8Uawe

## Theme status

| Theme | On main? | Last independent review | State | Next step |
|---|---|---|---|---|
| rhythm | yes (2nd pass merged) | 7.40 before 2nd pass; builder estimates ~7.8 after | review fixes + margin sidenotes done | re-review (the re-review was stopped before it reported) |
| constellation | yes (1st pass) | **7.3** | 2nd pass PARTIAL: WIP commit `9007161` on branch `worktree-agent-a7b810888fb4a9f8d`, unverified | finish the 10 fixes below, verify, merge |
| signal | yes (1st pass) | **7.5** | 2nd pass NOT started (branch at `c659fd1` = main) | apply the 12 fixes below, verify, merge |
| ink | no | none yet | whole theme as WIP commit `91c9ebf` on branch `worktree-agent-aacd776abd41f2a4f`, unverified (builder was in its 3rd verify/critique loop) | finish + verify, merge, review |

Worktrees (git worktrees, branches pushed to origin for safety) live in `.claude/worktrees/agent-*`.
Resume a theme by launching the `theme-builder` agent with `isolation: worktree` and telling it to start from
that branch (or check the branch out in a fresh worktree), then `git merge main` first.
Merging into main: `git merge --no-ff <branch>`, then `pnpm install --no-frozen-lockfile` (resolves lockfile
conflicts), check `pnpm install --frozen-lockfile`, `pnpm build`, `node scripts/verify-theme.mjs <theme> --no-build`,
commit, `git push origin main` (the sandbox cannot write .git/config, so always name the remote + branch).

## Pending fixes

### constellation (review 7.3: D 7.4 / U 7.6 / C 7.0 / N 7.0)
1. 1024×768: chart labels overprint the h1 (8 overlaps, Sveltia label off-viewport); layout solved in px for 1440×820 but rendered in %. Solve per breakpoint; add a label-collision check.
2. Phones 390/360: 8–12 overlaps. `lib/sky.ts` HOME.port.bounds.h 352→440, avoid[0].y 500→590; portrait labels only article stars + series name; hide `.hero-hint`.
3. Touch: first tap = preview (`.is-hot`), second tap flies.
4. Series/tag anchor labels collide with lines and titles (also at 1440, and on /tags/astro/): halo on `.anchor`, anchors avoid star footprints + series segments in `simulate()`.
5. EN chart shows Vietnamese tag names; add `fallback` to SkyStar and mark fallback titles (lang="vi" + "VI").
6. Article mini-map: label the current star, show only real neighbours (shared tag/series, max 5), "Bạn ở đây / You are here".
7. Dawn theme meteor looks like an ink scratch: skip in light or tint + fade.
8. Pause WebGL when the sky is dimmed and no stage is in view; `powerPreference: 'default'`.
9. Shiki comment contrast 4.19/3.70 → override #57606A light / #8B949E dark.
10. Creativity: real camera dolly into depth on fly-to-star; dark-first default; keep the static chart in reduced-motion (not reading) mode.

### signal (review 7.5: D 7.6 / U 7.3 / C 7.9 / N 7.0)
1. **Contract fail**: reading mode still plays the CRT off/on view transition (global.css ~2021-2025 targets `::view-transition-*(root)`, Astro names it `astro-…-1`) → use `(*)` or gate on data-motion.
2. HUD unreadable over glyphs (/posts/, /search/, /series/design-lab/ mobile) → backdrop + padding or anchor bottom-left.
3. Vertical seams in the field: engine.ts:102 → `minFilter = LinearFilter; generateMipmaps = false`.
4. Footnotes look like part of the last list → border-top block, visible `── chú thích ──` label, `.prose sup { line-height: 0 }`.
5. About body ~150 ch/line → `.about-body .prose { max-width: 40rem }`.
6. `/tags/` horizontal scroll at 320/360 → `.tag-table .bar { width:auto; max-width:0; overflow:hidden; white-space:nowrap }`.
7. Titles collide with the shape: hero preset `cx: 0.74, scale: 0.8`; mobile openers `cySm: 0.32` or a mask fade.
8. Phosphor accent ≈ ink → `--accent: #6dff7a; --accent-ink: #031004`.
9. Desktop TOC links 32 px → 44 px.
10. Reading mode should hide `.opener > .field` and `.hud` (a visible "quiet screen").
11. Mobile gutter → `clamp(20px, 5vw, 48px)`.
12. Skip the 133 KB engine when `saveData`; trim three.js imports.

### rhythm (re-review pending)
Builder's own open items: motion chunk ~36 KB gzip; theme UI strings in `apps/rhythm/src/lib/copy.ts` should move to core i18n if it wins; core has no "pause rhythm" preference slot.

## Core requests from the builders (do once a winner is picked)
- Move theme UI strings (`apps/*/src/lib/copy.ts`) into `@blog/core/i18n`.
- Preferences: allow theme-defined screens (signal's phosphor) and a "pause motion" slot.
- Tag display names per locale (constellation EN shows Vietnamese tags).

## Owner to-dos
- Install the giscus GitHub app on the repo: https://github.com/apps/giscus (comments stay blank until then).
- Try /admin with a GitHub token (repo contents read+write); set Gemini as translator in Sveltia settings.
- Pick the winning concept after trying the 4 themes on a phone. Then: blog name, Design System artifact in
  Claude Design for the winner, Playbook rules into CLAUDE.md, move the winner to the site root, delete the rest.
- Paid extras were never answered (custom domain, $65 Awwwards submission, Claude API translations, premium fonts);
  currently everything stays free.

## Environment notes (sandbox)
- Install: `pnpm install --store-dir "$TMPDIR/pnpm-store"` with `npm_config_cache=$TMPDIR/npm-cache`; Bash needs `allowed_domains: ["registry.npmjs.org"]`.
- Chromium only runs as Playwright's chromium_headless_shell (scripts/verify-theme.mjs picks it); the proxy blocks giscus.app and most reference sites, so the 48 giscus issues in verify reports are expected.
- `.claude/settings*.json` were installed by the owner from `tools/claude/` (`cp -f`, outside Claude Code).
- `astro check` works (pinned `@emnapi/runtime` override in pnpm-workspace.yaml).
