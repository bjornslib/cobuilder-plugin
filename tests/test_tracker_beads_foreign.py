"""The beads adapter ignores bd issues that carry no metadata.cb block (foreign issues).

A foreign issue never appears in a read, never raises, and is never modified. A bd issue with a cb
block but an unknown cb.v or kind still raises. The replay tests use foreign_issue.json, a transcript
from real bd 1.3.0. Seed, doctor, and real-bd tests sit in the test_tracker_beads_foreign_*.py files.

Run with: uv run pytest tests/test_tracker_beads_foreign.py -q
"""
from __future__ import annotations

import copy

import pytest

import _beads_ready_support as ready
import _beads_support as support

FOREIGN_TITLE = "Foreign task made by another tool"
ADAPTER_ID = "demo/1"
TRANSCRIPT = "foreign_issue"


def test_foreign_transcript_records_bd_1_3_0_with_one_foreign_and_one_adapter_issue() -> None:
    body = support.load_transcript(TRANSCRIPT)
    assert body["bd"].startswith("bd version 1.3.0")
    rows = support.foreign_rows_all()
    assert len(rows) == 2
    assert len(support.foreign_only_rows()) == 1
    assert support.foreign_only_rows()[0]["title"] == FOREIGN_TITLE
    assert [row for row in rows if "cb" in (row.get("metadata") or {})][0]["metadata"]["cb"]["id"] == ADAPTER_ID


def test_every_read_skips_the_foreign_issue_and_returns_the_cb_record() -> None:
    # bd gives the ready slice, and the list read maps its bd id to the cb record. The foreign task has no label cb.
    adapter, _ = ready.adapter_over(support.foreign_rows_all(), ["demo-6gh"])

    assert [r.id for r in adapter.list_slices()] == [ADAPTER_ID]
    assert adapter.list_programs() == []
    assert adapter.list_epics() == []
    assert adapter.list_pull_requests() == []
    assert adapter.get_slice(ADAPTER_ID).id == ADAPTER_ID
    assert [r.id for r in adapter.next_ready("slice")] == [ADAPTER_ID]


def test_reads_over_only_foreign_issues_return_nothing_and_do_not_raise() -> None:
    adapter, _ = ready.adapter_over(support.foreign_only_rows(), [])

    assert adapter.list_programs() == []
    assert adapter.list_epics() == []
    assert adapter.list_slices() == []
    assert adapter.list_pull_requests() == []
    assert adapter.next_ready("slice") == []


def test_get_slice_of_a_foreign_title_raises_not_found() -> None:
    from tracker_port.port import ArgumentError

    adapter, _ = support.list_adapter(support.foreign_rows_all())

    with pytest.raises(ArgumentError, match="no slice with id"):
        adapter.get_slice(FOREIGN_TITLE)


def test_write_by_the_title_of_a_foreign_issue_raises_not_found_and_sends_no_write() -> None:
    from tracker_port.port import ArgumentError

    adapter, runner = support.list_adapter(support.foreign_rows_all())

    with pytest.raises(ArgumentError, match=f"no record with id {FOREIGN_TITLE}"):
        adapter.set_slice_state(FOREIGN_TITLE, "closed")
    with pytest.raises(ArgumentError, match=f"no record with id {FOREIGN_TITLE}"):
        adapter.add_note(FOREIGN_TITLE, "a note")
    with pytest.raises(ArgumentError, match=f"no record with id {FOREIGN_TITLE}"):
        adapter.claim_slice(FOREIGN_TITLE, "agent-x")

    assert all(call[0] == "list" for call in runner.calls), runner.calls


def test_a_cb_block_with_an_unknown_version_still_raises_next_to_a_foreign_issue() -> None:
    from tracker_port.port import AdapterError

    rows = copy.deepcopy(support.foreign_rows_all())
    next(row for row in rows if "cb" in (row.get("metadata") or {}))["metadata"]["cb"]["v"] = 2
    adapter, _ = support.list_adapter(rows)

    with pytest.raises(AdapterError, match="metadata.cb.v"):
        adapter.list_slices()


def test_a_cb_block_with_an_unknown_kind_still_raises_next_to_a_foreign_issue() -> None:
    from tracker_port.port import AdapterError

    rows = copy.deepcopy(support.foreign_rows_all())
    next(row for row in rows if "cb" in (row.get("metadata") or {}))["metadata"]["cb"]["kind"] = "story"
    adapter, _ = support.list_adapter(rows)

    with pytest.raises(AdapterError, match="unknown metadata.cb.kind"):
        adapter.list_programs()
