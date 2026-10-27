"""Unit checks for the kept-comments table helpers that slices 6 and 7 rely on."""
from __future__ import annotations

import pytest
from _viewer_kept_comments import (
    commented_test_side_files, comment_counts, kept_limits, kept_rows, over_kept, row_problems,
    source_files_with_comments, table_rows,
)

TABLE = "intro text\n\n| File | Kept | Original |\n|---|---|---|\n| `src/a.ts` | 2 | 5 |\n"


def test_table_rows_read_data_rows_only():
    rows = table_rows(TABLE, "x.md")
    assert [(r.file, r.kept, r.original, r.where) for r in rows] == [("src/a.ts", 2, 5, "x.md:5")]


def test_table_rows_reject_a_count_that_is_not_a_number():
    with pytest.raises(ValueError, match="whole numbers"):
        table_rows("| src/a.ts | two | 5 |\n", "x.md")


def test_readme_of_the_folder_is_not_parsed(tmp_path):
    (tmp_path / "README.md").write_text(TABLE)
    (tmp_path / "shell.md").write_text("| File | Kept | Original |\n|---|---|---|\n| src/b.ts | 1 | 1 |\n")
    assert [r.file for r in kept_rows(tmp_path)] == ["src/b.ts"]


def test_row_problems_name_each_broken_rule():
    rows = table_rows("| src/a.ts | 6 | 5 |\n| src/a.ts | 1 | 4 |\n", "x.md")
    problems = row_problems(rows, {"src/a.ts": 5})
    assert len(problems) == 3
    assert "Kept 6 is above Original 5" in problems[0]
    assert "more than one row" in problems[1]
    assert "Original 4 differs from the start-of-slice count 5" in problems[2]


def test_over_kept_compares_the_count_with_the_kept_value():
    limits = kept_limits(table_rows(TABLE, "x.md"))
    prefix = "plugins/artifact/viewer/"
    assert over_kept(f"{prefix}src/a.ts", [1, 2], limits) is None
    assert "3 comment findings, Kept 2" in over_kept(f"{prefix}src/a.ts", [1, 2, 3], limits)
    assert "1 comment findings, Kept 0" in over_kept(f"{prefix}src/z.ts", [9], limits)


def test_slice_six_lists_only_source_files_with_comments():
    files = source_files_with_comments()
    assert len(files) == 183
    assert not [f for f in files if ".test." in f or "/testSupport/" in f]


def test_slice_seven_lists_only_commented_test_side_files():
    files = commented_test_side_files()
    assert len(files) == 85
    assert all(".test." in f or "/testSupport/" in f for f in files)
    assert not set(files) & set(source_files_with_comments())


def test_start_of_slice_7_counts_total_349_findings():
    counts = comment_counts()
    assert sum(counts[f.removeprefix("plugins/artifact/viewer/")] for f in commented_test_side_files()) == 349
