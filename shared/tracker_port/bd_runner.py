"""Run the bd CLI and return its stdout. The only place that starts a bd process."""

from __future__ import annotations

import subprocess
from pathlib import Path

from .port import AdapterError


class BdError(AdapterError):
    """bd is missing, or it exited non-zero. Carries the exit code and stderr."""

    def __init__(self, message: str, exit_code: int = -1, stderr: str = "") -> None:
        super().__init__(message)
        self.exit_code = exit_code
        self.stderr = stderr


def claim_argv(issue_id: str, claimant: str) -> list[str]:
    """The one bd call that claims an issue. bd makes the claim atomic and takes the claimant as the actor."""
    return ["update", issue_id, "--claim", "--actor", claimant]


def ready_argv(*parent: str) -> list[str]:
    """The one bd call that lists ready slices: tasks with the label cb, under one parent when given."""
    return ["ready", "-t", "task", "--label", "cb", *(["--parent", parent[0]] if parent else []), "--json", "--limit", "0"]


def claim_next_argv(claimant: str, *parent: str) -> list[str]:
    """The one bd call that claims the first ready slice: tasks with the label cb, under one parent when given."""
    return [
        "ready", "-t", "task", "--label", "cb", "--claim", "--actor", claimant,
        *(["--parent", parent[0]] if parent else []), "--json", "--limit", "0",
    ]


class BdRunner:
    """Runs `bd <args>` with no shell and returns stdout as text."""

    def __init__(self, bd: str = "bd", cwd: Path | None = None) -> None:
        self.bd = bd
        self.cwd = cwd

    def run(self, args: list[str]) -> str:
        try:
            completed = subprocess.run(
                [self.bd, *args],
                cwd=self.cwd,
                capture_output=True,
                text=True,
                check=False,
            )
        except FileNotFoundError as error:
            raise BdError(f"bd binary not found: {self.bd!r}") from error
        if completed.returncode != 0:
            raise BdError(
                f"bd {' '.join(args)} exited {completed.returncode}: {completed.stderr.strip()}",
                exit_code=completed.returncode,
                stderr=completed.stderr,
            )
        return completed.stdout
