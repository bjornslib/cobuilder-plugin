"""_FakeRepairMixin: the fake side of repair-status. The same plan as beads, applied to the in-memory records."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .repair_read import repair_plan


class _FakeRepairMixin:
    def repair_status(
        self, dry_run: bool = False, plans_dir: Path | None = None, index: Path | None = None
    ) -> dict[str, Any]:
        plan = repair_plan(self.all_records(), plans_dir, index)  # type: ignore[attr-defined]
        if dry_run:
            return plan
        for change in plan["changes"]:
            if change["action"] == "close":
                close = self.set_epic_state if change["kind"] == "epic" else self.set_slice_state  # type: ignore[attr-defined]
                close(change["id"], "closed")
            else:
                self.set_program_stage(change["id"], change["stage"], plans_dir)  # type: ignore[attr-defined]
        return plan
