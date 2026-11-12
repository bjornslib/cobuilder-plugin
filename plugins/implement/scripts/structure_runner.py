"""Structure coaching text for habit_coach.py.

Slice 1 writes a plain line for each finding. A later slice replaces the
wording and adds a session record, so that each finding shows once.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
import structure_signals  # noqa: E402


def render(finding: structure_signals.Finding) -> str:
    """Return a plain line for one finding."""
    count = finding.facts["count"]
    limit = finding.facts["limit"]
    return (
        f"{finding.path} is a new file. Its folder, {finding.folder}, holds {count} files. "
        f"The folder limit is {limit}."
    )


def run(path: str, session_id: str | None) -> tuple[int, str]:
    """Return (1, text) with one line for each finding, or (0, "") when there is none.

    session_id is not used yet. The session record arrives in a later slice.
    """
    folder = Path(os.path.dirname(os.path.abspath(path)))
    report = structure_signals.signals_for(path, folder, structure_signals.Config())
    if not report.findings:
        return 0, ""
    return 1, "\n".join(render(finding) for finding in report.findings)
