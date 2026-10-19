"""The operation table of the tracker command line: each name maps to its argument builder and its port call."""

from __future__ import annotations

import argparse
from collections.abc import Callable
from pathlib import Path
from typing import Any

from _bundle_meta import DESIGN_STAGES

from .port import ArgumentError


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
    parser.add_argument("--kind", default="slice", choices=["program", "epic", "slice"])
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
    parser.add_argument(
        "--refresh-envelope",
        action="store_true",
        help="rewrite the file-derived envelope keys on records the adapter already holds",
    )


def _regenerate_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("program")
    parser.add_argument("--plans-dir", type=Path, required=True, help="the plans tree that holds the program's status files")


def _design_stage(stage: str) -> str:
    if stage not in DESIGN_STAGES:
        raise ArgumentError(f"stage {stage!r} is not a design stage. Use one of: {', '.join(DESIGN_STAGES)}")
    return stage


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
    "set-program-stage": (_set_program_stage_args, lambda a, n: a.set_program_stage(n.program, _design_stage(n.stage))),
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
    "seed-from-files": (
        _seed_args,
        lambda a, n: a.seed_from_files(n.plans_dir, dry_run=n.dry_run, refresh_envelope=n.refresh_envelope),
    ),
    "regenerate-status-files": (
        _regenerate_args,
        lambda a, n: [str(path) for path in a.regenerate_status_files(n.program, n.plans_dir)],
    ),
    "capabilities": (_no_args, lambda a, n: a.capabilities),
    "doctor": (_no_args, lambda a, n: {"adapter": a.name, "capabilities": a.capabilities}),
}
