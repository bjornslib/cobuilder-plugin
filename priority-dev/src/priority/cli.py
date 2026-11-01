"""The priority command line interface."""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.digest_store import load_digest, save_digest
from priority.replay import options

PREDICTION_FIELDS = ("status", "needs_human", "priority", "steps", "abstain")


def interpret(transcript: Path, stop: int | None, log_dir: Path | None) -> int:
    """Build the brief, run the interpreter, and print the Prediction fields as one JSON object.

    An Abstain also exits with 0."""
    from priority import interpreter  # a lazy import: only this command needs dspy and the key

    brief = build_brief(transcript, stop=stop, previous=load_digest(log_dir, transcript.stem))
    if isinstance(brief, StopBrief):
        result = interpreter.Interpreter(interpreter.interpreter_lm(), log_dir=log_dir,
                                         session_id=transcript.stem)(brief_text=brief.for_model())
        fields = {name: result[name] for name in PREDICTION_FIELDS}
    else:
        abstain = {"reason": brief.reason, "detail": brief.detail, "raw": ""}
        fields = {"status": None, "needs_human": None, "priority": None, "steps": [], "abstain": abstain}
    print(json.dumps(fields, indent=2))
    return 0


def digest(transcript: Path, stop: int | None, log_dir: Path | None) -> int:
    """Build the brief with the digest model as the shrink model, digest it, and print one JSON object."""
    from priority import interpreter  # a lazy import: only this command needs dspy and the key

    lm = interpreter.digest_lm()
    brief = build_brief(transcript, stop=stop, shrink_lm=lm, log_dir=log_dir)
    if isinstance(brief, StopBrief):
        result = interpreter.DigestRun(lm, log_dir=log_dir)(brief)
        if log_dir is not None and isinstance(result, interpreter.RunDigest):
            save_digest(log_dir, transcript.stem, result)
    else:
        result = interpreter.Abstain(reason=brief.reason, detail=brief.detail)
    print(result.model_dump_json(indent=2))
    return 0


def fixtures_check(args: argparse.Namespace) -> int:
    """Check the labelled fixture set: labels, split, manifest cover, git ignore."""
    from priority.evaluation import check

    return check.run(args.manifest, args.labels, args.real_dir)


def eval_split(args: argparse.Namespace) -> int:
    """Score one split of the labelled set against the interpreter."""
    from priority.evaluation import runner  # a lazy import: only this command needs dspy and the key

    threads = getattr(args, "threads", None)
    if threads is not None:
        threads = max(1, min(int(threads), runner.MAX_THREADS))
    return runner.run(args.manifest, args.labels, args.real_dir, args.split, args.log_dir,
                      program=args.program, threads=threads)


def optimise_run(args: argparse.Namespace) -> int:
    """Compile the interpreter with one optimiser, or give it labelled demos, on train sessions only."""
    from priority import optimise  # a lazy import: only this command needs dspy

    return optimise.run(args.manifest, args.labels, args.real_dir,
                        args.optimiser, args.budget, args.seed,
                        minibatch=getattr(args, "minibatch", None),
                        threads=getattr(args, "threads", None),
                        val_sessions=getattr(args, "val_sessions", 1),
                        seed_program=getattr(args, "seed_program", None),
                        tag=getattr(args, "tag", None))


def judge_check(args: argparse.Namespace) -> int:
    """Measure the judge against the human picks, the closed-field probe, and repeat flips."""
    from priority.evaluation import judge_check as check  # a lazy import: only this command needs dspy

    return check.run(args.pairs, args.labels, args.real_dir, args.repeats)


def replay(args: argparse.Namespace) -> int:
    """Replay each transcript of a folder, and write the report. Each model error ends as an Abstain."""
    from priority.replay import runner  # a lazy import: only this command needs dspy and the key

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    return runner.run(args.fixtures, args.out, args.log_dir or args.out, args.adapters, args.concurrency, args.goal)


