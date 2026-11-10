"""Finding rules for test_viewer_habit_clean.py.

A file passes when it has no finding except `non-essential-comment`, which
slices 6 and 7 own, and except a recorded residual. A residual is an
`oversized-function` unit of 13 to 30 lines, listed in section 7 of the
findings catalog. The unit is the function name in quotes in the sensor
message, or `@<line>` for an anonymous function.
"""
from __future__ import annotations

import re

RESIDUAL_HEADING = "## 7. Recorded residuals"
COMMENT_SMELL = "non-essential-comment"
RESIDUAL_MAX_LINES = 30


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
