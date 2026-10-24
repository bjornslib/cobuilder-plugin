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
        argv = _create_argv(block, title=ref, options=[("--external-ref", external_ref)])
        pr_bd_id = self.runner.run(argv).strip()
        for epic_row in epic_rows:
            # The milestone tracks each epic. It blocks none, so no epic waits on the pull request.
            self.runner.run(["dep", "add", pr_bd_id, epic_row["id"], "--type", "tracks"])
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
            tracks=tuple(epic_ids),
        )

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, ref, ("pr",))
        status = "closed" if merged else "open"
        self._update(row, status=status)
        self._publish()
        return self._after(rows, row, status=status)
