"""Read program, epic, and slice records for the gates and the builds view.

Every read goes through the tracker port. The files adapter reads
docs/plans itself. The other adapters read their own store.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .config import load_adapter
from .files import FilesAdapter
from .projector import _score_text
from .record import TrackerRecord


@dataclass
class PlanRecords:
    """One plan's records. `from_files` is True when docs/plans is the store."""

    program: TrackerRecord | None
    epics: list[TrackerRecord] = field(default_factory=list)
    slices: list[TrackerRecord] = field(default_factory=list)
    conflicts: list[dict] = field(default_factory=list)
    from_files: bool = False


def open_adapter(repo_root: Path):
    """The configured adapter, else the files adapter over docs/plans, else None."""
    adapter = load_adapter(repo_root / ".cobuilder" / "tracker.yaml", repo_root)
    if adapter is not None:
        return adapter
    plans = repo_root / "docs" / "plans"
    return FilesAdapter(plans) if plans.is_dir() else None


def _all_records(adapter) -> tuple[list[TrackerRecord], list[dict]]:
    if isinstance(adapter, FilesAdapter):
        return adapter.all_records(), list(adapter.conflicts)
    return adapter.list_programs() + adapter.list_epics() + adapter.list_slices(), []


def slice_records(repo_root: Path) -> tuple[list[TrackerRecord], list[dict]]:
    """Every slice record in the repo, and the plan conflicts the files adapter found."""
    adapter = open_adapter(repo_root)
    if adapter is None:
        return [], []
    if isinstance(adapter, FilesAdapter):
        records = adapter.all_records()
        return [r for r in records if r.kind == "slice"], list(adapter.conflicts)
    return adapter.list_slices(), []


def epic_records(repo_root: Path) -> dict[str, TrackerRecord]:
    """Every epic record in the repo, keyed by its design-qualified epic key."""
    adapter = open_adapter(repo_root)
    if adapter is None:
        return {}
    records, _ = _all_records(adapter)
    return {epic_key(r.parent or "", r.id): r for r in records if r.kind == "epic"}


def plan_records(repo_root: Path, plan: str) -> PlanRecords:
    """The program, epic, and slice records of one plan, with its conflicts."""
    adapter = open_adapter(repo_root)
    if adapter is None:
        return PlanRecords(program=None, from_files=True)
    records, conflicts = _all_records(adapter)
    program = next((r for r in records if r.kind == "program" and r.id == plan), None)
    epics = [r for r in records if r.kind == "epic" and r.parent == plan]
    epic_ids = {r.id for r in epics}
    slices = sorted(
        (r for r in records
         if r.kind == "slice" and (r.parent in epic_ids or r.id.startswith(f"{plan}/"))),
        key=lambda r: slice_row(r, plan)["n"],
    )
    return PlanRecords(
        program=program,
        epics=epics,
        slices=slices,
        conflicts=[c for c in conflicts if c["plan"] == plan],
        from_files=isinstance(adapter, FilesAdapter),
    )


def slice_row(record: TrackerRecord, plan: str, from_files: bool = False) -> dict:
    """The gate row shape: `n`, `epic_id`, `name`, `score`, `state`.

    `n` comes from the envelope, else the trailing number of the id. A
    non-files adapter names epics `<plan>-<local id>`, so the plan prefix goes.
    The name loses its markdown bold. The score reads as the index reads it.
    """
    env = record.envelope
    number = env.get("n")
    if number is None:
        number = int(re.search(r"(\d+)$", record.id).group(1))
    epic_id = record.parent or ""
    if not from_files and epic_id.startswith(f"{plan}-"):
        epic_id = epic_id[len(plan) + 1:]
    score = env.get("score")
    attempts = env.get("attempts")
    score_text = _score_text(score)
    if score is not None and attempts:
        score_text += f" (attempt {attempts})"
    name = env.get("title") or record.id
    return {
        "n": int(number),
        "epic_id": epic_id,
        "name": re.sub(r"\*\*(.+?)\*\*", r"\1", name),
        "score": score_text,
        "state": "completed" if record.lifecycle == "closed" else "pending",
    }


def epic_key(plan: str, value: str) -> str:
    """The design-qualified epic key, such as `beads-storage/E1`.

    A parent id with a slash keeps its written form. `<plan>-E1` and a bare
    `E1` take the plan as their design. The join looks epics up by this key.
    """
    if "/" in value:
        return value
    if value.startswith(f"{plan}-"):
        value = value[len(plan) + 1:]
    return f"{plan}/{value}"
