"""The rule that derives a program lifecycle from the lifecycles of its epics."""

from __future__ import annotations

from collections.abc import Iterable

from .record import Lifecycle, TrackerRecord


def program_lifecycle(epics: Iterable[TrackerRecord]) -> Lifecycle:
    """in_progress if any epic is in progress, closed if all epics are closed, else open."""
    states = [epic.lifecycle for epic in epics]
    if "in_progress" in states:
        return "in_progress"
    if states and all(state == "closed" for state in states):
        return "closed"
    return "open"
