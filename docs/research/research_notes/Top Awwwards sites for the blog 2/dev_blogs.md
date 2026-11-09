# Craft-led personal developer / design-engineer blogs (2024-2026) as references for a premium bilingual Astro/GSAP/Three.js blog

Method notes. Tools: Firecrawl (ran out of credits mid-run), Exa, and Playwright. SEEN = read on a page I fetched, or measured live in a browser on 2026-11-09 (1440 px viewport; mobile = 390 px). INFERRED = my reading of what SEEN data implies. Measured numbers are paragraph box widths and computed styles on one article URL per site, so they are a snapshot, not a spec. My automatic detectors for "TOC / sidenote / progress bar / language switcher" were noisy (they match generic class names), so I only report them where a page or source confirms them.

Already-studied sites excluded per brief (guillaumecolombel.fr, leoparpeix.com, gilhuybrecht.com, mariavasilyeva.com, gionatannese.com, samgoddard.co.uk, tej.as, theboringblog.ai, runtimewire.com, thefwa.net).

## Which personal dev blogs are most often cited as the best-crafted in 2024-2026, and why?

### Takeaway
The consistently cited set is joshwcomeau.com, blog.maximeheckel.com, ciechanow.ski, maggieappleton.com, emilkowal.ski, rauno.me / devouringdetails.com, overreacted.io and garden.bradwoods.io, plus quieter references (brittanychiang.com, antfu.me, paco.me, leerob.com, henry.codes, lynnandtonic.com). None of the blogs I checked advertises Awwwards / CSS Design Awards / FWA wins. I found no verified award for any of them, so the recognition is peer citation (HN, testimonials, download counts), not juried awards. They win on content-integrated interaction and typographic restraint, not on page-level spectacle.

### Cited Findings (ranked shortlist, with recognition and evidence)

