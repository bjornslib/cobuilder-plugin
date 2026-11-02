"""The checkpoint file of `priority judge-check`: one JSONL row for each finished unit of judge work.

A unit is one pair (all its calls) or one probe copy. A pair row is
`{"session", "stop", "fingerprint", "judge", "a": [scores], "b": [scores],
"notes": {"a": [feedback], "b": [feedback]}}`. A probe row is `{"session",
"stop", "changed", "fingerprint", "judge", "base", "copy", "base_notes",
"copy_notes"}`. The notes hold the judge feedback text, in the order of the
scores. A row with no notes still loads. The fingerprint is a hash of the
payload content and the repeats, so a row of other content does not match. The
`judge` field holds the judge
identity of the run that wrote the row, so a row of another judge (another
model, rubric, token cap, or temperature) does not match either. A row that no
unit of the run asks for, or that another judge wrote, is ignored with a
warning.
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


def _same_judge(row: dict, identity: dict) -> bool:
    """Whether a stored row was judged by the judge of this run."""
    return row.get("judge") == identity


def _judge_change(stored: object, identity: dict) -> str:
    """The part of the judge that differs between a stored row and this run."""
    if not isinstance(stored, dict):
        return "no judge identity"
    parts = sorted(name for name in set(stored) | set(identity) if stored.get(name) != identity.get(name))
    return ", ".join(parts) or "no judge identity"


class Checkpoint:
    """The stored rows of one run. With no path, it stores nothing and finds nothing.

    `identity` is the judge identity of this run. A stored row whose `judge`
    field is missing or differs is ignored at load, with a warning that names
    the part of the judge that changed."""

    def __init__(self, path: Path | None, identity: dict | None = None):
        self.path, self.rows, self.used = path, {}, set()
        self.identity = identity if identity is not None else {}
        if path is None or not Path(path).exists():
            return
        for number, line in enumerate(Path(path).read_text().splitlines(), 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
                if identity is not None and not _same_judge(row, identity):
                    print(f"warning: checkpoint line {number} was judged by another judge "
                          f"({_judge_change(row.get('judge'), identity)}), so it is ignored")
                    continue
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
