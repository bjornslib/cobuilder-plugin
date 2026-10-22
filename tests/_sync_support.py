"""Shared helpers for the async tracker sync tests. Not a test module.

Pinned names: the runtime folder is `.cobuilder/runtime/`, the dirty flag is
`sync-dirty`, the lock is `sync.lock`, and the status is `sync-status.json`.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _beads_support as support  # noqa: F401  (puts shared/ on sys.path)
from _tracker_port_support import REPO_ROOT

RUNTIME = Path(".cobuilder") / "runtime"
DIRTY = RUNTIME / "sync-dirty"
LOCK = RUNTIME / "sync.lock"
STATUS = RUNTIME / "sync-status.json"


class RecordingSpawner:
    """A fake spawner. It records each call and starts no process."""

    def __init__(self) -> None:
        self.calls: list[Any] = []

    def __call__(self, *args: Any, **kwargs: Any) -> None:
        self.calls.append((args, kwargs))


class StubAdapter:
    """A fake adapter whose sync is a stub. `plan` lists errors or None for each call."""

    def __init__(self, plan: list[str | None] | None = None, repo: Path | None = None, redirty: int = 0) -> None:
        self.plan = list(plan or [])
        self.repo = repo
        self.redirty = redirty
        self.syncs = 0

    def sync(self) -> None:
        from tracker_port.port import AdapterError

        self.syncs += 1
        if self.redirty and self.repo is not None:
            self.redirty -= 1
            (self.repo / DIRTY).write_text("1", encoding="utf-8")
        error = self.plan.pop(0) if self.plan else None
        if error:
            raise AdapterError(error)


def tracked_repo(tmp_path: Path, sync: str | None = "async") -> Path:
    repo = tmp_path / "repo"
    (repo / ".cobuilder").mkdir(parents=True)
    lines = ["adapter: fake", f"corpus: {json.dumps(str(REPO_ROOT / 'tests' / 'fixtures' / 'tracker' / 'corpus'))}"]
    if sync:
        lines.append(f"sync: {sync}")
    (repo / ".cobuilder" / "tracker.yaml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return repo


def mark_dirty(repo: Path) -> None:
    (repo / RUNTIME).mkdir(parents=True, exist_ok=True)
    (repo / DIRTY).write_text("1", encoding="utf-8")


def status(repo: Path) -> dict[str, Any]:
    return json.loads((repo / STATUS).read_text(encoding="utf-8"))


def beads_config(tmp_path: Path, sync: str | None) -> Path:
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True, exist_ok=True)
    config.write_text("adapter: beads\n" + (f"sync: {sync}\n" if sync else ""), encoding="utf-8")
    return config


def async_adapter(repo: Path, runner: Any, spawner: Any, mode: str = "async") -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner, sync=mode, spawner=spawner, repo_root=repo)


def probe() -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(id="demo-probe", kind="slice", parent=None, blocked_by=(), lifecycle="open",
                         assignee=None, envelope={}, external_ref=None)
