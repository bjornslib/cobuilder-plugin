"""The priority command line interface."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from priority.brief import StopBrief, build_brief


def interpret(transcript: Path, stop: int | None, log_dir: Path | None) -> int:
    """Build the brief, run the interpreter, and print one JSON object. An Abstain also exits with 0."""
    from priority import interpreter  # a lazy import: only this command needs dspy and the key

    brief = build_brief(transcript, stop=stop)
    if isinstance(brief, StopBrief):
        result = interpreter.Interpreter(interpreter.interpreter_lm(), log_dir=log_dir,
                                         session_id=transcript.stem)(brief)
    else:
        result = interpreter.Interpretation(brief_id="", abstained=interpreter.Abstain(
            reason=brief.reason, detail=brief.detail))
    print(result.model_dump_json(indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    """Run the priority CLI."""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="priority", description="priority.dev CLI")
    subparsers = parser.add_subparsers(dest="command")

    brief_parser = subparsers.add_parser("brief", help="Build a stop brief from a transcript")
    brief_parser.add_argument("transcript", type=Path, help="Path to transcript JSONL")
    brief_parser.add_argument("--stop", type=int, default=None, help="1-based stop number")

    interpret_parser = subparsers.add_parser("interpret", help="Interpret a stop of a transcript")
    interpret_parser.add_argument("transcript", type=Path, help="Path to transcript JSONL")
    interpret_parser.add_argument("--stop", type=int, default=None, help="1-based stop number")
    interpret_parser.add_argument("--log-dir", type=Path, default=None, help="Folder for calls.jsonl")

    args = parser.parse_args(argv)
    if args.command == "brief":
        res = build_brief(args.transcript, stop=args.stop)
        if isinstance(res, StopBrief):
            print(res.for_model())
        else:
            print(res.reason)
        return 0
    if args.command == "interpret":
        return interpret(args.transcript, args.stop, args.log_dir)

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
