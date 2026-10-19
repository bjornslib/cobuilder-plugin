"""Contract: build_builds_view's epic and plan reads go through the TrackerPort.

The files adapter must return exactly what the file reads returned before the
port (the golden in tests/fixtures/tracker/golden/builds_view.json). Epic
design docs and rubric prose stay file reads, because the port has no method
to list them. Only epic and slice state comes from the port.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

GOLDEN = support.load_golden("builds_view.json")
PLANS = support.fixture_plans()


@pytest.mark.parametrize("key", sorted(GOLDEN))
def test_results_match_golden(tmp_path, key):
    plan_src = PLANS[key]
    repo = support.make_repo(tmp_path, plan_src.name, plan_src, support.files_tracker())
    plan_dir = repo / "docs" / "plans" / plan_src.name
    designs = support.make_designs(tmp_path, plan_src.name)
    rubrics = tmp_path / "rubrics"
    rubrics.mkdir()
    assert support.view_result(plan_dir, designs, rubrics) == GOLDEN[key]


def test_fake_adapter_epics_come_from_corpus(tmp_path):
    """Fails today: read_epics parses 04-slices.md, not the corpus under tracker.yaml.

    The temp plan holds beads-storage-mini's rows, so no corpus slice id can
    appear in the result. The port must supply the rows.
    """
    plan_src = PLANS["plans/beads-storage-mini"]
    repo = support.make_repo(tmp_path, "demo", plan_src, support.fake_tracker())
    plan_dir = repo / "docs" / "plans" / "demo"
    designs = support.make_designs(tmp_path, "demo")
    rubrics = tmp_path / "rubrics"
    rubrics.mkdir()
    result = support.view_result(plan_dir, designs, rubrics)
    assert "demo-E1-s1" in json.dumps(result)



def _builds_epics(base: Path, tracker: str) -> list[dict]:
    """Epics from read_plan for beads-storage-mini, with the given tracker config."""
    plan_src = PLANS["plans/beads-storage-mini"]
    base.mkdir()
    repo = support.make_repo(base, "beads-storage-mini", plan_src, tracker)
    plan_dir = repo / "docs" / "plans" / "beads-storage-mini"
    designs = support.make_designs(base, "beads-storage-mini")
    rubrics = base / "rubrics"
    rubrics.mkdir()
    return support.view_result(plan_dir, designs, rubrics)["read_plan"]["epics"]


def test_live_form_epic_lists_its_slices(tmp_path):
    """Fails today: the port keys slice rows by the full parent id, `beads-storage-mini/E1`.

    read_plan looks rows up by the bare epic id `E1`, so the live-form epic
    shows zero slices where the files adapter shows three.
    """
    epics = _builds_epics(tmp_path / "live", support.fake_live_tracker())
    assert len(epics) == 1
    assert len(epics[0]["slices"]) == 3


def test_live_form_epics_equal_files_adapter(tmp_path):
    """Fails today: the live-form epics differ from the files-adapter epics.

    Slice count and table order must match the files adapter for the same plan.
    """
    files_epics = _builds_epics(tmp_path / "files", support.files_tracker())
    live_epics = _builds_epics(tmp_path / "live", support.fake_live_tracker())
    assert live_epics == files_epics
