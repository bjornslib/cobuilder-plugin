"""The viewer stays clean of habit-sensors findings, one slice at a time.

Epic mechanical-smells/E1 clears the viewer's findings slice by slice. This
file is the sensor check that every slice extends. It runs `habit-sensors --all`
once, groups the findings by file, and checks each file of a slice.

Slice scope. A slice has two parts, both in repo-relative paths:

- SLICES lists the files that the slice names.
- SLICE_GLOBS lists globs for files that the slice may add next to them.

The scope is the union of both parts. Slices 1 to 4 drop every `*.test.*`
file, because slice 5 owns the test files. Slice 6 drops every `*.test.*` file
and every file under a `testSupport` folder, because slice 7 owns them. Slice 7
scopes exactly those test-side files. A later slice adds one key to each table.

The finding rules are in `_viewer_habit_residuals.py`. A file passes when it
has no finding except `non-essential-comment` and a recorded residual.

The whole-viewer comment total may not rise above COMMENT_BASELINE. Slices 6
and 7 keep why-comments: a file may hold at most the Kept count of its row in
kept-comments/*.md, and one test checks every file of both slices.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

import pytest
from _viewer_habit_residuals import COMMENT_SMELL, RESIDUAL_HEADING, problems_of, residual_rows
from _viewer_habit_slices import SLICE_GLOBS, SLICES, VIEWER
from _viewer_kept_comments import (
    comment_counts, is_test_file, is_test_side, kept_limits, kept_rows, over_kept,
    row_problems,
)

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "docs/architecture/designs/mechanical-smells/findings-catalog.md"
COMMENT_BASELINE = 1059
TEST_SIDE_SLICES = (5, 7)
COMMENT_SLICE = 6
TEST_COMMENT_SLICE = 7


def _sensor_binary() -> str | None:
    found = shutil.which("habit-sensors")
    if found:
        return found
    local = Path.home() / ".local/bin/habit-sensors"
    return str(local) if local.exists() else None


SENSOR = _sensor_binary()
pytestmark = pytest.mark.skipif(
    SENSOR is None or not (ROOT / VIEWER / "node_modules").exists(),
    reason="habit-sensors or the viewer node_modules is missing",
)


def normalize(path: str) -> str:
    return f"plugins/{path}" if path.startswith("artifact/") else path


def scope_of(slice_no: int) -> list[str]:
    found = set(SLICES[slice_no])
    for pattern in SLICE_GLOBS[slice_no]:
        found.update(p.relative_to(ROOT).as_posix() for p in ROOT.glob(pattern))
    if slice_no in TEST_SIDE_SLICES:
        return sorted(found)
    dropped = is_test_side if slice_no >= COMMENT_SLICE else is_test_file
    return sorted(f for f in found if not dropped(f))


def flatten(groups: list[dict]) -> list[dict]:
    flat = []
    for group in groups:
        for issue in group["issues"]:
            details = issue["details"]
            flat.append({
                "smell": group["smell"],
                "file": normalize(details["file"]),
                "line": details.get("line") or details.get("startLine"),
                "message": details.get("message", details.get("source", "")),
            })
    return flat


def by_file(findings: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for finding in findings:
        grouped[finding["file"]].append(finding)
    return grouped


@pytest.fixture(scope="module")
def findings_by_file() -> dict[str, list[dict]]:
    run = subprocess.run(
        [SENSOR, "--all"], cwd=ROOT, capture_output=True, text=True, timeout=300, check=True
    )
    return by_file(flatten(json.loads(run.stdout)))


@pytest.fixture(scope="module")
def residuals() -> list[tuple[str, str]]:
    return residual_rows(CATALOG.read_text(encoding="utf-8"))


CASES = [(n, path) for n in sorted(SLICES) for path in scope_of(n)]


@pytest.mark.parametrize("slice_no,path", CASES, ids=[f"s{n}:{p}" for n, p in CASES])
def test_slice_file_has_no_finding(slice_no, path, findings_by_file, residuals):
    problems = problems_of(path, findings_by_file.get(path, []), residuals)
    assert not problems, f"slice {slice_no} file has findings:\n" + "\n".join(problems)


@pytest.mark.parametrize("slice_no", sorted(SLICES))
def test_slice_named_files_exist(slice_no):
    missing = [p for p in SLICES[slice_no] if not (ROOT / p).is_file()]
    assert not missing, f"slice {slice_no} files must stay in place: {missing}"


def test_viewer_comment_total_does_not_rise(findings_by_file):
    total = sum(
        1
        for path, items in findings_by_file.items()
        if path.startswith(f"{VIEWER}/")
        for f in items
        if f["smell"] == COMMENT_SMELL
    )
    assert total <= COMMENT_BASELINE, f"{total} comment findings, baseline {COMMENT_BASELINE}"


def test_residual_table_parses_rows():
    sample = f"{RESIDUAL_HEADING}\n\n| File | Unit | Lines | Why it stays |\n|---|---|---|---|\n| a.tsx | `Foo` | 20 | one |\n"
    assert residual_rows(sample) == [("a.tsx", "Foo")]


@pytest.fixture(scope="module")
def kept() -> dict[str, int]:
    return kept_limits(kept_rows())


def comment_problem(path: str, findings_by_file, kept) -> str | None:
    found = [f["line"] for f in findings_by_file.get(path, []) if f["smell"] == COMMENT_SMELL]
    return over_kept(path, found, kept)


@pytest.mark.parametrize("path", scope_of(COMMENT_SLICE))
def test_slice6_comments_fit_kept(path, findings_by_file, kept):
    problem = comment_problem(path, findings_by_file, kept)
    assert not problem, f"slice 6 {problem}"


@pytest.mark.parametrize("path", scope_of(TEST_COMMENT_SLICE))
def test_slice7_comments_fit_kept(path, findings_by_file, kept):
    problem = comment_problem(path, findings_by_file, kept)
    assert not problem, f"slice 7 {problem}"


def test_every_viewer_file_fits_its_kept_count(findings_by_file, kept):
    scope = scope_of(COMMENT_SLICE) + scope_of(TEST_COMMENT_SLICE)
    problems = [p for p in (comment_problem(f, findings_by_file, kept) for f in scope) if p]
    assert not problems, f"{len(problems)} viewer files hold too many comments:\n" + "\n".join(problems)


def test_kept_tables_match_the_start_of_slice_6():
    problems = row_problems(kept_rows(), comment_counts())
    assert not problems, "kept-comments tables are unsound:\n" + "\n".join(problems)
