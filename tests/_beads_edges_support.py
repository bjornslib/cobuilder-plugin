"""Shared helpers for the E7-3 edge tests. Not a test module.

The fixtures are tests/fixtures/tracker/plans-edges. `pair` holds two epics and three slices.
`chain` holds three epics, a plan with the epic headers in reverse order, and two designs with no plan.
`EdgeRunner` plays bd over rows that keep their parent, their dependencies, and their status.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_mapping_seed_support import WriteRunner
from _beads_mapping_support import flag_value

EDGES = support.FIXTURE_DIR / "plans-edges"
PAIR = EDGES / "pair" / "plans"
CHAIN = EDGES / "chain" / "plans"


class EdgeRunner(WriteRunner):
    """A WriteRunner whose rows keep dependencies and status, so a later read shows each edge."""

    def run(self, args: list[str]) -> str:
        if args[:2] == ["dep", "add"]:
            row = next(r for r in self.rows if r["id"] == args[2])
            row.setdefault("dependencies", []).append(
                {"issue_id": args[2], "depends_on_id": args[3], "type": flag_value(args, "--type") or "blocks"}
            )
        elif args[0] == "close":
            next(r for r in self.rows if r["id"] == args[1])["status"] = "closed"
        elif args[0] == "update" and "--status" in args:
            next(r for r in self.rows if r["id"] == args[1])["status"] = flag_value(args, "--status")
        return super().run(args)

    def cb_of(self, bd_id: str) -> str:
        return next(r for r in self.rows if r["id"] == bd_id)["metadata"]["cb"]["id"]

    def trace(self) -> list[tuple[str, ...]]:
        """The creates and the dep adds in call order, by cb id: ("create", id) and ("dep", later, earlier)."""
        steps: list[tuple[str, ...]] = []
        for call in self.calls:
            if call[0] == "create":
                steps.append(("create", json.loads(flag_value(call, "--metadata"))["cb"]["id"]))
            elif call[:2] == ["dep", "add"]:
                steps.append(("dep", self.cb_of(call[2]), self.cb_of(call[3])))
        return steps

    def dep_adds(self) -> list[list[str]]:
        return [call for call in self.calls if call[:2] == ["dep", "add"]]

    def verbs(self, verb: str) -> int:
        return sum(1 for call in self.calls if call[0] == verb)


def files_records(plans: Path) -> dict[str, Any]:
    from tracker_port.files import FilesAdapter

    return {record.id: record for record in FilesAdapter(plans).all_records()}


def seed(plans: Path, runner: EdgeRunner | None = None) -> EdgeRunner:
    from tracker_port.beads import BeadsAdapter

    runner = runner or EdgeRunner([])
    BeadsAdapter(runner).seed_from_files(plans)
    return runner


def transcript_trace(name: str) -> list[tuple[str, ...]]:
    """The creates and the dep adds of a recorded seed, by external ref. The recorded ref is the cb id."""
    recorded = support.steps(name)
    ref_of: dict[str, str] = {}
    trace: list[tuple[str, ...]] = []
    last_created = ""
    for step in recorded:
        args = step["args"]
        if args[0] == "create":
            last_created = flag_value(args, "--external-ref") or ""
            ref_of[step["stdout"].strip()] = last_created
            trace.append(("create", last_created))
        elif args[:2] == ["dep", "add"]:
            trace.append(("dep", ref_of[args[2]], ref_of[args[3]]))
    return trace


def projector_frontier(records: list[Any]) -> set[str]:
    """The ids of the ready slices that the projector output implies.

    A slice is ready when it is open, each blocker is closed, and each ancestor is open, not deferred,
    and held up by no open blocker. A program or an epic follows the same rule.
    """
    from tracker_port.projector import project

    entities = project(records)["entities"]

    def clear(entity_id: str) -> bool:
        entity = entities[entity_id]
        if entity["lifecycle"] == "closed" or "deferred" in entity["envelope"]:
            return False
        return all(entities[b]["lifecycle"] == "closed" for b in entity["blocked_by"] if b in entities)

    def ancestors_clear(entity: dict[str, Any]) -> bool:
        parent = entity["parent"]
        return parent is None or parent not in entities or (
            entities[parent]["lifecycle"] != "closed" and clear(parent) and ancestors_clear(entities[parent])
        )

    return {
        entity["id"]
        for entity in entities.values()
        if entity["kind"] == "slice" and entity["lifecycle"] == "open" and clear(entity["id"]) and ancestors_clear(entity)
    }
