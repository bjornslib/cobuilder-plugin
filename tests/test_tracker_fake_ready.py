"""Slice 27 (E7-5): the fake ready rule follows bd, and the corpus deferred date is 2099-12-31.

A slice is ready only when it is open, each blocker is closed, and each ancestor is unblocked and not deferred.
A pull request never counts. The parity corpus (corpus-ready) holds a deferred epic with a slice, an epic that
waits for an in_progress epic, and an in_progress epic whose slice stays ready, as bd 1.3.0 does.

Run with: uv run pytest tests/test_tracker_fake_ready.py -q
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

import _beads_ready_support as r
import _beads_support as support
import _tracker_contract_support as contract

READY_SLICES = ["alt-E1-s1", "demo-E1-s3"]
UNDER = {
    "demo": ["demo-E1-s3"], "demo-E1": ["demo-E1-s3"], "demo-E2": [], "demo-E3": [],
    "alt": ["alt-E1-s1"], "alt-E1": ["alt-E1-s1"], "alt-E2": [], "later": [], "later-E1": [],
}


def test_a_slice_is_ready_only_when_each_ancestor_is_unblocked_and_not_deferred() -> None:
    # Hidden: demo-E2-s1 and alt-E2-s1 sit under an epic that waits for an open epic, and later-E1-s1 under a deferred epic.
    assert r.fake_ids(r.PARITY_CORPUS, "slice") == READY_SLICES


def test_a_slice_of_an_in_progress_epic_stays_ready_and_its_blocked_sibling_does_not() -> None:
    assert "alt-E1-s1" in r.fake_ids(r.PARITY_CORPUS, "slice")
    assert "alt-E1-s2" not in r.fake_ids(r.PARITY_CORPUS, "slice")


@pytest.mark.parametrize("under", list(UNDER))
def test_slice_ready_under_an_epic_or_a_program(under: str) -> None:
    assert r.fake_ids(r.PARITY_CORPUS, "slice", under) == UNDER[under]


def test_program_and_epic_ready_follow_the_same_rule() -> None:
    assert r.fake_ids(r.PARITY_CORPUS, "program") == ["alt", "demo", "later"]
    assert r.fake_ids(r.PARITY_CORPUS, "epic") == ["demo-E1"], "alt-E1 runs, alt-E2 and demo-E2 wait, and later-E1 is deferred"


def test_a_pull_request_never_counts(tmp_path: Path) -> None:
    bare = tmp_path / "bare"
    shutil.copytree(r.PARITY_CORPUS, bare)
    (bare / "prs.json").write_text("[]\n", encoding="utf-8")

    for kind in r.KINDS:
        assert r.fake_ids(r.PARITY_CORPUS, kind) == r.fake_ids(bare, kind), kind


def test_the_projector_frontier_and_the_fake_agree_on_the_parity_corpus() -> None:
    import _beads_edges_support as e
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(r.PARITY_CORPUS)

    assert e.projector_frontier(support.all_records(adapter)) == set(READY_SLICES)


@pytest.mark.parametrize("corpus", [contract.CORPUS_DIR, r.PARITY_CORPUS], ids=["corpus", "corpus-ready"])
def test_the_deferred_epic_of_the_corpus_holds_the_far_date(corpus: Path) -> None:
    epics = {epic["id"]: epic for epic in json.loads((corpus / "epics.json").read_text(encoding="utf-8"))}

    assert epics["demo-E3"]["envelope"] == {"deferred": "2099-12-31"}


def test_no_corpus_fixture_keeps_the_near_date() -> None:
    tracker = support.FIXTURE_DIR
    paths = [*sorted((tracker / "corpus").glob("*.json")), *sorted(r.PARITY_CORPUS.glob("*.json"))]
    paths += [tracker / "expected-index.json", support.BEADS_DIR / "list.json", support.BEADS_DIR / "transcripts" / "list.json"]

    assert [path.name for path in paths if "2026-11-01" in path.read_text(encoding="utf-8")] == []
    assert "2099-12-31" in (tracker / "expected-index.json").read_text(encoding="utf-8")
