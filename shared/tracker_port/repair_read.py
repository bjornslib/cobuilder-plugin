"""The evidence for repair-status: legacy design stages and merged pull requests. Reads only."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from _bundle_meta import DESIGN_STAGES

from .plan_texts import goal_of
from .port import ArgumentError
from .record import TrackerRecord
from .repair_status import plan_repair


def repair_plan(records: list[TrackerRecord], plans_dir: Path | None, index: Path | None) -> dict[str, Any]:
    """Plan the repair from one record list and the evidence it names. Writes nothing."""
    plan = plan_repair(records, read_legacy_stages(plans_dir), read_merged_epics(records, index))
    plan["checked"] = {"stage": True, "pr_records": True, "index": index is not None}
    return plan


def read_legacy_stages(plans_dir: Path | None) -> dict[str, str]:
    """Map each design to the stage in its legacy goal.json. Empty without a plans folder."""
    if plans_dir is None:
        return {}
    designs = plans_dir.parent / "architecture" / "designs"
    if not designs.is_dir():
        return {}
    stages: dict[str, str] = {}
    for design in sorted(designs.iterdir()):
        goal = goal_of(plans_dir, design.name) if design.is_dir() else None
        stage = goal.get("stage") if goal else None
        if stage in DESIGN_STAGES:
            stages[design.name] = stage
    return stages


def read_merged_epics(records: list[TrackerRecord], index: Path | None) -> set[str]:
    """Name the epics with merged pull request evidence: closed pr records, then the index."""
    merged = {
        epic
        for record in records
        if record.kind == "pr" and record.lifecycle == "closed"
        for epic in record.tracks
    }
    if index is not None:
        merged |= _index_merged(index)
    return merged


def _index_merged(index: Path) -> set[str]:
    if not index.is_file():
        raise ArgumentError(f"no index file at {index}")
    try:
        epic_status = json.loads(index.read_text(encoding="utf-8"))["joins"]["epic_status"]
    except (ValueError, KeyError, TypeError) as exc:
        raise ArgumentError(f"index file {index} has no joins.epic_status: {exc}") from exc
    return {epic for epic, status in epic_status.items() if status == "merged"}
