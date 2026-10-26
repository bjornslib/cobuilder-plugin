"""Decision 1A at the port: `skip_slice(id, reason, outcome='skipped')` closes the slice with an outcome.

The contract cases run on the fake adapter and on real bd in a scratch tracker. The replay cases
count the bd calls of the beads adapter.

Run with: uv run pytest tests/test_tracker_skip_slice.py -q
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

import pytest

import _skip_slice_support as skip
from _tracker_contract_support import assert_same_value

pytest_plugins = ["_tracker_contract_support"]


def test_skip_closes_with_outcome_and_keeps_the_rest(adapter: Any) -> None:
    adapter.record_attempt("demo-E1-s2", 0.4)

    returned = adapter.skip_slice("demo-E1-s2", "delayed by the engineer")

    for record in (returned, adapter.get_slice("demo-E1-s2")):
        assert record.lifecycle == "closed"
        assert record.assignee == "agent-1"
        assert record.envelope["outcome"] == "skipped"
        assert record.envelope["reason"] == "delayed by the engineer"
        assert_same_value(record.envelope["score"], 0.4, "score")
        assert_same_value(record.envelope["attempts"], 1, "attempts")


def test_escalated_outcome_is_stored(adapter: Any) -> None:
    adapter.skip_slice("demo-E1-s3", "attempt limit reached", outcome="escalated")

    envelope = adapter.get_slice("demo-E1-s3").envelope
    assert (envelope["outcome"], envelope["reason"]) == ("escalated", "attempt limit reached")


def test_skipping_a_closed_slice_again_is_idempotent(adapter: Any) -> None:
    first = adapter.skip_slice("demo-E1-s3", "later")

    again = adapter.skip_slice("demo-E1-s3", "later")

    assert again == first
    assert adapter.get_slice("demo-E1-s3") == first


def test_skip_unknown_id_raises_argument_error(adapter: Any) -> None:
    from tracker_port.port import ArgumentError

    with pytest.raises(ArgumentError):
        adapter.skip_slice("demo-E1-s99", "no such slice")


def test_skip_unblocks_the_next_slice_of_a_chain(build: Callable[[Path], Any], corpus: Path) -> None:
    skip.chain_corpus(corpus)
    adapter = build(corpus)
    assert skip.ready_ids(adapter) == ["demo-E1-s1"]

    adapter.skip_slice("demo-E1-s1", "delayed")

    assert skip.ready_ids(adapter) == ["demo-E1-s2"]


def test_the_port_refuses_an_empty_reason_or_a_bad_outcome(corpus: Path) -> None:
    from tracker_port.fake import FakeAdapter
    from tracker_port.port import ArgumentError

    adapter = FakeAdapter(corpus)
    for reason, outcome in (("", "skipped"), ("  ", "skipped"), ("later", "done")):
        with pytest.raises(ArgumentError):
            adapter.skip_slice("demo-E1-s3", reason, outcome=outcome)
    assert adapter.get_slice("demo-E1-s3").lifecycle == "open"


def test_beads_skip_closes_with_force_and_syncs_once() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = skip.LenientRunner()
    record = BeadsAdapter(runner).skip_slice("demo-E1-s3", "delayed")

    calls = list(runner.calls)
    closes = [call for call in calls if call[0] == "close"]
    assert len(closes) == 1 and "--force" in closes[0]
    assert runner.verbs().count("sync") == 1
    assert record.lifecycle == "closed"
    assert record.envelope["outcome"] == "skipped" and record.envelope["reason"] == "delayed"
    assert support_metadata_has_outcome(calls)


def support_metadata_has_outcome(calls: list[list[str]]) -> bool:
    # The cb block that bd stores carries the outcome and the reason, whichever verb writes it.
    import json

    for call in calls:
        if "--metadata" in call:
            envelope = json.loads(call[call.index("--metadata") + 1])["cb"]["envelope"]
            if envelope.get("outcome") == "skipped" and envelope.get("reason") == "delayed":
                return True
    return False


def test_beads_skip_of_a_closed_slice_with_same_outcome_and_reason_writes_and_syncs_nothing() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = skip.LenientRunner(lambda rows: skip.mark_skipped(rows, "demo-E1-s1", "skipped", "delayed"))

    record = BeadsAdapter(runner).skip_slice("demo-E1-s1", "delayed")

    assert record.lifecycle == "closed" and record.envelope["outcome"] == "skipped"
    assert set(runner.verbs()) <= {"list", "show"}, runner.calls


def test_beads_skip_of_an_unknown_id_writes_nothing() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    runner = skip.LenientRunner()
    with pytest.raises(ArgumentError):
        BeadsAdapter(runner).skip_slice("demo-E1-s99", "delayed")
    assert set(runner.verbs()) <= {"list", "show"}, runner.calls
