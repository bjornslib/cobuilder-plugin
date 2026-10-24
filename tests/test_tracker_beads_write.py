"""Slice 7 of E2: beads create and claim replay recorded bd transcripts.

The transcripts under fixtures/tracker/beads/transcripts/ hold real bd 1.3.0
output. Each write must send the recorded argument list and return the
recorded stdout. A claim must read back the assignee, and a claim that bd
refuses must raise AdapterError. The slice claim, the sync, and the create_record
tests sit in test_tracker_beads_claim.py and test_tracker_beads_create_record.py.
"""
from __future__ import annotations

import json

import _beads_support as support
from _beads_support import BEADS_DIR

TRANSCRIPT_DIR = BEADS_DIR / "transcripts"
BD_VERSION_PREFIX = "bd version 1.3.0"


def _create_args(name: str) -> list[str]:
    return next(step["args"] for step in support.steps(name) if step["args"][0] == "create")


def test_transcripts_record_bd_1_3_0() -> None:
    for path in sorted(TRANSCRIPT_DIR.glob("*.json")):
        body = json.loads(path.read_text(encoding="utf-8"))
        assert body["bd"].startswith(BD_VERSION_PREFIX), path.name


def test_create_program_sends_the_native_feature_type_the_cb_label_and_cb_kind() -> None:
    args = _create_args("create_program")
    assert args[args.index("--type") + 1] == "feature"
    assert args[args.index("--labels") + 1] == "cb"
    assert support.metadata_arg(args)["cb"]["kind"] == "program"
    assert support.steps("create_program")[0]["stdout"] == "demo-b64\n"


def test_create_epic_is_a_child_blocked_by_its_pr() -> None:
    steps = support.steps("create_epic")
    args = _create_args("create_epic")
    assert args[args.index("--parent") + 1] == "demo-b64"
    assert args[args.index("--type") + 1] == "epic"
    assert support.metadata_arg(args)["cb"]["kind"] == "epic"
    assert steps[1]["stdout"] == "demo-b64.1\n"
    assert steps[2]["args"] == ["dep", "add", "demo-b64.1", "demo-uwu"]


def test_create_slice_is_a_child_of_its_epic() -> None:
    args = _create_args("create_slice")
    assert args[args.index("--parent") + 1] == "demo-b64.1"
    assert args[args.index("--type") + 1] == "task"
    assert support.metadata_arg(args)["cb"]["kind"] == "slice"
    assert support.steps("create_slice")[1]["stdout"] == "demo-b64.1.1\n"


def test_set_state_score_writes_the_whole_cb_block() -> None:
    # --set-metadata on a dotted key stores a flat "cb.envelope.score" key.
    # The write must send the full cb block through --metadata instead.
    body = support.load_transcript("set_state_score")
    args = body["args"]
    assert "--set-metadata" not in args
    metadata = support.metadata_arg(args)
    assert metadata["cb"]["envelope"]["score"] == 0.8
    assert not any("." in key for key in metadata)


def test_claim_read_back_shows_the_claimant() -> None:
    row = json.loads(support.load_transcript("claim_slice_show")["stdout"])[0]
    assert row["status"] == "in_progress"
    assert row["assignee"] == "agent-x"


def test_claim_race_is_refused_by_bd() -> None:
    body = support.load_transcript("claim_slice_race")
    assert body["exit"] == 1
    assert body["stdout"] == ""
    assert 'held by "agent-x"' in body["stderr"]


def test_shown_slice_round_trips_its_cb_envelope() -> None:
    created = support.metadata_arg(_create_args("create_slice"))["cb"]
    shown = json.loads(support.load_transcript("show_slice")["stdout"])[0]["metadata"]["cb"]
    assert shown["id"] == created["id"] == "demo-E1-s1"
    assert shown["kind"] == "slice"
    assert shown["envelope"]["score"] == 0.92
