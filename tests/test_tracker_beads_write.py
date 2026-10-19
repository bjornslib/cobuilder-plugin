"""Slice 7 of E2: beads writes replay recorded bd transcripts.

The transcripts under fixtures/tracker/beads/transcripts/ hold real bd 1.3.0
output. Each write must send the recorded argument list and return the
recorded stdout. A claim must read back the assignee, and a claim that bd
refuses must raise AdapterError.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _beads_support as support  # noqa: E402
from _beads_support import BEADS_DIR  # noqa: E402

TRANSCRIPT_DIR = BEADS_DIR / "transcripts"
BD_VERSION_PREFIX = "bd version 1.3.0"
SequenceRunner = support.SequenceRunner


def _load(name: str) -> dict[str, Any]:
    return json.loads((TRANSCRIPT_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _metadata_arg(args: list[str]) -> dict[str, Any]:
    return json.loads(args[args.index("--metadata") + 1])


def test_transcripts_record_bd_1_3_0() -> None:
    for path in sorted(TRANSCRIPT_DIR.glob("*.json")):
        body = json.loads(path.read_text(encoding="utf-8"))
        assert body["bd"].startswith(BD_VERSION_PREFIX), path.name


def _create_args(name: str) -> list[str]:
    return next(step["args"] for step in _steps(name) if step["args"][0] == "create")


def test_create_program_sends_program_type_and_cb_kind() -> None:
    args = _create_args("create_program")
    assert args[args.index("--type") + 1] == "program"
    assert _metadata_arg(args)["cb"]["kind"] == "program"
    assert _steps("create_program")[0]["stdout"] == "demo-b64\n"


def test_create_epic_is_a_child_blocked_by_its_pr() -> None:
    steps = _steps("create_epic")
    args = _create_args("create_epic")
    assert args[args.index("--parent") + 1] == "demo-b64"
    assert _metadata_arg(args)["cb"]["kind"] == "epic"
    assert steps[1]["stdout"] == "demo-b64.1\n"
    assert steps[2]["args"] == ["dep", "add", "demo-b64.1", "demo-uwu"]


def test_create_slice_is_a_child_of_its_epic() -> None:
    args = _create_args("create_slice")
    assert args[args.index("--parent") + 1] == "demo-b64.1"
    assert _metadata_arg(args)["cb"]["kind"] == "slice"
    assert _steps("create_slice")[1]["stdout"] == "demo-b64.1.1\n"


def test_set_state_score_writes_the_whole_cb_block() -> None:
    # --set-metadata on a dotted key stores a flat "cb.envelope.score" key.
    # The write must send the full cb block through --metadata instead.
    body = _load("set_state_score")
    args = body["args"]
    assert "--set-metadata" not in args
    metadata = _metadata_arg(args)
    assert metadata["cb"]["envelope"]["score"] == 0.8
    assert not any("." in key for key in metadata)


def test_claim_read_back_shows_the_claimant() -> None:
    row = json.loads(_load("claim_slice_show")["stdout"])[0]
    assert row["status"] == "in_progress"
    assert row["assignee"] == "agent-x"


def test_claim_race_is_refused_by_bd() -> None:
    body = _load("claim_slice_race")
    assert body["exit"] == 1
    assert body["stdout"] == ""
    assert 'held by "agent-x"' in body["stderr"]


def _steps(name: str) -> list[dict[str, Any]]:
    return _load(name)["steps"]

READ_VERBS = frozenset({"list", "show", "ready", "blocked", "stats", "comments"})


def _with_syncs(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add one recorded `bd sync` at the end of each adapter operation.

    Each adapter operation starts with a `list` read. An operation that
    writes ends with the one sync, after its read-back.
    """
    sync_step = dict(_load("sync_ok"))
    out: list[dict[str, Any]] = []
    group: list[dict[str, Any]] = []

    def close_group() -> None:
        out.extend(group)
        if any(step["args"][0] not in READ_VERBS for step in group):
            out.append(dict(sync_step))
        group.clear()

    for step in steps:
        if step["args"][0] == "list" and group:
            close_group()
        group.append(step)
    if group:
        close_group()
    return out


def test_claim_slice_maps_cb_id_then_reads_back_the_claimant() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = SequenceRunner(_with_syncs(_steps("claim_slice_steps")))
    record = BeadsAdapter(runner).claim_slice("demo-E1-s3", "agent-x")

    assert record.assignee == "agent-x"
    assert [call[0] for call in runner.calls] == ["list", "update", "show", "sync"]


def test_claim_slice_raises_when_read_back_shows_another_claimant() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = _with_syncs(_steps("claim_slice_steps"))
    show = next(step for step in steps if step["args"][0] == "show")
    show["stdout"] = show["stdout"].replace('"agent-x"', '"agent-y"')
    try:
        BeadsAdapter(SequenceRunner(steps)).claim_slice("demo-E1-s3", "agent-x")
    except AdapterError as error:
        assert "agent-y" in str(error)
    else:
        raise AssertionError("a claim read back with another assignee must raise AdapterError")


