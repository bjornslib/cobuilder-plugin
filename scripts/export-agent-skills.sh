#!/usr/bin/env bash
# Export this repo's skills and agents as portable copies for coding
# harnesses that do not support Claude Code plugins: no Skill() tool, no
# slash commands, no MCP tools. Copies each plugin's skills/ directory
# as-is, copies each plugin's agents/*.md into a flat agents/ directory,
# skips commands/ (slash-command shims with no equivalent elsewhere), and
# stamps each copy with its source plugin, version, and commit so a stale
# copy is visible on the next export.
#
# The skills cite shared files as ${CLAUDE_PLUGIN_ROOT}/shared/<file>. That
# variable does not exist outside Claude Code, so each export also copies the
# repo's shared/ directory to <target>/shared/ and rewrites every such path in
# the exported skills and agents to a path relative to the file that holds it.
#
# Usage:
#   scripts/export-agent-skills.sh --target <dir> [--plugin <name>]...
#
# Examples:
#   scripts/export-agent-skills.sh --target /path/to/other-repo/.agents/skills
#   scripts/export-agent-skills.sh --target /path/to/other-repo/.agents/skills --plugin architect
#
# Each selected plugin's agents/ markdown files land in
# <target>/agents/<agent-name>.md, stamped the same way skills are.

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
TARGET="$(cd "$TARGET" && pwd)"

# Copy shared/ once, whichever plugins the run selects, because any skill can cite it.
# An existing <target>/shared that this script did not produce stays untouched.
SHARED_DEST="$TARGET/shared"
SHARED_FRESH=0
if [[ -d "$SHARED_DEST" && ! -f "$SHARED_DEST/.export-stamp" ]]; then
  echo "skip shared: $SHARED_DEST exists and was not produced by this script (no '.export-stamp') -- remove it manually first" >&2
else
  rm -rf "$SHARED_DEST"
  cp -R "$REPO_ROOT/shared" "$SHARED_DEST"
  find "$SHARED_DEST" -name '__pycache__' -type d -prune -exec rm -rf {} +
  find "$SHARED_DEST" -name '*.pyc' -type f -delete
  echo "source: shared (${SHA})" > "$SHARED_DEST/.export-stamp"
  echo "exported shared <- shared (${SHA})"
  SHARED_FRESH=1
fi

# Rewrite ${CLAUDE_PLUGIN_ROOT}/shared/ to a path relative to the file, so the path
# resolves from the file's own directory down to <target>/shared/.
rewrite_shared_refs() {
  local root="$1" file rel_dir depth prefix i
  while IFS= read -r -d '' file; do
    rel_dir="$(dirname "${file#"$TARGET"/}")"
    depth="$(awk -F/ '{print NF}' <<<"$rel_dir")"
    prefix=""
    for ((i = 0; i < depth; i++)); do prefix="../${prefix}"; done
    sed "s|\${CLAUDE_PLUGIN_ROOT}/shared/|${prefix}shared/|g" "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
  done < <(grep -rIl --null --fixed-strings '${CLAUDE_PLUGIN_ROOT}/shared/' "$root" || true)
}

# shared/ files cite one another the same way, so the fresh copy gets the same rewrite.
if [[ "$SHARED_FRESH" -eq 1 ]]; then
  rewrite_shared_refs "$SHARED_DEST"
fi

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
    rewrite_shared_refs "$dest"

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

  for agent_md in "$plugin_dir"agents/*.md; do
    [[ -f "$agent_md" ]] || continue
    agent_name="$(basename "$agent_md" .md)"
    dest="$TARGET/agents/$agent_name.md"

    if [[ -f "$dest" ]] && ! grep -q "^source: " "$dest"; then
      echo "skip agent $agent_name: $dest exists and was not produced by this script (no 'source:' stamp) -- remove it manually first" >&2
      continue
    fi

    mkdir -p "$TARGET/agents"
    cp "$agent_md" "$dest"
    rewrite_shared_refs "$dest"

    claude_only_count="$( (grep -Eo 'CLAUDE_PLUGIN_ROOT|mcp__[A-Za-z0-9_]+' "$dest" || true) | wc -l | tr -d ' ')"
    source_line="source: ${plugin_name}@${plugin_version} (${SHA})"

    if [[ "$claude_only_count" -gt 0 ]]; then
      callout="> **Claude Code only:** this copy mentions \`CLAUDE_PLUGIN_ROOT\` paths or \`mcp__\` tools in ${claude_only_count} place(s). Those do not resolve outside Claude Code -- grep for them before you rely on this content."
    else
      callout=""
    fi

    awk -v src="$source_line" -v callout="$callout" '
      BEGIN { c = 0 }
      {
        print
        if ($0 == "---") {
          c++
          if (c == 1) {
            print src
          } else if (c == 2 && callout != "") {
            print ""
            print callout
          }
        }
      }
    ' "$dest" > "$dest.tmp"
    mv "$dest.tmp" "$dest"

    echo "exported agent $agent_name <- ${plugin_name}@${plugin_version}"
  done
done
