# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""SessionEnd hook that runs one last tracker sync when the sync is pending or the last sync failed.

The script reads the hook payload from stdin and takes the working folder from its "cwd" key. It acts only
when tracker.yaml sets `sync: async`. It runs `tracker.py sync` in the foreground, with a 55 second limit
that fits the 60 second hook timeout in hooks.json. It never calls bd itself, uses no network, and always
exits with 0.
"""
from __future__ import annotations

import subprocess
import sys

import tracker_sync_common as common

LIMIT_SECONDS = 55


def main() -> int:
    try:
        cwd = common.read_payload_cwd()
        if common.sync_mode(cwd) == "async" and (common.is_dirty(cwd) or common.last_sync_failed(cwd)):
            common.run_tracker(cwd, "sync", detached=False, timeout=LIMIT_SECONDS)
    except (OSError, subprocess.SubprocessError):  # a hook never blocks the session end
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
