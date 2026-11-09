#!/usr/bin/env node
// Extra evidence beyond scripts/verify-theme.mjs: more viewports (320, 360, 390, 1024x768, 1440x900),
// horizontal overflow, text measure, text that sits outside the viewport, and the motion contract of
// view transitions (none may animate in reading mode / reduced motion).
// Usage (from the repo root, after a build): node apps/ink/scripts/extra-shots.mjs [--only=home,article] [--vp=360,1024]
// Output: apps/ink/.verify/extra/*.png and apps/ink/.verify/extra/report.json
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean);
const vpOnly = (args.find((a) => a.startsWith('--vp='))?.slice(5) ?? '').split(',').filter(Boolean);
const modesArg = (args.find((a) => a.startsWith('--modes='))?.slice(8) ?? '').split(',').filter(Boolean);
const app = new URL('..', import.meta.url).pathname;
const root = join(app, '..', '..');
const dist = join(app, 'dist');
const out = join(app, '.verify', 'extra');
mkdirSync(out, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const prefix = '/lab/ink';
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = null;
  if (path.startsWith(`${prefix}/`)) file = normalize(join(dist, path.slice(prefix.length)));
  else if (path.startsWith('/media/')) file = normalize(join(root, 'content', path));
  if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file || !existsSync(file)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(readFileSync(join(dist, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const cache = join(homedir(), '.cache', 'ms-playwright');
const shell = readdirSync(cache)
  .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
  .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()))
  .map((d) => join(cache, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell'))
  .find((p) => existsSync(p));
const tmp = process.env.TMPDIR ?? '/tmp';
const browser = await chromium.launch({
  executablePath: shell,
  env: { ...process.env, XDG_CONFIG_HOME: tmp, XDG_CACHE_HOME: tmp },
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});

const ROUTES = [
  ['home', '/'],
  ['home-en', '/en/'],
  ['posts', '/posts/'],
  ['article', '/posts/dung-blog-nay/'],
  ['footnotes', '/posts/mot-blog-bon-giao-dien/'],
  ['series-list', '/series/'],
  ['series', '/series/design-lab/'],
  ['tags', '/tags/'],
  ['tag', '/tags/astro/'],
  ['note', '/notes/til-font-tieng-viet/'],
  ['link', '/links/sveltia-cms/'],
  ['about', '/about/'],
  ['about-en', '/en/about/'],
  ['search', '/search/'],
  ['404', '/nope/'],
].filter(([id]) => !only.length || only.includes(id));
const VPS = {
  320: { width: 320, height: 640, mobile: true },
  360: { width: 360, height: 780, mobile: true },
  390: { width: 390, height: 844, mobile: true },
  1024: { width: 1024, height: 768, mobile: false },
  1440: { width: 1440, height: 900, mobile: false },
};
const MODES = modesArg.length ? modesArg : ['light', 'dark'];
const report = [];

for (const [id, path] of ROUTES) {
  for (const [vpName, vp] of Object.entries(VPS)) {
    if (vpOnly.length && !vpOnly.includes(vpName)) continue;
    for (const mode of MODES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.mobile ? 2 : 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
        colorScheme: mode === 'dark' ? 'dark' : 'light',
      });
      const prefs = { theme: mode === 'dark' ? 'dark' : 'light', reading: mode === 'reading', sound: false };
      await ctx.addInitScript((p) => localStorage.setItem('blog:prefs', JSON.stringify(p)), prefs);
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && !m.text().includes('giscus') && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${origin}${prefix}${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(2600);
      const file = `${id}.${vpName}.${mode}.png`;
      await page.screenshot({ path: join(out, file) });
      const facts = await page.evaluate(() => {
        const doc = document.documentElement;
        const vw = doc.clientWidth;
        const wide = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || el.closest('pre, .katex-display, table, .nav, .ink-rule, #ink-stage, .ink-still'))
              return false;
            return r.right > vw + 1 || r.left < -1;
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        // Measure: characters per line in the reading column (average over paragraphs).
        const ps = [...document.querySelectorAll('.prose > p')].slice(0, 6);
        let cpl = 0;
        if (ps.length) {
          const p = ps.reduce((a, b) => (a.textContent.length > b.textContent.length ? a : b));
          const range = document.createRange();
          range.selectNodeContents(p);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
          cpl = Math.round(p.textContent.length / Math.max(1, lines));
        }
        return {
          overflow: doc.scrollWidth > vw + 1,
          wide,
          cpl,
          motion: doc.dataset.motion,
          canvas: document.querySelectorAll('#ink-stage canvas').length,
        };
      });
      report.push({ id, vp: vpName, mode, ...facts, errors });
      await ctx.close();
    }
  }
}

// View transitions must not animate in reading mode: navigate and sample the running animations.
if (!only.length || only.includes('vt')) {
  for (const mode of ['light', 'reading']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((p) => localStorage.setItem('blog:prefs', JSON.stringify(p)), {
      theme: 'light',
      reading: mode === 'reading',
      sound: false,
    });
    const page = await ctx.newPage();
    await page.goto(`${origin}${prefix}/posts/`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const anims = await page.evaluate(async () => {
      const link = document.querySelector('.entry-title a');
      const seen = new Set();
      const sample = () =>
        document.getAnimations().forEach((a) => {
          const t = a.effect?.pseudoElement ?? '';
          if (t.includes('view-transition')) seen.add(`${t} ${a.animationName ?? ''}`);
        });
      const iv = setInterval(sample, 30);
      link.click();
      await new Promise((r) => setTimeout(r, 700));
      clearInterval(iv);
      return [...seen];
    });
    report.push({ id: 'view-transition', mode, anims });
    await ctx.close();
  }
}

await browser.close();
server.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.overflow || r.wide?.length || r.errors?.length);
console.log(`${report.length} checks, ${bad.length} with overflow/errors`);
for (const r of bad) console.log(JSON.stringify(r));
for (const r of report.filter((r) => r.cpl)) if (r.cpl > 75) console.log('measure', r.id, r.vp, r.cpl);
for (const r of report.filter((r) => r.id === 'view-transition')) console.log('vt', r.mode, JSON.stringify(r.anims));
