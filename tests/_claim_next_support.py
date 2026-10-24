"""Shared helpers for the E7-6 claim-next tests. Not a test module.

The pinned call pattern of `claim_next(claimant, under)` on beads, in verbs:

    list --json --all
    ready -t task --label cb --claim --actor <claimant> [--parent <bd id of under>] --json --limit 0
    update <epic bd id> --status in_progress      (only when the epic of the claimed slice is open)
    sync                                          (one, and only after a claim)

The list read comes first, because the adapter needs it to refuse a legacy tracker, to map `under` to a bd
id, to turn the claimed row into a cb record, and to find the epic row. An empty claim result ends the call:
no update and no sync. `ClaimRunner` plays bd for the replay tests. The demo rows (`transcripts/list.json`)
hold the epic demo-E1 (bd id t-anc.1, open) with the slices s1 closed, s2 held by agent-1, and s3 ready.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import _beads_ready_support as r
import _beads_support as support

S3 = "t-anc.1.3"
EPIC = "t-anc.1"
PROGRAM = "t-anc"
EPIC_TO_IN_PROGRESS = ["update", EPIC, "--status", "in_progress"]


def claim_argv(claimant: str, parent_bd_id: str | None = None) -> list[str]:
    """The pinned form of the claim call. The test asserts it as a literal, not through the code under test."""
    parent = ["--parent", parent_bd_id] if parent_bd_id else []
    return ["ready", "-t", "task", "--label", "cb", "--claim", "--actor", claimant, *parent, "--json", "--limit", "0"]


def rows_with_epic(status: str) -> list[dict[str, Any]]:
    """The demo rows with the status of the epic demo-E1 set to `status`."""
    rows = copy.deepcopy(r.list_rows())
    next(row for row in rows if row["id"] == EPIC)["status"] = status
    return rows


def recorded_claim_row() -> dict[str, Any]:
    """The row that bd 1.3.0 printed for a claim (native-ready-claim.json, step 1), with the demo bd ids."""
    stdout = support.steps("native-ready-claim")[0]["stdout"]
    return json.loads(stdout.replace("s-dxu.1.1", S3).replace("s-dxu.1", EPIC))[0]


class ClaimRunner(r.ReadyRunner):
    """Plays bd. The list read gives `rows`. The claim call gives `claimed` or fails. An update or a sync gives "".

    Any other call fails the test. `calls` keeps each argument list in order.
    """

    def __init__(self, rows: list[dict[str, Any]], claimed: list[dict[str, Any]] | None = None, error: str | None = None) -> None:
        super().__init__(rows, error=error)
        self.claimed = claimed or []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        if args[0] == "ready" and "--claim" in args:
            self.calls.append(list(args))
            if self.error is not None:
                raise BdError(f"bd {' '.join(args)} exited 1: {self.error}", 1, self.error)
            return json.dumps(self.claimed)
        if args[0] in ("update", "sync"):
            self.calls.append(list(args))
            return ""
        return super().run(args)

    def verbs(self) -> list[str]:
        return [call[0] for call in self.calls]


def adapter_over(
    rows: list[dict[str, Any]], claimed: list[dict[str, Any]] | None = None, error: str | None = None, sync: str = "write"
) -> tuple[Any, ClaimRunner]:
    from tracker_port.beads import BeadsAdapter

    runner = ClaimRunner(rows, claimed, error)
    return BeadsAdapter(runner, sync=sync), runner


def write_corpus(root: Path, slices: int) -> Path:
    """Write a corpus of one program, one epic demo-E1, and `slices` open slices demo-E1-s1 to s<slices>. Return its dir.

    `contract._build_beads_scratch` seeds a real bd tracker from it, and the fake adapter reads it as is.
    """
    corpus = root / "corpus"
    corpus.mkdir(parents=True)

    def record(id: str, kind: str, parent: str | None, lifecycle: str = "open", envelope: dict[str, Any] | None = None) -> dict[str, Any]:
        return {"id": id, "kind": kind, "parent": parent, "blocked_by": [], "lifecycle": lifecycle, "assignee": None,
                "envelope": envelope or {}, "external_ref": None}

    files = {
        "program.json": record("demo", "program", None, envelope={"stage": "build"}),
        "epics.json": [record("demo-E1", "epic", "demo")],
        "slices.json": [record(f"demo-E1-s{n}", "slice", "demo-E1") for n in range(1, slices + 1)],
        "prs.json": [],
    }
    for name, body in files.items():
        (corpus / name).write_text(json.dumps(body), encoding="utf-8")
    return corpus
