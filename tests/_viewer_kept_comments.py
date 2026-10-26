"""Helpers for the slice 6 check of the viewer's kept why-comments.

The kept-comments folder holds one table for each group of source folders.
A row reads `| File | Kept | Original |`, and File is relative to the viewer.
The fixture viewer_comment_counts.json holds the per-file comment findings
from before slice 6. Original in a row must equal that count.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parent.parent
KEPT_DIR = ROOT / "docs/architecture/designs/mechanical-smells/kept-comments"
COUNTS_FIXTURE = Path(__file__).parent / "fixtures/viewer_comment_counts.json"
VIEWER_PREFIX = "plugins/artifact/viewer/"
TABLE_HEADER = "File"


class Row(NamedTuple):
    file: str
    kept: int
    original: int
    where: str


def viewer_relative(path: str) -> str:
    return path.removeprefix(VIEWER_PREFIX)


def is_test_file(path: str) -> bool:
    return ".test." in Path(path).name


def is_test_side(path: str) -> bool:
    return is_test_file(path) or "testSupport" in Path(path).parts


def comment_counts() -> dict[str, int]:
    return json.loads(COUNTS_FIXTURE.read_text(encoding="utf-8"))


def source_files_with_comments() -> list[str]:
    counts = comment_counts()
    return sorted(
        f"{VIEWER_PREFIX}{rel}" for rel, n in counts.items() if n and not is_test_side(rel)
    )


def _cells(line: str) -> list[str]:
    return [c.strip().strip("`") for c in line.strip().strip("|").split("|")]


def _is_data_row(cells: list[str]) -> bool:
    return len(cells) >= 3 and cells[0] not in (TABLE_HEADER, "") and set(cells[0]) != {"-"}


def table_rows(text: str, where: str) -> list[Row]:
    rows = []
    for number, line in enumerate(text.splitlines(), start=1):
        cells = _cells(line) if line.startswith("|") else []
        if not _is_data_row(cells):
            continue
        spot = f"{where}:{number}"
        if not (cells[1].isdigit() and cells[2].isdigit()):
            raise ValueError(f"{spot}: Kept and Original must be whole numbers")
        rows.append(Row(cells[0], int(cells[1]), int(cells[2]), spot))
    return rows


def kept_rows(directory: Path = KEPT_DIR) -> list[Row]:
    rows: list[Row] = []
    for md in sorted(directory.glob("*.md")):
        if md.name != "README.md":
            rows.extend(table_rows(md.read_text(encoding="utf-8"), md.name))
    return rows


def kept_limits(rows: list[Row]) -> dict[str, int]:
    return {row.file: row.kept for row in rows}


def row_problems(rows: list[Row], counts: dict[str, int]) -> list[str]:
    problems = []
    seen: set[str] = set()
    for row in rows:
        if row.file in seen:
            problems.append(f"{row.where}: {row.file} has more than one row")
        seen.add(row.file)
        if row.kept > row.original:
            problems.append(f"{row.where}: {row.file} Kept {row.kept} is above Original {row.original}")
        if row.original != counts.get(row.file, 0):
            problems.append(
                f"{row.where}: {row.file} Original {row.original} differs from the "
                f"start-of-slice count {counts.get(row.file, 0)}"
            )
    return problems


def over_kept(path: str, lines: list[int], limits: dict[str, int]) -> str | None:
    rel = viewer_relative(path)
    kept = limits.get(rel, 0)
    if len(lines) <= kept:
        return None
    return (
        f"{rel}: {len(lines)} comment findings, Kept {kept}; "
        f"delete or record the comments at lines {sorted(lines)}"
    )
