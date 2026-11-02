"""The checkpoint file of `priority judge-check`: one JSONL row for each finished unit of judge work.

A unit is one pair (all its calls) or one probe copy. A pair row is
`{"session", "stop", "fingerprint", "a": [scores], "b": [scores]}`. A probe row
is `{"session", "stop", "changed", "fingerprint", "base", "copy"}`. The
fingerprint is a hash of the payload content, so a row of other content does
not match. A row that no unit of the run asks for is ignored with a warning.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def fingerprint(payload: object) -> str:
    """A short hash of the content of one payload."""
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


def pair_key(session: str, stop: object, digest: str) -> tuple:
    """The lookup key of a pair row."""
    return ("pair", session, int(stop), digest)


def probe_key(session: str, stop: object, changed: str, digest: str) -> tuple:
    """The lookup key of a probe row."""
    return ("probe", session, int(stop), changed, digest)


def _row_key(row: dict) -> tuple:
    if "changed" in row:
        return probe_key(row["session"], row["stop"], row["changed"], row["fingerprint"])
    return pair_key(row["session"], row["stop"], row["fingerprint"])


class Checkpoint:
    """The stored rows of one run. With no path, it stores nothing and finds nothing."""

    def __init__(self, path: Path | None):
        self.path, self.rows, self.used = path, {}, set()
        if path is None or not Path(path).exists():
            return
        for number, line in enumerate(Path(path).read_text().splitlines(), 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
                self.rows[_row_key(row)] = row
            except (ValueError, KeyError, TypeError):
                print(f"warning: checkpoint line {number} is not a row, so it is ignored")

    def get(self, key: tuple) -> dict | None:
        """The stored row of a unit, or None."""
        row = self.rows.get(key)
        if row is not None:
            self.used.add(key)
        return row

    def add(self, row: dict) -> None:
        """Append one finished row to the file at once."""
        if self.path is None:
            return
        with Path(self.path).open("a") as handle:
            handle.write(json.dumps(row) + "\n")

    def warn_unused(self) -> None:
        """Print one warning for each stored row that no unit of this run asked for."""
        for key in self.rows.keys() - self.used:
            print(f"warning: checkpoint row {key[1]} stop {key[2]} does not match this pairs file, so it is ignored")
