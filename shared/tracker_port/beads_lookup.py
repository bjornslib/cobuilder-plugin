"""Lookups of the beads adapter: one record by its external ref, and the doctor report."""

from __future__ import annotations

import json
from typing import Any

from .bd_runner import BdError
from .beads_rows import _is_cb_row, external_ref_of, legacy_reasons, lookup_argv
from .record import TrackerRecord


class _LookupMixin:
    """Lookup methods. `BeadsAdapter` supplies the runner and the record reads."""

    runner: Any

    def find_record(self, cb_id: str) -> TrackerRecord | None:
        # bd filters by the exact external ref, so the read needs no scan of the list.
        rows = [row for row in json.loads(self.runner.run(lookup_argv(external_ref_of(cb_id)))) if _is_cb_row(row)]
        for row in rows:
            if row["metadata"]["cb"].get("id") != cb_id:
                continue
            # A parent or an edge names another row, so the full list resolves those ids.
            linked = bool(row.get("parent") or row.get("dependencies"))
            return self._record(row, self._cb_ids(self._rows() if linked else [row]))
        return None

    def doctor_details(self) -> dict[str, Any]:
        # A workspace with no bd database still shows its sync details. It has no foreign count and no mapping.
        try:
            rows = self._all_rows()
        except BdError:
            return self._sync_details()
        foreign = sum(1 for row in rows if not _is_cb_row(row))
        counts: dict[str, int] = {}
        for row in rows:
            if not _is_cb_row(row):
                continue
            cb_id = row["metadata"]["cb"]["id"]
            counts[cb_id] = counts.get(cb_id, 0) + 1
        duplicates = sorted(cb_id for cb_id, count in counts.items() if count > 1)
        mapping = "legacy" if legacy_reasons(rows) else "native"
        return {"foreign_issues": foreign, "mapping": mapping, "duplicates": duplicates, **self._sync_details()}
