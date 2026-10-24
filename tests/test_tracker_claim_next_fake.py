"""Slice 28 (E7-6): the fake adapter follows the same `claim_next` rule as beads, the files adapter refuses it,
and the port names the operation.

The rule on the fake: take the first ready slice in id order of `next_ready("slice", under)`, set its assignee
to the claimant and its lifecycle to `in_progress`, and set its epic to `in_progress` when that epic is `open`.
The parity corpus (corpus-ready) has the ready slices alt-E1-s1 (epic in_progress) and demo-E1-s3 (epic open).
The fake file order puts demo-E1-s3 first, so a test of the id order tells a sorted pick from a file-order pick.

Run with: uv run pytest tests/test_tracker_claim_next_fake.py -q
"""
from __future__ import annotations

import inspect
from pathlib import Path
from typing import Any

import pytest

import _beads_ready_support as r
import _claim_next_support as c
import _tracker_port_support as support
from _beads_mapping_support import need


def _fake(corpus: Path | None = None) -> Any:
    from tracker_port.fake import FakeAdapter

    return FakeAdapter(corpus or r.PARITY_CORPUS)


def _lifecycles(adapter: Any) -> dict[str, str]:
    return {record.id: record.lifecycle for record in adapter.list_epics()}


def test_the_port_names_the_operation_with_the_pinned_signature() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter
    from tracker_port.port import TrackerPort

    for owner in (TrackerPort, FakeAdapter, BeadsAdapter):
        parameters = inspect.signature(need(owner, "claim_next")).parameters
        assert list(parameters) == ["self", "claimant", "under"], owner.__name__
        assert parameters["under"].default is None, owner.__name__
    assert hasattr(FilesAdapter, "claim_next")


def test_the_pick_is_the_first_ready_slice_in_id_order_and_the_record_holds_the_claim() -> None:
    adapter = _fake()
    expected = sorted(record.id for record in adapter.next_ready("slice"))[0]

    record = need(adapter, "claim_next")("agent-x")

    assert expected == "alt-E1-s1"
    assert (record.id, record.kind, record.lifecycle, record.assignee) == (expected, "slice", "in_progress", "agent-x")
    assert adapter.get_slice(expected) == record
    assert expected not in [slice_.id for slice_ in adapter.next_ready("slice")]


def test_an_open_epic_starts_and_leaves_the_epic_ready_list() -> None:
    adapter = _fake()
    assert _lifecycles(adapter)["demo-E1"] == "open"

    record = need(adapter, "claim_next")("agent-x", under="demo")

    assert record.id == "demo-E1-s3"
    assert _lifecycles(adapter)["demo-E1"] == "in_progress"
    assert "demo-E1" not in [epic.id for epic in adapter.next_ready("epic")]


def test_an_epic_in_progress_stays_so_and_a_closed_epic_stays_closed() -> None:
    adapter = _fake()
    need(adapter, "claim_next")("agent-x", under="alt")
    assert _lifecycles(adapter)["alt-E1"] == "in_progress"

    adapter.set_epic_state("demo-E1", "closed")
    record = need(adapter, "claim_next")("agent-y", under="demo")

    assert record.id == "demo-E1-s3"
    assert _lifecycles(adapter)["demo-E1"] == "closed"


def test_two_calls_walk_the_frontier_and_the_call_after_the_last_ready_slice_gives_none() -> None:
    adapter = _fake()
    claim = need(adapter, "claim_next")
    first, second, third = claim("a"), claim("b"), claim("c")

    assert (first.id, second.id, third) == ("alt-E1-s1", "demo-E1-s3", None)


def test_nothing_ready_under_the_scope_gives_none_and_changes_no_record() -> None:
    adapter = _fake()
    before = support.all_records(adapter)

    assert need(adapter, "claim_next")("agent-x", under="demo-E2") is None

    assert support.all_records(adapter) == before


@pytest.mark.parametrize("under", ["no-such-id", "demo-E1-s3", "pr-101"])
def test_under_that_names_no_record_a_slice_or_a_pull_request_raises_argument_error_and_changes_nothing(under: str) -> None:
    from tracker_port.port import ArgumentError

    adapter = _fake()
    before = support.all_records(adapter)

    with pytest.raises(ArgumentError):
        need(adapter, "claim_next")("agent-x", under=under)

    assert support.all_records(adapter) == before


def test_eight_calls_give_eight_different_slices_in_id_order_and_the_ninth_gives_none(tmp_path: Path) -> None:
    adapter = _fake(c.write_corpus(tmp_path, slices=8))
    claim = need(adapter, "claim_next")

    got = [claim(f"worker-{n}") for n in range(8)]

    assert [record.id for record in got] == [f"demo-E1-s{n}" for n in range(1, 9)]
    assert len({record.id for record in got}) == 8
    assert [record.assignee for record in got] == [f"worker-{n}" for n in range(8)]
    assert claim("worker-8") is None


def test_the_files_adapter_refuses_the_operation_like_every_other_write(tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter
    from tracker_port.port import NoAdapterError

    with pytest.raises(NoAdapterError):
        need(FilesAdapter(tmp_path), "claim_next")("agent-x", under="demo")
