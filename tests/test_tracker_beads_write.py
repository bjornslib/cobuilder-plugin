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


def test_create_program_sends_program_type_and_cb_kind() -> None:
    body = _load("create_program")
    args = body["args"]
    assert args[args.index("--type") + 1] == "program"
    assert _metadata_arg(args)["cb"]["kind"] == "program"
    assert body["stdout"] == "t-anc\n"


def test_create_epic_is_a_child_blocked_by_its_pr() -> None:
    body = _load("create_epic")
    args = body["args"]
    assert args[args.index("--parent") + 1] == "t-anc"
    assert args[args.index("--deps") + 1] == "blocked-by:t-4zf"
    assert _metadata_arg(args)["cb"]["kind"] == "epic"
    assert body["stdout"] == "t-anc.1\n"


def test_create_slice_is_a_child_of_its_epic() -> None:
    body = _load("create_slice")
    args = body["args"]
    assert args[args.index("--parent") + 1] == "t-anc.1"
    assert _metadata_arg(args)["cb"]["kind"] == "slice"
    assert body["stdout"] == "t-anc.1.1\n"


def test_create_pr_carries_external_ref() -> None:
    body = _load("create_pr")
    args = body["args"]
    assert args[args.index("--external-ref") + 1] == "PR#101"
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
    created = _metadata_arg(_load("create_slice")["args"])["cb"]
    shown = json.loads(_load("show_slice")["stdout"])[0]["metadata"]["cb"]
    assert shown["id"] == created["id"] == "demo-E1-s1"
    assert shown["kind"] == "slice"
    assert shown["envelope"]["score"] == 0.92
