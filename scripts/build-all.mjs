#!/usr/bin/env node
// Build the hub and every lab theme, then assemble one GitHub Pages site in ./dist:
//   dist/            <- apps/hub/dist    (lab index, /admin, /media)
//   dist/lab/<name>/ <- apps/<name>/dist (each theme, built with base /lab/<name>)
// Usage: node scripts/build-all.mjs [theme ...]   (no args = all themes)
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const appsDir = join(root, 'apps');
const only = process.argv.slice(2);

const themes = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'hub' && existsSync(join(appsDir, d.name, 'package.json')))
  .map((d) => d.name)
  .filter((name) => only.length === 0 || only.includes(name));

function run(name) {
  console.log(`\n▶ building ${name}`);
  const result = spawnSync('pnpm', ['--filter', name, 'build'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`✖ ${name} failed`);
    process.exit(result.status ?? 1);
  }
}

run('hub');
for (const theme of themes) run(theme);

const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
cpSync(join(appsDir, 'hub', 'dist'), out, { recursive: true, dereference: true });
for (const theme of themes) {
  const target = join(out, 'lab', theme);
  mkdirSync(target, { recursive: true });
  cpSync(join(appsDir, theme, 'dist'), target, { recursive: true });
}
writeFileSync(join(out, '.nojekyll'), '');
console.log(`\n✔ assembled dist/ with hub + ${themes.length} theme(s): ${themes.join(', ')}`);
