"""E2 slice 6: seed_from_files on beads closes and repairs closed records.

Each test calls real bd, only in a temp directory.

Run with: uv run pytest tests/test_tracker_beads_closed_seed.py -q
"""
from __future__ import annotations

import pytest
import shutil
import tempfile
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_support import FIXTURE_DIR


pytestmark = pytest.mark.slow

_scratch_tracker = support.scratch_tracker


def _scratch_beads_adapter(root: Path) -> Any:
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(BdRunner(bd="bd", cwd=_scratch_tracker(root)))


def _blocked_close_plans(root: Path) -> tuple[Path, Path, Path, list[Any]]:
    """Copy the blocked-close plans under root. Return source, plans dir, copy, and its two slices."""
    from tracker_port.files import FilesAdapter

    source = FIXTURE_DIR / "plans-real" / "blocked-close"
    plans = root / "plans"
    copy = plans / "blocked-close"
    shutil.copytree(source, copy)
    slices = [record for record in FilesAdapter(plans).all_records() if record.kind == "slice"]
    assert len(slices) == 2, "the fixture must hold two slices"
    return source, plans, copy, slices


def _copy_plans(root: Path) -> Path:
    plans = root / "plans"
    plans.mkdir()
    shutil.copytree(FIXTURE_DIR / "plans-real" / "score-attempt", plans / "score-attempt")
    return plans


def test_seed_closes_records_whose_files_say_closed() -> None:
    support.require_bd()

    from tracker_port.files import FilesAdapter

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = _copy_plans(root)
        expected = FilesAdapter(plans).all_records()
        assert any(record.lifecycle == "closed" for record in expected), "the fixture must hold a closed record"

        adapter = _scratch_beads_adapter(root)
        adapter.seed_from_files(plans)
        by_id = {record.id: record for record in support.all_records(adapter)}

        for record in expected:
            assert record.id in by_id, f"{record.id} was not seeded"
            assert by_id[record.id].lifecycle == record.lifecycle, f"{record.id}: {by_id[record.id].lifecycle}"


def test_seed_repairs_an_open_record_whose_files_now_say_closed() -> None:
    support.require_bd()

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter

    source = FIXTURE_DIR / "plans-real" / "score-attempt"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = _copy_plans(root)
        closed_ids = [record.id for record in FilesAdapter(plans).all_records() if record.lifecycle == "closed"]
        assert closed_ids, "the fixture must hold a closed record"

        seed = _scratch_tracker(root)
        slices = plans / "score-attempt" / "04-slices.md"
        status = plans / "score-attempt" / "00-status.md"
        slices.write_text(slices.read_text(encoding="utf-8").replace("| done |", "| pending |"), encoding="utf-8")
        status.write_text(status.read_text(encoding="utf-8").replace("- [x] Slice 1", "- [ ] Slice 1"), encoding="utf-8")

        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)
        before = {record.id: record for record in support.all_records(adapter)}
        for record_id in closed_ids:
            assert before[record_id].lifecycle == "open", f"{record_id} should start open"

        shutil.copyfile(source / "04-slices.md", slices)
        shutil.copyfile(source / "00-status.md", status)
        adapter.seed_from_files(plans)
        after = {record.id: record for record in support.all_records(adapter)}

        for record_id in closed_ids:
            assert after[record_id].lifecycle == "closed", f"{record_id}: {after[record_id].lifecycle}"
            assert after[record_id].envelope == before[record_id].envelope, f"{record_id} envelope changed"


def test_seed_closes_a_slice_blocked_by_a_completed_slice() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _source, plans, _copy, slices = _blocked_close_plans(root)
        assert all(record.lifecycle == "closed" for record in slices), "both slices must be completed"
        assert any(record.blocked_by for record in slices), "one slice must be blocked by the other"

        adapter = _scratch_beads_adapter(root)
        adapter.seed_from_files(plans)
        by_id = {record.id: record for record in support.all_records(adapter)}

        for record in slices:
            assert record.id in by_id, f"{record.id} was not seeded"
            assert by_id[record.id].lifecycle == "closed", f"{record.id}: {by_id[record.id].lifecycle}"


def test_seed_repair_closes_two_slices_that_turn_completed_on_real_bd() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source, plans, copy, slices = _blocked_close_plans(root)
        slice_ids = [record.id for record in slices]

        slices_md = copy / "04-slices.md"
        status_md = copy / "00-status.md"
        slices_md.write_text(slices_md.read_text(encoding="utf-8").replace("| done |", "| pending |"), encoding="utf-8")
        status_md.write_text(status_md.read_text(encoding="utf-8").replace("- [x] Slice", "- [ ] Slice"), encoding="utf-8")

        adapter = _scratch_beads_adapter(root)
        adapter.seed_from_files(plans)
        before = {record.id: record for record in support.all_records(adapter)}
        for record_id in slice_ids:
            assert before[record_id].lifecycle == "open", f"{record_id}: {before[record_id].lifecycle}"

        shutil.copyfile(source / "04-slices.md", slices_md)
        shutil.copyfile(source / "00-status.md", status_md)
        adapter.seed_from_files(plans)
        after = {record.id: record for record in support.all_records(adapter)}
        for record_id in slice_ids:
            assert after[record_id].lifecycle == "closed", f"{record_id}: {after[record_id].lifecycle}"
