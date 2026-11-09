---
title: One blog, four designs
description: "How one content store feeds four complete versions of a blog at once: a shared core, a motion contract, and why reading mode is the most important feature."
date: 2026-11-10
type: article
series:
  id: design-lab
  part: 2
tags: [astro, thiết-kế, kiến-trúc]
aiDraft: true
---

In [the previous part](../bon-huong-thiet-ke/) I picked four art directions. This part is the engineering story: how to run four versions of the blog on the same content without any of them rewriting the core.

## One content store, four ways to tell it

Every post lives in a single `content/` folder. Each design is its own Astro app, but none of them reads Markdown files directly. They ask a shared core package, `@blog/core`, which hands back processed data: which post belongs to which series, which post has no translation yet, which topics are shared.[^core-layer]

```text
content/          ← content only
packages/core/    ← schema, i18n, paths, RSS, share images
apps/hub/         ← site root + Sveltia CMS
apps/base/        ← reference design with every feature
apps/ink/ …       ← the four competing designs
```

So when I fix a bug in how the translation fallback works, all four designs are fixed in the same build.

## The motion contract

All four designs carry heavy effects: WebGL, smooth scrolling, moving type. To keep them from trampling the reader, every effect follows one shared contract:

1. Text must render and be readable **before** any effect has loaded.
2. Before it runs, an effect asks `motionAllowed()`. If the operating system asks for reduced motion, or the reader turned reading mode on, the answer is no.
3. When that state changes mid-page, the effect cleans up after itself instead of leaving a frozen frame behind.

```ts
document.addEventListener('prefs:change', () => {
  if (!motionAllowed()) field.dispose();
});
```

The state is written as attributes on the `<html>` element: `data-motion="reduce"` or `"full"`. A tiny script runs before the page paints, so there is never a moment where an effect flashes on and then off.[^flash]

## Sound without files

Two of the reference sites use sound, so the blog does too, off by default. There are no audio files: the page-turn sound is white noise through a band-pass filter, and the ink drop is a sine wave gliding from 520 Hz down to 180 Hz in a quarter of a second.[^webaudio] Web Audio generates it all in the browser.

## Verified with screenshots

A design only counts as done when a script captures every page at two screen sizes and in four modes: light, dark, reduced motion and reading mode. The script also checks the things that are easy to forget: exactly one `h1`, no sideways scrolling, 44-pixel touch targets, and a `lang` attribute that matches the language.

| Check | Why |
| --- | --- |
| `data-motion="reduce"` in reading mode | The motion contract |
| No sideways scroll at 390 px | Phones are where people read |
| Touch targets ≥ 44 px | Fingers are less precise than a mouse |
| Correct `lang` | Screen readers and per-language search |

## What I learned

The hard part is not making effects beautiful, it is making them **know when to step back**. An award-winning site can impress for ten seconds; a blog has to stay readable for ten minutes.

[^core-layer]: The core knows nothing about design. It only returns data plus a few unstyled pieces such as the comment block and meta tags.

[^flash]: It is the same trick many sites use to avoid a light/dark flash: read the saved choice and set the attribute before any CSS applies.

[^webaudio]: It is also why sound never autoplays: browsers only let Web Audio start after a user gesture.
