"""Contract cases for the tracker port: write effects, the seed dry run, and case 7.

Run with: uv run pytest tests/test_tracker_contract_writes.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _tracker_port_support as support
from _tracker_contract_support import CORPUS_DIR, READ_ADAPTER_BUILDERS, assert_same_value, ids

# The module holds the corpus, build, and adapter fixtures.
pytest_plugins = ["_tracker_contract_support"]


# Write effects that the fake adapter must keep for the other cases.
def test_set_program_stage_writes_envelope(adapter: Any) -> None:
    adapter.set_program_stage("demo", "build")

    assert adapter.list_programs()[0].envelope["stage"] == "build"


def test_set_epic_state_writes_lifecycle(adapter: Any) -> None:
    adapter.set_epic_state("demo-E1", "closed")

    assert {r.id: r.lifecycle for r in adapter.list_epics()}["demo-E1"] == "closed"


def test_set_slice_state_writes_lifecycle_and_score(adapter: Any) -> None:
    adapter.set_slice_state("demo-E1-s2", "closed", score=0.8)

    slice_record = adapter.get_slice("demo-E1-s2")
    assert slice_record.lifecycle == "closed"
    assert_same_value(slice_record.envelope["score"], 0.8, "score")


def test_record_attempt_writes_score_and_count(adapter: Any) -> None:
    adapter.record_attempt("demo-E1-s3", 0.6)

    slice_record = adapter.get_slice("demo-E1-s3")
    assert_same_value(slice_record.envelope["score"], 0.6, "score")
    assert_same_value(slice_record.envelope["attempts"], 1, "attempts")


def test_escalate_sets_flag(adapter: Any) -> None:
    adapter.escalate("demo-E1-s3", 0.4, "attempt limit reached")

    assert adapter.get_slice("demo-E1-s3").envelope["escalated"] is True


def test_add_note_keeps_record_fields(adapter: Any) -> None:
    before = adapter.get_slice("demo-E1-s3")

    adapter.add_note("demo-E1-s3", "a note")

    after = adapter.get_slice("demo-E1-s3")
    assert (after.lifecycle, after.assignee, dict(after.envelope)) == (
        before.lifecycle,
        before.assignee,
        dict(before.envelope),
    )


def test_sync_keeps_ready_list(adapter: Any) -> None:
    before = ids(adapter.next_ready("slice"))

    adapter.sync()

    assert ids(adapter.next_ready("slice")) == before


def test_capabilities_reports_four_flags(adapter: Any) -> None:
    caps = adapter.capabilities

    for flag in ("native_ready", "atomic_claim", "rich_envelope", "offline_read"):
        assert isinstance(getattr(caps, flag), bool), flag


def test_seed_dry_run_returns_creates_and_writes_nothing() -> None:
    from tracker_port.fake import FakeAdapter

    plans_dir = Path(__file__).resolve().parent / "fixtures" / "tracker" / "plans"
    adapter = FakeAdapter(CORPUS_DIR)
    before = ids(adapter.list_programs()) + ids(adapter.list_epics()) + ids(adapter.list_slices())
    dry = ids(adapter.seed_from_files(plans_dir, dry_run=True))
    assert dry, "the dry run returns the records it would create"
    after_dry = ids(adapter.list_programs()) + ids(adapter.list_epics()) + ids(adapter.list_slices())
    assert after_dry == before, "a dry run writes nothing"
    created = ids(adapter.seed_from_files(plans_dir))
    assert created == dry, "the real call creates the records the dry run named"


# Case 7: every read adapter projects the same index as the golden file. Beads replays bd output.
@pytest.mark.parametrize("adapter_id", list(READ_ADAPTER_BUILDERS))
def test_contract_case_7_projector_parity(adapter_id: str) -> None:
    from tracker_port.projector import project

    adapter = READ_ADAPTER_BUILDERS[adapter_id](CORPUS_DIR)
    records = support.all_records(adapter)
    expected = json.loads(support.EXPECTED_INDEX.read_text(encoding="utf-8"))

    assert project(records) == expected
