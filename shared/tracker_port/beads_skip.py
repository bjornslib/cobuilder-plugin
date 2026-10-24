"""The skip-slice operation of the beads adapter."""

from __future__ import annotations

from .beads_rows import _cb_block, _with_envelope
from .record import TrackerRecord
from .skip_slice import _same_skip, check_skip


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
