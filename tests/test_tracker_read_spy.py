"""Spy contract: the fake adapter reads no plan file under docs/plans.

With a tracker.yaml that names the fake corpus, the gate check and the
list-programs and next-ready calls must open no plan file. The builds view
must list the corpus epics and slices, and the design slug it reads.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

from tracker_port.config import load_adapter  # noqa: E402

PLANS = support.fixture_plans()

# Not a corpus string, so a hit proves the design dir was read.
DESIGN_SLUG = "north-harbor-17"


def _fake_repo(tmp_path):
    return support.make_repo(
        tmp_path, "demo", PLANS["plans/beads-storage-mini"], support.fake_tracker()
    )


def test_list_programs_and_next_ready_open_no_plan_file(tmp_path):
    """Passes today: the fake adapter reads only the corpus, never docs/plans."""
    repo = _fake_repo(tmp_path)
    adapter = load_adapter(repo / ".cobuilder" / "tracker.yaml", repo)
    with support.record_file_opens() as opened:
        adapter.list_programs()
        adapter.next_ready()
    assert not [p for p in opened if "docs/plans" in p]


def test_check_4a_and_4b_open_no_slices_file(tmp_path):
    """Fails today: check_4a reads 04-slices.md directly, ignoring tracker.yaml.

    The status read is covered by test_verify_gate_main_opens_no_plan_file,
    because check_4a and check_4b take the status text from main().
    """
    import verify_gate as vg

    repo = _fake_repo(tmp_path)
    plan_dir = repo / "docs" / "plans" / "demo"
    with support.record_file_opens() as opened:
        _results, slices = vg.check_4a(plan_dir)
        vg.check_4b(plan_dir, slices, "")
    assert not [p for p in opened if p.endswith("04-slices.md")]


def test_verify_gate_main_opens_no_plan_file(tmp_path, monkeypatch):
    """Fails today: main reads 00-status.md, and check_4a reads 04-slices.md.

    main() takes its arguments from sys.argv. It exits through sys.exit, so the
    exit is caught and only the file opens are asserted.
    """
    import verify_gate as vg

    repo = _fake_repo(tmp_path)
    plan_dir = repo / "docs" / "plans" / "demo"
    monkeypatch.setattr(sys, "argv", ["verify_gate.py", "--plan", str(plan_dir)])
    with support.record_file_opens() as opened:
        try:
            vg.main()
        except SystemExit:
            pass
    plan_reads = [p for p in opened if p.endswith(("00-status.md", "04-slices.md"))]
    assert not plan_reads


def test_builds_view_lists_corpus_epics_and_slices_and_design(tmp_path):
    """Fails today: read_epics and read_plan take their rows from the plan files.

    DESIGN_SLUG is not in the corpus, so finding it proves the designs dir
    was read. The corpus slice id must also appear, and that needs the port.
    """
    import build_builds_view as bbv

    repo = _fake_repo(tmp_path)
    plan_dir = repo / "docs" / "plans" / "demo"
    designs = support.make_designs(tmp_path, DESIGN_SLUG)
    rubrics = tmp_path / "rubrics"
    rubrics.mkdir()
    epics = bbv.read_epics(designs, (plan_dir / "04-slices.md").read_text(encoding="utf-8"))
    plan = bbv.read_plan(plan_dir, designs, rubrics)
    dumped = json.dumps(support.plain({"epics": epics, "plan": plan}))
    assert DESIGN_SLUG in dumped
    assert "demo-E1-s1" in dumped
