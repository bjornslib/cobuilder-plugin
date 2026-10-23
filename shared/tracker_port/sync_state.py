"""The runtime files of the async tracker sync: the dirty flag, the worker lock, the status, and the spawner.

All files sit in `.cobuilder/` of the repo with a `sync-` prefix. The line `sync-*` in `.cobuilder/.gitignore` keeps them out of git.
"""

from __future__ import annotations

import fcntl
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .port import AdapterError

SYNC_MODES = ("write", "async", "off")
TRACKER_CLI = Path(__file__).resolve().parent.parent / "tracker.py"


def runtime_dir(repo_root: Path) -> Path:
    """Return `.cobuilder/` and make sure its .gitignore holds the line `sync-*` once."""
    folder = repo_root / ".cobuilder"
    folder.mkdir(parents=True, exist_ok=True)
    ignore = folder / ".gitignore"
    text = ignore.read_text(encoding="utf-8") if ignore.exists() else ""
    if "sync-*" not in text.splitlines():
        separator = "" if not text or text.endswith("\n") else "\n"
        ignore.write_text(f"{text}{separator}sync-*\n", encoding="utf-8")
    return folder


def _flag(repo_root: Path) -> Path:
    return repo_root / ".cobuilder" / "sync-dirty"


def mark_dirty(repo_root: Path) -> None:
    (runtime_dir(repo_root) / "sync-dirty").write_text("1", encoding="utf-8")


def is_dirty(repo_root: Path) -> bool:
    return _flag(repo_root).is_file()


def clear_dirty(repo_root: Path) -> None:
    _flag(repo_root).unlink(missing_ok=True)


def read_status(repo_root: Path) -> dict[str, Any] | None:
    try:
        body = json.loads((repo_root / ".cobuilder" / "sync-status.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return body if isinstance(body, dict) else None


def write_status(repo_root: Path, error: str | None) -> None:
    body = {"ok": error is None, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "error": error}
    target = runtime_dir(repo_root) / "sync-status.json"
    temp = target.with_suffix(".tmp")
    temp.write_text(json.dumps(body, sort_keys=True), encoding="utf-8")
    os.replace(temp, target)


def lock_held(repo_root: Path) -> bool:
    """Return True when a worker holds the lock. The probe takes the lock and frees it at once."""
    path = repo_root / ".cobuilder" / "sync-lock"
    if not path.exists():
        return False
    with open(path, "a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return True
    return False


def spawn_worker(repo_root: Path) -> None:
    """Start `tracker.py sync-worker` detached from the repo root. Its output goes to sync-worker.log."""
    with open(runtime_dir(repo_root) / "sync-worker.log", "ab") as log:
        try:
            subprocess.Popen(
                ["uv", "run", str(TRACKER_CLI), "sync-worker"],
                cwd=repo_root,
                stdin=subprocess.DEVNULL,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        except OSError as error:
            raise AdapterError(f"cannot start the sync worker: {error}") from error


def sync_once(repo_root: Path, adapter: Any) -> None:
    """Clear the flag, sync, and write the status. A failure sets the flag again and raises."""
    clear_dirty(repo_root)
    try:
        adapter.sync()
    except AdapterError as error:
        mark_dirty(repo_root)
        write_status(repo_root, str(error))
        raise
    write_status(repo_root, None)
