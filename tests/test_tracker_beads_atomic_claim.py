"""E5-2: the beads claim is one `bd update <id> --claim --actor <claimant>` call, with no read-back.

Replays the real bd 1.3.0 run in transcripts/claim_actor_steps.json. The real-bd race
sits in test_tracker_beads_claim_real.py.

Run with: uv run pytest tests/test_tracker_beads_atomic_claim.py -q
"""
from __future__ import annotations

from typing import Any

import pytest

import _beads_support as support

RECORDED = support.load_transcript("claim_actor_steps")
IDS = RECORDED["ids"]


def _step(name: str) -> dict[str, Any]:
    return dict(RECORDED[name])


def _adapter(*names: str, sync: bool = True) -> tuple[Any, Any]:
    from tracker_port.beads import BeadsAdapter

    steps = [_step(name) for name in names]
    if sync:
        steps.append(dict(support.load_transcript("sync_ok")))
    runner = support.SequenceRunner(steps)
    return BeadsAdapter(runner), runner


def test_claim_argv_is_update_claim_with_the_actor_flag() -> None:
    from tracker_port.bd_runner import claim_argv

    assert claim_argv("t-3gx", "agent-x") == ["update", "t-3gx", "--claim", "--actor", "agent-x"]


def test_claim_argv_never_carries_if_assignee_or_status_flags() -> None:
    from tracker_port.bd_runner import claim_argv

    argv = claim_argv("t-3gx", "agent-x")

    assert not {"--if-assignee", "--if-status", "--status", "--assignee"} & set(argv)


def test_claim_writes_once_then_syncs_with_no_read_back() -> None:
    adapter, runner = _adapter("list_before", "claim_ok")

    adapter.claim_slice("demo-E1-s3", "agent-x")

    assert [call[0] for call in runner.calls] == ["list", "update", "sync"]
    assert runner.calls[1] == ["update", IDS["demo-E1-s3"], "--claim", "--actor", "agent-x"]


def test_claim_returns_the_claimant_as_assignee_and_in_progress() -> None:
    adapter, _runner = _adapter("list_before", "claim_ok")

    record = adapter.claim_slice("demo-E1-s3", "agent-x")

    assert record.id == "demo-E1-s3"
    assert record.assignee == "agent-x"
    assert record.lifecycle == "in_progress"


def test_claim_with_sync_off_makes_no_sync_call() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.SequenceRunner([_step("list_before"), _step("claim_ok")])
    BeadsAdapter(runner, sync="off").claim_slice("demo-E1-s3", "agent-x")

    assert [call[0] for call in runner.calls] == ["list", "update"]


def test_same_claimant_claiming_again_is_one_idempotent_write() -> None:
    # The port contract (case 3) asks only for the claimant in assignee. bd exits 0 for a repeat.
    adapter, runner = _adapter("list_after", "claim_again")

    record = adapter.claim_slice("demo-E1-s3", "agent-x")

    assert record.assignee == "agent-x"
    assert [call[0] for call in runner.calls] == ["list", "update", "sync"]


def test_held_claim_raises_adapter_error_naming_the_holder_and_writes_nothing_else() -> None:
    from tracker_port.port import AdapterError

    adapter, runner = _adapter("list_before", "claim_held", sync=False)

    with pytest.raises(AdapterError, match="agent-1"):
        adapter.claim_slice("demo-E1-s2", "agent-y")

    assert [call[0] for call in runner.calls] == ["list", "update"]


def test_closed_target_raises_adapter_error_after_one_refused_write() -> None:
    from tracker_port.port import AdapterError

    adapter, runner = _adapter("list_before", "claim_closed", sync=False)

    with pytest.raises(AdapterError, match="not claimable"):
        adapter.claim_slice("demo-E1-s1", "agent-x")

    assert [call[0] for call in runner.calls] == ["list", "update"]


def test_missing_target_raises_argument_error_like_the_fake_and_calls_only_list() -> None:
    from tracker_port.port import ArgumentError

    adapter, runner = _adapter("list_before", sync=False)

    with pytest.raises(ArgumentError):
        adapter.claim_slice("demo-E1-s99", "agent-x")

    assert [call[0] for call in runner.calls] == ["list"]


def test_atomic_claim_flag_is_true_for_beads_and_false_for_files() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.files import FilesAdapter

    assert BeadsAdapter.capabilities.atomic_claim is True
    assert FilesAdapter.capabilities.atomic_claim is False


def test_doctor_shows_atomic_claim_true_for_beads() -> None:
    from tracker_port.cli_operations import _doctor

    adapter, _runner = _adapter("list_before", sync=False)
    report = _doctor(adapter, None)

    assert report["adapter"] == "beads"
    assert report["capabilities"].atomic_claim is True
