# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""PostToolUse hook that coaches the GREEN agent with habit-hooks output.

This script runs after every Write or Edit tool call in the implement
plugin. It checks the call, and it does nothing unless the call came from
the implement:green agent and named a file path. For a GREEN write, it
runs habit-hooks from the git root of that file and reports the result as
additional context for the agent. It never blocks a write, because
PostToolUse cannot block, and a coaching tool must not stop a write anyway.

The script never installs habit-hooks. When the habit-hooks binary is
missing, the script reports exit code 127 and names the /implement:install
command. Output that says "nothing scanned" or "is not a file in this
project" means the coach did not read the file. The script reports that
as exit code 2.

Run the script with --check to prove the coach works. The check reads the
git root of the current folder. It runs habit-hooks on the first tracked
source file that it finds. It prints one line. It exits with 0 when the
coach reports, and with 1 and a reason when it does not. The check ignores
stdin.

habit-hooks is MIT licensed, by Ivett Ordog and contributors.
See https://github.com/habit-hooks/habit-hooks.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from typing import IO

GREEN_AGENT_TYPES = frozenset({"implement:green"})

UNSCANNED_MARKERS = ("nothing scanned", "is not a file in this project")

SOURCE_EXTENSIONS = (".py", ".ts", ".tsx", ".js", ".jsx", ".php", ".java", ".rb")


def is_green(payload: dict) -> bool:
    """Return True when the payload names a GREEN agent."""
    return payload.get("agent_type") in GREEN_AGENT_TYPES


def target_path(payload: dict) -> str | None:
    """Return the written file path, or None when the payload has none."""
    tool_input = payload.get("tool_input") or {}
    return tool_input.get("file_path")


def git_root(path: str) -> str | None:
    """Return the git root that holds path, or None when there is none.

    A missing git binary also returns None, so the hook still runs.
    """
    folder = os.path.dirname(os.path.abspath(path))
    try:
        result = subprocess.run(
            ["git", "-C", folder, "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def is_unscanned(text: str) -> bool:
    """Return True when habit-hooks output says it did not scan the file."""
    lowered = text.lower()
    return any(marker in lowered for marker in UNSCANNED_MARKERS)


def pick_probe_file(root: str) -> str | None:
    """Return the first git-tracked source file under root, or None.

    A missing git binary, or a folder outside a git repository, returns None.
    """
    try:
        result = subprocess.run(
            ["git", "-C", root, "ls-files"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        return None
    if result.returncode != 0:
        return None
    for name in result.stdout.splitlines():
        if name.endswith(SOURCE_EXTENSIONS):
            return os.path.abspath(os.path.join(root, name))
    return None


def _run_habit_hooks_once(path: str) -> tuple[int, str]:
    """Run habit-hooks against path once from the git root and return its result.

    The working directory is the git root of path. When path is in no git
    repository, habit-hooks runs in the current directory. A missing
    habit-hooks binary raises FileNotFoundError, which the caller handles.
    A timeout returns exit code 2.
    """
    try:
        result = subprocess.run(
            ["habit-hooks", "--file", os.path.abspath(path)],
            cwd=git_root(path),
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return 2, "habit-hooks timed out."


def run_habit_hooks(path: str) -> tuple[int, str]:
    """Run habit-hooks against path and return its exit code and output.

    A missing habit-hooks binary returns exit code 127. Output that says
    the file was not scanned returns exit code 2, even when habit-hooks
    exits with code 0.
    """
    try:
        code, text = _run_habit_hooks_once(path)
    except FileNotFoundError:
        return 127, "habit-hooks is not installed."

    if is_unscanned(text):
        return 2, text
    return code, text


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


def check(root: str, runner=run_habit_hooks, stdout=sys.stdout) -> int:
    """Run habit-hooks on one tracked source file and write one result line.

    Returns 0 when the coach reports, or when the file scans clean. Returns 1
    with a reason when no probe file exists, when habit-hooks is missing, or
    when habit-hooks does not scan the file.
    """
    probe = pick_probe_file(root)
    if probe is None:
        stdout.write("coaching check failed: no tracked source file to probe in this project.\n")
        return 1

    code, text = runner(probe)
    if code == 1 or (code == 0 and not is_unscanned(text)):
        stdout.write(f"coaching works: habit-hooks ran on {probe}.\n")
        return 0

    if code == 127:
        reason = "habit-hooks is not installed. Run /implement:install."
    elif code == 2:
        reason = f"habit-hooks failed to run on {probe}."
    elif code == 0:
        reason = f"habit-hooks did not scan {probe}."
    else:
        reason = f"habit-hooks exited with code {code} on {probe}."
    stdout.write(f"coaching check failed: {reason}\n")
    return 1


def main(stdin: IO[str], stdout: IO[str], runner=run_habit_hooks, argv: list[str] | None = None) -> int:
    """Read the PostToolUse payload from stdin and coach GREEN writes.

    With --check in argv, run the proof check from the git root of the
    current folder and return its code. Otherwise this function never
    raises. It always returns 0 in hook mode, so the hook never blocks the
    write it observed.
    """
    if "--check" in (argv or []):
        root = git_root(os.path.join(os.getcwd(), "check"))
        if root is None:
            stdout.write("coaching check failed: the current folder is not in a git repository.\n")
            return 1
        return check(root, runner=runner, stdout=stdout)

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
            "habit-hooks is not installed. Run /implement:install, "
            "which installs every language in one command."
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
    sys.exit(main(sys.stdin, sys.stdout, argv=sys.argv[1:]))
