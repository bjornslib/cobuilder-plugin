"""The pull request writes of the fake adapter."""

from __future__ import annotations

from pathlib import Path
from .port import ArgumentError
from .record import TrackerRecord


class _PullRequestMixin:
    """Pull request methods. `FakeAdapter` supplies the records and the update helpers."""

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        if any(record.id == ref for record in self._records):
            raise ArgumentError(f"pull request already exists: {ref}")
        for epic in epic_ids:
            self._record_of(epic, "epic")
        pull_request = TrackerRecord(
            id=ref,
            kind="pr",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=None,
            tracks=tuple(epic_ids),
        )
        self._records.append(pull_request)
        self._commit()
        return pull_request

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        return self._update(ref, "pr", lifecycle="closed" if merged else "open")

    def migrate_mapping(self, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, object]:
        return {"changed": 0, "dry_run": dry_run, "changes": [], "counts": {}, "missing": []}
