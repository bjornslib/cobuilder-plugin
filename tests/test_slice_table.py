"""Tests for shared/slice_table.py: the single 04-slices.md table parser.

Covers the shapes shared/build_index.py, verify_gate.py, and
build_builds_view.py all rely on, and the real
docs/plans/cobuilder-family/04-slices.md file.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import slice_table  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
REAL_SLICES = REPO_ROOT / "docs" / "plans" / "cobuilder-family" / "04-slices.md"


def test_a_normal_six_column_slice_row_parses():
    line = (
        "| 4 | `plugin-split/E1` | Renames inside today's single plugin "
        "| Six architecture modes | 1.00 | completed |"
    )
    row = slice_table.parse_row(line)
    assert row is not None
    assert row.n == 4
    assert row.epic_id == "plugin-split/E1"
    assert row.name == "Renames inside today's single plugin"
    assert row.ends_with == "Six architecture modes"
    assert row.score == "1.00"
    assert row.state == "completed"


def test_an_epic_header_row_yields_its_id_and_no_slice_row():
    line = (
        "| | **`plugin-split/E1` — One plugin becomes five.** "
        "The mode renames. | | | | |"
    )
    assert slice_table.parse_header_epic_id(line) == "plugin-split/E1"
    assert slice_table.parse_row(line) is None


def test_a_four_column_legacy_row_without_score_and_state_parses():
    line = "| 4 | | Renames inside today's single plugin | A working state |"
    row = slice_table.parse_row(line)
    assert row is not None
    assert row.n == 4
    assert row.epic_id == ""
    assert row.name == "Renames inside today's single plugin"
    assert row.ends_with == "A working state"
    assert row.score is None
    assert row.state is None


def test_a_row_with_an_empty_ends_with_cell_still_parses():
    line = "| 4 | `plugin-split/E1` | Renames inside today's single plugin | | 1.00 | completed |"
    row = slice_table.parse_row(line)
    assert row is not None
    assert row.ends_with == ""
    assert row.score == "1.00"
    assert row.state == "completed"


def test_a_malformed_row_is_reported_as_unparsed_not_guessed():
    text = "\n".join(
        [
            "| # | Epic | Slice | Ends with | Score | State |",
            "|---|---|---|---|---|---|",
            "| 5 | oops |",
        ]
    )
    parsed = slice_table.parse_table(text)
    assert parsed.rows == []
    assert parsed.unparsed == ["| 5 | oops |"]


def test_parse_table_collects_rows_and_header_ids_and_skips_prose():
    text = "\n".join(
        [
            "Some narrative text above the table.",
            "| # | Epic | Slice | Ends with | Score | State |",
            "|---|---|---|---|---|---|",
            "| | **`plugin-split/E1` — Prose.** More words. | | | | |",
            "| 4 | `plugin-split/E1` | A slice | Ends here | 1.00 | completed |",
        ]
    )
    parsed = slice_table.parse_table(text)
    assert parsed.header_epic_ids == ["plugin-split/E1"]
    assert len(parsed.rows) == 1
    assert parsed.rows[0].n == 4
    assert parsed.unparsed == []


def test_the_real_slices_file_parses_to_fourteen_slices():
    parsed = slice_table.parse_table(REAL_SLICES.read_text())
    assert len(parsed.rows) == 14
    assert parsed.unparsed == []
    epic_ids = {
        "plugin-split/E1",
        "plugin-split/E2",
        "plugin-split/E3",
        "plugin-split/E4",
        "plugin-split/E5",
        "plugin-split/E6",
        "plugin-split/E7",
    }
    assert set(parsed.header_epic_ids) == epic_ids
