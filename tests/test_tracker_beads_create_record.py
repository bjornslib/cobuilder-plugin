"""Slice 7 of E2: beads create_record and sync replay bd transcripts.

Run with: uv run pytest tests/test_tracker_beads_create_record.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import _beads_support as support


def test_create_record_program_replays_recorded_argv() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    steps = support.with_syncs(support.steps("create_program"))
    runner = support.SequenceRunner(steps)
    program = TrackerRecord(
        id="demo",
        kind="program",
        parent=None,
        blocked_by=(),
        lifecycle="open",
        assignee=None,
        envelope={"gate1": "2026-10-14", "stage": "design", "gate2b": "n/a"},
        external_ref=None,
    )
    BeadsAdapter(runner).create_record(program)

    assert len(runner.calls) == len(steps)
    assert "--external-ref" not in runner.calls[0]


def test_create_record_epic_maps_parent_and_blocked_by() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    steps = support.with_syncs(support.steps("create_epic"))
    runner = support.SequenceRunner(steps)
    epic = TrackerRecord(
        id="demo-E1",
        kind="epic",
        parent="demo",
        blocked_by=("pr-101",),
        lifecycle="open",
        assignee=None,
        envelope={},
        external_ref=None,
    )
    BeadsAdapter(runner).create_record(epic)

    assert runner.calls[0] == ["list", "--json", "--all"]
    assert len(runner.calls) == len(steps)


def test_create_record_slice_maps_parent_under_its_epic() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    steps = support.with_syncs(support.steps("create_slice"))
    runner = support.SequenceRunner(steps)
    slice_record = TrackerRecord(
        id="demo-E1-s1",
        kind="slice",
        parent="demo-E1",
        blocked_by=(),
        lifecycle="open",
        assignee=None,
        envelope={"score": 0.92, "attempts": 2},
        external_ref=None,
    )
    BeadsAdapter(runner).create_record(slice_record)

    assert runner.calls[0] == ["list", "--json", "--all"]
    assert len(runner.calls) == len(steps)


def test_create_record_drifted_argument_fails_replay(tmp_path: Path) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    body = support.load_transcript("create_epic")
    create = next(step for step in body["steps"] if step["args"][0] == "create")
    create["args"][create["args"].index("--priority") + 1] = "1"
    copy = tmp_path / "create_epic.json"
    copy.write_text(json.dumps(body), encoding="utf-8")
    steps = json.loads(copy.read_text(encoding="utf-8"))["steps"]
    epic = TrackerRecord(
        id="demo-E1",
        kind="epic",
        parent="demo",
        blocked_by=("pr-101",),
        lifecycle="open",
        assignee=None,
        envelope={},
        external_ref=None,
    )
    try:
        BeadsAdapter(support.SequenceRunner(steps)).create_record(epic)
    except AssertionError:
        return
    raise AssertionError("a create argv with a changed priority must fail the replay")


def test_create_record_round_trip_types() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    runner = support.SequenceRunner(support.with_syncs(support.steps("create_slice")))
    slice_record = TrackerRecord(
        id="demo-E1-s1",
        kind="slice",
        parent="demo-E1",
        blocked_by=(),
        lifecycle="open",
        assignee=None,
        envelope={"score": 0.92, "attempts": 2},
        external_ref=None,
    )
    result = BeadsAdapter(runner).create_record(slice_record)

    sent = support.metadata_arg(runner.calls[1])["cb"]["envelope"]
    assert type(sent["score"]) is float
    assert type(sent["attempts"]) is int
    assert type(result.envelope["score"]) is float
    assert type(result.envelope["attempts"]) is int


def test_sync_sends_bare_sync_and_returns_none() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.SequenceRunner([support.load_transcript("sync_ok")])
    result = BeadsAdapter(runner).sync()

    assert runner.calls == [["sync"]]
    assert result is None


def test_sync_failure_raises_adapter_error_with_bd_stderr() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    body = dict(support.load_transcript("sync_failed_empty_remote"))
    body["stderr"] = "bd: sync conflict on beads/team-sync\n"
    runner = support.SequenceRunner([body])
    try:
        BeadsAdapter(runner).sync()
    except AdapterError as error:
        assert body["stderr"].strip() in str(error)
    else:
        raise AssertionError("sync must raise AdapterError when bd sync exits 1")
