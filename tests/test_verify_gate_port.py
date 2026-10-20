"""Contract: verify_gate's gate and slice reads go through the TrackerPort.

The files adapter must return exactly what the file reads returned before the
port (the golden in tests/fixtures/tracker/golden/verify_gate.json). With the
fake adapter, check_4a must open no 04-slices.md, since the slice rows come
from the port. The fake-adapter spy checks for the whole gate path live in
tests/test_tracker_read_spy.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

GOLDEN = support.load_golden("verify_gate.json")
PLANS = support.fixture_plans()


@pytest.mark.parametrize("key", sorted(GOLDEN))
def test_files_adapter_gate_matches_golden(tmp_path, key):
    plan_src = PLANS[key]
    repo = support.make_repo(tmp_path, plan_src.name, plan_src, support.files_tracker())
    plan_dir = repo / "docs" / "plans" / plan_src.name
    assert support.gate_result(plan_dir) == GOLDEN[key]


def test_fake_adapter_check_4a_opens_no_slices_file(tmp_path):
    """Fails today: check_4a reads 04-slices.md directly and ignores tracker.yaml."""
    import verify_gate as vg

    plan_src = PLANS["plans/beads-storage-mini"]
    repo = support.make_repo(tmp_path, "demo", plan_src, support.fake_tracker())
    plan_dir = repo / "docs" / "plans" / "demo"
    with support.record_file_opens() as opened:
        vg.check_4a(plan_dir)
    assert not [p for p in opened if p.endswith("04-slices.md")]



def _gate_checks(base: Path, tracker: str):
    """Run check_4a and check_4b for beads-storage-mini through one tracker config."""
    import verify_gate as vg

    plan_src = PLANS["plans/beads-storage-mini"]
    base.mkdir()
    repo = support.make_repo(base, "beads-storage-mini", plan_src, tracker)
    plan_dir = repo / "docs" / "plans" / "beads-storage-mini"
    results_4a, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text(encoding="utf-8")
    results_4b = vg.check_4b(plan_dir, slices, status_text)
    return results_4a, slices, results_4b


def test_live_form_check_4a_slice_count_matches_files(tmp_path):
    """Fails today if the live-form slice count or row content differs from the files adapter."""
    _, files_slices, _ = _gate_checks(tmp_path / "files", support.files_tracker())
    _, live_slices, _ = _gate_checks(tmp_path / "live", support.fake_live_tracker())
    assert len(live_slices) == len(files_slices) == 3
    assert sorted(live_slices, key=lambda s: s["n"]) == sorted(files_slices, key=lambda s: s["n"])


def test_live_form_check_4a_rows_keep_plan_file_order(tmp_path):
    """Fails today: the port returns rows in store order (3, 1, 2), not plan-file table order (1, 2, 3)."""
    _, live_slices, _ = _gate_checks(tmp_path / "live", support.fake_live_tracker())
    assert [s["n"] for s in live_slices] == [1, 2, 3]


def test_live_form_check_4b_matches_files(tmp_path):
    """Fails today if check_4b results differ between the live form and the files adapter."""
    _, _, files_4b = _gate_checks(tmp_path / "files", support.files_tracker())
    _, _, live_4b = _gate_checks(tmp_path / "live", support.fake_live_tracker())
    assert live_4b == files_4b
