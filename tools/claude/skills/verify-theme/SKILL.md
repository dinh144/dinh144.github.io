---
name: verify-theme
description: Build one lab theme and capture evidence (screenshots at 390 px and 1440 px in light, dark, reduced-motion and reading mode, plus a JSON report of console errors, failed requests, lang, h1, overflow, touch targets and the motion contract). Use before reporting any theme work as done, after visual changes, and when reviewing a theme.
---

# verify-theme

Evidence before claims: a theme change is not done until you have looked at these screenshots.

## Run

```bash
node scripts/verify-theme.mjs <theme>            # build + capture everything
node scripts/verify-theme.mjs <theme> --no-build # reuse apps/<theme>/dist
node scripts/verify-theme.mjs <theme> --only=home,article
```

Run it from the workspace root (in a worktree: the worktree root, after `pnpm install`).
It serves `apps/<theme>/dist` at `/lab/<theme>/` on a local port, drives Chromium with Playwright,
and writes:

- `apps/<theme>/.verify/shots/<route>.<desktop|mobile>.<mode>.png`
  (`home` and `article` also get `dark`, `reduced`, `reading` and a `.scrolled` shot)
- `apps/<theme>/.verify/report.json` (per-shot facts + an `issues` list)

## Then

1. Open the screenshots with the Read tool. Look at every `home` and `article` shot and at least the mobile shots of the other routes.
2. Fix every issue in `report.json` that belongs to your theme: `console-error`, `page-error`, `http-4xx`, `lang`, `h1-count`, `horizontal-overflow`, `img-alt`, `motion-contract`, `theme-contract`, `small-targets`.
3. Check by eye what the script cannot: Vietnamese tone marks (ệ ữ ặ ở) render in the display font without clipping; text is readable before effects load; reading mode and reduced motion are calm and static; dark mode has 4.5:1 text contrast.
4. Re-run until clean, then report what you saw (name the screenshots) and anything left open.

Effects the script cannot see (scroll choreography, hover, transitions): check them with the Playwright MCP tools (`browser_navigate`, `browser_resize`, `browser_take_screenshot`, `browser_evaluate` to scroll).
