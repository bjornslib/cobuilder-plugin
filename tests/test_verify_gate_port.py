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
