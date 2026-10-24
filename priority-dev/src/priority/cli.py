"""The priority command line interface."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from priority.brief import StopBrief, build_brief


def main(argv: list[str] | None = None) -> int:
    """Run the priority CLI."""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="priority", description="priority.dev CLI")
    subparsers = parser.add_subparsers(dest="command")

    brief_parser = subparsers.add_parser("brief", help="Build a stop brief from a transcript")
    brief_parser.add_argument("transcript", type=Path, help="Path to transcript JSONL")
    brief_parser.add_argument("--stop", type=int, default=None, help="1-based stop number")

    args = parser.parse_args(argv)
    if args.command == "brief":
        res = build_brief(args.transcript, stop=args.stop)
        if isinstance(res, StopBrief):
            print(res.for_model())
        else:
            print(res.reason)
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
