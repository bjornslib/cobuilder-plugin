"""In-progress lifecycle on beads: create_record, the seed, and the seed repair, on real bd in a temp dir.

The transcript create_in_progress_steps.json holds real bd 1.3.0 answers. bd sets the status in
the one create call, through `--status in_progress`.

Run with: uv run pytest tests/test_tracker_beads_in_progress.py -q
"""
from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import _beads_support as support
import _inprogress_support as ip


def _probe(lifecycle: str) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id="demo-ip-probe", kind="slice", parent=None, blocked_by=(), lifecycle=lifecycle,
        assignee=None, envelope={}, external_ref=None,
    )


def _status_call(calls: list[list[str]]) -> list[str]:
    return next(call for call in calls if call[0] == "create")


def test_the_recorded_transcript_shows_one_create_call_with_status() -> None:
    step = next(s for s in support.steps("create_in_progress_steps") if "--status" in s["args"])

    assert step["args"][step["args"].index("--status") + 1] == "in_progress", step["args"]
    assert step["exit"] == 0, step
    assert not any(s["args"][0] == "update" for s in support.steps("create_in_progress_steps")), "one call is enough"


def test_create_record_sends_the_in_progress_status_to_bd_in_the_create_call() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.CreateAnswers()
    BeadsAdapter(runner).create_record(_probe("in_progress"))

    create = _status_call(runner.calls)
    assert "--status" in create, runner.calls
    assert create[create.index("--status") + 1] == "in_progress", create
    assert not any(call[0] in ("close", "update") for call in runner.calls), runner.calls
    assert runner.calls[-1] == ["sync"], runner.calls


def test_create_record_of_an_open_record_sends_no_status() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.CreateAnswers()
    BeadsAdapter(runner).create_record(_probe("open"))

    assert "--status" not in _status_call(runner.calls), runner.calls


def test_create_record_makes_an_in_progress_record_on_real_bd() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp))
        adapter.create_record(_probe("in_progress"))

        assert ip.lifecycles(support.all_records(adapter)) == {"demo-ip-probe": "in_progress"}


def test_seed_creates_every_record_with_the_lifecycle_the_files_say() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = ip.copy_tree(root)
        adapter = ip.beads_adapter(root)
        adapter.seed_from_files(plans)

        actual = ip.lifecycles(support.all_records(adapter))
        for record_id, lifecycle in ip.EXPECTED.items():
            assert actual.get(record_id) == lifecycle, f"{record_id}: {actual.get(record_id)!r}, want {lifecycle!r}"


def test_seed_repair_moves_open_records_to_in_progress_and_syncs_once() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        adapter = ip.beads_adapter(root, ip.CountingRunner)
        adapter.seed_from_files(ip.copy_tree(root, pending=True))
        before = ip.lifecycles(support.all_records(adapter))
        assert before["running/1"] == before["running/2"] == "open", before

        # Files now say in progress again.
        plans = root / "tree" / "plans"
        source = ip.PLANS_DIR / "running" / "04-slices.md"
        (plans / "running" / "04-slices.md").write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
        adapter.runner.calls.clear()
        adapter.seed_from_files(plans)

        after = ip.lifecycles(support.all_records(adapter))
        assert after["running/1"] == "in_progress", after
        assert after["running/2"] == "in_progress", after
        assert adapter.runner.count("sync") == 1, adapter.runner.calls
        assert adapter.runner.count("create") == 0, adapter.runner.calls


def test_seed_repair_never_touches_closed_records_and_never_moves_in_progress_back() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = ip.copy_tree(root)
        adapter = ip.beads_adapter(root)
        adapter.seed_from_files(plans)
        rows = {record.id: record for record in support.all_records(adapter)}
        assert rows["running/1"].lifecycle == "in_progress" and rows["running/3"].lifecycle == "closed"

        # The files now say pending for slice 1 and slice 2, and in progress for the closed slice 3 of bd.
        slices = plans / "running" / "04-slices.md"
        text = ip.PROGRESS_CELL.sub("| pending |", slices.read_text(encoding="utf-8"))
        slices.write_text(text.replace("| 0.950 | in-progress |", "| — | in-progress |"), encoding="utf-8")
        status = plans / "running" / "00-status.md"
        status.write_text(status.read_text(encoding="utf-8").replace("- [x] Slice 3", "- [ ] Slice 3"), encoding="utf-8")
        adapter.seed_from_files(plans)

        after = ip.lifecycles(support.all_records(adapter))
        assert after["running/1"] == "in_progress", f"in progress moved back: {after}"
        assert after["running/2"] == "in_progress", f"in progress moved back: {after}"
        assert after["running/3"] == "closed", f"closed record changed: {after}"


def test_seed_with_nothing_to_move_does_not_sync_again() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = ip.copy_tree(root)
        adapter = ip.beads_adapter(root, ip.CountingRunner)
        adapter.seed_from_files(plans)
        adapter.runner.calls.clear()
        adapter.seed_from_files(plans)

        assert adapter.runner.count("sync") == 0, adapter.runner.calls
        assert adapter.runner.count("update") == 0, adapter.runner.calls
