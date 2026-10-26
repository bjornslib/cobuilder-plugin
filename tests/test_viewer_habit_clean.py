"""The viewer stays clean of habit-sensors findings, one slice at a time.

Epic mechanical-smells/E1 clears the viewer's findings slice by slice. This
file is the sensor check that every slice extends. It runs `habit-sensors --all`
once, groups the findings by file, and checks each file of a slice.

Slice scope. A slice has two parts, both in repo-relative paths:

- SLICES lists the files that the slice names.
- SLICE_GLOBS lists globs for files that the slice may add next to them.

The scope is the union of both parts. Slices 1 to 4 drop every `*.test.*`
file, because slice 5 owns the test files. A later slice adds one key to each
table.

A file passes when it has no finding except `non-essential-comment`, which
slices 6 and 7 own. One more exception exists: a recorded residual. It is an
`oversized-function` unit of 13 to 30 lines, listed in section 7 of the
findings catalog. The unit is the function name in quotes in the sensor
message, or `@<line>` for an anonymous function.

The whole-viewer comment total may not rise above COMMENT_BASELINE.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

import pytest
from _viewer_habit_slices import SLICE_GLOBS, SLICES, VIEWER

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "docs/architecture/designs/mechanical-smells/findings-catalog.md"
RESIDUAL_HEADING = "## 7. Recorded residuals"
COMMENT_SMELL = "non-essential-comment"
COMMENT_BASELINE = 1059
RESIDUAL_MAX_LINES = 30
TEST_FILE_SLICE = 5


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
    if slice_no >= TEST_FILE_SLICE:
        return sorted(found)
    return sorted(f for f in found if ".test." not in Path(f).name)


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


def residual_rows(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    in_section = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_section = line.strip() == RESIDUAL_HEADING
        if in_section and line.startswith("|"):
            cells = [c.strip().strip("`") for c in line.strip().strip("|").split("|")]
            if len(cells) >= 2 and cells[0] not in ("File", "") and set(cells[0]) != {"-"}:
                rows.append((cells[0], cells[1]))
    return rows


def unit_of(finding: dict) -> str:
    named = re.search(r"'([^']+)'", finding["message"])
    return named.group(1) if named else f"@{finding['line']}"


def unit_lines(finding: dict) -> int:
    counted = re.search(r"too many lines \((\d+)\)", finding["message"])
    return int(counted.group(1)) if counted else 0


def is_residual(finding: dict, rows: list[tuple[str, str]]) -> bool:
    if finding["smell"] != "oversized-function":
        return False
    key = (finding["file"], unit_of(finding))
    return key in rows or (finding["file"], f"@{finding['line']}") in rows


def problems_of(path: str, findings: list[dict], rows: list[tuple[str, str]]) -> list[str]:
    problems = []
    for f in findings:
        if f["smell"] == COMMENT_SMELL:
            continue
        label = f"{path}:{f['line']} {f['smell']}: {f['message']}"
        if not is_residual(f, rows):
            problems.append(label)
        elif unit_lines(f) > RESIDUAL_MAX_LINES:
            problems.append(f"{label} (a residual unit may not pass {RESIDUAL_MAX_LINES} lines)")
    return problems


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
