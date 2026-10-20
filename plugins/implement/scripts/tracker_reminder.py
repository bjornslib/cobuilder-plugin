# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""SessionStart hook that reminds the agent to use the tracker command.

The script reads the hook payload from stdin. It takes the working folder
from the payload key "cwd", and it uses the current folder when the payload
is empty or not valid JSON. It checks for .cobuilder/tracker.yaml in that
folder and prints one SessionStart JSON object with a reminder in
additionalContext. It reads no other file, starts no process, and uses no
network. It always exits with 0, so it never blocks a session.
"""
from __future__ import annotations

import json
import os
import sys

CONFIGURED = "\n".join([
    "CoBuilder tracker is on for this repo.",
    "Use /architect:design for architecture design.",
    "Use /implement:start to build a design.",
    "Workflow state moves only through tracker.py.",
    "Never edit by hand the status files or goal.json.",
    "Key operations: tracker.py doctor, tracker.py list-programs, "
    "tracker.py next-ready.",
    "Also: tracker.py claim-slice, tracker.py set-slice-state, tracker.py sync.",
    "Read shared/tracker-usage.md for the arguments of each operation.",
])

MISSING = (
    "CoBuilder tracker is not set up here. Run /cobuilder-full-lifecycle:install "
    "because tracker writes exit 2 without .cobuilder/tracker.yaml."
)


def payload_cwd(raw: str) -> str:
    """Return the cwd named in the payload, or the current folder."""
    try:
        data = json.loads(raw) if raw.strip() else {}
    except ValueError:
        data = {}
    cwd = data.get("cwd") if isinstance(data, dict) else None
    return cwd if isinstance(cwd, str) and cwd else os.getcwd()


def build_context(cwd: str) -> str:
    """Pick the reminder text for the folder."""
    if os.path.isfile(os.path.join(cwd, ".cobuilder", "tracker.yaml")):
        return CONFIGURED
    return MISSING


def main() -> int:
    try:
        raw = sys.stdin.read()
    except OSError:
        raw = ""
    context = build_context(payload_cwd(raw))
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": context,
    }}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
