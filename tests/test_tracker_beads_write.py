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

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker"
TRANSCRIPT_DIR = FIXTURE_DIR / "beads" / "transcripts"
BD_VERSION_PREFIX = "bd version 1.3.0"


def _load(name: str) -> dict[str, Any]:
    return json.loads((TRANSCRIPT_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _metadata_arg(args: list[str]) -> dict[str, Any]:
    return json.loads(args[args.index("--metadata") + 1])


class SequenceRunner:
    """Answers each recorded argument list in order. It fails on any other call."""

    def __init__(self, steps: list[dict[str, Any]]) -> None:
        self.steps = steps
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        step = self.steps[len(self.calls) - 1]
        assert list(args) == step["args"], f"unexpected bd call: {args}"
        if step.get("exit", 0) != 0:
            from tracker_port.bd_runner import BdError

            raise BdError("bd failed", step["exit"], step["stderr"])
        return step["stdout"]


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


def test_create_pr_carries_external_ref() -> None:
    body = _load("create_pr")
    args = body["args"]
    assert args[args.index("--external-ref") + 1] == "gh-101"
    assert _metadata_arg(args)["cb"]["kind"] == "pr"
    assert body["stdout"] == "t-4zf\n"


def test_set_state_closes_the_slice() -> None:
    body = _load("set_state")
    assert body["args"] == ["update", "t-anc.1.1", "--status", "closed"]
    assert body["stdout"].startswith("✓ Updated issue: t-anc.1.1")


def test_set_state_score_writes_the_whole_cb_block() -> None:
    # --set-metadata on a dotted key stores a flat "cb.envelope.score" key.
    # The write must send the full cb block through --metadata instead.
    body = _load("set_state_score")
    args = body["args"]
    assert "--set-metadata" not in args
    metadata = _metadata_arg(args)
    assert metadata["cb"]["envelope"]["score"] == 0.8
    assert not any("." in key for key in metadata)


def test_claim_update_sends_in_progress_and_assignee() -> None:
    body = _load("claim_slice")
    assert body["args"] == [
        "update",
        "t-anc.1.3",
        "--status",
        "in_progress",
        "--assignee",
        "agent-x",
    ]


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


def test_claim_slice_maps_cb_id_then_reads_back_the_claimant() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = SequenceRunner(_steps("claim_slice_steps"))
    record = BeadsAdapter(runner).claim_slice("demo-E1-s3", "agent-x")

    assert record.assignee == "agent-x"
    assert [call[0] for call in runner.calls] == ["list", "update", "show"]


def test_claim_slice_raises_when_read_back_shows_another_claimant() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = _steps("claim_slice_steps")
    steps[2]["stdout"] = steps[2]["stdout"].replace('"agent-x"', '"agent-y"')
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

    runner = SequenceRunner(_steps("set_slice_state_steps"))
    BeadsAdapter(runner).set_slice_state("demo-E1-s2", "closed", score=0.8)

    assert len(runner.calls) == 2



def test_shown_slice_round_trips_its_cb_envelope() -> None:
    created = _metadata_arg(_create_args("create_slice"))["cb"]
    shown = json.loads(_load("show_slice")["stdout"])[0]["metadata"]["cb"]
    assert shown["id"] == created["id"] == "demo-E1-s1"
    assert shown["kind"] == "slice"
    assert shown["envelope"]["score"] == 0.92


def test_open_pull_request_replays_the_recorded_argv() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = _steps("open_pull_request_steps")
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

    runner = SequenceRunner(_steps("round_trip_steps"))
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
    assert len(runner.calls) == 6


def test_create_record_program_replays_recorded_argv() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    steps = _steps("create_program")
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

    steps = _steps("create_epic")
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

    steps = _steps("create_slice")
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

    runner = SequenceRunner(_steps("create_slice"))
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
