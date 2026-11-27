"""_RepairMixin: the beads side of repair-status. A dry run writes nothing. A live run batches its writes into one sync."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .repair_read import repair_plan


class _RepairMixin:
    runner: Any
    _batching: bool

    def repair_status(
        self, dry_run: bool = False, plans_dir: Path | None = None, index: Path | None = None
    ) -> dict[str, Any]:
        plan = repair_plan(self.all_records(), plans_dir, index)  # type: ignore[attr-defined]
        if dry_run or not plan["changes"]:
            return plan
        self._batching = True
        try:
            self._apply_repair(plan["changes"], plans_dir)
        finally:
            self._batching = False
        self._publish()  # type: ignore[attr-defined]
        return plan

    def _apply_repair(self, changes: list[dict[str, Any]], plans_dir: Path | None) -> None:
        rows = self._rows()  # type: ignore[attr-defined]
        for change in changes:
            if change["action"] == "close":
                row = self._find_row(rows, change["id"], (change["kind"],))  # type: ignore[attr-defined]
                self.runner.run(["close", row["id"], "--force"])
            else:
                self.set_program_stage(change["id"], change["stage"], plans_dir)  # type: ignore[attr-defined]
