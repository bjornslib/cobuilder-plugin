"""The files, the log lines, and the measured data that the replay and its report share."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger("priority.replay")

CALLS = "calls.jsonl"
FOLDERS = ("json", "chat", "digest", "drills")  # the folders of rows that a run owns inside the log folder


def read_rows(folder: Path) -> list[dict]:
    """The call rows of one folder, or an empty list when the folder has none."""
    path = folder / CALLS
    if not path.is_file():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def log_abstain(session: str, reason: str, detail: str) -> None:
    """One log record for an Abstain, with its session and its reason."""
    log.warning("session %s: abstain %s: %s", session, reason, detail)


@dataclass
class Measured:
    """What one replay measured. The report and the go or no-go section read it."""
    sessions: int
    adapters: tuple[str, ...]
    concurrency: int
    results: list[dict]
    rows: dict[str, list[dict]]  # the call rows by folder: each adapter, and digest
    drills: dict[str, str]  # the reason of each drill, by drill name
    conditions: list[str]  # the abort_if list of the goal file
    stored: set[str] = field(default_factory=set)  # the sessions that have a stored digest
