#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["ulid-py>=1.0"]
# ///
"""Watch the feedback ledger for new lines.

Blocks until the ledger grows past the given offset, prints new lines as JSONL,
and exits with:
- 0 when new lines were found and printed
- 2 when timeout expires with no new lines

Usage:
    uv run watch_feedback.py --bundle-dir <path> --since 0 --timeout 60
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
from ledger import LedgerPaths, watch_feedback  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle-dir", required=True, help="Bundle directory containing the ledger")
    parser.add_argument("--since", type=int, default=0, help="Offset to watch from (number of lines already seen)")
    parser.add_argument("--timeout", type=float, default=30.0, help="Seconds to wait before timing out")
    args = parser.parse_args()

    bundle_dir = Path(args.bundle_dir).resolve()
    paths = LedgerPaths(bundle_dir)

    new_lines, new_offset = watch_feedback(paths.ledger, args.since, args.timeout)

    if new_lines:
        for line in new_lines:
            print(json.dumps(line, ensure_ascii=False, separators=(",", ":")))
        sys.exit(0)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()