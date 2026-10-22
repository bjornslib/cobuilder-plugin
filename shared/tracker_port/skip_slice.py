"""The skip-slice operation: close a slice with an outcome and a reason, for the fake and beads adapters."""

from __future__ import annotations

from typing import Any

from .beads_rows import _cb_block, _with_envelope
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


class _BeadsSkipMixin:
    def skip_slice(self, id: str, reason: str, outcome: str = "skipped") -> TrackerRecord:
        check_skip(reason, outcome)
        rows = self._rows()  # type: ignore[attr-defined]
        row = self._find_row(rows, id, ("slice",))  # type: ignore[attr-defined]
        cb = _cb_block(row)
        if row.get("status") == "closed" and _same_skip(cb.get("envelope") or {}, reason, outcome):
            return self._after(rows, row)  # type: ignore[attr-defined]
        block = _with_envelope(cb, {"outcome": outcome, "reason": reason})
        self._update(row, block=block)  # type: ignore[attr-defined]
        self.runner.run(["close", row["id"], "--force"])  # type: ignore[attr-defined]
        self._publish()  # type: ignore[attr-defined]
        return self._after(rows, row, block=block, status="closed")  # type: ignore[attr-defined]
