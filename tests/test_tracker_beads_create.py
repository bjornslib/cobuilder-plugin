"""E2 slice 6: create_record on beads, with closed slices and real bd.

Run with: uv run pytest tests/test_tracker_beads_create.py -q
"""
from __future__ import annotations

import pytest
import json
import shutil
import tempfile
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_support import BEADS_DIR, FIXTURE_DIR

_scratch_tracker = support.scratch_tracker


def _closed_probe(assignee: str | None) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id="demo-closed-probe",
        kind="slice",
        parent=None,
        blocked_by=(),
        lifecycle="closed",
        assignee=assignee,
        envelope={},
        external_ref=None,
    )


def test_create_record_closes_a_closed_slice_after_create() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = json.loads((BEADS_DIR / "transcripts" / "create_closed_slice_steps.json").read_text(encoding="utf-8"))["steps"]
    runner = support.CreateAnswers()
    BeadsAdapter(runner).create_record(_closed_probe(None))

    assert steps[0]["args"] in runner.calls, runner.calls
    assert steps[1]["args"] in runner.calls, runner.calls
    assert runner.calls.index(steps[0]["args"]) < runner.calls.index(steps[1]["args"]), runner.calls
    assert runner.calls[-1] == ["sync"], runner.calls


def test_create_record_sets_the_assignee_of_a_closed_slice() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.CreateAnswers()
    BeadsAdapter(runner).create_record(_closed_probe("agent-x"))

    create = next(call for call in runner.calls if call[0] == "create")
    assert "--assignee" in create, create
    assert create[create.index("--assignee") + 1] == "agent-x", create


def test_create_record_closed_slice_keeps_parent_assignee_blocker_and_envelope() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    runner = support.CreateAnswers(
        listing=(BEADS_DIR / "list.json").read_text(encoding="utf-8"), created="t-new\n"
    )
    record = TrackerRecord(
        id="demo-E1-s4",
        kind="slice",
        parent="demo-E1",
        blocked_by=("demo-E1-s1",),
        lifecycle="closed",
        assignee="agent-x",
        envelope={"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]},
        external_ref=None,
    )
    BeadsAdapter(runner).create_record(record)

    create = next(call for call in runner.calls if call[0] == "create")
    assert create[create.index("--parent") + 1] == "t-anc.1", create
    assert create[create.index("--assignee") + 1] == "agent-x", create
    cb = json.loads(create[create.index("--metadata") + 1])["cb"]
    assert cb["id"] == "demo-E1-s4" and cb["kind"] == "slice", cb
    assert cb["envelope"] == {"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]}, cb
    assert ["dep", "add", "t-new", "t-anc.1.1"] in runner.calls, runner.calls
    assert runner.calls.index(["close", "t-new", "--force"]) > runner.calls.index(["dep", "add", "t-new", "t-anc.1.1"]), runner.calls


@pytest.mark.slow
def test_create_record_round_trip_on_real_bd() -> None:
    support.require_bd()

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter
    from tracker_port.record import TrackerRecord

    source = FIXTURE_DIR / "plans-real" / "blocked-close"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = root / "plans"
        shutil.copytree(source, plans / "blocked-close")
        expected = FilesAdapter(plans).all_records()
        epic = next(record for record in expected if record.kind == "epic")
        blocker = next(record for record in expected if record.kind == "slice")

        seed = _scratch_tracker(root)
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)

        written = TrackerRecord(
            id=f"{blocker.id}-round-trip",
            kind="slice",
            parent=epic.id,
            blocked_by=(blocker.id,),
            lifecycle="closed",
            assignee="agent-x",
            envelope={"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]},
            external_ref=None,
        )
        adapter.create_record(written)
        read = adapter.get_slice(written.id)

        assert read.parent == written.parent, read.parent
        assert read.blocked_by == written.blocked_by, read.blocked_by
        assert read.lifecycle == written.lifecycle, read.lifecycle
        assert read.assignee == written.assignee, f"assignee after close --force: {read.assignee!r}"
        # Lists come back as tuples, so the envelope compares with a tuple.
        assert read.envelope == {"score": 0.92, "attempts": 2, "escalated": True, "evidence": ("a", "b")}, read.envelope
        assert type(read.envelope["score"]) is float
        assert type(read.envelope["attempts"]) is int
        assert type(read.envelope["escalated"]) is bool
