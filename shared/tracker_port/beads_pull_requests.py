"""The pull request writes of the beads adapter. Each one reads the list, runs bd, and publishes once."""

from __future__ import annotations

from typing import Any

from .beads_rows import CB_VERSION, _create_argv, _pr_number
from .port import ArgumentError
from .record import TrackerRecord


class _PullRequestMixin:
    """Pull request methods. `BeadsAdapter` supplies the runner, the row reads, and the update helpers."""

    runner: Any

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        number = _pr_number(ref)
        rows = self._rows()
        if ref in self._cb_ids(rows).values():
            raise ArgumentError(f"record {ref} already exists")
        epic_rows = [self._find_row(rows, epic, ("epic",)) for epic in epic_ids]
        block = {"v": CB_VERSION, "id": ref, "kind": "pr", "envelope": {}}
        external_ref = f"gh-{number}"
        pr_bd_id = self.runner.run(_create_argv(block, external_ref=external_ref)).strip()
        for epic_row in epic_rows:
            # Each epic is blocked by the PR, so the epic is not ready until the PR closes.
            self.runner.run(["dep", "add", epic_row["id"], pr_bd_id])
        self._publish()
        return TrackerRecord(
            id=ref,
            kind="pr",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=external_ref,
        )

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, ref, ("pr",))
        status = "closed" if merged else "open"
        self._update(row, status=status)
        self._publish()
        return self._after(rows, row, status=status)
