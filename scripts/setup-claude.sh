#!/usr/bin/env bash
# Install the committed Claude Code harness (tools/claude/) into this checkout:
#   tools/claude/agents/*        -> .claude/agents/
#   tools/claude/skills/*        -> .claude/skills/   (third-party skills pinned in skills-lock.json)
#   tools/claude/settings.json   -> .claude/settings.json        (permissions, prettier hook, worktree base)
#   tools/claude/settings.local.json -> .claude/settings.local.json (approves the 3 project MCP servers)
#   tools/claude/mcp.json        -> .mcp.json                    (playwright, astro-docs, ui-skills)
# Existing files with the same name are overwritten; nothing else in .claude/ is touched.
set -euo pipefail
cd "$(dirname "$0")/.."
src=tools/claude
mkdir -p .claude/agents .claude/skills
cp -R "$src/agents/." .claude/agents/
cp -R "$src/skills/." .claude/skills/
cp "$src/settings.json" .claude/settings.json
cp "$src/settings.local.json" .claude/settings.local.json
cp "$src/mcp.json" .mcp.json
echo "Installed: $(ls .claude/agents | wc -l) agents, $(ls .claude/skills | wc -l) skills, settings, .mcp.json"
echo "Restart Claude Code (or run /reload-plugins and /mcp) so it picks them up."
