#!/usr/bin/env python3
"""Project-level PreToolUse hook. Blocks `git stash` in Bash calls from subagents.

NOTE ON THE "NO HOOKS" RULE IN CLAUDE.md
CLAUDE.md says the five plugins in this repo ship no agents, no hooks, and
no MCP servers, so that no plugin touches another session's permission
surface. That rule governs the plugins under `plugins/`. This hook is local
development tooling for this repository's own Claude Code sessions. It
ships to nobody and installs nowhere else. Do not delete it as a violation
of the plugin rule.

WHY THIS EXISTS
Subagents in this project have run `git stash` despite an explicit
instruction not to. The working tree carries a large amount of uncommitted
work, so a stash round-trip risks real loss. This hook gives a mechanical
block instead of relying on instructions alone.

SCOPE: SUBAGENTS ONLY, AND WHY THIS IS FRAGILE
This hook denies `git stash` for subagents only. It never blocks the main
agent. It tells a subagent apart from the main agent by the presence of an
`agent_id` key in the PreToolUse payload. This is observed behaviour of the
current Claude Code version, not a documented part of the hook contract. If
a future version stops sending `agent_id` on subagent calls, this hook
silently stops blocking anyone. It fails open, not closed.
"""
import json
import re
import sys

try:
    raw = sys.stdin.read()
    request = json.loads(raw) if raw.strip() else {}
except Exception as exc:
    print(f"deny-git-stash: could not parse stdin: {exc}", file=sys.stderr)
    sys.exit(0)

if not isinstance(request, dict) or request.get("tool_name") != "Bash":
    sys.exit(0)

# Subagents only. An absent, empty, or null agent_id means this call came
# from the main agent, and the main agent must never be blocked.
agent_id = request.get("agent_id")
if not agent_id:
    sys.exit(0)

agent_type = request.get("agent_type")

command = request.get("tool_input", {}).get("command", "")
if not isinstance(command, str):
    sys.exit(0)

# Match git stash, including forms such as:
#   git stash
#   git -C repo stash
#   cd repo && git stash pop
#   command git stash
# Exclude the read-only `git stash list` subcommand.
match = re.search(r"\bgit(?:\s+-[A-Za-z0-9-]+(?:\s+\S+)?)*\s+stash\b(?!\s+list\b)", command)

if match:
    agent_note = f" (agent_type={agent_type})" if agent_type else ""
    reason = (
        f"Blocked{agent_note}: this repository carries a large amount of "
        "uncommitted work, and a stash round-trip risks losing it. Take a "
        "snapshot with git diff or cp instead of stashing, and ask the "
        "parent agent before changing working-tree state."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))

sys.exit(0)
