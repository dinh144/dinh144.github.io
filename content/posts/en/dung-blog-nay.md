---
title: How I built this blog
description: "Astro, Sveltia CMS, Claude Design and a translate button: the whole path from an empty folder to dinh144.github.io, for zero cost."
date: 2026-11-09
type: article
tags: [astro, i18n, thiết-kế]
aiDraft: true
---

> **Summary.** The blog runs on Astro and GitHub Pages, posts are written in Sveltia CMS, and every post has a Vietnamese and an English version. No server, no monthly bill.

## Why build my own

I wanted a long-term place to write: long posts about the projects I am working on, short notes whenever I learn something, and a few links worth reading. Hosted platforms either hold on to my content, make bilingual writing awkward, or will not let me tune the design down to the letter spacing.

## Astro and two languages

Astro suits a blog because every page it produces is static HTML. Vietnamese lives at the root and English under `/en/`. Posts are Markdown files in two parallel folders:

```text
content/posts/
├── vi/dung-blog-nay.md
└── en/dung-blog-nay.md
```

The same file name means the same post. If the English version does not exist yet, the `/en/` page shows the Vietnamese text with a short notice, so shared links never break.

```ts
// Pick the translation, fall back to Vietnamese
const entry = slot[locale] ?? slot['vi'];
const fallback = !slot[locale];
```

## Writing in Sveltia CMS

Sveltia runs right at `/admin`, signs in with a GitHub token and saves each post as a Markdown file in the repo. Once the Vietnamese version is done, I press **Translate** so Gemini drafts the English one, then rewrite it until it reads naturally. Drafts I have not reviewed yet carry an `aiDraft` flag, and the page says it is a machine translation.

## Designing with Claude Design

Before writing any CSS, I laid out design directions on a canvas, then built four complete versions of the blog on one shared content store. The winning direction becomes the real design. The [Design lab](../../series/design-lab/) series covers that part.

## Cost: zero

| Part | Tool | Price |
| --- | --- | --- |
| Hosting | GitHub Pages | 0 |
| Content | Markdown in git | 0 |
| Admin | Sveltia CMS | 0 |
| Translation | Gemini (free tier) | 0 |
| Comments | Giscus (GitHub Discussions) | 0 |
