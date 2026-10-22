"""Shared helpers for the in-progress and prepare tests. Not a test module.

The plans-inprogress fixture holds one plan, `running`, and four goal.json-only designs.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_support import FIXTURE_DIR

TREE = FIXTURE_DIR / "plans-inprogress"
PLANS_DIR = TREE / "plans"

# What the files say, per record id. Programs stay open.
EXPECTED = {
    "running": "open",
    "running/E1": "open",
    "running/1": "in_progress",
    "running/2": "in_progress",
    "running/3": "closed",
    "running/4": "open",
    "ip-hyphen": "open",
    "ip-hyphen/E1": "in_progress",
    "ip-space/E1": "in_progress",
    "ip-under/E1": "in_progress",
    "planned-only/E1": "open",
}
PROGRESS_CELL = re.compile(r"\| (?:In Progress|in_progress) \|")


def lifecycles(records: list[Any]) -> dict[str, str]:
    return {record.id: record.lifecycle for record in records}


def file_records(plans_dir: Path = PLANS_DIR) -> list[Any]:
    from tracker_port.files import FilesAdapter

    return FilesAdapter(plans_dir).all_records()


def copy_tree(root: Path, pending: bool = False) -> Path:
    """Copy the fixture under root. With pending, the two in-progress table cells say pending. Return the plans dir."""
    tree = root / "tree"
    shutil.copytree(TREE, tree)
    if pending:
        slices = tree / "plans" / "running" / "04-slices.md"
        slices.write_text(PROGRESS_CELL.sub("| pending |", slices.read_text(encoding="utf-8")), encoding="utf-8")
    return tree / "plans"


def beads_adapter(root: Path, runner_wrap: Any = None) -> Any:
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    runner = BdRunner(bd="bd", cwd=support.scratch_tracker(root))
    return BeadsAdapter(runner_wrap(runner) if runner_wrap else runner)

CountingRunner = support.CountingRunner
