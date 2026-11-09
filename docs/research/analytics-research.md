# Analytics options for static Astro blog on github.io (research 2026-11-09)
V = verified on official page this session; U = unverified / from memory / third-party.

## GoatCounter
- Free hosted "for reasonable public usage"; personal site fine, millions pv/day not. No numeric pv cap, donation-funded. V https://www.goatcounter.com/
- Script ~3.5 KB (V, same page). Cookieless, no GDPR notice needed (V). Referrers, campaigns, browser, location, screen size (V). Language split: U (has a "languages" panel in my memory; not on fetched pages). Per-path stats can separate /vi/ vs /en/ by URL.
- Adblock: "about a third of pageviews missed" by maintainer's estimate; custom domain is vanity only, does NOT evade blockers; only self-hosting does (V https://www.goatcounter.com/help/faq). Works on github.io (just a script tag + <code>.goatcounter.com endpoint) - no DNS needed (V by snippet).
- Export all data, cancel anytime (V). Public dashboard: U (setting "Allow adding ... public"; live demo stats.arp242.net exists).
- SPA: set window.goatcounter={no_onload:true} and call goatcounter.count({path}) on route change (V https://www.goatcounter.com/help/spa; example uses hashchange, adapt to astro:page-load).
- No Astro integration package found (Gatsby/WordPress/etc only, V integrations list). Script tag.
- Events: has goatcounter.count({event:true}) U. UTM: "campaigns" V. No scroll depth/heatmaps.

## Cloudflare Web Analytics
- Free. Works WITHOUT proxying: add site hostname, paste JS snippet (V https://developers.cloudflare.com/web-analytics/get-started/). Non-proxied sites limit: 10 sites/account (V .../limits/). Snippet reports to cloudflareinsights.com/cdn-cgi/rum (V FAQ).
- Needs a free Cloudflare account; hostname must match (user.github.io OK) - github.io specifically: U (docs say hostname; no known blocker).
- Retention: 6 months visible; unsampled 7 days then aggregated ~10% (V https://developers.cloudflare.com/web-analytics/faq/).
- NO UTM support, NO custom events (V FAQ, "Not yet"). Metrics: pageviews, visits, referrers, countries, paths, devices, Core Web Vitals, load time (V data-metrics index).
- Cookieless: U (marketing says no cookies/fingerprint). Adblock: blocked by adblockers (Brave, ABP, DDG) (V FAQ); edge-analytics unblockable but only for proxied sites (paid plans for URL breakdown).
- SPA: sends metric on every route change (V FAQ) - Astro ClientRouter works with history API. Beacon is `<script type="module" defer src=static.cloudflareinsights.com/beacon.min.js data-cf-beacon='{"token":"..."}'>`. Size U (~5 KB?).
- Public share: U (no public dashboard known). Export: GraphQL API (V mentioned in FAQ).

## Umami Cloud (Hobby)
- $0: 100K events/mo, 1 website, 6 month retention, community support (V https://umami.is/pricing). Events = pageviews + custom events + each event property. Hobby has: custom events, UTM, goals, funnels, realtime, export (pricing table shows features without "-" for Hobby; export row blank/ticked ambiguous - V FAQ says all data exportable). No API access on Hobby (V "-" in table).
- No cookies, no banner (V). Script ~2 KB U. data-domains whitelist, data-exclude-search etc (V docs.umami.is/docs/tracker-configuration). Auto path-change detection (V "path change detection") => works with Astro ClientRouter without extra code.
- Adblock: cloud.umami.is script commonly blocked U; self-host + proxy not possible on GH Pages. data-host-url can point elsewhere (V) - only helps if you own a server/Worker.
- Public share link: U (Umami has share URL feature). Open source, self-host free (V).
- Language: U (dashboard has Languages/browser language breakdown).

## Plausible
- No free tier. 30-day trial, no card (V https://plausible.io/docs/subscription-plans). Starter $9/mo for up to 10k pv, 1 site (V search excerpt of https://plausible.io/ and pirsch comparison page). Growth $14, Business $19 (V excerpt). Plausible CE self-host free U. Counts pageviews + custom events. Managed proxy only Enterprise (V). Public/shared dashboards need Growth+ (V). Cookieless U. Official Astro guide/ plugin U.
- Fails $0 budget.

## Google Analytics 4
- Free. Retention 2 or 14 months max (V https://support.google.com/analytics/answer/7667196). Cookies (_ga), consent banner required for EU/UK users; Vietnam audience: Decree 13/2023 consent U. Script ~100+ KB U. Adblock blocking high U. First-party proxy impossible on GH Pages (no server). Most metrics incl. language, events, UTM, scroll (enhanced measurement) U. Astro: Partytown integration / gtag script; SPA needs manual page_view on astro:page-load U. Export via BigQuery link U. Public dashboard: Looker Studio share U.

## Microsoft Clarity
- Free forever, no stated pv cap (V https://learn.microsoft.com/en-us/clarity/setup-and-installation/about-clarity "free service forever"). Heatmaps (click/scroll/area), session recordings, dashboard, funnels, Copilot, Data Export API (V). Retention: click/heatmap data 9 months, recordings playback 30 days (V .../data-retention).
- Sets first-party cookies _clck/_clsk and third-party cookies MUID, CLID etc (V .../clarity-cookies). Since 2025-10-31 consent signal REQUIRED for EEA/UK/CH visitors for full functionality (V). Vietnam not listed; but any EU reader would need consent banner.
- Adblock: blocked by uBlock (V GitHub issue microsoft/clarity#622). Not a pageview counter first: no UTM/country-level classic report? has region insights (V). Public share: "Share Clarity" feature (V list), read-only link U.
- Not for under-18 sites (V). Astro: script tag; Clarity handles SPA via history API U.

## PostHog Cloud free
- 1M events/mo free, 5,000 session recordings free, no card (V https://posthog.com/pricing, https://posthog.com/faq). Over free limit on free plan: events permanently dropped (V pricing FAQ). Web analytics + Astro guide exist (V https://posthog.com/docs/web-analytics/installation/astro listed). Managed reverse proxy free, but needs your own domain route U (can't do on github.io). Default uses cookies/localStorage unless configured cookieless U. Heavy SDK (~tens of KB) U. Retention for free tier 1 year U. Overkill.

## Counter.dev
- Free, pay-what-you-want, AGPL, no cookies/logging/IP fingerprint (V https://counter.dev/). Unique visitors/day, referrers, locations (V). Minimal: no events/UTM listed. Dashboard can be made public (share link) U. Single-maintainer project risk U. Pageview/ retention limits not stated (U).

## Tinylytics
- NO free plan any more; 14-day trial, plans from $7/mo (V https://tinylytics.app/docs/why_free_plan). Out.

## Simple Analytics
- Free plan: 1 user, 5 websites, 1 month history (page body) vs FAQ text saying 30 days; unlimited pageviews with fair-use; "Badge required" on free (V https://www.simpleanalytics.com/pricing). Paid $20/mo for 100k pv. Cookieless. Proxy/custom domains mentioned for Enterprise POC only. 1-month history makes it poor for a blog trend.

## Pirsch
- No free plan; 30-day trial no card; Standard $6/mo for 10k pv (V https://pirsch.io/pricing). Out on $0.

## GitHub repo traffic insights
- Only repo (github.com) traffic, not the Pages site visitors. 14 days of visitors/clones, referring sites, popular content (V https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository). Useless for blog readership. GitHub Pages itself has no traffic stats (U).

## Astro view transitions (V https://docs.astro.build/en/guides/view-transitions/)
- ClientRouter makes SPA-style nav. Bundled <script> runs once; inline scripts may re-run. Use document.addEventListener("astro:page-load", ...) (fires on initial load AND each navigation). Scripts with `is:inline` + `data-astro-rerun` re-execute every transition. Caveat: an external analytics <script src> in <head> is kept (not re-executed) if present on the new page; so for trackers that don't auto-detect pushState, call their manual API in astro:page-load, guarding against double-count on first load (only fire on 2nd+ events, or disable auto pageview with e.g. GoatCounter no_onload:true / Umami data-auto-pageview="false" (V v3.2.0)).
- Whether the blog even uses ClientRouter: not checked here.

## Bilingual VI/EN
- Path-based (/vi/, /en/) gives language split in ANY tool that reports per-path. Browser-language report: Plausible U, Umami U, GoatCounter U, GA4 yes U.

## First-party proxy on GitHub Pages
- Not possible (static host, no server/rewrites; custom domain does not help either). Workarounds need Cloudflare Worker/other host (violates "no server"; could be free on Workers but needs route on a domain you control; *.workers.dev would still be a third-party host). U.
