"""The sync worker. It holds the lock, syncs while the dirty flag is set, and exits.

The worker is short-lived. It stops when the flag stays clear, and it stops at the first failed sync.
The failure stays in the status file, and the flag stays set, so the next write or the SessionEnd flush retries.
"""

from __future__ import annotations

import fcntl
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .port import AdapterError
from .sync_state import is_dirty, runtime_dir, sync_once


def run(repo_root: Path, adapter_factory: Callable[[], Any]) -> None:
    with open(runtime_dir(repo_root) / "sync-lock", "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return  # another worker runs and will see the flag
        adapter = None
        while is_dirty(repo_root):
            adapter = adapter or adapter_factory()
            try:
                sync_once(repo_root, adapter)
            except AdapterError:
                return
