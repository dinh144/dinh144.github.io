#!/usr/bin/env node
// Label-collision check for the constellation chart.
// Serves apps/constellation/dist at /lab/constellation/, opens the chart pages at several viewports and
// counts, per page: visible chart labels that overlap each other, overlap page text (h1, lede, buttons,
// titles outside the chart), overlap another star's dot, are crossed by a solid series line, or are cut
// off by the stage edge / viewport. Exits 1 when any count is above 0.
//
// Usage (from the repo root, after a build):
//   node apps/constellation/scripts/check-labels.mjs [--only=home,article] [--vp=1024x768,390x844] [--reduced]
// Output: apps/constellation/.verify/labels.json (+ labels/<page>.<vp>.png when --shots)
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const app = new URL('..', import.meta.url).pathname;
const root = join(app, '..', '..');
const dist = join(app, 'dist');
const out = join(app, '.verify');
const prefix = '/lab/constellation';

const PAGES = [
  { id: 'home', path: '/' },
  { id: 'home-en', path: '/en/' },
  { id: 'article', path: '/posts/dung-blog-nay/' },
  { id: 'article-en', path: '/en/posts/dung-blog-nay/' },
  { id: 'note', path: '/notes/til-font-tieng-viet/' },
  { id: 'series', path: '/series/design-lab/' },
  { id: 'series-list', path: '/series/' },
  { id: 'posts', path: '/posts/' },
  { id: 'tag-astro', path: '/tags/astro/' },
  { id: 'tags', path: '/tags/' },
  { id: '404', path: '/404.html' },
].filter((p) => !opt('only') || opt('only').split(',').includes(p.id));
const VIEWPORTS = (opt('vp') ?? '1440x900,1440x820,1280x720,1024x768,820x1180,390x844,360x780')
  .split(',')
  .map((v) => v.split('x').map(Number));
const reduced = args.includes('--reduced');
const shots = args.includes('--shots');

