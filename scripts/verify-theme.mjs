#!/usr/bin/env node
// Build one theme, serve it under /lab/<name>/, and capture evidence with Playwright:
// screenshots (desktop 1440x900 + mobile 390x844; light, dark, reduced motion, reading mode)
// and a JSON report of console errors, failed requests and contract checks.
//
// Usage: node scripts/verify-theme.mjs <name> [--no-build] [--only=home,article]
// Output: apps/<name>/.verify/shots/*.png and apps/<name>/.verify/report.json
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
if (!name) {
  console.error('usage: node scripts/verify-theme.mjs <theme> [--no-build] [--only=home,article]');
  process.exit(2);
}
const root = new URL('..', import.meta.url).pathname;
const app = join(root, 'apps', name);
const dist = join(app, 'dist');
const out = join(app, '.verify');
const only = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean);

if (!args.includes('--no-build')) {
  console.log(`▶ building ${name}`);
  const r = spawnSync('pnpm', ['--filter', name, 'build'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (!existsSync(dist)) {
  console.error(`no build at ${dist}`);
  process.exit(1);
}

/* ---------- static server: /lab/<name>/* -> dist, /media/* -> content/media ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
  '.pf_meta': 'application/octet-stream',
};
const prefix = `/lab/${name}`;
function resolveFile(urlPath) {
  const path = decodeURIComponent(urlPath.split('?')[0]);
  let base;
  let rest;
  if (path.startsWith(`${prefix}/`) || path === prefix) [base, rest] = [dist, path.slice(prefix.length)];
  else if (path.startsWith('/media/')) [base, rest] = [join(root, 'content', 'media'), path.slice(6)];
  else return null;
  let file = normalize(join(base, rest));
  if (!file.startsWith(base)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return existsSync(file) ? file : null;
}
const server = createServer((req, res) => {
  const file = resolveFile(req.url ?? '/');
  if (!file) {
    const notFound = join(dist, '404.html');
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(existsSync(notFound) ? readFileSync(notFound) : 'not found');
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- browser: Playwright's own Chromium if present, else the newest cached one, else the system one ---------- */
function chromiumPath() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  // Prefer the headless shell: it has no process-singleton socket, which sandboxed shells forbid.
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const newest = (re) =>
    existsSync(cache)
      ? readdirSync(cache)
          .filter((d) => re.test(d))
          .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()))
      : [];
  for (const d of newest(/^chromium_headless_shell-\d+$/)) {
    const p = join(cache, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (existsSync(p)) return p;
  }
  for (const d of newest(/^chromium-\d+$/)) {
    const p = join(cache, d, 'chrome-linux64', 'chrome');
    if (existsSync(p)) return p;
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/google-chrome-stable']) if (existsSync(p)) return p;
  return undefined;
}
// Chromium writes crash reports under XDG_CONFIG_HOME; point it at a writable temp dir.
const tmp = process.env.TMPDIR ?? '/tmp';
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  env: { ...process.env, XDG_CONFIG_HOME: tmp, XDG_CACHE_HOME: tmp, HOME: process.env.HOME },
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});

/* ---------- what to capture ---------- */
const ROUTES = [
  { id: 'home', path: '/' },
  { id: 'home-en', path: '/en/' },
  { id: 'posts', path: '/posts/' },
  { id: 'article', path: '/posts/dung-blog-nay/' },
  { id: 'article-en', path: '/en/posts/dung-blog-nay/' },
  { id: 'series', path: '/series/design-lab/' },
  { id: 'notes', path: '/notes/' },
  { id: 'note', path: '/notes/til-font-tieng-viet/' },
  { id: 'link', path: '/links/sveltia-cms/' },
  { id: 'fallback-en', path: '/en/notes/til-font-tieng-viet/' },
  { id: 'search', path: '/search/' },
  { id: 'about', path: '/about/' },
].filter((r) => only.length === 0 || only.includes(r.id));
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const EXTRA_MODES = new Set(['home', 'article']); // dark, reduced and reading only here

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'shots'), { recursive: true });
const report = { theme: name, at: new Date().toISOString(), origin, shots: [], issues: [] };
const issue = (route, mode, kind, detail) => report.issues.push({ route, mode, kind, detail });