def main(argv: list[str] | None = None) -> int:
    """Run the priority CLI."""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="priority", description="priority.dev CLI")
    subparsers = parser.add_subparsers(dest="command")

    brief_parser = subparsers.add_parser("brief", help="Build a stop brief from a transcript")
    brief_parser.add_argument("transcript", type=Path, help="Path to transcript JSONL")
    brief_parser.add_argument("--stop", type=int, default=None, help="1-based stop number")

    for name, text in (("interpret", "Interpret a stop of a transcript"), ("digest", "Digest a stop of a transcript")):
        model_parser = subparsers.add_parser(name, help=text)
        model_parser.add_argument("transcript", type=Path, help="Path to transcript JSONL")
        model_parser.add_argument("--stop", type=int, default=None, help="1-based stop number")
        model_parser.add_argument("--log-dir", type=Path, default=None, help="Folder for calls.jsonl and digests")

    replay_parser = subparsers.add_parser("replay", help="Replay the last stop of each transcript of a folder")
    replay_parser.add_argument("fixtures", type=Path, help="Folder with the transcripts (*.jsonl, at any depth)")
    replay_parser.add_argument("--out", type=Path, default=options.DEFAULT_OUT, help="Folder for report.md and results.jsonl")
    replay_parser.add_argument("--log-dir", type=Path, default=None, help="Folder for the call rows (default: --out)")
    replay_parser.add_argument("--adapters", type=options.parse_adapters, default=options.ADAPTERS,
                               help="Adapters in report order (default: json,chat)")
    replay_parser.add_argument("--concurrency", type=options.positive_int, default=options.DEFAULT_CONCURRENCY,
                               help="Stops in flight at once on the interpreter model (default: 5)")
    replay_parser.add_argument("--goal", type=Path, default=options.DEFAULT_GOAL, help="goal.json with the abort_if list")

    fixtures_parser = subparsers.add_parser("fixtures", help="Work with the labelled fixture set")
    fixtures_sub = fixtures_parser.add_subparsers(dest="fixtures_command")
    check_parser = fixtures_sub.add_parser("check", help="Verify the labels, the split, and the git ignore")
    check_parser.add_argument("--manifest", type=Path, default=Path("fixtures/set-manifest.json"),
                              help="Manifest with session ids and stop numbers")
    check_parser.add_argument("--labels", type=Path, default=Path("fixtures/real/labels-confirmed.json"),
                              help="Confirmed labels file")
    check_parser.add_argument("--real-dir", type=Path, default=Path("fixtures/real"),
                              help="Folder with the real sessions, must be Git-ignored")
    eval_parser = subparsers.add_parser("eval", help="Score one split of the labelled set")
    eval_parser.add_argument("--split", default="train", choices=("train", "holdout"),
                             help="The split to score (default: train)")
    eval_parser.add_argument("--manifest", type=Path, default=Path("fixtures/set-manifest.json"),
                             help="Manifest with session ids and stop numbers")
    eval_parser.add_argument("--labels", type=Path, default=Path("fixtures/real/labels-confirmed.json"),
                             help="Confirmed labels file")
    eval_parser.add_argument("--real-dir", type=Path, default=Path("fixtures/real"),
                             help="Folder with the real sessions, must be Git-ignored")
    eval_parser.add_argument("--log-dir", type=Path, default=Path("reports/logs"),
                             help="Folder for the stored call rows (default: reports/logs)")
    eval_parser.add_argument("--program", type=Path, default=None,
                             help="A saved program to load before scoring. Its demo stops are not scored")
    eval_parser.add_argument("--threads", type=int, default=None,
                             help="Stops scored in flight at once, clamped to 1..6 (default: 1)")
    optimise_parser = subparsers.add_parser("optimise", help="Compile the interpreter on the train sessions")
    optimise_parser.add_argument("--optimiser", default="gepa", choices=("gepa", "miprov2", "bootstrap", "labeled"),
                                 help="The optimiser to compile with, or labeled for picked demos (default: gepa)")
    optimise_parser.add_argument("--budget", type=int, default=5,
                                 help="The optimiser candidate budget (default: 5)")
    optimise_parser.add_argument("--seed", type=int, default=7,
                                 help="The optimiser seed (default: 7)")
    optimise_parser.add_argument("--minibatch", type=int, default=None,
                                 help="GEPA reflection minibatch size (default: GEPA's own default)")
    optimise_parser.add_argument("--threads", type=int, default=None,
                                 help="GEPA threads (default: GEPA's own default)")
    optimise_parser.add_argument("--val-sessions", type=int, default=1,
                                 help="Train sessions carved as the GEPA valset (default: 1)")
    optimise_parser.add_argument("--manifest", type=Path, default=Path("fixtures/set-manifest.json"),
                                 help="Manifest with session ids and stop numbers")
    optimise_parser.add_argument("--labels", type=Path, default=Path("fixtures/real/labels-confirmed.json"),
                                 help="Confirmed labels file")
    optimise_parser.add_argument("--real-dir", type=Path, default=Path("fixtures/real"),
                                 help="Folder with the real sessions, must be Git-ignored")
    optimise_parser.add_argument("--seed-program", type=Path, default=None,
                                 help="A saved program file to load as the compile student")
    optimise_parser.add_argument("--tag", default=None,
                                 help="Text inserted into the saved program name, as <optimiser>-<tag>-budget... (default: none)")
    judge_check_parser = subparsers.add_parser("judge-check", help="Measure the judge against the agreement bar")
    judge_check_parser.add_argument("--pairs", type=Path, required=True,
                                    help="Pairs file: two payload lists per stop and the human pick")
    judge_check_parser.add_argument("--labels", type=Path, default=Path("fixtures/real/labels-confirmed.json"),
                                    help="Confirmed labels file with the reference payloads")
    judge_check_parser.add_argument("--real-dir", type=Path, default=Path("fixtures/real"),
                                    help="Folder with the real sessions, must be Git-ignored")
    judge_check_parser.add_argument("--repeats", type=int, default=2,
                                    help="Judge calls per side of each pair (default: 2)")

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
    if args.command == "digest":
        return digest(args.transcript, args.stop, args.log_dir)

    if args.command == "replay":
        return replay(args)
    if args.command == "eval":
        return eval_split(args)
    if args.command == "optimise":
        return optimise_run(args)
    if args.command == "judge-check":
        return judge_check(args)

    if args.command == "fixtures" and args.fixtures_command == "check":
        return fixtures_check(args)


    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
