"""E8 slice 35: the epic and slice status words follow the tracker lifecycle and the design stage."""
from __future__ import annotations

from pathlib import Path

import pytest

import _epic_corpus as corpus
import _tracker_port_support  # noqa: F401  (puts shared/ on sys.path)

OPEN_WORD = {
    "backlog": "unstarted",
    "decided": "unstarted",
    "approved": "unstarted",
    "review": "unstarted",
    "implemented": "completed",
    "superseded": "superseded",
}


@pytest.fixture()
def built(tmp_path: Path, monkeypatch):
    repo = corpus.make_stage_repo(tmp_path)
    return corpus.build_joins(repo, monkeypatch)


@pytest.mark.parametrize("stage", corpus.STAGES)
def test_open_epic_word_follows_the_stage(built, stage: str) -> None:
    _, joins, _ = built
    assert joins["epic_status"][f"d-{stage}/E1"] == OPEN_WORD[stage]


@pytest.mark.parametrize("stage", corpus.STAGES)
def test_closed_epic_reads_completed_at_every_stage(built, stage: str) -> None:
    _, joins, _ = built
    assert joins["epic_status"][f"d-{stage}/E2"] == "completed"


@pytest.mark.parametrize("stage", corpus.STAGES)
def test_in_progress_epic_word(built, stage: str) -> None:
    _, joins, _ = built
    expected = {"implemented": "completed", "superseded": "superseded"}.get(stage, "in_progress")
    assert joins["epic_status"][f"d-{stage}/E3"] == expected


def test_in_progress_slice_has_state_in_progress(built) -> None:
    index, _, _ = built
    states = {s["id"]: s["state"] for s in index["entities"]["slice"]}
    assert states["d-approved/E3/9"] == "in_progress"
    assert states["d-approved/E1/1"] == "planned"
