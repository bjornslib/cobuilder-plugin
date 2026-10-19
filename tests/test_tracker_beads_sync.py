"""E2 slice 6: the beads sync, the fresh clone, and the dolt push order.

The fresh-clone test calls real bd, only in a temp directory.

Run with: uv run pytest tests/test_tracker_beads_sync.py -q
"""
from __future__ import annotations

from collections import Counter
import json
import tempfile
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_support import BEADS_DIR, FIXTURE_DIR

_run = support.run
_scratch_tracker = support.scratch_tracker


class _RecordingRunner:
    """Wraps a real BdRunner and keeps each argument list it runs."""

    def __init__(self, inner: Any) -> None:
        self.inner = inner
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        return self.inner.run(args)


def _clone_cbs(root: Path, origin: Path, name: str) -> list[dict[str, Any]]:
    """Clone the origin, sync bd, and return the cb block of every listed row."""
    clone = root / name
    _run(["git", "clone", "-q", str(origin), str(clone)], root)
    _run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], clone)
    _run(["bd", "sync"], clone)
    listed = _run(["bd", "list", "--json", "--all"], clone)
    return [row["metadata"]["cb"] for row in json.loads(listed.stdout)]


def test_fresh_clone_inits_and_syncs() -> None:
    support.require_bd()

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter
    from tracker_port.projector import project

    plan_dir = FIXTURE_DIR / "plans"
    expected = FilesAdapter(plan_dir).all_records()
    expected_ids = sorted(record.id for record in expected)
    expected_kinds = Counter(entity["kind"] for entity in project(expected)["entities"].values())

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        origin = root / "origin.git"
        seed = _scratch_tracker(root)

        seed_runner = _RecordingRunner(BdRunner(bd="bd", cwd=seed))
        created = BeadsAdapter(seed_runner).seed_from_files(plan_dir)
        assert sorted(record.id for record in created) == expected_ids

        _run(["git", "-C", str(origin), "show-ref", "refs/dolt/data"], root)

        second_runner = _RecordingRunner(BdRunner(bd="bd", cwd=seed))
        assert BeadsAdapter(second_runner).seed_from_files(plan_dir) == []
        assert not [call for call in second_runner.calls if call[:1] == ["create"]]

        for name in ("clone1", "clone2"):
            cbs = _clone_cbs(root, origin, name)
            assert sorted(cb["id"] for cb in cbs) == expected_ids
            assert Counter(cb["kind"] for cb in cbs) == expected_kinds

        from tracker_port.record import TrackerRecord

        template = next(record for record in expected if record.kind == "slice")
        probe = TrackerRecord(
            id="demo-sync-probe",
            kind="slice",
            parent=template.parent,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=None,
        )
        BeadsAdapter(seed_runner).create_record(probe)

        cbs = _clone_cbs(root, origin, "clone3")
        assert sorted(cb["id"] for cb in cbs) == sorted([*expected_ids, "demo-sync-probe"])


def test_sync_first_publish_pushes_dolt_then_syncs_again() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = json.loads((BEADS_DIR / "transcripts" / "dolt_push_first_publish_steps.json").read_text(encoding="utf-8"))["steps"]
    runner = support.SequenceRunner(steps)
    BeadsAdapter(runner).sync()

    assert runner.calls == [["sync"], ["dolt", "push"], ["sync"]]


def test_sync_second_step_failure_raises_adapter_error() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = [
        {"args": ["sync"], "stdout": "", "stderr": "Error: no branches found in remote 'origin'\n", "exit": 1},
        {"args": ["dolt", "push"], "stdout": "", "stderr": "Error: push rejected\n", "exit": 1},
    ]
    runner = support.SequenceRunner(steps)
    try:
        BeadsAdapter(runner).sync()
    except AdapterError:
        assert runner.calls == [["sync"], ["dolt", "push"]]
        return
    raise AssertionError("a failed dolt push must raise AdapterError")


def test_sync_failure_on_a_non_empty_remote_does_not_push() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = [{"args": ["sync"], "stdout": "", "stderr": "bd: sync conflict on beads/team-sync\n", "exit": 1}]
    runner = support.SequenceRunner(steps)
    try:
        BeadsAdapter(runner).sync()
    except AdapterError:
        assert runner.calls == [["sync"]]
        return
    raise AssertionError("a sync failure without the empty-remote message must raise AdapterError")
