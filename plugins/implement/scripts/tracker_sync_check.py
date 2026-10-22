# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Stop hook that starts the tracker sync worker when a write left the sync pending.

The script reads the hook payload from stdin and takes the working folder from its "cwd" key. It acts only
when tracker.yaml sets `sync: async`, the dirty flag exists, and no worker holds the lock. It then starts
`tracker.py sync-worker` detached. It never calls bd, uses no network, and always exits with 0.
"""
from __future__ import annotations

import sys

import tracker_sync_common as common


def main() -> int:
    try:
        cwd = common.read_payload_cwd()
        if common.sync_mode(cwd) == "async" and common.is_dirty(cwd) and not common.lock_held(cwd):
            common.run_tracker(cwd, "sync-worker", detached=True)
    except OSError:  # a hook never blocks the session
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
