# Awwwards pass 2: motion-heavy personal sites (2026-11-09)
Method: Firecrawl ran out of credits mid-pass (no screenshots this time). Used curl on awwwards.com pages + live HTML marker grep (SEEN in markup) + jsDelivr gzip size measurements (SEEN). No visual/DevTools check => motion behaviour on article pages NOT verified except where stated.

## Submission facts (SEEN, https://www.awwwards.com/submit/ cached 2026-11-08)
Standard submission $65 / 1 website (covers SOTD, SOTM, SOTY, HM, Dev Award eligibility; HM is automatic, not a separate fee). Pro plans: Basic $6.7/mo (10% off), Professional $13.8/mo (30% off, 1 free submission on annual), billed annually. User Pro + submission bundle $165/yr.
https://www.awwwards.com/about-evaluation/ : Design 40, Usability 30, Creativity 20, Content 10; >=18 jurors, 3 outliers dropped, 5 days; HM = jury >= 6.5 (score hidden unless SOTD); Dev Award = SOTD sites scored > 7 by dev jury; SOTM = 8 best of month; manual approval up to a week.

## Site table (award per Awwwards page, stack per live markup)
| Site | Award | Scores | Stack/techniques |
| guillaumecolombel.fr | SOTD 2026-10-28 + Dev | 7.5 / dev 7.73 | Nuxt, Three.js/WebGL, Locomotive marker, sound, about page |
| leoparpeix.com | SOTD 2026-09-14 + Dev | 7.69 / dev 7.47 (a11y 7.0, WPO 7.2, anim 8.4) | WebGL, After Effects, Blender, transitions, microinteractions |
| gilhuybrecht.com | SOTD 2026-09-21 | 7.66 / dev 7.4 (a11y 7.4, WPO 7.4) | Awwwards says Next.js+DatoCMS; markup shows Nuxt+Lenis+OGL; infinite scroll |
| mariavasilyeva.com | SOTD 2026-10-09 + Dev | 7.28 / dev 7.33 (a11y 6.4) | Sanity, WebGL, CSS, music/rhythm typography |
| gionatannese.com | SOTD 2026-09-05 + Dev | 7.32 / dev 7.27 (a11y 6.4) | Next.js, Sanity, GSAP, Three.js, OGL marker, sound, infinite scroll |
| bleibtgleich.dev | SOTD + Dev (Awwwards list) | not fetched | Webflow + GSAP + Lenis + Barba + OGL (markup) |
| samgoddard.co.uk | HM 2026-10-12 | juror samples 6.7-9.3 | Next.js+Tailwind, CSS view-transition-name, motion-reduce classes, retro/minimal type |
| tej.as The Thread | Nominee 2026-09-12 (not HM) | - | Astro, islands, reduced-motion CSS |
| theboringblog.ai | HM 2026-10-14 | - | Next.js; WebGL demos live INSIDE articles (posts show "production WebGL geometry and shaders") |
| rozaliabomawrites.com | HM 2026-09-08 | - | author site; page is 4KB shell (JS-rendered) |
| explorajourneys.com Explora Journal | HM 2026-09-12 | - | Barba marker |
| stateofaidesign.com | SOTD + Dev (AI in Design Report 2026) | - | Framer |
| runtimewire.com | Nominee 2026-11-07 | - | custom one-person build, light/dark/ASCII themes, RSS, audio |
| thefwa.net FWA Wire | Awwwards Nominee 2026-08-24 (earlier note said SOTD; correction: only nominee on Awwwards page) | - | terminal UI |
Takeaway: SOTD portfolios score 7.3-7.7; HM floor 6.5. Dev a11y sub-scores are the weakest (6.4-7.4); WPO 7.2-7.8.

## Library gzip sizes (SEEN, jsDelivr, gzip -9)
gsap 3.13 core 28.1KB; ScrollTrigger 17.8KB; lenis 1.3.4 4.7KB; barba 2.10.3 9.9KB; motion 11 22.5KB; three r170 module min 170.7KB (before tree-shaking); OGL dist path 404 so size NOT measured (inferred ~10-25KB tree-shaken, from memory).
