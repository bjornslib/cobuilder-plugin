"""Slice 25 (E7-3): the projector and both adapters carry the epic blocked_by, and an epic is ready only after the epic before it closes.

The fake adapter starts from an empty corpus and seeds tests/fixtures/tracker/plans-edges/pair.
The beads adapter reads the rows that `EdgeRunner` keeps. No bd is needed.

Run with: uv run pytest tests/test_tracker_beads_edges_ready.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import _beads_edges_support as e
import _beads_support as support

EPIC_JOINS = [["pair/E2", "pair/E1", "blocked_by"]]


def _fake(tmp_path: Path):
    from tracker_port.fake import FakeAdapter
    from tracker_port.fake_support import CORPUS_FILES

    for name in CORPUS_FILES:
        (tmp_path / name).write_text("[]", encoding="utf-8")
    adapter = FakeAdapter(tmp_path)
    adapter.seed_from_files(e.PAIR)
    return adapter


def _beads():
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(e.seed(e.PAIR))


def _ids(records) -> list[str]:
    return [record.id for record in records]


def test_the_projector_emits_the_epic_blocked_by_entity_and_join() -> None:
    from tracker_port.projector import project

    index = project(list(e.files_records(e.PAIR).values()))

    assert index["entities"]["pair/E2"]["blocked_by"] == ["pair/E1"]
    assert index["entities"]["pair/E1"]["blocked_by"] == []
    assert [j for j in index["joins"] if j[2] == "blocked_by" and "/E" in j[0]] == EPIC_JOINS


def test_the_golden_corpus_index_holds_the_epic_to_epic_joins() -> None:
    index = json.loads((support.FIXTURE_DIR / "expected-index.json").read_text(encoding="utf-8"))

    epics = {i for i, entity in index["entities"].items() if entity["kind"] == "epic"}
    epic_joins = [j for j in index["joins"] if j[2] == "blocked_by" and j[0] in epics and j[1] in epics]
    assert epic_joins == [["demo-E2", "demo-E1", "blocked_by"], ["demo-E3", "demo-E2", "blocked_by"]]


def test_the_fake_holds_the_epic_blocked_by_after_a_seed(tmp_path: Path) -> None:
    epics = {r.id: r for r in _fake(tmp_path).list_epics()}

    assert epics["pair/E2"].blocked_by == ("pair/E1",) and epics["pair/E1"].blocked_by == ()


def test_the_fake_returns_an_epic_only_when_the_epic_before_it_is_closed(tmp_path: Path) -> None:
    adapter = _fake(tmp_path)
    assert _ids(adapter.next_ready("epic")) == ["pair/E1"]

    adapter.set_epic_state("pair/E1", "in_progress")
    assert _ids(adapter.next_ready("epic")) == []

    adapter.set_epic_state("pair/E1", "closed")
    assert _ids(adapter.next_ready("epic")) == ["pair/E2"]


def test_the_beads_adapter_returns_an_epic_only_when_the_epic_before_it_is_closed() -> None:
    adapter = _beads()
    assert _ids(adapter.next_ready("epic")) == ["pair/E1"]

    adapter.set_epic_state("pair/E1", "in_progress")
    assert _ids(adapter.next_ready("epic")) == []

    adapter.set_epic_state("pair/E1", "closed")
    assert _ids(adapter.next_ready("epic")) == ["pair/E2"]


def test_the_projector_frontier_shows_only_the_first_slice_and_walks_in_order() -> None:
    from dataclasses import replace

    records = {r.id: r for r in e.files_records(e.PAIR).values()}
    assert e.projector_frontier(list(records.values())) == {"pair/1"}

    for closed, frontier in (("pair/1", {"pair/2"}), ("pair/2", set())):
        records[closed] = replace(records[closed], lifecycle="closed")
        assert e.projector_frontier(list(records.values())) == frontier, closed
    records["pair/E1"] = replace(records["pair/E1"], lifecycle="closed")
    assert e.projector_frontier(list(records.values())) == {"pair/3"}


def test_a_deferred_epic_hides_its_slices_from_the_projector_frontier() -> None:
    from dataclasses import replace

    records = {r.id: r for r in e.files_records(e.PAIR).values()}
    records["pair/E1"] = replace(records["pair/E1"], envelope={**records["pair/E1"].envelope, "deferred": "2099-12-31"})

    assert e.projector_frontier(list(records.values())) == set()
