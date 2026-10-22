"""Shared helpers for the skip-slice tests. Not a test module."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _beads_support as support
from _tracker_contract_support import BEADS_TRANSCRIPT

# The tracker.py skip-slice operation moves a slice to closed. Its outcome and reason sit in the envelope.
OUTCOMES = ("skipped", "escalated")


class LenientRunner:
    """Answers the recorded list read, and a show of one listed row. It keeps every call.

    Any other bd verb answers with an empty string. The helper never appends to a list that a
    caller iterates, so a comprehension over `calls` is safe.
    """

    def __init__(self, mutate: Any = None) -> None:
        rows = json.loads(json.loads(BEADS_TRANSCRIPT.read_text(encoding="utf-8"))["stdout"])
        if mutate is not None:
            mutate(rows)
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        if args[0] == "list":
            return json.dumps(self.rows)
        if args[0] == "show":
            return json.dumps([row for row in self.rows if row["id"] == args[1]])
        return ""

    def verbs(self) -> list[str]:
        return [call[0] for call in list(self.calls)]


def mark_skipped(rows: list[dict[str, Any]], cb_id: str, outcome: str, reason: str) -> None:
    """Make the row of one slice a closed, skipped slice, as a prior skip-slice leaves it."""
    for row in rows:
        cb = row["metadata"]["cb"]
        if cb["id"] == cb_id:
            row["status"] = "closed"
            cb["envelope"].update({"outcome": outcome, "reason": reason})


def chain_corpus(corpus: Path) -> None:
    """Rewrite the corpus slices as an open chain: s1, then s2 after s1, then s3 after s2."""
    path = corpus / "slices.json"
    slices = json.loads(path.read_text(encoding="utf-8"))
    blockers = {"demo-E1-s1": [], "demo-E1-s2": ["demo-E1-s1"], "demo-E1-s3": ["demo-E1-s2"]}
    for record in slices:
        record.update(lifecycle="open", assignee=None, envelope={}, blocked_by=blockers[record["id"]])
    path.write_text(json.dumps(slices), encoding="utf-8")


def ready_ids(adapter: Any) -> list[str]:
    return sorted(record.id for record in adapter.next_ready("slice"))


__all__ = ["LenientRunner", "OUTCOMES", "chain_corpus", "mark_skipped", "ready_ids", "support"]
