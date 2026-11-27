"""E8-37 on real bd: repair-status closes a design's epics once, then settles.

Run with: uv run pytest tests/test_tracker_repair_status_real.py -q -m ''
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

import _beads_support as support

pytestmark = pytest.mark.slow


class _OfflineSync(support.CountingRunner):
    """Counts each sync and skips it. A scratch tracker has no remote to publish to."""

    def run(self, args: list[str]) -> str:
        if args[0] == "sync":
            self.calls.append(list(args))
            return ""
        return super().run(args)


def _record(rid: str, kind: str, parent: str | None, envelope: dict[str, Any]) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id=rid, kind=kind, parent=parent, blocked_by=(), lifecycle="open", assignee=None,
        envelope=envelope, external_ref=None, title=rid,
    )


def _seed(root: Path) -> None:
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    runner = BdRunner(cwd=root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    adapter = BeadsAdapter(runner, sync="off")
    adapter.create_record(_record("d", "program", None, {"stage": "implemented"}))
    adapter.create_record(_record("d/E1", "epic", "d", {"state": "backlog"}))
    adapter.create_record(_record("d/E2", "epic", "d", {"state": "backlog"}))


def _pairs(plan: dict[str, Any]) -> set[tuple[str, str]]:
    return {(entry["id"], entry["action"]) for entry in plan["changes"]}


def test_repair_closes_once_then_settles(tmp_path: Path) -> None:
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    support.require_bd()
    _seed(tmp_path)
    runner = _OfflineSync(BdRunner(cwd=tmp_path))
    adapter = BeadsAdapter(runner, sync="write")

    dry = adapter.repair_status(dry_run=True)
    assert ("d/E1", "close") in _pairs(dry)
    assert runner.count("close") == 0
    assert runner.count("update") == 0
    assert runner.count("sync") == 0

    live = adapter.repair_status()
    assert _pairs(live) == _pairs(dry)
    closes = [call for call in runner.calls if call[0] == "close"]
    assert closes and all(call[-1] == "--force" for call in closes)
    assert runner.count("sync") == 1
    lifecycles = {record.id: record.lifecycle for record in adapter.all_records()}
    assert lifecycles["d/E1"] == "closed"
    assert lifecycles["d/E2"] == "closed"

    settled = adapter.repair_status()
    assert settled["changes"] == []
    assert runner.count("close") == len(closes)
    assert runner.count("sync") == 1
