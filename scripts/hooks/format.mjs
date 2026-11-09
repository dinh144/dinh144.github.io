#!/usr/bin/env node
// PostToolUse hook (Edit|Write): format the edited file with the repo's Prettier config.
// Never blocks: any failure exits 0 so a formatting hiccup cannot stop an agent.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';

const FORMATTABLE = new Set(['.astro', '.ts', '.mjs', '.js', '.css', '.json']);

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const file = input?.tool_input?.file_path;
  if (!file || !FORMATTABLE.has(extname(file)) || !existsSync(file)) process.exit(0);
  if (/\/(content|node_modules|dist|\.astro|tools\/claude\/skills)\//.test(file)) process.exit(0);

  // Find the workspace root of the edited file (works inside git worktrees too).
  let dir = dirname(file);
  while (dir !== '/' && !existsSync(join(dir, 'pnpm-workspace.yaml'))) dir = dirname(dir);
  const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? dir;
  const prettierPath = [dir, projectRoot].map((d) => join(d, 'node_modules', 'prettier', 'index.mjs')).find(existsSync);
  if (!prettierPath) process.exit(0);

  const prettier = await import(prettierPath);
  const config = (await prettier.resolveConfig(file)) ?? {};
  const source = readFileSync(file, 'utf8');
  const formatted = await prettier.format(source, { ...config, filepath: file });
  if (formatted !== source) writeFileSync(file, formatted);
} catch {
  /* non-blocking by design */
}
process.exit(0);
