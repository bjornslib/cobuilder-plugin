"""The seed operations of the beads adapter: seed from plan files, refresh envelopes, and close records."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Any

from .beads_rows import STATUS_MAP, _cb_block, _envelope, _with_envelope
from .files import seedable_records
from .program_state import CLOSING_STAGES, RUNTIME_STAGES
from .record import TrackerRecord, merge_refresh_envelope


class _SeedMixin:
    """Seed methods. `BeadsAdapter` supplies the runner, the row reads, and the write operations."""

    runner: Any
    _batching: bool

    def seed_from_files(
        self, plans_dir: Path, dry_run: bool = False, refresh_envelope: bool = False
    ) -> list[TrackerRecord]:
        rows = self._rows()
        held = set(self._cb_ids(rows).values())
        found, self.seed_conflicts = seedable_records(plans_dir)
        creates = [
            record
            for record in found
            if record.id not in held and record.external_ref not in held
        ]
        refreshes = self._envelope_refreshes(rows, found) if refresh_envelope else []
        changed = [record for _, record in refreshes]
        if dry_run:
            return creates + changed
        closes = self._rows_to_close(rows, found)
        starts = self._rows_to_start(rows, found)
        # One sync covers the whole seed. The batch flag stops each write op from syncing on its own.
        self._batching = True
        try:
            for record in creates:
                self.create_record(record)
            for row in closes:
                self.runner.run(["close", row["id"], "--force"])
            for row in starts:
                self._update(row, status="in_progress")
            for row, record in refreshes:
                self._update(row, block=_with_envelope(_cb_block(row), record.envelope))
        finally:
            self._batching = False
        if creates or closes or starts or refreshes:
            self._publish()
        return creates + changed

    @staticmethod
    def _envelope_refreshes(
        rows: list[dict[str, Any]], found: list[TrackerRecord]
    ) -> list[tuple[dict[str, Any], TrackerRecord]]:
        # Merge the file envelope over the held one, so runtime keys the file lacks survive.
        rows_by_id = {_cb_block(row)["id"]: row for row in rows}
        refreshes = []
        for record in found:
            row = rows_by_id.get(record.id)
            if row is None:
                continue
            held = _envelope(_cb_block(row))
            envelope = merge_refresh_envelope(held, record.envelope)
            if envelope != held:
                refreshes.append((row, replace(record, envelope=envelope)))
        return refreshes

    @staticmethod
    def _rows_to_start(rows: list[dict[str, Any]], found: list[TrackerRecord]) -> list[dict[str, Any]]:
        # An open record whose files now say in progress moves to in progress. Closed and started records stay.
        started = {record.id for record in found if record.lifecycle == "in_progress"}
        return [row for row in rows if _cb_block(row)["id"] in started and STATUS_MAP.get(row.get("status")) == "open"]

    @staticmethod
    def _rows_to_close(rows: list[dict[str, Any]], found: list[TrackerRecord]) -> list[dict[str, Any]]:
        # A program whose held stage is a runtime stage, such as review, stays open. The held stage judges it.
        # A program whose held stage closes it (implemented, superseded) is closed, with or without a file.
        closed_ids = {record.id for record in found if record.lifecycle == "closed"}
        return [
            row
            for row in rows
            if STATUS_MAP.get(row.get("status")) != "closed"
            and _should_close(row, closed_ids)
        ]


def _should_close(row: dict[str, Any], closed_ids: set[str]) -> bool:
    stage = _envelope(_cb_block(row)).get("stage")
    if stage in CLOSING_STAGES:
        return True
    return _cb_block(row)["id"] in closed_ids and stage not in RUNTIME_STAGES
