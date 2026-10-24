"""The pull request writes of the beads adapter. Each one reads the list, runs bd, and publishes once."""

from __future__ import annotations

from typing import Any

from .beads_gates import create_gates, resolve_gates
from .beads_rows import CB_VERSION, _cb_block, _create_argv, _pr_number
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
            # Each epic is blocked by the PR, so the epic is not ready until the PR closes.
            self.runner.run(["dep", "add", epic_row["id"], pr_bd_id])
        # The blocker stays. Each epic also gets a gh:pr gate, and the PR record stores the gate ids.
        gates = create_gates(self.runner, [row["id"] for row in epic_rows], number)
        stored = {"gates": gates}
        self._update(row={"id": pr_bd_id}, block={**block, "envelope": stored})
        self._publish()
        return TrackerRecord(
            id=ref,
            kind="pr",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={"gates": tuple(gates)},
            external_ref=external_ref,
        )

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, ref, ("pr",))
        if merged:
            stored = _cb_block(row).get("envelope", {}).get("gates") or []
            resolve_gates(self.runner, list(stored), _pr_number(ref))
        status = "closed" if merged else "open"
        self._update(row, status=status)
        self._publish()
        return self._after(rows, row, status=status)
