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


def gate_create_argv(epic_bd_id: str, await_id: str) -> list[str]:
    """The bd call that makes one gh:pr gate. The gate blocks the epic until the pull request merges."""
    return ["gate", "create", "--type", "gh:pr", "--blocks", epic_bd_id, "--await-id", await_id, "--json"]


def gate_resolve_argv(gate_id: str) -> list[str]:
    return ["gate", "resolve", gate_id]



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
