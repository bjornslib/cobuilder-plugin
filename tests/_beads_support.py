"""Shared helpers for the beads adapter tests. Not a test module.

The helpers hold the fixture paths, a runner that replays recorded bd steps,
a runner that answers one create, and the real-bd scratch tracker.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker"
BEADS_DIR = FIXTURE_DIR / "beads"

FRESH_CLONE_ENV = {
    "GIT_AUTHOR_NAME": "beads-test",
    "GIT_AUTHOR_EMAIL": "beads-test@example.invalid",
    "GIT_COMMITTER_NAME": "beads-test",
    "GIT_COMMITTER_EMAIL": "beads-test@example.invalid",
    "BD_NON_INTERACTIVE": "1",
}


class SequenceRunner:
    """Answers each recorded argument list in order. It fails on any other call."""

    def __init__(self, steps: list[dict[str, Any]]) -> None:
        self.steps = steps
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        self.calls.append(list(args))
        step = self.steps[len(self.calls) - 1]
        assert list(args) == step["args"], f"unexpected bd call: {args}"
        if step.get("exit", 0) != 0:
            raise BdError(f"bd {' '.join(args)} exited {step['exit']}", step["exit"], step["stderr"])
        return step["stdout"]


class CreateAnswers:
    """Answers the bd calls of one create and close. It needs no bd binary."""

    def __init__(self, listing: str = "[]", created: str = "demo-bxe\n") -> None:
        self.listing = listing
        self.created = created
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        if args[0] == "list":
            return self.listing
        if args[0] == "create":
            return self.created
        return ""


def require_bd() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0 and fails without it.")


def _step(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        argv,
        cwd=cwd,
        capture_output=True,
        text=True,
        env={**os.environ, **FRESH_CLONE_ENV},
    )
    print(f"[{cwd.name}] {' '.join(argv)} -> exit {completed.returncode}")
    return completed


def run(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    completed = _step(argv, cwd)
    output = completed.stdout + completed.stderr
    error_lines = [line for line in output.splitlines() if line.startswith("Error")]
    assert completed.returncode == 0, f"{argv} in {cwd.name} exited {completed.returncode}:\n{output}"
    assert not error_lines, f"{argv} in {cwd.name} printed error lines: {error_lines}"
    return completed


def scratch_tracker(root: Path) -> Path:
    """Make a bare origin and a seed clone with bd team sync on. Return the seed dir."""
    origin = root / "origin.git"
    seed = root / "seed"
    seed.mkdir()
    run(["git", "init", "--bare", "-q", str(origin)], root)
    run(["git", "init", "-q", "-b", "main"], seed)
    run(["git", "commit", "-q", "--allow-empty", "-m", "seed"], seed)
    run(["git", "remote", "add", "origin", str(origin)], seed)
    run(["git", "push", "-q", "origin", "main"], seed)
    run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], seed)
    run(["bd", "config", "set", "team.enabled", "true"], seed)
    run(["bd", "config", "set", "team.sync_branch", "main"], seed)
    return seed
