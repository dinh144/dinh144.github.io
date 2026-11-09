# Blog design lab (dinh144.github.io)

Bilingual personal dev blog: Vietnamese at the root, English under `/en/`. Right now the repo is a **design lab**:
one shared content store and core package, plus four complete concept themes that compete. The winner later
moves to the site root and the rest get deleted.

## Map
- `content/` – the only content. `posts/{vi,en}/<slug>.md` (same slug = same post), `series/<id>.yml`,
  `pages/{vi,en}/about.md`, `media/` (CMS uploads, served at `/media/`). Edited by humans and Sveltia CMS.
- `packages/core` (`@blog/core`) – schema, collections, i18n strings, routes/paths, post queries, RSS, OG images,
  Markdown pipeline (KaTeX + dual Shiki), client preferences + sound, and shared components (Seo, PrefsInit,
  Giscus, Analytics, Search). Themes import from here; they never duplicate it.
- `apps/hub` – site root during the lab: lab index, Sveltia CMS at `/admin/` (config in `public/admin/config.yml`).
- `apps/base` – reference theme: every route and feature, plain styling. New themes start as a copy of it.
- `apps/<concept>` – concept themes `ink`, `signal`, `rhythm`, `constellation`, each served at `/lab/<concept>/`.
- `docs/concepts/<concept>.md` – the brief each theme is built from.
- `scripts/build-all.mjs` – builds hub + all themes and assembles `dist/` for GitHub Pages.
- `scripts/verify-theme.mjs` – build + screenshot + contract checks for one theme (see the verify-theme skill).
- `tools/claude/` – committed copy of the Claude Code harness (agents, skills, settings); `scripts/setup-claude.sh`
  installs it into `.claude/`.

## Commands (run from the repo root)
- Install: `pnpm install` (in the sandbox add `--store-dir "$TMPDIR/pnpm-store"` and `npm_config_cache=$TMPDIR/npm-cache`)
- Dev one theme: `pnpm --filter <app> dev` · build one: `pnpm --filter <app> build`
- Build everything: `pnpm build` → `dist/`
- Verify a theme: `node scripts/verify-theme.mjs <app>` → `apps/<app>/.verify/`
- Type check: `pnpm --filter <app> check` (known issue: crashes on Node 26 inside the @emnapi/runtime beta; the build catches real errors meanwhile)

## Rules
- Fonts must include the Google Fonts `vietnamese` subset; self-host with @fontsource. Test ệ ữ ặ ở large.
- Motion contract: effects start only when `motionAllowed()` (from `@blog/core/client/preferences`) is true and
  stop on `prefs:change`. Reading mode and `prefers-reduced-motion` give a fully static page. Content renders
  before any effect loads. Sound only via `@blog/core/client/sound`, off by default.
- Accessibility floor: real links/buttons, visible focus, 44 px targets, 4.5:1 text contrast in light and dark.
- Every page works in both languages; untranslated posts fall back to Vietnamese with a notice.
- Verify with screenshots before calling UI work done.
- Code, comments and commit messages in English; site copy in Vietnamese and English.
- Lab analytics stay off (`PUBLIC_ANALYTICS` unset). Giscus ids live in `packages/core/src/site.ts`.