1. **Josh W. Comeau - https://www.joshwcomeau.com** (author: Josh W. Comeau; Montreal indie educator)
   - Recognition: HN commenter lists it first among "beautiful blog UI" answers in the March 2026 Ask HN thread (153 points, 58 comments) - [Ask HN thread](https://news.ycombinator.com/item?id=47302553). HackerBlogs tracker shows top HN posts including "CSS Gradients that avoid the gray dead zone" 1.1K points, "An interactive guide to Flexbox" 844, "An interactive guide to SVG paths" 455 (first shared 2025), "Next-level frosted glass with backdrop-filter" 387 (2024), "Springs and bounces in native CSS" 333 (2025) - [HackerBlogs](https://hackerblogs.app/blog/joshwcomeau.com). The like counter on his colophon post shows 220,474 likes - [How I Built My Blog](https://www.joshwcomeau.com/blog/how-i-built-my-blog/). No award found.
   - Stack: Next.js static generation, MDX via next-mdx-remote, styled-components, React Spring (some Framer Motion), Reach UI for modals, MongoDB for hit/like counters, Vercel; closed source but sourcemaps are on - [colophon](https://www.joshwcomeau.com/blog/how-i-built-my-blog/). Live page scripts are `_next/static` (Next App Router) - SEEN by Playwright.
   - Signature techniques: bespoke React widget per article (SpringMechanism "drag, or focus and press Space"), a forked `Playground` with HTML/CSS tabs, focus trap on the editor with "press Escape" hint, resize handle operable with arrow keys, and a result iframe - [colophon](https://www.joshwcomeau.com/blog/how-i-built-my-blog/). 4 iframes on the Flexbox guide - SEEN. Custom "spicy"/"sparkly" text, 90s hit counter, heart like button (up to 16 likes per user, IP-hash rate limit), FakeTweet component to avoid the Twitter SDK - [colophon](https://www.joshwcomeau.com/blog/how-i-built-my-blog/). Light/dark toggle plays a light-switch sound; hover "pop" sounds on tags - [Epic React interview with Josh](https://www.epicreact.dev/modules/epic-react-expert-interviews/animations-and-interactions-with-josh-comeau); `use-sound` hook - [React articles index](https://www.joshwcomeau.com/react/).
   - Article page (measured): paragraph column 686 px, Wotfard 18 px / 27 px line-height, near-black text (rgb 10,12,16) on light; light text rgb(227,230,232) in dark emulation. Code block computed font is `monospace`, 16 px, transparent background (code is rendered by a custom component, so my measurement of `pre` is not representative). Page has a visible "Last updated April 27th, 2026" line, a "Content warning: food metaphor" aside and a "Way better on desktop! ... demos don't work great on smaller devices" notice - [Flexbox guide](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/). Full-bleed layout trick via CSS grid (his own article, reused by Maggie Appleton below).
   - Mobile (390 px): no horizontal overflow, but he openly says some demos are desktop-first - SEEN.
   - Accessibility / motion: 28 `prefers-reduced-motion` rules in the loaded stylesheets (SEEN). He teaches an "opt-in" pattern: put `transition` inside `@media (prefers-reduced-motion: no-preference)` so unsupported browsers default to no animation, and a `usePrefersReducedMotion` hook that listens for changes - [Accessible Animations in React](https://www.joshwcomeau.com/react/prefers-reduced-motion/). Interview quote: give people a way to opt out the moment something moves (vestibular issues) - [Epic React](https://www.epicreact.dev/modules/epic-react-expert-interviews/animations-and-interactions-with-josh-comeau). Editor playgrounds trap focus but announce how to leave.
   - i18n: none (lang="en", no hreflang) - SEEN.
   - Borrow: (1) "opt-in motion" pattern (reduced-motion default off, enable under `no-preference`) plus a change listener - matches this project's `motionAllowed()` + `prefs:change` contract. (2) Playground widgets with a keyboard-escape focus trap hint. (3) Honest per-article "best on desktop" notice instead of broken mobile demos.

2. **Maxime Heckel - https://blog.maximeheckel.com** (author: Maxime Heckel; design engineer; spoke at Figma Config 2025 per his own post "Speaking at Figma Config 2025", May 8 2025)
   - Recognition: listed under "Maximalist" by an HN commenter in the March 2026 thread - [Ask HN](https://news.ycombinator.com/item?id=47302553). No award found. Blog is actively updated in 2026 (Shades of Halftone Feb 10; On Rendering the Sky, Sunsets, and Planets May 12; Shading Motion Aug 18) and 2025 (Field Guide to TSL and WebGPU Oct 14; On Shaping Light Jun 10; Post-Processing Shaders as a Creative Medium Feb 4) - [blog index](https://blog.maximeheckel.com/).
   - Stack: Next.js 15 (Pages Router), React 19, own design system `@maximeheckel/design-system` (public repo), Stitches + CSS custom properties, `@base-ui/react` headless primitives, Motion (Framer Motion successor), Three.js + react-three-fiber + drei + postprocessing, MDX via next-mdx-remote, Vitest + Cypress, pnpm; scripts for RSS, sitemap, OG images - [AGENTS.md in repo](https://github.com/MaximeHeckel/blog.maximeheckel.com/blob/main/AGENTS.md). Sandpack-based and canvas widgets per article (e.g. AtmosphericScattering widgets, ShaderPlayground, Sandpack.tsx, BeforeAfterImage, Footnote.tsx in a 2026 commit) - [commit 3ad2391](https://github.com/maximeheckel/blog.maximeheckel.com/commit/3ad2391135acd92a857a75d4824ecfa981f8b2cd). Static search index `search-index.json` in the same commit; he also wrote about "AI-powered semantic search from scratch" (2023 index entry).
   - Signature techniques: interactive playgrounds, visualisations and shader/R3F canvases embedded in articles ("interactive playgrounds, visualization, and detailed walkthroughs") - [blog home](https://blog.maximeheckel.com/); 8 `<canvas>` elements on "Shading Motion" - SEEN. Before/after image slider, footnote component (the 2026 commit touches `Footnote.tsx` and `BeforeAfterImage.tsx`).
   - Article page (measured, dark scheme): paragraph column 663 px, Inter 16 px / 28 px line-height, text oklch(0.77 0.028 262) on oklch(0.147 0.01 262) (blue-tinted dark); code in Fira Code 14 px with panel bg oklch(0.1675 ...) and radius `0 0 6px 6px` (square top = attached file-name header). The page rendered dark even under light colour-scheme emulation and no theme toggle was detected (INFERRED: dark-first or dark-only; I did not verify a user toggle).
   - Mobile (390 px): no horizontal overflow - SEEN.
   - Accessibility / motion: only 1 `prefers-reduced-motion` rule in loaded CSS (SEEN); canvas/R3F motion handling not verified (gap). Uses Base UI headless components for accessible Select/Dialog - [AGENTS.md](https://github.com/MaximeHeckel/blog.maximeheckel.com/blob/main/AGENTS.md).
   - i18n: none (lang="en", no hreflang) - SEEN.
   - Borrow: (1) Directly relevant to Three.js/shader ambitions: one canvas widget per concept, tinted-dark OKLCH palette, 14 px Fira Code in a header-attached code panel. (2) Package the design system separately and keep a short AGENTS.md. (3) Treat the blog as a product: slow-rollout migration with split-branch deploys - [Migrating to Next.js](https://blog.maximeheckel.com/posts/migrating-to-nextjs/).

3. **Bartosz Ciechanowski - https://ciechanow.ski** (author: Bartosz Ciechanowski)
   - Recognition: named "famous and exceptional" by an HN commenter and listed S-tier for animated/visual/interactive blogs in the March 2026 thread - [Ask HN](https://news.ycombinator.com/item?id=47302553). No award found. Still publishing in the window: "Moon" dated December 17, 2024 - [Moon](https://ciechanow.ski/moon/).
   - Stack: hand-built; no framework bundles detected by my script filter (scripts list empty) - SEEN/INFERRED. 120 `<canvas>` elements on the Moon article (SEEN) - one WebGL/2D canvas per demo, with "Loading..." placeholders.
   - Signature techniques: long essay punctuated by manipulable simulations (drag a 3D Moon, sliders for date/time with colour-coded bold labels **days**/**hours** matching slider colours, a draggable figurine on a globe, "clicking the geolocation button" to set your location) - [Moon](https://ciechanow.ski/moon/). No sidenotes, TOC or theme switcher on the page I measured.
   - Article page (measured): 800 px column, IBM Plex Sans 19.2 px / 30.72 px line-height, #444 on #f8f8f8; no dark variant (background stayed #f8f8f8 under dark emulation) and 0 reduced-motion rules (SEEN). Weakness for the brief: animated canvases have no reduced-motion fallback in CSS.
   - Mobile (390 px): no horizontal overflow, `viewport-fit=cover` set - SEEN.
   - i18n: none.
   - Borrow: (1) colour-coded inline labels that mirror the control they refer to. (2) Each demo starts from a sensible default and is introduced in prose before control is handed over. (3) Large body size (19 px) with generous 1.6 line-height for long reads.

4. **Maggie Appleton - https://maggieappleton.com** (author: Maggie Appleton; design engineer at Normally per her Bluesky bio)
   - Recognition: "typography ... unparalleled" - HN commenter, March 2026 thread - [Ask HN](https://news.ycombinator.com/item?id=47302553). No award found. Rebuilt from Next.js to Astro, announced complete on 2024-12-04 ("Next.js will continue to be a PITA...Astro is the obvious choice") - [Bluesky post](https://bsky.app/profile/maggieappleton.com/post/3lekggfooek2y).
   - Stack: Astro + MDX, most components `.astro`, React only when needed, D3 only when needed, Tippy.js hover previews, wiki-style `[[links]]` with backlinks, Webmentions (Brid.gy + webmention.io), CSS-only masonry, Satori + Sharp OG images, Astro view transitions, Vercel, videos on Cloudflare R2; Shiki theme night-owl with wrap - [repo README](https://github.com/MaggieAppleton/maggieappleton.com-V3/), [AGENTS.md](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/AGENTS.md), [astro.config.mjs](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/astro.config.mjs). Animations "mostly CSS, with some more complex ones" in a JS library - [colophon](https://maggieappleton.com/colophon).
   - Signature techniques: growth stages (seedling, budding, evergreen) on every post; custom MDX components (coming-soon banner, alerts, typography, one-off `unique/` components per post); a `ScrollyTalkSection` component with auto poster images; hand-drawn illustrations - [colophon](https://maggieappleton.com/colophon), [AGENTS.md](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/AGENTS.md).
   - Article page: Canela Display headings and Canela Text body (Commercial Type), supporting sans Lato, fluid type scale from the Utopia system; V2 README says long-form copy is limited to 72ch in `grid-column: 2`, images break out to 1000 px, full-bleed images use Josh Comeau's CSS-grid trick; design on an 8 px grid - [colophon](https://maggieappleton.com/colophon), [V2 README](https://github.com/MaggieAppleton/maggieappleton.com-V2). Dark theme exists (page bg rgb(28,27,24) under dark emulation on /garden) and `view-transition` CSS is present, 9 reduced-motion rules - SEEN.
   - Mobile (390 px): no overflow - SEEN.
   - i18n: none (no hreflang).
   - Borrow: (1) Astro + MDX content architecture closest to this project: typed collections, `components/mdx` vs `components/unique`. (2) Growth-stage badge as a content-maturity signal. (3) Fluid type scale (Utopia) and 72ch measure with breakout grid column.

5. **Emil Kowalski - https://emilkowal.ski** (author: Emil Kowalski, design engineer; ex-Linear and Vercel, author of Sonner and Vaul; courses animations.dev and aiforui.dev)
   - Recognition: Sonner and Vaul libraries are widely used; his own site lists them as projects - [home](https://emilkowal.ski/). No site award found.
   - Stack: Next.js App Router (`_next/static/chunks/main-app`) - SEEN by script URLs.
   - Signature techniques: the article is itself a live lab. Toggle components with keyboard shortcuts (press J then K to open/close, press Shift to toggle animation on a command menu) so the reader feels the difference between animated and non-animated versions; side-by-side speed comparisons (180 ms vs 400 ms dropdown); morphing feedback component - [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations). Content thesis directly relevant to the brief: animate with purpose, consider frequency of use, UI animations under 300 ms, never animate keyboard-initiated actions - same article.
   - Article page (measured): 644 px column, a sans at 16 px / 26.4 px line-height, #21201C on #FDFDFC (warm off-white); 3 reduced-motion rules; no TOC/sidenote/theme toggle found.
   - Mobile (390 px): not separately inspected beyond no overflow on the site root.
   - i18n: none.
   - Borrow: (1) "With/without animation" toggle inside the article as a pattern for your reading-mode explainer. (2) Rules of motion budget (frequency, purpose, <300 ms). (3) Warm off-white background rather than pure white.

6. **Rauno Freiberg - https://rauno.me and https://devouringdetails.com** (author: Rauno Freiberg, Staff Design Engineer at Vercel; formerly The Browser Company/Arc)
   - Recognition: Devouring Details (July 2025) is an interactive reference manual with 23 chapters and 23 downloadable React components, with testimonials from Benji Taylor, Birk Jernstrom and others calling it "probably the most gorgeous & inspiring thing online in a long time"; author of cmdk "downloaded millions of times per week" - [Devouring Details](https://devouringdetails.com/). Personal site lists 20 craft items 2021-2026 (Inline Conversion Nov 2024, Designing Depth Jul 2024, Vercel Agent May 2026, Next.js Dev Tools Feb 2025) - [Craft](https://rauno.me/craft). Testimonials are self-published, not independent.
   - Stack: homepage is minimal text ("Make it fast. Make it beautiful. ...Make it soulful. Make it."), archived previous years at 2022.rauno.me and 2023.rauno.me - [rauno.me](https://rauno.me). Stack otherwise not documented (gap).
   - Signature techniques: two-column long-form layout "for better navigation through long content", scrollable bite-sized chapters, footage recorded from real React components, an inspector the reader opens "like crazy" (per testimonial), custom platform - [Devouring Details](https://devouringdetails.com/). Field Notes at rauno.me/notes.
   - Article page (measured): notes page 608 px column, 18 px / 30.6 px line-height, near-black on white, custom sans "X"; Devouring Details body 24 px / 40 px on rgb(252,252,252). Notes page has 0 reduced-motion rules.
   - Accessibility red flag (SEEN in metadata): `viewport` is `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`, which blocks pinch-zoom. Do not copy.
   - Mobile (390 px): no horizontal overflow.
   - i18n: none.
   - Borrow: (1) Use real components as the "screenshots" so the demo and article never drift. (2) Short one-line manifesto homepage. (3) Archive prior design years on subdomains as a design-history element.

7. **Dan Abramov - https://overreacted.io** (author: Dan Abramov)
   - Recognition: widely read; 2025-2026 posts include "How I Vibed a Proof of Conway's Conjecture" (Sep 18, 2026), "A Social Filesystem" (Jan 18, 2026), "Introducing RSC Explorer" (Dec 19, 2025), the 2025 RSC series - [index](https://overreacted.io). No award found.
   - Stack: Next.js (App Router chunks), Merriweather - SEEN by script URLs and computed font.
   - Signature techniques: restrained, text-first, with interactive pieces when the point needs them (RSC Explorer, 1 iframe on a Jan 2026 post).
   - Article page (measured): 632 px column, Merriweather 16 px / 28 px, #222 on white; code block bg rgb(35,41,54) with 12 px radius, ui-monospace 14 px; 1 reduced-motion rule.
   - i18n: none (older posts were community-translated in the 2018-2020 era; not verified for 2024-2026, so a gap).
   - Borrow: (1) serif body for essays with a dark, rounded code panel. (2) Subtitle one-liner under each post title in the index.

8. **Brad Woods Digital Garden - https://garden.bradwoods.io** (author: Brad Woods)
   - Recognition: HN commenter lists it under "Maximalist" - [Ask HN](https://news.ycombinator.com/item?id=47302553). No award found.
   - Content (SEEN on home): notes on creative coding including "Juice" (game feel in non-game software, "how to create software with soul"), "Shaders 103 - smoke", "Scroll-driven camera animation" (three.js), "Animate a mesh across a sphere's surface" (three.js + GSAP), "Scroll-driven draw animation" (SVG clip-path), "View Transition API", "Table of contents" UI - the exact stack (GSAP + Three.js) the new blog targets - [garden home](https://garden.bradwoods.io/).
   - Article page: a page-level progress element was detected on /notes/css/blend-modes, 640 px column, 4 reduced-motion rules, no horizontal overflow at 390 px; body style reads as default serif at 10 px because content lives in nested elements (my measurement was not representative).
   - i18n: none.
   - Borrow: (1) treat every article as a documented creative-code recipe (GSAP + Three.js) with scroll-driven demos. (2) a dedicated "Juice" essay is a useful design brief for tasteful micro-interaction.

9. **Brittany Chiang - https://brittanychiang.com** (author: Brittany Chiang, Senior Frontend Engineer on accessibility at Klaviyo since 2024; before that Upstatement 2018-2024)
   - Recognition: "quiet standard for developer portfolios ... one of the most-forked portfolios on GitHub" - [issamzk.com roundup](https://issamzk.com/blog/personal-websites-that-made-me-want-to-rebuild-mine/) (secondary blog, weak source); also in a 2026 roundup (Wegic, AI vendor blog, weak source). Her own bio: "accessible, pixel-perfect experiences", "accessibility is built into the foundation" - [site](https://brittanychiang.com/). No award found.
   - Stack: Next.js (SEEN by chunks), Inter, Tailwind-like palette (slate-400 text rgb(148,163,184) on slate-900 rgb(15,23,42)). Has a theme toggle (detected). 3 reduced-motion rules. It is a portfolio, not a long-form blog, so it is a reference for restraint and accessibility, not article design.
   - Borrow: (1) pin accessibility credentials: visible focus, semantic landmarks. (2) A slate-on-navy palette that passes contrast. (3) Spotlight/hover on list rows (INFERRED from her known v4 design; not verified here).

10. **Anthony Fu - https://antfu.me** (author: Anthony Fu; Vue/Vite/Nuxt core)
    - Recognition: MIT-licensed source with 1,085 stars, 273 forks (GitHub) - [antfu/antfu.me](https://github.com/antfu/antfu.me). No award found.
    - Article page (measured): 656 px column, Inter 16 px / 28 px, text rgb(187,187,187) on a dark background, view-transition CSS present, 3 reduced-motion rules. Posts contain inline interactive diagrams, e.g. "The Universal DevTools Ecosystem" widget where you hover a framework to preview how modules compose - [post](https://antfu.me/posts/pluggable-extensible-playful-devtools).
    - i18n: not verified (gap).
    - Borrow: (1) hover-composable diagrams, (2) View Transitions for page changes with a small CSS footprint.

Honourable mentions (cited, not studied in depth): paco.me (Paco Coursey, Linear webmaster, "Crafting interfaces... magical details", minimal home) and leerob.com (Lee Robinson; Iowan Old Style serif at 17 px / 27 px, 600 px column, white background, Next.js) - both SEEN. henry.codes (Louize serif 20 px, 600 px column, a canvas on the page; HN typography pick), lynnandtonic.com (HN "really well-built, distinctive style"), growingswe.com, mlu-explain.github.io, seeing-theory.brown.edu (HN S-tier interactive explainers) - [Ask HN](https://news.ycombinator.com/item?id=47302553). The same thread notes the downsides of the "best" sites: 3 clicks/10 s to reach a subpage with no loading indication, scroll hijacking and back-button hijacking, and few RSS links - useful anti-patterns.

### Inferences
- The "craft bar" in this niche is set by article-embedded interactivity plus restraint in chrome, not by Awwwards-style hero effects. Heavy WebGL appears inside articles (Maxime, Ciechanowski, Brad Woods), while page chrome stays quiet.
- Three of the ten use Astro-compatible patterns today (Maggie on Astro; others on Next/MDX widgets), so an Astro island per widget is a well-trodden route.

### Gaps
- No verified Awwwards, CSS Design Awards or FWA entries for any of these blogs (searches returned nothing). Firecrawl credits ran out before I could check Godly, Land-book, siteinspire or Minimal Gallery listings, so those collections are unchecked.
- Rauno's stack and Brittany's current site stack/design details beyond Next.js are not verified.
- Reduced-motion behaviour of the canvases (Maxime, Ciechanowski, Brad Woods) was not tested with emulation, only rule counts.

## What article-page features (interactive demos, code blocks, sidenotes, TOC, reading progress, sound) define them?

### Takeaway
Defining features are: in-article live demos (React/MDX components, canvases, iframes), a single comfortable column of roughly 630-800 px at 16-19 px with 1.5-1.65 line-height, a distinctive typeface, custom code panels, and modest chrome. Sidenotes, TOCs and reading-progress bars are NOT standard on these blogs; footnotes, hover previews and sound are rare signatures.

### Cited Findings
- Measured article columns (px, computed paragraph width at 1440 px): Josh 686, Maxime 663, Emil 644, Dan 632, Brad Woods 640, Antfu 656, Ciechanowski 800, Rauno notes 608, Lee Rob 600, Henry 600. Body size/line-height: Josh 18/27, Maxime 16/28, Emil 16/26.4, Dan 16/28, Ciechanowski 19.2/30.7, Rauno 18/30.6, Lee 17/27.2, Henry 20/normal - Playwright measurements, 2026-11-09.
- Typeface choices: Wotfard (Josh), Inter + Fira Code (Maxime), Merriweather (Dan), IBM Plex Sans (Ciechanowski), Canela Display/Text (Maggie), Iowan Old Style stack (Lee), Louize serif (Henry) - Playwright computed fonts and [colophon](https://maggieappleton.com/colophon).
- Code blocks: Maxime 14 px Fira Code in a panel with a square-top header (radius 0 0 6 6) on a blue-tinted dark; Dan 14 px ui-monospace, 12 px radius, bg rgb(35,41,54); Josh offers static snippet component plus live `Playground` with Copy button - Playwright, [colophon](https://www.joshwcomeau.com/blog/how-i-built-my-blog/). Maggie uses Shiki `night-owl` with wrapping - [astro.config.mjs](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/astro.config.mjs).
- Footnotes/hover previews: Maxime has a Footnote component (2026 commit); Maggie uses Tippy.js hover previews and backlinks - [commit](https://github.com/maximeheckel/blog.maximeheckel.com/commit/3ad2391135acd92a857a75d4824ecfa981f8b2cd), [repo](https://github.com/MaggieAppleton/maggieappleton.com-V3/).
- Sound: only Josh Comeau (light-switch sound on theme toggle, hover pops) among those checked - [Epic React interview](https://www.epicreact.dev/modules/epic-react-expert-interviews/animations-and-interactions-with-josh-comeau).
- Search: Maxime ships a static `search-index.json` - [commit](https://github.com/maximeheckel/blog.maximeheckel.com/commit/3ad2391135acd92a857a75d4824ecfa981f8b2cd).
- Page transitions: view-transition CSS is present on Maggie, Josh, Maxime and Antfu (stylesheet scan), Brad Woods writes a note on the View Transition API.
- Reading-progress and TOC: Brad Woods has a progress element and a "Table of contents UI" note; none of the others showed a TOC in my checks - Playwright + [garden home](https://garden.bradwoods.io/).

### Inferences
- Your planned feature set (TOC, reading progress, sidenotes, sound, shaders on every page) goes beyond what the benchmark blogs do on article pages; the benchmark pattern is "motion in the demo, calm in the prose". Keeping the reading column at ~640-690 px and 17-19 px body matches the bar.

### Gaps
- Could not verify TOC/sidenote presence on Josh's longest articles (his site has a collapsible table of contents on some posts per general knowledge, but I did not see it).

## How do they balance delight and motion with reading comfort and accessibility?

### Takeaway
The strongest pattern is "motion is opt-in and purposeful": defaults off unless `prefers-reduced-motion: no-preference`, animation contained in the demo, and short durations. Only Josh and Emil document their rules publicly; most others have few or zero reduced-motion rules.

### Cited Findings
- Reduced-motion rule counts in loaded CSS (Playwright): Josh 28, Maggie 9, Brad Woods 4, Emil 3, Brittany 3, Antfu 3, Maxime 1, Dan 1, Rauno 0, Ciechanowski 0, Henry 0.
- Josh: start with no animation and enable inside `@media (prefers-reduced-motion: no-preference)`; JS hook with change listener; "test with Reduce Motion on" - [article](https://www.joshwcomeau.com/react/prefers-reduced-motion/).
- Emil: UI animations under ~300 ms; keyboard-initiated actions should never animate; frequently used interactions get no animation; delight is acceptable only for rarely used components - [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations).
- Josh adds explicit warnings for mobile and content, and a focus-trap + Escape hint on editors - [Flexbox guide](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/), [colophon](https://www.joshwcomeau.com/blog/how-i-built-my-blog/).
- Anti-patterns called out by HN commenters: scroll and back-button hijacking, multi-second navigation without a loading indicator - [Ask HN](https://news.ycombinator.com/item?id=47302553). Rauno's site disables pinch zoom (`user-scalable=no`) - SEEN.
- Mobile: all ten sites I tested at 390 px had no horizontal page overflow, except Josh where the measure shows -15 px (no overflow); Josh admits some demos are desktop-first - Playwright.
- Maggie, Maxime and Brad Woods ship progressive enhancement per island (Astro islands / React only where needed) - [AGENTS.md](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/AGENTS.md).

### Inferences
- A reading-mode toggle plus site-wide `motionAllowed()` gate would exceed the accessibility level of every benchmark blog (none showed a user-facing reading mode in my checks; not exhaustively verified).
- Applying Emil's rules (purpose, frequency, <300 ms) to page chrome while saving long durations for hero/story moments is a defensible policy for "immersive motion on every page".

### Gaps
- No quantitative performance/INP data collected for any site.

## Do any of them handle two languages well?

### Takeaway
No. None of the ten benchmark blogs sets `lang` to anything but `en` or emits hreflang alternates (Playwright check: hreflang empty on all). Bilingual craft examples exist only on lesser-known developer sites, so the bilingual layer must be designed from first principles.

### Cited Findings
- Measured `lang="en"` and no `link[rel=alternate][hreflang]` on all studied blogs - Playwright.
- Small bilingual dev sites to borrow engineering patterns (not craft benchmarks): kinho.dev (EN/PT, Next.js 16, middleware reads Accept-Language, per-locale RSS at /en-US and /pt-BR, canvas d20 respects reduced motion) - [kinho.dev](https://kinho.dev/en-US/projects/broad-way); laemmer.dev (EN/DE, next-intl, German keys fall back to English; blog English-only) - [laemmer.dev](https://laemmer.dev/en/portfolio/laemmer-dev-portfolio-site); guillaume.ojardias.info (FR/EN, Astro, translation key per post drives switcher and hreflang, one RSS per language) - [site](https://guillaume.ojardias.info/en/projects/personal-website/); jaqubowsky/portfolio (Astro 5, PL/EN, build-time translation validation, hreflang in HTML and sitemap, ToC with active heading) - [repo](https://github.com/jaqubowsky/portfolio); leanalvarez.com (Astro, EN root + /es/ /pt/, untranslated posts generate no route so hreflang never points to a missing page) - [site](https://leanalvarez.com/work/this-site); paubartrina.cat (CA/ES/EN, non-primary posts show a translation warning banner linking to the original) - [repo](https://github.com/PBartrina/paubartrina.cat).
- Typography for Vietnamese: no benchmark blog documents Vietnamese subset support; Maggie's Canela and Josh's Wotfard are commercial faces whose Vietnamese coverage I did not verify (gap).

### Inferences
- Your existing plan (shared slug, vi at root, en under /en/, fallback notice) matches the best small-site patterns: translation key linking, per-language RSS, hreflang incl. x-default, and a banner for untranslated posts. Differentiator opportunity: no craft blog does bilingual well.

### Gaps
- Could not confirm whether antfu.me or others publish translated posts; I did not inspect language switchers beyond hreflang.
- No bilingual blog with Awwwards-level craft found.
