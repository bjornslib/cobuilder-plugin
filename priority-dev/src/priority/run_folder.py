"""The log folder of one run. A stopped run removes its folder, and a model call still in flight must not bring it back.

A DSPy thread pool can outlive the exception that stops a run, so a worker can write a log row after the
folder is gone. `discard` closes the folder under the same lock as `append`, so no row lands after it.
"""
from __future__ import annotations

import shutil
import threading
from pathlib import Path

_LOCK = threading.Lock()  # every run folder shares one lock: an append and a discard never overlap


class RunFolder:
    """A run's log folder. `append` writes text to a file in it. After `discard`, `append` writes nothing."""

    def __init__(self, path: Path | str):
        self.path = Path(path)
        self.existed_before = self.path.exists()
        self._closed = False

    def __copy__(self) -> RunFolder:
        return self  # a copy of the handle shares the closed flag, so GEPA's deep copies cannot write after discard

    def __deepcopy__(self, memo: dict) -> RunFolder:
        return self

    def append(self, name: str, text: str) -> None:
        """Append text to the file `name`, and create the folder first when it is missing."""
        with _LOCK:
            if self._closed:
                return
            self.path.mkdir(parents=True, exist_ok=True)
            with (self.path / name).open("a") as handle:
                handle.write(text)

    def discard(self) -> None:
        """Close the folder. Remove it when this run created it; a folder that was there before stays."""
        with _LOCK:
            self._closed = True
            if not self.existed_before and self.path.exists():
                shutil.rmtree(self.path)
