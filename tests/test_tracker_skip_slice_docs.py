"""Structure checks: the moment table names real operations, and skip-slice shows in every place that lists them.

Run with: uv run pytest tests/test_tracker_skip_slice_docs.py -q
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
USAGE = REPO / "shared" / "tracker-usage.md"
TRACKER = REPO / "shared" / "tracker.py"
MENTIONS = {
    "setup skill": REPO / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md",
    "README": REPO / "README.md",
    "reminder script": REPO / "plugins/implement/scripts/tracker_reminder.py",
}


def _help_ops() -> set[str]:
    out = subprocess.run(["uv", "run", str(TRACKER), "--help"], capture_output=True, text=True, timeout=120).stdout
    return set(re.search(r"\{([^}]+)\}", out).group(1).split(","))


def _moment_rows() -> list[str]:
    rows = USAGE.read_text(encoding="utf-8").splitlines()
    start = next(i for i, row in enumerate(rows) if row.startswith("| Workflow moment"))
    table = []
    for row in rows[start + 2:]:
        if not row.startswith("|"):
            break
        table.append(row)
    return table


def _row_ops(row: str) -> set[str]:
    ops = set()
    for span in re.findall(r"`([^`]+)`", row):
        words = span.replace("uv run shared/tracker.py", "").split()
        if words and re.fullmatch(r"[a-z][a-z-]*", words[0]):
            ops.add(words[0])
    return ops


def test_every_operation_in_the_moment_table_is_listed_by_help():
    named = set().union(*(_row_ops(row) for row in _moment_rows()))
    assert named, "the moment table names no operation"
    assert named <= _help_ops(), named - _help_ops()


def test_skip_slice_is_listed_by_help_and_has_a_moment_row():
    assert "skip-slice" in _help_ops()
    assert any("skip-slice" in _row_ops(row) for row in _moment_rows())


@pytest.mark.parametrize("name", list(MENTIONS))
def test_skip_slice_is_mentioned(name):
    assert "skip-slice" in MENTIONS[name].read_text(encoding="utf-8")
