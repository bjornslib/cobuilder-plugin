"""The rule that derives a program lifecycle from its stage and the lifecycles of its epics."""

from __future__ import annotations

from collections.abc import Iterable

from .record import Lifecycle, TrackerRecord

CLOSING_STAGES = frozenset({"implemented", "superseded"})
# A stage that a runtime writes. A file stage never closes a program that holds one.
RUNTIME_STAGES = frozenset({"review"})


def program_lifecycle(stage: str | None, epics: Iterable[TrackerRecord]) -> Lifecycle:
    """closed at stage implemented or superseded. Else in_progress if any epic is, closed if all are, else open."""
    if stage in CLOSING_STAGES:
        return "closed"
    states = [epic.lifecycle for epic in epics]
    if "in_progress" in states:
        return "in_progress"
    if states and all(state == "closed" for state in states):
        return "closed"
    return "open"
