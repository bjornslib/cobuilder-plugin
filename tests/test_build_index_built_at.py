"""Kanban board E1 slice 6: the index holds its build time at the top level."""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

import _epic_corpus as corpus

UTC_SECOND = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
OLD_TIME = "1999-01-01T00:00:00Z"


def _build(tmp_path: Path, monkeypatch) -> tuple[dict, Path]:
    repo = corpus.make_stage_repo(tmp_path)
    index, _, _ = corpus.build_joins(repo, monkeypatch)
    return index, repo


def _now_to_the_second() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def test_the_index_holds_built_at_at_the_top_level(tmp_path: Path, monkeypatch) -> None:
    index, _ = _build(tmp_path, monkeypatch)
    assert "built_at" in index, "the index holds a top-level built_at key"
    assert isinstance(index["built_at"], str)


def test_built_at_is_an_iso_time_in_utc_to_the_second(tmp_path: Path, monkeypatch) -> None:
    before = _now_to_the_second()
    index, _ = _build(tmp_path, monkeypatch)
    after = _now_to_the_second()
    built_at = index.get("built_at")
    assert isinstance(built_at, str) and UTC_SECOND.match(built_at), f"built_at reads YYYY-MM-DDTHH:MM:SSZ, got {built_at!r}"
    moment = dt.datetime.fromisoformat(built_at.replace("Z", "+00:00"))
    assert before <= moment <= after, "built_at is the time of this build"


def test_build_time_gives_the_utc_shape() -> None:
    import build_index

    build_time = getattr(build_index, "build_time", None)
    assert callable(build_time), "build_index.build_time() exists"
    assert UTC_SECOND.match(build_time())


def test_the_index_reads_its_time_from_build_time(tmp_path: Path, monkeypatch) -> None:
    import build_index

    monkeypatch.setattr(build_index, "build_time", lambda: "2026-11-21T09:41:07Z", raising=False)
    index, _ = _build(tmp_path, monkeypatch)
    assert index.get("built_at") == "2026-11-21T09:41:07Z"


def test_sources_holds_no_built_at(tmp_path: Path, monkeypatch) -> None:
    import build_index

    index, repo = _build(tmp_path, monkeypatch)
    assert "built_at" in index, "the time sits at the top level"
    assert "built_at" not in index["sources"]
    assert "built_at" not in build_index.compute_sources(repo)


def test_is_stale_ignores_built_at(tmp_path: Path, monkeypatch) -> None:
    import build_index

    index, repo = _build(tmp_path, monkeypatch)
    assert "built_at" in index, "the index holds a build time"
    assert build_index.is_stale(index, repo) is False
    assert build_index.is_stale({**index, "built_at": OLD_TIME}, repo) is False, "a new time alone is not a change"
    without = {key: value for key, value in index.items() if key != "built_at"}
    assert build_index.is_stale(without, repo) is False, "an index without the time is not stale"


def test_a_second_build_changes_only_the_time(tmp_path: Path, monkeypatch) -> None:
    import build_index

    repo = corpus.make_stage_repo(tmp_path)
    monkeypatch.setattr(build_index, "build_time", lambda: "2026-11-21T09:41:07Z", raising=False)
    first, _, _ = corpus.build_joins(repo, monkeypatch)
    monkeypatch.setattr(build_index, "build_time", lambda: "2026-11-21T09:42:00Z", raising=False)
    second, _, _ = corpus.build_joins(repo, monkeypatch)
    assert "built_at" in first and "built_at" in second, "each build writes a time"
    assert second["built_at"] >= first["built_at"], "the second build gives a later or equal time"
    assert {k: v for k, v in first.items() if k != "built_at"} == {k: v for k, v in second.items() if k != "built_at"}
    assert build_index.is_stale(first, repo) is False, "the first index is still fresh after the second build"


def test_the_projector_writes_no_built_at(tmp_path: Path, monkeypatch) -> None:
    from tracker_port import projector, reader

    index, repo = _build(tmp_path, monkeypatch)
    assert "built_at" in index, "the build, not the projector, writes the time"
    rest = {key: value for key, value in index.items() if key != "built_at"}
    assert "built_at" not in json.dumps(rest), "no entity, join, or source holds the time"
    snapshot = reader.snapshot(repo)
    held = (snapshot.programs, snapshot.epics, snapshot.slices, snapshot.pull_requests)
    records = [record for group in held for record in group.values()]
    assert records, "the fake tracker holds records"
    assert "built_at" not in json.dumps(projector.project(records), default=str)
