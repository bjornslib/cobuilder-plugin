"""The claim-next write of the beads adapter: one `bd ready --claim` call, then the start of the parent epic."""

from __future__ import annotations

import json
from typing import Any

from .bd_runner import BdError, claim_next_argv
from .beads_rows import _cb_block, legacy_reasons
from .port import AdapterError
from .record import TrackerRecord


class _ClaimNextMixin:
    """`BeadsAdapter` supplies the runner, the row reads, the update helper, and `_publish`."""

    runner: Any

    def claim_next(self, claimant: str, under: str | None = None) -> TrackerRecord | None:
        rows = self._rows()
        reasons = legacy_reasons(rows)
        if reasons:
            raise AdapterError(
                f"this tracker holds the old mapping ({reasons[0]}). Run migrate-mapping before you claim the next slice."
            )
        parent = [self._find_row(rows, under, ("epic", "program"))["id"]] if under is not None else []
        try:
            claimed: list[dict[str, Any]] = json.loads(self.runner.run(claim_next_argv(claimant, *parent)))
        except BdError as error:
            raise AdapterError(f"claim-next refused: {error.stderr.strip() or error}") from error
        if not claimed:
            return None
        by_bd_id = {row["id"]: row for row in rows}
        row = by_bd_id.get(claimed[0]["id"])
        if row is None:
            raise AdapterError(f"claim-next refused: bd claimed {claimed[0]['id']}, which holds no cb block")
        epic = by_bd_id.get(row.get("parent") or "")
        if epic is not None and _cb_block(epic)["kind"] == "epic" and epic.get("status") == "open":
            self._update(epic, status="in_progress")
        record = self._record({**row, "status": "in_progress", "assignee": claimant}, self._cb_ids(rows))
        self._publish()
        return record