/* ---------- static server ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = path.startsWith(prefix) ? normalize(join(dist, path.slice(prefix.length))) : null;
  if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file || !file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(readFileSync(join(dist, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

function chromiumPath() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  if (existsSync(chromium.executablePath())) return chromium.executablePath();
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const dirs = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
        .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()))
    : [];
  for (const d of dirs) {
    const p = join(cache, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (existsSync(p)) return p;
  }
  return undefined;
}
const tmp = process.env.TMPDIR ?? '/tmp';
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  env: { ...process.env, XDG_CONFIG_HOME: tmp, XDG_CACHE_HOME: tmp },
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});

/* ---------- measure (runs in the page) ---------- */
function measure() {
  const PAD = 1; // px of tolerance before two boxes count as touching
  const hit = (a, b) =>
    a.left < b.right - PAD && b.left < a.right - PAD && a.top < b.bottom - PAD && b.top < a.bottom - PAD;
  const visible = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  /** Tight text boxes of an element (one rect per line box). */
  const textRects = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
  };
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const problems = [];
  const name = (el) => (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);

  for (const stage of document.querySelectorAll('[data-stage]')) {
    const sr = stage.getBoundingClientRect();
    if (!sr.width || !visible(stage) || sr.bottom < 0 || sr.top > innerHeight * 2) continue;
    const clip = {
      left: Math.max(sr.left, 0),
      top: Math.max(sr.top, 0),
      right: Math.min(sr.right, innerWidth),
      bottom: sr.bottom,
    };
    const labels = [];
    for (const star of stage.querySelectorAll('.star')) {
      const label = star.querySelector('.star-label');
      if (!label || !visible(label)) continue;
      const rects = [...label.querySelectorAll('.star-title, .star-meta')].filter(visible).flatMap(textRects);
      if (rects.length) labels.push({ el: star, kind: 'star', rects, text: name(label) });
    }
    for (const a of stage.querySelectorAll('.anchor')) {
      if (!visible(a)) continue;
      labels.push({
        el: a,
        kind: a.classList.contains('anchor--series') ? 'series' : 'tag',
        rects: textRects(a),
        text: name(a),
      });
    }
    // page text that shares pixels with this stage
    const page = [
      ...document.querySelectorAll('main h1, main h2, main p, main .btn, main .legend, main li a, .site-header'),
    ]
      .filter((el) => !el.closest('[data-stage]') && visible(el))
      .flatMap((el) => textRects(el).map((r) => ({ r, text: `${el.tagName.toLowerCase()} ${name(el)}` })))
      .filter(({ r }) => hit(r, sr));
    const dots = [...stage.querySelectorAll('.star')]
      .filter((s) => visible(s))
      .map((s) => {
        const d = s.querySelector('.star-dot').getBoundingClientRect();
        const cx = d.left + d.width / 2;
        const cy = d.top + d.height / 2;
        return { el: s, r: { left: cx - 6, right: cx + 6, top: cy - 6, bottom: cy + 6 } };
      });
    // solid series lines, in client px
    const segs = [];
    for (const svg of stage.querySelectorAll('svg.lines')) {
      if (!visible(svg)) continue;
      const box = svg.getBoundingClientRect();
      for (const line of svg.querySelectorAll('.edge--series')) {
        const p = (x, y) => ({
          x: box.left + (Number(x) / 1000) * box.width,
          y: box.top + (Number(y) / 1000) * box.height,
        });
        segs.push([
          p(line.getAttribute('x1'), line.getAttribute('y1')),
          p(line.getAttribute('x2'), line.getAttribute('y2')),
        ]);
      }
    }
    const segHits = (a, b, r) => {
      for (let i = 1; i < 40; i++) {
        const x = a.x + ((b.x - a.x) * i) / 40;
        const y = a.y + ((b.y - a.y) * i) / 40;
        if (x > r.left + 2 && x < r.right - 2 && y > r.top + 2 && y < r.bottom - 2) return true;
      }
      return false;
    };

    labels.forEach((L, i) => {
      for (const r of L.rects) {
        const cut =
          r.left < clip.left - 1 || r.right > clip.right + 1 || r.top < clip.top - 1 || r.bottom > clip.bottom + 1;
        if (cut && r.top < innerHeight && r.bottom > 0) problems.push({ kind: 'clipped', a: L.text });
        for (const p of page) if (hit(r, p.r)) problems.push({ kind: 'over-text', a: L.text, b: p.text });
        for (const d of dots)
          if (d.el !== L.el && hit(r, d.r)) problems.push({ kind: 'over-star', a: L.text, b: name(d.el) });
        if (L.kind !== 'star')
          for (const [a, b] of segs) if (segHits(a, b, r)) problems.push({ kind: 'over-line', a: L.text });
      }
      for (let j = i + 1; j < labels.length; j++) {
        const M = labels[j];
        if (L.rects.some((r) => M.rects.some((q) => hit(r, q))))
          problems.push({ kind: 'label-label', a: L.text, b: M.text });
      }
    });
    void viewport;
  }
  // de-duplicate (one entry per pair and kind)
  const seen = new Set();
  return problems.filter((p) => {
    const k = `${p.kind}|${p.a}|${p.b ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const results = [];
for (const [w, h] of VIEWPORTS) {
  const mobile = w < 760;
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(() =>
    localStorage.setItem('blog:prefs', JSON.stringify({ theme: 'dark', reading: false, sound: false })),
  );
  const page = await context.newPage();
  for (const p of PAGES) {
    await page.goto(`${origin}${prefix}${p.path}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2600); // arrival animations
    const problems = await page.evaluate(measure);
    results.push({ page: p.id, vp: `${w}x${h}`, count: problems.length, problems });
    if (shots) {
      mkdirSync(join(out, 'labels'), { recursive: true });
      await page.screenshot({ path: join(out, 'labels', `${p.id}.${w}x${h}.png`) });
    }
  }
  await context.close();
}
await browser.close();
server.close();

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'labels.json'), JSON.stringify(results, null, 2));
const total = results.reduce((n, r) => n + r.count, 0);
for (const r of results.filter((r) => r.count)) {
  console.log(`✗ ${r.page} @ ${r.vp}: ${r.count}`);
  for (const p of r.problems.slice(0, 6)) console.log(`    ${p.kind}: "${p.a}"${p.b ? ` × "${p.b}"` : ''}`);
}
console.log(
  total ? `\n⚠ ${total} label collisions (apps/constellation/.verify/labels.json)` : '\n✔ no label collisions',
);
process.exit(total ? 1 : 0);
void root;
