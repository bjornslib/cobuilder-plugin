"""Kanban board E1 slice 2: each epic entity carries the tracker record's title."""
from __future__ import annotations

import json
from pathlib import Path

import _epic_corpus as corpus

TITLED = "d-approved/E1"
UNTITLED = "d-approved/E2"
UNHELD = "d-approved/E4"


def _titled_repo(tmp_path: Path) -> Path:
    repo = corpus.make_stage_repo(tmp_path)
    epics_file = tmp_path / "corpus" / "epics.json"
    rows = json.loads(epics_file.read_text(encoding="utf-8"))
    for row in rows:
        if row["id"] == TITLED:
            row["title"] = "The Kanban board"
    epics_file.write_text(json.dumps(rows), encoding="utf-8")
    goal_file = repo / "docs" / "architecture" / "designs" / "d-approved" / "goal.json"
    goal = json.loads(goal_file.read_text(encoding="utf-8"))
    goal["epics"].append({"id": "E4"})
    goal_file.write_text(json.dumps(goal), encoding="utf-8")
    return repo


def _epics_by_id(tmp_path: Path, monkeypatch) -> dict[str, dict]:
    index, _, _ = corpus.build_joins(_titled_repo(tmp_path), monkeypatch)
    return {epic["id"]: epic for epic in index["entities"]["epic"]}


def test_an_epic_entity_carries_the_tracker_record_title(tmp_path: Path, monkeypatch) -> None:
    epic = _epics_by_id(tmp_path, monkeypatch)[TITLED]
    assert "title" in epic, "the epic entity holds a title key"
    assert epic["title"] == "The Kanban board"


def test_a_record_without_a_title_gives_null(tmp_path: Path, monkeypatch) -> None:
    epic = _epics_by_id(tmp_path, monkeypatch)[UNTITLED]
    assert "title" in epic, "the epic entity holds a title key"
    assert epic["title"] is None


def test_a_missing_tracker_record_gives_null(tmp_path: Path, monkeypatch) -> None:
    epic = _epics_by_id(tmp_path, monkeypatch)[UNHELD]
    assert epic["state"] is None, "the goal epic has no tracker record"
    assert "title" in epic, "the epic entity holds a title key"
    assert epic["title"] is None


def test_design_epic_entities_reads_the_held_record_title() -> None:
    import build_index
    from tracker_port.record import TrackerRecord

    held = TrackerRecord(
        id="k/E1", kind="epic", parent="k", blocked_by=(), lifecycle="open",
        assignee=None, envelope={}, external_ref=None, title="The Kanban board",
    )
    goal = {"epics": [{"id": "E1"}, {"id": "E2"}]}
    entities = build_index.design_epic_entities("k", goal, {"k/E1": held})
    titles = {entity["id"]: entity.get("title", "<absent>") for entity in entities}
    assert titles == {"k/E1": "The Kanban board", "k/E2": None}