async function capture(route, viewportName, mode) {
  const reduced = mode === 'reduced';
  const prefs = { theme: mode === 'dark' ? 'dark' : 'light', reading: mode === 'reading', sound: false };
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    deviceScaleFactor: viewportName === 'mobile' ? 2 : 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    isMobile: viewportName === 'mobile',
    hasTouch: viewportName === 'mobile',
  });
  await context.addInitScript((p) => localStorage.setItem('blog:prefs', JSON.stringify(p)), prefs);
  const page = await context.newPage();
  const tag = `${route.id}.${viewportName}.${mode}`;
  page.on('console', (msg) => msg.type() === 'error' && issue(route.id, tag, 'console-error', msg.text()));
  page.on('pageerror', (err) => issue(route.id, tag, 'page-error', String(err)));
  page.on('requestfailed', (req) =>
    issue(route.id, tag, 'request-failed', `${req.url()} ${req.failure()?.errorText ?? ''}`),
  );
  page.on(
    'response',
    (res) =>
      res.status() >= 400 && !res.url().includes('favicon') && issue(route.id, tag, `http-${res.status()}`, res.url()),
  );

  const t0 = Date.now();
  await page.goto(`${origin}${prefix}${route.path}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1800);
  const file = `${tag}.png`;
  await page.screenshot({ path: join(out, 'shots', file) });
  report.shots.push({ file, route: route.id, viewport: viewportName, mode, loadMs: Date.now() - t0 });

  if (mode === 'light' && EXTRA_MODES.has(route.id)) {
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight * 0.45, behavior: 'instant' }),
    );
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, 'shots', `${tag}.scrolled.png`) });
    report.shots.push({ file: `${tag}.scrolled.png`, route: route.id, viewport: viewportName, mode: `${mode}+scroll` });
  }

  const facts = await page.evaluate(() => {
    const root = document.documentElement;
    const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`);
    const smallTargets = [...document.querySelectorAll('a, button, [role=button], input, select, textarea')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
        return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && !inline && (r.width < 44 || r.height < 44);
      })
      .slice(0, 8)
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
      );
    return {
      lang: root.lang,
      theme: root.dataset.theme,
      motion: root.dataset.motion,
      reading: root.dataset.reading,
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      canvases: document.querySelectorAll('canvas').length,
      imgsMissingAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
      fonts: [...new Set(fonts)].slice(0, 12),
      smallTargets,
    };
  });
  const shot = report.shots.find((s) => s.file === file);
  shot.facts = facts;
  const expectLang = route.path.startsWith('/en/') ? 'en' : 'vi';
  if (facts.lang !== expectLang) issue(route.id, tag, 'lang', `html lang="${facts.lang}", expected "${expectLang}"`);
  if (facts.h1 !== 1) issue(route.id, tag, 'h1-count', `${facts.h1} <h1> elements`);
  if (facts.horizontalOverflow) issue(route.id, tag, 'horizontal-overflow', 'page scrolls sideways');
  if (facts.imgsMissingAlt) issue(route.id, tag, 'img-alt', `${facts.imgsMissingAlt} images without alt`);
  if ((reduced || mode === 'reading') && facts.motion !== 'reduce')
    issue(route.id, tag, 'motion-contract', `data-motion="${facts.motion}" under ${mode}`);
  if (mode === 'dark' && facts.theme !== 'dark')
    issue(route.id, tag, 'theme-contract', `data-theme="${facts.theme}" in dark mode`);
  if (facts.smallTargets.length && viewportName === 'mobile' && mode === 'light')
    issue(route.id, tag, 'small-targets', facts.smallTargets.join(', '));
  await context.close();
}

for (const route of ROUTES) {
  for (const viewportName of Object.keys(VIEWPORTS)) {
    const modes = EXTRA_MODES.has(route.id) ? ['light', 'dark', 'reduced', 'reading'] : ['light'];
    for (const mode of modes) {
      try {
        await capture(route, viewportName, mode);
      } catch (err) {
        issue(route.id, `${route.id}.${viewportName}.${mode}`, 'capture-failed', String(err).slice(0, 300));
      }
    }
  }
}

await browser.close();
server.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));

const byKind = report.issues.reduce((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});
console.log(`\n✔ ${report.shots.length} screenshots in apps/${name}/.verify/shots/`);
console.log(
  report.issues.length
    ? `⚠ ${report.issues.length} issues: ${JSON.stringify(byKind)} (details in report.json)`
    : '✔ no issues found',
);
