"""Shared helpers for the E7-4 pull request tests. Not a test module.

The transcripts open_pull_request_tracks_steps.json and merge_pull_request_tracks_steps.json hold a real
bd 1.3.0 run in a scratch tracker: two epics, one milestone, and one `tracks` edge from the milestone to
each epic. The recorded argv is the contract of E7-4:

    create --silent --type milestone --title pr-101 --priority 2 --labels cb --external-ref gh-101 --metadata M
    dep add <pr bd id> <epic bd id> --type tracks        (once for each epic, in the order of the epic list)
"""
from __future__ import annotations

import json
from typing import Any

import _beads_support as support

OPEN = "open_pull_request_tracks_steps"
MERGE = "merge_pull_request_tracks_steps"
EPICS = ["demo-E1", "demo-E2"]
PR_BD_ID = "t-ikw"
EPIC_BD_ID = {"demo-E1": "t-ao5", "demo-E2": "t-ktb"}


class QuietRunner:
    """Answers the list read with fixed rows and every other bd call with empty output. It keeps each call."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        return json.dumps(self.rows) if args[0] == "list" else ""


def adapter_over(runner: Any) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner)


def replay(name: str) -> Any:
    return support.SequenceRunner(support.with_syncs(support.steps(name)))


def recorded_rows(name: str, step: int) -> list[dict[str, Any]]:
    """The rows of one recorded list read. Step 0 of MERGE holds the open milestone, and step 2 the closed one."""
    return json.loads(support.steps(name)[step]["stdout"])


def open_replay() -> tuple[Any, Any]:
    """Open pr-101 for the two epics through the recorded run. Return the runner and the record."""
    runner = replay(OPEN)
    record = adapter_over(runner).open_pull_request("pr-101", list(EPICS))
    assert len(runner.calls) == len(runner.steps), "the adapter stopped before the end of the recorded run"
    return runner, record


def merge_replay(merged: bool = True) -> tuple[Any, Any]:
    runner = replay(MERGE)
    return runner, adapter_over(runner).set_pull_request_state("pr-101", merged=merged)


def verbs(runner: Any) -> list[str]:
    return [call[0] for call in runner.calls]


def records_of(rows: list[dict[str, Any]]) -> dict[str, Any]:
    adapter, _ = support.list_adapter(rows)
    return {record.id: record for record in support.all_records(adapter)}