def test_claim_slice_raises_when_bd_refuses_the_claim() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    try:
        BeadsAdapter(SequenceRunner(_steps("claim_slice_race_steps"))).claim_slice("demo-E1-s2", "agent-y")
    except AdapterError as error:
        assert "agent-1" in str(error)
    else:
        raise AssertionError("a refused claim must raise AdapterError")


def test_set_slice_state_sends_the_full_cb_block() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = SequenceRunner(_with_syncs(_steps("set_slice_state_steps")))
    BeadsAdapter(runner).set_slice_state("demo-E1-s2", "closed", score=0.8)

    assert [call[0] for call in runner.calls] == ["list", "update", "sync"]



def test_shown_slice_round_trips_its_cb_envelope() -> None:
    created = _metadata_arg(_create_args("create_slice"))["cb"]
    shown = json.loads(_load("show_slice")["stdout"])[0]["metadata"]["cb"]
    assert shown["id"] == created["id"] == "demo-E1-s1"
    assert shown["kind"] == "slice"
    assert shown["envelope"]["score"] == 0.92


def test_open_pull_request_replays_the_recorded_argv() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = _with_syncs(_steps("open_pull_request_steps"))
    runner = SequenceRunner(steps)
    BeadsAdapter(runner).open_pull_request("pr-101", ["demo-E1", "demo-E2"])

    assert len(runner.calls) == len(steps)


def test_sequence_runner_rejects_a_drifted_argument() -> None:
    # The replay is only evidence if a changed argument fails it.
    steps = _steps("open_pull_request_steps")
    runner = SequenceRunner(steps)
    runner.run(list(steps[0]["args"]))
    drifted = list(steps[1]["args"])
    drifted[drifted.index("--external-ref") + 1] = "gh-102"
    try:
        runner.run(drifted)
    except AssertionError:
        return
    raise AssertionError("a create argv with a changed external ref must fail the replay")


def test_record_attempt_and_gate_round_trip_keep_every_envelope_key() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = SequenceRunner(_with_syncs(_steps("round_trip_steps")))
    adapter = BeadsAdapter(runner)
    adapter.record_attempt("demo-E1-s1", 0.92)
    adapter.set_gate_value("demo", "gate1", "2026-10-14")
    slice_envelope = dict(adapter.get_slice("demo-E1-s1").envelope)
    program = next(record for record in adapter.list_programs() if record.id == "demo")

    written = _metadata_arg(runner.calls[1])["cb"]["envelope"]
    assert "note" not in written
    assert written == {
        "run": 3,
        "flaky": True,
        "label": "first pass",
        "ratio": 0.5,
        "evidence": ["docs/rubrics/a.md", "docs/rubrics/b.md"],
        "score": 0.92,
        "attempts": 1,
    }
    assert slice_envelope == {
        "run": 3,
        "flaky": True,
        "label": "first pass",
        "ratio": 0.5,
        "score": 0.92,
        "attempts": 1,
        "evidence": ("docs/rubrics/a.md", "docs/rubrics/b.md"),
    }
    assert "note" not in slice_envelope
    assert type(slice_envelope["run"]) is int
    assert type(slice_envelope["flaky"]) is bool
    assert type(slice_envelope["label"]) is str
    assert type(slice_envelope["ratio"]) is float
    assert dict(program.envelope) == {"gate1": "2026-10-14"}
    assert len(runner.calls) == 8


def test_create_record_program_replays_recorded_argv() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    steps = _with_syncs(_steps("create_program"))
    runner = SequenceRunner(steps)
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

    steps = _with_syncs(_steps("create_epic"))
    runner = SequenceRunner(steps)
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

    steps = _with_syncs(_steps("create_slice"))
    runner = SequenceRunner(steps)
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

    body = _load("create_epic")
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
        BeadsAdapter(SequenceRunner(steps)).create_record(epic)
    except AssertionError:
        return
    raise AssertionError("a create argv with a changed priority must fail the replay")


def test_create_record_round_trip_types() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    runner = SequenceRunner(_with_syncs(_steps("create_slice")))
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

    sent = _metadata_arg(runner.calls[1])["cb"]["envelope"]
    assert type(sent["score"]) is float
    assert type(sent["attempts"]) is int
    assert type(result.envelope["score"]) is float
    assert type(result.envelope["attempts"]) is int


def test_sync_sends_bare_sync_and_returns_none() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = SequenceRunner([_load("sync_ok")])
    result = BeadsAdapter(runner).sync()

    assert runner.calls == [["sync"]]
    assert result is None


def test_sync_failure_raises_adapter_error_with_bd_stderr() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    body = dict(_load("sync_failed_empty_remote"))
    body["stderr"] = "bd: sync conflict on beads/team-sync\n"
    runner = SequenceRunner([body])
    try:
        BeadsAdapter(runner).sync()
    except AdapterError as error:
        assert body["stderr"].strip() in str(error)
    else:
        raise AssertionError("sync must raise AdapterError when bd sync exits 1")
