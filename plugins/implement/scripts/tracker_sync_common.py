"""Shared helpers of the two tracker sync hooks. The hooks never call the tracker tool for a read.

They read the `sync` key of .cobuilder/tracker.yaml and the `sync-*` files in .cobuilder/. They use no network.
"""
from __future__ import annotations

import fcntl
import json
import os
import re
import subprocess
import sys

from tracker_reminder import payload_cwd

PLUGIN_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER = os.path.join(PLUGIN_ROOT, "shared", "tracker.py")


def read_payload_cwd() -> str:
    try:
        return payload_cwd(sys.stdin.read())
    except OSError:
        return os.getcwd()


def sync_mode(cwd: str) -> str | None:
    """Return the sync key of tracker.yaml, or None when the repo has no tracker config."""
    try:
        with open(os.path.join(cwd, ".cobuilder", "tracker.yaml"), encoding="utf-8") as handle:
            text = handle.read()
    except OSError:
        return None
    found = re.search(r"^sync:\s*[\"']?(\w+)", text, re.M)
    return found.group(1) if found else "write"


def runtime(cwd: str, name: str) -> str:
    return os.path.join(cwd, ".cobuilder", name)


def is_dirty(cwd: str) -> bool:
    return os.path.isfile(runtime(cwd, "sync-dirty"))


def last_sync_failed(cwd: str) -> bool:
    try:
        with open(runtime(cwd, "sync-status.json"), encoding="utf-8") as handle:
            body = json.load(handle)
    except (OSError, ValueError):
        return False
    return isinstance(body, dict) and body.get("ok") is False


def lock_held(cwd: str) -> bool:
    path = runtime(cwd, "sync-lock")
    if not os.path.exists(path):
        return False
    with open(path, "a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return True
    return False


def run_tracker(cwd: str, operation: str, detached: bool, timeout: float | None = None) -> None:
    """Run one tracker.py operation from the repo root, either detached or in the foreground."""
    argv = ["uv", "run", TRACKER, operation]
    if detached:
        os.makedirs(runtime(cwd, ""), exist_ok=True)
        with open(runtime(cwd, "sync-worker.log"), "ab") as log:
            subprocess.Popen(argv, cwd=cwd, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                             start_new_session=True)
    else:
        subprocess.run(argv, cwd=cwd, stdin=subprocess.DEVNULL, capture_output=True, timeout=timeout, check=False)
