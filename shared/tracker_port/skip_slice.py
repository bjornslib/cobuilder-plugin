"""The skip-slice operation: the neutral checks and the fake adapter. The beads part is in beads_skip.py."""

from __future__ import annotations

from typing import Any

from .port import ArgumentError
from .record import TrackerRecord

OUTCOMES = ("skipped", "escalated")


def check_skip(reason: str, outcome: str) -> None:
    # The port refuses a bad outcome or an empty reason before it reads or writes the tracker.
    if outcome not in OUTCOMES:
        raise ArgumentError(f"outcome must be one of {', '.join(OUTCOMES)}, not {outcome!r}")
    if not reason.strip():
        raise ArgumentError("a skip needs a reason")


def _same_skip(envelope: dict[str, Any], reason: str, outcome: str) -> bool:
    return envelope.get("outcome") == outcome and envelope.get("reason") == reason


class _FakeSkipMixin:
    def skip_slice(self, id: str, reason: str, outcome: str = "skipped") -> TrackerRecord:
        check_skip(reason, outcome)
        current = self._record_of(id, "slice")  # type: ignore[attr-defined]
        if current.lifecycle == "closed" and _same_skip(current.envelope, reason, outcome):
            return current
        return self._update(  # type: ignore[attr-defined]
            id, "slice", lifecycle="closed", envelope={"outcome": outcome, "reason": reason}
        )
