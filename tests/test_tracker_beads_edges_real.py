"""Slice 25 (E7-3): the seed on real bd 1.3.0 in a scratch tracker gives the frontier that the projector gives.

One test seeds the pair plan (two epics, three slices) and walks the frontier by closing slices and then epic E1.
One test checks the native edges of the rows and that a second seed adds none. One test checks that a deferred
epic hides its slices and that a closed or in_progress epic gets no defer date. Each test needs bd and fails without it.

Run with: uv run pytest tests/test_tracker_beads_edges_real.py -q -m ''
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _beads_edges_support as e
import _beads_mapping_support as m
import _beads_support as support
import _inprogress_support as ip

pytestmark = pytest.mark.slow
DATE = "2099-12-31"
READY = ["ready", "-t", "task", "--label", "cb", "--json", "--limit", "0"]


def _adapter(root: Path) -> Any:
    support.require_bd()
    return ip.beads_adapter(root)


def _rows(adapter: Any) -> dict[str, dict[str, Any]]:
    rows = json.loads(adapter.runner.run(["list", "--json", "--all", "--limit", "0"]))
    return {row["metadata"]["cb"]["id"]: row for row in rows if "cb" in (row.get("metadata") or {})}


def _bd_frontier(adapter: Any) -> set[str]:
    return {row["external_ref"] for row in json.loads(adapter.runner.run(READY))}


def _projector_frontier(adapter: Any) -> set[str]:
    return e.projector_frontier(support.all_records(adapter))


def test_a_live_seed_gives_the_projector_frontier_and_closing_walks_it_in_order(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    adapter.seed_from_files(e.PAIR)

    assert _bd_frontier(adapter) == {"pair/1"}
    assert _bd_frontier(adapter) == _projector_frontier(adapter)
    steps = [("pair/1", {"pair/2"}), ("pair/2", set())]
    for closed, frontier in steps:
        adapter.set_slice_state(closed, "closed")
        assert _bd_frontier(adapter) == frontier, closed
        assert _bd_frontier(adapter) == _projector_frontier(adapter), closed
    assert "pair/3" not in _bd_frontier(adapter), "the slices of E2 wait while E1 is open, even with its slices closed"

    adapter.set_epic_state("pair/E1", "closed")
    assert _bd_frontier(adapter) == {"pair/3"}
    assert _bd_frontier(adapter) == _projector_frontier(adapter)
    assert [r.id for r in adapter.next_ready("epic")] == ["pair/E2"]


def test_the_rows_hold_the_native_parent_and_blocks_edges_once_and_a_second_seed_adds_none(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    adapter.seed_from_files(e.PAIR)
    rows = _rows(adapter)
    bd_id = {cb_id: row["id"] for cb_id, row in rows.items()}

    expected = {"pair/E2": ["pair/E1"], "pair/2": ["pair/1"]}
    for cb_id, row in rows.items():
        blocks = [d["depends_on_id"] for d in row.get("dependencies") or [] if d["type"] == "blocks"]
        assert blocks == [bd_id[b] for b in expected.get(cb_id, [])], cb_id
    assert {cb_id: row.get("parent") for cb_id, row in rows.items()} == {
        "pair": None, "pair/E1": bd_id["pair"], "pair/E2": bd_id["pair"],
        "pair/1": bd_id["pair/E1"], "pair/2": bd_id["pair/E1"], "pair/3": bd_id["pair/E2"],
    }

    assert adapter.seed_from_files(e.PAIR) == []
    assert _rows(adapter) == rows
    records = m.records_by_id(adapter)
    assert records["pair/E2"].blocked_by == ("pair/E1",) and records["pair/E1"].blocked_by == ()


def test_a_deferred_epic_hides_its_slices_and_a_closed_or_in_progress_epic_gets_no_defer_date(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    adapter.create_record(m.create_record_of("program"))
    for number, lifecycle, deferred in ((1, "open", True), (2, "in_progress", True), (3, "closed", True), (4, "open", False)):
        envelope = {"epic_id": f"E{number}", **({"deferred": DATE} if deferred else {})}
        epic = m.create_record_of("epic", id=f"mapdemo/E{number}", external_ref=f"mapdemo/E{number}", lifecycle=lifecycle, envelope=envelope)
        adapter.create_record(epic)
        slice_ = m.create_record_of("slice", id=f"mapdemo/{number}", external_ref=f"mapdemo/{number}", parent=epic.id)
        adapter.create_record(slice_)

    rows = _rows(adapter)
    # bd stores the date as a local-time instant, so the UTC day may be the day before.
    assert str(rows["mapdemo/E1"].get("defer_until", "")).startswith(DATE[:-1]), rows["mapdemo/E1"]
    for cb_id in ("mapdemo/E2", "mapdemo/E3", "mapdemo/E4"):
        assert not rows[cb_id].get("defer_until"), cb_id
    ready = _bd_frontier(adapter)
    assert "mapdemo/1" not in ready, "the slice of the deferred epic stays out of bd ready"
    assert {"mapdemo/2", "mapdemo/4"} <= ready
