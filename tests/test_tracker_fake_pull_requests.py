"""Slice 26 (E7-4): the fake adapter and the projector hold a pull request as `tracks`, as the beads adapter does.

The corpus pull request pr-101 tracks demo-E1 and demo-E2, and no epic is blocked_by it.

Run with: uv run pytest tests/test_tracker_fake_pull_requests.py -q
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pytest

import _tracker_port_support as support

CORPUS = support.CORPUS


def _fake(tmp_path: Path, state: bool = False):
    from tracker_port.fake import FakeAdapter

    corpus = tmp_path / "corpus"
    if not corpus.exists():
        shutil.copytree(CORPUS, corpus)
    return FakeAdapter(corpus, tmp_path / "state.json" if state else None)


def test_the_corpus_pull_request_tracks_its_epics_and_no_epic_has_a_pull_request_blocker() -> None:
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS)
    [pull_request] = adapter.list_pull_requests()

    assert (pull_request.tracks, pull_request.blocked_by) == (("demo-E1", "demo-E2"), ())
    assert {epic.id: epic.blocked_by for epic in adapter.list_epics()} == {
        "demo-E1": (), "demo-E2": ("demo-E1",), "demo-E3": ("demo-E2",),
    }


def test_open_pull_request_tracks_the_epics_in_call_order_and_changes_no_epic(tmp_path: Path) -> None:
    adapter = _fake(tmp_path)
    epics_before = adapter.list_epics()

    opened = adapter.open_pull_request("pr-102", ["demo-E2", "demo-E1"])

    assert (opened.tracks, opened.blocked_by, opened.lifecycle) == (("demo-E2", "demo-E1"), (), "open")
    assert adapter.list_epics() == epics_before, "no epic gains a blocker"


def test_a_merge_closes_the_pull_request_and_keeps_its_epics(tmp_path: Path) -> None:
    adapter = _fake(tmp_path)

    merged = adapter.set_pull_request_state("pr-101", merged=True)

    assert (merged.lifecycle, merged.tracks) == ("closed", ("demo-E1", "demo-E2"))
    assert adapter.set_pull_request_state("pr-101", merged=False).lifecycle == "open"


def test_a_saved_state_keeps_tracks_after_a_reload(tmp_path: Path) -> None:
    _fake(tmp_path, state=True).open_pull_request("pr-102", ["demo-E1", "demo-E2"])

    reloaded = {r.id: r for r in _fake(tmp_path, state=True).list_pull_requests()}

    assert reloaded["pr-102"].tracks == ("demo-E1", "demo-E2")
    assert reloaded["pr-101"].tracks == ("demo-E1", "demo-E2")


def test_an_unknown_epic_and_a_repeat_are_refused_and_change_nothing(tmp_path: Path) -> None:
    from tracker_port.port import ArgumentError

    adapter = _fake(tmp_path, state=True)
    before = adapter.list_pull_requests()
    with pytest.raises(ArgumentError):
        adapter.open_pull_request("pr-102", ["demo-E1", "demo-E9"])
    with pytest.raises(ArgumentError):
        adapter.open_pull_request("pr-101", ["demo-E1"])

    assert adapter.list_pull_requests() == before
    assert not (tmp_path / "state.json").exists(), "a refused write saves no state"


def test_the_projector_gives_tracks_to_a_pull_request_only_and_one_join_for_each_epic() -> None:
    from tracker_port.fake import FakeAdapter
    from tracker_port.projector import project

    index = project(support.all_records(FakeAdapter(CORPUS)))

    assert index["entities"]["pr-101"].get("tracks") == ["demo-E1", "demo-E2"]
    assert [i for i, entity in index["entities"].items() if "tracks" in entity] == ["pr-101"]
    assert [j for j in index["joins"] if j[2] == "tracks"] == [["pr-101", "demo-E1", "tracks"], ["pr-101", "demo-E2", "tracks"]]
    assert not [j for j in index["joins"] if "pr-101" in j[:2] and j[2] == "blocked_by"]
