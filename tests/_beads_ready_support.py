"""Shared helpers for the E7-5 native ready tests. Not a test module.

The pinned call pattern of `next_ready("slice", under)` on beads is one list read, then one ready call:

    list --json --all
    ready -t task --label cb [--parent <bd id of under>] --json --limit 0

The list read comes first, because the adapter needs it to refuse a legacy tracker, to map `under` to a
bd id, and to turn each ready row into a cb record. `corpus-ready` is the parity corpus: three programs,
a PR that tracks two epics, an in_progress epic, a deferred epic with a ready-looking slice, and a program
with two ordered epics.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _beads_support as support

PARITY_CORPUS = support.FIXTURE_DIR / "corpus-ready"
LIST_ARGS = ["list", "--json", "--all"]
KINDS = ("program", "epic", "slice")


def ready_argv(parent_bd_id: str | None = None) -> list[str]:
    """The pinned form of the ready call. The test asserts it as a literal, not through the code under test."""
    return ["ready", "-t", "task", "--label", "cb", *(["--parent", parent_bd_id] if parent_bd_id else []), "--json", "--limit", "0"]


def list_rows() -> list[dict[str, Any]]:
    """The rows of the demo corpus on bd 1.3.0 in the native mapping: transcripts/list.json."""
    return json.loads(support.load_transcript("list")["stdout"])


def bd_id_of(rows: list[dict[str, Any]], cb_id: str) -> str:
    return next(row["id"] for row in rows if (row.get("metadata") or {}).get("cb", {}).get("id") == cb_id)


def ready_row(bd_id: str) -> dict[str, Any]:
    """A ready row as bd gives it: no cb metadata. The adapter must map it through the list read."""
    return {"id": bd_id, "title": f"title of {bd_id}", "status": "open", "issue_type": "task", "labels": ["cb"]}


class ReadyRunner:
    """Plays bd for the replay tests. The list read gives the rows, and the ready call gives `ready_ids` or fails.

    Any other call fails the test. `calls` keeps each argument list in order.
    """

    def __init__(self, rows: list[dict[str, Any]], ready_ids: list[str] | None = None, error: str | None = None) -> None:
        self.rows = rows
        self.ready_ids = ready_ids or []
        self.error = error
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        self.calls.append(list(args))
        if list(args) == LIST_ARGS:
            return json.dumps(self.rows)
        if args[0] == "ready":
            if self.error is not None:
                raise BdError(f"bd {' '.join(args)} exited 1: {self.error}", 1, self.error)
            return json.dumps([ready_row(bd_id) for bd_id in self.ready_ids])
        raise AssertionError(f"unexpected bd call {args}")


def adapter_over(rows: list[dict[str, Any]], ready_ids: list[str] | None = None, error: str | None = None) -> tuple[Any, ReadyRunner]:
    from tracker_port.beads import BeadsAdapter

    runner = ReadyRunner(rows, ready_ids, error)
    return BeadsAdapter(runner), runner


def fake_ids(corpus: Path, kind: str, under: str | None = None) -> list[str]:
    """The ids that the fake adapter gives, sorted. The fake and the projector are the reference."""
    from tracker_port.fake import FakeAdapter

    return sorted(record.id for record in FakeAdapter(corpus).next_ready(kind, under=under))


def sorted_ids(records: list[Any]) -> list[str]:
    return sorted(record.id for record in records)
