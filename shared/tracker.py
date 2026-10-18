# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6,<7"]
# ///
"""Command line port for workflow state. Each subcommand calls the configured tracker adapter.

Exit codes: 0 ok, 2 refused (no adapter, nothing written), 3 adapter error, 4 bad arguments.
Stdout always carries one JSON object. Failures also write one message to stderr.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import sys
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from tracker_port.config import require_adapter
from tracker_port.port import AdapterError, ArgumentError, NoAdapterError

EXIT_OK = 0
EXIT_REFUSED = 2
EXIT_ADAPTER = 3
EXIT_ARGUMENT = 4

DEFAULT_CONFIG = Path(".cobuilder") / "tracker.yaml"


def _fail(code: int, message: str) -> None:
    print(json.dumps({"ok": False, "exit": code, "error": message}, sort_keys=True))
    print(message, file=sys.stderr)
    sys.exit(code)


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        _fail(EXIT_ARGUMENT, message)


def _to_json(value: Any) -> Any:
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {f.name: _to_json(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, Mapping):
        return {key: _to_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_json(item) for item in value]
    return value


def _no_args(parser: argparse.ArgumentParser) -> None:
    return None


def _id(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")


def _id_state(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")
    parser.add_argument("state")


def _list_epics_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--program")


def _list_slices_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--epic")


def _next_ready_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--kind", default="slice", choices=["program", "epic", "slice", "pr"])
    parser.add_argument("--under")


def _claim_slice_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")
    parser.add_argument("claimant")


def _set_program_stage_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("program")
    parser.add_argument("stage")


def _set_gate_value_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("program")
    parser.add_argument("gate")
    parser.add_argument("value")


def _set_epic_state_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("epic")
    parser.add_argument("state")
    parser.add_argument("--branch")


def _set_slice_state_args(parser: argparse.ArgumentParser) -> None:
    _id_state(parser)
    parser.add_argument("--score", type=float)
    parser.add_argument("--attempts", type=int)


def _record_attempt_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")
    parser.add_argument("score", type=float)
    parser.add_argument("--note")


def _add_note_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")
    parser.add_argument("text")


def _escalate_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("id")
    parser.add_argument("score", type=float)
    parser.add_argument("reason")


def _open_pull_request_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("ref")
    parser.add_argument("epic_ids", nargs="+")


def _set_pull_request_state_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("ref")
    parser.add_argument("state", choices=["merged", "open"])


def _seed_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("plans_dir", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="print the planned creates and write nothing")


# Each operation maps to its builder for arguments and to the port call it makes.
OPERATIONS: dict[str, tuple[Callable[[argparse.ArgumentParser], None], Callable[[Any, argparse.Namespace], Any]]] = {
    "list-programs": (_no_args, lambda a, n: a.list_programs()),
    "list-epics": (_list_epics_args, lambda a, n: a.list_epics(n.program)),
    "list-slices": (_list_slices_args, lambda a, n: a.list_slices(n.epic)),
    "list-pull-requests": (_no_args, lambda a, n: a.list_pull_requests()),
    "get-slice": (_id, lambda a, n: a.get_slice(n.id)),
    "next-ready": (_next_ready_args, lambda a, n: a.next_ready(n.kind, n.under)),
    "sync": (_no_args, lambda a, n: a.sync()),
    "claim-slice": (_claim_slice_args, lambda a, n: a.claim_slice(n.id, n.claimant)),
    "set-program-stage": (_set_program_stage_args, lambda a, n: a.set_program_stage(n.program, n.stage)),
    "set-gate-value": (_set_gate_value_args, lambda a, n: a.set_gate_value(n.program, n.gate, n.value)),
    "set-epic-state": (_set_epic_state_args, lambda a, n: a.set_epic_state(n.epic, n.state, n.branch)),
    "set-slice-state": (
        _set_slice_state_args,
        lambda a, n: a.set_slice_state(n.id, n.state, score=n.score, attempts=n.attempts),
    ),
    "record-attempt": (_record_attempt_args, lambda a, n: a.record_attempt(n.id, n.score, n.note)),
    "add-note": (_add_note_args, lambda a, n: a.add_note(n.id, n.text)),
    "escalate": (_escalate_args, lambda a, n: a.escalate(n.id, n.score, n.reason)),
    "open-pull-request": (_open_pull_request_args, lambda a, n: a.open_pull_request(n.ref, n.epic_ids)),
    "set-pull-request-state": (
        _set_pull_request_state_args,
        lambda a, n: a.set_pull_request_state(n.ref, merged=n.state == "merged"),
    ),
    "seed-from-files": (_seed_args, lambda a, n: a.seed_from_files(n.plans_dir, dry_run=n.dry_run)),
    "capabilities": (_no_args, lambda a, n: a.capabilities),
    "doctor": (_no_args, lambda a, n: {"adapter": a.name, "capabilities": a.capabilities}),
}


def _build_parser() -> argparse.ArgumentParser:
    parser = _Parser(prog="tracker.py", description="Read and write workflow state through the tracker port.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="path to tracker.yaml")
    parser.add_argument("--state-file", type=Path, help="state file for the fake adapter; overrides the config")
    subparsers = parser.add_subparsers(dest="operation", required=True, parser_class=_Parser)
    for name, (add_arguments, _call) in OPERATIONS.items():
        add_arguments(subparsers.add_parser(name))
    return parser


def main(argv: list[str] | None = None) -> int:
    namespace = _build_parser().parse_args(argv)
    _add_arguments, call = OPERATIONS[namespace.operation]
    try:
        adapter = require_adapter(namespace.config.resolve(), Path.cwd(), namespace.state_file)
        result = call(adapter, namespace)
    except NoAdapterError as exc:
        _fail(EXIT_REFUSED, str(exc))
    except ArgumentError as exc:
        _fail(EXIT_ARGUMENT, str(exc))
    except AdapterError as exc:
        _fail(EXIT_ADAPTER, str(exc))
    print(json.dumps({"ok": True, "result": _to_json(result)}, indent=2, sort_keys=True))
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
