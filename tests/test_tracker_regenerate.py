"""Tests for the status-file regeneration port (E3 slice 12).

The regenerate operation reads a tracker port and rewrites only the state
lines of a program's 00-status.md and 04-slices.md. Every other line stays
byte-identical.

Golden edits, relative to the mini plan under tests/fixtures/tracker/plans:
- 00-status.md, Gate 2 line: "passed" becomes "APPROVED 2026-10-14".
- 00-status.md, Slice 1 line: "[ ]" becomes "[x]", and "score: —" becomes
  "score: 0.917".
- 00-status.md, Slice 2 line: "[ ]" becomes "[x]", and "score: —" becomes
  "score: 0.8 on attempt 2".
- 00-status.md, Slice 3 line: unchanged. The record is open with no score.
- 04-slices.md, slice 1 row: Score "—" becomes "0.917", and State
  "pending" becomes "done".
- 04-slices.md, slice 2 row: Score "—" becomes "0.8 (attempt 2)", and State
  "pending" becomes "done".
- 04-slices.md, slice 3 row: unchanged. The record is open, and the state
  "pending" agrees with it.
"""

from __future__ import annotations

import hashlib
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

from tracker_port import FakeAdapter, NoAdapterError  # noqa: E402
from tracker_port.files import FilesAdapter  # noqa: E402
from tracker_port.regenerate import regenerate  # noqa: E402

REPO_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = REPO_DIR / "tests" / "fixtures" / "tracker"
CORPUS_DIR = FIXTURES_DIR / "regenerate-corpus"
PLANS_DIR = FIXTURES_DIR / "plans"
GOLDEN_DIR = FIXTURES_DIR / "golden" / "plans" / "beads-storage-mini"
PROGRAM = "beads-storage-mini"
EPIC = "beads-storage-mini/E1"
STATUS = "00-status.md"
SLICES = "04-slices.md"

# Lines that the golden edits change, by 1-based line number.
STATUS_CHANGED = {4, 8, 9}
SLICES_CHANGED = {6, 7}


def _snapshot(root: Path) -> dict[str, str]:
    """Map each file under root to its sha256 digest."""
    return {
        p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def _copy_plans(tmp_path: Path) -> Path:
    """Copy the mini plan tree into tmp_path and return the plans root."""
    plans_root = tmp_path / "plans"
    shutil.copytree(PLANS_DIR, plans_root)
    return plans_root


def _run(plans_root: Path) -> list[Path]:
    return regenerate(FakeAdapter(CORPUS_DIR), PROGRAM, plans_root)


def _changed_lines(before: str, after: str) -> set[int]:
    """Return the 1-based numbers of the lines that differ."""
    a = before.splitlines()
    b = after.splitlines()
    assert len(a) == len(b), "regeneration must not add or remove lines"
    return {i + 1 for i, (x, y) in enumerate(zip(a, b)) if x != y}


def test_output_equals_golden(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    written = _run(plans_root)

    assert sorted(p.name for p in written) == [STATUS, SLICES]
    for name in (STATUS, SLICES):
        got = (plans_root / PROGRAM / name).read_bytes()
        want = (GOLDEN_DIR / name).read_bytes()
        assert got == want, f"{name} differs from golden"


def test_prose_lines_unchanged(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    source = PLANS_DIR / PROGRAM
    _run(plans_root)

    status_before = (source / STATUS).read_text(encoding="utf-8")
    status_after = (plans_root / PROGRAM / STATUS).read_text(encoding="utf-8")
    assert _changed_lines(status_before, status_after) == STATUS_CHANGED

    slices_before = (source / SLICES).read_text(encoding="utf-8")
    slices_after = (plans_root / PROGRAM / SLICES).read_text(encoding="utf-8")
    assert _changed_lines(slices_before, slices_after) == SLICES_CHANGED


def test_second_run_is_identical(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    _run(plans_root)
    first = _snapshot(plans_root)

    second_written = _run(plans_root)
    second = _snapshot(plans_root)

    assert second == first
    assert sorted(p.name for p in second_written) == [STATUS, SLICES]


def test_no_adapter_writes_nothing(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    before = _snapshot(tmp_path)

    with pytest.raises(NoAdapterError):
        regenerate(None, PROGRAM, plans_root)

    assert _snapshot(tmp_path) == before


def test_only_state_cells_change_in_table(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    _run(plans_root)

    before_rows = (PLANS_DIR / PROGRAM / SLICES).read_text(encoding="utf-8").splitlines()
    after_rows = (plans_root / PROGRAM / SLICES).read_text(encoding="utf-8").splitlines()
    assert len(before_rows) == len(after_rows)

    # Table cells are: # | Epic | Slice | Ends with | Score | State.
    # Only index 4 (Score) and index 5 (State) may change, and only on slice rows.
    for before, after in zip(before_rows, after_rows):
        if before == after:
            continue
        b_cells = before.split("|")
        a_cells = after.split("|")
        assert len(b_cells) == len(a_cells)
        # split("|") gives an empty cell at each end. Cells 1 to 4 are #, Epic, Slice, Ends with.
        assert b_cells[:5] == a_cells[:5], f"non-state cell changed: {before!r}"
        assert b_cells[7:] == a_cells[7:]


def test_files_adapter_round_trip(tmp_path: Path) -> None:
    plans_root = _copy_plans(tmp_path)
    _run(plans_root)

    corpus = FakeAdapter(CORPUS_DIR)
    files = FilesAdapter(plans_root)

    want = {r.id: r for r in corpus.list_slices(EPIC)}
    got = {r.id: r for r in files.list_slices(EPIC)}
    assert got.keys() == want.keys()
    for slice_id, want_rec in want.items():
        got_rec = got[slice_id]
        assert got_rec.lifecycle == want_rec.lifecycle, slice_id
        assert got_rec.envelope.get("score") == want_rec.envelope.get("score"), slice_id
