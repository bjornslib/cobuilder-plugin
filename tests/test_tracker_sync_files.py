"""Where the async sync keeps its files: in `.cobuilder/` with a `sync-` prefix, and a `sync-*` ignore line.

Run with: uv run pytest tests/test_tracker_sync_files.py -q
"""
from __future__ import annotations

import _sync_support as s
import pytest


def _use(repo):
    from tracker_port import sync_state

    sync_state.mark_dirty(repo)
    sync_state.write_status(repo, None)


def _lines(repo):
    return (repo / s.GITIGNORE).read_text(encoding="utf-8").splitlines()


def test_first_use_creates_the_gitignore_with_the_line(tmp_path):
    _use(tmp_path)
    assert _lines(tmp_path) == ["sync-*"]


def test_existing_gitignore_keeps_its_lines_and_gains_the_line(tmp_path):
    (tmp_path / s.COBUILDER).mkdir()
    (tmp_path / s.GITIGNORE).write_text("tracker.local\nnotes/", encoding="utf-8")
    _use(tmp_path)
    assert _lines(tmp_path) == ["tracker.local", "notes/", "sync-*"]


def test_existing_line_is_not_duplicated(tmp_path):
    (tmp_path / s.COBUILDER).mkdir()
    (tmp_path / s.GITIGNORE).write_text("keep\nsync-*\n", encoding="utf-8")
    _use(tmp_path)
    _use(tmp_path)
    assert _lines(tmp_path) == ["keep", "sync-*"]


def test_files_sit_in_cobuilder_and_no_runtime_folder_appears(tmp_path):
    _use(tmp_path)
    assert (tmp_path / s.DIRTY).is_file() and (tmp_path / s.STATUS).is_file()
    assert not (tmp_path / ".cobuilder" / "runtime").exists()
    assert {p.name for p in (tmp_path / s.COBUILDER).iterdir()} == {".gitignore", "sync-dirty", "sync-status.json"}


@pytest.mark.parametrize("name", ["DIRTY", "LOCK", "STATUS", "LOG"])
def test_pinned_names_carry_the_sync_prefix_in_cobuilder(name):
    path = getattr(s, name)
    assert path.parent == s.COBUILDER and path.name.startswith("sync-")
