"""Slice 8 of E2: the beads seed replays recorded bd calls.

The dry run sends only the list read, and it prints the creates in dry_run.txt.
An apply run replays seed_steps.json: it sends each create and dep add in the
recorded order. A second run over the seeded tracker creates nothing.

seed_steps.json holds the writes that real bd 1.3.0 answered, in order. Each
write carries the list output that bd showed before it. list_after holds the
final list.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _beads_support as support

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "tracker"
PLANS_DIR = FIXTURES / "plans"
DRY_RUN = FIXTURES / "backfill" / "dry_run.txt"
SEED_TRANSCRIPT = FIXTURES / "beads" / "transcripts" / "seed_steps.json"
BD_VERSION_PREFIX = "bd version 1.3.0"
# The title of each seeded record: the plan name, the epic header name, and each slice name.
SEEDED_TITLES = [
    "beads-storage-mini",
    "Mini epic",
    "Lists programs from the tree",
    "Contract cases pass",
    "Dry run matches the fixture",
]
SEEDED_IDS = [
    "beads-storage-mini",
    "beads-storage-mini/E1",
    "beads-storage-mini/1",
    "beads-storage-mini/2",
    "beads-storage-mini/3",
]


class ReplayRunner:
    """Answers each list read with the state that bd showed. Replays each write in order.

    A write that differs from the next recorded step fails the test. A write
    with no recorded step left also fails.
    """

    def __init__(self, steps: list[dict[str, Any]], list_after: str) -> None:
        self.steps = steps
        self.list_after = list_after
        self.writes: list[list[str]] = []
        self.syncs = 0
        self.lookups: list[list[str]] = []
        self.violations: list[str] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS
        if list(args) == ["sync"]:
            self.syncs += 1
            return "Sync complete.\n"

        if list(args)[:2] == ["list", "--external-ref"]:
            # The ref lookup of a create. No row holds a ref that the seed is about to create.
            self.lookups.append(list(args))
            return "[]"
        if list(args) == LIST_ARGS:
            index = len(self.writes)
            return self.steps[index]["list_before"] if index < len(self.steps) else self.list_after
        index = len(self.writes)
        if index >= len(self.steps):
            self._violate(args, "no recorded write is left")
        expected = self.steps[index]["args"]
        if list(args) != expected:
            self._violate(args, f"the next recorded write is {expected}")
        self.writes.append(list(args))
        return self.steps[index]["stdout"]

    def _violate(self, args: list[str], reason: str) -> None:
        message = f"unexpected bd write {args}: {reason}"
        self.violations.append(message)
        raise AssertionError(message)


def _load_transcript() -> dict[str, Any]:
    return json.loads(SEED_TRANSCRIPT.read_text(encoding="utf-8"))


def _projected_lines(records: list[Any]) -> str:
    from tracker_port.projector import project

    lines = [json.dumps(project([record])["entities"][record.id], sort_keys=True) for record in records]
    return "\n".join(lines) + "\n"


def test_seed_transcript_records_bd_1_3_0() -> None:
    assert _load_transcript()["bd"].startswith(BD_VERSION_PREFIX)


def test_dry_run_prints_the_creates_in_the_fixture() -> None:
    from tracker_port.beads import BeadsAdapter

    records = BeadsAdapter(support.ListOnlyRunner([])).seed_from_files(PLANS_DIR, dry_run=True)

    assert _projected_lines(records) == DRY_RUN.read_text(encoding="utf-8")


def test_dry_run_sends_only_the_list_read() -> None:
    from tracker_port.beads import LIST_ARGS, BeadsAdapter

    runner = support.ListOnlyRunner([])
    BeadsAdapter(runner).seed_from_files(PLANS_DIR, dry_run=True)

    assert runner.calls
    assert all(call == LIST_ARGS for call in runner.calls)


def test_apply_replays_creates_and_deps_in_recorded_order() -> None:
    from tracker_port.beads import BeadsAdapter

    body = _load_transcript()
    runner = ReplayRunner(body["steps"], body["list_after"])

    records = BeadsAdapter(runner).seed_from_files(PLANS_DIR)

    assert not runner.violations
    assert runner.writes == [step["args"] for step in body["steps"]]
    creates = [call for call in runner.writes if call[0] == "create"]
    assert [support.metadata_arg(call)["cb"]["id"] for call in creates] == SEEDED_IDS
    assert [call[call.index("--title") + 1] for call in creates] == SEEDED_TITLES
    assert runner.lookups == [["list", "--external-ref", ref, "--json", "--limit", "0", "--all"] for ref in SEEDED_IDS]
    assert [record.id for record in records] == SEEDED_IDS
    assert runner.syncs == 1, "a run that creates records must sync once, at the end"


def test_second_run_over_the_seeded_tracker_creates_nothing() -> None:
    from tracker_port.beads import BeadsAdapter

    body = _load_transcript()
    seeded_refs = {row["external_ref"] for row in json.loads(body["list_after"])}
    assert set(SEEDED_IDS) <= seeded_refs

    runner = ReplayRunner([], body["list_after"])

    records = BeadsAdapter(runner).seed_from_files(PLANS_DIR)

    assert records == []
    assert runner.writes == []
    assert not runner.violations
    assert runner.syncs == 0, "a run that creates nothing must not sync"
