# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""PostToolUse hook that coaches the GREEN agent with habit-hooks output.

This script runs after every Write or Edit tool call in the implement
plugin. It checks the call, and it does nothing unless the call came from
the implement:green agent and named a file path. For a GREEN write, it
runs habit-hooks against that file and reports the result as additional
context for the agent. It never blocks a write, because PostToolUse cannot
block, and a coaching tool must not stop a write anyway.

habit-hooks is MIT licensed, by Ivett Ordog and contributors.
See https://github.com/habit-hooks/habit-hooks.
"""
from __future__ import annotations

import json
import subprocess
import sys
from typing import IO

GREEN_AGENT_TYPES = frozenset({"implement:green"})


def is_green(payload: dict) -> bool:
    """Return True when the payload names a GREEN agent."""
    return payload.get("agent_type") in GREEN_AGENT_TYPES


def target_path(payload: dict) -> str | None:
    """Return the written file path, or None when the payload has none."""
    tool_input = payload.get("tool_input") or {}
    return tool_input.get("file_path")


def run_habit_hooks(path: str) -> tuple[int, str]:
    """Run habit-hooks against path and return its exit code and output.

    A missing habit-hooks binary returns exit code 127 with a short
    message, instead of raising FileNotFoundError.
    """
    try:
        result = subprocess.run(
            ["habit-hooks", "--file", path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.returncode, result.stdout + result.stderr
    except FileNotFoundError:
        return 127, "habit-hooks is not installed."
    except subprocess.TimeoutExpired:
        return 2, "habit-hooks timed out."


def render(code: int, text: str) -> dict | None:
    """Build the hookSpecificOutput dict for a habit-hooks result.

    Exit code 0 renders to None, since there is nothing to report.
    """
    if code == 0:
        return None
    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": text,
        }
    }


def main(stdin: IO[str], stdout: IO[str], runner=run_habit_hooks) -> int:
    """Read the PostToolUse payload from stdin and coach GREEN writes.

    This function never raises. It always returns 0, so the hook never
    blocks the write it observed.
    """
    try:
        payload = json.loads(stdin.read())
    except (json.JSONDecodeError, ValueError):
        return 0

    if not is_green(payload):
        return 0

    path = target_path(payload)
    if path is None:
        return 0

    code, text = runner(path)
    if code == 1:
        message = f"habit-hooks coaching for {path}:\n{text}"
    elif code == 127:
        message = (
            'habit-hooks is not installed, install it with '
            '`uv tool install "habit-hooks[python]"` and name every '
            "language in one install command."
        )
    elif code == 2:
        message = (
            f"habit-hooks failed to run on {path}. "
            f"Report this in your GREEN report.\n{text}"
        )
    else:
        message = text

    result = render(code, message)
    if result is not None:
        json.dump(result, stdout)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.stdin, sys.stdout))
