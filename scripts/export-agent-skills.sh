#!/usr/bin/env bash
# Export this repo's skills as portable copies for coding harnesses that
# do not support Claude Code plugins: no Skill() tool, no slash commands,
# no MCP tools. Copies each plugin's skills/ directory as-is, skips
# commands/ (slash-command shims with no equivalent elsewhere), and
# stamps each copy with its source plugin, version, and commit so a stale
# copy is visible on the next export.
#
# Usage:
#   scripts/export-agent-skills.sh --target <dir> [--plugin <name>]...
#
# Examples:
#   scripts/export-agent-skills.sh --target /path/to/other-repo/.agents/skills
#   scripts/export-agent-skills.sh --target /path/to/other-repo/.agents/skills --plugin architect

set -euo pipefail

usage() {
  echo "Usage: $0 --target <dir> [--plugin <name>]..." >&2
  exit 1
}

TARGET=""
PLUGINS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --plugin)
      PLUGINS+=("$2")
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      usage
      ;;
  esac
done

[[ -n "$TARGET" ]] || usage

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
if ! git -C "$REPO_ROOT" diff --quiet 2>/dev/null || ! git -C "$REPO_ROOT" diff --cached --quiet 2>/dev/null; then
  SHA="${SHA}-dirty"
fi

mkdir -p "$TARGET"

shopt -s nullglob

for plugin_dir in "$REPO_ROOT"/plugins/*/; do
  plugin_name="$(basename "$plugin_dir")"

  if [[ ${#PLUGINS[@]} -gt 0 ]]; then
    match=0
    for p in "${PLUGINS[@]}"; do
      [[ "$p" == "$plugin_name" ]] && match=1
    done
    [[ $match -eq 1 ]] || continue
  fi

  plugin_json="$plugin_dir/.claude-plugin/plugin.json"
  [[ -f "$plugin_json" ]] || continue
  plugin_version="$(grep -m1 '"version"' "$plugin_json" | sed -E 's/.*"version": *"([^"]+)".*/\1/')"

  for skill_dir in "$plugin_dir"skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    dest="$TARGET/$skill_name"

    if [[ -d "$dest" ]] && { [[ ! -f "$dest/SKILL.md" ]] || ! grep -q "^source: " "$dest/SKILL.md"; }; then
      echo "skip $skill_name: $dest exists and was not produced by this script (no 'source:' stamp) -- remove it manually first" >&2
      continue
    fi

    rm -rf "$dest"
    cp -R "$skill_dir" "$dest"

    skill_md="$dest/SKILL.md"
    if [[ -f "$skill_md" ]]; then
      claude_only_count="$( (grep -rEo 'CLAUDE_PLUGIN_ROOT|mcp__[A-Za-z0-9_]+' "$dest" || true) | wc -l | tr -d ' ')"
      source_line="source: ${plugin_name}@${plugin_version} (${SHA})"
      callout="> **Claude Code only:** this copy mentions \`CLAUDE_PLUGIN_ROOT\` paths or \`mcp__\` tools in ${claude_only_count} place(s). Those do not resolve outside Claude Code -- grep for them before you rely on this content."

      awk -v src="$source_line" -v callout="$callout" -v addcallout="$([[ "$claude_only_count" -gt 0 ]] && echo 1 || echo 0)" '
        BEGIN { c = 0 }
        {
          print
          if ($0 == "---") {
            c++
            if (c == 1) {
              print src
            } else if (c == 2 && addcallout == "1") {
              print ""
              print callout
            }
          }
        }
      ' "$skill_md" > "$skill_md.tmp"
      mv "$skill_md.tmp" "$skill_md"
    fi

    echo "exported $skill_name <- ${plugin_name}@${plugin_version}"
  done
done
