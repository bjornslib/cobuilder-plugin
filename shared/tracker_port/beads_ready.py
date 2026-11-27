"""The ready read of the beads adapter. A slice asks bd. A program or an epic keeps the adapter rule."""

from __future__ import annotations

import json
from typing import Any

from .bd_runner import BdError, ready_argv
from .beads_rows import READY_KINDS, _is_ready, legacy_reasons
from .port import AdapterError, ArgumentError
from .record import TrackerRecord


class _ReadyMixin:
    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]:
        if kind not in READY_KINDS:
            raise ArgumentError(f"kind must be one of {READY_KINDS}, not {kind!r}")
        rows = self._rows()
        to_cb_id = self._cb_ids(rows)
        records = {record.id: record for record in (self._record(row, to_cb_id) for row in rows)}
        if kind != "slice":
            candidates = [r for r in records.values() if r.kind == kind and (under is None or r.parent == under)]
            return sorted((r for r in candidates if _is_ready(r, records)), key=lambda record: record.id)
        reasons = legacy_reasons(rows)
        if reasons:
            raise AdapterError(
                f"this tracker holds the old mapping ({reasons[0]}). Run migrate-mapping before you ask for ready slices."
            )
        parent = [self._find_row(rows, under, ("epic", "program"))["id"]] if under is not None else []
        try:
            ready: list[dict[str, Any]] = json.loads(self.runner.run(ready_argv(*parent)))
        except BdError as error:
            raise AdapterError(f"bd ready failed: {error.stderr.strip() or error}") from error
        found = [records[to_cb_id[row["id"]]] for row in ready if row["id"] in to_cb_id]
        return sorted((r for r in found if r.kind == "slice"), key=lambda record: record.id)
