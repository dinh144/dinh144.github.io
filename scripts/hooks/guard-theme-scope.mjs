#!/usr/bin/env node
// PreToolUse hook for the theme-builder subagent (Edit|Write).
// Four theme agents work in parallel; each may only change its own app.
// Scope comes from a `.theme-scope` file (one word: ink|signal|rhythm|constellation)
// at the workspace root of the agent's worktree. Exit 2 blocks the edit and tells the agent why.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const deny = (msg) => {
  process.stderr.write(`theme scope guard: ${msg}\n`);
  process.exit(2);
};

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

let root = dirname(file);
while (root !== '/' && !existsSync(join(root, 'pnpm-workspace.yaml'))) root = dirname(root);
if (root === '/') process.exit(0); // outside the repo (scratch files): allowed

const scopeFile = join(root, '.theme-scope');
if (!existsSync(scopeFile)) {
  deny(`no .theme-scope in ${root}. Create it first with Bash: echo <theme> > ${scopeFile}`);
}
const scope = readFileSync(scopeFile, 'utf8').trim();
if (!/^[a-z][a-z0-9-]*$/.test(scope) || ['base', 'hub'].includes(scope))
  deny(`invalid scope "${scope}" in .theme-scope`);

const rel = relative(root, file);
if (rel.startsWith(`apps/${scope}/`)) process.exit(0);
deny(
  `"${rel}" is outside apps/${scope}/. Theme agents only edit their own app. ` +
    'If packages/core, content/ or shared config needs a change, stop and describe it in your final report instead.',
);
