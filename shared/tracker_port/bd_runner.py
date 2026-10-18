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
