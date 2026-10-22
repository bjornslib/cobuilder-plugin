"""The sync modes of the beads adapter: `write` syncs at each write, `async` hands the sync to a worker, `off` never syncs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .sync_state import is_dirty, lock_held, mark_dirty, read_status


class _SyncModeMixin:
    """`BeadsAdapter` supplies `sync_mode`, `repo_root`, `spawner`, and `sync`."""

    sync_mode: str
    repo_root: Path
    spawner: Any

    def _publish(self) -> None:
        # Each write op ends here. A seed batch skips this and publishes once at its end.
        if self._batching:  # type: ignore[attr-defined]
            return
        if self.sync_mode == "write":
            self.sync()  # type: ignore[attr-defined]
        elif self.sync_mode == "async":
            mark_dirty(self.repo_root)
            if not lock_held(self.repo_root):
                self.spawner(self.repo_root)

    def _sync_details(self) -> dict[str, Any]:
        details: dict[str, Any] = {"sync": self.sync_mode}
        if self.sync_mode == "async":
            details["sync_pending"] = is_dirty(self.repo_root)
            details["last_sync"] = read_status(self.repo_root)
        return details
